function renderBotTab() {
  // Nur beim ersten Laden aus localStorage lesen – nie In-Memory-State überschreiben
  if (!_bots.length) _loadBots();
  if (!_botGroups.length) _loadBotGroups();
  renderBotList();
  // Falls _selBotId nicht gesetzt aber Bots vorhanden: ersten selektieren
  if (!_selBotId && _bots.length) _selBotId = _bots[0].id;
  if (_selBotId) renderBotEditor();
}

// ── Bot Sidebar ───────────────────────────────────────────────
function renderBotList() {
  renderBotGroupList();

  const el = document.getElementById('botList');
  if (!el) return;

  // Only show bots not in any group
  const groupedIds = new Set(_botGroups.flatMap(g => g.botIds));
  const ungrouped = _bots.filter(b => !groupedIds.has(b.id));

  if (!_bots.length) {
    el.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:.71rem;text-align:center">Noch keine Bots.<br>Klicke + Neu.</div>';
    return;
  }

  // Show "Neue Gruppe" input row + ungrouped bots
  const newGroupRow = `
    <div class="bg-new-row">
      <input id="bgNewName" placeholder="Gruppenname…" onkeydown="if(event.key==='Enter')groupNew()">
      <button onclick="groupNew()">📁 Gruppe</button>
    </div>`;

  if (!ungrouped.length) {
    el.innerHTML = newGroupRow + (_botGroups.length ? '' : '<div style="padding:6px 16px 12px;color:var(--text3);font-size:.69rem;font-style:italic">Alle Bots in Gruppen</div>');
    return;
  }

  const ungroupedHdr = _botGroups.length ? '<div class="ungrouped-hdr">Ohne Gruppe</div>' : '';
  el.innerHTML = newGroupRow + ungroupedHdr + ungrouped.map(b => `
    <div class="bot-item${b.id===_selBotId?' sel':''}" onclick="botSelect('${b.id}')">
      <div style="flex:1">
        <div class="bi-name">${escHtml(b.name)}</div>
        <div class="bi-stat">${(b.triggers||[]).filter(t=>t.aktiv).length} Trigger aktiv</div>
      </div>
      <button class="bot-toggle ${b.laufend?'on':'off'}" onclick="event.stopPropagation();botToggleLaufend('${b.id}')" title="${b.laufend?'Läuft':'Gestoppt'}"></button>
      <button onclick="event.stopPropagation();botDelete('${b.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 4px">✕</button>
    </div>`).join('');
}

function botNew() {
  const bot = {
    id: 'b' + Date.now(), name: 'Mein Bot', laufend: false,
    settings: { modus:'both', hearChat:true, hearEmote:true, hearWhisper:true, nurEigene:false, logAktiv:true },
    triggers: [], events: [],
  };
  _bots.push(bot); _selBotId = bot.id; _saveBots();
  renderBotList(); renderBotEditor();
}

function botSelect(id) {
  _selBotId = id; renderBotList(); renderBotEditor();
}

function botToggleLaufend(id) {
  const b = _bots.find(x => x.id === id); if (!b) return;
  if (b.laufend) botStopById(id); else botDeployById(id);
}

function botDelete(id) {
  const b = _bots.find(x => x.id === id);
  if (!b || !confirm(`Bot "${b.name}" löschen?`)) return;
  _bots = _bots.filter(x => x.id !== id);
  if (_selBotId === id) { _selBotId = _bots[0]?.id ?? null; }
  _saveBots(); renderBotList();
  if (_selBotId) renderBotEditor();
  else document.getElementById('botEditor').innerHTML = '<div class="be-empty"><div class="be-empty-icon">🤖</div>Wähle einen Bot aus oder erstelle einen neuen.</div>';
}

// ── Bot Editor ────────────────────────────────────────────────
// ════════════════════ VORLAGEN-BAUKASTEN ════════════════════
const BOT_TEMPLATES = {
  mantra: { label:'⚠️ Pflichtwort „Master"', triggers:[
    { name:'Pflichtwort: Master', aktiv:true, cooldownSek:5,
      bedingungen:[{typ:'wort', wort:'master', modus:'fehlt', typ_msg:'chat'}],
      aktionen:[ {typ:'variable', varName:'verstoesse', varOp:'add', varWert:'1', aktZiel:'ausloeser'},
                 {typ:'whisper', text:'⚠️ Du musst „Master" sagen! Verstoß +1.', aktZiel:'ausloeser'} ] }
  ]},
  eskalation: { label:'📈 Eskalation bei Verstößen (≥3)', triggers:[
    { name:'Eskalation (≥3 Verstöße)', aktiv:true,
      bedingungen:[{typ:'ev_interval', sek_min:10, sek_max:10},
                   {typ:'variable', varName:'verstoesse', varCmp:'>=', varWert:'3', logik:'und'}],
      aktionen:[ {typ:'whisper', text:'Zu viele Verstöße – Strafe! (hier Item/Erregung ergänzen)', aktZiel:'ausloeser'},
                 {typ:'variable', varName:'verstoesse', varOp:'set', varWert:'0', aktZiel:'ausloeser'} ] }
  ]},
  daily: { label:'🎁 Tägliche Belohnung (!daily)', triggers:[
    { name:'Tägliche Belohnung', aktiv:true, cooldownSek:86400,
      bedingungen:[{typ:'wort', wort:'!daily', typ_msg:'chat'}],
      aktionen:[ {typ:'money', money_op:'add', money_val:50, aktZiel:'ausloeser'},
                 {typ:'whisper', text:'🎁 Tagesbelohnung: +50! Komm morgen wieder.', aktZiel:'ausloeser'} ] }
  ]},
  gluecksrad: { label:'🎲 Glücksrad (!spin, 40% Gewinn)', triggers:[
    { name:'Glücksrad – Gewinn', aktiv:true, cooldownSek:30,
      bedingungen:[{typ:'wort', wort:'!spin', typ_msg:'chat'},{typ:'zufall', prozent:40, logik:'und'}],
      aktionen:[ {typ:'money', money_op:'add', money_val:20, aktZiel:'ausloeser'},
                 {typ:'whisper', text:'🎉 Gewonnen! +20', aktZiel:'ausloeser'} ] }
  ]},
  gefaengnis: { label:'🔒 Gefängnis (Einsperren + Ausbruch-Check)', triggers:[
    { name:'Zelle: Einsperren', aktiv:true,
      bedingungen:[{typ:'zone_rect', name:'Zelle', x1:0,y1:0,x2:2,y2:2}],
      aktionen:[ {typ:'variable', varName:'gefangen', varOp:'set', varWert:'1', aktZiel:'ausloeser'},
                 {typ:'whisper', text:'🔒 Du bist jetzt eingesperrt. (Cage-Item hier ergänzen)', aktZiel:'ausloeser'} ] },
    { name:'Zelle: Ausbruch-Check', aktiv:true,
      bedingungen:[{typ:'ev_interval', sek_min:10, sek_max:10},
                   {typ:'variable', varName:'gefangen', varCmp:'==', varWert:'1', logik:'und'},
                   {typ:'zone_rect', name:'Zelle', x1:0,y1:0,x2:2,y2:2, logik:'und_nicht'}],
      aktionen:[ {typ:'teleport', tpMode:'punkte', tpSlots:[{x:1,y:1,gueltig:true}]},
                 {typ:'whisper', text:'⛔ Zurück in die Zelle!', aktZiel:'ausloeser'} ] }
  ]},
  tuersteher: { label:'🚪 Türsteher (Whitelist/Rang)', triggers:[
    { name:'Türsteher: Zutritt prüfen', aktiv:true,
      bedingungen:[{typ:'ev_interval', sek_min:5, sek_max:5},
                   {typ:'zone_rect', name:'VIP', x1:0,y1:0,x2:2,y2:2, logik:'und'}],
      aktionen:[ {typ:'teleport', tpMode:'punkte', tpSlots:[{x:5,y:5,gueltig:true}]},
                 {typ:'whisper', text:'⛔ Kein Zutritt – nur für Berechtigte. (Rang/Whitelist als Bedingung ergänzen)', aktZiel:'ausloeser'} ] }
  ]},
  autorang: { label:'🏆 Auto-Rang nach Punkten (Rang je Stufe wählen)', triggers:[
    { name:'Auto-Rang: Stufe 1 (≥50 Punkte)', aktiv:true, cooldownSek:10,
      bedingungen:[{typ:'ev_interval', sek_min:15, sek_max:15},{typ:'variable', varName:'punkte', varCmp:'>=', varWert:'50', logik:'und'}],
      aktionen:[{typ:'rang', rang_op:'setzen', rang_id:'', aktZiel:'ausloeser'},{typ:'whisper', text:'🏆 Aufgestiegen (Stufe 1)! (Rang in der Aktion wählen)', aktZiel:'ausloeser'}] },
    { name:'Auto-Rang: Stufe 2 (≥150 Punkte)', aktiv:true, cooldownSek:10,
      bedingungen:[{typ:'ev_interval', sek_min:15, sek_max:15},{typ:'variable', varName:'punkte', varCmp:'>=', varWert:'150', logik:'und'}],
      aktionen:[{typ:'rang', rang_op:'setzen', rang_id:'', aktZiel:'ausloeser'},{typ:'whisper', text:'🏆 Aufgestiegen (Stufe 2)! (Rang wählen)', aktZiel:'ausloeser'}] },
    { name:'Auto-Rang: Stufe 3 (≥300 Punkte)', aktiv:true, cooldownSek:10,
      bedingungen:[{typ:'ev_interval', sek_min:15, sek_max:15},{typ:'variable', varName:'punkte', varCmp:'>=', varWert:'300', logik:'und'}],
      aktionen:[{typ:'rang', rang_op:'setzen', rang_id:'', aktZiel:'ausloeser'},{typ:'whisper', text:'🏆 Aufgestiegen (Stufe 3)! (Rang wählen)', aktZiel:'ausloeser'}] }
  ]},
  uniform: { label:'👕 Auto-Uniform (Begrüßung + !exit)', triggers:[
    { name:'Begrüßung (Betreten)', aktiv:true,
      bedingungen:[{typ:'player_betritt', betritt_typ:'alle'}],
      aktionen:[ {typ:'whisper', text:'Willkommen! Uniform wird angelegt. (Outfit-Aktion hier ergänzen)', aktZiel:'ausloeser'} ] },
    { name:'Entlassen bei „!exit"', aktiv:true,
      bedingungen:[{typ:'wort', wort:'!exit', typ_msg:'chat'}],
      aktionen:[ {typ:'whisper', text:'Du wurdest entlassen. (Outfit zurücksetzen hier ergänzen)', aktZiel:'ausloeser'} ] }
  ]}
};
function botInsertTemplate(key){
  const b=_selBot(); if(!b) return;
  const tpl=BOT_TEMPLATES[key]; if(!tpl) return;
  b.triggers = b.triggers || [];
  let n=0;
  (tpl.triggers||[]).forEach((t,i)=>{
    const clone=JSON.parse(JSON.stringify(t));
    clone.id='t'+Date.now()+Math.floor(Math.random()*99999)+'_'+i;
    b.triggers.push(clone); n++;
  });
  _saveBots(); renderBotEditor();
  if(typeof showStatus==='function') showStatus('📋 Vorlage „'+(tpl.label||key)+'" eingefügt ('+n+' Trigger) – Felder ggf. anpassen','success');
}

// ════════════════════ LIVE-DASHBOARD (Spieler-Profile) ════════════════════
function botDashboard(){
  let p=document.getElementById('botDashPanel');
  if(p){ p.remove(); return; }
  const bv=(typeof _botVars!=='undefined'&&_botVars)?_botVars:{};
  const rpl=(typeof _rankData!=='undefined'&&_rankData&&_rankData.players)?_rankData.players:{};
  const rd=(typeof _rankData!=='undefined'&&_rankData&&_rankData.defs)?_rankData.defs:[];
  const mbl=(typeof _money!=='undefined'&&_money&&_money.balances)?_money.balances:{};
  const members=new Set([...Object.keys(bv),...Object.keys(rpl),...Object.keys(mbl)]);
  const rows=[...members].map(m=>{
    const v=bv[m]||{};
    const name=(rpl[m]&&rpl[m].name)||(mbl[m]&&mbl[m].name)||('#'+m);
    const rkDef=rd.find(r=>r.id===(rpl[m]&&rpl[m].rankId));
    const rank=rkDef?escHtml(rkDef.icon+' '+rkDef.name):'–';
    const money=(mbl[m]&&mbl[m].balance!=null)?mbl[m].balance:0;
    const lb=v.letzterBesuch?new Date(v.letzterBesuch).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'–';
    const others=Object.keys(v).filter(k=>k!=='letzterBesuch').map(k=>escHtml(k)+'=<b>'+escHtml(String(v[k]))+'</b>').join(', ')||'–';
    return `<tr style="border-top:1px solid var(--border2,#333)"><td style="padding:3px 6px">${escHtml(name)} <span style="color:var(--text3)">#${escHtml(m)}</span></td><td style="padding:3px 6px">${rank}</td><td style="padding:3px 6px;text-align:right">${money}</td><td style="padding:3px 6px;font-size:.62rem">${others}</td><td style="padding:3px 6px;font-size:.62rem;color:var(--text3)">${escHtml(lb)}</td></tr>`;
  }).join('');
  p=document.createElement('div');
  p.id='botDashPanel';
  p.style.cssText='position:fixed;top:60px;right:20px;width:560px;max-height:78vh;overflow:auto;z-index:99999;background:var(--bg2,#1c1c1c);border:1px solid var(--purple,#8b5cf6);border-radius:10px;padding:12px;box-shadow:0 10px 36px rgba(0,0,0,.6);font-family:var(--mono,monospace);font-size:.68rem;color:var(--text,#ddd)';
  p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:var(--purple,#8b5cf6)">📊 Spieler-Profile (${members.size})</b><span><button onclick="botDashboard();botDashboard()" title="Aktualisieren" style="background:var(--pd,#3a2a6a);border:none;color:var(--pl,#cbb6ff);border-radius:5px;cursor:pointer;padding:2px 8px;margin-right:4px">🔄</button><button onclick="document.getElementById('botDashPanel').remove()" style="background:none;border:none;color:#e55;cursor:pointer;font-size:.9rem">✕</button></span></div>${members.size?`<table style="width:100%;border-collapse:collapse"><thead><tr style="color:var(--text3)"><th style="text-align:left;padding:2px 6px">Spieler</th><th style="text-align:left;padding:2px 6px">Rang</th><th style="text-align:right;padding:2px 6px">💰</th><th style="text-align:left;padding:2px 6px">Variablen</th><th style="text-align:left;padding:2px 6px">Letzter Besuch</th></tr></thead><tbody>${rows}</tbody></table>`:'<div style="color:var(--text3)">Noch keine Profile gespeichert.</div>'}`;
  document.body.appendChild(p);
}

function renderBotEditor() {
  const bot = _selBot(); if (!bot) return;
  // Offene Trigger-Bodies vor Re-Render sichern
  const openTids = new Set(
    (bot.triggers||[]).map(t=>t.id).filter(id=>document.getElementById('tb-'+id)?.classList.contains('open'))
  );
  const s = bot.settings;
  const statusCls = bot.laufend ? 'running' : 'stopped';
  const statusTxt = bot.laufend ? '▶️ Bot läuft · <span style="font-size:.62rem;opacity:.7">Änderungen → 🔄 Sync klicken</span>' : '⏹ Nicht gestartet';

  const html = `
    <div class="be-topbar">
      <input value="${escHtml(bot.name)}" oninput="botField('name',this.value)" style="width:180px;font-size:.78rem;font-weight:600;background:var(--bg3);border:1px solid var(--border2);border-radius:5px;color:var(--text);padding:4px 10px;font-family:var(--mono)">
      <div style="flex:1"></div>
      <label class="bot-cfg-label" title="Normale Chatnachrichten"><input type="checkbox" ${s.hearChat?'checked':''} onchange="botSetting('hearChat',this.checked)"> Chat</label>
      <label class="bot-cfg-label" title="Emotes"><input type="checkbox" ${s.hearEmote?'checked':''} onchange="botSetting('hearEmote',this.checked)"> *Emote*</label>
      <label class="bot-cfg-label" title="Whisper"><input type="checkbox" ${s.hearWhisper?'checked':''} onchange="botSetting('hearWhisper',this.checked)"> Whisper</label>
      <label class="bot-cfg-label" title="Nur eigene Nachrichten überwachen"><input type="checkbox" ${s.nurEigene?'checked':''} onchange="botSetting('nurEigene',this.checked)"> Nur eigene</label>
      <label class="bot-cfg-label"><input type="checkbox" ${s.logAktiv?'checked':''} onchange="botSetting('logAktiv',this.checked)"> Log</label>
      <select class="cf" onchange="botSetting('modus',this.value)" style="width:110px">
        <option value="chat"  ${s.modus==='chat'?'selected':''}>Nur Chat</option>
        <option value="zone"  ${s.modus==='zone'?'selected':''}>Nur Zone</option>
        <option value="both"  ${s.modus==='both'?'selected':''}>Chat + Zone</option>
      </select>
      ${bot.laufend
        ? `<button class="btn btn-red" onclick="botStop()" style="font-size:.68rem;padding:4px 12px">⏹ Stoppen</button>
           <button class="btn btn-sync" id="syncBtn" onclick="botSync()" title="Bot stoppen, Änderungen speichern und neu starten" style="font-size:.68rem;padding:4px 12px">🔄 Sync</button>`
        : `<button class="btn btn-green" onclick="botDeploy()" style="font-size:.68rem;padding:4px 12px">▶️ Starten</button>`
      }
      <button class="btn btn-primary" onclick="botDashboard()" title="Spieler-Profile: Punkte, Rang, Money, Besuche, letzter Besuch" style="font-size:.65rem;padding:4px 8px">📊</button>
      <button class="btn btn-primary" onclick="botExportConfig()" title="Export" style="font-size:.65rem;padding:4px 8px">⬇️</button>
      <button class="btn btn-primary" onclick="botImportConfig()" title="Import" style="font-size:.65rem;padding:4px 8px">⬆️</button>
      <button class="btn btn-primary" onclick="jsonImportOpen('bot')" title="Trigger per JSON importieren (zum aktuellen Bot hinzufügen)" style="font-size:.65rem;padding:4px 8px">{ }📥</button>
      <button class="btn btn-primary" onclick="botExportTriggersJSON()" title="Trigger dieses Bots als JSON exportieren" style="font-size:.65rem;padding:4px 8px">{ }📤</button>
    </div>
    <div class="bot-status ${statusCls}" id="bot-status-bar">${statusTxt}</div>
    <div class="be-body">
      <div id="trig-list">${(bot.triggers||[]).map((t,i)=>renderTrigCard(bot,t,i)).join('')}</div>
      <button class="be-addtrig" onclick="botAddTrig()">+ Trigger hinzufügen</button>
      <select class="be-addtrig" style="cursor:pointer" onchange="if(this.value){botInsertTemplate(this.value);this.value='';}" title="Fertige Trigger-Sets einfügen">
        <option value="">📋 Vorlage einfügen …</option>
        ${Object.entries(BOT_TEMPLATES).map(([k,v])=>`<option value="${k}">${escHtml(v.label)}</option>`).join('')}
      </select>
      <div style="margin:14px 0 6px;font-size:.72rem;font-weight:700;color:var(--purple);border-top:1px solid var(--border2);padding-top:10px">📖 Szenen / Story</div>
      <div id="szene-list">${_szenen(bot).map((s,i)=>renderSzeneCard(bot,s,i)).join('')}</div>
      <button class="be-addtrig" onclick="szeneNew()">+ Szene hinzufügen</button>
      <!-- Events: renderEventsTab() fuellt diesen Container samt eigener
           Ueberschrift und Hinzufuegen-Knopf. Er fehlte bisher komplett,
           wodurch die gesamte Events-Oberflaeche unerreichbar war, obwohl
           Engine, Datenhaltung und CSS dafuer vorhanden sind. -->
      <div id="events-container" style="border-top:1px solid var(--border2);margin-top:14px;padding-top:10px"></div>
    </div>`;
  document.getElementById('botEditor').innerHTML = html;
  // Offene Trigger-Bodies wiederherstellen
  openTids.forEach(tid => document.getElementById('tb-'+tid)?.classList.add('open'));
  // Erst jetzt – vorher wuerde das innerHTML oben den Container wieder leeren
  if (typeof renderEventsTab === 'function') renderEventsTab();
}

function botField(field, val) {
  const b = _selBot(); if (!b) return;
  b[field] = val; _saveBots();
  if (field === 'name') renderBotList();
}

function botSetting(key, val) {
  const b = _selBot(); if (!b) return;
  b.settings[key] = val; _saveBots();
}

// ════════════════════ SZENEN-MODUS (Story-Editor) ════════════════════
// Eine Szene ist ein linearer Ablauf aus Schritten, der nacheinander abgespielt
// wird. Schritt-Typen: nachricht, warte, frage (auf Antwort warten/verzweigen),
// sprung (zu anderem Schritt), ende.
function _szenen(b){ if(!b.szenen) b.szenen=[]; return b.szenen; }
function _szene(b,sid){ return _szenen(b).find(x=>x.id===sid)||null; }

function szeneNew(){
  const b=_selBot(); if(!b) return;
  _szenen(b).push({id:'sz'+Date.now(), name:'Neue Szene', open:true, steps:[]});
  _saveBots(); renderBotEditor();
}
function szeneTest(sid){
  const b=_selBot(); if(!b) return;
  if(!b.laufend){ alert('Der Bot muss zuerst laufen (▶️ Starten), damit die Szene getestet werden kann.'); return; }
  const safeId=b.id.replace(/\W/g,'_');
  bcSend({type:'EXEC', code:"window['_BCBot_"+safeId+"']&&window['_BCBot_"+safeId+"'].playScene("+JSON.stringify(sid)+");"});
}
function szeneDelete(sid){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  if(!confirm('Szene „'+(s.name||'')+'" löschen?')) return;
  b.szenen=_szenen(b).filter(x=>x.id!==sid); _saveBots(); renderBotEditor();
}
function szeneField(sid,field,val){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  s[field]=val; _saveBots();
}
function szeneToggle(sid){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  s.open=!s.open;
  document.getElementById('szbody-'+sid)?.classList.toggle('open',s.open);
}
function szeneMove(sid,dir){
  const b=_selBot(); if(!b) return;
  const arr=_szenen(b); const i=arr.findIndex(x=>x.id===sid); if(i<0) return;
  const j=i+dir; if(j<0||j>=arr.length) return;
  [arr[i],arr[j]]=[arr[j],arr[i]]; _saveBots(); renderBotEditor();
}

function _newStep(typ){
  const st={id:'st'+Date.now()+Math.floor(Math.random()*9999), typ};
  if(typ==='nachricht'){ st.msgTyp='chat'; st.text=''; st.pause=2; }
  else if(typ==='warte'){ st.sek=3; }
  else if(typ==='frage'){ st.msgTyp='chat'; st.text=''; st.antworten=[{wort:'',ziel:''}]; st.timeout=0; st.timeoutZiel=''; }
  else if(typ==='sprung'){ st.ziel=''; }
  else if(typ==='variable'){ st.varName=''; st.varOp='set'; st.varWert=''; }
  else if(typ==='wenn'){ st.varName=''; st.varCmp='=='; st.varWert=''; st.zielJa=''; st.zielNein=''; }
  return st;
}
function stepAdd(sid,typ){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  s.steps=s.steps||[]; s.steps.push(_newStep(typ));
  _saveBots(); _szeneRerenderSteps(sid);
}
function stepField(sid,stid,field,val){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  const st=(s.steps||[]).find(x=>x.id===stid); if(!st) return;
  st[field]=val; _saveBots();
}
function stepRemove(sid,stid){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  s.steps=(s.steps||[]).filter(x=>x.id!==stid); _saveBots(); _szeneRerenderSteps(sid);
}
function stepMove(sid,stid,dir){
  const b=_selBot(); if(!b) return;
  const s=_szene(b,sid); if(!s) return;
  const arr=s.steps||[]; const i=arr.findIndex(x=>x.id===stid); if(i<0) return;
  const j=i+dir; if(j<0||j>=arr.length) return;
  [arr[i],arr[j]]=[arr[j],arr[i]]; _saveBots(); _szeneRerenderSteps(sid);
}
function antwortAdd(sid,stid){
  const b=_selBot(); if(!b) return;
  const st=(_szene(b,sid)?.steps||[]).find(x=>x.id===stid); if(!st) return;
  st.antworten=st.antworten||[]; st.antworten.push({wort:'',ziel:''});
  _saveBots(); _stepRerender(sid,stid);
}
function antwortField(sid,stid,ai,field,val){
  const b=_selBot(); if(!b) return;
  const st=(_szene(b,sid)?.steps||[]).find(x=>x.id===stid); if(!st) return;
  if(!st.antworten?.[ai]) return; st.antworten[ai][field]=val; _saveBots();
}
function antwortRemove(sid,stid,ai){
  const b=_selBot(); if(!b) return;
  const st=(_szene(b,sid)?.steps||[]).find(x=>x.id===stid); if(!st) return;
  st.antworten=(st.antworten||[]).filter((_,i)=>i!==ai); _saveBots(); _stepRerender(sid,stid);
}

function _szeneRerenderSteps(sid){
  const b=_selBot(); const s=_szene(b,sid); if(!s) return;
  const el=document.getElementById('szsteps-'+sid);
  if(el) el.innerHTML=(s.steps||[]).map((st,i)=>renderStep(sid,s,st,i)).join('');
}
function _stepRerender(sid,stid){
  const b=_selBot(); const s=_szene(b,sid); if(!s) return;
  const st=(s.steps||[]).find(x=>x.id===stid); const i=(s.steps||[]).findIndex(x=>x.id===stid);
  if(!st) return;
  const el=document.getElementById('szstep-'+sid+'-'+stid);
  if(el){ const tmp=document.createElement('div'); tmp.innerHTML=renderStep(sid,s,st,i); el.replaceWith(tmp.firstElementChild); }
}

function _stepKurz(st){
  if(st.typ==='nachricht'||st.typ==='frage') return ((st.text||'').slice(0,16)||st.typ);
  if(st.typ==='warte') return (st.sek||0)+'s';
  if(st.typ==='sprung') return 'Sprung';
  return st.typ;
}
function _stepZielOpts(s, sel){
  let o='<option value="" '+(!sel?'selected':'')+'>▶ Weiter (nächster Schritt)</option>';
  (s.steps||[]).forEach((st,i)=>{
    o+='<option value="'+st.id+'" '+(sel===st.id?'selected':'')+'>↪ Schritt '+(i+1)+' – '+escHtml(_stepKurz(st))+'</option>';
  });
  o+='<option value="ende" '+(sel==='ende'?'selected':'')+'>🏁 Szene beenden</option>';
  return o;
}

function renderStep(sid, s, st, idx){
  const tot=(s.steps||[]).length;
  const icons={nachricht:'💬',warte:'⏳',frage:'❓',sprung:'🔀',ende:'🏁',variable:'🔢',wenn:'❔'};
  const names={nachricht:'Nachricht',warte:'Warte',frage:'Frage / Antwort',sprung:'Sprung',ende:'Ende',variable:'Variable setzen',wenn:'Wenn (Bedingung)'};
  let body='';
  if(st.typ==='nachricht'){
    body=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <select class="cf" style="width:96px" onchange="stepField('${sid}','${st.id}','msgTyp',this.value)">
          <option value="chat" ${(!st.msgTyp||st.msgTyp==='chat')?'selected':''}>💬 Chat</option>
          <option value="emote" ${st.msgTyp==='emote'?'selected':''}>✨ Emote</option>
          <option value="whisper" ${st.msgTyp==='whisper'?'selected':''}>🤫 Whisper</option>
        </select>
        <span style="font-size:.62rem;color:var(--text3)">Pause danach:</span>
        <input class="cf" type="number" min="0" step="0.5" value="${st.pause??0}" style="width:62px" oninput="stepField('${sid}','${st.id}','pause',+this.value)"> s
      </div>
      <textarea class="cf" style="width:100%;resize:vertical;min-height:40px;margin-top:4px" rows="2" placeholder="Was der Bot sagt … Variablen: {name}" oninput="stepField('${sid}','${st.id}','text',this.value)">${escHtml(st.text||'')}</textarea>`;
  } else if(st.typ==='warte'){
    body=`<span style="font-size:.65rem;color:var(--text3)">Warte</span>
      <input class="cf" type="number" min="0" step="0.5" value="${st.sek??3}" style="width:70px" oninput="stepField('${sid}','${st.id}','sek',+this.value)"> Sekunden, dann weiter`;
  } else if(st.typ==='frage'){
    const ant=(st.antworten||[]);
    const antRows=ant.map((a,ai)=>`<div style="display:flex;gap:5px;align-items:center;margin-top:3px">
        <span style="font-size:.6rem;color:var(--text3)">wenn</span>
        <input class="cf" style="width:120px" value="${escHtml(a.wort||'')}" placeholder="Antwort-Wort" oninput="antwortField('${sid}','${st.id}',${ai},'wort',this.value)">
        <span style="font-size:.6rem;color:var(--text3)">→</span>
        <select class="cf" style="flex:1;min-width:150px" onchange="antwortField('${sid}','${st.id}',${ai},'ziel',this.value)">${_stepZielOpts(s,a.ziel)}</select>
        <button class="rm-btn" onclick="antwortRemove('${sid}','${st.id}',${ai})">✕</button>
      </div>`).join('');
    body=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <select class="cf" style="width:96px" onchange="stepField('${sid}','${st.id}','msgTyp',this.value)">
          <option value="chat" ${(!st.msgTyp||st.msgTyp==='chat')?'selected':''}>💬 Chat</option>
          <option value="emote" ${st.msgTyp==='emote'?'selected':''}>✨ Emote</option>
          <option value="whisper" ${st.msgTyp==='whisper'?'selected':''}>🤫 Whisper</option>
        </select>
        <span style="font-size:.6rem;color:var(--text3)">Frage-Text (optional)</span>
      </div>
      <textarea class="cf" style="width:100%;resize:vertical;min-height:36px;margin-top:4px" rows="2" placeholder="Frage an den Spieler …" oninput="stepField('${sid}','${st.id}','text',this.value)">${escHtml(st.text||'')}</textarea>
      <div style="margin-top:4px;padding:5px 7px;background:rgba(139,92,246,0.05);border-radius:6px">
        <div style="font-size:.6rem;color:var(--purple);font-weight:700">ANTWORTEN</div>
        ${antRows}
        <button onclick="antwortAdd('${sid}','${st.id}')" style="margin-top:4px;font-size:.62rem;padding:2px 8px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">+ Antwort</button>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-top:4px">
        <span style="font-size:.6rem;color:var(--text3)">⏱ Timeout</span>
        <input class="cf" type="number" min="0" value="${st.timeout??0}" style="width:62px" oninput="stepField('${sid}','${st.id}','timeout',+this.value)"> s (0 = aus) →
        <select class="cf" style="flex:1;min-width:150px" onchange="stepField('${sid}','${st.id}','timeoutZiel',this.value)">${_stepZielOpts(s,st.timeoutZiel)}</select>
      </div>`;
  } else if(st.typ==='sprung'){
    body=`<span style="font-size:.65rem;color:var(--text3)">Springe zu</span>
      <select class="cf" style="flex:1;min-width:170px" onchange="stepField('${sid}','${st.id}','ziel',this.value)">${_stepZielOpts(s,st.ziel)}</select>`;
  } else if(st.typ==='variable'){
    body=`<span style="font-size:.62rem;color:var(--text3)">Variable</span>
      <input class="cf" style="width:130px" value="${escHtml(st.varName||'')}" placeholder="Name (z.B. gehorsam)" oninput="stepField('${sid}','${st.id}','varName',this.value)">
      <select class="cf" style="width:104px" onchange="stepField('${sid}','${st.id}','varOp',this.value)">
        <option value="set" ${(!st.varOp||st.varOp==='set')?'selected':''}>= Setzen</option>
        <option value="add" ${st.varOp==='add'?'selected':''}>➕ Plus</option>
        <option value="sub" ${st.varOp==='sub'?'selected':''}>➖ Minus</option>
        <option value="toggle" ${st.varOp==='toggle'?'selected':''}>🔁 Umschalten 0/1</option>
      </select>
      <input class="cf" style="width:90px" value="${escHtml(st.varWert||'')}" placeholder="Wert" oninput="stepField('${sid}','${st.id}','varWert',this.value)">`;
  } else if(st.typ==='wenn'){
    body=`<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        <span style="font-size:.62rem;color:var(--text3)">wenn</span>
        <input class="cf" style="width:120px" value="${escHtml(st.varName||'')}" placeholder="Variable" oninput="stepField('${sid}','${st.id}','varName',this.value)">
        <select class="cf" style="width:96px" onchange="stepField('${sid}','${st.id}','varCmp',this.value)">
          ${['==','!=','>','<','>=','<=','gesetzt','leer'].map(o=>`<option value="${o}" ${(st.varCmp||'==')===o?'selected':''}>${o}</option>`).join('')}
        </select>
        <input class="cf" style="width:80px" value="${escHtml(st.varWert||'')}" placeholder="Wert" oninput="stepField('${sid}','${st.id}','varWert',this.value)">
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-top:4px">
        <span style="font-size:.6rem;color:#5c5">✅ Ja →</span>
        <select class="cf" style="flex:1;min-width:140px" onchange="stepField('${sid}','${st.id}','zielJa',this.value)">${_stepZielOpts(s,st.zielJa)}</select>
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-top:3px">
        <span style="font-size:.6rem;color:#e55">❌ Nein →</span>
        <select class="cf" style="flex:1;min-width:140px" onchange="stepField('${sid}','${st.id}','zielNein',this.value)">${_stepZielOpts(s,st.zielNein)}</select>
      </div>`;
  } else if(st.typ==='ende'){
    body=`<span style="font-size:.65rem;color:var(--text3)">🏁 Die Szene endet hier.</span>`;
  }
  return `<div class="act-card" id="szstep-${sid}-${st.id}">
    <div style="flex:1">
      <div style="display:flex;gap:4px;align-items:center">
        <span style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
          <button class="order-btn" onclick="stepMove('${sid}','${st.id}',-1)" ${idx===0?'disabled':''}>▲</button>
          <button class="order-btn" onclick="stepMove('${sid}','${st.id}',1)" ${idx===tot-1?'disabled':''}>▼</button>
        </span>
        <span class="trig-order-num" style="margin-right:2px">${idx+1}</span>
        <span style="font-size:.7rem;font-weight:600;color:var(--purple)">${icons[st.typ]||'•'} ${names[st.typ]||st.typ}</span>
        <button class="rm-btn" style="margin-left:auto" onclick="stepRemove('${sid}','${st.id}')">✕</button>
      </div>
      <div style="margin-top:4px;margin-left:6px">${body}</div>
    </div>
  </div>`;
}

function _szeneSummary(s){
  const n=(s.steps||[]).length;
  const first=(s.steps||[]).find(x=>x.typ==='nachricht'||x.typ==='frage');
  const prev=first?('„'+escHtml((first.text||'').slice(0,40))+'"'):'(leer)';
  return n+' Schritt'+(n===1?'':'e')+' · '+prev;
}
function renderSzeneCard(b, s, i){
  const tot=_szenen(b).length;
  return `<div class="trig-card" id="szc-${s.id}">
    <div class="trig-head" onclick="szeneToggle('${s.id}')">
      <span class="trig-order-num">${i+1}</span>
      <span style="display:flex;flex-direction:column;gap:1px;margin-right:2px">
        <button class="order-btn" onclick="event.stopPropagation();szeneMove('${s.id}',-1)" ${i===0?'disabled':''}>▲</button>
        <button class="order-btn" onclick="event.stopPropagation();szeneMove('${s.id}',1)" ${i===tot-1?'disabled':''}>▼</button>
      </span>
      <span style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0">
        <span class="trig-label" id="szlabel-${s.id}">📖 ${escHtml(s.name||'Szene')}</span>
        <span style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_szeneSummary(s)}</span>
      </span>
      <button onclick="event.stopPropagation();szeneTest('${s.id}')" class="rm-btn" title="Szene jetzt testen (Bot muss laufen)" style="color:var(--green)">▶</button>
      <button onclick="event.stopPropagation();szeneDelete('${s.id}')" class="rm-btn" title="Szene löschen">✕</button>
    </div>
    <div class="trig-body ${s.open?'open':''}" id="szbody-${s.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <label style="font-size:.65rem;color:var(--text3)">Name:</label>
        <input class="cf cf-w160" value="${escHtml(s.name||'')}" oninput="szeneField('${s.id}','name',this.value);document.getElementById('szlabel-${s.id}').textContent='📖 '+this.value">
      </div>
      <div class="te-section">
        <div class="te-section-title">🎬 Ablauf
          <button onclick="stepAdd('${s.id}','nachricht')">+ 💬 Nachricht</button>
          <button onclick="stepAdd('${s.id}','warte')">+ ⏳ Warte</button>
          <button onclick="stepAdd('${s.id}','frage')">+ ❓ Frage</button>
          <button onclick="stepAdd('${s.id}','variable')">+ 🔢 Variable</button>
          <button onclick="stepAdd('${s.id}','wenn')">+ ❔ Wenn</button>
          <button onclick="stepAdd('${s.id}','sprung')">+ 🔀 Sprung</button>
          <button onclick="stepAdd('${s.id}','ende')">+ 🏁 Ende</button>
        </div>
        <div id="szsteps-${s.id}">${(s.steps||[]).map((st,si)=>renderStep(s.id,s,st,si)).join('')}</div>
      </div>
    </div>
  </div>`;
}

// ── Trigger Cards ─────────────────────────────────────────────
// ── Klartext-Zusammenfassung eines Triggers (für die eingeklappte Ansicht) ──
// ── 📍 Aktuelle Spielerposition abrufen (für Set-Buttons) ───────────────
const _posCbs = {};
function _requestPos(cb){
  if(typeof _connected!=='undefined' && !_connected){ showStatus('❌ Nicht mit BC verbunden','error'); return; }
  const reqId='pos'+Date.now()+Math.floor(Math.random()*9999);
  _posCbs[reqId]=cb;
  bcSend({type:'GET_POS', reqId});
  setTimeout(()=>{ if(_posCbs[reqId]){ delete _posCbs[reqId]; showStatus('⚠️ Keine Position erhalten – bist du im Raum?','error'); } },4000);
}
function _handlePosData(d){
  const cb=_posCbs[d.reqId]; if(!cb) return; delete _posCbs[d.reqId];
  if(d.err){ showStatus('⚠️ Position: '+d.err,'error'); return; }
  cb(d.x??0, d.y??0);
}
function condSetZone(tid, ci, slot){
  _requestPos((x,y)=>{
    const b=_selBot(); if(!b) return;
    const t=b.triggers.find(z=>z.id===tid); if(!t) return;
    const c=(t.bedingungen||[])[ci]; if(!c) return;
    if(c.typ==='zone'){ c.x=x; c.y=y; }
    else if(c.typ==='zone_rect'){ if(slot==='B'){ c.x2=x; c.y2=y; } else { c.x1=x; c.y1=y; } }
    _saveBots(); condRerender(tid);
    showStatus('📍 '+(slot?slot+' ':'')+'= '+x+'/'+y+' übernommen','success');
  });
}
function tpSlotSetPos(tid, ai, si, branch){
  _requestPos((x,y)=>{
    tpSlotField(tid,ai,si,'x',x,branch);
    tpSlotField(tid,ai,si,'y',y,branch);
    actRerender(tid,ai,branch);
    showStatus('📍 Teleport-Ziel = '+x+'/'+y,'success');
  });
}
function tpAreaSetPos(tid, ai, corner, branch){
  _requestPos((x,y)=>{
    if(corner==='B'){ actField(tid,ai,'tpBx',x,branch); actField(tid,ai,'tpBy',y,branch); }
    else { actField(tid,ai,'tpAx',x,branch); actField(tid,ai,'tpAy',y,branch); }
    actRerender(tid,ai,branch);
    showStatus('📍 Ecke '+corner+' = '+x+'/'+y,'success');
  });
}

// ── Item-Entfernen: Gruppen-Dropdown (mehrere nacheinander) ─────────────
const _BOT_ITEM_GROUPS_FALLBACK = ['ItemArms','ItemHands','ItemHandheld','ItemMouth','ItemMouth2','ItemMouth3','ItemNeck','ItemNeckAccessories','ItemNeckRestraints','ItemHood','ItemHead','ItemNose','ItemEars','ItemNipples','ItemNipplesPiercings','ItemBreast','ItemTorso','ItemTorso2','ItemPelvis','ItemVulva','ItemVulvaPiercings','ItemButt','ItemLegs','ItemBoots','ItemFeet','ItemAddon','ItemMisc','ItemDevices','ItemHidden'];
function _botItemGroups(){
  let groups=[];
  try{ if(typeof CACHE!=='undefined' && CACHE) groups=Object.keys(CACHE); }catch(e){}
  const set=new Set(groups);
  _BOT_ITEM_GROUPS_FALLBACK.forEach(g=>set.add(g));
  return [...set].sort();
}
function _actEntf(t, ai, branch){
  const arr = branch==='sonst' ? (t.aktionen_sonst||[]) : (t.aktionen||[]);
  const a=arr[ai]; if(!a) return null;
  if(!Array.isArray(a.gruppen)) a.gruppen = a.gruppe ? [a.gruppe] : [];
  return a;
}
function actEntfAddGruppe(tid, ai, grp, branch){
  const b=_selBot(); if(!b) return;
  const t=b.triggers.find(z=>z.id===tid); if(!t) return;
  const a=_actEntf(t,ai,branch); if(!a) return;
  if(grp && !a.gruppen.includes(grp)) a.gruppen.push(grp);
  delete a.gruppe;
  _saveBots(); actRerender(tid,ai,branch);
}
function actEntfRemoveGruppe(tid, ai, idx, branch){
  const b=_selBot(); if(!b) return;
  const t=b.triggers.find(z=>z.id===tid); if(!t) return;
  const a=_actEntf(t,ai,branch); if(!a) return;
  a.gruppen.splice(idx,1);
  _saveBots(); actRerender(tid,ai,branch);
}
function profilItemMove(tid, ai, idx, dir, branch){
  const b=_selBot(); if(!b) return;
  const t=b.triggers.find(z=>z.id===tid); if(!t) return;
  const arr=branch==='sonst'?(t.aktionen_sonst||[]):(t.aktionen||[]);
  const a=arr[ai]; if(!a||!Array.isArray(a.profilItems)) return;
  const j=idx+dir; if(j<0||j>=a.profilItems.length) return;
  [a.profilItems[idx],a.profilItems[j]]=[a.profilItems[j],a.profilItems[idx]];
  _saveBots(); actRerender(tid,ai,branch);
}
function _outfitKeepArr(t, ai, branch){
  const arr=branch==='sonst'?(t.aktionen_sonst||[]):(t.aktionen||[]);
  const a=arr[ai]; if(!a) return null;
  if(!Array.isArray(a.outfitKeepGroups)) a.outfitKeepGroups = a.outfitKeepGroups ? (''+a.outfitKeepGroups).split(',').map(s=>s.trim()).filter(Boolean) : [];
  return a;
}
function outfitKeepAdd(tid, ai, grp, branch){
  const b=_selBot(); if(!b) return;
  const t=b.triggers.find(z=>z.id===tid); if(!t) return;
  const a=_outfitKeepArr(t,ai,branch); if(!a) return;
  grp=(''+grp).trim(); if(grp && !a.outfitKeepGroups.includes(grp)) a.outfitKeepGroups.push(grp);
  _saveBots(); actRerender(tid,ai,branch);
}
function outfitKeepRemove(tid, ai, idx, branch){
  const b=_selBot(); if(!b) return;
  const t=b.triggers.find(z=>z.id===tid); if(!t) return;
  const a=_outfitKeepArr(t,ai,branch); if(!a) return;
  a.outfitKeepGroups.splice(idx,1); _saveBots(); actRerender(tid,ai,branch);
}

function _btLogikWort(l) {
  return ({und:'und', oder:'oder', und_oder:'und/oder', und_nicht:'aber NICHT'})[l||'und'] || 'und';
}
function _btCondPhrase(bot, c) {
  const e = (s)=>escHtml(String(s));
  // Neue Typen beschreiben sich im Verzeichnis selbst
  if (c && c.typ === 'gruppe') {
    const wort = (c.verknuepfung||'und') === 'oder' ? ' oder ' : ' und ';
    const teile = (c.kinder||[]).map(k => _btCondPhrase(bot, k));
    return teile.length ? '(' + teile.join(wort) + ')' : '(leere Klammer)';
  }
  const reg = c && COND_DEFS[c.typ];
  if (reg && typeof reg.klartext === 'function') {
    try { return e(reg.klartext(c)); } catch (err) { return e(reg.label); }
  }
  switch (c?.typ) {
    case 'wort': {
      const w = c.wort ? '„'+e(c.wort)+'"' : '(leeres Wort)';
      const k = ({any:'sagt/schreibt', chat:'sagt', emote:'als Emote', whisper:'flüstert'})[c.typ_msg||'any'] || 'sagt';
      return c.modus==='fehlt' ? ('jemand schreibt OHNE '+w) : ('jemand '+k+' '+w);
    }
    case 'zone':      return 'jemand auf Position '+(c.x??0)+'/'+(c.y??0)+(c.name?' ('+e(c.name)+')':'')+' steht';
    case 'zone_rect': return 'jemand im Bereich '+(c.x1??0)+'/'+(c.y1??0)+'–'+(c.x2??0)+'/'+(c.y2??0)+(c.name?' ('+e(c.name)+')':'')+' steht';
    case 'item_traegt':       return e(c.item||'ein Item')+' getragen wird';
    case 'item_traegt_nicht': return e(c.item||'ein Item')+' NICHT getragen wird';
    case 'trigger_war': { const rt=(bot?.triggers||[]).find(x=>x.id===c.trigId); return 'Vortrigger „'+e(rt?.name||'?')+'" erfüllt ist'; }
    case 'player_betritt': return ({alle:'jemand den Raum betritt',neu:'jemand zum ersten Mal den Raum betritt',rejoin:'jemand wieder den Raum betritt'})[c.betritt_typ||'alle'];
    case 'rang': {
      if (c.rang_op==='kein') return 'jemand keinen Rang hat';
      const op = ({'=':'genau','min':'mind.','max':'höchstens'})[c.rang_op||'='];
      const r = _rankSorted().find(x=>x.id===c.rang_id);
      return 'jemand Rang '+op+' '+e(r?r.name:'?')+' hat';
    }
    case 'shop_kauf': { const it=_shop.items.find(x=>x.id===c.shop_id); return it?'„'+e(it.name)+'" im Shop gekauft wird':'etwas im Shop gekauft wird'; }
    case 'ev_timer':    return 'nach '+(c.sek??10)+'s (einmalig)';
    case 'ev_interval': return 'alle '+(c.sek_min??30)+'–'+(c.sek_max??180)+'s';
    case 'variable': return e(c.varName||'var')+' '+(c.varCmp||'==')+' '+e(c.varWert??'');
    case 'zufall': return (c.prozent??50)+'% Chance';
    case 'erregung': return 'Erregung '+(c.arCmp||'>=')+' '+(c.arWert??99)+'%';
    default: return e(c?.typ||'?');
  }
}
function _btActPhrase(bot, a) {
  const e = (s)=>escHtml(String(s));
  const z = ({ausloeser:'',shop_kaeufer:' →Käufer',alle:' →alle',whitelist:' →Whitelist'})[a?.aktZiel||'ausloeser'] || '';
  const txt = (a?.text||'').trim().replace(/\s+/g,' ').slice(0,28);
  switch (a?.typ) {
    case 'chat':    return '💬 „'+e(txt||'…')+'"';
    case 'emote':   return '✨ „'+e(txt||'…')+'"';
    case 'whisper': return '🤫 „'+e(txt||'…')+'"';
    case 'item': {
      const what = a.itemConfig ? a.itemConfig.asset : a.profilName || a.curseName || a.item || 'Item';
      return '📦 '+e(what)+' anlegen'+z;
    }
    case 'item_entf': { const gs=Array.isArray(a.gruppen)?a.gruppen:(a.gruppe?[a.gruppe]:[]); return '🗑️ '+(gs.length?e(gs.join(', ')):'Gruppe')+' entfernen'+z; }
    case 'teleport':  return '🌀 Teleport'+z;
    case 'money': { const op=({add:'+',sub:'−',set:'=',reset:'reset'})[a.money_op||'add']; return '💰 Money '+op+(a.money_op==='reset'?'':(a.money_val??1))+z; }
    case 'rang': { const op=({setzen:'setzen',entfernen:'entfernen',naechster:'+1 Lv',vorheriger:'−1 Lv'})[a.rang_op||'setzen']; return '🏆 Rang '+op+z; }
    case 'szene': { const sz=(bot?.szenen||[]).find(x=>x.id===a.szeneId); return '📖 Szene „'+e(sz?.name||'?')+'" starten'; }
    case 'variable': { const op=({set:'=',add:'+',sub:'−',toggle:'⇄'})[a.varOp||'set']; return '🔢 '+e(a.varName||'var')+' '+op+(a.varOp==='toggle'?'':' '+e(a.varWert??'')); }
    case 'erregung': { const op=({set:'Erregung =',add:'Erregung +',sub:'Erregung −',orgasm:'Orgasmus 💥',stop:'Orgasmus-Stop'})[a.erregOp||'set']; return '💗 '+op+((a.erregOp==='orgasm'||a.erregOp==='stop')?'':' '+(a.erregVal??50)+'%')+z; }
    case 'mapkey': { const k=({bronze:'🥉 Bronze',silver:'🥈 Silver',gold:'🥇 Gold'})[a.mapKey||'bronze']; return '🔑 '+k+' '+((a.mapKeyOp||'geben')==='geben'?'geben':'wegnehmen')+z; }
    default: return e(a?.typ||'?');
  }
}

// ── Spieler-Tab: alle bekannten Spieler mit Rang, Money, Map-Keys ──
let _spielerRoomMembers = [];   // [{num,name}] – aktuell im Raum (inkl. Player)
let _spielerTimer = null;
function _spielerRefreshRequest(){
  try { if (typeof _connected!=='undefined' && _connected && typeof bcSend==='function') bcSend({ type:'GET_PLAYER' }); } catch(e){}
}
function _startSpielerTimer(){ _stopSpielerTimer(); _spielerTimer = setInterval(_spielerRefreshRequest, 10000); }
function _stopSpielerTimer(){ if (_spielerTimer){ clearInterval(_spielerTimer); _spielerTimer = null; } }
// Aufgerufen aus dem PLAYER_DATA-Handler
function _spielerSetRoom(data){
  const list = [];
  if (data && data.memberNumber != null) list.push({ num: String(data.memberNumber), name: data.name || ('#'+data.memberNumber) });
  (data && data.members || []).forEach(m => { if (m && m.num != null) list.push({ num: String(m.num), name: m.name || ('#'+m.num) }); });
  // dedupe nach num
  const seen = {}; _spielerRoomMembers = list.filter(m => seen[m.num] ? false : (seen[m.num]=true));
  if (document.getElementById('tab-spieler')?.classList.contains('active')) renderSpielerTab();
}

function renderSpielerTab(){
  const host = document.getElementById('spieler-list'); if(!host) return;
  const rankData = (typeof _rankData!=='undefined'&&_rankData)?_rankData:{players:{},defs:[],settings:{}};
  const money    = (typeof _money!=='undefined'&&_money)?_money:{balances:{},settings:{}};
  const pkeys    = (typeof _playerKeys!=='undefined'&&_playerKeys)?_playerKeys:{};
  const cur      = (money.settings&&money.settings.name) || 'Gold';
  const defById  = {}; (rankData.defs||[]).forEach(d=>defById[d.id]=d);

  // Aktuell im Raum
  const roomNums = new Set(_spielerRoomMembers.map(m=>m.num));
  const roomName = {}; _spielerRoomMembers.forEach(m=>roomName[m.num]=m.name);

  const nums = new Set();
  Object.keys(rankData.players||{}).forEach(k=>nums.add(String(k)));
  Object.keys(money.balances||{}).forEach(k=>nums.add(String(k)));
  Object.keys(pkeys||{}).forEach(k=>nums.add(String(k)));
  roomNums.forEach(k=>nums.add(k));
  const arr = [...nums];

  const cntEl = document.getElementById('spieler-count');
  if (cntEl) cntEl.textContent = arr.length + ' Spieler · ' + roomNums.size + ' im Raum';
  if(!arr.length){ host.innerHTML = '<div style="font-size:.75rem;color:var(--text3);text-align:center;padding:24px 0">Noch keine Spieler bekannt. Sie erscheinen, sobald sie den Raum betreten (Bot läuft).</div>'; return; }

  const nameOf = n => roomName[n] || (rankData.players?.[n]?.name) || (money.balances?.[n]?.name) || (pkeys?.[n]?.name) || ('#'+n);
  // Sortierung: im Raum zuerst, dann nach Name
  arr.sort((a,b)=>{
    const ra=roomNums.has(a), rb=roomNums.has(b);
    if (ra!==rb) return ra?-1:1;
    return nameOf(a).localeCompare(nameOf(b));
  });

  // Medaillen-Stufen unterscheiden sich nicht mehr über die Emoji-Farbe,
  // sondern über ein Medaillen-Icon plus Textlabel und einen Farbrand je Stufe.
  const KEY_TIER = { Bronze:'#b08d57', Silver:'#b9bcc2', Gold:'#d9b44a' };
  const keyBadge = (on,lbl)=>{
    const c = KEY_TIER[lbl] || '#b9bcc2';
    const ico = typeof bcIcon==='function' ? bcIcon('medal',11) : '';
    return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:.62rem;padding:2px 7px;border-radius:5px;border:1px solid ${on?c:'rgba(255,255,255,0.08)'};background:${on?c+'1f':'transparent'};color:${on?c:'var(--text3)'}">${ico}${lbl}${on?' ✓':''}</span>`;
  };

  let lastInRoom = null;
  host.innerHTML = arr.map(n=>{
    const inRoom = roomNums.has(n);
    // Trenner zwischen "im Raum" und Rest
    let sep = '';
    if (lastInRoom===true && inRoom===false) sep = '<div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin:10px 2px 6px">Nicht im Raum</div>';
    if (lastInRoom===null && inRoom===true) sep = '<div style="font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:var(--green);margin:0 2px 6px">Aktuell im Raum</div>';
    lastInRoom = inRoom;
    const nm = nameOf(n);
    const rp = rankData.players?.[n];
    const rdef = rp?.rankId ? defById[rp.rankId] : null;
    const rankStr = rdef ? `${escHtml((rdef.icon||'')+' '+rdef.name)}${rdef.group?` <span style="color:var(--text3)">[${escHtml(rdef.group)}]</span>`:''}` : '<span style="color:var(--text3)">– kein Rang –</span>';
    const bal = money.balances?.[n]?.balance ?? 0;
    const pk = pkeys?.[n]||{};
    const dot = inRoom ? '<span title="im Raum" style="color:var(--green);font-size:.7rem">●</span> ' : '';
    return sep + `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:${inRoom?'rgba(52,211,153,0.06)':'rgba(255,255,255,0.03)'};border:1px solid ${inRoom?'rgba(52,211,153,0.22)':'rgba(255,255,255,0.07)'};border-radius:10px;padding:10px 14px;margin-bottom:8px">
      <span style="font-size:.85rem;font-weight:700;color:var(--text1);min-width:150px">${dot}${escHtml(nm)} <span style="font-size:.66rem;color:var(--text3);font-weight:400">#${escHtml(n)}</span></span>
      <span style="font-size:.72rem;color:var(--text2)">🏆 ${rankStr}</span>
      <span style="font-size:.72rem;color:var(--text2)">💰 ${bal} ${escHtml(cur)}</span>
      <span style="display:flex;gap:5px;margin-left:auto">${keyBadge(!!pk.bronze,'Bronze')}${keyBadge(!!pk.silver,'Silver')}${keyBadge(!!pk.gold,'Gold')}</span>
    </div>`;
  }).join('');
}

// ── Variablen-Tab: Bot-Variablen pro Spieler ansehen + bearbeiten ──
let _variablenTimer = null;
function _startVariablenTimer(){ _stopVariablenTimer(); _variablenTimer = setInterval(()=>{ if(typeof _spielerRefreshRequest==='function') _spielerRefreshRequest(); renderVariablenTab(); }, 10000); }
function _stopVariablenTimer(){ if(_variablenTimer){ clearInterval(_variablenTimer); _variablenTimer=null; } }

// Wert an alle laufenden Bots schicken (Live-Übernahme)
function _varPushToBots(num,name,val){
  try{
    if(typeof _connected==='undefined' || !_connected || typeof bcSend!=='function') return;
    (typeof _bots!=='undefined'?_bots:[]).filter(b=>b.laufend).forEach(b=>{
      const sid=b.id.replace(/\W/g,'_');
      bcSend({type:'EXEC', code:"window['_BCBot_"+sid+"']&&window['_BCBot_"+sid+"'].setVar("+JSON.stringify(num)+","+JSON.stringify(name)+","+JSON.stringify(val)+")"});
    });
  }catch(e){}
}
function _varSet(num,name,raw){
  name=String(name).trim(); if(!name) return;
  let val=raw; const s=String(raw).trim();
  if(s!=='' && /^-?\d+(\.\d+)?$/.test(s)) val=Number(s);
  if(typeof _botVarApply==='function') _botVarApply(num,name,val);
  _varPushToBots(num,name,val);
}
function _varAdd(num){
  const nameEl=document.getElementById('varadd-name-'+num), valEl=document.getElementById('varadd-val-'+num);
  if(!nameEl) return;
  const nm=(nameEl.value||'').trim(); if(!nm){ if(typeof showStatus==='function')showStatus('❌ Variablenname fehlt','error'); return; }
  _varSet(num,nm,valEl?valEl.value:'');
  renderVariablenTab();
}
function _varDelete(num,name){
  const k=String(num);
  if(typeof _botVars!=='undefined' && _botVars[k]){ delete _botVars[k][name]; if(typeof _saveBotVars==='function') _saveBotVars(); }
  _varPushToBots(num,name,'');
  renderVariablenTab();
}
function renderVariablenTab(){
  const host=document.getElementById('variablen-list'); if(!host) return;
  const bv=(typeof _botVars!=='undefined'&&_botVars)?_botVars:{};
  const rankData=(typeof _rankData!=='undefined'&&_rankData)?_rankData:{players:{}};
  const money=(typeof _money!=='undefined'&&_money)?_money:{balances:{}};
  const roomList=(typeof _spielerRoomMembers!=='undefined')?_spielerRoomMembers:[];
  const roomNums=new Set(roomList.map(m=>m.num));
  const roomName={}; roomList.forEach(m=>roomName[m.num]=m.name);
  const nums=new Set();
  Object.keys(bv).forEach(k=>nums.add(String(k)));
  roomNums.forEach(k=>nums.add(k));
  const arr=[...nums];
  const cntEl=document.getElementById('variablen-count'); if(cntEl) cntEl.textContent=arr.length+' Spieler · '+roomNums.size+' im Raum';
  if(!arr.length){ host.innerHTML='<div style="font-size:.75rem;color:var(--text3);text-align:center;padding:24px 0">Noch keine Variablen. Sie entstehen durch Trigger-Aktionen (z.B. Variable +1) oder kannst du hier pro Spieler anlegen.</div>'; return; }
  const nameOf=n=>roomName[n]||(rankData.players?.[n]?.name)||(money.balances?.[n]?.name)||('#'+n);
  arr.sort((a,b)=>{ const ra=roomNums.has(a),rb=roomNums.has(b); if(ra!==rb)return ra?-1:1; return nameOf(a).localeCompare(nameOf(b)); });
  host.innerHTML=arr.map(n=>{
    const inRoom=roomNums.has(n);
    const vars=bv[n]||{};
    const keys=Object.keys(vars).sort();
    const rows=keys.map(k=>{
      // Frueher wurden Anfuehrungszeichen aus dem Namen gestrichen, damit das
      // JS-Literal haelt – dann trafen _varSet/_varDelete aber einen anderen
      // Schluessel als den angezeigten. Richtig escapen statt verstuemmeln.
      const ek=escJsAttr(k);
      const v=vars[k];
      if(k==='letzterBesuch'){
        const disp=v?new Date(v).toLocaleString('de-DE'):'';
        return '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:.7rem;color:var(--text3);min-width:120px">'+escHtml(k)+'</span><span style="font-size:.7rem;color:var(--text3)">'+escHtml(disp)+'</span></div>';
      }
      return '<div style="display:flex;align-items:center;gap:6px">'
        +'<span style="font-size:.7rem;color:var(--text2);min-width:120px">'+escHtml(k)+'</span>'
        +'<input class="cf" style="width:90px;font-size:.7rem" value="'+escHtml(String(v??''))+'" onchange="_varSet(\''+n+'\',\''+ek+'\',this.value)">'
        +'<button onclick="_varDelete(\''+n+'\',\''+ek+'\')" title="Variable löschen" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.72rem">✕</button>'
        +'</div>';
    }).join('');
    return '<div style="background:'+(inRoom?'rgba(52,211,153,0.06)':'rgba(255,255,255,0.03)')+';border:1px solid '+(inRoom?'rgba(52,211,153,0.22)':'rgba(255,255,255,0.07)')+';border-radius:10px;padding:10px 14px;margin-bottom:8px">'
      +'<div style="font-size:.82rem;font-weight:700;color:var(--text1);margin-bottom:6px">'+(inRoom?'<span style="color:var(--green)">●</span> ':'')+escHtml(nameOf(n))+' <span style="font-size:.66rem;color:var(--text3);font-weight:400">#'+escHtml(n)+'</span></div>'
      +'<div style="display:flex;flex-direction:column;gap:4px">'+(rows||'<span style="font-size:.66rem;color:var(--text3)">– keine Variablen –</span>')+'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:8px">'
        +'<input id="varadd-name-'+escHtml(n)+'" class="cf" style="width:120px;font-size:.66rem" placeholder="neue Variable">'
        +'<input id="varadd-val-'+escHtml(n)+'" class="cf" style="width:80px;font-size:.66rem" placeholder="Wert">'
        +'<button onclick="_varAdd(\''+n+'\')" style="font-size:.64rem;padding:3px 8px;background:var(--pd,#3a2a6a);border:none;color:var(--pl,#cbb6ff);border-radius:5px;cursor:pointer">+ setzen</button>'
      +'</div>'
    +'</div>';
  }).join('');
}

function _btTrigSummary(bot, t) {
  const conds = t.bedingungen || [];
  const acts  = t.aktionen || [];
  const condStr = conds.length
    ? '<b style="color:var(--purple)">WENN</b> ' + conds.map((c,i)=>(i>0?'<i style="opacity:.7">'+_btLogikWort(c.logik)+'</i> ':'')+_btCondPhrase(bot,c)).join(' ')
    : '<span style="color:#e8a020">⚠️ keine Bedingung – feuert nie</span>';
  const actStr = acts.length
    ? '<b style="color:var(--purple)">→</b> ' + acts.map(a=>_btActPhrase(bot,a)).join(', ')
    : '<span style="color:#e8a020">→ keine Aktion</span>';
  return condStr + ' ' + actStr;
}

function renderTrigCard(bot, t, i) {
  const condN = (t.bedingungen||[]).length;
  const actN  = (t.aktionen||[]).length;
  const total = bot.triggers.length;
  const wdh   = t.wiederholung ?? 'immer';
  const wdh_lbl = wdh==='einmalig'?'1x':wdh==='n_mal'?(t.maxMal??2)+'x':'∞';
  const wdh_color = wdh==='immer'?'var(--text3)':'var(--pl)';
  return `<div class="trig-card ${t.aktiv?'trig-on':''}" id="tc-${t.id}">
    <div class="trig-head" onclick="trigToggleBody('${t.id}')">
      <span class="trig-order-num">${i+1}</span>
      <span style="display:flex;flex-direction:column;gap:1px;margin-right:2px">
        <button class="order-btn" onclick="event.stopPropagation();trigMoveUp('${t.id}')" ${i===0?'disabled':''} title="Nach oben">▲</button>
        <button class="order-btn" onclick="event.stopPropagation();trigMoveDown('${t.id}')" ${i===total-1?'disabled':''} title="Nach unten">▼</button>
      </span>
      <input type="checkbox" ${t.aktiv?'checked':''} onclick="event.stopPropagation();trigField('${t.id}','aktiv',this.checked)" style="accent-color:var(--purple)">
      <span style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0">
        <span class="trig-label" id="tlabel-${t.id}">${escHtml(t.name||'Trigger')}</span>
        <span class="trig-summary" title="Klartext-Zusammenfassung" style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${_btTrigSummary(bot,t)}</span>
      </span>
      <span class="trig-meta" style="flex-shrink:0">${condN} Bed. · ${actN} Akt. · <span style="color:${wdh_color}">${wdh_lbl}</span></span>
      <button onclick="event.stopPropagation();trigDelete('${t.id}')" class="rm-btn" title="Trigger löschen">✕</button>
    </div>
    <div class="trig-body" id="tb-${t.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--text3)">Name:</label>
        <input class="cf cf-w160" value="${escHtml(t.name||'')}" oninput="trigField('${t.id}','name',this.value)" placeholder="Trigger-Name">
        <label style="font-size:.65rem;color:var(--text3)">Delay:</label>
        <input class="cf cf-w80" type="number" value="${t.delay??0}" oninput="trigField('${t.id}','delay',+this.value)"> ms
        <label style="font-size:.65rem;color:var(--text3)">🔁 Wie oft?</label>
        <select class="cf" style="width:190px" onchange="trigField('${t.id}','wiederholung',this.value);trigRerender('${t.id}')">
          <option value="immer"      ${wdh==='immer'?'selected':''}>∞ So oft wie es passt</option>
          <option value="einmalig"   ${wdh==='einmalig'?'selected':''}>1× Nur ein einziges Mal</option>
          <option value="n_mal"      ${wdh==='n_mal'?'selected':''}>N× Höchstens N-mal</option>
          <option value="taeglich"   ${wdh==='taeglich'?'selected':''}>📅 Einmal pro Tag je Person</option>
          <option value="pro_besuch" ${wdh==='pro_besuch'?'selected':''}>🚪 Einmal pro Raumbesuch je Person</option>
        </select>
        ${wdh==='n_mal'?`<input class="cf cf-w80" type="number" min="1" value="${t.maxMal??2}" oninput="trigField('${t.id}','maxMal',+this.value)" title="Wie oft höchstens">× höchstens`:''}
        ${wdh==='taeglich'?`<span style="font-size:.6rem;color:var(--text3)" title="Zählt ab Mitternacht neu – nach der Uhr deines Rechners">ⓘ zählt ab Mitternacht neu</span>`:''}
        ${wdh==='pro_besuch'?`<span style="font-size:.6rem;color:var(--text3)" title="Sobald die Person den Raum verlässt und wiederkommt, geht es von vorn los">ⓘ neu ab dem nächsten Betreten</span>`:''}
        <label style="font-size:.65rem;color:var(--text3);margin-left:8px" title="Mindestabstand zwischen zwei Auslösungen für dieselbe Person (0 = keine Pause)">⏳ Pause je Person:</label>
        <input class="cf cf-w80" type="number" min="0" value="${t.cooldownSek??0}" oninput="trigField('${t.id}','cooldownSek',+this.value)" title="Sekunden – gilt für jede Person einzeln"> s
        <label style="font-size:.65rem;color:var(--text3)" title="Mindestabstand insgesamt, egal wer auslöst (0 = keine Pause)">⏳ Pause insgesamt:</label>
        <input class="cf cf-w80" type="number" min="0" value="${t.cooldownGlobalSek??0}" oninput="trigField('${t.id}','cooldownGlobalSek',+this.value)" title="Sekunden – gilt für alle zusammen"> s
        <label style="font-size:.65rem;color:var(--text3);margin-left:8px" title="Passen mehrere Trigger auf dieselbe Nachricht, kommt der mit der höheren Zahl zuerst dran. Gleiche Zahl = Reihenfolge wie in der Liste.">⬆️ Vorrang:</label>
        <input class="cf cf-w80" type="number" value="${t.prioritaet??0}" oninput="trigField('${t.id}','prioritaet',+this.value);renderBotEditor()" title="Höhere Zahl kommt zuerst dran">
        <label style="font-size:.65rem;color:var(--text3);display:flex;align-items:center;gap:4px;cursor:pointer" title="Wenn dieser Trigger auslöst, werden für dieselbe Nachricht keine weiteren Trigger mehr geprüft">
          <input type="checkbox" ${t.stopptWeitere?'checked':''} onchange="trigField('${t.id}','stopptWeitere',this.checked)" style="accent-color:var(--purple)">
          <span>🛑 danach keine weiteren</span>
        </label>
        <label style="font-size:.65rem;color:var(--text3);margin-left:8px">🔑 Als Vorbedingung:</label>
        <select class="cf" style="width:170px" title="Wie zählt dieser Trigger als Vorbedingung für andere Trigger?" onchange="trigField('${t.id}','charSpec',this.value==='true');trigRerender('${t.id}')">
          <option value="false" ${!t.charSpec?'selected':''}>🌐 Global – einmal gilt für alle</option>
          <option value="true"  ${t.charSpec?'selected':''}>👤 Pro Spieler – jeder selbst</option>
        </select>
        ${t.charSpec?`<label style="font-size:.65rem;color:var(--text3);display:flex;align-items:center;gap:4px;cursor:pointer;margin-left:4px" title="Wenn aktiviert: Beim Verlassen des Raums wird der State zurückgesetzt – Rejoin-Vortrigger greifen dann nicht mehr">
          <input type="checkbox" ${t.resetOnLeave?'checked':''} onchange="trigField('${t.id}','resetOnLeave',this.checked)" style="accent-color:var(--purple)">
          <span>↩️ Reset bei Verlassen</span>
        </label>`:''}
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;padding:7px 10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);border-radius:8px">
        <span style="font-size:.65rem;font-weight:700;color:var(--purple)">🎯 Auslöser-Filter</span>
        <label style="font-size:.65rem;color:var(--text3)">Wer darf feuern?</label>
        <select class="cf" style="width:210px" onchange="trigField('${t.id}','von',this.value);trigRerender('${t.id}')">
          <option value="alle"      ${(!t.von||t.von==='alle')?'selected':''}>👥 Jeder</option>
          <option value="nicht_bot" ${t.von==='nicht_bot'?'selected':''}>👥 Jeder außer dem Bot selbst</option>
          <option value="bot"       ${t.von==='bot'?'selected':''}>🤖 Nur der Bot selbst</option>
          <option value="whitelist" ${t.von==='whitelist'?'selected':''}>✅ Nur diese Personen</option>
          <option value="blacklist" ${t.von==='blacklist'?'selected':''}>🚫 Alle außer diesen Personen</option>
          <option value="rang"      ${t.von==='rang'?'selected':''}>🏆 Nur ab einem bestimmten Rang</option>
        </select>
        ${(t.von==='whitelist'||t.von==='blacklist')?_personenFeld(t.id,'vonNummern',t.vonNummern):''}
        ${(t.von==='rang')?`<select class="cf" style="width:200px" onchange="trigField('${t.id}','vonRangId',this.value)">
          <option value="">– Rang wählen –</option>
          ${_quelleRaenge().map(r=>`<option value="${escHtml(r[0])}" ${t.vonRangId===r[0]?'selected':''}>${escHtml(r[1])}</option>`).join('')}
        </select><span style="font-size:.6rem;color:var(--text3)" title="Gilt für diesen Rang und alle höheren">ⓘ ab dieser Stufe aufwärts</span>`:''}
      </div>

      <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
        <button onclick="trigProbe('${t.id}')" title="Zeigt für jede Person im Raum, welche Bedingung zutrifft – ohne etwas auszuführen"
          style="font-size:.66rem;padding:4px 11px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.35);color:#34d399;border-radius:6px;cursor:pointer">🧪 Prüfen</button>
        <span style="font-size:.6rem;color:var(--text3)">Probelauf gegen die Personen im Raum – führt nichts aus</span>
      </div>
      <div id="probe-${t.id}" style="display:none;margin-bottom:10px;padding:8px 11px;background:rgba(255,255,255,0.03);border:1px solid var(--border2);border-radius:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:.64rem;font-weight:700;color:var(--text2)">🧪 Probelauf</span>
          <span style="flex:1"></span>
          <button onclick="trigProbeSchliessen('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.7rem">✕</button>
        </div>
        <div id="probe-inhalt-${t.id}"></div>
      </div>

      <div class="te-section">
        <div class="te-section-title">🔎 Bedingungen
          <button onclick="trigAddCond('${t.id}','wort')">+ Wort/Chat</button>
          <button onclick="trigAddCond('${t.id}','zone_rect')">+ Zone Bereich</button>
          <button onclick="trigAddCond('${t.id}','zone')">+ Zone Punkt</button>
          <button onclick="trigAddCond('${t.id}','item_traegt')">+ Item trägt</button>
          <button onclick="trigAddCond('${t.id}','item_traegt_nicht')">+ Item trägt NICHT</button>
          <button onclick="trigAddCond('${t.id}','trigger_war')">+ Vortrigger</button>
          <button onclick="trigAddCond('${t.id}','player_betritt')">+ Spieler betritt</button>
          <button onclick="trigAddCond('${t.id}','rang')">🏆 Rang</button>
          <button onclick="trigAddCond('${t.id}','shop_kauf')" title="Wird ausgelöst wenn ein Spieler einen Shop-Artikel kauft">🛒 Shop-Kauf</button>
          <button onclick="trigAddCond('${t.id}','ev_timer')" title="Einmalig nach X Sekunden automatisch feuern">⏱ Timer</button>
          <button onclick="trigAddCond('${t.id}','ev_interval')" title="Wiederholt alle X–Y Sekunden feuern">🔁 Intervall</button>
          <button onclick="trigAddCond('${t.id}','variable')" title="Prüft eine Spieler-Variable/Punkte (z.B. punkte ≥ 100)">🔢 Variable</button>
          <button onclick="trigAddCond('${t.id}','zufall')" title="X% Wahrscheinlichkeit, dass der Trigger zutrifft">🎲 Zufall</button>
          <button onclick="trigAddCond('${t.id}','erregung')" title="Prüft die Erregung (z.B. ≥ 99 % → Edging)">💗 Erregung</button>
          <button onclick="trigAddGruppe('${t.id}')" title="Fasst mehrere Bedingungen zu einer Klammer zusammen, z.B. (sagt hallo ODER sagt hi)"
            style="border-color:#fbbf2455;color:#fbbf24">( ) Klammer</button>
          ${_condKnoepfe(t.id)}
        </div>
        <div id="conds-${t.id}">${(t.bedingungen||[]).map((c,ci)=>renderCond(bot,t.id,c,ci)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">🔙 Fallback <small style="font-weight:normal;text-transform:none;letter-spacing:0">(läuft wenn eine Aktion ❌ Trigger ungültig auslöst – Trigger zählt dann nicht)</small></div>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="cf" style="width:140px" onchange="trigField('${t.id}','fallbackTyp',this.value);trigRerender('${t.id}')">
            <option value="nichts" ${(!t.fallbackTyp||t.fallbackTyp==='nichts')?'selected':''}>Nichts (still)</option>
            <option value="chat"   ${t.fallbackTyp==='chat'?'selected':''}>💬 Chat-Nachricht</option>
            <option value="emote"  ${t.fallbackTyp==='emote'?'selected':''}>✨ Emote</option>
          </select>
          ${t.fallbackTyp&&t.fallbackTyp!=='nichts'?`<input class="cf cf-flex" value="${escHtml(t.fallbackText||'')}" oninput="trigField('${t.id}','fallbackText',this.value)" placeholder="Nachricht… {name} {wort} {x} {y}">`:''} 
        </div>
      </div>

      <!-- If/Else Toggle -->
      <div class="ifelse-toggle-row">
        <label class="ifelse-toggle-lbl">
          <input type="checkbox" ${t.ifElse?'checked':''} onchange="trigSetIfElse('${t.id}',this.checked)">
          🔀 If/Else-Logik aktivieren
        </label>
        <span class="ifelse-hint">Auslöser-Bedingungen feuern den Trigger – IF-Bedingungen entscheiden DANN vs. SONST</span>
      </div>

      ${t.ifElse ? `
      <!-- If/Else blocks -->
      <div class="ifelse-wrapper">
        <div class="ifelse-if-hdr">
          🔀 IF – diese Bedingungen entscheiden DANN vs. SONST
        </div>
        <div class="ifelse-if-body">
          <div style="font-size:.61rem;color:var(--text3);margin-bottom:7px">
            Nur wenn die <b style="color:var(--text2)">Auslöser-Bedingungen</b> oben bereits zugetroffen haben, wird hier geprüft:<br>
            ✅ <b style="color:#34d399">DANN</b> wenn alle IF-Bedingungen zutreffen &nbsp;·&nbsp; ❌ <b style="color:#fb7185">SONST</b> wenn eine nicht zutrifft.
            Ohne IF-Bedingungen läuft immer DANN.
          </div>
          <div id="ifconds-${t.id}">${(t.ifBedingungen||[]).map((c,ci)=>renderIfCond(bot,t.id,c,ci)).join('')}</div>
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:2px">
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','wort')">+ Wort/Chat</button>
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','zone_rect')">+ Zone</button>
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','item_traegt')">+ Item trägt</button>
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','item_traegt_nicht')">+ Item trägt NICHT</button>
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','trigger_war')">+ Vortrigger</button>
            <button class="ifelse-if-add-btn" onclick="trigAddIfCond('${t.id}','rang')">🏆 Rang</button>
          </div>
        </div>
        <div class="ifelse-dann-hdr">
          ✅ DANN – IF-Bedingungen treffen zu
        </div>
        <div class="ifelse-dann-body">
          <div id="acts-${t.id}">${(t.aktionen||[]).map((a,ai)=>renderAct(t.id,a,ai,'dann')).join('')}</div>
          <button class="ifelse-add-btn" onclick="trigAddAct('${t.id}','dann')">+ DANN-Aktion hinzufügen</button>
        </div>
        <div class="ifelse-sonst-hdr">
          ❌ SONST – IF-Bedingungen treffen NICHT zu
        </div>
        <div class="ifelse-sonst-body">
          <div id="acts-sonst-${t.id}">${(t.aktionen_sonst||[]).map((a,ai)=>renderAct(t.id,a,ai,'sonst')).join('')}</div>
          <button class="ifelse-add-btn sonst" onclick="trigAddAct('${t.id}','sonst')">+ SONST-Aktion hinzufügen</button>
        </div>
      </div>
      ` : `
      <div class="te-section">
        <div class="te-section-title">⚡ Aktionen
          <button onclick="trigAddAct('${t.id}')">+ Aktion</button>
        </div>
        <div id="acts-${t.id}">${(t.aktionen||[]).map((a,ai)=>renderAct(t.id,a,ai)).join('')}</div>
      </div>
      `}
    </div>
  </div>`;
}

// ── Conditions ────────────────────────────────────────────────
/* -- Klammer-Gruppen ------------------------------------------------------
   Eine Gruppe fasst Bedingungen zu einer Klammer zusammen:
       (sagt "hallo" ODER sagt "hi") UND ist gefesselt
   Sie ist selbst eine Bedingung mit typ:'gruppe', steht also ganz normal in
   der Liste. Alte Trigger ohne Gruppen bleiben unveraendert - es gibt keine
   Umwandlung.                                                              */
function trigAddGruppe(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  t.bedingungen = t.bedingungen ?? [];
  t.bedingungen.push({ typ:'gruppe', verknuepfung:'oder', kinder:[] });
  _normLogik(t.bedingungen); _saveBots(); condRerender(tid);
}

/* Bedingung in die Gruppe direkt darueber verschieben */
function condInGruppe(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const liste = t.bedingungen || [];
  let gi = -1;
  for (let i = ci - 1; i >= 0; i--) if (liste[i]?.typ === 'gruppe') { gi = i; break; }
  if (gi < 0) { showStatus('Keine Gruppe darüber – erst eine Gruppe anlegen', 'info'); return; }
  const [c] = liste.splice(ci, 1);
  (liste[gi].kinder = liste[gi].kinder || []).push(c);
  _normLogik(liste); _saveBots(); condRerender(tid);
}

/* Bedingung aus einer Gruppe wieder herausholen */
function condAusGruppe(tid, gi, ki) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const g = (t.bedingungen || [])[gi]; if (!g || g.typ !== 'gruppe') return;
  const [c] = (g.kinder || []).splice(ki, 1);
  if (c) t.bedingungen.splice(gi + 1, 0, c);
  _normLogik(t.bedingungen); _saveBots(); condRerender(tid);
}

function gruppeFeld(tid, gi, wert) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const g = (t.bedingungen || [])[gi]; if (!g) return;
  g.verknuepfung = wert; _saveBots(); condRerender(tid);
}

function gruppeAddCond(tid, gi, typ) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const g = (t.bedingungen || [])[gi]; if (!g) return;
  const vorgabe = COND_DEFS[typ] ? Object.assign({ typ }, COND_DEFS[typ].vorgabe) : { typ };
  (g.kinder = g.kinder || []).push(vorgabe);
  _saveBots(); condRerender(tid);
}

function gruppeCondRemove(tid, gi, ki) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const g = (t.bedingungen || [])[gi]; if (!g) return;
  (g.kinder || []).splice(ki, 1);
  _saveBots(); condRerender(tid);
}

/* Darstellung einer Gruppe: eingerueckter Kasten mit eigenem Rand. */
function _renderGruppe(bot, tid, c, ci) {
  const kinder = c.kinder || [];
  const oder = (c.verknuepfung || 'und') === 'oder';
  const farbe = oder ? '#fbbf24' : '#8b5cf6';
  const kindZeilen = kinder.map((k, ki) => {
    const def = COND_DEFS[k.typ];
    // Zielbeschreibung statt Umschreiben der fertigen Ausgabe
    const inner = def
      ? `<span style="font-size:.68rem;color:var(--text2)">${escHtml(def.label)}</span> `
        + _condFelder(tid, ci, k, def, { fn:'gruppeKindFeld', args:[tid, ci, ki] })
      : `<span style="font-size:.68rem;color:var(--text2)">${escHtml(_btCondPhrase(bot, k))}</span>`;
    return `<div style="display:flex;align-items:center;gap:5px;padding:3px 0">`
      + `<span style="font-size:.6rem;color:${farbe};font-weight:700;min-width:26px">`
      + (ki === 0 ? '' : (oder ? 'ODER' : 'UND')) + `</span>`
      + `<span style="font-size:.7rem">${COND_DEFS[k.typ]?.icon || '❓'}</span>`
      + `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;flex:1">${inner}</div>`
      + `<button onclick="condAusGruppe('${tid}',${ci},${ki})" title="Aus der Klammer herausnehmen"`
      + ` style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.7rem">⤴</button>`
      + `<button onclick="gruppeCondRemove('${tid}',${ci},${ki})" title="Löschen"`
      + ` style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem">✕</button>`
      + `</div>`;
  }).join('');

  return `<div style="border:1px solid ${farbe}55;border-left:3px solid ${farbe};border-radius:7px;`
    + `padding:6px 9px;margin:3px 0 3px 12px;background:${farbe}0d">`
    + `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">`
    + `<span style="font-size:.62rem;font-weight:700;color:${farbe}">( Klammer )</span>`
    + `<select class="cf" style="width:150px;font-size:.66rem" onchange="gruppeFeld('${tid}',${ci},this.value)">`
    + `<option value="oder" ${oder?'selected':''}>eine davon genügt</option>`
    + `<option value="und" ${!oder?'selected':''}>alle davon nötig</option>`
    + `</select>`
    + `<select class="cf" style="width:150px;font-size:.66rem" onchange="if(this.value){gruppeAddCond('${tid}',${ci},this.value);this.value='';}">`
    + `<option value="">+ Bedingung hinzufügen</option>`
    + Object.entries(COND_DEFS).map(([typ,d])=>`<option value="${typ}">${d.icon} ${escHtml(d.label)}</option>`).join('')
    + `<option value="wort">💬 Wort/Chat</option>`
    + `</select>`
    + `<span style="flex:1"></span>`
    + `<button onclick="condRemove('${tid}',${ci})" title="Ganze Klammer löschen"`
    + ` style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem">✕</button>`
    + `</div>`
    + (kindZeilen || `<div style="font-size:.64rem;color:var(--text3);padding:3px 0">noch leer – oben eine Bedingung hinzufügen</div>`)
    + `</div>`;
}

/* Feldaenderung an einer Bedingung INNERHALB einer Gruppe */
function gruppeKindFeld(tid, gi, ki, key, wert) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const g = (t.bedingungen || [])[gi]; if (!g) return;
  const k = (g.kinder || [])[ki]; if (!k) return;
  k[key] = wert; _saveBots();
}

/* -- Probelauf ------------------------------------------------------------
   Zeigt fuer jede Person im Raum, welche Bedingung zutrifft und welche nicht,
   in ganzen Saetzen. Die Auswertung selbst macht der laufende Bot (siehe
   _probe in bot-engine.js) - hier wird nur dargestellt. Die Saetze kommen aus
   _btCondPhrase, also aus derselben Quelle wie die Trigger-Zusammenfassung. */

const _probeErgebnis = {};   // trigId -> Antwort des Bots

function trigProbe(tid) {
  const b = _selBot();
  if (!b) return;
  const feld = document.getElementById('probe-' + tid);
  if (feld) feld.style.display = 'block';
  if (!b.laufend) {
    _probeZeige(tid, { fehler: 'Der Bot läuft gerade nicht. Klicke oben auf ▶️ Starten – '
      + 'nur ein laufender Bot kann im Spiel nachsehen, wer gerade wo steht und was er trägt.' });
    return;
  }
  if (!_connected) { _probeZeige(tid, { fehler: 'Keine Verbindung zu Bondage Club.' }); return; }
  _probeZeige(tid, { laeuft: true });
  const safeId = b.id.replace(/\W/g, '_');
  bcSend({ type:'EXEC', code:
    `window['_BCBot_${safeId}']&&window['_BCBot_${safeId}'].probe(${JSON.stringify(tid)});` });
}

/* Antwort des Bots (kommt ueber die Bruecke in items.js an) */
function _probeEmpfangen(data) {
  _probeErgebnis[data.trigId] = data;
  _probeZeige(data.trigId, data);
}

function trigProbeSchliessen(tid) {
  const feld = document.getElementById('probe-' + tid);
  if (feld) feld.style.display = 'none';
}

function trigFeuereJetzt(tid, num, name) {
  const b = _selBot(); if (!b) return;
  if (!confirm('Trigger „' + (b.triggers.find(t=>t.id===tid)?.name || tid) + '" jetzt wirklich für '
      + name + ' auslösen?\n\nDas wirkt im Spiel – Nachrichten werden gesendet, Items angelegt.\n'
      + 'Wiederholungsgrenze und Cooldown werden dabei übergangen.')) return;
  const safeId = b.id.replace(/\W/g, '_');
  bcSend({ type:'EXEC', code:
    `window['_BCBot_${safeId}']&&window['_BCBot_${safeId}'].feuereJetzt(${JSON.stringify(tid)},${Number(num)});` });
  showStatus('▶ Trigger für ' + name + ' ausgelöst', 'success');
}

const _VON_TEXT = {
  alle:'jeder darf auslösen', nicht_bot:'jeder außer dem Bot', bot:'nur der Bot selbst',
  whitelist:'nur ausgewählte Personen', blacklist:'alle außer den gesperrten Personen',
  rang:'nur ab einem bestimmten Rang',
};

function _probeZeige(tid, d) {
  const el = document.getElementById('probe-inhalt-' + tid);
  if (!el) return;
  const rahmen = inhalt => `<div style="font-size:.7rem;line-height:1.55">${inhalt}</div>`;

  if (d.laeuft)  { el.innerHTML = rahmen('<span style="color:var(--text3)">⏳ Der Bot schaut nach…</span>'); return; }
  if (d.fehler)  { el.innerHTML = rahmen(`<span style="color:var(--yellow)">⚠️ ${escHtml(d.fehler)}</span>`); return; }

  const b = _selBot();
  const trig = b?.triggers.find(t => t.id === tid);
  const beds = trig?.bedingungen || [];

  if (!d.personen || !d.personen.length) {
    el.innerHTML = rahmen('<span style="color:var(--text3)">Niemand im Raum.</span>'); return;
  }

  const bloecke = d.personen.map(pn => {
    const kopf = `<div style="font-weight:700;color:var(--text1);margin-top:6px">`
      + `${escHtml(pn.name || ('#'+pn.num))}`
      + `<span style="font-weight:400;color:var(--text3);font-size:.64rem"> #${pn.num}`
      + `${pn.istBot ? ' · der Bot selbst' : ''}</span></div>`;

    let zeilen = '';
    if (!pn.vonOk) {
      zeilen += `<div style="color:var(--red)">✗ darf diesen Trigger nicht auslösen `
        + `<span style="color:var(--text3)">(${escHtml(_VON_TEXT[d.vonModus] || d.vonModus)})</span></div>`;
    }
    zeilen += (pn.bedingungen || []).map(e => {
      const c = beds[e.i];
      const satz = c ? _btCondPhrase(b, c) : ('Bedingung ' + (e.i + 1));
      if (e.hinweis) return `<div style="color:var(--yellow)">⚠️ ${satz} – ${escHtml(e.hinweis)}</div>`;
      return `<div style="color:${e.erfuellt ? 'var(--green)' : 'var(--red)'}">`
        + `${e.erfuellt ? '✓' : '✗'} ${satz}</div>`;
    }).join('');
    if (!beds.length && pn.vonOk)
      zeilen += `<div style="color:var(--text3)">keine Bedingungen – trifft immer zu</div>`;

    if (pn.gesamt) {
      const akt = (pn.aktionen || []).map((a, n) =>
        `<div style="color:var(--text2);margin-left:10px">${n+1}. ${escHtml(_aktLabel(a.typ))}`
        + (a.text ? `: „${escHtml(a.text)}"` : '') + `</div>`).join('')
        || `<div style="color:var(--text3);margin-left:10px">keine Aktionen hinterlegt</div>`;
      zeilen += `<div style="color:var(--green);font-weight:600;margin-top:3px">→ Würde auslösen. Das passiert dann:</div>${akt}`
        + `<button onclick="trigFeuereJetzt('${tid}',${pn.num},${JSON.stringify(pn.name||('#'+pn.num))})"`
        + ` style="margin-top:4px;font-size:.64rem;padding:3px 9px;background:rgba(248,113,113,0.14);`
        + `border:1px solid rgba(248,113,113,0.4);color:#f87171;border-radius:5px;cursor:pointer"`
        + ` title="Führt den Trigger wirklich aus – das wirkt im Spiel">▶ Jetzt wirklich auslösen</button>`;
    } else {
      zeilen += `<div style="color:var(--text3);margin-top:3px">→ Löst nicht aus.</div>`;
    }
    return kopf + zeilen;
  }).join('');

  el.innerHTML = rahmen(bloecke);
}

/* Kurzbezeichnung einer Aktion in Alltagssprache */
function _aktLabel(typ) {
  return ({
    chat:'Nachricht im Chat', whisper:'Flüstern', emote:'Emote',
    item:'Item anlegen', item_entf:'Item entfernen', teleport:'Teleportieren',
    variable:'Variable setzen', rang:'Rang ändern', money:'Guthaben ändern',
    mapkey:'Map-Schlüssel', erregung:'Erregung ändern', szene:'Szene abspielen',
  })[typ] || typ;
}

/* -- Quellen fuer Auswahllisten -----------------------------------------
   Statt Slot-Namen, Schloss-Typen oder Craft-Namen von Hand zu tippen, werden
   sie aus dem angeboten, was das Tool ohnehin kennt. Jede Quelle liefert
   [[wert, anzeigetext], ...] und darf leer sein - dann faellt das Feld auf
   freie Eingabe zurueck, damit man nie feststeckt.                         */

/* Item-Slots aus dem geladenen Item-Katalog. */
function _quelleSlots() {
  try {
    const gruppen = Object.keys(CACHE || {}).sort();
    return gruppen.map(g => [g, g]);
  } catch (e) { return []; }
}

/* Schloss-Typen - dieselbe Liste, die auch der Locks-Tab benutzt. */
function _quelleSchloesser() {
  try {
    return (_APPLY_LOCK_TYPES || []).map(o => [o.v, o.l + '  (' + o.v + ')']);
  } catch (e) { return []; }
}

/* Craft-Namen aus der gescannten Curse-Datenbank, ohne Doppelte. */
function _quelleCrafts() {
  try {
    const namen = new Set();
    for (const e of Object.values(CURSE_DB || {})) {
      const n = e && e.CraftName;
      if (n) namen.add(String(n));
    }
    return [...namen].sort((a, b) => a.localeCompare(b)).map(n => [n, n]);
  } catch (e) { return []; }
}

/* Variablennamen: was der Bot bereits gesetzt hat, plus was in seinen
   eigenen Triggern und Szenen vorkommt. */
function _quelleVariablen() {
  const namen = new Set();
  try {
    for (const eintrag of Object.values(_botVars || {}))
      for (const k of Object.keys(eintrag || {})) if (k !== 'letzterBesuch') namen.add(k);
  } catch (e) {}
  try {
    const b = _selBot();
    const sammle = liste => (liste || []).forEach(x => { if (x && x.varName) namen.add(x.varName); });
    (b?.triggers || []).forEach(t => {
      sammle(t.bedingungen); sammle(t.ifBedingungen); sammle(t.aktionen); sammle(t.aktionen_sonst);
    });
    (b?.szenen || []).forEach(sz => sammle(sz.steps));
    (b?.events || []).forEach(ev => { sammle(ev.bedingungen); sammle(ev.aktionen); });
  } catch (e) {}
  return [...namen].sort((a, b) => a.localeCompare(b)).map(n => [n, n]);
}

/* Eingabefeld fuer eine Personenliste. Statt Nummern zu tippen, waehlt man
   aus den Leuten im Raum. Bereits eingetragene Nummern bleiben immer stehen,
   auch wenn die Person gerade nicht da ist - eine Auswahl darf nichts
   verschlucken. Freie Eingabe bleibt zusaetzlich moeglich.               */
function _personenFeld(tid, feld, werte) {
  const liste = (werte || []).map(Number).filter(n => n > 0);
  const imRaum = _quellePersonen();
  const nameVon = n => {
    const t = imRaum.find(x => x[0] === String(n));
    return t ? t[1].replace(/\s+\(#\d+\)$/, '') : null;
  };
  const chips = liste.map(n => {
    const nm = nameVon(n);
    return `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--bg3);`
      + `border:1px solid var(--border2);border-radius:10px;padding:1px 4px 1px 7px;font-size:.64rem">`
      + escHtml(nm ? nm : '#' + n)
      + (nm ? `<span style="color:var(--text3)">#${n}</span>` : '')
      + `<button onclick="_personEntfernen('${tid}','${feld}',${n})" title="Entfernen"`
      + ` style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;padding:0 2px">✕</button></span>`;
  }).join(' ');
  const offen = imRaum.filter(x => !liste.includes(Number(x[0])));
  const auswahl = offen.length
    ? `<select class="cf" style="width:190px" onchange="_personHinzu('${tid}','${feld}',this.value);this.value=''">`
      + `<option value="">+ Person aus dem Raum</option>`
      + offen.map(x => `<option value="${escHtml(x[0])}">${escHtml(x[1])}</option>`).join('')
      + `</select>`
    : `<span style="font-size:.6rem;color:var(--text3)">niemand sonst im Raum</span>`;
  return `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;flex:1;min-width:200px">`
    + chips + auswahl
    + `<input class="cf" style="width:118px" placeholder="oder Nummer…"`
    + ` onkeydown="if(event.key==='Enter'){_personHinzu('${tid}','${feld}',this.value);this.value='';}"`
    + ` title="Spieler-Nummer eintippen und Enter drücken"></div>`;
}

function _personHinzu(tid, feld, wert) {
  const n = +String(wert).trim();
  if (!n || n <= 0) return;
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  const liste = (t[feld] || []).map(Number);
  if (!liste.includes(n)) liste.push(n);
  t[feld] = liste; _saveBots(); trigRerender(tid);
}
function _personEntfernen(tid, feld, nummer) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x => x.id === tid); if (!t) return;
  t[feld] = (t[feld] || []).map(Number).filter(n => n !== Number(nummer));
  _saveBots(); trigRerender(tid);
}

/* Personen, die gerade im Raum stehen - mit Namen statt nackter Nummern. */
function _quellePersonen() {
  try {
    return (_lastRoomMembers || [])
      .filter(m => m && m.num)
      .map(m => [String(m.num), (m.name || 'Unbekannt') + '  (#' + m.num + ')']);
  } catch (e) { return []; }
}

/* Raenge des Bots, fuer Filter "ab Rang X". */
function _quelleRaenge() {
  try {
    return (_rankData?.defs || []).slice().sort((a,b)=>a.level-b.level)
      .map(r => [r.id, (r.icon||'') + ' ' + r.name + '  (Stufe ' + r.level + ')']);
  } catch (e) { return []; }
}

/* Raumnamen, die beim Scannen schon gesehen wurden. */
function _quelleRaeume() {
  try {
    const namen = new Set();
    for (const m of Object.values(CURSE_SCAN_META || {})) if (m && m.room) namen.add(String(m.room));
    return [...namen].sort((a, b) => a.localeCompare(b)).map(n => [n, n]);
  } catch (e) { return []; }
}

/* -- Bausteinverzeichnis fuer Bedingungen --------------------------------
   Ein neuer Bedingungstyp musste bisher an sechs Stellen eingetragen werden:
   Auswertung, Vorgabewerte, Editor-Zeile, Klartext, Auswahlknopf, Doku. Jede
   vergessene Stelle war ein stiller Fehler. Neue Typen stehen darum nur noch
   hier; renderCond, _btCondPhrase, trigAddCond und die Auswahlleiste lesen
   daraus. Die alten Typen behalten vorerst ihren handgeschriebenen Code und
   wandern nach und nach hierher - kein Big-Bang.

   felder: typ 'select' | 'zahl' | 'text' | 'zeit' | 'datum' | 'tage'        */
const COND_DEFS = {
  gefesselt: { gruppe:'Zustand', label:'Gefesselt', icon:'\u26d3',
    vorgabe:{modus:'ist'}, hinweis:'Erkennt Fesselung \u00fcber die Effekte der getragenen Items',
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','ist'],['nicht','ist NICHT']]}],
    klartext:c=>c.modus==='nicht'?'ist nicht gefesselt':'ist gefesselt' },

  geknebelt: { gruppe:'Zustand', label:'Geknebelt', icon:'\ud83e\udd10',
    vorgabe:{modus:'ist',stufe:'egal'},
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','ist'],['nicht','ist NICHT']]},
            {key:'stufe',typ:'select',breite:132,werte:[['egal','egal wie stark'],['leicht','mind. leicht'],
              ['mittel','mind. mittel'],['schwer','mind. schwer']]}],
    klartext:c=>(c.modus==='nicht'?'ist nicht geknebelt':'ist geknebelt')
      +(c.stufe&&c.stufe!=='egal'?' ('+c.stufe+')':'') },

  blind: { gruppe:'Zustand', label:'Blind', icon:'\ud83d\ude48',
    vorgabe:{modus:'ist'},
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','ist'],['nicht','ist NICHT']]}],
    klartext:c=>c.modus==='nicht'?'sieht etwas':'sieht nichts' },

  bewegung_blockiert: { gruppe:'Zustand', label:'Kann nicht gehen', icon:'\ud83e\uddb5',
    vorgabe:{modus:'ist'}, hinweis:'Festgesetzt, am Boden, angeleint oder eingeschlossen',
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','ist'],['nicht','ist NICHT']]}],
    klartext:c=>c.modus==='nicht'?'kann gehen':'kann nicht gehen' },

  item_gruppe: { gruppe:'Zustand', label:'Item an Slot', icon:'\ud83d\udccd',
    vorgabe:{modus:'ist',gruppe:''},
    hinweis:'Tr\u00e4gt IRGENDETWAS an diesem Slot - anders als "Item tr\u00e4gt", das einen genauen Namen braucht',
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','tr\u00e4gt'],['nicht','tr\u00e4gt NICHT']]},
            {key:'gruppe',typ:'auswahl',breite:170,quelle:_quelleSlots,platzhalter:'– Slot wählen –',
             leerHinweis:'Item-Katalog noch nicht geladen – im Item-Tab auf "Laden" klicken'}],
    klartext:c=>(c.modus==='nicht'?'tr\u00e4gt nichts an ':'tr\u00e4gt etwas an ')+(c.gruppe||'?') },

  craft_getragen: { gruppe:'Zustand', label:'Craft getragen', icon:'\u270f\ufe0f',
    vorgabe:{modus:'ist',craftName:''},
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','tr\u00e4gt'],['nicht','tr\u00e4gt NICHT']]},
            {key:'craftName',typ:'picker',pickerTab:'curse',platzhalter:'kein Craft gewählt',
             hilfe:'Öffnet die Craft-Liste mit Suchfeld – bei tausenden Crafts wäre ein Aufklappmenü unbrauchbar'}],
    klartext:c=>(c.modus==='nicht'?'tr\u00e4gt Craft nicht: ':'tr\u00e4gt Craft: ')+(c.craftName||'?') },

  schloss: { gruppe:'Zustand', label:'Schloss', icon:'\ud83d\udd12',
    vorgabe:{modus:'ist',lockTyp:''}, hinweis:'Leer lassen = irgendein Schloss',
    felder:[{key:'modus',typ:'select',breite:96,werte:[['ist','tr\u00e4gt'],['nicht','tr\u00e4gt NICHT']]},
            {key:'lockTyp',typ:'auswahl',breite:190,quelle:_quelleSchloesser,platzhalter:'– egal welches –'}],
    klartext:c=>(c.modus==='nicht'?'tr\u00e4gt kein Schloss':'tr\u00e4gt Schloss')+(c.lockTyp?' ('+c.lockTyp+')':'') },

  uhrzeit: { gruppe:'Zeit', label:'Uhrzeit', icon:'\ud83d\udd50',
    vorgabe:{von:'20:00',bis:'23:59'}, hinweis:'\u00dcber Mitternacht erlaubt, z.B. 23:00-01:00',
    felder:[{key:'von',typ:'zeit',label:'von'},{key:'bis',typ:'zeit',label:'bis'}],
    klartext:c=>'zwischen '+(c.von||'?')+' und '+(c.bis||'?')+' Uhr' },

  wochentag: { gruppe:'Zeit', label:'Wochentag', icon:'\ud83d\udcc5',
    vorgabe:{tage:[]}, hinweis:'Kein Tag angehakt = an jedem Tag',
    felder:[{key:'tage',typ:'tage'}],
    klartext:c=>{const n=['So','Mo','Di','Mi','Do','Fr','Sa'];
      return (c.tage||[]).length?'an '+(c.tage||[]).map(t=>n[t]).join(', '):'an jedem Tag';} },

  datum: { gruppe:'Zeit', label:'Zeitraum', icon:'\ud83d\uddd3',
    vorgabe:{von:'',bis:''}, hinweis:'Leeres Feld = offen',
    felder:[{key:'von',typ:'datum',label:'ab'},{key:'bis',typ:'datum',label:'bis'}],
    klartext:c=>'im Zeitraum '+(c.von||'\u2026')+' bis '+(c.bis||'\u2026') },

  anzahl_im_raum: { gruppe:'Raum', label:'Personen im Raum', icon:'\ud83d\udc65',
    vorgabe:{op:'min',wert:2},
    felder:[{key:'op',typ:'select',breite:110,werte:[['min','mindestens'],['max','h\u00f6chstens'],['=','genau']]},
            {key:'wert',typ:'zahl',breite:56}],
    klartext:c=>({min:'mindestens',max:'h\u00f6chstens','=':'genau'}[c.op||'min'])+' '+(c.wert??0)+' Personen im Raum' },

  raumname: { gruppe:'Raum', label:'Raumname', icon:'\ud83c\udff7',
    vorgabe:{modus:'ist',wert:''}, hinweis:'Leer lassen = jeder Raum',
    felder:[{key:'modus',typ:'select',breite:100,werte:[['ist','ist genau'],['enthaelt','enth\u00e4lt']]},
            {key:'wert',typ:'auswahl',breite:180,quelle:_quelleRaeume,platzhalter:'– Raum wählen –',
             leerHinweis:'Noch keine Räume gesehen – einmal scannen'}],
    klartext:c=>'Raumname '+(c.modus==='enthaelt'?'enth\u00e4lt ':'ist ')+'\u201e'+(c.wert||'')+'"' },

  variable2: { gruppe:'Fortschritt', label:'Variable vs. Variable', icon:'\u2696\ufe0f',
    vorgabe:{varA:'',op:'==',varB:''}, hinweis:'Vergleicht zwei Variablen desselben Spielers',
    felder:[{key:'varA',typ:'auswahl',breite:130,quelle:_quelleVariablen,platzhalter:'– Variable A –',
             leerHinweis:'Noch keine Variablen bekannt'},
            {key:'op',typ:'select',breite:70,werte:[['==','=='],['!=','!='],['>','>'],['>=','>='],['<','<'],['<=','<=']]},
            {key:'varB',typ:'auswahl',breite:130,quelle:_quelleVariablen,platzhalter:'– Variable B –',
             leerHinweis:'Noch keine Variablen bekannt'}],
    klartext:c=>(c.varA||'?')+' '+(c.op||'==')+' '+(c.varB||'?') },
};

/* Baut die Editor-Felder eines Bausteins aus seiner Beschreibung. */
function _condFelder(tid, ci, c, def, ziel) {
  // ziel beschreibt den Setter: {fn, args}. Ohne Angabe die normale Bedingung.
  ziel = ziel || { fn:'condField', args:[tid, ci] };
  const argStr = ziel.args.map(a => typeof a === 'number' ? a : `'${a}'`).join(',');
  const setz = (k, wert) => `${ziel.fn}(${argStr},'${k}',${wert})`;
  return (def.felder||[]).map(f => {
    const v = c[f.key];
    const br = f.breite ? `style="width:${f.breite}px"` : '';
    const lbl = f.label ? `<span style="font-size:.66rem;color:var(--text3)">${escHtml(f.label)}</span>` : '';
    if (f.typ === 'select')
      return lbl+`<select class="cf" ${br} onchange="${setz(f.key,'this.value')};condRerender('${tid}')">`
        + f.werte.map(w=>`<option value="${escHtml(w[0])}" ${v===w[0]?'selected':''}>${escHtml(w[1])}</option>`).join('')
        + `</select>`;
    if (f.typ === 'picker') {
      // Fuer grosse Bestaende (Crafts, Items, Outfits): kein Aufklappmenue,
      // sondern der vorhandene Auswahl-Dialog mit Suche. Tausende Eintraege
      // in jeder Bedingungskarte machen den Editor sonst unbenutzbar.
      const argsJson = escHtml(JSON.stringify(ziel.args));
      return lbl
        + `<span style="font-size:.68rem;color:var(--text2);min-width:90px">`
        + (v ? `<b>${escHtml(v)}</b>` : `<span style="color:var(--text3)">${escHtml(f.platzhalter||'nichts gewählt')}</span>`)
        + `</span>`
        + `<button onclick="_condPicker('${ziel.fn}','${argsJson}','${f.key}','${f.pickerTab||'item'}','${tid}')"`
        + ` style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer"`
        + ` title="${escHtml(f.hilfe||'Aus der Liste wählen – mit Suchfeld')}">📦 Wählen</button>`
        + (v ? `<button onclick="${setz(f.key, "''")};condRerender('${tid}')" title="Auswahl löschen"`
             + ` style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.7rem">✕</button>` : '');
    }
    if (f.typ === 'auswahl') {
      // Liste aus dem, was das Tool kennt. Ist sie leer (Katalog noch nicht
      // geladen), bleibt die freie Eingabe - sonst koennte man nichts setzen.
      let werte = [];
      try { werte = f.quelle() || []; } catch (e) { werte = []; }
      // Sicherheitsnetz: wird eine Quelle unerwartet gross, kein Aufklappmenue
      // mit tausenden Eintraegen bauen - das bremst den ganzen Editor aus.
      const grenze = f.maxListe || 60;
      if (werte.length > grenze) {
        return lbl + `<input class="cf" ${br||'style="width:170px"'} value="${escHtml(v??'')}"`
          + ` placeholder="${escHtml(f.platzhalter||'')}" oninput="${setz(f.key,'this.value')}"`
          + ` title="${werte.length} Einträge – zu viele für eine Liste, bitte tippen">`
          + `<span style="font-size:.6rem;color:var(--text3)">${werte.length} bekannt</span>`;
      }
      if (!werte.length)
        return lbl+`<input class="cf" ${br||'style="width:150px"'} value="${escHtml(v??'')}"`
          + ` placeholder="${escHtml(f.platzhalter||'')}" title="${escHtml(f.leerHinweis||'')}"`
          + ` oninput="${setz(f.key,'this.value')}">`;
      // Ein bereits gesetzter Wert, der nicht in der Liste steht, wird
      // mit aufgenommen - eine Auswahlliste darf nichts verschlucken.
      const bekannt = werte.some(w => w[0] === v);
      const zusatz = (v && !bekannt) ? `<option value="${escHtml(v)}" selected>${escHtml(v)}  (eigener Wert)</option>` : '';
      return lbl+`<select class="cf" ${br||'style="width:170px"'} onchange="${setz(f.key,'this.value')};condRerender('${tid}')">`
        + `<option value="" ${!v?'selected':''}>${escHtml(f.platzhalter||'– wählen –')}</option>`
        + zusatz
        + werte.map(w=>`<option value="${escHtml(w[0])}" ${v===w[0]?'selected':''}>${escHtml(w[1])}</option>`).join('')
        + `</select>`;
    }
    if (f.typ === 'zahl')
      return lbl+`<input class="cf" type="number" ${br||'style="width:64px"'} value="${v??0}" oninput="${setz(f.key,'+this.value')}">`;
    if (f.typ === 'zeit')
      return lbl+`<input class="cf" type="time" style="width:92px" value="${escHtml(v||'')}" oninput="${setz(f.key,'this.value')}">`;
    if (f.typ === 'datum')
      return lbl+`<input class="cf" type="date" style="width:132px" value="${escHtml(v||'')}" oninput="${setz(f.key,'this.value')}">`;
    if (f.typ === 'tage') {
      const namen=['So','Mo','Di','Mi','Do','Fr','Sa'];
      const an=(v||[]).map(Number);
      return namen.map((n,i)=>`<label style="font-size:.64rem;display:inline-flex;align-items:center;gap:2px;margin-right:4px">`
        + `<input type="checkbox" ${an.indexOf(i)>=0?'checked':''} onchange="condTagUm('${tid}',${ci},${i},this.checked)">${n}</label>`).join('');
    }
    return lbl+`<input class="cf" ${br||'style="width:130px"'} value="${escHtml(v??'')}"`
      + ` placeholder="${escHtml(f.platzhalter||'')}" oninput="${setz(f.key,'this.value')}">`;
  }).join('\n      ');
}

/* Oeffnet den vorhandenen Auswahl-Dialog und schreibt das Ergebnis in die
   richtige Bedingung - egal ob sie normal in der Liste steht oder in einer
   Klammer-Gruppe. */
const _CondSetter = {
  condField:      (...a) => condField(...a),
  gruppeKindFeld: (...a) => gruppeKindFeld(...a),
};
function _condPicker(fnName, argsJson, key, tab, tid) {
  let args;
  try { args = JSON.parse(argsJson); } catch (e) { return; }
  const setter = _CondSetter[fnName];
  if (!setter) return;
  ipickerOpen(tab, v => {
    const wert = v?.name ?? v?.asset ?? '';
    setter(...args, key, wert);
    condRerender(tid);
  });
}

/* Wochentag an-/abwaehlen */
function condTagUm(tid, ci, tag, an) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const c = t.bedingungen?.[ci]; if (!c) return;
  const menge = new Set((c.tage||[]).map(Number));
  if (an) menge.add(tag); else menge.delete(tag);
  c.tage = [...menge].sort((x,y)=>x-y);
  _saveBots(); condRerender(tid);
}

/* Auswahlknoepfe fuer die neuen Bausteine, nach Gruppe sortiert. Die alten
   Typen stehen weiterhin fest im Markup - sie wandern mit der Zeit hierher. */
function _condKnoepfe(tid) {
  const nachGruppe = {};
  for (const [typ, d] of Object.entries(COND_DEFS)) {
    (nachGruppe[d.gruppe||'Sonstige'] = nachGruppe[d.gruppe||'Sonstige'] || []).push([typ, d]);
  }
  return Object.keys(nachGruppe).sort().map(g =>
    `<span style="width:100%;height:0"></span>`
    + `<span style="font-size:.58rem;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;`
    + `align-self:center;margin-right:2px">${escHtml(g)}</span>`
    + nachGruppe[g].map(([typ, d]) =>
        `<button onclick="trigAddCond('${tid}','${typ}')"`
        + (d.hinweis ? ` title="${escHtml(d.hinweis)}"` : '')
        + `>${d.icon} ${escHtml(d.label)}</button>`).join('')
  ).join('');
}

function renderCond(bot, tid, c, ci) {
  // Klammer-Gruppen bekommen eine eigene, eingerueckte Darstellung
  if (c.typ === 'gruppe') return _renderGruppe(bot, tid, c, ci);
  let inner = '';
  const _def = COND_DEFS[c.typ];
  if (_def) {
    inner = `<span style="font-size:.68rem;color:var(--text2);margin-right:2px">${escHtml(_def.label)}</span>`
      + _condFelder(tid, ci, c, _def)
      + (_def.hinweis ? `<span style="font-size:.6rem;color:var(--text3);margin-left:4px" title="${escHtml(_def.hinweis)}">ⓘ</span>` : '');
  } else if (c.typ === 'wort') {
    inner = `
      <input class="cf cf-w120" value="${escHtml(c.wort||'')}" oninput="condField('${tid}',${ci},'wort',this.value)" placeholder="Triggerwort (lowercase)">
      <select class="cf" onchange="condField('${tid}',${ci},'typ_msg',this.value)">
        <option value="any"     ${(!c.typ_msg||c.typ_msg==='any')?'selected':''}>Chat+Emote+Whisper</option>
        <option value="chat"    ${c.typ_msg==='chat'?'selected':''}>Nur Chat</option>
        <option value="emote"   ${c.typ_msg==='emote'?'selected':''}>Nur Emote</option>
        <option value="whisper" ${c.typ_msg==='whisper'?'selected':''}>Nur Whisper</option>
      </select>
      <select class="cf" style="width:118px" onchange="condField('${tid}',${ci},'modus',this.value)" title="enthält: Wort muss vorkommen. fehlt: Trigger löst aus, wenn das Wort FEHLT (Pflichtwort, z.B. immer 'Master').">
        <option value="enthält" ${(!c.modus||c.modus==='enthält')?'selected':''}>enthält</option>
        <option value="fehlt" ${c.modus==='fehlt'?'selected':''}>⚠️ fehlt</option>
      </select>`;
  } else if (c.typ === 'zone') {
    inner = `
      <input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="condField('${tid}',${ci},'name',this.value)" placeholder="Zonen-Name (!set)" title="Name für den Admin-Befehl !set <Name> X">
      X<input class="cf" style="width:46px" type="number" value="${c.x??0}" oninput="condField('${tid}',${ci},'x',+this.value)">
      Y<input class="cf" style="width:46px" type="number" value="${c.y??0}" oninput="condField('${tid}',${ci},'y',+this.value)">
      ±<input class="cf" style="width:38px" type="number" value="${c.puffer??1}" oninput="condField('${tid}',${ci},'puffer',+this.value)" title="Puffer">
      <button onclick="condSetZone('${tid}',${ci})" style="font-size:.62rem;padding:2px 8px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Aktuelle Spielerposition übernehmen">📍 Set</button>
      <select class="cf" style="width:150px" onchange="condField('${tid}',${ci},'zoneMode',this.value)" title="Bei Eintritt: einmal beim Betreten. Dauerhaft: bei jedem Check (~0,5s) solange drin – z.B. für %-Chance pro Schritt.">
        <option value="eintritt" ${(!c.zoneMode||c.zoneMode==='eintritt')?'selected':''}>↘️ bei Eintritt</option>
        <option value="dauerhaft" ${c.zoneMode==='dauerhaft'?'selected':''}>🔁 dauerhaft (jeder Check)</option>
      </select>`;
  } else if (c.typ === 'item_traegt' || c.typ === 'item_traegt_nicht') {
    const negLabel = c.typ === 'item_traegt_nicht' ? '<span style="color:#e55;font-size:.65rem;font-weight:600;margin-right:4px">🚫 NICHT</span>' : '';
    inner = `
      ${negLabel}
      <span style="font-size:.68rem;color:var(--text2)">${c.gruppe?escHtml(c.gruppe)+' / ':''}<b>${escHtml(c.item||'–')}</b></span>
      <button onclick="ipickerOpen('item',v=>{condField('${tid}',${ci},'item',v.asset||v.name);condField('${tid}',${ci},'gruppe',v.group);condRerender('${tid}');})" style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">📦 Wählen</button>`;
  } else if (c.typ === 'zone_rect') {
    inner = `
      <input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="condField('${tid}',${ci},'name',this.value)" placeholder="Zonen-Name (!set)" title="Name für den Admin-Befehl !set <Name> X1 / X2">
      <span style="font-size:.62rem;color:var(--text3)">Von</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x1??0}" oninput="condField('${tid}',${ci},'x1',+this.value)" title="X-Start">
      Y<input class="cf" style="width:44px" type="number" value="${c.y1??0}" oninput="condField('${tid}',${ci},'y1',+this.value)" title="Y-Start">
      <span style="font-size:.62rem;color:var(--text3)">Bis</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x2??2}" oninput="condField('${tid}',${ci},'x2',+this.value)" title="X-Ende">
      Y<input class="cf" style="width:44px" type="number" value="${c.y2??2}" oninput="condField('${tid}',${ci},'y2',+this.value)" title="Y-Ende">
      <button onclick="condSetZone('${tid}',${ci},'A')" style="font-size:.62rem;padding:2px 8px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Von-Ecke = aktuelle Position">📍 Set A</button>
      <button onclick="condSetZone('${tid}',${ci},'B')" style="font-size:.62rem;padding:2px 8px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Bis-Ecke = aktuelle Position">📍 Set B</button>
      <select class="cf" style="width:150px" onchange="condField('${tid}',${ci},'zoneMode',this.value)" title="Bei Eintritt: einmal beim Betreten. Dauerhaft: bei jedem Check (~0,5s) solange drin – z.B. für %-Chance pro Schritt.">
        <option value="eintritt" ${(!c.zoneMode||c.zoneMode==='eintritt')?'selected':''}>↘️ bei Eintritt</option>
        <option value="dauerhaft" ${c.zoneMode==='dauerhaft'?'selected':''}>🔁 dauerhaft (jeder Check)</option>
      </select>`;
  } else if (c.typ === 'trigger_war') {
    const trigs = bot?.triggers ?? [];
    const opts = trigs.filter(t=>t.id!==tid).map(t=>`<option value="${t.id}" ${c.trigId===t.id?'selected':''}>${escHtml(t.name||t.id)}</option>`).join('');
    const refTrig = trigs.find(t=>t.id===c.trigId);
    const modeBadge = refTrig
      ? refTrig.charSpec
        ? `<span style="font-size:.58rem;background:#1a1040;border:1px solid var(--purple);color:var(--pl);padding:1px 5px;border-radius:3px">👤 Pro Spieler</span>`
        : `<span style="font-size:.58rem;background:#0a1a0a;border:1px solid var(--green);color:var(--green);padding:1px 5px;border-radius:3px">🌐 Global</span>`
      : '';
    inner = `
      <select class="cf cf-w160" onchange="condField('${tid}',${ci},'trigId',this.value);condRerender('${tid}')">
        <option value="">– Trigger wählen –</option>${opts}
      </select>
      ${modeBadge}
      <span style="font-size:.62rem;color:var(--text3)">muss zuerst ausgelöst worden sein</span>`;
  } else if (c.typ === 'player_betritt') {
    const bt = c.betritt_typ ?? 'alle';
    inner = `
      <select class="cf" style="width:200px" onchange="condField('${tid}',${ci},'betritt_typ',this.value)">
        <option value="alle"   ${bt==='alle'?'selected':''}>👋 Jedes Mal (auch Erstbesuch)</option>
        <option value="neu"    ${bt==='neu'?'selected':''}>🆕 Erstes Mal in dieser Session</option>
        <option value="rejoin" ${bt==='rejoin'?'selected':''}>🔄 Nur Rejoin (war schon da)</option>
      </select>`;
  } else if (c.typ === 'rang') {
    const rop = c.rang_op ?? '=';
    const ranks = _rankSorted();
    inner = `
      <select class="cf" style="width:80px" onchange="condField('${tid}',${ci},'rang_op',this.value);condRerender('${tid}')">
        <option value="="   ${rop==='='  ?'selected':''}>= Genau</option>
        <option value="min" ${rop==='min'?'selected':''}>≥ Min.</option>
        <option value="max" ${rop==='max'?'selected':''}>≤ Max.</option>
        <option value="kein"${rop==='kein'?'selected':''}>∅ Kein Rang</option>
      </select>
      ${rop!=='kein'?`<select class="cf" style="flex:1;min-width:130px" onchange="condField('${tid}',${ci},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${c.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}`;
  } else if (c.typ === 'shop_kauf') {
    const shopItems = _shop.items;
    inner = `
      <select class="cf" style="flex:1;min-width:180px" onchange="condField('${tid}',${ci},'shop_id',this.value)">
        <option value="">🛒 Jeder Shop-Kauf</option>
        ${shopItems.map(i=>`<option value="${i.id}" ${c.shop_id===i.id?'selected':''}>${escHtml(i.icon+' '+i.name)} (${i.preis} 💰)</option>`).join('')}
      </select>
      <span style="font-size:.62rem;color:var(--text3)">Auslöser = Käufer · C = Kaufziel</span>`;
  }
  if (c.typ === 'ev_timer') {
    inner = `<span style="font-size:.65rem;color:var(--text3)">Einmalig nach</span>
      <input class="cf cf-w80" type="number" min="1" step="1" value="${c.sek??10}"
        oninput="condField('${tid}',${ci},'sek',+this.value)">
      <span style="font-size:.65rem;color:var(--text3)">Sekunden automatisch feuern</span>`;
  } else if (c.typ === 'ev_interval') {
    inner = `<span style="font-size:.65rem;color:var(--text3)">Alle</span>
      <input class="cf cf-w70" type="number" min="1" value="${c.sek_min??30}"
        oninput="condField('${tid}',${ci},'sek_min',+this.value)">
      <span style="font-size:.62rem;color:var(--text3)">–</span>
      <input class="cf cf-w70" type="number" min="1" value="${c.sek_max??180}"
        oninput="condField('${tid}',${ci},'sek_max',+this.value)">
      <span style="font-size:.65rem;color:var(--text3)">Sekunden wiederholt feuern</span>`;
  } else if (c.typ === 'variable') {
    inner = `
      <input class="cf cf-w120" value="${escHtml(c.varName||'')}" oninput="condField('${tid}',${ci},'varName',this.value)" placeholder="Variable (z.B. punkte)">
      <select class="cf" style="width:88px" onchange="condField('${tid}',${ci},'varCmp',this.value)">
        ${['==','!=','>','<','>=','<=','gesetzt','leer'].map(o=>`<option value="${o}" ${(c.varCmp||'==')===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <input class="cf cf-w80" value="${escHtml(c.varWert||'')}" oninput="condField('${tid}',${ci},'varWert',this.value)" placeholder="Wert">`;
  } else if (c.typ === 'zufall') {
    inner = `
      <span style="font-size:.65rem;color:var(--text3)">Chance</span>
      <input class="cf cf-w70" type="number" min="0" max="100" value="${c.prozent??50}" oninput="condField('${tid}',${ci},'prozent',+this.value)"> %
      <span style="font-size:.62rem;color:var(--text3)">dass die Bedingung zutrifft</span>`;
  } else if (c.typ === 'erregung') {
    inner = `
      <span style="font-size:.65rem;color:var(--text3)">Erregung</span>
      <select class="cf" style="width:70px" onchange="condField('${tid}',${ci},'arCmp',this.value)">
        ${['>=','<=','>','<','=='].map(o=>`<option value="${o}" ${(c.arCmp||'>=')===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <input class="cf cf-w70" type="number" min="0" max="100" value="${c.arWert??99}" oninput="condField('${tid}',${ci},'arWert',+this.value)"> %
      <span style="font-size:.6rem;color:var(--text3)">prüft die Erregung des auslösenden Spielers · funktioniert auch allein (wird alle 2s geprüft, feuert beim Überschreiten) · setzt voraus, dass der Spieler seine Erregung teilt (BC-Sichtbarkeit „Everyone/Access")</span>`;
  }
  const icons = {wort:'💬',zone:'🗺️',zone_rect:'📐',item_traegt:'👗',item_traegt_nicht:'🚫',trigger_war:'🔗',player_betritt:'👋',ev_timer:'⏱',ev_interval:'🔁',rang:'🏆',shop_kauf:'🛒',variable:'🔢',zufall:'🎲',erregung:'💗'};
  // Neue Typen bringen ihr Symbol im Verzeichnis mit
  Object.keys(COND_DEFS).forEach(k=>{ if(!icons[k]) icons[k]=COND_DEFS[k].icon; });
  // Logik-Operator: verbindet diese Bedingung mit der vorherigen
  const logik = c.logik ?? 'und';
  const logikBadge = ci === 0
    ? `<div class="cond-when-lbl">WENN</div>`
    : `<div style="display:flex;align-items:center;gap:0;margin:2px 0;padding-left:6px">
        <button onclick="condLogik('${tid}',${ci},'und')" class="logik-btn ${logik==='und'?'active':''}" title="UND – alle müssen zutreffen">UND</button>
        <button onclick="condLogik('${tid}',${ci},'oder')" class="logik-btn ${logik==='oder'?'active':''}" title="ODER – mind. eine muss zutreffen">ODER</button>
        <button onclick="condLogik('${tid}',${ci},'und_oder')" class="logik-btn ${logik==='und_oder'?'active':''}" title="Egal – mindestens eine genügt">UND/ODER</button>
        <button onclick="condLogik('${tid}',${ci},'und_nicht')" class="logik-btn ${logik==='und_nicht'?'active active-nicht':''}" style="border-left:none;border-radius:0 3px 3px 0" title="UND NICHT – Bedingung darf NICHT zutreffen">UND NICHT</button>
      </div>`;
  return `<div class="cond-group ${logik==='oder'?'cond-group-oder':logik==='und_nicht'?'cond-group-nicht':''}">
    ${logikBadge}
    <div class="cond-card cond-op" id="cond-${tid}-${ci}">
      <div class="card-fields">
        <span class="cond-num">${ci+1}</span>
        <span style="font-size:.7rem;font-weight:600;color:var(--purple);flex-shrink:0">${icons[c.typ]??'❓'}</span>
        ${inner}
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <button class="order-btn" onclick="condMoveUp('${tid}',${ci})" ${ci===0?'disabled':''}>▲</button>
        <button class="order-btn" onclick="condMoveDown('${tid}',${ci})" title="Nach unten">▼</button>
        <button class="order-btn" onclick="condInGruppe('${tid}',${ci})" title="In die Klammer darüber verschieben">⤵</button>
        <button class="rm-btn" style="margin-top:2px" onclick="condRemove('${tid}',${ci})">✕</button>
      </div>
    </div>
  </div>`;
}

// ── Actions ───────────────────────────────────────────────────
function _actBeiF(bf) {
  return {ignorieren:'⬇️ Ignorieren – weiter',kette_stoppen:'⏹ Kette stoppen',trigger_ungueltig:'❌ Trigger ungültig'}[bf]??'⬇️ Ignorieren – weiter';
}

function renderAct(tid, a, ai, branch) {
  const b   = _selBot();
  const t   = b?.triggers.find(x=>x.id===tid);
  const arr = branch === 'sonst' ? (t?.aktionen_sonst ?? []) : (t?.aktionen ?? []);
  const tot = arr.length;

  const types = [
    ['chat','💬 Chat senden'],['emote','✨ Emote senden'],['whisper','🤫 Whisper senden'],
    ['item','📦 Item / Curse / Profil anlegen'],['item_entf','🗑️ Item entfernen'],
    ['teleport','🌀 Teleport'],
    ['money','💰 Money ändern'],
    ['rang','🏆 Rang setzen'],
    ['szene','📖 Szene starten'],['variable','🔢 Variable setzen'],['erregung','💗 Erregung/Orgasmus'],
    ['mapkey','🔑 Map-Key geben/wegnehmen'],
  ];
  const typeOpts = types.map(([v,l])=>`<option value="${v}" ${a.typ===v?'selected':''}>${l}</option>`).join('');
  const branchArg = branch ? `,'${branch}'` : '';

  let extra = '';
  if (['chat','emote','whisper'].includes(a.typ)) {
    extra = `<textarea class="cf" style="width:100%;resize:vertical;min-height:44px;margin-top:4px" rows="2"
        oninput="actField('${tid}',${ai},'text',this.value${branch?`,'${branch}'`:''})"
        placeholder="{name} schrieb: {wort} – Pos: {x}/{y}">${escHtml(a.text||'')}</textarea>
      <div style="font-size:.59rem;color:var(--text3);margin-top:2px">Variablen: {name} {wort} {typ} {x} {y}</div>
      <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:.62rem;color:var(--text2);margin-top:2px" title="An: jede Zeile ist eine Variante. Es wird zufällig EINE Zeile gesendet.">
        <input type="checkbox" ${a.zufallstext?'checked':''} onchange="actField('${tid}',${ai},'zufallstext',this.checked${branch?`,'${branch}'`:''})">
        🎲 Zufallszeile (1 Zeile = 1 Variante, zufällig gewählt)
      </label>`;
  } else if (a.typ === 'item') {
    const cfgInfo = a.itemConfig ? ` <span style="font-size:.58rem;background:var(--gd);color:var(--green);padding:1px 4px;border-radius:3px">✓ Konfig</span>` : '';
    const label = a.itemConfig ? `📦 ${a.itemConfig.group}/${a.itemConfig.asset}` : a.profilName ? `👗 ${a.profilName}` : a.curseName ? `🔮 ${a.curseName}` : a.item ? `📦 ${a.gruppe||'?'}/${a.item}` : '– nichts gewählt –';
    const _keepList = Array.isArray(a.outfitKeepGroups) ? a.outfitKeepGroups : (a.outfitKeepGroups ? (''+a.outfitKeepGroups).split(',').map(s=>s.trim()).filter(Boolean) : []);
    const asLabel = a.antiStrip_itemConfig ? `📦 ${a.antiStrip_itemConfig.group}/${a.antiStrip_itemConfig.asset}`
                  : a.antiStrip_curseName  ? `🔮 ${a.antiStrip_curseName}`
                  : a.antiStrip_ersatz     ? `📦 ${a.antiStrip_gruppe||'?'}/${a.antiStrip_ersatz}`
                  : '– kein Ersatz – gleiches Item wird wieder angelegt –';
    const antiStripRows = a.antiStrip ? `
      <div class="as-act-row">
        <span class="as-act-label">Ersatz-Item:</span>
        <span style="font-size:.68rem;color:var(--text2);flex:1">${escHtml(asLabel)}</span>
        <button onclick="ipickerOpenForActAntiStrip('${tid}',${ai}${branchArg})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Wählen</button>
        ${a.antiStrip_ersatz && !a.antiStrip_itemConfig ? `<input class="cf" type="color" value="${a.antiStrip_farbe||'#ff0000'}" oninput="actField('${tid}',${ai},'antiStrip_farbe',this.value${branchArg})" style="width:28px;padding:1px;cursor:pointer" title="Farbe">` : ''}
      </div>
      <div class="as-act-row">
        <span class="as-act-label">Delay:</span>
        <input class="cf" type="number" value="${a.antiStrip_delay??500}" min="0" step="100"
          oninput="actField('${tid}',${ai},'antiStrip_delay',+this.value${branchArg})"
          style="width:72px;font-size:.68rem"> ms
        <span style="font-size:.6rem;color:var(--text3)">(Wartezeit nach Entfernen)</span>
      </div>` : '';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:.7rem;color:var(--text2);flex:1">${escHtml(label)}${cfgInfo}</span>
        <button onclick="ipickerOpenForAct('${tid}',${ai}${branchArg})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Auswählen…</button>
        ${a.item && !a.itemConfig ? `<input class="cf" type="color" value="${a.farbe||'#ffffff'}" oninput="actField('${tid}',${ai},'farbe',this.value${branchArg})" style="width:28px;padding:1px;cursor:pointer" title="Farbe">` : ''}
      </div>
      <div style="display:flex;gap:5px;align-items:center;margin-top:3px">
        <span style="font-size:.62rem;color:var(--text3)" title="0 = aus. Nach X Sekunden wird das angelegte Item/Outfit automatisch wieder entfernt (Verfall).">⏳ Verfall nach:</span>
        <input class="cf cf-w80" type="number" min="0" value="${a.verfallSek??0}" oninput="actField('${tid}',${ai},'verfallSek',+this.value${branchArg})"> s <span style="font-size:.6rem;color:var(--text3)">(0 = aus, auto-entfernen)</span>
      </div>
      <div class="as-act-box">
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2)">
          <input type="checkbox" ${a.antiStrip?'checked':''} onchange="actField('${tid}',${ai},'antiStrip',this.checked${branchArg});actRerender('${tid}',${ai}${branchArg})">
          🛡️ AntiStrip – Item wird wieder angelegt wenn der Spieler es entfernt
        </label>
        ${antiStripRows}
      </div>
      <div class="as-act-box" style="margin-top:2px">
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2)">
          <input type="checkbox" ${a.nostrip?'checked':''} onchange="actField('${tid}',${ai},'nostrip',this.checked${branchArg})">
          🔒 NoStrip – Freeze + AntiStrip wenn K&auml;ufer /nostrip tippt
        </label>
      </div>
      ${(Array.isArray(a.profilItems)&&a.profilItems.length)?`
      <div class="as-act-box" style="margin-top:2px">
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2)" title="An: bereits angelegte Fesseln/Items (z.B. vom Bot, Cage) bleiben beim Outfit-Anlegen erhalten. Aus: werden vorher entfernt.">
          <input type="checkbox" ${a.outfitKeep?'checked':''} onchange="actField('${tid}',${ai},'outfitKeep',this.checked${branchArg})">
          🛡️ Fesseln/Items behalten (nicht ablegen)
        </label>
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2);margin-top:3px" title="An: vorhandene Klamotten bleiben. Aus: alle Klamotten werden entfernt (Fesseln/Items bleiben je nach Option oben).">
          <input type="checkbox" ${a.outfitKeepClothes?'checked':''} onchange="actField('${tid}',${ai},'outfitKeepClothes',this.checked${branchArg})">
          👗 Klamotten behalten (sonst werden sie abgelegt)
        </label>
        <div style="margin-top:3px">
          <span style="font-size:.6rem;color:var(--text3)" title="Haare (Hair/发) bleiben automatisch. Hier weitere Gruppen wählen, die NIE abgelegt werden (z.B. Augen). Eigene/Custom-Namen rechts eintippen + Enter.">🔒 immer behalten (zusätzlich):</span>
          <div style="display:flex;gap:5px;align-items:center;margin-top:2px;flex-wrap:wrap">
            <select class="cf" style="min-width:150px" onchange="if(this.value){outfitKeepAdd('${tid}',${ai},this.value${branchArg});this.value='';}">
              <option value="">➕ Gruppe wählen …</option>
              ${_botItemGroups().map(g=>`<option value="${escHtml(g)}">${escHtml(g)}</option>`).join('')}
            </select>
            <input class="cf" style="width:150px;font-size:.62rem" placeholder="eigener Name + Enter" onkeydown="if(event.key==='Enter'&&this.value.trim()){outfitKeepAdd('${tid}',${ai},this.value${branchArg});this.value='';event.preventDefault();}">
          </div>
          <div style="margin-top:3px">${_keepList.length?_keepList.map((g,gi)=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--pd);color:var(--pl);padding:2px 8px;border-radius:11px;font-size:.62rem;margin:2px 3px 0 0">${escHtml(g)}<button onclick="outfitKeepRemove('${tid}',${ai},${gi}${branchArg})" style="background:none;border:none;color:var(--pl);cursor:pointer;font-size:.7rem;padding:0 1px;line-height:1">✕</button></span>`).join(''):`<span style="font-size:.6rem;color:var(--text3)">– nur Haare automatisch geschützt –</span>`}</div>
        </div>
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2);margin-top:3px">
          <input type="checkbox" ${a.profilEinzeln?'checked':''} onchange="actField('${tid}',${ai},'profilEinzeln',this.checked${branchArg});actRerender('${tid}',${ai}${branchArg})">
          🧩 Items einzeln nacheinander anlegen (in Reihenfolge unten)
        </label>
        ${a.profilEinzeln?`<div style="display:flex;gap:6px;align-items:center;margin-top:3px">
          <span style="font-size:.6rem;color:var(--text3)">Abstand pro Item:</span>
          <input class="cf" type="number" min="80" step="10" value="${a.profilEinzelnGap??250}" style="width:72px" oninput="actField('${tid}',${ai},'profilEinzelnGap',+this.value${branchArg})"> ms
        </div>`:''}
        <div style="margin-top:4px;display:flex;flex-direction:column;gap:2px;max-height:230px;overflow:auto">
          ${a.profilItems.map((it,ii)=>`<div style="display:flex;gap:5px;align-items:center;font-size:.62rem;background:rgba(255,255,255,0.03);border-radius:4px;padding:2px 5px">
            <span style="display:flex;flex-direction:column;gap:0">
              <button class="order-btn" onclick="profilItemMove('${tid}',${ai},${ii},-1${branchArg})" ${ii===0?'disabled':''}>▲</button>
              <button class="order-btn" onclick="profilItemMove('${tid}',${ai},${ii},1${branchArg})" ${ii===a.profilItems.length-1?'disabled':''}>▼</button>
            </span>
            <span style="color:var(--text3);min-width:20px">${ii+1}.</span>
            <span style="flex:1;color:var(--text2)">${escHtml(it.group||'?')}/<b>${escHtml(it.asset||'?')}</b>${it.lock?' 🔒':''}</span>
          </div>`).join('')}
        </div>
      </div>`:''}`;
  } else if (a.typ === 'item_entf') {
    const _entfList = Array.isArray(a.gruppen) ? a.gruppen : (a.gruppe ? [a.gruppe] : []);
    const _entfGroups = _botItemGroups();
    const _entfChips = _entfList.length
      ? _entfList.map((g,gi)=>`<span style="display:inline-flex;align-items:center;gap:4px;background:var(--pd);color:var(--pl);padding:2px 8px;border-radius:11px;font-size:.65rem;margin:2px 3px 0 0">${escHtml(g)}<button onclick="actEntfRemoveGruppe('${tid}',${ai},${gi}${branchArg})" style="background:none;border:none;color:var(--pl);cursor:pointer;font-size:.7rem;padding:0 1px;line-height:1">✕</button></span>`).join('')
      : `<span style="font-size:.62rem;color:var(--text3)">– noch keine Gruppe gewählt –</span>`;
    extra = `<div style="margin-top:4px">
      <select class="cf" style="width:100%" onchange="if(this.value){actEntfAddGruppe('${tid}',${ai},this.value${branchArg});this.value='';}">
        <option value="">➕ Gruppe hinzufügen …</option>
        ${_entfGroups.map(g=>`<option value="${escHtml(g)}">${escHtml(g)}</option>`).join('')}
      </select>
      <div style="margin-top:5px">${_entfChips}</div>
    </div>`;
  } else if (a.typ === 'teleport') {
    const slots = a.tpSlots ?? [];
    const slotsHtml = slots.map((s, si) => {
      const gueltig = s.gueltig ?? true; // Fallback zählt als Erfolg?
      return `<div class="tp-slot-row" id="tpslot-${tid}-${ai}-${si}">
        <span class="tp-slot-badge ${si===0?'primary':'fallback'}">${si===0?'Primär':'Fallback '+(si)}</span>
        <span style="font-size:.63rem;color:var(--text3)">X</span>
        <input class="cf" type="number" style="width:54px" value="${s.x??0}" oninput="tpSlotField('${tid}',${ai},${si},'x',+this.value${branchArg})" placeholder="X">
        <span style="font-size:.63rem;color:var(--text3)">Y</span>
        <input class="cf" type="number" style="width:54px" value="${s.y??0}" oninput="tpSlotField('${tid}',${ai},${si},'y',+this.value${branchArg})" placeholder="Y">
        <button onclick="tpSlotSetPos('${tid}',${ai},${si}${branchArg})" style="font-size:.62rem;padding:1px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Aktuelle Spielerposition übernehmen">📍 Set</button>
        <button class="tp-slot-valid ${gueltig?'zählt':'zählt-nicht'}"
          onclick="tpSlotField('${tid}',${ai},${si},'gueltig',!${gueltig}${branchArg});actRerender('${tid}',${ai}${branchArg})"
          title="${gueltig?'Dieser Slot zählt als Erfolg – klicken um zu ändern':'Dieser Slot gilt als Fehler (bei_fehler greift) – klicken um zu ändern'}">
          ${gueltig?'✅ Gültig':'❌ Fehler'}
        </button>
        <button onclick="tpSlotRemove('${tid}',${ai},${si}${branchArg})" style="margin-left:auto;background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;padding:1px 4px" title="Entfernen">✕</button>
      </div>`;
    }).join('');
    const tpMode = a.tpMode || 'punkte';
    const modeSel = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <span style="font-size:.63rem;color:var(--text3)">Modus:</span>
      <select class="cf" style="width:200px" onchange="actField('${tid}',${ai},'tpMode',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
        <option value="punkte" ${tpMode==='punkte'?'selected':''}>📍 Punkte (Primär + Fallbacks)</option>
        <option value="bereich" ${tpMode==='bereich'?'selected':''}>⬛ Bereich (zufälliger freier Punkt)</option>
      </select>
    </div>`;
    if (tpMode === 'bereich') {
      extra = modeSel + `
        <div style="font-size:.63rem;color:var(--text3);margin-top:5px">🌀 Teleportiert auf einen zufälligen freien Punkt im Rechteck A→B. Alles belegt → Fehler.</div>
        <div class="tp-slot-row" style="margin-top:4px">
          <span class="tp-slot-badge primary">Ecke A</span>
          <span style="font-size:.63rem;color:var(--text3)">X</span><input class="cf" type="number" style="width:54px" value="${a.tpAx??0}" oninput="actField('${tid}',${ai},'tpAx',+this.value${branchArg})">
          <span style="font-size:.63rem;color:var(--text3)">Y</span><input class="cf" type="number" style="width:54px" value="${a.tpAy??0}" oninput="actField('${tid}',${ai},'tpAy',+this.value${branchArg})">
          <button onclick="tpAreaSetPos('${tid}',${ai},'A'${branchArg})" style="font-size:.62rem;padding:1px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Ecke A = aktuelle Position">📍 Set A</button>
        </div>
        <div class="tp-slot-row" style="margin-top:3px">
          <span class="tp-slot-badge fallback">Ecke B</span>
          <span style="font-size:.63rem;color:var(--text3)">X</span><input class="cf" type="number" style="width:54px" value="${a.tpBx??2}" oninput="actField('${tid}',${ai},'tpBx',+this.value${branchArg})">
          <span style="font-size:.63rem;color:var(--text3)">Y</span><input class="cf" type="number" style="width:54px" value="${a.tpBy??2}" oninput="actField('${tid}',${ai},'tpBy',+this.value${branchArg})">
          <button onclick="tpAreaSetPos('${tid}',${ai},'B'${branchArg})" style="font-size:.62rem;padding:1px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Ecke B = aktuelle Position">📍 Set B</button>
        </div>`;
    } else {
      extra = modeSel + `
        <div style="font-size:.63rem;color:var(--text3);margin-top:5px">
          🌀 Teleportiert den Auslöser. Wenn alle Positionen belegt sind → gilt als Fehler.
        </div>
        <div class="tp-slot-list" id="tpslots-${tid}-${ai}">${slotsHtml}</div>
        <button class="tp-slot-add-btn" onclick="tpSlotAdd('${tid}',${ai}${branchArg})">+ Position / Fallback hinzufügen</button>`;
    }
  } else if (a.typ === 'money') {
    const moneyName = _money?.settings?.name || 'Gold';
    const mop = a.money_op ?? 'add';
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:130px" onchange="actField('${tid}',${ai},'money_op',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
        <option value="add"   ${mop==='add'?'selected':''}>➕ Hinzufügen</option>
        <option value="sub"   ${mop==='sub'?'selected':''}>➖ Abziehen</option>
        <option value="set"   ${mop==='set'?'selected':''}>= Setzen auf</option>
        <option value="reset" ${mop==='reset'?'selected':''}>🔄 Zurücksetzen (0)</option>
      </select>
      ${mop!=='reset'?`<input class="cf cf-w80" type="number" value="${a.money_val??1}" oninput="actField('${tid}',${ai},'money_val',+this.value${branchArg})">
      <span style="font-size:.68rem;color:var(--text3)">${escHtml(moneyName)}</span>`:''}
      <span style="font-size:.62rem;color:var(--text3)">Ziel: Auslöser</span>
    </div>`;
  } else if (a.typ === 'rang') {
    const rop = a.rang_op ?? 'setzen';
    const ranks = _rankSorted();
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:155px" onchange="actField('${tid}',${ai},'rang_op',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
        <option value="setzen"    ${rop==='setzen'?'selected':''}>🏆 Rang setzen</option>
        <option value="entfernen" ${rop==='entfernen'?'selected':''}>❌ Rang entfernen</option>
        <option value="naechster" ${rop==='naechster'?'selected':''}>⬆️ Nächster Rang</option>
        <option value="vorheriger"${rop==='vorheriger'?'selected':''}>⬇️ Vorheriger Rang</option>
      </select>
      ${rop==='setzen'?`<select class="cf" style="flex:1;min-width:140px" onchange="actField('${tid}',${ai},'rang_id',this.value${branchArg})">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${a.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}
      ${rop==='naechster'||rop==='vorheriger'?`<span style="font-size:.62rem;color:var(--text3)">Bei Lv.Max/Min: kein Wechsel</span>`:''}
    </div>`;
  } else if (a.typ === 'szene') {
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <span style="font-size:.65rem;color:var(--text3)">📖 Szene:</span>
      <select class="cf" style="flex:1;min-width:170px" onchange="actField('${tid}',${ai},'szeneId',this.value${branchArg})">
        <option value="">– Szene wählen –</option>
        ${_szenen(b).map(sz=>`<option value="${sz.id}" ${a.szeneId===sz.id?'selected':''}>${escHtml(sz.name||sz.id)}</option>`).join('')}
      </select>
    </div>`;
  } else if (a.typ === 'variable') {
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <input class="cf" style="width:130px" value="${escHtml(a.varName||'')}" placeholder="Variablen-Name" oninput="actField('${tid}',${ai},'varName',this.value${branchArg})">
      <select class="cf" style="width:104px" onchange="actField('${tid}',${ai},'varOp',this.value${branchArg})">
        <option value="set" ${(!a.varOp||a.varOp==='set')?'selected':''}>= Setzen</option>
        <option value="add" ${a.varOp==='add'?'selected':''}>➕ Plus</option>
        <option value="sub" ${a.varOp==='sub'?'selected':''}>➖ Minus</option>
        <option value="toggle" ${a.varOp==='toggle'?'selected':''}>🔁 Umschalten</option>
      </select>
      <input class="cf" style="width:90px" value="${escHtml(a.varWert||'')}" placeholder="Wert" oninput="actField('${tid}',${ai},'varWert',this.value${branchArg})">
      <span style="font-size:.6rem;color:var(--text3)">Ziel: Auslöser</span>
    </div>`;
  } else if (a.typ === 'erregung') {
    const eop = a.erregOp||'set';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:170px" onchange="actField('${tid}',${ai},'erregOp',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
        <option value="set" ${eop==='set'?'selected':''}>= Erregung setzen</option>
        <option value="add" ${eop==='add'?'selected':''}>➕ Erregung erhöhen</option>
        <option value="sub" ${eop==='sub'?'selected':''}>➖ Erregung senken</option>
        <option value="orgasm" ${eop==='orgasm'?'selected':''}>💥 Orgasmus erzwingen</option>
        <option value="stop" ${eop==='stop'?'selected':''}>🛑 Orgasmus stoppen</option>
      </select>
      ${(eop==='set'||eop==='add'||eop==='sub')?`<input class="cf cf-w70" type="number" min="0" max="100" value="${a.erregVal??50}" oninput="actField('${tid}',${ai},'erregVal',+this.value${branchArg})"> %`:''}
      <span style="font-size:.6rem;color:var(--text3)">wirkt zuverlässig auf dich selbst (BC synct nur eigene Erregung)</span>
    </div>`;
  } else if (a.typ === 'mapkey') {
    const mop = a.mapKeyOp||'geben';
    const mk  = a.mapKey||'bronze';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:150px" onchange="actField('${tid}',${ai},'mapKeyOp',this.value${branchArg})">
        <option value="geben" ${mop==='geben'?'selected':''}>🔑 Key geben</option>
        <option value="wegnehmen" ${mop==='wegnehmen'?'selected':''}>🔒 Key wegnehmen</option>
      </select>
      <select class="cf" style="width:130px" onchange="actField('${tid}',${ai},'mapKey',this.value${branchArg})">
        <option value="bronze" ${mk==='bronze'?'selected':''}>🥉 Bronze</option>
        <option value="silver" ${mk==='silver'?'selected':''}>🥈 Silver</option>
        <option value="gold" ${mk==='gold'?'selected':''}>🥇 Gold</option>
      </select>
      <span style="font-size:.6rem;color:var(--text3)">Map-Schlüssel (Ziel = Aktions-Ziel) · benötigt Raum-Admin · keine Raum-Meldung</span>
    </div>`;
  }

  // Chat/Emote/Whisper sind immer erfolgreich → kein Dann/Sonst
  const canBranch = ['teleport','item','item_entf'].includes(a.typ);

  // Dann/Sonst Inline-Nachrichten
  function renderMsg(field, label, color, placeholder) {
    const val = a[field] ?? '';
    const typField = field+'_typ';
    const mt = a[typField] ?? 'chat';
    if (!canBranch) return '';
    const ba = branch ? `,'${branch}'` : '';
    return `<div style="display:flex;gap:5px;align-items:center;margin-top:4px">
      <span style="font-size:.62rem;font-weight:600;color:${color};white-space:nowrap;min-width:42px">${label}</span>
      <select class="cf" style="width:86px;font-size:.62rem" onchange="actField('${tid}',${ai},'${typField}',this.value${ba});actRerender('${tid}',${ai}${ba})">
        <option value="nichts"   ${mt==='nichts'?'selected':''}>– nichts</option>
        <option value="chat"    ${mt==='chat'?'selected':''}>💬 Chat</option>
        <option value="emote"   ${mt==='emote'?'selected':''}>✨ Emote</option>
        <option value="whisper" ${mt==='whisper'?'selected':''}>🤫 Whisper</option>
      </select>
      ${mt!=='nichts'?`<input class="cf cf-flex" style="font-size:.68rem" value="${escHtml(val)}"
        oninput="actField('${tid}',${ai},'${field}',this.value${ba})"
        placeholder="${placeholder}">`:''}
    </div>`;
  }

  const branchSection = canBranch ? `
    <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border2)">
      ${renderMsg('dann_msg','✅ Dann:','#5c5','{name} teleportiert nach X{x} Y{y}')}
      ${renderMsg('sonst_msg','❌ Sonst:','#e55','Kein freier Platz für {name}!')}
    </div>` : '';

  // Bei Fehler (canBranch Aktionen können fehlschlagen)
  const bf = a.bei_fehler ?? 'ignorieren';
  const bfColors = {ignorieren:'var(--text3)',kette_stoppen:'#e8a020',trigger_ungueltig:'#e05050'};
  const ba2 = branch ? `,'${branch}'` : '';
  const bfRow = canBranch ? `<div style="display:flex;gap:6px;align-items:center;margin-top:4px">
    <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">Wenn fehlschlägt:</span>
    <select class="cf" style="flex:1;color:${bfColors[bf]??'var(--text3)'}" onchange="actField('${tid}',${ai},'bei_fehler',this.value${ba2});actRerender('${tid}',${ai}${ba2})">
      <option value="ignorieren"        ${bf==='ignorieren'?'selected':''}>⬇️ Weiter mit nächster Aktion</option>
      <option value="kette_stoppen"     ${bf==='kette_stoppen'?'selected':''}>⏹ Kette stoppen (Trigger zählt)</option>
      <option value="trigger_ungueltig" ${bf==='trigger_ungueltig'?'selected':''}>❌ Trigger ungültig (Fallback läuft)</option>
    </select>
  </div>` : '';

  const bfBorder = {kette_stoppen:'#664400',trigger_ungueltig:'#660000'}[bf] ?? '';
  const actId = branch === 'sonst' ? `act-sonst-${tid}-${ai}` : `act-${tid}-${ai}`;
  return `<div class="act-card" id="${actId}" style="${bfBorder?'border-color:'+bfBorder+';background:#0d0906;':''}">
    <div style="flex:1">
      <div style="display:flex;gap:4px;align-items:center">
        <span style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
          <button class="order-btn" onclick="actMoveUp('${tid}',${ai}${branchArg})" ${ai===0?'disabled':''}>▲</button>
          <button class="order-btn" onclick="actMoveDown('${tid}',${ai}${branchArg})" ${ai===tot-1?'disabled':''}>▼</button>
        </span>
        <span class="trig-order-num" style="margin-right:2px">${ai+1}</span>
        <select class="cf" style="flex:1" onchange="actChangeType('${tid}',${ai},this.value${branchArg})">${typeOpts}</select>
        <input class="cf cf-w80" type="number" value="${a.delay??0}" oninput="actField('${tid}',${ai},'delay',+this.value${branchArg})" title="Delay nach vorheriger Aktion (ms)"> ms
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:5px;padding:5px 8px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:6px;flex-wrap:wrap">
        <span style="font-size:.62rem;font-weight:700;color:#60a5fa;white-space:nowrap">🎯 Ziel</span>
        <select class="cf" style="width:230px;font-size:.68rem" onchange="actField('${tid}',${ai},'aktZiel',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
          <option value="ausloeser" ${(!a.aktZiel||a.aktZiel==='ausloeser')?'selected':''}>👤 Die Person, die ausgelöst hat</option>
          <option value="ausser_ausloeser" ${a.aktZiel==='ausser_ausloeser'?'selected':''}>👥 Alle außer der auslösenden Person</option>
          <option value="alle"      ${a.aktZiel==='alle'?'selected':''}>👥 Alle im Raum</option>
          <option value="whitelist" ${a.aktZiel==='whitelist'?'selected':''}>✅ Nur diese Personen</option>
          <option value="rang"      ${a.aktZiel==='rang'?'selected':''}>🏆 Alle ab einem bestimmten Rang</option>
          <option value="zufall"    ${a.aktZiel==='zufall'?'selected':''}>🎲 Eine zufällige Person im Raum</option>
          <option value="shop_kaeufer" ${a.aktZiel==='shop_kaeufer'?'selected':''}>💳 Wer im Shop gekauft hat</option>
        </select>
        ${a.aktZiel==='rang'?`<select class="cf" style="width:190px;font-size:.68rem" onchange="actField('${tid}',${ai},'aktZielRangId',this.value${branchArg})">
          <option value="">– Rang wählen –</option>
          ${_quelleRaenge().map(r=>`<option value="${escHtml(r[0])}" ${a.aktZielRangId===r[0]?'selected':''}>${escHtml(r[1])}</option>`).join('')}
        </select><span style="font-size:.6rem;color:var(--text3)" title="Gilt für diesen Rang und alle höheren">ⓘ ab dieser Stufe aufwärts</span>`:''}
        ${a.aktZiel==='whitelist'?`<input class="cf" style="flex:1;min-width:150px;font-size:.68rem" value="${escHtml((a.aktZielNummern||[]).join(', '))}"
          oninput="actField('${tid}',${ai},'aktZielNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0)${branchArg})"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
      </div>
      ${extra}
      ${branchSection}
      ${bfRow}
    </div>
    <button class="rm-btn" onclick="actRemove('${tid}',${ai}${branchArg})">✕</button>
  </div>`;
}

// ── Trigger CRUD helpers ───────────────────────────────────────
function botAddTrig() {
  const b = _selBot(); if (!b) return;
  const t = { id:'t'+Date.now(), name:'Neuer Trigger', aktiv:true, delay:0, bedingungen:[], aktionen:[] };
  b.triggers.push(t); _saveBots(); renderBotEditor();
  setTimeout(() => {
    document.getElementById('tb-'+t.id)?.classList.add('open');
    document.getElementById('tc-'+t.id)?.scrollIntoView({behavior:'smooth',block:'start'});
  }, 50);
}

function trigToggleBody(tid) { document.getElementById('tb-'+tid)?.classList.toggle('open'); }


function trigField(tid, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t[field] = val; _saveBots();
  if (field === 'aktiv') {
    document.getElementById('tc-'+tid)?.classList.toggle('trig-on', !!val);
  }
  if (field === 'name') {
    const el = document.getElementById('tlabel-'+tid);
    if (el) el.textContent = val || 'Trigger';
  }
}

function trigDelete(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid);
  if (!t || !confirm(`Trigger "${t.name||tid}" löschen?`)) return;
  b.triggers = b.triggers.filter(x=>x.id!==tid); _saveBots();
  document.getElementById('tc-'+tid)?.remove();
}

function trigMoveUp(tid) {
  const b = _selBot(); if (!b) return;
  const i = b.triggers.findIndex(x=>x.id===tid); if (i<=0) return;
  [b.triggers[i-1], b.triggers[i]] = [b.triggers[i], b.triggers[i-1]];
  _saveBots();
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  renderBotEditor();
  if (wasOpen) setTimeout(()=>document.getElementById('tb-'+tid)?.classList.add('open'), 10);
}

function trigMoveDown(tid) {
  const b = _selBot(); if (!b) return;
  const i = b.triggers.findIndex(x=>x.id===tid); if (i<0||i>=b.triggers.length-1) return;
  [b.triggers[i], b.triggers[i+1]] = [b.triggers[i+1], b.triggers[i]];
  _saveBots();
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  renderBotEditor();
  if (wasOpen) setTimeout(()=>document.getElementById('tb-'+tid)?.classList.add('open'), 10);
}

function trigRerender(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const i = b.triggers.indexOf(t);
  const card = document.getElementById('tc-'+tid); if (!card) return;
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  const tmp = document.createElement('div');
  tmp.innerHTML = renderTrigCard(b, t, i);
  card.replaceWith(tmp.firstElementChild);
  if (wasOpen) document.getElementById('tb-'+tid)?.classList.add('open');
}

// Conditions
function trigAddCond(tid, typ) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const defs = {
    wort:           {typ:'wort', wort:'', typ_msg:'any'},
    zone:           {typ:'zone', name:'', x:0, y:0, puffer:1},
    item_traegt:    {typ:'item_traegt', item:'', gruppe:''},
    trigger_war:    {typ:'trigger_war', trigId:''},
    player_betritt: {typ:'player_betritt'},
    rang:           {typ:'rang', rang_op:'=', rang_id:''},
    shop_kauf:      {typ:'shop_kauf', shop_id:''},
    ev_timer:       {typ:'ev_timer', sek:10},
    ev_interval:    {typ:'ev_interval', sek_min:30, sek_max:180},
  };
  t.bedingungen = t.bedingungen ?? [];
  // Neue Typen bringen ihre Vorgabewerte im Verzeichnis mit
  const ausReg = COND_DEFS[typ] ? Object.assign({typ}, COND_DEFS[typ].vorgabe) : null;
  t.bedingungen.push(ausReg ?? defs[typ] ?? {typ});
  _saveBots();
  document.getElementById('conds-'+tid).innerHTML = t.bedingungen.map((c,ci)=>renderCond(b,tid,c,ci)).join('');
  document.getElementById('tb-'+tid)?.classList.add('open');
}

function condField(tid, ci, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.bedingungen[ci]) return;
  t.bedingungen[ci][field] = val; _saveBots();
}

function condLogik(tid, ci, logik) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.bedingungen[ci]) return;
  t.bedingungen[ci].logik = logik; _saveBots();
  condRerender(tid);
}

function condMoveUp(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci<=0) return;
  [t.bedingungen[ci-1], t.bedingungen[ci]] = [t.bedingungen[ci], t.bedingungen[ci-1]];
  _normLogik(t.bedingungen); _saveBots(); condRerender(tid);
}

function condMoveDown(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci>=t.bedingungen.length-1) return;
  [t.bedingungen[ci], t.bedingungen[ci+1]] = [t.bedingungen[ci+1], t.bedingungen[ci]];
  _normLogik(t.bedingungen); _saveBots(); condRerender(tid);
}

function condRemove(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.bedingungen.splice(ci,1); _normLogik(t.bedingungen); _saveBots();
  document.getElementById('conds-'+tid).innerHTML = t.bedingungen.map((c,ci2)=>renderCond(b,tid,c,ci2)).join('');
}

function condRerender(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  document.getElementById('conds-'+tid).innerHTML = (t.bedingungen||[]).map((c,ci)=>renderCond(b,tid,c,ci)).join('');
}

// ── IF-Bedingungen (zweite Ebene für IF/Else Entscheid) ───────
function renderIfCond(bot, tid, c, ci) {
  // Render using regular renderCond then swap all callback names to ifCond* variants
  return renderCond(bot, tid, c, ci)
    .replace(/\bcondField\b/g,    'ifCondField')
    .replace(/\bcondLogik\b/g,    'ifCondLogik')
    .replace(/\bcondMoveUp\b/g,   'ifCondMoveUp')
    .replace(/\bcondMoveDown\b/g, 'ifCondMoveDown')
    .replace(/\bcondRemove\b/g,   'ifCondRemove')
    .replace(/\bcondRerender\b/g, 'ifCondRerender')
    .replace(/id="cond-/g,        'id="ifcond-');
}
function trigAddIfCond(tid, typ) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const defs = {
    wort:           {typ:'wort',           wort:'',    logik:'und'},
    zone_rect:      {typ:'zone_rect',       x1:0,y1:0,x2:2,y2:2, logik:'und'},
    item_traegt:    {typ:'item_traegt',     item:'', gruppe:'', logik:'und'},
    item_traegt_nicht:{typ:'item_traegt_nicht',item:'',gruppe:'',logik:'und'},
    trigger_war:    {typ:'trigger_war',     trigId:'', logik:'und'},
    rang:           {typ:'rang',            rang_op:'=', rang_id:'', logik:'und'},
  };
  t.ifBedingungen = t.ifBedingungen ?? [];
  t.ifBedingungen.push(defs[typ] ?? {typ, logik:'und'});
  _saveBots();
  document.getElementById('ifconds-'+tid).innerHTML = (t.ifBedingungen||[]).map((c,ci)=>renderIfCond(b,tid,c,ci)).join('');
}
function ifCondField(tid, ci, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.ifBedingungen?.[ci]) return;
  t.ifBedingungen[ci][field] = val; _saveBots();
}
function ifCondLogik(tid, ci, logik) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.ifBedingungen?.[ci]) return;
  t.ifBedingungen[ci].logik = logik; _saveBots();
  ifCondRerender(tid);
}
function ifCondMoveUp(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci<=0) return;
  [t.ifBedingungen[ci-1], t.ifBedingungen[ci]] = [t.ifBedingungen[ci], t.ifBedingungen[ci-1]];
  _normLogik(t.ifBedingungen); _saveBots(); ifCondRerender(tid);
}
function ifCondMoveDown(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci>=(t.ifBedingungen?.length??0)-1) return;
  [t.ifBedingungen[ci], t.ifBedingungen[ci+1]] = [t.ifBedingungen[ci+1], t.ifBedingungen[ci]];
  _normLogik(t.ifBedingungen); _saveBots(); ifCondRerender(tid);
}
function ifCondRemove(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.ifBedingungen.splice(ci,1); _normLogik(t.ifBedingungen); _saveBots();
  document.getElementById('ifconds-'+tid).innerHTML = (t.ifBedingungen||[]).map((c,ci2)=>renderIfCond(b,tid,c,ci2)).join('');
}
function ifCondRerender(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  document.getElementById('ifconds-'+tid).innerHTML = (t.ifBedingungen||[]).map((c,ci)=>renderIfCond(b,tid,c,ci)).join('');
}

// Actions
function trigAddAct(tid, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = branch === 'sonst' ? 'aktionen_sonst' : 'aktionen';
  t[arr] = t[arr] ?? [];
  t[arr].push({typ:'chat', delay:0, text:''});
  _saveBots();
  const listId = branch === 'sonst' ? 'acts-sonst-'+tid : 'acts-'+tid;
  const el = document.getElementById(listId);
  if (el) el.innerHTML = t[arr].map((a,ai)=>renderAct(tid,a,ai,branch)).join('');
  document.getElementById('tb-'+tid)?.classList.add('open');
}

function trigSetIfElse(tid, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.ifElse = val;
  if (val && !t.aktionen_sonst)  t.aktionen_sonst  = [];
  if (val && !t.ifBedingungen)   t.ifBedingungen   = [];
  _saveBots();
  trigRerender(tid);
}

function _getActArr(t, branch) {
  return branch === 'sonst' ? (t.aktionen_sonst ?? []) : (t.aktionen ?? []);
}
function _setActArr(t, branch, arr) {
  if (branch === 'sonst') t.aktionen_sonst = arr;
  else t.aktionen = arr;
}

function actField(tid, ai, field, val, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  if (!arr[ai]) return;
  arr[ai][field] = val; _saveBots();
}

function actRerender(tid, ai, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  if (!arr[ai]) return;
  const actId = branch === 'sonst' ? 'act-sonst-'+tid+'-'+ai : 'act-'+tid+'-'+ai;
  const el = document.getElementById(actId);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,arr[ai],ai,branch); el.replaceWith(tmp.firstElementChild); }
}

function actChangeType(tid, ai, typ, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  const delay = arr[ai]?.delay ?? 0;
  arr[ai] = {typ, delay};
  if (typ === 'teleport') {
    arr[ai].tpSlots = [{ x: 0, y: 0 }];
    arr[ai].keinFallbackMsg = '';
  }
  _saveBots();
  const actId = branch === 'sonst' ? 'act-sonst-'+tid+'-'+ai : 'act-'+tid+'-'+ai;
  const el = document.getElementById(actId);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,arr[ai],ai,branch); el.replaceWith(tmp.firstElementChild); }
}

function actRemove(tid, ai, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  arr.splice(ai,1); _setActArr(t, branch, arr); _saveBots();
  const listId = branch === 'sonst' ? 'acts-sonst-'+tid : 'acts-'+tid;
  const el = document.getElementById(listId);
  if (el) el.innerHTML = arr.map((a,ai2)=>renderAct(tid,a,ai2,branch)).join('');
}

function actMoveUp(tid, ai, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t||ai<=0) return;
  const arr = _getActArr(t, branch);
  [arr[ai-1], arr[ai]] = [arr[ai], arr[ai-1]];
  _saveBots();
  const listId = branch === 'sonst' ? 'acts-sonst-'+tid : 'acts-'+tid;
  const el = document.getElementById(listId);
  if (el) el.innerHTML = arr.map((a,ai2)=>renderAct(tid,a,ai2,branch)).join('');
}

function actMoveDown(tid, ai, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  if (ai >= arr.length-1) return;
  [arr[ai], arr[ai+1]] = [arr[ai+1], arr[ai]];
  _saveBots();
  const listId = branch === 'sonst' ? 'acts-sonst-'+tid : 'acts-'+tid;
  const el = document.getElementById(listId);
  if (el) el.innerHTML = arr.map((a,ai2)=>renderAct(tid,a,ai2,branch)).join('');
}

// ── TP Slot helpers ───────────────────────────────────────────────
function tpSlotAdd(tid, ai, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  const a = arr[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  a.tpSlots.push({ x: 0, y: 0 });
  _saveBots();
  actRerender(tid, ai, branch);
}

function tpSlotRemove(tid, ai, si, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  const a = arr[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  a.tpSlots.splice(si, 1);
  _saveBots();
  actRerender(tid, ai, branch);
}

function tpSlotField(tid, ai, si, field, val, branch) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const arr = _getActArr(t, branch);
  const a = arr[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  if (!a.tpSlots[si]) return;
  a.tpSlots[si][field] = val;
  _saveBots();
}

// ── Unified Item/Curse/Profile Picker ─────────────────────────
function ipickerOpenForAct(tid, ai, branch) {
  _ipickerForActContext = {tid, ai, branch};
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const t = b.triggers.find(x=>x.id===tid); if (!t) return;
    const arr = branch === 'sonst' ? (t.aktionen_sonst ?? []) : t.aktionen;
    const a = arr[ai]; if (!a) return;
    // Clear old type data
    delete a.item; delete a.gruppe; delete a.farbe;
    delete a.curseKey; delete a.curseName; delete a.curseEntry;
    delete a.profilName; delete a.profilItems; delete a.itemConfig;

    if (v.type === 'item') {
      if (v.itemConfig) {
        a.itemConfig = v.itemConfig;
        a.item   = v.itemConfig.asset;
        a.gruppe = v.itemConfig.group;
      } else {
        a.item   = v.name;
        a.gruppe = v.group;
        a.farbe  = '#ffffff';
      }
    } else if (v.type === 'curse') {
      a.curseKey  = v.key;
      a.curseName = v.name;
      a.curseEntry = v.entry;
    } else if (v.type === 'profil') {
      a.profilName  = v.name;
      a.profilItems = PROFILES[v.name]?.items ?? [];
    }
    _saveBots();
    actRerender(tid, ai, branch);
  });
}

function ipickerOpenForActAntiStrip(tid, ai, branch) {
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const t = b.triggers.find(x=>x.id===tid); if (!t) return;
    const arr = branch === 'sonst' ? (t.aktionen_sonst ?? []) : t.aktionen;
    const a = arr[ai]; if (!a) return;
    delete a.antiStrip_ersatz; delete a.antiStrip_gruppe; delete a.antiStrip_farbe;
    delete a.antiStrip_itemConfig; delete a.antiStrip_curseName; delete a.antiStrip_curseEntry;
    if (v.type === 'item') {
      if (v.itemConfig) {
        a.antiStrip_itemConfig = v.itemConfig;
        a.antiStrip_ersatz = v.itemConfig.asset;
        a.antiStrip_gruppe = v.itemConfig.group;
        a.antiStrip_farbe  = v.itemConfig.colors?.[0] ?? '#ff0000';
      } else {
        a.antiStrip_ersatz = v.name;
        a.antiStrip_gruppe = v.group;
        a.antiStrip_farbe  = '#ff0000';
      }
    } else if (v.type === 'curse') {
      a.antiStrip_curseName  = v.name;
      a.antiStrip_curseEntry = v.entry;
      a.antiStrip_gruppe     = v.entry?.Gruppe ?? '';
    }
    _saveBots();
    actRerender(tid, ai, branch);
  });
}

function ipickerOpen(defaultTab, cb) {
  _ipickerCb  = cb;
  _ipickerTab = defaultTab;
  document.getElementById('ipickerOverlay').style.display = 'flex';
  document.getElementById('ipickerSearch').value = '';
  _ipickerRenderTabs();
  ipickerRender();
}

function ipickerClose() {
  document.getElementById('ipickerOverlay').style.display = 'none';
  _ipickerCb = null;
}

function _ipickerRenderTabs() {
  const tabs = [{id:'item',l:'📦 BC-Items'},{id:'curse',l:'🔮 Curses'},{id:'profil',l:'👗 Profile'}];
  document.getElementById('ipickerTabs').innerHTML = tabs.map(t=>
    `<span class="ipicker-tab${_ipickerTab===t.id?' on':''}" onclick="ipickerSetTab('${t.id}')">${t.l}</span>`
  ).join('');
}

function ipickerSetTab(tab) {
  if (tab === 'item') {
    // If there's a pending action context, go to Item Manager with button
    if (_ipickerCb) {
      _trigPending = {cb: _ipickerCb, tid: _ipickerForActContext?.tid, ai: _ipickerForActContext?.ai};
      _ipickerCb = null;
      _ipickerForActContext = null;
    }
    ipickerClose();
    switchTab('items');
    // Show "Zum Trigger hinzufügen" banner in item manager
    _showTriggerAddBanner();
    return;
  }
  _ipickerTab = tab; _ipickerRenderTabs(); ipickerRender();
}

// Lookup cache: avoids putting complex objects in onclick attributes
const _ipickerCache = {};
let _ipickerCacheIdx = 0;

function ipickerRender() {
  const search = (document.getElementById('ipickerSearch')?.value??'').toLowerCase();
  const el = document.getElementById('ipickerList');
  if (!el) return;
  // Reset cache on each render
  Object.keys(_ipickerCache).forEach(k => delete _ipickerCache[k]);
  _ipickerCacheIdx = 0;

  let html = '';
  if (_ipickerTab === 'curse') {
    const entries = Object.entries(CURSE_DB).filter(([k,e])=>
      !search || k.toLowerCase().includes(search) || (e.CraftName||'').toLowerCase().includes(search) || (e.ItemName||'').toLowerCase().includes(search)
    ).slice(0, 150);
    if (!entries.length) { el.innerHTML='<div style="padding:20px;color:var(--text3);font-size:.72rem;text-align:center">Keine Curses. Bitte Craft & Curse scannen/importieren.</div>'; return; }
    html = entries.map(([k,e])=>{
      const idx = _ipickerCacheIdx++;
      _ipickerCache[idx] = {type:'curse', key:k, name:e.CraftName||e.ItemName, entry:e};
      return `<div class="ipicker-row" onclick="ipickerSelectIdx(${idx})">
        <span class="ipicker-tag purple">${escHtml(e.Gruppe||'?')}</span>
        <span style="flex:1">${escHtml(e.CraftName||e.ItemName)}</span>
        <span style="color:var(--text3);font-size:.6rem">${escHtml(e.Besitzer?.Name||'')}</span>
        ${e.IstLSCGCurse?'<span class="ipicker-tag green">🧿</span>':''}
      </div>`;
    }).join('');
  } else if (_ipickerTab === 'profil') {
    const profiles = Object.keys(PROFILES).filter(p=>!search||p.toLowerCase().includes(search));
    if (!profiles.length) { el.innerHTML='<div style="padding:20px;color:var(--text3);font-size:.72rem;text-align:center">Keine Profile. Zuerst ein Outfit-Profil speichern.</div>'; return; }
    html = profiles.map(p=>{
      const idx = _ipickerCacheIdx++;
      _ipickerCache[idx] = {type:'profil', name:p};
      return `<div class="ipicker-row" onclick="ipickerSelectIdx(${idx})">
        <span class="ipicker-tag green">👗</span>
        <span style="flex:1">${escHtml(p)}</span>
        <span style="color:var(--text3);font-size:.6rem">${PROFILES[p]?.date||''}</span>
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
}

function ipickerSelectIdx(idx) {
  const val = _ipickerCache[idx];
  if (!val) return;
  ipickerSelect(val);
}

function ipickerSelect(val) {
  if (_ipickerCb) {
    const cb = _ipickerCb;
    ipickerClose(); // close first so cb can re-open if needed
    cb(val);
  } else {
    ipickerClose();
  }
}

// ── Item Manager Integration ──────────────────────────────────
// Shows a banner in item manager: "Zum Trigger hinzufügen" per selected item
function _showTriggerAddBanner() {
  // Remove old banner if exists
  document.getElementById('_trigBanner')?.remove();
  if (!_trigPending) return;
  const banner = document.createElement('div');
  banner.id = '_trigBanner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:400;background:#1e1040;border-top:2px solid var(--purple);padding:8px 18px;display:flex;align-items:center;gap:12px;font-size:.73rem';
  const _ziel = window._shopPickActive ? 'Shop' : 'Trigger';
  banner.innerHTML = `<span style="color:var(--pl)">🎯 Item für ${_ziel} wählen:</span>
    <span style="color:var(--text3);flex:1">Klicke ein Item in der Sidebar, dann auf <b style="color:var(--pl)">➕ Zum ${_ziel}</b></span>
    <button onclick="_cancelTrigPending()" style="background:var(--rd);border:none;color:var(--red);border-radius:5px;padding:4px 10px;cursor:pointer;font-size:.68rem">✕ Abbrechen</button>`;
  document.body.appendChild(banner);

  // Patch the action buttons area to show "Zum Trigger" button
  _patchItemManagerForTrigger();
}

function _patchItemManagerForTrigger() {
  // Observe the btn-row to add our button when an item is selected
  // FIX: Use module-level _origBuildConf (no const/let) so _restoreBuildConf() can access it
  if (!window.buildConfigurator) return;
  _origBuildConf = window.buildConfigurator;
  window.buildConfigurator = function(...args) {
    _origBuildConf.apply(this, args);
    _injectTriggerButton();
  };
}

function _injectTriggerButton() {
  if (!_trigPending) { _restoreBuildConf(); return; }
  const btnRow = document.querySelector('.btn-row');
  if (!btnRow || document.getElementById('_trigAddBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_trigAddBtn';
  btn.className = 'btn btn-green';
  btn.style.cssText = 'min-width:130px;font-size:.8rem;border:2px solid var(--green)';
  btn.textContent = window._shopPickActive ? '➕ Zum Shop' : '➕ Zum Trigger';
  btn.onclick = _addCurrentItemToTrigger;
  btnRow.appendChild(btn);
}

function _addCurrentItemToTrigger() {
  const cur = window._BCCurrent ? window._BCCurrent() : null;
  if (!_trigPending || !cur) { showStatus('❌ Kein Item ausgewählt – bitte erst ein Item in der Sidebar anklicken','error'); return; }
  const { group, asset, cfg } = cur;

  // Serialize current Item Manager config (TypeRecord, colors, props)
  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...(dimSelected[key]??new Set([0]))].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const colors = (typeof getColors === 'function') ? getColors() : ['#ffffff'];
  const props = {};
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of (dimSelected[key]??[0])) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [p,v] of Object.entries(sp)) if (v!=null) props[p] = v;
    }
  }
  for (const [p,v] of Object.entries(globalPropVals||{})) if (v!=null) props[p] = v;
  const typeStr = Object.entries(tr).map(([k,v])=>k+v).join('');

  // Craft (Name/Beschreibung) aus dem Item Manager auslesen
  const craftName = document.getElementById('craftName')?.value.trim() ?? '';
  const craftDesc = document.getElementById('craftDesc')?.value.trim() ?? '';
  const craftProp = document.getElementById('craftProp')?.value ?? 'Leash_Full';
  const firstColor = colors.find(c => c !== 'Default') ?? '#808080';
  const craft = craftName ? { Name: craftName, Description: craftDesc, Property: craftProp, Color: firstColor, Lock: '', Item: asset, Private: false } : null;

  // Lock aus dem Item Manager auslesen
  const lockType = document.getElementById('lockType')?.value ?? '';
  let lockParams = { timer: 0, combo: '', password: '', relMember: 0, relTimer: 0 };
  if (lockType) {
    const isRelLock = REL_LOCKS.includes(lockType);
    if (lockType.includes('Timer') && !isRelLock) {
      const lh = parseInt(document.getElementById('timerH')?.value) || 0;
      const lm = parseInt(document.getElementById('timerM')?.value) || 0;
      const ls = parseInt(document.getElementById('timerS')?.value) || 0;
      lockParams.timer = (lh * 3600 + lm * 60 + ls) * 1000;
    }
    if (lockType === 'CombinationPadlock') lockParams.combo = document.getElementById('comboCode')?.value || '1234';
    if (PW_LOCKS.includes(lockType))       lockParams.password = document.getElementById('lockPassword')?.value || '1234';
    if (isRelLock) {
      lockParams.relMember = parseInt(document.getElementById('relMemberNum')?.value) || 0;
      lockParams.relTimer  = (parseInt(document.getElementById('relTimerH')?.value) || 0) * 3600 * 1000;
    }
  }

  const itemConfig = { asset, group, colors, tr, typeStr, props, archetype: cfg.archetype, craft, lock: lockType, lockParams };
  const val = { type:'item', name: asset, group: group, itemConfig };
  const _wasShop = window._shopPickActive;
  const _pendingTid = _trigPending?.tid; // save before cancel
  _trigPending.cb(val);
  _cancelTrigPending();
  if (_wasShop) { if(typeof switchTab==='function')switchTab('shop'); showStatus('✅ ' + asset + ' zum Shop-Artikel hinzugefügt','success'); return; }
  switchTab('bot');
  showStatus('✅ ' + asset + ' mit vollständiger Konfiguration zum Trigger hinzugefügt','success');
  // Trigger-Body öffnen + scrollen
  if (_pendingTid) {
    setTimeout(() => {
      const tb = document.getElementById('tb-' + _pendingTid);
      if (tb && !tb.classList.contains('open')) tb.classList.add('open');
      document.getElementById('tc-' + _pendingTid)?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 50);
  }
}

let _origBuildConf = null;
function _restoreBuildConf() {
  if (_origBuildConf) { window.buildConfigurator = _origBuildConf; _origBuildConf = null; }
}

function _cancelTrigPending() {
  _trigPending = null;
  document.getElementById('_trigBanner')?.remove();
  document.getElementById('_trigAddBtn')?.remove();
  _restoreBuildConf();
}

// ── Config Export / Import ────────────────────────────────────
// ── Trigger per JSON importieren (einzeln oder Array) → zum gewählten Bot hinzufügen ──
function _importTriggersJSON(data){
  const b = _selBot(); if(!b){ showStatus('❌ Kein Bot ausgewählt','error'); return; }
  const arr = Array.isArray(data) ? data : (Array.isArray(data.triggers) ? data.triggers : [data]);
  b.triggers = b.triggers || [];
  const _rid = (typeof _resolveRankIdByName==='function') ? _resolveRankIdByName : (()=>'');
  let n = 0, rangWarn = 0;
  const imported = [];
  // Rang per Name auflösen (rang-Aktion mit rang_op:setzen ODER rang-Bedingung)
  const resolveRang = o => {
    if(o && o.typ==='rang' && !o.rang_id){
      const nm = o.rang || o.rang_name || o.rangName;
      if(nm){ const id=_rid(nm); if(id) o.rang_id=id; else rangWarn++; }
    }
  };
  arr.forEach((t,i)=>{
    if(!t || typeof t!=='object') return;
    const trig = Object.assign({ name:'Importierter Trigger', aktiv:true, delay:0, bedingungen:[], aktionen:[] }, t);
    trig.id = 't'+Date.now()+Math.floor(Math.random()*99999)+'_'+i;
    trig.bedingungen = Array.isArray(trig.bedingungen) ? trig.bedingungen : [];
    trig.aktionen    = Array.isArray(trig.aktionen)    ? trig.aktionen    : [];
    if(!Array.isArray(trig.aktionen_sonst)) trig.aktionen_sonst = [];
    // Freundliche Aliase für Kopf-Felder (Delay/Wiederholung/Cooldown/Global-Pro-Spieler)
    if(trig.cooldown!=null && trig.cooldownSek==null) trig.cooldownSek = trig.cooldown;
    if(trig.delayMs!=null && trig.delay==null) trig.delay = trig.delayMs;
    if(typeof trig.global==='boolean')     trig.charSpec = !trig.global;        // global:true  -> charSpec false
    if(typeof trig.proSpieler==='boolean') trig.charSpec = trig.proSpieler;     // proSpieler:true -> charSpec true
    if(typeof trig.perPlayer==='boolean')  trig.charSpec = trig.perPlayer;
    if(typeof trig.vorbedingung==='string') trig.charSpec = /pro|spieler|player|each|selbst/i.test(trig.vorbedingung);
    if(trig.wiederholung!=null){
      const _w = String(trig.wiederholung).toLowerCase();
      if(/unbegrenzt|immer|infinite|∞|loop/.test(_w)) trig.wiederholung='immer';
      else if(/einmal|once/.test(_w)) trig.wiederholung='einmal';
      else { const _num=parseInt(_w); if(!isNaN(_num)){ if(_num<=1) trig.wiederholung='einmal'; else { trig.wiederholung='n_mal'; if(trig.maxMal==null) trig.maxMal=_num; } } }
    }
    delete trig.cooldown; delete trig.delayMs; delete trig.global; delete trig.proSpieler; delete trig.perPlayer; delete trig.vorbedingung;
    trig.aktionen.forEach(resolveRang);
    trig.aktionen_sonst.forEach(resolveRang);
    trig.bedingungen.forEach(resolveRang);
    b.triggers.push(trig); imported.push(trig); n++;
  });
  // Vortrigger (trigger_war) per Name auflösen – nach dem Import, damit Querverweise im Batch greifen
  imported.forEach(trig=>{
    (trig.bedingungen||[]).forEach(c=>{
      if(c && c.typ==='trigger_war' && !c.trigId){
        const nm = c.trigger || c.trig_name || c.trigName;
        if(nm){ const ref=b.triggers.find(x=>(x.name||'').toLowerCase()===String(nm).toLowerCase()); if(ref) c.trigId=ref.id; }
      }
    });
  });
  _saveBots(); renderBotList(); renderBotEditor();
  showStatus('✅ '+n+' Trigger importiert'+(rangWarn?(' · ⚠ '+rangWarn+'× Rang-Name nicht gefunden'):'')+' (Item/Curse/Outfit ggf. im Tool wählen)','success');
}
function botExportTriggersJSON(){
  const b = _selBot(); if(!b){ showStatus('❌ Kein Bot ausgewählt','error'); return; }
  // Trigger ohne interne IDs exportieren (sauberer zum Wiederverwenden/Schreiben)
  const triggers = (b.triggers||[]).map(t=>{ const c=JSON.parse(JSON.stringify(t)); delete c.id; return c; });
  const blob = new Blob([JSON.stringify(triggers,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = 'Trigger_'+(b.name||'bot').replace(/\W+/g,'_')+'.json'; a.click(); URL.revokeObjectURL(a.href);
  showStatus('✅ '+triggers.length+' Trigger als JSON exportiert','success');
}

function botExportConfig() {
  const b = _selBot(); if (!b) { showStatus('❌ Kein Bot ausgewählt','error'); return; }
  // Include logs for this bot + system events
  const botLogs = (window._BCBotLog||[]).filter(e => e.botName === b.name || e.trigId === '__system__');
  const pkg = { ...b, _exportedLogs: botLogs, _exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='BCBot_'+b.name.replace(/\W+/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); URL.revokeObjectURL(url);
  showStatus('✅ Bot + Logs exportiert','success');
}

function botImportConfig() {
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json';
  inp.onchange = e => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        // Restore logs if present
        if (Array.isArray(d._exportedLogs) && d._exportedLogs.length) {
          window._BCBotLog = window._BCBotLog ?? [];
          // Merge: add imported logs that aren't already present (by ts+player)
          const existing = new Set(window._BCBotLog.map(l=>l.ts+'_'+l.player));
          d._exportedLogs.forEach(l => { if (!existing.has(l.ts+'_'+l.player)) window._BCBotLog.push(l); });
          window._BCBotLog.sort((a,b)=>b.ts-a.ts);
        }
        delete d._exportedLogs; delete d._exportedAt;
        const cur = _selBot();
        if (cur && confirm('Aktuellen Bot überschreiben?\n(Abbrechen = Als neuen Bot importieren)')) {
          Object.assign(cur, d, {id:cur.id}); _selBotId = cur.id;
          // FIX: rebuild roomEver with the correct final ID (cur.id, not the imported d.id)
          _rebuildRoomEverFromLogs(cur.id);
        } else {
          d.id = 'b'+Date.now(); _bots.push(d); _selBotId = d.id;
          // FIX: rebuild roomEver AFTER assigning the new ID so the correct ID is used
          _rebuildRoomEverFromLogs(d.id);
        }
        _saveBots(); renderBotList(); renderBotEditor();
        showStatus('✅ Bot importiert','success');
      } catch(err) { showStatus('❌ '+err.message,'error'); }
    };
    r.readAsText(e.target.files[0]);
  };
  inp.click();
}

// Gibt Set<memberNum> aller Spieler zurück die laut Logs je da waren
function _getKnownMembersFromLogs(botId) {
  const known = new Set();
  (window._BCBotLog||[]).forEach(e => {
    if (e.memberNum && (e.botId === botId || !botId)) known.add(e.memberNum);
  });
  return known;
}

// Gibt Set<memberNum> zurück die laut Logs im Raum sind (joined aber nicht verlassen)
function _getPresentMembersFromLogs(botId) {
  // Replay join/leave events chronologically
  const entries = (window._BCBotLog||[]).filter(e => e.botId === botId && (e.status==='join'||e.status==='leave'));
  entries.sort((a,b) => a.ts - b.ts);
  const present = new Set();
  entries.forEach(e => {
    if (e.status === 'join') present.add(e.memberNum);
    else if (e.status === 'leave') present.delete(e.memberNum);
  });
  return present;
}

// Rebuild roomEver from log entries (called after log import)
function _rebuildRoomEverFromLogs(botId) {
  if (!_connected) return;
  const known = _getKnownMembersFromLogs(botId);
  const present = _getPresentMembersFromLogs(botId);
  const b = _bots.find(x=>x.id===botId) ?? _selBot();
  if (!b) return;
  const safeId = b.id.replace(/\W/g,'_');
  const everArr = JSON.stringify([...known]);
  bcSend({type:'EXEC', code:`(()=>{const s=window['__BCKBotState_${safeId}']??{};s.roomEver=${everArr};window['__BCKBotState_${safeId}']=s;try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');ls['${safeId}']=s;localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}console.log('[Bot] roomEver aus Logs: ',${everArr}.length,' bekannt');})();`});
}

// Logs in IndexedDB persistieren
function _saveLogsToStorage() {
  idbSet('BCBot_Logs', window._BCBotLog || []);
}
function _loadLogsFromStorage() {
  // no-op: wird async in bot-data.js geladen
}
