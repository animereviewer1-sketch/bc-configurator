const RANK_KEY = 'BC_Rank_v1';
let _rankData = {
  settings: { queryCmd: '!rang', queryCmdTyp: 'whisper', queryCmdText: '{name} hat Rang: {rang_icon} {rang}' },
  defs: [],
  players: {}
};

// Async load from IndexedDB on startup
(async () => {
  try {
    const saved = await idbGet(RANK_KEY);
    if (saved) {
      const std = { queryCmd: '!rang', queryCmdTyp: 'whisper', queryCmdText: '{name} hat Rang: {rang_icon} {rang}' };
      _rankData = Object.assign({ settings: std, defs: [], players: {} }, saved);
      _rankData.settings = Object.assign({}, std, _rankData.settings || {});
    }
  } catch (err) {
    console.warn('[Rank] IDB load error:', err);
  }
  renderRankTab();
  // Update tab badge
  const btn = document.getElementById('tab-rank-btn');
  if (btn) {
    const total = Object.values(_rankData.players).filter(x => x.rankId).length;
    btn.textContent = '🏆 Rang (' + total + ')';
  }
})();

function _saveRank() { idbSet(RANK_KEY, _rankData); if(typeof _autoSync==='function')_autoSync(); }
function _rankById(id) { return _rankData.defs.find(r=>r.id===id)??null; }
function _rankSorted() { return [..._rankData.defs].sort((a,b)=>a.level-b.level); }

function renderRankTab() {
  const si = document.getElementById('rank-cmd-inp');      if(si) si.value = _rankData.settings.queryCmd??'!rang';
  const st = document.getElementById('rank-cmdtyp-inp');   if(st) st.value = _rankData.settings.queryCmdTyp??'whisper';
  const sx = document.getElementById('rank-cmdtext-inp');  if(sx) sx.value = _rankData.settings.queryCmdText??'{name} hat Rang: {rang_icon} {rang}';
  renderRankDefs(); renderRankPlayers(); _rankUpdateFilterSelect();
}

function renderRankDefs() {
  const el = document.getElementById('rank-def-list'); if(!el) return;
  const defs = _rankData.defs||[];
  if(!defs.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:.72rem;text-align:center;padding:18px 0">Noch keine Raenge. Fuege deinen ersten Rang hinzu!</div>';
    return;
  }
  // i / anz beziehen sich auf die Gruppe, in der die Karte angezeigt wird –
  // sonst waere nur beim global ersten/letzten Rang ein Pfeil ausgegraut.
  const card = (r, i, anz) => `
    <div class="rank-def-card" id="rdef-${r.id}">
      <span style="display:flex;flex-direction:column;gap:1px">
        <button class="order-btn" onclick="rankDefMoveUp('${r.id}')" ${i===0?'disabled':''}>&#9650;</button>
        <button class="order-btn" onclick="rankDefMoveDown('${r.id}')" ${i===anz-1?'disabled':''}>&#9660;</button>
      </span>
      <span class="rank-def-badge" style="background:${r.farbe}22;color:${r.farbe};border-color:${r.farbe}55">${escHtml(r.icon||'\uD83C\uDFC5')} ${escHtml(r.name)}</span>
      <span class="rank-def-level">Lv.${r.level}</span>
      <span style="flex:1"></span>
      <button onclick="rankDefEdit('${r.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">&#9999;&#65039;</button>
      <button onclick="rankDefDelete('${r.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">&#x2715;</button>
    </div>`;
  const groups = {};
  defs.forEach(r=>{ const g=r.group||''; (groups[g]=groups[g]||[]).push(r); });
  const order = Object.keys(groups).sort((a,b)=>{ if(a===''&&b!=='')return -1; if(b===''&&a!=='')return 1; return a.localeCompare(b); });
  el.innerHTML = order.map(g=>{
    const items = groups[g].slice().sort((a,b)=>a.level-b.level);
    const title = g ? ('\uD83D\uDC65 '+escHtml(g)) : '\u26AA Ohne Gruppe';
    return `<div style="margin-bottom:12px"><div style="font-size:.62rem;font-weight:700;color:var(--pl,#c4b5fd);text-transform:uppercase;letter-spacing:.5px;margin:2px 0 5px 2px;border-bottom:1px solid rgba(139,92,246,0.2);padding-bottom:3px">${title} <span style="color:var(--text3);font-weight:400">(${items.length})</span></div>${items.map((r,i)=>card(r,i,items.length)).join('')}</div>`;
  }).join('');
}

function renderRankPlayers() {
  const el = document.getElementById('rank-player-list'); if(!el) return;
  const search = (document.getElementById('rank-search')?.value||'').toLowerCase();
  const filterRank = document.getElementById('rank-filter-sel')?.value||'';
  let entries = Object.entries(_rankData.players);
  if(search) entries = entries.filter(([,p])=>(p.name||'').toLowerCase().includes(search));
  if(filterRank==='__none__') entries = entries.filter(([,p])=>!p.rankId);
  else if(filterRank) entries = entries.filter(([,p])=>p.rankId===filterRank);
  if(!entries.length) {
    el.innerHTML = `<div class="rank-empty">&#127942; Keine Spieler gefunden.<br><span style="font-size:.72rem;color:var(--text3)">Raenge werden automatisch gesetzt wenn der Bot die Aktion "Rang setzen" ausfuehrt.</span></div>`;
    return;
  }
  const sorted = _rankSorted();
  el.innerHTML = entries.sort((a,b)=>{ const la=_rankById(a[1].rankId)?.level??-1; const lb=_rankById(b[1].rankId)?.level??-1; return lb-la; }).map(([num,p])=>{
    const rank=_rankById(p.rankId);
    const badge=rank?`<span class="rank-def-badge" style="background:${rank.farbe}22;color:${rank.farbe};border-color:${rank.farbe}55;font-size:.69rem">${escHtml(rank.icon||'\uD83C\uDFC5')} ${escHtml(rank.name)}</span>`:`<span class="rank-badge-none">- Kein Rang -</span>`;
    const ts=p.assignedAt?new Date(p.assignedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    const histCount=(p.history||[]).length;
    return `<div class="rank-player-card">
      <div><div class="rank-player-name">${escHtml(p.name||('#'+num))}</div><div class="rank-player-num">#${num}</div></div>
      <div class="rank-player-rank">${badge}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <select class="cf" style="font-size:.68rem;width:160px" onchange="rankSetPlayerDirect('${num}',this.value)">
          <option value="">- Kein Rang -</option>
          ${sorted.map(r=>`<option value="${r.id}" ${p.rankId===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
        </select>
        ${histCount?`<button class="rank-history-btn" onclick="rankShowHistory('${num}')" title="${histCount} Eintraege">&#128345; ${histCount}</button>`:''}
        <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">${ts}</span>
        <button onclick="rankRemovePlayer('${num}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">&#x2715;</button>
      </div>
    </div>`;
  }).join('');
}

function _rankUpdateFilterSelect() {
  const sel = document.getElementById('rank-filter-sel'); if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Alle Raenge</option><option value="__none__">- Kein Rang -</option>' +
    _rankSorted().map(r=>`<option value="${r.id}" ${cur===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)}</option>`).join('');
}

function rankDefNew() { _rankOpenModal(null); }
function rankDefEdit(id) { _rankOpenModal(id); }

function _rankOpenModal(id) {
  const r = id ? _rankById(id) : null;
  const maxLevel = _rankData.defs.length ? Math.max(..._rankData.defs.map(x=>x.level))+1 : 1;
  document.getElementById('rank-modal-id').value = id||'';
  document.getElementById('rank-modal-title').textContent = r ? 'Rang bearbeiten' : 'Neuen Rang erstellen';
  document.getElementById('rank-modal-name').value = r?.name||'';
  document.getElementById('rank-modal-icon').value = r?.icon||'\uD83C\uDFC5';
  document.getElementById('rank-modal-color').value = r?.farbe||'#c4b5fd';
  document.getElementById('rank-modal-color-hex').value = r?.farbe||'#c4b5fd';
  document.getElementById('rank-modal-level').value = r?.level??maxLevel;
  document.getElementById('rank-modal-group').value = r?.group||'';
  document.getElementById('rank-modal-overlay').style.display='flex';
  setTimeout(()=>document.getElementById('rank-modal-name')?.focus(),50);
}

document.addEventListener('input', e=>{
  if(e.target.id==='rank-modal-color') document.getElementById('rank-modal-color-hex').value=e.target.value;
  if(e.target.id==='rank-modal-color-hex') document.getElementById('rank-modal-color').value=e.target.value;
});

function rankModalClose() { document.getElementById('rank-modal-overlay').style.display='none'; }

function rankModalSave() {
  const id = document.getElementById('rank-modal-id').value;
  const name = document.getElementById('rank-modal-name').value.trim();
  const icon = document.getElementById('rank-modal-icon').value.trim()||'\uD83C\uDFC5';
  const farbe = document.getElementById('rank-modal-color').value||'#c4b5fd';
  const level = parseInt(document.getElementById('rank-modal-level').value)||1;
  const group = (document.getElementById('rank-modal-group').value||'').trim().toLowerCase();
  if(!name) { alert('Bitte gib einen Namen fuer den Rang ein.'); return; }
  if(id) { const r=_rankById(id); if(!r) return; r.name=name; r.icon=icon; r.farbe=farbe; r.level=level; r.group=group; }
  else { _rankData.defs.push({id:'r'+Date.now(), name, icon, farbe, level, group}); }
  _saveRank(); rankModalClose(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

function rankDefDelete(id) {
  const r=_rankById(id); if(!r||!confirm('Rang "'+r.name+'" loeschen?')) return;
  _rankData.defs=_rankData.defs.filter(x=>x.id!==id);
  Object.values(_rankData.players).forEach(p=>{ if(p.rankId===id) p.rankId=null; });
  _saveRank(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

// (_rankRelevel entfernt – wurde nur von den beiden Pfeil-Funktionen benutzt,
//  die das Neu-Nummerieren jetzt selbst in _rankTausche erledigen.)

/* Die Liste ist nach Gruppen aufgeteilt dargestellt, die Pfeile arbeiteten
   aber auf der globalen Reihenfolge – ein Rang sprang dadurch sichtbar in eine
   fremde Gruppe. Verschoben wird jetzt innerhalb der eigenen Gruppe. */
function _rankInGruppe(id) {
  const r = _rankById(id); if(!r) return null;
  const g = r.group || '';
  const liste = (_rankData.defs||[]).filter(x=>(x.group||'')===g).sort((a,b)=>a.level-b.level);
  return { liste, i: liste.findIndex(x=>x.id===id) };
}

/* Nicht die Level-Zahlen tauschen, sondern die Plaetze: haben zwei Raenge
   dasselbe Level (moeglich per JSON-Import), waere ein Zahlentausch wirkungslos
   und der Pfeil taete sichtbar nichts. */
function _rankTausche(a, b) {
  const alle = _rankSorted();
  const ia = alle.indexOf(a), ib = alle.indexOf(b);
  if (ia < 0 || ib < 0) return;
  alle[ia] = b; alle[ib] = a;
  alle.forEach((r,n)=>{ r.level = n+1; });
  _saveRank(); renderRankDefs();
}

function rankDefMoveUp(id) {
  const g=_rankInGruppe(id); if(!g||g.i<=0) return;
  _rankTausche(g.liste[g.i], g.liste[g.i-1]);
}

function rankDefMoveDown(id) {
  const g=_rankInGruppe(id); if(!g||g.i<0||g.i>=g.liste.length-1) return;
  _rankTausche(g.liste[g.i], g.liste[g.i+1]);
}

function rankSetPlayerDirect(memberNum, rankId) {
  _rankApply(memberNum, _rankData.players[memberNum]?.name||('#'+memberNum), rankId||null, 'manuell');
  renderRankPlayers();
}

function rankRemovePlayer(memberNum) {
  if(!confirm('Spieler-Eintrag loeschen?')) return;
  delete _rankData.players[memberNum]; _saveRank(); renderRankPlayers();
}

function rankAddPlayerManual() {
  const name = prompt('Spielername oder MemberNumber:');
  if(!name?.trim()) return;
  const num = 'manual_'+Date.now();
  _rankData.players[num] = {name:name.trim(), rankId:null, assignedAt:Date.now(), history:[]};
  _saveRank(); renderRankPlayers();
}

function rankShowHistory(memberNum) {
  const p=_rankData.players[memberNum]; if(!p) return;
  const hist=(p.history||[]).slice(-20).reverse();
  const lines=hist.map(h=>{
    const r=_rankById(h.rankId);
    const ts=new Date(h.ts).toLocaleString('de-DE');
    return `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">${ts}</span>
      ${r?`<span style="font-size:.69rem;font-weight:700;color:${r.farbe}">${escHtml(r.icon+' '+r.name)}</span>`:'<span style="color:var(--text3);font-size:.69rem">- Entfernt -</span>'}
      ${h.source?`<span style="font-size:.58rem;color:var(--text3)">(${escHtml(h.source)})</span>`:''}
    </div>`;
  }).join('');
  const existing=document.getElementById('_rankHistPopup'); if(existing) existing.remove();
  const popup=document.createElement('div');
  popup.id='_rankHistPopup'; popup.className='rank-history-popup';
  popup.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:700;max-height:320px;overflow-y:auto;min-width:300px';
  popup.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <span style="font-size:.78rem;font-weight:700;color:#c4b5fd">Rang-Verlauf: ${escHtml(p.name||('#'+memberNum))}</span>
    <button onclick="document.getElementById('_rankHistPopup').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem">&#x2715;</button>
  </div>${lines||'<div style="color:var(--text3);font-size:.72rem">Kein Verlauf vorhanden.</div>'}`;
  document.body.appendChild(popup);
  setTimeout(()=>{ const close=(e)=>{ if(!popup.contains(e.target)){popup.remove();document.removeEventListener('click',close);} }; document.addEventListener('click',close); },200);
}

function _rankApply(memberNum, name, rankId, source) {
  const id=String(memberNum);
  if(!_rankData.players[id]) _rankData.players[id]={name:name||('#'+id),rankId:null,assignedAt:null,history:[]};
  const p=_rankData.players[id];
  p.name=name||p.name; if(!p.history) p.history=[];
  p.history.push({rankId,ts:Date.now(),source:source||'bot'});
  if(p.history.length>50) p.history.shift();
  p.rankId=rankId; p.assignedAt=Date.now(); _saveRank();
  if(document.getElementById('tab-rank')?.classList.contains('active')) renderRankPlayers();
  const btn=document.getElementById('tab-rank-btn');
  if(btn){ const total=Object.values(_rankData.players).filter(x=>x.rankId).length; btn.textContent='\uD83C\uDFC6 Rang ('+total+')'; }
}

function rankSetCmd(v)     { _rankData.settings.queryCmd=v.trim(); _saveRank(); }
function rankSetCmdTyp(v)  { _rankData.settings.queryCmdTyp=v; _saveRank(); }
function rankSetCmdText(v) { _rankData.settings.queryCmdText=v; _saveRank(); }

function rankResetAllPlayers() {
  if(!confirm('Alle Spieler-Raenge zuruecksetzen?')) return;
  Object.values(_rankData.players).forEach(p=>{p.rankId=null;p.history=[];});
  _saveRank(); renderRankPlayers();
}

// Rang-ID anhand des Namens finden (für JSON-Import per Name)
function _resolveRankIdByName(name){
  if(!name) return '';
  const defs=(typeof _rankData!=='undefined'&&_rankData&&_rankData.defs)?_rankData.defs:[];
  const hit=defs.find(d=>(d.name||'').toLowerCase()===String(name).toLowerCase());
  return hit?hit.id:'';
}

// ── Ränge per JSON zusammenführen (einzeln/Array); Konflikt pro Eintrag fragen ──
function _rankNormalizeDef(raw){
  return {
    id: raw.id || '',
    name: (raw.name||'').toString(),
    icon: raw.icon || '🏅',
    farbe: raw.farbe || raw.color || '#c4b5fd',
    level: parseInt(raw.level) || 1,
    group: (raw.group||'').toString().toLowerCase()
  };
}
function _importRankJSON(data){
  const arr = Array.isArray(data) ? data : (Array.isArray(data.defs) ? data.defs : [data]);
  _rankData.defs = _rankData.defs || [];
  let added=0, updated=0, skipped=0;
  arr.forEach(raw=>{
    if(!raw || typeof raw!=='object' || !(raw.name||raw.id)){ skipped++; return; }
    const def = _rankNormalizeDef(raw);
    let idx = -1;
    if(def.id) idx = _rankData.defs.findIndex(x=>x.id===def.id);
    if(idx<0)  idx = _rankData.defs.findIndex(x=>(x.name||'').toLowerCase()===(def.name||'').toLowerCase());
    if(idx>=0){
      if(confirm('Rang „'+(_rankData.defs[idx].name||def.name)+'" existiert bereits.\nÜberschreiben?  (Abbrechen = behalten)')){
        def.id = _rankData.defs[idx].id;
        _rankData.defs[idx] = Object.assign({}, _rankData.defs[idx], def); updated++;
      } else skipped++;
    } else {
      def.id = def.id || ('r'+Date.now()+Math.floor(Math.random()*9999));
      _rankData.defs.push(def); added++;
    }
  });
  _saveRank(); renderRankTab();
  showStatus('✅ Ränge: '+added+' neu, '+updated+' aktualisiert, '+skipped+' übersprungen','success');
}

function rankExport() {
  const blob=new Blob([JSON.stringify({defs:_rankData.defs,settings:_rankData.settings},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='rang-system.json'; a.click();
}

function rankImport() {
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=e=>{ const r=new FileReader(); r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(d.defs) _rankData.defs=d.defs;
      if(d.settings) _rankData.settings=Object.assign(_rankData.settings,d.settings);
      _saveRank(); renderRankTab(); showStatus('Rang-System importiert','success');
    }catch(err){showStatus('Fehler: '+err.message,'error');} }; r.readAsText(e.target.files[0]); }; inp.click();
}