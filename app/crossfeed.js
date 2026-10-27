// ---- crossfeed matrix ----
const XN = ['drum 1', 'drum 2', 'drum 3', 'snare', 'cymbal', 'hihat'];
// a drum's hit pushes a setting of the drums it feeds (the column's target), which glides back over xm.glide ms
const X_TARGETS = ['pitch', 'decay', 'filter', 'drive', 'volume'];
// each target's parameter on each drum, and how far a full push moves it (of its whole range)
const X_PARS = { pitch: ['COARSE1', 'COARSE2', 'COARSE3', 'COARSE4', 'COARSE5', 'COARSE6'], decay: ['VELOD1', 'VELOD2', 'VELOD3', 'VELOD4', 'VELOD5', 'VELOD6_CLOSED'],
  filter: ['FILTER_FREQ_1', 'FILTER_FREQ_2', 'FILTER_FREQ_3', 'FILTER_FREQ_4', 'FILTER_FREQ_5', 'FILTER_FREQ_6'],
  drive: ['DRIVE1', 'DRIVE2', 'DRIVE3', 'SNARE_DISTORTION', 'CYMBAL_DISTORTION', 'HAT_DISTORTION'], volume: ['VOL1', 'VOL2', 'VOL3', 'VOL4', 'VOL5', 'VOL6'] };
const X_RANGE = { pitch: 24 / 127, decay: 0.5, filter: 0.5, drive: 0.6, volume: 0.7 };
// (the old audio crossfeed's targets, from presets saved before it changed)
const xTarget = (t) => (X_TARGETS.includes(t) ? t : { fm: 'pitch', ring: 'volume' }[t] || 'filter');
const xm = { amt: new Array(36).fill(0), target: ['pitch', 'pitch', 'filter', 'decay', 'filter', 'volume'], glide: 300 };
const xgrid = $('xgrid');
const xDepth = () => Number($('xdepth').value) / 100;
const sendX = () => send({ type: 'xmod', amt: xm.amt.map((a) => a / 100 * xDepth()), pars: xm.target.map((t, d) => PAR[X_PARS[t][d]]),
  ranges: xm.target.map((t) => X_RANGE[t]), glide: xm.glide });
xgrid.appendChild(document.createElement('span'));
XN.forEach((name, d) => {
  const col = document.createElement('div'); col.className = 'col';
  col.innerHTML = `<span class="full">${name}</span><span class="short">${['d1', 'd2', 'd3', 'sn', 'cy', 'hh'][d]}</span>`;
  const sel = document.createElement('select'); sel.setAttribute('aria-label', `What crossfeed into ${name} modulates`);
  for (const t of X_TARGETS) sel.appendChild(new Option(t, t));
  sel.value = xm.target[d];
  sel.addEventListener('change', () => { xm.target[d] = sel.value; sendX(); });
  col.appendChild(sel); xgrid.appendChild(col);
});
const xcells = [];
XN.forEach((src, sIdx) => {
  const lab = document.createElement('span'); lab.className = 'lab'; lab.innerHTML = `<span class="full">${src}</span><span class="short">${['d1', 'd2', 'd3', 'sn', 'cy', 'hh'][sIdx]}</span>`; xgrid.appendChild(lab);
  XN.forEach((dst, d) => {
    const k = sIdx * 6 + d, c = document.createElement('button');
    c.type = 'button'; c.className = 'xcell' + (sIdx === d ? ' diag' : ''); c.setAttribute('role', 'slider');
    c.setAttribute('aria-label', `${src} into ${dst}`); c.setAttribute('aria-valuemin', -100); c.setAttribute('aria-valuemax', 100);
    const draw = () => {
      const a = xm.amt[k], col = a >= 0 ? 'var(--blue)' : 'var(--led)';
      // the cell fills up like a level meter: blue for positive, red for negative amounts
      const h = Math.abs(a);
      c.style.background = a ? `linear-gradient(to top, ${col} ${h}%, color-mix(in srgb, var(--ink) 7%, transparent) ${h}%)` : '';
      c.style.color = h > 60 ? '#fff' : '';
      c.textContent = a ? String(a) : '';
      c.setAttribute('aria-valuenow', a);
    };
    const set = (v) => { v = Math.max(-100, Math.min(100, Math.round(v))); if (v === xm.amt[k]) return; xm.amt[k] = v; draw(); sendX(); };
    dragY(c, () => xm.amt[k], set, 1.2);
    stepKeys(c, () => xm.amt[k], set, { small: 5, big: 25, wheel: 5 });
    c.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace' || e.key === '0') set(0); });
    c.addEventListener('dblclick', () => set(0));
    draw(); xcells.push(draw); xgrid.appendChild(c);
  });
});
$('xclear').addEventListener('click', () => { xm.amt.fill(0); xcells.forEach((d) => d()); sendX(); });
$('xdepth').addEventListener('input', () => { $('xdepth-out').textContent = $('xdepth').value + '%'; sendX(); });
// a sparse random patch: 3 to 6 connections, mostly positive, and a fresh target for each column that gets one
const xSelects = [...xgrid.querySelectorAll('select')];
function randomiseX() {
  xm.amt.fill(0);
  const X = RAND.xfeed, n = rRange(X.linksLo, X.linksHi);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(rnd() * 36);
    xm.amt[k] = (rChance(X.neg) ? -1 : 1) * 5 * Math.round(rRange(X.amtLo, X.amtHi) / 5);
  }
  for (let d = 0; d < 6; d++) {
    if (![0, 1, 2, 3, 4, 5].some((sIdx) => xm.amt[sIdx * 6 + d])) continue;
    const r = rnd();
    xm.target[d] = X_TARGETS[Math.floor(r * X_TARGETS.length)];
    xSelects[d].value = xm.target[d];
  }
  xcells.forEach((d) => d()); sendX();
}
$('xrand').addEventListener('click', async () => { await startAudio(); randomiseX(); setDirty(true); });
$('xrand2').addEventListener('click', () => $('xrand').click());

