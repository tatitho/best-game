// Sound, synthesized live with WebAudio: no audio files, nothing to load. A mote chimes
// higher the longer the combo chain; a storm hit is a low thud; clearing a level plays a
// rising arpeggio and winning plays the dawn fanfare. The context is created on the first
// user gesture, so the page stays silent until the player starts.

const BASE = 523.25; // C5

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** Call from any user gesture (start, click) so later notes are allowed to sound. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function note(freq, at, dur, type, gain) {
    if (!ensure() || !master) return;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, context.currentTime + at);
    amp.gain.linearRampToValueAtTime(gain, context.currentTime + at + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(context.currentTime + at);
    osc.stop(context.currentTime + at + dur + 0.05);
  }

  /** A mote chime: the pitch climbs one semitone per combo step. */
  function chime(combo) {
    const steps = Math.min(combo, 12);
    const freq = BASE * 2 ** (steps / 12);
    note(freq, 0, 0.35, 'sine', 0.9);
    note(freq * 2, 0, 0.2, 'triangle', 0.25);
  }

  function thud() {
    note(110, 0, 0.3, 'triangle', 1);
    note(55, 0, 0.4, 'sine', 0.8);
  }

  function sunburst() {
    note(BASE * 2, 0, 0.25, 'sine', 0.7);
    note(BASE * 2.5, 0.08, 0.25, 'sine', 0.7);
    note(BASE * 3, 0.16, 0.4, 'sine', 0.7);
  }

  function clear() {
    [0, 4, 7, 12].forEach((steps, i) => note(BASE * 2 ** (steps / 12), i * 0.09, 0.4, 'sine', 0.7));
  }

  function fanfare() {
    [0, 4, 7, 12, 16, 19, 24].forEach((steps, i) => note(BASE * 2 ** (steps / 12), i * 0.11, 0.55, 'triangle', 0.6));
  }

  return { unlock, chime, thud, sunburst, clear, fanfare };
}
