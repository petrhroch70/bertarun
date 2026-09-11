// ============================================================
// BERTARUNE — keyboard input state (held + just-pressed edges).
// ============================================================

const Input = (function () {
  const held = new Set();
  const pressedThisFrame = new Set();

  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
    KeyX: 'cancel', Escape: 'cancel',
    KeyM: 'mute',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      if (!held.has(action)) pressedThisFrame.add(action);
      held.add(action);
      e.preventDefault();
    }
    Audio2.ensureCtx();
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });

  function isDown(action) { return held.has(action); }
  function wasPressed(action) { return pressedThisFrame.has(action); }
  function endFrame() { pressedThisFrame.clear(); }

  return { isDown, wasPressed, endFrame };
})();
