// ---- mutes (laptop), beside the knobs: a column a drum (drum 1, 2, 3, snare, cymbal, hihat: the hat's closed and open
// together), each a level meter over its mute button; keys z x c v b n. They work on the notes, not the sound: a muted
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
  mMuteSend(m);
};
const MUTE_N = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'hh'], MUTE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n'];
const mMuteCols = MUTE_N.map((n, d) => {
  const col = document.createElement('div'); col.className = 'm-mute-col';
  col.innerHTML = `<u class="m-mute-meter" aria-hidden="true"><span class="m-lvm-on"></span><span class="m-lvm-pk"></span></u><button class="m-toggle" type="button">${n}</button><small>${MUTE_KEYS[d]}</small>`;
  const b = col.querySelector('button');
  b.addEventListener('click', () => mMuteToggle(d));
  $('m-mute-rows').append(col); return { col, b, meter: col.querySelector('.m-mute-meter') };
});
function mMuteToggle(d) { mMute[d] = !mMute[d]; mMuteDraw(); sendSeq(); setDirty(true); }
function mMuteDraw() {
  mMuteCols.forEach(({ col, b }, d) => { b.setAttribute('aria-pressed', mMute[d]); b.setAttribute('aria-label', `mute ${XN[d]} (${MUTE_KEYS[d]})`); col.classList.toggle('quiet', mMute[d]); });
}
// the meters: the same peaks as the mixer's (lvms in app/mixer.js, one a drum)
const mMuteLvm = lvmDraw;
lvmDraw = function (m) {
  mMuteLvm(m);
  const c = mMuteCols[lvms.indexOf(m)]; if (!c) return;
  c.meter.style.setProperty('--m', ((Math.max(LVM_FLOOR, m.db) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
  c.meter.style.setProperty('--h', ((Math.max(LVM_FLOOR, m.hold) - LVM_FLOOR) / -LVM_FLOOR).toFixed(3));
};
$('m-mute-clear').addEventListener('click', () => { mMute.fill(false); mMuteDraw(); sendSeq(); setDirty(true); });
const mMuteSnap = songSnapshot, mMuteUse = useSong;
songSnapshot = function () { return { ...mMuteSnap(), mute: mMute.slice() }; };
useSong = function (g, keepTempo) {
  mMute = Array.from({ length: 6 }, (_, d) => !!(g.mute && g.mute[d]));
  mMuteUse(g, keepTempo); mMuteDraw(); sendSeq();
};
mMuteDraw();
