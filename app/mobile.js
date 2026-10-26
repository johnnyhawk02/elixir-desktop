// ---- the phone screen: play, record, sliders, randomisers, the compressor and presets, driving the full app underneath ----
// The desktop panels stay in the page (hidden) so the engine, presets and randomisers run as they do there;
// the buttons here press theirs and the sliders write the same state.
// iOS: play Web Audio through the ringer switch like a music app
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
const mRnd = (n) => Math.floor(Math.random() * n);

// ---- pages: tap a tab to scroll to one (the pages don't swipe). The tab changes once, at once, not for each page passed ----
const mPages = $('m-pages');
let mCur = 'play', mSettle = 0;
function mTab(t) {
  const el = document.querySelector(`[data-m-panel="${t}"]`);
  mShown(t);
  mPages.scrollTo({ left: el.offsetLeft - mPages.offsetLeft, behavior: 'instant' }); // (straight there, no slide)
}
// the tab that shows which page is in view
// the page's name, beside the title
const M_PAGE_NAMES = { play: 'perform', beat: 'beat', dice: 'voice', xy: 'x/y pads', fx: 'effects', mix: 'mixer', comp: 'master', presets: 'presets' };
function mShown(t) {
  if (t === mCur) return;
  mCur = t;
  $('m-pagename').textContent = M_PAGE_NAMES[t] || t;
  document.querySelectorAll('[data-m-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mTab === t));
  if (t === 'presets') mDrawPresets();
}
// at rest: the page nearest the scroll position
function mSettled() {
  clearTimeout(mSettle);
  const x = mPages.scrollLeft + mPages.offsetLeft;
  const near = [...mPages.querySelectorAll('[data-m-panel]')].reduce((a, b) => (Math.abs(b.offsetLeft - x) < Math.abs(a.offsetLeft - x) ? b : a));
  mShown(near.dataset.mPanel);
}
// scrollend where the browser has it; otherwise a pause in the scrolling
mPages.addEventListener('scroll', () => { clearTimeout(mSettle); mSettle = setTimeout(mSettled, 150); }, { passive: true });
mPages.addEventListener('scrollend', mSettled);
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
// holding one still opens its step sequencer (below). While a sequencer runs, the fader sets its base (fd.base) and the
// sequencer moves the value around it: the fill is the value heard, the bar the base ----
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
    tr.classList.toggle('mod', fd.base !== null); if (fd.base !== null) tr.style.setProperty('--b', (fd.base - min) / (hi - min || 1));
    tr.setAttribute('aria-valuemin', min); tr.setAttribute('aria-valuemax', hi); tr.setAttribute('aria-valuenow', v); tr.setAttribute('aria-valuetext', show(v));
  };
  const fd = { key: `${box.id}:${label}`, label, min, hiOf, step, get, show, put, el, seq: null, base: null, off: 0 };
  const snap = (v) => Math.round(Math.max(min, Math.min(hiOf(), min + Math.round((v - min) / step) * step)) * 1e6) / 1e6;
  // a move of the fader: its base while a sequencer runs, else its value
  const move = (v) => { if (fd.base !== null) { fd.base = snap(v); mSeqApply(fd); } else put(v); };
  let drag = null, hold = 0;
  tr.addEventListener('pointerdown', (e) => {
    tr.setPointerCapture(e.pointerId); el.classList.add('held');
    drag = { y: e.clientY, v: fd.base !== null ? fd.base : get(), h: tr.getBoundingClientRect().height };
    clearTimeout(hold);
    hold = setTimeout(() => { if (!drag) return; const v = drag.v; end(); move(v); mSeqOpen(fd); }, 500);
  });
  tr.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(drag.y - e.clientY) > 6) clearTimeout(hold);
    move(drag.v + (drag.y - e.clientY) / (drag.h * travel) * (hiOf() - min));
  });
  const end = () => { clearTimeout(hold); drag = null; el.classList.remove('held'); };
  tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end);
  tr.addEventListener('keydown', (e) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (d) { e.preventDefault(); move((fd.base !== null ? fd.base : get()) + d * step); }
  });
  let last = 0;
  el.querySelector('.m-flab').addEventListener('click', () => {
    const t = performance.now();
    if (t - last < 350 && dflt !== undefined) move(typeof dflt === 'function' ? dflt() : dflt); last = t;
  });
  fd.snap = snap;
  box.append(el); mDraws.push(draw); mFaders.push(fd);
  return draw;
}
const mDrawAll = () => mDraws.forEach((d) => d());
perfDraws.push(mDrawAll);
// a preset load rebuilds the master section; the sliders follow
// (the undo for pattern and crossfeed, which the desktop's undo doesn't cover: a function that puts them back;
// a preset load clears it, as it clears the desktop's)
let mUndoFn = null;
const mUndo = () => { document.querySelectorAll('[data-m-undo]').forEach((b) => { b.disabled = !mUndoFn && $('undo').disabled; }); };
const mBuildMaster = buildMaster;
buildMaster = function () { mBuildMaster(); mUndoFn = null; mUndo(); mDrawAll(); };

const pf = (k) => ({ min: PERF_RANGE[k][0], max: PERF_RANGE[k][1], get: () => perfGet(k), set: (v) => setPerf(k, v), show: () => perfText(k), dflt: PERF_RANGE[k][2] });
// ---- the beat page: everything that makes the pattern, three by three: genre, beat, energy / fills, rush, velocity /
// groove, its depth, accent. Genre steps through the built-in styles (not user); a preset in the user style shows it
// with the slider at the bottom ----
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
mFader($('m-beat-faders'), 'fills', { ...pf('fills'), show: () => perfText('fills').replace(' · ', '\n') });
mFader($('m-beat-faders'), 'rush', pf('rush'));
mFader($('m-beat-faders'), 'velocity', { ...pf('vel'), show: (v) => `${v}` });
mFader($('m-beat-faders'), 'groove', { ...pf('groove'), show: () => perfText('groove').replace(' ', '\n') });
mFader($('m-beat-faders'), 'depth', { ...pf('depth'), show: (v) => `${v}%` });
mFader($('m-beat-faders'), 'accent', { ...pf('accent'), show: (v) => `+${v} dB` });
// ---- the perf page: tempo, the sound macros, the sidechain and crossfeed, four by two, and the randomisers ----
mFader($('m-faders'), 'tempo', { ...pf('tempo'), show: () => `${perf.tempo}\nbpm`, travel: 2 });
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
// and the sidechain's: how far drum 1 is turning the rest down, the same scale
const mDkSet = duckVu.set;
duckVu.set = (db) => {
  mDkSet(db);
  const d = Math.max(0, Math.min(20, db || 0));
  $('m-dk').style.width = (Math.log1p(d) / Math.log1p(20) * 100).toFixed(1) + '%'; $('m-dk-out').textContent = `${d.toFixed(1)} dB`;
};

// ---- randomisers ----
// undo takes back the last randomise: the sound for everything and kit (the desktop's undo), the pattern for pattern,
// the patch for crossfeed
$('m-everything').addEventListener('click', () => { mUndoFn = null; $('new-kit').click(); });
// kit: every drum voice from a random built-in kit; the pattern, mixer and FX stay
$('m-kit').addEventListener('click', () => { mUndoFn = null; $('rand-all').click(); });
// alter: every drum's current sound varied by 10% (the desktop's alter is 5%), which undo takes back
$('m-alter').addEventListener('click', async () => {
  mUndoFn = null; await startAudio();
  randChange(() => { for (let v = 0; v < 6; v++) { delete homes[v]; randomiseVoice(v, 0.1); delete homes[v]; } });
});
// crossfeed: a new 6 x 6 patch (the desktop's crossfeed randomiser), which undo takes back
$('m-xrand').addEventListener('click', async () => {
  await startAudio();
  const was = { amt: xm.amt.slice(), target: xm.target.slice() };
  $('xrand').click();
  undoValues = null; $('undo').disabled = true;
  mUndoFn = () => {
    xm.amt.splice(0, 36, ...was.amt); xm.target.splice(0, 6, ...was.target);
    xSelects.forEach((s, d) => { s.value = xm.target[d]; }); xcells.forEach((d) => d()); sendX(); setDirty(true);
  };
  mUndo();
});
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
  undoValues = null; $('undo').disabled = true; mUndoFn = () => mPatSet(was); mUndo();
};
$('m-pattern').addEventListener('click', mRandPattern);
document.querySelectorAll('[data-m-undo]').forEach((b) => b.addEventListener('click', () => {
  if (mUndoFn) { const fn = mUndoFn; mUndoFn = null; fn(); mUndo(); } else $('undo').click();
}));
new MutationObserver(mUndo).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });

// ---- the voice page: the strip at the top picks a drum; its twelve main parameters are on faders (a set per drum, so a
// fader's step sequencer stays with its drum) ----
const VP_DRUM = (n) => [['pitch', `COARSE${n}`], ['decay', `VELOD${n}`], ['env amt', `MODAMNT${n}`], ['env time', `MOD_EG${n}`],
  ['fm amt', `FMAMNT${n}`], ['fm freq', `FM_FREQ${n}`], ['click', `TRANS${n}_VOL`], ['click frq', `TRANS${n}_FREQ`],
  ['cutoff', `FILTER_FREQ_${n}`], ['reso', `RESO_${n}`], ['drive', `DRIVE${n}`], ['rate', `VOICE_DECIMATION${n}`]];
const VOICE_PARS = [VP_DRUM(1), VP_DRUM(2), VP_DRUM(3),
  [['pitch', 'COARSE4'], ['decay', 'VELOD4'], ['noise', 'NOISE_FREQ1'], ['mix', 'MIX1'], ['env amt', 'MODAMNT4'], ['env time', 'MOD_EG4'],
    ['click', 'TRANS4_VOL'], ['click frq', 'TRANS4_FREQ'], ['cutoff', 'FILTER_FREQ_4'], ['reso', 'RESO_4'], ['drive', 'SNARE_DISTORTION'], ['rate', 'VOICE_DECIMATION4']],
  [['pitch', 'COARSE5'], ['decay', 'VELOD5'], ['m1 freq', 'MOD_OSC_F1_CYM'], ['m1 amt', 'MOD_OSC_GAIN1_CYM'], ['m2 freq', 'MOD_OSC_F2_CYM'], ['m2 amt', 'MOD_OSC_GAIN2_CYM'],
    ['click', 'TRANS5_VOL'], ['click frq', 'TRANS5_FREQ'], ['cutoff', 'FILTER_FREQ_5'], ['reso', 'RESO_5'], ['drive', 'CYMBAL_DISTORTION'], ['rate', 'VOICE_DECIMATION5']],
  [['pitch', 'COARSE6'], ['closed', 'VELOD6_CLOSED'], ['open', 'VELOD6_OPEN'], ['m1 freq', 'MOD_OSC_F1'], ['m1 amt', 'MOD_OSC_GAIN1'], ['m2 freq', 'MOD_OSC_F2'],
    ['m2 amt', 'MOD_OSC_GAIN2'], ['click', 'TRANS6_VOL'], ['cutoff', 'FILTER_FREQ_6'], ['reso', 'RESO_6'], ['drive', 'HAT_DISTORTION'], ['rate', 'VOICE_DECIMATION6']]];
let mVoice = 0;
XN.forEach((name, v) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'm-btn'; b.textContent = name; b.setAttribute('role', 'tab');
  b.addEventListener('click', () => { mVoice = v; mVoiceShow(); });
  $('m-voice').append(b);
  const box = document.createElement('div');
  box.className = 'm-faders m-vset'; box.id = `m-voice-${v + 1}`; $('m-vsets').append(box);
  for (const [label, name] of VOICE_PARS[v]) {
    const par = PAR[name];
    mFader(box, label, { min: 0, max: spec(par).max, get: () => values[par], set: (x) => { setValue(par, x); setDirty(true); }, show: String, dflt: () => initValues[par] });
  }
});
function mVoiceShow() {
  [...$('m-voice').children].forEach((b, v) => b.setAttribute('aria-selected', v === mVoice));
  [...$('m-vsets').children].forEach((box, v) => { box.hidden = v !== mVoice; });
  mDrawAll();
}
mVoiceShow();
const mPct = (v) => (v ? Math.round(v) + '%' : 'off');
// the same send on every drum (the mixer's per-drum sends, all at once); an echo send routes the drum to the echo bus
const mAllSend = (k) => ({ min: 0, max: 100, get: () => Math.max(...mix[k]), show: (v) => `send ${mPct(v)}`,
  set: (v) => { mix[k].fill(v); if (k === 'fx') fxButtons.forEach((b) => b()); sendMix(); } });

// ---- presets: save, and a list to load or delete (kept in this browser, as on the desktop) ----
// while playing, a preset waits for the next bar to come in: until it's heard, the one playing stays marked and the
// new one's row flashes
let mPending = null, mPlayingPreset = null;
const mLoad = (k) => {
  if (!mPending) mPlayingPreset = kitList[Number($('kit').value)];
  loadPreset(k); mPending = playing ? k : null; mDrawPresets();
};
// the tempo box: ticked, loading a preset brings its saved tempo; unticked, the tempo stays (the desktop's bpm box,
// remembered in this browser)
$('m-pbpm').checked = presetBpm.checked;
$('m-pbpm').addEventListener('change', () => { presetBpm.checked = $('m-pbpm').checked; presetBpm.dispatchEvent(new Event('change')); });
// favourites: a star on any preset, mine or built in, keeps it in a group at the top of the list. Kept in this browser
// by name (a saved one also carries fav, so an export keeps it)
const FAV_KEY = 'elixir-mobile-favs';
const mFavs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } })());
for (const k of kitList) if (k.saved && k.fav) mFavs.add(k.name);
const mFavStore = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...mFavs])); } catch (e) {} };
function mDrawPresets() {
  const list = $('m-plist'), cur = mPending ? mPlayingPreset : kitList[Number($('kit').value)];
  list.innerHTML = '';
  const group = (t) => { const li = document.createElement('li'); li.className = 'm-pgroup'; li.textContent = t; list.append(li); };
  const row = (k) => {
    const li = document.createElement('li'); li.classList.toggle('cur', k === cur); li.classList.toggle('pending', k === mPending);
    li.innerHTML = '<button class="m-pload" type="button"><b></b><small></small></button>';
    li.querySelector('b').textContent = k.name; li.querySelector('small').textContent = k.song ? `${k.song.tempo} bpm` : '';
    li.querySelector('.m-pload').addEventListener('click', async () => { await startAudio(); mLoad(k); });
    const fav = mFavs.has(k.name), star = document.createElement('button');
    star.className = 'm-pfav'; star.type = 'button'; star.textContent = fav ? '★' : '☆';
    star.setAttribute('aria-pressed', fav); star.setAttribute('aria-label', `Favourite ${k.name}`);
    star.addEventListener('click', () => {
      if (mFavs.has(k.name)) mFavs.delete(k.name); else mFavs.add(k.name);
      if (k.saved) { k.fav = mFavs.has(k.name); storePresets(); }
      mFavStore(); mDrawPresets();
    });
    li.append(star);
    // (a built-in one has a gap where a saved one's delete is, so every row's name lines up)
    if (!k.saved) { const gap = document.createElement('span'); gap.className = 'm-pdel'; li.append(gap); }
    if (k.saved) {
      const d = document.createElement('button'); d.className = 'm-pdel'; d.type = 'button'; d.textContent = '✕';
      d.setAttribute('aria-label', `Delete ${k.name}`);
      d.addEventListener('click', () => {
        if (!confirm(`Delete ${k.name}?`)) return;
        const wasCur = k === kitList[Number($('kit').value)], keep = kitList[Number($('kit').value)];
        kitList.splice(kitList.indexOf(k), 1); storePresets(); fillKits();
        mFavs.delete(k.name); mFavStore();
        $('kit').value = wasCur ? 0 : kitList.indexOf(keep);
        mDrawPresets();
      });
      li.append(d);
    }
    list.append(li);
  };
  // favourites first (each shows only there), then mine, then built in
  const favs = kitList.filter((k) => mFavs.has(k.name) && (k.saved || k.builtin));
  if (favs.length) { group('favourites'); favs.forEach(row); }
  const mine = kitList.filter((k) => k.saved && !mFavs.has(k.name));
  group('mine');
  if (mine.length) mine.slice().reverse().forEach(row);
  else { const li = document.createElement('li'); li.className = 'm-pempty'; li.textContent = favs.some((k) => k.saved) ? 'All starred.' : 'None yet. Save makes one.'; list.append(li); }
  group('built in');
  kitList.filter((k) => k.builtin && !mFavs.has(k.name)).forEach(row);
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
        const q = toCurrent(p); // (any preset with a kit, brought into this format)
        if (!q) { old++; continue; }
        if (kitList.some((k) => k.saved && k.name === q.name)) continue;
        kitList.push(fromStored(q, { saved: true })); n++;
        if (q.fav) { mFavs.add(q.name); mFavStore(); }
      }
    } catch (err) { bad++; }
  }
  e.target.value = '';
  if (n) { const v = $('kit').value; storePresets(); fillKits(); $('kit').value = v; }
  $('m-pnote').textContent = (n ? `Imported ${n}.` : 'Nothing new to import.') + (old ? ` ${old} skipped: not a preset.` : '') + (bad ? ` ${bad} file${bad > 1 ? 's' : ''} not a presets file.` : '');
  mDrawPresets();
});
// export: the favourites, built in and saved alike (each marked fav, so an import stars them again)
$('m-pexport').addEventListener('click', async () => {
  const favs = kitList.filter((k) => (k.saved || k.builtin) && mFavs.has(k.name)).map((k) => ({ ...presetData(k), fav: true }));
  if (!favs.length) { $('m-pnote').textContent = 'Star some presets first.'; return; }
  const blob = new Blob([JSON.stringify({ elixir: 1, presets: favs }, null, 1)], { type: 'application/json' });
  if (!await mOffer({ blob, name: 'elixir-mobile-favourites.json' }, 'application/json')) return; // (cancelled: nothing deleted)
  $('m-pnote').textContent = `Exported ${favs.length} favourite${favs.length > 1 ? 's' : ''}.`;
  // (for now, while the factory presets are being made: once they're out, offer a clean slate)
  const mine = kitList.filter((k) => k.saved);
  if (!confirm(`Exported ${favs.length}. Delete all ${mine.length} of your saved presets and clear every star?`)) return;
  const cur = kitList[Number($('kit').value)];
  for (const k of mine) kitList.splice(kitList.indexOf(k), 1);
  mFavs.clear(); mFavStore(); storePresets(); fillKits();
  $('kit').value = Math.max(0, kitList.indexOf(cur));
  $('m-pnote').textContent = `Exported ${favs.length}; your presets deleted.`;
  mDrawPresets();
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
// (true once it's shared or downloaded, false if the share sheet was cancelled)
async function mOffer(t, type) {
  const file = new File([t.blob], t.name, { type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t.name }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  mDownload(t);
  return true;
}

// ---- the fx page: the two send effects' settings on faders, a row each (the distortion is on the master page) ----
const fxF = (box, label, A) => mFader($(box), label, { min: A.min, max: A.max, step: A.step || 1, get: A.get, set: (v) => { A.set(v); setDirty(true); }, show: A.show, dflt: A.dflt });
const fxSend = (k) => ({ ...mAllSend(k), show: (v) => mPct(v), dflt: 0 });
const fxPar = (p, dflt) => ({ min: 0, max: 127, get: () => values[p], set: (v) => setValue(p, v, true), show: String, dflt });
const fx3P = (i) => ({ min: 0, max: 127, get: () => fx3.dist.p[i], set: (v) => { fx3.dist.p[i] = v; sendMix(); }, show: String, dflt: FX3_0.dist.p[i] });
// echo: send, its tempo-synced time (the nearest note length), tone, feedback and width
fxF('m-fx-echo', 'send', fxSend('fx'));
fxF('m-fx-echo', 'time', { min: 0, max: 1000, get: () => Math.round(delayPos * 1000), set: (v) => { delayPos = v / 1000; send({ type: 'delay', pos: delayPos }); },
  show: (v) => showDelay(v).replace(/^\d+% /, ''), dflt: Math.round(posOf(3 / 16) * 1000) });
fxF('m-fx-echo', 'tone', fxPar(PAR.FX_P3));
fxF('m-fx-echo', 'feedback', fxPar(PAR.FX_P4));
fxF('m-fx-echo', 'width', { min: 0, max: 200, get: () => fx3.echo.pct, set: (v) => { fx3.echo.pct = v; sendMix(); }, show: (v) => v + '%', dflt: FX3_0.echo.pct });
// ring mod: send, the carrier's wave and frequency
fxF('m-fx-ring', 'send', fxSend('ring'));
const RING_W = LXR.OSC_WAVE_NAMES.map((n) => n.toLowerCase());
fxF('m-fx-ring', 'wave', { min: 0, max: RING_W.length - 1, get: () => fx3.ring.wave, set: (v) => { fx3.ring.wave = v; sendMix(); }, show: (v) => RING_W[v], dflt: 0 });
fxF('m-fx-ring', 'freq', { min: 0, max: 127, get: () => fx3.ring.freq, set: (v) => { fx3.ring.freq = v; sendMix(); }, show: String, dflt: FX3_0.ring.freq });

// ---- the master page's distortion: the whole mix through it (after the sidechain's duck), into the compressor; the
// page runs top to bottom in signal order: sidechain, distortion, compressor. Mix (0 bypasses it), type (tube,
// fold or rat), drive, color, tone, volume ----
fxF('m-dist', 'mix', { min: 0, max: 100, get: () => fx3.dist.mix || 0, set: (v) => { fx3.dist.mix = v; sendMix(); }, show: (v) => (v ? v + '%' : 'off'), dflt: 0 });
const DIST_T = LXR.DIST_NAMES.map((n) => n.toLowerCase());
fxF('m-dist', 'type', { min: 0, max: DIST_T.length - 1, get: () => fx3.dist.type, set: (v) => { fx3.dist.type = v; sendMix(); }, show: (v) => DIST_T[v], dflt: 0 });
['drive', 'color', 'tone', 'volume'].forEach((l, i) => fxF('m-dist', l, fx3P(i)));

// ---- the mix page: each drum's echo and ring mod sends, then its level, a column a drum ----
const XS = ['d1', 'd2', 'd3', 'sn', 'cy', 'hh'];
XS.forEach((short, n) => {
  // an echo send above 0 routes the drum to the echo bus (fxButtons does that, as the mixer's dial does)
  for (const [k, box] of [['fx', 'm-mix-echo'], ['ring', 'm-mix-ring']]) {
    mFader($(box), short, { min: 0, max: 100, get: () => mix[k][n], show: (v) => (v ? String(v) : 'off'), dflt: 0,
      set: (v) => { mix[k][n] = v; if (k === 'fx') fxButtons[n](); sendMix(); setDirty(true); } });
  }
  const vol = PAR.VOL1 + n;
  mFader($('m-mix-vol'), short, { min: 0, max: 127, get: () => values[vol], show: String, dflt: () => initValues[vol],
    set: (v) => { setValue(vol, v, true); setDirty(true); } });
});

// random fx: new sends on every drum (each effect on some of them) and new settings for the echo and ring mod;
// alter fx: every send already on, and every setting, moved up to 10% of its range either way. Undo takes either back
const fxSnap = () => ({ fx: mix.fx.slice(), ring: mix.ring.slice(), fx3: structuredClone(fx3), pos: delayPos, p3: values[PAR.FX_P3], p4: values[PAR.FX_P4] });
function fxUse(q) {
  mix.fx.splice(0, 6, ...q.fx); mix.ring.splice(0, 6, ...q.ring);
  Object.assign(fx3.echo, q.fx3.echo); Object.assign(fx3.ring, q.fx3.ring);
  delayPos = q.pos; send({ type: 'delay', pos: delayPos });
  setValue(PAR.FX_P3, q.p3, true); setValue(PAR.FX_P4, q.p4, true);
  fxButtons.forEach((b) => b()); sendMix(); mDrawAll(); setDirty(true);
}
const rIn = (lo, hi) => lo + Math.round(Math.random() * (hi - lo));
function fxChange(fn) {
  const was = fxSnap(), q = fxSnap();
  fn(q); fxUse(q);
  undoValues = null; $('undo').disabled = true; mUndoFn = () => fxUse(was); mUndo();
}
$('m-fx-rand').addEventListener('click', async () => {
  await startAudio();
  fxChange((q) => {
    for (let v = 0; v < 6; v++) {
      q.fx[v] = Math.random() < 0.5 ? rIn(10, 60) : 0;
      q.ring[v] = Math.random() < 0.2 ? rIn(10, 60) : 0;
    }
    q.pos = randomDelayPos(); // (musical lengths, as every randomiser)
    q.p3 = rIn(40, 110); q.p4 = Math.random() < 0.8 ? rIn(15, 70) : rIn(70, 105);
    q.fx3.echo.pct = rIn(60, 160);
    q.fx3.ring.wave = rIn(0, RING_W.length - 1); q.fx3.ring.freq = rIn(5, 120);
  });
});
$('m-fx-alter').addEventListener('click', async () => {
  await startAudio();
  const nudge = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v + (Math.random() * 2 - 1) * 0.1 * (hi - lo))));
  fxChange((q) => {
    for (const k of ['fx', 'ring']) q[k] = q[k].map((v) => (v ? nudge(v, 1, 100) : 0));
    q.pos = Math.max(0, Math.min(1, q.pos + (Math.random() * 2 - 1) * 0.05));
    q.p3 = nudge(q.p3, 0, 127); q.p4 = nudge(q.p4, 0, 127);
    q.fx3.echo.pct = nudge(q.fx3.echo.pct, 0, 200);
    q.fx3.ring.freq = nudge(q.fx3.ring.freq, 0, 127);
  });
});

// ---- step sequencers: holding a fader opens one for it: 2 to 16 steps, each an offset from the fader's setting (up or
// down, up to depth of its range) that it takes while playing (the step is the bar's 16th counted from the start,
// wrapped at the length, so short ones run against the bar), jumping to it or, with slew, gliding to it over up to a
// whole step; each step lasts a 16th note up to 8 bars. The fader still moves its setting meanwhile, and stopping
// (or switching the sequencer off) puts the setting back.
// Draw the steps with a finger (drag across to paint), randomise them, or switch it off; a fader with one running is
// marked. Presets keep them ----
const mSeqSteps = Array.from({ length: 16 }, (_, i) => { const c = document.createElement('i'); c.dataset.i = i; $('m-seq-steps').append(c); return c; });
let mSeqF = null;
// speed: how long each step lasts, in 16ths: a 16th note (1) up to 8 bars (128); counted from the bar's 16ths, so every
// speed stays in time with the beat
const SEQ_STEPS = [1, 2, 4, 8, 16, 32, 64, 128];
const stepName = (v) => (v < 16 ? `1/${16 / v}` : v === 16 ? '1 bar' : `${v / 16} bars`);
// a step's offset, -1..1 of depth, in twentieths
const mSeqOff = (x) => Math.round(Math.max(-1, Math.min(1, x)) * 20) / 20;
const newSeq = () => ({ on: true, len: 16, slew: 0, step: 1, depth: 50, vals: new Array(16).fill(0) });
// the value heard: the setting moved by the current offset
function mSeqApply(f) {
  const q = f.seq;
  if (f.base === null) f.base = f.get();
  f.put(f.base + f.off * (q ? q.depth / 100 : 0) * (f.hiOf() - f.min));
}
// back to the setting, the sequencer let go
function mSeqRelease(f) {
  if (f.base === null) return;
  const b = f.base; f.glide = null; f.off = 0; f.base = null; f.put(b);
}
function mSeqOpen(fd) {
  if (!fd.seq) fd.seq = newSeq();
  mSeqF = fd; $('m-seq-name').textContent = fd.label;
  $('m-seq').hidden = false; mSeqDraw();
}
function mSeqDraw() {
  const fd = mSeqF, q = fd.seq;
  mSeqSteps.forEach((c, i) => {
    c.style.setProperty('--up', Math.max(0, q.vals[i])); c.style.setProperty('--dn', Math.max(0, -q.vals[i]));
    c.classList.toggle('off', i >= q.len);
  });
  $('m-seq-depth').style.setProperty('--w', q.depth / 100); $('m-seq-depth-out').textContent = `±${q.depth}%`;
  $('m-seq-len').style.setProperty('--w', q.len / 16); $('m-seq-len-out').textContent = `${q.len} steps`;
  $('m-seq-slew').style.setProperty('--w', q.slew / 100); $('m-seq-slew-out').textContent = q.slew ? `${q.slew}%` : 'off';
  $('m-seq-speed').style.setProperty('--w', (SEQ_STEPS.indexOf(q.step) + 1) / SEQ_STEPS.length); $('m-seq-speed-out').textContent = stepName(q.step);
  $('m-seq-on').setAttribute('aria-pressed', q.on); $('m-seq-on').textContent = q.on ? 'on' : 'off';
  mSeqMarks();
}
const mSeqMarks = () => mFaders.forEach((f) => f.el.classList.toggle('seq', !!(f.seq && f.seq.on)));
// presets keep them: song.seqs, by fader (its box and label); a preset without one clears it
const mSnapSong = songSnapshot, mUseSong = useSong;
songSnapshot = function () {
  const seqs = {};
  // (with the settings, not the values heard, saved)
  const held = mFaders.filter((f) => f.base !== null).map((f) => [f, f.get()]);
  for (const [f] of held) f.put(f.base);
  for (const f of mFaders) if (f.seq) seqs[f.key] = { on: f.seq.on, len: f.seq.len, slew: f.seq.slew, step: f.seq.step, depth: f.seq.depth, rel: true, vals: f.seq.vals.slice() };
  const song = { ...mSnapSong(), seqs, xdepth: Number($('xdepth').value) };
  for (const [f, v] of held) f.put(v);
  return song;
};
useSong = function (g, keepTempo) {
  mUseSong(g, keepTempo);
  mXDepth(typeof g.xdepth === 'number' ? g.xdepth : 100);
  for (const f of mFaders) {
    const q = g.seqs && g.seqs[f.key];
    f.base = null; f.off = 0; f.glide = null;
    // (sequences saved before they were offsets held values: they become offsets from the middle of the range)
    const hi = f.hiOf(), vals = q ? (q.rel ? q.vals.slice() : q.vals.map((v) => mSeqOff(((v - f.min) / (hi - f.min || 1)) * 2 - 1))) : null;
    f.seq = q ? { on: !!q.on, len: q.len, slew: q.slew || 0, step: SEQ_STEPS.includes(q.step) ? q.step : 1, depth: typeof q.depth === 'number' ? q.depth : 50, vals } : null;
  }
  if (mSeqF) { if (mSeqF.seq) mSeqDraw(); else $('m-seq-close').click(); }
  mSeqMarks();
};
// painting: a step takes the offset at the finger's height (the middle is none); dragging across paints the steps it passes
{
  const box = $('m-seq-steps');
  let painting = false;
  const paint = (e) => {
    const r = box.getBoundingClientRect(), cols = 8, rows = 2;
    const col = Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / r.width * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - r.top) / r.height * rows)));
    const c = mSeqSteps[row * cols + col], cr = c.getBoundingClientRect();
    if (c.classList.contains('off')) return;
    const o = mSeqF.seq.vals[row * cols + col] = mSeqOff(1 - 2 * (e.clientY - cr.top) / cr.height);
    $('m-seq-val').textContent = `${o > 0 ? '+' : o < 0 ? '−' : ''}${Math.round(Math.abs(o) * mSeqF.seq.depth)}%`;
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
mSeqBar($('m-seq-speed'), (x) => { mSeqF.seq.step = SEQ_STEPS[Math.min(SEQ_STEPS.length - 1, Math.floor(x * SEQ_STEPS.length))]; });
mSeqBar($('m-seq-depth'), (x) => { mSeqF.seq.depth = Math.round(x * 20) * 5; if (mSeqF.base !== null) mSeqApply(mSeqF); });
$('m-seq-rand').addEventListener('click', () => { const q = mSeqF.seq; for (let i = 0; i < 16; i++) q.vals[i] = mSeqOff(Math.random() * 2 - 1); q.on = true; mSeqDraw(); });
$('m-seq-on').addEventListener('click', () => { mSeqF.seq.on = !mSeqF.seq.on; if (!mSeqF.seq.on) mSeqRelease(mSeqF); mSeqDraw(); });
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
      f.off = g.from + (g.to - g.from) * k; mSeqApply(f);
      if (k < 1 && f.seq && f.seq.on) any = true; else f.glide = null;
    }
    if (any) requestAnimationFrame(tick); else mGlideOn = false;
  };
  requestAnimationFrame(tick);
}
$('m').addEventListener('contextmenu', (e) => e.preventDefault());
// one step of a fader's sequencer: its offset, jumped to or, with slew, glided to over that share of the step
function mSeqStep(f, i, ms) {
  const q = f.seq, k = i % q.len, to = q.vals[k];
  if (q.slew) { f.glide = { from: f.off, to, t0: performance.now(), ms: q.slew / 100 * ms }; mGlideRun(); } else { f.glide = null; f.off = to; mSeqApply(f); }
  if (f === mSeqF) mSeqSteps.forEach((c, j) => c.classList.toggle('now', j === k));
}
// stopping puts every fader back to its setting
new MutationObserver(() => {
  if ($('play').getAttribute('aria-pressed') === 'true') return;
  mFaders.forEach(mSeqRelease); mSeqSteps.forEach((c) => c.classList.remove('now'));
  if (mPending) { mPending = null; mDrawPresets(); }
}).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
// on each 16th (as the audio thread reaches it, ahead of the output), every running sequencer steps its fader
const mOnEvent = onEvent;
onEvent = function (ev) {
  // the bar a waiting preset comes in on: stop its flash as that bar is heard
  if (ev.type === 'step' && ev.step === 0 && mPending) {
    const p = mPending; setTimeout(() => { if (mPending === p) { mPending = null; mDrawPresets(); } }, ctx && ctx.outputLatency ? ctx.outputLatency * 1000 : 0);
  }
  if (ev.type === 'step' && playing) {
    const n = ev.bar * 16 + ev.step, stepMs = 60000 / perf.tempo / 4;
    for (const f of mFaders) {
      const q = f.seq; if (!q || !q.on) continue;
      // a step each time the count reaches the step length
      const len = q.step || 1;
      if (n % len === 0) mSeqStep(f, n / len, stepMs * len);
    }
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


// ---- the x/y page: two pads, each moving any two parameters. Each axis is picked in two short lists: first where it
// lives (a drum, perform, fx, mix or master), then the parameter there (a drum's every parameter, grouped as on the
// voice, or that page's faders), so neither list is long. The picks are kept in this browser ----
const XY_IN = 16; // (the CSS's 16px)
// the places and their parameters: { name, groups: [[heading, [axis…]]] }, an axis { label, min, max, get, set }
const XY_PLACES = (() => {
  const nice = (t) => t.toLowerCase().replace(/_/g, ' ');
  const drums = XN.map((name, v) => ({ name, groups: VOICE_PAGES[v].groups.filter((g) => g.params.length).map((g) => [nice(g.name.replace(/ \(.*\)/, '')),
    g.params.map(([text, pn]) => { const par = PAR[pn]; return { label: nice(text), min: 0, max: spec(par).max, get: () => values[par], set: (x) => setValue(par, x) }; })]) }));
  // a page's faders, by their row
  const faders = (rows) => rows.map(([heading, box]) => [heading, mFaders.filter((f) => f.key.startsWith(box + ':')).map((f) => ({ label: f.label, min: f.min, max: f.hiOf(), get: f.get, set: (x) => f.put(x) }))]);
  return [...drums,
    { name: 'beat', groups: faders([['beat', 'm-beat-faders']]) },
    { name: 'perf', groups: faders([['perf', 'm-faders']]) },
    { name: 'fx', groups: faders([['echo', 'm-fx-echo'], ['ring mod', 'm-fx-ring']]) },
    { name: 'mix', groups: faders([['echo send', 'm-mix-echo'], ['ring send', 'm-mix-ring'], ['level', 'm-mix-vol']]) },
    { name: 'master', groups: faders([['sidechain', 'm-duck'], ['distortion', 'm-dist'], ['compressor', 'm-comp']]) }];
})();
// two pads, one above the other, each with its own x and y picks: [pad][axis] = [place, group, item]
const XY_KEY = 'elixir-mobile-xy';
let mXY = (() => { try { return JSON.parse(localStorage.getItem(XY_KEY)); } catch (e) { return null; } })();
if (!Array.isArray(mXY) || !Array.isArray(mXY[0]) || !Array.isArray(mXY[0][0])) mXY = [mXY && Array.isArray(mXY[0]) ? mXY : [[0, 0, 0], [0, 1, 1]], [[0, 5, 0], [0, 5, 1]]];
if (!mXY[1]) mXY[1] = [[0, 5, 0], [0, 5, 1]];
const xyAxis = (n, k) => { const [pl, g, i] = mXY[n][k], P = XY_PLACES[pl] || XY_PLACES[0], G = P.groups[g] || P.groups[0]; return { place: P.name, ...(G[1][i] || G[1][0]) }; };
function xyPick() { try { localStorage.setItem(XY_KEY, JSON.stringify(mXY)); } catch (e) {} mDrawAll(); }
[0, 1].forEach((n) => {
  const box = document.createElement('div'); box.className = 'm-xybox';
  box.innerHTML = ['x', 'y'].map((ax) => `<div class="m-xyrow"><span>${ax}</span><select aria-label="pad ${n + 1} ${ax === 'x' ? 'across' : 'up'}: where"></select><select aria-label="pad ${n + 1} ${ax === 'x' ? 'across' : 'up'}: parameter"></select></div>`).join('');
  const sels = [...box.querySelectorAll('select')]; // place, parameter for x, then for y
  const lists = () => [0, 1].forEach((k) => {
    const place = sels[k * 2], par = sels[k * 2 + 1];
    place.innerHTML = ''; XY_PLACES.forEach((P, i) => place.append(new Option(P.name, i)));
    place.value = mXY[n][k][0];
    par.innerHTML = '';
    (XY_PLACES[mXY[n][k][0]] || XY_PLACES[0]).groups.forEach(([heading, axes], g) => {
      const og = document.createElement('optgroup'); og.label = heading;
      axes.forEach((A, i) => og.append(new Option(A.label, `${g}:${i}`)));
      par.append(og);
    });
    par.value = `${mXY[n][k][1]}:${mXY[n][k][2]}`;
  });
  [0, 1].forEach((k) => {
    sels[k * 2].addEventListener('change', (e) => { mXY[n][k] = [Number(e.target.value), 0, 0]; lists(); xyPick(); });
    sels[k * 2 + 1].addEventListener('change', (e) => { const [g, i] = e.target.value.split(':').map(Number); mXY[n][k] = [mXY[n][k][0], g, i]; xyPick(); });
  });
  const pad = document.createElement('div');
  pad.className = 'm-xy'; pad.setAttribute('role', 'group');
  pad.innerHTML = `<b class="m-xy-t"></b><span class="m-xy-x"></span><span class="m-xy-y"></span><i></i><output></output>`;
  const out = pad.querySelector('output');
  const fr = (A) => (A.get() - A.min) / ((A.max - A.min) || 1);
  const show = (v) => (Number.isInteger(v) ? v : v.toFixed(2));
  const draw = () => {
    const X = xyAxis(n, 0), Y = xyAxis(n, 1);
    pad.querySelector('.m-xy-t').textContent = X.place === Y.place ? X.place : `${X.place} / ${Y.place}`;
    pad.querySelector('.m-xy-x').textContent = `${X.label} →`; pad.querySelector('.m-xy-y').textContent = `↑ ${Y.label}`;
    pad.setAttribute('aria-label', `pad ${n + 1}: ${X.place} ${X.label} across, ${Y.place} ${Y.label} up`);
    pad.style.setProperty('--x', fr(X)); pad.style.setProperty('--y', fr(Y));
    out.textContent = `${X.label} ${show(X.get())}\n${Y.label} ${show(Y.get())}`;
  };
  const at = (e) => {
    const r = pad.getBoundingClientRect(), X = xyAxis(n, 0), Y = xyAxis(n, 1);
    const val = (A, f) => A.min + Math.round(Math.max(0, Math.min(1, f)) * (A.max - A.min));
    const x = val(X, (e.clientX - r.left - XY_IN) / (r.width - 2 * XY_IN)), y = val(Y, (r.bottom - XY_IN - e.clientY) / (r.height - 2 * XY_IN));
    if (x !== X.get()) X.set(x);
    if (y !== Y.get()) Y.set(y);
    mDrawAll(); setDirty(true); // (the faders show the same parameters)
  };
  let held = false;
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); held = true; pad.classList.add('held'); at(e); });
  pad.addEventListener('pointermove', (e) => { if (held) at(e); });
  const end = () => { held = false; pad.classList.remove('held'); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  box.append(pad); $('m-xy-card').append(box); mDraws.push(draw);
  lists();
});

// ---- the glass isn't flat: each control's ink shadow deepens a little toward the top right of the screen (--d, used
// by the CSS), worked out once from where it sits and again when the screen's size changes ----
function mDepth() {
  const m = $('m').getBoundingClientRect();
  for (const el of document.querySelectorAll('.m-vf, .m-btn, .m-toggle, .m-pload, .m-tabs button, .m-xy, .m-chead, .m-fx-row > b, .m-title, .m-trans button, .m-seq-lenrow')) {
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    // pages off to the side count by their place on their own page
    const x = (((r.left + r.width / 2 - m.left) % m.width) + m.width) % m.width / m.width, y = (r.top + r.height / 2 - m.top) / m.height;
    el.style.setProperty('--d', (1 + 0.7 * Math.max(0, Math.min(1, x)) * Math.max(0, Math.min(1, 1 - y))).toFixed(2));
  }
}
addEventListener('resize', mDepth);
requestAnimationFrame(mDepth);
mSync(); mUndo(); mCompOn(); mDrawAll();
