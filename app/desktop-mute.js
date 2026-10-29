// ---- mute and solo (laptop), beside the knobs: a pair a track (drum 1, 2, 3, snare, cymbal, closed and open hat).
// They work on the notes, not the sound: a muted track's steps aren't sent to the player, so it stops being hit while
// anything already sounding (a decay, an echo) rings on; with any solo on, only the soloed tracks are hit. Like density,
// they change what's sent, not the pattern; presets keep them (song.mute, song.solo) ----
let mMute = new Array(7).fill(false), mSolo = new Array(7).fill(false);
const mMuteSend = send;
send = function (m) {
  if (m && m.type === 'seq' && m.pattern && (mMute.some(Boolean) || mSolo.some(Boolean))) {
    const any = mSolo.some(Boolean), quiet = (t) => mMute[t] || (any && !mSolo[t]);
    const P = m.pattern, cut = (pg) => { for (let t = 0; t < 7; t++) if (quiet(t)) pg.on[t] = pg.on[t].map(() => 0); return pg; };
    if (P.pages) P.pages = P.pages.map(cut); else cut(P);
  }
  mMuteSend(m);
};
const MUTE_N = ['dr1', 'dr2', 'dr3', 'sn', 'cy', 'cl', 'op'];
const mMuteBtns = MUTE_N.map((n, t) => {
  const row = document.createElement('div'); row.className = 'm-mute-row';
  row.innerHTML = `<span>${n}</span><button class="m-toggle" type="button">mute</button><button class="m-toggle" type="button">solo</button>`;
  const [mb, sb] = row.querySelectorAll('button');
  mb.addEventListener('click', () => { mMute[t] = !mMute[t]; mMuteDraw(); sendSeq(); setDirty(true); });
  sb.addEventListener('click', () => { mSolo[t] = !mSolo[t]; mMuteDraw(); sendSeq(); setDirty(true); });
  $('m-mute-rows').append(row); return [mb, sb, row];
});
function mMuteDraw() {
  const any = mSolo.some(Boolean);
  mMuteBtns.forEach(([mb, sb, row], t) => {
    mb.setAttribute('aria-pressed', mMute[t]); sb.setAttribute('aria-pressed', mSolo[t]);
    mb.setAttribute('aria-label', `mute ${XN[t] || 'open hat'}`); sb.setAttribute('aria-label', `solo ${XN[t] || 'open hat'}`);
    row.classList.toggle('quiet', mMute[t] || (any && !mSolo[t]));
  });
}
$('m-mute-clear').addEventListener('click', () => { mMute.fill(false); mSolo.fill(false); mMuteDraw(); sendSeq(); setDirty(true); });
const mMuteSnap = songSnapshot, mMuteUse = useSong;
songSnapshot = function () { return { ...mMuteSnap(), mute: mMute.slice(), solo: mSolo.slice() }; };
useSong = function (g, keepTempo) {
  mMute = Array.from({ length: 7 }, (_, t) => !!(g.mute && g.mute[t])); mSolo = Array.from({ length: 7 }, (_, t) => !!(g.solo && g.solo[t]));
  mMuteUse(g, keepTempo); mMuteDraw(); sendSeq();
};
mMuteDraw();
