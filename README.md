# Drill Dash: Gem Tunnel

A fast, addictive 2D portrait (9:16) arcade digger built with **Phaser 3 + TypeScript + Vite**, designed for YouTube Playables.

Steer a cute drilling machine down an endless five-lane tunnel: tap the **left / right half of the screen** (or use arrow keys / A-D) to switch lanes, collect coins, gems and fuel, dodge rocks, lava and bombs, discover fossils, and dig as deep as you can.

## Run it

```bash
npm install
npm run dev      # dev server
npm run build    # production build (tsc + vite) → dist/
node scripts/smoke.mjs   # headless browser smoke test (needs Edge/Chrome)
```

## What's inside

- **Endless Mode** — 6 depth zones (Dirt Tunnel → Rocky Mine → Bomb Depths → Lava Core → Crystal Cave → Chaos Depth) with rising speed and shifting spawn tables.
- **Level Mode** — 10 goal-based levels ending in the *Giant Rock Wall* mini-boss.
- **Fair generation** — the spawner tracks lane reachability and always leaves a damage-free path (plus a fuel pity timer).
- **Systems** — fuel, health, combo scoring, 6 power-ups (Mega Drill, Magnet, Shield, Fuel Boost, Bomb Blast, Slow Time), 6 upgrades × 5 levels, 10 drill skins, a 12-fossil collection book, daily rewards.
- **Zero assets** — every texture is drawn procedurally at boot; all SFX/music are Web Audio synthesis.
- **Saves** — `localStorage` behind `SaveManager`; YouTube Playables SDK calls (`firstFrameReady`, `gameReady`, `sendScore`) are wired up and no-op outside YT.

## Code map

```
src/
  config/    constants (balancing, zones), levels, upgrades, skins, fossils
  systems/   SaveManager, AudioManager (WebAudio synth), Spawner (safe-path rule)
  objects/   Drill (player)
  scenes/    Boot (procedural textures), Menu, Game, UI (HUD), Pause,
             GameOver, LevelSelect, Upgrade, Skins, Collection
```
