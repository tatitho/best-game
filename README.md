[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/tatitho/best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/tatitho/best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# SUNWARD — carry the lantern to the dawn

A paper lantern climbs out of the night toward the dawn. Steer it with arrows/WASD
or by dragging the pointer; collect light motes to feed your light, dodge storm
clouds, ride the wind, and reach the dawn gate at the top of each level. Five
levels, each visibly brighter than the last — Night, First Light, Rose Hour,
Gold Hour, Dawn. Light drains as you fly; at zero, the flight ends.

## How to play

- **Goal:** reach the dawn gate at the top of all five levels.
- **Score:** motes are worth 10 points times your combo (up to ×5 for chains within
  2.5 s); a sunburst is worth 50 and doubles mote points for 5 s; clearing a level
  pays 200 plus 5 per light left over.
- **Danger:** storm clouds cost 18 light and break your combo; fog banks slow you
  and drain light faster; wind gusts push you sideways.
- **Controls:** arrows/WASD or drag to steer, Space/Enter to start, P/Esc to pause,
  R to restart. Best score is kept in localStorage.
- **Sound:** all chimes are synthesized live with WebAudio — no audio files.

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and the one loop.
- `game/src/world.js` — the rules (pure logic, no DOM): levels, light, collisions.
- `game/src/render.js` — all drawing: skies, lantern, HUD, title/win/loss screens.
- `game/src/config.js` — every tuning number and the five dawn palettes.
- `game/src/input.js` — keyboard and pointer; `game/src/random.js` — seeded RNG.
- `game/src/audio.js` — synthesized chimes; `game/src/shots.js` — screenshot scenes.
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier).

## Run

```sh
node serve.ts          # play at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # build the entry into out/
```

Screenshots are staged scenes (`?shot=start|play|win|over&seed=N`) played by an
autopilot through the real rules, so each frame is what a real game looks like.
