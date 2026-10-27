// ---- the perf page's eight slots: each fader can do anything on the x/y lists, and MIDI CC 17..24 (any channel) moves
// faders 1..8. The ASSIGN box (in the randomise column) turns on assign mode, where tapping a fader opens a chooser of where (a drum, beat, perf, fx, mix, master) and then what,
// grouped as on that page. The picks are kept in this browser, as [place, group, name], so they survive list changes ----
const SLOT_KEY = 'elixir-mobile-perfmap';
const SLOT0 = [['perf', 'perf', 'tempo'], ['perf', 'perf', 'sidechain'], ['perf', 'perf', 'pitch'], ['perf', 'perf', 'decay'], ['perf', 'perf', 'filter'], ['perf', 'perf', 'fm'], ['perf', 'perf', 'crossfeed'], ['beat', 'beat', 'energy']];
let mSlots = (() => { try { const v = JSON.parse(localStorage.getItem(SLOT_KEY)); return Array.isArray(v) && v.length >= 7 ? v : null; } catch (e) { return null; } })() || SLOT0.map((x) => x.slice());
while (mSlots.length < 8) mSlots.push(SLOT0[mSlots.length].slice());
const slotAxis = ([pl, g, n]) => { const P = XY_PLACES.find((x) => x.name === pl), G = P && P.groups.find((x) => x[0] === g); return G && G[1].find((a) => a.label === n); };
const mSlotEls = [];
function mSlot(i) {
  const box = $('m-faders'), old = mSlotEls[i];
  if (old) { const k = mFaders.findIndex((f) => f.el === old.el); if (k >= 0) { mDraws.splice(mDraws.indexOf(old.draw), 1); mFaders.splice(k, 1); } old.el.remove(); }
  const A = slotAxis(mSlots[i]) || slotAxis(SLOT0[i]), fd = A.fd;
  // a page's fader keeps its own steps, readout and reset; a drum's parameter is whole steps 0..its top
  const draw = mFader(box, A.label, fd ? { min: fd.min, max: () => fd.hiOf(), step: fd.step, get: fd.get, set: (v) => { fd.put(v); mDrawAll(); }, show: fd.show, dflt: fd.dflt }
    : { min: A.min, max: A.max, get: A.get, set: (v) => { A.set(v); mDrawAll(); setDirty(true); }, show: String, dflt: () => initValues[A.par] });
  const el = mFaders[mFaders.length - 1].el;
  el.dataset.slot = i; mFaders[mFaders.length - 1].key = `m-faders:slot${i}`;
  box.insertBefore(el, (mSlotEls[i + 1] && mSlotEls[i + 1].el) || null);
  mSlotEls[i] = { el, draw }; draw();
}
for (let i = 0; i < 8; i++) mSlot(i);
$('m-assign').addEventListener('change', () => { $('m-faders').classList.toggle('assigning', $('m-assign').checked); });
// MIDI: CC 17..24 set faders 1..8 across their range (other CCs go to the PC4 map as before); MIDI starts at the
// first touch, since the browser may ask first
const mPc4Midi = pc4Midi;
// (a controller sends many CCs a second: only each fader's latest is kept, applied once a frame, and the moving
// fader skips the LCD fade so it keeps up with the knob)
const mCcNext = new Map();
let mCcFrame = 0;
pc4Midi = function (cc, val) {
  if (cc < 17 || cc > 24) return mPc4Midi(cc, val);
  mCcNext.set(cc - 17, val);
  if (!mCcFrame) mCcFrame = requestAnimationFrame(mCcApply);
};
function mCcApply() {
  mCcFrame = 0;
  for (const [i, val] of mCcNext) {
    const el = mSlotEls[i] && mSlotEls[i].el, fd = el && mFaders.find((f) => f.el === el); if (!fd) continue;
    const v = fd.snap(fd.min + val / 127 * (fd.hiOf() - fd.min));
    el.classList.add('cc'); clearTimeout(el._cc); el._cc = setTimeout(() => el.classList.remove('cc'), 250);
    if (fd.base !== null) { fd.base = v; mSeqApply(fd); } else fd.put(v);
  }
  mCcNext.clear();
  setDirty(true);
}
addEventListener('pointerdown', () => startMidi(), { once: true });
// in assign mode a tap on a slot opens the chooser instead of moving it (on the click, once the finger is up, so the
// tap can't land on the chooser too)
$('m-faders').addEventListener('click', (e) => {
  if (!$('m-faders').classList.contains('assigning')) return;
  const vf = e.target.closest('.m-vf[data-slot]'); if (vf) mChooser(Number(vf.dataset.slot));
});
// the chooser: where along the top, then what, in its groups
let mChSlot = 0, mChPlace = 0;
function mChooser(i) {
  mChSlot = i; mChPlace = Math.max(0, XY_PLACES.findIndex((P) => P.name === mSlots[i][0]));
  $('m-ch-title').textContent = `slot ${i + 1}: ${mSlots[i][2]}`;
  $('m-ch').hidden = false; mChDraw();
}
function mChDraw() {
  const tabs = $('m-ch-tabs'); tabs.innerHTML = '';
  XY_PLACES.forEach((P, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = P.name; b.setAttribute('aria-selected', k === mChPlace);
    b.addEventListener('click', () => { mChPlace = k; mChDraw(); }); tabs.append(b);
  });
  const list = $('m-ch-list'); list.innerHTML = '';
  const P = XY_PLACES[mChPlace], cur = mSlots[mChSlot];
  for (const [heading, axes] of P.groups) {
    const h = document.createElement('b'); h.textContent = heading; list.append(h);
    const grid = document.createElement('div');
    for (const A of axes) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = A.label;
      b.setAttribute('aria-pressed', cur[0] === P.name && cur[1] === heading && cur[2] === A.label);
      b.addEventListener('click', () => {
        mSlots[mChSlot] = [P.name, heading, A.label];
        try { localStorage.setItem(SLOT_KEY, JSON.stringify(mSlots)); } catch (e) {}
        mSlot(mChSlot); $('m-ch').hidden = true;
      });
      grid.append(b);
    }
    list.append(grid);
  }
}
$('m-ch-close').addEventListener('click', () => { $('m-ch').hidden = true; });
$('m-ch-reset').addEventListener('click', () => {
  mSlots[mChSlot] = SLOT0[mChSlot].slice();
  try { localStorage.setItem(SLOT_KEY, JSON.stringify(mSlots)); } catch (e) {}
  mSlot(mChSlot); $('m-ch').hidden = true;
});

