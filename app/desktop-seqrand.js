// ---- knob seqs (in the randomise pop-up): every perform knob but tempo, genre and beat gets a new step sequencer, switched on: 8 or 16 steps,
// each step a 16th up to 8 bars long, picked mostly from the long ones (the chance grows with the square of the
// length's place: 8 bars is 64 times as likely as a 16th), its steps made one of the five random ways, with a random
// depth and slew. Undo puts the knobs' sequencers back ----
const SEQR_W = SEQ_STEPS.map((_, i) => (i + 1) * (i + 1));
// (the phone's knob seqs button is also a fader: it sets mKseqAt, 0..1 from 1/16 to 8 bars, and the steps are then
// picked round that length, mostly it and its neighbours; null, as on the laptop, keeps the long-skewed weights)
let mKseqAt = null;
const mSeqRandStep = () => {
  if (mKseqAt !== null) {
    const t = mKseqAt * (SEQ_STEPS.length - 1), w = SEQ_STEPS.map((_, i) => Math.exp(-((i - t) ** 2) / .98));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SEQ_STEPS.length; i++) if ((r -= w[i]) < 0) return SEQ_STEPS[i];
    return SEQ_STEPS[SEQ_STEPS.length - 1];
  }
  let r = Math.random() * SEQR_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SEQ_STEPS.length; i++) if ((r -= SEQR_W[i]) < 0) return SEQ_STEPS[i];
  return SEQ_STEPS[SEQ_STEPS.length - 1];
};
// (any knob, whatever it's assigned to, except tempo, genre and beat, which it leaves alone)
const SEQR_SKIP = ['tempo', 'genre', 'beat'];
const mKnobFaders = () => mFaders.filter((f) => {
  const m = /^m-faders:slot(\d+)$/.exec(f.key), sl = m && mSlots[Number(m[1])];
  return sl && !((sl[0] === 'perf' || sl[0] === 'beat') && SEQR_SKIP.includes(sl[2]));
});
$('m-knobseq').addEventListener('click', () => {
  const fs = mKnobFaders(), was = fs.map((f) => (f.seq ? { ...f.seq, vals: f.seq.vals.slice() } : null));
  const kinds = Object.keys(SEQ_RNDS);
  for (const f of fs) {
    // (a knob already in fill mode keeps it, and the fills knob always gets it: its fills come in at the ends of bars
    // 2, 4 and 8, a step a beat to a bar long, and deep enough to hear)
    const fill = !!(f.seq && f.seq.fill) || f.label === 'fills';
    // (in fill mode: a beat to a bar a step, and long enough for 8 bars)
    const step = fill ? [4, 8, 16][Math.floor(Math.random() * 3)] : mSeqRandStep(), len = fill ? 128 / step : Math.random() < .5 ? 8 : 16;
    const q = { on: true, len, slew: fill ? 0 : Math.round(Math.random() * 10) * 10, step, depth: fill ? 60 + Math.round(Math.random() * 8) * 5 : 20 + Math.round(Math.random() * 12) * 5, fill };
    const r = SEQ_RNDS[kinds[Math.floor(Math.random() * kinds.length)]](len), v = fill ? mSeqFill(q, r) : r;
    if (f.base !== null) mSeqRelease(f);
    f.seq = { ...q, vals: Array.from({ length: SEQ_MAX }, (_, i) => (i < len ? mSeqOff(v[i]) : 0)) };
  }
  if (mSeqF && fs.includes(mSeqF)) mSeqDraft = null;
  if (mSeqF) mSeqDraw(); else mSeqMarks();
  setDirty(true);
  undoValues = null; $('undo').disabled = true;
  mUndoFn = () => { fs.forEach((f, i) => { if (f.base !== null) mSeqRelease(f); f.seq = was[i]; }); if (mSeqF) { if (!mSeqF.seq) mSeqDraft = { ...newSeq(), on: false }; mSeqDraw(); } else mSeqMarks(); setDirty(true); };
  mUndo();
});
// clear knob seqs (the phone screen's button): every perform knob's sequencer gone, the knob back on its own setting.
// Undo puts them back
const mKnobSeqClear = () => {
  const fs = mFaders.filter((f) => /^m-faders:slot\d+$/.test(f.key) && f.seq);
  if (!fs.length) return;
  const was = fs.map((f) => ({ ...f.seq, vals: f.seq.vals.slice() }));
  for (const f of fs) { if (f.base !== null) mSeqRelease(f); f.seq = null; }
  if (mSeqF && fs.includes(mSeqF)) { mSeqDraft = { ...newSeq(), on: false }; mSeqDraw(); } else mSeqMarks();
  setDirty(true);
  undoValues = null; $('undo').disabled = true;
  mUndoFn = () => { fs.forEach((f, i) => { if (f.base !== null) mSeqRelease(f); f.seq = was[i]; }); if (mSeqF) mSeqDraw(); else mSeqMarks(); setDirty(true); };
  mUndo();
};
// (the laptop's randomise pop-up has it too)
$('m-knobseq-clear').addEventListener('click', mKnobSeqClear);
