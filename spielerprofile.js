// ── spielerprofile.js — Tab "Spielerprofile": alle Spieler, die du je gesehen hast, mit ihrem Profil ──────────────────
// Beschreibung, Titel, Besitzer/Lover, Konto-Alter, Mods, Crafts, geteilte Einstellungen … und wann du sie zuletzt gesehen hast.
// Gelesen wird im Spiel-Tab (loader.js, GET_SPIELER_PROFILE); hier wird gespeichert, zusammengeführt und angezeigt.
// Dazu der Profil-Speicher von WCE/FBC (Befehl "/profiles" im Spiel, Datenbank "bce-past-profiles"; loader.js, GET_SPIELER_CACHE)
// und je Spieler ein Bild (Spieler im Raum: ihr gezeichneter Puffer; alle anderen: aus dem gespeicherten Profil gezeichnet).
//
// Kernregel des Tools: gespeicherte Daten werden nie automatisch gelöscht oder überschrieben. Ein Spieler bleibt für immer in der
// Liste; neue Scans ergänzen (Mods vereinigen, Räume sammeln) und ändert sich ein Feld (z. B. die Beschreibung), steht die
// Änderung im Verlauf – die alte Fassung geht nicht verloren.
//
// Lädt NACH persistence.js, bridge.js und items.js (docs/LOAD-ORDER.md). Blatt-Modul: kein Eintrag in CORE_SCRIPTS.

// ── Ladereihenfolge-Guard (Muster scan-tab.js, docs/LOAD-ORDER.md) ──────────
(function () {
  if (typeof window === 'undefined') return;
  const required = [
    ['idbGet', 'persistence.js'], ['idbSet', 'persistence.js'],
    ['bcSend', 'bridge.js'], ['onBridgeMessage', 'bridge.js'],
    ['showStatus', 'items.js'], ['escHtml', 'items.js'], ['_sucheZerlegen', 'items.js'], ['_sucheTrifft', 'items.js'], ['_jsonParts', 'items.js'],
  ];
  const missing = required.filter(function (e) { return typeof window[e[0]] !== 'function'; }).map(function (e) { return e[1]; }).filter(function (f, i, a) { return a.indexOf(f) === i; });
  if (!missing.length) return;
  const msg = 'FATAL: ' + missing.join(', ') + ' wurde nicht vor spielerprofile.js geladen – Ladereihenfolge in index.html prüfen (siehe docs/LOAD-ORDER.md)';
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

const SPIELERPROFILE_KEY = 'BC_SPIELERPROFILE_v1';
const SP_BEGEGNUNG_PAUSE_MS = 30 * 60 * 1000;   // eine neue "Begegnung" zählt, wenn die letzte Sichtung länger her ist
const SP_NEU_MS = 48 * 60 * 60 * 1000;
const SP_SEITE = 200;                            // so viele Karten auf einmal – der Rest per "Mehr anzeigen"
// Felder, deren Änderung im Verlauf festgehalten wird
const SP_VERLAUF_FELDER = ['name', 'nickname', 'titel', 'pronomen', 'beschreibung', 'schwierigkeit', 'itemPermission', 'besitzer', 'lover'];
const SP_FELD_NAMEN = {
  notiz: 'Notiz (WCE/FBC)', name: 'Name', nickname: 'Spitzname', titel: 'Titel', pronomen: 'Pronomen', beschreibung: 'Beschreibung', schwierigkeit: 'Schwierigkeit',
  itemPermission: 'Item-Berechtigung', besitzer: 'Besitzer', lover: 'Lover',
};
const SP_SCHWIERIGKEIT = ['Roleplay', 'Normal', 'Hardcore', 'Extrem'];
// "Erlaubte Interaktionen" (BC: AllowedInteractions 0–5) und Beziehungsstufen (Lovership.Stage 0–2, Ownership.Stage 0 = Probezeit, 1 = Halsband)
const SP_ERLAUBT = ['Alle, keine Ausnahmen', 'Alle außer Blacklist', 'Besitzer, Lover, Whitelist und Dominante', 'Nur Besitzer, Lover und Whitelist', 'Nur Besitzer und Lover', 'Nur Besitzer'];
const SP_LOVER_STUFE = ['Dating', 'Verlobt mit', 'Verheiratet mit'];
// Bilder in Beschreibungen werden nur von diesen Hosts sofort geladen (wie in WCE/FBC); bei allen anderen erst nach Klick – ein Bild von einem
// fremden Server verrät diesem deine Adresse.
const SP_BILD_HOSTS = ['cdn.discordapp.com', 'media.discordapp.com', 'i.imgur.com', 'tenor.com', 'c.tenor.com', 'media.tenor.com', 'i.redd.it', 'puu.sh', 'fs.kinkop.eu',
  'bondageprojects.elementfx.com', 'www.bondageprojects.elementfx.com', 'bondage-europe.com', 'www.bondage-europe.com', 'bondage-asia.com', 'www.bondage-asia.com',
  'bondageprojects.com', 'www.bondageprojects.com'];
const SP_LZ_MAGIC = String.fromCharCode(9580);   // "╬": BC legt lange Beschreibungen komprimiert ab (╬ + LZString.compressToUTF16)
const SP_BILD_PRAEFIX = 'BC_SPIELERBILD_v1:';        // ein Schlüssel je Bild in der Datenbank (so landen sie im Gesamt-Backup)
const SP_CACHE_META_KEY = 'BC_SPIELERCACHE_META_v1';  // { seit, ts, n }: bis wohin der WCE/FBC-Speicher schon eingelesen ist
const SP_BILD_STAPEL = 6;                             // so viele Bilder je Anfrage an den Spiel-Tab
const SP_FEHLT_MAX = 4000;                            // so viele Nummern ohne Bild schickt ein Auslesen höchstens mit

let SPIELER_DB = {};                 // Mitgliedsnummer (Text) → Profil
let _spLoaded = false;               // erst nach dem Lesen der Datenbank darf geschrieben werden
let _spSavePending = false;
let _spErstSchreiben = false;
let _spImRaum = new Set();           // Nummern (Text) der Spieler im letzten Scan
let _spFilter = 'all', _spSort = 'zuletzt', _spMod = '', _spMax = SP_SEITE;
let _spLetzterScan = 0;
const _spOffen = new Set();
const _spTextCache = new WeakMap();
try { const s = localStorage.getItem('BC_SPIELERPROFILE_SORT_v1'); if (['zuletzt', 'name', 'nr', 'erstmals', 'begegnungen'].includes(s)) _spSort = s; } catch (e) {}

// ═══════════════════════════ Reine Logik (ohne DOM, testbar) ═══════════════════════════

// Mod-Namen vereinheitlichen: "BCXMsg" → "BCX", "KIKILINK/1" → "KIKILINK", "ECHO_INFO2" → "ECHO". Gleiche Namen (ohne Groß-/Kleinschreibung) sind derselbe Mod.
function spielerModName(roh) {
  const n = String(roh == null ? '' : roh).trim().replace(/Msg$/i, '').replace(/\/\d+$/, '').replace(/_INFO\d*$/i, '');
  return n || String(roh == null ? '' : roh);
}
function spielerModSchluessel(roh) { return spielerModName(roh).toLowerCase(); }

// Beschreibung entpacken wie das Spiel. Geht es nicht, bleibt der Text unverändert (es geht nichts verloren).
function spielerBeschreibung(text) {
  if (typeof text !== 'string' || text.charAt(0) !== SP_LZ_MAGIC) return text;
  try {
    if (typeof LZString !== 'undefined' && LZString && typeof LZString.decompressFromUTF16 === 'function') {
      const d = LZString.decompressFromUTF16(text.substring(1));
      if (typeof d === 'string') return d;
    }
  } catch (e) {}
  return text;
}

// Gespeicherte Profile von früher können die Beschreibung noch komprimiert enthalten ("╬居…"): entpacken – in der Beschreibung, im Verlauf
// und in den Rohdaten. Verlustfrei (der Text ist derselbe, nur lesbar). true = es wurde etwas geändert.
function spielerRecReparieren(rec) {
  if (!rec || typeof rec !== 'object') return false;
  let geaendert = false;
  const neu = spielerBeschreibung(rec.beschreibung);
  if (neu !== rec.beschreibung) { rec.beschreibung = neu; geaendert = true; }
  for (const v of (Array.isArray(rec.verlauf) ? rec.verlauf : [])) {
    if (!v || v.feld !== 'beschreibung') continue;
    const a = spielerBeschreibung(v.alt), n = spielerBeschreibung(v.neu);
    if (a !== v.alt) { v.alt = a; geaendert = true; }
    if (n !== v.neu) { v.neu = n; geaendert = true; }
  }
  if (rec.roh && typeof rec.roh === 'object') {
    const d = spielerBeschreibung(rec.roh.Description);
    if (d !== rec.roh.Description) { rec.roh.Description = d; geaendert = true; }
  }
  return geaendert;
}
function spielerDbReparieren(db) {
  let n = 0;
  for (const k of Object.keys(db || {})) if (spielerRecReparieren(db[k])) n++;
  return n;
}

// Dauer wie im Charakterblatt des Spiels: "3 Jahre, 9 Monate, 29 Tage"
function spielerDauer(von, bis) {
  if (!von || !(bis >= von)) return '';
  const a = new Date(von), b = new Date(bis);
  let j = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), t = b.getDate() - a.getDate();
  if (t < 0) { m--; t += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (m < 0) { j--; m += 12; }
  const teile = [];
  if (j) teile.push(j + (j === 1 ? ' Jahr' : ' Jahre'));
  if (m) teile.push(m + (m === 1 ? ' Monat' : ' Monate'));
  if (t || !teile.length) teile.push(t + (t === 1 ? ' Tag' : ' Tage'));
  return teile.join(', ');
}

// Beschreibung als HTML: Zeilenumbrüche bleiben (die Anzeige bricht um), Links sind klickbar (neuer Tab, ohne Herkunftsangabe), Bild-Adressen
// (.png/.jpg/.jpeg/.webp/.gif) erscheinen als Bild – sofort nur von den bekannten Hosts, sonst erst nach Klick auf „laden“.
// Alles Übrige wird als Text maskiert.
function spielerBeschreibungHtml(text) {
  if (typeof text !== 'string' || !text) return '';
  return text.split(/(\s+)/).map(function (teil) {
    if (!teil || /^\s+$/.test(teil)) return escHtml(teil);
    const m = /^([("'<\[]*)(https?:\/\/\S+?)([)"'>\].,;:!?]*)$/i.exec(teil);
    let url = null;
    if (m) { try { const u = new URL(m[2]); if (u.protocol === 'http:' || u.protocol === 'https:') url = u; } catch (e) {} }
    if (!url) return escHtml(teil);
    const link = '<a href="' + escHtml(url.href) + '" target="_blank" rel="noopener noreferrer" title="' + escHtml(url.href) + '">';
    if (/\/[^/]+\.(png|jpe?g|webp|gif)$/i.test(url.pathname)) {
      if (SP_BILD_HOSTS.indexOf(url.host) >= 0) {
        return escHtml(m[1]) + link + '<img class="sp-beschr-bild" src="' + escHtml(url.href) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></a>' + escHtml(m[3]);
      }
      return escHtml(m[1]) + link + escHtml(m[2]) + '</a> <button class="btn sp-bild-laden" data-url="' + escHtml(url.href) + '" onclick="spBeschrBildLaden(this)" title="Lädt das Bild von ' + escHtml(url.host) + ' – dieser Server sieht dann deine Adresse">🖼 laden</button>' + escHtml(m[3]);
    }
    return escHtml(m[1]) + link + escHtml(m[2]) + '</a>' + escHtml(m[3]);
  }).join('');
}

function spielerNeu(nr, ts) {
  return { nr: nr, erstmals: ts, zuletzt: 0, begegnungen: 0, mods: {}, raeume: {}, verlauf: [] };
}

// Wert eines Verlauf-Feldes als Text (für den Vergleich und die Anzeige). undefined = nicht geliefert.
function spielerFeldText(feld, quelle) {
  const v = quelle[feld];
  if (v === undefined) return undefined;
  if (feld === 'besitzer') return v ? (v.name || '') + (v.nr != null ? ' #' + v.nr : '') : '';
  if (feld === 'lover') return Array.isArray(v) ? v.map(function (l) { return (l.name || '') + (l.nr != null ? ' #' + l.nr : ''); }).join(', ') : '';
  if (v === null) return undefined;     // nicht geliefert (z. B. Beschreibung nicht lesbar) → nichts vergleichen
  return String(v);
}

// Einen Scan (Antwort des Loaders) in die Datenbank einarbeiten. Ergänzt nur; löscht und überschreibt nichts, was nicht neu geliefert wurde.
function spielerMerge(db, results, ts, raum, spielVersion) {
  let neu = 0, geaendert = 0;
  for (const r0 of (results || [])) {
    if (!r0 || !Number.isInteger(r0.nr)) continue;
    // Eine noch komprimierte Beschreibung ("╬…") wird zuerst entpackt – sonst stünde Zeichenmüll im Profil und im Verlauf
    const r = typeof r0.beschreibung === 'string' && r0.beschreibung.charAt(0) === SP_LZ_MAGIC ? Object.assign({}, r0, { beschreibung: spielerBeschreibung(r0.beschreibung) }) : r0;
    const key = String(r.nr);
    const war = !!db[key];
    const rec = db[key] || (db[key] = spielerNeu(r.nr, ts));
    if (!war) neu++;
    if (!Array.isArray(rec.verlauf)) rec.verlauf = [];
    if (!rec.mods || typeof rec.mods !== 'object') rec.mods = {};
    if (!rec.raeume || typeof rec.raeume !== 'object') rec.raeume = {};

    // Verlauf: was hat sich seit dem letzten Mal geändert? (nur bei bereits bekannten Spielern)
    if (war && rec.zuletzt) {
      let hat = false;
      for (const f of SP_VERLAUF_FELDER) {
        const alt = spielerFeldText(f, rec), nw = spielerFeldText(f, r);
        if (nw === undefined || alt === undefined) continue;   // nicht geliefert oder vorher unbekannt: das ist keine Änderung
        if (alt !== nw) { rec.verlauf.push({ ts: ts, feld: f, alt: alt, neu: nw }); hat = true; }
      }
      if (hat) geaendert++;
    }

    // Felder übernehmen, die geliefert wurden
    for (const f of ['name', 'nickname', 'titel', 'pronomen', 'beschreibung', 'erstellt', 'schwierigkeit', 'itemPermission', 'spielVersion', 'items']) {
      if (r[f] !== undefined && r[f] !== null) rec[f] = r[f];
    }
    if (r.besitzer !== undefined) rec.besitzer = r.besitzer;
    if (Array.isArray(r.lover)) rec.lover = r.lover;            // Beziehungen: Änderungen stehen im Verlauf
    // Geteilte Einstellungen werden vereinigt, Crafts nur durch eine nicht leere Liste ersetzt – ein leerer Scan darf nichts löschen
    if (Array.isArray(r.geteilt)) rec.geteilt = Array.from(new Set([...(rec.geteilt || []), ...r.geteilt]));
    if (Array.isArray(r.crafts) && r.crafts.length) rec.crafts = r.crafts;
    if (r.roh && typeof r.roh === 'object') { rec.roh = r.roh; rec.gekuerzt = !!r.gekuerzt; }
    if (r.istIch) rec.istIch = true;
    if (!rec.spielVersion && spielVersion) rec.spielVersion = spielVersion;

    // Mods: vereinigen, nie entfernen
    for (const m of (r.mods || [])) {
      if (!m || !m.name) continue;
      const k = spielerModSchluessel(m.name);
      if (!k) continue;
      const e = rec.mods[k] || (rec.mods[k] = { name: spielerModName(m.name), roh: [], quellen: [], erstmals: m.erstmals || ts, zuletzt: m.zuletzt || ts });
      if (!e.roh.includes(m.name)) e.roh.push(m.name);
      if (m.quelle && !e.quellen.includes(m.quelle)) e.quellen.push(m.quelle);
      if (m.version) e.version = m.version;
      e.erstmals = Math.min(e.erstmals || ts, m.erstmals || ts);
      e.zuletzt = Math.max(e.zuletzt || 0, m.zuletzt || ts);
    }

    if (!rec.zuletzt || ts - rec.zuletzt > SP_BEGEGNUNG_PAUSE_MS) rec.begegnungen = (rec.begegnungen || 0) + 1;
    rec.zuletzt = Math.max(rec.zuletzt || 0, ts);
    rec.erstmals = Math.min(rec.erstmals || ts, ts);
    if (raum) rec.raeume[raum] = Math.max(rec.raeume[raum] || 0, ts);
  }
  return { neu: neu, geaendert: geaendert };
}

// Profile aus dem Speicher von WCE/FBC ("/profiles") einarbeiten. Jedes Profil trägt seinen Zeitpunkt (gesehen). Ist er neuer als unser
// Stand, zählt es wie ein Scan zu diesem Zeitpunkt (Änderungen kommen in den Verlauf); ist er älter, werden nur fehlende Angaben
// ergänzt. Nichts wird gelöscht, nichts Neueres überschrieben. Notizen: die neuere Fassung gilt, die ältere bleibt im Verlauf.
function spielerCacheMerge(db, results) {
  let neu = 0, aktualisiert = 0, maxSeen = 0;
  for (const r0 of (results || [])) {
    if (!r0 || !Number.isInteger(r0.nr)) continue;
    const r = typeof r0.beschreibung === 'string' && r0.beschreibung.charAt(0) === SP_LZ_MAGIC ? Object.assign({}, r0, { beschreibung: spielerBeschreibung(r0.beschreibung) }) : r0;
    const gesehen = typeof r.gesehen === 'number' && isFinite(r.gesehen) && r.gesehen > 0 ? r.gesehen : 0;
    if (gesehen > maxSeen) maxSeen = gesehen;
    const key = String(r.nr);
    let rec = db[key];
    if (!rec || gesehen > (rec.zuletzt || 0)) {
      const res = spielerMerge(db, [r], gesehen, null, null);
      neu += res.neu;
      if (!res.neu) aktualisiert++;
      rec = db[key];
    } else {
      for (const f of ['name', 'nickname', 'titel', 'pronomen', 'beschreibung', 'erstellt', 'schwierigkeit', 'itemPermission', 'spielVersion', 'items']) {
        if ((rec[f] === undefined || rec[f] === null) && r[f] !== undefined && r[f] !== null) rec[f] = r[f];
      }
      if (!rec.besitzer && r.besitzer) rec.besitzer = r.besitzer;
      if ((!rec.lover || !rec.lover.length) && Array.isArray(r.lover) && r.lover.length) rec.lover = r.lover;
      if (gesehen) rec.erstmals = Math.min(rec.erstmals || gesehen, gesehen);
    }
    rec.inCache = true;
    rec.cacheGesehen = Math.max(rec.cacheGesehen || 0, gesehen);
    if (typeof r.notiz === 'string' && r.notiz.trim() && rec.notiz !== r.notiz) {
      const nts = typeof r.notizTs === 'number' && r.notizTs > 0 ? r.notizTs : gesehen;
      if (!rec.notiz) { rec.notiz = r.notiz; rec.notizTs = nts; }
      else if (nts > (rec.notizTs || 0)) {
        if (!Array.isArray(rec.verlauf)) rec.verlauf = [];
        rec.verlauf.push({ ts: nts, feld: 'notiz', alt: rec.notiz, neu: r.notiz });
        rec.notiz = r.notiz; rec.notizTs = nts;
      }
    }
  }
  return { neu: neu, aktualisiert: aktualisiert, maxSeen: maxSeen };
}

// Zwei Fassungen desselben Spielers zusammenführen (Laden aus der Datenbank, Backup-Einspielen). Verändert a und gibt a zurück.
function spielerRecMerge(a, b) {
  if (!b || typeof b !== 'object') return a;
  const neuerB = (b.zuletzt || 0) > (a.zuletzt || 0);
  const neuer = neuerB ? b : a;
  for (const f of ['name', 'nickname', 'titel', 'pronomen', 'beschreibung', 'erstellt', 'schwierigkeit', 'itemPermission', 'spielVersion', 'items', 'besitzer', 'lover', 'crafts', 'roh', 'gekuerzt', 'istIch']) {
    if (neuer[f] !== undefined && neuer[f] !== null) a[f] = neuer[f];
    else if ((a[f] === undefined || a[f] === null) && b[f] !== undefined) a[f] = b[f];
  }
  // WCE/FBC-Speicher, Notiz und Bild: nichts geht verloren, bei Gleichstand gewinnt der neuere Zeitstempel
  if (b.inCache) a.inCache = true;
  const cg = Math.max(a.cacheGesehen || 0, b.cacheGesehen || 0);
  if (cg) a.cacheGesehen = cg;
  if (b.notiz && (!a.notiz || (b.notizTs || 0) > (a.notizTs || 0))) { a.notiz = b.notiz; a.notizTs = b.notizTs; }
  if (b.bild && (!a.bild || (b.bild.ts || 0) > (a.bild.ts || 0))) a.bild = b.bild;
  if (!a.bild && b.bildFehler && (!a.bildFehler || (b.bildFehler.ts || 0) > (a.bildFehler.ts || 0))) a.bildFehler = b.bildFehler;
  if (a.bild) delete a.bildFehler;
  if (a.geteilt || b.geteilt) a.geteilt = Array.from(new Set([...(a.geteilt || []), ...(b.geteilt || [])]));
  a.erstmals = Math.min(a.erstmals || Infinity, b.erstmals || Infinity);
  if (!isFinite(a.erstmals)) a.erstmals = a.zuletzt || b.zuletzt || 0;
  a.zuletzt = Math.max(a.zuletzt || 0, b.zuletzt || 0);
  a.begegnungen = Math.max(a.begegnungen || 0, b.begegnungen || 0);
  a.mods = a.mods || {};
  for (const k of Object.keys(b.mods || {})) {
    const m = b.mods[k];
    const e = a.mods[k];
    if (!e) { a.mods[k] = m; continue; }
    e.erstmals = Math.min(e.erstmals || m.erstmals || 0, m.erstmals || e.erstmals || 0);
    e.zuletzt = Math.max(e.zuletzt || 0, m.zuletzt || 0);
    if (m.version && (m.zuletzt || 0) >= (e.zuletzt || 0)) e.version = m.version;
    else if (!e.version && m.version) e.version = m.version;
    (m.roh || []).forEach(function (x) { if (!(e.roh || (e.roh = [])).includes(x)) e.roh.push(x); });
    (m.quellen || []).forEach(function (x) { if (!(e.quellen || (e.quellen = [])).includes(x)) e.quellen.push(x); });
  }
  a.raeume = a.raeume || {};
  for (const r of Object.keys(b.raeume || {})) a.raeume[r] = Math.max(a.raeume[r] || 0, b.raeume[r] || 0);
  const gesehen = new Set((a.verlauf || []).map(function (v) { return v.ts + '|' + v.feld + '|' + v.neu; }));
  a.verlauf = a.verlauf || [];
  for (const v of (b.verlauf || [])) { const k = v.ts + '|' + v.feld + '|' + v.neu; if (!gesehen.has(k)) { gesehen.add(k); a.verlauf.push(v); } }
  a.verlauf.sort(function (x, y) { return x.ts - y.ts; });
  return a;
}

// Eine Datenbank (geladen oder aus einem Backup) in die laufende einmischen
function spielerDbEinmischen(ziel, quelle) {
  let n = 0;
  if (!quelle || typeof quelle !== 'object') return n;
  for (const k of Object.keys(quelle)) {
    const q = quelle[k];
    if (!q || typeof q !== 'object') continue;
    if (!ziel[k]) { ziel[k] = q; n++; } else spielerRecMerge(ziel[k], q);
    if (spielerRecReparieren(ziel[k])) _spRepariert++;
  }
  return n;
}
let _spRepariert = 0;   // so viele gespeicherte Profile wurden beim Laden entpackt (danach einmal neu speichern)

// Durchsuchbarer Text eines Spielers (klein) – je Eintrag zwischengespeichert, solange er sich nicht ändert
function spielerText(rec) {
  const c = _spTextCache.get(rec);
  const stand = (rec.zuletzt || 0) + ':' + (rec.verlauf ? rec.verlauf.length : 0) + ':' + Object.keys(rec.mods || {}).length + ':' + (rec.notiz ? rec.notiz.length : 0);
  if (c && c.stand === stand) return c.text;
  const teile = [rec.name, rec.nickname, rec.nr, rec.titel, rec.pronomen, rec.beschreibung, rec.notiz,
    rec.besitzer && rec.besitzer.name, ...(rec.lover || []).map(function (l) { return l.name; }),
    ...Object.values(rec.mods || {}).map(function (m) { return m.name + ' ' + (m.version || ''); }),
    ...Object.keys(rec.raeume || {}), ...(rec.crafts || []).map(function (x) { return x.name; })];
  const text = teile.filter(function (x) { return x !== undefined && x !== null && x !== ''; }).join(' ').toLowerCase();
  _spTextCache.set(rec, { stand: stand, text: text });
  return text;
}

function spielerTagesbeginn(jetzt) { const d = new Date(jetzt); d.setHours(0, 0, 0, 0); return d.getTime(); }

// Alle Spieler, die Suche (Name, Nummer, Beschreibung, Mod, Datum) und Filter durchlassen – sortiert
function spielerGefiltert(db, opt) {
  const o = Object.assign({ suche: '', filter: 'all', mod: '', sort: 'zuletzt', imRaum: new Set(), jetzt: Date.now() }, opt || {});
  const such = _sucheZerlegen(o.suche);
  const sucht = such.text.length || such.datum.length;
  const heute = spielerTagesbeginn(o.jetzt);
  let liste = Object.values(db).filter(function (r) { return r && typeof r === 'object'; });
  liste = liste.filter(function (r) {
    if (o.filter === 'raum' && !o.imRaum.has(String(r.nr))) return false;
    if (o.filter === 'neu' && !((r.erstmals || 0) >= o.jetzt - SP_NEU_MS)) return false;
    if (o.filter === 'heute' && !((r.zuletzt || 0) >= heute)) return false;
    if (o.filter === 'desc' && !(typeof r.beschreibung === 'string' && r.beschreibung.trim())) return false;
    if (o.filter === 'mods' && !Object.keys(r.mods || {}).length) return false;
    if (o.filter === 'bild' && !r.bild) return false;
    if (o.filter === 'ohnebild' && r.bild) return false;
    if (o.mod && !(r.mods && r.mods[o.mod])) return false;
    if (sucht && !_sucheTrifft(such, spielerText(r), [r.zuletzt, r.erstmals, r.erstellt])) return false;
    return true;
  });
  const name = function (r) { return String(r.nickname || r.name || '').toLowerCase(); };
  const cmp = {
    zuletzt:    function (a, b) { return (b.zuletzt || 0) - (a.zuletzt || 0); },
    erstmals:   function (a, b) { return (b.erstmals || 0) - (a.erstmals || 0); },
    begegnungen: function (a, b) { return (b.begegnungen || 0) - (a.begegnungen || 0) || (b.zuletzt || 0) - (a.zuletzt || 0); },
    nr:         function (a, b) { return a.nr - b.nr; },
    name:       function (a, b) { return name(a).localeCompare(name(b), 'de') || a.nr - b.nr; },
  }[o.sort] || function (a, b) { return (b.zuletzt || 0) - (a.zuletzt || 0); };
  return liste.sort(cmp);
}

// Alle bekannten Mods mit der Zahl der Spieler (für die Auswahlliste), häufigste zuerst
function spielerModListe(db) {
  const z = {};
  for (const r of Object.values(db)) for (const k of Object.keys((r && r.mods) || {})) {
    const e = z[k] || (z[k] = { key: k, name: r.mods[k].name || k, n: 0 });
    e.n++;
  }
  return Object.values(z).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name, 'de'); });
}

// ── Zeitangaben ──
function _spDatum(ts) { return ts ? new Date(ts).toLocaleDateString('de-DE') : '–'; }
function _spDatumZeit(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function _spVor(ts, jetzt) {
  if (!ts) return '';
  const s = Math.max(0, Math.round(((jetzt || Date.now()) - ts) / 1000));
  if (s < 60) return 'gerade eben';
  if (s < 3600) return 'vor ' + Math.floor(s / 60) + ' Min.';
  if (s < 86400) return 'vor ' + Math.floor(s / 3600) + ' Std.';
  if (s < 86400 * 60) return 'vor ' + Math.floor(s / 86400) + ' Tagen';
  if (s < 86400 * 730) return 'vor ' + Math.floor(s / 86400 / 30) + ' Monaten';
  return 'vor ' + Math.floor(s / 86400 / 365) + ' Jahren';
}
// Besitzer wie im Charakterblatt: "Halsband von Herrin (9) seit 5.3.2024 (1 Jahr, 7 Monate)" / "Probezeit bei …" / "keiner"
function _spBesitzerText(r, jetzt) {
  const b = r.besitzer;
  if (!b) return b === null ? 'keiner' : '–';
  return (b.stufe >= 1 ? 'Halsband von ' : 'Probezeit bei ') + (b.name || '?') + (b.nr != null ? ' (' + b.nr + ')' : '')
    + (b.seit ? ' · seit ' + _spDatum(b.seit) + ' (' + spielerDauer(b.seit, jetzt || Date.now()) + ')' : '');
}
function _spLoverText(l, jetzt) {
  return (SP_LOVER_STUFE[l.stufe == null ? 0 : l.stufe] || 'Lover') + ' ' + (l.name || '?') + (l.nr != null ? ' (' + l.nr + ')' : '')
    + (l.seit ? ' · seit ' + _spDatum(l.seit) + ' (' + spielerDauer(l.seit, jetzt || Date.now()) + ')' : '');
}
function _spAnzeigeName(r) { return r.nickname && r.nickname !== r.name ? r.nickname + ' (' + (r.name || '?') + ')' : (r.name || '?'); }

// Alles zu einem Spieler als lesbarer Text (zum Kopieren)
function spielerDetailText(r, jetzt) {
  jetzt = jetzt || Date.now();
  const z = [];
  z.push(_spAnzeigeName(r) + '  #' + r.nr + (r.istIch ? '  (du)' : ''));
  z.push('Zuletzt gesehen: ' + _spDatumZeit(r.zuletzt) + ' (' + _spVor(r.zuletzt, jetzt) + ')');
  z.push('Zuerst gesehen: ' + _spDatumZeit(r.erstmals) + ' · Begegnungen: ' + (r.begegnungen || 0));
  if (r.titel) z.push('Titel: ' + r.titel);
  if (r.pronomen) z.push('Pronomen: ' + r.pronomen);
  if (r.erstellt) z.push('Mitglied seit: ' + _spDatum(r.erstellt) + ' (' + spielerDauer(r.erstellt, jetzt) + ')');
  if (r.schwierigkeit != null) z.push('Schwierigkeit: ' + (SP_SCHWIERIGKEIT[r.schwierigkeit] || r.schwierigkeit));
  if (r.itemPermission != null) z.push('Erlaubte Interaktionen: ' + (SP_ERLAUBT[r.itemPermission] || 'Stufe ' + r.itemPermission));
  z.push('Besitzer: ' + _spBesitzerText(r, jetzt));
  (r.lover || []).forEach(function (l) { z.push(_spLoverText(l, jetzt)); });
  const mods = Object.values(r.mods || {});
  if (mods.length) z.push('Mods: ' + mods.map(function (m) { return m.name + (m.version ? ' ' + m.version : ''); }).join(', '));
  if (r.spielVersion) z.push('Spielversion: ' + r.spielVersion);
  if (r.geteilt && r.geteilt.length) z.push('Geteilte Einstellungen: ' + r.geteilt.join(', '));
  const raeume = Object.keys(r.raeume || {});
  if (raeume.length) z.push('Gesehen in: ' + raeume.sort(function (a, b) { return r.raeume[b] - r.raeume[a]; }).map(function (n) { return n + ' (' + _spDatum(r.raeume[n]) + ')'; }).join(', '));
  if (r.crafts && r.crafts.length) z.push('Crafts (' + r.crafts.length + '): ' + r.crafts.map(function (c) { return (c.name || '–') + ' [' + c.item + ']'; }).join(', '));
  if (r.inCache) z.push('Im WCE/FBC-Profilspeicher' + (r.cacheGesehen ? ': dort zuletzt gesehen ' + _spDatumZeit(r.cacheGesehen) : ''));
  z.push('');
  z.push('Beschreibung:');
  z.push(r.beschreibung ? r.beschreibung : '(keine / nicht lesbar)');
  if (r.notiz) { z.push(''); z.push('Deine Notiz (WCE/FBC):'); z.push(r.notiz); }
  if (r.verlauf && r.verlauf.length) {
    z.push('');
    z.push('Änderungen:');
    r.verlauf.slice().sort(function (a, b) { return b.ts - a.ts; }).forEach(function (v) {
      z.push(_spDatumZeit(v.ts) + '  ' + (SP_FELD_NAMEN[v.feld] || v.feld) + ': ' + (v.alt === '' ? '(leer)' : v.alt) + ' → ' + (v.neu === '' ? '(leer)' : v.neu));
    });
  }
  return z.join('\n');
}

// ═══════════════════════════ Speichern / Laden ═══════════════════════════

async function _spielerSpeichernJetzt() {
  if (!_spLoaded) { _spSavePending = true; return false; }
  if (!_spErstSchreiben) {
    // Erster Schreibvorgang dieser Sitzung: vorher noch einmal lesen und zusammenführen – ein Lesefehler beim Start darf keinen Bestand überschreiben
    const d = await idbGet(SPIELERPROFILE_KEY);
    if (d && typeof d === 'object') spielerDbEinmischen(SPIELER_DB, d);
    _spErstSchreiben = true;
  }
  return idbSet(SPIELERPROFILE_KEY, SPIELER_DB);
}
function spielerSpeichern(ms) {
  if (typeof _sammelSpeicher !== 'undefined') _sammelSpeicher.plane('spielerprofile', _spielerSpeichernJetzt, ms ?? 2500);
  else setTimeout(_spielerSpeichernJetzt, ms ?? 2500);
}

idbGet(SPIELERPROFILE_KEY).then(function (d) {
  try { if (d && typeof d === 'object') spielerDbEinmischen(SPIELER_DB, d); }
  finally {
    _spLoaded = true;
    if (_spRepariert) { _spRepariert = 0; _spSavePending = true; }   // entpackte Beschreibungen gleich mit speichern
    if (typeof _ladeMarke === 'function') _ladeMarke('Spielerprofile geladen');
    if (_spSavePending) { _spSavePending = false; spielerSpeichern(500); }
    if (typeof _activeTab !== 'undefined' && _activeTab === 'spielerprofile') renderSpielerProfileTab();
  }
}).catch(function (e) { console.warn('[Spielerprofile] Laden fehlgeschlagen:', e); });

// ═══════════════════════════ Scan ═══════════════════════════

// Nummern aller Spieler, die noch kein Bild haben – der Spiel-Tab nimmt davon die auf, die gerade im Raum sind
function _spOhneBild() {
  const nrn = [];
  for (const r of Object.values(SPIELER_DB)) { if (r && !r.bild && nrn.length < SP_FEHLT_MAX) nrn.push(r.nr); }
  return nrn;
}
const _spBildErzwingen = new Set();   // Nummern, deren Bild beim nächsten Auslesen ersetzt werden soll (nur auf ausdrücklichen Wunsch)

function spielerProfileScan(grund, laut) {
  if (typeof _connected !== 'undefined' && !_connected) { if (laut) showStatus('❌ Nicht verbunden mit BC', 'error'); return false; }
  const jetzt = Date.now();
  if (!laut && jetzt - _spLetzterScan < 1000) return false;   // viele Auslöser kurz hintereinander → einer genügt
  _spLetzterScan = jetzt;
  const ok = bcSend({ type: 'GET_SPIELER_PROFILE', reqId: 'sp_' + jetzt, fehlt: _spOhneBild(), erzwingen: Array.from(_spBildErzwingen) }, !laut);
  if (laut && ok) showStatus('🔄 Spielerprofile werden ausgelesen…', 'info');
  // Der gespeicherte Profil-Speicher von WCE/FBC: einmal je Sitzung von selbst (nur, was seit dem letzten Mal neu ist)
  if (ok && !_spCacheVersucht) spielerCacheLesen(false, false);
  return ok;
}

// Leichte Sichtung aus der Raumliste (alle paar Sekunden): bekannte Spieler im Raum bekommen "zuletzt gesehen". Ohne Profil-Scan.
let _spSichtungDirty = false, _spSichtTimer = null;
function spielerSichtung(data) {
  if (!data || !Array.isArray(data.members)) return;
  const jetzt = Date.now();
  const nrn = new Set(data.members.map(function (m) { return String(m.num); }));
  if (data.memberNumber != null) nrn.add(String(data.memberNumber));
  _spImRaum = nrn;
  let geaendert = false;
  nrn.forEach(function (k) { const r = SPIELER_DB[k]; if (r && jetzt - (r.zuletzt || 0) > 1000) { r.zuletzt = jetzt; geaendert = true; } });
  if (geaendert) {
    _spSichtungDirty = true;
    if (!_spSichtTimer) _spSichtTimer = setTimeout(function () { _spSichtTimer = null; if (_spSichtungDirty) { _spSichtungDirty = false; spielerSpeichern(500); } }, 300000);
  }
}
try { addEventListener('pagehide', function () { if (_spSichtungDirty) { _spSichtungDirty = false; _spielerSpeichernJetzt(); } }); } catch (e) {}

onBridgeMessage('SPIELER_PROFILE_DATA', function (ev) {
  const d = ev.data || {};
  if (d.err) { showStatus('❌ Spielerprofile: ' + d.err, 'error'); return; }
  const ts = typeof d.scanTime === 'number' ? d.scanTime : Date.now();
  const r = spielerMerge(SPIELER_DB, d.results || [], ts, d.room || null, d.gameVersion || null);
  _spImRaum = new Set((d.results || []).map(function (x) { return String(x.nr); }));
  // Bilder der Spieler im Raum: nur ergänzen (oder auf ausdrücklichen Wunsch ersetzen)
  for (const x of (d.results || [])) {
    if (x && x.bild && typeof x.bild.img === 'string') {
      const erzwungen = _spBildErzwingen.has(x.nr);
      _spBildErzwingen.delete(x.nr);
      _spBildSpeichern(x.nr, x.bild.img, 'raum', x.bild.stabil !== false, erzwungen);
    }
  }
  spielerSpeichern();
  const el = document.getElementById('spStatus');
  if (el) {
    el.textContent = '🔄 ' + new Date(ts).toLocaleTimeString('de-DE') + ' · ' + (d.results || []).length + ' im Raum' + (r.neu ? ' · ' + r.neu + ' neu' : '') + (r.geaendert ? ' · ' + r.geaendert + ' geändert' : '');
    el.style.display = '';
  }
  if (typeof _activeTab !== 'undefined' && _activeTab === 'spielerprofile') renderSpielerProfileTab();
});

// ═══════════════════════════ Profil-Speicher von WCE/FBC ("/profiles") ═══════════════════════════
// WCE/FBC merkt sich jeden gesehenen Charakter in der Browser-Datenbank "bce-past-profiles" (im Spiel: Befehl /profiles). Der Spiel-Tab
// liest sie nur (nichts wird dort verändert); hier werden die Profile ergänzend übernommen. Einmal je Sitzung von selbst – es kommen nur
// Profile dazu, die seit dem letzten Einlesen neu gesehen wurden; "Aus WCE-Speicher einlesen" liest immer alles.

let _spMeta = { seit: 0, ts: 0, n: 0 };
let _spMetaGeladen = false;
let _spCacheVersucht = false;      // diese Sitzung schon eingelesen (oder gerade dabei)
let _spCacheReq = null;            // { id, neu, aktualisiert, gelesen, gesamt, laut, maxSeen, seit }
let _spCacheTimer = null;
let _spRenderTimer = null;

idbGet(SP_CACHE_META_KEY).then(function (m) {
  if (m && typeof m === 'object') _spMeta = Object.assign(_spMeta, m);
}).catch(function () {}).then(function () { _spMetaGeladen = true; });

function _spRenderSpaeter() {
  if (_spRenderTimer || typeof _activeTab === 'undefined' || _activeTab !== 'spielerprofile') return;
  _spRenderTimer = setTimeout(function () { _spRenderTimer = null; renderSpielerProfileTab(); }, 400);
}
function _spStatus(text, farbe) {
  const el = document.getElementById('spStatus');
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? '' : 'none';
  if (farbe !== undefined) el.style.color = farbe;
}

function spielerCacheLesen(alles, laut) {
  if (!alles && !laut && _spCacheVersucht) return false;   // der automatische Aufruf gilt nur einmal je Sitzung (auch für wartende Wiederholungen)
  if (typeof _connected !== 'undefined' && !_connected) { if (laut) showStatus('❌ Nicht verbunden mit BC', 'error'); return false; }
  if (_spCacheReq) { if (laut) showStatus('⏳ Der WCE-Speicher wird gerade eingelesen', 'info'); return false; }
  // Erst wenn die Datenbank und der Stand des letzten Einlesens gelesen sind (sonst würde alles doppelt gelesen oder nichts ergänzt)
  if (!_spLoaded || !_spMetaGeladen) { setTimeout(function () { spielerCacheLesen(alles, laut); }, 500); return true; }
  _spCacheVersucht = true;
  const id = 'spc_' + Date.now();
  const seit = alles || !Object.keys(SPIELER_DB).length ? 0 : (_spMeta.seit || 0);
  _spCacheReq = { id: id, neu: 0, aktualisiert: 0, gelesen: 0, gesamt: 0, laut: !!laut, maxSeen: 0, seit: seit };
  const ok = bcSend({ type: 'GET_SPIELER_CACHE', reqId: id, seit: seit }, !laut);
  if (!ok) { _spCacheReq = null; _spCacheVersucht = false; return false; }
  if (laut) showStatus('🔄 WCE/FBC-Profilspeicher wird eingelesen…', 'info');
  _spStatus('🔄 WCE/FBC-Profilspeicher wird gelesen…');
  clearTimeout(_spCacheTimer);
  _spCacheTimer = setTimeout(_spCacheTimeout, 60000);
  return true;
}
function _spCacheTimeout() {
  if (!_spCacheReq) return;
  _spStatus('⚠️ WCE-Speicher: keine Antwort vom Spiel-Tab (Bookmarklet neu klicken?) – bisher gelesen: ' + _spCacheReq.gelesen, 'var(--yellow, #fbbf24)');
  _spCacheReq = null; _spCacheVersucht = false;
}
function _spCacheEnde() { clearTimeout(_spCacheTimer); _spCacheReq = null; }

onBridgeMessage('SPIELER_CACHE_DATA', function (ev) {
  const d = ev.data || {};
  const req = _spCacheReq;
  if (!req || d.reqId !== req.id) return;
  if (d.err) {
    _spCacheEnde(); _spCacheVersucht = false;
    _spStatus('❌ WCE-Speicher: ' + d.err, 'var(--red, #f87171)');
    if (req.laut) showStatus('❌ WCE-Speicher: ' + d.err, 'error');
    return;
  }
  if (d.vorhanden === false) {
    _spCacheEnde();
    const hinweis = 'Kein WCE/FBC-Profilspeicher gefunden' + (d.grund ? ' (' + d.grund + ')' : '')
      + (d.andere && d.andere.length ? ' · ähnliche Datenbanken: ' + d.andere.join(', ') : '')
      + ' – in WCE/FBC muss „Past Profiles“ eingeschaltet sein, damit der Befehl /profiles etwas speichert.';
    _spStatus('ℹ️ ' + hinweis, 'var(--text3)');
    if (req.laut) showStatus('ℹ️ ' + hinweis, 'info');
    return;
  }
  clearTimeout(_spCacheTimer);
  _spCacheTimer = setTimeout(_spCacheTimeout, 60000);
  const r = spielerCacheMerge(SPIELER_DB, d.results || []);
  req.neu += r.neu; req.aktualisiert += r.aktualisiert; req.maxSeen = Math.max(req.maxSeen, r.maxSeen, d.maxSeen || 0);
  req.gelesen = d.gelesen || req.gelesen; req.gesamt = d.gesamt || req.gesamt;
  if ((d.results || []).length) spielerSpeichern();
  if (!d.fertig) {
    _spStatus('🔄 WCE/FBC-Profilspeicher: ' + req.gelesen + ' von ' + req.gesamt + ' gelesen · ' + req.neu + ' neue Spieler');
    _spRenderSpaeter();
    return;
  }
  _spCacheEnde();
  // Stand merken – erst jetzt, wo alles gelesen und übernommen ist
  _spMeta = { seit: Math.max(_spMeta.seit || 0, req.maxSeen || 0), ts: Date.now(), n: req.gesamt };
  idbSet(SP_CACHE_META_KEY, _spMeta);
  spielerSpeichern(500);
  const text = '✅ WCE/FBC-Profilspeicher: ' + req.gesamt + ' Profile'
    + (req.seit ? ' (' + req.neu + ' neue Spieler, ' + req.aktualisiert + ' aktualisiert seit dem letzten Einlesen)' : ' gelesen · ' + req.neu + ' neue Spieler');
  _spStatus(text, 'var(--accent-text)');
  if (req.laut) showStatus(text, 'success');
  if (typeof _activeTab !== 'undefined' && _activeTab === 'spielerprofile') renderSpielerProfileTab();
});

// ═══════════════════════════ Bilder ═══════════════════════════
// Je Spieler ein kleines Bild (JPEG) unter eigenem Schlüssel in der Datenbank – nicht im Profil selbst, damit das Profil klein bleibt und
// das Gesamt-Backup die Bilder einzeln enthält. rec.bild = { ts, quelle: 'raum'|'cache', stabil } vermerkt, dass es eins gibt.
// Gespeichert wird ein Bild nur, wenn noch keins da ist (oder das vorhandene ein unfertiges war – "stabil: false" – oder du es ausdrücklich
// ersetzen willst). Ein Bild geht nie automatisch verloren.

const _spBilder = {};              // Nummer (Text) → Bild (Data-URL), nur für das, was gerade gezeigt wird
let _spBildLadeToken = 0;
let _spBildFehlerGemeldet = false;

function _spBildGueltig(url) { return typeof url === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(url); }

async function _spBildSpeichern(nr, img, quelle, stabil, ersetzen) {
  const key = String(nr);
  const rec = SPIELER_DB[key];
  if (!rec || !_spBildGueltig(img)) return false;
  if (rec.bild && !ersetzen && !(rec.bild.stabil === false && stabil)) return false;   // vorhandene Bilder bleiben
  const ok = await idbSet(SP_BILD_PRAEFIX + key, img);
  if (!ok) {
    if (!_spBildFehlerGemeldet) { _spBildFehlerGemeldet = true; showStatus('❌ Spielerbild konnte nicht gespeichert werden (Browser-Speicher voll?) – das Profil bleibt ohne Bild', 'error'); }
    return false;
  }
  rec.bild = { ts: Date.now(), quelle: quelle, stabil: stabil !== false };
  delete rec.bildFehler;
  _spBilder[key] = img;
  spielerSpeichern();
  _spBildEinsetzen(key);
  return true;
}

function _spBildEinsetzen(key) {
  const el = document.getElementById('sp_bild_' + key);
  const url = _spBilder[key];
  if (el && _spBildGueltig(url)) { el.innerHTML = '<img src="' + escHtml(url) + '" alt="">'; el.classList.add('da'); }
}

// Die Bilder der gezeigten Karten aus der Datenbank holen (in kleinen Gruppen, eine neuere Zeichnung bricht die ältere ab)
async function _spBilderNachladen(nrn) {
  const tok = ++_spBildLadeToken;
  if (Object.keys(_spBilder).length > 1500) for (const k of Object.keys(_spBilder)) delete _spBilder[k];
  const fehlend = nrn.filter(function (nr) { return !_spBilder[nr]; });
  for (let i = 0; i < fehlend.length; i += 12) {
    if (tok !== _spBildLadeToken) return;
    await Promise.all(fehlend.slice(i, i + 12).map(async function (nr) {
      const url = await idbGet(SP_BILD_PRAEFIX + nr);
      if (_spBildGueltig(url)) { _spBilder[nr] = url; _spBildEinsetzen(nr); }
    }));
  }
}

// ── Bilder für Spieler, die nicht im Raum sind: aus dem gespeicherten WCE/FBC-Profil gezeichnet (Spiel-Tab, GET_SPIELER_BILDER) ──
let _spBilderLaeuft = false, _spBilderPaused = false, _spBilderStop = false;
let _spBilderQueue = [], _spBilderReq = null, _spBilderWarte = null;
let _spBilderStat = { ok: 0, fehler: 0, gesamt: 0, ganzFehl: 0, letzterGrund: '' };

function _spBilderKandidaten() {
  return Object.values(SPIELER_DB).filter(function (r) { return r && !r.bild && !r.bildFehler && (r.inCache || _spImRaum.has(String(r.nr))); })
    .sort(function (a, b) { return (b.zuletzt || 0) - (a.zuletzt || 0); }).map(function (r) { return r.nr; });
}

function spBilderAusCache() {
  if (_spBilderLaeuft) { _spBilderStop = true; _spStatus('⏹ Wird nach dem laufenden Stapel angehalten…'); _spKnopfAktualisieren(); return; }
  _spAutoGesperrt = false;
  if (typeof _connected !== 'undefined' && !_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  if (typeof _gameOk === 'function' && !_gameOk(false)) { showStatus('❌ ' + _gameWaitReason(false) + ' – Bilder nicht gestartet', 'error'); return; }
  const nrn = _spBilderKandidaten();
  const ohneErfolg = Object.values(SPIELER_DB).filter(function (r) { return r && !r.bild && r.bildFehler; }).length;
  if (!nrn.length) {
    showStatus(ohneErfolg ? 'ℹ️ Keine weiteren Bilder möglich – bei ' + ohneErfolg + ' Spielern ist es schon fehlgeschlagen (im Profil „Erneut versuchen“)' : '✅ Alle Spieler mit gespeichertem Profil haben schon ein Bild', 'info');
    return;
  }
  if (!confirm(nrn.length + ' Spielerbilder werden erstellt.\n\n'
    + 'Dafür legt das Tool im Spiel-Tab kurz einen unsichtbaren Charakter aus dem gespeicherten WCE/FBC-Profil an, zeichnet ihn und nimmt ihn wieder heraus. '
    + 'Es wird nichts gesendet, andere Spieler sehen davon nichts, und bestehende Bilder bleiben unverändert.\n\n'
    + 'Dauer: ca. ' + Math.max(1, Math.ceil(nrn.length * 0.5 / 60)) + ' Min. – das Spiel bleibt dabei benutzbar. Starten?')) return;
  _spBilderAuto = false;
  _spBilderStarten(nrn);
}

function _spBilderStarten(nrn) {
  _spBilderQueue = nrn.slice();
  _spBilderLaeuft = true; _spBilderPaused = false; _spBilderStop = false;
  _spBilderStat = { ok: 0, fehler: 0, gesamt: nrn.length, ganzFehl: 0, letzterGrund: '' };
  if (typeof _dcJobStart === 'function') _dcJobStart('spielerBilder');
  _spKnopfAktualisieren();
  setTimeout(_spBilderWeiter, 100);
}

function _spBilderWeiter() {
  if (!_spBilderLaeuft || _spBilderPaused) return;
  if (_spBilderStop || !_spBilderQueue.length) { _spBilderEnde(); return; }
  if (_spBilderAuto && typeof _activeTab !== 'undefined' && _activeTab !== 'spielerprofile') { _spBilderEnde(); return; }   // Tab verlassen: Automatik hört auf
  if (typeof _dcHalt === 'function' && _dcHalt('spielerBilder')) return;
  const stapel = _spBilderQueue.splice(0, SP_BILD_STAPEL);
  const id = 'spb_' + Date.now();
  _spBilderReq = { id: id, stapel: stapel };
  const fertig = _spBilderStat.ok + _spBilderStat.fehler;
  _spStatus('🖼 Spielerbilder: ' + fertig + ' / ' + _spBilderStat.gesamt + (_spBilderStat.fehler ? ' · ' + _spBilderStat.fehler + ' ohne Erfolg' : ''));
  clearTimeout(_spBilderWarte);
  _spBilderWarte = setTimeout(function () {
    if (!_spBilderReq || _spBilderReq.id !== id) return;
    _spBilderQueue = _spBilderReq.stapel.concat(_spBilderQueue); _spBilderReq = null;
    if (typeof _dcPauseJob === 'function') _dcPauseJob('spielerBilder', 'keine Antwort vom Spiel-Tab'); else _spBilderEnde();
  }, 45000);
  if (!bcSend({ type: 'GET_SPIELER_BILDER', reqId: id, nrs: stapel }, true)) {
    clearTimeout(_spBilderWarte);
    _spBilderQueue = stapel.concat(_spBilderQueue); _spBilderReq = null;
    if (typeof _dcPauseJob === 'function') _dcPauseJob('spielerBilder', 'Verbindung zum BC-Tab verloren'); else _spBilderEnde();
  }
}

onBridgeMessage('SPIELER_BILDER_DATA', function (ev) {
  const d = ev.data || {};
  const req = _spBilderReq;
  if (!req || d.reqId !== req.id) return;
  _spBilderReq = null;
  clearTimeout(_spBilderWarte);
  (async function () {
    if (d.err === 'belegt') { _spBilderQueue = req.stapel.concat(_spBilderQueue); setTimeout(_spBilderWeiter, 2000); return; }
    const bilder = d.err ? [] : (d.bilder || []);
    const fehler = d.err ? req.stapel.map(function (nr) { return { nr: nr, grund: String(d.err) }; }) : (d.fehler || []);
    for (const b of bilder) {
      if (!b || !Number.isInteger(b.nr)) continue;
      const rec = SPIELER_DB[String(b.nr)];
      const erzwungen = _spBildErzwingen.has(b.nr);
      _spBildErzwingen.delete(b.nr);
      if (rec && rec.bild && !erzwungen && !(rec.bild.stabil === false && b.stabil)) { _spBilderStat.ok++; continue; }   // schon eins da: bleibt
      if (await _spBildSpeichern(b.nr, b.img, b.quelle || 'cache', b.stabil, erzwungen)) _spBilderStat.ok++;
      else { _spBilderStat.fehler++; _spBilderStop = true; }   // Speichern scheitert → nicht weitermachen (Meldung kam schon)
    }
    for (const f of fehler) {
      if (!f || !Number.isInteger(f.nr)) continue;
      const rec = SPIELER_DB[String(f.nr)];
      if (rec && !rec.bild) rec.bildFehler = { ts: Date.now(), grund: String(f.grund || 'unbekannt').slice(0, 160) };
      _spBildErzwingen.delete(f.nr);
      _spBilderStat.fehler++; _spBilderStat.letzterGrund = String(f.grund || '');
    }
    if (fehler.length) spielerSpeichern();
    // Scheitert alles, mehrmals hintereinander, hat es keinen Sinn weiterzumachen
    if (!bilder.length && fehler.length) _spBilderStat.ganzFehl++; else _spBilderStat.ganzFehl = 0;
    _spRenderSpaeter();
    if (_spBilderStat.ganzFehl >= 2) { _spBilderStop = true; _spAutoGesperrt = true; showStatus('⚠️ Spielerbilder abgebrochen: ' + (_spBilderStat.letzterGrund || 'alle Versuche schlagen fehl'), 'error'); }
    setTimeout(_spBilderWeiter, 150);
  })();
});

function _spBilderEnde() {
  const s = _spBilderStat;
  _spBilderLaeuft = false; _spBilderPaused = false;
  clearTimeout(_spBilderWarte); _spBilderReq = null;
  const rest = _spBilderQueue.length;
  if (_spBilderAuto) _spBilderQueue.forEach(function (n) { _spAutoVersucht.delete(n); });   // nicht mehr drangekommen: beim nächsten Mal wieder
  _spBilderQueue = [];
  _spKnopfAktualisieren();
  const text = '🖼 Spielerbilder: ' + s.ok + ' erstellt' + (s.fehler ? ', ' + s.fehler + ' ohne Erfolg' + (s.letzterGrund ? ' (' + s.letzterGrund + ')' : '') : '') + (rest ? ' · ' + rest + ' übrig' : '');
  _spStatus(text, s.fehler && !s.ok ? 'var(--red, #f87171)' : 'var(--accent-text)');
  if (!_spBilderAuto || (s.fehler && !s.ok)) showStatus(text, s.ok ? 'success' : 'info');   // automatische Durchgänge melden sich nur bei Problemen
  _spBilderAuto = false;
  if (typeof _activeTab !== 'undefined' && _activeTab === 'spielerprofile') renderSpielerProfileTab();
}

function _spBilderPause() {
  _spBilderPaused = true;
  clearTimeout(_spBilderWarte);
  if (_spBilderReq) { _spBilderQueue = _spBilderReq.stapel.concat(_spBilderQueue); _spBilderReq = null; }
  _spStatus('⏸ Spielerbilder pausiert – wartet auf BC (' + _spBilderQueue.length + ' offen)');
  _spKnopfAktualisieren();
}
function _spBilderResume() {
  _spBilderPaused = false;
  _spKnopfAktualisieren();
  setTimeout(_spBilderWeiter, 500);
}
function _spKnopfAktualisieren() {
  const b = document.getElementById('spBilderBtn');
  if (b) b.textContent = _spBilderLaeuft ? (_spBilderPaused ? '⏸ Pausiert – Stop' : '⏹ Stop') : '🖼 Bilder erzeugen';
}
if (typeof _dcRegisterJob === 'function') {
  _dcRegisterJob('spielerBilder', { label: 'Spielerbilder', active: function () { return _spBilderLaeuft; }, pause: _spBilderPause, resume: _spBilderResume });
}

// ── Automatisch für die gezeigten Karten ──
// Ist der Tab offen, bekommen die Spieler der gezeigten Seite, die einen gespeicherten WCE/FBC-Eintrag, aber noch kein Bild haben, von selbst eins
// (Stapel wie oben, jeder Spieler höchstens einmal je Sitzung). Verlässt du den Tab, hört es auf; scheitert alles, bleibt es aus, bis du
// „Bilder erzeugen“ drückst. Abschaltbar im Tab.
let _spAutoAn = true;
try { if (localStorage.getItem('BC_SPIELERPROFILE_AUTOBILD_v1') === '0') _spAutoAn = false; } catch (e) {}
let _spAutoGesperrt = false;       // ein systematischer Fehler: nicht von selbst erneut versuchen
let _spBilderAuto = false;         // der laufende Durchgang wurde automatisch gestartet
const _spAutoVersucht = new Set();

function spAutoBilderSetzen(an) {
  _spAutoAn = !!an;
  try { localStorage.setItem('BC_SPIELERPROFILE_AUTOBILD_v1', _spAutoAn ? '1' : '0'); } catch (e) {}
  if (_spAutoAn) { _spAutoGesperrt = false; renderSpielerProfileTab(); }
}

function _spAutoBilder(gezeigt) {
  if (!_spAutoAn || _spAutoGesperrt || _spBilderLaeuft) return;
  if (typeof _activeTab === 'undefined' || _activeTab !== 'spielerprofile') return;
  if (typeof _connected !== 'undefined' && !_connected) return;
  if (typeof _gameOk === 'function' && !_gameOk(false)) return;
  const nrn = gezeigt.filter(function (r) { return r && !r.bild && !r.bildFehler && r.inCache && !_spImRaum.has(String(r.nr)) && !_spAutoVersucht.has(r.nr); })
    .slice(0, 60).map(function (r) { return r.nr; });
  if (!nrn.length) return;
  nrn.forEach(function (n) { _spAutoVersucht.add(n); });
  _spBilderAuto = true;
  _spBilderStarten(nrn);
}

// Ein Bild aus einer Beschreibung von einem nicht bekannten Host laden (nur nach Klick)
function spBeschrBildLaden(knopf) {
  try {
    const url = new URL(knopf.dataset.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const img = document.createElement('img');
    img.className = 'sp-beschr-bild';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.alt = '';
    img.src = url.href;
    knopf.replaceWith(img);
  } catch (e) {}
}

// ── Einzelne Spieler ──
// Bild für einen Spieler: im Raum aus seinem Zeichenpuffer, sonst aus dem gespeicherten WCE/FBC-Profil.
// ersetzen: ein vorhandenes Bild durch ein neues ersetzen (nur auf ausdrücklichen Wunsch, mit Rückfrage).
function spBildErzeugen(nr, ersetzen) {
  nr = Number(nr);
  const rec = SPIELER_DB[String(nr)];
  if (!rec) return;
  if (typeof _connected !== 'undefined' && !_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  if (_spBilderLaeuft) { showStatus('⏳ Die Bilderserie läuft – danach einzeln erzeugen', 'info'); return; }
  if (ersetzen && !confirm('Das vorhandene Bild von ' + _spAnzeigeName(rec) + ' durch ein neues ersetzen?')) return;
  if (ersetzen) _spBildErzwingen.add(nr);
  else if (rec.bildFehler) { delete rec.bildFehler; spielerSpeichern(); }
  if (_spImRaum.has(String(nr))) { spielerProfileScan('bild', true); return; }
  if (!rec.inCache) {
    _spBildErzwingen.delete(nr);
    showStatus('ℹ️ ' + _spAnzeigeName(rec) + ' ist nicht im Raum und nicht im WCE/FBC-Speicher – kein Bild möglich', 'info');
    return;
  }
  _spBilderAuto = false;
  _spBilderStarten([nr]);
}

// Bild groß ansehen (Klick schließt)
function spBildGross(nr) {
  const url = _spBilder[String(nr)];
  if (!_spBildGueltig(url)) return;
  const rec = SPIELER_DB[String(nr)];
  const box = document.createElement('div');
  box.className = 'sp-gross';
  box.onclick = function () { box.remove(); };
  box.innerHTML = '<div><img src="' + escHtml(url) + '" alt=""><div class="sp-gross-name">' + escHtml(rec ? _spAnzeigeName(rec) + ' #' + rec.nr : '') + '</div></div>';
  document.body.appendChild(box);
}

// ═══════════════════════════ Darstellung ═══════════════════════════

function _spModBadges(r) {
  return Object.values(r.mods || {}).sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); }).map(function (m) {
    return '<span class="sp-mod" title="' + escHtml((m.quellen || []).join(', ') + (m.zuletzt ? ' · zuletzt ' + _spDatumZeit(m.zuletzt) : '')) + '">'
      + escHtml(m.name) + (m.version ? ' <i>' + escHtml(m.version) + '</i>' : '') + '</span>';
  }).join('');
}

function spielerKarteHtml(r, jetzt) {
  jetzt = jetzt || Date.now();
  const live = _spImRaum.has(String(r.nr));
  const offen = _spOffen.has(r.nr);
  const kurz = r.beschreibung ? escHtml(r.beschreibung) : '<span class="sp-leer">' + (r.beschreibung === '' ? 'Keine Beschreibung' : 'Beschreibung nicht lesbar') + '</span>';
  const bildUrl = r.bild ? _spBilder[String(r.nr)] : null;
  return '<div class="sp-karte' + (r.istIch ? ' ich' : '') + (offen ? ' offen' : '') + '" id="sp_k_' + r.nr + '">'
    + '<div class="sp-bild' + (_spBildGueltig(bildUrl) ? ' da' : '') + '" id="sp_bild_' + r.nr + '"' + (r.bild ? ' onclick="spBildGross(' + r.nr + ')" title="Klick vergrößert"' : '') + '>'
    +   (_spBildGueltig(bildUrl) ? '<img src="' + escHtml(bildUrl) + '" alt="">' : '<span>' + (r.bild ? '⏳' : '👤') + '</span>') + '</div>'
    + '<div class="sp-karte-main">'
    + '<div class="sp-kopf" onclick="spOeffnen(' + r.nr + ')" title="Klick zeigt alle Daten">'
    +   '<span class="sp-name">' + escHtml(_spAnzeigeName(r)) + '</span>'
    +   '<span class="sp-nr">#' + r.nr + '</span>'
    +   (r.istIch ? '<span class="sp-badge">du</span>' : '')
    +   (live ? '<span class="sp-live">🟢 im Raum</span>' : '')
    +   (r.inCache ? '<span class="sp-wce" title="Im Profilspeicher von WCE/FBC (Befehl /profiles)' + (r.cacheGesehen ? ' · dort zuletzt gesehen ' + escHtml(_spDatumZeit(r.cacheGesehen)) : '') + '">WCE</span>' : '')
    +   (r.titel ? '<span class="sp-titel">' + escHtml(r.titel) + '</span>' : '')
    + '</div>'
    + '<div class="sp-zeit">Zuletzt gesehen: <b>' + escHtml(_spDatumZeit(r.zuletzt)) + '</b> <span>(' + escHtml(_spVor(r.zuletzt, jetzt)) + ')</span>'
    +   ' · zuerst ' + escHtml(_spDatum(r.erstmals)) + ' · ' + (r.begegnungen || 0) + '× begegnet</div>'
    + (Object.keys(r.mods || {}).length ? '<div class="sp-mods">' + _spModBadges(r) + '</div>' : '')
    + '<div class="sp-text">' + kurz + '</div>'
    + (r.notiz && !offen ? '<div class="sp-notiz" title="Deine Notiz aus WCE/FBC">📝 ' + escHtml(r.notiz) + '</div>' : '')
    + (offen ? spielerDetailHtml(r, jetzt) : '')
    + '</div></div>';
}

function _spZeile(label, wert) {
  return wert === null || wert === undefined || wert === '' ? '' : '<tr><th>' + escHtml(label) + '</th><td>' + wert + '</td></tr>';
}

function spielerDetailHtml(r, jetzt) {
  const mods = Object.values(r.mods || {}).sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
  const raeume = Object.keys(r.raeume || {}).sort(function (a, b) { return r.raeume[b] - r.raeume[a]; });
  let h = '<div class="sp-detail">';
  h += '<table class="sp-tab">'
    + _spZeile('Mitgliedsnummer', '#' + r.nr)
    + _spZeile('Name', escHtml(r.name || ''))
    + _spZeile('Spitzname', escHtml(r.nickname || ''))
    + _spZeile('Titel', escHtml(r.titel || ''))
    + _spZeile('Pronomen', escHtml(r.pronomen || ''))
    + _spZeile('Mitglied seit', r.erstellt ? escHtml(_spDatum(r.erstellt) + ' (' + spielerDauer(r.erstellt, jetzt) + ')') : '')
    + _spZeile('Schwierigkeit', r.schwierigkeit != null ? escHtml(String(SP_SCHWIERIGKEIT[r.schwierigkeit] || r.schwierigkeit)) : '')
    + _spZeile('Erlaubte Interaktionen', r.itemPermission != null ? escHtml(SP_ERLAUBT[r.itemPermission] || 'Stufe ' + r.itemPermission) : '')
    + _spZeile('Besitzer', r.besitzer !== undefined ? escHtml(_spBesitzerText(r, jetzt)) : '')
    + _spZeile('Beziehungen', (r.lover || []).length ? (r.lover || []).map(function (l) { return escHtml(_spLoverText(l, jetzt)); }).join('<br>') : '')
    + _spZeile('Spielversion', escHtml(r.spielVersion || ''))
    + _spZeile('Getragene Teile', r.items != null ? String(r.items) : '')
    + _spZeile('Zuletzt gesehen', escHtml(_spDatumZeit(r.zuletzt) + ' (' + _spVor(r.zuletzt, jetzt) + ')'))
    + _spZeile('Zuerst gesehen', escHtml(_spDatumZeit(r.erstmals)))
    + _spZeile('Begegnungen', String(r.begegnungen || 0))
    + _spZeile('WCE/FBC-Profilspeicher', r.inCache ? 'ja' + (r.cacheGesehen ? ' · dort zuletzt gesehen ' + escHtml(_spDatumZeit(r.cacheGesehen)) : '') : '')
    + _spZeile('Bild', r.bild ? escHtml('von ' + _spDatumZeit(r.bild.ts) + ' · ' + (r.bild.quelle === 'raum' ? 'aus dem Raum aufgenommen' : 'aus dem gespeicherten Profil gezeichnet') + (r.bild.stabil === false ? ' · evtl. unvollständig' : ''))
        : (r.bildFehler ? escHtml('nicht möglich: ' + r.bildFehler.grund) : ''))
    + '</table>';
  if (r.notiz) h += '<h4>Deine Notiz (WCE/FBC)</h4><div class="sp-text-voll sp-beschr">' + spielerBeschreibungHtml(r.notiz) + '</div>';
  if (mods.length) {
    h += '<h4>Mods (' + mods.length + ')</h4><table class="sp-tab"><tr><th>Mod</th><th>Version</th><th>Erkannt an</th><th>Erstmals</th><th>Zuletzt</th></tr>'
      + mods.map(function (m) {
        return '<tr><td>' + escHtml(m.name) + '</td><td>' + escHtml(m.version || '–') + '</td><td>' + escHtml((m.quellen || []).join(', ') + ((m.roh || []).length && (m.roh || []).join('') !== m.name ? ' (' + m.roh.join(', ') + ')' : '')) + '</td><td>'
          + escHtml(_spDatum(m.erstmals)) + '</td><td>' + escHtml(_spDatumZeit(m.zuletzt)) + '</td></tr>';
      }).join('') + '</table>'
      + '<div class="sp-hinweis">Mods werden an versteckten Nachrichten und Merkmalen erkannt – wer sich nie meldet, taucht hier nicht auf.</div>';
  }
  if (r.geteilt && r.geteilt.length) h += '<h4>Geteilte Einstellungen</h4><div class="sp-mods">' + r.geteilt.map(function (k) { return '<span class="sp-mod">' + escHtml(k) + '</span>'; }).join('') + '</div>';
  if (r.crafts && r.crafts.length) {
    h += '<h4>Crafts (' + r.crafts.length + ')</h4><div class="sp-crafts">' + r.crafts.map(function (c) {
      return '<div><b>' + escHtml(c.name || '–') + '</b> <span class="sp-nr">' + escHtml(c.item || '') + (c.eigenschaft ? ' · ' + escHtml(c.eigenschaft) : '') + '</span>'
        + (c.beschreibung ? '<div class="sp-text-voll">' + escHtml(c.beschreibung) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  if (raeume.length) h += '<h4>Gesehen in</h4><div class="sp-mods">' + raeume.map(function (n) { return '<span class="sp-mod" title="' + escHtml(_spDatumZeit(r.raeume[n])) + '">' + escHtml(n) + ' · ' + escHtml(_spDatum(r.raeume[n])) + '</span>'; }).join('') + '</div>';
  h += '<h4>Beschreibung</h4><div class="sp-text-voll sp-beschr">' + (r.beschreibung ? spielerBeschreibungHtml(r.beschreibung) : '<span class="sp-leer">(keine / nicht lesbar)</span>') + '</div>';
  if (r.verlauf && r.verlauf.length) {
    h += '<h4>Änderungen (' + r.verlauf.length + ')</h4><div class="sp-verlauf">' + r.verlauf.slice().sort(function (a, b) { return b.ts - a.ts; }).map(function (v) {
      return '<div><span class="sp-nr">' + escHtml(_spDatumZeit(v.ts)) + '</span> <b>' + escHtml(SP_FELD_NAMEN[v.feld] || v.feld) + '</b>: '
        + '<span class="sp-alt">' + escHtml(v.alt === '' ? '(leer)' : v.alt) + '</span> → <span class="sp-neu">' + escHtml(v.neu === '' ? '(leer)' : v.neu) + '</span></div>';
    }).join('') + '</div>';
  }
  h += '<h4>Rohdaten' + (r.gekuerzt ? ' (gekürzt)' : '') + '</h4>'
    + '<details><summary>Alles, was BC über diesen Spieler im Speicher hält</summary><pre class="sp-roh">' + escHtml(r.roh ? JSON.stringify(r.roh, null, 2) : '(keine)') + '</pre></details>';
  const kannBild = _spImRaum.has(String(r.nr)) || r.inCache;
  h += '<div class="sp-knoepfe"><button class="btn" onclick="spKopieren(' + r.nr + ')">📋 Als Text kopieren</button>'
    + '<button class="btn" onclick="spJsonKopieren(' + r.nr + ')">{ } Als JSON kopieren</button>'
    + (kannBild && !r.bild ? '<button class="btn" onclick="spBildErzeugen(' + r.nr + ')">' + (r.bildFehler ? '🖼 Bild erneut versuchen' : '🖼 Bild erzeugen') + '</button>' : '')
    + (kannBild && r.bild ? '<button class="btn" onclick="spBildErzeugen(' + r.nr + ', true)" title="Ersetzt das vorhandene Bild (mit Rückfrage)">🖼 Bild neu aufnehmen</button>' : '')
    + '</div>';
  return h + '</div>';
}

function _spModSelectFuellen() {
  const sel = document.getElementById('spModSelect');
  if (!sel) return;
  const liste = spielerModListe(SPIELER_DB);
  const key = liste.map(function (m) { return m.key + ':' + m.n; }).join('|') + '#' + _spMod;
  if (sel.dataset.stand === key) return;
  sel.dataset.stand = key;
  sel.innerHTML = '<option value="">Mod: alle</option>' + liste.map(function (m) {
    return '<option value="' + escHtml(m.key) + '"' + (m.key === _spMod ? ' selected' : '') + '>' + escHtml(m.name) + ' (' + m.n + ')</option>';
  }).join('');
}

function renderSpielerProfileTab() {
  const body = document.getElementById('spBody');
  if (!body) return;
  const jetzt = Date.now();
  const liste = spielerGefiltert(SPIELER_DB, {
    suche: (document.getElementById('spSearchInput') || {}).value || '', filter: _spFilter, mod: _spMod, sort: _spSort, imRaum: _spImRaum, jetzt: jetzt,
  });
  const gesamt = Object.keys(SPIELER_DB).length;
  document.querySelectorAll('[id^="spFilter_"]').forEach(function (b) { b.classList.toggle('on', b.id === 'spFilter_' + _spFilter); });
  const sb = document.getElementById('spSortBtn');
  if (sb) sb.textContent = { zuletzt: '🕒 Zuletzt gesehen', name: '🔤 Name', nr: '# Nummer', erstmals: '🆕 Zuerst gesehen', begegnungen: '🔁 Begegnungen' }[_spSort];
  _spModSelectFuellen();
  const zeigen = liste.slice(0, _spMax);
  body.innerHTML = zeigen.map(function (r) { return spielerKarteHtml(r, jetzt); }).join('')
    + (liste.length > zeigen.length ? '<button class="btn sp-mehr" onclick="spMehr()">Mehr anzeigen (' + (liste.length - zeigen.length) + ' weitere)</button>' : '')
    + (!gesamt ? '<div class="sp-leerzustand">Noch keine Spieler gespeichert.<br>Verbinde das Tool mit BC und tritt einem Raum bei – die Spieler werden automatisch ausgelesen. Oder oben „Jetzt auslesen“.</div>'
        : (!liste.length ? '<div class="sp-leerzustand">Keine Treffer.</div>' : ''));
  const z = document.getElementById('spZaehler');
  if (z) {
    const mitBild = Object.values(SPIELER_DB).filter(function (r) { return r && r.bild; }).length;
    z.textContent = (liste.length === gesamt ? gesamt + ' Spieler' : liste.length + ' von ' + gesamt + ' Spielern') + (mitBild ? ' · ' + mitBild + ' mit Bild' : '');
  }
  _spKnopfAktualisieren();
  const chk = document.getElementById('spAutoChk');
  if (chk) chk.checked = _spAutoAn;
  _spBilderNachladen(zeigen.filter(function (r) { return r.bild; }).map(function (r) { return String(r.nr); }));
  _spAutoBilder(zeigen);
}

// ── Bedienung ──
function spSuche() { _spMax = SP_SEITE; renderSpielerProfileTab(); }
function spSetFilter(f) { _spFilter = f; _spMax = SP_SEITE; renderSpielerProfileTab(); }
function spModFilter(k) { _spMod = k || ''; _spMax = SP_SEITE; renderSpielerProfileTab(); }
function spSortWechseln() {
  const reihe = ['zuletzt', 'name', 'nr', 'erstmals', 'begegnungen'];
  _spSort = reihe[(reihe.indexOf(_spSort) + 1) % reihe.length];
  try { localStorage.setItem('BC_SPIELERPROFILE_SORT_v1', _spSort); } catch (e) {}
  renderSpielerProfileTab();
}
function spMehr() { _spMax += SP_SEITE; renderSpielerProfileTab(); }
function spOeffnen(nr) {
  nr = Number(nr);
  if (_spOffen.has(nr)) _spOffen.delete(nr); else _spOffen.add(nr);
  const r = SPIELER_DB[String(nr)];
  const el = document.getElementById('sp_k_' + nr);
  if (!r || !el) { renderSpielerProfileTab(); return; }
  const neu = document.createElement('div');
  neu.innerHTML = spielerKarteHtml(r);
  el.replaceWith(neu.firstElementChild);   // nur diese Karte neu zeichnen, die Liste bleibt stehen
}
function _spKopiere(text, ok) {
  const fertig = function () { showStatus(ok, 'success'); };
  const fehler = function () { showStatus('❌ Kopieren fehlgeschlagen – Text bitte von Hand markieren', 'error'); };
  try { navigator.clipboard.writeText(text).then(fertig, fehler); } catch (e) { fehler(); }
}
function spKopieren(nr) { const r = SPIELER_DB[String(Number(nr))]; if (r) _spKopiere(spielerDetailText(r), '📋 Spielerprofil kopiert'); }
function spJsonKopieren(nr) { const r = SPIELER_DB[String(Number(nr))]; if (r) _spKopiere(JSON.stringify(r, null, 2), '📋 JSON kopiert'); }

// Alle Spielerprofile als Datei (stückweise geschrieben – bei vielen Spielern wird der Text sehr groß)
function spielerProfileExport() {
  try {
    const n = Object.keys(SPIELER_DB).length;
    if (!n) { showStatus('ℹ️ Noch keine Spielerprofile vorhanden', 'info'); return; }
    const blob = new Blob(_jsonParts({ _meta: { exportedAt: new Date().toISOString(), tool: 'BC Konfigurator', art: 'spielerprofile', version: 1, anzahl: n }, spieler: SPIELER_DB }), { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'BC_Spielerprofile_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    showStatus('📤 ' + n + ' Spielerprofile exportiert (' + (blob.size / 1048576).toFixed(1) + ' MB)', 'success');
  } catch (e) { showStatus('❌ Export fehlgeschlagen: ' + e.message, 'error'); }
}
