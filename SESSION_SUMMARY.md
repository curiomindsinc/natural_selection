# Session Summaries

---

## Session 1 — Initial build + model/audio fixes
**Date:** 2026-06-27 (approx; session ran across two context windows)

### What was done
- Scaffolded `index.html` (3-panel layout: controls, 3D canvas, stats) and `main.js` from scratch
- Implemented tutorial modal with CSS translateX carousel (`goToPage`)
- Implemented environment toggle (grassland/snow), slider wiring, Chart.js population graph
- Set up Three.js scene: renderer, camera, OrbitControls, lighting, ground plane
- Loaded GLTF models for white rabbit, brown rabbit, hawk
- Fixed hawk texture 404: GLTF referenced `textures/material_0_baseColor.png` but file was at root of model folder; created `models/hawk/textures/` and copied texture there
- Fixed AudioContext autoplay: context created at load but `.resume()` only called on Start
- Fixed environment music switching: `setEnvironment()` calls `playBgMusic(env)` when running
- First attempt at simulation: setInterval-based generation ticks — caused population explosion and no visible selection pressure

### Decision
Replaced entire simulation engine with logic ported from `simulator.html` (working reference version):
- `Rabbit` class with lerp-velocity wander + hop bounce + panic
- `HawkAttack` class with 4-phase AnimationMixer-driven dive
- PhET predation algorithm (base 43–47%, mult 3.5×, protection < 6)
- Time-based explore/hunt phase loop (EXPLORE_MS = 12 000 ms)

---

## Session 2 — Animation bug fixes
**Date:** 2026-06-27

### Bug 1: Simulator stuck after hawk attack
**Symptom:** After first predation event, hunt phase never ended; generation counter froze.
**Root cause:** When hawk animations finish they are filtered out of `SIM.hawks`. The `allDone` check then falls back to `SIM._totalAnimQueued === 0`, but `_totalAnimQueued` was never reset to 0 after animations completed.
**Fix:** After filtering done hawks, if both `_pendingAnimTargets` and `SIM.hawks` are empty, set `SIM._totalAnimQueued = 0` (`main.js:778–780`).

### Bug 2: Rabbits stopped bouncing after hawk attack
**Symptom:** After first predation event, all surviving rabbits stopped hopping and moved in straight lines for the rest of the simulation.
**Root cause:** `doPredation()` sets `panicDir` on survivors. `stopPanic()` only lives inside `doReproduction()`, which runs at the explore→hunt boundary. When hunt ended and flipped back to explore, `panicDir` was never cleared.
**Fix:** Added `SIM.rabbits.forEach(r => r.stopPanic())` at the hunt→explore transition in `updateSimulation` (`main.js:804`).

### Project management
- Created `CLAUDE.md` (architecture, decisions, constants, known issues, next steps)
- Created `SESSION_SUMMARY.md` (this file)
