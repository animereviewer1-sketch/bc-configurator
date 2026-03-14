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
      _rankData = Object.assign(
        { settings: { queryCmd: '!rang', queryCmdTyp: 'whisper', queryCmdText: '{name} hat Rang: {rang_icon} {rang}' }, defs: [], players: {} },
        saved
      );
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

function _saveRank() { idbSet(RANK_KEY, _rankData); }
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
  const sorted = _rankSorted();
  if(!sorted.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:.72rem;text-align:center;padding:18px 0">Noch keine Raenge. Fuege deinen ersten Rang hinzu!</div>';
    return;
  }
  el.innerHTML = sorted.map((r,i)=>`
    <div class="rank-def-card" id="rdef-${r.id}">
      <span style="display:flex;flex-direction:column;gap:1px">
        <button class="order-btn" onclick="rankDefMoveUp('${r.id}')" ${i===0?'disabled':''}>&#9650;</button>
        <button class="order-btn" onclick="rankDefMoveDown('${r.id}')" ${i===sorted.length-1?'disabled':''}>&#9660;</button>
      </span>
      <span class="rank-def-badge" style="background:${r.farbe}22;color:${r.farbe};border-color:${r.farbe}55">${escHtml(r.icon||'\uD83C\uDFC5')} ${escHtml(r.name)}</span>
      <span class="rank-def-level">Lv.${r.level}</span>
      <span style="flex:1"></span>
      <button onclick="rankDefEdit('${r.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">&#9999;&#65039;</button>
      <button onclick="rankDefDelete('${r.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">&#x2715;</button>
    </div>`).join('');
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
  if(!name) { alert('Bitte gib einen Namen fuer den Rang ein.'); return; }
  if(id) { const r=_rankById(id); if(!r) return; r.name=name; r.icon=icon; r.farbe=farbe; r.level=level; }
  else { _rankData.defs.push({id:'r'+Date.now(), name, icon, farbe, level}); }
  _saveRank(); rankModalClose(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

function rankDefDelete(id) {
  const r=_rankById(id); if(!r||!confirm('Rang "'+r.name+'" loeschen?')) return;
  _rankData.defs=_rankData.defs.filter(x=>x.id!==id);
  Object.values(_rankData.players).forEach(p=>{ if(p.rankId===id) p.rankId=null; });
  _saveRank(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

function _rankRelevel() { _rankSorted().forEach((r,i)=>{ const d=_rankById(r.id); if(d) d.level=i+1; }); _saveRank(); }

function rankDefMoveUp(id) {
  const s=_rankSorted(); const i=s.findIndex(r=>r.id===id); if(i<=0) return;
  [s[i].level,s[i-1].level]=[s[i-1].level,s[i].level]; _rankRelevel(); renderRankDefs();
}

function rankDefMoveDown(id) {
  const s=_rankSorted(); const i=s.findIndex(r=>r.id===id); if(i<0||i>=s.length-1) return;
  [s[i].level,s[i+1].level]=[s[i+1].level,s[i].level]; _rankRelevel(); renderRankDefs();
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