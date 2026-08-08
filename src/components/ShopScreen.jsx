/**
 * ShopScreen.jsx
 * Persistent shop shown on the idle/start screen.
 * Tabs: SHOP | SHIPS
 */
import { useState } from 'react';
import { SHOP_ITEMS, SHIPS } from '../hooks/useMetaProgression';
import styles from './ShopScreen.module.css';

export default function ShopScreen({ meta, onBuy, onSelectShip, onClose }) {
  const [tab, setTab] = useState('shop');

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.credits}>⬡ {meta.credits} CREDITS</span>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'shop'  ? styles.active : ''}`} onClick={() => setTab('shop')}>SHOP</button>
            <button className={`${styles.tab} ${tab === 'ships' ? styles.active : ''}`} onClick={() => setTab('ships')}>SHIPS</button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>

        {tab === 'shop' && (
          <div className={styles.grid}>
            {SHOP_ITEMS.map(item => {
              const level    = meta.shopLevels[item.id] || 0;
              const maxed    = level >= item.max;
              const canAfford = meta.credits >= item.cost;
              return (
                <div key={item.id} className={`${styles.item} ${maxed ? styles.maxed : ''}`}>
                  <span className={styles.itemIcon}>{item.icon}</span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>{item.label}</span>
                    <span className={styles.itemDesc}>{item.desc}</span>
                    <div className={styles.itemLevel}>
                      {Array.from({ length: item.max }).map((_, i) => (
                        <span key={i} className={`${styles.pip} ${i < level ? styles.pipFilled : ''}`} />
                      ))}
                    </div>
                  </div>
                  <button
                    className={`${styles.buyBtn} ${!canAfford || maxed ? styles.disabled : ''}`}
                    onClick={() => onBuy(item.id)}
                    disabled={maxed || !canAfford}
                  >
                    {maxed ? 'MAX' : `⬡ ${item.cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ships' && (
          <div className={styles.grid}>
            {SHIPS.map(ship => {
              const unlocked = meta.highScore >= ship.unlockScore;
              const active   = meta.activeShip === ship.id;
              return (
                <div
                  key={ship.id}
                  className={`${styles.item} ${active ? styles.activeShip : ''} ${!unlocked ? styles.locked : ''}`}
                  style={{ '--ship-color': ship.color }}
                >
                  <span className={styles.itemIcon}>{ship.icon}</span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel} style={{ color: ship.color }}>{ship.name}</span>
                    <span className={styles.itemDesc}>{unlocked ? ship.desc : `🔒 Reach score ${ship.unlockScore}`}</span>
                  </div>
                  <button
                    className={`${styles.buyBtn} ${!unlocked || active ? styles.disabled : ''}`}
                    onClick={() => onSelectShip(ship.id)}
                    disabled={!unlocked || active}
                  >
                    {active ? 'ACTIVE' : unlocked ? 'SELECT' : 'LOCKED'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}