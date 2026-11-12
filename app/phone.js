// ---- phones (html.phone, set by the script in the page's head): one big screen, .m-ph, in place of the rest: play,
// the tempo (a knob), a decay knob for each drum, every randomiser, clear knob seqs, their slew, undo and save. Its buttons press the real ones, so they do just what they do on the laptop ----
if (document.documentElement.classList.contains('phone')) {
  for (const b of $('m-ph').querySelectorAll('[data-for]')) b.addEventListener('click', () => $(b.dataset.for).click());
  $('m-ph-seqclear').addEventListener('click', mKnobSeqClear);
  // a button that is a fader too: drag up or down (200 px the whole way) sets its value 0..1 (the fill), a tap with no
  // drag runs tap(). The value is kept in this browser under key
  const phFaderBtn = (el, key, dflt, onSet, tap) => {
    let v = dflt;
    try { const x = parseFloat(localStorage.getItem(key)); if (x >= 0 && x <= 1) v = x; } catch (e) {}
    const put = (x) => { v = x; el.style.setProperty('--f', v); onSet(v); };
    let d = null, moved = false;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); d = { y: e.clientY, v }; moved = false; });
    el.addEventListener('pointermove', (e) => {
      if (!d || (!moved && Math.abs(e.clientY - d.y) < 8)) return;
      moved = true; put(Math.max(0, Math.min(1, d.v + (d.y - e.clientY) / 200)));
    });
    const end = () => { if (d && moved) try { localStorage.setItem(key, String(v)); } catch (e) {} d = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', () => { end(); moved = true; });
    // (a tap shows pressed for a moment once it has run, so the pressed look never comes up under a drag)
    el.addEventListener('click', () => {
      if (moved) { moved = false; return; }
      if (!tap) return;
      tap(); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 150);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    put(v);
  };
  // slew: one slew for every knob seq (off to a whole step, in fives), set on all of them as it moves, and given to
  // the new ones knob seqs makes here
  let phSlew = 0;
  const slewAll = () => { for (const f of mFaders) if (/^m-faders:slot\d+$/.test(f.key) && f.seq) f.seq.slew = phSlew; if (mSeqF) mSeqDraw(); };
  phFaderBtn($('m-ph-slew'), 'elixir-desktop-kslew', 0, (x) => {
    const s = Math.round(x * 20) * 5; $('m-ph-slew-out').textContent = s ? `${s}%` : 'off';
    if (s !== phSlew) { phSlew = s; slewAll(); }
  });
  // knob seqs: the fader sets the step lengths it picks, 1/16 at the bottom to 8 bars at the top (mKseqAt); a tap randomises
  phFaderBtn($('m-ph-kseq'), 'elixir-desktop-kseqlen', .8, (x) => {
    mKseqAt = x; $('m-ph-kseq-out').textContent = stepName(SEQ_STEPS[Math.round(x * (SEQ_STEPS.length - 1))]);
  }, () => { $('m-knobseq').click(); slewAll(); });
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
  // the tempo knob: drag up or down (about 1.5 px a bpm)
  const knob = $('m-ph-knob'), [tLo, tHi] = PERF_RANGE.tempo;
  const setT = (v) => { v = clampTempo(Math.round(v)); if (v !== perf.tempo) { setPerf('tempo', v); setDirty(true); } phSync(); };
  let drag = null;
  knob.addEventListener('pointerdown', (e) => { e.preventDefault(); knob.setPointerCapture(e.pointerId); drag = { y: e.clientY, v: perf.tempo }; });
  knob.addEventListener('pointermove', (e) => { if (drag) setT(drag.v + (drag.y - e.clientY) / 1.5); });
  for (const ev of ['pointerup', 'pointercancel']) knob.addEventListener(ev, () => { drag = null; });
  knob.addEventListener('contextmenu', (e) => e.preventDefault());
  // decay knobs, one for each drum (the hihat's two: closed and open): its amp decay in the kit, as on the voice page.
  // Drag up or down, 200 px the whole range; they follow randomisers and presets (redrawn with the other sliders)
  const decBox = $('m-ph-dec'), decs = [];
  XN.forEach((name, v) => {
    for (const [label, pn] of vpSections(v).flatMap((sc) => sc.params).filter(([l]) => l.startsWith('decay'))) {
      const par = PAR[pn], hi = spec(par).max, el = document.createElement('div');
      el.className = 'm-vf m-knob';
      el.innerHTML = '<div class="m-vtrack" role="slider" tabindex="0"><i></i></div><span class="m-flab"></span>';
      el.querySelector('.m-flab').textContent = label === 'decay' ? name : label === 'decay cl' ? 'cl hat' : 'op hat';
      const tr = el.firstChild; tr.setAttribute('aria-label', `${name} ${label}`);
      const draw = () => tr.style.setProperty('--f', values[par] / (hi || 1));
      let d = null;
      tr.addEventListener('pointerdown', (e) => { e.preventDefault(); tr.setPointerCapture(e.pointerId); d = { y: e.clientY, v: values[par] }; });
      tr.addEventListener('pointermove', (e) => {
        if (!d) return;
        const x = Math.max(0, Math.min(hi, Math.round(d.v + (d.y - e.clientY) / 200 * hi)));
        if (x !== values[par]) { setValue(par, x); setDirty(true); } draw();
      });
      for (const ev of ['pointerup', 'pointercancel']) tr.addEventListener(ev, () => { d = null; });
      tr.addEventListener('contextmenu', (e) => e.preventDefault());
      decBox.append(el); decs.push(draw);
    }
  });
  const decDraw = () => decs.forEach((f) => f());
  mDraws.push(decDraw); decDraw();
  // (a kit randomise doesn't always go through the sliders' redraw, so check now and then too)
  setInterval(decDraw, 400);
  // install app: only where the browser offers it (mobile-extras.js keeps the offer in mInstallEv; Android Chrome)
  const inst = $('m-ph-install');
  new MutationObserver(() => { inst.hidden = $('m-install').hidden; }).observe($('m-install'), { attributes: true, attributeFilter: ['hidden'] });
  inst.hidden = $('m-install').hidden;
  inst.addEventListener('click', () => $('m-install').click());
  phSync();
}
