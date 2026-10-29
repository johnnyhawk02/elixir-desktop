// ---- the scope (laptop): the sound's waveform on the top line, beside the transport, drawn in LCD dots. It listens to
// the engine's output through an analyser that only reads it ----
const mScope = document.createElement('canvas'); mScope.className = 'm-scope'; mScope.setAttribute('aria-hidden', 'true');
document.querySelector('.m-trans').append(mScope);
let mAn = null, mAnBuf = null, mScopeRaf = 0;
const mStartAudioPlain = startAudio;
startAudio = async function () {
  await mStartAudioPlain();
  // (put in the path to the speakers, as some browsers only run a node whose output is heard; it passes the sound
  // through untouched)
  if (!mAn && node) { mAn = ctx.createAnalyser(); mAn.fftSize = 2048; mAnBuf = new Float32Array(mAn.fftSize); node.disconnect(); node.connect(mAn); mAn.connect(ctx.destination); }
};
function mScopeDraw() {
  mScopeRaf = 0;
  const dpr = devicePixelRatio || 1, w = mScope.clientWidth, h = mScope.clientHeight;
  if (!w || !h) return;
  if (mScope.width !== Math.round(w * dpr)) { mScope.width = Math.round(w * dpr); mScope.height = Math.round(h * dpr); }
  const g = mScope.getContext('2d'), ink = getComputedStyle($('m')).getPropertyValue('--ink').trim() || '#17200e';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  // (a dot every 3 px each way, as an LCD's matrix; the unlit ones faint)
  const P = 3, cols = Math.floor(w / P), rows = Math.floor(h / P), mid = (rows - 1) / 2;
  g.fillStyle = ink; g.globalAlpha = .1;
  for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) g.fillRect(x * P, y * P, P - 1, P - 1);
  g.globalAlpha = 1;
  let live = false;
  if (mAn && playing) {
    mAn.getFloatTimeDomainData(mAnBuf);
    // (starting at a rising zero crossing, so a steady sound stands still)
    let s = 0; for (let i = 1; i < mAnBuf.length / 2; i++) if (mAnBuf[i - 1] < 0 && mAnBuf[i] >= 0) { s = i; break; }
    const span = mAnBuf.length / 2;
    let prev = null;
    for (let x = 0; x < cols; x++) {
      let lo = 1, hi = -1;
      for (let i = Math.floor(x * span / cols); i < Math.floor((x + 1) * span / cols); i++) { const v = mAnBuf[s + i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      // (square-root scaled, so a drum's quiet tail still shows on so few dots)
      const sc = (v) => Math.sign(v) * Math.min(1, Math.sqrt(Math.abs(v)) * 1.3);
      const y0 = Math.round(mid - sc(hi) * mid), y1 = Math.round(mid - sc(lo) * mid);
      // (joined to the last column, so steep edges stay one line)
      const a = Math.max(0, Math.min(y0, prev === null ? y0 : prev)), b = Math.min(rows - 1, Math.max(y1, prev === null ? y1 : prev));
      for (let y = a; y <= b; y++) g.fillRect(x * P, y * P, P - 1, P - 1);
      prev = Math.round((y0 + y1) / 2);
      if (hi > .002) live = true;
    }
  } else {
    for (let x = 0; x < cols; x++) g.fillRect(x * P, Math.round(mid) * P, P - 1, P - 1);
  }
  if (playing || live) mScopeRaf = requestAnimationFrame(mScopeDraw);
}
// (it runs while playing, and draws its flat line when stopped or resized)
new MutationObserver(() => { if (!mScopeRaf) mScopeDraw(); }).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
new ResizeObserver(() => { if (!mScopeRaf) mScopeDraw(); }).observe(mScope);
