// Penanganan kendali mouse dan papan ketik untuk LUMEN WARD.
// Mouse atau <- -> (serta A/D) memutar perisai dengan mulus, Spasi menahan perisai,
// P jeda, R mulai ulang, M matikan/nyalakan suara, dan 1/2/klik memilih peningkatan.

import { CORE_X, CORE_Y, FIELD_HEIGHT, FIELD_WIDTH } from './world.js';

export const ACTION_START = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_UPGRADE_1 = 16;
export const ACTION_UPGRADE_2 = 32;

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let brace = false;
  let usePointer = false;
  let pointerAngle = -Math.PI / 2;
  let pointerX = CORE_X;
  let pointerY = CORE_Y - 120;
  let actions = 0;
  let lastClick = null;

  function toFieldCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: CORE_X, y: CORE_Y };
    const scale = Math.min(rect.width / FIELD_WIDTH, rect.height / FIELD_HEIGHT);
    const offsetX = (rect.width - FIELD_WIDTH * scale) / 2;
    const offsetY = (rect.height - FIELD_HEIGHT * scale) / 2;
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    return { x, y };
  }

  function updatePointer(clientX, clientY) {
    const pt = toFieldCoords(clientX, clientY);
    pointerX = pt.x;
    pointerY = pt.y;
    const dx = pt.x - CORE_X;
    const dy = pt.y - CORE_Y;
    if (Math.hypot(dx, dy) > 4) {
      pointerAngle = Math.atan2(dy, dx);
      usePointer = true;
    }
  }

  window.addEventListener('pointermove', (e) => {
    updatePointer(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerdown', (e) => {
    updatePointer(e.clientX, e.clientY);
    lastClick = { x: pointerX, y: pointerY };
    if (e.button === 2) {
      brace = true;
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (e.button === 2) {
      brace = false;
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (LEFT_KEYS.has(e.code)) {
      left = true;
      usePointer = false;
    } else if (RIGHT_KEYS.has(e.code)) {
      right = true;
      usePointer = false;
    } else if (e.code === 'Space') {
      brace = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!e.repeat) actions |= ACTION_PAUSE;
    } else if (e.code === 'KeyR') {
      if (!e.repeat) actions |= ACTION_RESTART;
    } else if (e.code === 'KeyM') {
      if (!e.repeat) actions |= ACTION_MUTE;
    } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
      if (!e.repeat) actions |= ACTION_UPGRADE_1;
    } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
      if (!e.repeat) actions |= ACTION_UPGRADE_2;
    } else if (e.code === 'Enter') {
      if (!e.repeat) actions |= ACTION_START;
    } else {
      return;
    }
    e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    if (LEFT_KEYS.has(e.code)) left = false;
    else if (RIGHT_KEYS.has(e.code)) right = false;
    else if (e.code === 'Space') brace = false;
  });

  window.addEventListener('blur', () => {
    left = false;
    right = false;
    brace = false;
  });

  return {
    getState() {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      return {
        dir,
        brace,
        pointerAngle: usePointer ? pointerAngle : undefined,
        pointerX,
        pointerY,
      };
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    takeClick() {
      const c = lastClick;
      lastClick = null;
      return c;
    },
  };
}
