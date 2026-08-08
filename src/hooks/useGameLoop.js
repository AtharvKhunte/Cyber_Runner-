/**
 * useGameLoop — Fixed-timestep game loop driven by requestAnimationFrame.
 *
 * Architecture
 * ────────────
 * The loop separates *logic* from *rendering*:
 *
 *   update(dt)           — called at a rock-solid FIXED_DT interval (≈16.67 ms).
 *                          Physics, input, AI, collision — all live here.
 *                          dt is in *seconds* so code reads as "px per second".
 *
 *   render(ctx, alpha)   — called once per display frame.
 *                          alpha ∈ [0,1) is the sub-frame interpolation factor:
 *                          use it to lerp between the previous and current state
 *                          for silky visuals even above 60 Hz.
 *
 * The spiral-of-death guard (MAX_FRAME_MS) caps how much "catch-up" the
 * accumulator can do after a tab regains focus from being hidden.
 *
 * Canvas resize is handled here so every hook consumer gets a correctly
 * scaled drawing surface automatically (including HiDPI / Retina screens).
 *
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {{ update: (dt: number) => void,
 *           render: (ctx: CanvasRenderingContext2D, alpha: number) => void }} callbacks
 */
import { useEffect } from 'react';

const FIXED_DT     = 1000 / 60; // ms  — physics / logic timestep  (≈16.67 ms)
const MAX_FRAME_MS = 250;        // ms  — max elapsed before we clamp (spiral guard)

export function useGameLoop(canvasRef, { update, render }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let rafId;
    let lastTime    = performance.now();
    let accumulator = 0;

    const frame = (now) => {
      rafId = requestAnimationFrame(frame); // schedule next tick first

      /* ── 1. Resize canvas to physical pixels (HiDPI-safe) ─────────── */
      const dpr = window.devicePixelRatio || 1;
      const w   = Math.round(canvas.clientWidth  * dpr);
      const h   = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        // Scale once so all drawing coords remain in logical (CSS) pixels
        ctx.scale(dpr, dpr);
      }

      /* ── 2. Accumulate elapsed time ────────────────────────────────── */
      let elapsed = now - lastTime;
      lastTime    = now;
      if (elapsed > MAX_FRAME_MS) elapsed = MAX_FRAME_MS; // clamp spikes

      accumulator += elapsed;

      /* ── 3. Fixed-timestep update ticks ────────────────────────────── */
      while (accumulator >= FIXED_DT) {
        update(FIXED_DT / 1000); // convert ms → seconds for the caller
        accumulator -= FIXED_DT;
      }

      /* ── 4. Render — once per visual frame ──────────────────────────── */
      // alpha: how far through the current fixed tick we are (0 = start, 1 = end)
      const alpha = accumulator / FIXED_DT;

      // Clear using logical dimensions so the caller never has to think about dpr
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      render(ctx, alpha);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);

    // `update` and `render` are intentionally excluded from the dep array.
    // Callers must wrap them in useRef or stable useCallback to avoid loop restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]);
}
