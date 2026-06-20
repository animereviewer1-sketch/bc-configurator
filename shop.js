// ══════════════════════════════════════════════════════
//  SHOP SYSTEM
// ══════════════════════════════════════════════════════
const SHOP_KEY = 'BC_Shop_v1';
let _shop = {
  settings: { cmd: '!pay', listCmd: '!shop', confirmMsg: '', errorMsg: '', preisU: 0, preisNostrip: 0, announceNostripMsg: '' },
  items: [],
  log: []
};

// Async load from IndexedDB on startup
(async () => {
  try {
    const saved = await idbGet(SHOP_KEY);
    if (saved) {
      _shop = Object.assign(
        { settings: { cmd: '!pay', listCmd: '!shop', confirmMsg: '', errorMsg: '', preisU: 0, preisNostrip: 0, announceNostripMsg: '' }, items: [], log: [] },
        saved
      );
    }
  } catch (err) {
    console.warn('[Shop] IDB load error:', err);
  }
  renderShopTab();
  // Update tab badge
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i => i.aktiv).length + ')';
})();

function _saveShop() { idbSet(SHOP_KEY, _shop); }
function _shopById(id) { return _shop.items.find(i=>i.id===id)??null; }

// Editor aus dem Vollbild-Overlay in den Shop-Tab verschieben (Inline statt Popup)
function _shopMountEditor(){
  const ov=document.getElementById('shop-modal-overlay');
  const host=document.getElementById('shop-editor-host');
  if(ov&&host&&ov.parentElement!==host){ ov.classList.add('inline'); host.appendChild(ov); }
}
function _shopScrollToEditor(){
  const ov=document.getElementById('shop-modal-overlay');
  if(ov&&ov.scrollIntoView) try{ ov.scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(e){}
}

function renderShopTab() {
  // Sync settings inputs
  const cmdEl = document.getElementById('shop-cmd-inp');
  if (cmdEl) cmdEl.value = _shop.settings.cmd ?? '!pay';
  const listCmdEl = document.getElementById('shop-list-cmd-inp');
  if (listCmdEl) listCmdEl.value = _shop.settings.listCmd ?? '!shop';
  const annNsEl = document.getElementById('shop-announce-nostrip-inp');
  if (annNsEl) annNsEl.value = _shop.settings.announceNostripMsg ?? '';
  const confEl = document.getElementById('shop-confirm-inp');
  if (confEl) confEl.value = _shop.settings.confirmMsg ?? '';
  const annEl = document.getElementById('shop-announce-inp');
  if (annEl) annEl.value = _shop.settings.announceMsg ?? '';
  const annAllEl = document.getElementById('shop-announce-all-inp');
  if (annAllEl) annAllEl.value = _shop.settings.announceAllMsg ?? '';
  const errEl = document.getElementById('shop-error-inp');
  if (errEl) errEl.value = _shop.settings.errorMsg ?? '';
  const uEl = document.getElementById('shop-preis-u-inp');
  if (uEl) uEl.value = _shop.settings.preisU ?? 0;
  const nsEl = document.getElementById('shop-preis-nostrip-inp');
  if (nsEl) nsEl.value = _shop.settings.preisNostrip ?? 0;
  _shopMountEditor();
  renderShopItems();
  renderShopLog();
  // Update tab badge
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i=>i.aktiv).length + ')';
}

function renderShopItems() {
  const el = document.getElementById('shop-item-list'); if (!el) return;
  const items = _shop.items;
  if (!items.length) { el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:12px 0">Noch keine Artikel.</div>'; return; }
  el.innerHTML = items.map(item => {
    const nostripPreis = item.preisNostrip != null ? item.preisNostrip : (_shop.settings.preisNostrip??0);
    const uPreis       = item.preisU       != null ? item.preisU       : (_shop.settings.preisU??0);
    const flagBadges   = [
      uPreis>0       ? `<span style="font-size:.55rem;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;padding:1px 5px;border-radius:3px">/u +${uPreis}💰</span>` : '',
      nostripPreis>0 ? `<span style="font-size:.55rem;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);color:#f87171;padding:1px 5px;border-radius:3px">/nostrip +${nostripPreis}💰</span>` : (nostripPreis===0?`<span style="font-size:.55rem;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);color:#f87171;padding:1px 5px;border-radius:3px">/nostrip ✓</span>`:''),
    ].filter(Boolean).join(' ');
    return `
    <div class="shop-item-card ${item.aktiv?'':'shop-item-inactive'}">
      <span class="shop-item-icon">${escHtml(item.icon||'🛒')}</span>
      <div style="flex:1;min-width:0">
        <div class="shop-item-name">${escHtml(item.name||'–')}</div>
        ${item.beschreibung?`<div style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(item.beschreibung)}</div>`:''}
        ${flagBadges?`<div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${flagBadges}</div>`:''}
      </div>
      <span class="shop-item-price">${item.preis??0} 💰</span>
      <button onclick="shopItemEdit('${item.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">✏️</button>
      <button onclick="shopItemDelete('${item.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">✕</button>
    </div>
  `}).join('');
}

function renderShopLog() {
  const el = document.getElementById('shop-log-list'); if (!el) return;
  const log = [...(_shop.log||[])].reverse();
  const cntEl = document.getElementById('shop-log-count');
  if (cntEl) cntEl.textContent = log.length + ' Käufe';
  if (!log.length) {
    el.innerHTML = '<div class="shop-empty">🛒 Noch keine Käufe.<br><span style="font-size:.72rem;color:var(--text3)">Käufe erscheinen hier wenn der Bot aktiv ist und ein Spieler einen Artikel kauft.</span></div>';
    return;
  }
  el.innerHTML = log.map(e => {
    const d = new Date(e.ts);
    const timeStr = d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    let targetStr = '';
    if (e.isAll) {
      targetStr = ` → <span style="color:#fbbf24">Alle (${e.anzahl} Spieler)</span>`;
    } else if (e.targetName && e.targetName !== e.buyerName) {
      targetStr = ` → <span style="color:#60a5fa">${escHtml(e.targetName)}</span>`;
    }
    const preisLabel = e.isAll
      ? `<span style="color:var(--yellow)">${e.preis} 💰</span> <span style="font-size:.6rem;color:var(--text3)">(${e.anzahl}×${e.preis/e.anzahl})</span>`
      : `<span style="color:var(--green)">${e.preis} 💰</span>`;
    return `<div class="shop-log-card">
      <span class="shop-log-who">${escHtml(e.buyerName||('#'+e.buyerNum))}</span>${targetStr}
      kauft <span class="shop-log-item">${e.isAll?'🌍 ':''}${escHtml(e.itemName||'?')}</span>
      für ${preisLabel}
      <div class="shop-log-meta">${timeStr} · #${e.buyerNum}${e.targetNum&&e.targetNum!==e.buyerNum&&!e.isAll?' → #'+e.targetNum:''}</div>
    </div>`;
  }).join('');
}

function shopSetCmd(v)             { _shop.settings.cmd = v.trim(); _saveShop(); }
function shopSetListCmd(v)          { _shop.settings.listCmd = v.trim(); _saveShop(); }
function shopSetAnnounceNostrip(v)  { _shop.settings.announceNostripMsg = v; _saveShop(); }
function shopSetConfirm(v)    { _shop.settings.confirmMsg = v; _saveShop(); }
function shopSetAnnounce(v)   { _shop.settings.announceMsg = v; _saveShop(); }
function shopSetAnnounceAll(v){ _shop.settings.announceAllMsg = v; _saveShop(); }
function shopSetError(v)      { _shop.settings.errorMsg = v; _saveShop(); }
function shopSetPreisU(v)     { _shop.settings.preisU = parseInt(v)||0; _saveShop(); }
function shopSetPreisNostrip(v){ _shop.settings.preisNostrip = parseInt(v)||0; _saveShop(); }

// FIX: nostrip – Hinweis-Banner im Modal anzeigen
function _shopNostripHint(){
  const anchor=document.getElementById('shop-modal-preis-nostrip');
  if(!anchor)return;
  let hint=document.getElementById('shop-nostrip-hint');
  if(!hint){
    hint=document.createElement('div');
    hint.id='shop-nostrip-hint';
    hint.style.cssText='font-size:.62rem;color:#f87171;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:4px;padding:5px 8px;margin-top:6px;line-height:1.4';
    hint.textContent='\u26A0\uFE0F Hinweis: /nostrip wirkt nur, wenn dieser Artikel ein Item anlegt \u2013 entweder oben \u00fcber "Item/Curse/Outfit beim Kauf anlegen" oder \u00fcber einen Trigger mit Bedingung "shop_kauf". Ohne angelegtes Item hat /nostrip keinen Effekt.';
    anchor.parentNode.insertBefore(hint,anchor.nextSibling);
  }
}

function shopItemNew() {
  document.getElementById('shop-modal-id').value = '';
  document.getElementById('shop-modal-title').textContent = '🛒 Neuer Artikel';
  document.getElementById('shop-modal-name').value = '';
  document.getElementById('shop-modal-desc').value = '';
  document.getElementById('shop-modal-icon').value = '🛒';
  document.getElementById('shop-modal-preis').value = '10';
  document.getElementById('shop-modal-aktiv').value = 'true';
  document.getElementById('shop-modal-confirm').value = '';
  document.getElementById('shop-modal-announce').value = '';
  document.getElementById('shop-modal-announce-all').value = '';
  document.getElementById('shop-modal-error').value = '';
  document.getElementById('shop-modal-preis-u').value = '';
  document.getElementById('shop-modal-preis-nostrip').value = '';
  _shopFillRankSelect('');
  _shopFillGroupSelect('');
  { const _h=document.getElementById('shop-modal-hidelocked'); if(_h)_h.checked=false; }
  { const _vn=document.getElementById('shop-modal-varname'); if(_vn)_vn.value=''; }
  { const _vw=document.getElementById('shop-modal-varwert'); if(_vw)_vw.value=''; }
  { const _vm=document.getElementById('shop-modal-varmodus'); if(_vm)_vm.value='voraussetzung'; }
  _shopKaufItem=null; _shopKaufItemLabel(); { const _ka=document.getElementById('shop-modal-kaufitem-aktiv'); if(_ka)_ka.checked=false; }
  _shopMountEditor();
  document.getElementById('shop-modal-overlay').style.display = 'block';
  _shopNostripHint(); // FIX: nostrip
  _shopScrollToEditor();
}

let _shopKaufItem=null;
function _shopKaufItemLabel(){
  const el=document.getElementById('shop-modal-kaufitem-label'); if(!el) return;
  const k=_shopKaufItem;
  el.textContent = !k ? '– nichts gewählt –'
    : k.itemConfig ? ('📦 '+k.itemConfig.group+'/'+k.itemConfig.asset)
    : k.profilName ? ('👗 '+k.profilName)
    : k.curseName  ? ('🔮 '+k.curseName)
    : k.item       ? ('📦 '+(k.gruppe||'?')+'/'+k.item) : '– nichts gewählt –';
}
let _shopFormState=null;
function _shopSaveFormState(){
  const g=id=>document.getElementById(id);
  _shopFormState={
    id:g('shop-modal-id').value, name:g('shop-modal-name').value, desc:g('shop-modal-desc').value,
    icon:g('shop-modal-icon').value, preis:g('shop-modal-preis').value, aktiv:g('shop-modal-aktiv').value,
    confirm:g('shop-modal-confirm').value, announce:g('shop-modal-announce').value, announceAll:g('shop-modal-announce-all').value,
    error:g('shop-modal-error').value, preisU:g('shop-modal-preis-u').value, preisNostrip:g('shop-modal-preis-nostrip').value,
    reqrank:(g('shop-modal-reqrank')||{}).value||'', reqgroup:(g('shop-modal-reqgroup')||{}).value||'',
    hidelocked:!!(g('shop-modal-hidelocked')||{}).checked,
    varname:(g('shop-modal-varname')||{}).value||'', varwert:(g('shop-modal-varwert')||{}).value||'', varmodus:(g('shop-modal-varmodus')||{}).value||'voraussetzung',
    kaufItem:_shopKaufItem
  };
}
function _shopRestoreFormState(){
  const s=_shopFormState; if(!s) return;
  const g=id=>document.getElementById(id);
  g('shop-modal-title').textContent = s.id ? '✏️ Artikel bearbeiten' : '🛒 Neuer Artikel';
  g('shop-modal-id').value=s.id; g('shop-modal-name').value=s.name; g('shop-modal-desc').value=s.desc;
  g('shop-modal-icon').value=s.icon; g('shop-modal-preis').value=s.preis; g('shop-modal-aktiv').value=s.aktiv;
  g('shop-modal-confirm').value=s.confirm; g('shop-modal-announce').value=s.announce; g('shop-modal-announce-all').value=s.announceAll;
  g('shop-modal-error').value=s.error; g('shop-modal-preis-u').value=s.preisU; g('shop-modal-preis-nostrip').value=s.preisNostrip;
  _shopFillRankSelect(s.reqrank); _shopFillGroupSelect(s.reqgroup);
  { const h=g('shop-modal-hidelocked'); if(h)h.checked=s.hidelocked; }
  { const vn=g('shop-modal-varname'); if(vn)vn.value=s.varname||''; }
  { const vw=g('shop-modal-varwert'); if(vw)vw.value=s.varwert||''; }
  { const vm=g('shop-modal-varmodus'); if(vm)vm.value=s.varmodus||'voraussetzung'; }
  _shopKaufItemLabel();
  { const a=g('shop-modal-kaufitem-aktiv'); if(a)a.checked=true; }
  _shopMountEditor();
  g('shop-modal-overlay').style.display='block';
  if(typeof _shopNostripHint==='function')_shopNostripHint();
}
function shopPickKaufItem(){
  _shopSaveFormState();
  window._shopPickActive=true;
  shopModalClose();                 // Shop-Overlay schließen, damit der Picker/Item-Manager sichtbar ist
  ipickerOpen('item', v=>{
    if(v.type==='item') _shopKaufItem = v.itemConfig ? {itemConfig:v.itemConfig,item:v.itemConfig.asset,gruppe:v.itemConfig.group} : {item:v.name,gruppe:v.group,farbe:'#ffffff'};
    else if(v.type==='curse') _shopKaufItem={curseKey:v.key,curseName:v.name,curseEntry:v.entry};
    else if(v.type==='profil') _shopKaufItem={profilName:v.name,profilItems:(typeof PROFILES!=='undefined'&&PROFILES[v.name]&&PROFILES[v.name].items)||[]};
    window._shopPickActive=false;
    if(_shopFormState) _shopFormState.kaufItem=_shopKaufItem;
    _shopRestoreFormState();        // Shop-Modal mit allen Eingaben wieder öffnen
  });
}
function shopClearKaufItem(){ _shopKaufItem=null; _shopKaufItemLabel(); const a=document.getElementById('shop-modal-kaufitem-aktiv'); if(a)a.checked=false; }
function _shopFillGroupSelect(sel){
  const el=document.getElementById('shop-modal-reqgroup'); if(!el) return;
  const defs=(typeof _rankData!=='undefined'&&_rankData&&_rankData.defs)?_rankData.defs:[];
  const groups=[...new Set(defs.map(r=>r.group).filter(Boolean))].sort();
  el.innerHTML='<option value="">– alle Gruppen –</option>'+groups.map(g=>`<option value="${escHtml(g)}" ${sel===g?'selected':''}>${escHtml(g)}</option>`).join('');
}
function _shopFillRankSelect(sel){
  const el=document.getElementById('shop-modal-reqrank'); if(!el) return;
  const defs=(typeof _rankData!=='undefined'&&_rankData&&_rankData.defs)?_rankData.defs.slice():[];
  defs.sort((a,b)=>((a.group||'').localeCompare(b.group||''))||((a.level||0)-(b.level||0)));
  el.innerHTML='<option value="">– keiner (für alle) –</option>'+defs.map(r=>`<option value="${r.id}" ${sel===r.id?'selected':''}>${escHtml((r.icon||'')+' '+r.name)}${r.group?' ['+escHtml(r.group)+']':''} (Lv.${r.level})</option>`).join('');
}

function shopItemEdit(id) {
  const item = _shopById(id); if (!item) return;
  document.getElementById('shop-modal-id').value = id;
  document.getElementById('shop-modal-title').textContent = '✏️ Artikel bearbeiten';
  document.getElementById('shop-modal-name').value = item.name||'';
  document.getElementById('shop-modal-desc').value = item.beschreibung||'';
  document.getElementById('shop-modal-icon').value = item.icon||'🛒';
  document.getElementById('shop-modal-preis').value = item.preis??10;
  document.getElementById('shop-modal-aktiv').value = item.aktiv !== false ? 'true' : 'false';
  document.getElementById('shop-modal-confirm').value = item.confirmMsg||'';
  document.getElementById('shop-modal-announce').value = item.announceMsg||'';
  document.getElementById('shop-modal-announce-all').value = item.announceAllMsg||'';
  document.getElementById('shop-modal-error').value = item.errorMsg||'';
  document.getElementById('shop-modal-preis-u').value = item.preisU != null ? item.preisU : '';
  document.getElementById('shop-modal-preis-nostrip').value = item.preisNostrip != null ? item.preisNostrip : '';
  _shopFillRankSelect(item.reqRankId || '');
  _shopFillGroupSelect(item.reqGroup||'');
  { const _h=document.getElementById('shop-modal-hidelocked'); if(_h)_h.checked=!!item.shopHideLocked; }
  { const _vn=document.getElementById('shop-modal-varname'); if(_vn)_vn.value=item.varName||''; }
  { const _vw=document.getElementById('shop-modal-varwert'); if(_vw)_vw.value=item.varWert||''; }
  { const _vm=document.getElementById('shop-modal-varmodus'); if(_vm)_vm.value=item.varModus==='abziehen'?'abziehen':'voraussetzung'; }
  _shopKaufItem=item.kaufItem||null; _shopKaufItemLabel(); { const _ka=document.getElementById('shop-modal-kaufitem-aktiv'); if(_ka)_ka.checked=!!item.kaufItemAktiv; }
  _shopMountEditor();
  document.getElementById('shop-modal-overlay').style.display = 'block';
  _shopScrollToEditor();
  _shopNostripHint(); // FIX: nostrip
}

function shopModalClose() { document.getElementById('shop-modal-overlay').style.display = 'none'; }

function shopModalSave() {
  const id = document.getElementById('shop-modal-id').value;
  const name = document.getElementById('shop-modal-name').value.trim();
  if (!name) { alert('Artikelname ist erforderlich.'); return; }
  const data = {
    name,
    beschreibung: document.getElementById('shop-modal-desc').value.trim(),
    icon: document.getElementById('shop-modal-icon').value.trim()||'🛒',
    preis: parseInt(document.getElementById('shop-modal-preis').value)||0,
    aktiv: document.getElementById('shop-modal-aktiv').value !== 'false',
    confirmMsg: document.getElementById('shop-modal-confirm').value.trim(),
    announceMsg: document.getElementById('shop-modal-announce').value.trim(),
    announceAllMsg: document.getElementById('shop-modal-announce-all').value.trim(),
    errorMsg: document.getElementById('shop-modal-error').value.trim(),
    preisU: document.getElementById('shop-modal-preis-u').value.trim()!=='' ? parseInt(document.getElementById('shop-modal-preis-u').value)||0 : null,
    preisNostrip: document.getElementById('shop-modal-preis-nostrip').value.trim()!=='' ? parseInt(document.getElementById('shop-modal-preis-nostrip').value)||0 : null,
    reqRankId: (document.getElementById('shop-modal-reqrank')||{}).value || '',
    reqGroup: ((document.getElementById('shop-modal-reqgroup')||{}).value||'').toLowerCase(),
    shopHideLocked: !!(document.getElementById('shop-modal-hidelocked')||{}).checked,
    varName: ((document.getElementById('shop-modal-varname')||{}).value||'').trim(),
    varWert: parseInt((document.getElementById('shop-modal-varwert')||{}).value)||0,
    varModus: ((document.getElementById('shop-modal-varmodus')||{}).value==='abziehen')?'abziehen':'voraussetzung',
    kaufItem: _shopKaufItem||null,
    kaufItemAktiv: !!(document.getElementById('shop-modal-kaufitem-aktiv')||{}).checked,
  };
  if (id) {
    const item = _shopById(id); if (item) Object.assign(item, data);
  } else {
    _shop.items.push({ id:'shop'+Date.now(), ...data });
  }
  _saveShop(); shopModalClose(); renderShopItems();
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i=>i.aktiv).length + ')';
}

function shopItemDelete(id) {
  if (!confirm('Artikel wirklich löschen?')) return;
  _shop.items = _shop.items.filter(i=>i.id!==id);
  _saveShop(); renderShopItems();
}

function shopResetLog() {
  if (!confirm('Kauf-Log wirklich leeren?')) return;
  _shop.log = []; _saveShop(); renderShopLog();
}

function shopResetAll() {
  if (!confirm('Alle Shop-Daten wirklich zurücksetzen?')) return;
  _shop.items = []; _shop.log = []; _saveShop(); renderShopTab();
}

// ── Shop-Artikel per JSON zusammenführen (einzeln/Array); Konflikt pro Eintrag fragen ──
function _shopNormalizeItem(raw){
  return {
    id: raw.id || '',
    name: (raw.name||'').toString(),
    beschreibung: raw.beschreibung || raw.desc || '',
    icon: raw.icon || '🛒',
    preis: parseInt(raw.preis) || 0,
    aktiv: raw.aktiv !== false,
    confirmMsg: raw.confirmMsg || '',
    announceMsg: raw.announceMsg || '',
    announceAllMsg: raw.announceAllMsg || '',
    errorMsg: raw.errorMsg || '',
    preisU: (raw.preisU!=null && raw.preisU!=='') ? (parseInt(raw.preisU)||0) : null,
    preisNostrip: (raw.preisNostrip!=null && raw.preisNostrip!=='') ? (parseInt(raw.preisNostrip)||0) : null,
    reqRankId: raw.reqRankId || (raw.reqRankName && typeof _resolveRankIdByName==='function' ? _resolveRankIdByName(raw.reqRankName) : '') || '',
    reqGroup: (raw.reqGroup||'').toString().toLowerCase(),
    shopHideLocked: !!raw.shopHideLocked,
    varName: (raw.varName||'').toString().trim(),
    varWert: parseInt(raw.varWert) || 0,
    varModus: (raw.varModus==='abziehen') ? 'abziehen' : 'voraussetzung',
    kaufItem: raw.kaufItem || null,
    kaufItemAktiv: !!raw.kaufItemAktiv
  };
}
function _importShopJSON(data){
  const arr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [data]);
  _shop.items = _shop.items || [];
  let added=0, updated=0, skipped=0;
  arr.forEach(raw=>{
    if(!raw || typeof raw!=='object' || !(raw.name||raw.id)){ skipped++; return; }
    const item = _shopNormalizeItem(raw);
    let idx = -1;
    if(item.id) idx = _shop.items.findIndex(x=>x.id===item.id);
    if(idx<0)   idx = _shop.items.findIndex(x=>(x.name||'').toLowerCase()===(item.name||'').toLowerCase());
    if(idx>=0){
      if(confirm('Shop-Artikel „'+(_shop.items[idx].name||item.name)+'" existiert bereits.\nÜberschreiben?  (Abbrechen = behalten)')){
        item.id = _shop.items[idx].id;
        _shop.items[idx] = Object.assign({}, _shop.items[idx], item); updated++;
      } else skipped++;
    } else {
      item.id = item.id || ('shop'+Date.now()+Math.floor(Math.random()*9999));
      _shop.items.push(item); added++;
    }
  });
  _saveShop(); renderShopTab();
  showStatus('✅ Shop: '+added+' neu, '+updated+' aktualisiert, '+skipped+' übersprungen','success');
}

function shopExport() {
  const blob = new Blob([JSON.stringify({items:_shop.items,settings:_shop.settings},null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='shop_export.json'; a.click();
}

function shopImport() {
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.items){_shop.items=d.items;_saveShop();renderShopItems();}}catch{alert('Ungültige Shop-Datei.');}};
    r.readAsText(f);
  };
  inp.click();
}

// Called from bot via postMessage when a purchase occurs
function _shopLogPurchase(data) {
  _shop.log = _shop.log || [];
  _shop.log.push({ ts: Date.now(), buyerNum: data.buyerNum, buyerName: data.buyerName, targetNum: data.targetNum, targetName: data.targetName, itemName: data.itemName, preis: data.preis, isAll: data.isAll||false, anzahl: data.anzahl||1 });
  // Keep last 200 entries
  if (_shop.log.length > 200) _shop.log = _shop.log.slice(-200);
  _saveShop();
  if (document.getElementById('tab-shop')?.classList.contains('active')) renderShopLog();
}
