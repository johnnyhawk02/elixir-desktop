// ---- the mouse (laptop): right-click a fader or knob for a small menu (its step sequencer, back to its default, and on
// the perf page what it does), and double-click one to put it back to its default. The phone's long hold and double
// tap on the name still work ----
const mFdOf = (el) => mFaders.find((f) => f.el === el);
function mReset(fd) {
  if (fd.dflt === undefined) return;
  const v = fd.snap(typeof fd.dflt === 'function' ? fd.dflt() : fd.dflt);
  if (fd.base !== null) { fd.base = v; mSeqApply(fd); } else fd.put(v);
  setDirty(true);
}
const mMenuClose = () => { const m = $('m-menu'); if (m) m.remove(); };
function mMenu(e, items) {
  mMenuClose();
  const m = document.createElement('div'); m.className = 'm-menu'; m.id = 'm-menu'; m.setAttribute('role', 'menu');
  for (const [label, act] of items) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'menuitem'); b.textContent = label;
    b.addEventListener('click', () => { mMenuClose(); act(); }); m.append(b);
  }
  $('m').append(m);
  // (by the pointer, kept on the screen)
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + 'px';
  m.querySelector('button').focus();
}
$('m').addEventListener('contextmenu', (e) => {
  const el = e.target.closest('.m-vf'), fd = el && mFdOf(el); if (!fd) return;
  e.preventDefault();
  const items = [[fd.seq && fd.seq.on ? 'edit step sequencer' : 'step sequencer', () => mSeqOpen(fd)]];
  if (fd.dflt !== undefined) items.push(['reset to default', () => mReset(fd)]);
  if (el.dataset.slot) items.push(['assign…', () => mChooser(Number(el.dataset.slot))]);
  mMenu(e, items);
});
addEventListener('pointerdown', (e) => { if (!e.target.closest('#m-menu')) mMenuClose(); }, { capture: true });
$('m').addEventListener('dblclick', (e) => {
  const tr = e.target.closest('.m-vtrack'), fd = tr && mFdOf(tr.closest('.m-vf')); if (fd) mReset(fd);
});

// ---- accent colour: one spot colour for lit things (off = the plain LCD ink), kept per browser ----
const SPOTS = ['off', 'red', 'orange', 'blue', 'violet'];
let mSpot = 'off';
try { const v = localStorage.getItem('elixir-desktop-spot'); if (SPOTS.includes(v)) mSpot = v; } catch (e) {}
const mSpotSet = (v) => {
  mSpot = v; if (v === 'off') delete document.documentElement.dataset.spot; else document.documentElement.dataset.spot = v;
  try { localStorage.setItem('elixir-desktop-spot', v); } catch (e) {}
};
mSpotSet(mSpot);
const mSpotMenu = (r) => mMenu({ clientX: r.left, clientY: r.bottom + 6 }, SPOTS.map((v) => [(v === mSpot ? '■ ' : '□ ') + v, () => mSpotSet(v)]));

// ---- the laptop's one options button: next bar and assign (ticked when on), then the settings, user settings, help and
// install app (whose own buttons the laptop hides) ----
$('m-opts').addEventListener('click', (e) => {
  const tick = (id) => ($(id).checked ? '■ ' : '□ ');
  const r = $('m-opts').getBoundingClientRect();
  mMenu({ clientX: r.left, clientY: r.bottom + 6 }, [
    [tick('m-nextbar') + 'randomise on next bar', () => $('m-nextbar').click()],
    [tick('m-assign') + 'assign knobs', () => $('m-assign').click()],
    ['accent colour: ' + mSpot + '…', () => mSpotMenu(r)],
    ['settings', () => $('m-set-open').click()], ['user settings', () => $('m-user-open').click()], ['help', () => $('m-help-open').click()],
    // (install app, while the browser offers it; its button under the presets is the phone's)
    ...(mInstallEv ? [['install app', () => $('m-install').click()]] : [])]);
});

// ---- the laptop's randomise button: opens the pop-up holding every randomiser and undo, under the button. It stays
// open for more clicks (and drags that set the depth); a click anywhere else or esc closes it ----
const mRandShow = (on) => {
  $('m').classList.toggle('show-rand', on); $('m-rand-open').setAttribute('aria-expanded', on ? 'true' : 'false');
  if (!on) return;
  const r = $('m-rand-open').getBoundingClientRect(), c = document.querySelector('.m-rand-card');
  c.style.left = Math.max(8, Math.min(r.left, innerWidth - c.offsetWidth - 8)) + 'px'; c.style.top = (r.bottom + 6) + 'px';
};
$('m-rand-open').addEventListener('click', () => mRandShow(!$('m').classList.contains('show-rand')));
addEventListener('pointerdown', (e) => { if (!e.target.closest('.m-rand-card, #m-rand-open')) mRandShow(false); }, { capture: true });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('m').classList.contains('show-rand')) { e.stopImmediatePropagation(); mRandShow(false); } }, { capture: true });
addEventListener('resize', () => { if ($('m').classList.contains('show-rand')) mRandShow(true); });
