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
  // Re-render if tab is already open
  if (document.getElementById('tab-shop')?.classList.contains('active')) renderShopTab();
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
  document.getElementById('shop-modal-overlay').style.display = 'flex';
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
  document.getElementById('shop-modal-overlay').style.display = 'flex';
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

// Called from bot via postMessage when a purchase occurs
function _shopLogPurchase(data) {
  _shop.log = _shop.log || [];
  _shop.log.push({ ts: Date.now(), buyerNum: data.buyerNum, buyerName: data.buyerName, targetNum: data.targetNum, targetName: data.targetName, itemName: data.itemName, preis: data.preis, isAll: data.isAll||false, anzahl: data.anzahl||1 });
  // Keep last 200 entries
  if (_shop.log.length > 200) _shop.log = _shop.log.slice(-200);
  _saveShop();
  if (document.getElementById('tab-shop')?.classList.contains('active')) renderShopLog();
}