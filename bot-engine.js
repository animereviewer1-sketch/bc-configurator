const BOT_ENGINE_VERSION = '1.1.0';
window.BOT_ENGINE_VERSION = BOT_ENGINE_VERSION;

function _buildBotCode(bot) {
  const s = bot.settings;
  const triggers = (bot.triggers||[]).filter(t=>t.aktiv).map(t => ({
    id: t.id, name: t.name, delay: t.delay??0,
      wiederholung: t.wiederholung??'immer', maxMal: t.maxMal??2,
      fallbackTyp: t.fallbackTyp??'nichts', fallbackText: t.fallbackText??'',
      charSpec: !!t.charSpec, resetOnLeave: !!t.resetOnLeave,
      von: t.von??'alle',
      vonNummern: (t.vonNummern||[]).map(Number),
      ifElse: !!t.ifElse,
    bedingungen: (t.bedingungen||[]),
    ifBedingungen: (t.ifBedingungen||[]),
    aktionen: (t.aktionen||[]).map(a => {
      const base = a.typ==='item' && a.curseKey && !a.curseEntry ? {...a, curseEntry: CURSE_DB[a.curseKey]??null}
                 : a.typ==='item' && a.profilName && (!a.profilItems||!a.profilItems.length) ? {...a, profilItems: PROFILES[a.profilName]?.items??[]}
                 : {...a};
      base.aktZiel = a.aktZiel ?? 'ausloeser';
      base.aktZielNummern = (a.aktZielNummern||[]).map(Number);
      return base;
    }),
    aktionen_sonst: (t.aktionen_sonst||[]).map(a => {
      const base = a.typ==='item' && a.curseKey && !a.curseEntry ? {...a, curseEntry: CURSE_DB[a.curseKey]??null}
                 : a.typ==='item' && a.profilName && (!a.profilItems||!a.profilItems.length) ? {...a, profilItems: PROFILES[a.profilName]?.items??[]}
                 : {...a};
      base.aktZiel = a.aktZiel ?? 'ausloeser';
      base.aktZielNummern = (a.aktZielNummern||[]).map(Number);
      return base;
    }),
  }));
  const safeId   = bot.id.replace(/\W/g,'_');
  const safeName = bot.name.replace(/\\/g,'\\\\').replace(/`/g,'\\`');

  // Alle User-Daten als Base64 kodieren → kein Zeichen kann das Template-Literal brechen
  const _cfgRaw = JSON.stringify({hearChat:s.hearChat,hearEmote:s.hearEmote,hearWhisper:s.hearWhisper,nurEigene:s.nurEigene,logAktiv:s.logAktiv??true,modus:s.modus,moneyQueryCmd:_money?.settings?.queryCmd??'',moneyQueryTyp:_money?.settings?.queryTyp??'whisper',moneyName:_money?.settings?.name??'Gold',rankQueryCmd:_rankData?.settings?.queryCmd??'',rankQueryTyp:_rankData?.settings?.queryCmdTyp??'whisper',rankQueryText:_rankData?.settings?.queryCmdText??'{name} hat Rang: {rang_icon} {rang}',rankDefs:_rankData?.defs??[],rankPlayers:Object.fromEntries(Object.entries(_rankData?.players??{}).map(([k,v])=>[k,v.rankId??null])),shopCmd:_shop?.settings?.cmd??'!pay',shopListCmd:_shop?.settings?.listCmd??'!shop',shopAnnounceNostripMsg:_shop?.settings?.announceNostripMsg??'',shopConfirmMsg:_shop?.settings?.confirmMsg??'',shopAnnounceMsg:_shop?.settings?.announceMsg??'',shopAnnounceAllMsg:_shop?.settings?.announceAllMsg??'',shopErrorMsg:_shop?.settings?.errorMsg??'',shopPreisU:_shop?.settings?.preisU??0,shopPreisNostrip:_shop?.settings?.preisNostrip??0,shopItems:(_shop?.items??[]).filter(i=>i.aktiv!==false),moneyBalances:Object.fromEntries(Object.entries(_money?.balances??{}).map(([k,v])=>[k,{balance:v.balance??0,name:v.name??''}]))});
  const cfgJson  = btoa(unescape(encodeURIComponent(_cfgRaw)));
  const trigsJson = btoa(unescape(encodeURIComponent(JSON.stringify(triggers))));
  const events = (bot.events||[]).filter(e=>e.aktiv).map(e => ({
    id: e.id, name: e.name,
    von: e.von??'alle', vonNummer: e.vonNummer??0,
    ziel: e.ziel??'ausloeser', zielListe: e.zielListe??[],
    wiederholung: e.wiederholung??'immer', maxMal: e.maxMal??2,
    fallbackTyp: e.fallbackTyp??'nichts', fallbackText: e.fallbackText??'',
    bedingungen: e.bedingungen??[],
    aktionen: (e.aktionen||[]).map(a => {
      if (a.typ==='item' && a.curseKey && !a.curseEntry) return {...a, curseEntry: CURSE_DB[a.curseKey]??null};
      if (a.typ==='item' && a.profilName && (!a.profilItems||!a.profilItems.length)) return {...a, profilItems: PROFILES[a.profilName]?.items??[]};
      return a;
    }),
  }));
  const eventsJson = btoa(unescape(encodeURIComponent(JSON.stringify(events))));
  // Build roomEver from logs – members who joined and haven't left yet
  // This is the authoritative source: Log löschen = Erstes Mal joinen
  const persistedRoomEver = (() => {
    const logs = window._BCBotLog || [];
    const botLogs = logs.filter(e => e.botId === bot.id && (e.status==='join'||e.status==='join_rejoin'||e.status==='leave'));
    botLogs.sort((a,b) => a.ts - b.ts);
    const ever = new Set();
    botLogs.forEach(e => {
      if (e.status === 'join' || e.status === 'join_rejoin') ever.add(e.memberNum);
      // leave doesn't remove from roomEver – only from present
    });
    return [...ever];
  })();
  const roomEverJson = JSON.stringify(persistedRoomEver);

  return `(function(){
const _BID='${safeId}';
const _VER='${BOT_ENGINE_VERSION}';
if(window['_BCBot_'+_BID]){console.warn('[Bot] Bereits aktiv – erst stoppen!');return;}
// ── AntiStrip ────────────────────────────────────────────────
// var statt const → Hoisting, damit _asRegister schon in
// _execAct verfügbar ist bevor _asH unten befüllt wird.
var _asWatchers = {}; // key: memberNum+'_'+gruppe
var _asH        = null;
function _asRegister(C, a) {
  var gruppe = (a.antiStrip_itemConfig && a.antiStrip_itemConfig.group)
    || (a.antiStrip_curseEntry && a.antiStrip_curseEntry.Gruppe)
    || a.antiStrip_gruppe
    || (a.itemConfig && a.itemConfig.group)
    || (a.curseEntry && a.curseEntry.Gruppe)
    || a.gruppe || '';
  if (!gruppe) { _log('\u26A0 AntiStrip: Gruppe nicht erkannt'); return; }
  var key = C.MemberNumber + '_' + gruppe;
  _asWatchers[key] = {
    memberNum:  C.MemberNumber,
    gruppe:     gruppe,
    delay:      a.antiStrip_delay != null ? a.antiStrip_delay : 500,
    ersatz:     a.antiStrip_ersatz || (a.antiStrip_itemConfig||a.itemConfig)?.asset || null,
    farbe:      a.antiStrip_farbe  || '#ffffff',
    itemConfig: a.antiStrip_itemConfig || a.itemConfig || null,
    curseEntry: a.antiStrip_curseEntry || a.curseEntry || null,
  };
  _log('\u{1F6E1}\uFE0F AntiStrip aktiv: ' + C.Name + ' / ' + gruppe
    + (a.antiStrip_ersatz ? ' \u2192 ' + a.antiStrip_ersatz : ' (gleiches Item)'));
}
function _asUnregister(C, gruppe) {
  if (!gruppe) return;
  var key = C.MemberNumber + '_' + gruppe;
  if (_asWatchers[key]) {
    delete _asWatchers[key];
    _log('\u{1F6E1}\uFE0F AntiStrip beendet (Bot hat Item geändert/entfernt): '
      + C.Name + ' / ' + gruppe);
  }
}
// ── NoStrip (Polling-basiert) ────────────────────────────────
// Unabhaengig vom AntiStrip Action-Listener: prueft per Intervall
// ob ein /nostrip-Item noch vorhanden ist und legt es sofort wieder an.
var _nsWatchers = {}; // key: memberNum+'_'+gruppe
function _nsRegister(C, a) {
  var gruppe = (a.itemConfig && a.itemConfig.group)
    || (a.curseEntry && a.curseEntry.Gruppe)
    || a.gruppe || '';
  if (!gruppe) { _log('\u26A0 NoStrip: Gruppe nicht erkannt'); return; }
  var key = C.MemberNumber + '_' + gruppe;
  _nsWatchers[key] = {
    memberNum: C.MemberNumber,
    gruppe:    gruppe,
    ersatz:    (a.itemConfig)?.asset || null,
    farbe:     a.farbe || '#ffffff',
    itemConfig: a.itemConfig || null,
    curseEntry: a.curseEntry || null,
  };
  _log('\u{1F512} NoStrip aktiv: ' + C.Name + ' / ' + gruppe);
}
function _nsUnregister(C, gruppe) {
  if (!gruppe) return;
  var key = C.MemberNumber + '_' + gruppe;
  if (_nsWatchers[key]) {
    delete _nsWatchers[key];
    _log('\u{1F512} NoStrip beendet: ' + C.Name + ' / ' + gruppe);
  }
}
// ─────────────────────────────────────────────────────────────
const _cfg=JSON.parse(decodeURIComponent(escape(atob('${cfgJson}'))));
const _moneyCfg={queryCmd:_cfg.moneyQueryCmd??''};
const _trigs=JSON.parse(decodeURIComponent(escape(atob('${trigsJson}'))));
// State-Persistenz: beim Sync (Stop+Start) bleiben Fired-States erhalten
const _stateKey='__BCKBotState_${safeId}';
// Priorität: window (Sync) > localStorage (Reload) > leer
const _lsSaved=(()=>{try{return JSON.parse(localStorage.getItem('__BCKBotStates')||'{}')['${safeId}']??{};}catch(e){return {};}})();
const _savedState=window[_stateKey]??_lsSaved;
const _fired    =_savedState.fired    ??{}; // trigId -> last timestamp (global latch)
const _firedCnt =_savedState.firedCnt ??{}; // trigId -> fire count
const _firedChar=_savedState.firedChar??{}; // trigId_memberNum -> timestamp
// FIX: also persist evFiredCnt so einmalig/n_mal events survive bot restart/sync
const _evFiredCnt=Object.assign({},_savedState.evFiredCnt??{});
// roomEver: merge window-state + popup-persisted (build-time injected) + log-based
const _roomEver=new Set([...(_savedState.roomEver??[]),...(${roomEverJson})]);
// State sofort zurückschreiben damit Referenz live ist
window[_stateKey]={fired:_fired,firedCnt:_firedCnt,firedChar:_firedChar,roomEver:_roomEver};
// Quick lookup: trigId -> trigger config (for charSpec)
const _trigMap=Object.fromEntries(_trigs.map(t=>[t.id,t]));
// Rejoin-Fenster: memberNum → true – schließt wenn Nicht-Rejoin-Trigger feuert
const _rejoinWindow=new Map(); // memberNum → timestamp when opened
const _REJOIN_GRACE=1000; // ms window stays open regardless of other triggers
const _evts=JSON.parse(decodeURIComponent(escape(atob('${eventsJson}'))));

// Rang-State: memberNum -> aktueller rankId (laut Popup-State)
// Beim Start mit gespeicherten Spieler-Rang-Zuweisungen initialisieren
const _rangState=Object.assign({},_cfg.rankPlayers??{});

// Shop-Konfiguration (Snapshot beim Bot-Start)
const _shopCfg={
  cmd:(_cfg.shopCmd||'!pay').trim(),
  items:_cfg.shopItems??[],
  confirmMsg:_cfg.shopConfirmMsg??'',
  announceMsg:_cfg.shopAnnounceMsg??'',
  announceAllMsg:_cfg.shopAnnounceAllMsg??'',
  errorMsg:_cfg.shopErrorMsg??'',
  moneyName:_cfg.moneyName??'Gold',
  preisU:_cfg.shopPreisU??0,
  preisNostrip:_cfg.shopPreisNostrip??0,
  listCmd:(_cfg.shopListCmd||'!shop').trim(),
  announceNostripMsg:_cfg.shopAnnounceNostripMsg??'',
};
// Money-Balances: lokale Kopie für Echtzeit-Prüfungen (wird bei Abbuchung synchron aktualisiert)
const _moneyBalances=Object.assign({},_cfg.moneyBalances??{});

function _log(...a){if(_cfg.logAktiv)console.log('[Bot:${safeName}]',...a);}

// bei_fehler: 'ignorieren' | 'kette_stoppen' | 'trigger_ungueltig'
// Executed sequentially – each action's result determines if chain continues

// Direkt C.X/C.Y verwenden – exakt wie funktionierendes ZoneMonitor-Pattern
// Kein Lookup nötig: [Player,...ChatRoomCharacter] enthält bereits korrekte Positionen

function _ok(trig,rohText,typKey,C){
  const cx=C.X??-999,cy=C.Y??-999;
  const beds=trig.bedingungen??[];
  if(!beds.length)return true;
  // AND/OR Auswertung: logik-Feld pro Bedingung verbindet mit vorheriger
  // Ablauf: Bedingungen in OR-Gruppen aufteilen (trennend bei "oder"), dann alle Gruppen mit AND prüfen
  function checkOne(c){
    if(c.typ==='wort'){
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==typKey)return false;
      return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());
    }
    if(c.typ==='zone'){
      const p=c.puffer??1;
      const ok=cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
      if(!ok)_log('Zone miss: X='+cx+' Y='+cy+' erwartet X='+c.x+' Y='+c.y+'±'+p);
      return ok;
    }
    if(c.typ==='zone_rect'){
      const ok=cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
      return ok;
    }
    if(c.typ==='item_traegt'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='item_traegt_nicht'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='trigger_war'){
      const ref=_trigMap[c.trigId];
      return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
    }
    if(c.typ==='rang'){
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;
      if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);
      const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef) return false;
      if(!currentDef) return false; // kein Rang → nicht erfüllt wenn level gebraucht
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')   return cl===tl;
      if(op==='min') return cl>=tl;
      if(op==='max') return cl<=tl;
      return false;
    }
    if(c.typ==='shop_kauf') return false; // Nur via _handleShopCmd auslösbar
    if(c.typ==='player_betritt')return true; // handled by poll
    return true;
  }
  // Split into OR-groups (oder + und_oder both split groups)
  const groups=[[]];
  for(const c of beds){
    if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);
    groups[groups.length-1].push(c);
  }
  // At least one group (OR) must be fully satisfied (AND within group)
  // und_nicht: Bedingung muss FALSCH sein
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

// ── IF-Bedingungen Check (entscheidet DANN vs. SONST wenn ifElse aktiv) ──
function _okIf(trig,rohText,typKey,C){
  const cx=C.X??-999,cy=C.Y??-999;
  const beds=trig.ifBedingungen??[];
  if(!beds.length)return true; // keine IF-Beds → immer DANN
  function checkOne(c){
    if(c.typ==='wort'){
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==typKey)return false;
      return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());
    }
    if(c.typ==='zone'){
      const p=c.puffer??1;
      return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
    }
    if(c.typ==='zone_rect'){
      return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
    }
    if(c.typ==='item_traegt'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='item_traegt_nicht'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='trigger_war'){
      const ref=_trigMap[c.trigId];
      return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
    }
    if(c.typ==='rang'){
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;
      if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);
      const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef) return false;
      if(!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')   return cl===tl;
      if(op==='min') return cl>=tl;
      if(op==='max') return cl<=tl;
      return false;
    }
    return true;
  }
  const groups=[[]];
  for(const c of beds){
    if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);
    groups[groups.length-1].push(c);
  }
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}
function _istBesetzt(x,y,ausschliessen){
  // Ignore target positions at 0,0 — BC hasn't synced position yet
  if(x===0&&y===0)return false;
  return[Player,...(ChatRoomCharacter||[])].some(C=>{
    if(ausschliessen.includes(C.MemberNumber))return false;
    if(C.X===0&&C.Y===0)return false; // character position not yet loaded
    return C.X===x&&C.Y===y;
  });
}

function _teleport(a,C){
  const allSlots=a.tpSlots??[];
  if(!allSlots.length){_log('⚠️ Keine TP-Slots');return false;}
  // Find first free slot (respecting gueltig flag for return value)
  const ziel=allSlots.find(s=>!_istBesetzt(s.x,s.y,[C.MemberNumber]));
  if(!ziel){
    _log('⚠️ Alle TP-Slots belegt für '+C.Name);
    return false;
  }
  const si=allSlots.indexOf(ziel);
  ServerSend('ChatRoomChat',{
    Content:'ChatRoomMapViewTeleport',Type:'Hidden',
    Dictionary:[{Tag:'MapViewTeleport',Position:{X:ziel.x,Y:ziel.y}}],
    Target:C.MemberNumber,
  });
  _log('🌀 TP '+C.Name+' → X='+ziel.x+' Y='+ziel.y+(si>0?' [Fallback '+si+']':''));
  // Gültig-Flag: wenn Slot auf ❌ Fehler gesetzt → Aktion gilt als fehlgeschlagen
  const gueltig=ziel.gueltig??true;
  if(!gueltig)_log('⚠️ Slot '+si+' hat gueltig=false → gilt als Fehler');
  return gueltig;
}

// Tiefkopie eines Appearance-Items für Snapshot
function _snapItem(i){return{Asset:i.Asset,Group:i.Asset?.Group?.Name??'',Color:JSON.parse(JSON.stringify(i.Color??'#ffffff')),Craft:i.Craft??null,Property:JSON.parse(JSON.stringify(i.Property??{}))};}

// Nach InventoryWear: alle Items wiederherstellen die durch Block/Conflict entfernt wurden
// Ausnahme: der absichtlich geänderte Slot (targetGroup) wird nicht berührt
function _restoreDisplaced(C, snapshot, targetGroup){
  setTimeout(()=>{
    snapshot.forEach(snap=>{
      if(snap.Group===targetGroup)return; // dieser Slot wurde absichtlich geändert
      const stillThere=InventoryGet(C,snap.Group);
      if(!stillThere&&snap.Asset){
        // Item wurde durch InventoryWear verdrängt → wiederherstellen
        _log('♻️ Wiederherstellen: '+snap.Group+'/'+snap.Asset.Name+' (verdrängt durch '+targetGroup+')');
        try{
          InventoryWear(C,snap.Asset.Name,snap.Group,snap.Color,0,Player.MemberNumber,snap.Craft);
          const restored=InventoryGet(C,snap.Group);
          if(restored&&snap.Property&&Object.keys(snap.Property).length){
            restored.Property=snap.Property;
          }
        }catch(e){_log('⚠️ Wiederherstellen fehlgeschlagen für '+snap.Group+': '+e.message);}
      }
    });
    CharacterRefresh(C);ChatRoomCharacterUpdate(C);
  },150);
}

function _applyItemAction(a, C){
  try{
    // Snapshot ALLER aktuellen Items vor dem Anlegen
    const snapshot=(C.Appearance??[]).filter(i=>i.Asset?.Group?.Name).map(_snapItem);

    if(a.itemConfig){
      // Full Item Manager config: colors, TypeRecord, props, lock
      const ic=a.itemConfig;
      let col=ic.colors??['#ffffff'];
      if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
      // Sofort TypeRecord setzen (vor CharacterRefresh) damit BC es direkt übernimmt
      const itemNow=InventoryGet(C,ic.group);
      if(itemNow){
        itemNow.Color=col;
        itemNow.Property=itemNow.Property??{};
        if(ic.tr&&Object.keys(ic.tr).length){
          itemNow.Property.TypeRecord=ic.tr;
          itemNow.Property.Type=ic.typeStr??'';
        }
        if(ic.props)Object.assign(itemNow.Property,ic.props);
      }
      CharacterRefresh(C);
      ChatRoomCharacterUpdate(C);
      _restoreDisplaced(C,snapshot,ic.group);
      // Zweiter Sync nach _restoreDisplaced (stellt sicher dass TypeRecord + Lock erhalten bleibt)
      setTimeout(()=>{
        const item=InventoryGet(C,ic.group);
        if(!item){
          // Item wurde durch _restoreDisplaced verdrängt → nochmal anlegen
          InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
          const reItem=InventoryGet(C,ic.group);
          if(reItem){
            reItem.Property=reItem.Property??{};
            if(ic.tr&&Object.keys(ic.tr).length){reItem.Property.TypeRecord=ic.tr;reItem.Property.Type=ic.typeStr??'';}
            if(ic.props)Object.assign(reItem.Property,ic.props);
          }
        } else {
          // TypeRecord nochmal sicherstellen (könnte durch _restoreDisplaced verloren gegangen sein)
          item.Property=item.Property??{};
          if(ic.tr&&Object.keys(ic.tr).length){item.Property.TypeRecord=ic.tr;item.Property.Type=ic.typeStr??'';}
          if(ic.props)Object.assign(item.Property,ic.props);
        }
        // Schloss anlegen (nach TypeRecord-Sync)
        if(ic.lock){
          const BCX_L=['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
          const REL_L=['OwnerPadlock','LoversPadlock','MistressPadlock'];
          const isBcx=BCX_L.includes(ic.lock);
          const isRel=REL_L.includes(ic.lock);
          const lp=ic.lockParams??{};
          const lockAsset=isBcx
            ?(Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc')??Asset.find(a=>a.Name===ic.lock))
            :Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc');
          if(lockAsset){
            const itemForLock=InventoryGet(C,ic.group);
            if(itemForLock){
              InventoryLock(C,itemForLock,{Asset:lockAsset},Player.MemberNumber,true);
              itemForLock.Property=itemForLock.Property??{};
              if(lp.timer>0)   itemForLock.Property.RemoveTimer=Date.now()+lp.timer;
              if(lp.combo)     itemForLock.Property.CombinationNumber=lp.combo;
              if(lp.password)  itemForLock.Property.Password=lp.password;
              if(isRel){
                itemForLock.Property.LockMemberNumber=lp.relMember||Player.MemberNumber;
                if(lp.relTimer>0)itemForLock.Property.RemoveTimer=Date.now()+lp.relTimer;
              }
              CharacterRefresh(C);
              _log('🔒 Schloss angelegt: '+ic.lock+' auf '+ic.asset+' ('+C.Name+')');
            }
          } else {
            _log('⚠️ Schloss nicht gefunden: '+ic.lock);
          }
        }
        CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      },500);
    }else if(a.curseEntry){
      let col=a.curseEntry.Farbe;if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,a.curseEntry.ItemName,a.curseEntry.Gruppe,col,0,Player.MemberNumber,a.curseEntry.Craft);
      _restoreDisplaced(C,snapshot,a.curseEntry.Gruppe);
    }else if(a.profilName){
      var profilItems = a.profilItems ?? [];

      // Phase 0: Strip
      C.Appearance = C.Appearance.filter(function(item){
        if(!item||!item.Asset||!item.Asset.Group) return true;
        return item.Asset.Group.AllowNone === false;
      });

      // Phase 1: Alle InventoryWear synchron (kein CharacterRefresh dazwischen)
      profilItems.forEach(function(item){
        var col = item.colors ?? item.cfg?.Color ?? '#ffffff';
        if(typeof col==='string' && col.includes(',')) col = col.split(',');
        var craft = (item.craft && item.craft.Name) ? item.craft : null;
        InventoryWear(C, item.asset, item.group, col, 0, Player.MemberNumber, craft);
      });

      // Phase 2: Properties + Locks in einem einzigen setTimeout
      setTimeout(function(){
        profilItems.forEach(function(item){
          var worn = InventoryGet(C, item.group);
          if(!worn) return;
          worn.Property = worn.Property ?? {};

          // Alle Properties aus vollständigem Snapshot (außer LayerProperties/OverridePriority)
          if(item.property && typeof item.property === 'object'){
            Object.keys(item.property).forEach(function(k){
              if(k !== 'LayerProperties' && k !== 'OverridePriority') worn.Property[k] = item.property[k];
            });
          } else if(item.tr && typeof item.tr === 'object' && Object.keys(item.tr).length){
            worn.Property.TypeRecord = item.tr;
            worn.Property.Type = Object.entries(item.tr).map(function(e){return e[0]+e[1];}).join('');
          }

          // ExtendedItemInit für Variante
          try{ExtendedItemInit(C, worn, false, false);}catch(e){}

          // LayerProperties + OverridePriority NACH ExtendedItemInit
          var lp = (item.property && item.property.LayerProperties) || item.layerProperties;
          var op = (item.property && item.property.OverridePriority != null) ? item.property.OverridePriority : item.overridePriority;
          if(lp) worn.Property.LayerProperties = lp;
          if(op != null) worn.Property.OverridePriority = op;

          if(item.difficulty != null) worn.Difficulty = item.difficulty;

          var col = item.colors ?? '#ffffff';
          if(typeof col==='string' && col.includes(',')) col = col.split(',');
          worn.Color = col;
        });

        // Locks
        profilItems.forEach(function(item){
          if(!item.lock) return;
          var worn = InventoryGet(C, item.group);
          if(!worn) return;
          var BCX_LOCKS = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
          var lockAsset = BCX_LOCKS.includes(item.lock)
            ? (Asset.find(function(a){return a.Name===item.lock && a.Group?.Name==='ItemMisc';})
               ?? Asset.find(function(a){return a.Name===item.lock;}))
            : Asset.find(function(a){return a.Name===item.lock && a.Group?.Name==='ItemMisc';});
          if(lockAsset) InventoryLock(C, worn, {Asset:lockAsset}, item.lockMember||Player.MemberNumber, false);
        });

        // Phase 3: Ein einziger Refresh + Sync
        CharacterRefresh(C);
        ChatRoomCharacterUpdate(C);
      }, 600);
    }else if(a.item){
      InventoryWear(C,a.item,a.gruppe,a.farbe??'#ffffff',0,Player.MemberNumber);
      _restoreDisplaced(C,snapshot,a.gruppe);
    }
  }catch(ex){_log('item Fehler:',ex.message);}
}

// Führt eine einzelne Aktion aus; gibt true/false zurück (Erfolg)
function _execAct(a,C,vars){
  let ok=false;
  try{
    if(a.typ==='chat'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Chat'});ok=true;}
    else if(a.typ==='emote'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Emote'});ok=true;}
    else if(a.typ==='whisper'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Whisper',Target:C.MemberNumber});ok=true;}
    else if(a.typ==='item_entf'){const _entfGruppe=a.gruppe;InventoryRemove(C,_entfGruppe);CharacterRefresh(C);ChatRoomCharacterUpdate(C);_asUnregister(C,_entfGruppe);ok=true;}
    else if(a.typ==='item'){
      _applyItemAction(a,C);
      if(a.antiStrip)_asRegister(C,a);
      if(vars?.shopNostrip)_nsRegister(C,a);
      ok=true;
    }
    else if(a.typ==='teleport'){ok=_teleport(a,C);}
    else if(a.typ==='money'){
      const op=a.money_op??'add';
      const val=a.money_val??0;
      const delta=op==='add'?val:op==='sub'?-val:0;
      const setVal=op==='set'?val:op==='reset'?0:undefined;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
        memberNum:C.MemberNumber,name:C.Name,delta,setVal},'*');
      ok=true;
    }
    else if(a.typ==='rang'){
      const op=a.rang_op??'setzen';
      const defs=_cfg.rankDefs??[];
      const sorted=[...defs].sort((x,y)=>x.level-y.level);
      const currentRankId=_rangState[C.MemberNumber]??null;
      const curIdx=sorted.findIndex(r=>r.id===currentRankId);
      let newRankId=currentRankId;
      if(op==='setzen') newRankId=a.rang_id||null;
      else if(op==='entfernen') newRankId=null;
      else if(op==='naechster'){ if(curIdx<sorted.length-1) newRankId=sorted[curIdx+1].id; }
      else if(op==='vorheriger'){ if(curIdx>0) newRankId=sorted[curIdx-1].id; }
      _rangState[C.MemberNumber]=newRankId;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_RANG',
        memberNum:C.MemberNumber,name:C.Name,rankId:newRankId},'*');
      ok=true;
    }
    else ok=true;
  }catch(ex){_log('\u26A0 Aktion '+a.typ+' Fehler:',ex.message);ok=false;}
  // Dann / Sonst Nachrichten senden
  const msgField=ok?'dann_msg':'sonst_msg';
  const msgTypField=msgField+'_typ';
  const msgTyp=a[msgTypField]??'chat';
  const msgText=a[msgField];
  if(msgText&&msgTyp!=='nichts'){
    setTimeout(()=>{
      const txt=_tpl(msgText,vars);
      if(msgTyp==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
      else if(msgTyp==='emote')ServerSend('ChatRoomChat',{Content:txt,Type:'Emote'});
      else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    },200);
  }
  return ok;
}

// Aktionen sequenziell ausführen (Reihenfolge + bei_fehler)
function _runSeq(aktionen,C,vars,trigBase,onDone,onUngueltig){
  if(!aktionen.length){onDone();return;}
  const [a,...rest]=aktionen;
  setTimeout(()=>{
    // Ziel-Filter: welche Characters werden durch diese Aktion beeinflusst?
    const allChars=[Player,...(ChatRoomCharacter||[])];
    let targets;
    if(a.aktZiel==='alle'){
      targets=allChars;
    } else if(a.aktZiel==='whitelist'){
      const nrs=(a.aktZielNummern||[]).map(Number);
      targets=allChars.filter(ch=>nrs.includes(Number(ch.MemberNumber)));
    } else if(a.aktZiel==='shop_kaeufer'){
      // Zielt auf den Käufer (vars.shopBuyer), nicht das Kaufziel
      const buyerNum=vars.shopBuyer?.MemberNumber;
      const buyerChar=buyerNum?allChars.find(ch=>ch.MemberNumber===buyerNum):null;
      targets=buyerChar?[buyerChar]:[C];
    } else {
      targets=[C]; // 'ausloeser' / default
    }
    // Chat/Emote sind Broadcast-Nachrichten → nur 1x senden egal wieviele Ziele
    // Whisper, Item, Teleport, Money → pro Ziel ausführen
    let overallOk=true;
    if(['chat','emote'].includes(a.typ)&&targets.length>0){
      // Sende einmal mit Variablen des Auslösers
      const ok=_execAct(a,C,vars);
      if(!ok)overallOk=false;
    } else {
      targets.forEach(ch=>{
        const chVars=ch===C?vars:{...vars,name:ch.Name,x:ch.X??0,y:ch.Y??0,C:ch};
        const ok=_execAct(a,ch,chVars);
        if(!ok)overallOk=false;
      });
    }
    if(!overallOk){
      const bf=a.bei_fehler??'ignorieren';
      _log('\u26A0 Aktion '+a.typ+' fehlgeschlagen → '+bf);
      if(bf==='kette_stoppen'){onDone();return;}
      if(bf==='trigger_ungueltig'){onUngueltig();return;}
    }
    _runSeq(rest,C,vars,trigBase,onDone,onUngueltig);
  },a.delay??0);
}


// Sendet einen Log-Eintrag an den Tab im Index
// Sendet Log-Eintrag via PostMessage-Brücke zurück an das Popup
// ── Events Runtime ────────────────────────────────────────
const _evTimers={};
// NOTE: _evFiredCnt is declared above with persisted state
const _evState={}; // for interval state

function _okEv(ev,C,rohText,typKey){
  const beds=ev.bedingungen??[];
  if(!beds.length)return true;
  const cx=C.X??-999,cy=C.Y??-999;
  function checkOne(c){
    if(c.typ==='wort'){
      if(!rohText)return true; // no chat context → skip wort check (timer/interval)
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==typKey)return false;
      return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());
    }
    if(c.typ==='zone'){const p=c.puffer??1;return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;}
    if(c.typ==='zone_rect'){return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);}
    if(c.typ==='item_traegt'){return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='item_traegt_nicht'){return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
    if(c.typ==='rang'){
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;
      if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);
      const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef) return false;
      if(!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')   return cl===tl;
      if(op==='min') return cl>=tl;
      if(op==='max') return cl<=tl;
      return false;
    }
    return true;
  }
  const groups=[[]];
  for(const c of beds){
    if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);
    groups[groups.length-1].push(c);
  }
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

function _fireEv(ev){
  // Wiederholung check
  const cnt=_evFiredCnt[ev.id]??0;
  if(ev.wiederholung==='einmalig'&&cnt>=1){_log('⏭ Event "'+ev.name+'" bereits (1×)');return;}
  if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2)){_log('⏭ Event "'+ev.name+'" max erreicht');return;}

  // Targets
  const allChars=[Player,...(ChatRoomCharacter||[])];
  let targets=[];
  if(ev.ziel==='alle'){targets=allChars;}
  else if(ev.ziel==='liste'){targets=allChars.filter(C=>(ev.zielListe||[]).includes(C.MemberNumber));}
  else{// ausloeser / random
    const eligible=allChars.filter(C=>_okEv(ev,C,ev._rohText,ev._typKey));
    if(eligible.length)targets=[eligible[Math.floor(Math.random()*eligible.length)]];
  }
  if(!targets.length){_log('⚠️ Event "'+ev.name+'" – kein gültiges Ziel');return;}

  _log('⚡ Event "'+ev.name+'" → '+targets.length+' Ziel(e)');
  targets.forEach(C=>{
    if(!_okEv(ev,C,ev._rohText,ev._typKey)){_log('⏭ Event "'+ev.name+'" Bed. nicht erfüllt für '+C.Name);return;}
    const vars={name:C.Name,wort:ev._rohText||'',typ:'Event',x:C.X??0,y:C.Y??0,zone:'',C};
    _runSeq(ev.aktionen??[],C,vars,ev,
      ()=>{
        _evFiredCnt[ev.id]=(cnt+1);
        _log('✅ Event "'+ev.name+'" abgeschlossen für '+C.Name+' #'+_evFiredCnt[ev.id]);
        _pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});
      },
      ()=>{
        _log('❌ Event "'+ev.name+'" ungültig für '+C.Name);
        _pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});
        if(ev.fallbackTyp&&ev.fallbackTyp!=='nichts'&&ev.fallbackText){
          const typ={chat:'Chat',emote:'Emote'}[ev.fallbackTyp]??'Chat';
          ServerSend('ChatRoomChat',{Content:_tpl(ev.fallbackText,vars),Type:typ});
        }
      }
    );
  });
}

// Scheduling via condition types ev_timer / ev_interval
function _scheduleEv(ev){
  if(!ev.aktiv)return;
  const beds=ev.bedingungen??[];
  const timerC=beds.find(c=>c.typ==='ev_timer');
  const intC=beds.find(c=>c.typ==='ev_interval');
  if(timerC){
    const ms=(timerC.sek??10)*1000;
    _evTimers[ev.id+'_t']=setTimeout(()=>{
      _fireEv(ev);
    },ms);
  }
  if(intC){
    const lo=(intC.sek_min??20)*1000, hi=(intC.sek_max??60)*1000;
    const go=()=>{
      const cnt=_evFiredCnt[ev.id]??0;
      if(ev.wiederholung==='einmalig'&&cnt>=1)return;
      if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
      _fireEv(ev);
      _evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
    };
    _evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
  }
}

// Start alle aktiven Events die Timer/Interval haben
_evts.forEach(ev=>{if(ev.aktiv)_scheduleEv(ev);});
// ──────────────────────────────────────────────────────

function _pushLog(extra,vars,trig){
  const entry={
    ts:Date.now(),
    botId:'${safeId}',
    botName:'${safeName}',
    trigName:trig?.name??'?',
    trigId:trig?.id??'',
    player:(vars?.name??'?')+' #'+(vars?.C?.MemberNumber??'?'),
    memberNum:vars?.C?.MemberNumber,
    x:vars?.x??0,
    y:vars?.y??0,
    ...extra,
  };
  // Brücke: postMessage zurück an Popup (window.__BCK_popupRef = gespeichert in loader.js)
  try{
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_LOG',entry},'*');
  }catch(e){}
}

// Sendet roomEver ans Popup zur Persistenz
function _syncRoomEver(){
  try{
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_ROOM_EVER',botId:'${safeId}',members:[..._roomEver]},'*');
  }catch(e){}
}

function _run(trig,vars){
  const C=vars.C??Player;

  // ── Rejoin-Fenster: schließen wenn Nicht-Rejoin-Trigger feuert ──
  const _isRejoinTrig=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt'&&c.betritt_typ==='rejoin');
  if(!_isRejoinTrig && _rejoinWindow.has(C.MemberNumber)){
    const openedAt=_rejoinWindow.get(C.MemberNumber);
    if(Date.now()-openedAt >= _REJOIN_GRACE){
      _rejoinWindow.delete(C.MemberNumber);
      _log('\u{1F6AA} Rejoin-Fenster für #'+C.MemberNumber+' geschlossen (Nicht-Rejoin Trigger "'+trig.name+'")');
    } else {
      _log('\u{1F6AA} Rejoin-Gnadenfrist aktiv für #'+C.MemberNumber+' – Fenster noch '+((_REJOIN_GRACE-(Date.now()-openedAt))|0)+'ms offen');
    }
  }
  // Rejoin-Trigger: nur überspringen wenn Fenster geschlossen (nach Gnadenfrist)
  if(_isRejoinTrig && !_rejoinWindow.has(C.MemberNumber)){
    _log('\u23ED [Rejoin] "'+trig.name+'" – Fenster geschlossen (Gnadenfrist abgelaufen), übersprungen');
    return;
  }

  // ── Wiederholung prüfen ──────────────────────────────────
  const wdh=trig.wiederholung??'immer';
  const cnt=_firedCnt[trig.id]??0;
  if(wdh==='einmalig'&&cnt>=1){
    _log('⏭ "'+trig.name+'" bereits ausgelöst (1×)');
    _pushLog({status:'skip_wdh',msg:'1× bereits ausgelöst'},vars,trig);
    return;
  }
  if(wdh==='n_mal'&&cnt>=(trig.maxMal??2)){
    _log('⏭ "'+trig.name+'" max '+trig.maxMal+'× erreicht');
    _pushLog({status:'skip_max',msg:'Max '+trig.maxMal+'× erreicht'},vars,trig);
    return;
  }

  _log('\u{1F3AF} "'+trig.name+'" von '+vars.name+' | X='+vars.x+' Y='+vars.y+' | #'+(cnt+1)+(wdh==='n_mal'?' von '+trig.maxMal:''));

  // ── Aktionen sequenziell mit Basis-Delay starten ─────────
  setTimeout(()=>{
    // If/Else: Wenn ifElse aktiviert, wähle DANN oder SONST-Aktionen
    // Bedingungscheck wurde bereits durch _ok() bestätigt → Bedingungen = true → DANN
    // SONST wird nur ausgelöst wenn Bedingungen NICHT zutreffen – das passiert im Join/Item-Poll
    const aktionenToRun = trig.aktionen??[];
    _runSeq(
      aktionenToRun,C,vars,trig,
      // onDone – Trigger erfolgreich gezählt
      ()=>{
        const now=Date.now();
        _fired[trig.id]=now;
        _firedChar[trig.id+'_'+C.MemberNumber]=now;
        _firedCnt[trig.id]=(cnt+1);
        _log('\u2705 Trigger "'+trig.name+'" abgeschlossen #'+_firedCnt[trig.id]+(trig.charSpec?' [pro Spieler]':' [global]'));
        _pushLog({status:'ok'},vars,trig);
        _syncRoomEver();
      },
      // onUngueltig – eine Aktion hat ❌ Trigger ungültig ausgelöst
      ()=>{
        _log('\u274C Trigger "'+trig.name+'" ungültig – nicht gezählt');
        _pushLog({status:'ungueltig'},vars,trig);
        if(trig.fallbackTyp&&trig.fallbackTyp!=='nichts'&&trig.fallbackText){
          const typ={chat:'Chat',emote:'Emote'}[trig.fallbackTyp]??'Chat';
          ServerSend('ChatRoomChat',{Content:_tpl(trig.fallbackText,vars),Type:typ});
        }
      }
    );
  },trig.delay??0);
}

// ── If/Else SONST-Branch: läuft wenn Bedingungen NICHT zutreffen ──
function _runSonst(trig,vars){
  const C=vars.C??Player;
  _log('\u{1F504} [Else] "'+trig.name+'" → SONST-Aktionen f\u00fcr '+vars.name);
  setTimeout(()=>{
    _runSeq(
      trig.aktionen_sonst??[],C,vars,trig,
      ()=>{ _log('\u2705 [Else] "'+trig.name+'" SONST-Zweig abgeschlossen'); },
      ()=>{ _log('\u274C [Else] "'+trig.name+'" SONST-Zweig ungültig'); }
    );
  },trig.delay??0);
}

function _tpl(s,v){
  const cur=_shopCfg.moneyName||'Gold';
  return(s??'')
    .replace(/{name}/gi,v.name??'')
    .replace(/{wort}/gi,v.wort??'')
    .replace(/{typ}/gi,v.typ??'')
    .replace(/{x}/gi,v.x??'')
    .replace(/{y}/gi,v.y??'')
    .replace(/{zone}/gi,v.zone??'')
    .replace(/{käufer}/gi,v.shopBuyer?.Name??v.name??'')
    .replace(/{kaeufer}/gi,v.shopBuyer?.Name??v.name??'')
    .replace(/{ziel}/gi,v.C?.Name??v.name??'')
    .replace(/{item}/gi,v.shopItem?.name??'')
    .replace(/{preis}/gi,String(v.shopItem?.preis??''))
    .replace(/{waehrung}/gi,cur)
    .replace(/{kontostand}/gi,String((_moneyBalances[v.shopBuyer?.MemberNumber??v.C?.MemberNumber]?.balance)??0))
    .replace(/{anzahl}/gi,String(v.shopAnzahl??''))
    .replace(/{gesamt}/gi,String(v.shopGesamt??''));
}

// ── Shop-Befehl Parsing ───────────────────────────────
function _parseShopArgs(rest){
  // Parst gequotete und ungequotete Argumente + Flags (/w /u /nostrip)
  const args=[];
  const flags=new Set();
  // Normalisiere: alle Unicode-Slashes und Fancy-Quotes zu ASCII
  rest=rest.trim()
    .replace(/[\u2044\uFF0F\u2215]/g,'/')
    .replace(/[\u201C\u201D\u201E\u201F]/g,'"')
    .replace(/[\u2018\u2019\u201A\u201B]/g,"'");
  // Regex-basierte Flag-Extraktion VOR dem Argument-Parsen
  // Matcht /nostrip, /w, /u als eigenstaendige Tokens (case-insensitive)
  rest=rest.replace(/(?:^|\s)\/nostrip\b/gi,(_)=>{flags.add('nostrip');return '';});
  rest=rest.replace(/(?:^|\s)\/w\b/gi,(_)=>{flags.add('w');return '';});
  rest=rest.replace(/(?:^|\s)\/u\b/gi,(_)=>{flags.add('u');return '';});
  rest=rest.trim();
  // Jetzt nur noch Argumente parsen (Flags sind schon extrahiert)
  let pos=0;
  while(pos<rest.length){
    while(pos<rest.length&&rest[pos]===' ')pos++;
    if(pos>=rest.length)break;
    if(rest[pos]==='"'||rest[pos]==="'"){
      const q=rest[pos]; pos++;
      const end=rest.indexOf(q,pos);
      if(end===-1){args.push(rest.slice(pos));break;}
      args.push(rest.slice(pos,end)); pos=end+1;
    } else {
      const sp=rest.indexOf(' ',pos);
      if(sp===-1){args.push(rest.slice(pos));break;}
      args.push(rest.slice(pos,sp)); pos=sp+1;
    }
  }
  return {args:args.filter(a=>a.length>0),flags};
}

// ── Shop-Kauf Handler ────────────────────────────────────
// Hilfsfunktion: Template mit Shop-Variablen ersetzen (inline, ohne _tpl damit keine C-Abhängigkeit)
function _shopTpl(raw, buyerC, targetC, shopItem, preis, newBal, anzahl, gesamt){
  const cur=_shopCfg.moneyName||'Gold';
  return(raw||'')
    .replace(/{name}/gi,buyerC.Name)
    .replace(/{käufer}/gi,buyerC.Name)
    .replace(/{kaeufer}/gi,buyerC.Name)
    .replace(/{ziel}/gi,targetC?targetC.Name:'')
    .replace(/{item}/gi,shopItem.name)
    .replace(/{preis}/gi,String(preis))
    .replace(/{waehrung}/gi,cur)
    .replace(/{kontostand}/gi,String(newBal??0))
    .replace(/{anzahl}/gi,String(anzahl??''))
    .replace(/{gesamt}/gi,String(gesamt??''));
}

function _handleShopCmd(rohText,buyerC){
  const cmd=_shopCfg.cmd.trim();
  const rest=rohText.trim().slice(cmd.length);
  const {args,flags}=_parseShopArgs(rest);
  if(!args.length)return;

  const flagWhisper=flags.has('w');
  const flagUnknown=flags.has('u');
  const flagNostrip=flags.has('nostrip');

  // shopItem ZUERST – muss vor flagAufpreis stehen (sonst TDZ-ReferenceError!)
  const itemName=args[0].toLowerCase();
  const shopItem=_shopCfg.items.find(i=>i.name.toLowerCase()===itemName);
  if(!shopItem){ _log('🛒 Kein Artikel "'+args[0]+'"'); return; }

  const preisU      = flagUnknown ? (shopItem.preisU      ?? _shopCfg.preisU      ?? 0) : 0;
  const preisNostrip= flagNostrip ? (shopItem.preisNostrip ?? _shopCfg.preisNostrip ?? 0) : 0;
  const flagAufpreis= preisU + preisNostrip;
  const preis=Number(shopItem.preis)||0; // '' oder null → 0
  const cur=_shopCfg.moneyName||'Gold';
  const allChars=[Player,...(ChatRoomCharacter||[])];
  // Angezeigter Käufername (für öffentliche Nachrichten)
  const displayBuyer=flagUnknown?{Name:'Unbekannt',MemberNumber:buyerC.MemberNumber}:buyerC;

  // ── ALL-Kauf ──────────────────────────────────────────
  if(args[1]&&args[1].toLowerCase()==='all'){
    const targets=allChars.filter(c=>c.MemberNumber!==Player.MemberNumber);
    const anzahl=targets.length;
    if(anzahl===0){
      ServerSend('ChatRoomChat',{Content:'Niemand im Raum.',Type:'Whisper',Target:buyerC.MemberNumber});
      return;
    }
    const gesamt=(preis+flagAufpreis)*anzahl;
    const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;

    if(buyerBalance<gesamt){
      let aufpreisInfo='';
      if(flagAufpreis>0){
        const parts=[];
        if(preisU>0)      parts.push('/u: '+preisU+' '+cur);
        if(preisNostrip>0)parts.push('/nostrip: '+preisNostrip+' '+cur);
        aufpreisInfo=' (inkl. Flag-Aufpreis: '+parts.join(', ')+')';
      }
      const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benötigt: {gesamt} '+cur+' ('+anzahl+'×'+(preis+flagAufpreis)+')'+aufpreisInfo+'.');
      const msg=_shopTpl(rawMsg,buyerC,null,shopItem,preis+flagAufpreis,buyerBalance,anzahl,gesamt);
      ServerSend('ChatRoomChat',{Content:msg,Type:'Whisper',Target:buyerC.MemberNumber});
      _log('🛒 All-Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+', braucht '+gesamt+' ('+anzahl+'×'+(preis+flagAufpreis)+')');
      return;
    }

    // Coins abziehen
    if(!_moneyBalances[buyerC.MemberNumber])
      _moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
    _moneyBalances[buyerC.MemberNumber].balance-=gesamt;
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
      memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-gesamt},'*');

    const newBal=_moneyBalances[buyerC.MemberNumber].balance;
    _log('🛒 All-Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" für alle ('+anzahl+'×'+(preis+flagAufpreis)+'='+gesamt+' '+cur+'). Kontostand: '+newBal+(flagUnknown?' [/u]':'')+(flagWhisper?' [/w]':'')+(flagNostrip?' [/nostrip]':''));

    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',
      buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,
      targetNum:null,targetName:'Alle ('+anzahl+')',
      itemName:shopItem.name,preis:gesamt,isAll:true,anzahl},'*');

    // All-Ankündigung
    const rawAnnAll=shopItem.announceAllMsg||_shopCfg.announceAllMsg||
      (displayBuyer.Name+' kauft '+shopItem.icon+' '+shopItem.name+' für alle ('+anzahl+' Spieler, '+gesamt+' '+cur+').');
    // Bei All-Kauf: {preis} = Gesamtpreis (was bezahlt wurde), {gesamt} ebenfalls Gesamtpreis
    const annAllTxt=_shopTpl(rawAnnAll,displayBuyer,null,shopItem,gesamt,newBal,anzahl,gesamt);
    if(flagWhisper){
      // Als Whisper an alle Zielspieler
      targets.forEach(tc=>ServerSend('ChatRoomChat',{Content:annAllTxt,Type:'Whisper',Target:tc.MemberNumber}));
    } else {
      ServerSend('ChatRoomChat',{Content:annAllTxt,Type:'Chat'});
    }

    // Bestätigung an Käufer – {preis} = Gesamtpreis
    const rawConf=shopItem.confirmMsg||_shopCfg.confirmMsg||
      ('✅ Gekauft für alle '+anzahl+' Spieler. Bezahlt: '+gesamt+' '+cur+'. Kontostand: '+newBal+' '+cur+'.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawConf,buyerC,null,shopItem,gesamt,newBal,anzahl,gesamt),Type:'Whisper',Target:buyerC.MemberNumber});

    // FIX: nostrip – Zähler ob mindestens ein Trigger mit Item-Aktion gefeuert hat (einmalig für alle Targets)
    let _nsAllItemTrigFired=false;
    // Trigger für jeden Ziel-Spieler
    targets.forEach(targetC=>{
      const shopVars={name:buyerC.Name,wort:rohText,typ:'🛒 Shop All',x:buyerC.X??0,y:buyerC.Y??0,
        C:targetC,shopBuyer:buyerC,shopItem,shopAnzahl:anzahl,shopGesamt:gesamt,shopNostrip:flagNostrip};
      _trigs.forEach(trig=>{
        const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');
        if(!shopConds.length)return;
        const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);
        if(!itemMatch)return;
        const vonOk=(()=>{
          if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));
          return true;
        })();
        if(!vonOk)return;
        const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
        const otherOk=otherConds.every(c=>{
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const cid=_rangState[buyerC.MemberNumber]??null;
            if(op==='kein') return !cid;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const td=defs.find(r=>r.id===c.rang_id),cd=defs.find(r=>r.id===cid);
            if(!td||!cd) return false;
            if(op==='=') return cd.level===td.level;
            if(op==='min') return cd.level>=td.level;
            if(op==='max') return cd.level<=td.level;
          }
          return true;
        });
        if(!otherOk)return;
        // FIX: nostrip – prüfen ob dieser Trigger eine Item-Aktion hat
        if(flagNostrip&&(trig.aktionen??[]).some(a=>a.typ==='item'))_nsAllItemTrigFired=true;
        _run(trig,shopVars);
      });
    });
    // FIX: nostrip – einmalige Warnung wenn /nostrip aktiv aber kein Trigger mit Item-Aktion
    if(flagNostrip&&!_nsAllItemTrigFired){
      _log('\u26A0 /nostrip hat keinen Effekt (All-Kauf): Kein shop_kauf-Trigger mit Item-Aktion für "'+shopItem.name+'" gefunden.');
      ServerSend('ChatRoomChat',{Content:'\u26A0\uFE0F /nostrip hat keinen Effekt \u2013 es fehlt ein shop_kauf-Trigger mit Item-Aktion f\u00fcr diesen Artikel.',Type:'Whisper',Target:buyerC.MemberNumber});
    }
    return;
  }

  // ── Einzel-Kauf ───────────────────────────────────────
  let targetC=buyerC;

  if(args[1]){
    const arg2=args[1].trim();
    if(/^\d+$/.test(arg2)){
      const num=parseInt(arg2);
      targetC=allChars.find(c=>c.MemberNumber===num)||buyerC;
    } else {
      const nameMatches=allChars.filter(c=>c.Name.toLowerCase()===arg2.toLowerCase());
      if(nameMatches.length===1){
        targetC=nameMatches[0];
      } else if(nameMatches.length>1){
        const ids=nameMatches.map(c=>c.Name+' (#'+c.MemberNumber+')').join(', ');
        ServerSend('ChatRoomChat',{Content:'⚠️ Mehrere Spieler mit dem Namen "'+arg2+'". Bitte MemberNummer verwenden: '+ids,Type:'Whisper',Target:buyerC.MemberNumber});
        return;
      }
    }
  }

  const preisEffektiv = preis + flagAufpreis;
  const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;

  if(buyerBalance<preisEffektiv){
    let aufpreisInfo='';
    if(flagAufpreis>0){
      const parts=[];
      if(preisU>0)      parts.push('/u: '+preisU+' '+cur);
      if(preisNostrip>0)parts.push('/nostrip: '+preisNostrip+' '+cur);
      aufpreisInfo=' (inkl. '+parts.join(' + ')+')';
    }
    const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benötigt: {gesamt} '+cur+aufpreisInfo+'.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawMsg,buyerC,targetC,shopItem,preis,buyerBalance,1,preisEffektiv),Type:'Whisper',Target:buyerC.MemberNumber});
    _log('🛒 Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+' '+cur+', braucht '+preisEffektiv);
    return;
  }

  // Coins abziehen
  if(!_moneyBalances[buyerC.MemberNumber])
    _moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
  _moneyBalances[buyerC.MemberNumber].balance-=preisEffektiv;
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
    memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-preisEffektiv},'*');

  const newBal=_moneyBalances[buyerC.MemberNumber].balance;
  const isFremdkauf=targetC.MemberNumber!==buyerC.MemberNumber;
  _log('🛒 Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" für '+preisEffektiv+' '+cur+(isFremdkauf?' → Ziel: '+targetC.Name:'')+' | Kontostand: '+newBal+(flagUnknown?' [/u]':'')+(flagWhisper?' [/w]':'')+(flagNostrip?' [/nostrip]':''));

  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',
    buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,
    targetNum:targetC.MemberNumber,targetName:targetC.Name,
    itemName:shopItem.name,preis},'*');

  // Bestätigungs-Whisper an Käufer
  const rawConf=shopItem.confirmMsg||_shopCfg.confirmMsg||
    ('✅ '+(isFremdkauf?'Du kaufst '+shopItem.name+' für '+targetC.Name:shopItem.name+' gekauft')+'. Bezahlt: '+preisEffektiv+' '+cur+(flagNostrip?' 🔒 NoStrip':'')+'. Kontostand: '+newBal+' '+cur+'.');
  // {preis}=Basispreis, {gesamt}=Endpreis inkl. Flags
  ServerSend('ChatRoomChat',{Content:_shopTpl(rawConf,buyerC,targetC,shopItem,preis,newBal,1,preisEffektiv),Type:'Whisper',Target:buyerC.MemberNumber});

  // Fremdkauf-Ankündigung (nur wenn für anderen Spieler)
  if(isFremdkauf){
    const rawAnn=shopItem.announceMsg||_shopCfg.announceMsg||
      (displayBuyer.Name+' hat für '+targetC.Name+' das Item '+shopItem.icon+' '+shopItem.name+' gekauft'+(flagNostrip?' 🔒':'')+'.') ;
    const annTxt=_shopTpl(rawAnn,displayBuyer,targetC,shopItem,preis,newBal,1,preisEffektiv);
    if(flagWhisper){
      ServerSend('ChatRoomChat',{Content:annTxt,Type:'Whisper',Target:targetC.MemberNumber});
    } else {
      ServerSend('ChatRoomChat',{Content:annTxt,Type:'Chat'});
    }
  }

  // NoStrip-Ankündigung
  if(flagNostrip){
    const rawNs=shopItem.announceNostripMsg||_shopCfg.announceNostripMsg||
      ('🔒 '+targetC.Name+' trägt '+shopItem.icon+' '+shopItem.name+' und kann es nicht ablegen.');
    const nsTxt=_shopTpl(rawNs,displayBuyer,targetC,shopItem,preis,newBal,1,preisEffektiv);
    if(flagWhisper)ServerSend('ChatRoomChat',{Content:nsTxt,Type:'Whisper',Target:targetC.MemberNumber});
    else ServerSend('ChatRoomChat',{Content:nsTxt,Type:'Chat'});
  }
  // FIX C: nostrip – Zaehler ob ein Trigger mit Item-Aktion gefeuert hat
  let _nsItemTrigFired=false;
  // Shop-Trigger auslösen
  const shopVars={name:buyerC.Name,wort:rohText,typ:'🛒 Shop',x:buyerC.X??0,y:buyerC.Y??0,C:targetC,shopBuyer:buyerC,shopItem,shopNostrip:flagNostrip};
  _trigs.forEach(trig=>{
    const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');
    if(!shopConds.length)return;
    const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);
    if(!itemMatch)return;
    const vonOk=(()=>{
      if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;
      if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));
      return true;
    })();
    if(!vonOk)return;
    const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
    const otherOk=otherConds.every(c=>{
      if(c.typ==='rang'){
        const op=c.rang_op??'=';
        const currentId=_rangState[buyerC.MemberNumber]??null;
        if(op==='kein') return !currentId;
        if(!c.rang_id) return false;
        const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
        const td=defs.find(r=>r.id===c.rang_id);
        const cd=defs.find(r=>r.id===currentId);
        if(!td||!cd) return false;
        if(op==='=') return cd.level===td.level;
        if(op==='min') return cd.level>=td.level;
        if(op==='max') return cd.level<=td.level;
        return false;
      }
      return true;
    });
    if(!otherOk)return;
    // FIX C: pruefen ob dieser Trigger eine Item-Aktion hat
    if(flagNostrip&&(trig.aktionen??[]).some(a=>a.typ==='item'))_nsItemTrigFired=true;
    _run(trig,shopVars);
  });
  // FIX C: Warnung wenn /nostrip aktiv aber kein Trigger mit Item-Aktion
  if(flagNostrip&&!_nsItemTrigFired){
    _log('\u26A0 /nostrip hat keinen Effekt – es fehlt ein shop_kauf-Trigger mit Item-Aktion für diesen Artikel.');
    ServerSend('ChatRoomChat',{Content:'\u26A0 /nostrip hat keinen Effekt \u2013 es fehlt ein shop_kauf-Trigger mit Item-Aktion f\u00fcr diesen Artikel.',Type:'Whisper',Target:buyerC.MemberNumber});
  }
}

function _proc(rohText,typKey,C){
  if(!rohText)return;
  // Money query command
  const qCmd=(_moneyCfg?.queryCmd||'').trim().toLowerCase();
  if(qCmd&&rohText.trim().toLowerCase()===qCmd.toLowerCase()){
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_QUERY',memberNum:C.MemberNumber,name:C.Name},'*');
    return;
  }
  // Rang query command
  const rqCmd=(_cfg.rankQueryCmd||'').trim().toLowerCase();
  if(rqCmd&&rohText.trim().toLowerCase()===rqCmd.toLowerCase()){
    const defs=_cfg.rankDefs??[];
    const rankId=_rangState[C.MemberNumber]??null;
    const rank=defs.find(r=>r.id===rankId);
    const tpl=s=>s.replace(/{name}/gi,C.Name).replace(/{rang}/gi,rank?.name||'Kein Rang').replace(/{rang_icon}/gi,rank?.icon||'–').replace(/{rang_level}/gi,String(rank?.level||0));
    const txt=tpl(_cfg.rankQueryText||'{name} hat Rang: {rang_icon} {rang}');
    const typ=_cfg.rankQueryTyp||'whisper';
    if(typ==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
    else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    return;
  }
  // !shop Listen-Befehl
  const shopListCmd=(_shopCfg.listCmd||'').trim().toLowerCase();
  if(shopListCmd&&rohText.trim().toLowerCase()===shopListCmd){
    const cur=_shopCfg.moneyName||'Gold';
    const aktive=_shopCfg.items.filter(i=>i.aktiv!==false);
    if(!aktive.length){ServerSend('ChatRoomChat',{Content:'🛒 Noch keine Artikel.',Type:'Whisper',Target:C.MemberNumber});return;}
    const hdr='🛒 Shop ('+aktive.length+' Artikel):';
    const chunks=[];let buf=hdr;
    aktive.forEach(item=>{
      const ns=item.preisNostrip??_shopCfg.preisNostrip??0;
      const nsHint=ns>0?' (/nostrip +'+ns+')':(ns===0?'':'' );
      const line='\\n• '+(item.icon||'🛒')+' '+item.name+' – '+(Number(item.preis)||0)+' '+cur+nsHint;
      if((buf+line).length>480){chunks.push(buf);buf=line.slice(1);}else buf+=line;
    });
    chunks.push(buf);
    chunks.forEach((ch,i)=>setTimeout(()=>ServerSend('ChatRoomChat',{Content:ch,Type:'Whisper',Target:C.MemberNumber}),i*130));
    return;
  }
  // Shop Pay-Befehl
  const shopCmd=(_shopCfg.cmd||'').trim().toLowerCase();
  if(shopCmd&&rohText.trim().toLowerCase().startsWith(shopCmd+' ')||rohText.trim().toLowerCase()===shopCmd){
    _handleShopCmd(rohText,C);
    return;
  }
  const pos={X:C.X??0,Y:C.Y??0}; // direkt vom Character
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u{2728} Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _trigs.forEach(trig=>{
    // Trigger mit player_betritt -> nur Join-Poll, nie Nachrichten
    if((trig.bedingungen??[]).some(c=>c.typ==='player_betritt'))return;
    // Trigger mit item_traegt aber ohne wort -> nur Polling
    const hasItem=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt');
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    if(hasItem&&!hasWort)return;
    // Von-Filter: wer darf diesen Trigger auslösen?
    const vonOk=(()=>{
      if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
      if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
      return true; // 'alle'
    })();
    if(!vonOk)return;
    // Alle anderen: _ok prueft Auslöser-Bedingungen (wort, zone, vortrigger)
    const condOk=_ok(trig,rohText,typKey,C);
    if(condOk){
      // Auslöser passt → jetzt IF-Bedingungen prüfen (nur wenn ifElse aktiv und ifBedingungen vorhanden)
      const ifBeds=trig.ifBedingungen??[];
      const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,rohText,typKey,C);
      if(ifOk){
        _run(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
      } else if((trig.aktionen_sonst??[]).length){
        _runSonst(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
      }
    }
  });

  // ── Chat-Events prüfen ──
  _procEvents(rohText,typKey,C);
}

function _procEvents(rohText,typKey,C){
  // FIX: Define typLabel here so it's available whether called from _proc or directly from _msgH
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u{2728} Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _evts.forEach(ev=>{
    if(!ev.aktiv)return;
    // Chat-Events: brauchen wort-Bedingung und KEIN ev_timer/ev_interval
    // Von-Filter: wer darf das Event auslösen?
    const vonOk=(()=>{
      if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;
      if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===ev.vonNummer;
      return true; // 'alle'
    })();
    if(!vonOk)return;
    // Wort-Bedingungen prüfen
    const hasTimerBed=(ev.bedingungen??[]).some(c=>c.typ==='ev_timer'||c.typ==='ev_interval'||c.typ==='player_betritt');
    if(hasTimerBed)return; // Timer/Betritt-Events werden anders ausgelöst
    const wortConds=(ev.bedingungen??[]).filter(c=>c.typ==='wort');
    if(!wortConds.length)return;
    ev._rohText=rohText; ev._typKey=typKey; // temp context für _okEv
    if(_okEv(ev,C,rohText,typKey)){
      // Ziel bestimmen
      const allChars=[Player,...(ChatRoomCharacter||[])];
      let targets=[];
      if(ev.ziel==='alle')targets=allChars;
      else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));
      else targets=[C]; // ausloeser = der der schrieb
      _log('💬 Chat-Event "'+ev.name+'" von '+C.Name+' → '+targets.length+' Ziel(e)');
      targets.forEach(ch=>{
        const vars={name:ch.Name,wort:rohText,typ:typLabel,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
        // FIX: Read cnt inside callback to avoid all targets writing the same stale value
        const cntNow=_evFiredCnt[ev.id]??0;
        if(ev.wiederholung==='einmalig'&&cntNow>=1)return;
        if(ev.wiederholung==='n_mal'&&cntNow>=(ev.maxMal??2))return;
        _runSeq(ev.aktionen??[],ch,vars,ev,
          ()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
          ()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});}
        );
      });
    }
    delete ev._rohText; delete ev._typKey;
  });
}

// ── Item-Trägt Polling (edge-triggered: feuert 1x wenn Item erscheint) ──
const _itState={}; // 'memberNum_trigId_typ' -> bool
// FIX: 500ms is sufficient for item-state changes, 100ms caused unnecessary CPU load
const _itPoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const itemConds=(trig.bedingungen??[]).filter(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
    if(!itemConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    if(hasWort)return;
    chars.forEach(C=>{
      // Check positive (traegt) and negative (traegt_nicht) conditions
      const condMet=itemConds.every(c=>{
        const worn=(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
        return c.typ==='item_traegt_nicht'?!worn:worn;
      });
      const key=C.MemberNumber+'_'+trig.id;
      const was=_itState[key]??false;
      if(condMet&&!was){
        const pos={X:C.X??0,Y:C.Y??0};
        // Von-Filter
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='item_traegt'||c.typ==='item_traegt_nicht')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(otherOk){
          const ifBeds=trig.ifBedingungen??[];
          const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'','item',C);
          if(ifOk) _run(trig,{name:C.Name,wort:'',typ:'Item',x:pos.X,y:pos.Y,zone:'',C});
          else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:'Item',x:pos.X,y:pos.Y,zone:'',C});
        }
      }
      _itState[key]=condMet;
    });
  });
},500);

// ── Spieler-Betritt Polling (feuert 1x beim Betreten) ──
const _roomPrev=new Set((ChatRoomCharacter||[]).map(c=>c.MemberNumber));
// _roomEver is now part of persisted state (declared above)
const _joinPoll=setInterval(()=>{
  const chars=ChatRoomCharacter||[];
  const cur=new Set(chars.map(c=>c.MemberNumber));

  // Spieler verlassen → nur loggen; _firedChar bleibt erhalten damit Rejoin-Vortrigger noch greifen
  for(const prevNum of _roomPrev){
    if(!cur.has(prevNum)){
      _log('\u{1F6AA} #'+prevNum+' verlassen');
      _rejoinWindow.delete(prevNum); // Fenster beim Verlassen schließen (Map)
      _pushLog({status:'leave', trigName:'Verlassen', trigId:'__system__',
        player:'#'+prevNum, memberNum:prevNum, x:0, y:0, msg:'Raum verlassen'}, {name:'#'+prevNum,x:0,y:0,C:{MemberNumber:prevNum}}, {name:'System',id:'__system__'});
      // _zoneState zurücksetzen (Spieler nicht mehr im Raum)
      for(const k of Object.keys(_zoneState)){
        if(k.startsWith(prevNum+'_'))delete _zoneState[k];
      }
      // _firedChar nur bei Triggern mit resetOnLeave=true zurücksetzen
      _trigs.forEach(trig=>{
        if(trig.charSpec&&trig.resetOnLeave){
          delete _firedChar[trig.id+'_'+prevNum];
          _log('\u{1F504} State von "'+trig.name+'" für #'+prevNum+' zurückgesetzt');
        }
      });
    }
  }

  for(const C of chars){
    if(!_roomPrev.has(C.MemberNumber)){
      const istNeu=!_roomEver.has(C.MemberNumber);
      const label=istNeu?'\u{1F195} Neu':'\u{1F504} Rejoin';
      _log(label+': '+C.Name+' #'+C.MemberNumber);
      _pushLog({status:istNeu?'join':'join_rejoin',trigName:'',msg:istNeu?'Erstes Mal':'Rejoin'},
        {name:C.Name+' #'+C.MemberNumber,x:C.X??0,y:C.Y??0,C},{id:'__system__',name:'System'});
      // Neuer Spieler → Money-Init (nur Erstes Mal, nicht bei Rejoin)
      if(istNeu){
        window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_INIT_NEW',memberNum:C.MemberNumber,name:C.Name},'*');
      }
      // Rang-Init: Spieler registrieren (kein Rang) – bei Rejoin nur Name aktualisieren
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'RANG_INIT',memberNum:C.MemberNumber,name:C.Name},'*');
      _roomEver.add(C.MemberNumber);
      _syncRoomEver();
      // ── Rejoin-Fenster öffnen (nur bei echtem Rejoin) ──
      if(!istNeu) _rejoinWindow.set(C.MemberNumber, Date.now());
      // Auto-close window after grace period
      if(!istNeu) setTimeout(()=>{ _rejoinWindow.delete(C.MemberNumber); _log('\u{1F6AA} Rejoin-Fenster für #'+C.MemberNumber+' automatisch geschlossen (1s)'); },_REJOIN_GRACE);

      // ── Alle passenden Trigger sammeln (Rejoin separat) ──
      const pos={X:C.X??0,Y:C.Y??0};
      const rejoinBatch=[]; // Rejoin-Trigger: alle sammeln, dann zusammen feuern
      _trigs.forEach(trig=>{
        const bConds=(trig.bedingungen??[]).filter(c=>c.typ==='player_betritt');
        if(!bConds.length)return;
        const isRejoinTrig=bConds.some(c=>c.betritt_typ==='rejoin');
        const bOk=bConds.every(c=>{
          const bt=c.betritt_typ??'alle';
          if(bt==='neu')return istNeu;
          if(bt==='rejoin')return!istNeu;
          return true;
        });
        if(!bOk)return;
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){
            // Rejoin-Trigger blockieren sich NICHT gegenseitig:
            // trigger_war auf anderen Rejoin-Trigger → immer true (feuern zusammen)
            if(isRejoinTrig){
              const refTrig=_trigMap[c.trigId];
              const refIsRejoin=(refTrig?.bedingungen??[]).some(bc=>bc.typ==='player_betritt'&&bc.betritt_typ==='rejoin');
              if(refIsRejoin)return true;
            }
            const ref=_trigMap[c.trigId];
            return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
          }
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(!otherOk)return;
        if(isRejoinTrig){
          rejoinBatch.push(trig); // Rejoin: gesammelt feuern
        } else {
          const ifBeds=trig.ifBedingungen??[];
          const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);
          if(ifOk) _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
          else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
        }
      });
      // ── Betritt-Events feuern (Events mit player_betritt Bedingung) ──
      _evts.forEach(ev=>{
        if(!ev.aktiv)return;
        const betrittConds=(ev.bedingungen??[]).filter(c=>c.typ==='player_betritt');
        if(!betrittConds.length)return;
        // betritt_typ Filter
        const bOk=betrittConds.every(c=>{
          const bt=c.betritt_typ??'alle';
          if(bt==='neu')return istNeu;
          if(bt==='rejoin')return!istNeu;
          return true;
        });
        if(!bOk)return;
        // Von-Filter: wer darf das Event auslösen (= wer muss der Beitretende sein)?
        const vonOk=(()=>{
          if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===+ev.vonNummer;
          return true; // 'alle' → jeder
        })();
        if(!vonOk)return;
        // Weitere Bedingungen prüfen (z.B. Rang) – player_betritt wurde bereits oben geprüft
        const evOtherOk=(ev.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(!evOtherOk)return;
        const evVars={name:C.Name,wort:'',typ:label,x:C.X??0,y:C.Y??0,zone:'',C};
        const allChars=[Player,...(ChatRoomCharacter||[])];
        let targets=[];
        if(ev.ziel==='alle')targets=allChars;
        else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));
        else targets=[C]; // ausloeser = der beitretende Spieler
        const cnt=_evFiredCnt[ev.id]??0;
        if(ev.wiederholung==='einmalig'&&cnt>=1)return;
        if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
        targets.forEach(ch=>{
          const vars={name:ch.Name,wort:'',typ:label,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
          // FIX: Read cnt inside callback so each target increments independently
          _runSeq(ev.aktionen??[],ch,vars,ev,
            ()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
            ()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});}
          );
        });
      });

      // Alle Rejoin-Trigger feuern (keine gegenseitige Blockade)
      // Trigger MIT Item-Bedingungen: verzögert – BC-Appearance ist beim Join noch nicht geladen
      // Trigger OHNE Item-Bedingungen: sofort
      const ITEM_SYNC_DELAY = 800; // ms warten bis BC Appearance synchronisiert hat
      rejoinBatch.forEach(trig=>{
        const hasItemCond=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
        if(hasItemCond){
          // Verzögert feuern + Bedingung nochmal prüfen mit frischen Daten
          setTimeout(()=>{
            if(!_rejoinWindow.has(C.MemberNumber)){
              _log('⏭ [Rejoin] "'+trig.name+'" – Fenster geschlossen vor Appearance-Sync');
              return;
            }
            // Frische Appearance-Daten aus ChatRoomCharacter holen
            const Cfresh=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
            // Item-Bedingungen nochmal prüfen
            const itemOk=(trig.bedingungen??[]).every(c=>{
              if(c.typ==='item_traegt')return(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);
              if(c.typ==='item_traegt_nicht')return!(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);
              return true;
            });
            if(!itemOk){
              _log('⏭ [Rejoin] "'+trig.name+'" – Item-Bedingung nach Sync nicht erfüllt (Appearance jetzt geladen)');
              return;
            }
            const ifBedsR=trig.ifBedingungen??[];
            const ifOkR=!trig.ifElse||!ifBedsR.length||_okIf(trig,'',null,Cfresh);
            if(ifOkR) _run(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
            else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
          }, ITEM_SYNC_DELAY);
        } else {
          const ifBeds=trig.ifBedingungen??[];
          const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);
          if(ifOk) _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
          else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
        }
      });
    }
  }
  _roomPrev.clear();
  for(const n of cur)_roomPrev.add(n);
},100);

// ── Zonen-Betreten Polling – direkt C.X/C.Y (wie ZoneMonitor-Pattern) ──
const _zoneState={}; // 'memberNum_trigId' -> bool (war zuletzt drin)
// FIX: 500ms is sufficient for zone detection, 100ms caused unnecessary CPU load
const _zonePoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const zoneConds=(trig.bedingungen??[]).filter(c=>c.typ==='zone'||c.typ==='zone_rect');
    if(!zoneConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    const hasBetritt=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt');
    if(hasWort||hasBetritt)return;
    chars.forEach(C=>{
      if(!C)return;
      // Direkt C.X / C.Y – kein _getPos Umweg nötig
      const cx=C.X??-999, cy=C.Y??-999;
      const inZone=zoneConds.every(c=>{
        if(c.typ==='zone_rect')return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
        const p=c.puffer??1;
        return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
      });
      const key=C.MemberNumber+'_'+trig.id;
      const war=_zoneState[key]??false;
      if(inZone&&!war){
        // Prüfe andere Bedingungen (vortrigger, item_traegt)
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='zone'||c.typ==='zone_rect')return true;
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='item_traegt')return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='item_traegt_nicht')return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(otherOk){
          _log('\u{1F4CD} Zone: '+C.Name+' X='+cx+' Y='+cy+' \u2192 "'+trig.name+'"');
          _run(trig,{name:C.Name,wort:'',typ:'\u{1F4CD} Zone',x:cx,y:cy,zone:'',C});
        }
      }
      _zoneState[key]=inZone;
    });
  });
},500);

// ── NoStrip Polling (500ms) ─────────────────────────────────
// Prueft ob /nostrip-Items noch vorhanden sind. Wenn entfernt → sofort re-equip.
// Unabhaengig vom ChatRoomMessage-Listener – funktioniert bei JEDER Art von Entfernung.
const _nsPoll=setInterval(()=>{
  const keys=Object.keys(_nsWatchers);
  if(!keys.length)return;
  const allChars=[Player,...(ChatRoomCharacter||[])];
  for(let i=0;i<keys.length;i++){
    (function(w){
      let C=null;
      for(let ci=0;ci<allChars.length;ci++){
        if(allChars[ci].MemberNumber===w.memberNum){C=allChars[ci];break;}
      }
      if(!C)return;
      const item=(typeof InventoryGet==='function')?InventoryGet(C,w.gruppe):null;
      if(item)return; // Item noch da – alles ok
      _log('\u{1F512} NoStrip: '+w.gruppe+' entfernt bei '+C.Name+' \u2192 lege sofort wieder an...');
      try{
        if(w.itemConfig){
          const ic=w.itemConfig;
          let col=ic.colors||['#ffffff'];
          if(typeof col==='string'&&col.includes(','))col=col.split(',');
          InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft||null);
          const itemNow=InventoryGet(C,ic.group);
          if(itemNow){
            itemNow.Color=col;
            itemNow.Property=itemNow.Property||{};
            if(ic.tr&&Object.keys(ic.tr).length){
              itemNow.Property.TypeRecord=ic.tr;
              itemNow.Property.Type=ic.typeStr||'';
            }
            if(ic.props)Object.assign(itemNow.Property,ic.props);
          }
        }else if(w.curseEntry){
          let col2=w.curseEntry.Farbe;
          if(typeof col2==='string'&&col2.includes(','))col2=col2.split(',');
          InventoryWear(C,w.curseEntry.ItemName,w.curseEntry.Gruppe,
            col2,0,Player.MemberNumber,w.curseEntry.Craft||null);
        }else if(w.ersatz){
          InventoryWear(C,w.ersatz,w.gruppe,w.farbe||'#ffffff',0,Player.MemberNumber);
        }else{
          _log('\u26A0 NoStrip: kein Item-Config fuer '+w.gruppe);
          return;
        }
        CharacterRefresh(C);ChatRoomCharacterUpdate(C);
        _log('\u2705 NoStrip: '+(w.ersatz||w.itemConfig?.asset||'Item')+' wieder angelegt auf '+C.Name);
      }catch(ex){
        _log('\u26A0 NoStrip Re-Equip Fehler: '+ex.message);
      }
    })(_nsWatchers[keys[i]]);
  }
},500);
// ─────────────────────────────────────────────────────────────

// Eigene Nachrichten via hookFunction – Mod bekommt unique Namen (Timestamp) um Kollisionen beim Live-Sync zu vermeiden
let _mod = null;
try {
  const _modName = 'BCBot_${safeId}_' + Date.now();
  _mod = bcModSdk.registerMod({name: _modName, fullName:'${safeName}', version:'1.0'});
  _mod.hookFunction('ChatRoomSendChat', 0, (args, next) => {
    // BC löscht InputChat.value vor dem Hook → args[0].Content ist zuverlässiger
    const msgData = args[0];
    const raw = (typeof msgData === 'object' ? msgData?.Content : null)
             ?? document.getElementById('InputChat')?.value?.trim()
             ?? '';
    if (raw) {
      const msgType = (typeof msgData === 'object' ? msgData?.Type : null) ?? '';
      const isE = msgType === 'Emote' || (!msgType && raw.startsWith('*') && raw.endsWith('*'));
      const isW = msgType === 'Whisper' || (!msgType && (raw.startsWith('/w ') || raw.startsWith('/whisper ')));
      const tk = isE ? 'emote' : isW ? 'whisper' : 'chat';
      const hearOk=(_cfg.hearChat && tk==='chat')||(_cfg.hearEmote && tk==='emote')||(_cfg.hearWhisper && tk==='whisper');
      if(hearOk)_proc(raw,tk,Player);
      else _procEvents(raw,tk,Player); // Events immer prüfen
    }
    return next(args);
  });
  _log('✅ hookFunction aktiv');
} catch(hookErr) {
  _log('⚠️ hookFunction nicht verfügbar (eigene Nachrichten via Socket):', hookErr.message);
  // Fallback: eigene Nachrichten via ServerSocket mitschneiden
  // BC sendet keine eigenen Nachrichten zurück, daher InputChat-Observer als Alternative
  const _origSend = window.ServerSend;
  if (typeof _origSend === 'function') {
    window.__BCBot_origSend_${safeId} = _origSend;
    window.ServerSend = function(channel, data, ...rest) {
      if (channel === 'ChatRoomChat' && data?.Content && ['Chat','Emote','Whisper'].includes(data?.Type ?? 'Chat')) {
        const tk = (data.Type||'Chat').toLowerCase();
        const ssHearOk=(_cfg.hearChat&&tk==='chat')||(_cfg.hearEmote&&tk==='emote')||(_cfg.hearWhisper&&tk==='whisper');
        // FIX: removed redundant double-check of ssHearOk inside the already-matching if-block
        setTimeout(() => { if(ssHearOk)_proc(data.Content,tk,Player); else _procEvents(data.Content,tk,Player); }, 0);
      }
      return _origSend.call(this, channel, data, ...rest);
    };
  }
}

// ── ServerSocket: alle Spieler im Raum (IMMER aktiv, unabhaengig von nurEigene) ──
// Eigene Nachrichten kommen NICHT via Socket zurueck – die kommen via hookFunction
// ── AntiStrip Listener ──────────────────────────────────────
_asH = function(data) {
  if (!data || data.Type !== 'Action') return;
  var txt = JSON.stringify(data);
  if (txt.indexOf('ItemRemove') === -1 && txt.indexOf('ActionRemove') === -1) return;
  // Sender ermitteln – Bot selbst? → kein AntiStrip
  var sender = null;
  if (Array.isArray(data.Dictionary)) {
    for (var _di = 0; _di < data.Dictionary.length; _di++) {
      if (data.Dictionary[_di].SourceCharacter != null) {
        sender = data.Dictionary[_di].SourceCharacter; break;
      }
    }
  }
  if (sender === null) sender = data.Sender;
  if (sender === Player.MemberNumber) return;
  // Alle aktiven Watcher durchgehen
  var _keys = Object.keys(_asWatchers);
  for (var _wi = 0; _wi < _keys.length; _wi++) {
    (function(w) {
      var allChars = [Player].concat(ChatRoomCharacter || []);
      var C = null;
      for (var _ci = 0; _ci < allChars.length; _ci++) {
        if (allChars[_ci].MemberNumber === w.memberNum) { C = allChars[_ci]; break; }
      }
      if (!C) return;
      var item = (typeof InventoryGet === 'function') ? InventoryGet(C, w.gruppe) : null;
      if (item) return; // Slot noch besetzt
      _log('\u{1F6E1}\uFE0F AntiStrip: ' + w.gruppe + ' leer bei ' + C.Name + ' \u2192 lege wieder an...');
      setTimeout(function() {
        try {
          if (w.itemConfig) {
            var ic = w.itemConfig;
            var col = ic.colors || ['#ffffff'];
            if (typeof col === 'string' && col.indexOf(',') !== -1) col = col.split(',');
            InventoryWear(C, ic.asset, ic.group, col, 0, Player.MemberNumber, ic.craft || null);
            var itemNow = InventoryGet(C, ic.group);
            if (itemNow) {
              itemNow.Color = col;
              itemNow.Property = itemNow.Property || {};
              if (ic.tr && Object.keys(ic.tr).length) {
                itemNow.Property.TypeRecord = ic.tr;
                itemNow.Property.Type = ic.typeStr || '';
              }
              if (ic.props) Object.assign(itemNow.Property, ic.props);
            }
          } else if (w.curseEntry) {
            var col2 = w.curseEntry.Farbe;
            if (typeof col2 === 'string' && col2.indexOf(',') !== -1) col2 = col2.split(',');
            InventoryWear(C, w.curseEntry.ItemName, w.curseEntry.Gruppe,
              col2, 0, Player.MemberNumber, w.curseEntry.Craft || null);
          } else if (w.ersatz) {
            InventoryWear(C, w.ersatz, w.gruppe, w.farbe || '#ffffff', 0, Player.MemberNumber);
          } else {
            _log('\u26A0 AntiStrip: kein Ersatz konfiguriert f\u00fcr ' + w.gruppe);
            return;
          }
          CharacterRefresh(C);
          ChatRoomCharacterUpdate(C);
          _log('\u2705 AntiStrip: ' + (w.ersatz || 'Item') + ' wieder angelegt auf ' + C.Name);
        } catch(ex) {
          _log('\u26A0 AntiStrip Fehler: ' + ex.message);
        }
      }, w.delay != null ? w.delay : 500);
    })(_asWatchers[_keys[_wi]]);
  }
};
ServerSocket.on('ChatRoomMessage', _asH);
// ─────────────────────────────────────────────────────────────

const _msgH=function(data){
  if(!['Chat','Emote','Whisper'].includes(data.Type))return;
  if(data.Sender===Player.MemberNumber)return; // eigene via hookFunction abgefangen
  const tk=data.Type.toLowerCase();
  const C=ChatRoomCharacter.find(c=>c.MemberNumber===data.Sender)
        ??(Player.MemberNumber===data.Sender?Player:null);
  if(!C)return;
  // Trigger: nur wenn hear* aktiv; Events: immer (eigene Einstellung via Von-Filter)
  const hearOk=(tk==='chat'&&_cfg.hearChat)||(tk==='emote'&&_cfg.hearEmote)||(tk==='whisper'&&_cfg.hearWhisper);
  if(hearOk)_proc(data.Content,tk,C);
  else _procEvents(data.Content,tk,C); // Events trotzdem prüfen
};
ServerSocket.on('ChatRoomMessage',_msgH);

window['_BCBot_'+_BID]={
  stop(){
    clearInterval(_itPoll);
    clearInterval(_joinPoll);
    clearInterval(_zonePoll);
    clearInterval(_nsPoll);
    try{ if(_mod) _mod.removePatches(); } catch(e){}
    // Restore ServerSend if we patched it as fallback
    if(window.__BCBot_origSend_${safeId}) {
      window.ServerSend = window.__BCBot_origSend_${safeId};
      delete window.__BCBot_origSend_${safeId};
    }
    if(_asH)  ServerSocket.off('ChatRoomMessage',_asH);
    if(_msgH) ServerSocket.off('ChatRoomMessage',_msgH);
    // Events timer stoppen
    Object.values(_evTimers).forEach(h=>clearTimeout(h)); // clears both _t and _i timers
    delete window['_BCBot_'+_BID];
    // State im window-Objekt + localStorage sichern (überlebt Page-Reload)
    window[_stateKey].roomEver=[..._roomEver];
    try{
      const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');
      ls['${safeId}']={
        fired:_fired, firedCnt:_firedCnt,
        firedChar:_firedChar, roomEver:[..._roomEver],
        evFiredCnt:_evFiredCnt,
        ts:Date.now()
      };
      localStorage.setItem('__BCKBotStates',JSON.stringify(ls));
    }catch(e){}
    console.log('\u23F9\uFE0F [Bot:${safeName}] v'+_VER+' gestoppt | States gesichert (Mem+LS)');
  },
  // Sofortiges Event feuern (ignoriert Timer/Wiederholung-Check)
  fireEventNow(eid){
    const ev=_evts.find(e=>e.id===eid);
    if(!ev){console.warn('[Bot] Event nicht gefunden:',eid);return;}
    _log('▶️ Sofort feuern: "'+ev.name+'"');
    // Temporär Wiederholung ignorieren
    const savedWdh=ev.wiederholung;
    ev.wiederholung='immer';
    _fireEv(ev);
    ev.wiederholung=savedWdh;
  },
  // Kompatibilität
  fireEvent(eid){this.fireEventNow(eid);},
  // Manuelles State-Reset (z.B. aus der Konsole: window['_BCBot_...'].clearState())
  clearState(){
    window[_stateKey]={fired:{},firedCnt:{},firedChar:{},roomEver:[],evFiredCnt:{}};
    try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');delete ls['${safeId}'];localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}
    Object.keys(_fired).forEach(k=>delete _fired[k]);
    Object.keys(_firedCnt).forEach(k=>delete _firedCnt[k]);
    Object.keys(_firedChar).forEach(k=>delete _firedChar[k]);
    Object.keys(_evFiredCnt).forEach(k=>delete _evFiredCnt[k]);
    _roomEver.clear();
    console.log('\u{1F9F9} [Bot:${safeName}] States zurückgesetzt (Mem+LS)');
  }
};
console.log('\u25B6\uFE0F [Bot:${safeName}] v'+_VER+' | Trigger:',_trigs.length,'| Modus:',_cfg.nurEigene?'Nur eigene':'Alle Spieler');
})();`;
}

function botDeployById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  const _code = _buildBotCode(b);
  // Base64-kodiert senden → kein Sonderzeichen kann den Übertragungsweg brechen
  // BC-Seite: new Function(decodeURIComponent(escape(atob(encoded))))()
  const _encoded = btoa(unescape(encodeURIComponent(_code)));
  const _wrapper = `(new Function(decodeURIComponent(escape(atob('${_encoded}'))))())`;
  bcSend({ type:'EXEC', code: _wrapper });
  b.laufend = true; _saveBots(); renderBotList();
  if (_selBotId === id) {
    const bar = document.getElementById('bot-status-bar');
    if (bar) { bar.className='bot-status running'; bar.textContent='▶️ Bot "'+b.name+'" läuft'; }
    // Re-render topbar button
    renderBotEditor();
  }
  showStatus('▶️ Bot "'+b.name+'" gestartet!','success');
}

function botStopById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });
  b.laufend = false; _saveBots(); renderBotList();
  if (_selBotId === id) renderBotEditor();
  showStatus('⏹ Bot "'+b.name+'" gestoppt','success');
}

function botDeploy() { const b=_selBot(); if(b) botDeployById(b.id); }
function botStop()   { const b=_selBot(); if(b) botStopById(b.id);   }

function botSync() {
  const b = _selBot();
  if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  if (!b.laufend)  { showStatus('ℹ️ Bot läuft nicht – einfach Starten klicken', 'info'); return; }

  const btn = document.getElementById('syncBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sync…'; }

  // Step 1: Stop
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });

  // Step 2: After stop delay, redeploy with latest saved config
  setTimeout(() => {
    const latest = _selBot();
    if (!latest) return;
    bcSend({ type:'EXEC', code: _buildBotCode(latest) });
    latest.laufend = true; _saveBots(); renderBotList(); renderBotEditor();
    showStatus('✅ Bot synchronisiert und neu gestartet', 'success');
  }, 700);
}