/**
 * UpgradeScreen.jsx
 * Full-screen overlay shown between waves.
 * Shows 3 random upgrade cards; clicking one applies it and resumes the game.
 */
import styles from './UpgradeScreen.module.css';

export default function UpgradeScreen({ upgrades, onPick, wave }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>WAVE {wave} COMPLETE</p>
        <h2 className={styles.title}>CHOOSE UPGRADE</h2>
        <div className={styles.cards}>
          {upgrades.map((u) => (
            <button
              key={u.id}
              className={styles.card}
              style={{ '--card-color': u.color }}
              onClick={() => onPick(u)}
            >
              <span className={styles.cardIcon}>{u.icon}</span>
              <span className={styles.cardLabel}>{u.label}</span>
              <span className={styles.cardDesc}>{u.desc}</span>
            </button>
          ))}
        </div>
        <p className={styles.hint}>Click a card or press 1 / 2 / 3</p>
      </div>
    </div>
  );
}