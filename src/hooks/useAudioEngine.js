/**
 * useAudioEngine.js — Synthesised sound effects via the Web Audio API.
 *
 * ── Why Web Audio instead of <audio> tags? ──────────────────────────────────
 *
 *  • Zero assets  — all sounds are synthesised with oscillators and noise,
 *    so the bundle stays small and there are no audio files to load.
 *  • Zero npm deps — AudioContext is a browser built-in; no library needed.
 *  • Sub-millisecond scheduling — AudioContext.currentTime is sample-accurate,
 *    avoiding the ~100 ms delay that HTML <audio> elements suffer from.
 *  • Polyphony    — each play() call creates independent nodes, so rapid fire
 *    overlaps cleanly rather than restarting the same <audio> element.
 *
 * ── Autoplay policy ─────────────────────────────────────────────────────────
 *
 *  Browsers suspend AudioContext until a user gesture occurs (click, keydown,
 *  touch).  We create the context lazily on the first play() call and also
 *  attach a one-shot resume() to the window so any interaction unblocks audio.
 *  The `enabled` flag (togglable via the mute button) short-circuits play()
 *  before the context is even created if the player never unmutes.
 *
 * ── Sound design ────────────────────────────────────────────────────────────
 *
 *  shoot()      Sine oscillator swept 880→220 Hz over 80 ms + short noise burst.
 *               The frequency sweep reads as a classic laser "pew".
 *
 *  explosion()  Three-layer FM burst:
 *               1. Low sub-bass thump  (60 Hz sine, 120 ms)
 *               2. Mid crunch         (150 Hz sawtooth modulated, 200 ms)
 *               3. Pink-noise shaker  (filtered noise, 350 ms)
 *               Together they read as a meaty arcade explosion.
 *
 *  gameOver()   Descending chromatic tone sequence (four notes, 150 ms each)
 *               played via a WaveShaper for a lo-fi "power-down" effect.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *
 *  const audio = useAudioEngine();
 *  audio.shoot();       // call from the bullet fire path in update()
 *  audio.explosion();   // call per enemy kill
 *  audio.gameOver();    // call when phase transitions to 'dead'
 *  audio.toggle();      // mute/unmute; returns current enabled state
 *  audio.enabled        // boolean — read to show mute icon in JSX
 */
import { useRef, useCallback } from 'react';

/* ── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Creates and starts a buffer of white noise through a BiquadFilter.
 * Returns the destination GainNode so the caller can envelope it.
 *
 * @param {AudioContext} ctx
 * @param {string}  filterType  — 'lowpass' | 'bandpass' | 'highpass'
 * @param {number}  frequency   — filter cutoff Hz
 * @param {number}  Q           — filter resonance
 * @param {AudioNode} destination
 */
function noiseThrough(ctx, filterType, frequency, Q, destination) {
  const bufLen  = ctx.sampleRate * 0.5; // 500 ms of noise
  const buffer  = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data    = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  src.buffer   = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type            = filterType;
  filter.frequency.value = frequency;
  filter.Q.value         = Q;

  src.connect(filter);
  filter.connect(destination);
  src.start(ctx.currentTime);
  return src;
}

/**
 * Creates an OscillatorNode with a gain envelope and connects it.
 *
 * @param {AudioContext} ctx
 * @param {string}  type       — 'sine' | 'square' | 'sawtooth' | 'triangle'
 * @param {number}  freq       — start frequency Hz
 * @param {number}  freqEnd    — end frequency Hz (for sweep; same as freq if static)
 * @param {number}  peakGain   — peak amplitude [0, 1]
 * @param {number}  duration   — envelope duration seconds
 * @param {AudioNode} destination
 */
function osc(ctx, type, freq, freqEnd, peakGain, duration, destination) {
  const now      = ctx.currentTime;
  const oscNode  = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscNode.type            = type;
  oscNode.frequency.value = freq;
  if (freqEnd !== freq) {
    oscNode.frequency.exponentialRampToValueAtTime(
      Math.max(freqEnd, 1),  // exponential ramp requires > 0
      now + duration,
    );
  }

  // Attack-decay envelope: ramp up in 5 ms, then decay to silence
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscNode.connect(gainNode);
  gainNode.connect(destination);

  oscNode.start(now);
  oscNode.stop(now + duration + 0.01);
  return { oscNode, gainNode };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hook
═══════════════════════════════════════════════════════════════════════════ */
export function useAudioEngine() {
  // AudioContext is created lazily on the first play() call (browser policy)
  const ctxRef     = useRef(null);
  const enabledRef = useRef(true);  // mutable flag — doesn't need React state

  /**
   * _getCtx — lazily construct the AudioContext and resume it.
   * Returns null if audio is disabled (muted).
   */
  const _getCtx = useCallback(() => {
    if (!enabledRef.current) return null;

    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Resume on any future user interaction in case the browser suspends it
      const resume = () => ctxRef.current?.resume();
      window.addEventListener('keydown',   resume, { once: true });
      window.addEventListener('pointerdown', resume, { once: true });
    }

    // Resume if suspended (browser tab lost focus, etc.)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }

    return ctxRef.current;
  }, []);

  /* ── shoot ────────────────────────────────────────────────────────────── */
  /**
   * shoot — laser "pew":
   *   • Sine wave swept 880 → 220 Hz over 80 ms  (the pitch-drop is the "pew")
   *   • Short highpass noise burst for attack transient (the "click")
   * Master gain is low (0.18) so rapid fire doesn't clip.
   */
  const shoot = useCallback(() => {
    const ctx = _getCtx();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    // Frequency-swept sine tone
    osc(ctx, 'sine', 880, 220, 1, 0.08, master);

    // Noise click for attack transient
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    noiseGain.connect(master);
    noiseThrough(ctx, 'highpass', 2000, 1, noiseGain);

  }, [_getCtx]);

  /* ── explosion ────────────────────────────────────────────────────────── */
  /**
   * explosion — three-layer burst:
   *   1. Sub-bass thump  — 80 Hz sine, 150 ms, fast decay
   *   2. Mid crunch      — 120 Hz sawtooth swept to 40 Hz, 220 ms
   *   3. Noise shaker    — bandpass-filtered noise, 320 ms
   */
  const explosion = useCallback(() => {
    const ctx = _getCtx();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    // Layer 1: sub-bass thump
    osc(ctx, 'sine', 80, 30, 1, 0.15, master);

    // Layer 2: mid crunch (sawtooth swept down)
    osc(ctx, 'sawtooth', 120, 40, 0.5, 0.22, master);

    // Layer 3: bandpass noise shaker
    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.6, ctx.currentTime);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    noiseEnv.connect(master);
    noiseThrough(ctx, 'bandpass', 400, 0.8, noiseEnv);

  }, [_getCtx]);

  /* ── gameOver ─────────────────────────────────────────────────────────── */
  /**
   * gameOver — four-note descending sequence at 150 ms intervals,
   * each through a WaveShaper for a retro lo-fi crunch.
   * Notes: E4 (330) → C4 (262) → A3 (220) → E3 (165)
   */
  const gameOver = useCallback(() => {
    const ctx = _getCtx();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.45;

    // WaveShaper adds soft harmonic distortion (retro feel)
    const shaper = ctx.createWaveShaper();
    const curve  = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = (Math.PI + 80) * x / (Math.PI + 80 * Math.abs(x));
    }
    shaper.curve    = curve;
    shaper.oversample = '2x';

    master.connect(shaper);
    shaper.connect(ctx.destination);

    const notes    = [330, 262, 220, 165];  // descending: E4 C4 A3 E3
    const step     = 0.16;                  // seconds between notes

    notes.forEach((freq, i) => {
      const now        = ctx.currentTime + i * step;
      const oscNode    = ctx.createOscillator();
      const gainNode   = ctx.createGain();

      oscNode.type            = 'square';
      oscNode.frequency.value = freq;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + step * 0.85);

      oscNode.connect(gainNode);
      gainNode.connect(master);
      oscNode.start(now);
      oscNode.stop(now + step);
    });

  }, [_getCtx]);

  /* ── toggle ───────────────────────────────────────────────────────────── */
  /**
   * toggle — flip mute state.
   * If unmuting and a context already exists, resume it.
   * Returns the new enabled state so the caller can update UI.
   */
  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    if (enabledRef.current && ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return enabledRef.current;
  }, []);

  return {
    shoot,
    explosion,
    gameOver,
    toggle,
    get enabled() { return enabledRef.current; },
  };
}
