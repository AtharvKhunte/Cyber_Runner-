/**
 * ParticleSystem.js — Cyber-Runner visual effects engine
 *
 * ── Object Pool ────────────────────────────────────────────────────────────
 *
 * Why pool?  Allocating JS objects at 60 fps triggers the garbage collector,
 * which shows up as micro-stutters.  We pre-allocate POOL_SIZE particle
 * objects once at construction and recycle them via a free-list.  During
 * normal gameplay the GC sees zero new allocations from this system.
 *
 * Pool lifecycle:
 *   _pool[]    — free-list of inactive particle objects (stack, pop/push O(1))
 *   _active[]  — swap-remove array of live particles    (remove is O(1))
 *
 * Swap-remove (vs splice):
 *   When a particle dies we swap it with the last element and truncate the
 *   array by 1.  This is O(1) instead of splice's O(n) copy — important
 *   when dozens of particles die in the same frame.
 *
 * ── Particle Schema ────────────────────────────────────────────────────────
 *
 *   x, y        current position (logical px)
 *   px, py      position at previous physics tick — used for sub-frame lerp
 *   vx, vy      velocity (px/s) — reduced each tick by drag
 *   t           normalised life  [1 → 0]  (1 = just spawned, 0 = dead)
 *   decay       life units lost per second  (= 1 / lifetimeSeconds)
 *   r           base radius (px)
 *   color       CSS fill string
 *   glow        CSS shadow/glow string
 *   type        'circle' | 'spark' | 'ring'
 *   drag        per-particle drag coefficient (higher = stops faster)
 *   active      false when in free-list — guard against double-release bugs
 *
 * ── Render Batching ────────────────────────────────────────────────────────
 *
 * ctx.shadowBlur is one of the most expensive Canvas 2D state changes.
 * We group particles into three typed passes so shadowBlur is set at most
 * 3 times per frame regardless of particle count, instead of N times.
 *
 * Draw order: ring → spark → circle
 *   Rings are largest and should sit beneath; circles linger longest on top.
 *
 * ── Emitter Presets ────────────────────────────────────────────────────────
 *
 *   emitEnemyExplosion(x, y, r)
 *     Layered burst on enemy kill:
 *       • 1  expanding stroke ring  — immediate "impact" read
 *       • 7–10 fast sparks          — kinetic energy / chromatic flare
 *       • 5–8  slow glowing dots    — lingering ember cloud
 *     Total: 13–19 particles, all returned to pool by ~800 ms
 *
 *   emitBulletImpact(x, y)
 *     4–6 small yellow sparks — for future wall/shield hits
 *
 *   emitPlayerTrail(x, y)
 *     1 small cyan dot per call — replaces the inline trail logic in Game.jsx
 *
 * ── Cleanup ────────────────────────────────────────────────────────────────
 *
 *   update(dt):  t -= decay * dt each tick.
 *   When t ≤ 0: swap the dead particle with the last element in _active,
 *               truncate _active.length by 1, push dead particle onto _pool.
 *   Result: zero allocations, zero array copies, zero GC pressure.
 */

/* ── Pool configuration ─────────────────────────────────────────────────── */
const POOL_SIZE  = 320;   // max simultaneous particles before silent drop
const BASE_DRAG  = 3.2;   // velocity multiplier decay/s — v *= (1 - drag*dt)

/* ── Colour palettes ────────────────────────────────────────────────────── */
export const PALETTE = {
  enemy: {
    ring:  { color: 'rgba(255,45,107,0.95)', glow: '#ff2d6b' },
    spark: { color: '#ff80a8',               glow: '#ff2d6b' },
    dot:   { color: '#ffe0eb',               glow: '#ff80a8' },
    ember: { color: 'rgba(255,180,80,0.9)',  glow: '#ffb040' },
  },
  bullet: {
    spark: { color: '#ffe600', glow: '#ffaa00' },
    dot:   { color: '#ffffff', glow: '#ffe600' },
  },
  player: {
    trail: { color: '#00ffe7', glow: '#00ffe7' },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   ParticleSystem
═══════════════════════════════════════════════════════════════════════════ */
export class ParticleSystem {

  constructor() {
    this._pool   = [];  // free-list  (LIFO stack)
    this._active = [];  // live particles (swap-remove array)

    for (let i = 0; i < POOL_SIZE; i++) {
      this._pool.push(this._blank());
    }
  }

  /* ── Internal helpers ────────────────────────────────────────────────── */

  /** Blank particle template — all fields present so the JIT can monomorphise */
  _blank() {
    return {
      active: false,
      x: 0, y: 0, px: 0, py: 0,
      vx: 0, vy: 0,
      t: 0, decay: 0,
      r: 0,
      color: '#ffffff',
      glow:  '#ffffff',
      type:  'circle',   // 'circle' | 'spark' | 'ring'
      drag:  BASE_DRAG,
    };
  }

  /**
   * _acquire — pop a particle from the free-list and add it to _active.
   * Returns null (silently) when the pool is exhausted — graceful degradation.
   */
  _acquire() {
    if (this._pool.length === 0) return null;
    const p   = this._pool.pop();
    p.active  = true;
    this._active.push(p);
    return p;
  }

  /**
   * _swapRelease(index) — O(1) removal from _active using swap-remove.
   *
   * Classic trick: overwrite slot `i` with the last element, shrink the
   * array by 1, push the dead particle back onto the pool.
   * Never allocates, never shifts, safe to call during reverse iteration.
   */
  _swapRelease(i) {
    const p   = this._active[i];
    const last = this._active.length - 1;
    if (i !== last) {
      this._active[i] = this._active[last];  // swap
    }
    this._active.length -= 1;               // truncate
    p.active = false;
    this._pool.push(p);                     // return to free-list
  }

  /* ── Emitters ────────────────────────────────────────────────────────── */

  /**
   * emitEnemyExplosion — layered burst at (x, y).
   *
   * Three visual tiers work in concert:
   *   RING   — a single large expanding stroke ring; instant spatial read.
   *   SPARKS — 7–10 fast streaks radiating outward; kinetic energy.
   *   DOTS   — 5–8 slower glowing embers that linger; heat aftermath.
   *
   * All particles expire within ~800 ms and are returned to the pool.
   * Pool cost: 13–19 slots per explosion.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} [enemyRadius=13]
   */
  emitEnemyExplosion(x, y, enemyRadius = 13) {
    const spread = enemyRadius * 6.5;

    /* ── 1. Expanding shockwave ring ──────────────────────────────────── */
    {
      const p = this._acquire();
      if (p) {
        p.x  = p.px = x;
        p.y  = p.py = y;
        p.vx = 0;  p.vy = 0;
        p.t     = 1;
        p.decay = 1 / 0.42;          // 420 ms
        p.r     = enemyRadius * 0.5; // start small — expands via (1-t)*scale
        p.color = PALETTE.enemy.ring.color;
        p.glow  = PALETTE.enemy.ring.glow;
        p.type  = 'ring';
        p.drag  = 0;                 // ring is stationary; only t drives it
      }
    }

    /* ── 2. Fast streaking sparks ──────────────────────────────────────── */
    const nSparks = 7 + Math.floor(Math.random() * 4);  // 7–10
    for (let i = 0; i < nSparks; i++) {
      const p = this._acquire();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const spd   = spread * (1.8 + Math.random() * 2.4);
      p.x  = p.px = x;
      p.y  = p.py = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.t     = 1;
      p.decay = 1 / (0.25 + Math.random() * 0.25);  // 250–500 ms
      p.r     = 2 + Math.random() * 2.5;
      // 70% pink sparks, 30% amber embers — chromatic variety
      const pal = Math.random() < 0.7 ? PALETTE.enemy.spark : PALETTE.enemy.ember;
      p.color = pal.color;
      p.glow  = pal.glow;
      p.type  = 'spark';
      p.drag  = BASE_DRAG * (1 + Math.random() * 0.7);
    }

    /* ── 3. Slow glowing ember dots ────────────────────────────────────── */
    const nDots = 5 + Math.floor(Math.random() * 4);   // 5–8
    for (let i = 0; i < nDots; i++) {
      const p = this._acquire();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const spd   = spread * (0.35 + Math.random() * 0.85);
      p.x  = p.px = x;
      p.y  = p.py = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.t     = 1;
      p.decay = 1 / (0.45 + Math.random() * 0.40);  // 450–850 ms
      p.r     = 3.5 + Math.random() * 3.5;
      const pal = Math.random() < 0.55 ? PALETTE.enemy.dot : PALETTE.enemy.ember;
      p.color = pal.color;
      p.glow  = pal.glow;
      p.type  = 'circle';
      p.drag  = BASE_DRAG * 0.65;
    }
  }

  /**
   * emitBulletImpact — small yellow spark burst (wall/shield hits).
   * @param {number} x
   * @param {number} y
   */
  emitBulletImpact(x, y) {
    const n = 4 + Math.floor(Math.random() * 3);  // 4–6
    for (let i = 0; i < n; i++) {
      const p = this._acquire();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const spd   = 55 + Math.random() * 130;
      p.x  = p.px = x;
      p.y  = p.py = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.t     = 1;
      p.decay = 1 / (0.12 + Math.random() * 0.2);
      p.r     = 1.5 + Math.random() * 2;
      p.color = PALETTE.bullet.spark.color;
      p.glow  = PALETTE.bullet.spark.glow;
      p.type  = 'spark';
      p.drag  = BASE_DRAG * 1.6;
    }
  }

  /**
   * emitPlayerTrail — one small cyan dot per call.
   * Game.jsx calls this on a timer while the player is moving.
   * @param {number} x — spawn X (already offset behind the ship nose)
   * @param {number} y
   */
  emitPlayerTrail(x, y) {
    const p = this._acquire();
    if (!p) return;
    // Small random jitter so the trail has organic width
    p.x  = p.px = x + (Math.random() - 0.5) * 4;
    p.y  = p.py = y + (Math.random() - 0.5) * 4;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = (Math.random() - 0.5) * 20;
    p.t     = 1;
    p.decay = 1 / (0.30 + Math.random() * 0.14);  // 300–440 ms
    p.r     = 2.5 + Math.random() * 1.5;
    p.color = PALETTE.player.trail.color;
    p.glow  = PALETTE.player.trail.glow;
    p.type  = 'circle';
    p.drag  = BASE_DRAG * 0.9;
  }

  /* ── Update ──────────────────────────────────────────────────────────── */

  /**
   * update(dt) — advance all active particles, cull dead ones.
   *
   * Iterates in reverse so swap-remove during iteration is safe:
   * swapping element i with the last element and shrinking doesn't affect
   * indices < i that we haven't visited yet.
   *
   * @param {number} dt  seconds elapsed this physics tick
   */
  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];

      // Save previous position for sub-frame interpolation in draw()
      p.px = p.x;
      p.py = p.y;

      // Integrate velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Exponential drag (first-order Euler approximation)
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;

      // Age the particle
      p.t -= p.decay * dt;

      // ── CLEANUP: t ≤ 0 means alpha has hit zero — return to pool ──────
      if (p.t <= 0) {
        this._swapRelease(i);   // O(1) — no array shifting
      }
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  /**
   * draw(ctx, alpha) — render all active particles in three batched passes.
   *
   * Why three passes?  ctx.shadowBlur is a GPU-side state flush on most
   * browsers (Chrome, Safari).  Every unique shadowBlur value within a
   * frame triggers an implicit compositing layer rebuild.  By rendering all
   * rings together, then all sparks, then all circles, we reduce the number
   * of unique shadowBlur values from N (one per particle) to 3.
   *
   * Sub-frame interpolation:
   *   draw() receives `alpha` from useGameLoop — the fraction of the current
   *   physics tick that has elapsed.  We lerp between px→x and py→y so
   *   particles look smooth at 120/144 Hz even though physics runs at 60 Hz.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} alpha  sub-frame factor [0, 1)
   */
  draw(ctx, alpha) {
    if (this._active.length === 0) return;

    /* ══════════════════════════════════════════════════════════════════
       PASS 1 — RINGS
       One expanding stroke arc per ring particle.
       Radius grows as life drops: starts small, blooms outward.
       Line width and opacity both taper so it vanishes cleanly.
    ══════════════════════════════════════════════════════════════════ */
    ctx.save();
    ctx.lineCap = 'round';

    // Fixed shadowBlur for all rings in this pass (one GPU state change)
    ctx.shadowColor = PALETTE.enemy.ring.glow;
    ctx.shadowBlur  = 30;

    for (const p of this._active) {
      if (p.type !== 'ring') continue;

      const x = p.px + (p.x - p.px) * alpha;
      const y = p.py + (p.y - p.py) * alpha;

      // Expansion: radius scales from p.r to ~15× p.r as t goes 1→0
      const expansion = 1 + (1 - p.t) * 14;
      const radius    = Math.max(p.r * expansion, 0.5);

      // Opacity: quadratic ease-out — bright burst, soft fade
      const opacity   = p.t * p.t;

      ctx.globalAlpha = opacity * 0.92;
      ctx.lineWidth   = 3.5 * p.t;         // thins as ring expands
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary inner ring (offset ring creates depth)
      ctx.globalAlpha = opacity * 0.35;
      ctx.lineWidth   = 1.5 * p.t;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    /* ══════════════════════════════════════════════════════════════════
       PASS 2 — SPARKS
       Short tapered line segments pointing in velocity direction.
       The tail is drawn from the *actual* previous tick position so
       faster sparks have longer visible tails.
       A bright white disc is drawn at the leading tip.
    ══════════════════════════════════════════════════════════════════ */
    ctx.save();
    ctx.lineCap = 'round';

    // Single shadowBlur for all sparks in this pass
    ctx.shadowBlur = 12;

    for (const p of this._active) {
      if (p.type !== 'spark') continue;

      const x   = p.px + (p.x - p.px) * alpha;
      const y   = p.py + (p.y - p.py) * alpha;

      // Quadratic ease-out: rapid fade is more physically convincing for sparks
      const lifeAlpha = p.t * p.t;

      // Tail direction from velocity (normalised)
      const spd = Math.hypot(p.vx, p.vy);
      const nx  = spd > 0.5 ? p.vx / spd : 0;
      const ny  = spd > 0.5 ? p.vy / spd : 0;

      // Tail length: proportional to distance moved this tick × life
      // (px→x distance approximates distance-moved since last tick)
      const moved   = Math.hypot(p.x - p.px, p.y - p.py);
      const tailLen = Math.min(moved * 2.2 + 4, 24) * p.t;

      ctx.globalAlpha = lifeAlpha * 0.88;
      ctx.shadowColor = p.glow;
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = p.r * (0.4 + p.t * 0.6);
      ctx.beginPath();
      ctx.moveTo(x - nx * tailLen, y - ny * tailLen);
      ctx.lineTo(x, y);
      ctx.stroke();

      // White-hot tip
      ctx.globalAlpha = lifeAlpha;
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, p.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur  = 12; // restore for next iteration
    }

    ctx.restore();

    /* ══════════════════════════════════════════════════════════════════
       PASS 3 — CIRCLES
       Two-layer glow discs: outer halo + bright inner core.
       The halo uses the glow colour (pink/amber/cyan depending on palette).
       The core uses the particle's own colour string for contrast.
       Opacity holds at ~1 for the first 70 % of lifetime, then eases out
       — matches how a real hot ember looks as it cools.
    ══════════════════════════════════════════════════════════════════ */
    ctx.save();

    // Single shadowBlur for all circles (one GPU state change total)
    ctx.shadowBlur = 16;

    for (const p of this._active) {
      if (p.type !== 'circle') continue;

      const x = p.px + (p.x - p.px) * alpha;
      const y = p.py + (p.y - p.py) * alpha;

      // Piecewise opacity: full brightness until 30% life remains, then fade
      const fadeStart = 0.3;
      const opacity   = p.t > fadeStart ? 1 : (p.t / fadeStart);

      /* Outer halo */
      ctx.globalAlpha = Math.min(opacity * 0.8, 0.8);
      ctx.shadowColor = p.glow;
      ctx.fillStyle   = p.glow;
      ctx.beginPath();
      ctx.arc(x, y, p.r * (0.9 + p.t * 0.3), 0, Math.PI * 2);
      ctx.fill();

      /* Bright inner core — slightly smaller, fully opaque while alive */
      ctx.globalAlpha = Math.min(opacity * 1.1, 1.0);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.r * 0.52, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /* ── Public accessors (debug HUD) ────────────────────────────────────── */
  get activeCount() { return this._active.length; }
  get poolCount()   { return this._pool.length;   }
}
