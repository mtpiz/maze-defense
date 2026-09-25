# Audio V1 — Procedural Space Sound

Status: Exploration for the Neon comparison; not product authority  
Updated: 2026-09-24

## Direction

Two textures that never blur into each other:

- **Player Technology** is clean and tuned: sine and saw sweeps, metallic partials, tight envelopes.
- **The Brood** is organic: band-passed noise formants, chitter, wet pops, and shell cracks.

"Space" comes from plasma-wave recordings made by spacecraft rather than from cinematic whooshes.
Whistlers (tones falling from several kHz as lightning energy disperses along magnetic field lines)
and chorus (bursts of rising chirps in radiation belts) drive the wave alarm and the ambient events.
Rail borrows Ben Burtt's struck-cable blaster: dispersion makes high frequencies arrive first, so a
hit becomes a falling "pew".

## Cue map

| Game event | Sound | Character |
|---|---|---|
| `tower-fired` direct | `foundation-fire` | Bright tick; quietest combat layer |
| `tower-fired` rail-line | `rail-fire` | Three detuned falling saw chirps and a metallic ring |
| `tower-fired` arc-chain | `arc-fire` | Stochastic crackle, 48 Hz gated buzz, zap |
| `tower-fired` siege-blast | `siege-launch` | Pitched sub thump with resonant bore |
| `weapon-impact` siege | `siege-impact` | Driven noise blast closing to rumble, sub punch, debris |
| gravity mechanics | `gravity-fire` | Inhaled swell imploding into a sub drop |
| `creep-died` | `broodling-death`, `drone-death`, `glider-death`, `carapace-death` | Squish, chitter-pop, airy tear, shell crack and groan |
| `construction` / `dismantle` | `build` / `dismantle` | Rising shimmer and two blips; reversed |
| `specialist-installed` | `specialist` | Arpeggio over a rising detuned shimmer |
| `route-changed` | `route-changed` | Soft two-note chirp; suppressed when construction already spoke |
| `wave-started`, `early-launched` | `wave-start` | Whistler over a low horn and ping |
| `wave-completed` | `wave-clear` | Rising chime chord |
| `creep-leaked` | `leak` | Two-tone klaxon with a sub hit |
| `mission-completed` / `mission-defeated` | `victory` / `defeat` | Brass rise to major chord; sinking pad with gated static |
| pause, speed | `ui-tap` | Click |
| rejected command (warning feedback) | `ui-deny` | Two low pulses |

## Budget

- `AudioDirector` (pure, tested): one request per sound per event batch, per-sound minimum spacing,
  six requests per batch, results suppress leak and wave-clear cues. Dense batches play once with up
  to 1.5x gain rather than stacking.
- `GameAudio`: 16 voices, per-sound voice limits, priority stealing (alerts > interface > combat >
  ambience), stereo pan by arena column (±0.6), four buses into a limiter.
- Baked bank: about 16 seconds of mono audio, rendered at unlock in priority order.

## Tuning

`sound-catalog.ts` holds gain, priority, voice limit, minimum interval, and pitch jitter per sound.
`sound-recipes.ts` holds the synthesis. `npm run dev` then open `/sound-lab.html` to audition.

## Sources for later replacement or layering

- Kenney Sci-fi Sounds, 70 files, CC0: https://kenney.nl/assets/sci-fi-sounds
- NASA mission and space audio released to the public domain (SoundCloud collection, 2014)
- Plasma and radio wave recordings, CC BY 4.0 (attribution required): https://space-audio.org/
