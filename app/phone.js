// ---- phones (html.phone, set by the script in the page's head): one big screen, .m-ph, in place of the rest: play,
// the tempo, every randomiser, undo and save. Its buttons press the real ones, so they do just what they do on the laptop ----
if (document.documentElement.classList.contains('phone')) {
  for (const b of $('m-ph').querySelectorAll('[data-for]')) b.addEventListener('click', () => $(b.dataset.for).click());
  const play = $('m-ph-play');
  play.addEventListener('click', () => $('play').click());
  const phSync = () => {
    const on = $('play').getAttribute('aria-pressed') === 'true';
    play.setAttribute('aria-pressed', on); play.querySelector('span').textContent = on ? 'stop' : 'play';
    $('m-ph-undo').disabled = $('m-undo').disabled;
    $('m-ph-tempo').textContent = perf.tempo;
    $('m-ph-pname').textContent = $('m-pname').textContent;
  };
  new MutationObserver(phSync).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
  new MutationObserver(phSync).observe($('m-undo'), { attributes: true, attributeFilter: ['disabled'] });
  new MutationObserver(phSync).observe($('m-pname'), { childList: true, characterData: true, subtree: true });
  perfDraws.push(phSync); // (a preset or a knob changing the tempo)
  // − and +: a tap steps 1 bpm, a hold keeps stepping, faster the longer it's held
  const step = (d) => { const v = clampTempo(perf.tempo + d); if (v !== perf.tempo) { setPerf('tempo', v); setDirty(true); } phSync(); };
  for (const [id, d] of [['m-ph-down', -1], ['m-ph-up', 1]]) {
    const b = $(id); let t = 0;
    const stop = () => clearTimeout(t);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); step(d); let n = 0;
      const go = () => { step(d * (n++ > 20 ? 5 : 1)); t = setTimeout(go, n > 8 ? 60 : 120); };
      t = setTimeout(go, 400);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  // install app: only where the browser offers it (mobile-extras.js keeps the offer in mInstallEv; Android Chrome)
  const inst = $('m-ph-install');
  new MutationObserver(() => { inst.hidden = $('m-install').hidden; }).observe($('m-install'), { attributes: true, attributeFilter: ['hidden'] });
  inst.hidden = $('m-install').hidden;
  inst.addEventListener('click', () => $('m-install').click());
  phSync();
}
