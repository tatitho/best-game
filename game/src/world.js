// The world: one lantern, five levels of sky, and everything it meets on the way up.
// Pure logic — no DOM, no sound — so it can be stepped headlessly. The lantern climbs
// from y = 0 to the dawn gate at y = -LEVEL_HEIGHT; the camera follows it. Light is the
// clock: it drains as you fly, motes refill it, storm clouds take a chunk of it, and
// reaching the gate with light left is the only way up.

import {
  CLEAR_BONUS,
  CLEAR_LIGHT_BONUS,
  FIELD,
  FOG,
  LANTERN,
  LEVEL_HEIGHT,
  LEVEL_SPAWNS,
  LEVELS,
  LIGHT,
  MOTE,
  POOL_SIZE,
  STEP,
  STORM,
  SUNBURST,
  WIND,
} from './config.js';
import { createRandom, randomRange } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_MOTE = 1;
export const EVENT_HIT = 2;
export const EVENT_SUNBURST = 4;
export const EVENT_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

const GATE_Y = -LEVEL_HEIGHT;

function makeMote(x, y) {
  return { x, y, taken: false, phase: 0 };
}

function makeStorm(x, y, random) {
  return { x, y, radius: STORM.radius, dir: random() < 0.5 ? -1 : 1, phase: random() * 6.28 };
}

function makeFog(x, y) {
  return { x, y, width: FOG.width, height: FOG.height };
}

function makeSunburst(x, y) {
  return { x, y, taken: false };
}

function makeWind(yTop, yBottom, push) {
  return { yTop, yBottom, push };
}

/** A mote cluster: a short arc of motes, sometimes hugging a storm cloud on purpose. */
function placeCluster(list, random, y, nearStorm) {
  const count = 3 + Math.floor(random() * 4);
  const cx = nearStorm ? randomRange(random, 120, FIELD.width - 120) : randomRange(random, 90, FIELD.width - 90);
  const spread = randomRange(random, 34, 60);
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2;
    list.push(makeMote(cx + t * spread * 1.6, y + Math.abs(t) * 26 - 14));
  }
  return cx;
}

function buildLevel(level, random) {
  const spawns = LEVEL_SPAWNS[level - 1];
  const motes = [];
  const storms = [];
  const fogs = [];
  const sunbursts = [];
  const winds = [];
  // Bands of sky, top to bottom; each band holds one cluster and maybe one hazard.
  const band = LEVEL_HEIGHT / spawns.clusters;
  for (let i = 0; i < spawns.clusters; i += 1) {
    const y = -LEVEL_HEIGHT + band * (i + 0.5) + randomRange(random, -60, 60);
    const nearStorm = random() < 0.45 && storms.length < spawns.storm;
    const cx = placeCluster(motes, random, y, nearStorm);
    if (nearStorm) storms.push(makeStorm(cx + randomRange(random, -90, 90), y + randomRange(random, -40, 40), random));
  }
  while (storms.length < spawns.storm) {
    storms.push(makeStorm(randomRange(random, 70, FIELD.width - 70), randomRange(random, -LEVEL_HEIGHT + 120, -120), random));
  }
  for (let i = 0; i < spawns.fog; i += 1) {
    fogs.push(makeFog(randomRange(random, 140, FIELD.width - 140), randomRange(random, -LEVEL_HEIGHT + 200, -200)));
  }
  for (let i = 0; i < spawns.sunburst; i += 1) {
    const storm = storms[Math.floor(random() * storms.length)];
    sunbursts.push(makeSunburst(storm.x + randomRange(random, -70, 70), storm.y + randomRange(random, -90, -30)));
  }
  for (let i = 0; i < spawns.wind; i += 1) {
    const yTop = randomRange(random, -LEVEL_HEIGHT + 200, -400);
    winds.push(makeWind(yTop, yTop + randomRange(random, 220, 380), randomRange(random, 0.4, 1) * WIND.maxPush * (level / 5) * (random() < 0.5 ? -1 : 1)));
  }
  return { motes, storms, fogs, sunbursts, winds };
}

export function createWorld(seed) {
  const baseSeed = seed | 0;
  const state = {
    level: 1,
    score: 0,
    combo: 0,
    comboTimer: 0,
    light: LIGHT.start,
    time: 0,
    altitude: 0,
    sunburstTimer: 0,
    shake: 0,
    banner: '',
    bannerTimer: 0,
    lantern: { x: FIELD.width / 2, y: 0, vx: 0, vy: 0, invuln: 0 },
    cameraY: 0,
    motes: [],
    storms: [],
    fogs: [],
    sunbursts: [],
    winds: [],
    particles: [],
    stars: [],
  };

  function loadLevel(level) {
    const random = createRandom(baseSeed + level * 7919);
    const built = buildLevel(level, random);
    state.motes = built.motes;
    state.storms = built.storms;
    state.fogs = built.fogs;
    state.sunbursts = built.sunbursts;
    state.winds = built.winds;
    state.stars = [];
    for (let i = 0; i < 90; i += 1) {
      state.stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, size: random() * 1.8 + 0.6, twinkle: random() * 6.28 });
    }
    state.lantern.x = FIELD.width / 2;
    state.lantern.y = 0;
    state.lantern.vx = 0;
    state.lantern.vy = 0;
    state.lantern.invuln = 0;
    state.cameraY = -FIELD.height * 0.55;
    state.particles.length = 0;
    state.sunburstTimer = 0;
  }

  function burst(x, y, color, count, speed) {
    const random = createRandom((state.time * 1000) | 0 + state.particles.length * 31 + 7);
    for (let i = 0; i < count && state.particles.length < POOL_SIZE; i += 1) {
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.6);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 30,
        life: 0.55 + random() * 0.35,
        maxLife: 0.9,
        size: 2 + random() * 3.5,
        color,
      });
    }
  }

  function reset() {
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.light = LIGHT.start;
    state.time = 0;
    state.altitude = 0;
    state.banner = '';
    state.bannerTimer = 0;
    loadLevel(1);
  }

  /** Start a fresh run directly on `level` (screenshot scenes, not the real game). */
  function startAtLevel(level) {
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.light = LIGHT.start;
    state.time = 0;
    state.altitude = 0;
    state.banner = '';
    state.bannerTimer = 0;
    state.level = level;
    loadLevel(level);
  }

  function clearLevel() {
    const bonus = CLEAR_BONUS + Math.round(state.light) * CLEAR_LIGHT_BONUS;
    state.score += bonus;
    if (state.level >= LEVELS.length) return EVENT_WIN;
    state.level += 1;
    state.light = LIGHT.clearRefill;
    state.combo = 0;
    state.comboTimer = 0;
    state.banner = LEVELS[state.level - 1].name;
    state.bannerTimer = 2.2;
    loadLevel(state.level);
    return EVENT_CLEAR;
  }

  /**
   * Advance the world one fixed step. `steer` is { x, y } in [-1, 1] (or a pointer target
   * when steer.pointer is true, in logical pixels, already relative to the lantern).
   * `attract` runs the title-screen drift: no drain, no collisions. Returns event flags.
   */
  function step(dt, steer, attract) {
    const lantern = state.lantern;
    let events = EVENT_NONE;
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
    if (lantern.invuln > 0) lantern.invuln -= dt;
    if (state.sunburstTimer > 0) state.sunburstTimer -= dt;

    // Wind bands push sideways; their strength breathes with time.
    let windPush = 0;
    for (const wind of state.winds) {
      if (lantern.y >= wind.yTop && lantern.y <= wind.yBottom) {
        windPush += wind.push * (0.6 + 0.4 * Math.sin(state.time * 1.3 + wind.yTop));
      }
    }
    // Fog slows the lantern while it is inside one.
    let inFog = false;
    for (const fog of state.fogs) {
      if (Math.abs(lantern.x - fog.x) < fog.width / 2 && Math.abs(lantern.y - fog.y) < fog.height / 2) {
        inFog = true;
        break;
      }
    }

    let ax = 0;
    let ay = 0;
    if (attract) {
      ax = Math.cos(state.time * 0.5) * 60;
      ay = Math.sin(state.time * 0.8) * 40 - 20;
    } else if (steer.pointer) {
      const dx = steer.x - lantern.x;
      const dy = steer.y - lantern.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12) {
        ax = (dx / dist) * LANTERN.accel;
        ay = (dy / dist) * LANTERN.accel;
      }
    } else {
      ax = steer.x * LANTERN.accel;
      ay = steer.y * LANTERN.accel;
    }
    const slow = inFog ? FOG.slow : 1;
    lantern.vx += (ax + windPush) * dt;
    lantern.vy += ay * dt;
    const drag = Math.exp(-LANTERN.drag * dt);
    lantern.vx *= drag;
    lantern.vy *= drag;
    const speed = Math.hypot(lantern.vx, lantern.vy);
    const max = LANTERN.maxSpeed * slow;
    if (speed > max) {
      lantern.vx = (lantern.vx / speed) * max;
      lantern.vy = (lantern.vy / speed) * max;
    }
    lantern.x = Math.min(FIELD.width - 30, Math.max(30, lantern.x + lantern.vx * dt));
    lantern.y = Math.min(120, Math.max(GATE_Y - 20, lantern.y + lantern.vy * dt));

    // Storm clouds drift sideways and bounce off the edges.
    for (const storm of state.storms) {
      storm.x += storm.dir * STORM.drift * dt;
      if (storm.x < 60) { storm.x = 60; storm.dir = 1; }
      if (storm.x > FIELD.width - 60) { storm.x = FIELD.width - 60; storm.dir = -1; }
    }

    // The camera follows the lantern up, never past the gate or the start.
    state.cameraY = Math.min(100, Math.max(GATE_Y - 100, lantern.y - FIELD.height * 0.55));
    state.altitude = Math.max(0, -lantern.y);

    if (attract) {
      updateParticles(dt);
      return EVENT_NONE;
    }

    // Light is the clock.
    state.light -= LIGHT.drainPerSecond * dt;
    if (inFog) state.light -= LIGHT.fogDrainPerSecond * dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    // Motes: collect, chain the combo, refill a little light.
    for (const mote of state.motes) {
      if (mote.taken) continue;
      const dx = mote.x - lantern.x;
      const dy = mote.y - lantern.y;
      if (dx * dx + dy * dy < (LANTERN.radius + MOTE.radius) ** 2) {
        mote.taken = true;
        state.combo = Math.min(MOTE.maxCombo, state.combo + 1);
        state.comboTimer = MOTE.comboWindow;
        const mult = state.sunburstTimer > 0 ? state.combo * 2 : state.combo;
        state.score += MOTE.points * mult;
        state.light = Math.min(LIGHT.start, state.light + LIGHT.moteGain);
        burst(mote.x, mote.y, LEVELS[state.level - 1].mote, 10, 130);
        events |= EVENT_MOTE;
      }
    }
    // Sunbursts: a short spell of double score and no harm.
    for (const sun of state.sunbursts) {
      if (sun.taken) continue;
      const dx = sun.x - lantern.x;
      const dy = sun.y - lantern.y;
      if (dx * dx + dy * dy < (LANTERN.radius + SUNBURST.radius) ** 2) {
        sun.taken = true;
        state.sunburstTimer = SUNBURST.seconds;
        state.score += SUNBURST.points;
        burst(sun.x, sun.y, '#ffe98a', 16, 180);
        events |= EVENT_SUNBURST;
      }
    }
    // Storm clouds: a hit costs light and the combo; at zero light the flight ends.
    if (lantern.invuln <= 0 && state.sunburstTimer <= 0) {
      for (const storm of state.storms) {
        const dx = storm.x - lantern.x;
        const dy = storm.y - lantern.y;
        const r = LANTERN.radius + storm.radius - 8;
        if (dx * dx + dy * dy < r * r) {
          state.light -= LIGHT.stormLoss;
          state.combo = 0;
          state.comboTimer = 0;
          lantern.invuln = LANTERN.invulnerable;
          lantern.vy = Math.min(lantern.vy, -160);
          state.shake = 1;
          burst(lantern.x, lantern.y, '#8a7fd6', 14, 200);
          events |= EVENT_HIT;
          break;
        }
      }
    }
    if (state.light <= 0) {
      state.light = 0;
      return events | EVENT_OVER;
    }
    if (lantern.y <= GATE_Y) {
      return events | clearLevel();
    }
    updateParticles(dt);
    return events;
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    // A faint trail of sparks follows the lantern while it climbs.
    if (state.particles.length < POOL_SIZE - 4 && state.time * 60 % 3 < 1) {
      state.particles.push({
        x: state.lantern.x + (createRandom((state.time * 997) | 0)() - 0.5) * 20,
        y: state.lantern.y + 18,
        vx: 0, vy: 40,
        life: 0.5, maxLife: 0.5,
        size: 2,
        color: LEVELS[state.level - 1].mote,
      });
    }
  }

  reset();
  return { state, reset, step, startAtLevel };
}
