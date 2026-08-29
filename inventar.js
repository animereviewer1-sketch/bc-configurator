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
  keyWacheAn: true,      // erschlichene Map-Keys sofort wieder entziehen
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

/* Alle je vergebenen Kategorien, alphabetisch. Es gibt bewusst keine
   getrennte Verwaltung: eine Kategorie entsteht durch Tippen und
   verschwindet, sobald sie niemand mehr benutzt. */
function _itemKategorien() {
  const s = new Set();
  (_itemDefs.items || []).forEach(d => (d.kategorien || []).forEach(k => { if (k) s.add(k); }));
  return [...s].sort((a, b) => a.localeCompare(b, 'de'));
}
function _katListe(text) {
  return String(text || '').split(',').map(x => x.trim()).filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i);
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

  // ── Filterleiste ──
  const kats = _itemKategorien();
  const knopf = (wert, text, aktiv) =>
    '<button onclick="itemDefFilter(\'' + escJsAttr(wert) + '\')" style="font-size:.62rem;padding:3px 9px;border-radius:11px;cursor:pointer;' +
    (aktiv ? 'background:var(--pd,#3a2a6a);border:1px solid #8b5cf6;color:var(--pl,#cbb6ff)'
           : 'background:none;border:1px solid rgba(255,255,255,0.12);color:var(--text3)') + '">' + escHtml(text) + '</button>';
  const filter = _itemDefFilterKat;
  const leiste = kats.length
    ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">'
      + knopf('', 'Alle', !filter)
      + kats.map(k => knopf(k, k, filter === k)).join('')
      + knopf('__ohne__', 'ohne Kategorie', filter === '__ohne__')
      + '</div>'
    : '';

  // ── Nach Kategorie gruppieren. Ein Gegenstand mit mehreren Kategorien
  //    erscheint unter jeder davon. ──
  const gruppen = new Map();
  const einsortieren = (name, d) => {
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push(d);
  };
  items.forEach(d => {
    const ks = (d.kategorien || []).filter(Boolean);
    if (!ks.length) einsortieren('__ohne__', d);
    else ks.forEach(k => einsortieren(k, d));
  });

  const reihenfolge = [...gruppen.keys()].filter(k => k !== '__ohne__').sort((a, b) => a.localeCompare(b, 'de'));
  if (gruppen.has('__ohne__')) reihenfolge.push('__ohne__');
  const sichtbar = reihenfolge.filter(k => !filter || k === filter);

  el.innerHTML = leiste + (sichtbar.length ? sichtbar.map(k =>
    (reihenfolge.length > 1 || k !== '__ohne__'
      ? '<div style="font-size:.66rem;font-weight:700;color:var(--text2);margin:10px 0 4px">'
        + escHtml(k === '__ohne__' ? '– ohne Kategorie –' : k)
        + ' <span style="color:var(--text3);font-weight:400">(' + gruppen.get(k).length + ')</span></div>'
      : '')
    + _itemDefKarten(gruppen.get(k))).join('')
    : '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:14px 0">In dieser Kategorie ist nichts.</div>');
}

let _itemDefFilterKat = '';
function itemDefFilter(k) {
  _itemDefFilterKat = (_itemDefFilterKat === k) ? '' : k;
  renderItemDefsTab();
}

function _itemDefKarten(items) {
  return items.map(d => {
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
          ((d.kategorien || []).length > 1 ? ' · ' + escHtml((d.kategorien || []).join(', ')) : '') +
        '</div>' +
      '</div>' +
      '<button onclick="itemDefEdit(\'' + escJsAttr(d.id) + '\')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">✏️</button>' +
      '<button onclick="itemDefDelete(\'' + escJsAttr(d.id) + '\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">✕</button>' +
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
  g('itemdef-kats').value = '';
  _itemDefKatVorschlaege();
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
  g('itemdef-kats').value = (d.kategorien || []).join(', ');
  _itemDefKatVorschlaege();
  _itemDefInhalt = d.inhalt || null; _itemDefInhaltLabel();
  g('itemdef-titel').textContent = '✏️ Gegenstand bearbeiten';
  g('itemdef-editor').style.display = 'block';
  try { g('itemdef-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
}

/* Bereits vergebene Kategorien als Vorschlagsliste anbieten. */
function _itemDefKatVorschlaege() {
  const dl = document.getElementById('itemdef-kat-liste');
  if (!dl) return;
  dl.innerHTML = _itemKategorien().map(k => '<option value="' + escHtml(k) + '"></option>').join('');
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
    kategorien: _katListe(g('itemdef-kats').value),
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
/* Der Name einer Person kann in vier Speichern stehen. Wer nur Keys hat,
   ist im Inventar sonst nur eine Nummer. */
function _invName(mn) {
  const k = String(mn);
  const q = [
    (_inventar.spieler[k] || {}).name,
    (typeof _playerKeys !== 'undefined' && _playerKeys[k]) ? _playerKeys[k].name : '',
    (typeof _rankData !== 'undefined' && _rankData.players && _rankData.players[k]) ? _rankData.players[k].name : '',
    (typeof _money !== 'undefined' && _money.balances && _money.balances[k]) ? _money.balances[k].name : ''
  ];
  for (const n of q) if (n) return n;
  return '#' + k;
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

// ══ Inventar von Hand aendern ════════════════════════════════════════
/* Den LAUFENDEN Bot mitziehen.

   Der Bot fuehrt eine eigene Kopie des Bestands. Ohne diesen Anstoss waere
   eine Aenderung von Hand beim naechsten Vorgang des Bots wieder
   ueberschrieben. Laeuft kein Bot, passiert schlicht nichts. */
function _invBotMitziehen(mn, itemDefId, anzahl) {
  try {
    if (typeof _connected === 'undefined' || !_connected) return;
    const b = (typeof _selBot === 'function') ? _selBot() : null;
    if (!b || !b.laufend) return;
    const safeId = b.id.replace(/\W/g, '_');
    bcSend({ type: 'EXEC', code:
      'try{window[' + JSON.stringify('_BCBot_' + safeId) + '].invSetzen('
      + JSON.stringify(String(mn)) + ',' + JSON.stringify(String(itemDefId)) + ',' + Number(anzahl) + ');}catch(e){}' });
  } catch (e) { /* darf die Bedienung nie stoeren */ }
}

/* Anzahl setzen. Negatives gibt es nicht, und der Eintrag bleibt auch bei
   0 stehen - so verschwindet nichts aus der Uebersicht. */
function invAnzahlSetzen(mn, itemDefId, wert) {
  const n = Math.max(0, Math.floor(Number(wert) || 0));
  const sp = _invSpieler(mn);
  sp.eintraege[itemDefId] = sp.eintraege[itemDefId] || { anzahl: 0 };
  sp.eintraege[itemDefId].anzahl = n;
  _saveInventar();
  _invBotMitziehen(mn, itemDefId, n);
  renderInventarTab();
}
function invAnzahlUm(mn, itemDefId, delta) {
  invAnzahlSetzen(mn, itemDefId, _invAnzahl(mn, itemDefId) + Number(delta || 0));
}
/* Einem Spieler einen Gegenstand geben, den er noch gar nicht hat. */
function invGeben(mn, itemDefId) {
  if (!itemDefId) return;
  invAnzahlSetzen(mn, itemDefId, _invAnzahl(mn, itemDefId) + 1);
  const d = _itemDefById(itemDefId);
  showStatus('✅ ' + ((d && d.name) || itemDefId) + ' gegeben', 'success');
}
/* Eine haengengebliebene Ausleihe von Hand zurueckbuchen. */
function invAusleiheAufloesen(id) {
  const i = (_inventar.ausleihe || []).findIndex(x => x.id === id);
  if (i < 0) return;
  const l = _inventar.ausleihe[i];
  const d = _itemDefById(l.itemDefId);
  if (!confirm('„' + ((d && d.name) || l.itemDefId) + '" an den Besitzer zurückbuchen?')) return;
  _inventar.ausleihe.splice(i, 1);
  const neu = _invAnzahl(l.ownerMn, l.itemDefId) + 1;
  const sp = _invSpieler(l.ownerMn);
  sp.eintraege[l.itemDefId] = sp.eintraege[l.itemDefId] || { anzahl: 0 };
  sp.eintraege[l.itemDefId].anzahl = neu;
  _saveInventar();
  _invBotMitziehen(l.ownerMn, l.itemDefId, neu);
  // Auch die Ausleihliste im laufenden Bot bereinigen
  try {
    if (typeof _connected !== 'undefined' && _connected) {
      const b = _selBot();
      if (b && b.laufend) {
        const safeId = b.id.replace(/\W/g, '_');
        bcSend({ type: 'EXEC', code:
          'try{window[' + JSON.stringify('_BCBot_' + safeId) + '].leiheLoeschen(' + JSON.stringify(id) + ');}catch(e){}' });
      }
    }
  } catch (e) {}
  renderInventarTab();
}
/* Nur ausblenden - die Daten bleiben vollstaendig erhalten. */
function invSpielerAusblenden(mn, versteckt) {
  const sp = _invSpieler(mn);
  sp.versteckt = !!versteckt;
  _saveInventar();
  renderInventarTab();
}
/* Map-Keys. Es gibt genau drei Arten, und je Art hoechstens einen -
   deshalb ein Schalter je Art statt einer Stueckzahl.

   Die Keys lagen bisher im Spieler-Tab. Sie gehoeren aber zum Besitz einer
   Person, darum stehen sie jetzt hier neben dem Inventar. */
const INV_KEYS = [['bronze', 'Bronze', '#b08d57'], ['silver', 'Silver', '#b9bcc2'], ['gold', 'Gold', '#d9b44a']];

function invKeyUm(mn, art) {
  const k = String(art || '').toLowerCase();
  if (!INV_KEYS.some(x => x[0] === k)) return;
  const pk = (typeof _playerKeys !== 'undefined' && _playerKeys) ? _playerKeys : null;
  if (!pk) return;
  const rec = pk[String(mn)] || { name: '', bronze: false, silver: false, gold: false };
  const neu = !rec[k];
  const name = (_inventar.spieler[String(mn)] || {}).name || rec.name || '';
  // _playerKeyApply speichert und zeichnet den Spieler-Tab neu
  if (typeof _playerKeyApply === 'function') _playerKeyApply(mn, name, k, neu);
  // Und der laufende Bot bekommt es mit - sonst vergibt er beim naechsten
  // Rejoin wieder den alten Stand.
  try {
    if (typeof _connected !== 'undefined' && _connected && typeof _selBot === 'function') {
      const b = _selBot();
      if (b && b.laufend) {
        const safeId = b.id.replace(/\W/g, '_');
        bcSend({ type: 'EXEC', code:
          'try{window[' + JSON.stringify('_BCBot_' + safeId) + '].setKey('
          + JSON.stringify(String(mn)) + ',' + JSON.stringify(k) + ',' + (neu ? 'true' : 'false') + ');}catch(e){}' });
      }
    }
  } catch (e) {}
  renderInventarTab();
}

let _invZeigeVersteckte = false;
function invZeigeVersteckte(an) { _invZeigeVersteckte = !!an; renderInventarTab(); }

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
  { const kw = g('inv-keywache'); if (kw) kw.checked = s.keyWacheAn !== false; }
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
    /* Auch wer nur Keys hat, soll hier auftauchen - sonst waeren die
       Keys mancher Leute unerreichbar. */
    const mitKeys = (typeof _playerKeys !== 'undefined' && _playerKeys) ? Object.keys(_playerKeys) : [];
    const alle = [...new Set(Object.keys(_inventar.spieler || {}).concat(mitKeys))];
    const versteckt = alle.filter(mn => (_inventar.spieler[mn] || {}).versteckt);
    const mns = _invZeigeVersteckte ? alle : alle.filter(mn => !(_inventar.spieler[mn] || {}).versteckt);
    const kopf = versteckt.length
      ? '<label style="display:flex;align-items:center;gap:6px;font-size:.63rem;color:var(--text3);margin-bottom:6px;cursor:pointer">'
        + '<input type="checkbox" ' + (_invZeigeVersteckte ? 'checked' : '') + ' onchange="invZeigeVersteckte(this.checked)">'
        + versteckt.length + ' ausgeblendete anzeigen</label>'
      : '';
    // Auswahlliste zum Geben - nur aktive Gegenstaende
    const katalog = _itemDefAktive();
    if (!alle.length) {
      el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:14px 0">Noch niemand besitzt etwas.</div>';
    } else if (!mns.length) {
      el.innerHTML = kopf + '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:14px 0">Alle Spieler sind ausgeblendet.</div>';
    } else {
      el.innerHTML = kopf + mns.map(mn => {
        // Beim Zeichnen wird nichts angelegt - sonst entstuenden allein
        // durch das Ansehen neue Inventar-Eintraege.
        const sp = _inventar.spieler[mn] || { eintraege: {} };
        const eintraege = Object.entries(sp.eintraege || {});
        const zeilen = eintraege.length ? eintraege.map(([did, e]) => {
          const d = _itemDefById(did);
          const nm = d ? ((d.icon || '🎁') + ' ' + d.name) : ('❓ ' + did + ' (nicht mehr im Katalog)');
          const unbegrenzt = !!(d && d.unendlich);
          const grau = (!unbegrenzt && !(e.anzahl > 0)) ? 'opacity:.55;' : '';
          const knopf = (zeichen, delta, titel) =>
            '<button title="' + titel + '" onclick="invAnzahlUm(\'' + escJsAttr(mn) + '\',\'' + escJsAttr(did) + '\',' + delta + ')"'
            + ' style="background:none;border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:var(--text2);'
            + 'font-size:.66rem;width:20px;height:20px;line-height:1;cursor:pointer;padding:0">' + zeichen + '</button>';
          const rechts = unbegrenzt
            ? '<span style="font-size:.63rem;color:#a78bfa;min-width:96px;text-align:right">∞ unbegrenzt</span>'
            : knopf('−', -1, 'eins weniger')
              + '<input type="number" min="0" value="' + (e.anzahl || 0) + '"'
              + ' onchange="invAnzahlSetzen(\'' + escJsAttr(mn) + '\',\'' + escJsAttr(did) + '\',this.value)"'
              + ' style="width:52px;text-align:center;background:var(--bg3,#1a1a24);border:1px solid rgba(255,255,255,0.1);'
              + 'border-radius:4px;color:var(--text1);font-size:.66rem;padding:2px 4px">'
              + knopf('+', 1, 'eins mehr');
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.66rem;padding:3px 0;' + grau + '">'
            + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(nm) + '</span>'
            + '<span style="display:flex;align-items:center;gap:4px">' + rechts + '</span></div>';
        }).join('') : '<div style="font-size:.62rem;color:var(--text3);padding:3px 0">– noch nichts –</div>';

        const geben = katalog.length
          ? '<div style="display:flex;gap:6px;margin-top:6px">'
            + '<select onchange="if(this.value){invGeben(\'' + escJsAttr(mn) + '\',this.value);this.value=\'\';}"'
            + ' style="flex:1;background:var(--bg3,#1a1a24);border:1px solid rgba(255,255,255,0.1);border-radius:5px;'
            + 'color:var(--text2);font-size:.64rem;padding:3px 6px">'
            + '<option value="">+ Gegenstand geben …</option>'
            + katalog.map(d => '<option value="' + escHtml(d.id) + '">' + escHtml((d.icon || '🎁') + ' ' + d.name) + '</option>').join('')
            + '</select></div>'
          : '';

        // ── Map-Keys, hoechstens einer je Art ──
        const pk = (typeof _playerKeys !== 'undefined' && _playerKeys && _playerKeys[mn]) || {};
        const keys = '<div style="display:flex;align-items:center;gap:5px;margin-top:6px;padding-top:6px;'
          + 'border-top:1px solid rgba(255,255,255,.06)">'
          + '<span style="font-size:.62rem;color:var(--text3);margin-right:2px">🔑 Keys</span>'
          + INV_KEYS.map(([k, lbl, c]) => {
              const an = !!pk[k];
              return '<button title="' + (an ? 'wegnehmen' : 'geben') + '"'
                + ' onclick="invKeyUm(\'' + escJsAttr(mn) + '\',\'' + k + '\')"'
                + ' style="font-size:.62rem;padding:2px 9px;border-radius:5px;cursor:pointer;'
                + 'border:1px solid ' + (an ? c : 'rgba(255,255,255,0.1)') + ';'
                + 'background:' + (an ? c + '1f' : 'transparent') + ';'
                + 'color:' + (an ? c : 'var(--text3)') + '">' + lbl + (an ? ' ✓' : '') + '</button>';
            }).join('')
          + '</div>';

        return '<div style="border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:8px 10px;margin-bottom:6px;'
          + (sp.versteckt ? 'opacity:.6' : '') + '">'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
            + '<span style="font-size:.72rem;font-weight:600">' + escHtml(_invName(mn))
            + ' <span style="color:var(--text3);font-weight:400">#' + escHtml(mn) + '</span></span>'
            + '<button title="' + (sp.versteckt ? 'wieder anzeigen' : 'ausblenden – die Daten bleiben erhalten') + '"'
            + ' onclick="invSpielerAusblenden(\'' + escJsAttr(mn) + '\',' + (sp.versteckt ? 'false' : 'true') + ')"'
            + ' style="margin-left:auto;background:none;border:1px solid rgba(255,255,255,0.12);border-radius:5px;'
            + 'color:var(--text3);font-size:.6rem;padding:2px 7px;cursor:pointer">'
            + (sp.versteckt ? '👁 einblenden' : '🙈 ausblenden') + '</button>'
          + '</div>' + zeilen + geben + keys + '</div>';
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
          const besitzer = _invName(x.ownerMn);
          const traeger  = _invName(x.wearerMn);
          const selbst = String(x.ownerMn) === String(x.wearerMn);
          return '<div style="display:flex;align-items:center;gap:8px;font-size:.66rem;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">' +
            '<span style="flex:1">' + escHtml(nm) + ' — ' + escHtml(besitzer) +
            (selbst ? ' <span style="color:var(--text3)">trägt selbst</span>'
                    : ' → getragen von <b>' + escHtml(traeger) + '</b>') + '</span>' +
            '<button title="Von Hand an den Besitzer zurückbuchen" onclick="invAusleiheAufloesen(\'' + escJsAttr(x.id) + '\')"' +
            ' style="background:none;border:1px solid rgba(255,255,255,0.12);border-radius:5px;color:var(--text3);' +
            'font-size:.6rem;padding:2px 8px;cursor:pointer">↩ zurückbuchen</button></div>';
        }).join('');
  }
}
