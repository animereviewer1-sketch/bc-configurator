// ══════════════════════════════════════════════════════
//  ITEM-KATALOG  +  INVENTAR
//
//  Der Katalog gibt einem Gegenstand einen Namen und bindet ihn an das,
//  was in BC tatsaechlich passiert (Item, Curse oder Outfit/Profil).
//  Erst dadurch laesst sich ein Gegenstand besitzen, verleihen und in
//  Bedingungen ansprechen - vorher steckte er fest im Shop-Artikel.
//
//  Grundsatz in dieser Datei: es wird nie etwas geloescht. Inventar-
//  Eintraege bleiben mit Anzahl 0 stehen, und die Shop-Umstellung ergaenzt
//  nur ein Feld, statt das alte zu ersetzen.
// ══════════════════════════════════════════════════════

// ── Katalog ───────────────────────────────────────────────────────────
const ITEMDEF_KEY = 'BC_ItemDefs_v1';
let _itemDefs = { items: [] };

// ── Inventar ──────────────────────────────────────────────────────────
const INVENTAR_KEY = 'BC_Inventar_v1';
const _INV_STD = {
  wearCmd: '!wear',
  listCmd: '!inventar',
  fremdErlaubt: true,     // darf man anderen etwas anziehen?
  fremdRangId: '',        // wenn gesetzt: erst ab diesem Rang
  wearMsg: '', errorMsg: ''
};
let _inventar = { settings: Object.assign({}, _INV_STD), spieler: {}, ausleihe: [] };

(async () => {
  try {
    const d = await idbGet(ITEMDEF_KEY);
    // Vorgaben UNTER die vorhandenen Daten mischen, nie darueber.
    if (d && typeof d === 'object') _itemDefs = Object.assign({ items: [] }, d);
    if (!Array.isArray(_itemDefs.items)) _itemDefs.items = [];
  } catch (e) { console.warn('[Items] IDB:', e); }
  try {
    const d = await idbGet(INVENTAR_KEY);
    if (d && typeof d === 'object') {
      _inventar = Object.assign({ spieler: {}, ausleihe: [] }, d);
      _inventar.settings = Object.assign({}, _INV_STD, d.settings || {});
    }
    if (!_inventar.spieler || typeof _inventar.spieler !== 'object') _inventar.spieler = {};
    if (!Array.isArray(_inventar.ausleihe)) _inventar.ausleihe = [];
  } catch (e) { console.warn('[Inventar] IDB:', e); }
  renderItemDefsTab();
  renderInventarTab();
  // Der Shop laedt parallel; die Umstellung braucht seine Daten. Sie ist
  // absichtlich mehrfach aufrufbar (siehe _itemDefsMigriereShop).
  setTimeout(_itemDefsMigriereShop, 1500);
})();

function _saveItemDefs() { idbSet(ITEMDEF_KEY, _itemDefs); if (typeof _autoSync === 'function') _autoSync(); }
function _saveInventar() { idbSet(INVENTAR_KEY, _inventar); if (typeof _autoSync === 'function') _autoSync(); }
function _itemDefById(id) { return (_itemDefs.items || []).find(i => i.id === id) || null; }
function _itemDefAktive()  { return (_itemDefs.items || []).filter(i => i.aktiv !== false); }

/* Beschriftung eines Katalog-Inhalts - dieselbe Fallunterscheidung wie
   _shopKaufItemLabel in shop.js. */
function _itemDefInhaltText(k) {
  if (!k) return '– nichts gewählt –';
  if (k.itemConfig) return '📦 ' + k.itemConfig.group + '/' + k.itemConfig.asset;
  if (k.profilName) return '👗 ' + k.profilName;
  if (k.curseName)  return '🔮 ' + k.curseName;
  if (k.item)       return '📦 ' + (k.gruppe || '?') + '/' + k.item;
  return '– nichts gewählt –';
}

// ══ Shop-Umstellung ═══════════════════════════════════════════════════
/* Legt fuer jeden Shop-Artikel mit hinterlegtem Kauf-Item einen Katalog-
   Eintrag an und verweist per itemDefId darauf.

   kaufItem bleibt dabei unangetastet - der Bot benutzt es weiterhin als
   Rueckfallebene. Dadurch laeuft jeder bestehende Artikel unveraendert
   weiter, auch wenn hier etwas danebengeht.

   Die Funktion darf beliebig oft laufen: sie ueberspringt alles, was
   bereits eine gueltige itemDefId hat. */
function _itemDefsMigriereShop() {
  try {
    if (typeof _shop === 'undefined' || !_shop || !Array.isArray(_shop.items)) return 0;
    let neu = 0;
    _shop.items.forEach(art => {
      if (art.itemDefId && _itemDefById(art.itemDefId)) return;
      if (!art.kaufItemAktiv || !art.kaufItem) return;
      const def = {
        id: 'idef' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: art.name || 'Gegenstand',
        icon: art.icon || '🎁',
        beschreibung: art.beschreibung || '',
        inhalt: art.kaufItem,
        unendlich: false,
        aktiv: true,
        ausShop: art.id
      };
      _itemDefs.items.push(def);
      art.itemDefId = def.id;
      if (!art.kaufZiel) art.kaufZiel = 'tragen';   // bisheriges Verhalten
      neu++;
    });
    if (neu) {
      _saveItemDefs();
      if (typeof _saveShop === 'function') _saveShop();
      renderItemDefsTab();
      console.log('[Items] ' + neu + ' Shop-Artikel in den Katalog übernommen');
    }
    return neu;
  } catch (e) { console.warn('[Items] Migration:', e); return 0; }
}

// ══ Katalog-Oberflaeche ═══════════════════════════════════════════════
function renderItemDefsTab() {
  const el = document.getElementById('itemdefs-list');
  if (!el) return;
  const items = _itemDefs.items || [];
  const btn = document.getElementById('tab-itemdefs-btn');
  if (btn) btn.textContent = '🎁 Items (' + items.filter(i => i.aktiv !== false).length + ')';

  if (!items.length) {
    el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:14px 0">' +
      'Noch keine Gegenstände. Lege einen an – dann kannst du ihn im Shop verkaufen, ' +
      'ins Inventar legen und in Bedingungen darauf verweisen.</div>';
    return;
  }
  el.innerHTML = items.map(d => {
    const imShop = (typeof _shop !== 'undefined' && _shop && Array.isArray(_shop.items))
      ? _shop.items.filter(a => a.itemDefId === d.id).length : 0;
    return '<div class="shop-item-card ' + (d.aktiv === false ? 'shop-item-inactive' : '') + '">' +
      '<span class="shop-item-icon">' + escHtml(d.icon || '🎁') + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="shop-item-name">' + escHtml(d.name || '–') +
          (d.unendlich ? ' <span style="font-size:.55rem;color:#a78bfa;border:1px solid rgba(139,92,246,.3);border-radius:3px;padding:1px 5px">∞ unbegrenzt</span>' : '') +
        '</div>' +
        '<div style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          escHtml(_itemDefInhaltText(d.inhalt)) +
          (imShop ? ' · im Shop (' + imShop + ')' : '') +
        '</div>' +
      '</div>' +
      '<button onclick="itemDefEdit(' + JSON.stringify(d.id) + ')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">✏️</button>' +
      '<button onclick="itemDefDelete(' + JSON.stringify(d.id) + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">✕</button>' +
    '</div>';
  }).join('');
}

let _itemDefInhalt = null;
function _itemDefInhaltLabel() {
  const el = document.getElementById('itemdef-inhalt-label');
  if (el) el.textContent = _itemDefInhaltText(_itemDefInhalt);
}

function itemDefNew() {
  const g = id => document.getElementById(id);
  if (!g('itemdef-editor')) return;
  g('itemdef-id').value = '';
  g('itemdef-name').value = '';
  g('itemdef-icon').value = '🎁';
  g('itemdef-desc').value = '';
  g('itemdef-unendlich').checked = false;
  g('itemdef-aktiv').checked = true;
  _itemDefInhalt = null; _itemDefInhaltLabel();
  g('itemdef-titel').textContent = '🎁 Neuer Gegenstand';
  g('itemdef-editor').style.display = 'block';
}

function itemDefEdit(id) {
  const d = _itemDefById(id); if (!d) return;
  const g = x => document.getElementById(x);
  if (!g('itemdef-editor')) return;
  g('itemdef-id').value = d.id;
  g('itemdef-name').value = d.name || '';
  g('itemdef-icon').value = d.icon || '🎁';
  g('itemdef-desc').value = d.beschreibung || '';
  g('itemdef-unendlich').checked = !!d.unendlich;
  g('itemdef-aktiv').checked = d.aktiv !== false;
  _itemDefInhalt = d.inhalt || null; _itemDefInhaltLabel();
  g('itemdef-titel').textContent = '✏️ Gegenstand bearbeiten';
  g('itemdef-editor').style.display = 'block';
  try { g('itemdef-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
}

function itemDefClose() {
  const el = document.getElementById('itemdef-editor');
  if (el) el.style.display = 'none';
}

function itemDefSave() {
  const g = x => document.getElementById(x);
  const name = (g('itemdef-name').value || '').trim();
  if (!name) { showStatus('⚠️ Bitte einen Namen angeben', 'error'); return; }
  const id = g('itemdef-id').value;
  const daten = {
    name: name,
    icon: (g('itemdef-icon').value || '🎁').trim() || '🎁',
    beschreibung: (g('itemdef-desc').value || '').trim(),
    inhalt: _itemDefInhalt,
    unendlich: !!g('itemdef-unendlich').checked,
    aktiv: !!g('itemdef-aktiv').checked
  };
  if (id) {
    const d = _itemDefById(id);
    if (d) Object.assign(d, daten);            // vorhandene Zusatzfelder bleiben
  } else {
    _itemDefs.items.push(Object.assign({ id: 'idef' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) }, daten));
  }
  _saveItemDefs();
  itemDefClose();
  renderItemDefsTab();
  renderInventarTab();
  showStatus('✅ Gegenstand gespeichert', 'success');
}

function itemDefDelete(id) {
  const d = _itemDefById(id); if (!d) return;
  const imShop = (typeof _shop !== 'undefined' && _shop && Array.isArray(_shop.items))
    ? _shop.items.filter(a => a.itemDefId === id).length : 0;
  const besitzer = Object.values(_inventar.spieler || {})
    .filter(s => s.eintraege && s.eintraege[id] && s.eintraege[id].anzahl > 0).length;
  let warnung = '„' + (d.name || id) + '" wirklich aus dem Katalog entfernen?';
  if (imShop)   warnung += '\n\n⚠️ ' + imShop + ' Shop-Artikel verweisen darauf. Sie fallen auf ihre eigene Einstellung zurück.';
  if (besitzer) warnung += '\n⚠️ ' + besitzer + ' Spieler besitzen ihn. Die Inventar-Einträge bleiben erhalten.';
  if (!confirm(warnung)) return;
  _itemDefs.items = _itemDefs.items.filter(x => x.id !== id);
  _saveItemDefs();
  renderItemDefsTab();
  renderInventarTab();
}

function itemDefPickInhalt() {
  // Derselbe Auswahl-Dialog wie im Shop: Item, Curse oder Outfit/Profil.
  ipickerOpen('item', v => {
    if (v.type === 'item') {
      _itemDefInhalt = v.itemConfig
        ? { itemConfig: v.itemConfig, item: v.itemConfig.asset, gruppe: v.itemConfig.group }
        : { item: v.name, gruppe: v.group, farbe: '#ffffff' };
    } else if (v.type === 'curse') {
      _itemDefInhalt = { curseKey: v.key, curseName: v.name, curseEntry: v.entry };
    } else if (v.type === 'profil') {
      _itemDefInhalt = { profilName: v.name, profilItems: (typeof PROFILES !== 'undefined' && PROFILES[v.name] && PROFILES[v.name].items) || [] };
    }
    _itemDefInhaltLabel();
    const el = document.getElementById('itemdef-editor');
    if (el) el.style.display = 'block';
  });
}
function itemDefClearInhalt() { _itemDefInhalt = null; _itemDefInhaltLabel(); }

// ══ Inventar-Buchhaltung ══════════════════════════════════════════════
/* Eintraege werden nie entfernt. Ist die Anzahl 0, bleibt der Eintrag
   stehen und erscheint in !inventar als "(Anzahl 0)". */
function _invSpieler(mn, name) {
  const k = String(mn);
  const s = (_inventar.spieler[k] = _inventar.spieler[k] || { name: name || ('#' + k), eintraege: {} });
  if (name) s.name = name;
  if (!s.eintraege) s.eintraege = {};
  return s;
}
function _invAnzahl(mn, itemDefId) {
  const s = _inventar.spieler[String(mn)];
  return (s && s.eintraege && s.eintraege[itemDefId]) ? (s.eintraege[itemDefId].anzahl || 0) : 0;
}
function _invBuchen(mn, name, itemDefId, delta) {
  if (mn == null || !itemDefId) return 0;
  const s = _invSpieler(mn, name);
  const e = (s.eintraege[itemDefId] = s.eintraege[itemDefId] || { anzahl: 0 });
  e.anzahl = Math.max(0, (e.anzahl || 0) + Number(delta || 0));
  return e.anzahl;
}
/* Meldung des Bots verarbeiten (BOT_INVENTAR). */
function _invApply(d) {
  if (!d) return;
  if (d.modus === 'ausleihe') {
    _inventar.ausleihe = Array.isArray(d.ausleihe) ? d.ausleihe : [];
  } else {
    _invBuchen(d.memberNum, d.name, d.itemDefId, d.delta);
    if (Array.isArray(d.ausleihe)) _inventar.ausleihe = d.ausleihe;
  }
  _saveInventar();
  if (typeof _activeTab !== 'undefined' && _activeTab === 'inventar') renderInventarTab();
}

// ══ Inventar-Oberflaeche ══════════════════════════════════════════════
function invSet(feld, wert) {
  _inventar.settings[feld] = wert;
  _saveInventar();
  if (feld === 'fremdErlaubt') renderInventarTab();
}

function renderInventarTab() {
  const g = id => document.getElementById(id);
  if (!g('inv-wear-cmd')) return;
  const s = _inventar.settings;
  if (document.activeElement !== g('inv-wear-cmd')) g('inv-wear-cmd').value = s.wearCmd || '!wear';
  if (document.activeElement !== g('inv-list-cmd')) g('inv-list-cmd').value = s.listCmd || '!inventar';
  g('inv-fremd').checked = s.fremdErlaubt !== false;
  const rang = g('inv-fremd-rang');
  if (rang) {
    const defs = (typeof _rankData !== 'undefined' && _rankData && _rankData.defs) ? _rankData.defs.slice() : [];
    defs.sort((a, b) => ((a.group || '').localeCompare(b.group || '')) || ((a.level || 0) - (b.level || 0)));
    rang.innerHTML = '<option value="">– jeder darf –</option>' + defs.map(r =>
      '<option value="' + r.id + '" ' + (s.fremdRangId === r.id ? 'selected' : '') + '>' +
      escHtml((r.icon || '') + ' ' + r.name) + ' (Lv.' + r.level + ')</option>').join('');
    rang.disabled = s.fremdErlaubt === false;
  }

  // ── Bestand je Spieler ──
  const el = g('inv-spieler-liste');
  if (el) {
    const mns = Object.keys(_inventar.spieler || {});
    if (!mns.length) {
      el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:14px 0">Noch niemand besitzt etwas.</div>';
    } else {
      el.innerHTML = mns.map(mn => {
        const sp = _inventar.spieler[mn];
        const eintraege = Object.entries(sp.eintraege || {});
        const zeilen = eintraege.length ? eintraege.map(([did, e]) => {
          const d = _itemDefById(did);
          const nm = d ? ((d.icon || '🎁') + ' ' + d.name) : ('❓ ' + did + ' (nicht mehr im Katalog)');
          const anz = (d && d.unendlich) ? '∞' : ('Anzahl ' + (e.anzahl || 0));
          const grau = (!(d && d.unendlich) && !(e.anzahl > 0)) ? 'opacity:.5;' : '';
          return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:.66rem;padding:2px 0;' + grau + '">' +
                 '<span>' + escHtml(nm) + '</span><span style="color:var(--text3)">' + anz + '</span></div>';
        }).join('') : '<div style="font-size:.62rem;color:var(--text3)">– leer –</div>';
        return '<div style="border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:8px 10px;margin-bottom:6px">' +
          '<div style="font-size:.72rem;font-weight:600;margin-bottom:4px">' + escHtml(sp.name || ('#' + mn)) +
          ' <span style="color:var(--text3);font-weight:400">#' + escHtml(mn) + '</span></div>' + zeilen + '</div>';
      }).join('');
    }
  }

  // ── Wer traegt gerade was von wem ──
  const al = g('inv-ausleihe-liste');
  if (al) {
    const a = _inventar.ausleihe || [];
    al.innerHTML = !a.length
      ? '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:10px 0">Gerade ist nichts verliehen.</div>'
      : a.map(x => {
          const d = _itemDefById(x.itemDefId);
          const nm = d ? ((d.icon || '🎁') + ' ' + d.name) : ('❓ ' + x.itemDefId);
          const besitzer = (_inventar.spieler[String(x.ownerMn)] || {}).name || ('#' + x.ownerMn);
          const traeger  = (_inventar.spieler[String(x.wearerMn)] || {}).name || ('#' + x.wearerMn);
          const selbst = String(x.ownerMn) === String(x.wearerMn);
          return '<div style="font-size:.66rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">' +
            escHtml(nm) + ' — ' + escHtml(besitzer) +
            (selbst ? ' <span style="color:var(--text3)">trägt selbst</span>'
                    : ' → getragen von <b>' + escHtml(traeger) + '</b>') + '</div>';
        }).join('');
  }
}
