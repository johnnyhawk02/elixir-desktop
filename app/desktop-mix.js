// ---- the mixer on the laptop: a channel strip a drum (its echo and ring mod send knobs over its level fader), with a
// level meter beside each fader, fed by the same peaks as the full desktop mixer's meters (lvms in app/mixer.js) ----
const mLvm = [...$('m-mix-vol').children].map((vf) => {
  const m = document.createElement('u'); m.className = 'm-lvm'; m.setAttribute('aria-hidden', 'true');
  m.innerHTML = '<span class="m-lvm-on"></span><span class="m-lvm-pk"></span>'; vf.querySelector('.m-vtrack').append(m); return m;
});
const mLvmDraw = lvmDraw;
lvmDraw = function (m) {
  mLvmDraw(m);
  const el = mLvm[lvms.indexOf(m)]; if (!el) return;
  el.style.setProperty('--m', ((Math.max(LVM_FLOOR, m.db) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
  el.style.setProperty('--h', ((Math.max(LVM_FLOOR, m.hold) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
};

// ---- a presets file dragged onto the page imports it (as the import button does), and the presets open to show it ----
{
  let depth = 0;
  const isFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  addEventListener('dragenter', (e) => { if (!isFiles(e)) return; depth++; $('m').classList.add('dropping'); });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; $('m').classList.remove('dropping'); } });
  addEventListener('dragover', (e) => { if (isFiles(e)) e.preventDefault(); });
  addEventListener('drop', async (e) => {
    if (!isFiles(e)) return;
    e.preventDefault(); depth = 0; $('m').classList.remove('dropping');
    const files = [...e.dataTransfer.files].filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json');
    if (!files.length) return;
    if (mWide.matches && !$('m').classList.contains('show-presets')) mTab('presets'); else if (!mWide.matches) mTab('presets');
    await mImport(files);
  });
}
