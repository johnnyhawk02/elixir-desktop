// ---- help (options › help, or h; on a phone the HELP ME! button): getting started first, then a tab each for the pages and the features ----
const HELP = [
  ['start', 'getting started', `<p>Elixir is a six voice drum machine: drum 1, 2 and 3, snare, cymbal and hihat. Three steps to a beat:</p>
<ol><li>Press <b>play</b> (or space).</li><li>Press <b>everything</b> until you like what you hear: each press is a new beat, kit, effects and mix.</li>
<li>Turn the knobs, or press <b>kit</b>, <b>pattern</b> or <b>alter</b> to change one part. <b>undo</b> takes back the last one.</li></ol>
<p>The screen: the title line has <b>options</b>, <b>randomise</b> (a pop-up with every randomiser and undo), the presets bar (‹ name ›, <b>save</b>, <b>manage presets</b>), then <b>play</b> and <b>rec</b>. Under it on the left, the perform knobs and the step sequencer; on the right, one page at a time (grid, beat, voice, fx, xfeed, mix, mstr), chosen by the buttons over it.</p>
<p>Drag a knob or fader up or down, or scroll on it; double-click to reset it. When you like the sound, <b>save</b> in the presets bar at the top. <b>rec</b> records a WAV. Keys for nearly everything: see keyboard.</p>
<p>(On a screen under 1000 px wide it becomes the phone layout: pages along the bottom, and hold a fader for its sequencer.)</p>`],
  ['perf', 'perform: knobs and randomisers', `<p>Twelve knobs, four across and three down: tempo, variation, the perform controls (pitch, decay, filter, fm, crossfeed), energy, then genre, beat, fills and rush. MIDI CC 1 to 12 turn them (any channel).</p>
<ul><li>Each knob's ring shows its value. While its step sequencer runs, the pointer stays on your setting and the lit part of the ring shows where the sequencer has moved it.</li>
<li><b>options</b> › <b>assign knobs</b>, then click a knob to choose what it does: any fader from any page, or any drum's setting. Or right-click a knob › <b>assign</b>.</li></ul>
<p>The <b>randomise</b> button opens a pop-up with all the randomisers and undo (it stays open while you click; click elsewhere or esc to close):</p>
<ul><li><b>everything</b>: a new beat (genre, groove, kit, effects, mix). <b>kit</b>: new sounds. <b>alter</b>: the sounds nudged about 10%. <b>pattern</b>: a new beat on the same sounds.</li>
<li><b>crossfeed</b>: a new crossfeed patch (see fx). <b>random fx</b>: new effects and sends. <b>alter fx</b>: the effects nudged.</li>
<li><b>knob seqs</b>: a new step sequencer on every perform knob except tempo, genre and beat: 8 or 16 steps, each step a 16th up to 8 bars long (mostly the long ones), random steps, depth and slew. Undo puts the old ones back.</li>
<li>Click to randomise. Drag up or down on one to set how far it goes, 10% to 100% (a dotted bar along its foot below 100%): at 30% it moves everything only 30% of the way to the new sound, and switches choices like the style 30% of the time.</li>
<li>Hold one still for half a second for its settings, the ranges and chances it uses.</li>
<li><b>options</b> › <b>randomise on next bar</b>: while playing, randomises wait for the start of the next bar (the button flashes until then).</li></ul>`],
  ['seq', 'step sequencer', `<p>Under the knobs. Touch any knob or fader, here or on a page on the right, and its sequencer shows there (greyed out until it runs). It starts once you paint a step or press a shape or a random button, and nothing runs for a control until then.</p>
<ul><li>2 to 64 steps, each moving the control up or down from where you leave it, so you can still play it. Paint them with the mouse. Past 16 steps they're on pages: the <b>1</b> to <b>4</b> buttons by the name show each sixteen (the one playing is underlined). On an empty sequencer they also set the length: 16, 32, 48 or 64.</li>
<li><b>length</b> the number of steps (2 to 64); <b>slew</b> glides between them; <b>speed</b> each step's length, a 16th up to 8 bars; <b>depth</b> how far they reach.</li>
<li>Shapes, in the row of small buttons under it: <b>ramp ↑</b>, <b>ramp ↓</b>, <b>tri</b>, <b>square</b>, <b>sine</b>.</li>
<li>Random: <b>rnd</b> (every step anywhere), <b>drunk</b> (a wandering walk), <b>hold</b> (values held for 2 to 4 steps), <b>sparse</b> (mostly still, now and then a jump), <b>smooth</b> (random points glided between).</li>
<li><b>on</b> switches it on and off. A control with a sequencer running has its name inverted. Presets keep them. esc greys the strip out.</li>
<li>MIDI CC 21, 22, 23 and 24 set its length, slew, speed and depth (on the sequencer shown).</li>
<li>The steps follow the groove and its depth, landing with the swung hits; switch that off in <b>options</b> › <b>user settings</b> › <b>seq</b>.</li></ul>`],
  ['grid', 'grid: patterns', `<p>The first page on the right: a lane for each track (the kick at the bottom, the hats at the top), sixteen steps a bar.</p>
<ul><li>Tap a step for on or off, or drag across steps to paint; with cmd (ctrl) it puts accents on or off.</li>
<li><b>1</b> to <b>8</b> over the grid pick which pattern plays and is edited, straight away. Right-click one to <b>record</b> into it (from the next bar, whatever plays, until you press its STOP) or <b>clear</b> it.</li>
<li><b>generator</b> hands back to the generator (the perform knobs, the beat page and the randomisers): what it makes shows in the lanes, its fills written out bar by bar. The button then says <b>insert into pattern N</b>: press it to put that into the pattern picked. Editing a step while the generator plays does the same.</li>
<li><b>bars</b>: a pattern is 1 to 8 bars. Tap a bar to show it (a dashed one adds bars up to it), <b>−</b> takes the last off, <b>+</b> adds a copy of the bar shown. <b>◀ ▶</b> shift the whole pattern a step (cmd/ctrl: a bar).</li>
<li>Cmd/ctrl + c copies what plays, cmd/ctrl + v pastes it over the pattern picked. Tap a lane's name for its voice page. The patterns are kept in this browser.</li></ul>`],
  ['beat', 'beat: the pattern', `<p>Tempo, genre, beat, energy, fills, var and bars; rush, rush on, velocity, groove, depth and accent.</p>
<ul><li><b>genre</b> picks a style, <b>beat</b> one of its grooves, <b>energy</b> how busy it is, <b>fills</b> how often it fills.</li>
<li>Every genre has 64 beats. <b>var</b> plays each beat as a phrase with variation bars in it: <b>off</b> loops one bar, <b>A</b> changes only the last bar, up to <b>D</b> which changes every second bar most. <b>bars</b> makes the phrase 4 or 8 bars long. Each beat always plays the same variations, and presets keep both.</li>
<li><b>rush</b> builds a roll: the chosen drum (<b>rush on</b>) rolls faster and faster while the others drop out and a high-pass rises. Push it up for a build, drop it for the drop. Its curve is in <b>options</b> › <b>settings</b> › <b>rush</b>.</li>
<li><b>groove</b> and <b>depth</b> give it swing or push; <b>accent</b> how loud the accents are.</li>
<li><b>density</b>, a fader for each track (drum 1, 2, 3, snare, cymbal, closed and open hat): under 100% it thins that track, off-beats first; over 100% it adds hits on its empty steps, eighths first, until at 200% every step plays. The same steps go or come each time, and presets keep it. A square over each track lights on its hits, so you can see what the density is doing.</li></ul>`],
  ['voice', 'voice: shape a drum', `<p>Every setting of one drum. Pick the drum along the top (or keys 1 to 6), then a tab ([ and ] step through them):</p>
<ul><li><b>tone</b>: tuning, wave and fm. <b>shape</b>: the envelope, the pitch drop and the click (the attack's sample).</li>
<li><b>filter</b>: cutoff, resonance, type and drive, then the drum's volume, pan, sample rate and drive. <b>mod</b>: its lfo and what velocity does.</li></ul>`],
  ['fx', 'fx: echo, reverb, crossfeed (xfeed)', `<ul><li><b>echo</b>: send, time (musical lengths), tone, feedback and width; tick <b>ping pong</b> to bounce it left and right.</li>
<li><b>reverb</b>: send, time (the pre-delay before it), decay, tone (dark to bright) and early (the early reflections' level). It's the LXR firmware's own reverb, written for it but never switched on in the hardware.</li>
<li><b>crossfeed</b>: drums feeding each other. A row is the drum it comes from, a column the drum it goes into; click a column's name to pick what it changes there (fm, filter or ring). Drag a cell up or down to set it; double-click to clear.</li></ul>`],
  ['mix', 'mix: the channel strips and mutes', `<p>The one mixer. A strip for each drum (drum 1, 2, 3, snare, cymbal, hihat): its echo send knob, reverb send knob and pan knob (L, C, R) over its level fader, with a level meter beside it, and its mute at the foot.</p>
<ul><li>Each send has a small square under its knob: a click mutes that send (the square fills, the knob dims). A muted send sends nothing but keeps its amount.</li>
<li>The buttons at the foot take the drum's name: a click mutes the drum. <b>clear mutes</b> lifts every mute.</li>
<li>Keys: <b>z x c v b n</b> mute the drums; <b>a s d f g h</b> mute their echo sends; <b>q w e r t y</b> their reverb sends.</li>
<li>Mutes work on the notes, not the sound: a muted drum's last hit, its decay and its echo ring on. The hihat's mute covers both its closed and open hits. Presets keep them all, and they work on the grid's patterns too.</li></ul>`],
  ['mstr', 'mstr: the master chain', `<p>The whole mix runs top to bottom:</p>
<ul><li><b>distortion</b>: mix, type, drive, colour, tone and volume.</li><li><b>compressor</b>: glues it together; the meter shows the gain reduction.</li></ul>`],
  ['prst', 'presets', `<ul><li>The bar at the top shows the preset loaded: <b>‹</b> and <b>›</b> step through them, <b>save</b> keeps what you hear as a new one. While playing, a new preset flashes until the next bar, then takes over.</li>
<li><b>manage presets</b> opens the list: click one to load it (the list stays open to try another), the star makes it a favourite (listed first), and your own have <b>rename</b> and <b>delete</b>.</li>
<li>Type in its search box (or press /) to find one by name; enter loads the first found. Untick <b>use its tempo</b> to keep your tempo when one loads.</li>
<li><b>save over</b> replaces the one loaded. <b>export</b> saves your presets to a file (it never deletes anything); <b>import</b> reads one back, or drop the file anywhere on the page.</li></ul>`],
  ['rec', 'recording', `<ul><li><b>rec</b> records a WAV: press it to start (it starts playing too), again to stop, and the file downloads.</li>
<li>Hold or right-click <b>rec</b> to choose what it records: <b>free</b>, or an exact loop of 1, 2, 4, 8, 16, 32, 64 or 128 bars. A loop starts at the next bar, shows its progress on the button and downloads by itself, cut to repeat seamlessly in any other app.</li></ul>`],
  ['keys', 'keyboard and mouse', `<ul><li><b>space</b> play and stop. <b>enter</b> record, <b>l</b> record a loop.</li>
<li><b>1</b> everything, <b>2</b> kit, <b>3</b> alter, <b>4</b> pattern, <b>5</b> crossfeed, <b>6</b> random fx, <b>7</b> alter fx, <b>8</b> knob seqs (the pop-up's order; they work with it closed), <b>u</b> undo. <b>m</b> randomise on next bar.</li>
<li><b>z x c v b n</b> mute drum 1, 2, 3, snare, cymbal, hihat; <b>a s d f g h</b> mute their echo sends; <b>q w e r t y</b> their reverb sends.</li>
<li><b>shift</b> + <b>1</b> to <b>6</b> show the voice page with that drum; <b>[</b> and <b>]</b> step through its tabs.</li>
<li><b>o</b> manage presets, <b>/</b> search presets, <b>?</b> help. <b>esc</b> closes whatever is open.</li>
<li>Click a knob or fader, then the arrow keys step it. Scroll on one with the mouse wheel or trackpad to turn it.</li>
<li>Right-click a knob or fader for its step sequencer, reset and (on perform) assign. Double-click one to reset it.</li></ul>`],
  ['more', 'more', `<ul><li><b>options</b> (by the e) holds randomise on next bar, assign knobs, and:</li>
<li><b>accent colour</b>: off (the plain screen), red, orange, blue or violet for lit buttons and knob rings.</li>
<li><b>settings</b>: copy the knob assignments or your presets, export or clear presets, and the <b>rush</b> graph of how the rush builds (drag its squares).</li>
<li><b>user settings</b>: <b>midi</b>, which CC moves each knob, with presets (cc1 to cc12, cc13 to cc24) and your own; <b>seq</b>, whether sequencers follow the groove.</li>
<li>Install it as an app from your browser's menu; it works offline.</li>
<li>The version number is by the e; the latest arrives when you open it with a connection (cmd+shift+R to be sure).</li></ul>`],
];
let mHelpTab = 0;
function mHelpDraw() {
  const tabs = $('m-help-tabs'); tabs.innerHTML = '';
  HELP.forEach(([name], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'm-btn'; b.setAttribute('role', 'tab'); b.textContent = name;
    b.setAttribute('aria-selected', i === mHelpTab); b.addEventListener('click', () => { mHelpTab = i; mHelpDraw(); }); tabs.append(b);
  });
  const [, title, body] = HELP[mHelpTab];
  $('m-help-text').innerHTML = `<h3>${title}</h3>${body}`; $('m-help-text').scrollTop = 0;
}
$('m-help-open').addEventListener('click', () => { mHelpTab = 0; mHelpDraw(); $('m-help').hidden = false; });
mCloser('m-help');
