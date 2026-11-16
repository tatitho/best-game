// A small seeded random number generator (mulberry32): the same seed gives the same game,
// which is what makes the screenshot scenes repeatable and the world fair to re-play.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from 0 to `max` (exclusive), from the seeded stream. */
export function randomInt(random, max) {
  return Math.floor(random() * max);
}

/** A number between `min` and `max`, from the seeded stream. */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}
