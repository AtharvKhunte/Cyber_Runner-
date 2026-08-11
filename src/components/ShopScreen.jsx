import{useState}from'react';
import{SHOP_ITEMS,SHIPS}from'../hooks/useMetaProgression';
import styles from'./ShopScreen.module.css';

export default function ShopScreen({meta,onBuy,onSelectShip,onUnlockShip,onClose}){
  const[tab,setTab]=useState('shop');
  const totalEver=meta.totalCredits||0;
  return(
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.credits}>⬡ {meta.credits} CREDITS</span>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab==='shop'?styles.active:''}`} onClick={()=>setTab('shop')}>SHOP</button>
            <button className={`${styles.tab} ${tab==='ships'?styles.active:''}`} onClick={()=>setTab('ships')}>SHIPS</button>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>
        {tab==='shop'&&(
          <div className={styles.grid}>
            {SHOP_ITEMS.map(item=>{
              const level=meta.shopLevels[item.id]||0;
              const maxed=level>=item.max;
              const canAfford=meta.credits>=item.cost;
              return(
                <div key={item.id} className={`${styles.item} ${maxed?styles.maxed:''}`}>
                  <span className={styles.itemIcon}>{item.icon}</span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>{item.label}</span>
                    <span className={styles.itemDesc}>{item.desc}</span>
                    <div className={styles.itemLevel}>
                      {Array.from({length:item.max}).map((_,i)=>(
                        <span key={i} className={`${styles.pip} ${i<level?styles.pipFilled:''}`}/>
                      ))}
                    </div>
                  </div>
                  <button className={`${styles.buyBtn} ${(!canAfford||maxed)?styles.disabled:''}`}
                    onClick={()=>onBuy(item.id)} disabled={maxed||!canAfford}>
                    {maxed?'MAX':`⬡ ${item.cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {tab==='ships'&&(
          <div className={styles.grid}>
            {SHIPS.map(ship=>{
              const owned=totalEver>=ship.unlockCost||ship.unlockCost===0;
              const canBuy=!owned&&meta.credits>=ship.unlockCost;
              const active=meta.activeShip===ship.id;
              return(
                <div key={ship.id} className={`${styles.item} ${active?styles.activeShip:''} ${!owned?styles.locked:''}`} style={{'--ship-color':ship.color}}>
                  <span className={styles.itemIcon}>{ship.icon}</span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel} style={{color:ship.color}}>{ship.name}</span>
                    <span className={styles.itemDesc}>{ship.desc}</span>
                    {!owned&&ship.unlockCost>0&&(
                      <span className={styles.itemDesc} style={{color:'#ffe600'}}>
                        Unlock: ⬡ {ship.unlockCost}{!canBuy&&` (need ${ship.unlockCost-meta.credits} more)`}
                      </span>
                    )}
                  </div>
                  {!owned?(
                    <button className={`${styles.buyBtn} ${styles.unlockBtn} ${!canBuy?styles.disabled:''}`}
                      onClick={()=>{onUnlockShip(ship.id);onSelectShip(ship.id);}} disabled={!canBuy}>
                      {canBuy?`⬡ ${ship.unlockCost}`:'LOCKED'}
                    </button>
                  ):(
                    <button className={`${styles.buyBtn} ${active?styles.disabled:''}`}
                      onClick={()=>onSelectShip(ship.id)} disabled={active}>
                      {active?'ACTIVE':'SELECT'}
                    </button>
                  )}
                </div>
              );
            })}
            <p className={styles.shopNote}>Total credits earned: ⬡ {totalEver}</p>
          </div>
        )}
      </div>
    </div>
  );
}