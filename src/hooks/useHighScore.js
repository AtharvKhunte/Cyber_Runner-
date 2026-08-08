/**
 * useHighScore.js — Persistent high-score via localStorage.
 *
 * ── Why not useState initialised from localStorage? ──────────────────────
 *
 *  The naive approach — `useState(() => Number(localStorage.getItem(...)))`
 *  — works but couples two concerns: the React render cycle and the
 *  persistence layer.  A dedicated hook is cleaner and easier to test.
 *
 * ── localStorage vs other storage ───────────────────────────────────────
 *
 *  localStorage is synchronous and available without any setup, making it
 *  the right choice for a single small value like a high score.
 *  Alternatives (IndexedDB, sessionStorage, cookies) add complexity for no
 *  benefit here.  If we ever need cross-device sync, swapping to a fetch
 *  call inside save() is a one-line change.
 *
 * ── Error handling ───────────────────────────────────────────────────────
 *
 *  localStorage can throw in three situations:
 *    1. Private browsing mode with storage quota set to 0 (Safari).
 *    2. Storage quota exceeded (the browser is full).
 *    3. The page is served from a null origin (file:// without a server).
 *  All three are caught silently so a storage error never crashes the game.
 *
 * ── API ──────────────────────────────────────────────────────────────────
 *
 *  const { highScore, saveIfBest } = useHighScore();
 *
 *  highScore     number   — current persisted high score (0 if none saved)
 *  saveIfBest(n) void     — write n to storage only when n > highScore;
 *                           also updates the React state so the HUD re-renders
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cyberRunner_highScore';

/** Read from localStorage, returning 0 on any error. */
function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n   = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Write to localStorage, swallowing quota / permission errors. */
function writeStored(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Silently ignore storage errors — the game keeps running
  }
}

export function useHighScore() {
  // Lazy initialiser reads localStorage exactly once at mount
  const [highScore, setHighScore] = useState(readStored);

  /**
   * saveIfBest — compare n to the current high score and persist if higher.
   * Calling this after every game-over is safe (no-ops when score <= best).
   */
  const saveIfBest = useCallback((n) => {
    setHighScore((prev) => {
      if (n > prev) {
        writeStored(n);
        return n;
      }
      return prev;
    });
  }, []);

  return { highScore, saveIfBest };
}
