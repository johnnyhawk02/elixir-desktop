// ---- the seq page (its tab: seq; inside, 'grid'): the step grid from 808-SC (its elixir/app/tr808-grid.js), on Elixir's seven tracks ----
// Eight patterns, a lane a track, 16 steps a bar and 1 to 8 bars (up to 128 steps); the bar buttons under the grid show
// one bar at a time and add or take off bars. Tap a step for on or off, or drag across steps to paint (the first step
// decides on or off); with cmd (ctrl) it's accents. The pattern buttons over the grid pick which pattern plays and is
// edited (straight away, also while playing). A pattern plays instead of the generator's: the player gets its bars as
// pages (app/player.js: 'lanes'), so the groove, the mutes and the densities' tracks work on it as before.
// The grid | algo switch: algo hands back to the generator (the perf knobs, the beat page, the randomisers): what it
// plays shows in the lanes, its bar conditions (fills) written out bar by bar, and "insert into pattern N" (beside the
// bars) writes that into the pattern picked. A pattern button leaves the generator without writing. Right-click a pattern:
// record (from the next bar whatever plays is written into it, looping over its 128 steps until its button is pressed)
// or clear. Cmd/ctrl + c copies what plays, cmd/ctrl + v pastes it over the pattern picked. The patterns are kept in
// this browser.
const G_N = 8, G_BARS = 8, G_STEPS = G_BARS * 16;
const G_KEY = 'elixir-desktop-grid';
const G_NAMES = ['DR1', 'DR2', 'DR3', 'SN', 'CY', 'CL', 'OP'];
// the patterns start as 808-SC's (a lane's first 16 steps: '.' off, 'x' on, 'X' accent), its sounds on Elixir's tracks
// (kick: drum 1; toms and congas: drums 2 and 3; snare and clap: snare; hats and cymbal their own); 7 and 8 start empty
const G_SEEDS = [
  ['X......x..X.....', '', '', '........X.......', '', 'x.x.xxx.x.x.xxxx', ''],
  ['X..x..X...X..x..', '', '', '....X.......X...', '', 'x.xxx.xxx.xxx.xx', ''],
  ['X.x.......x.....', '', '', '....X..x.x..X...', '', 'x.x.x.x.x.x.x...', '..............X.'],
  ['X.......X.......', '......x.....x.x.', '..x..x....xx....', '....X.......X...', '', 'x.x.x.x.x.x.x.x.', ''],
  ['X.......X.......', '...x..x....x..x.', '.x.......x......', '....x.......x...', '', 'x.xxx.xxx.xxx.xx', ''],
  ['X...X...X...X...', '', '', '....X.......X...', 'X...............', '..x...x...x...x.', ''],
  [], [],
];
const gEmpty = () => ({ on: Array.from({ length: 7 }, () => new Array(G_STEPS).fill(0)), acc: Array.from({ length: 7 }, () => new Array(G_STEPS).fill(0)) });
const gFromText = (rows) => {
  const L = gEmpty();
  rows.forEach((r, t) => { for (let s = 0; s < 16; s++) { const ch = r[s] || '.'; L.on[t][s] = ch === '.' ? 0 : 1; L.acc[t][s] = ch === 'X' ? 1 : 0; } });
  return L;
};
const gClean = (src) => {
  const L = gEmpty();
  for (let t = 0; t < 7; t++) for (let i = 0; i < G_STEPS; i++) { L.on[t][i] = src?.on?.[t]?.[i] ? 1 : 0; L.acc[t][i] = L.on[t][i] && src?.acc?.[t]?.[i] ? 1 : 0; }
  return L;
};
// mode 'gen' (the generator plays, as before the grid) or 'lanes' (pattern cur plays); page: the bar shown
const gr = { mode: 'gen', pats: G_SEEDS.map(gFromText), lens: new Array(G_N).fill(1), cur: 0, page: 0, rec: -1, recPos: -1, recBars: 0, nBars: 4 };
try {
  const s = JSON.parse(localStorage.getItem(G_KEY));
  if (s && Array.isArray(s.pats)) {
    for (let i = 0; i < G_N; i++) if (s.pats[i]) gr.pats[i] = gClean(s.pats[i]);
    if (s.cur >= 0 && s.cur < G_N) gr.cur = s.cur;
    if (Array.isArray(s.lens)) for (let i = 0; i < G_N; i++) gr.lens[i] = Math.max(1, Math.min(G_BARS, s.lens[i] | 0 || 1));
    gr.mode = s.mode === 'lanes' ? 'lanes' : 'gen'; if ([1, 2, 4, 8].includes(s.nBars)) gr.nBars = s.nBars;
  }
} catch (e) {}
const gSave = () => { try { localStorage.setItem(G_KEY, JSON.stringify({ pats: gr.pats, lens: gr.lens, cur: gr.cur, mode: gr.mode, nBars: gr.nBars })); } catch (e) {} };
// a bar condition's cycle (0 every bar; n, -n and 1/n: n bars)
const gPeriod = (b) => (!b ? 1 : b > 100 ? b - 100 : Math.abs(b));
// what the generator plays, written out bar by bar (its fills and phrase), up to 8 bars: { L, n }
function gFromGen() {
  const src = source === 'steps' ? pages.slice(0, pageCount) : pattern.pages ? pattern.pages : [pattern];
  let n = src.length;
  for (const P of src) for (let t = 0; t < 7; t++) for (let s = 0; s < 16; s++) if (P.on[t][s]) n = Math.max(n, gPeriod(P.bar[t][s]));
  n = Math.min(G_BARS, n);
  const L = gEmpty();
  for (let b = 0; b < n; b++) {
    const P = src[b % src.length];
    for (let t = 0; t < 7; t++) for (let s = 0; s < 16; s++) {
      if (!P.on[t][s] || !barOk(P.bar[t][s], b)) continue;
      L.on[t][b * 16 + s] = 1; L.acc[t][b * 16 + s] = P.acc[t][s] ? 1 : 0;
    }
  }
  return { L, n };
}
let gGenCache = null;
const gGen = () => (gGenCache ||= gFromGen());
const gShown = () => (gr.mode === 'lanes' ? gr.pats[gr.cur] : gGen().L);
const gLen = () => (gr.mode === 'lanes' ? gr.lens[gr.cur] : gGen().n);
// the pattern picked, as the player's pages (one bar each)
const gPages = (L, n) => Array.from({ length: n }, (_, b) => ({
  on: L.on.map((r) => r.slice(b * 16, b * 16 + 16)), acc: L.acc.map((r) => r.slice(b * 16, b * 16 + 16)), bar: Array.from({ length: 7 }, () => new Array(16).fill(0)),
}));
// (thinned or filled by the beat page's densities, as the generator's is: app/mobile-density.js)
const gLanesSend = () => send({ type: 'lanes', lanes: gr.mode === 'lanes' ? gPages(gr.pats[gr.cur], gr.lens[gr.cur]).map((P, i) => densApply(P, i)) : null });
function gSend() {
  if (gr.page >= gLen()) gr.page = gLen() - 1;
  gLanesSend(); gSave();
}
// first edit on the generator: what it plays becomes the pattern picked
function gTake() {
  if (gr.mode === 'lanes') return;
  const { L, n } = gGen(); gr.pats[gr.cur] = gClean(L); gr.lens[gr.cur] = n; gr.mode = 'lanes';
}
const gCells = [], gLabs = [];
{
  const box = $('m-grid');
  // the kick at the bottom, the hats at the top, as a drum machine's rows run up the kit
  for (let t = 0; t < 7; t++) {
    const row = String(7 - t);
    const lab = document.createElement('button');
    lab.type = 'button'; lab.className = 'm-g-lab'; lab.textContent = G_NAMES[t]; lab.setAttribute('aria-label', `${TRACKS[t].name.toLowerCase()}: its voice page`);
    lab.style.gridRow = row; lab.style.gridColumn = '1';
    lab.addEventListener('click', () => { mTab('dice'); const v = $('m-voice').children[TRACKS[t].voice]; if (v) v.click(); });
    box.append(lab); gLabs[t] = lab;
    gCells[t] = [];
    for (let s = 0; s < 16; s++) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'm-g-cell' + (s % 4 === 0 ? ' beat' : '') + (s && s % 4 === 0 ? ' gap' : '');
      c.dataset.t = t; c.dataset.s = s; c.style.gridRow = row; c.style.gridColumn = String(s + 2);
      // (a click from the keyboard: the same as a tap)
      c.addEventListener('click', (e) => { if (e.detail === 0) { gPaintStart(c, e); gPaintEnd(); } });
      c.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); gPaintStart(c, e); } });
      box.append(c); gCells[t].push(c);
    }
  }
  for (let i = 0; i < G_N; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = String(i + 1); b.setAttribute('aria-label', `pattern ${i + 1}`);
    b.addEventListener('click', () => { if (gr.rec === i) gRecStop(); else gPick(i); });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      mMenu(e, [gr.rec === i ? ['stop recording', gRecStop] : [`record pattern ${i + 1}`, () => gRecStart(i)], [`clear pattern ${i + 1}`, () => gClear(i)]]);
    });
    $('m-g-pats').append(b);
  }
  // the bars: tap one to show it (one past the end adds the bars up to it, empty); "-" takes the last one off, "+" adds a
  // copy of the one shown
  for (let i = 0; i < G_BARS; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'm-toggle'; b.textContent = String(i + 1);
    b.addEventListener('click', () => {
      if (gr.mode !== 'lanes' && i < gLen()) { gr.page = i; gDraw(); return; } // (the generator's bars: just look)
      gTake();
      const L = gr.pats[gr.cur], n = gr.lens[gr.cur];
      if (i >= n) { for (let t = 0; t < 7; t++) for (let k = n * 16; k < (i + 1) * 16; k++) { L.on[t][k] = 0; L.acc[t][k] = 0; } gr.lens[gr.cur] = i + 1; }
      gr.page = i; gSend(); gDraw();
    });
    $('m-g-bars').append(b);
  }
  $('m-g-less').addEventListener('click', () => { gTake(); if (gr.lens[gr.cur] > 1) gr.lens[gr.cur]--; gSend(); gDraw(); });
  $('m-g-more').addEventListener('click', () => {
    gTake(); const n = gr.lens[gr.cur]; if (n >= G_BARS) return;
    const L = gr.pats[gr.cur], from = gr.page * 16, to = n * 16;
    for (let t = 0; t < 7; t++) for (let s = 0; s < 16; s++) { L.on[t][to + s] = L.on[t][from + s]; L.acc[t][to + s] = L.acc[t][from + s]; }
    gr.lens[gr.cur] = n + 1; gr.page = n; gSend(); gDraw();
  });
  // ◀ ▶: the whole pattern (every lane, all its bars) a step earlier or later, wrapping round (cmd/ctrl: a bar)
  const shift = (d) => {
    gTake(); const n = gr.lens[gr.cur] * 16, L = gr.pats[gr.cur];
    for (let t = 0; t < 7; t++) for (const k of ['on', 'acc']) {
      const a = L[k][t].slice(0, n);
      for (let s = 0; s < n; s++) L[k][t][s] = a[(((s - d) % n) + n) % n];
    }
    gSend(); gDraw();
  };
  $('m-g-left').addEventListener('click', (e) => shift(e.metaKey || e.ctrlKey ? -16 : -1));
  $('m-g-right').addEventListener('click', (e) => shift(e.metaKey || e.ctrlKey ? 16 : 1));
  // the switch: grid (the pattern picked plays) or algo (the generator plays); insert writes what the generator plays
  // into the pattern picked, and goes back to the grid
  $('m-g-grid').addEventListener('click', () => gPick(gr.cur));
  $('m-g-algo').addEventListener('click', () => { if (gr.mode === 'gen') return; gr.mode = 'gen'; gGenCache = null; gr.page = 0; gSend(); gDraw(); });
  // rec (algo): from the next bar what plays goes into the pattern picked, for the bars chosen beside it, then stops
  for (const n of [1, 2, 4, 8]) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-toggle'; b.textContent = String(n); b.dataset.n = n;
    b.setAttribute('aria-label', `record ${n} bar${n > 1 ? 's' : ''}`);
    b.addEventListener('click', () => { gr.nBars = n; gSave(); gDraw(); });
    $('m-g-recbars').append(b);
  }
  $('m-g-rec').addEventListener('click', () => { if (gr.rec >= 0) gRecStop(); else gRecStart(gr.cur, gr.nBars); });
  $('m-g-ins').addEventListener('click', () => {
    const { L, n } = gGen();
    if (gr.rec === gr.cur) gRecStop();
    gr.pats[gr.cur] = gClean(L); gr.lens[gr.cur] = n; gr.mode = 'lanes'; gr.page = 0;
    gSend(); gDraw();
  });
}
// Painting: press on a step and drag across others (any lanes). The first step decides: on an empty step it puts notes
// on, on a full one takes them off; with cmd (ctrl) it puts accents on, or takes them off (the notes staying)
let gPaint = null; // { mode: 'on' | 'off' | 'acc' | 'unacc', done: Set }
function gPaintCell(c) {
  if (!gPaint || gPaint.done.has(c)) return;
  gPaint.done.add(c);
  const t = Number(c.dataset.t), k = gr.page * 16 + Number(c.dataset.s), L = gr.pats[gr.cur], m = gPaint.mode;
  if (m === 'on') { if (!L.on[t][k]) { L.on[t][k] = 1; L.acc[t][k] = 0; } }
  else if (m === 'off') { L.on[t][k] = 0; L.acc[t][k] = 0; }
  else if (m === 'acc') { L.on[t][k] = 1; L.acc[t][k] = 1; }
  else if (L.on[t][k]) L.acc[t][k] = 0;
  gSend(); gDraw();
}
function gPaintStart(c, e) {
  gTake();
  const t = Number(c.dataset.t), k = gr.page * 16 + Number(c.dataset.s), L = gr.pats[gr.cur];
  const mode = e.metaKey || e.ctrlKey ? (L.on[t][k] && L.acc[t][k] ? 'unacc' : 'acc') : L.on[t][k] ? 'off' : 'on';
  gPaint = { mode, done: new Set() };
  gPaintCell(c);
}
function gPaintEnd() { gPaint = null; }
addEventListener('pointermove', (e) => {
  if (!gPaint) return;
  if (e.pointerType === 'mouse' && !(e.buttons & 1)) { gPaintEnd(); return; } // (released where we didn't hear it)
  const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.m-g-cell');
  if (c) gPaintCell(c);
});
addEventListener('pointerup', gPaintEnd); addEventListener('pointercancel', gPaintEnd); addEventListener('blur', gPaintEnd);
function gClear(i) {
  gr.pats[i] = gEmpty(); gr.lens[i] = 1;
  if (i === gr.cur && gr.mode === 'lanes') gr.page = 0;
  gSend(); gDraw();
}
// Recording a pattern: it empties, its button says STOP, and from the next bar what is heard (whichever pattern plays,
// or the generator) is written into it step by step; it loops over its 128 steps (8 bars), overwriting, until its button
// is pressed (stopping the transport stops it too)
// (bars: stop by itself after that many bars, 0 = loop until stopped)
function gRecStart(i, bars = 0) {
  gr.rec = i; gr.recPos = -1; gr.recBars = bars;
  gr.pats[i] = gEmpty(); gr.lens[i] = 1;
  if (gr.mode === 'lanes' && gr.cur === i) { const o = [...Array(G_N).keys()].find((j) => j !== i && gr.pats[j].on.some((r) => r.some(Boolean))); if (o !== undefined) gPick(o); else { gr.mode = 'gen'; gSend(); } }
  if (!playing) $('m-play').click();
  gSave(); gDraw();
}
function gRecStop() { gr.rec = -1; gr.recPos = -1; gr.recBars = 0; gSave(); gDraw(); }
// (what is heard: the step's hits as played, after the densities and mutes; their accents from the pattern playing)
function gRecStep(s, bar, hits) {
  if (gr.rec < 0) return;
  if (s < 0) { gRecStop(); return; }
  if (gr.recPos < 0) { if (s !== 0) return; gr.recPos = 0; }
  const src = gShown(), k = (bar % gLen()) * 16 + s, R = gr.pats[gr.rec], j = gr.recPos, heard = new Set(hits);
  for (let t = 0; t < 7; t++) { R.on[t][j] = heard.has(t) ? 1 : 0; R.acc[t][j] = heard.has(t) && src.acc[t][k] ? 1 : 0; }
  gr.recPos++; gr.lens[gr.rec] = Math.max(gr.lens[gr.rec], Math.ceil(gr.recPos / 16));
  if (gr.recPos % 16 === 0) gSave();
  if (gr.recBars && gr.recPos >= gr.recBars * 16) { gr.lens[gr.rec] = gr.recBars; gRecStop(); return; } // (its bars done)
  if (gr.recPos >= G_STEPS) gr.recPos = 0; // (round again, over the top)
}
function gPick(i) {
  gr.cur = i; gr.mode = 'lanes'; gr.page = 0;
  gSend(); gDraw();
}
let gNow = -1, gNowBar = -1;
function gDraw() {
  const L = gShown(), lanes = gr.mode === 'lanes', n = gLen(), p0 = gr.page * 16;
  for (let t = 0; t < 7; t++) {
    gLabs[t].classList.toggle('used', L.on[t].some((v, k) => v && k < n * 16));
    gCells[t].forEach((c, s) => {
      const on = !!L.on[t][p0 + s], acc = on && !!L.acc[t][p0 + s];
      c.classList.toggle('on', on); c.classList.toggle('acc', acc); c.classList.toggle('now', s === gNow && gNowBar === gr.page);
      c.setAttribute('aria-label', `${G_NAMES[t]} step ${p0 + s + 1}${on ? acc ? ', accent' : ', on' : ''}`);
    });
  }
  [...$('m-g-pats').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', lanes && i === gr.cur);
    b.textContent = gr.rec === i ? 'STOP' : String(i + 1); b.classList.toggle('rec', gr.rec === i);
    b.classList.toggle('used', gr.pats[i].on.some((r) => r.some((v, k) => v && k < gr.lens[i] * 16)));
  });
  [...$('m-g-bars').children].forEach((b, i) => {
    b.setAttribute('aria-pressed', i === gr.page); b.classList.toggle('in', i < n); b.classList.toggle('now', i === gNowBar && i < n);
  });
  $('m-g-less').disabled = !lanes || n < 2;
  $('m-g-more').disabled = !lanes || n >= G_BARS;
  $('m-g-grid').setAttribute('aria-pressed', lanes); $('m-g-algo').setAttribute('aria-pressed', !lanes);
  $('m-g-ins').hidden = lanes; $('m-g-ins').textContent = `insert into pattern ${gr.cur + 1}`;
  $('m-g-recbox').hidden = lanes;
  [...$('m-g-recbars').children].forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.n) === gr.nBars));
  const rb = $('m-g-rec'); rb.classList.toggle('rec', gr.rec >= 0);
  rb.textContent = gr.rec < 0 ? 'rec' : 'stop';
  $('m').classList.toggle('g-gen', !lanes);
  $('m-g-body').hidden = !lanes;
}
// On a laptop screen the beat page lives on the seq page: algo shows it there in place of the grid (and its own tab goes);
// on a narrow screen it goes back to its own page
function gBeatPlace() {
  const card = document.querySelector('.m-beat-card'), home = mWide.matches ? document.querySelector('.m-g-card') : document.querySelector('[data-m-panel="beat"]');
  if (card.parentNode !== home) home.append(card);
  if (mWide.matches && $('m').dataset.page === 'beat') mTab('grid');
}
gBeatPlace(); mWide.addEventListener('change', gBeatPlace);
// the playhead (as heard), the lanes' names lighting as they hit, and the recording
const gOnEvent = onEvent;
onEvent = function (ev) {
  gOnEvent(ev);
  if (ev.type !== 'step' || !playing) return;
  const delay = ctx && ctx.outputLatency ? ctx.outputLatency * 1000 : 0;
  setTimeout(() => {
    if (!playing) return;
    gNow = ev.step; gNowBar = ev.bar % gLen();
    gRecStep(ev.step, ev.bar, ev.hits);
    for (const t of new Set(ev.hits)) { const l = gLabs[t]; if (!l) continue; l.classList.add('hit'); clearTimeout(l._hit); l._hit = setTimeout(() => l.classList.remove('hit'), 90); }
    gDraw();
  }, delay);
};
const gMarkStep = markStep;
markStep = function (s) { gMarkStep(s); if (s < 0) { gNow = -1; gNowBar = -1; if (gr.rec >= 0) gRecStop(); gDraw(); } };
// the generator's pattern changing (a knob, a randomiser, a preset): redrawn when it's what plays; a pattern playing is
// sent again (a density moved)
const gGenerate = generate;
generate = function () { const r = gGenerate.apply(this, arguments); gGenCache = null; if (gr.mode === 'gen') gDraw(); return r; };
const gSendSeq = sendSeq;
sendSeq = function () { gGenCache = null; const r = gSendSeq.apply(this, arguments); if (gr.mode === 'gen') gDraw(); else gLanesSend(); return r; };
// cmd/ctrl + c copies what plays (a pattern or the generator's), cmd/ctrl + v pastes it over the pattern picked
let gClip = null;
addEventListener('keydown', (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || e.target.closest?.('input, select, textarea') || $('m-menu') || $('m').dataset.page !== 'grid') return;
  if (getSelection && String(getSelection())) return; // (copying text the old way)
  const k = e.key.toLowerCase();
  if (k === 'c') { e.preventDefault(); gClip = { L: gClean(gShown()), n: gLen() }; }
  else if (k === 'v' && gClip) { e.preventDefault(); gr.mode = 'lanes'; gr.pats[gr.cur] = gClean(gClip.L); gr.lens[gr.cur] = gClip.n; gr.page = 0; gSend(); gDraw(); }
});
M_PAGE_NAMES.grid = 'seq';
if (mWide.matches) mTab('grid');
gSend();
gDraw();
