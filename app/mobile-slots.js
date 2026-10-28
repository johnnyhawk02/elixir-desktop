// ---- the perf page's twelve slots: each fader can do anything on the x/y lists, and MIDI CCs (13..24 unless changed in the user
// settings; any channel) move faders 1..12. The ASSIGN box (in the randomise column) turns on assign mode, where tapping a fader opens a chooser of where (a drum, beat, perf, fx, mix, master) and then what,
// grouped as on that page. The picks are kept in this browser, as [place, group, name], so they survive list changes ----
const SLOT_KEY = 'elixir-mobile-perfmap';
const SLOT0 = [['perf', 'perf', 'tempo'], ['perf', 'perf', 'sidechain'], ['perf', 'perf', 'pitch'], ['perf', 'perf', 'decay'], ['perf', 'perf', 'filter'], ['perf', 'perf', 'fm'], ['perf', 'perf', 'crossfeed'], ['beat', 'beat', 'energy'],
  ['beat', 'beat', 'rush'], ['beat', 'beat', 'fills'], ['fx', 'echo', 'send'], ['master', 'distortion', 'mix']];
let mSlots = (() => { try { const v = JSON.parse(localStorage.getItem(SLOT_KEY)); return Array.isArray(v) && v.length >= 7 ? v : null; } catch (e) { return null; } })() || SLOT0.map((x) => x.slice());
while (mSlots.length < SLOT0.length) mSlots.push(SLOT0[mSlots.length].slice());
const slotAxis = ([pl, g, n]) => { const P = XY_PLACES.find((x) => x.name === pl), G = P && P.groups.find((x) => x[0] === g); return G && G[1].find((a) => a.label === n); };
const mSlotEls = [];
function mSlot(i) {
  const box = $('m-faders'), old = mSlotEls[i];
  if (old) { const k = mFaders.findIndex((f) => f.el === old.el); if (k >= 0) { mDraws.splice(mDraws.indexOf(old.draw), 1); mFaders.splice(k, 1); } old.el.remove(); }
  const A = slotAxis(mSlots[i]) || slotAxis(SLOT0[i]), fd = A.fd;
  // a page's fader keeps its own steps, readout and reset; a drum's parameter is whole steps 0..its top
  // (a label that only makes sense on its own page takes its group's name: echo send, dist mix)
  const [pl, g] = mSlots[i], label = ['fx', 'mix', 'master'].includes(pl) && !A.label.includes(' ') ? `${g.split(' ')[0].slice(0, 4)} ${A.label}` : A.label;
  const draw = mFader(box, label, fd ? { min: fd.min, max: () => fd.hiOf(), step: fd.step, get: fd.get, set: (v) => { fd.put(v); mDrawAll(); }, show: fd.show, dflt: fd.dflt }
    : { min: A.min, max: A.max, get: A.get, set: (v) => { A.set(v); mDrawAll(); setDirty(true); }, show: String, dflt: () => initValues[A.par] });
  const el = mFaders[mFaders.length - 1].el;
  el.dataset.slot = i; mFaders[mFaders.length - 1].key = `m-faders:slot${i}`;
  box.insertBefore(el, (mSlotEls[i + 1] && mSlotEls[i + 1].el) || null);
  mSlotEls[i] = { el, draw }; draw();
}
for (let i = 0; i < SLOT0.length; i++) mSlot(i);
$('m-assign').addEventListener('change', () => { $('m-faders').classList.toggle('assigning', $('m-assign').checked); });
// MIDI: twelve CCs (13..24 unless changed) set faders 1..12 across their range, and nothing else listens (no other CCs, no notes); MIDI starts
// at the first touch, since the browser may ask first
onMidi = (e) => { const [st, cc, val] = e.data; if ((st & 0xf0) === 0xb0) pc4Midi(cc, val); };
// (a controller sends many CCs a second: only each fader's latest is kept, applied once a frame, and the moving
// fader skips the LCD fade so it keeps up with the knob)
const mCcNext = new Map();
let mCcFrame = 0;
// (which CC moves which fader: mCc.map, set in the user settings' midi tab, CC 13..24 unless changed; kept in this browser)
const CC_KEY = 'elixir-mobile-midicc';
const CC_PRESETS0 = [{ name: 'cc1 to cc12', map: SLOT0.map((_, i) => i + 1) }, { name: 'cc13 to cc24', map: SLOT0.map((_, i) => i + 13) }];
const mCc = (() => { let v = {}; try { v = JSON.parse(localStorage.getItem(CC_KEY)) || {}; } catch (e) {}
  return { map: Array.isArray(v.map) && v.map.length === SLOT0.length ? v.map : CC_PRESETS0[1].map.slice(), presets: Array.isArray(v.presets) ? v.presets : [] }; })();
const mCcStore = () => { try { localStorage.setItem(CC_KEY, JSON.stringify(mCc)); } catch (e) {} };
pc4Midi = function (cc, val) {
  let hit = false;
  mCc.map.forEach((c, i) => { if (c === cc) { mCcNext.set(i, val); hit = true; } });
  if (hit && !mCcFrame) mCcFrame = requestAnimationFrame(mCcApply);
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

