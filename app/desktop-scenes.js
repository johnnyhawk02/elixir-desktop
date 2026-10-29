// ---- scenes (laptop): eight snapshots of the twelve perf knobs, beside them. Click an empty one to keep the knobs as
// they are; click a kept one to bring them back (it becomes A). The morph knob between A and B moves every knob from
// scene A's setting (at 0) to scene B's (at 100), part way between in between; it's a knob like any other, so a perf
// slot, MIDI or a step sequencer can move it. Right-click a scene to keep over it, make it A or B, or clear it; A and
// B cycle through the kept scenes when clicked. Presets keep the scenes (song.scenes) ----
let mScenes = new Array(8).fill(null), mSceneA = -1, mSceneB = -1, mMorph = 0;
const mSlotFd = (i) => mFaders.find((f) => f.el === mSlotEls[i].el);
const mFdNow = (fd) => (fd.base !== null ? fd.base : fd.get());
function mFdSet(fd, v) { v = fd.snap(v); if (fd.base !== null) { fd.base = v; mSeqApply(fd); } else fd.put(v); }
// a scene: each knob's control and its setting
const mSceneTake = () => mSlots.map((ctl, i) => ({ ctl: ctl.slice(), v: mFdNow(mSlotFd(i)) }));
// a setting back on its control: the knob it's on now, else the control itself wherever it is
function mSceneSet(ctl, v) {
  const i = mSlots.findIndex((c) => c.join('|') === ctl.join('|'));
  if (i >= 0) return mFdSet(mSlotFd(i), v);
  const A = slotAxis(ctl); if (!A) return;
  if (A.fd) mFdSet(A.fd, v); else A.set(Math.round(v));
}
function mSceneMorph() {
  const a = mScenes[mSceneA], b = mScenes[mSceneB]; if (!a) return;
  const k = b ? mMorph / 100 : 0;
  for (const e of a) {
    const f = b && b.find((x) => x.ctl.join('|') === e.ctl.join('|'));
    mSceneSet(e.ctl, f ? e.v + (f.v - e.v) * k : e.v);
  }
  mDrawAll(); setDirty(true);
}
// the scene buttons
const mSceneBtns = mScenes.map((_, n) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.textContent = n + 1;
  b.addEventListener('click', () => {
    if (!mScenes[n]) { mScenes[n] = mSceneTake(); if (mSceneA < 0) mSceneA = n; else if (mSceneB < 0 && n !== mSceneA) mSceneB = n; }
    else { mSceneA = n; mMorph = 0; mSceneMorph(); }
    mSceneDraw();
  });
  b.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    mMenu(e, [[mScenes[n] ? 'keep knobs here' : 'keep knobs', () => { mScenes[n] = mSceneTake(); mSceneDraw(); }],
      ...(mScenes[n] ? [['make it A', () => { mSceneA = n; mSceneMorph(); mSceneDraw(); }], ['make it B', () => { mSceneB = n; mSceneMorph(); mSceneDraw(); }],
        ['clear', () => { mScenes[n] = null; if (mSceneA === n) mSceneA = -1; if (mSceneB === n) mSceneB = -1; mSceneDraw(); }]] : [])]);
  });
  $('m-scene-grid').append(b); return b;
});
// A and B: each click the next kept scene
const mSceneNext = (from) => { for (let d = 1; d <= 8; d++) { const n = (from + d + 8) % 8; if (mScenes[n]) return n; } return -1; };
$('m-scene-a').addEventListener('click', () => { mSceneA = mSceneNext(mSceneA); mSceneMorph(); mSceneDraw(); });
$('m-scene-b').addEventListener('click', () => { mSceneB = mSceneNext(mSceneB); mSceneMorph(); mSceneDraw(); });
function mSceneDraw() {
  mSceneBtns.forEach((b, n) => { b.classList.toggle('full', !!mScenes[n]); b.classList.toggle('is-a', n === mSceneA); b.classList.toggle('is-b', n === mSceneB);
    b.setAttribute('aria-label', `scene ${n + 1}${mScenes[n] ? '' : ', empty'}${n === mSceneA ? ', A' : ''}${n === mSceneB ? ', B' : ''}`); });
  $('m-scene-a').textContent = `a ${mSceneA >= 0 ? mSceneA + 1 : '-'}`; $('m-scene-b').textContent = `b ${mSceneB >= 0 ? mSceneB + 1 : '-'}`;
}
// the morph knob, and a place for it on the knobs' chooser (perf › scenes)
mFader($('m-scene-morph'), 'morph', { min: 0, max: 100, knob: true, dflt: 0, get: () => mMorph, show: (v) => `${v}%`,
  set: (v) => { mMorph = v; mSceneMorph(); } });
{
  const fd = mFaders[mFaders.length - 1];
  XY_PLACES.find((P) => P.name === 'perf').groups.push(['scenes', [{ label: 'morph', min: 0, max: 100, get: fd.get, set: (x) => fd.put(x), fd }]]);
}
// presets keep the scenes; one without them has none
const mSceneSnap = songSnapshot, mSceneUse = useSong;
songSnapshot = function () { return { ...mSceneSnap(), scenes: { s: mScenes.map((x) => x && x.map((e) => ({ ctl: e.ctl, v: e.v }))), a: mSceneA, b: mSceneB, morph: mMorph } }; };
useSong = function (g, keepTempo) {
  mSceneUse(g, keepTempo);
  const S = g.scenes && Array.isArray(g.scenes.s) ? g.scenes : null;
  mScenes = S ? S.s.slice(0, 8).map((x) => (Array.isArray(x) ? x.filter((e) => e && Array.isArray(e.ctl) && typeof e.v === 'number') : null)) : new Array(8).fill(null);
  while (mScenes.length < 8) mScenes.push(null);
  mSceneA = S && mScenes[S.a] ? S.a : -1; mSceneB = S && mScenes[S.b] ? S.b : -1; mMorph = S && typeof S.morph === 'number' ? S.morph : 0;
  mSceneDraw(); mDrawAll();
};
mSceneDraw();
