// ---- knob seqs (in the randomise pop-up): every perform knob gets a new step sequencer, switched on: 8 or 16 steps,
// each step a 16th up to 8 bars long, picked mostly from the long ones (the chance grows with the square of the
// length's place: 8 bars is 64 times as likely as a 16th), its steps made one of the five random ways, with a random
// depth and slew. Undo puts the knobs' sequencers back ----
const SEQR_W = SEQ_STEPS.map((_, i) => (i + 1) * (i + 1));
const mSeqRandStep = () => {
  let r = Math.random() * SEQR_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SEQ_STEPS.length; i++) if ((r -= SEQR_W[i]) < 0) return SEQ_STEPS[i];
  return SEQ_STEPS[SEQ_STEPS.length - 1];
};
const mKnobFaders = () => mFaders.filter((f) => /^m-faders:slot\d+$/.test(f.key));
$('m-knobseq').addEventListener('click', () => {
  const fs = mKnobFaders(), was = fs.map((f) => (f.seq ? { ...f.seq, vals: f.seq.vals.slice() } : null));
  const kinds = Object.keys(SEQ_RNDS);
  for (const f of fs) {
    const len = Math.random() < .5 ? 8 : 16, v = SEQ_RNDS[kinds[Math.floor(Math.random() * kinds.length)]](len);
    if (f.base !== null) mSeqRelease(f);
    f.seq = { on: true, len, slew: Math.round(Math.random() * 10) * 10, step: mSeqRandStep(), depth: 20 + Math.round(Math.random() * 12) * 5,
      vals: Array.from({ length: SEQ_MAX }, (_, i) => (i < len ? mSeqOff(v[i]) : 0)) };
  }
  if (mSeqF && fs.includes(mSeqF)) mSeqDraft = null;
  if (mSeqF) mSeqDraw(); else mSeqMarks();
  setDirty(true);
  undoValues = null; $('undo').disabled = true;
  mUndoFn = () => { fs.forEach((f, i) => { if (f.base !== null) mSeqRelease(f); f.seq = was[i]; }); if (mSeqF) { if (!mSeqF.seq) mSeqDraft = { ...newSeq(), on: false }; mSeqDraw(); } else mSeqMarks(); setDirty(true); };
  mUndo();
});
