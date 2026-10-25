// ---- the phone screen: play, record, three faders and the randomisers, driving the full app underneath ----
// The desktop panels stay in the page (hidden) so the engine, presets and randomisers run as they do there;
// the buttons here press theirs and the faders write the perform state.
// iOS: play Web Audio through the ringer switch like a music app
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

const mPlay = $('m-play'), mRec = $('m-rec');
const mSync = () => {
  const on = $('play').getAttribute('aria-pressed') === 'true';
  mPlay.setAttribute('aria-pressed', on); mPlay.querySelector('span').textContent = on ? 'stop' : 'play';
};
new MutationObserver(mSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
mPlay.addEventListener('click', () => $('play').click());

// randomisers: the perform card's own buttons
[['m-everything', 'new-kit'], ['m-kit', 'rand-all'], ['m-alter', 'alter'], ['m-undo', 'undo']].forEach(([m, d]) => $(m).addEventListener('click', () => $(d).click()));
const mUndo = () => { $('m-undo').disabled = $('undo').disabled; };
new MutationObserver(mUndo).observe($('undo'), { attributes: true, attributeFilter: ['disabled'] });

// presets: the header's stepper, with the name of the one loaded
// (a star once it's changed, as on the desktop's save button)
const mName = () => { const o = $('kit').selectedOptions[0]; $('m-pname').textContent = (o && $('kit').value !== '' ? o.textContent : 'new sound') + ($('dirty').classList.contains('on') ? ' *' : ''); };
$('m-prev').addEventListener('click', () => { $('kit-prev').click(); mName(); });
$('m-next').addEventListener('click', () => { $('kit-next').click(); mName(); });
$('kit').addEventListener('change', mName);
new MutationObserver(mName).observe($('kit'), { childList: true, subtree: true, attributes: true });
new MutationObserver(mName).observe($('dirty'), { attributes: true, attributeFilter: ['class'] });

// faders: energy, rush and tempo, as the perform knobs set them (redrawn when a randomiser moves them)
const mFaders = ['energy', 'rush', 'tempo'].map((k) => {
  const [min, max] = PERF_RANGE[k], row = document.createElement('label');
  row.className = 'm-fader'; row.innerHTML = `<span class="m-flab">${k}</span><output></output><input type="range" min="${min}" max="${max}" step="1">`;
  const inp = row.querySelector('input'), out = row.querySelector('output');
  inp.setAttribute('aria-label', k);
  const draw = () => { inp.value = perfGet(k); out.textContent = perfText(k); inp.style.setProperty('--f', (perfGet(k) - min) / (max - min)); };
  inp.addEventListener('input', () => { setPerf(k, Number(inp.value)); draw(); });
  // a double tap puts it back to its default
  let last = 0;
  row.querySelector('.m-flab').addEventListener('click', (e) => { e.preventDefault(); const t = performance.now(); if (t - last < 350) { setPerf(k, PERF_RANGE[k][2]); draw(); } last = t; });
  $('m-faders').append(row);
  return draw;
});
const mDrawFaders = () => mFaders.forEach((d) => d());
perfDraws.push(mDrawFaders);

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

mSync(); mUndo(); mName(); mDrawFaders();
