const BOT_ENGINE_VERSION = '1.5.0';
window.BOT_ENGINE_VERSION = BOT_ENGINE_VERSION;

function _buildBotCode(bot) {
  const s = bot.settings;
  const triggers = (bot.triggers||[]).filter(t=>t.aktiv).map(t => ({
    id: t.id, name: t.name, delay: t.delay??0,
      wiederholung: t.wiederholung??'immer', maxMal: t.maxMal??2, cooldownSek: t.cooldownSek??0,
      fallbackTyp: t.fallbackTyp??'nichts', fallbackText: t.fallbackText??'',
      charSpec: !!t.charSpec, resetOnLeave: !!t.resetOnLeave,
      von: t.von??'alle',
      vonNummern: (t.vonNummern||[]).map(Number),
      // vonRangId fehlte hier - der Rang-Filter kam nie im Bot an und liess
      // dadurch jeden durch.
      vonRangId: t.vonRangId??'',
      cooldownGlobalSek: t.cooldownGlobalSek??0,
      prioritaet: Number(t.prioritaet)||0,
      stopptWeitere: !!t.stopptWeitere,
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
  const _cfgRaw = JSON.stringify({hearChat:s.hearChat,hearEmote:s.hearEmote,hearWhisper:s.hearWhisper,nurEigene:s.nurEigene,logAktiv:s.logAktiv??true,modus:s.modus,moneyQueryCmd:_money?.settings?.queryCmd??'',moneyQueryTyp:_money?.settings?.queryTyp??'whisper',moneyName:_money?.settings?.name??'Gold',rankQueryCmd:_rankData?.settings?.queryCmd??'',rankQueryTyp:_rankData?.settings?.queryCmdTyp??'whisper',rankQueryText:_rankData?.settings?.queryCmdText??'{name} hat Rang: {rang_icon} {rang}',rankDefs:_rankData?.defs??[],rankPlayers:Object.fromEntries(Object.entries(_rankData?.players??{}).map(([k,v])=>[k,v.rankId??null])),shopCmd:_shop?.settings?.cmd??'!pay',shopListCmd:_shop?.settings?.listCmd??'!shop',shopAnnounceNostripMsg:_shop?.settings?.announceNostripMsg??'',shopConfirmMsg:_shop?.settings?.confirmMsg??'',shopAnnounceMsg:_shop?.settings?.announceMsg??'',shopAnnounceAllMsg:_shop?.settings?.announceAllMsg??'',shopErrorMsg:_shop?.settings?.errorMsg??'',shopPreisU:_shop?.settings?.preisU??0,shopPreisNostrip:_shop?.settings?.preisNostrip??0,shopItems:(_shop?.items??[]).filter(i=>i.aktiv!==false),moneyBalances:Object.fromEntries(Object.entries(_money?.balances??{}).map(([k,v])=>[k,{balance:v.balance??0,name:v.name??''}])),botVars:(typeof _botVars!=='undefined'&&_botVars)?_botVars:{},playerKeys:(typeof _playerKeys!=='undefined'&&_playerKeys)?_playerKeys:{},figurName:s.figurName??'',figurRede:s.figurRede??'[{figur}] {text}',figurErzaehler:s.figurErzaehler??'{text}'});
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
  const scenesJson = btoa(unescape(encodeURIComponent(JSON.stringify(bot.szenen||[]))));
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
const _BOTID=${JSON.stringify(bot.id)};
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
/* Kalendertag als Schluessel - fuer die Wiederholung "einmal pro Tag". */
function _heuteKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
const _firedTag=_savedState.firedTag??{};       // trigId_mn -> 'JJJJ-M-T'
const _firedBesuch=_savedState.firedBesuch??{}; // trigId_mn -> true, faellt beim Verlassen weg
/* Wo steht wer in welcher Geschichte. Bisher lebte der Szenen-Fortschritt nur
   in _sceneWait im Arbeitsspeicher - Bot-Neustart, BC-Reload oder kurzes
   Verlassen des Raums setzten jede Erzaehlung auf Anfang zurueck. Jetzt wird
   die Stelle mitgeschrieben und ueberlebt.
     mn -> { sid, stepId, ts, wartet }                                       */
const _story=_savedState.story??{};
window[_stateKey]={fired:_fired,firedCnt:_firedCnt,firedChar:_firedChar,roomEver:_roomEver,
                   firedTag:_firedTag,firedBesuch:_firedBesuch,story:_story};
// Quick lookup: trigId -> trigger config (for charSpec)
/* Hoehere Prioritaet zuerst. Array.sort ist stabil, gleiche Prioritaet
   behaelt also die Reihenfolge aus der Liste. */
_trigs.sort((a,b)=>(Number(b.prioritaet)||0)-(Number(a.prioritaet)||0));
const _trigMap=Object.fromEntries(_trigs.map(t=>[t.id,t]));
// Pre-filtered trigger lists for each poll type (avoids re-filtering every tick)
/* Sucht einen Bedingungstyp - AUCH innerhalb von Klammer-Gruppen. Ohne diese
   Rekursion waren Bedingungen in einer Klammer fuer die Zuordnung zu den
   Pollern unsichtbar: der Trigger wurde dann von gar keinem Poll ueberwacht
   und feuerte nur noch, wenn zufaellig jemand etwas in den Chat schrieb. */
function _hatTyp(beds,typen){
  return (beds??[]).some(function(c){
    if(c&&c.typ==='gruppe')return _hatTyp(c.kinder,typen);
    return c&&typen.indexOf(c.typ)>=0;
  });
}
/* Alles, was vom Zustand einer Person abhaengt und sich ohne Chatnachricht
   aendern kann - wird darum wie "Item traegt" ueberwacht und feuert bei
   Aenderung, nicht erst beim naechsten Chat. */
const _ZUSTAND_TYPEN=['item_traegt','item_traegt_nicht','gefesselt','geknebelt','blind',
                      'bewegung_blockiert','item_gruppe','craft_getragen','schloss'];
const _itTrigs=_trigs.filter(t=>_hatTyp(t.bedingungen,_ZUSTAND_TYPEN)&&!_hatTyp(t.bedingungen,['wort']));
const _zoneTrigs=_trigs.filter(t=>_hatTyp(t.bedingungen,['zone','zone_rect'])&&!_hatTyp(t.bedingungen,['wort','player_betritt']));
const _joinTrigs=_trigs.filter(t=>_hatTyp(t.bedingungen,['player_betritt']));
// Erregung als primärer Auslöser (gepollt) – nur wenn kein anderes Auslöse-Event vorhanden ist
const _arTrigs=_trigs.filter(t=>_hatTyp(t.bedingungen,['erregung'])&&!_hatTyp(t.bedingungen,['wort','zone','zone_rect','player_betritt','ev_timer','ev_interval'].concat(_ZUSTAND_TYPEN)));
// Rejoin-Fenster: memberNum → true – schließt wenn Nicht-Rejoin-Trigger feuert
const _rejoinWindow=new Map(); // memberNum → timestamp when opened
const _REJOIN_GRACE=1000; // ms window stays open regardless of other triggers
const _evts=JSON.parse(decodeURIComponent(escape(atob('${eventsJson}'))));
const _scenes=JSON.parse(decodeURIComponent(escape(atob('${scenesJson}'))));
// ════════════════════ SZENEN-LAUFZEIT (Story-Player) ════════════════════
var _sceneVars  = (_cfg&&_cfg.botVars)?JSON.parse(JSON.stringify(_cfg.botVars)):{};   // persistente Variablen/Flags pro Spieler (aus Profilen)
var _sceneWait  = {};   // memberNum -> wartet auf Antwort
var _sceneRunId = 0;
function _vget(mn,name){ return (_sceneVars[mn]||{})[name]; }
function _vset(mn,name,val){
  (_sceneVars[mn]=_sceneVars[mn]||{})[name]=val;
  try{window.__BCK_popupRef&&window.__BCK_popupRef.postMessage({app:'BCKonfigurator',type:'BOT_VAR',memberNum:mn,name:name,value:val},'*');}catch(e){}
}
// Trigger-Bedingung auf eine Variable/Punkte prüfen (nutzt _scTruth + persistente Vars)
function _varCondOk(c,C){
  if(!c||!c.varName) return true;
  return _scTruth(_vget(C&&C.MemberNumber, c.varName), c.varCmp||'==', c.varWert);
}
// Wahrscheinlichkeits-Bedingung: X% Chance, dass sie zutrifft
function _chanceOk(c){ return Math.random()*100 < (Number(c&&c.prozent)||0); }
// Erregungs-Bedingung: prüft die Erregung (ArousalSettings.Progress, 0-100)
function _arousalOk(c,C){
  var ar=(C&&C.ArousalSettings&&typeof C.ArousalSettings.Progress==='number')?C.ArousalSettings.Progress:0;
  var w=Number(c&&c.arWert)||0, op=(c&&c.arCmp)||'>=';
  if(op==='<=')return ar<=w; if(op==='>')return ar>w; if(op==='<')return ar<w; if(op==='==')return Math.round(ar)===w;
  return ar>=w;
}
function _scTpl(s,C){
  var mn=C&&C.MemberNumber;
  var out=String(s==null?'':s).replace(/\{v:([^}]+)\}/g,function(_m,n){var val=_vget(mn,String(n).trim());return val==null?'':String(val);});
  return _tpl(out,{name:C&&C.Name,C:C,memberNum:mn});
}
/* Die Figur des Bots. Erzaehltext und Figurenrede sehen unterschiedlich aus,
   damit im Chat erkennbar ist, wer gerade spricht. Ohne gesetzten Namen
   bleibt alles wie bisher - bestehende Szenen aendern sich also nicht. */
function _figurName(){ return _cfg.figurName||''; }
function _figurFormat(text,wer){
  const name=_figurName();
  if(!name)return text;                       // keine Figur eingerichtet
  const muster=(wer==='figur')?(_cfg.figurRede||'[{figur}] {text}')
                             :(_cfg.figurErzaehler||'{text}');
  return String(muster).replace(/\{figur\}/gi,name).replace(/\{text\}/gi,text);
}

function _scSend(typ,txt,C){
  if(typ==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
  else if(typ==='emote')ServerSend('ChatRoomChat',{Content:txt,Type:'Emote'});
  else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
}
function _scVarApply(mn,op,name,wert){
  if(!name)return;
  var cur=_vget(mn,name), curN=Number(cur)||0, wN=Number(wert), nv;
  if(op==='add') nv=curN+(isNaN(wN)?0:wN);
  else if(op==='sub') nv=curN-(isNaN(wN)?0:wN);
  else if(op==='toggle') nv=(cur?0:1);
  else nv=isNaN(wN)||wert===''||wert==null?wert:wN; // set
  _vset(mn,name,nv);
}
function _scTruth(cur,op,wert){
  var curN=Number(cur), wN=Number(wert);
  if(op==='!=') return String(cur)!==String(wert);
  if(op==='>')  return curN>wN;
  if(op==='<')  return curN<wN;
  if(op==='>=') return curN>=wN;
  if(op==='<=') return curN<=wN;
  if(op==='gesetzt') return cur!=null&&cur!==''&&cur!==0&&cur!=='0';
  if(op==='leer')    return cur==null||cur===''||cur===0||cur==='0';
  return String(cur)===String(wert); // '=='
}
function _scGoto(sc,steps,ziel,curIdx,C){
  if(ziel==='ende')return;
  if(!ziel){_scStep(sc,steps,curIdx+1,C);return;}
  var j=steps.findIndex(function(s){return s.id===ziel;});
  _scStep(sc,steps,(j<0?curIdx+1:j),C);
}
function _scStep(sc,steps,idx,C){
  if(idx<0||idx>=steps.length){_storyEnde(C&&C.MemberNumber);return;}
  var st=steps[idx], mn=C.MemberNumber;
  // Stelle festhalten, BEVOR der Schritt laeuft - sonst geht bei einem
  // Abbruch mittendrin genau der aktuelle Schritt verloren.
  _storyMerk(mn,sc.id,st.id,st.typ==='frage');
  try{
    if(st.typ==='nachricht'){
      if(st.text)_scSend(st.msgTyp,_figurFormat(_scTpl(st.text,C),st.wer||'erzaehler'),C);
      setTimeout(function(){_scStep(sc,steps,idx+1,C);},(Number(st.pause)||0)*1000);
    } else if(st.typ==='warte'){
      setTimeout(function(){_scStep(sc,steps,idx+1,C);},(Number(st.sek)||0)*1000);
    } else if(st.typ==='variable'){
      _scVarApply(mn,st.varOp||'set',st.varName,st.varWert);
      _scStep(sc,steps,idx+1,C);
    } else if(st.typ==='wenn'){
      var truth=_scTruth(_vget(mn,st.varName),st.varCmp||'==',st.varWert);
      _scGoto(sc,steps,truth?st.zielJa:st.zielNein,idx,C);
    } else if(st.typ==='frage'){
      // Antwortmoeglichkeiten koennen an eine Bedingung geknuepft sein -
      // "das Messer ziehen" nur, wenn man eins hat.
      var _moeglich=(st.antworten||[]).filter(function(an){
        if(!an.bedVar)return true;
        return _scTruth(_vget(mn,an.bedVar),an.bedCmp||'==',an.bedWert);
      });
      var _frageText=st.text?_scTpl(st.text,C):'';
      if(st.auswahlZeigen&&_moeglich.length){
        // Sichtbare Auswahl statt Stichwort-Raten
        var _liste=_moeglich.map(function(an,i){
          return (i+1)+') '+(an.label||an.wort||('Antwort '+(i+1)));
        }).join('   ');
        _frageText=(_frageText?_frageText+'\\n':'')+_liste;
      }
      if(_frageText)_scSend(st.msgTyp,_figurFormat(_frageText,st.wer||'figur'),C);
      var rid=++_sceneRunId;
      var w={sid:sc.id,steps:steps,idx:idx,answers:_moeglich,rid:rid,timer:null,
             zeigt:!!st.auswahlZeigen};
      if(Number(st.timeout)>0){
        w.timer=setTimeout(function(){
          if(_sceneWait[mn]&&_sceneWait[mn].rid===rid){
            delete _sceneWait[mn];
            // Bei Zeitablauf greift eine als Standard markierte Antwort,
            // sonst das eigens dafuer hinterlegte Ziel.
            var _std=_moeglich.find(function(an){return an.standard;});
            _scGoto(sc,steps,_std?_std.ziel:st.timeoutZiel,idx,C);
          }
        },Number(st.timeout)*1000);
      }
      _sceneWait[mn]=w;
    } else if(st.typ==='aktion'){
      // Ueber _runSeq statt _execAct: so erbt die Szene die vorhandene
      // Ziel-Aufloesung (diese Person / alle ausser dem Ausloeser / nach Rang /
      // zufaellig). Erst wenn die Kette durch ist, geht die Erzaehlung weiter -
      // sonst ueberholen sich Text und Wirkung.
      var _akt=st.aktionen||[];
      if(!_akt.length){ _scStep(sc,steps,idx+1,C); }
      else {
        var _weiter=function(){ _scStep(sc,steps,idx+1,C); };
        var _pseudo={id:'szene_'+sc.id, name:'Szene: '+(sc.name||sc.id)+', Schritt '+(idx+1),
                     delay:0, fallbackTyp:'nichts'};
        _runSeq(_akt, C, {name:C.Name,wort:'',typ:'Szene',x:C.X??0,y:C.Y??0,zone:'',C},
                _pseudo, _weiter,
                function(){ // eine Aktion meldete "ungueltig"
                  _log('\u26A0 Szene "'+sc.name+'" Schritt '+(idx+1)+': Aktion fehlgeschlagen');
                  if(st.beiFehler==='stopp'){ _storyEnde(mn); return; }
                  _weiter();
                });
      }
    } else if(st.typ==='sprung'){
      _scGoto(sc,steps,st.ziel,idx,C);
    } else if(st.typ==='ende'){
      _storyEnde(mn);
      return;
    } else {
      _scStep(sc,steps,idx+1,C);
    }
  }catch(ex){_log('Szenen-Schritt Fehler:',ex.message);}
}
/* Stelle merken bzw. vergessen. */
function _storyMerk(mn,sid,stepId,wartet){
  if(mn==null)return;
  _story[mn]={sid:sid,stepId:stepId,ts:Date.now(),wartet:!!wartet};
}
function _storyEnde(mn){ if(mn!=null) delete _story[mn]; }

/* Fortsetzen, wenn jemand mit offener Geschichte wiederkommt.
   Ein wartender frage-Schritt kann seinen Timer nicht ueberleben - er wird
   deshalb neu gestellt. Das ist auch erzaehlerisch richtig: der Gegenueber
   saehe die Frage sonst nicht mehr. */
function _storyFortsetzen(C){
  if(!C||!C.MemberNumber)return false;
  const st=_story[C.MemberNumber];
  if(!st||!st.sid)return false;
  const sc=(_scenes||[]).find(function(x){return x.id===st.sid;});
  if(!sc){_storyEnde(C.MemberNumber);return false;}          // Szene geloescht
  const modus=sc.fortsetzen||'fragen';
  if(modus==='nein'){_storyEnde(C.MemberNumber);return false;}
  const steps=sc.steps||[];
  const idx=steps.findIndex(function(x){return x.id===st.stepId;});
  if(idx<0){_storyEnde(C.MemberNumber);return false;}        // Schritt geloescht
  if(sc.rueckkehrText)_scSend(sc.rueckkehrTyp||'emote',_scTpl(sc.rueckkehrText,C),C);
  _log('\u{1F4D6} Geschichte "'+sc.name+'" fuer '+C.Name+' fortgesetzt (Schritt '+(idx+1)+')');
  setTimeout(function(){_scStep(sc,steps,idx,C);}, modus==='auto'?1200:1200);
  return true;
}

function _playScene(sid,C,vars,startId){
  if(!C||!C.MemberNumber)return;
  var sc=(_scenes||[]).find(function(x){return x.id===sid;});
  if(!sc){_log('Szene nicht gefunden:',sid);return;}
  var mn=C.MemberNumber;
  if(_sceneWait[mn]){try{clearTimeout(_sceneWait[mn].timer);}catch(e){}delete _sceneWait[mn];}
  var steps=sc.steps||[];
  var idx=startId==null?0:steps.findIndex(function(s){return s.id===startId;});
  if(idx<0)idx=0;
  _log('Szene start:',sc.name,'für',C.Name);
  _scStep(sc,steps,idx,C);
}
function _sceneHandleAnswer(rohText,C){
  if(!C||!C.MemberNumber)return false;
  var w=_sceneWait[C.MemberNumber];if(!w)return false;
  var roh=String(rohText||'').trim();
  var txt=roh.toLowerCase();
  var antworten=w.answers||[];
  // 1) Zahl - nur wenn die Auswahl auch angezeigt wurde, sonst wuerde eine
  //    beilaeufige "2" im Chat ungewollt antworten.
  var match=null;
  if(w.zeigt&&/^[0-9]{1,2}[).:]?$/.test(roh)){
    var nr=parseInt(roh,10);
    if(nr>=1&&nr<=antworten.length)match=antworten[nr-1];
  }
  // 2) Genauer Antworttext
  if(!match)match=antworten.find(function(a){
    var l=(a.label||'').toLowerCase();
    return l&&l===txt;
  });
  // 3) Wie bisher: Stichwort kommt im Text vor
  if(!match)match=antworten.find(function(a){return a.wort&&txt.indexOf(String(a.wort).toLowerCase())!==-1;});
  if(!match)return false;
  try{clearTimeout(w.timer);}catch(e){}
  delete _sceneWait[C.MemberNumber];
  var sc=(_scenes||[]).find(function(x){return x.id===w.sid;});
  if(sc)_scGoto(sc,w.steps,match.ziel,w.idx,C);
  return true;
}


// Rang-State: memberNum -> aktueller rankId (laut Popup-State)
// Beim Start mit gespeicherten Spieler-Rang-Zuweisungen initialisieren
const _rangState=Object.assign({},_cfg.rankPlayers??{});
// Pre-sorted rank defs (avoids repeated in-place sort on every condition check)
const _rankDefs=[...(_cfg.rankDefs??[])].sort((a,b)=>a.level-b.level);

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

/* ── Zustand eines Charakters ────────────────────────────────────────────
   BCs eigene Methoden zuerst; gibt es sie nicht, wird ueber die Effect-Listen
   der getragenen Items ausgewertet – dieselbe Quelle, aus der auch der Scanner
   in loader.js liest. Damit haengt nichts an einer unbestaetigten API. */
const _GAG_STUFEN=['GagVeryLight','GagLight','GagEasy','GagNormal','GagMedium',
                   'GagHeavy','GagVeryHeavy','GagTotal','GagTotal2','GagTotal3','GagTotal4'];
const _BLIND_EFF=['BlindLight','BlindNormal','BlindHeavy','BlindTotal'];
const _FESSEL_EFF=['Block','Freeze','Prone','ForceKneel','Tethered','Mounted','Enclose'];
const _GEH_EFF=['Freeze','Prone','ForceKneel','Tethered','Mounted','Enclose','Slow'];

function _effekte(C){
  const raus=[];
  for(const it of (C?.Appearance??[])){
    const a=it?.Asset?.Effect, pr=it?.Property?.Effect;
    if(Array.isArray(a))raus.push(...a);
    if(Array.isArray(pr))raus.push(...pr);
  }
  return raus;
}
function _hatEffekt(C,liste){
  const e=_effekte(C);
  return liste.some(x=>e.indexOf(x)>=0);
}
/* 0 = nicht geknebelt, sonst 1..11 nach _GAG_STUFEN */
function _knebelStufe(C){
  let max=0;
  for(const e of _effekte(C)){ const i=_GAG_STUFEN.indexOf(e); if(i>=0&&i+1>max)max=i+1; }
  return max;
}
function _zustand(C,was){
  try{
    if(was==='gefesselt') return (typeof C.IsRestrained==='function')?!!C.IsRestrained():_hatEffekt(C,_FESSEL_EFF);
    if(was==='blind')     return (typeof C.IsBlind==='function')    ?!!C.IsBlind()    :_hatEffekt(C,_BLIND_EFF);
    if(was==='stumm')     return (typeof C.CanTalk==='function')    ?!C.CanTalk()     :_knebelStufe(C)>0;
    if(was==='steht')     return (typeof C.CanWalk==='function')    ?!C.CanWalk()     :_hatEffekt(C,_GEH_EFF);
  }catch(e){}
  return false;
}
/* Frischen Charakter aus dem Raum holen – die Appearance im uebergebenen
   Objekt kann veraltet sein. */
function _frisch(C){ return (ChatRoomCharacter||[]).find(x=>x.MemberNumber===C.MemberNumber)??C; }

/* -- Wer darf ausloesen ---------------------------------------------------
   Diese Pruefung stand NEUNMAL im Code, in fuenf leicht verschiedenen
   Fassungen. Zwei Modelle sind es tatsaechlich: Trigger kennen eine Liste
   ("whitelist" + vonNummern), Events nur eine einzelne Nummer ("nummer" +
   vonNummer). Deshalb zwei Funktionen statt einer - ein blindes
   Zusammenlegen haette die Events stillschweigend kaputt gemacht.       */
/* Erreicht die Person mindestens den angegebenen Rang? */
function _rangMindestens(C, rangId) {
  if (!rangId) return true;
  const ziel = _rankDefs.find(r => r.id === rangId);
  const hat  = _rankDefs.find(r => r.id === (_rangState[C.MemberNumber] ?? null));
  if (!ziel || !hat) return false;
  return hat.level >= ziel.level;
}

function _vonOk(trig, C) {
  const nummern = () => (trig.vonNummern||[]).map(Number);
  if (trig.von === 'bot')       return C.MemberNumber === Player.MemberNumber;
  if (trig.von === 'whitelist') return nummern().includes(Number(C.MemberNumber));
  // ── neu ──────────────────────────────────────────────────────────
  if (trig.von === 'blacklist') return !nummern().includes(Number(C.MemberNumber));
  if (trig.von === 'nicht_bot') return C.MemberNumber !== Player.MemberNumber;
  if (trig.von === 'rang')      return _rangMindestens(C, trig.vonRangId);
  return true;   // 'alle'
}
function _vonOkEv(ev, C) {
  if (ev.von === 'bot')    return C.MemberNumber === Player.MemberNumber;
  if (ev.von === 'nummer') return ev.vonNummer && C.MemberNumber === +ev.vonNummer;
  return true;   // 'alle'
}

/* ── Bedingungspruefung – eine Stelle fuer alle Wege ─────────────────────
   Diese Auswertung stand vorher SECHSMAL im Code: in _ok, _okIf, _okEv und
   noch einmal inline in den Polls fuer Items, Erregung und Zonen. Die drei
   Poll-Kopien waren dabei abgedriftet – sie verbanden alle Bedingungen mit
   .every(), also reinem UND, und werteten das logik-Feld ueberhaupt nicht
   aus. Ein Trigger "Zone A ODER Zone B" feuerte darum ueber den Chat
   korrekt, ueber den Zonen-Poll aber nie.

   ctx-Felder:
     C              Charakter, gegen den geprueft wird
     rohText/typKey Chat-Kontext (bei Polls leer)
     ueberspringe   Typen, die der Aufrufer bereits selbst geprueft hat
     nur            umgekehrt: NUR diese Typen pruefen, Rest gilt als erfuellt
     wortOhneText   true = 'wort' gilt ohne Chat-Text als erfuellt (Events)
     zoneLog        true = Zonen-Fehlschlag ins Log (nur der Chat-Weg)
     shopBlockt     true = 'shop_kauf' sperrt (nur der Chat-Weg)
     istRejoinTrig  true = Rejoin-Sonderfall bei 'trigger_war' (Beitritt)   */
function _checkCond(c,ctx){
  // Eine Klammer ist ein Behaelter, kein Bedingungstyp - sie darf nie
  // uebersprungen werden, sonst gaelte sie pauschal als erfuellt und der
  // Trigger wuerde feuern, obwohl nichts darin zutrifft. Die Filter greifen
  // eine Ebene tiefer, bei den Bedingungen IN der Klammer.
  if(c.typ!=='gruppe'){
    if(ctx.ueberspringe&&ctx.ueberspringe.indexOf(c.typ)>=0)return true;
    if(ctx.nur&&ctx.nur.indexOf(c.typ)<0)return true;
  }
  const C=ctx.C, cx=C.X??-999, cy=C.Y??-999;
  switch(c.typ){
    case 'wort':{
      if(ctx.wortOhneText&&!ctx.rohText)return true; // Timer/Intervall: kein Text
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==ctx.typKey)return false;
      const t=(ctx.rohText||'').toLowerCase(), w=(c.wort||'').toLowerCase();
      return (c.modus==='fehlt')?(!!c.wort&&!!ctx.rohText&&!t.includes(w)):(!c.wort||t.includes(w));
    }
    case 'zone':{
      const p=c.puffer??1;
      const ok=cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
      if(!ok&&ctx.zoneLog)_log('Zone miss: X='+cx+' Y='+cy+' erwartet X='+c.x+' Y='+c.y+'\u00b1'+p);
      return ok;
    }
    case 'zone_rect':
      return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
    case 'item_traegt':{
      const Cf=(ChatRoomCharacter||[]).find(x=>x.MemberNumber===C.MemberNumber)??C;
      return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    case 'item_traegt_nicht':{
      const Cf=(ChatRoomCharacter||[]).find(x=>x.MemberNumber===C.MemberNumber)??C;
      return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    case 'trigger_war':{
      // Beim Rejoin: verweist ein Rejoin-Trigger auf einen anderen
      // Rejoin-Trigger, gilt die Bedingung als erfuellt – beide feuern im
      // selben Fenster, die Reihenfolge ist nicht garantiert.
      if(ctx.istRejoinTrig){
        const refT=_trigMap[c.trigId];
        if((refT?.bedingungen??[]).some(bc=>bc.typ==='player_betritt'&&bc.betritt_typ==='rejoin'))return true;
      }
      const ref=_trigMap[c.trigId];
      return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
    }
    case 'variable': return _varCondOk(c,C);
    case 'zufall':   return _chanceOk(c);
    case 'erregung': return _arousalOk(c,C);
    case 'rang':{
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein')return !currentId;
      if(!c.rang_id)return false;
      const targetDef=_rankDefs.find(r=>r.id===c.rang_id);
      const currentDef=_rankDefs.find(r=>r.id===currentId);
      if(!targetDef||!currentDef)return false; // kein Rang -> nicht erfuellt
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')  return cl===tl;
      if(op==='min')return cl>=tl;
      if(op==='max')return cl<=tl;
      return false;
    }
    // Sperrt nur den Chat-Weg: ein Shop-Trigger soll dort nicht durch
    // gewoehnliche Nachrichten feuern. Fuer IF-Zweige, Events und Polls galt
    // die Bedingung schon immer als erfuellt – das bleibt so.

    // ── Zustand ─────────────────────────────────────────────────────────
    case 'gefesselt':          return (c.modus==='nicht')!==_zustand(_frisch(C),'gefesselt');
    case 'blind':              return (c.modus==='nicht')!==_zustand(_frisch(C),'blind');
    case 'bewegung_blockiert': return (c.modus==='nicht')!==_zustand(_frisch(C),'steht');
    case 'geknebelt':{
      const stufe=_knebelStufe(_frisch(C));
      const noetig={leicht:1,mittel:4,schwer:6}[c.stufe]??1;   // 'egal' -> mindestens leicht
      const ja=(typeof _frisch(C).CanTalk==='function'&&c.stufe==='egal')
        ? _zustand(_frisch(C),'stumm') : stufe>=noetig;
      return (c.modus==='nicht')!==ja;
    }
    case 'item_gruppe':{
      const ja=(_frisch(C).Appearance??[]).some(a=>a.Asset?.Group?.Name===c.gruppe);
      return (c.modus==='nicht')!==ja;
    }
    case 'craft_getragen':{
      const n=String(c.craftName||'').trim().toLowerCase();
      const ja=!n||(_frisch(C).Appearance??[]).some(a=>String(a.Craft?.Name||'').toLowerCase()===n);
      return (c.modus==='nicht')!==ja;
    }
    case 'schloss':{
      const typ=String(c.lockTyp||'').trim().toLowerCase();
      const ja=(_frisch(C).Appearance??[]).some(a=>{
        const lb=a.Property?.LockedBy; if(!lb)return false;
        return !typ||String(lb).toLowerCase()===typ;
      });
      return (c.modus==='nicht')!==ja;
    }

    // ── Zeit (reines JavaScript, unabhaengig von BC) ─────────────────────
    case 'uhrzeit':{
      const zuMin=t=>{const [h,m]=String(t||'0:00').split(':');return (+h||0)*60+(+m||0);};
      const jetzt=new Date(), m=jetzt.getHours()*60+jetzt.getMinutes();
      const von=zuMin(c.von), bis=zuMin(c.bis);
      return von<=bis ? (m>=von&&m<=bis) : (m>=von||m<=bis);  // ueber Mitternacht
    }
    case 'wochentag':{
      const tage=(c.tage||[]).map(Number);
      return !tage.length||tage.indexOf(new Date().getDay())>=0;
    }
    case 'datum':{
      const tag=d=>{const x=new Date(d); return isNaN(x.getTime())?null:(x.setHours(0,0,0,0),x.getTime());};
      const heute=new Date(); heute.setHours(0,0,0,0);
      const von=c.von?tag(c.von):null, bis=c.bis?tag(c.bis):null;
      if(von!==null&&heute.getTime()<von)return false;
      if(bis!==null&&heute.getTime()>bis)return false;
      return true;
    }

    // ── Raum und Variablen ───────────────────────────────────────────────
    case 'anzahl_im_raum':{
      const n=(ChatRoomCharacter||[]).length, w=Number(c.wert)||0;
      const op=c.op||'min';
      return op==='min'?n>=w:op==='max'?n<=w:n===w;
    }
    case 'raumname':{
      const rn=(typeof ChatRoomData!=='undefined'&&ChatRoomData&&ChatRoomData.Name)?String(ChatRoomData.Name):'';
      const w=String(c.wert||'').trim();
      if(!w)return true;
      return (c.modus==='enthaelt')
        ? rn.toLowerCase().indexOf(w.toLowerCase())>=0
        : rn.toLowerCase()===w.toLowerCase();
    }
    case 'variable2':{
      const a=_vget(C.MemberNumber,String(c.varA||'')), b=_vget(C.MemberNumber,String(c.varB||''));
      return _scTruth(a,c.op||'==',b);
    }

    // Eine Gruppe ist eine geklammerte Teilbedingung: (A oder B).
    // _gruppenOk ruft sich dafuer selbst auf. Bestehende flache Listen
    // enthalten keine Gruppen und verhalten sich deshalb unveraendert.
    case 'gruppe':
      return _gruppenOk(c.kinder??[], ctx, c.verknuepfung||'und');

    // ── Fremde Geschichten lesen ────────────────────────────────────────
    // Die Wirkung AUF andere gibt es schon ueber das Aktions-Ziel; hier fehlte
    // die Gegenrichtung: nachsehen, wie weit jemand anderes ist.
    case 'andere_variable':{
      const wen=String(c.wer||'');
      const leute=(ChatRoomCharacter||[]).filter(x=>
        wen==='' || wen==='irgendwer' ? true : String(x.MemberNumber)===wen);
      if(!leute.length)return false;                    // Person nicht im Raum
      const trifft=x=>_scTruth(_vget(x.MemberNumber,String(c.varName||'')),c.varCmp||'==',c.varWert);
      return (wen==='irgendwer'||wen==='') ? leute.some(trifft) : leute.every(trifft);
    }
    case 'andere_szene':{
      const wen=String(c.wer||'');
      const leute=(ChatRoomCharacter||[]).filter(x=>
        wen==='' || wen==='irgendwer' ? true : String(x.MemberNumber)===wen);
      if(!leute.length)return false;
      const trifft=x=>{
        const st=_story[x.MemberNumber];
        const drin=!!st && (!c.szeneId || st.sid===c.szeneId);
        return (c.modus==='fertig') ? !drin : drin;     // 'fertig' = nicht (mehr) darin
      };
      return (wen==='irgendwer'||wen==='') ? leute.some(trifft) : leute.every(trifft);
    }
    case 'zusammen_im_raum':{
      const noetig=(c.nummern||[]).map(Number).filter(n=>n>0);
      if(!noetig.length)return true;
      const da=new Set((ChatRoomCharacter||[]).map(x=>Number(x.MemberNumber)));
      return noetig.every(n=>da.has(n));
    }

    case 'shop_kauf':      return !ctx.shopBlockt;
    case 'player_betritt': return true;  // vom Join-Poll behandelt
    default:               return true;
  }
}

/* UND/ODER-Gruppen. logik verbindet eine Bedingung mit der VORHERIGEN – die
   erste hat keine. Steht dort trotzdem etwas (Verschieben/Loeschen in der UI
   oder JSON-Import), wird es ignoriert, genau wie die Oberflaeche es anzeigt:
   sonst entstuende bei 'oder' eine leere erste Gruppe, und [].every() ist true
   -> saemtliche Bedingungen waeren ausgehebelt. Aus demselben Grund gilt
   'und_nicht' erst ab der zweiten Bedingung. */
function _gruppenOk(beds,ctx,verknuepfung){
  if(!beds||!beds.length)return true;
  // Innerhalb einer Klammer-Gruppe entscheidet deren eigene Verknuepfung:
  // 'oder' = eine genuegt, sonst muessen alle passen. Das logik-Feld der
  // Kinder wird dann nicht gebraucht.
  if(verknuepfung==='oder')
    return beds.some(c=>_checkCond(c,ctx));
  if(verknuepfung==='und')
    return beds.every(c=>_checkCond(c,ctx));
  const groups=[[]];
  beds.forEach((c,i)=>{
    if(i>0&&(c.logik==='oder'||c.logik==='und_oder'))groups.push([]);
    groups[groups.length-1].push(c);
  });
  const erste=beds[0];
  // Erst Ueberspringen pruefen, DANN erst negieren: was der Aufrufer bereits
  // selbst geprueft hat, ist neutral – 'und_nicht' wuerde es sonst in false
  // verkehren und der Trigger koennte nie feuern.
  const passt=c=>{
    if(c.typ!=='gruppe'){   // Klammern immer betreten, siehe _checkCond
      if(ctx.ueberspringe&&ctx.ueberspringe.indexOf(c.typ)>=0)return true;
      if(ctx.nur&&ctx.nur.indexOf(c.typ)<0)return true;
    }
    return (c!==erste&&c.logik==='und_nicht')?!_checkCond(c,ctx):_checkCond(c,ctx);
  };
  return groups.some(g=>g.every(passt));
}

function _ok(trig,rohText,typKey,C){
  return _gruppenOk(trig.bedingungen??[],{C,rohText,typKey,zoneLog:true,shopBlockt:true});
}

// ── IF-Bedingungen Check (entscheidet DANN vs. SONST wenn ifElse aktiv) ──
function _okIf(trig,rohText,typKey,C){
  // Kein wortOhneText: die Polls rufen mit '' auf, und dort galt eine
  // gesetzte Wort-Bedingung bisher als NICHT erfuellt. Bleibt so.
  return _gruppenOk(trig.ifBedingungen??[],{C,rohText,typKey});
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
  let allSlots=a.tpSlots??[];
  if(a.tpMode==='bereich'){
    const ax=Math.min(a.tpAx??0,a.tpBx??0), bx=Math.max(a.tpAx??0,a.tpBx??0);
    const ay=Math.min(a.tpAy??0,a.tpBy??0), by=Math.max(a.tpAy??0,a.tpBy??0);
    const cells=[];
    for(let xx=ax;xx<=bx;xx++)for(let yy=ay;yy<=by;yy++)cells.push({x:xx,y:yy,gueltig:true});
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=cells[i];cells[i]=cells[j];cells[j]=t;}
    allSlots=cells;
  }
  if(!allSlots.length){_log('⚠️ Keine TP-Ziele');return false;}
  // Find first free slot (respecting gueltig flag for return value)
  const ziel=allSlots.find(s=>!_istBesetzt(s.x,s.y,[C.MemberNumber]));
  if(!ziel){
    _log('⚠️ Alle TP-Slots belegt für '+C.Name);
    return false;
  }
  const si=allSlots.indexOf(ziel);
  const _pos={X:ziel.x,Y:ziel.y};
  let _tpVia='hidden';
  try{
    if(typeof ChatRoomMapViewTeleport==='function'){
      // Offizielle BC-Funktion: setzt bei Selbst Player.Position, sonst korrekt
      // formatierte Hidden-Nachricht an das Ziel. ACHTUNG: BC erlaubt Map-Teleport
      // NUR für Raum-Admins – ist der Bot kein Admin, passiert nichts.
      if(typeof ChatRoomPlayerIsAdmin==='function' && !ChatRoomPlayerIsAdmin())
        _log('⚠️ TP: Bot ist KEIN Raum-Admin – BC blockiert den Teleport!');
      ChatRoomMapViewTeleport(C,_pos);
      _tpVia='fn';
    } else {
      // Fallback (sehr alte BC-Version): handgebaute Hidden-Nachricht
      ServerSend('ChatRoomChat',{Content:'ChatRoomMapViewTeleport',Type:'Hidden',Dictionary:[{Tag:'MapViewTeleport',Position:_pos}],Target:C.MemberNumber});
    }
  }catch(e){ _log('⚠️ TP Fehler:',e.message); }
  _log('🌀 TP '+C.Name+' → X='+ziel.x+' Y='+ziel.y+(si>0?' [Fallback '+si+']':'')+' ['+_tpVia+']');
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

// Properties + Lock eines einzelnen Outfit-Items auf das getragene Item anwenden
function _applyProfilItemProps(C,item){
  var worn=InventoryGet(C,item.group); if(!worn) return;
  worn.Property=worn.Property??{};
  if(item.property && typeof item.property==='object'){
    Object.keys(item.property).forEach(function(k){ if(k!=='LayerProperties'&&k!=='OverridePriority') worn.Property[k]=item.property[k]; });
  } else if(item.tr && typeof item.tr==='object' && Object.keys(item.tr).length){
    worn.Property.TypeRecord=item.tr;
    worn.Property.Type=Object.entries(item.tr).map(function(e){return e[0]+e[1];}).join('');
  }
  try{ExtendedItemInit(C,worn,false,false);}catch(e){}
  var lp=(item.property&&item.property.LayerProperties)||item.layerProperties;
  var op=(item.property&&item.property.OverridePriority!=null)?item.property.OverridePriority:item.overridePriority;
  if(lp) worn.Property.LayerProperties=lp;
  if(op!=null) worn.Property.OverridePriority=op;
  if(item.difficulty!=null) worn.Difficulty=item.difficulty;
  var col=item.colors??'#ffffff'; if(typeof col==='string'&&col.includes(','))col=col.split(',');
  worn.Color=col;
  if(item.lock){
    var BCX_LOCKS=['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
    var lockAsset=BCX_LOCKS.includes(item.lock)
      ?(Asset.find(function(x){return x.Name===item.lock&&x.Group?.Name==='ItemMisc';})??Asset.find(function(x){return x.Name===item.lock;}))
      :Asset.find(function(x){return x.Name===item.lock&&x.Group?.Name==='ItemMisc';});
    if(lockAsset) InventoryLock(C,worn,{Asset:lockAsset},item.lockMember||Player.MemberNumber,false);
  }
}
// Prüft nach dem Outfit, ob alle Items wirklich angelegt sind; fehlende erneut versuchen
// (bis zu 3 Versuche). Pro Gruppe wird das LETZTE Outfit-Item erwartet (Reihenfolge gewinnt).
function _verifyOutfit(a,C,attempt,done){
  var items=a.profilItems||[];
  var byGroup={}; items.forEach(function(it){ if(it&&it.group&&it.asset) byGroup[it.group]=it; });
  var missing=Object.keys(byGroup).filter(function(g){
    var it=byGroup[g], w=InventoryGet(C,g);
    return !w || !w.Asset || w.Asset.Name!==it.asset;
  }).map(function(g){return byGroup[g];});
  if(!missing.length){ _log('\u2705 Outfit-Check: vollständig angelegt'); if(done)done(); return; }
  if(attempt>=3){
    _log('\u26A0 Outfit-Check: '+missing.length+' Item(s) fehlen weiterhin: '+missing.map(function(i){return i.group+'/'+i.asset;}).join(', '));
    if(done)done(); return;
  }
  _log('\u{1F501} Outfit-Check: '+missing.length+' fehlen \u2192 erneut anlegen (Versuch '+(attempt+1)+'): '+missing.map(function(i){return i.group+'/'+i.asset;}).join(', '));
  missing.forEach(function(it){
    try{
      var col=it.colors??(it.cfg&&it.cfg.Color)??'#ffffff'; if(typeof col==='string'&&col.includes(','))col=col.split(',');
      var craft=(it.craft&&it.craft.Name)?it.craft:null;
      InventoryWear(C,it.asset,it.group,col,0,Player.MemberNumber,craft);
      _applyProfilItemProps(C,it);
    }catch(e){_log('\u26A0 Retry '+it.group+':',e.message);}
  });
  CharacterRefresh(C); ChatRoomCharacterUpdate(C);
  setTimeout(function(){ _verifyOutfit(a,C,attempt+1,done); }, 400);
}
// Outfit Item-für-Item nacheinander anlegen (in konfigurierter Reihenfolge)
// Beim Outfit-Strip: behalten? Körperteile immer; Fesseln/Items wenn outfitKeep;
// Klamotten/Accessoires wenn outfitKeepClothes.
function _outfitKeepGroup(grp,a){
  if(!grp) return true;
  if(grp.AllowNone===false) return true;
  var nm = grp.Name || '';
  // Haare nie wegstrippen (Standard "Hair…" UND Custom/Chinesisch mit "发" = Haar).
  // Sie werden nur überschrieben, wenn das Outfit selbst ein Haar-Item dafür enthält.
  if(/hair/i.test(nm) || nm.indexOf('发')!==-1) return true;
  // Benutzer-Behalteliste (kommagetrennte Gruppennamen) – immer behalten.
  if(a.outfitKeepGroups){
    var _kl=(''+a.outfitKeepGroups).split(',');
    for(var _i=0;_i<_kl.length;_i++){ if(_kl[_i].trim()===nm) return true; }
  }
  var isItem = grp.Category==='Item' || nm.indexOf('Item')===0;
  return isItem ? !!a.outfitKeep : !!a.outfitKeepClothes;
}
var _outfitPending=0; // laufende Outfit-Anlege-Vorgänge (für "warten bis komplett")
function _applyOutfitSequential(a,C){
  var profilItems=a.profilItems??[];
  _outfitPending++;
  var _rmSeq=[];
  C.Appearance=C.Appearance.filter(function(item){
    var k=_outfitKeepGroup(item&&item.Asset&&item.Asset.Group,a);
    if(!k&&item&&item.Asset&&item.Asset.Group)_rmSeq.push(item.Asset.Group.Name+'/'+(item.Asset.Name||'?'));
    return k;
  });
  if(_rmSeq.length)_log('\u{1F9F9} Strip entfernt ('+_rmSeq.length+'): '+_rmSeq.join(', '));
  CharacterRefresh(C);ChatRoomCharacterUpdate(C);
  var gap=Math.max(80, a.profilEinzelnGap||250);
  var _one=function(i){
    if(i>=profilItems.length){ _verifyOutfit(a,C,0,function(){_outfitPending--;}); return; }
    var item=profilItems[i];
    var col=item.colors??(item.cfg&&item.cfg.Color)??'#ffffff'; if(typeof col==='string'&&col.includes(','))col=col.split(',');
    var craft=(item.craft&&item.craft.Name)?item.craft:null;
    try{
      InventoryWear(C,item.asset,item.group,col,0,Player.MemberNumber,craft);
      _applyProfilItemProps(C,item);
      CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      _log('\u{1F457} Outfit-Item '+(i+1)+'/'+profilItems.length+': '+item.group+'/'+item.asset);
    }catch(e){_log('\u26A0 Outfit-Item '+item.asset+':',e.message);}
    setTimeout(function(){_one(i+1);},gap);
  };
  _one(0);
}

// Welche Gruppen hat diese Item-Aktion belegt? (für Verfall/Auto-Entfernen)
function _verfallGroups(a){
  if(a.itemConfig) return [a.itemConfig.group];
  if(a.curseEntry) return [a.curseEntry.Gruppe];
  if(a.profilName) return (a.profilItems||[]).map(function(i){return i.group;});
  if(a.item) return [a.gruppe];
  return [];
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
          const isDevious=ic.lock==='DeviousPadlock';
          const isBcx=BCX_L.includes(ic.lock);
          const isRel=REL_L.includes(ic.lock);
          const lp=ic.lockParams??{};
          // DeviousPadlock: BCX locks with ExclusivePadlock underneath, then sets Name="DeviousPadlock"
          const actualLockName=isDevious?(lp.bcxBase||'ExclusivePadlock'):ic.lock;
          const lockAsset=(isBcx&&!isDevious)
            ?(Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc')??Asset.find(a=>a.Name===ic.lock))
            :Asset.find(a=>a.Name===actualLockName&&a.Group?.Name==='ItemMisc');
          if(lockAsset){
            const itemForLock=InventoryGet(C,ic.group);
            if(itemForLock){
              InventoryLock(C,itemForLock,{Asset:lockAsset},Player.MemberNumber,true);
              itemForLock.Property=itemForLock.Property??{};
              if(isDevious){
                // BCX DeviousPadlock: only Name override works via Property
                // BCX stores its own settings (minimumRole, memberNumbers etc.) internally — not settable from outside
                itemForLock.Property.Name='DeviousPadlock';
              } else {
                if(lp.timer>0)   itemForLock.Property.RemoveTimer=Date.now()+lp.timer;
                if(lp.combo)     itemForLock.Property.CombinationNumber=lp.combo;
                if(lp.password)  itemForLock.Property.Password=lp.password;
                if(isRel){
                  itemForLock.Property.LockMemberNumber=lp.relMember||Player.MemberNumber;
                  if(lp.relTimer>0)itemForLock.Property.RemoveTimer=Date.now()+lp.relTimer;
                }
              }
              CharacterRefresh(C);
              _log('🔒 Schloss angelegt: '+ic.lock+' auf '+ic.asset+' ('+C.Name+')');
            }
          } else {
            _log('⚠️ Schloss nicht gefunden: '+ic.lock+' (actual: '+actualLockName+')');
          }
        }
        CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      },180);
    }else if(a.curseEntry){
      let col=a.curseEntry.Farbe;if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,a.curseEntry.ItemName,a.curseEntry.Gruppe,col,0,Player.MemberNumber,a.curseEntry.Craft);
      _restoreDisplaced(C,snapshot,a.curseEntry.Gruppe);
    }else if(a.profilName){
      var profilItems = a.profilItems ?? [];
      if(a.profilEinzeln){ _applyOutfitSequential(a,C); return; }
      _outfitPending++;

      // Phase 0: Strip – pro Gruppe entscheiden was behalten wird (Körper immer,
      // Fesseln wenn outfitKeep, Klamotten wenn outfitKeepClothes).
      var _rmBatch=[];
      C.Appearance = C.Appearance.filter(function(item){
        var k=_outfitKeepGroup(item&&item.Asset&&item.Asset.Group, a);
        if(!k&&item&&item.Asset&&item.Asset.Group)_rmBatch.push(item.Asset.Group.Name+'/'+(item.Asset.Name||'?'));
        return k;
      });
      if(_rmBatch.length)_log('\u{1F9F9} Strip entfernt ('+_rmBatch.length+'): '+_rmBatch.join(', '));

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

        // outfitKeep: vom Outfit (Block/Konflikt) verdrängte Items wiederherstellen,
        // AUSSER den Gruppen, die das Outfit selbst belegt → bot-angelegte Items (z.B.
        // Cage) bleiben erhalten und werden NICHT durch das Outfit-Anlegen entfernt.
        // Diagnose: was war vorher da und ist jetzt (ohne Outfit-Gruppe) weg?
        try{
          var _ofG0=profilItems.map(function(i){return i.group;});
          var _gone=snapshot.filter(function(s){return s.Asset&&_ofG0.indexOf(s.Group)===-1&&!InventoryGet(C,s.Group);}).map(function(s){return s.Group+'/'+s.Asset.Name;});
          if(_gone.length)_log('\u{1F50E} Nach Outfit weg/verdrängt ('+_gone.length+'): '+_gone.join(', '));
        }catch(e){}
        if(a.outfitKeep||a.outfitKeepClothes){
          var _ofGroups=profilItems.map(function(i){return i.group;});
          snapshot.forEach(function(snap){
            if(!snap.Asset||_ofGroups.includes(snap.Group)) return;
            if(!_outfitKeepGroup(snap.Asset.Group,a)) return; // diese Gruppe soll NICHT behalten werden
            if(InventoryGet(C,snap.Group)) return; // noch vorhanden → nichts zu tun
            try{
              InventoryWear(C,snap.Asset.Name,snap.Group,snap.Color,0,Player.MemberNumber,snap.Craft);
              var _r=InventoryGet(C,snap.Group);
              if(_r&&snap.Property&&Object.keys(snap.Property).length) _r.Property=snap.Property;
              _log('\u267B Behalten/Wiederhergestellt: '+snap.Group+'/'+snap.Asset.Name);
            }catch(e){_log('\u26A0 Restore '+snap.Group+':',e.message);}
          });
        }

        // Phase 3: Ein einziger Refresh + Sync
        CharacterRefresh(C);
        ChatRoomCharacterUpdate(C);
        // Verifizieren ob alles sitzt, fehlende erneut versuchen – erst danach freigeben
        _verifyOutfit(a,C,0,function(){ _outfitPending--; });
      }, 600);
    }else if(a.item){
      InventoryWear(C,a.item,a.gruppe,a.farbe??'#ffffff',0,Player.MemberNumber);
      _restoreDisplaced(C,snapshot,a.gruppe);
    }
  }catch(ex){_log('item Fehler:',ex.message);}
}

// Führt eine einzelne Aktion aus; gibt true/false zurück (Erfolg)
// Text wählen: bei Zufallstext eine zufällige nicht-leere Zeile aus a.text
function _pickText(a){
  var t=a.text||'';
  if(a.zufallstext){
    var lines=t.split('\\n').map(function(s){return s.trim();}).filter(Boolean);
    if(lines.length) return lines[Math.floor(Math.random()*lines.length)];
  }
  return t;
}
function _execAct(a,C,vars){
  let ok=false;
  try{
    if(a.typ==='chat'){ServerSend('ChatRoomChat',{Content:_tpl(_pickText(a),vars),Type:'Chat'});ok=true;}
    else if(a.typ==='emote'){ServerSend('ChatRoomChat',{Content:_tpl(_pickText(a),vars),Type:'Emote'});ok=true;}
    else if(a.typ==='whisper'){ServerSend('ChatRoomChat',{Content:_tpl(_pickText(a),vars),Type:'Whisper',Target:C.MemberNumber});ok=true;}
    else if(a.typ==='item_entf'){const _gr=(Array.isArray(a.gruppen)&&a.gruppen.length)?a.gruppen:(a.gruppe?[a.gruppe]:[]);_gr.forEach(function(g){if(g){try{InventoryRemove(C,g);_asUnregister(C,g);}catch(e){}}});if(_gr.length){CharacterRefresh(C);ChatRoomCharacterUpdate(C);}ok=true;}
    else if(a.typ==='item'){
      _applyItemAction(a,C);
      if(a.antiStrip)_asRegister(C,a);
      if(vars?.shopNostrip)_nsRegister(C,a);
      if(a.verfallSek>0){
        var _vg=_verfallGroups(a);
        setTimeout(function(){
          _vg.forEach(function(g){ if(g){ try{ InventoryRemove(C,g); _asUnregister(C,g); }catch(e){} } });
          try{ CharacterRefresh(C); ChatRoomCharacterUpdate(C); }catch(e){}
          _log('\u23F3 Verfall: '+_vg.join(', ')+' nach '+a.verfallSek+'s entfernt ('+C.Name+')');
        }, a.verfallSek*1000);
      }
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
    else if(a.typ==='szene'){ _playScene(a.szeneId,C,vars,a.szeneStep||null); ok=true; }
    else if(a.typ==='variable'){ _scVarApply(C.MemberNumber,a.varOp||'set',a.varName,a.varWert); ok=true; }
    else if(a.typ==='erregung'){
      try{
        var _eop=a.erregOp||'set';
        if(_eop==='orgasm'){ if(typeof ActivityOrgasmStart==='function') ActivityOrgasmStart(C); }
        else if(_eop==='stop'){ if(typeof ActivityOrgasmStop==='function') ActivityOrgasmStop(C); }
        else {
          var _curAr=(C.ArousalSettings&&C.ArousalSettings.Progress)||0;
          var _amt=Number(a.erregVal)||0;
          var _newAr=_eop==='add'?_curAr+_amt:_eop==='sub'?_curAr-_amt:_amt;
          _newAr=Math.max(0,Math.min(100,_newAr));
          if(typeof ActivitySetArousal==='function') ActivitySetArousal(C,_newAr);
          if(typeof ActivityChatRoomArousalSync==='function') ActivityChatRoomArousalSync(C);
        }
        _log('\u{1F497} Erregung '+_eop+(a.erregVal!=null?' '+a.erregVal:'')+' ('+C.Name+')');
        ok=true;
      }catch(e){_log('\u26A0 Erregung Fehler:',e.message); ok=false;}
    }
    else if(a.typ==='mapkey'){
      try{
        var _mk=(a.mapKey||'bronze').toLowerCase();
        var _has=(a.mapKeyOp||'geben')==='geben';
        ServerSend('ChatRoomChat',{Content:'ChatRoomMapViewChangeKey',Type:'Hidden',Dictionary:[{Tag:'MapViewChangeKey',Key:_mk,Bool:_has}],Target:C.MemberNumber});
        // Persistent merken (für Rejoin-Neuvergabe) – lokal + an Popup
        try{ _cfg.playerKeys=_cfg.playerKeys||{}; var _pk=_cfg.playerKeys[C.MemberNumber]||{name:'',bronze:false,silver:false,gold:false}; _pk.name=C.Name; _pk[_mk]=_has; _cfg.playerKeys[C.MemberNumber]=_pk; }catch(e){}
        window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MAPKEY',memberNum:C.MemberNumber,name:C.Name,key:_mk,has:_has},'*');
        _log('\u{1F511} Map-Key '+_mk+' '+(_has?'gegeben':'entfernt')+' ('+C.Name+')');
        ok=true;
      }catch(e){_log('\u26A0 Map-Key Fehler:',e.message); ok=false;}
    }
    else ok=true;
  }catch(ex){_log('\u26A0 Aktion '+a.typ+' Fehler:',ex.message);ok=false;}
  // Dann / Sonst Nachrichten senden
  const msgField=ok?'dann_msg':'sonst_msg';
  const msgTypField=msgField+'_typ';
  const msgTyp=a[msgTypField]??'chat';
  const msgText=a[msgField];
  if(msgText&&msgTyp!=='nichts'){
    const _msgDelay=a.typ==='item'?200:100; // Item zuerst, Text kurz danach
    setTimeout(()=>{
      const txt=_tpl(msgText,vars);
      if(msgTyp==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
      else if(msgTyp==='emote')ServerSend('ChatRoomChat',{Content:txt,Type:'Emote'});
      else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    },_msgDelay);
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
    } else if(a.aktZiel==='ausser_ausloeser'){
      // Fuer Ansagen an die Runde: alle im Raum, nur der Ausloeser nicht
      targets=allChars.filter(ch=>ch.MemberNumber!==C.MemberNumber);
    } else if(a.aktZiel==='rang'){
      targets=allChars.filter(ch=>_rangMindestens(ch,a.aktZielRangId));
    } else if(a.aktZiel==='zufall'){
      const moeglich=allChars.filter(ch=>ch.MemberNumber!==Player.MemberNumber);
      targets=moeglich.length?[moeglich[Math.floor(Math.random()*moeglich.length)]]:[];
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
    // Mindest-Settle-Zeit BEVOR die nächste Aktion feuert: verhindert, dass BC bei
    // schneller Folge ServerSend/CharacterUpdate-Aufrufe verwirft (zufällig fehlende
    // Aktionen). Item-Aktionen brauchen länger, da ihr Appearance-Sync mehrere Phasen hat.
    if(rest.length){
      const _isOutfit=a.typ==='item'&&(a.profilName||a.profilItems);
      const _next=()=>_runSeq(rest,C,vars,trigBase,onDone,onUngueltig);
      if(_isOutfit){
        // Deterministisch warten, bis das Outfit KOMPLETT angelegt ist: _outfitPending
        // wird beim Start erhöht und nach dem finalen Sync gesenkt. Erst dann (plus
        // kleiner Sync-Puffer) die nächste Aktion. Safety-Limit abhängig von der
        // Item-Anzahl (Einzeln-Modus kann bei vielen Items >8s dauern).
        const _itemN=(a.profilItems&&a.profilItems.length)||0;
        const _maxWait=a.profilEinzeln ? (_itemN*Math.max(80,a.profilEinzelnGap||250)+5000) : 6000;
        let _waited=0;
        const _wait=()=>{
          if(_outfitPending<=0 || _waited>_maxWait){ setTimeout(_next,200); }
          else { _waited+=50; setTimeout(_wait,50); }
        };
        setTimeout(_wait,50);
      } else {
        const _settle=a.typ==='item'?230:a.typ==='item_entf'?100:(a.typ==='teleport'||a.typ==='chat'||a.typ==='emote'||a.typ==='whisper')?130:0;
        setTimeout(_next,_settle);
      }
    } else {
      _runSeq(rest,C,vars,trigBase,onDone,onUngueltig);
    }
  },a.delay??0);
}


// Sendet einen Log-Eintrag an den Tab im Index
// Sendet Log-Eintrag via PostMessage-Brücke zurück an das Popup
// ── Events Runtime ────────────────────────────────────────
const _evTimers={};
// NOTE: _evFiredCnt is declared above with persisted state
const _evState={}; // for interval state

function _okEv(ev,C,rohText,typKey){
  // Timer-/Intervall-Events haben keinen Chat-Text – 'wort' zaehlt dann als erfuellt.
  return _gruppenOk(ev.bedingungen??[],{C,rohText,typKey,wortOhneText:true});
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


/* Haelt fest, WARUM ein Trigger geschwiegen hat - vorher passierte in dem
   Fall gar nichts, man konnte es also nicht herausfinden. Gedrosselt auf
   einmal pro Person und Trigger je Minute, sonst laufen die Logs voll. */
const _nichtErfuelltZuletzt={};
function _logNichtErfuellt(trig,C,rohText,typKey){
  if(!_cfg.logAktiv)return;
  const beds=trig.bedingungen??[];
  if(!beds.length)return;
  const key=trig.id+'_'+C.MemberNumber;
  const jetzt=Date.now();
  if(jetzt-(_nichtErfuelltZuletzt[key]||0) < 60000)return;
  _nichtErfuelltZuletzt[key]=jetzt;
  // Welche Bedingung war es? Die erste nicht erfuellte genuegt als Hinweis.
  const ctx={C,rohText,typKey,shopBlockt:true};
  let idx=-1;
  for(let i=0;i<beds.length;i++){
    let e=false; try{ e=!!_checkCond(beds[i],ctx); }catch(err){}
    if(!e){ idx=i; break; }
  }
  _pushLog({status:'nicht_erfuellt',msg:'Bedingung '+(idx>=0?(idx+1):'?')+' nicht erfuellt',
            bedIndex:idx},{name:C.Name,wort:rohText,typ:typKey,x:C.X??0,y:C.Y??0,C},trig);
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
    return false;
  }

  // ── Wiederholung prüfen ──────────────────────────────────
  const wdh=trig.wiederholung??'immer';
  const cnt=_firedCnt[trig.id]??0;
  if(wdh==='einmalig'&&cnt>=1){
    _log('⏭ "'+trig.name+'" bereits ausgelöst (1×)');
    _pushLog({status:'skip_wdh',msg:'1× bereits ausgelöst'},vars,trig);
    return false;
  }
  if(wdh==='n_mal'&&cnt>=(trig.maxMal??2)){
    _log('⏭ "'+trig.name+'" max '+trig.maxMal+'× erreicht');
    _pushLog({status:'skip_max',msg:'Max '+trig.maxMal+'× erreicht'},vars,trig);
    return false;
  }
  if(wdh==='taeglich'&&_firedTag[trig.id+'_'+C.MemberNumber]===_heuteKey()){
    _log('⏭ "'+trig.name+'" heute schon fuer '+C.Name);
    _pushLog({status:'skip_wdh',msg:'heute bereits ausgelöst'},vars,trig);
    return false;
  }
  if(wdh==='pro_besuch'&&_firedBesuch[trig.id+'_'+C.MemberNumber]){
    _log('⏭ "'+trig.name+'" in diesem Raumbesuch schon fuer '+C.Name);
    _pushLog({status:'skip_wdh',msg:'in diesem Raumbesuch bereits ausgelöst'},vars,trig);
    return false;
  }
  if(trig.cooldownGlobalSek>0){
    const _letzte=_fired[trig.id]||0;
    if(Date.now()-_letzte < trig.cooldownGlobalSek*1000){
      _log('\u23F3 "'+trig.name+'" Gesamt-Pause aktiv ('+trig.cooldownGlobalSek+'s)');
      _pushLog({status:'skip_cooldown',msg:'Gesamt-Pause '+trig.cooldownGlobalSek+'s'},vars,trig);
      return false;
    }
  }
  if(trig.cooldownSek>0){
    const _cdLast=_firedChar[trig.id+'_'+C.MemberNumber]||0;
    if(Date.now()-_cdLast < trig.cooldownSek*1000){
      _log('\u23F3 "'+trig.name+'" Pause aktiv ('+trig.cooldownSek+'s/Spieler)');
      _pushLog({status:'skip_cooldown',msg:'Pause '+trig.cooldownSek+'s'},vars,trig);
      return false;
    }
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
        _firedTag[trig.id+'_'+C.MemberNumber]=_heuteKey();
        _firedBesuch[trig.id+'_'+C.MemberNumber]=true;
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
  return true;   // hat alle Sperren passiert - fuer "danach keine weiteren"
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
    .replace(/{figur}/gi,_cfg.figurName||'')
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
    .replace(/{gesamt}/gi,String(v.shopGesamt??''))
    .replace(/\{v:([^}]+)\}/gi,function(_m,n){var mn=(v.C&&v.C.MemberNumber)||v.memberNum;var val=(_sceneVars[mn]||{})[String(n).trim()];return val==null?'':String(val);});
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
  rest=rest.replace(/(?:^|\\s)\\/nostrip\\b/gi,(_)=>{flags.add('nostrip');return '';});
  rest=rest.replace(/(?:^|\\s)\\/w\\b/gi,(_)=>{flags.add('w');return '';});
  rest=rest.replace(/(?:^|\\s)\\/u\\b/gi,(_)=>{flags.add('u');return '';});
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

// Prüft, ob ein Spieler einen Shop-Artikel freigeschaltet hat (Rang/Gruppe/Level)
function _shopItemAllowed(item,C){
  // Rang/Gruppe
  let okRank=true;
  if(item.reqRankId||item.reqGroup||item.reqLevel){
    let rg=item.reqGroup||'', rl=item.reqLevel||0;
    if(item.reqRankId){ const rd=(_cfg.rankDefs||[]).find(r=>r.id===item.reqRankId); if(rd){ rl=rd.level||0; if(item.reqGroupOnly) rg=rd.group||''; } }
    const bId=_rangState[C.MemberNumber]??null;
    const bDef=(_cfg.rankDefs||[]).find(r=>r.id===bId);
    const bG=bDef?(bDef.group||''):'';
    const bL=bDef?(bDef.level||0):0;
    okRank=(!rg||bG===rg) && (!rl||bL>=rl);
  }
  // Variable (Voraussetzung ODER Bezahlung – in beiden Fällen muss der Wert reichen)
  let okVar=true;
  if(item.varName && (Number(item.varWert)||0)>0){
    okVar=(Number(_vget(C.MemberNumber,item.varName))||0) >= (Number(item.varWert)||0);
  }
  return okRank && okVar;
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
  // Mehrteilige Artikelnamen (z.B. "Rabbit Carrot") ohne Anführungszeichen: längsten
  // passenden Namen aus den führenden Args zu args[0] zusammenfassen.
  for(let _n=args.length;_n>=2;_n--){
    const _cand=args.slice(0,_n).join(' ').toLowerCase();
    if(_shopCfg.items.some(i=>(i.name||'').toLowerCase()===_cand)){ args.splice(0,_n,args.slice(0,_n).join(' ')); break; }
  }
  const itemName=args[0].toLowerCase();
  const shopItem=_shopCfg.items.find(i=>i.name.toLowerCase()===itemName);
  if(!shopItem){ _log('🛒 Kein Artikel "'+args[0]+'"'); return; }

  // Freischaltung nach Mindest-Rang (Käufer muss berechtigt sein)
  if(shopItem.reqRankId||shopItem.reqGroup||shopItem.reqLevel){
    let _reqGroup=shopItem.reqGroup||'', _reqLevel=shopItem.reqLevel||0, _reqName='';
    if(shopItem.reqRankId){
      const _rd=(_cfg.rankDefs||[]).find(r=>r.id===shopItem.reqRankId);
      if(_rd){ _reqLevel=_rd.level||0; _reqName=_rd.name||''; if(shopItem.reqGroupOnly) _reqGroup=_rd.group||''; }
    }
    const _bRankId=_rangState[buyerC.MemberNumber]??null;
    const _bDef=(_cfg.rankDefs||[]).find(r=>r.id===_bRankId);
    const _bGroup=_bDef?(_bDef.group||''):'';
    const _bLevel=_bDef?(_bDef.level||0):0;
    const _okGroup=!_reqGroup || _bGroup===_reqGroup;
    const _okLevel=!_reqLevel || _bLevel>=_reqLevel;
    if(!(_okGroup&&_okLevel)){
      const _need=_reqName?('Rang '+_reqName+(_reqGroup?' (Gruppe '+_reqGroup+')':'')) : ((_reqGroup?'Gruppe '+_reqGroup:'')+(_reqLevel?(_reqGroup?' ':'')+'ab Lv.'+_reqLevel:''));
      ServerSend('ChatRoomChat',{Content:'🔒 „'+shopItem.name+'" ist für dich nicht freigeschaltet ('+_need+').',Type:'Whisper',Target:buyerC.MemberNumber});
      _log('🔒 Shop gesperrt: '+buyerC.Name+' → "'+shopItem.name+'" (braucht '+(shopItem.reqGroup||'-')+'/Lv.'+(shopItem.reqLevel||0)+', hat '+(_bGroup||'-')+'/Lv.'+_bLevel+')');
      return;
    }
  }

  // Freischaltung/Bezahlung per Variable (Voraussetzung ODER abziehen)
  if(shopItem.varName && (Number(shopItem.varWert)||0) > 0){
    const _vneed=Number(shopItem.varWert)||0;
    const _vhave=Number(_vget(buyerC.MemberNumber, shopItem.varName))||0;
    if(_vhave < _vneed){
      ServerSend('ChatRoomChat',{Content:'🔒 „'+shopItem.name+'" benötigt '+_vneed+' '+shopItem.varName+' (du hast '+_vhave+').',Type:'Whisper',Target:buyerC.MemberNumber});
      _log('🔒 Shop var-gesperrt: '+buyerC.Name+' → "'+shopItem.name+'" ('+_vhave+'/'+_vneed+' '+shopItem.varName+')');
      return;
    }
  }

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
      if(shopItem.kaufItemAktiv&&shopItem.kaufItem){ setTimeout(()=>{ try{ _applyItemAction(Object.assign({typ:'item'},shopItem.kaufItem),targetC); if(shopItem.kaufItem.antiStrip)_asRegister(targetC,shopItem.kaufItem); }catch(e){_log('\u26A0 Shop-Kauf-Item:',e.message);} },200); }
      _trigs.forEach(trig=>{
        const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');
        if(!shopConds.length)return;
        const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);
        if(!itemMatch)return;
        const vonOk=_vonOk(trig,buyerC);
        if(!vonOk)return;
        const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
        const otherOk=otherConds.every(c=>{
          if(c.typ==='variable'){return _varCondOk(c,C);} if(c.typ==='zufall'){return _chanceOk(c);} if(c.typ==='erregung'){return _arousalOk(c,C);} if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const cid=_rangState[buyerC.MemberNumber]??null;
            if(op==='kein') return !cid;
            if(!c.rang_id) return false;
            const defs=_rankDefs;
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
    if(/^\\d+$/.test(arg2)){
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

  // Variable als Bezahlung abziehen (Modus 'abziehen')
  if(shopItem.varName && (Number(shopItem.varWert)||0) > 0 && shopItem.varModus==='abziehen'){
    const _vhave=Number(_vget(buyerC.MemberNumber, shopItem.varName))||0;
    const _vnew=_vhave-(Number(shopItem.varWert)||0);
    _vset(buyerC.MemberNumber, shopItem.varName, _vnew);
    _log('🔢 '+shopItem.varName+' -'+(Number(shopItem.varWert)||0)+' ('+buyerC.Name+' → '+_vnew+')');
  }

  const newBal=_moneyBalances[buyerC.MemberNumber].balance;
  const isFremdkauf=targetC.MemberNumber!==buyerC.MemberNumber;
  _log('🛒 Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" für '+preisEffektiv+' '+cur+(isFremdkauf?' → Ziel: '+targetC.Name:'')+' | Kontostand: '+newBal+(flagUnknown?' [/u]':'')+(flagWhisper?' [/w]':'')+(flagNostrip?' [/nostrip]':''));

  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',
    buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,
    targetNum:targetC.MemberNumber,targetName:targetC.Name,
    itemName:shopItem.name,preis},'*');
  // Item/Outfit direkt beim Kauf anlegen (ohne Trigger), falls konfiguriert
  if(shopItem.kaufItemAktiv&&shopItem.kaufItem){
    setTimeout(()=>{
      try{ _applyItemAction(Object.assign({typ:'item'},shopItem.kaufItem),targetC); if(shopItem.kaufItem.antiStrip)_asRegister(targetC,shopItem.kaufItem); if(flagNostrip)_nsRegister(targetC,shopItem.kaufItem); }
      catch(e){_log('\u26A0 Shop-Kauf-Item:',e.message);}
    },200);
  }

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
    const vonOk=_vonOk(trig,buyerC);
    if(!vonOk)return;
    const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
    const otherOk=otherConds.every(c=>{
      if(c.typ==='variable'){return _varCondOk(c,C);} if(c.typ==='zufall'){return _chanceOk(c);} if(c.typ==='erregung'){return _arousalOk(c,C);} if(c.typ==='rang'){
        const op=c.rang_op??'=';
        const currentId=_rangState[buyerC.MemberNumber]??null;
        if(op==='kein') return !currentId;
        if(!c.rang_id) return false;
        const defs=_rankDefs;
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
  if(_sceneHandleAnswer(rohText,C))return;
  // Admin (Player auf dem der Configurator läuft): !set <ZonenName> X|X1|X2
  // → aktuelle Spielerposition in die gleichnamige Zone schreiben (persistiert + Re-Sync).
  if(C&&typeof Player!=='undefined'&&Player&&C.MemberNumber===Player.MemberNumber){
    var _st=(rohText||'').trim();
    if(_st.toLowerCase().indexOf('!set ')===0){
      var _sp=_st.slice(5).trim().split(' ').filter(function(z){return z;});
      var _slot=(_sp.pop()||'').toUpperCase();
      var _zn=_sp.join(' ');
      if(_zn&&(_slot==='X'||_slot==='X1'||_slot==='X2')){
        var _px=Player.X||0,_py=Player.Y||0;
        try{window.__BCK_popupRef&&window.__BCK_popupRef.postMessage({app:'BCKonfigurator',type:'BOT_SET_ZONE',botId:_BOTID,zoneName:_zn,slot:_slot,x:_px,y:_py},'*');}catch(e){}
        ServerSend('ChatRoomChat',{Content:'📍 Zone "'+_zn+'" '+_slot+' → '+_px+'/'+_py,Type:'Whisper',Target:C.MemberNumber});
        return;
      }
    }
  }
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
    // Sichtbar = aktiv UND (nicht ausblenden ODER erfüllt). Gesperrte mit „ausblenden" werden versteckt.
    const visible=_shopCfg.items.filter(i=>i.aktiv!==false && !(i.shopHideLocked && !_shopItemAllowed(i,C)));
    if(!visible.length){ServerSend('ChatRoomChat',{Content:'🛒 Noch keine Artikel.',Type:'Whisper',Target:C.MemberNumber});return;}
    const hdr='🛒 Shop ('+visible.length+' Artikel):';
    const usedVars=[]; // Reihenfolge erhalten, einmalig
    const chunks=[];let buf=hdr;
    visible.forEach(item=>{
      const ns=item.preisNostrip??_shopCfg.preisNostrip??0;
      const nsHint=ns>0?' (/nostrip +'+ns+')'  :'';
      // Variablen, die für den Footer relevant sind (nur kaufbare/genutzte)
      if(item.varName && (Number(item.varWert)||0)>0 && usedVars.indexOf(item.varName)<0) usedVars.push(item.varName);
      // Sperr-Hinweis, falls sichtbar aber (noch) nicht erfüllt
      let lockHint='';
      if(!_shopItemAllowed(item,C)){
        const reqs=[];
        if(item.reqRankId||item.reqGroup||item.reqLevel){
          let _rg=item.reqGroup||'',_rl=item.reqLevel||0,_rn='';
          if(item.reqRankId){const _rd=(_cfg.rankDefs||[]).find(r=>r.id===item.reqRankId);if(_rd){_rl=_rd.level||0;_rn=_rd.name||'';if(item.reqGroupOnly)_rg=_rd.group||'';}}
          if(_rn)reqs.push('Rang '+_rn); else { if(_rg)reqs.push('Gruppe '+_rg); if(_rl)reqs.push('Lv.'+_rl); }
        }
        if(item.varName && (Number(item.varWert)||0)>0){
          const _h=Number(_vget(C.MemberNumber,item.varName))||0;
          reqs.push((Number(item.varWert)||0)+' '+item.varName+' (hast '+_h+')');
        }
        if(reqs.length) lockHint=' 🔒 '+reqs.join(', ')+' benötigt';
      }
      const line='\\n• '+(item.icon||'🛒')+' '+item.name+' – '+(Number(item.preis)||0)+' '+cur+nsHint+lockHint;
      if((buf+line).length>480){chunks.push(buf);buf=line.slice(1);}else buf+=line;
    });
    // Footer: aktuelle Stände – Money + nur die Variablen, die im Shop genutzt werden
    const _bal=(_moneyBalances[C.MemberNumber]?.balance)??0;
    let footer='\\n— Aktuell —\\n'+_bal+' '+cur;
    usedVars.forEach(v=>{ footer+='\\n'+(Number(_vget(C.MemberNumber,v))||0)+' '+v; });
    if((buf+footer).length>480){chunks.push(buf);buf=footer.slice(1);}else buf+=footer;
    chunks.push(buf);
    chunks.forEach((ch,i)=>setTimeout(()=>ServerSend('ChatRoomChat',{Content:ch,Type:'Whisper',Target:C.MemberNumber}),i*130));
    return;
  }
  // Shop Pay-Befehl
  const shopCmd=(_shopCfg.cmd||'').trim().toLowerCase();
  const _rohLc=rohText.trim().toLowerCase();
  if(shopCmd&&(_rohLc.startsWith(shopCmd+' ')||_rohLc===shopCmd)){
    _handleShopCmd(rohText,C);
    return;
  }
  const pos={X:C.X??0,Y:C.Y??0}; // direkt vom Character
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u{2728} Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  let _stoppNachDiesem=false;
  _trigs.forEach(trig=>{
    if(_stoppNachDiesem)return;   // ein Trigger hat die Runde beendet
    // Trigger mit player_betritt -> nur Join-Poll, nie Nachrichten
    if(_hatTyp(trig.bedingungen,['player_betritt']))return;
    // Zustands-Trigger ohne Wort laufen ueber den Poll, nicht ueber den Chat
    if(_hatTyp(trig.bedingungen,_ZUSTAND_TYPEN)&&!_hatTyp(trig.bedingungen,['wort']))return;
    // Von-Filter: wer darf diesen Trigger auslösen?
    const vonOk=_vonOk(trig,C);
    if(!vonOk)return;
    // Alle anderen: _ok prueft Auslöser-Bedingungen (wort, zone, vortrigger)
    const condOk=_ok(trig,rohText,typKey,C);
    if(!condOk) _logNichtErfuellt(trig,C,rohText,typKey);
    if(condOk){
      // Auslöser passt → jetzt IF-Bedingungen prüfen (nur wenn ifElse aktiv und ifBedingungen vorhanden)
      const ifBeds=trig.ifBedingungen??[];
      const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,rohText,typKey,C);
      if(ifOk){
        const _lief=_run(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
        // Trigger mit "danach keine weiteren" beenden die Runde fuer diese Nachricht
        if(_lief&&trig.stopptWeitere)_stoppNachDiesem=true;
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
    const vonOk=_vonOkEv(ev,C);
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
function _tickItems(chars){
  if(!_itTrigs.length)return;
  _itTrigs.forEach(trig=>{
    chars.forEach(C=>{
      // Ueber _gruppenOk statt eigener Schleife: so gelten Klammern und
      // UND/ODER auch hier, und alle Zustands-Bedingungen (gefesselt,
      // geknebelt, blind, Schloss, Craft, Slot) werden mitgeprueft.
      const condMet=_gruppenOk(trig.bedingungen??[],
        {C,rohText:null,typKey:null,nur:_ZUSTAND_TYPEN});
      const key=C.MemberNumber+'_'+trig.id;
      const was=_itState[key]??false;
      if(condMet&&!was){
        const pos={X:C.X??0,Y:C.Y??0};
        // Von-Filter
        const vonOk=_vonOk(trig,C);
        const otherOk=vonOk&&_gruppenOk(trig.bedingungen??[],
          {C,rohText:null,typKey:null,ueberspringe:['wort'].concat(_ZUSTAND_TYPEN)});
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
}

// ── Erregungs-Polling (edge-triggered: feuert 1x wenn Erregungs-Bedingung wahr wird) ──
const _arState={}; // 'memberNum_trigId' -> bool
function _tickErregung(chars){
  if(!_arTrigs.length)return;
  _arTrigs.forEach(trig=>{
    chars.forEach(C=>{
      const pos={X:C.X??0,Y:C.Y??0};
      const vonOk=_vonOk(trig,C);
      const condMet=vonOk&&_gruppenOk(trig.bedingungen??[],
        {C,rohText:null,typKey:null,nur:['erregung','variable','zufall','trigger_war','rang']});
      const key=C.MemberNumber+'_'+trig.id;
      const was=_arState[key]??false;
      if(condMet&&!was){
        const ifBeds=trig.ifBedingungen??[];
        const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'','erregung',C);
        if(ifOk) _run(trig,{name:C.Name,wort:'',typ:'Erregung',x:pos.X,y:pos.Y,zone:'',C});
        else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:'Erregung',x:pos.X,y:pos.Y,zone:'',C});
      }
      _arState[key]=condMet;
    });
  });
}

// ── Spieler-Betritt Polling (feuert 1x beim Betreten) ──
const _roomPrev=new Set((ChatRoomCharacter||[]).map(c=>c.MemberNumber));
// _roomEver is now part of persisted state (declared above)
// Startup grace: triggers don't fire for the first 2s so the initial room scan doesn't spam actions
const _startupTs=Date.now();
const _JOIN_GRACE_MS=2000;
// Queue: if multiple joins happen in one tick, process one per tick to avoid blocking the UI
const _joinQueue=[];
// Processes one queued joiner per tick so multiple simultaneous joins don't block the UI
function _processJoinQueue(){
  if(!_joinQueue.length)return;
  const {C,istNeu,label,pos}=_joinQueue.shift();
  _log(label+': '+C.Name+' #'+C.MemberNumber+(Date.now()-_startupTs<_JOIN_GRACE_MS?' [startup-grace, no triggers]':''));
  _pushLog({status:istNeu?'join':'join_rejoin',trigName:'',msg:istNeu?'Erstes Mal':'Rejoin'},
    {name:C.Name+' #'+C.MemberNumber,x:C.X??0,y:C.Y??0,C},{id:'__system__',name:'System'});
  if(istNeu){
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_INIT_NEW',memberNum:C.MemberNumber,name:C.Name},'*');
  }
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'RANG_INIT',memberNum:C.MemberNumber,name:C.Name},'*');
  // Map-Keys automatisch neu vergeben (persistent gespeichert) – auch bei Startup/Rejoin
  try{
    var _sk=(_cfg.playerKeys||{})[C.MemberNumber];
    if(_sk){
      var _ks=['bronze','silver','gold'].filter(function(k){return _sk[k];});
      if(_ks.length){
        setTimeout(function(){
          _ks.forEach(function(k){
            ServerSend('ChatRoomChat',{Content:'ChatRoomMapViewChangeKey',Type:'Hidden',Dictionary:[{Tag:'MapViewChangeKey',Key:k,Bool:true}],Target:C.MemberNumber});
          });
          _log('\u{1F511} Keys neu vergeben an '+C.Name+': '+_ks.join(', '));
        },1500);
      }
    }
  }catch(e){}
  _roomEver.add(C.MemberNumber);
  _syncRoomEver();
  // Skip trigger firing during startup grace period (avoids blasting all triggers on room load)
  if(Date.now()-_startupTs<_JOIN_GRACE_MS)return;
  // Offene Geschichte dieser Person wieder aufnehmen
  try{ _storyFortsetzen(C); }catch(e){ _log('\u26A0 Fortsetzen:',e.message); }
  // Profil: Besuche + letzter Besuch automatisch mitführen (persistent)
  try{ var _bs=Number(_vget(C.MemberNumber,'besuche'))||0; _vset(C.MemberNumber,'besuche',_bs+1); _vset(C.MemberNumber,'letzterBesuch',Date.now()); }catch(e){}
  if(!istNeu) _rejoinWindow.set(C.MemberNumber, Date.now());
  if(!istNeu) setTimeout(()=>{ _rejoinWindow.delete(C.MemberNumber); _log('\u{1F6AA} Rejoin-Fenster für #'+C.MemberNumber+' automatisch geschlossen (1s)'); },_REJOIN_GRACE);

  const rejoinBatch=[];
  _joinTrigs.forEach(trig=>{
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
    const vonOk=_vonOk(trig,C);
    const otherOk=vonOk&&_gruppenOk(trig.bedingungen??[],
      {C,rohText:null,typKey:null,istRejoinTrig:isRejoinTrig,
       ueberspringe:['wort','player_betritt','item_traegt','item_traegt_nicht']});
    if(!otherOk)return;
    if(isRejoinTrig){
      rejoinBatch.push(trig);
    } else {
      const ifBeds=trig.ifBedingungen??[];
      const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);
      if(ifOk) _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
      else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
    }
  });
  // ── Betritt-Events feuern ──
  _evts.forEach(ev=>{
    if(!ev.aktiv)return;
    const betrittConds=(ev.bedingungen??[]).filter(c=>c.typ==='player_betritt');
    if(!betrittConds.length)return;
    const bOk=betrittConds.every(c=>{
      const bt=c.betritt_typ??'alle';
      if(bt==='neu')return istNeu;
      if(bt==='rejoin')return!istNeu;
      return true;
    });
    if(!bOk)return;
    const vonOk=_vonOkEv(ev,C);
    if(!vonOk)return;
    const evOtherOk=_gruppenOk(ev.bedingungen??[],
      {C,rohText:null,typKey:null,nur:['variable','zufall','erregung','rang']});
    if(!evOtherOk)return;
    const allChars=[Player,...(ChatRoomCharacter||[])];
    let targets=[];
    if(ev.ziel==='alle')targets=allChars;
    else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));
    else targets=[C];
    const cnt=_evFiredCnt[ev.id]??0;
    if(ev.wiederholung==='einmalig'&&cnt>=1)return;
    if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
    targets.forEach(ch=>{
      const vars={name:ch.Name,wort:'',typ:label,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
      _runSeq(ev.aktionen??[],ch,vars,ev,
        ()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
        ()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});}
      );
    });
  });

  const ITEM_SYNC_DELAY=800;
  rejoinBatch.forEach(trig=>{
    const hasItemCond=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
    if(hasItemCond){
      setTimeout(()=>{
        if(!_rejoinWindow.has(C.MemberNumber)){
          _log('⏭ [Rejoin] "'+trig.name+'" – Fenster geschlossen vor Appearance-Sync');
          return;
        }
        const Cfresh=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
        const itemOk=_gruppenOk(trig.bedingungen??[],
          {C:Cfresh,rohText:null,typKey:null,nur:['item_traegt','item_traegt_nicht']});
        if(!itemOk){
          _log('⏭ [Rejoin] "'+trig.name+'" – Item-Bedingung nach Sync nicht erfüllt (Appearance jetzt geladen)');
          return;
        }
        const ifBedsR=trig.ifBedingungen??[];
        const ifOkR=!trig.ifElse||!ifBedsR.length||_okIf(trig,'',null,Cfresh);
        if(ifOkR) _run(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
        else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
      },ITEM_SYNC_DELAY);
    } else {
      const ifBeds=trig.ifBedingungen??[];
      const ifOk=!trig.ifElse||!ifBeds.length||_okIf(trig,'',null,C);
      if(ifOk) _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
      else if((trig.aktionen_sonst??[]).length) _runSonst(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
    }
  });
}

function _tickBeitritt(){
  // Process one queued joiner first (spreads work across ticks)
  _processJoinQueue();

  const chars=ChatRoomCharacter||[];
  const cur=new Set(chars.map(c=>c.MemberNumber));

  // Spieler verlassen → nur loggen; _firedChar bleibt erhalten damit Rejoin-Vortrigger noch greifen
  for(const prevNum of _roomPrev){
    if(!cur.has(prevNum)){
      _log('\u{1F6AA} #'+prevNum+' verlassen');
      _rejoinWindow.delete(prevNum);
      _pushLog({status:'leave', trigName:'Verlassen', trigId:'__system__',
        player:'#'+prevNum, memberNum:prevNum, x:0, y:0, msg:'Raum verlassen'}, {name:'#'+prevNum,x:0,y:0,C:{MemberNumber:prevNum}}, {name:'System',id:'__system__'});
      for(const k of Object.keys(_zoneState)){
        if(k.startsWith(prevNum+'_'))delete _zoneState[k];
      }
      _trigs.forEach(trig=>{
        // "einmal pro Raumbesuch" gilt ab jetzt wieder
        delete _firedBesuch[trig.id+'_'+prevNum];
        if(trig.charSpec&&trig.resetOnLeave){
          delete _firedChar[trig.id+'_'+prevNum];
          _log('\u{1F504} State von "'+trig.name+'" für #'+prevNum+' zurückgesetzt');
        }
      });
    }
  }

  // Enqueue new joiners (processed one-per-tick via _processJoinQueue)
  for(const C of chars){
    if(!_roomPrev.has(C.MemberNumber)){
      const istNeu=!_roomEver.has(C.MemberNumber);
      const label=istNeu?'\u{1F195} Neu':'\u{1F504} Rejoin';
      _joinQueue.push({C,istNeu,label,pos:{X:C.X??0,Y:C.Y??0}});
    }
  }
  _roomPrev.clear();
  for(const n of cur)_roomPrev.add(n);
}

// ── Zonen-Betreten Polling – direkt C.X/C.Y (wie ZoneMonitor-Pattern) ──
const _zoneState={}; // 'memberNum_trigId' -> bool (war zuletzt drin)
const _zonePos={};   // 'memberNum_trigId' -> 'x,y' (letzte Position, für 'dauerhaft' = pro Feld-Wechsel)
// FIX: 500ms is sufficient for zone detection, 100ms caused unnecessary CPU load
function _tickZonen(chars){
  if(!_zoneTrigs.length)return;
  _zoneTrigs.forEach(trig=>{
    const zoneConds=(trig.bedingungen??[]).filter(c=>c.typ==='zone'||c.typ==='zone_rect');
    chars.forEach(C=>{
      if(!C)return;
      // Direkt C.X / C.Y – kein _getPos Umweg nötig
      const cx=C.X??-999, cy=C.Y??-999;
      // Ueber _gruppenOk statt zoneConds.every(): sonst muessten ALLE
      // Zonen-Bedingungen gleichzeitig zutreffen und "Zone A ODER Zone B"
      // koennte nie wahr werden – man kann nicht an zwei Orten stehen.
      const inZone=_gruppenOk(trig.bedingungen??[],
        {C,rohText:null,typKey:null,nur:['zone','zone_rect']});
      const key=C.MemberNumber+'_'+trig.id;
      const war=_zoneState[key]??false;
      // Zonen-Modus: 'dauerhaft' = bei jedem FELD-WECHSEL feuern solange drin (pro Schritt,
      // NICHT bei jedem Poll-Tick wenn man stehen bleibt); sonst nur beim Eintritt.
      const _zCont=zoneConds.some(c=>c.zoneMode==='dauerhaft');
      const _posKey=cx+','+cy;
      const _moved=_zonePos[key]!==_posKey;
      if(inZone&&(_zCont?_moved:!war)){
        // Prüfe andere Bedingungen (vortrigger, item_traegt)
        const vonOk=_vonOk(trig,C);
        const otherOk=vonOk&&_gruppenOk(trig.bedingungen??[],
          {C,rohText:null,typKey:null,ueberspringe:['wort','zone','zone_rect']});
        if(otherOk){
          _log('\u{1F4CD} Zone: '+C.Name+' X='+cx+' Y='+cy+' \u2192 "'+trig.name+'"');
          _run(trig,{name:C.Name,wort:'',typ:'\u{1F4CD} Zone',x:cx,y:cy,zone:'',C});
        }
      }
      _zoneState[key]=inZone;
      _zonePos[key]=inZone?_posKey:null;
    });
  });
}

// ── NoStrip Polling (500ms) ─────────────────────────────────
// Prueft ob /nostrip-Items noch vorhanden sind. Wenn entfernt → sofort re-equip.
// Unabhaengig vom ChatRoomMessage-Listener – funktioniert bei JEDER Art von Entfernung.
function _tickNoStrip(chars){
  const keys=Object.keys(_nsWatchers);
  if(!keys.length)return;
  const allChars=chars;
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
}

/* ── Ein Takt fuer alle Poller ───────────────────────────────────────────
   Vorher liefen fuenf getrennte setInterval nebeneinander, von denen jeder
   sich [Player,...ChatRoomCharacter] neu zusammenbaute. Jetzt wird die Liste
   einmal je Tick gebildet und durchgereicht.

   Jede Teilaufgabe laeuft in ihrem eigenen try: frueher konnte ein Fehler in
   einem Poller die anderen nicht mitreissen, weil es eigene Intervalle waren.
   Das bleibt so.

   Die Erregungspruefung lief mit 2000 ms – sie kommt darum nur bei jedem
   vierten Tick dran. */
let _taktNr=0;
const _botTakt=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _taktNr++;
  try{ _tickItems(chars); }   catch(e){ _log('⚠ Takt/Items:',e.message); }
  if(_taktNr%4===0){
    try{ _tickErregung(chars); }catch(e){ _log('⚠ Takt/Erregung:',e.message); }
  }
  try{ _tickBeitritt(); }     catch(e){ _log('⚠ Takt/Beitritt:',e.message); }
  try{ _tickZonen(chars); }   catch(e){ _log('⚠ Takt/Zonen:',e.message); }
  try{ _tickNoStrip(chars); } catch(e){ _log('⚠ Takt/NoStrip:',e.message); }
},500);
// ─────────────────────────────────────────────────────────────

// Eigene Nachrichten via hookFunction – Mod bekommt unique Namen (Timestamp) um Kollisionen beim Live-Sync zu vermeiden
let _mod = null;
try {
  // Mod EINMAL je Bot und Seitenladen registrieren und danach
  // wiederverwenden. Frueher bekam jeder Sync einen neuen Namen mit
  // Zeitstempel - die alten Registrierungen blieben im ModSDK stehen und
  // sammelten sich an, bis beim Neuanmelden die Meldung
  // "failed to patch a function" erschien. Jetzt werden nur die Patches
  // der bestehenden Registrierung erneuert.
  const _modKey='__BCBot_mod_${safeId}';
  if(window[_modKey]){
    _mod=window[_modKey];
    try{ _mod.removePatches(); }catch(e){}
  } else {
    _mod = bcModSdk.registerMod({name:'BCBot_${safeId}', fullName:'${safeName}', version:'1.0'});
    window[_modKey]=_mod;
  }
  if(typeof ChatRoomSendChat!=='function'){throw new Error('ChatRoomSendChat nicht patchbar – Socket-Fallback');}
  var _bckOrigAlert=window.alert; window.alert=function(){}; var _hookOk=false;
  try {
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
  _hookOk=true;
  } finally { window.alert=_bckOrigAlert; }
  if(!_hookOk) throw new Error('hookFunction-Patch fehlgeschlagen – Socket-Fallback');
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


/* -- Probelauf ------------------------------------------------------------
   Prueft jede Bedingung EINZELN gegen jede Person im Raum und schickt das
   Ergebnis ans Popup. Fuehrt nichts aus und sendet nichts ins Spiel.

   Wichtig: hier wird _checkCond und _gruppenOk benutzt, also genau das, was
   im Betrieb auch entscheidet. Eine zweite Auswertung waere wertlos - sie
   koennte etwas anderes sagen als der Bot tatsaechlich tut.               */
function _probe(trigId){
  const trig=_trigMap[trigId];
  if(!trig){
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_PROBE',
      botId:_BOTID,trigId,fehler:'Trigger nicht gefunden - laeuft der Bot mit der aktuellen Fassung? (Sync)'},'*');
    return;
  }
  const beds=trig.bedingungen??[];
  // BC fuehrt den Spieler bereits in ChatRoomCharacter - ohne Entdoppelung
  // stuende der Bot zweimal in der Liste.
  const gesehen=new Set();
  const chars=[Player,...(ChatRoomCharacter||[])].filter(C=>{
    if(!C||gesehen.has(C.MemberNumber))return false;
    gesehen.add(C.MemberNumber); return true;
  });
  const personen=chars.map(C=>{
    const ctx={C,rohText:null,typKey:null,shopBlockt:true};
    let einzeln=[], gesamt=false, vonOk=false;
    try{
      vonOk=!!_vonOk(trig,C);
      einzeln=beds.map((c,i)=>{
        let e=false, hinweis=null;
        try{ e=!!_checkCond(c,ctx); }
        catch(err){ hinweis=err.message; }
        return {i,erfuellt:e,hinweis};
      });
      gesamt=vonOk&&_gruppenOk(beds,ctx);
    }catch(err){ /* eine kaputte Bedingung darf den Probelauf nicht kippen */ }
    // Aktionen trocken aufloesen: Platzhalter ersetzen, aber nichts senden
    const vars={name:C.Name,wort:'',typ:'Probelauf',x:C.X??0,y:C.Y??0,zone:'',C};
    const aktionen=(trig.aktionen??[]).map((a,i)=>({
      i, typ:a.typ,
      text: (a.text!=null&&a.text!=='') ? _tpl(String(a.text),vars) : null
    }));
    return {num:C.MemberNumber,name:C.Name,istBot:C.MemberNumber===Player.MemberNumber,
            vonOk,bedingungen:einzeln,gesamt,aktionen};
  });
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_PROBE',
    botId:_BOTID,trigId,trigName:trig.name,vonModus:trig.von||'alle',personen},'*');
  _log('\u{1F9EA} Probelauf "'+trig.name+'" fuer '+personen.length+' Person(en)');
}

/* Von Hand ausloesen - fuehrt den Trigger wirklich aus.
   Wiederholungsgrenze und Cooldown werden dabei bewusst uebergangen, sonst
   koennte man einen einmaligen Trigger kein zweites Mal testen. Im Log ist
   der Eintrag als Handausloeser erkennbar. */
function _feuereJetzt(trigId,memberNum){
  const trig=_trigMap[trigId];
  if(!trig){_log('\u26A0 Handausloeser: Trigger nicht gefunden');return;}
  const C=[Player,...(ChatRoomCharacter||[])].find(x=>x.MemberNumber===Number(memberNum));
  if(!C){_log('\u26A0 Handausloeser: Person nicht im Raum');return;}
  const merkWdh=trig.wiederholung, merkCd=trig.cooldownSek;
  trig.wiederholung='immer'; trig.cooldownSek=0;
  try{
    _log('\u25B6 Handausloeser: "'+trig.name+'" fuer '+C.Name);
    _run(trig,{name:C.Name,wort:'',typ:'Handausl\u00f6ser',x:C.X??0,y:C.Y??0,zone:'',C});
  } finally {
    trig.wiederholung=merkWdh; trig.cooldownSek=merkCd;
  }
}

window['_BCBot_'+_BID]={
  playScene(sid){try{_playScene(sid,Player,{},null);}catch(e){console.warn(e);}},
  probe(trigId){try{_probe(trigId);}catch(e){console.warn('[Bot] Probelauf:',e);}},
  /* Wo steht wer in welcher Geschichte - fuer die Anzeige im Konfigurator */
  storyStand(){
    try{
      const raus={};
      for(const mn of Object.keys(_story)){
        const st=_story[mn];
        const sc=(_scenes||[]).find(x=>x.id===st.sid);
        const idx=sc?(sc.steps||[]).findIndex(x=>x.id===st.stepId):-1;
        const C=[Player,...(ChatRoomCharacter||[])].find(x=>String(x.MemberNumber)===String(mn));
        raus[mn]={name:C?C.Name:null,szene:sc?sc.name:'(gelöscht)',sid:st.sid,
                  schritt:idx>=0?idx+1:null,gesamt:sc?(sc.steps||[]).length:0,
                  wartet:!!st.wartet,ts:st.ts,imRaum:!!C};
      }
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_STORY',botId:_BOTID,stand:raus},'*');
    }catch(e){console.warn('[Bot] storyStand:',e);}
  },
  /* Geschichte einer Person von vorn beginnen lassen */
  storyReset(mn){ _storyEnde(Number(mn)); _log('\u{1F4D6} Geschichte von #'+mn+' zurueckgesetzt'); },
  feuereJetzt(trigId,mn){try{_feuereJetzt(trigId,mn);}catch(e){console.warn('[Bot] Handausloeser:',e);}},
  setVar(mn,name,val){try{_vset(mn,String(name),val);}catch(e){console.warn(e);}},
  stop(){
    clearInterval(_botTakt);   // ein Takt fuer alle Teilaufgaben
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
        firedTag:_firedTag, firedBesuch:_firedBesuch,
        story:_story,
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
    window[_stateKey]={fired:{},firedCnt:{},firedChar:{},roomEver:[],evFiredCnt:{},
                       firedTag:{},firedBesuch:{},story:{}};
    try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');delete ls['${safeId}'];localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}
    Object.keys(_fired).forEach(k=>delete _fired[k]);
    Object.keys(_firedCnt).forEach(k=>delete _firedCnt[k]);
    Object.keys(_firedChar).forEach(k=>delete _firedChar[k]);
    Object.keys(_firedTag).forEach(k=>delete _firedTag[k]);
    Object.keys(_firedBesuch).forEach(k=>delete _firedBesuch[k]);
    Object.keys(_story).forEach(k=>delete _story[k]);
    Object.keys(_evFiredCnt).forEach(k=>delete _evFiredCnt[k]);
    _roomEver.clear();
    console.log('\u{1F9F9} [Bot:${safeName}] States zurückgesetzt (Mem+LS)');
  }
};
console.log('\u25B6\uFE0F [Bot:${safeName}] v'+_VER+' | Trigger:',_trigs.length,'| Modus:',_cfg.nurEigene?'Nur eigene':'Alle Spieler');
})();`;
}

function botResyncById(id){
  const b=_bots.find(x=>x.id===id); if(!b||!_connected) return;
  if(!b.laufend){ botDeployById(id); return; }
  const safeId=b.id.replace(/\W/g,'_');
  bcSend({type:'EXEC',code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();`});
  setTimeout(()=>botDeployById(id),450);
}
function _botSetZone(botId, zoneName, slot, x, y){
  let b=_bots.find(z=>z.id===botId) || _bots.find(z=>z.id.replace(/\W/g,'_')===botId);
  if(!b){ showStatus('⚠️ Bot für Zone nicht gefunden','error'); return false; }
  const wanted=String(zoneName||'').trim().toLowerCase();
  let hit=null;
  (b.triggers||[]).forEach(t=>(t.bedingungen||[]).forEach(c=>{
    if((c.typ==='zone'||c.typ==='zone_rect') && String(c.name||'').trim().toLowerCase()===wanted) hit=c;
  }));
  if(!hit){ showStatus('⚠️ Keine Zone "'+zoneName+'" in Bot „'+b.name+'"','error'); return false; }
  if(hit.typ==='zone'){ hit.x=x; hit.y=y; }
  else { if(slot==='X2'){ hit.x2=x; hit.y2=y; } else { hit.x1=x; hit.y1=y; } }
  _saveBots();
  if(typeof _selBotId!=='undefined' && _selBotId===b.id) renderBotEditor();
  botResyncById(b.id);
  showStatus('📍 Zone "'+zoneName+'" '+slot+' = '+x+'/'+y+' gesetzt (Bot „'+b.name+'")','success');
  return true;
}

/* Baut die EXEC-Nutzlast fuer einen Bot.

   Base64-kodiert, damit kein Sonderzeichen den Uebertragungsweg bricht.
   BC-Seite: new Function(decodeURIComponent(escape(atob(encoded))))()

   Davor wird eine eventuell noch laufende Instanz gestoppt. Grund: b.laufend
   ist reiner Popup-Zustand und wird beim Neuladen des Konfigurators auf false
   gesetzt – der Bot im BC-Tab laeuft dann aber weiter. Ein Klick auf "Starten"
   lief bisher in den Doppelstart-Schutz im erzeugten Code, meldete im Popup
   trotzdem Erfolg, und weiter lief die ALTE Konfiguration. Das Stoppen steht
   in derselben Nutzlast und damit im selben synchronen Durchlauf – kein
   Zeitfenster zwischen Stopp und Start. */
function _botExecCode(bot) {
  const safeId = bot.id.replace(/\W/g,'_');
  const encoded = btoa(unescape(encodeURIComponent(_buildBotCode(bot))));
  return `(function(){`
    + `var _alt=window['_BCBot_${safeId}'];`
    + `if(_alt&&_alt.stop){try{_alt.stop();}catch(e){console.warn('[Bot] Stopp der Vorgaengerinstanz:',e);}}`
    + `return (new Function(decodeURIComponent(escape(atob('${encoded}'))))());`
    + `})()`;
}

function botDeployById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  bcSend({ type:'EXEC', code: _botExecCode(b) });
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

function botSync(still) {
  const b = _selBot();
  if (!b) return;
  if (!_connected) { if(!still) showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  if (!b.laufend)  { if(!still) showStatus('ℹ️ Bot läuft nicht – einfach Starten klicken', 'info'); return; }

  const btn = document.getElementById('syncBtn');
  if (btn && !still) { btn.disabled = true; btn.textContent = '⏳ Sync…'; }

  // Step 1: Stop
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });

  // Step 2: After stop delay, redeploy with latest saved config (same Base64 encoding as botDeployById)
  setTimeout(() => {
    const latest = _selBot();
    if (!latest) return;
    bcSend({ type:'EXEC', code: _botExecCode(latest) });
    latest.laufend = true;
    // Kein _saveBots() hier: das wuerde den automatischen Sync erneut
    // ausloesen und den Bot in einer Schleife immer wieder neu starten.
    renderBotList(); renderBotEditor();
    showStatus(still ? '🔄 Änderung übernommen' : '✅ Bot synchronisiert und neu gestartet', 'success');
  }, 700);
}
