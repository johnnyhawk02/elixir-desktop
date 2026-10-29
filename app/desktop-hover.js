// ---- hover (laptop): resting the pointer on a fader or knob shows a tag with where it is, its whole name and its whole
// value (the readouts and names on the controls are cut short to fit). It follows the value while dragging or scrolling ----
const mTip = document.createElement('div'); mTip.className = 'm-tip'; mTip.id = 'm-tip'; mTip.hidden = true; $('m').append(mTip);
let mTipFd = null, mTipFrame = 0;
function mTipName(el, fd) {
  const panel = el.closest('[data-m-panel]'), page = panel ? M_PAGE_NAMES[panel.dataset.mPanel] : '';
  const row = el.closest('.m-fx-row'), head = row && row.querySelector(':scope > b, .m-fxhead b');
  const box = { 'm-duck': 'sidechain', 'm-dist': 'distortion', 'm-comp': 'compressor' }[el.parentElement.id];
  const where = panel && panel.dataset.mPanel === 'dice' ? `${page} · ${XN[mVoice]}` : head ? `${page} · ${head.textContent}` : box ? `${page} · ${box}` : page;
  // (the mixer's columns are named d1 .. hh; the tag gives the drum's name)
  const dr = ['d1', 'd2', 'd3', 'sn', 'cy', 'hh'].indexOf(fd.label);
  return [where, el.dataset.full || (dr >= 0 ? XN[dr] : fd.label)];
}
function mTipDraw() {
  mTipFrame = 0; if (!mTipFd) return;
  const [where, name] = mTipName(mTipFd.el, mTipFd);
  mTip.innerHTML = ''; const a = document.createElement('small'), b = document.createElement('b'), c = document.createElement('span');
  a.textContent = where; b.textContent = name; c.textContent = mTipFd.show(mTipFd.get()).replace(/\n/g, ' ');
  if (mTipFd.base !== null) c.textContent += ` (set ${mTipFd.show(mTipFd.base).replace(/\n/g, ' ')})`;
  mTip.append(a, b, c);
  // (above the control, kept on the screen)
  const r = mTipFd.el.getBoundingClientRect(), t = mTip.getBoundingClientRect();
  mTip.style.left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2)) + 'px';
  mTip.style.top = (r.top - t.height - 6 < 8 ? r.bottom + 6 : r.top - t.height - 6) + 'px';
  mTipFrame = requestAnimationFrame(mTipDraw);
}
$('m').addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('.m-vf'), fd = el && mFaders.find((f) => f.el === el);
  if (!fd || fd === mTipFd) return;
  mTipFd = fd; mTip.hidden = false; if (!mTipFrame) mTipDraw();
});
$('m').addEventListener('pointerout', (e) => {
  if (!mTipFd || (e.relatedTarget && mTipFd.el.contains(e.relatedTarget)) || mTipFd.el.classList.contains('held')) return;
  mTipFd = null; mTip.hidden = true; cancelAnimationFrame(mTipFrame); mTipFrame = 0;
});
// (a drag that ends off the control hides it then)
addEventListener('pointerup', () => { if (mTipFd && !mTipFd.el.matches(':hover')) { mTipFd = null; mTip.hidden = true; } });
// the step sequencer's heading gets the same whole name, and the control it's editing is marked while it's open
const mSeqOpenPhone = mSeqOpen;
mSeqOpen = function (fd) {
  mSeqOpenPhone(fd);
  if (mWide.matches) { const [where, name] = mTipName(fd.el, fd); $('m-seq-name').textContent = `${where} · ${name}`; }
  mFaders.forEach((f) => f.el.classList.toggle('seq-edit', f === fd));
};
$('m-seq-close').addEventListener('click', () => mFaders.forEach((f) => f.el.classList.remove('seq-edit')));
