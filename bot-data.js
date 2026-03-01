// ══ BOT ENGINE ══════════════════════════════════════════════

const BOT_KEY = 'BC_Bots_v2';
const MONEY_KEY = 'BC_Money_v1';

// Money storage: { settings: {name, queryCmd}, balances: { memberNum: {name, balance} } }
let _money = { settings: { name: 'Gold', queryCmd: '!gold', queryTyp: 'whisper' }, balances: {} };
(()=>{ try { const s=localStorage.getItem(MONEY_KEY); if(s){ const d=JSON.parse(s); _money=Object.assign(_money,d); } } catch{} })();
function _saveMoney() { try { localStorage.setItem(MONEY_KEY, JSON.stringify(_money)); } catch {} }

let _bots      = [];
let _selBotId  = null;
let _ipickerCb = null;
let _ipickerTab= 'item';
// Item Manager integration: pending trigger context
let _trigPending = null; // {tid, ai, cb} – set when IM opened from trigger
let _ipickerForActContext = null; // {tid, ai} for restoring open state

// ── Persistence ───────────────────────────────────────────────
function _saveBots() {
  try { localStorage.setItem(BOT_KEY, JSON.stringify(_bots)); } catch {}
}
function _loadBots() {
  try { const s = localStorage.getItem(BOT_KEY); if (s) _bots = JSON.parse(s); } catch {}
}
function _selBot() { return _bots.find(b => b.id === _selBotId) ?? null; }

// ── Bot-Gruppen ────────────────────────────────────────────────
const BOT_GROUP_KEY = 'BC_BotGroups_v1';
let _botGroups = []; // [{id, name, botIds:[], open:bool}]

function _saveBotGroups() {
  try { localStorage.setItem(BOT_GROUP_KEY, JSON.stringify(_botGroups)); } catch {}
}
function _loadBotGroups() {
  try { const s = localStorage.getItem(BOT_GROUP_KEY); if (s) _botGroups = JSON.parse(s); } catch {}
}

function groupNew() {
  const inp = document.getElementById('bgNewName');
  const name = inp ? inp.value.trim() : '';
  if (!name) return;
  _botGroups.push({ id: 'g' + Date.now(), name, botIds: [], open: true });
  inp.value = '';
  _saveBotGroups();
  renderBotList();
}

function groupDelete(gid) {
  const g = _botGroups.find(x => x.id === gid);
  if (!g || !confirm(`Gruppe "${g.name}" löschen?`)) return;
  _botGroups = _botGroups.filter(x => x.id !== gid);
  _saveBotGroups();
  renderBotList();
}

function groupToggleOpen(gid) {
  const g = _botGroups.find(x => x.id === gid); if (!g) return;
  g.open = !g.open;
  _saveBotGroups();
  renderBotList();
}

function groupAddBot(gid) {
  const sel = document.getElementById('bg-add-sel-' + gid);
  if (!sel) return;
  const bid = sel.value; if (!bid) return;
  const g = _botGroups.find(x => x.id === gid); if (!g) return;
  // Remove from other groups first
  _botGroups.forEach(grp => { grp.botIds = grp.botIds.filter(id => id !== bid); });
  g.botIds.push(bid);
  _saveBotGroups();
  renderBotList();
}

function groupRemoveBot(gid, bid) {
  const g = _botGroups.find(x => x.id === gid); if (!g) return;
  g.botIds = g.botIds.filter(id => id !== bid);
  _saveBotGroups();
  renderBotList();
}

function groupDeployAll(gid) {
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  const g = _botGroups.find(x => x.id === gid); if (!g) return;
  let started = 0;
  g.botIds.forEach(bid => {
    const b = _bots.find(x => x.id === bid); if (!b) return;
    if (!b.laufend) { botDeployById(bid); started++; }
  });
  showStatus(`▶️ Gruppe "${g.name}": ${started} Bot(s) gestartet`, 'success');
}

function groupStopAll(gid) {
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  const g = _botGroups.find(x => x.id === gid); if (!g) return;
  let stopped = 0;
  g.botIds.forEach(bid => {
    const b = _bots.find(x => x.id === bid); if (!b) return;
    if (b.laufend) { botStopById(bid); stopped++; }
  });
  showStatus(`⏹ Gruppe "${g.name}": ${stopped} Bot(s) gestoppt`, 'success');
}

function renderBotGroupList() {
  const el = document.getElementById('botGroupList');
  if (!el) return;
  if (!_botGroups.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = _botGroups.map(g => {
    const memberBots = g.botIds.map(bid => _bots.find(b => b.id === bid)).filter(Boolean);
    const runningCount = memberBots.filter(b => b.laufend).length;
    const dotCls = runningCount === 0 ? '' : runningCount === memberBots.length ? 'all-on' : 'any-on';
    const ungroupedBots = _bots.filter(b => !_botGroups.some(grp => grp.botIds.includes(b.id)));
    const addOptions = ungroupedBots.map(b => `<option value="${b.id}">${escHtml(b.name)}</option>`).join('');

    return `
    <div class="bg-section">
      <div class="bg-hdr${g.open ? ' open' : ''}" onclick="groupToggleOpen('${g.id}')">
        <span class="bg-arrow">▶</span>
        <span class="bg-status-dot ${dotCls}"></span>
        <span class="bg-title">${escHtml(g.name)}</span>
        <span class="bg-count">${runningCount}/${memberBots.length}</span>
        <button class="bg-run-btn" onclick="event.stopPropagation();groupDeployAll('${g.id}')" title="Alle starten">▶ Alle</button>
        <button class="bg-stop-btn" onclick="event.stopPropagation();groupStopAll('${g.id}')" title="Alle stoppen">⏹ Alle</button>
        <button class="bg-del-btn" onclick="event.stopPropagation();groupDelete('${g.id}')" title="Gruppe löschen">✕</button>
      </div>
      <div class="bg-body${g.open ? ' open' : ''}">
        ${memberBots.length ? memberBots.map(b => `
          <div class="bg-bot-row${b.id === _selBotId ? ' sel' : ''}" onclick="botSelect('${b.id}')">
            <span class="bg-dot${b.laufend ? ' on' : ''}"></span>
            <span class="bg-bot-name">${escHtml(b.name)}</span>
            <button class="bot-toggle ${b.laufend ? 'on' : 'off'}" onclick="event.stopPropagation();botToggleLaufend('${b.id}')" title="${b.laufend ? 'Läuft' : 'Gestoppt'}"></button>
            <button class="bg-rm-btn" onclick="event.stopPropagation();groupRemoveBot('${g.id}','${b.id}')" title="Aus Gruppe entfernen">✕</button>
          </div>`).join('') : `<div style="padding:6px 14px;font-size:.69rem;color:var(--text3);font-style:italic">Keine Bots in dieser Gruppe</div>`}
        ${addOptions ? `
        <div class="bg-add-row">
          <select id="bg-add-sel-${g.id}">
            <option value="">Bot hinzufügen…</option>
            ${addOptions}
          </select>
          <button onclick="groupAddBot('${g.id}')">+ Hinzufügen</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}


// ── Tab entry ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════
//  BOT LOG SYSTEM
// ══════════════════════════════════════════════════════
window._BCBotLog = window._BCBotLog ?? [];
// Logs aus localStorage laden (persistiert über Konfigurator-Neustarts)
if (!window._BCBotLog.length) {
  try { const s=localStorage.getItem('BCBot_Logs'); if(s) window._BCBotLog=JSON.parse(s); } catch(e) {}
}
let _logFilter = '';

function logPush(entry) {
  window._BCBotLog.unshift(entry); // Neueste zuerst
  if (window._BCBotLog.length > 2000) window._BCBotLog.length = 2000; // Max 2000 Einträge
  _saveLogsToStorage(); // Persistent
  // Live-Update wenn Log-Tab aktiv
  if (document.getElementById('tab-log')?.classList.contains('active')) renderLogTab();
  // Badge auf Tab-Button aktualisieren
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs' + (window._BCBotLog.length ? ' ('+window._BCBotLog.length+')' : '');
}

function logFilter(f) {
  _logFilter = f;
  ['all','ok','ug','skip','join','leave'].forEach(k => document.getElementById('logf-'+k)?.classList.remove('active'));
  const map = {'':'all','ok':'ok','ungueltig':'ug','skip':'skip','join':'join','leave':'leave'};
  document.getElementById('logf-'+(map[f]??'all'))?.classList.add('active');
  renderLogTab();
}

function _logEntries() {
  if (!_logFilter) return window._BCBotLog;
  return window._BCBotLog.filter(e => {
    if (_logFilter === 'skip') return e.status.startsWith('skip');
    if (_logFilter === 'join') return e.status.startsWith('join') || e.status === 'leave';
    return e.status === _logFilter;
  });
}

// Gibt zurück ob ein Spieler laut Logs als "bekannt" gilt (war schon im Raum)
function _logKnownPlayers(botId) {
  const known = new Set();
  // Durchsuche Logs rückwärts (älteste zuerst = letztes Element im Array)
  const logs = [...window._BCBotLog].reverse();
  logs.forEach(e => {
    if (!botId || e.botId === botId) {
      if (e.status === 'join' || e.status === 'join_rejoin') {
        if (e.memberNum) known.add(e.memberNum);
      }
    }
  });
  return known;
}

function renderLogTab() {
  const entries = _logEntries();
  const count = document.getElementById('log-count');
  if (count) count.textContent = entries.length + ' / ' + window._BCBotLog.length + ' Einträge';

  const statusLabel = {
    ok:          '<span class="log-badge ok">✅ Ausgelöst</span>',
    ungueltig:   '<span class="log-badge ungueltig">❌ Ungültig</span>',
    skip_wdh:    '<span class="log-badge skip">⏭ Einmalig</span>',
    skip_max:    '<span class="log-badge skip">⏭ Max erreicht</span>',
    join:        '<span class="log-badge" style="background:#0a1a0a;color:#5f5;border:1px solid #1a5a1a">🆕 Erstes Mal</span>',
    join_rejoin: '<span class="log-badge" style="background:#0a0a2a;color:#88f;border:1px solid #1a1a5a">🔄 Rejoin</span>',
    leave:       '<span class="log-badge" style="background:#111;color:#777;border:1px solid #333">🚪 Verlassen</span>',
  };

  const html = entries.map((e, i) => {
    const d = new Date(e.ts);
    const ts = d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const pos = (e.x||e.y) ? `X${e.x} Y${e.y}` : '';
    const badge = statusLabel[e.status] ?? `<span class="log-badge skip">⏭ ${escHtml(e.status)}</span>`;
    const isJoinLeave = ['join','join_rejoin','leave'].includes(e.status);
    const cls = e.status === 'ok' ? 'log-ok' : e.status === 'ungueltig' ? 'log-ungueltig' : isJoinLeave ? '' : 'log-skip';
    const realIdx = window._BCBotLog.indexOf(e);
    const trigPart = isJoinLeave ? '' : `<span style="color:var(--text3);font-size:.65rem">→</span><span class="log-trig">🎯 ${escHtml(e.trigName||'')}</span><span style="color:var(--text3);font-size:.65rem">von</span>`;
    return `<div class="log-entry ${cls}" id="loge-${realIdx}">
      <span class="log-ts">${ts}</span>
      ${badge}
      <span class="log-bot">${escHtml(e.botName||'')}</span>
      ${trigPart}
      <span class="log-player">👤 ${escHtml(e.player||'')}</span>
      ${pos ? `<span class="log-pos">📍 ${pos}</span>` : ''}
      ${e.msg ? `<span style="font-size:.62rem;color:var(--text3);font-style:italic">${escHtml(e.msg)}</span>` : ''}
      <button onclick="logDeleteEntry(${realIdx})" style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:.7rem;padding:1px 5px;opacity:.5" onmouseover="this.style.opacity=1;this.style.color='var(--red)'" onmouseout="this.style.opacity=.5;this.style.color='var(--text3)'">✕</button>
    </div>`;
  }).join('');

  document.getElementById('log-entries').innerHTML = html || `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Noch keine Einträge</div>`;
}

function logDeleteEntry(idx) {
  window._BCBotLog.splice(idx, 1);
  _saveLogsToStorage();
  renderLogTab();
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs' + (window._BCBotLog.length ? ' ('+window._BCBotLog.length+')' : '');
}

function logClearFiltered() {
  const entries = _logEntries();
  entries.forEach(e => {
    const i = window._BCBotLog.indexOf(e);
    if (i >= 0) window._BCBotLog.splice(i, 1);
  });
  _saveLogsToStorage();
  renderLogTab();
}

function logClearAll() {
  window._BCBotLog.length = 0;
  // Auch Bot-States in BC zurücksetzen (alle laufenden Bots)
  _bots.forEach(b=>{
    const safeId = b.id.replace(/\W/g,'_');
    if (b.laufend) bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].clearState();else{delete window['__BCKBotState_${safeId}'];}` });
    // RoomEver löschen = nächstes Mal ist jeder "neu"
  });
  try { localStorage.removeItem('BC_RoomEver_v1'); } catch {}
  renderLogTab();
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs';
}

// ══════════════════════════════════════════════════════
//  EVENTS SYSTEM
// ══════════════════════════════════════════════════════

function renderEventsTab() {
  const bot = _selBot();
  const container = document.getElementById('events-container');
  if (!container) return;
  if (!bot) {
    container.innerHTML = `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Wähle zuerst einen Bot im 🤖 Bot-Tab.</div>`;
    return;
  }
  const events = bot.events ?? [];
  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-weight:600;font-size:.85rem">⚡ Events — Bot: <span style="color:var(--pl)">${escHtml(bot.name)}</span></span>
      <button class="be-addevent" onclick="eventNew()" style="width:auto;padding:4px 14px;display:inline-block">+ Event hinzufügen</button>
    </div>
    ${events.map((e,i)=>renderEventCard(bot,e,i)).join('')}
    ${events.length ? '' : '<div style="color:var(--text3);font-size:.73rem;text-align:center;margin-top:30px">Noch keine Events.<br>Events feuern Aktionen manuell oder automatisch auf Spieler im Raum.</div>'}
  `;
  container.innerHTML = html;
}

function _evBadge(e) {
  const beds = e.bedingungen ?? [];
  if (!e.aktiv) return {cls:'manual', lbl:'⏸ Pausiert'};
  if (beds.some(c=>c.typ==='ev_interval')) return {cls:'interval', lbl:'🔁 Intervall'};
  if (beds.some(c=>c.typ==='ev_timer'))    return {cls:'auto',     lbl:'⏱ Timer'};
  if (beds.some(c=>c.typ==='player_betritt')) return {cls:'betritt-ev', lbl:'🚪 Betritt'};
  if (beds.some(c=>c.typ==='wort'))        return {cls:'chat-ev',  lbl:'💬 Chat'};
  return {cls:'manual', lbl:'🖱 Manuell'};
}

function renderEventCard(bot, e, i) {
  const total = (bot.events||[]).length;
  const actN = (e.aktionen||[]).length;
  const condN = (e.bedingungen||[]).length;
  const bodyOpen = document.getElementById('evb-'+e.id)?.classList.contains('open');
  const ziel = e.ziel ?? 'ausloeser';
  const wdh = e.wiederholung ?? 'immer';
  const evVon = e.von ?? 'alle';
  const badge = _evBadge(e);

  const vonHtml = `<label style="font-size:.65rem;color:var(--text3)">Von:
    <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','von',this.value);evRerender('${e.id}')">
      <option value="alle"   ${evVon==='alle'?'selected':''}>👥 Alle</option>
      <option value="bot"    ${evVon==='bot'?'selected':''}>🤖 Bot (ich)</option>
      <option value="nummer" ${evVon==='nummer'?'selected':''}>🔢 Nummer…</option>
    </select></label>
  ${evVon==='nummer'?`<input class="cf cf-w80" type="number" placeholder="MemberNr" value="${e.vonNummer??''}" oninput="evField('${e.id}','vonNummer',+this.value)">`:``}`;

  return `<div class="event-card ${e.aktiv?'ev-on':''}" id="ec-${e.id}">
    <div class="event-head" onclick="evToggleBody('${e.id}')">
      <span style="display:flex;flex-direction:column;gap:1px">
        <button class="order-btn" onclick="event.stopPropagation();evMoveUp('${e.id}')" ${i===0?'disabled':''}>▲</button>
        <button class="order-btn" onclick="event.stopPropagation();evMoveDown('${e.id}')" ${i===total-1?'disabled':''}>▼</button>
      </span>
      <input type="checkbox" ${e.aktiv?'checked':''} onclick="event.stopPropagation();evField('${e.id}','aktiv',this.checked)" style="accent-color:var(--purple)">
      <span class="ev-type-badge ${badge.cls}">${badge.lbl}</span>
      <span class="ev-label">${escHtml(e.name||'Event')}</span>
      <span class="ev-meta">${condN} Bed. · ${actN} Akt.</span>
      <button onclick="event.stopPropagation();evFireImmediate('${e.id}')" style="font-size:.62rem;padding:2px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Sofort auslösen (ignoriert Timer/Wdh)">▶️ Feuern</button>
      <button onclick="event.stopPropagation();evDelete('${e.id}')" class="rm-btn">✕</button>
    </div>
    <div class="event-body ${bodyOpen?'open':''}" id="evb-${e.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--text3)">Name:
          <input class="cf cf-w160" style="margin-left:4px" value="${escHtml(e.name||'')}" oninput="evField('${e.id}','name',this.value)">
        </label>
        ${vonHtml}
        <label style="font-size:.65rem;color:var(--text3)">Ziel:
          <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','ziel',this.value);evRerender('${e.id}')">
            <option value="ausloeser" ${ziel==='ausloeser'?'selected':''}>👤 Player (Auslöser/Random)</option>
            <option value="alle"      ${ziel==='alle'?'selected':''}>👥 Alle im Raum</option>
            <option value="liste"     ${ziel==='liste'?'selected':''}>📋 Liste</option>
          </select>
        </label>
        ${ziel==='liste'?`<input class="cf" style="width:180px;font-size:.65rem" placeholder="MemberNr: 1234,5678"
          value="${escHtml((e.zielListe||[]).join(','))}"
          oninput="evField('${e.id}','zielListe',this.value.split(',').map(x=>+x.trim()).filter(Boolean))">`:``}
        <label style="font-size:.65rem;color:var(--text3)">🔁 Wdh.:
          <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','wiederholung',this.value);evRerender('${e.id}')">
            <option value="immer"    ${wdh==='immer'?'selected':''}>∞ Unbegrenzt</option>
            <option value="einmalig" ${wdh==='einmalig'?'selected':''}>1× Einmalig</option>
            <option value="n_mal"    ${wdh==='n_mal'?'selected':''}>N× N-mal</option>
          </select>
        </label>
        ${wdh==='n_mal'?`<input class="cf cf-w80" type="number" min="1" value="${e.maxMal??2}" oninput="evField('${e.id}','maxMal',+this.value)">×`:''}
      </div>

      <div class="te-section">
        <div class="te-section-title">🔎 Bedingungen
          <button onclick="evAddCond('${e.id}','ev_timer')" title="Einmalig nach X Sekunden">⏱ Timer</button>
          <button onclick="evAddCond('${e.id}','ev_interval')" title="Wiederholt alle X-Y Sekunden">🔁 Intervall</button>
          <button onclick="evAddCond('${e.id}','player_betritt')" title="Wenn Spieler den Raum betritt">🚪 Betritt</button>
          <button onclick="evAddCond('${e.id}','wort')">+ Wort</button>
          <button onclick="evAddCond('${e.id}','zone_rect')">+ Zone Bereich</button>
          <button onclick="evAddCond('${e.id}','zone')">+ Zone Punkt</button>
          <button onclick="evAddCond('${e.id}','item_traegt')">+ Item trägt</button>
          <button onclick="evAddCond('${e.id}','item_traegt_nicht')">+ Item trägt NICHT</button>
          <button onclick="evAddCond('${e.id}','trigger_war')">+ Vortrigger</button>
          <button onclick="evAddCond('${e.id}','rang')">🏆 Rang</button>
        </div>
        <div id="evconds-${e.id}">${(e.bedingungen||[]).map((c,ci)=>renderEvCond(bot,e.id,c,ci)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">⚡ Aktionen
          <button onclick="evAddAct('${e.id}')">+ Aktion</button>
        </div>
        <div id="evacts-${e.id}">${(e.aktionen||[]).map((a,ai)=>renderEvAct(e.id,a,ai)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">🔙 Fallback
          <small style="font-weight:normal;text-transform:none">(bei ❌ Trigger ungültig)</small>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="cf" style="width:140px" onchange="evField('${e.id}','fallbackTyp',this.value);evRerender('${e.id}')">
            <option value="nichts" ${(!e.fallbackTyp||e.fallbackTyp==='nichts')?'selected':''}>Nichts</option>
            <option value="chat"   ${e.fallbackTyp==='chat'?'selected':''}>💬 Chat</option>
            <option value="emote"  ${e.fallbackTyp==='emote'?'selected':''}>✨ Emote</option>
          </select>
          ${e.fallbackTyp&&e.fallbackTyp!=='nichts'?`<input class="cf cf-flex" value="${escHtml(e.fallbackText||'')}" oninput="evField('${e.id}','fallbackText',this.value)" placeholder="Nachricht…">`:``}
        </div>
      </div>
    </div>
  </div>`;
}

function renderEvCond(bot, eid, c, ci) {
  // Special standalone conditions (timer, interval, betritt)
  if (c.typ === 'ev_timer') {
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">⏱ Timer</div>
      <div class="cond-card" style="background:#0a2a0a;border-color:#1a5a1a">
        <div class="card-fields">
          <span style="font-size:.65rem;color:var(--text3)">Einmalig nach</span>
          <input class="cf cf-w80" type="number" min="0.1" step="0.1" value="${c.sek??10}"
            oninput="evCondField('${eid}',${ci},'sek',+this.value)">
          <span style="font-size:.65rem;color:var(--text3)">Sek</span>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  if (c.typ === 'ev_interval') {
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">🔁 Intervall</div>
      <div class="cond-card" style="background:#0a1a2a;border-color:#1a3a5a">
        <div class="card-fields">
          <span style="font-size:.65rem;color:var(--text3)">Alle</span>
          <input class="cf cf-w70" type="number" min="1" value="${c.sek_min??20}"
            oninput="evCondField('${eid}',${ci},'sek_min',+this.value)">
          <span style="font-size:.62rem;color:var(--text3)">–</span>
          <input class="cf cf-w70" type="number" min="1" value="${c.sek_max??60}"
            oninput="evCondField('${eid}',${ci},'sek_max',+this.value)">
          <span style="font-size:.65rem;color:var(--text3)">Sek</span>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  if (c.typ === 'player_betritt') {
    const bt = c.betritt_typ ?? 'alle';
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">🚪 Betritt</div>
      <div class="cond-card" style="background:#1a0a2a;border-color:#5a1a7a">
        <div class="card-fields">
          <select class="cf" onchange="evCondField('${eid}',${ci},'betritt_typ',this.value)">
            <option value="alle"   ${bt==='alle'?'selected':''}>Alle Spieler</option>
            <option value="neu"    ${bt==='neu'?'selected':''}>🆕 Nur Neue</option>
            <option value="rejoin" ${bt==='rejoin'?'selected':''}>🔄 Nur Rejoin</option>
          </select>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  // Standard conditions (same as trigger, different callbacks)
  const icons = {wort:'💬',zone:'🗺️',zone_rect:'📐',item_traegt:'👗',item_traegt_nicht:'🚫',trigger_war:'🔗',rang:'🏆'};
  let inner = '';
  if (c.typ === 'wort') {
    inner = `<input class="cf cf-w120" value="${escHtml(c.wort||'')}" oninput="evCondField('${eid}',${ci},'wort',this.value)" placeholder="Triggerwort">
      <select class="cf" onchange="evCondField('${eid}',${ci},'typ_msg',this.value)">
        <option value="any" ${(!c.typ_msg||c.typ_msg==='any')?'selected':''}>Chat+Emote+Whisper</option>
        <option value="chat" ${c.typ_msg==='chat'?'selected':''}>Nur Chat</option>
        <option value="emote" ${c.typ_msg==='emote'?'selected':''}>Nur Emote</option>
        <option value="whisper" ${c.typ_msg==='whisper'?'selected':''}>Nur Whisper</option>
      </select>`;
  } else if (c.typ === 'zone') {
    inner = `<input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="evCondField('${eid}',${ci},'name',this.value)" placeholder="Zonenname">
      X<input class="cf" style="width:46px" type="number" value="${c.x??0}" oninput="evCondField('${eid}',${ci},'x',+this.value)">
      Y<input class="cf" style="width:46px" type="number" value="${c.y??0}" oninput="evCondField('${eid}',${ci},'y',+this.value)">
      ±<input class="cf" style="width:38px" type="number" value="${c.puffer??1}" oninput="evCondField('${eid}',${ci},'puffer',+this.value)">`;
  } else if (c.typ === 'zone_rect') {
    inner = `<span style="font-size:.62rem;color:var(--text3)">Von</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x1??0}" oninput="evCondField('${eid}',${ci},'x1',+this.value)">
      Y<input class="cf" style="width:44px" type="number" value="${c.y1??0}" oninput="evCondField('${eid}',${ci},'y1',+this.value)">
      <span style="font-size:.62rem;color:var(--text3)">Bis</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x2??2}" oninput="evCondField('${eid}',${ci},'x2',+this.value)">
      Y<input class="cf" style="width:44px" type="number" value="${c.y2??2}" oninput="evCondField('${eid}',${ci},'y2',+this.value)">`;
  } else if (c.typ === 'item_traegt' || c.typ === 'item_traegt_nicht') {
    const negLabel = c.typ === 'item_traegt_nicht' ? '<span style="color:#e55;font-size:.65rem;font-weight:600;margin-right:4px">🚫 NICHT</span>' : '';
    inner = `${negLabel}<span style="font-size:.68rem;color:var(--text2)">${c.gruppe?escHtml(c.gruppe)+' / ':''}<b>${escHtml(c.item||'–')}</b></span>
      <button onclick="ipickerOpen('item',v=>{evCondField('${eid}',${ci},'item',v.asset||v.name);evCondField('${eid}',${ci},'gruppe',v.group);evCondRerender('${eid}');})" style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">📦 Wählen</button>`;
  } else if (c.typ === 'trigger_war') {
    const trigs = bot?.triggers ?? [];
    const opts = trigs.map(t=>`<option value="${t.id}" ${c.trigId===t.id?'selected':''}>${escHtml(t.name||t.id)}</option>`).join('');
    inner = `<select class="cf cf-w160" onchange="evCondField('${eid}',${ci},'trigId',this.value)">
        <option value="">– Trigger wählen –</option>${opts}
      </select>
      <span style="font-size:.62rem;color:var(--text3)">muss ausgelöst worden sein</span>`;
  } else if (c.typ === 'rang') {
    const rop = c.rang_op ?? '=';
    const ranks = _rankSorted();
    inner = `
      <select class="cf" style="width:80px" onchange="evCondField('${eid}',${ci},'rang_op',this.value);evCondRerender('${eid}')">
        <option value="="   ${rop==='='  ?'selected':''}>= Genau</option>
        <option value="min" ${rop==='min'?'selected':''}>≥ Min.</option>
        <option value="max" ${rop==='max'?'selected':''}>≤ Max.</option>
        <option value="kein"${rop==='kein'?'selected':''}>∅ Kein Rang</option>
      </select>
      ${rop!=='kein'?`<select class="cf" style="flex:1;min-width:130px" onchange="evCondField('${eid}',${ci},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${c.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}`;
  }
  const logik = c.logik ?? 'und';
  const logikBadge = ci === 0
    ? `<div class="cond-when-lbl">WENN</div>`
    : `<div style="display:flex;align-items:center;gap:0;margin:2px 0;padding-left:6px">
        <button onclick="evCondLogik('${eid}',${ci},'und')" class="logik-btn ${logik==='und'?'active':''}">UND</button>
        <button onclick="evCondLogik('${eid}',${ci},'oder')" class="logik-btn ${logik==='oder'?'active':''}">ODER</button>
        <button onclick="evCondLogik('${eid}',${ci},'und_nicht')" class="logik-btn ${logik==='und_nicht'?'active active-nicht':''}" style="border-left:none;border-radius:0 3px 3px 0" title="UND NICHT">UND NICHT</button>
      </div>`;
  return `<div class="cond-group ${logik==='oder'?'cond-group-oder':logik==='und_nicht'?'cond-group-nicht':''}" id="evcond-${eid}-${ci}">
    ${logikBadge}
    <div class="cond-card cond-op">
      <div class="card-fields">
        <span class="cond-num">${ci+1}</span>
        <span style="font-size:.7rem;font-weight:600;color:var(--purple)">${icons[c.typ]??'❓'}</span>
        ${inner}
      </div>
      <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
    </div>
  </div>`;
}

// Event actions reuse renderAct but with ev-specific field update
function renderEvAct(eid, a, ai) {
  // Temporarily set context for renderAct to use ev callbacks
  // Simple approach: render a stripped-down action card for events
  const types = [
    ['chat','💬 Chat'],['emote','✨ Emote'],['whisper','🤫 Whisper'],
    ['item','📦 Item'],['item_entf','🗑️ Item entf.'],['teleport','🌀 TP'],['money','💰 Money'],['rang','🏆 Rang'],
  ];
  const typeOpts = types.map(([v,l])=>`<option value="${v}" ${a.typ===v?'selected':''}>${l}</option>`).join('');
  let extra = '';
  if (['chat','emote','whisper'].includes(a.typ)) {
    extra = `<textarea class="cf" style="width:100%;resize:vertical;min-height:38px;margin-top:4px" rows="2"
        oninput="evActField('${eid}',${ai},'text',this.value)">${escHtml(a.text||'')}</textarea>
      <div style="font-size:.59rem;color:var(--text3);margin-top:2px">Variablen: {name} {wort} {x} {y}</div>`;
  } else if (a.typ === 'item') {
    const cfgInfo = a.itemConfig ? ` <span style="font-size:.58rem;background:var(--gd);color:var(--green);padding:1px 4px;border-radius:3px">✓ Konfig</span>` : '';
    const label = a.itemConfig ? `📦 ${a.itemConfig.group}/${a.itemConfig.asset}` : a.profilName ? `👗 ${a.profilName}` : a.curseName ? `🔮 ${a.curseName}` : a.item ? `📦 ${a.gruppe||'?'}/${a.item}` : '– nichts gewählt –';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:.7rem;color:var(--text2);flex:1">${escHtml(label)}${cfgInfo}</span>
        <button onclick="ipickerOpenForEvAct('${eid}',${ai})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Wählen</button>
      </div>`;
  } else if (a.typ === 'item_entf') {
    extra = `<input class="cf" style="width:100%;margin-top:4px" value="${escHtml(a.gruppe||'')}"
        oninput="evActField('${eid}',${ai},'gruppe',this.value)" placeholder="Gruppe (z.B. ItemMouth)">`;
  } else if (a.typ === 'teleport') {
    const slots = a.tpSlots ?? [];
    const slotsHtml = slots.map((s,si) => `<div class="tp-slot-row">
      <span class="tp-slot-badge ${si===0?'primary':'fallback'}">${si===0?'Primär':'FB '+(si)}</span>
      X<input class="cf" type="number" style="width:50px" value="${s.x??0}" oninput="evTpField('${eid}',${ai},${si},'x',+this.value)">
      Y<input class="cf" type="number" style="width:50px" value="${s.y??0}" oninput="evTpField('${eid}',${ai},${si},'y',+this.value)">
      <button onclick="evTpRemove('${eid}',${ai},${si})" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button>
    </div>`).join('');
    extra = `<div class="tp-slot-list">${slotsHtml}</div>
      <button class="tp-slot-add-btn" onclick="evTpAdd('${eid}',${ai})">+ Position/Fallback</button>`;
  } else if (a.typ === 'money') {
    const mop = a.money_op ?? 'add';
    const moneyName = _money?.settings?.name || 'Gold';
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:130px" onchange="evActField('${eid}',${ai},'money_op',this.value)">
        <option value="add" ${mop==='add'?'selected':''}>➕ Hinzufügen</option>
        <option value="sub" ${mop==='sub'?'selected':''}>➖ Abziehen</option>
        <option value="set" ${mop==='set'?'selected':''}>= Setzen auf</option>
        <option value="reset" ${mop==='reset'?'selected':''}>🔄 Zurücksetzen</option>
      </select>
      ${mop!=='reset'?`<input class="cf cf-w80" type="number" value="${a.money_val??1}" oninput="evActField('${eid}',${ai},'money_val',+this.value)">
        <span style="font-size:.68rem;color:var(--text3)">${escHtml(moneyName)}</span>`:''}
    </div>`;
  } else if (a.typ === 'rang') {
    const rop = a.rang_op ?? 'setzen';
    const ranks = _rankSorted();
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:155px" onchange="evActField('${eid}',${ai},'rang_op',this.value);document.getElementById('evacts-'+\`${eid}\`).innerHTML=((_selBot()?.events?.find(x=>x.id==='${eid}')?.aktionen)||[]).map((a2,ai2)=>renderEvAct('${eid}',a2,ai2)).join('')">
        <option value="setzen"    ${rop==='setzen'?'selected':''}>🏆 Rang setzen</option>
        <option value="entfernen" ${rop==='entfernen'?'selected':''}>❌ Rang entfernen</option>
        <option value="naechster" ${rop==='naechster'?'selected':''}>⬆️ Nächster Rang</option>
        <option value="vorheriger"${rop==='vorheriger'?'selected':''}>⬇️ Vorheriger Rang</option>
      </select>
      ${rop==='setzen'?`<select class="cf" style="flex:1;min-width:140px" onchange="evActField('${eid}',${ai},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${a.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}
    </div>`;
  }
  const bf = a.bei_fehler ?? 'ignorieren';
  return `<div class="act-card" id="evact-${eid}-${ai}">
    <div style="flex:1">
      <div style="display:flex;gap:6px;align-items:center">
        <span class="trig-order-num">${ai+1}</span>
        <select class="cf" style="flex:1" onchange="evActChangeType('${eid}',${ai},this.value)">${typeOpts}</select>
        <input class="cf cf-w80" type="number" value="${a.delay??0}" oninput="evActField('${eid}',${ai},'delay',+this.value)"> ms
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:5px;padding:5px 8px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:6px;flex-wrap:wrap">
        <span style="font-size:.62rem;font-weight:700;color:#60a5fa;white-space:nowrap">🎯 Ziel</span>
        <select class="cf" style="width:150px;font-size:.68rem" onchange="evActField('${eid}',${ai},'aktZiel',this.value);document.getElementById('evacts-'+\`${eid}\`).innerHTML=((_selBot()?.events?.find(x=>x.id==='${eid}')?.aktionen)||[]).map((a2,ai2)=>renderEvAct('${eid}',a2,ai2)).join('')">
          <option value="ausloeser" ${(!a.aktZiel||a.aktZiel==='ausloeser')?'selected':''}>👤 Auslöser</option>
          <option value="shop_kaeufer" ${a.aktZiel==='shop_kaeufer'?'selected':''}>💳 Käufer (bei Shop)</option>
          <option value="alle"      ${a.aktZiel==='alle'?'selected':''}>👥 Alle im Raum</option>
          <option value="whitelist" ${a.aktZiel==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
        ${a.aktZiel==='whitelist'?`<input class="cf" style="flex:1;min-width:150px;font-size:.68rem" value="${escHtml((a.aktZielNummern||[]).join(', '))}"
          oninput="evActField('${eid}',${ai},'aktZielNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0))"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
      </div>
      ${extra}
    </div>
    <button class="rm-btn" onclick="evActRemove('${eid}',${ai})">✕</button>
  </div>`;
}

// ── Event CRUD ───────────────────────────────────────────────
function eventNew() {
  const b = _selBot(); if (!b) return;
  if (!b.events) b.events = [];
  const e = {
    id:'ev'+Date.now(), name:'Neues Event', aktiv:true,
    ziel:'ausloeser', zielListe:[], wiederholung:'immer', maxMal:2,
    von:'alle', vonNummer:0,
    bedingungen:[], aktionen:[], fallbackTyp:'nichts', fallbackText:''
  };
  b.events.push(e); _saveBots(); renderEventsTab();
  setTimeout(()=>document.getElementById('evb-'+e.id)?.classList.add('open'),50);
}

function evDelete(eid) {
  const b = _selBot(); if (!b) return;
  b.events = (b.events||[]).filter(e=>e.id!==eid); _saveBots(); renderEventsTab();
}

function evToggleBody(eid) {
  document.getElementById('evb-'+eid)?.classList.toggle('open');
}

function evRerender(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const i = b.events.indexOf(e);
  const el = document.getElementById('ec-'+eid); if (!el) return;
  const wasOpen = document.getElementById('evb-'+eid)?.classList.contains('open');
  const tmp = document.createElement('div');
  tmp.innerHTML = renderEventCard(b, e, i);
  if (wasOpen) tmp.firstElementChild.querySelector('.event-body')?.classList.add('open');
  el.replaceWith(tmp.firstElementChild);
}

function evField(eid, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e[key] = val; _saveBots();
  if (key === 'name') evRerender(eid);
}

function evMoveUp(eid) {
  const b = _selBot(); if (!b) return;
  const i = b.events.findIndex(e=>e.id===eid); if (i<=0) return;
  [b.events[i-1],b.events[i]]=[b.events[i],b.events[i-1]]; _saveBots(); renderEventsTab();
}
function evMoveDown(eid) {
  const b = _selBot(); if (!b) return;
  const i = b.events.findIndex(e=>e.id===eid); if (i<0||i>=b.events.length-1) return;
  [b.events[i],b.events[i+1]]=[b.events[i+1],b.events[i]]; _saveBots(); renderEventsTab();
}

// Condition CRUD for events
function evAddCond(eid, typ) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.bedingungen = e.bedingungen || [];
  const def = {wort:{typ:'wort',wort:'',logik:'und'},zone:{typ:'zone',x:0,y:0,puffer:1,logik:'und'},item_traegt:{typ:'item_traegt',item:'',gruppe:'',logik:'und'},trigger_war:{typ:'trigger_war',trigId:'',logik:'und'},rang:{typ:'rang',rang_op:'=',rang_id:'',logik:'und'}};
  e.bedingungen.push(def[typ]||{typ,logik:'und'}); _saveBots();
  evCondRerender(eid);
}
function evCondRemove(eid, ci) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.bedingungen.splice(ci,1); _saveBots(); evCondRerender(eid);
}
function evCondField(eid, ci, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  if (e.bedingungen[ci]) e.bedingungen[ci][key]=val; _saveBots();
}
function evCondLogik(eid, ci, val) {
  evCondField(eid, ci, 'logik', val); evCondRerender(eid);
}
function evCondRerender(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const el = document.getElementById('evconds-'+eid); if (!el) return;
  el.innerHTML = (e.bedingungen||[]).map((c,ci)=>renderEvCond(b,eid,c,ci)).join('');
}

// Action CRUD for events
function evAddAct(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen = e.aktionen || [];
  e.aktionen.push({typ:'chat', text:'', delay:0}); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai)=>renderEvAct(eid,a,ai)).join('');
}
function evActRemove(eid, ai) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen.splice(ai,1); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evActField(eid, ai, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  if (e.aktionen[ai]) e.aktionen[ai][key]=val; _saveBots();
}
function evActChangeType(eid, ai, typ) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai] = {typ, delay:e.aktionen[ai]?.delay??0}; _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpAdd(eid, ai) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai].tpSlots = e.aktionen[ai].tpSlots||[];
  e.aktionen[ai].tpSlots.push({x:0,y:0,gueltig:true}); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpRemove(eid, ai, si) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai].tpSlots?.splice(si,1); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpField(eid, ai, si, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const slots = e.aktionen[ai].tpSlots||[];
  if (slots[si]) slots[si][key]=val; _saveBots();
}
function ipickerOpenForEvAct(eid, ai) {
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const e = b.events?.find(x=>x.id===eid); if (!e) return;
    const a = e.aktionen[ai]; if (!a) return;
    // Clear old type data (same as trigger)
    delete a.item; delete a.gruppe; delete a.farbe;
    delete a.curseKey; delete a.curseName; delete a.curseEntry;
    delete a.profilName; delete a.profilItems; delete a.itemConfig;
    if (v.type === 'item') {
      if (v.itemConfig) {
        a.itemConfig = v.itemConfig;
        a.item   = v.itemConfig.asset;
        a.gruppe = v.itemConfig.group;
      } else {
        a.item   = v.asset || v.name;
        a.gruppe = v.group;
        a.farbe  = '#ffffff';
      }
    } else if (v.type === 'curse') {
      a.curseKey   = v.key;
      a.curseName  = v.name;
      a.curseEntry = v.entry;
    } else if (v.type === 'profil') {
      a.profilName  = v.name;
      a.profilItems = PROFILES[v.name]?.items ?? [];
    }
    _saveBots();
    document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a2,ai2)=>renderEvAct(eid,a2,ai2)).join('');
  });
}

// Fire event manually from popup
function evFire(eid) { evFireImmediate(eid); }
function evFireImmediate(eid) {
  const b = _selBot(); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht verbunden','error'); return; }
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].fireEventNow('${eid}');else console.warn('[Bot] Nicht aktiv – erst starten');` });
  showStatus('▶️ Event sofort ausgelöst','success');
}

