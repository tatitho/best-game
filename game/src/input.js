// Keyboard and pointer input. Held keys give a steering vector; one-shot presses (start,
// restart, pause) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Dragging the pointer steers the lantern
// toward it; a click alone is a confirm.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const RESTART = new Set(['KeyR']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let pointerDown = false;
  let pointerX = 0;
  let pointerY = 0;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    pointerDown = false;
  });
  target.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  });
  window.addEventListener('pointerup', () => {
    pointerDown = false;
  });

  return {
    /**
     * Steering for this frame: { x, y } in [-1, 1]. Keyboard wins when held; otherwise a
     * dragged pointer steers toward itself. `toLogical` turns client pixels into the
     * playfield's logical pixels (the canvas is scaled to the window).
     */
    steer(toLogical) {
      const kx = (right ? 1 : 0) - (left ? 1 : 0);
      const ky = (down ? 1 : 0) - (up ? 1 : 0);
      if (kx !== 0 || ky !== 0) return { x: kx, y: ky, pointer: false };
      if (!pointerDown) return { x: 0, y: 0, pointer: false };
      const point = toLogical(pointerX, pointerY);
      return { x: point.x, y: point.y, pointer: true };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
