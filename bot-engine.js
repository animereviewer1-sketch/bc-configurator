// ── Deploy ────────────────────────────────────────────────────
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
  const persistedRoomEver = (() => {
    const logs = window._BCBotLog || [];
    const botLogs = logs.filter(e => e.botId === bot.id && (e.status==='join'||e.status==='join_rejoin'||e.status==='leave'));
    botLogs.sort((a,b) => a.ts - b.ts);
    const ever = new Set();
    botLogs.forEach(e => {
      if (e.status === 'join' || e.status === 'join_rejoin') ever.add(e.memberNum);
    });
    return [...ever];
  })();
  const roomEverJson = JSON.stringify(persistedRoomEver);

  return `(function(){
const _BID='${safeId}';
if(window['_BCBot_'+_BID]){console.warn('[Bot] Bereits aktiv - erst stoppen!');return;}
// == AntiStrip ================================================
var _asWatchers = {};
var _asH        = null;
function _asRegister(C, a) {
  var gruppe = (a.antiStrip_itemConfig && a.antiStrip_itemConfig.group)
    || (a.itemConfig && a.itemConfig.group)
    || (a.antiStrip_curseEntry && a.antiStrip_curseEntry.Gruppe)
    || (a.curseEntry && a.curseEntry.Gruppe)
    || a.antiStrip_gruppe
    || a.gruppe || '';
  if (!gruppe) { _log('\u26A0 AntiStrip: Gruppe nicht erkannt'); return; }
  var key = C.MemberNumber + '_' + gruppe;
  // FIX: itemConfig Fallback (Shop /nostrip nutzt a.itemConfig, nicht antiStrip_itemConfig)
  var _icFinal = a.antiStrip_itemConfig || a.itemConfig || null;
  var _ceF     = a.antiStrip_curseEntry || null;
  var _logItem = (_icFinal && _icFinal.asset) || (_ceF && _ceF.ItemName)
    || a.antiStrip_ersatz || a.item || '?';
  _asWatchers[key] = {
    memberNum:  C.MemberNumber,
    gruppe:     gruppe,
    delay:      a.antiStrip_delay != null ? a.antiStrip_delay : 500,
    ersatz:     a.antiStrip_ersatz     || null,
    farbe:      a.antiStrip_farbe      || '#ffffff',
    itemConfig: _icFinal,
    curseEntry: _ceF,
    nostrip:    !!(a._isShopNostrip),
  };
  _log('\u{1F6E1}\uFE0F AntiStrip aktiv: ' + C.Name + ' / ' + gruppe + ' \u2192 ' + _logItem);
}
function _asUnregister(C, gruppe) {
  if (!gruppe) return;
  var key = C.MemberNumber + '_' + gruppe;
  if (_asWatchers[key]) {
    delete _asWatchers[key];
    _log('\u{1F6E1}\uFE0F AntiStrip beendet: ' + C.Name + ' / ' + gruppe);
  }
}
// =============================================================
const _cfg=JSON.parse(decodeURIComponent(escape(atob('${cfgJson}'))));
const _moneyCfg={queryCmd:_cfg.moneyQueryCmd??''};
const _trigs=JSON.parse(decodeURIComponent(escape(atob('${trigsJson}'))));
const _stateKey='__BCKBotState_${safeId}';
const _lsSaved=(()=>{try{return JSON.parse(localStorage.getItem('__BCKBotStates')||'{}')['${safeId}']??{};}catch(e){return {};}})();
const _savedState=window[_stateKey]??_lsSaved;
const _fired    =_savedState.fired    ??{};
const _firedCnt =_savedState.firedCnt ??{};
const _firedChar=_savedState.firedChar??{};
const _evFiredCnt=Object.assign({},_savedState.evFiredCnt??{});
const _roomEver=new Set([...(_savedState.roomEver??[]),...(${roomEverJson})]);
window[_stateKey]={fired:_fired,firedCnt:_firedCnt,firedChar:_firedChar,roomEver:_roomEver};
const _trigMap=Object.fromEntries(_trigs.map(t=>[t.id,t]));
const _rejoinWindow=new Map();
const _REJOIN_GRACE=1000;
const _evts=JSON.parse(decodeURIComponent(escape(atob('${eventsJson}'))));
const _rangState=Object.assign({},_cfg.rankPlayers??{});
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
const _moneyBalances=Object.assign({},_cfg.moneyBalances??{});
function _log(...a){if(_cfg.logAktiv)console.log('[Bot:${safeName}]',...a);}

function _ok(trig,rohText,typKey,C){
  const cx=C.X??-999,cy=C.Y??-999;
  const beds=trig.bedingungen??[];
  if(!beds.length)return true;
  function checkOne(c){
    if(c.typ==='wort'){const m=c.typ_msg||'any';if(m!=='any'&&m!==typKey)return false;return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());}
    if(c.typ==='zone'){const p=c.puffer??1;const ok=cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;if(!ok)_log('Zone miss: X='+cx+' Y='+cy+' erwartet X='+c.x+' Y='+c.y);return ok;}
    if(c.typ==='zone_rect'){return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);}
    if(c.typ==='item_traegt'){const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='item_traegt_nicht'){const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
    if(c.typ==='rang'){
      const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef||!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=') return cl===tl;if(op==='min') return cl>=tl;if(op==='max') return cl<=tl;return false;
    }
    if(c.typ==='shop_kauf') return false;
    if(c.typ==='player_betritt') return true;
    return true;
  }
  const groups=[[]];
  for(const c of beds){if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);groups[groups.length-1].push(c);}
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

function _okIf(trig,rohText,typKey,C){
  const cx=C.X??-999,cy=C.Y??-999;
  const beds=trig.ifBedingungen??[];
  if(!beds.length)return true;
  function checkOne(c){
    if(c.typ==='wort'){const m=c.typ_msg||'any';if(m!=='any'&&m!==typKey)return false;return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());}
    if(c.typ==='zone'){const p=c.puffer??1;return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;}
    if(c.typ==='zone_rect'){return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);}
    if(c.typ==='item_traegt'){const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='item_traegt_nicht'){const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
    if(c.typ==='rang'){
      const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef||!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=') return cl===tl;if(op==='min') return cl>=tl;if(op==='max') return cl<=tl;return false;
    }
    return true;
  }
  const groups=[[]];
  for(const c of beds){if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);groups[groups.length-1].push(c);}
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

function _istBesetzt(x,y,ausschliessen){
  if(x===0&&y===0)return false;
  return[Player,...(ChatRoomCharacter||[])].some(C=>{
    if(ausschliessen.includes(C.MemberNumber))return false;
    if(C.X===0&&C.Y===0)return false;
    return C.X===x&&C.Y===y;
  });
}

function _teleport(a,C){
  const allSlots=a.tpSlots??[];
  if(!allSlots.length){_log('\u26A0 Keine TP-Slots');return false;}
  const ziel=allSlots.find(s=>!_istBesetzt(s.x,s.y,[C.MemberNumber]));
  if(!ziel){_log('\u26A0 Alle TP-Slots belegt fuer '+C.Name);return false;}
  const si=allSlots.indexOf(ziel);
  ServerSend('ChatRoomChat',{Content:'ChatRoomMapViewTeleport',Type:'Hidden',Dictionary:[{Tag:'MapViewTeleport',Position:{X:ziel.x,Y:ziel.y}}],Target:C.MemberNumber});
  _log('\u{1F300} TP '+C.Name+' \u2192 X='+ziel.x+' Y='+ziel.y+(si>0?' [Fallback '+si+']':''));
  const gueltig=ziel.gueltig??true;
  if(!gueltig)_log('\u26A0 Slot '+si+' hat gueltig=false');
  return gueltig;
}

function _snapItem(i){return{Asset:i.Asset,Group:i.Asset?.Group?.Name??'',Color:JSON.parse(JSON.stringify(i.Color??'#ffffff')),Craft:i.Craft??null,Property:JSON.parse(JSON.stringify(i.Property??{}))};}

function _restoreDisplaced(C,snapshot,targetGroup){
  setTimeout(()=>{
    snapshot.forEach(snap=>{
      if(snap.Group===targetGroup)return;
      const stillThere=InventoryGet(C,snap.Group);
      if(!stillThere&&snap.Asset){
        _log('\u267B Wiederherstellen: '+snap.Group+'/'+snap.Asset.Name+' (verdraengt durch '+targetGroup+')');
        try{
          InventoryWear(C,snap.Asset.Name,snap.Group,snap.Color,0,Player.MemberNumber,snap.Craft);
          const restored=InventoryGet(C,snap.Group);
          if(restored&&snap.Property&&Object.keys(snap.Property).length){restored.Property=snap.Property;}
        }catch(e){_log('\u26A0 Wiederherstellen fehlgeschlagen fuer '+snap.Group+': '+e.message);}
      }
    });
    CharacterRefresh(C);ChatRoomCharacterUpdate(C);
  },150);
}

function _applyItemAction(a,C){
  try{
    const snapshot=(C.Appearance??[]).filter(i=>i.Asset?.Group?.Name).map(_snapItem);
    if(a.itemConfig){
      const ic=a.itemConfig;
      let col=ic.colors??['#ffffff'];
      if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
      const itemNow=InventoryGet(C,ic.group);
      if(itemNow){
        itemNow.Color=col;itemNow.Property=itemNow.Property??{};
        if(ic.tr&&Object.keys(ic.tr).length){itemNow.Property.TypeRecord=ic.tr;itemNow.Property.Type=ic.typeStr??'';}
        if(ic.props)Object.assign(itemNow.Property,ic.props);
      }
      CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      _restoreDisplaced(C,snapshot,ic.group);
      setTimeout(()=>{
        const item=InventoryGet(C,ic.group);
        if(!item){
          InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
          const reItem=InventoryGet(C,ic.group);
          if(reItem){
            reItem.Property=reItem.Property??{};
            if(ic.tr&&Object.keys(ic.tr).length){reItem.Property.TypeRecord=ic.tr;reItem.Property.Type=ic.typeStr??'';}
            if(ic.props)Object.assign(reItem.Property,ic.props);
          }
        } else {
          item.Property=item.Property??{};
          if(ic.tr&&Object.keys(ic.tr).length){item.Property.TypeRecord=ic.tr;item.Property.Type=ic.typeStr??'';}
          if(ic.props)Object.assign(item.Property,ic.props);
        }
        if(ic.lock){
          const BCX_L=['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
          const REL_L=['OwnerPadlock','LoversPadlock','MistressPadlock'];
          const isBcx=BCX_L.includes(ic.lock);const isRel=REL_L.includes(ic.lock);
          const lp=ic.lockParams??{};
          const lockAsset=isBcx?(Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc')??Asset.find(a=>a.Name===ic.lock)):Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc');
          if(lockAsset){
            const itemForLock=InventoryGet(C,ic.group);
            if(itemForLock){
              InventoryLock(C,itemForLock,{Asset:lockAsset},Player.MemberNumber,true);
              itemForLock.Property=itemForLock.Property??{};
              if(lp.timer>0) itemForLock.Property.RemoveTimer=Date.now()+lp.timer;
              if(lp.combo) itemForLock.Property.CombinationNumber=lp.combo;
              if(lp.password) itemForLock.Property.Password=lp.password;
              if(isRel){itemForLock.Property.LockMemberNumber=lp.relMember||Player.MemberNumber;if(lp.relTimer>0)itemForLock.Property.RemoveTimer=Date.now()+lp.relTimer;}
              CharacterRefresh(C);_log('\u{1F512} Schloss angelegt: '+ic.lock+' auf '+ic.asset+' ('+C.Name+')');
            }
          } else {_log('\u26A0 Schloss nicht gefunden: '+ic.lock);}
        }
        CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      },500);
    } else if(a.curseEntry){
      let col=a.curseEntry.Farbe;if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,a.curseEntry.ItemName,a.curseEntry.Gruppe,col,0,Player.MemberNumber,a.curseEntry.Craft);
      _restoreDisplaced(C,snapshot,a.curseEntry.Gruppe);
    } else if(a.profilName){
      (a.profilItems??[]).forEach(item=>{
        let col=item.colors??item.cfg?.Color??'#ffffff';
        if(typeof col==='string'&&col.includes(','))col=col.split(',');
        InventoryWear(C,item.asset,item.group,col,0,Player.MemberNumber);CharacterRefresh(C);
      });
      ChatRoomCharacterUpdate(C);
    } else if(a.item){
      InventoryWear(C,a.item,a.gruppe,a.farbe??'#ffffff',0,Player.MemberNumber);
      _restoreDisplaced(C,snapshot,a.gruppe);
    }
  }catch(ex){_log('item Fehler:',ex.message);}
}

function _execAct(a,C,vars){
  let ok=false;
  try{
    if(a.typ==='chat'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Chat'});ok=true;}
    else if(a.typ==='emote'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Emote'});ok=true;}
    else if(a.typ==='whisper'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Whisper',Target:C.MemberNumber});ok=true;}
    else if(a.typ==='item_entf'){const _g=a.gruppe;InventoryRemove(C,_g);CharacterRefresh(C);ChatRoomCharacterUpdate(C);_asUnregister(C,_g);ok=true;}
    else if(a.typ==='item'){
      // FIX: Alten Watcher fuer diesen Slot vorab loeschen damit er nicht gegen das neue Item ankaempft
      var _preGr=(a.antiStrip_itemConfig&&a.antiStrip_itemConfig.group)||(a.itemConfig&&a.itemConfig.group)||(a.antiStrip_curseEntry&&a.antiStrip_curseEntry.Gruppe)||(a.curseEntry&&a.curseEntry.Gruppe)||a.antiStrip_gruppe||a.gruppe||'';
      if(_preGr){var _preKey=C.MemberNumber+'_'+_preGr;if(_asWatchers[_preKey]){delete _asWatchers[_preKey];_log('\u{1F504} AntiStrip-Watcher ersetzt fuer '+C.Name+' / '+_preGr);}}
      _applyItemAction(a,C);
      // FIX: shopNostrip = Kaeufer hat /nostrip in Chat geschrieben -> AntiStrip auf das Item aktivieren
      if(a.antiStrip||vars?.shopNostrip){
        var _aForReg=vars?.shopNostrip?Object.assign({},a,{_isShopNostrip:true}):a;
        _asRegister(C,_aForReg);
      }
      // FIX: Freeze-Property setzen (900ms = nach Lock bei 500ms + Puffer)
      if(vars?.shopNostrip){
        var _nsGr=(a.itemConfig?.group)||(a.curseEntry?.Gruppe)||a.gruppe||'';
        if(_nsGr)setTimeout(function(){
          try{
            var _nsI=InventoryGet(C,_nsGr);
            if(_nsI){
              // FIX: Property.Freeze=true ist die echte BC-Sperre; Craft.Property ist nur Label
              _nsI.Property=_nsI.Property||{};
              _nsI.Property.Freeze=true;
              if(!_nsI.Craft||typeof _nsI.Craft!=='object')
                _nsI.Craft={Name:'',Description:'',Property:'Freeze',Color:(_nsI.Color??'#ffffff'),Lock:'',Item:_nsI.Asset?.Name??'',Private:false,MemberNumber:Player.MemberNumber};
              else _nsI.Craft.Property='Freeze';
              CharacterRefresh(C);ChatRoomCharacterUpdate(C);
              _log('\u{1F512} NoStrip Freeze+Craft gesetzt: '+C.Name+' / '+_nsGr);
            }else{_log('\u26A0 NoStrip Freeze: Item nicht gefunden in '+_nsGr+' bei '+C.Name);}
          }catch(ex){_log('\u26A0 Freeze Fehler:',ex.message);}
        },900);
      }
      ok=true;
    }
    else if(a.typ==='teleport'){ok=_teleport(a,C);}
    else if(a.typ==='money'){
      const op=a.money_op??'add';const val=a.money_val??0;
      const delta=op==='add'?val:op==='sub'?-val:0;
      const setVal=op==='set'?val:op==='reset'?0:undefined;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',memberNum:C.MemberNumber,name:C.Name,delta,setVal},'*');
      ok=true;
    }
    else if(a.typ==='rang'){
      const op=a.rang_op??'setzen';const defs=_cfg.rankDefs??[];
      const sorted=[...defs].sort((x,y)=>x.level-y.level);
      const currentRankId=_rangState[C.MemberNumber]??null;const curIdx=sorted.findIndex(r=>r.id===currentRankId);
      let newRankId=currentRankId;
      if(op==='setzen') newRankId=a.rang_id||null;
      else if(op==='entfernen') newRankId=null;
      else if(op==='naechster'){if(curIdx<sorted.length-1) newRankId=sorted[curIdx+1].id;}
      else if(op==='vorheriger'){if(curIdx>0) newRankId=sorted[curIdx-1].id;}
      _rangState[C.MemberNumber]=newRankId;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_RANG',memberNum:C.MemberNumber,name:C.Name,rankId:newRankId},'*');
      ok=true;
    }
    else ok=true;
  }catch(ex){_log('\u26A0 Aktion '+a.typ+' Fehler:',ex.message);ok=false;}
  const msgField=ok?'dann_msg':'sonst_msg';
  const msgTyp=a[msgField+'_typ']??'chat';
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

function _runSeq(aktionen,C,vars,trigBase,onDone,onUngueltig){
  if(!aktionen.length){onDone();return;}
  const [a,...rest]=aktionen;
  setTimeout(()=>{
    const allChars=[Player,...(ChatRoomCharacter||[])];
    let targets;
    if(a.aktZiel==='alle'){targets=allChars;}
    else if(a.aktZiel==='whitelist'){const nrs=(a.aktZielNummern||[]).map(Number);targets=allChars.filter(ch=>nrs.includes(Number(ch.MemberNumber)));}
    else if(a.aktZiel==='shop_kaeufer'){const bn=vars.shopBuyer?.MemberNumber;const bc=bn?allChars.find(ch=>ch.MemberNumber===bn):null;targets=bc?[bc]:[C];}
    else{targets=[C];}
    let overallOk=true;
    if(['chat','emote'].includes(a.typ)&&targets.length>0){const ok=_execAct(a,C,vars);if(!ok)overallOk=false;}
    else{targets.forEach(ch=>{const cv=ch===C?vars:{...vars,name:ch.Name,x:ch.X??0,y:ch.Y??0,C:ch};const ok=_execAct(a,ch,cv);if(!ok)overallOk=false;});}
    if(!overallOk){
      const bf=a.bei_fehler??'ignorieren';
      _log('\u26A0 Aktion '+a.typ+' fehlgeschlagen \u2192 '+bf);
      if(bf==='kette_stoppen'){onDone();return;}
      if(bf==='trigger_ungueltig'){onUngueltig();return;}
    }
    _runSeq(rest,C,vars,trigBase,onDone,onUngueltig);
  },a.delay??0);
}

const _evTimers={};
const _evState={};

function _okEv(ev,C,rohText,typKey){
  const beds=ev.bedingungen??[];if(!beds.length)return true;
  const cx=C.X??-999,cy=C.Y??-999;
  function checkOne(c){
    if(c.typ==='wort'){if(!rohText)return true;const m=c.typ_msg||'any';if(m!=='any'&&m!==typKey)return false;return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());}
    if(c.typ==='zone'){const p=c.puffer??1;return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;}
    if(c.typ==='zone_rect'){return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);}
    if(c.typ==='item_traegt'){return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='item_traegt_nicht'){return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
    if(c.typ==='rang'){
      const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef||!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=') return cl===tl;if(op==='min') return cl>=tl;if(op==='max') return cl<=tl;return false;
    }
    return true;
  }
  const groups=[[]];
  for(const c of beds){if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);groups[groups.length-1].push(c);}
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

function _fireEv(ev){
  const cnt=_evFiredCnt[ev.id]??0;
  if(ev.wiederholung==='einmalig'&&cnt>=1){_log('\u23ED Event "'+ev.name+'" bereits (1x)');return;}
  if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2)){_log('\u23ED Event "'+ev.name+'" max erreicht');return;}
  const allChars=[Player,...(ChatRoomCharacter||[])];
  let targets=[];
  if(ev.ziel==='alle'){targets=allChars;}
  else if(ev.ziel==='liste'){targets=allChars.filter(C=>(ev.zielListe||[]).includes(C.MemberNumber));}
  else{const eligible=allChars.filter(C=>_okEv(ev,C,ev._rohText,ev._typKey));if(eligible.length)targets=[eligible[Math.floor(Math.random()*eligible.length)]];}
  if(!targets.length){_log('\u26A0 Event "'+ev.name+'" - kein gueltiges Ziel');return;}
  _log('\u26A1 Event "'+ev.name+'" \u2192 '+targets.length+' Ziel(e)');
  targets.forEach(C=>{
    if(!_okEv(ev,C,ev._rohText,ev._typKey)){_log('\u23ED Event "'+ev.name+'" Bed. nicht erfuellt fuer '+C.Name);return;}
    const vars={name:C.Name,wort:ev._rohText||'',typ:'Event',x:C.X??0,y:C.Y??0,zone:'',C};
    _runSeq(ev.aktionen??[],C,vars,ev,
      ()=>{_evFiredCnt[ev.id]=(cnt+1);_log('\u2705 Event "'+ev.name+'" abgeschlossen fuer '+C.Name+' #'+_evFiredCnt[ev.id]);_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
      ()=>{_log('\u274C Event "'+ev.name+'" ungueltig fuer '+C.Name);_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});
        if(ev.fallbackTyp&&ev.fallbackTyp!=='nichts'&&ev.fallbackText){const typ={chat:'Chat',emote:'Emote'}[ev.fallbackTyp]??'Chat';ServerSend('ChatRoomChat',{Content:_tpl(ev.fallbackText,vars),Type:typ});}}
    );
  });
}

function _scheduleEv(ev){
  if(!ev.aktiv)return;
  const beds=ev.bedingungen??[];
  const timerC=beds.find(c=>c.typ==='ev_timer');const intC=beds.find(c=>c.typ==='ev_interval');
  if(timerC){_evTimers[ev.id+'_t']=setTimeout(()=>{_fireEv(ev);},(timerC.sek??10)*1000);}
  if(intC){
    const lo=(intC.sek_min??20)*1000, hi=(intC.sek_max??60)*1000;
    const go=()=>{
      const cnt=_evFiredCnt[ev.id]??0;
      if(ev.wiederholung==='einmalig'&&cnt>=1)return;
      if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
      _fireEv(ev);_evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
    };
    _evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
  }
}
_evts.forEach(ev=>{if(ev.aktiv)_scheduleEv(ev);});

function _pushLog(extra,vars,trig){
  const entry={ts:Date.now(),botId:'${safeId}',botName:'${safeName}',trigName:trig?.name??'?',trigId:trig?.id??'',player:(vars?.name??'?')+' #'+(vars?.C?.MemberNumber??'?'),memberNum:vars?.C?.MemberNumber,x:vars?.x??0,y:vars?.y??0,...extra};
  try{window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_LOG',entry},'*');}catch(e){}
}
function _syncRoomEver(){
  try{window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_ROOM_EVER',botId:'${safeId}',members:[..._roomEver]},'*');}catch(e){}
}

function _run(trig,vars){
  const C=vars.C??Player;
  const _isRejoinTrig=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt'&&c.betritt_typ==='rejoin');
  if(!_isRejoinTrig&&_rejoinWindow.has(C.MemberNumber)){
    const openedAt=_rejoinWindow.get(C.MemberNumber);
    if(Date.now()-openedAt>=_REJOIN_GRACE){_rejoinWindow.delete(C.MemberNumber);_log('\u{1F6AA} Rejoin-Fenster fuer #'+C.MemberNumber+' geschlossen');}
    else{_log('\u{1F6AA} Rejoin-Gnadenfrist aktiv fuer #'+C.MemberNumber);}
  }
  if(_isRejoinTrig&&!_rejoinWindow.has(C.MemberNumber)){_log('\u23ED [Rejoin] "'+trig.name+'" - Fenster geschlossen, uebersprungen');return;}
  const wdh=trig.wiederholung??'immer';const cnt=_firedCnt[trig.id]??0;
  if(wdh==='einmalig'&&cnt>=1){_log('\u23ED "'+trig.name+'" bereits ausgelo\u00f6st (1x)');_pushLog({status:'skip_wdh'},vars,trig);return;}
  if(wdh==='n_mal'&&cnt>=(trig.maxMal??2)){_log('\u23ED "'+trig.name+'" max '+trig.maxMal+'x erreicht');_pushLog({status:'skip_max'},vars,trig);return;}
  _log('\u{1F3AF} "'+trig.name+'" von '+vars.name+' | X='+vars.x+' Y='+vars.y+' | #'+(cnt+1)+(wdh==='n_mal'?' von '+trig.maxMal:''));
  setTimeout(()=>{
    _runSeq(trig.aktionen??[],C,vars,trig,
      ()=>{const now=Date.now();_fired[trig.id]=now;_firedChar[trig.id+'_'+C.MemberNumber]=now;_firedCnt[trig.id]=(cnt+1);_log('\u2705 Trigger "'+trig.name+'" abgeschlossen #'+_firedCnt[trig.id]+(trig.charSpec?' [pro Spieler]':' [global]'));_pushLog({status:'ok'},vars,trig);_syncRoomEver();},
      ()=>{_log('\u274C Trigger "'+trig.name+'" ungueltig');_pushLog({status:'ungueltig'},vars,trig);if(trig.fallbackTyp&&trig.fallbackTyp!=='nichts'&&trig.fallbackText){const typ={chat:'Chat',emote:'Emote'}[trig.fallbackTyp]??'Chat';ServerSend('ChatRoomChat',{Content:_tpl(trig.fallbackText,vars),Type:typ});}}
    );
  },trig.delay??0);
}

function _runSonst(trig,vars){
  const C=vars.C??Player;
  _log('\u{1F504} [Else] "'+trig.name+'" \u2192 SONST-Aktionen fuer '+vars.name);
  setTimeout(()=>{_runSeq(trig.aktionen_sonst??[],C,vars,trig,()=>{_log('\u2705 [Else] SONST abgeschlossen');},()=>{_log('\u274C [Else] SONST ungueltig');});},trig.delay??0);
}

function _tpl(s,v){
  const cur=_shopCfg.moneyName||'Gold';
  return(s??'')
    .replace(/{name}/gi,v.name??'').replace(/{wort}/gi,v.wort??'').replace(/{typ}/gi,v.typ??'')
    .replace(/{x}/gi,v.x??'').replace(/{y}/gi,v.y??'').replace(/{zone}/gi,v.zone??'')
    .replace(/{k\u00e4ufer}/gi,v.shopBuyer?.Name??v.name??'').replace(/{kaeufer}/gi,v.shopBuyer?.Name??v.name??'')
    .replace(/{ziel}/gi,v.C?.Name??v.name??'').replace(/{item}/gi,v.shopItem?.name??'')
    .replace(/{preis}/gi,String(v.shopItem?.preis??'')).replace(/{waehrung}/gi,cur)
    .replace(/{kontostand}/gi,String((_moneyBalances[v.shopBuyer?.MemberNumber??v.C?.MemberNumber]?.balance)??0))
    .replace(/{anzahl}/gi,String(v.shopAnzahl??'')).replace(/{gesamt}/gi,String(v.shopGesamt??''));
}

function _parseShopArgs(rest){
  const args=[];const flags=new Set();let pos=0;rest=rest.trim();
  while(pos<rest.length){
    while(pos<rest.length&&rest[pos]===' ')pos++;
    if(pos>=rest.length)break;
    if(rest[pos]==='/'&&pos+1<rest.length){
      const remaining=rest.slice(pos+1);
      if(/^nostrip\b/i.test(remaining)){flags.add('nostrip');pos+=8;continue;}
      const fl=rest[pos+1].toLowerCase();
      if(fl==='w'||fl==='u'){flags.add(fl);pos+=2;continue;}
    }
    if(rest[pos]==='"'||rest[pos]==="'"){const q=rest[pos];pos++;const end=rest.indexOf(q,pos);if(end===-1){args.push(rest.slice(pos));break;}args.push(rest.slice(pos,end));pos=end+1;}
    else{const sp=rest.indexOf(' ',pos);if(sp===-1){args.push(rest.slice(pos));break;}args.push(rest.slice(pos,sp));pos=sp+1;}
  }
  return{args:args.filter(a=>a.length>0),flags};
}

function _shopTpl(raw,buyerC,targetC,shopItem,preis,newBal,anzahl,gesamt){
  const cur=_shopCfg.moneyName||'Gold';
  return(raw||'')
    .replace(/{name}/gi,buyerC.Name).replace(/{k\u00e4ufer}/gi,buyerC.Name).replace(/{kaeufer}/gi,buyerC.Name)
    .replace(/{ziel}/gi,targetC?targetC.Name:'').replace(/{item}/gi,shopItem.name)
    .replace(/{preis}/gi,String(preis)).replace(/{waehrung}/gi,cur).replace(/{kontostand}/gi,String(newBal??0))
    .replace(/{anzahl}/gi,String(anzahl??'')).replace(/{gesamt}/gi,String(gesamt??''));
}

function _handleShopCmd(rohText,buyerC){
  const cmd=_shopCfg.cmd.trim();
  const rest=rohText.trim().slice(cmd.length);
  const{args,flags}=_parseShopArgs(rest);
  if(!args.length)return;
  const flagWhisper=flags.has('w');const flagUnknown=flags.has('u');const flagNostrip=flags.has('nostrip');
  const itemName=args[0].toLowerCase();
  const shopItem=_shopCfg.items.find(i=>i.name.toLowerCase()===itemName);
  if(!shopItem){_log('\u{1F6D2} Kein Artikel "'+args[0]+'"');return;}
  // FIX: Nur verarbeiten wenn passender Trigger mit shop_kauf Bedingung fuer dieses Item existiert
  const _matchingTrigs=_trigs.filter(trig=>{
    const sc=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');if(!sc.length)return false;
    return sc.every(c=>!c.shop_id||c.shop_id===shopItem.id);
  });
  if(!_matchingTrigs.length){_log('\u{1F6D2} Kein Trigger fuer "'+shopItem.name+'" - ignoriert');return;}
  const preisU=flagUnknown?(shopItem.preisU??_shopCfg.preisU??0):0;
  const preisNostrip=flagNostrip?(shopItem.preisNostrip??_shopCfg.preisNostrip??0):0;
  const flagAufpreis=preisU+preisNostrip;
  const preis=Number(shopItem.preis)||0;
  const cur=_shopCfg.moneyName||'Gold';
  const allChars=[Player,...(ChatRoomCharacter||[])];
  const displayBuyer=flagUnknown?{Name:'Unbekannt',MemberNumber:buyerC.MemberNumber}:buyerC;

  // == ALL-Kauf ================================================
  if(args[1]&&args[1].toLowerCase()==='all'){
    const targets=allChars.filter(c=>c.MemberNumber!==Player.MemberNumber);
    const anzahl=targets.length;
    if(anzahl===0){ServerSend('ChatRoomChat',{Content:'Niemand im Raum.',Type:'Whisper',Target:buyerC.MemberNumber});return;}
    const gesamt=(preis+flagAufpreis)*anzahl;
    const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;
    if(buyerBalance<gesamt){
      let ai='';if(flagAufpreis>0){const p=[];if(preisU>0)p.push('/u: '+preisU+' '+cur);if(preisNostrip>0)p.push('/nostrip: '+preisNostrip+' '+cur);ai=' (inkl. Flag-Aufpreis: '+p.join(', ')+')';}
      const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benoetigt: {gesamt} '+cur+' ('+anzahl+'x'+(preis+flagAufpreis)+')'+ai+'.');
      ServerSend('ChatRoomChat',{Content:_shopTpl(rawMsg,buyerC,null,shopItem,preis+flagAufpreis,buyerBalance,anzahl,gesamt),Type:'Whisper',Target:buyerC.MemberNumber});
      _log('\u{1F6D2} All-Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+', braucht '+gesamt);return;
    }
    if(!_moneyBalances[buyerC.MemberNumber])_moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
    _moneyBalances[buyerC.MemberNumber].balance-=gesamt;
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-gesamt},'*');
    const newBal=_moneyBalances[buyerC.MemberNumber].balance;
    _log('\u{1F6D2} All-Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" fuer alle ('+anzahl+'x'+(preis+flagAufpreis)+'='+gesamt+' '+cur+'). Kontostand: '+newBal+(flagNostrip?' [/nostrip]':''));
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,targetNum:null,targetName:'Alle ('+anzahl+')',itemName:shopItem.name,preis:gesamt,isAll:true,anzahl},'*');
    // FIX: Keine auto-Nachrichten - Trigger Dann/Sonst-Messages uebernehmen
    targets.forEach(targetC=>{
      const shopVars={name:buyerC.Name,wort:rohText,typ:'\u{1F6D2} Shop All',x:buyerC.X??0,y:buyerC.Y??0,C:targetC,shopBuyer:buyerC,shopItem,shopAnzahl:anzahl,shopGesamt:gesamt,shopNostrip:flagNostrip};
      _trigs.forEach(trig=>{
        const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');if(!shopConds.length)return;
        const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);if(!itemMatch)return;
        const vonOk=(()=>{if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));return true;})();if(!vonOk)return;
        const otherOk=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf').every(c=>{
          if(c.typ==='rang'){const op=c.rang_op??'=';const cid=_rangState[buyerC.MemberNumber]??null;if(op==='kein')return !cid;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const td=defs.find(r=>r.id===c.rang_id),cd=defs.find(r=>r.id===cid);if(!td||!cd)return false;if(op==='=')return cd.level===td.level;if(op==='min')return cd.level>=td.level;if(op==='max')return cd.level<=td.level;}
          return true;
        });if(!otherOk)return;
        _run(trig,shopVars);
      });
    });
    return;
  }

  // == Einzel-Kauf =============================================
  let targetC=buyerC;
  if(args[1]){
    const arg2=args[1].trim();
    if(/^\d+$/.test(arg2)){targetC=allChars.find(c=>c.MemberNumber===parseInt(arg2))||buyerC;}
    else{
      const nm=allChars.filter(c=>c.Name.toLowerCase()===arg2.toLowerCase());
      if(nm.length===1)targetC=nm[0];
      else if(nm.length>1){ServerSend('ChatRoomChat',{Content:'\u26A0 Mehrere Spieler mit dem Namen "'+arg2+'". Bitte MemberNummer verwenden: '+nm.map(c=>c.Name+' (#'+c.MemberNumber+')').join(', '),Type:'Whisper',Target:buyerC.MemberNumber});return;}
    }
  }
  const preisEffektiv=preis+flagAufpreis;
  const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;
  if(buyerBalance<preisEffektiv){
    let ai='';if(flagAufpreis>0){const p=[];if(preisU>0)p.push('/u: '+preisU+' '+cur);if(preisNostrip>0)p.push('/nostrip: '+preisNostrip+' '+cur);ai=' (inkl. '+p.join(' + ')+')';}
    const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benoetigt: {gesamt} '+cur+ai+'.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawMsg,buyerC,targetC,shopItem,preis,buyerBalance,1,preisEffektiv),Type:'Whisper',Target:buyerC.MemberNumber});
    _log('\u{1F6D2} Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+' '+cur+', braucht '+preisEffektiv);return;
  }
  if(!_moneyBalances[buyerC.MemberNumber])_moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
  _moneyBalances[buyerC.MemberNumber].balance-=preisEffektiv;
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-preisEffektiv},'*');
  const newBal=_moneyBalances[buyerC.MemberNumber].balance;
  const isFremdkauf=targetC.MemberNumber!==buyerC.MemberNumber;
  _log('\u{1F6D2} Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" fuer '+preisEffektiv+' '+cur+(isFremdkauf?' \u2192 Ziel: '+targetC.Name:'')+' | Kontostand: '+newBal+(flagNostrip?' [/nostrip]':''));
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,targetNum:targetC.MemberNumber,targetName:targetC.Name,itemName:shopItem.name,preis:preisEffektiv,isAll:false,anzahl:1},'*');
  // Bestätigungs-Whisper an Käufer ({gesamt} = preisEffektiv inkl. Flags)
  const rawConf=shopItem.confirmMsg||_shopCfg.confirmMsg||('\u2705 '+(isFremdkauf?'Du kaufst '+shopItem.icon+' '+shopItem.name+' fuer '+targetC.Name:shopItem.icon+' '+shopItem.name+' gekauft')+'. Bezahlt: '+preisEffektiv+' '+cur+(flagNostrip?' \u{1F512} NoStrip':'')+'. Kontostand: '+newBal+' '+cur+'.');
  ServerSend('ChatRoomChat',{Content:_shopTpl(rawConf,buyerC,targetC,shopItem,preis,newBal,1,preisEffektiv),Type:'Whisper',Target:buyerC.MemberNumber});
  // Announce im Chat wenn Fremdkauf
  if(isFremdkauf){
    const rawAnn=shopItem.announceMsg||_shopCfg.announceMsg||(displayBuyer.Name+' hat fuer '+targetC.Name+' das Item '+shopItem.icon+' '+shopItem.name+' gekauft'+(flagNostrip?' \u{1F512}':'')+'.');
    const annTxt=_shopTpl(rawAnn,displayBuyer,targetC,shopItem,preis,newBal,1,preisEffektiv);
    if(flagWhisper)ServerSend('ChatRoomChat',{Content:annTxt,Type:'Whisper',Target:targetC.MemberNumber});
    else ServerSend('ChatRoomChat',{Content:annTxt,Type:'Chat'});
  }
  // 🔒 NoStrip-Ankündigung im Chat
  if(flagNostrip){
    const rawNs=shopItem.announceNostripMsg||_shopCfg.announceNostripMsg||('\u{1F512} '+targetC.Name+' traegt '+shopItem.icon+' '+shopItem.name+' und kann es nicht ablegen.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawNs,displayBuyer,targetC,shopItem,preis,newBal,1,preisEffektiv),Type:'Chat'});
  }
  // Shop-Trigger ausloesen - shopNostrip:flagNostrip weitergeben damit Item-Aktion AntiStrip registriert
  const shopVars={name:buyerC.Name,wort:rohText,typ:'\u{1F6D2} Shop',x:buyerC.X??0,y:buyerC.Y??0,C:targetC,shopBuyer:buyerC,shopItem,shopNostrip:flagNostrip};
  _trigs.forEach(trig=>{
    const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');if(!shopConds.length)return;
    const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);if(!itemMatch)return;
    const vonOk=(()=>{if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));return true;})();if(!vonOk)return;
    const otherOk=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf').every(c=>{
      if(c.typ==='rang'){const op=c.rang_op??'=';const currentId=_rangState[buyerC.MemberNumber]??null;if(op==='kein')return !currentId;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const td=defs.find(r=>r.id===c.rang_id);const cd=defs.find(r=>r.id===currentId);if(!td||!cd)return false;if(op==='=')return cd.level===td.level;if(op==='min')return cd.level>=td.level;if(op==='max')return cd.level<=td.level;return false;}
      return true;
    });if(!otherOk)return;
    _run(trig,shopVars);
  });
}

function _proc(rohText,typKey,C){
  if(!rohText)return;
  const qCmd=(_moneyCfg?.queryCmd||'').trim().toLowerCase();
  if(qCmd&&rohText.trim().toLowerCase()===qCmd){window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_QUERY',memberNum:C.MemberNumber,name:C.Name},'*');return;}
  const rqCmd=(_cfg.rankQueryCmd||'').trim().toLowerCase();
  if(rqCmd&&rohText.trim().toLowerCase()===rqCmd){
    const defs=_cfg.rankDefs??[];const rankId=_rangState[C.MemberNumber]??null;const rank=defs.find(r=>r.id===rankId);
    const tpl=s=>s.replace(/{name}/gi,C.Name).replace(/{rang}/gi,rank?.name||'Kein Rang').replace(/{rang_icon}/gi,rank?.icon||'-').replace(/{rang_level}/gi,String(rank?.level||0));
    const txt=tpl(_cfg.rankQueryText||'{name} hat Rang: {rang_icon} {rang}');
    const typ=_cfg.rankQueryTyp||'whisper';
    if(typ==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
    else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    return;
  }
  const shopListCmd=(_shopCfg.listCmd||'').trim().toLowerCase();
  if(shopListCmd&&rohText.trim().toLowerCase()===shopListCmd){
    const cur=_shopCfg.moneyName||'Gold';const aktive=_shopCfg.items.filter(i=>i.aktiv!==false);
    if(!aktive.length){ServerSend('ChatRoomChat',{Content:'\u{1F6D2} Noch keine Artikel.',Type:'Whisper',Target:C.MemberNumber});return;}
    const hdr='\u{1F6D2} Shop ('+aktive.length+' Artikel):';const chunks=[];let buf=hdr;
    aktive.forEach(item=>{
      const ns=item.preisNostrip??_shopCfg.preisNostrip??0;
      const nsHint=ns>0?' (/nostrip +'+ns+')':'';
      const line='\\n\u2022 '+(item.icon||'\u{1F6D2}')+' '+item.name+' - '+(Number(item.preis)||0)+' '+cur+nsHint;
      if((buf+line).length>480){chunks.push(buf);buf=line.slice(1);}else buf+=line;
    });
    chunks.push(buf);chunks.forEach((ch,i)=>setTimeout(()=>ServerSend('ChatRoomChat',{Content:ch,Type:'Whisper',Target:C.MemberNumber}),i*130));
    return;
  }
  const shopCmd=(_shopCfg.cmd||'').trim().toLowerCase();
  if(shopCmd&&(rohText.trim().toLowerCase().startsWith(shopCmd+' ')||rohText.trim().toLowerCase()===shopCmd)){_handleShopCmd(rohText,C);return;}
  const pos={X:C.X??0,Y:C.Y??0};
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u2728 Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _trigs.forEach(trig=>{
    if((trig.bedingungen??[]).some(c=>c.typ==='player_betritt'))return;
    const hasItem=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt');
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    if(hasItem&&!hasWort)return;
    const vonOk=(()=>{if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));return true;})();if(!vonOk)return;
    const condOk=_ok(trig,rohText,typKey,C);
    if(condOk){
      const ifBeds=trig.ifBedingungen??[];const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,rohText,typKey,C);
      if(ifOk)_run(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
      else if((trig.aktionen_sonst??[]).length)_runSonst(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
    }
  });
  _procEvents(rohText,typKey,C);
}

function _procEvents(rohText,typKey,C){
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u2728 Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _evts.forEach(ev=>{
    if(!ev.aktiv)return;
    const vonOk=(()=>{if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===ev.vonNummer;return true;})();if(!vonOk)return;
    const hasTimerBed=(ev.bedingungen??[]).some(c=>c.typ==='ev_timer'||c.typ==='ev_interval'||c.typ==='player_betritt');if(hasTimerBed)return;
    const wortConds=(ev.bedingungen??[]).filter(c=>c.typ==='wort');if(!wortConds.length)return;
    ev._rohText=rohText;ev._typKey=typKey;
    if(_okEv(ev,C,rohText,typKey)){
      const allChars=[Player,...(ChatRoomCharacter||[])];
      let targets=[];
      if(ev.ziel==='alle')targets=allChars;else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));else targets=[C];
      _log('\u{1F4AC} Chat-Event "'+ev.name+'" von '+C.Name+' \u2192 '+targets.length+' Ziel(e)');
      targets.forEach(ch=>{
        const vars={name:ch.Name,wort:rohText,typ:typLabel,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
        const cntNow=_evFiredCnt[ev.id]??0;
        if(ev.wiederholung==='einmalig'&&cntNow>=1)return;if(ev.wiederholung==='n_mal'&&cntNow>=(ev.maxMal??2))return;
        _runSeq(ev.aktionen??[],ch,vars,ev,()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});});
      });
    }
    delete ev._rohText;delete ev._typKey;
  });
}

const _itState={};
const _itPoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const itemConds=(trig.bedingungen??[]).filter(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');if(!itemConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');if(hasWort)return;
    chars.forEach(C=>{
      const condMet=itemConds.every(c=>{const worn=(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);return c.typ==='item_traegt_nicht'?!worn:worn;});
      const key=C.MemberNumber+'_'+trig.id;const was=_itState[key]??false;
      if(condMet&&!was){
        const pos={X:C.X??0,Y:C.Y??0};
        const vonOk=(()=>{if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));return true;})();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='item_traegt'||c.typ==='item_traegt_nicht')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='rang'){const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;if(op==='kein')return !currentId;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);if(!targetDef||!currentDef)return false;const tl=targetDef.level,cl=currentDef.level;if(op==='=')return cl===tl;if(op==='min')return cl>=tl;if(op==='max')return cl<=tl;return false;}
          return true;
        });
        if(otherOk){const ifBeds=trig.ifBedingungen??[];const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'','item',C);if(ifOk)_run(trig,{name:C.Name,wort:'',typ:'Item',x:pos.X,y:pos.Y,zone:'',C});else if((trig.aktionen_sonst??[]).length)_runSonst(trig,{name:C.Name,wort:'',typ:'Item',x:pos.X,y:pos.Y,zone:'',C});}
      }
      _itState[key]=condMet;
    });
  });
},500);

const _roomPrev=new Set((ChatRoomCharacter||[]).map(c=>c.MemberNumber));
const _joinPoll=setInterval(()=>{
  const chars=ChatRoomCharacter||[];const cur=new Set(chars.map(c=>c.MemberNumber));
  for(const prevNum of _roomPrev){
    if(!cur.has(prevNum)){
      _log('\u{1F6AA} #'+prevNum+' verlassen');_rejoinWindow.delete(prevNum);
      _pushLog({status:'leave',trigName:'Verlassen',trigId:'__system__',player:'#'+prevNum,memberNum:prevNum,x:0,y:0,msg:'Raum verlassen'},{name:'#'+prevNum,x:0,y:0,C:{MemberNumber:prevNum}},{name:'System',id:'__system__'});
      for(const k of Object.keys(_zoneState)){if(k.startsWith(prevNum+'_'))delete _zoneState[k];}
      _trigs.forEach(trig=>{if(trig.charSpec&&trig.resetOnLeave){delete _firedChar[trig.id+'_'+prevNum];_log('\u{1F504} State von "'+trig.name+'" fuer #'+prevNum+' zurueckgesetzt');}});
    }
  }
  for(const C of chars){
    if(!_roomPrev.has(C.MemberNumber)){
      const istNeu=!_roomEver.has(C.MemberNumber);const label=istNeu?'\u{1F195} Neu':'\u{1F504} Rejoin';
      _log(label+': '+C.Name+' #'+C.MemberNumber);
      _pushLog({status:istNeu?'join':'join_rejoin',trigName:'',msg:istNeu?'Erstes Mal':'Rejoin'},{name:C.Name+' #'+C.MemberNumber,x:C.X??0,y:C.Y??0,C},{id:'__system__',name:'System'});
      if(istNeu)window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_INIT_NEW',memberNum:C.MemberNumber,name:C.Name},'*');
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'RANG_INIT',memberNum:C.MemberNumber,name:C.Name},'*');
      _roomEver.add(C.MemberNumber);_syncRoomEver();
      if(!istNeu){_rejoinWindow.set(C.MemberNumber,Date.now());setTimeout(()=>{_rejoinWindow.delete(C.MemberNumber);_log('\u{1F6AA} Rejoin-Fenster fuer #'+C.MemberNumber+' automatisch geschlossen');},_REJOIN_GRACE);}
      const pos={X:C.X??0,Y:C.Y??0};const rejoinBatch=[];
      _trigs.forEach(trig=>{
        const bConds=(trig.bedingungen??[]).filter(c=>c.typ==='player_betritt');if(!bConds.length)return;
        const isRejoinTrig=bConds.some(c=>c.betritt_typ==='rejoin');
        const bOk=bConds.every(c=>{const bt=c.betritt_typ??'alle';if(bt==='neu')return istNeu;if(bt==='rejoin')return!istNeu;return true;});if(!bOk)return;
        const vonOk=(()=>{if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));return true;})();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){if(isRejoinTrig){const refTrig=_trigMap[c.trigId];const refIsRejoin=(refTrig?.bedingungen??[]).some(bc=>bc.typ==='player_betritt'&&bc.betritt_typ==='rejoin');if(refIsRejoin)return true;}const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='rang'){const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;if(op==='kein')return !currentId;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);if(!targetDef||!currentDef)return false;const tl=targetDef.level,cl=currentDef.level;if(op==='=')return cl===tl;if(op==='min')return cl>=tl;if(op==='max')return cl<=tl;return false;}
          return true;
        });if(!otherOk)return;
        if(isRejoinTrig)rejoinBatch.push(trig);
        else{const ifBeds=trig.ifBedingungen??[];const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);if(ifOk)_run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});else if((trig.aktionen_sonst??[]).length)_runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});}
      });
      _evts.forEach(ev=>{
        if(!ev.aktiv)return;
        const betrittConds=(ev.bedingungen??[]).filter(c=>c.typ==='player_betritt');if(!betrittConds.length)return;
        const bOk=betrittConds.every(c=>{const bt=c.betritt_typ??'alle';if(bt==='neu')return istNeu;if(bt==='rejoin')return!istNeu;return true;});if(!bOk)return;
        const vonOk=(()=>{if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===+ev.vonNummer;return true;})();if(!vonOk)return;
        const evOtherOk=(ev.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='rang'){const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;if(op==='kein')return !currentId;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);if(!targetDef||!currentDef)return false;const tl=targetDef.level,cl=currentDef.level;if(op==='=')return cl===tl;if(op==='min')return cl>=tl;if(op==='max')return cl<=tl;return false;}
          return true;
        });if(!evOtherOk)return;
        const allChars=[Player,...(ChatRoomCharacter||[])];
        let targets=[];if(ev.ziel==='alle')targets=allChars;else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));else targets=[C];
        const cnt=_evFiredCnt[ev.id]??0;if(ev.wiederholung==='einmalig'&&cnt>=1)return;if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
        targets.forEach(ch=>{const vars={name:ch.Name,wort:'',typ:label,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};_runSeq(ev.aktionen??[],ch,vars,ev,()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});});});
      });
      const ITEM_SYNC_DELAY=800;
      rejoinBatch.forEach(trig=>{
        const hasItemCond=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
        if(hasItemCond){
          setTimeout(()=>{
            if(!_rejoinWindow.has(C.MemberNumber)){_log('\u23ED [Rejoin] "'+trig.name+'" - Fenster geschlossen vor Appearance-Sync');return;}
            const Cfresh=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
            const itemOk=(trig.bedingungen??[]).every(c=>{if(c.typ==='item_traegt')return(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);if(c.typ==='item_traegt_nicht')return!(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);return true;});
            if(!itemOk){_log('\u23ED [Rejoin] "'+trig.name+'" - Item-Bedingung nach Sync nicht erfuellt');return;}
            const ifBedsR=trig.ifBedingungen??[];const ifOkR=!trig.ifElse||!ifBedsR.length||_okIf(trig,'',null,Cfresh);
            if(ifOkR)_run(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
            else if((trig.aktionen_sonst??[]).length)_runSonst(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
          },ITEM_SYNC_DELAY);
        } else {
          const ifBeds=trig.ifBedingungen??[];const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);
          if(ifOk)_run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
          else if((trig.aktionen_sonst??[]).length)_runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
        }
      });
    }
  }
  _roomPrev.clear();for(const n of cur)_roomPrev.add(n);
},100);

const _zoneState={};
const _zonePoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const zoneConds=(trig.bedingungen??[]).filter(c=>c.typ==='zone'||c.typ==='zone_rect');if(!zoneConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');const hasBetritt=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt');if(hasWort||hasBetritt)return;
    chars.forEach(C=>{
      if(!C)return;const cx=C.X??-999,cy=C.Y??-999;
      const inZone=zoneConds.every(c=>{if(c.typ==='zone_rect')return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);const p=c.puffer??1;return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;});
      const key=C.MemberNumber+'_'+trig.id;const war=_zoneState[key]??false;
      if(inZone&&!war){
        const vonOk=(()=>{if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));return true;})();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='zone'||c.typ==='zone_rect')return true;
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='item_traegt')return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='item_traegt_nicht')return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='rang'){const op=c.rang_op??'=';const currentId=_rangState[C.MemberNumber]??null;if(op==='kein')return !currentId;if(!c.rang_id)return false;const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);const targetDef=defs.find(r=>r.id===c.rang_id);const currentDef=defs.find(r=>r.id===currentId);if(!targetDef||!currentDef)return false;const tl=targetDef.level,cl=currentDef.level;if(op==='=')return cl===tl;if(op==='min')return cl>=tl;if(op==='max')return cl<=tl;return false;}
          return true;
        });
        if(otherOk){_log('\u{1F4CD} Zone: '+C.Name+' X='+cx+' Y='+cy+' \u2192 "'+trig.name+'"');_run(trig,{name:C.Name,wort:'',typ:'\u{1F4CD} Zone',x:cx,y:cy,zone:'',C});}
      }
      _zoneState[key]=inZone;
    });
  });
},500);

let _mod=null;
try{
  const _modName='BCBot_${safeId}_'+Date.now();
  _mod=bcModSdk.registerMod({name:_modName,fullName:'${safeName}',version:'1.0'});
  _mod.hookFunction('ChatRoomSendChat',0,(args,next)=>{
    const msgData=args[0];
    const raw=(typeof msgData==='object'?msgData?.Content:null)??document.getElementById('InputChat')?.value?.trim()??'';
    if(raw){
      const msgType=(typeof msgData==='object'?msgData?.Type:null)??'';
      const isE=msgType==='Emote'||(!msgType&&raw.startsWith('*')&&raw.endsWith('*'));
      const isW=msgType==='Whisper'||(!msgType&&(raw.startsWith('/w ')||raw.startsWith('/whisper ')));
      const tk=isE?'emote':isW?'whisper':'chat';
      const hearOk=(_cfg.hearChat&&tk==='chat')||(_cfg.hearEmote&&tk==='emote')||(_cfg.hearWhisper&&tk==='whisper');
      if(hearOk)_proc(raw,tk,Player);else _procEvents(raw,tk,Player);
    }
    return next(args);
  });
  _log('\u2705 hookFunction aktiv');
}catch(hookErr){
  _log('\u26A0 hookFunction nicht verfuegbar:',hookErr.message);
  const _origSend=window.ServerSend;
  if(typeof _origSend==='function'){
    window.__BCBot_origSend_${safeId}=_origSend;
    window.ServerSend=function(channel,data,...rest){
      if(channel==='ChatRoomChat'&&data?.Content&&['Chat','Emote','Whisper'].includes(data?.Type??'Chat')){
        const tk=(data.Type||'Chat').toLowerCase();
        const ssHearOk=(_cfg.hearChat&&tk==='chat')||(_cfg.hearEmote&&tk==='emote')||(_cfg.hearWhisper&&tk==='whisper');
        setTimeout(()=>{if(ssHearOk)_proc(data.Content,tk,Player);else _procEvents(data.Content,tk,Player);},0);
      }
      return _origSend.call(this,channel,data,...rest);
    };
  }
}

// == AntiStrip Listener =======================================
_asH=function(data){
  if(!data||data.Type!=='Action')return;
  var txt=JSON.stringify(data);
  if(txt.indexOf('ItemRemove')===-1&&txt.indexOf('ActionRemove')===-1)return;
  var sender=null;
  if(Array.isArray(data.Dictionary)){for(var _di=0;_di<data.Dictionary.length;_di++){if(data.Dictionary[_di].SourceCharacter!=null){sender=data.Dictionary[_di].SourceCharacter;break;}}}
  if(sender===null)sender=data.Sender;
  if(sender===Player.MemberNumber)return;
  var _keys=Object.keys(_asWatchers);
  for(var _wi=0;_wi<_keys.length;_wi++){
    (function(w){
      var allChars=[Player].concat(ChatRoomCharacter||[]);
      var C=null;for(var _ci=0;_ci<allChars.length;_ci++){if(allChars[_ci].MemberNumber===w.memberNum){C=allChars[_ci];break;}}
      if(!C)return;
      // FIX: 150ms warten - BC aktualisiert Appearance nach dem Event (Race Condition)
      setTimeout(function(){
      var item=(typeof InventoryGet==='function')?InventoryGet(C,w.gruppe):null;
      if(item)return;
      _log('\u{1F6E1}\uFE0F AntiStrip: '+w.gruppe+' leer bei '+C.Name+' \u2192 lege wieder an...');
      setTimeout(function(){
        try{
          if(w.itemConfig){
            var ic=w.itemConfig;var col=ic.colors||['#ffffff'];
            if(typeof col==='string'&&col.indexOf(',')!==-1)col=col.split(',');
            InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft||null);
            var itemNow=InventoryGet(C,ic.group);
            if(itemNow){itemNow.Color=col;itemNow.Property=itemNow.Property||{};if(ic.tr&&Object.keys(ic.tr).length){itemNow.Property.TypeRecord=ic.tr;itemNow.Property.Type=ic.typeStr||'';}if(ic.props)Object.assign(itemNow.Property,ic.props);}
          } else if(w.curseEntry){
            var col2=w.curseEntry.Farbe;if(typeof col2==='string'&&col2.indexOf(',')!==-1)col2=col2.split(',');
            InventoryWear(C,w.curseEntry.ItemName,w.curseEntry.Gruppe,col2,0,Player.MemberNumber,w.curseEntry.Craft||null);
          } else if(w.ersatz){
            InventoryWear(C,w.ersatz,w.gruppe,w.farbe||'#ffffff',0,Player.MemberNumber);
          } else {_log('\u26A0 AntiStrip: kein Ersatz konfiguriert fuer '+w.gruppe);return;}
          CharacterRefresh(C);ChatRoomCharacterUpdate(C);
          _log('\u2705 AntiStrip: '+((w.itemConfig&&w.itemConfig.asset)||w.ersatz||'Item')+' wieder angelegt auf '+C.Name);
          // FIX: Freeze nach Wiederherstellung neu setzen wenn /nostrip Kauf
          if(w.nostrip){
            var _rGr=w.gruppe;
            setTimeout(function(){
              try{
                var _rI=InventoryGet(C,_rGr);
                if(_rI){
                  // FIX: Property.Freeze=true ist die echte BC-Sperre
                  _rI.Property=_rI.Property||{};
                  _rI.Property.Freeze=true;
                  if(!_rI.Craft||typeof _rI.Craft!=='object')
                    _rI.Craft={Name:'',Description:'',Property:'Freeze',Color:(_rI.Color||'#ffffff'),Lock:'',Item:(_rI.Asset&&_rI.Asset.Name)||'',Private:false,MemberNumber:Player.MemberNumber};
                  else _rI.Craft.Property='Freeze';
                  CharacterRefresh(C);ChatRoomCharacterUpdate(C);
                  _log('\u{1F512} AntiStrip Freeze+Craft wiederhergestellt: '+C.Name+' / '+_rGr);
                }
              }catch(ex){_log('\u26A0 AntiStrip Freeze Fehler: '+ex.message);}
            },400);
          }
        }catch(ex){_log('\u26A0 AntiStrip Fehler: '+ex.message);}
      },w.delay!=null?w.delay:500);
      },150); // Race Condition Fix
    })(_asWatchers[_keys[_wi]]);
  }
};
ServerSocket.on('ChatRoomMessage',_asH);
// =============================================================

const _msgH=function(data){
  if(!['Chat','Emote','Whisper'].includes(data.Type))return;
  if(data.Sender===Player.MemberNumber)return;
  const tk=data.Type.toLowerCase();
  const C=ChatRoomCharacter.find(c=>c.MemberNumber===data.Sender)??(Player.MemberNumber===data.Sender?Player:null);
  if(!C)return;
  const hearOk=(tk==='chat'&&_cfg.hearChat)||(tk==='emote'&&_cfg.hearEmote)||(tk==='whisper'&&_cfg.hearWhisper);
  if(hearOk)_proc(data.Content,tk,C);else _procEvents(data.Content,tk,C);
};
ServerSocket.on('ChatRoomMessage',_msgH);

window['_BCBot_'+_BID]={
  stop(){
    clearInterval(_itPoll);clearInterval(_joinPoll);clearInterval(_zonePoll);
    try{if(_mod)_mod.removePatches();}catch(e){}
    if(window.__BCBot_origSend_${safeId}){window.ServerSend=window.__BCBot_origSend_${safeId};delete window.__BCBot_origSend_${safeId};}
    if(_asH) ServerSocket.off('ChatRoomMessage',_asH);
    if(_msgH) ServerSocket.off('ChatRoomMessage',_msgH);
    Object.values(_evTimers).forEach(h=>clearTimeout(h));
    delete window['_BCBot_'+_BID];
    window[_stateKey].roomEver=[..._roomEver];
    try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');ls['${safeId}']={fired:_fired,firedCnt:_firedCnt,firedChar:_firedChar,roomEver:[..._roomEver],evFiredCnt:_evFiredCnt,ts:Date.now()};localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}
    console.log('\u23F9 [Bot:${safeName}] gestoppt | States gesichert (Mem+LS)');
  },
  fireEventNow(eid){const ev=_evts.find(e=>e.id===eid);if(!ev){console.warn('[Bot] Event nicht gefunden:',eid);return;}_log('\u25B6 Sofort feuern: "'+ev.name+'"');const savedWdh=ev.wiederholung;ev.wiederholung='immer';_fireEv(ev);ev.wiederholung=savedWdh;},
  fireEvent(eid){this.fireEventNow(eid);},
  clearState(){
    window[_stateKey]={fired:{},firedCnt:{},firedChar:{},roomEver:[],evFiredCnt:{}};
    try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');delete ls['${safeId}'];localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}
    Object.keys(_fired).forEach(k=>delete _fired[k]);Object.keys(_firedCnt).forEach(k=>delete _firedCnt[k]);Object.keys(_firedChar).forEach(k=>delete _firedChar[k]);Object.keys(_evFiredCnt).forEach(k=>delete _evFiredCnt[k]);_roomEver.clear();
    console.log('\u{1F9F9} [Bot:${safeName}] States zurueckgesetzt (Mem+LS)');
  }
};
console.log('\u25B6 [Bot:${safeName}] | Trigger:',_trigs.length,'| Modus:',_cfg.nurEigene?'Nur eigene':'Alle Spieler');
})();`;
}

function botDeployById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  const _code = _buildBotCode(b);
  const _encoded = btoa(unescape(encodeURIComponent(_code)));
  const _wrapper = `(new Function(decodeURIComponent(escape(atob('${_encoded}'))))())`;
  bcSend({ type:'EXEC', code: _wrapper });
  b.laufend = true; _saveBots(); renderBotList();
  if (_selBotId === id) {
    const bar = document.getElementById('bot-status-bar');
    if (bar) { bar.className='bot-status running'; bar.textContent='▶️ Bot "'+b.name+'" läuft'; }
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
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });
  setTimeout(() => {
    const latest = _selBot(); if (!latest) return;
    bcSend({ type:'EXEC', code: _buildBotCode(latest) });
    latest.laufend = true; _saveBots(); renderBotList(); renderBotEditor();
    showStatus('✅ Bot synchronisiert und neu gestartet', 'success');
  }, 700);
}