# Elixir preset format (v4)

Elixir and Elixir Mobile share this format, so a preset made in one plays the same in the other. Each app
reads presets in its current version only (`PRESET_V` in `app/presets.js`) and skips any others. **If either
app changes the format, both must move to the new version together**, and the built-in presets in
`presets/*.json` must be rewritten to match (`build.mjs` refuses a built-in preset in any other version).

## Moving presets between the apps

- **Full Elixir to phone:** in the full Elixir's preset manager, star the presets, press *export
  favourites* and get `elixir-favourites.json` onto the phone (AirDrop, Files, email). Then press
  *import presets* on the phone's presets tab.
- **Phone to full Elixir:** press *export mine* on the phone's presets tab (it saves every preset saved on the
  phone), then *import* in the full Elixir's preset manager.
- **In the same browser:** the two apps are both on `johnnyhawk02.github.io` and keep saved presets under the
  same storage key (`elexir-presets-v2`), so presets saved in one already show in the other.
- A preset whose name is already saved is skipped on import.
- **Built in:** favourites dropped into `presets/*.json` in either repo are baked into that app's page when it
  is built.

## The presets file

```json
{ "elixir": 1, "presets": [ <preset>, ... ] }
```

`elixir: 1` marks a presets file and isn't the preset version. Storage (`localStorage['elexir-presets-v2']`)
holds just the array of presets.

## A preset

| Field | Type | What it is |
|---|---|---|
| `v` | `4` | the preset version |
| `name` | string | two alien words, up to 16 characters |
| `kit` | 247 integers, 0–255 | the LXR-02 sound parameters, in the firmware's parameter order (`PAR` in `lxr-ui-data.js`), as in an `.SND` file after its 8-character name |
| `xm` | `{ amt: [36], target: [6] }` | crossfeed: 6 × 6 depths (source × destination) and each destination's target |
| `fx` | `[6]`, 0–100 | each voice's echo send |
| `fx3` | `{ params: { echo, dist, ring }, dsend: [6], ring: [6] }` | the three FX: echo `{ pct }`, distortion `{ type, p: [4] }`, ring mod `{ wave, freq }`; distortion and ring mod sends per voice, 0–100 |
| `dpos` | number, 0–1 | delay time position |
| `song` | object | see below |
| `fav` | boolean | starred in the preset manager |

`xm`, `fx`, `fx3` and `song` can be left out (a sound opened from a kit file); the sends and FX then come from
the kit's own FX settings and the pattern stays as it is.

### `song`

| Field | What it is |
|---|---|
| `style` | pattern style name: `electro`, `techno`, `broken beat`, `IDM`, `breakcore` or `user` |
| `user` | with style `user`: the user pattern itself, `{ name, on, acc, bar }` |
| `energy`, `beat`, `fills` | perform dials: 0–100, groove index 0–31 within the style, 0–100 |
| `tempo` | 40–240 bpm (a preset brings its tempo unless the full Elixir's *bpm* box is unticked) |
| `vel`, `accent` | velocity 1–127, accent 0–6 dB |
| `rush` | snare rush, 0–100 |
| `rushSet` | rush settings: `start`, `p32`, `top`, `hats`, `only`, `kicks`, `first`, `hp`, `hpTop` (Hz), `rollMs`, `hpMs` |
| `groove` | `{ type, depth }`: groove type name (`straight`, `swing 58`, `shuffle`, …) and depth 0–100 |
| `macro` | `{ fm, decay, pitch, filter }`: 0–200 with 100 neutral; pitch 0–48 with 24 neutral |
| `pattern` | the perform pattern as played: `{ on, acc, bar }`, each 7 tracks × 16 steps |
| `stepPages` | the steps grid, 1–4 pages of `{ on, acc, bar }` |
| `view`, `source` | `perform` or `steps`; what plays (`perform`, `steps`, or `off` for MIDI in) |
| `master` | `{ comp, thresh, ratio, attack, release, makeup, duck, duckRelease, duckFx, duckOn }` |

Tracks run in the app's row order (`ROW` in `app/styles.js`: `k`, `lo`, `hi`, `s`, `cy`, `ch`, `oh`). `on` holds
the hits, `acc` the accents and `bar` the bar conditions, as `app/steps.js` reads them.

## What the phone app touches

Elixir Mobile has no editor for most of this. It changes `kit` (everything, kit + pattern, undo), `xm`, `fx`
and `dpos` (everything), `song.style`, `beat`, `energy`, `fills`, `groove` (kit + pattern and the sliders),
`song.rush`, and `song.master` (compressor tab and sidechain slider). Everything else it keeps as it
was loaded, so a full Elixir preset saved again on the phone loses nothing.
