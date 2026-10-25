// ---- the phone screen: play, record, sliders, randomisers, the compressor and presets, driving the full app underneath ----
// The desktop panels stay in the page (hidden) so the engine, presets and randomisers run as they do there;
// the buttons here press theirs and the sliders write the same state.
// iOS: play Web Audio through the ringer switch like a music app
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
const mRnd = (n) => Math.floor(Math.random() * n);

// ---- tabs ----
function mTab(t) {
  document.querySelectorAll('[data-m-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mTab === t));
  document.querySelectorAll('[data-m-panel]').forEach((el) => { el.hidden = el.dataset.mPanel !== t; });
  if (t === 'presets') mDrawPresets();
}
document.querySelectorAll('[data-m-tab]').forEach((b) => b.addEventListener('click', () => mTab(b.dataset.mTab)));
$('m-pname').addEventListener('click', () => mTab('presets'));

// ---- transport ----
const mPlay = $('m-play'), mRec = $('m-rec');
const mSync = () => {
  const on = $('play').getAttribute('aria-pressed') === 'true';
  mPlay.setAttribute('aria-pressed', on); mPlay.querySelector('span').textContent = on ? 'stop' : 'play';
};
new MutationObserver(mSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
mPlay.addEventListener('click', () => $('play').click());

// ---- sliders: one row each, label, readout and a wide track; a double tap on the label resets it ----
const mDraws = [];
function mFader(box, label, { min, max, step = 1, get, set, show, dflt }) {
  const row = document.createElement('label');
  row.className = 'm-fader'; row.innerHTML = `<span class="m-flab"></span><output></output><input type="range" min="${min}" max="${max}" step="${step}">`;
  row.querySelector('.m-flab').textContent = label;
  const inp = row.querySelector('input'), out = row.querySelector('output');
  inp.setAttribute('aria-label', label);
  const draw = () => {
    const hi = typeof max === 'function' ? max() : max; inp.max = hi;
    const v = get(); inp.value = v; out.textContent = show(v); inp.style.setProperty('--f', (v - min) / (hi - min || 1));
  };
  inp.addEventListener('input', () => { set(Number(inp.value)); draw(); });
  let last = 0;
  row.querySelector('.m-flab').addEventListener('click', (e) => {
    e.preventDefault(); const t = performance.now();
    if (t - last < 350 && dflt !== undefined) { set(dflt); draw(); } last = t;
  });
  box.append(row); mDraws.push(draw);
  return draw;
}
const mDrawAll = () => mDraws.forEach((d) => d());
perfDraws.push(mDrawAll);
// a preset load rebuilds the master section; the sliders follow
const mBuildMaster = buildMaster;
buildMaster = function () { mBuildMaster(); mDrawAll(); };

const pf = (k) => ({ min: PERF_RANGE[k][0], max: PERF_RANGE[k][1], get: () => perfGet(k), set: (v) => setPerf(k, v), show: () => perfText(k), dflt: PERF_RANGE[k][2] });
// beat runs over the current style's grooves, and names the style
mFader($('m-faders'), 'beat', { ...pf('beat'), max: () => STYLES[styleIdx].grooves.length - 1 || 1, show: () => `${STYLES[styleIdx].name} · ${perfText('beat')}` });
mFader($('m-faders'), 'energy', pf('energy'));
mFader($('m-faders'), 'rush', pf('rush'));
// the drum 1 sidechain duck: above 0 it switches the sidechain on
const setDuck = (v) => {
  master.duck = v / 100;
  if (v > 0 && !master.duckOn) $('duck-on').click(); else sendMix();
};
const duckFader = { min: 0, max: 100, get: () => (master.duckOn ? Math.round(master.duck * 100) : 0), set: setDuck, show: (v) => (v ? v + '%' : 'off'), dflt: Math.round(MASTER0.duck * 100) };
mFader($('m-faders'), 'sidechain', duckFader);

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
$('m-everything').addEventListener('click', () => $('new-kit').click());
// kit + pattern: every drum voice from a random built-in kit, and the pattern rolled too
// (style, beat, energy, fills, groove and its depth); tempo, rush, mixer and FX stay
$('m-kit').addEventListener('click', async () => {
  $('rand-all').click();
  const styles = STYLES.map((st, i) => (st.user ? -1 : i)).filter((i) => i >= 0);
  setStyle(styles[mRnd(styles.length)]);
  perf.beat = mRnd(STYLES[styleIdx].grooves.length); perf.energy = 35 + mRnd(61); perf.fills = mRnd(101);
  groove.type = GROOVE_TYPES[mRnd(GROOVE_TYPES.length)].name; groove.depth = 50 + mRnd(51);
  drawUserTools();
  if (view === 'steps') setTab('perform'); else generate();
  drawGroove(); sendSeq(); setDirty(true);
});
$('m-undo').addEventListener('click', () => $('undo').click());
const mUndo = () => { $('m-undo').disabled = $('undo').disabled; };
new MutationObserver(mUndo).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });

// ---- presets: save, and a list to load or delete (kept in this browser, as on the desktop) ----
// (a star once it's changed, as on the desktop's save button)
const mName = () => { const o = kitList[Number($('kit').value)]; $('m-pname').textContent = (o ? o.name : 'new sound') + ($('dirty').classList.contains('on') ? ' *' : ''); };
new MutationObserver(mName).observe($('kit'), { childList: true, subtree: true, attributes: true });
new MutationObserver(mName).observe($('dirty'), { attributes: true, attributeFilter: ['class'] });
$('kit').addEventListener('change', mName);
const mLoad = (k) => { loadPreset(k); mName(); mDrawPresets(); };
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
        mName(); mDrawPresets();
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
  mName(); mDrawPresets();
});

// ---- record: free length, no count-in; starts now (and starts playback), the second press stops and saves ----
let mTake = null, mTimer = 0;
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

// a finished take downloads straight away; it also stays on the take card to save again (or share, on a phone)
const mAddTake = addTake;
addTake = function (t) {
  mAddTake(t);
  mTake = t;
  $('m-take').hidden = false; $('m-take-name').textContent = t.name; $('m-take-sub').textContent = `${t.len} · 44.1 kHz 16-bit`;
  mRecUi();
  mDownload(t);
};
function mDownload(t) {
  const a = document.createElement('a'), url = URL.createObjectURL(t.blob);
  a.href = url; a.download = t.name; a.style.display = 'none';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('m-save').addEventListener('click', async () => {
  if (!mTake) return;
  const file = new File([mTake.blob], mTake.name, { type: 'audio/wav' });
  // phones get the share sheet (Save to Files, AirDrop, apps); elsewhere it downloads again
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: mTake.name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  mDownload(mTake);
});

mSync(); mUndo(); mName(); mCompOn(); mDrawAll();
