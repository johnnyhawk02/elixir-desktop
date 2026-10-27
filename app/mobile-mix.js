// ---- the fx page: the two send effects' settings on faders, a row each (the distortion is on the master page; random
// fx and alter fx are on the perf page) ----
const fxF = (box, label, A) => mFader($(box), label, { min: A.min, max: A.max, step: A.step || 1, get: A.get, set: (v) => { A.set(v); setDirty(true); }, show: A.show, dflt: A.dflt });
const fxSend = (k) => ({ ...mAllSend(k), show: (v) => mPct(v), dflt: 0 });
const fxPar = (p, dflt) => ({ min: 0, max: 127, get: () => values[p], set: (v) => setValue(p, v, true), show: String, dflt });
const fx3P = (i) => ({ min: 0, max: 127, get: () => fx3.dist.p[i], set: (v) => { fx3.dist.p[i] = v; sendMix(); }, show: String, dflt: FX3_0.dist.p[i] });
// echo: ping pong (the box by its name), send, its tempo-synced time (the nearest note length), tone, feedback and width
$('m-pp').addEventListener('change', () => { setValue(PAR.FX_DELAY_TYPE, $('m-pp').checked ? 1 : 0, true); setDirty(true); });
mDraws.push(() => { $('m-pp').checked = values[PAR.FX_DELAY_TYPE] === 1; });
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
const fxSnap = () => ({ fx: mix.fx.slice(), ring: mix.ring.slice(), fx3: structuredClone(fx3), pos: delayPos, p3: values[PAR.FX_P3], p4: values[PAR.FX_P4], pp: values[PAR.FX_DELAY_TYPE] });
function fxUse(q) {
  mix.fx.splice(0, 6, ...q.fx); mix.ring.splice(0, 6, ...q.ring);
  Object.assign(fx3.echo, q.fx3.echo); Object.assign(fx3.ring, q.fx3.ring);
  delayPos = q.pos; send({ type: 'delay', pos: delayPos });
  setValue(PAR.FX_P3, q.p3, true); setValue(PAR.FX_P4, q.p4, true); setValue(PAR.FX_DELAY_TYPE, q.pp, true);
  fxButtons.forEach((b) => b()); sendMix(); mDrawAll(); setDirty(true);
}
const rIn = (lo, hi) => lo + Math.round(Math.random() * (hi - lo));
function fxChange(fn) {
  const was = fxSnap(), q = fxSnap();
  fn(q); fxUse(q);
  undoValues = null; $('undo').disabled = true; mUndoFn = () => fxUse(was); mUndo();
}
// random fx: new sends and effect settings, by the fx randomiser's settings (EVERYTHING uses it too)
function mFxRandomise(q) {
  const F = RAND.fx;
  for (let v = 0; v < 6; v++) {
    q.fx[v] = rChance(F.echoOn) ? rRange(F.echoLo, F.echoHi) : 0;
    q.ring[v] = rChance(F.ringOn) ? rRange(F.ringLo, F.ringHi) : 0;
  }
  q.pos = randomDelayPos(); // (musical lengths, as every randomiser)
  q.pp = rChance(F.pingpong) ? 1 : 0;
  q.p3 = rRange(F.toneLo, F.toneHi); q.p4 = rChance(F.fbWild) ? rIn(70, 105) : rRange(F.fbLo, F.fbHi);
  q.fx3.echo.pct = rRange(F.widthLo, F.widthHi);
  q.fx3.ring.wave = rIn(0, RING_W.length - 1); q.fx3.ring.freq = rIn(5, 120);
}
$('m-fx-rand').addEventListener('click', async () => { await startAudio(); fxChange(mFxRandomise); });
$('m-fx-alter').addEventListener('click', async () => {
  await startAudio();
  const a = RAND.alterfx.amount / 100, nudge = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v + (Math.random() * 2 - 1) * a * (hi - lo))));
  fxChange((q) => {
    for (const k of ['fx', 'ring']) q[k] = q[k].map((v) => (v ? nudge(v, 1, 100) : 0));
    q.pos = Math.max(0, Math.min(1, q.pos + (Math.random() * 2 - 1) * a / 2));
    q.p3 = nudge(q.p3, 0, 127); q.p4 = nudge(q.p4, 0, 127);
    q.fx3.echo.pct = nudge(q.fx3.echo.pct, 0, 200);
    q.fx3.ring.freq = nudge(q.fx3.ring.freq, 0, 127);
  });
});

// the fx page's crossfeed matrix: a row for each drum it comes from, a column for each it goes into, the column's head
// what it modulates there (tap: fm, filter, ring). Drag a cell up or down for -100..100, double tap for none. It is the
// desktop's matrix (xm), and redraws with it (its draws join xcells)
{
  const grid = $('m-xgrid'), SH = ['d1', 'd2', 'd3', 'sn', 'cy', 'hh'], T = ['fm', 'filter', 'ring'];
  const changed = () => { xcells.forEach((d) => d()); sendX(); setDirty(true); };
  grid.append(document.createElement('span'));
  SH.forEach((n, d) => {
    const h = document.createElement('button'); h.type = 'button'; h.className = 'm-xhead';
    h.setAttribute('aria-label', `what crossfeed into ${XN[d]} modulates`);
    h.addEventListener('click', () => { xm.target[d] = T[(T.indexOf(xm.target[d]) + 1) % 3]; xSelects[d].value = xm.target[d]; changed(); });
    xcells.push(() => { h.innerHTML = `${n}<small>${xm.target[d]}</small>`; });
    grid.append(h);
  });
  SH.forEach((n, s) => {
    const lab = document.createElement('span'); lab.className = 'm-xlab'; lab.textContent = n; grid.append(lab);
    SH.forEach((_, d) => {
      const k = s * 6 + d, c = document.createElement('div');
      c.className = 'm-xcell' + (s === d ? ' diag' : ''); c.setAttribute('role', 'slider'); c.tabIndex = 0;
      c.setAttribute('aria-label', `${XN[s]} into ${XN[d]}`);
      const draw = () => { const a = xm.amt[k]; c.style.setProperty('--a', Math.abs(a) / 100); c.classList.toggle('neg', a < 0); c.classList.toggle('hi', a >= 50); c.innerHTML = a ? `<b>${a}</b>` : ''; c.setAttribute('aria-valuenow', a); };
      const set = (v) => { v = Math.max(-100, Math.min(100, Math.round(v / 5) * 5)); if (v !== xm.amt[k]) { xm.amt[k] = v; changed(); } };
      let drag = null, lastTap = 0;
      c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); drag = { y: e.clientY, v: xm.amt[k] }; c.classList.add('held'); });
      c.addEventListener('pointermove', (e) => { if (drag) set(drag.v + (drag.y - e.clientY) * 1.5); });
      const up = (e) => {
        if (!drag) return;
        if (Math.abs(drag.y - e.clientY) < 4) { if (e.timeStamp - lastTap < 350) set(0); lastTap = e.timeStamp; }
        drag = null; c.classList.remove('held');
      };
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      c.addEventListener('keydown', (e) => { const st = { ArrowUp: 5, ArrowDown: -5, PageUp: 25, PageDown: -25 }[e.key]; if (st) { e.preventDefault(); set(xm.amt[k] + st); } else if (e.key === '0' || e.key === 'Delete') set(0); });
      xcells.push(draw); grid.append(c);
    });
  });
  $('m-xclear').addEventListener('click', () => { xm.amt.fill(0); changed(); });
  xcells.forEach((d) => d());
}
