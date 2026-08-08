/**
 * useMetaProgression.js
 * Persistent cross-run data: credits, shop upgrades, unlocked ships.
 * All stored in localStorage under 'cyberRunner_meta'.
 *
 * Ship unlock thresholds (cumulative high score):
 *   Scout      — default, always unlocked
 *   Tank       — highScore >= 500
 *   Assassin   — highScore >= 1500
 */
import { useState, useCallback } from 'react';

const KEY = 'cyberRunner_meta';

export const SHIPS = [
  {
    id: 'scout',
    name: 'SCOUT',
    icon: '🚀',
    desc: 'Balanced. Default ship.',
    unlockScore: 0,
    color: '#00ffe7',
    metaBonus: {},
  },
  {
    id: 'tank',
    name: 'TANK',
    icon: '🛡',
    desc: 'Slower but starts with a shield and reduced knockback.',
    unlockScore: 500,
    color: '#00cfff',
    metaBonus: { speedBonus: -30, shieldRegen: true },
  },
  {
    id: 'assassin',
    name: 'ASSASSIN',
    icon: '⚡',
    desc: 'Fast, starts with triple shot. No shield.',
    unlockScore: 1500,
    color: '#c060ff',
    metaBonus: { speedBonus: 40, tripleShot: true, fireCooldownMult: 0.8 },
  },
];

export const SHOP_ITEMS = [
  { id: 'start_speed',    label: 'BOOT JETS',      icon: '👟', desc: 'Start every run +15 speed',   cost: 80,  max: 3, bonus: { speedBonus: 15 } },
  { id: 'start_cooldown', label: 'QUICK DRAW',      icon: '🔫', desc: 'Start with −10% fire cooldown', cost: 100, max: 3, bonus: { fireCooldownMult: 0.9 } },
  { id: 'start_magnet',   label: 'ATTRACTOR',       icon: '🧲', desc: 'Double power-up collect range', cost: 120, max: 1, bonus: { magnetRange: 2 } },
  { id: 'start_score',    label: 'SCORE CHIP',      icon: '💰', desc: '+5 bonus score per kill always', cost: 150, max: 3, bonus: { bonusScorePerKill: 5 } },
  { id: 'start_pierce',   label: 'PENETRATOR',      icon: '🎯', desc: 'Start every run with Piercing', cost: 200, max: 1, bonus: { piercing: true } },
];

function readMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    return { ...defaultMeta(), ...JSON.parse(raw) };
  } catch { return defaultMeta(); }
}

function defaultMeta() {
  return {
    credits:      0,
    shopLevels:   {},   // { [itemId]: level }
    activeShip:   'scout',
    highScore:    0,
  };
}

function writeMeta(meta) {
  try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch {}
}

/** Compute credits earned at end of a run. */
export function computeCredits(score, wave) {
  return Math.floor(score * 0.1 + wave * 5);
}

/** Build the metaBonus object from current shop purchases + active ship. */
export function buildMetaBonus(meta) {
  const ship  = SHIPS.find(s => s.id === meta.activeShip) || SHIPS[0];
  const bonus = { ...ship.metaBonus };

  for (const item of SHOP_ITEMS) {
    const level = meta.shopLevels[item.id] || 0;
    if (level === 0) continue;
    for (const [k, v] of Object.entries(item.bonus)) {
      if (typeof v === 'boolean') { bonus[k] = v; }
      else if (k === 'fireCooldownMult' || k === 'magnetRange' || k === 'scoreMultiplier') {
        bonus[k] = (bonus[k] || 1) * Math.pow(v, level);
      } else {
        bonus[k] = (bonus[k] || 0) + v * level;
      }
    }
  }
  return bonus;
}

export function useMetaProgression() {
  const [meta, setMeta] = useState(readMeta);

  const addCredits = useCallback((amount) => {
    setMeta(prev => {
      const next = { ...prev, credits: prev.credits + amount };
      writeMeta(next);
      return next;
    });
  }, []);

  const updateHighScore = useCallback((score) => {
    setMeta(prev => {
      if (score <= prev.highScore) return prev;
      const next = { ...prev, highScore: score };
      writeMeta(next);
      return next;
    });
  }, []);

  const buyShopItem = useCallback((itemId) => {
    setMeta(prev => {
      const item  = SHOP_ITEMS.find(i => i.id === itemId);
      const level = prev.shopLevels[itemId] || 0;
      if (!item || level >= item.max || prev.credits < item.cost) return prev;
      const next = {
        ...prev,
        credits:    prev.credits - item.cost,
        shopLevels: { ...prev.shopLevels, [itemId]: level + 1 },
      };
      writeMeta(next);
      return next;
    });
  }, []);

  const selectShip = useCallback((shipId) => {
    setMeta(prev => {
      const ship = SHIPS.find(s => s.id === shipId);
      if (!ship || prev.highScore < ship.unlockScore) return prev;
      const next = { ...prev, activeShip: shipId };
      writeMeta(next);
      return next;
    });
  }, []);

  return { meta, addCredits, updateHighScore, buyShopItem, selectShip };
}