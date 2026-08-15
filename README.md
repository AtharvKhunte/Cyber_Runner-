<div align="center">

```
 ██████╗██╗   ██╗██████╗ ███████╗██████╗       ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗███████╗██████╗ 
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗      ██╔══██╗██║   ██║████╗  ██║████╗  ██║██╔════╝██╔══██╗
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝█████╗██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗╚════╝██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
╚██████╗   ██║   ██████╔╝███████╗██║  ██║      ██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║███████╗██║  ██║
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝      ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
```

**A top-down neon arcade shooter built entirely with React + HTML5 Canvas**

[![Live Demo](https://img.shields.io/badge/▶%20PLAY%20LIVE-00ffe7?style=for-the-badge&logoColor=black)](https://cyber-runner.vercel.app)
[![Built with React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Zero Dependencies](https://img.shields.io/badge/Game%20Dependencies-ZERO-ff2d6b?style=for-the-badge)](package.json)

</div>

---

## ⚡ What is this?

Cyber-Runner is a wave-based arcade shooter with no canvas library, no game engine, no physics engine — just raw **HTML5 Canvas 2D API** inside a **React component**, running at a locked 60 fps via a fixed-timestep game loop.

Every visual you see — ships, enemies, particles, explosions, the star field — is drawn with `ctx.beginPath()`. Nothing is a sprite.

---

## 🎮 How to Play

| Platform | Move | Fire |
|----------|------|------|
| Desktop  | `WASD` or `↑ ↓ ← →` | `Space` |
| Mobile   | Drag anywhere (virtual joystick) | 🔥 button |

### Loop
```
Survive the wave → WAVE CLEAR → Pick 1 of 3 upgrades → Next wave
Every 5th wave = BOSS
```

### Power-ups (drop from enemies)
| Icon | Name | Effect |
|------|------|--------|
| 🛡 | Shield | Absorbs one hit |
| ⚡ | Rapid Fire | Fire rate ×3 for 6s |
| 🔱 | Triple Shot | 3-way spread for 6s |
| 💨 | Speed Boost | Movement ×1.6 for 6s |
| 💥 | Nuke | Instantly clears all enemies |
| ❤️ | Extra Life | Restores shield or +50 score |

---

## 🚀 Ships

Three ships, each with a distinct vector art design and different starting stats:

| Ship | Unlock | Style | Bonus |
|------|--------|-------|-------|
| 🚀 **Scout** | Free | Delta-wing fighter, cyan | Balanced |
| 🛡 **Tank** | 300 ⬡ | Wide cruiser, blue | Shield regen, −35 speed |
| ⚡ **Assassin** | 600 ⬡ | Needle dart, purple | Triple shot, +50 speed, −25% cooldown |

Ships are unlocked with **credits** earned across runs, then selected from the Shop.

---

## 👾 Enemies

| Type | Shape | HP | Behaviour |
|------|-------|----|-----------|
| Normal | Pink diamond drone | 2 | Homes in, fires every 2.8s |
| Fast | Orange needle | 1 | Very fast, rams only |
| Tank | Purple octagon | 5 | Slow, 3-way spread every 1.6s |
| Boss | Red cruiser | 12 | 5-way spread, enrages at 40% HP, rotating shield rings |

---

## 🔧 Upgrades (pick one per wave)

```
OVERCHARGE    ⚡  Bullet damage +1
RAPID FIRE    🔫  Fire cooldown −20%
WARHEAD       💣  Bullet radius +3px
AFTERBURNER   💨  Move speed +25px/s
RAILGUN       🎯  Bullets pierce through enemies
ORBIT SHIELD  🌀  +3 orbiting shield bullets
MAGNET        🧲  Double power-up collect range
DOUBLE XP     ✖️  Score multiplier ×2
RICOCHET      ↩️  Bullets bounce off edges
PHASE SHIELD  🛡  Shield recharges 8s after breaking
SPREAD SHOT   🔱  Triple shot permanently
EXECUTIONER   💀  +5 bonus score per kill
```

Upgrades get **progressively more expensive** each wave (wave × 15 credits).  
Credits are deducted on pick. If you can't afford it, the cards are locked.

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── Game.jsx                 ← Canvas mount, RAF game loop, all systems wired
│   ├── Game.module.css          ← HUD, overlays, mobile fire button
│   ├── UpgradeScreen.jsx        ← Between-wave upgrade card picker
│   ├── UpgradeScreen.module.css
│   ├── ShopScreen.jsx           ← Persistent shop (ships + passive upgrades)
│   └── ShopScreen.module.css
│
├── hooks/
│   ├── useGameLoop.js           ← Fixed-timestep RAF loop (update/render split)
│   ├── useInputVector.js        ← Unified keyboard + touch → normalised {x,y,fire}
│   ├── useAudioEngine.js        ← Web Audio API synthesised SFX (zero assets)
│   ├── useHighScore.js          ← localStorage high score persistence
│   └── useMetaProgression.js   ← Credits, ship unlocks, shop — all localStorage
│
└── game/
    ├── entities/
    │   ├── Player.js            ← PLAYER_RADIUS constant
    │   └── ShipRenderer.js      ← Vector art for Scout / Tank / Assassin
    │
    └── systems/
        ├── BulletSystem.js      ← Player projectiles, triple shot, ricochet
        ├── EnemySystem.js       ← 4 enemy types, firing, boss enrage
        ├── EnemyBulletSystem.js ← Enemy projectiles, hit detection
        ├── CollisionSystem.js   ← Circle-to-circle, piercing, HP decrement
        ├── WaveSystem.js        ← Wave state machine (announce→active→clear)
        ├── PowerUpSystem.js     ← 6 power-up types, drop, collect, timers
        ├── UpgradeSystem.js     ← 12 run upgrades, roll, apply
        ├── OrbitSystem.js       ← Orbiting shield bullets
        ├── ParticleSystem.js    ← Object-pooled particles (O(1) swap-remove)
        └── StarField.js         ← 3-layer parallax star field + shooting stars
```

---

## 🧠 Technical highlights

### Fixed-timestep game loop
Physics runs at a locked **60 Hz** regardless of display refresh rate. Rendering uses sub-frame interpolation (`alpha`) so the game looks smooth at 120/144 Hz without physics running faster.

```js
while (accumulator >= FIXED_DT) {
  update(FIXED_DT / 1000);   // always 60 Hz
  accumulator -= FIXED_DT;
}
render(ctx, accumulator / FIXED_DT);  // interpolated, once per visual frame
```

### Unified input vector
A single `{ x, y, fire }` vector drives movement on both platforms. Keyboard uses a polled key set. Touch uses the Pointer Events API with `setPointerCapture` so drags don't break when a finger leaves the canvas.

```js
// Same code path regardless of input method
p.vx = inp.x * speed;
p.vy = inp.y * speed;
```

### O(1) particle pool
The `ParticleSystem` pre-allocates 320 particle objects at startup. Dead particles are removed with **swap-remove** (swap with last element, truncate) — O(1) vs `Array.splice`'s O(n). Zero GC allocations during gameplay.

### Synthesised audio
All sound effects are generated procedurally using the **Web Audio API** — oscillators, noise buffers, and gain envelopes. No audio files, no network requests, zero extra KB.

```js
// "Pew" = sine wave swept 880→220 Hz in 80ms
oscNode.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
```

### Zero game-library dependencies
```json
"dependencies": {
  "react": "^19.2.8",
  "react-dom": "^19.2.8"
}
```
Every game system — physics, collision, particles, audio, input — is hand-rolled.

---

## 🛠️ Local development

```bash
# Clone
git clone https://github.com/AtharvKhunte/Cyber_Runner-.git
cd Cyber_Runner-

# Install (only React + Vite)
npm install

# Dev server with HMR
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Preview production build locally
npm run preview
```

**Requirements:** Node 18+. No other tools.

---

## 🚢 Deployment

The repo auto-deploys to Vercel on every push to `main` via GitHub Actions.

To deploy your own fork:
1. Fork this repo
2. Go to [vercel.com](https://vercel.com) → Import project
3. Select your fork — Vercel auto-detects Vite
4. Click **Deploy**

Every subsequent `git push` redeploys automatically.

---

## 🗺️ Roadmap

- [ ] Online leaderboard (Supabase)
- [ ] Achievement system
- [ ] Real-time versus multiplayer (Supabase Realtime)
- [ ] More boss patterns
- [ ] Mobile haptic feedback
- [ ] PWA / installable

---

## 📁 Key design decisions

**Why Canvas instead of DOM/SVG?**  
60+ moving entities with per-frame position updates and glow effects need a retained-mode surface. Canvas clears and redraws every frame — no diffing, no layout, no reflow.

**Why React around a Canvas?**  
React manages the UI layer (HUD, overlays, shop, upgrade screen) while the canvas handles everything that moves. The two layers never conflict — the canvas is `pointer-events: none` in CSS except where explicitly re-enabled.

**Why no game engine?**  
Writing systems from scratch gave full control over the fixed-timestep loop, the particle pool design, and the input normalisation. The final bundle is **77 KB gzipped** — smaller than most game engine runtimes alone.

---

<div align="center">

Built with React 19 · Vite 8 · HTML5 Canvas · Web Audio API · Zero game dependencies

**[▶ Play now](https://cyber-runner.vercel.app)**

</div>
