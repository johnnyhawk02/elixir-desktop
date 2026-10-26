// ---- the phone screen: play, record, sliders, randomisers, the compressor and presets, driving the full app underneath ----
// The desktop panels stay in the page (hidden) so the engine, presets and randomisers run as they do there;
// the buttons here press theirs and the sliders write the same state.
// iOS: play Web Audio through the ringer switch like a music app
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
const mRnd = (n) => Math.floor(Math.random() * n);

// ---- pages: swipe between them, or tap a tab to scroll to one ----
const mPages = $('m-pages');
let mCur = 'play';
function mTab(t) {
  const el = document.querySelector(`[data-m-panel="${t}"]`);
  mPages.scrollTo({ left: el.offsetLeft - mPages.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  mShown(t);
}
// the tab that shows which page is in view
function mShown(t) {
  if (t === mCur) return;
  mCur = t;
  document.querySelectorAll('[data-m-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mTab === t));
  if (t === 'presets') mDrawPresets();
}
mPages.addEventListener('scroll', () => {
  const panels = [...mPages.querySelectorAll('[data-m-panel]')], i = Math.round(mPages.scrollLeft / (mPages.scrollWidth / panels.length));
  mShown(panels[Math.max(0, Math.min(panels.length - 1, i))].dataset.mPanel);
}, { passive: true });
document.querySelectorAll('[data-m-tab]').forEach((b) => b.addEventListener('click', () => mTab(b.dataset.mTab)));

// ---- transport ----
const mPlay = $('m-play'), mRec = $('m-rec');
const mSync = () => {
  const on = $('play').getAttribute('aria-pressed') === 'true';
  mPlay.setAttribute('aria-pressed', on); mPlay.querySelector('span').textContent = on ? 'stop' : 'play';
};
new MutationObserver(mSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
mPlay.addEventListener('click', () => $('play').click());

// ---- sliders: vertical faders, readout on top and label under; dragging moves the value from where it is
// (a touch doesn't jump it), the whole track's height is the full range (tempo's is twice it, for finer steps), and a double tap on the label resets it;
// holding one still opens its step sequencer (below) ----
const mDraws = [], mFaders = [];
function mFader(box, label, { min, max, step = 1, get, set, show, dflt, travel = 1 }) {
  const el = document.createElement('div');
  el.className = 'm-vf';
  el.innerHTML = '<output></output><div class="m-vtrack" role="slider" tabindex="0"><i></i><b></b></div><span class="m-flab"></span>';
  el.querySelector('.m-flab').textContent = label;
  const tr = el.querySelector('.m-vtrack'), out = el.querySelector('output');
  tr.setAttribute('aria-label', label);
  const hiOf = () => (typeof max === 'function' ? max() : max);
  const put = (v) => {
    const hi = hiOf(); v = Math.max(min, Math.min(hi, min + Math.round((v - min) / step) * step));
    v = Math.round(v * 1e6) / 1e6; // a fractional step (pitch's hundredths) lands on its exact value
    if (v !== get()) set(v);
    draw();
  };
  const draw = () => {
    const hi = hiOf(), v = get();
    out.textContent = show(v); tr.style.setProperty('--f', (v - min) / (hi - min || 1));
    tr.setAttribute('aria-valuemin', min); tr.setAttribute('aria-valuemax', hi); tr.setAttribute('aria-valuenow', v); tr.setAttribute('aria-valuetext', show(v));
  };
  const fd = { key: `${box.id}:${label}`, label, min, hiOf, step, get, show, put, el, seq: null };
  let drag = null, hold = 0;
  tr.addEventListener('pointerdown', (e) => {
    tr.setPointerCapture(e.pointerId); el.classList.add('held');
    drag = { y: e.clientY, v: get(), h: tr.getBoundingClientRect().height };
    clearTimeout(hold);
    hold = setTimeout(() => { if (!drag) return; const v = drag.v; end(); put(v); mSeqOpen(fd); }, 500);
  });
  tr.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(drag.y - e.clientY) > 6) clearTimeout(hold);
    put(drag.v + (drag.y - e.clientY) / (drag.h * travel) * (hiOf() - min));
  });
  const end = () => { clearTimeout(hold); drag = null; el.classList.remove('held'); };
  tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  tr.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (d) { e.preventDefault(); put(get() + d * step); }
  });
  let last = 0;
  el.querySelector('.m-flab').addEventListener('click', () => {
    const t = performance.now();
    if (t - last < 350 && dflt !== undefined) put(dflt); last = t;
  });
  box.append(el); mDraws.push(draw); mFaders.push(fd);
  return draw;
}
const mDrawAll = () => mDraws.forEach((d) => d());
perfDraws.push(mDrawAll);
// a preset load rebuilds the master section; the sliders follow
// (the pattern button's undo; a preset load clears it, as it clears the desktop's)
let mPatUndo = null;
const mUndo = () => { document.querySelectorAll('[data-m-undo]').forEach((b) => { b.disabled = !mPatUndo && $('undo').disabled; }); };
const mBuildMaster = buildMaster;
buildMaster = function () { mBuildMaster(); mPatUndo = null; mUndo(); mDrawAll(); };

const pf = (k) => ({ min: PERF_RANGE[k][0], max: PERF_RANGE[k][1], get: () => perfGet(k), set: (v) => setPerf(k, v), show: () => perfText(k), dflt: PERF_RANGE[k][2] });
// the beat pop-up (the beat button by play and record): genre, beat, energy and rush.
// Genre steps through the built-in styles (not user); a preset in the user style shows it with the slider at the bottom
const mGenres = STYLES.map((st, i) => (st.user ? -1 : i)).filter((i) => i >= 0);
mFader($('m-beat-faders'), 'genre', { min: 0, max: mGenres.length - 1, get: () => Math.max(0, mGenres.indexOf(styleIdx)),
  set: (v) => {
    setStyle(mGenres[v]); perf.beat = Math.min(perf.beat, STYLES[styleIdx].grooves.length - 1);
    if (view === 'steps') setTab('perform'); else generate();
    sendSeq(); setDirty(true); drawPerf();
  }, show: () => STYLES[styleIdx].name.replace(' ', '\n'), dflt: 0 });
// beat runs over the current style's grooves; its readout is the groove, then where it is in the list
mFader($('m-beat-faders'), 'beat', { ...pf('beat'), max: () => STYLES[styleIdx].grooves.length - 1 || 1, show: () => perfText('beat').replace(' · ', '\n') });
mFader($('m-beat-faders'), 'energy', { ...pf('energy'), show: () => perfText('energy').replace(' · ', '\n') });
mFader($('m-faders'), 'tempo', { ...pf('tempo'), show: () => `${perf.tempo}\nbpm`, travel: 2 });
mFader($('m-faders'), 'fills', { ...pf('fills'), show: () => perfText('fills').replace(' · ', '\n') });
mFader($('m-faders'), 'groove', { ...pf('groove'), show: () => perfText('groove').replace(' ', '\n') });
mFader($('m-beat-faders'), 'rush', pf('rush'));
// the drum 1 sidechain duck: above 0 it switches the sidechain on
const setDuck = (v) => {
  master.duck = v / 100;
  if (v > 0 && !master.duckOn) $('duck-on').click(); else sendMix();
};
const duckFader = { min: 0, max: 100, get: () => (master.duckOn ? Math.round(master.duck * 100) : 0), set: setDuck, show: (v) => (v ? v + '%' : 'off'), dflt: Math.round(MASTER0.duck * 100) };
mFader($('m-faders'), 'sidechain', duckFader);
// the sound macros, as on the desktop's pattern card: 100 (pitch 24) is the middle, the sound as it is
for (const [m, label] of [['pitch', 'pitch'], ['decay', 'decay'], ['filter', 'filter'], ['fm', 'fm']]) {
  const pitch = m === 'pitch';
  // pitch is free: hundredths of a semitone, over twice the track's height
  mFader($('m-faders'), label, { min: 0, max: pitch ? 48 : 200, step: pitch ? 0.01 : 1, travel: pitch ? 2 : 1, get: () => macro[m], set: (v) => { setMacro(m, v); drawMacros(); },
    show: (v) => (pitch ? (Math.abs(v - 24) < 0.005 ? '0 st' : (v > 24 ? '+' : '−') + Math.abs(v - 24).toFixed(2) + '\nst') : (v === 100 ? '0%' : (v > 100 ? '+' : '−') + Math.abs(v - 100) + '%')),
    dflt: MACRO0[m] });
}
const mDrawMacros = drawMacros;
drawMacros = function () { mDrawMacros(); mDrawAll(); };
// crossfeed depth: how much of the crossfeed patchbay is heard (the desktop's depth control); presets keep it
const mXDepth = (v) => { $('xdepth').value = v; $('xdepth').dispatchEvent(new Event('input')); };
mFader($('m-faders'), 'crossfeed', { min: 0, max: 100, get: () => Number($('xdepth').value), set: mXDepth, show: (v) => (v ? v + '%' : 'off'), dflt: 100 });
// so the play page is three by three: tempo, fills, groove / sidechain, pitch, decay / filter, fm, crossfeed
$('m-beat-open').addEventListener('click', () => { $('m-beat').hidden = false; mDrawAll(); });
$('m-beat-close').addEventListener('click', () => { $('m-beat').hidden = true; });
// the randomisers go in a row under the faders
$('m-faders').after($('m-faders').querySelector('.m-rand'));

// ---- compressor tab ----
const mMaster = (box, label, key, lo, hi, step, show) => mFader(box, label, { min: lo, max: hi, step, get: () => master[key],
  set: (v) => { master[key] = v; sendMix(); }, show, dflt: MASTER0[key] });
mMaster($('m-comp'), 'threshold', 'thresh', -40, 0, 1, (v) => v + ' dB');
mFader($('m-comp'), 'ratio', { min: 0, max: RATIOS.length - 1, get: () => Math.max(0, RATIOS.indexOf(master.ratio)),
  set: (v) => { master.ratio = RATIOS[v]; sendMix(); }, show: (v) => RATIOS[v] + ':1', dflt: RATIOS.indexOf(MASTER0.ratio) });
mMaster($('m-comp'), 'attack', 'attack', 1, 50, 1, (v) => v + ' ms');
mMaster($('m-comp'), 'release', 'release', 20, 500, 10, (v) => v + ' ms');
mMaster($('m-comp'), 'makeup', 'makeup', 0, 12, 1, (v) => '+' + v + ' dB');
mFader($('m-duck'), 'amount', duckFader);
mMaster($('m-duck'), 'release', 'duckRelease', 30, 600, 10, (v) => v + ' ms');
// space: drum 1 also cuts the others' frequencies where it plays (a spacer, after Trackspacer), on the same switch and release
mMaster($('m-duck'), 'space', 'space', 0, 100, 5, (v) => (v ? v + '%' : 'off'));
const mCompOn = () => {
  const on = $('comp-on').getAttribute('aria-pressed') === 'true';
  $('m-comp-on').setAttribute('aria-pressed', on); $('m-comp-on').textContent = on ? 'on' : 'off';
  $('m-comp').classList.toggle('off', !on);
};
$('m-comp-on').addEventListener('click', () => $('comp-on').click());
new MutationObserver(mCompOn).observe($('comp-on'), { attributes: true, attributeFilter: ['aria-pressed'] });
// the gain reduction meter: a bar, fed by the same reading as the desktop needle
const mGrSet = grVu.set;
grVu.set = (db) => {
  mGrSet(db);
  const d = Math.max(0, Math.min(20, db || 0));
  $('m-gr').style.width = (Math.log1p(d) / Math.log1p(20) * 100).toFixed(1) + '%'; $('m-gr-out').textContent = `${d.toFixed(1)} dB`;
};

// ---- randomisers ----
// undo takes back the last randomise: the sound for everything and kit (the desktop's undo), the pattern for pattern
$('m-everything').addEventListener('click', () => { mPatUndo = null; $('new-kit').click(); });
// kit: every drum voice from a random built-in kit; the pattern, mixer and FX stay
$('m-kit').addEventListener('click', () => { mPatUndo = null; $('rand-all').click(); });
// pattern: style, beat, energy, fills, groove and its depth rolled; the sound, tempo, rush, mixer and FX stay
const mPatGet = () => ({ style: styleIdx, beat: perf.beat, energy: perf.energy, fills: perf.fills, type: groove.type, depth: groove.depth });
function mPatSet(p) {
  setStyle(p.style);
  perf.beat = p.beat; perf.energy = p.energy; perf.fills = p.fills; groove.type = p.type; groove.depth = p.depth;
  drawUserTools();
  if (view === 'steps') setTab('perform'); else generate();
  drawGroove(); sendSeq(); setDirty(true);
}
const mRandPattern = async () => {
  await startAudio();
  const was = mPatGet();
  const styles = STYLES.map((st, i) => (st.user ? -1 : i)).filter((i) => i >= 0);
  const style = styles[mRnd(styles.length)];
  mPatSet({ style, beat: mRnd(STYLES[style].grooves.length), energy: 35 + mRnd(61), fills: mRnd(101),
    type: GROOVE_TYPES[mRnd(GROOVE_TYPES.length)].name, depth: 50 + mRnd(51) });
  undoValues = null; $('undo').disabled = true; mPatUndo = was; mUndo();
};
$('m-pattern').addEventListener('click', mRandPattern);
document.querySelectorAll('[data-m-undo]').forEach((b) => b.addEventListener('click', () => {
  if (mPatUndo) { const p = mPatUndo; mPatUndo = null; mPatSet(p); mUndo(); } else $('undo').click();
}));
new MutationObserver(mUndo).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });

// ---- the random page: everything, sequence, a button per drum (its sound from a random built-in kit) and the energy / rush pad ----
$('m-d-everything').addEventListener('click', () => $('m-everything').click());
$('m-d-pattern').addEventListener('click', mRandPattern);
XN.forEach((name, v) => {
  const b = document.createElement('button');
  b.className = 'm-btn'; b.type = 'button'; b.textContent = name;
  b.addEventListener('click', () => { mPatUndo = null; randomOne(v); });
  $('m-voices').append(b);
});
// across is energy, up is rush; a touch puts the dot where it lands
{
  const pad = $('m-xy'), out = pad.querySelector('output'), XY_IN = 22;
  const draw = () => {
    pad.style.setProperty('--x', perf.energy / 100); pad.style.setProperty('--y', perf.rush / 100);
    out.textContent = `${perfText('energy')}\nrush ${perfText('rush')}`;
  };
  const at = (e) => {
    const r = pad.getBoundingClientRect(), f = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);
    // the cursor's centre stays XY_IN px inside the edges, so it never hangs off them
    const en = f((e.clientX - r.left - XY_IN) / (r.width - 2 * XY_IN)), ru = f((r.bottom - XY_IN - e.clientY) / (r.height - 2 * XY_IN));
    if (en !== perf.energy) setPerf('energy', en);
    if (ru !== perf.rush) setPerf('rush', ru);
    draw();
  };
  let held = false;
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); held = true; pad.classList.add('held'); at(e); });
  pad.addEventListener('pointermove', (e) => { if (held) at(e); });
  const end = () => { held = false; pad.classList.remove('held'); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  mDraws.push(draw);
}

// ---- presets: save, and a list to load or delete (kept in this browser, as on the desktop) ----
const mLoad = (k) => { loadPreset(k); mDrawPresets(); };
function mDrawPresets() {
  const list = $('m-plist'), cur = kitList[Number($('kit').value)];
  list.innerHTML = '';
  const group = (t) => { const li = document.createElement('li'); li.className = 'm-pgroup'; li.textContent = t; list.append(li); };
  const row = (k) => {
    const li = document.createElement('li'); li.classList.toggle('cur', k === cur);
    li.innerHTML = '<button class="m-pload" type="button"><b></b><small></small></button>';
    li.querySelector('b').textContent = k.name; li.querySelector('small').textContent = k.song ? `${k.song.tempo} bpm` : '';
    li.querySelector('.m-pload').addEventListener('click', async () => { await startAudio(); mLoad(k); });
    if (k.saved) {
      const d = document.createElement('button'); d.className = 'm-pdel'; d.type = 'button'; d.textContent = 'delete';
      d.setAttribute('aria-label', `Delete ${k.name}`);
      d.addEventListener('click', () => {
        if (!confirm(`Delete ${k.name}?`)) return;
        const wasCur = k === kitList[Number($('kit').value)], keep = kitList[Number($('kit').value)];
        kitList.splice(kitList.indexOf(k), 1); storePresets(); fillKits();
        $('kit').value = wasCur ? 0 : kitList.indexOf(keep);
        mDrawPresets();
      });
      li.append(d);
    }
    list.append(li);
  };
  const mine = kitList.filter((k) => k.saved);
  group('mine');
  if (mine.length) mine.slice().reverse().forEach(row);
  else { const li = document.createElement('li'); li.className = 'm-pempty'; li.textContent = 'None yet. Save makes one.'; list.append(li); }
  group('built in');
  kitList.filter((k) => k.builtin).forEach(row);
}
$('m-psave').addEventListener('click', () => {
  $('kit-save').click();
  const k = kitList[kitList.length - 1];
  $('m-pnote').textContent = `Saved as ${k.name}.`;
  mDrawPresets();
});

// presets files: the full Elixir's format, { elixir: 1, presets: [...] } (PRESETS.md); only the current
// preset version loads, and a name already saved here is skipped
$('m-pimport').addEventListener('change', async (e) => {
  let n = 0, old = 0, bad = 0;
  for (const f of e.target.files) {
    try {
      for (const p of JSON.parse(await f.text()).presets || []) {
        if (!isCurrent(p)) { old++; continue; }
        if (kitList.some((k) => k.saved && k.name === p.name)) continue;
        kitList.push(fromStored(p, { saved: true })); n++;
      }
    } catch (err) { bad++; }
  }
  e.target.value = '';
  if (n) { const v = $('kit').value; storePresets(); fillKits(); $('kit').value = v; }
  $('m-pnote').textContent = (n ? `Imported ${n}.` : 'Nothing new to import.') + (old ? ` ${old} skipped: another preset version.` : '') + (bad ? ` ${bad} file${bad > 1 ? 's' : ''} not a presets file.` : '');
  mDrawPresets();
});
$('m-pexport').addEventListener('click', async () => {
  const mine = kitList.filter((k) => k.saved).map(presetData);
  if (!mine.length) { $('m-pnote').textContent = 'Save a preset first.'; return; }
  const blob = new Blob([JSON.stringify({ elixir: 1, presets: mine }, null, 1)], { type: 'application/json' });
  mOffer({ blob, name: 'elixir-mobile-presets.json' }, 'application/json');
  $('m-pnote').textContent = `Exported ${mine.length}.`;
});

// ---- record: free length, no count-in; starts now (and starts playback), the second press stops and saves ----
let mTimer = 0;
function mRecUi() {
  const on = recState !== 'off';
  mRec.setAttribute('aria-pressed', on); mRec.classList.toggle('on', on);
  clearInterval(mTimer);
  if (on) {
    const tick = () => { const t = Math.max(0, (performance.now() - recT0) / 1000); $('m-rec-t').textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
    tick(); mTimer = setInterval(tick, 250);
  } else $('m-rec-t').textContent = 'rec';
}
mRec.addEventListener('click', async () => {
  if (recState === 'off') {
    recSet.len = 0; recSet.count = false; // the recorder's own settings stay at 44.1k 16-bit, not normalised
    await recStart();
    if (!playing) $('play').click();
  } else {
    $('m-rec-t').textContent = 'saving';
    const m = { type: 'recStop' }; if (node) node.port.postMessage(m); else if (fallback) fallback.msg(m);
  }
  mRecUi();
});
const mRecEvent = recEvent;
recEvent = function (ev) { mRecEvent(ev); if (ev.type === 'rec') mRecUi(); };

// a finished take downloads straight away, with nothing else shown
const mAddTake = addTake;
addTake = function (t) {
  mAddTake(t);
  mRecUi();
  mDownload(t);
};
function mDownload(t) {
  const a = document.createElement('a'), url = URL.createObjectURL(t.blob);
  a.href = url; a.download = t.name; a.style.display = 'none';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// phones get the share sheet (Save to Files, AirDrop, apps); elsewhere it downloads
async function mOffer(t, type) {
  const file = new File([t.blob], t.name, { type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t.name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  mDownload(t);
}

// ---- step sequencers: holding a fader opens one for it: 2 to 16 steps, each a value it takes on that 16th note while
// playing (the step is the bar's 16th counted from the start, wrapped at the length, so short ones run against the bar),
// jumping to it or, with slew, gliding to it over up to a whole step.
// Draw the steps with a finger (drag across to paint), randomise them, or switch it off; a fader with one running is
// marked. Presets keep them ----
const mSeqSteps = Array.from({ length: 16 }, (_, i) => { const c = document.createElement('i'); c.dataset.i = i; $('m-seq-steps').append(c); return c; });
let mSeqF = null;
const mSeqVal = (fd, f) => { const hi = fd.hiOf(); return Math.round(Math.max(fd.min, Math.min(hi, fd.min + Math.round(f * (hi - fd.min) / fd.step) * fd.step)) * 1e6) / 1e6; };
function mSeqOpen(fd) {
  if (!fd.seq) fd.seq = { on: true, len: 16, slew: 0, vals: new Array(16).fill(fd.get()) };
  mSeqF = fd; $('m-seq-name').textContent = fd.label;
  $('m-seq').hidden = false; mSeqDraw();
}
function mSeqDraw() {
  const fd = mSeqF, q = fd.seq, hi = fd.hiOf();
  mSeqSteps.forEach((c, i) => {
    c.style.setProperty('--f', (q.vals[i] - fd.min) / (hi - fd.min || 1));
    c.classList.toggle('off', i >= q.len);
  });
  $('m-seq-len').style.setProperty('--w', q.len / 16); $('m-seq-len-out').textContent = `${q.len} steps`;
  $('m-seq-slew').style.setProperty('--w', q.slew / 100); $('m-seq-slew-out').textContent = q.slew ? `${q.slew}%` : 'off';
  $('m-seq-on').setAttribute('aria-pressed', q.on); $('m-seq-on').textContent = q.on ? 'on' : 'off';
  mSeqMarks();
}
const mSeqMarks = () => mFaders.forEach((f) => f.el.classList.toggle('seq', !!(f.seq && f.seq.on)));
// presets keep them: song.seqs, by fader (its box and label); a preset without one clears it
const mSnapSong = songSnapshot, mUseSong = useSong;
songSnapshot = function () {
  const seqs = {};
  for (const f of mFaders) if (f.seq) seqs[f.key] = { on: f.seq.on, len: f.seq.len, slew: f.seq.slew, vals: f.seq.vals.slice() };
  return { ...mSnapSong(), seqs, xdepth: Number($('xdepth').value) };
};
useSong = function (g, keepTempo) {
  mUseSong(g, keepTempo);
  mXDepth(typeof g.xdepth === 'number' ? g.xdepth : 100);
  for (const f of mFaders) { const q = g.seqs && g.seqs[f.key]; f.seq = q ? { on: !!q.on, len: q.len, slew: q.slew || 0, vals: q.vals.slice() } : null; }
  if (mSeqF) { if (mSeqF.seq) mSeqDraw(); else $('m-seq-close').click(); }
  mSeqMarks();
};
// painting: a step takes the value at the finger's height; dragging across paints the steps it passes
{
  const box = $('m-seq-steps');
  let painting = false;
  const paint = (e) => {
    const r = box.getBoundingClientRect(), cols = 8, rows = 2;
    const col = Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / r.width * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - r.top) / r.height * rows)));
    const c = mSeqSteps[row * cols + col], cr = c.getBoundingClientRect();
    if (c.classList.contains('off')) return;
    mSeqF.seq.vals[row * cols + col] = mSeqVal(mSeqF, 1 - Math.max(0, Math.min(1, (e.clientY - cr.top) / cr.height)));
    $('m-seq-val').textContent = mSeqF.show(mSeqF.seq.vals[row * cols + col]).replace('\n', ' ');
    mSeqDraw();
  };
  box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); painting = true; paint(e); });
  box.addEventListener('pointermove', (e) => { if (painting) paint(e); });
  const stop = () => { painting = false; };
  box.addEventListener('pointerup', stop); box.addEventListener('pointercancel', stop);
}
// the length (2 at the left to 16 at the right) and the slew (off to a whole step): horizontal bars
function mSeqBar(bar, setFrac) {
  const at = (e) => { const r = bar.getBoundingClientRect(); setFrac(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); mSeqDraw(); };
  let held = false;
  bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); held = true; at(e); });
  bar.addEventListener('pointermove', (e) => { if (held) at(e); });
  bar.addEventListener('pointerup', () => { held = false; }); bar.addEventListener('pointercancel', () => { held = false; });
}
mSeqBar($('m-seq-len'), (x) => { mSeqF.seq.len = 2 + Math.round(x * 14); });
mSeqBar($('m-seq-slew'), (x) => { mSeqF.seq.slew = Math.round(x * 20) * 5; });
$('m-seq-rand').addEventListener('click', () => { const q = mSeqF.seq; for (let i = 0; i < 16; i++) q.vals[i] = mSeqVal(mSeqF, Math.random()); q.on = true; mSeqDraw(); });
$('m-seq-on').addEventListener('click', () => { mSeqF.seq.on = !mSeqF.seq.on; mSeqDraw(); });
$('m-seq-close').addEventListener('click', () => { $('m-seq').hidden = true; mSeqF = null; });
// the glides, a frame at a time while any is moving
let mGlideOn = false;
function mGlideRun() {
  if (mGlideOn) return;
  mGlideOn = true;
  const tick = () => {
    const now = performance.now();
    let any = false;
    for (const f of mFaders) {
      const g = f.glide; if (!g) continue;
      const k = Math.min(1, (now - g.t0) / g.ms);
      f.put(g.from + (g.to - g.from) * k);
      if (k < 1 && f.seq && f.seq.on) any = true; else f.glide = null;
    }
    if (any) requestAnimationFrame(tick); else mGlideOn = false;
  };
  requestAnimationFrame(tick);
}
$('m').addEventListener('contextmenu', (e) => e.preventDefault());
// on each 16th (as the audio thread reaches it, ahead of the output), every running sequencer sets its fader
const mOnEvent = onEvent;
onEvent = function (ev) {
  if (ev.type === 'step' && playing) {
    const n = ev.bar * 16 + ev.step;
    const stepMs = 60000 / perf.tempo / 4, now = performance.now();
    for (const f of mFaders) {
      if (!f.seq || !f.seq.on) continue;
      const to = f.seq.vals[n % f.seq.len];
      // slew: glide from where the fader is to the step's value over that share of a step
      if (f.seq.slew) { f.glide = { from: f.get(), to, t0: now, ms: f.seq.slew / 100 * stepMs }; mGlideRun(); } else { f.glide = null; f.put(to); }
    }
    if (mSeqF && mSeqF.seq) { const i = n % mSeqF.seq.len; mSeqSteps.forEach((c, k) => c.classList.toggle('now', k === i)); }
  }
  mOnEvent(ev);
};

// ---- installable: a service worker keeps the app for offline use, and the presets page offers to install it
// where the browser allows (Chrome on Android also has Install app in its menu) ----
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
let mInstallEv = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); mInstallEv = e; $('m-install').hidden = false; });
addEventListener('appinstalled', () => { mInstallEv = null; $('m-install').hidden = true; });
$('m-install').addEventListener('click', async () => {
  if (!mInstallEv) return;
  mInstallEv.prompt(); await mInstallEv.userChoice.catch(() => {});
  mInstallEv = null; $('m-install').hidden = true;
});

mSync(); mUndo(); mCompOn(); mDrawAll();
