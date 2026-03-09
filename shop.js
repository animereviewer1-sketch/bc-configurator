// ══════════════════════════════════════════════════════
//  SHOP SYSTEM
// ══════════════════════════════════════════════════════
const SHOP_KEY = 'BC_Shop_v1';
let _shop = {
  settings: { cmd: '!pay', listCmd: '!shop', historyCmd: '!meinkaeufe', confirmMsg: '', errorMsg: '', preisU: 0, preisNostrip: 0, announceNostripMsg: '' },
  categories: [],
  items: [],
  log: []
};
let _shopFilterCat = ''; // aktiver Kategorie-Filter ('' = alle)
let _shopSearchText = ''; // Feature #17: Suchfilter für Shop-Items
let _shopLogFilterName = ''; // Feature #6: Log-Filter nach Spielername

// Async load from IndexedDB on startup
(async () => {
  try {
    const saved = await idbGet(SHOP_KEY);
    if (saved) {
      _shop = Object.assign(
        { settings: { cmd: '!pay', listCmd: '!shop', historyCmd: '!meinkaeufe', confirmMsg: '', errorMsg: '', preisU: 0, preisNostrip: 0, announceNostripMsg: '' }, categories: [], items: [], log: [] },
        saved
      );
      if (!_shop.categories) _shop.categories = [];
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
  // Feature #6: History Command sync
  const hcEl = document.getElementById('shop-history-cmd-inp');
  if (hcEl) hcEl.value = _shop.settings.historyCmd ?? '!meinkaeufe';
  renderShopCatFilter();
  renderShopItems();
  renderShopLog();
  // Update tab badge
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i=>i.aktiv).length + ')';
}

function _shopItemHasSale(item) {
  if (!item.salePreis && item.salePreis !== 0) return false;
  const now = Date.now();
  if (item.saleStart && now < item.saleStart) return false;
  if (item.saleEnd && now > item.saleEnd) return false;
  return true;
}

function _shopEffektivPreis(item) {
  return _shopItemHasSale(item) ? (item.salePreis ?? item.preis ?? 0) : (item.preis ?? 0);
}

function renderShopCatFilter() {
  const el = document.getElementById('shop-cat-filter'); if (!el) return;
  const cats = _shop.categories || [];
  if (!cats.length) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = `<button class="shop-cat-btn ${!_shopFilterCat?'active':''}" onclick="shopFilterByCat('')">Alle</button>` +
    cats.map(c => `<button class="shop-cat-btn ${_shopFilterCat===c?'active':''}" onclick="shopFilterByCat('${escHtml(c)}')">${escHtml(c)}</button>`).join('');
}
function shopFilterByCat(c) { _shopFilterCat = c; renderShopCatFilter(); renderShopItems(); }

function shopAddCategory() {
  const name = prompt('Neue Kategorie:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  if ((_shop.categories || []).includes(trimmed)) { alert('Kategorie existiert bereits.'); return; }
  _shop.categories = _shop.categories || [];
  _shop.categories.push(trimmed);
  _saveShop(); renderShopCatFilter(); _shopUpdateCatDropdown();
}
function shopDeleteCategory(cat) {
  if (!confirm('Kategorie "' + cat + '" loeschen? Items behalten ihre Zuordnung nicht.')) return;
  _shop.categories = (_shop.categories || []).filter(c => c !== cat);
  _shop.items.forEach(i => { if (i.kategorie === cat) i.kategorie = ''; });
  if (_shopFilterCat === cat) _shopFilterCat = '';
  _saveShop(); renderShopCatFilter(); renderShopItems(); _shopUpdateCatDropdown();
}
function _shopUpdateCatDropdown() {
  const sel = document.getElementById('shop-modal-kategorie'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Keine --</option>' +
    (_shop.categories || []).map(c => `<option value="${escHtml(c)}"${c===cur?' selected':''}>${escHtml(c)}</option>`).join('');
}

function renderShopItems() {
  const el = document.getElementById('shop-item-list'); if (!el) return;
  let items = _shop.items;
  if (_shopFilterCat) items = items.filter(i => i.kategorie === _shopFilterCat);
  // Feature #17: Suchfilter
  if (_shopSearchText) { const s=_shopSearchText.toLowerCase(); items=items.filter(i=>(i.name||'').toLowerCase().includes(s)||(i.beschreibung||'').toLowerCase().includes(s)||(i.kategorie||'').toLowerCase().includes(s)); }
  if (!items.length) { el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:12px 0">' + (_shopSearchText ? 'Keine Treffer f\u00fcr "'+escHtml(_shopSearchText)+'".' : _shopFilterCat ? 'Keine Artikel in "'+escHtml(_shopFilterCat)+'".' : 'Noch keine Artikel.') + '</div>'; return; }
  el.innerHTML = items.map(item => {
    const nostripPreis = item.preisNostrip != null ? item.preisNostrip : (_shop.settings.preisNostrip??0);
    const uPreis       = item.preisU       != null ? item.preisU       : (_shop.settings.preisU??0);
    const nsErlaubt = item.nostripErlaubt !== false;
    const hasSale = _shopItemHasSale(item);
    const badges = [
      item.kategorie ? `<span style="font-size:.55rem;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.3);color:#60a5fa;padding:1px 5px;border-radius:3px">${escHtml(item.kategorie)}</span>` : '',
      item.cooldownMin > 0 ? `<span style="font-size:.55rem;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:1px 5px;border-radius:3px">⏱ ${item.cooldownMin}min</span>` : '',
      hasSale ? `<span style="font-size:.55rem;background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);color:#34d399;padding:1px 5px;border-radius:3px;font-weight:700">🔥 SALE ${item.salePreis}💰</span>` : '',
      item.minRang ? `<span style="font-size:.55rem;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.3);color:#eab308;padding:1px 5px;border-radius:3px">👑 Ab ${escHtml(item.minRang)}</span>` : '',
      uPreis>0 ? `<span style="font-size:.55rem;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;padding:1px 5px;border-radius:3px">/u +${uPreis}💰</span>` : '',
      !nsErlaubt ? `<span style="font-size:.55rem;background:rgba(248,113,113,0.10);border:1px solid rgba(248,113,113,0.25);color:#f87171;padding:1px 5px;border-radius:3px">/nostrip gesperrt</span>` :
      nostripPreis>0 ? `<span style="font-size:.55rem;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);color:#f87171;padding:1px 5px;border-radius:3px">/nostrip +${nostripPreis}💰</span>` : (nostripPreis===0?`<span style="font-size:.55rem;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);color:#f87171;padding:1px 5px;border-radius:3px">/nostrip ✓</span>`:''),
    ].filter(Boolean).join(' ');
    const preisDisplay = hasSale
      ? `<span style="text-decoration:line-through;color:var(--text3);font-size:.6rem">${item.preis??0}</span> <span style="color:#34d399;font-weight:700">${item.salePreis}💰</span>`
      : `${item.preis??0} 💰`;
    return `
    <div class="shop-item-card ${item.aktiv?'':'shop-item-inactive'}">
      <span class="shop-item-icon">${escHtml(item.icon||'🛒')}</span>
      <div style="flex:1;min-width:0">
        <div class="shop-item-name">${escHtml(item.name||'–')}</div>
        ${item.beschreibung?`<div style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(item.beschreibung)}</div>`:''}
        ${badges?`<div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${badges}</div>`:''}
      </div>
      <span class="shop-item-price">${preisDisplay}</span>
      <button onclick="shopItemEdit('${item.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">✏️</button>
      <button onclick="shopItemDelete('${item.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">✕</button>
    </div>
  `}).join('');
}

function renderShopLog() {
  const el = document.getElementById('shop-log-list'); if (!el) return;
  const allLog = [...(_shop.log||[])].reverse();
  // Feature: Filter by player name
  const log = _shopLogFilterName
    ? allLog.filter(e => (e.buyerName||'').toLowerCase().includes(_shopLogFilterName.toLowerCase()) || (e.targetName||'').toLowerCase().includes(_shopLogFilterName.toLowerCase()))
    : allLog;
  const cntEl = document.getElementById('shop-log-count');
  if (cntEl) cntEl.textContent = log.length + (_shopLogFilterName ? ' / ' + allLog.length : '') + ' Käufe';
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
    hint.textContent='\u26A0\uFE0F Hinweis: /nostrip funktioniert nur wenn ein Trigger mit Bedingung "shop_kauf" und einer Item-Aktion f\u00fcr diesen Artikel existiert. Ohne passenden Trigger hat /nostrip keinen Effekt.';
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
  const nsChk = document.getElementById('shop-modal-nostrip-erlaubt');
  if (nsChk) nsChk.checked = true;
  // Feature: Kategorie
  _shopUpdateCatDropdown();
  const katEl = document.getElementById('shop-modal-kategorie'); if (katEl) katEl.value = '';
  // Feature: Cooldown
  const cdEl = document.getElementById('shop-modal-cooldown'); if (cdEl) cdEl.value = '0';
  // Feature: Sale
  const spEl = document.getElementById('shop-modal-sale-preis'); if (spEl) spEl.value = '';
  const ssEl = document.getElementById('shop-modal-sale-start'); if (ssEl) ssEl.value = '';
  const seEl = document.getElementById('shop-modal-sale-end'); if (seEl) seEl.value = '';
  // Feature: Min-Rang reset
  const mrEl = document.getElementById('shop-modal-min-rang'); if (mrEl) mrEl.value = '';
  document.getElementById('shop-modal-overlay').style.display = 'flex';
  _shopNostripHint();
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
  const nsChk = document.getElementById('shop-modal-nostrip-erlaubt');
  if (nsChk) nsChk.checked = item.nostripErlaubt !== false;
  // Feature: Kategorie
  _shopUpdateCatDropdown();
  const katEl = document.getElementById('shop-modal-kategorie'); if (katEl) katEl.value = item.kategorie || '';
  // Feature: Cooldown
  const cdEl = document.getElementById('shop-modal-cooldown'); if (cdEl) cdEl.value = item.cooldownMin || 0;
  // Feature: Sale
  const spEl = document.getElementById('shop-modal-sale-preis'); if (spEl) spEl.value = item.salePreis != null ? item.salePreis : '';
  const ssEl = document.getElementById('shop-modal-sale-start');
  if (ssEl) ssEl.value = item.saleStart ? new Date(item.saleStart).toISOString().slice(0,16) : '';
  const seEl = document.getElementById('shop-modal-sale-end');
  if (seEl) seEl.value = item.saleEnd ? new Date(item.saleEnd).toISOString().slice(0,16) : '';
  // Feature: Min-Rang
  const mrEl = document.getElementById('shop-modal-min-rang'); if (mrEl) mrEl.value = item.minRang || '';
  document.getElementById('shop-modal-overlay').style.display = 'flex';
  _shopNostripHint();
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
    nostripErlaubt: document.getElementById('shop-modal-nostrip-erlaubt')?.checked !== false,
    // Feature: Kategorie
    kategorie: document.getElementById('shop-modal-kategorie')?.value || '',
    // Feature: Cooldown
    cooldownMin: parseInt(document.getElementById('shop-modal-cooldown')?.value) || 0,
    // Feature: Sale
    salePreis: document.getElementById('shop-modal-sale-preis')?.value.trim() !== '' ? parseInt(document.getElementById('shop-modal-sale-preis').value) || 0 : null,
    saleStart: document.getElementById('shop-modal-sale-start')?.value ? new Date(document.getElementById('shop-modal-sale-start').value).getTime() : null,
    saleEnd: document.getElementById('shop-modal-sale-end')?.value ? new Date(document.getElementById('shop-modal-sale-end').value).getTime() : null,
    // Feature: Min-Rang
    minRang: document.getElementById('shop-modal-min-rang')?.value || '',
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

// Feature: History Command setting
function shopSetHistoryCmd(v) {
  _shop.settings.historyCmd = v.trim() || '!meinkaeufe';
  _saveShop();
}

// Feature: Search items
function shopSearchItems(v) {
  _shopSearchText = v;
  renderShopItems();
}

// Feature: Filter log by player name
function shopFilterLog(v) {
  _shopLogFilterName = v;
  renderShopLog();
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