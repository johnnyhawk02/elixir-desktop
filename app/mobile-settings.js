// ---- the randomisers' settings: tapping ELIXIR opens a pop-up with a page for each randomise button, its ranges and
// chances on bars (RAND, kept in this browser), that randomiser's button and play / stop ----
// a page: [key in RAND, name, the button it presses, rows: [setting, label, min, max, how it reads]]
const pc = (v) => `${v}%`, onoff = (v) => (v ? 'on' : 'off');
const RS_PAGES = [
  ['every', 'everything', 'm-everything', [['rushVoice', 'rush voice', 0, 1, onoff], ['vary', 'sound vary', 0, 50, pc], ['panOn', 'pan chance', 0, 100, pc], ['panMax', 'pan max', 8, 63, String], ['xfeed', 'crossfeed', 0, 1, onoff],
    ['genre', 'genre', 0, 1, onoff], ['energyLo', 'energy min', 0, 100, pc], ['energyHi', 'energy max', 0, 100, pc], ['fillsLo', 'fills min', 0, 100, pc], ['fillsHi', 'fills max', 0, 100, pc],
    ['groove', 'groove', 0, 1, onoff], ['depthLo', 'depth min', 0, 100, pc], ['depthHi', 'depth max', 0, 100, pc]]],
  ['kit', 'kit', 'm-kit', [['vary', 'vary', 0, 50, pc]]],
  ['alter', 'alter', 'm-alter', [['amount', 'amount', 1, 50, pc]]],
  ['pattern', 'pattern', 'm-pattern', [['genre', 'genre', 0, 1, onoff], ['energyLo', 'energy min', 0, 100, pc], ['energyHi', 'energy max', 0, 100, pc], ['fillsLo', 'fills min', 0, 100, pc],
    ['fillsHi', 'fills max', 0, 100, pc], ['groove', 'groove', 0, 1, onoff], ['depthLo', 'depth min', 0, 100, pc], ['depthHi', 'depth max', 0, 100, pc]]],
  ['xfeed', 'crossfeed', 'm-xrand', [['linksLo', 'links min', 1, 36, String], ['linksHi', 'links max', 1, 36, String], ['amtLo', 'amount min', 5, 100, pc], ['amtHi', 'amount max', 5, 100, pc], ['neg', 'negative', 0, 100, pc]]],
  ['fx', 'random fx', 'm-fx-rand', [['pingpong', 'ping pong', 0, 100, pc], ['echoOn', 'echo chance', 0, 100, pc], ['echoLo', 'echo min', 0, 100, String], ['echoHi', 'echo max', 0, 100, String], ['ringOn', 'ring chance', 0, 100, pc],
    ['ringLo', 'ring min', 0, 100, String], ['ringHi', 'ring max', 0, 100, String], ['fbLo', 'feedback min', 0, 127, String], ['fbHi', 'feedback max', 0, 127, String], ['fbWild', 'wild feedback', 0, 100, pc],
    ['toneLo', 'tone min', 0, 127, String], ['toneHi', 'tone max', 0, 127, String], ['widthLo', 'width min', 0, 200, pc], ['widthHi', 'width max', 0, 200, pc]]],
  ['alterfx', 'alter fx', 'm-fx-alter', [['amount', 'amount', 1, 50, pc]]],
];
let mRsPage = 0;
RS_PAGES.forEach(([, name], i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'tab'); b.textContent = name;
  b.addEventListener('click', () => { mRsPage = i; mRsDraw(); });
  $('m-rs-tabs').append(b);
});
function mRsDraw() {
  const [key, name, , rows] = RS_PAGES[mRsPage], S = RAND[key];
  [...$('m-rs-tabs').children].forEach((b, i) => b.setAttribute('aria-selected', i === mRsPage));
  $('m-rs-go').textContent = `randomise ${name}`;
  const box = $('m-rs-rows'); box.innerHTML = '';
  for (const [k, label, min, max, show] of rows) {
    const row = document.createElement('div'); row.className = 'm-seq-lenrow';
    row.innerHTML = '<span></span><div class="m-seq-len" role="slider"><i></i></div><output></output>';
    row.querySelector('span').textContent = label;
    const bar = row.querySelector('.m-seq-len'), out = row.querySelector('output');
    bar.setAttribute('aria-label', label);
    const draw = () => { bar.style.setProperty('--w', (S[k] - min) / (max - min)); out.textContent = show(S[k]); bar.setAttribute('aria-valuenow', S[k]); };
    const at = (e) => { const r = bar.getBoundingClientRect(); S[k] = min + Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (max - min)); saveRand(); draw(); };
    let held = false;
    bar.addEventListener('pointerdown', (e) => { bar.setPointerCapture(e.pointerId); held = true; at(e); });
    bar.addEventListener('pointermove', (e) => { if (held) at(e); });
    bar.addEventListener('pointerup', () => { held = false; }); bar.addEventListener('pointercancel', () => { held = false; });
    draw(); box.append(row);
  }
  mRsPlay();
}
const mRsPlay = () => { $('m-rs-play').textContent = $('play').getAttribute('aria-pressed') === 'true' ? 'stop' : 'play'; };
new MutationObserver(mRsPlay).observe($('play'), { attributes: true, attributeFilter: ['aria-pressed'] });
$('m-title').addEventListener('click', () => { $('m-rs').hidden = false; mRsDraw(); });
$('m-rs-close').addEventListener('click', () => { $('m-rs').hidden = true; });
// copy: every page's settings as text, to paste back as the new defaults (RAND0); where the clipboard is refused, a
// box with the text selected instead
$('m-rs-copy').addEventListener('click', async () => {
  const text = `Elixir Mobile randomise settings\n${JSON.stringify(RAND)}`;
  try { await navigator.clipboard.writeText(text); $('m-rs-copy').textContent = 'copied'; setTimeout(() => { $('m-rs-copy').textContent = 'copy'; }, 1500); }
  catch (e) { prompt('Copy these settings:', text); }
});
$('m-rs-go').addEventListener('click', () => $(RS_PAGES[mRsPage][2]).click());
$('m-rs-play').addEventListener('click', () => $('play').click());
$('m-rs-reset').addEventListener('click', () => { const key = RS_PAGES[mRsPage][0]; Object.assign(RAND[key], RAND0[key]); saveRand(); mRsDraw(); });

