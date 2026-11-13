// ---- mutes (laptop), on the mix page: a mute a drum (drum 1, 2, 3, snare, cymbal, hihat: the hat's closed and open
// together; keys z x c v b n) and a mute for each echo send and reverb send (keys a s d f g h and q w e r t y). A muted send sends nothing, its amount kept. They work on the notes, not the sound: a muted
// drum's steps aren't sent to the player, so it stops being hit while anything already sounding (a decay, an echo) rings
// on. Like density, they change what's sent, not the pattern; presets keep them (song.mute) ----
let mMute = new Array(6).fill(false);
// (the pattern's tracks each drum mutes: the hihat is its closed and open tracks)
const MUTE_TRACKS = [[0], [1], [2], [3], [4], [5, 6]];
const mMuteSend = send;
send = function (m) {
  if (m && m.type === 'seq' && m.pattern && mMute.some(Boolean)) {
    const P = m.pattern, cut = (pg) => { mMute.forEach((on, d) => { if (on) for (const t of MUTE_TRACKS[d]) pg.on[t] = pg.on[t].map(() => 0); }); return pg; };
    if (P.pages) P.pages = P.pages.map(cut); else cut(P);
  }
  // (the grid's patterns, app/grid.js, the same)
  if (m && m.type === 'lanes' && m.lanes && mMute.some(Boolean)) m.lanes.forEach((pg) => mMute.forEach((on, d) => { if (on) for (const t of MUTE_TRACKS[d]) pg.on[t] = pg.on[t].map(() => 0); }));
  mMuteSend(m);
};
// the sends' mutes: the mixer's amounts stay as they are; what goes to the player is 0 while muted
const mSendMute = { fx: new Array(6).fill(false), ring: new Array(6).fill(false) };
const SEND_KEYS = { fx: ['a', 's', 'd', 'f', 'g', 'h'], ring: ['q', 'w', 'e', 'r', 't', 'y'] };
send = ((inner) => function (m) {
  if (m && m.type === 'mix' && (mSendMute.fx.some(Boolean) || mSendMute.ring.some(Boolean))) {
    m = { ...m, fx: m.fx.map((v, n) => (mSendMute.fx[n] ? 0 : v)), sendR: m.sendR.map((v, n) => (mSendMute.ring[n] ? 0 : v)) };
  }
  inner(m);
})(send);
function mSendToggle(k, n) { mSendMute[k][n] = !mSendMute[k][n]; mMuteDraw(); sendMix(); setDirty(true); }
const MUTE_N = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'hh'], MUTE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n'];
// on the mix page (laptop): a small mute square by each send knob, and a row of mute buttons (the drums' names) under
// the level faders, with clear in the page's heading
const mMuteCols = MUTE_N.map((n, d) => {
  const sends = {};
  for (const [k, box] of [['fx', 'm-mix-echo'], ['ring', 'm-mix-ring']]) {
    const knob = $(box).children[d], sm = document.createElement('button');
    sm.type = 'button'; sm.className = 'm-toggle m-send-mute'; sm.setAttribute('aria-pressed', 'false');
    sm.addEventListener('click', () => mSendToggle(k, d)); knob.append(sm);
    sends[k] = { box: knob, sm };
  }
  const col = $('m-mix-vol').children[d];
  const b = document.createElement('button'); b.type = 'button'; b.className = 'm-toggle'; b.textContent = n;
  b.addEventListener('click', () => mMuteToggle(d)); $('m-mix-mute').append(b);
  return { col, b, sends };
});
function mMuteToggle(d) { mMute[d] = !mMute[d]; mMuteDraw(); sendSeq(); setDirty(true); }
function mMuteDraw() {
  mMuteCols.forEach(({ col, b, sends }, d) => {
    b.setAttribute('aria-pressed', mMute[d]); b.setAttribute('aria-label', `mute ${XN[d]}`); col.classList.toggle('quiet', mMute[d]);
    for (const k of ['fx', 'ring']) {
      const on = mSendMute[k][d]; sends[k].sm.setAttribute('aria-pressed', on); sends[k].box.classList.toggle('muted', on);
      sends[k].sm.setAttribute('aria-label', `mute ${XN[d]} ${k === 'fx' ? 'echo' : 'reverb'} send`);
    }
  });
}
$('m-mute-clear').addEventListener('click', () => { mMute.fill(false); mSendMute.fx.fill(false); mSendMute.ring.fill(false); mMuteDraw(); sendSeq(); sendMix(); setDirty(true); });
const mMuteSnap = songSnapshot, mMuteUse = useSong;
songSnapshot = function () { return { ...mMuteSnap(), mute: mMute.slice(), sendMute: { fx: mSendMute.fx.slice(), ring: mSendMute.ring.slice() } }; };
useSong = function (g, keepTempo) {
  mMute = Array.from({ length: 6 }, (_, d) => !!(g.mute && g.mute[d]));
  for (const k of ['fx', 'ring']) mSendMute[k] = Array.from({ length: 6 }, (_, d) => !!(g.sendMute && g.sendMute[k] && g.sendMute[k][d]));
  mMuteUse(g, keepTempo); mMuteDraw(); sendSeq(); sendMix();
};
mMuteDraw();
