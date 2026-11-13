// Each style's fill, over the last `len` steps of the fill bar: it returns the hits (track x step) and the
// tracks that give way to it there. A crash marks the first bar after each fill.
const blankFill = () => Array.from({ length: 7 }, () => new Array(16).fill(0));
const STYLES = [
  { name: 'electro', grooves: GROOVES, fill(f) {
    // snare roll (16ths when busy, 8ths otherwise), toms falling from high to low in the gaps, a kick to start it
    const on = blankFill(), start = 16 - f.len;
    for (let s = start; s < 16; s++) {
      const r = s - start, half = r < f.len / 2;
      if (r % 2 === 0 || f.busy && s >= 14) on[3][s] = 1;
      else on[half ? 2 : 1][s] = 1;
    }
    on[0][start] = 1;
    if (!f.busy) on[1][15] = 1;
    return { on, yields: [0, 1, 2, 3] };
  } },
  { name: 'techno', grooves: TECHNO, fill(f) {
    // a snare build (8ths, or 16ths when busy) with an open hat at the end; a busy fill drops the kick out
    const on = blankFill(), start = 16 - f.len;
    for (let s = start; s < 16; s++) if (f.busy || (s - start) % 2 === 0) on[3][s] = 1;
    on[6][15] = 1;
    return { on, yields: f.busy ? [0, 1, 2, 3] : [1, 2, 3] };
  } },
  { name: 'broken beat', grooves: BROKEN, fill(f) {
    // threes across the bar: snare, a kick when busy, then a tom (high, then low)
    const on = blankFill(), start = 16 - f.len;
    for (let s = start; s < 16; s++) {
      const r = s - start;
      if (r % 3 === 0) on[3][s] = 1;
      else if (r % 3 === 2) on[r < f.len / 2 ? 2 : 1][s] = 1;
      else if (f.busy) on[0][s] = 1;
    }
    on[0][start] = 1;
    if (f.busy) on[3][15] = 1;
    return { on, yields: [0, 1, 2, 3] };
  } },
  { name: 'IDM', grooves: IDM, fill(f) {
    // a stutter: the kick repeats through the first half and the snare through the second (every 16th when busy,
    // 8ths otherwise), with the high tom on the last step; a busy fill cuts the closed hat too
    const on = blankFill(), start = 16 - f.len;
    for (let s = start; s < 16; s++) {
      const r = s - start;
      if (!f.busy && r % 2 && f.len > 2) continue;
      on[r < f.len / 2 ? 0 : 3][s] = 1;
    }
    on[2][15] = 1;
    return { on, yields: f.busy ? [0, 1, 2, 3, 5] : [0, 1, 2, 3] };
  } },
  { name: 'breakcore', grooves: BREAKCORE, fill(f) {
    // a snare roll that speeds up: 8ths in the first half and 16ths in the second (16ths all through when busy),
    // a kick to start it and the high tom on the last step; a busy fill cuts the hats too
    const on = blankFill(), start = 16 - f.len;
    for (let s = start; s < 16; s++) {
      const r = s - start;
      if (f.busy || r >= f.len / 2 || r % 2 === 0) on[3][s] = 1;
    }
    on[0][start] = 1;
    on[2][15] = 1;
    return { on, yields: f.busy ? [0, 1, 2, 3, 5, 6] : [0, 1, 2, 3] };
  } },
];
// fill style: the genre's own fill (0), or any style's (1..5: electro, techno, broken beat, IDM, breakcore)
const FILL_STYLES = STYLES.filter((x) => !x.user);
const fillStyleFn = (st) => (perf.fillStyle ? FILL_STYLES[perf.fillStyle - 1] : st).fill;
let styleIdx = 0; // saved with presets by name; presets from before the styles were electro
// user: patterns saved from the steps tab (up to 16, in localStorage). Beat spreads them over its range;
// energy brings hits in by their place (kick and snare on the beat or accented first, then hats, then the rest,
// the whole pattern from 50%), and fills plays the electro fill over it. Each keeps its accents and bar conditions.
let userPats = [];
try { userPats = JSON.parse(localStorage.getItem('elexir-user-patterns') || '[]'); } catch (e) {}
const storeUserPats = () => { try { localStorage.setItem('elexir-user-patterns', JSON.stringify(userPats)); } catch (e) {} };
const userSlot = () => Math.min(userPats.length - 1, Math.floor(perf.beat * userPats.length / (PERF_RANGE.beat[1] + 1)));
const slotBeat = (i) => Math.ceil(i * (PERF_RANGE.beat[1] + 1) / userPats.length);
function userGroove(u) {
  const g = { name: u.name, cond: u.bar, acc: u.acc };
  ROW.forEach((r, t) => {
    g[r] = u.on[t].map((on, s) => !on ? '.' : String(t === 0 || t === 3 ? (s % 4 === 0 || u.acc[t][s] ? 1 : 3) : t === 5 ? (s % 2 ? 4 : 2) : t === 1 || t === 2 ? 5 : 4));
  });
  return g;
}
const EMPTY_GROOVE = { name: 'none saved', ...Object.fromEntries(['k', 'lo', 'hi', 's', 'cy', 'ch', 'oh'].map((r) => [r, '................'])) };
STYLES.push({ name: 'user', user: true,
  get grooves() { const gs = userPats.map(userGroove); return new Proxy(gs, { get: (a, k) => (/^\d+$/.test(k) ? (a.length ? a[userSlot()] : EMPTY_GROOVE) : a[k]) }); },
  fill: STYLES[0].fill });
const userStyle = () => STYLES.findIndex((st) => st.user);
// a user pattern is page 1 (on, acc, bar) plus, when there are more, all its pages
const copyGrid = () => ({ ...copyPage(pages[0]), pages: pageCount > 1 ? pages.slice(0, pageCount).map(copyPage) : undefined });
const sameGrid = (a, b) => ['on', 'acc', 'bar', 'pages'].every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
// make a pattern (from a preset) one of the user patterns, unless it already is; returns its slot
function ensureUserPat(u) {
  let i = userPats.findIndex((x) => sameGrid(x, u));
  if (i < 0 && userPats.length < 16) {
    const names = new Set(userPats.map((x) => x.name));
    userPats.push({ name: names.has(u.name) || !u.name ? nextUserName() : u.name, on: u.on, acc: u.acc, bar: u.bar, pages: u.pages }); storeUserPats(); i = userPats.length - 1;
  }
  return i;
}
// user patterns get a one-word alien name, like the preset names but single
function nextUserName() {
  for (let i = 0; i < 50; i++) { const n = alienName().replace(/'/g, ''); if (!userPats.some((x) => x.name === n)) return n; }
  return alienName();
}
function useUserSlot(i) { setStyle(userStyle()); perf.beat = slotBeat(i); drawPerf(); drawUserTools(); }
function drawUserTools() {
  const on = STYLES[styleIdx].user && userPats.length > 0;
  $('up-cur').textContent = on ? `${userPats[userSlot()].name} · ${userSlot() + 1}/${userPats.length}` : userPats.length ? `${userPats.length} saved` : '';
  $('up-over').disabled = $('up-del').disabled = !on;
  $('up-save').disabled = userPats.length >= 16;
}
$('up-save').addEventListener('click', () => {
  if (userPats.length >= 16) return;
  userPats.push({ name: nextUserName(), ...copyGrid() }); storeUserPats();
  useUserSlot(userPats.length - 1); drawUserTools();
});
$('up-over').addEventListener('click', () => {
  if (!STYLES[styleIdx].user || !userPats.length) return;
  Object.assign(userPats[userSlot()], copyGrid()); storeUserPats(); drawUserTools();
});
$('up-del').addEventListener('click', () => {
  if (!STYLES[styleIdx].user || !userPats.length) return;
  const i = userSlot(); userPats.splice(i, 1); storeUserPats();
  if (userPats.length) useUserSlot(Math.min(i, userPats.length - 1));
  drawUserTools();
});
const styleIndex = (name) => Math.max(0, STYLES.findIndex((st) => st.name === name));
function setStyle(i) {
  styleIdx = (i + STYLES.length) % STYLES.length;
  $('style-name').textContent = STYLES[styleIdx].name;
  drawUserTools();
}
const ROW = ['k', 'lo', 'hi', 's', 'cy', 'ch', 'oh'];
const ENERGY_NAMES = [[1, 'empty'], [15, 'minimal'], [35, 'low'], [60, 'groove'], [85, 'driving'], [101, 'peak']];
// fills: how much fill, on every bar (when it comes in is the knob seq's job): 0 the plain beat; turned up the fill grows
// from the last 2 steps of the bar to the whole bar at 100%, and is busy from 50%
function fillShape(fills) {
  if (!fills) return null;
  return { every: 1, len: 2 + 2 * Math.round(fills / 100 * 7), busy: fills >= 50 };
}
// the groove level the energy dial reaches (0 = empty, 1 the kick/snare skeleton .. 9 the full kit), and the fill
// shape, once there is a groove
const grooveLevel = () => (perf.energy ? 1 + perf.energy / 100 * 8 : 0);
const fillNow = () => (grooveLevel() >= 2 ? fillShape(perf.fills) : null);
function generate() {
  const st = STYLES[styleIdx], energy = perf.energy, g = st.grooves[perf.beat];
  const T = grooveLevel(), fill = fillNow();
  const { on: fillOn, yields } = fill ? fillStyleFn(st)(fill) : { on: blankFill(), yields: [] };
  const u = st.user && userPats.length ? userPats[userSlot()] : null;
  if (u && u.pages) {
    pattern.pages = u.pages.map((pg) => { const P = blankPage(); genPage(userGroove({ name: u.name, ...pg }), P, energy, T, fill, fillOn, yields); return P; });
    copyInto(pattern, pattern.pages[0]);
  } else if (!st.user && perf.var > 0) { // a phrase of 4 or 8 bars, the variations in it
    pattern.pages = Array.from({ length: perf.bars }, (_, i) => { const P = blankPage(); genPage(varyGroove(g, i, perf.bars, perf.var, styleIdx * 64 + perf.beat), P, energy, T, fill, fillOn, yields); return P; });
    copyInto(pattern, pattern.pages[0]);
  } else { delete pattern.pages; genPage(g, pattern, energy, T, fill, fillOn, yields); }
  drawPerf();
  sendSeq();
}
// ---- variations: a beat played as a phrase of 4 or 8 bars. Bar 1 is the beat itself and so is every other odd bar,
// so it stays recognisable; the even bars answer it with small changes, each made from a fixed seed (the style, the beat,
// the bar's role and the var), so a beat always plays the same phrase. 4 bars: A a A z; 8 bars: A a A b A a c z
// (a, b, c the answers, z the last bar, which turns most). The last bar makes var changes (A 1 .. D 4), a and b one
// fewer, c two fewer, so A changes only the last bar. Added hits come in at mid energy (levels 3 to 6), so a low energy keeps the phrase plain.
const VAR_ROLES = { 4: [0, 'a', 0, 'z'], 8: [0, 'a', 0, 'b', 0, 'a', 'c', 'z'] };
function varRng(seed) {
  let h = seed >>> 0;
  return () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9 >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
}
const VAR_OPS = [
  // a kick off the beat moves a step or two
  (g, r) => { const k = [...g.k], from = [...k.keys()].filter((s) => s % 4 && k[s] !== '.' && k[s] !== '1');
    if (!from.length) return false; const s = from[Math.floor(r() * from.length)], to = s + (r() < .5 ? -1 : 1) * (r() < .7 ? 1 : 2);
    if (to < 1 || to > 15 || k[to] !== '.') return false; k[to] = k[s]; k[s] = '.'; g.k = k.join(''); return true; },
  // an extra kick off the beat
  (g, r) => { const k = [...g.k], free = [2, 3, 6, 7, 10, 11, 13, 14, 15].filter((s) => k[s] === '.'); if (!free.length) return false;
    k[free[Math.floor(r() * free.length)]] = String(3 + Math.floor(r() * 2)); g.k = k.join(''); return true; },
  // a ghost snare by a backbeat
  (g, r) => { const sn = [...g.s], free = [2, 3, 6, 7, 9, 10, 11, 14, 15].filter((s) => sn[s] === '.'); if (!free.length) return false;
    sn[free[Math.floor(r() * free.length)]] = String(4 + Math.floor(r() * 3)); g.s = sn.join(''); return true; },
  // a tom answer in the last beat: high then low
  (g, r) => { const hi = [...g.hi], lo = [...g.lo], a = 12 + Math.floor(r() * 2), b = a + 2;
    if (hi[a] !== '.' || lo[b] !== '.') return false; hi[a] = '5'; lo[b] = '5'; g.hi = hi.join(''); g.lo = lo.join(''); return true; },
  // an open hat on an off-beat (the closed hat steps aside)
  (g, r) => { const oh = [...g.oh], ch = [...g.ch], free = [2, 6, 10, 14].filter((s) => oh[s] === '.'); if (!free.length) return false;
    const s = free[Math.floor(r() * free.length)]; oh[s] = '4'; ch[s] = '.'; g.oh = oh.join(''); g.ch = ch.join(''); return true; },
  // the closed hat drops out for a beat (not the first)
  (g, r) => { const ch = [...g.ch], b = 1 + Math.floor(r() * 3); if (ch.slice(b * 4, b * 4 + 4).every((c) => c === '.')) return false;
    for (let s = b * 4; s < b * 4 + 4; s++) ch[s] = '.'; g.ch = ch.join(''); return true; },
  // a kick off the beat drops out
  (g, r) => { const k = [...g.k], from = [...k.keys()].filter((s) => s && k[s] !== '.' && k[s] !== '1'); if (!from.length) return false;
    k[from[Math.floor(r() * from.length)]] = '.'; g.k = k.join(''); return true; },
];
function varyGroove(g, bar, bars, v, seed) {
  const role = VAR_ROLES[bars][bar];
  const n = !role ? 0 : role === 'z' ? v : role === 'c' ? Math.max(0, v - 2) : v - 1;
  if (!n) return g;
  const out = { ...g }, r = varRng(seed * 977 + 'zabc'.indexOf(role) * 131 + v * 7);
  for (let i = 0, done = 0; done < n && i < 24; i++) if (VAR_OPS[Math.floor(r() * VAR_OPS.length)](out, r)) done++;
  return out;
}
function genPage(g, pattern, energy, T, fill, fillOn, yields) {
  for (const a of [pattern.on, pattern.acc, pattern.bar]) a.forEach((r) => r.fill(0));
  for (let t = 0; t < 7; t++) {
    const lv = g[ROW[t]], alt = (g.alt && g.alt[ROW[t]]) || '';
    for (let s = 0; s < 16; s++) {
      const c = lv[s], reg = c !== '.' && Number(c) <= T;
      const win = fill && s >= 16 - fill.len, inFill = win && yields.includes(t); // these tracks give way to the fill
      const fil = !!fillOn[t][s];
      let on = 0, cond = 0;
      if (inFill) { if (reg && fil) on = 1; else if (reg) { on = 1; cond = -fill.every; } else if (fil) { on = 1; cond = fill.every; } }
      else if (reg) { on = 1; cond = g.cond ? g.cond[t][s] : 0; }
      else if (win && fil) { on = 1; cond = fill.every; }
      // the second bar's extra hits, outside the fill
      else if (!win && alt[s] && alt[s] !== '.' && Number(alt[s]) <= T) { on = 1; cond = 2; }
      // crash on the first bar after each fill, once there is enough energy
      if (fill && fill.every > 1 && t === 4 && s === 0 && !on && T >= 3) { on = 1; cond = 100 + fill.every; }
      pattern.on[t][s] = on; pattern.bar[t][s] = cond;
      pattern.acc[t][s] = on && ((g.acc ? reg && !!g.acc[t][s] : c === '1' && energy >= 55) || (t === 6 && energy >= 85) || (fil && cond > 0 && (s % 4 === 0 || s === 15))) ? 1 : 0;
    }
  }
}
