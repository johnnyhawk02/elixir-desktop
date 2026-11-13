// ---- presets: a bar on the title line (the loaded one's name, ‹ › to step through, save, manage presets) and the
// manage pop-up under it: the list to load, star, rename or delete, search, save over, import and export (kept in this
// browser) ----
// while playing, a preset waits for the next bar to come in: until it's heard, the one playing stays marked and the
// new one's row flashes
let mPending = null, mPlayingPreset = null;
const mLoad = (k) => {
  if (!mPending) mPlayingPreset = kitList[Number($('kit').value)];
  loadPreset(k); mPending = playing ? k : null; mDrawPresets();
};
// the tempo box: ticked, loading a preset brings its saved tempo; unticked, the tempo stays (the desktop's bpm box,
// remembered in this browser)
$('m-pbpm').checked = presetBpm.checked;
$('m-pbpm').addEventListener('change', () => { presetBpm.checked = $('m-pbpm').checked; presetBpm.dispatchEvent(new Event('change')); });
// favourites: a star on any preset, mine or built in, keeps it in a group at the top of the list. Kept in this browser
// by name (a saved one also carries fav, so an export keeps it)
const FAV_KEY = 'elixir-desktop-favs';
const mFavs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } })());
for (const k of kitList) if (k.saved && k.fav) mFavs.add(k.name);
const mFavStore = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...mFavs])); } catch (e) {} };
// the bar: the name of the one loaded (flashing while it waits for the next bar)
function mPbarDraw() {
  const k = kitList[Number($('kit').value)], n = $('m-pname');
  n.textContent = k ? k.name : ''; n.classList.toggle('pending', !!mPending);
}
const mStep = (d) => {
  const opts = [...$('kit').options], i = opts.findIndex((o) => o.value === $('kit').value);
  const o = opts[(i + d + opts.length) % opts.length];
  if (o && o.value !== $('kit').value) mLoad(kitList[Number(o.value)]);
};
$('m-pprev').addEventListener('click', () => mStep(-1));
$('m-pnext').addEventListener('click', () => mStep(1));
// rename: the name becomes a box; enter (or a click away) keeps it, esc leaves it as it was. A name already used is refused
function mRename(k, li) {
  const b = li.querySelector('.m-pload'), box = document.createElement('input');
  box.className = 'm-prename'; box.value = k.name; box.maxLength = 24; box.spellcheck = false; box.setAttribute('aria-label', `New name for ${k.name}`);
  b.replaceWith(box); box.focus(); box.select();
  let done = false;
  const end = (keep) => {
    if (done) return; done = true;
    const name = box.value.trim().replace(/\s+/g, ' ');
    if (keep && name && name !== k.name && !kitList.some((o) => o !== k && o.name === name)) {
      if (mFavs.has(k.name)) { mFavs.delete(k.name); mFavs.add(name); mFavStore(); }
      k.name = name; storePresets();
      const v = $('kit').value; fillKits(); $('kit').value = v;
    }
    mDrawPresets();
  };
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') end(true); else if (e.key === 'Escape') { e.stopPropagation(); end(false); } });
  box.addEventListener('blur', () => end(true));
}
function mDrawPresets() {
  mPbarDraw(); mOverDraw();
  const list = $('m-plist'), cur = mPending ? mPlayingPreset : kitList[Number($('kit').value)];
  list.innerHTML = '';
  const group = (t) => { const li = document.createElement('li'); li.className = 'm-pgroup'; li.textContent = t; list.append(li); };
  const row = (k) => {
    const li = document.createElement('li'); li.classList.toggle('cur', k === cur); li.classList.toggle('pending', k === mPending);
    li.innerHTML = '<button class="m-pload" type="button"><b></b><small></small></button>';
    li.querySelector('b').textContent = k.name; li.querySelector('small').textContent = k.song ? `${k.song.tempo} bpm` : '';
    li.querySelector('.m-pload').addEventListener('click', async () => { await startAudio(); mLoad(k); });
    const fav = mFavs.has(k.name), star = document.createElement('button');
    star.className = 'm-pfav'; star.type = 'button'; star.textContent = fav ? '★' : '☆';
    star.setAttribute('aria-pressed', fav); star.setAttribute('aria-label', `Favourite ${k.name}`);
    star.addEventListener('click', () => {
      if (mFavs.has(k.name)) mFavs.delete(k.name); else mFavs.add(k.name);
      if (k.saved) { k.fav = mFavs.has(k.name); storePresets(); }
      mFavStore(); mDrawPresets();
    });
    li.append(star);
    // (a built-in one has gaps where a saved one's rename and delete are, so every row lines up)
    if (!k.saved) for (let i = 0; i < 2; i++) { const gap = document.createElement('span'); gap.className = 'm-pdel'; li.append(gap); }
    if (k.saved) {
      const r = document.createElement('button'); r.className = 'm-pdel'; r.type = 'button'; r.textContent = 'rename';
      r.addEventListener('click', () => mRename(k, li)); li.append(r);
      const d = document.createElement('button'); d.className = 'm-pdel'; d.type = 'button'; d.textContent = 'delete';
      d.setAttribute('aria-label', `Delete ${k.name}`);
      d.addEventListener('click', () => {
        if (!confirm(`Delete ${k.name}?`)) return;
        const wasCur = k === kitList[Number($('kit').value)], keep = kitList[Number($('kit').value)];
        kitList.splice(kitList.indexOf(k), 1); storePresets(); fillKits();
        mFavs.delete(k.name); mFavStore();
        $('kit').value = wasCur ? 0 : kitList.indexOf(keep);
        mDrawPresets();
      });
      li.append(d);
    }
    list.append(li);
  };
  // a search: every preset whose name has it, in one list (enter loads the first)
  const q = $('m-psearch').value.trim().toLowerCase();
  if (q) {
    const found = kitList.filter((k) => (k.saved || k.builtin) && k.name.toLowerCase().includes(q));
    group(found.length ? `found ${found.length}` : 'none found'); found.forEach(row);
    return;
  }
  // favourites first (each shows only there), then mine, then built in
  const favs = kitList.filter((k) => mFavs.has(k.name) && (k.saved || k.builtin));
  if (favs.length) { group('favourites'); favs.forEach(row); }
  const mine = kitList.filter((k) => k.saved && !mFavs.has(k.name));
  // (an empty group is one line, its heading and why, so it doesn't push the list down)
  if (mine.length) { group('mine'); mine.slice().reverse().forEach(row); }
  else group(favs.some((k) => k.saved) ? 'mine: all starred' : 'mine: none yet, save makes one');
  group('built in');
  kitList.filter((k) => k.builtin && !mFavs.has(k.name)).forEach(row);
}
$('m-psave').addEventListener('click', () => { $('kit-save').click(); mDrawPresets(); });
// save over: the current sound and song replace the loaded preset's, name and star kept (to match levels across
// presets). A built-in one's new version is kept in this browser over the factory one (and goes out with an export
// of favourites); Init kit can't be overwritten
const EDIT_KEY = 'elixir-desktop-factory-edits';
const mEdits = (() => { try { return JSON.parse(localStorage.getItem(EDIT_KEY)) || {}; } catch (e) { return {}; } })();
kitList.forEach((k, i) => { if (k.builtin && mEdits[k.name]) { const q = toCurrent(mEdits[k.name]); if (q) kitList[i] = { ...fromStored(q, { builtin: true }), edited: true }; } });
const mOverTarget = () => { const k = mPending ? null : kitList[Number($('kit').value)]; return k && (k.saved || k.builtin) && k.kit !== factoryInit ? k : null; };
function mOverDraw() {
  const k = mOverTarget();
  $('m-pover').disabled = !k;
}
$('m-pover').addEventListener('click', () => {
  const k = mOverTarget();
  if (!k || !confirm(`Save the current sound over ${k.name}?`)) return;
  Object.assign(k, { kit: Uint8Array.from(values), xm: { amt: xm.amt.slice(), target: xm.target.slice() }, fx: mix.fx.slice(), fx3: fx3Snapshot(), dpos: delayPos, song: songSnapshot() });
  if (k.saved) storePresets();
  else { k.edited = true; mEdits[k.name] = presetData(k); try { localStorage.setItem(EDIT_KEY, JSON.stringify(mEdits)); } catch (e) {} }
  initValues.set(values); buildKnobs(); setDirty(false);
  mDrawPresets();
});

// presets files: the full Elixir's format, { elixir: 1, presets: [...] } (PRESETS.md); only the current
// preset version loads, and a name already saved here is skipped
async function mImport(files) {
  let n = 0, old = 0, bad = 0;
  for (const f of files) {
    try {
      for (const p of JSON.parse(await f.text()).presets || []) {
        const q = toCurrent(p); // (any preset with a kit, brought into this format)
        if (!q) { old++; continue; }
        if (kitList.some((k) => k.saved && k.name === q.name)) continue;
        kitList.push(fromStored(q, { saved: true })); n++;
        if (q.fav) { mFavs.add(q.name); mFavStore(); }
      }
    } catch (err) { bad++; }
  }
  if (n) { const v = $('kit').value; storePresets(); fillKits(); $('kit').value = v; }
  mDrawPresets();
}
$('m-pimport').addEventListener('change', async (e) => { await mImport([...e.target.files]); e.target.value = ''; });
$('m-psearch').addEventListener('input', () => { mDrawPresets(); $('m-plist').scrollTop = 0; });
$('m-psearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { const b = $('m-plist').querySelector('.m-pload'); if (b) b.click(); }
  else if (e.key === 'Escape') { $('m-psearch').value = ''; mDrawPresets(); $('m-psearch').blur(); }
});
// export: every preset saved here, the built-in ones saved over and every starred one (each marked fav if starred, so an
// import stars it again), as the settings' export. It never deletes anything
$('m-pexport').addEventListener('click', async () => {
  const list = mSetPresets(true);
  if (!list.length) return;
  const blob = new Blob([JSON.stringify({ elixir: 1, presets: list }, null, 1)], { type: 'application/json' });
  await mOffer({ blob, name: 'elixir-desktop-presets.json' }, 'application/json');
});
// clear all (in settings, and delete all in manage presets): every saved preset deleted and every star cleared
function mClearAll() {
  const mine = kitList.filter((k) => k.saved), cur = kitList[Number($('kit').value)];
  for (const k of mine) kitList.splice(kitList.indexOf(k), 1);
  mFavs.clear(); mFavStore(); storePresets(); fillKits();
  $('kit').value = Math.max(0, kitList.indexOf(cur));
  mDrawPresets();
  return mine.length;
}
$('m-pdelall').addEventListener('click', () => {
  const n = kitList.filter((k) => k.saved).length;
  if (n && confirm(`Delete all ${n} preset${n > 1 ? 's' : ''}? This can't be undone.`)) mClearAll();
});


// ---- manage presets: a pop-up under its button; it stays open to try one after another, and a click elsewhere or esc
// closes it ----
function mPmShow(on) {
  $('m-pm').hidden = !on; $('m-pm-open').setAttribute('aria-expanded', on ? 'true' : 'false');
  if (!on) return;
  mDrawPresets();
  const r = $('m-pm-open').getBoundingClientRect(), c = $('m-pm');
  c.style.left = Math.max(8, Math.min(r.right - c.offsetWidth, innerWidth - c.offsetWidth - 8)) + 'px'; c.style.top = (r.bottom + 6) + 'px';
}
$('m-pm-open').addEventListener('click', () => mPmShow($('m-pm').hidden));
addEventListener('pointerdown', (e) => { if (!$('m-pm').hidden && !e.target.closest('#m-pm, #m-pm-open')) mPmShow(false); }, { capture: true });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('m-pm').hidden && !e.target.closest('.m-prename')) { e.stopImmediatePropagation(); mPmShow(false); }
}, { capture: true });
addEventListener('resize', () => { if (!$('m-pm').hidden) mPmShow(true); });
mPbarDraw();
