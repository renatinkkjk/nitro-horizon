export interface InputState {
  left: boolean;
  right: boolean;
  throttle: boolean;
  brake: boolean;
  nitro: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  up: boolean;
  down: boolean;
  confirm: boolean;
  back: boolean;
  pause: boolean;
  anyPressed: boolean;
  confirmPressed: boolean;
  backPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  pausePressed: boolean;
}

const BLOCKED = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Enter',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'Tab',
]);

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (event) => {
      const code = event.code;
      if (BLOCKED.has(code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(code);
      this.held.add(code);
    });
    target.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    target.addEventListener('blur', () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  poll(): InputState {
    const held = this.held;
    const pressed = this.pressed;
    const has = (...codes: string[]) => codes.some((code) => held.has(code));
    const hit = (...codes: string[]) => codes.some((code) => pressed.has(code));

    const state: InputState = {
      left: has('ArrowLeft', 'KeyA'),
      right: has('ArrowRight', 'KeyD'),
      throttle: has('ArrowUp', 'KeyW'),
      brake: has('ArrowDown', 'KeyS'),
      nitro: has('Space'),
      shiftUp: has('ShiftLeft', 'ShiftRight', 'KeyE'),
      shiftDown: has('ControlLeft', 'ControlRight', 'KeyQ'),
      up: has('ArrowUp', 'KeyW'),
      down: has('ArrowDown', 'KeyS'),
      confirm: has('Enter', 'NumpadEnter'),
      back: has('Escape'),
      pause: has('KeyP', 'Escape'),
      anyPressed: pressed.size > 0,
      confirmPressed: hit('Enter', 'NumpadEnter'),
      backPressed: hit('Escape'),
      leftPressed: hit('ArrowLeft', 'KeyA'),
      rightPressed: hit('ArrowRight', 'KeyD'),
      upPressed: hit('ArrowUp', 'KeyW'),
      downPressed: hit('ArrowDown', 'KeyS'),
      pausePressed: hit('KeyP'),
    };

    pressed.clear();
    return state;
  }

  clear(): void {
    this.pressed.clear();
  }
}
