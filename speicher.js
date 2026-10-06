// ── speicher.js — Speicher-Anzeige (GB / Limit) und Aufräumen ────────────────────────────────────────
// A) Anzeige: alle paar Sekunden wird der Speicher dieses Tabs gelesen (nur Chrome meldet ihn) und unten rechts als „X GB / Limit GB“ gezeigt – ohne Meldungen
//    oder Fenster. Stürzt der Tab ab, merkt sich das Tool beim nächsten Start den letzten Stand (Einstellungen → Speicher, „Erkannte Abstürze“).
// B) Aufräumen (Einstellungen → Speicher): zeigt gespeicherte Daten, die die aktuelle Version nicht mehr benutzt, und entfernt sie – nur nach
//    ausdrücklicher Bestätigung, nie von selbst. Bilder, Outfits, Bots und alles Benutzte werden hier nicht angeboten.
//
// Lädt NACH persistence.js und items.js (docs/LOAD-ORDER.md). Blatt-Modul: kein Eintrag in CORE_SCRIPTS.

// ── Ladereihenfolge-Guard (Muster scan-tab.js, docs/LOAD-ORDER.md) ──────────
(function () {
  if (typeof window === 'undefined') return;
  const required = [
    ['idbGet', 'persistence.js'], ['idbSet', 'persistence.js'], ['idbKvSchluessel', 'persistence.js'], ['idbKvLoeschen', 'persistence.js'],
    ['idbScreenshotKeysOf', 'persistence.js'], ['showStatus', 'items.js'], ['escHtml', 'items.js'],
  ];
  const missing = required.filter(function (e) { return typeof window[e[0]] !== 'function'; }).map(function (e) { return e[1]; }).filter(function (f, i, a) { return a.indexOf(f) === i; });
  if (!missing.length) return;
  const msg = 'FATAL: ' + missing.join(', ') + ' wurde nicht vor speicher.js geladen – Ladereihenfolge in index.html prüfen (siehe docs/LOAD-ORDER.md)';
  try {
    const box = document.createElement('div');
    box.id = 'loadOrderFatal';
    box.textContent = msg;
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:16px 20px;background:#3b0a0a;color:#ffb4b4;font:14px/1.5 monospace;';
    (document.body || document.documentElement).appendChild(box);
  } catch (e) {}
  console.error('[BCK-Popup] ' + msg);
  throw new Error(msg);
})();

const SPEICHER_SITZUNG_KEY = 'BC_SPEICHER_SITZUNGEN_v1';    // localStorage: je Fenster { start, ts, laeuft, spitzeMB }
const SPEICHER_ABSTUERZE_KEY = 'BC_SPEICHER_ABSTUERZE_v1';  // localStorage: die letzten erkannten Abstürze [{ ts, spitzeMB }]
const SPEICHER_INTERVALL_MS = 5000;

// ═══════════════════════════ Liste der Schlüssel (Datenbank und localStorage) ═══════════════════════════
// Alles, was die AKTUELLE Version benutzt. tests/speicher.test.js prüft, dass jeder im Code vorkommende Schlüssel hier (oder in einer der
// anderen Listen) steht – kommt ein neuer Schlüssel dazu, schlägt der Test an, bis er eingetragen ist. Nur so ist „unbekannt“ verlässlich.
const SPEICHER_AKTIV = [
  'BC_ASSET_BASE_v1', 'BC_ASSET_FAMILY_v1', 'BC_AUTOBACKUP_v2', 'BC_AutoBild_v1', 'BC_BotGroups_v1', 'BC_Bots_v2', 'BC_BotVars_v1', 'BC_CACHE_v12',
  'BC_CURSE_COMMENTS_v1', 'BC_CURSE_DB_v1', 'BC_CURSE_DEFAULT_OUTFIT_v3', 'BC_CURSE_FAV_v1', 'BC_CURSE_GRUPPE_v1', 'BC_CURSE_OUTFIT_v1', 'BC_CURSE_SCAN_META_v1',
  'BC_DC_POPUP_v1', 'BC_DEFAULT_HAIR_v1', 'BC_ExecLog_v1', 'BC_FAV_MEMBERS_v1', 'BC_FAVORITES_v9', 'BC_IMPORT_OUTFITS_v1', 'BC_Inventar_v1', 'BC_ItemDefs_v1',
  'BC_LAST_MEMBER_v1', 'BC_LOCK_CODE_v1', 'BC_LOCK_FILTER_v1', 'BC_LOCK_MODS_SEEN_v1', 'BC_LOCK_RULES_v1', 'BC_LOCK_SETZER_v1', 'BC_LOCK_ZEIT_v1', 'BC_LOCK_ZIEL_v1',
  'BC_LSCG_FAVS_v1', 'BC_LSCG_IGNORE_v1', 'BC_LSCG_OUTFIT_FAVS_v1', 'BC_LSCG_OUTFITS_LS_v3', 'BC_LSCG_OUTFITS_v3', 'BC_LSCG_SLOTS_v1', 'BC_LSCG_SORT_v1',
  'BC_MBS_WHEEL_FAVS_v1', 'BC_MBS_WHEEL_OFAVS_v1', 'BC_MBS_WHEEL_SORT_v1', 'BC_MBS_WHEEL_v1', 'BC_Money_v1', 'BC_OI_BODY_BASE_v1', 'BC_PlayerKeys_v1',
  'BC_PROFILE_ALT_OWNERS_v1', 'BC_PROFILE_FAVS_v1', 'BC_PROFILE_SORT_v1', 'BC_PROFILE_TAGS_v1', 'BC_PROFILES_v11', 'BC_PROFILES_v12', 'BC_Rank_v1',
  'BC_SCREENSHOT_MIGRATION_v1', 'BC_SendeBremse_v1', 'BC_Shop_v1', 'BC_StartFilter_v1', 'BC_UI_NovaSide', 'BC_UI_SetTab', 'BC_USER_COLOR_THEMES_v1',
  'BC_WHEEL_HOCH_v1', 'BCBot_Logs', 'BCK_Tweaks_v1', '__OI_BODY_BASE_v1',
  SPEICHER_SITZUNG_KEY, SPEICHER_ABSTUERZE_KEY,
];
// Eingefrorene Alt-Kopien der Bilder (vor dem Umzug in den Bild-Speicher) – werden nicht mehr benutzt
const SPEICHER_ALTKOPIEN = ['BC_PROFILE_SCREENSHOTS_v1', 'BC_LSCG_SCREENSHOTS_v1', 'BC_MBS_WHEEL_SS_v1'];
// Daten des ausgebauten Tabs „Spielerprofile“
const SPEICHER_SPIELER_KV = ['BC_SPIELERPROFILE_v1', 'BC_SPIELERCACHE_META_v1'];
const SPEICHER_SPIELER_PRAEFIX = 'BC_SPIELERBILD_v1:';
const SPEICHER_SPIELER_LS = ['BC_SPIELERPROFILE_SORT_v1', 'BC_SPIELERPROFILE_AUTOBILD_v1'];
// Früher benutzte, heute ersetzte Schlüssel (der Code räumt manche beim Start selbst auf)
const SPEICHER_VERALTET = ['BC_CURSE_DEFAULT_OUTFIT_v1', 'BC_CURSE_DEFAULT_OUTFIT_v2', 'BC_CACHE_v11', 'BC_RoomEver_v1'];

// ═══════════════════════════ Reine Logik (ohne DOM, testbar) ═══════════════════════════

// Immer in GB mit einer Nachkommastelle: "1,4 GB" (für die Anzeige unten rechts)
function speicherGBText(mb) { return ((Number(mb) || 0) / 1024).toFixed(1).replace('.', ',') + ' GB'; }
function speicherBytesText(b) {
  b = Number(b) || 0;
  if (b >= 1073741824) return (b / 1073741824).toFixed(2).replace('.', ',') + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
}

function _speicherPraefixPasst(key, praefix) { return key.slice(0, praefix.length) === praefix; }
// Schlüssel in Gruppen einteilen: aktiv (wird benutzt) / altKopien / spieler / veraltet / unbekannt – getrennt für Datenbank (kv) und localStorage (ls)
function speicherEinordnen(kvSchluessel, lsSchluessel) {
  const aktiv = new Set(SPEICHER_AKTIV);
  const aus = { aktiv: 0, altKopien: [], spieler: { kv: [], ls: [] }, veraltet: { kv: [], ls: [] }, unbekannt: { kv: [], ls: [] } };
  for (const k of (kvSchluessel || [])) {
    if (SPEICHER_ALTKOPIEN.indexOf(k) >= 0) aus.altKopien.push(k);
    else if (SPEICHER_SPIELER_KV.indexOf(k) >= 0 || _speicherPraefixPasst(k, SPEICHER_SPIELER_PRAEFIX)) aus.spieler.kv.push(k);
    else if (SPEICHER_VERALTET.indexOf(k) >= 0) aus.veraltet.kv.push(k);
    else if (aktiv.has(k)) aus.aktiv++;
    else aus.unbekannt.kv.push(k);
  }
  for (const k of (lsSchluessel || [])) {
    if (SPEICHER_SPIELER_LS.indexOf(k) >= 0) aus.spieler.ls.push(k);
    else if (SPEICHER_VERALTET.indexOf(k) >= 0) aus.veraltet.ls.push(k);
    else if (aktiv.has(k) || SPEICHER_ALTKOPIEN.indexOf(k) >= 0) aus.aktiv++;
    else aus.unbekannt.ls.push(k);
  }
  return aus;
}

// ═══════════════════════════ Speicher-Wächter ═══════════════════════════

function speicherLesen() {
  try {
    const m = performance && performance.memory;
    if (m && m.usedJSHeapSize > 0) return { genutzt: m.usedJSHeapSize / 1048576, limit: (m.jsHeapSizeLimit || 0) / 1048576 };
  } catch (e) {}
  return null;
}
function _speicherJson(key, standard) {
  try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : standard; } catch (e) { return standard; }
}
function _speicherSchreibe(key, wert) { try { localStorage.setItem(key, JSON.stringify(wert)); return true; } catch (e) { return false; } }

let _spchId = null;
try { _spchId = sessionStorage.getItem('BC_SPEICHER_ID') || null; } catch (e) {}
if (!_spchId) { _spchId = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); try { sessionStorage.setItem('BC_SPEICHER_ID', _spchId); } catch (e) {} }
let _spchSpitze = 0, _spchLetzterSchreib = 0, _spchGeschrieben = 0, _spchTimer = null;
let _spchAbstuerze = _speicherJson(SPEICHER_ABSTUERZE_KEY, []);

// Beim Start: War eine frühere Sitzung dieses Fensters (oder ein anderes Fenster, das sich nicht mehr meldet) NICHT sauber beendet, ist der Tab vermutlich
// abgestürzt ("Aw, Snap" / Out of Memory). Der höchste gemerkte Stand wird als Absturzstand vermerkt und senkt die Warnschwellen.
function speicherAbstuerzeErkennen(jetzt) {
  const sitz = _speicherJson(SPEICHER_SITZUNG_KEY, {});
  let neu = 0;
  for (const id of Object.keys(sitz)) {
    const s = sitz[id];
    if (!s || typeof s !== 'object') { delete sitz[id]; continue; }
    if (id === _spchId || (jetzt - (s.ts || 0) > 90000)) {
      if (s.laeuft && s.spitzeMB > 0) { _spchAbstuerze.push({ ts: s.ts || jetzt, spitzeMB: Math.round(s.spitzeMB) }); neu++; }
      if (id === _spchId || s.laeuft || jetzt - (s.ts || 0) > 7 * 86400000) delete sitz[id];
    }
  }
  if (neu) { _spchAbstuerze = _spchAbstuerze.slice(-5); _speicherSchreibe(SPEICHER_ABSTUERZE_KEY, _spchAbstuerze); }
  _speicherSchreibe(SPEICHER_SITZUNG_KEY, sitz);
  return neu;
}
function _speicherSitzungSchreiben(laeuft, jetzt) {
  const sitz = _speicherJson(SPEICHER_SITZUNG_KEY, {});
  sitz[_spchId] = { start: (sitz[_spchId] && sitz[_spchId].start) || jetzt, ts: jetzt, laeuft: laeuft, spitzeMB: Math.round(_spchSpitze) };
  _speicherSchreibe(SPEICHER_SITZUNG_KEY, sitz);
  _spchLetzterSchreib = jetzt;
  _spchGeschrieben = _spchSpitze;
}

function _speicherUiEnsure() {
  if (typeof document === 'undefined' || !document.body) return null;
  let chip = document.getElementById('speicherChip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'speicherChip';
    chip.className = 'spw-chip';
    chip.title = 'Arbeitsspeicher dieses Fensters / Limit des Browsers (Chrome). Klick öffnet Einstellungen → Speicher';
    chip.onclick = function () { speicherSeiteOeffnen(); };
    document.body.appendChild(chip);
  }
  return { chip: chip };
}

function speicherTick() {
  const m = speicherLesen();
  if (!m) return null;
  const jetzt = Date.now();
  if (m.genutzt > _spchSpitze) _spchSpitze = m.genutzt;
  // Den Stand für die Absturz-Erkennung festhalten: bei einem Anstieg um 50 MB und mehr gleich (so geht der Höchststand vor einem plötzlichen Absturz
  // nicht verloren), sonst alle 15 s (nur ein kleiner Eintrag im localStorage)
  if (jetzt - _spchLetzterSchreib > 15000 || (_spchSpitze - _spchGeschrieben >= 50 && jetzt - _spchLetzterSchreib > 1500)) _speicherSitzungSchreiben(true, jetzt);
  const ui = _speicherUiEnsure();
  if (ui) ui.chip.textContent = '🧠 ' + speicherGBText(m.genutzt) + (m.limit ? ' / ' + speicherGBText(m.limit) : '');
  return { genutzt: m.genutzt, limit: m.limit };
}

function speicherWaechterStarten() {
  const jetzt = Date.now();
  speicherAbstuerzeErkennen(jetzt);      // nur vermerkt (Einstellungen → Speicher), keine Meldung
  _speicherSitzungSchreiben(true, jetzt);
  try { addEventListener('pagehide', function () { _speicherSitzungSchreiben(false, Date.now()); }); } catch (e) {}
  if (!speicherLesen()) return false;      // ohne Speicherangabe (kein Chrome) gibt es nichts zu überwachen
  speicherTick();
  _spchTimer = setInterval(speicherTick, SPEICHER_INTERVALL_MS);
  return true;
}

// ═══════════════════════════ Aufräumen (Einstellungen → Speicher) ═══════════════════════════

function _speicherLsSchluessel() {
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k != null) out.push(k); } } catch (e) {}
  return out;
}
// Größe eines Eintrags in Zeichen (ein Wert nach dem anderen, damit nie mehr als ein Eintrag im Speicher liegt)
async function _speicherKvGroesse(key) {
  try {
    const v = await idbGet(key);
    if (v == null) return 0;
    return typeof v === 'string' ? v.length : JSON.stringify(v).length;
  } catch (e) { return 0; }
}
function _speicherLsGroesse(key) { try { return String(localStorage.getItem(key) || '').length + key.length; } catch (e) { return 0; } }

async function speicherStand() {
  const kv = await idbKvSchluessel();
  const ls = _speicherLsSchluessel();
  const e = speicherEinordnen(kv, ls);
  return { kv: kv, ls: ls, einordnung: e };
}

// Eine Gruppe löschen: Datenbank-Schlüssel und localStorage-Schlüssel. Gibt { kv, ls, fehler } zurück.
async function _speicherLoeschen(kvKeys, lsKeys) {
  let kv = 0, ls = 0, fehler = 0;
  for (const k of (kvKeys || [])) { if (await idbKvLoeschen(k)) kv++; else fehler++; }
  for (const k of (lsKeys || [])) { try { localStorage.removeItem(k); ls++; } catch (e) { fehler++; } }
  return { kv: kv, ls: ls, fehler: fehler };
}

// 1) Eingefrorene Alt-Kopien der Bilder. Nur, wenn die Übernahme der Bilder in den Bild-Speicher abgeschlossen und geprüft ist.
async function speicherAltKopienEntfernen() {
  const st = await speicherStand();
  const da = st.einordnung.altKopien;
  if (!da.length) { showStatus('ℹ️ Keine Alt-Kopien der Bilder vorhanden', 'info'); return false; }
  const marker = await idbGet('BC_SCREENSHOT_MIGRATION_v1');
  if (!marker || marker.done !== true) {
    showStatus('❌ Nicht entfernt: Die Bilder sind auf diesem Rechner noch nicht (geprüft) in den neuen Bild-Speicher übernommen. Die Alt-Kopien bleiben als Rückfall erhalten.', 'error');
    return false;
  }
  const kinds = { profile: 'Profil', lscg: 'LSCG', wheel: 'Wheel' };
  const luecken = [];
  for (const kind of Object.keys(kinds)) {
    const imStore = (await idbScreenshotKeysOf(kind)) || [];
    const soll = (marker.counts && marker.counts[kind]) || 0;
    if (imStore.length < soll) luecken.push(kinds[kind] + ': ' + imStore.length + ' statt ' + soll);
  }
  const text = 'Die ' + da.length + ' Alt-Kopie(n) der Bilder (' + da.join(', ') + ') endgültig aus der Datenbank entfernen?\n\n'
    + 'Das ist der eingefrorene Sicherheitsstand von vor dem Umzug der Bilder. Alle Bilder liegen inzwischen geprüft im neuen Bild-Speicher; die Alt-Kopien werden von der aktuellen Version nicht mehr benutzt, belegen aber viel Platz und Arbeitsspeicher (bei Sicherungen).\n\n'
    + (luecken.length ? '⚠️ Der Bild-Speicher hat weniger Bilder als bei der Übernahme (' + luecken.join(', ') + ') – vermutlich von dir gelöscht. Die Alt-Kopien enthalten diese Bilder evtl. noch.\n\n' : '')
    + 'Danach gibt es diesen Rückfall nicht mehr (nur noch deine Backup-Dateien). Entfernen?';
  if (!confirm(text)) return false;
  const r = await _speicherLoeschen(da, []);
  showStatus(r.fehler ? '⚠️ ' + r.kv + ' Alt-Kopie(n) entfernt, ' + r.fehler + ' ließen sich nicht entfernen' : '🧹 ' + r.kv + ' Alt-Kopie(n) der Bilder entfernt', r.fehler ? 'error' : 'success');
  speicherSeiteAktualisieren();
  return r.kv > 0;
}

// 2) Daten des ausgebauten Tabs „Spielerprofile“
async function speicherSpielerprofileEntfernen() {
  const st = await speicherStand();
  const e = st.einordnung.spieler;
  if (!e.kv.length && !e.ls.length) { showStatus('ℹ️ Keine Spielerprofil-Daten vorhanden', 'info'); return false; }
  const bilder = e.kv.filter(function (k) { return _speicherPraefixPasst(k, SPEICHER_SPIELER_PRAEFIX); }).length;
  const text = 'Die Daten des ausgebauten Tabs „Spielerprofile“ endgültig entfernen?\n\n'
    + '• gespeicherte Profile / Stand des WCE-Einlesens: ' + e.kv.filter(function (k) { return SPEICHER_SPIELER_KV.indexOf(k) >= 0; }).length + ' Einträge\n'
    + '• Spielerbilder: ' + bilder + '\n\n'
    + 'Der Tab ist nicht mehr im Tool; die Profile lassen sich jederzeit aus dem WCE/FBC-Speicher im Spiel neu einlesen. Entfernen?';
  if (!confirm(text)) return false;
  const r = await _speicherLoeschen(e.kv, e.ls);
  showStatus(r.fehler ? '⚠️ ' + r.kv + ' Einträge entfernt, ' + r.fehler + ' ließen sich nicht entfernen' : '🧹 Spielerprofil-Daten entfernt (' + r.kv + ' Einträge)', r.fehler ? 'error' : 'success');
  speicherSeiteAktualisieren();
  return r.kv + r.ls > 0;
}

// 3) Früher benutzte, heute ersetzte Schlüssel
async function speicherVeraltetEntfernen() {
  const st = await speicherStand();
  const e = st.einordnung.veraltet;
  if (!e.kv.length && !e.ls.length) { showStatus('ℹ️ Keine veralteten Einträge vorhanden', 'info'); return false; }
  if (!confirm('Diese Einträge werden von der aktuellen Version nicht mehr benutzt und endgültig entfernt:\n\n' + e.kv.concat(e.ls).join('\n') + '\n\nEntfernen?')) return false;
  const r = await _speicherLoeschen(e.kv, e.ls);
  showStatus(r.fehler ? '⚠️ ' + (r.kv + r.ls) + ' entfernt, ' + r.fehler + ' fehlgeschlagen' : '🧹 ' + (r.kv + r.ls) + ' veraltete Einträge entfernt', r.fehler ? 'error' : 'success');
  speicherSeiteAktualisieren();
  return r.kv + r.ls > 0;
}

// 4) Ein einzelner unbekannter Schlüssel (nicht in der Liste der benutzten) – mit Hinweis, dass man ihn vorher prüfen soll
async function speicherUnbekanntEntfernen(art, key) {
  const st = await speicherStand();
  const liste = art === 'ls' ? st.einordnung.unbekannt.ls : st.einordnung.unbekannt.kv;
  if (liste.indexOf(key) < 0) { showStatus('ℹ️ „' + key + '“ ist nicht (mehr) als unbekannt eingestuft – nichts entfernt', 'info'); return false; }
  const groesse = art === 'ls' ? _speicherLsGroesse(key) : await _speicherKvGroesse(key);
  if (!confirm('„' + key + '“ (' + (art === 'ls' ? 'Browser-Speicher' : 'Datenbank') + ', ca. ' + speicherBytesText(groesse) + ') endgültig entfernen?\n\n'
    + 'Dieser Schlüssel gehört zu keiner Funktion der aktuellen Version – er stammt aus einer älteren Fassung oder einem Rettungsskript. Prüfe vorher, ob du ihn noch brauchst (z. B. in einer Sicherung).')) return false;
  const r = art === 'ls' ? await _speicherLoeschen([], [key]) : await _speicherLoeschen([key], []);
  showStatus(r.fehler ? '❌ „' + key + '“ ließ sich nicht entfernen' : '🧹 „' + key + '“ entfernt', r.fehler ? 'error' : 'success');
  speicherSeiteAktualisieren();
  return !r.fehler;
}

// ── Seite ──
function speicherSeiteOeffnen() {
  const p = document.getElementById('tweaksPanel');
  if (p && !p.classList.contains('open') && typeof toggleTweaksPanel === 'function') toggleTweaksPanel();
  const tab = document.querySelector('[data-set-tab="speicher"]');
  if (tab) tab.click();
  speicherSeiteAktualisieren();
}

function _spZeileHtml(titel, hinweis, knopfText, knopfOnclick, extra) {
  return '<div class="set-li"><div><b>' + titel + '</b><div class="set-hint">' + hinweis + '</div>' + (extra || '') + '</div>'
    + (knopfText ? '<div class="set-r"><button class="tweaks-btn set-danger" onclick="' + knopfOnclick + '">' + knopfText + '</button></div>' : '') + '</div>';
}

let _speicherSeiteLaeuft = false;
async function speicherSeiteAktualisieren() {
  const el = document.getElementById('speicherSeite');
  if (!el || _speicherSeiteLaeuft) return;
  _speicherSeiteLaeuft = true;
  try {
    const m = speicherLesen();
    let h = '<div class="set-card"><div class="set-card-h"><span class="tweaks-section-title">🧠 Speicher dieses Fensters</span>'
      + '<div class="tweaks-btn-group set-r"><button class="tweaks-btn" onclick="speicherSeiteAktualisieren()">🔄 Aktualisieren</button></div></div><div class="set-card-b">';
    if (m) {
      h += '<div class="set-info"><b>' + escHtml(speicherGBText(m.genutzt)) + '</b> von ' + escHtml(speicherGBText(m.limit)) + ' (Spitze dieser Sitzung: ' + escHtml(speicherGBText(_spchSpitze)) + ')</div>';
      h += '<div class="set-hint">Die Bilder aller Tabs liegen im Speicher dieses Fensters – je mehr Bilder, desto höher der Stand. Stürzt der Tab ab („Out of Memory“), wird der letzte Stand unten vermerkt.</div>';
    } else h += '<div class="set-info">Dein Browser meldet den Speicher nicht (nur Chrome/Edge tun das).</div>';
    if (_spchAbstuerze.length) h += '<div class="set-hint">Erkannte Abstürze: ' + _spchAbstuerze.map(function (a) { return new Date(a.ts).toLocaleString('de-DE') + ' bei ' + speicherGBText(a.spitzeMB); }).map(escHtml).join(' · ') + '</div>';
    try {
      const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
      if (est) h += '<div class="set-hint">Plattenplatz des Browsers für dieses Tool: ' + escHtml(speicherBytesText(est.usage)) + ' belegt von ' + escHtml(speicherBytesText(est.quota)) + '.</div>';
    } catch (e) {}
    h += '</div></div>';

    const st = await speicherStand();
    const e = st.einordnung;
    h += '<div class="set-card"><div class="set-card-h"><span class="tweaks-section-title">🧹 Aufräumen – ungenutzte Daten</span></div><div class="set-card-b">'
      + '<div class="set-hint">Hier steht nur, was die aktuelle Version <b>nicht mehr benutzt</b>. Nichts wird von selbst gelöscht – jede Aktion fragt vorher. Benutzte Daten (' + e.aktiv + ' Einträge: Outfits, Bots, Bilder, Einstellungen …) werden hier nie angeboten.</div></div>';

    // Alt-Kopien
    h += _spZeileHtml('🗃️ Eingefrorene Alt-Kopien der Bilder', e.altKopien.length
      ? 'Vorhanden: ' + e.altKopien.map(escHtml).join(', ') + '. Das ist der Stand von vor dem Umzug der Bilder in den neuen Bild-Speicher. Sie werden nicht mehr benutzt, belegen aber viel Platz (Hunderte MB). Entfernt wird nur nach Prüfung, dass die Bilder im neuen Speicher liegen.'
      : '✅ Keine vorhanden.', e.altKopien.length ? '🧹 Entfernen' : '', 'speicherAltKopienEntfernen()');
    // Spielerprofile
    const spielerBilder = e.spieler.kv.filter(function (k) { return _speicherPraefixPasst(k, SPEICHER_SPIELER_PRAEFIX); }).length;
    const spielerRest = e.spieler.kv.length - spielerBilder;
    h += _spZeileHtml('🪪 Daten des ausgebauten Tabs „Spielerprofile“', (e.spieler.kv.length || e.spieler.ls.length)
      ? 'Vorhanden: ' + spielerRest + ' Profil-Datei(en) und ' + spielerBilder + ' Spielerbild(er). Der Tab ist nicht mehr im Tool; die Daten lassen sich im Spiel aus dem WCE/FBC-Speicher neu einlesen.'
      : '✅ Keine vorhanden.', (e.spieler.kv.length || e.spieler.ls.length) ? '🧹 Entfernen' : '', 'speicherSpielerprofileEntfernen()');
    // Veraltet
    const veralt = e.veraltet.kv.concat(e.veraltet.ls);
    h += _spZeileHtml('🕰️ Veraltete Einträge', veralt.length ? 'Früher benutzt, heute ersetzt: ' + veralt.map(escHtml).join(', ') + '.' : '✅ Keine vorhanden.', veralt.length ? '🧹 Entfernen' : '', 'speicherVeraltetEntfernen()');
    // Browser-Kopien (vorhandene Funktionen)
    h += _spZeileHtml('📋 Kopien im Browser-Speicher (localStorage)', 'Die alte Profil-Kopie und die Katalog-Kopie (der Browser-Speicher fasst nur ~5 MB). Jede hat ihren eigenen Knopf mit Rückfrage:',
      '', '', '<div class="spw-inline"><button class="tweaks-btn set-danger" onclick="lsProfilKopieEntfernen()">🧹 Profil-Kopie</button> <button class="tweaks-btn set-danger" onclick="lsKatalogKopieEntfernen()">🧹 Katalog-Kopie</button></div>');
    // Unbekannt
    const unb = [];
    for (const k of e.unbekannt.kv) unb.push({ art: 'kv', key: k, g: await _speicherKvGroesse(k) });
    for (const k of e.unbekannt.ls) unb.push({ art: 'ls', key: k, g: _speicherLsGroesse(k) });
    unb.sort(function (a, b) { return b.g - a.g; });
    h += '<div class="set-li"><div><b>❓ Unbekannte Einträge (' + unb.length + ')</b><div class="set-hint">Schlüssel, die zu keiner Funktion der aktuellen Version gehören – meist Reste älterer Fassungen oder von Rettungsskripten. Einzeln entfernbar; prüfe vorher, ob du sie noch brauchst.</div>'
      + (unb.length ? '<div class="spw-liste">' + unb.map(function (u) {
        return '<div class="spw-eintrag"><code>' + escHtml(u.key) + '</code> <span class="set-hint">' + (u.art === 'ls' ? 'Browser-Speicher' : 'Datenbank') + ' · ' + escHtml(speicherBytesText(u.g)) + '</span>'
          + ' <button class="tweaks-btn set-danger" data-art="' + u.art + '" data-key="' + escHtml(u.key) + '" onclick="speicherUnbekanntEntfernen(this.dataset.art, this.dataset.key)">🧹</button></div>';
      }).join('') + '</div>' : '<div class="set-info">✅ Keine unbekannten Einträge.</div>') + '</div></div>';
    h += '</div>';

    // Hinweis auf Codereste
    h += '<div class="set-card"><div class="set-card-b"><div class="set-hint">Ungenutzter <b>Code</b> (Funktionen ohne Aufrufer, nicht geladene Dateien) steht im Projekt unter <code>docs/UNGENUTZT.md</code> – er wird nicht hier, sondern nur nach deiner Freigabe im Projekt entfernt.</div></div></div>';
    el.innerHTML = h;
  } catch (err) {
    el.innerHTML = '<div class="set-card"><div class="set-card-b"><div class="set-info">❌ Die Übersicht konnte nicht erstellt werden: ' + escHtml(String(err && err.message || err)) + '</div></div></div>';
  } finally { _speicherSeiteLaeuft = false; }
}

try { speicherWaechterStarten(); } catch (e) { console.warn('[Speicher] Wächter nicht gestartet:', e); }
