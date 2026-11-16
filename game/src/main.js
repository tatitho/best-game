// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, game over and win.
//
// ?seed=N fixes the sky. ?shot=start|play|win|over (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a shot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_CLEAR, EVENT_HIT, EVENT_MOTE, EVENT_OVER, EVENT_SUNBURST, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // The same live-state handle the real game publishes, for automated checks.
  window.__sunward = {
    screen: scene.screen,
    score: world.state.score,
    light: Math.round(world.state.light),
    level: world.state.level,
    combo: world.state.combo,
    altitude: Math.round(world.state.altitude),
  };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  /** A small handle for automated play-tests: the live score, light and screen. */
  function publishState() {
    window.__sunward = {
      screen,
      score: world.state.score,
      light: Math.round(world.state.light),
      level: world.state.level,
      combo: world.state.combo,
      altitude: Math.round(world.state.altitude),
    };
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Carry the lantern to the dawn gate.');
    publishState();
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.fanfare();
    announce(won ? `Dawn reached. Score ${world.state.score}. Best ${best}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
    publishState();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    publishState();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0, pointer: false }, true);
      return;
    }
    const steer = input.steer((x, y) => renderer.toLogical(x, y));
    // Pointer steering aims at a screen point; the world wants it relative to the lantern.
    const events = world.step(STEP, steer.pointer
      ? { x: steer.x, y: steer.y + world.state.cameraY, pointer: true }
      : steer, false);
    if (events & EVENT_MOTE) audio.chime(world.state.combo);
    if (events & EVENT_SUNBURST) audio.sunburst();
    if (events & EVENT_HIT) {
      audio.thud();
      announce(`Storm hit. Light ${Math.round(world.state.light)}.`);
    }
    if (events & EVENT_CLEAR) {
      audio.clear();
      announce(`Level ${world.state.level} — ${world.state.banner}.`);
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    publishState();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now / 1000);
  }

  // Leaving the tab pauses a running game rather than letting the light drain unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sunward. Press Space or click to fly.');
  publishState();
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
