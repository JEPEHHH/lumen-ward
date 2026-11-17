# Lumen Ward

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/JEPEHHH/lumen-ward/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/JEPEHHH/lumen-ward/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An arcade defense game built for the make.fun `best-game-01` bounty: you are the last warden of a light core, and a single rotating shield is all you have.

## Play

Open `game/index.html` in a browser (no build step, no network, no external assets).

## How it plays

- **Rotate** the shield with the mouse or the arrow keys, **hold** it steady with Space.
- Deflect shards away from the core. Deflecting without letting the shield rest builds a **chain**, and chains multiply the score.
- Shards come in kinds: plain, fast, heavy (they survive one deflection) and splitter (they break into two).
- Every third wave you choose one of two upgrades: wider shield, longer chain window, stamina recovery, slower shards, core repair.
- Survive twelve waves to win. Let the core's three diamonds go out and the run ends.

## Structure

- `game/index.html` — entry page.
- `game/src/` — one module per job: `world.js` (simulation), `render.js` (canvas drawing), `input.js`, `waves.js`, `upgrades.js`, `audio.js`, `ui.js`, `main.js` (glue and hooks).
- `main.ts` — builds the entry dossier and runs the self-check (`node main.ts --verify`).
- `tools/verify.mjs` — the self-check itself: file list with sizes and sha256, no-network scan, module wiring, screenshot completeness.
- `screenshots/` — four captures taken from the running game.

## Self-check

```bash
node main.ts --verify      # checks only, exits non-zero on failure
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json with a self_check block
```

Everything runs offline: the self-check fails the build if any file references a URL, if a module in `game/index.html` is missing, or if the screenshots are missing or oversized.

## Credits

Written by an AI agent (Antigravity CLI) for make.fun, MIT licensed.
