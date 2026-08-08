/**
 * useInputVector — Unified keyboard + touch/pointer → normalised {x, y, fire}.
 *
 * Desktop  : WASD / Arrow keys  │  fire = Space or Z
 * Mobile   : virtual joystick — first finger sets the origin, drag deflects
 *            the vector; second finger anywhere triggers fire.
 *
 * Returns a stable inputRef whose `.current` shape is:
 *   {
 *     x:        number,   // [-1, 1]  horizontal axis
 *     y:        number,   // [-1, 1]  vertical   axis  (positive = down)
 *     fire:     boolean,
 *     joystick: {         // null when no touch is active
 *       originX: number,  // canvas-local px — where the finger landed
 *       originY: number,
 *       stickX:  number,  // current stick-head position (clamped to radius)
 *       stickY:  number,
 *       radius:  number,  // MAX_RADIUS constant, for drawing the ring
 *     } | null,
 *   }
 *
 * All values are read directly by the game loop each frame — no React
 * re-renders are ever triggered by this hook.
 */
import { useEffect, useRef } from 'react';

const DEAD_ZONE  = 6;   // px   — ignore micro-jitter at rest
const MAX_RADIUS = 55;  // px   — distance that counts as full deflection

export function useInputVector(canvasRef) {
  const inputRef = useRef({ x: 0, y: 0, fire: false, joystick: null });

  useEffect(() => {
    /* ── KEYBOARD ──────────────────────────────────────────────────────── */
    const keys    = new Set();
    const prevent = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

    const onKeyDown = (e) => {
      keys.add(e.code);
      if (prevent.has(e.code)) e.preventDefault();
    };
    const onKeyUp = (e) => keys.delete(e.code);

    /**
     * sampleKeys — called once per RAF tick.
     * Only writes x/y when no touch joystick is active, so the two input
     * methods never fight each other.
     */
    const sampleKeys = () => {
      if (inputRef.current.joystick !== null) return; // touch wins

      let x = 0, y = 0;
      if (keys.has('ArrowLeft')  || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp')    || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown')  || keys.has('KeyS')) y += 1;

      // Normalise so diagonal speed equals cardinal speed
      const len = Math.hypot(x, y);
      inputRef.current.x    = len ? x / len : 0;
      inputRef.current.y    = len ? y / len : 0;
      inputRef.current.fire = keys.has('Space') || keys.has('KeyZ');
    };

    /* ── POINTER / TOUCH ───────────────────────────────────────────────── */
    // We track every active pointer so a second finger can trigger fire
    // while the first finger drives the joystick.
    const pointers         = new Map(); // pointerId → { clientX, clientY }
    let   joystickId       = null;      // pointerId of the joystick finger
    let   joystickOrigin   = null;      // canvas-local { x, y }

    /** Convert from page-client coords to canvas-local coords. */
    const toCanvas = (clientX, clientY) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    /**
     * Recompute the movement vector from the current drag position.
     * Also updates the joystick sub-object used by the renderer.
     */
    const applyJoystick = (canvasPos) => {
      if (!joystickOrigin) return;

      const dx   = canvasPos.x - joystickOrigin.x;
      const dy   = canvasPos.y - joystickOrigin.y;
      const dist = Math.hypot(dx, dy) || 0.001; // avoid /0

      // Clamp stick-head to the ring
      const clamped = Math.min(dist, MAX_RADIUS);
      const nx = dx / dist; // unit vector components
      const ny = dy / dist;

      inputRef.current.joystick = {
        originX: joystickOrigin.x,
        originY: joystickOrigin.y,
        stickX:  joystickOrigin.x + nx * clamped,
        stickY:  joystickOrigin.y + ny * clamped,
        radius:  MAX_RADIUS,
      };

      // Dead-zone: zero vector inside the inner ring
      if (dist < DEAD_ZONE) {
        inputRef.current.x = 0;
        inputRef.current.y = 0;
      } else {
        inputRef.current.x = nx * (clamped / MAX_RADIUS);
        inputRef.current.y = ny * (clamped / MAX_RADIUS);
      }
    };

    const onPointerDown = (e) => {
      e.preventDefault();
      // Capture so we keep receiving events even if the finger leaves canvas
      canvasRef.current?.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (joystickId === null) {
        // First finger → become the joystick
        joystickId     = e.pointerId;
        joystickOrigin = toCanvas(e.clientX, e.clientY);
        applyJoystick(joystickOrigin);
      } else {
        // Any additional finger → fire
        inputRef.current.fire = true;
      }
    };

    const onPointerMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault();
      pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      if (e.pointerId === joystickId) {
        applyJoystick(toCanvas(e.clientX, e.clientY));
      }
    };

    const onPointerUp = (e) => {
      e.preventDefault();
      pointers.delete(e.pointerId);

      if (e.pointerId === joystickId) {
        // Joystick finger lifted — reset movement
        joystickId             = null;
        joystickOrigin         = null;
        inputRef.current.x       = 0;
        inputRef.current.y       = 0;
        inputRef.current.joystick = null;

        // Promote the next active pointer to joystick, if any
        if (pointers.size > 0) {
          const [nextId, pos] = pointers.entries().next().value;
          joystickId     = nextId;
          joystickOrigin = toCanvas(pos.clientX, pos.clientY);
        }
      }

      if (pointers.size === 0) {
        inputRef.current.fire    = false;
        inputRef.current.joystick = null;
      }
    };

    /* ── RAF loop: sample keyboard once per visual frame ───────────────── */
    let rafId;
    const poll = () => { sampleKeys(); rafId = requestAnimationFrame(poll); };
    rafId = requestAnimationFrame(poll);

    /* ── Wire up listeners ─────────────────────────────────────────────── */
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('pointerdown',   onPointerDown);
      canvas.addEventListener('pointermove',   onPointerMove);
      canvas.addEventListener('pointerup',     onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      if (canvas) {
        canvas.removeEventListener('pointerdown',   onPointerDown);
        canvas.removeEventListener('pointermove',   onPointerMove);
        canvas.removeEventListener('pointerup',     onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
      }
    };
  }, [canvasRef]);

  return inputRef;
}
