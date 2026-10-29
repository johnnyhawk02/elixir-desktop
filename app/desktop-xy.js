// ---- the x/y pads on the laptop: side by side over the middle and right columns, each leaving a trail of LCD dots
// where its square has been, fading over a second and a half (whether moved by the mouse, MIDI or a sequencer) ----
const XY_TRAIL_MS = 1500;
const mTrails = [...document.querySelectorAll('.m-xy')].map((pad) => {
  const c = document.createElement('canvas'); c.className = 'm-xy-trail'; c.setAttribute('aria-hidden', 'true');
  pad.prepend(c); return { pad, c, pts: [], last: '' };
});
function mTrailFrame(t) {
  const open = $('m').classList.contains('show-xy') || (!mWide.matches && mCur === 'xy');
  const dpr = devicePixelRatio || 1;
  for (const T of mTrails) {
    const x = Number(T.pad.style.getPropertyValue('--x')) || 0, y = Number(T.pad.style.getPropertyValue('--y')) || 0, k = `${x},${y}`;
    if (k !== T.last) { T.last = k; T.pts.push({ x, y, t }); }
    while (T.pts.length && t - T.pts[0].t > XY_TRAIL_MS) T.pts.shift();
    if (!open) continue;
    const w = T.pad.clientWidth, h = T.pad.clientHeight;
    if (T.c.width !== Math.round(w * dpr) || T.c.height !== Math.round(h * dpr)) { T.c.width = Math.round(w * dpr); T.c.height = Math.round(h * dpr); }
    const g = T.c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = getComputedStyle($('m')).getPropertyValue('--ink').trim() || '#17200e';
    // (on the pad's 12 px dot grid, as lit dots, between each point and the next so a fast move stays a line)
    const P = 12, lit = new Map();
    const at = (p) => [Math.round((XY_IN + (w - 2 * XY_IN) * p.x) / P), Math.round((h - XY_IN - (h - 2 * XY_IN) * p.y) / P)];
    T.pts.forEach((p, i) => {
      const a = 1 - (t - p.t) / XY_TRAIL_MS, [x1, y1] = at(p), [x0, y0] = i ? at(T.pts[i - 1]) : [x1, y1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 1; s <= n; s++) { const key = `${Math.round(x0 + (x1 - x0) * s / n)},${Math.round(y0 + (y1 - y0) * s / n)}`; lit.set(key, Math.max(lit.get(key) || 0, a)); }
    });
    for (const [key, a] of lit) { const [gx, gy] = key.split(',').map(Number); g.globalAlpha = a * .7; g.fillRect(gx * P - 3, gy * P - 3, 6, 6); }
  }
  requestAnimationFrame(mTrailFrame);
}
requestAnimationFrame(mTrailFrame);
