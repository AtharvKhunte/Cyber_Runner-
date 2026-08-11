import styles from './UpgradeScreen.module.css';

export default function UpgradeScreen({upgrades,onPick,wave,cost,credits,canAfford}){
  return(
    <div className={styles.overlay}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>WAVE {wave} COMPLETE</p>
        <h2 className={styles.title}>CHOOSE UPGRADE</h2>
        {cost>0&&(
          <p className={`${styles.costLine} ${!canAfford?styles.cantAfford:''}`}>
            {canAfford?`Costs ⬡ ${cost} credits  (you have ⬡ ${credits})`:`⚠ Need ⬡ ${cost} — you have ⬡ ${credits}`}
          </p>
        )}
        {cost===0&&<p className={styles.costLine}>FREE — first upgrade on us</p>}
        <div className={styles.cards}>
          {upgrades.map((u,i)=>(
            <button key={u.id}
              className={`${styles.card} ${!canAfford?styles.locked:''}`}
              style={{'--card-color':u.color}}
              onClick={()=>canAfford&&onPick(u)}
              disabled={!canAfford}
            >
              <span className={styles.cardNum}>{i+1}</span>
              <span className={styles.cardIcon}>{u.icon}</span>
              <span className={styles.cardLabel}>{u.label}</span>
              <span className={styles.cardDesc}>{u.desc}</span>
            </button>
          ))}
        </div>
        <p className={styles.hint}>{canAfford?'Click a card or press 1 / 2 / 3':'Earn more credits to unlock upgrades'}</p>
      </div>
    </div>
  );
}