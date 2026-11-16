export type DriveState = {
  gas: number;
  brake: number;
  boost: boolean;
  pausePressed: boolean;
};

let gasHeld = false;
let brakeHeld = false;
let boostHeld = false;
let pauseLatched = false;
let bound = false;

export function bindDriveControls(): void {
  if (bound) {
    return;
  }
  bound = true;

  const gas = document.getElementById('pedal-gas');
  const brake = document.getElementById('pedal-brake');
  const boost = document.getElementById('pedal-boost');
  const pause = document.getElementById('btn-pause');

  const bindPedal = (el: HTMLElement | null, set: (v: boolean) => void): void => {
    if (!el) {
      return;
    }
    const on = (pressed: boolean) => {
      set(pressed);
      el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      on(true);
    });
    el.addEventListener('pointerup', () => on(false));
    el.addEventListener('pointercancel', () => on(false));
    el.addEventListener('lostpointercapture', () => on(false));
  };

  bindPedal(gas instanceof HTMLElement ? gas : null, (v) => {
    gasHeld = v;
  });
  bindPedal(brake instanceof HTMLElement ? brake : null, (v) => {
    brakeHeld = v;
  });
  bindPedal(boost instanceof HTMLElement ? boost : null, (v) => {
    boostHeld = v;
  });

  pause?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pauseLatched = true;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      gasHeld = true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      brakeHeld = true;
    }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      boostHeld = true;
      e.preventDefault();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      pauseLatched = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      gasHeld = false;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      brakeHeld = false;
    }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      boostHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    gasHeld = false;
    brakeHeld = false;
    boostHeld = false;
  });
}

export function setTouchControlsVisible(visible: boolean): void {
  const el = document.getElementById('touch-controls');
  if (el instanceof HTMLElement) {
    el.hidden = !visible;
  }
}

export function readDriveState(): DriveState {
  const pausePressed = pauseLatched;
  pauseLatched = false;
  return {
    gas: gasHeld ? 1 : 0,
    brake: brakeHeld ? 1 : 0,
    boost: boostHeld,
    pausePressed,
  };
}
