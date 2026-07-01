# Natural Selection Simulator — Project Memory

## Overview
An interactive 3D natural selection simulator built for CurioMinds. A hawk hunts rabbits across a grassland or snow environment, demonstrating camouflage-based selection pressure on white vs. brown rabbit populations.

**Dev server:** `npx serve -p 8080` from the project root.
**URL:** `http://localhost:8080` (must use HTTP, not `file://` — ES modules require a server).

---

## Tech Stack
- **Three.js r160** via importmap CDN (`three` + `three/addons/`)
- **ES modules** (`type="module"` in index.html)
- **GLTFLoader** for 3D rabbit and hawk models
- **AnimationMixer** for hawk wing-flap and dive-attack animations
- **Web Audio API** for background music and hawk sound effects
- **Chart.js** for population history chart
- **OrbitControls** for camera pan/zoom

---

## File Structure
```
index.html          — Full UI layout (left panel, 3D canvas, right panel, tutorial modal)
main.js             — All logic: Three.js scene, simulation engine, UI wiring
simulator.html      — Original reference version (working predation logic, kept for reference)
models/
  white rabbit/Rabbit_white.gltf
  brown rabbit/Rabbit.gltf
  hawk/scene.gltf           — requires textures/material_0_baseColor.png (subfolder)
  hawk/textures/material_0_baseColor.png
sounds/
  grassland.mp3
  snow.mp3
  hawk_sound.mp3
```

---

## Architecture

### main.js structure (in order)
1. **Constants** — FIELD_RADIUS, POP_CAP, EXPLORE_MS, SPEED_MULT, etc.
2. **`state`** — UI/app state (env, running, generation, mutationRate, speed, population, hawk stats)
3. **`SIM`** — Simulation state (rabbits[], hawks[], gen, phase, pt, habitat, speed, pending anim targets)
4. **Tutorial modal** — `goToPage()`, event listeners, CSS `translateX(-N*100%)` carousel
5. **`setEnvironment(env)`** — switches ground/sky/fog colors, risk bars, background music; updates `SIM.habitat`
6. **Sliders** — speed updates `SIM.speed = SPEED_MULT[n]` directly (no timer restart)
7. **`setRunState(running)`** — toggles button text, status pill, audioCtx.resume/suspend
8. **Start/Reset handlers**
9. **Chart.js** population line chart
10. **Three.js scene** — renderer, camera, OrbitControls, lighting, ground plane, ENV_CONFIG
11. **GLTF loading** — stores `tplWhite`, `tplBrown` (scene only), `tplHawk` (full gltf for animations)
12. **Audio** — AudioContext, loadAudio, playSound, playBgMusic
13. **Helpers** — `randPos()`, `clampPos()`, `cloneRabbit()`, `cloneHawk()`
14. **`Rabbit` class** — smooth lerp-velocity wander, hop bounce, panic scatter
15. **`HawkAttack` class** — 4-phase animated dive with AnimationMixer, ground shadow, carry prop
16. **`doPredation()`** — PhET algorithm (see below)
17. **`doReproduction()`** — old-age deaths, aging, 2 offspring per rabbit
18. **Lifecycle** — `spawnRabbits()`, `startSimulation()`, `stopSimulation()`, `resetScene()`
19. **`updateSimulation(dt)`** — per-frame phase loop (explore → hunt → explore)
20. **Render loop** — `requestAnimationFrame`, calls `updateSimulation` each frame
21. **Public API** — `window.uiUpdateGeneration/Population/AddGenData/SetHawkStatus/Stats`

---

## Key Constants
| Constant | Value | Purpose |
|---|---|---|
| `FIELD_RADIUS` | 18 | Radius of the play area in scene units |
| `POP_CAP` | 60 | Above this, heightened kill rate to control population |
| `POP_TARGET_HIGH` | 35 | Reference for excess kill rate calculation |
| `MAX_ANIM_HAWKS` | 3 | Max simultaneous animated dive attacks per predation event |
| `EXPLORE_MS` | 12000 | Wall-clock ms for one explore phase at speed multiplier 1× |
| `RABBIT_TARGET` | 1.2 | Desired rabbit height in scene units (auto-scaled via Box3) |
| `HAWK_TARGET` | 4 | Desired hawk wingspan in scene units (auto-scaled via Box3) |
| `SPEED_MULT` | [0, 0.5, 0.75, 1, 2, 3.5] | Explore phase time multipliers for speed slider positions 0–5 |

---

## Simulation Algorithm (PhET-derived)

### Phase loop (in `updateSimulation`)
- **Explore phase:** `SIM.pt` accumulates `dt * 1000 * SIM.speed`. When it exceeds `EXPLORE_MS` (12 000):
  1. Call `doReproduction()` — stops panic, ages rabbits, kills age≥5, spawns 2 offspring each
  2. Call `doPredation()` — kills victims, panics survivors, queues hawk animations
  3. Switch to `hunt` phase
- **Hunt phase:** waits for all hawk animations to complete, then switches back to explore, clears panic, increments gen counter

### Predation kill rates
- `base` = 0.43–0.47 (or higher if pop > `POP_CAP`)
- Camouflaged color: kill rate = `base`
- Exposed color: kill rate = `min(0.97, 3.5 × base)` (~43–97% killed)
- Protection rule: if either color has < 6 individuals, its kill rate is set to 0 (prevents extinction of tiny minorities)
- Grassland: brown camouflaged, white exposed
- Snow: white camouflaged, brown exposed

### Reproduction
- 2 offspring per surviving rabbit per generation
- Mutation probability = `state.mutationRate / 100` (from UI slider)
- Old-age death at `age >= 5`; initial rabbits staggered ages 0–4 to prevent gen-5 mass die-off

### Hawk animation (HawkAttack class)
- **approach** (1.6 s): ease-in-out from off-screen to above target
- **dive** (0.55 s): cubic ease down to ground level
- **grab** (0.4 s): stationary; attaches carry-prop (cloned rabbit) to hawk mesh
- **flee** (1.5 s): rises back to height 14, flies off-screen
- Up to 3 simultaneous attacks, staggered 0.6 s apart
- Victims are killed immediately when `doPredation()` runs; animations are cosmetic only

---

## Model Notes
- Hawk GLTF stored as full `gltf` object (`tplHawk = gltf`), not just `gltf.scene`, so `AnimationMixer` can access `gltf.animations`
- Animation clip names: `animation.aguia.fly`, `animation.aguia.attack`
- Hawk model faces -Z by default; wrapped in a `Group` pivot and rotated 180° on Y
- Hawk texture was in wrong location — copied to `models/hawk/textures/material_0_baseColor.png` to match GLTF `uri` reference
- Model scaling done lazily on first clone via `THREE.Box3.setFromObject()`, cached in `_scaleWhite`, `_scaleBrown`, `_scaleHawk`

---

## UI Elements (index.html IDs)
- `tutorial-modal`, `modal-pages`, `modal-dot`, `modal-prev`, `modal-next`, `modal-close`, `guide-btn`
- `speed-slider`, `pop-slider`, `mix-slider`, `mutation-slider`
- `start-btn`, `reset-btn`, `status-pill`, `status-text`
- `white-count`, `brown-count`, `hawk-attacks`, `hawk-kills`, `hawk-hud`
- `white-risk-fill`, `brown-risk-fill`, `white-risk-pct`, `brown-risk-pct`
- `gd0`, `gd1`, `gd2` — individual digit spans for generation counter
- `pop-chart` — Chart.js canvas
- `env-hud-dot`, `env-hud-name`

---

## Completed Work
- [x] Tutorial modal CSS carousel navigation (`goToPage` with `translateX`)
- [x] Environment switching (grassland ↔ snow) with scene color updates
- [x] Background music switching on environment change; stops old track, starts new
- [x] GLTF model loading for white rabbit, brown rabbit, hawk
- [x] Hawk texture path fix (`textures/` subfolder)
- [x] Auto-scaling models to target sizes via Box3
- [x] `Rabbit` class: smooth wander, hop bounce, panic scatter
- [x] `HawkAttack` class: 4-phase animated dive with AnimationMixer, shadow, carry prop
- [x] PhET predation algorithm (correct selection pressure, no population explosion)
- [x] Time-based explore/hunt phase loop replacing broken setInterval approach
- [x] Bug fix: hunt phase stuck forever — `_totalAnimQueued` not reset after hawks finish
- [x] Bug fix: rabbits stopped bouncing after attack — `stopPanic()` not called at hunt→explore transition

---

## Known Issues / Assumptions
- `AudioContext` autoplay policy warning appears in console on load (harmless; context is resumed on Start click)
- `simulator.html` kept in project root as reference — not served as the main app
- Speed slider position 0 maps to `SPEED_MULT[0] = 0`; the UI slider min should be 1 to avoid a frozen simulation
- Carry prop scale is computed as `RABBIT_TARGET * 0.3 / _scaleHawk` to correctly appear in hawk's local coordinate space

---

## Next Steps / Open Questions
- Verify hawk wing-flap animation plays correctly in browser (AnimationMixer clips may need `LoopRepeat`)
- Consider adding a "generation speed" indicator so users can see how fast generations are cycling
- Population can theoretically still grow large if mutation rate is high and environment favors both colors — may need a hard cap
- `simulator.html` reference file could be removed once the main app is confirmed stable
