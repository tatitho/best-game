// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
// SUNWARD: a paper lantern climbs out of the night toward the dawn, one level brighter
// than the last. Level 5 ends in full daylight.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How far, in world pixels, the lantern must climb to finish a level. */
export const LEVEL_HEIGHT = 9000;

/** World y of the dawn gate at the top of every level. */
export const GATE_Y = -LEVEL_HEIGHT;

export const LANTERN = {
  radius: 17,
  accel: 1500,
  maxSpeed: 320,
  drag: 2.6,
  /** Seconds of no harm after a storm hit. */
  invulnerable: 1.4,
};

export const LIGHT = {
  /** Light at the start of every level. */
  start: 100,
  /** Light lost per second, just for flying. */
  drainPerSecond: 2.6,
  /** Extra drain per second while inside a fog bank. */
  fogDrainPerSecond: 3.0,
  moteGain: 3,
  stormLoss: 18,
  /** Light refilled when a level is cleared. */
  clearRefill: 100,
};

export const MOTE = {
  radius: 10,
  points: 10,
  /** Seconds after a mote before the combo chain breaks. */
  comboWindow: 2.5,
  /** Highest combo multiplier. */
  maxCombo: 5,
};

export const STORM = {
  radius: 46,
  /** Sideways drift speed, px/s. */
  drift: 26,
};

export const FOG = {
  width: 260,
  height: 120,
  /** Speed penalty while inside, as a fraction of max speed. */
  slow: 0.55,
};

export const SUNBURST = {
  radius: 14,
  points: 50,
  /** Seconds of double score and no harm after picking one up. */
  seconds: 5,
};

export const WIND = {
  /** Strongest horizontal push, px/s^2, at level 5. */
  maxPush: 260,
};

/** Points for clearing a level, plus 5 per light left over. */
export const CLEAR_BONUS = 200;
export const CLEAR_LIGHT_BONUS = 5;

/** How many entities can exist at once; the pools are allocated once, at boot. */
export const POOL_SIZE = 96;

/** One palette per level: the sky literally dawns as the game goes on. */
export const LEVELS = [
  {
    name: 'Night',
    skyTop: '#0b1026',
    skyMid: '#1b2350',
    skyBottom: '#3a2a5e',
    stars: 0.95,
    sunY: 760,
    sunColor: '#ffd27a',
    ground: '#0a0d1d',
    mote: '#ffd94d',
    text: '#f4ead8',
    muted: '#9aa3c0',
  },
  {
    name: 'First Light',
    skyTop: '#1c1b4b',
    skyMid: '#4a2d6e',
    skyBottom: '#8a4a6e',
    stars: 0.6,
    sunY: 690,
    sunColor: '#ffb36b',
    ground: '#141126',
    mote: '#ffd94d',
    text: '#f8ecd8',
    muted: '#b3a3c8',
  },
  {
    name: 'Rose Hour',
    skyTop: '#2e2a63',
    skyMid: '#8a4a7a',
    skyBottom: '#e0705f',
    stars: 0.3,
    sunY: 610,
    sunColor: '#ff9e57',
    ground: '#1d1428',
    mote: '#ffe066',
    text: '#fff3e0',
    muted: '#c9a8bd',
  },
  {
    name: 'Gold Hour',
    skyTop: '#4a4a86',
    skyMid: '#d97e5f',
    skyBottom: '#ffb36b',
    stars: 0.12,
    sunY: 520,
    sunColor: '#ffcf5e',
    ground: '#2a1f2e',
    mote: '#ffe98a',
    text: '#fff8e6',
    muted: '#d8b49a',
  },
  {
    name: 'Dawn',
    skyTop: '#7fb2e5',
    skyMid: '#ffd9a0',
    skyBottom: '#fff3c4',
    stars: 0,
    sunY: 420,
    sunColor: '#ffe98a',
    ground: '#5a6b8a',
    mote: '#fff0a0',
    text: '#3a2c1a',
    muted: '#6b5a44',
  },
];

/** Spawns per level: [storm clouds, fog banks, mote clusters, sunbursts, wind gusts]. */
export const LEVEL_SPAWNS = [
  { storm: 9, fog: 2, clusters: 9, sunburst: 1, wind: 1 },
  { storm: 11, fog: 3, clusters: 10, sunburst: 1, wind: 2 },
  { storm: 13, fog: 3, clusters: 11, sunburst: 1, wind: 2 },
  { storm: 15, fog: 4, clusters: 12, sunburst: 1, wind: 3 },
  { storm: 17, fog: 4, clusters: 13, sunburst: 1, wind: 3 },
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sunward.best';
