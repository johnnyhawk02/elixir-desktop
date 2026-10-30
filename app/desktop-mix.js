// ---- the mixer on the laptop: a channel strip a drum (its echo and reverb send knobs over its level fader), with a
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

