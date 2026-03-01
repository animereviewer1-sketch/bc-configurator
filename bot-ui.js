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
      <button class="btn btn-primary" onclick="botExportConfig()" title="Export" style="font-size:.65rem;padding:4px 8px">⬇️</button>
      <button class="btn btn-primary" onclick="botImportConfig()" title="Import" style="font-size:.65rem;padding:4px 8px">⬆️</button>
    </div>
    <div class="bot-status ${statusCls}" id="bot-status-bar">${statusTxt}</div>
    <div class="be-body">
      <div id="trig-list">${(bot.triggers||[]).map((t,i)=>renderTrigCard(bot,t,i)).join('')}</div>
      <button class="be-addtrig" onclick="botAddTrig()">+ Trigger hinzufügen</button>
    </div>`;
  document.getElementById('botEditor').innerHTML = html;
  // Offene Trigger-Bodies wiederherstellen
  openTids.forEach(tid => document.getElementById('tb-'+tid)?.classList.add('open'));
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

// ── Trigger Cards ─────────────────────────────────────────────
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
      <span class="trig-label" id="tlabel-${t.id}">${escHtml(t.name||'Trigger')}</span>
      <span class="trig-meta">${condN} Bed. · ${actN} Akt. · <span style="color:${wdh_color}">${wdh_lbl}</span></span>
      <button onclick="event.stopPropagation();trigDelete('${t.id}')" class="rm-btn" title="Trigger löschen">✕</button>
    </div>
    <div class="trig-body" id="tb-${t.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--text3)">Name:</label>
        <input class="cf cf-w160" value="${escHtml(t.name||'')}" oninput="trigField('${t.id}','name',this.value)" placeholder="Trigger-Name">
        <label style="font-size:.65rem;color:var(--text3)">Delay:</label>
        <input class="cf cf-w80" type="number" value="${t.delay??0}" oninput="trigField('${t.id}','delay',+this.value)"> ms
        <label style="font-size:.65rem;color:var(--text3)">🔁 Wiederholung:</label>
        <select class="cf" onchange="trigField('${t.id}','wiederholung',this.value);trigRerender('${t.id}')">
          <option value="immer"    ${wdh==='immer'?'selected':''}>∞ Unbegrenzt</option>
          <option value="einmalig" ${wdh==='einmalig'?'selected':''}>1× Einmalig</option>
          <option value="n_mal"    ${wdh==='n_mal'?'selected':''}>N× N-mal</option>
        </select>
        ${wdh==='n_mal'?`<input class="cf cf-w80" type="number" min="1" value="${t.maxMal??2}" oninput="trigField('${t.id}','maxMal',+this.value)" title="Wie oft max. feuern">× max.`:''}
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
        <select class="cf" style="width:160px" onchange="trigField('${t.id}','von',this.value);trigRerender('${t.id}')">
          <option value="alle"      ${(!t.von||t.von==='alle')?'selected':''}>👥 Alle Spieler</option>
          <option value="bot"       ${t.von==='bot'?'selected':''}>🤖 Nur der Bot</option>
          <option value="whitelist" ${t.von==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
        ${(t.von==='whitelist')?`<input class="cf" style="min-width:180px;flex:1" value="${escHtml((t.vonNummern||[]).join(', '))}"
          oninput="trigField('${t.id}','vonNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0))"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
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
function renderCond(bot, tid, c, ci) {
  let inner = '';
  if (c.typ === 'wort') {
    inner = `
      <input class="cf cf-w120" value="${escHtml(c.wort||'')}" oninput="condField('${tid}',${ci},'wort',this.value)" placeholder="Triggerwort (lowercase)">
      <select class="cf" onchange="condField('${tid}',${ci},'typ_msg',this.value)">
        <option value="any"     ${(!c.typ_msg||c.typ_msg==='any')?'selected':''}>Chat+Emote+Whisper</option>
        <option value="chat"    ${c.typ_msg==='chat'?'selected':''}>Nur Chat</option>
        <option value="emote"   ${c.typ_msg==='emote'?'selected':''}>Nur Emote</option>
        <option value="whisper" ${c.typ_msg==='whisper'?'selected':''}>Nur Whisper</option>
      </select>`;
  } else if (c.typ === 'zone') {
    inner = `
      <input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="condField('${tid}',${ci},'name',this.value)" placeholder="Zonenname (optional)">
      X<input class="cf" style="width:46px" type="number" value="${c.x??0}" oninput="condField('${tid}',${ci},'x',+this.value)">
      Y<input class="cf" style="width:46px" type="number" value="${c.y??0}" oninput="condField('${tid}',${ci},'y',+this.value)">
      ±<input class="cf" style="width:38px" type="number" value="${c.puffer??1}" oninput="condField('${tid}',${ci},'puffer',+this.value)" title="Puffer">`;
  } else if (c.typ === 'item_traegt' || c.typ === 'item_traegt_nicht') {
    const negLabel = c.typ === 'item_traegt_nicht' ? '<span style="color:#e55;font-size:.65rem;font-weight:600;margin-right:4px">🚫 NICHT</span>' : '';
    inner = `
      ${negLabel}
      <span style="font-size:.68rem;color:var(--text2)">${c.gruppe?escHtml(c.gruppe)+' / ':''}<b>${escHtml(c.item||'–')}</b></span>
      <button onclick="ipickerOpen('item',v=>{condField('${tid}',${ci},'item',v.asset||v.name);condField('${tid}',${ci},'gruppe',v.group);condRerender('${tid}');})" style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">📦 Wählen</button>`;
  } else if (c.typ === 'zone_rect') {
    inner = `
      <span style="font-size:.62rem;color:var(--text3)">Von</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x1??0}" oninput="condField('${tid}',${ci},'x1',+this.value)" title="X-Start">
      Y<input class="cf" style="width:44px" type="number" value="${c.y1??0}" oninput="condField('${tid}',${ci},'y1',+this.value)" title="Y-Start">
      <span style="font-size:.62rem;color:var(--text3)">Bis</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x2??2}" oninput="condField('${tid}',${ci},'x2',+this.value)" title="X-Ende">
      Y<input class="cf" style="width:44px" type="number" value="${c.y2??2}" oninput="condField('${tid}',${ci},'y2',+this.value)" title="Y-Ende">`;
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
  }
  const icons = {wort:'💬',zone:'🗺️',zone_rect:'📐',item_traegt:'👗',item_traegt_nicht:'🚫',trigger_war:'🔗',player_betritt:'👋',ev_timer:'⏱',ev_interval:'🔁',rang:'🏆',shop_kauf:'🛒'};
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
  ];
  const typeOpts = types.map(([v,l])=>`<option value="${v}" ${a.typ===v?'selected':''}>${l}</option>`).join('');
  const branchArg = branch ? `,'${branch}'` : '';

  let extra = '';
  if (['chat','emote','whisper'].includes(a.typ)) {
    extra = `<textarea class="cf" style="width:100%;resize:vertical;min-height:44px;margin-top:4px" rows="2"
        oninput="actField('${tid}',${ai},'text',this.value${branch?`,'${branch}'`:''})"
        placeholder="{name} schrieb: {wort} – Pos: {x}/{y}">${escHtml(a.text||'')}</textarea>
      <div style="font-size:.59rem;color:var(--text3);margin-top:2px">Variablen: {name} {wort} {typ} {x} {y}</div>`;
  } else if (a.typ === 'item') {
    const cfgInfo = a.itemConfig ? ` <span style="font-size:.58rem;background:var(--gd);color:var(--green);padding:1px 4px;border-radius:3px">✓ Konfig</span>` : '';
    const label = a.itemConfig ? `📦 ${a.itemConfig.group}/${a.itemConfig.asset}` : a.profilName ? `👗 ${a.profilName}` : a.curseName ? `🔮 ${a.curseName}` : a.item ? `📦 ${a.gruppe||'?'}/${a.item}` : '– nichts gewählt –';
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
      <div class="as-act-box">
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2)">
          <input type="checkbox" ${a.antiStrip?'checked':''} onchange="actField('${tid}',${ai},'antiStrip',this.checked${branchArg});actRerender('${tid}',${ai}${branchArg})">
          🛡️ AntiStrip – Item wird wieder angelegt wenn der Spieler es entfernt
        </label>
        ${antiStripRows}
      </div>`;
  } else if (a.typ === 'item_entf') {
    extra = `<input class="cf" style="width:100%;margin-top:4px" value="${escHtml(a.gruppe||'')}"
        oninput="actField('${tid}',${ai},'gruppe',this.value${branchArg})" placeholder="Gruppe (z.B. ItemMouth, ItemArms …)">`;
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
        <button class="tp-slot-valid ${gueltig?'zählt':'zählt-nicht'}"
          onclick="tpSlotField('${tid}',${ai},${si},'gueltig',!${gueltig}${branchArg});actRerender('${tid}',${ai}${branchArg})"
          title="${gueltig?'Dieser Slot zählt als Erfolg – klicken um zu ändern':'Dieser Slot gilt als Fehler (bei_fehler greift) – klicken um zu ändern'}">
          ${gueltig?'✅ Gültig':'❌ Fehler'}
        </button>
        <button onclick="tpSlotRemove('${tid}',${ai},${si}${branchArg})" style="margin-left:auto;background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;padding:1px 4px" title="Entfernen">✕</button>
      </div>`;
    }).join('');
    extra = `
      <div style="font-size:.63rem;color:var(--text3);margin-top:5px">
        🌀 Teleportiert den Auslöser. Wenn alle Positionen belegt sind → gilt als Fehler.
      </div>
      <div class="tp-slot-list" id="tpslots-${tid}-${ai}">${slotsHtml}</div>
      <button class="tp-slot-add-btn" onclick="tpSlotAdd('${tid}',${ai}${branchArg})">+ Position / Fallback hinzufügen</button>`;
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
        <select class="cf" style="width:150px;font-size:.68rem" onchange="actField('${tid}',${ai},'aktZiel',this.value${branchArg});actRerender('${tid}',${ai}${branchArg})">
          <option value="ausloeser" ${(!a.aktZiel||a.aktZiel==='ausloeser')?'selected':''}>👤 Auslöser / Kaufziel</option>
          <option value="shop_kaeufer" ${a.aktZiel==='shop_kaeufer'?'selected':''}>💳 Käufer (bei Shop)</option>
          <option value="alle"      ${a.aktZiel==='alle'?'selected':''}>👥 Alle im Raum</option>
          <option value="whitelist" ${a.aktZiel==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
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
  t.bedingungen.push(defs[typ]??{typ});
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
  _saveBots(); condRerender(tid);
}

function condMoveDown(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci>=t.bedingungen.length-1) return;
  [t.bedingungen[ci], t.bedingungen[ci+1]] = [t.bedingungen[ci+1], t.bedingungen[ci]];
  _saveBots(); condRerender(tid);
}

function condRemove(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.bedingungen.splice(ci,1); _saveBots();
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
  _saveBots(); ifCondRerender(tid);
}
function ifCondMoveDown(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci>=(t.ifBedingungen?.length??0)-1) return;
  [t.ifBedingungen[ci], t.ifBedingungen[ci+1]] = [t.ifBedingungen[ci+1], t.ifBedingungen[ci]];
  _saveBots(); ifCondRerender(tid);
}
function ifCondRemove(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.ifBedingungen.splice(ci,1); _saveBots();
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
  banner.innerHTML = `<span style="color:var(--pl)">🎯 Item für Trigger wählen:</span>
    <span style="color:var(--text3);flex:1">Klicke ein Item in der Sidebar, dann auf <b style="color:var(--pl)">➕ Zum Trigger</b></span>
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
  btn.textContent = '➕ Zum Trigger';
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
  const _pendingTid = _trigPending?.tid; // save before cancel
  _trigPending.cb(val);
  _cancelTrigPending();
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

// Logs in localStorage persistieren
function _saveLogsToStorage() {
  try { localStorage.setItem('BCBot_Logs', JSON.stringify(window._BCBotLog||[])); } catch(e) {}
}
function _loadLogsFromStorage() {
  try {
    const s = localStorage.getItem('BCBot_Logs');
    if (s) window._BCBotLog = JSON.parse(s);
  } catch(e) {}
}

