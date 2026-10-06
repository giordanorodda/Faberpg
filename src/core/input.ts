export type Action = 'up' | 'down' | 'left' | 'right' | 'interact' | 'cancel' | 'inventory' | 'notebook' | 'clock' | 'help' | 'speed';

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyE: 'interact',
  Space: 'interact',
  Enter: 'interact',
  Escape: 'cancel',
  KeyI: 'inventory',
  KeyN: 'notebook',
  KeyT: 'clock',
  KeyH: 'help',
  KeyV: 'speed',
};

/** Keyboard state: which actions are held, and which were just pressed this frame. */
export class Input {
  private held = new Set<Action>();
  private pressed: Action[] = [];
  /** Most recently pressed direction first, so changing direction feels immediate. */
  private dirOrder: Action[] = [];

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat) this.pressed.push(a);
      if (!this.held.has(a)) {
        this.held.add(a);
        if (isDir(a)) this.dirOrder.unshift(a);
      }
    });
    target.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      this.held.delete(a);
      this.dirOrder = this.dirOrder.filter((d) => d !== a);
    });
    target.addEventListener('blur', () => {
      this.held.clear();
      this.dirOrder = [];
    });
  }

  /** Simulated key press (used by automated checks). */
  press(a: Action): void {
    this.pressed.push(a);
  }

  isHeld(a: Action): boolean {
    return this.held.has(a);
  }

  direction(): Action | null {
    return this.dirOrder[0] ?? null;
  }

  /** Returns and clears the actions pressed since the last call. */
  consume(): Action[] {
    const p = this.pressed;
    this.pressed = [];
    return p;
  }
}

function isDir(a: Action): boolean {
  return a === 'up' || a === 'down' || a === 'left' || a === 'right';
}
