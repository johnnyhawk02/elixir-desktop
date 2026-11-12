// ---- phones (html.phone, set by the script in the page's head): one big screen, .m-ph, in place of the rest: play,
// the tempo (a knob), every randomiser, undo and save. Its buttons press the real ones, so they do just what they do on the laptop ----
if (document.documentElement.classList.contains('phone')) {
  for (const b of $('m-ph').querySelectorAll('[data-for]')) b.addEventListener('click', () => $(b.dataset.for).click());
  const play = $('m-ph-play');
  play.addEventListener('click', () => $('play').click());
  const phSync = () => {
    const on = $('play').getAttribute('aria-pressed') === 'true';
    play.setAttribute('aria-pressed', on); play.querySelector('span').textContent = on ? 'stop' : 'play';
    $('m-ph-undo').disabled = $('m-undo').disabled;
    $('m-ph-tempo').textContent = perf.tempo;
    $('m-ph-knob').style.setProperty('--f', (perf.tempo - PERF_RANGE.tempo[0]) / (PERF_RANGE.tempo[1] - PERF_RANGE.tempo[0]));
    $('m-ph-pname').textContent = $('m-pname').textContent;
  };
  new MutationObserver(phSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
  new MutationObserver(phSync).observe($('m-undo'), { attributes: true, attributeFilter: ['disabled'] });
  new MutationObserver(phSync).observe($('m-pname'), { childList: true, characterData: true, subtree: true });
  perfDraws.push(phSync); // (a preset or a knob changing the tempo)
  // the tempo knob: drag up or down (about 1.5 px a bpm), or turn it with the wheel
  const knob = $('m-ph-knob'), [tLo, tHi] = PERF_RANGE.tempo;
  const setT = (v) => { v = clampTempo(Math.round(v)); if (v !== perf.tempo) { setPerf('tempo', v); setDirty(true); } phSync(); };
  let drag = null;
  knob.addEventListener('pointerdown', (e) => { e.preventDefault(); knob.setPointerCapture(e.pointerId); drag = { y: e.clientY, v: perf.tempo }; });
  knob.addEventListener('pointermove', (e) => { if (drag) setT(drag.v + (drag.y - e.clientY) / 1.5); });
  for (const ev of ['pointerup', 'pointercancel']) knob.addEventListener(ev, () => { drag = null; });
  knob.addEventListener('contextmenu', (e) => e.preventDefault());
  // install app: only where the browser offers it (mobile-extras.js keeps the offer in mInstallEv; Android Chrome)
  const inst = $('m-ph-install');
  new MutationObserver(() => { inst.hidden = $('m-install').hidden; }).observe($('m-install'), { attributes: true, attributeFilter: ['hidden'] });
  inst.hidden = $('m-install').hidden;
  inst.addEventListener('click', () => $('m-install').click());
  phSync();
}
