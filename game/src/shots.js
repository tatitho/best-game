// The screenshot scenes behind ?shot=start|play|win|over. Each one plays the real rules
// forward from a fresh world, steered by an autopilot, so the frame is what a real game
// looks like and the same seed always gives the same frame. The good pilot chases motes
// and keeps clear of storms; the poor one drifts upward blindly and gets caught, which
// is how the game-over scene is reached honestly.

import { FIELD, LANTERN, STEP } from './config.js';
import { EVENT_CLEAR, EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 17.5;
const WIN_LIMIT_SECONDS = 900;
const OVER_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
/** Eight compass steers plus staying put, as the autopilot tries them. */
const DIRS = [
  { x: 0, y: -1 }, { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 },
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 },
  { x: 0, y: 1 }, { x: 0, y: 0 },
];

/** The nearest mote still on the board, or null. */
function nearestMote(state) {
  let best = null;
  let bestDist = Infinity;
  for (const mote of state.motes) {
    if (mote.taken) continue;
    const d = (mote.x - state.lantern.x) ** 2 + (mote.y - state.lantern.y) ** 2;
    if (d < bestDist) { bestDist = d; best = mote; }
  }
  return best;
}

/** Seconds until the lantern, steering `dir`, touches a storm cloud; Infinity if never. */
function timeToStorm(state, dir, horizon) {
  const l = state.lantern;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = l.x + dir.x * LANTERN.maxSpeed * t;
    const y = l.y + dir.y * LANTERN.maxSpeed * t;
    for (const storm of state.storms) {
      const dx = storm.x - x;
      const dy = storm.y - y;
      const r = LANTERN.radius + storm.radius - 8;
      if (dx * dx + dy * dy < r * r) return t;
    }
  }
  return Infinity;
}

/**
 * Steer toward the nearest mote while keeping clear of storms. `skill` is how far ahead
 * the pilot looks: a good pilot sees 0.7 s out, a poor one 0.15 s and never chases motes.
 */
export function autopilot(state, skill) {
  const horizon = skill === 'good' ? 0.7 : 0.15;
  const target = skill === 'good' ? nearestMote(state) : null;
  const l = state.lantern;
  let bestDir = DIRS[0];
  let bestScore = -Infinity;
  for (const dir of DIRS) {
    const safe = timeToStorm(state, dir, horizon);
    if (safe < 0.25) continue; // a hit within a quarter second is never worth it
    let score = safe === Infinity ? 2 : safe;
    if (target) {
      const nx = l.x + dir.x * 60;
      const ny = l.y + dir.y * 60;
      const d = Math.hypot(target.x - nx, target.y - ny);
      score -= d / 400;
    }
    score += -dir.y * 0.4; // climbing is always progress
    if (score > bestScore) { bestScore = score; bestDir = dir; }
  }
  return { x: bestDir.x, y: bestDir.y, pointer: false };
}

function playForward(world, seconds, skill) {
  let events = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    events = world.step(STEP, autopilot(world.state, skill), false);
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Scenes: start (title over a drifting sky), play (mid-flight on level
 * 3, combo in hand), win (all five levels cleared), over (the light run out).
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // Fly level 3 well for a while: HUD, combo and a bright rose sky.
    world.startAtLevel(3);
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, autopilot(world.state, 'good'), false);
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    const events = playForward(world, WIN_LIMIT_SECONDS, 'good');
    return { screen: events & EVENT_WIN ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'over') {
    playForward(world, OVER_LIMIT_SECONDS, 'poor');
    return { screen: world.state.light <= 0 ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { x: 0, y: 0, pointer: false }, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
