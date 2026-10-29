// ---- the keyboard (laptop): one key for each thing played often. It listens before anything else on the page, so the
// hidden desktop panels' own keys (space and 1..7 sound a drum, r randomises) never fire; typing in a box, and keys
// with cmd, ctrl or alt, are left alone ----
const KEYS = { ' ': 'm-play', r: 'm-rec', l: 'm-loop', e: 'm-everything', k: 'm-kit', a: 'm-alter', p: 'm-pattern', c: 'm-xrand',
  f: 'm-fx-rand', g: 'm-fx-alter', z: 'm-undo', u: 'm-undo' };
// (the open pop-up, if any: Escape presses its done button)
const mOpenPop = () => [...document.querySelectorAll('.m-rs, .m-seq')].find((el) => !el.hidden);
addEventListener('keydown', (e) => {
  if (e.target.closest('input:not([type="checkbox"]), select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  e.stopImmediatePropagation();
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, pop = mOpenPop();
  if (k === 'Escape') {
    if (pop) { const b = pop.querySelector('[id$="-close"]'); if (b) b.click(); else pop.hidden = true; }
    else if ($('m').classList.contains('show-xy')) mTab('xy'); else if ($('m').classList.contains('show-presets')) mTab('presets');
    return;
  }
  if (pop) return; // (the other keys wait until the pop-up is closed)
  // (arrows and enter stay with a focused control, so a fader still steps with the arrows)
  if (KEYS[k]) { e.preventDefault(); const b = $(KEYS[k]); if (!b.disabled) b.click(); }
  else if (/^[1-6]$/.test(k)) { e.preventDefault(); $('m-voice').children[Number(k) - 1].click(); }
  else if (k === '[' || k === ']') { e.preventDefault(); const n = $('m-vsec').children.length; $('m-vsec').children[(mVSec + (k === ']' ? 1 : n - 1)) % n].click(); }
  else if (k === 'n') { e.preventDefault(); $('m-nextbar').click(); }
  else if (k === 'y') { e.preventDefault(); mTab('xy'); }
  else if (k === 'o') { e.preventDefault(); mTab('presets'); }
  else if (k === 'h' || k === '?') { e.preventDefault(); $('m-help-open').click(); }
}, { capture: true });
