/* ══════════════════════════════════════════════════════════════
   Automatisches Voll-Backup in einen Ordner

   Schreibt den kompletten Datenbestand – Curse-DB, LSCG, Wheel,
   Profile, Raenge, Money und ALLE Screenshots – als eine JSON-Datei
   in einen frei gewaehlten Ordner. Liegt der im Google-Drive-,
   OneDrive- oder Dropbox-Ordner, synchronisiert der Dienst von selbst.

   Der Inhalt wird stueckweise in die Datei gestreamt. So entsteht nie
   ein einzelner Riesenstring (V8-Limit ~512 MB) und die Oberflaeche
   bleibt bedienbar.

   Befehle:
     bcBackupOrdnerWaehlen()   einmalig den Zielordner festlegen
     bcBackupJetzt()           sofort sichern
     bcBackupStatus()          Zustand abfragen
     bcBackupEinstellen({...}) abstandH / behalten / aktiv aendern
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var IDB_KEY = 'BC_AUTOBACKUP_v1';
  var PREFIX  = 'BC_Vollbackup_';

  var ordner = null;                 // FileSystemDirectoryHandle
  var cfg    = { zuletzt: 0, behalten: 3, abstandH: 6, aktiv: true };
  var laeuft = false;

  // ── Konfiguration ─────────────────────────────────────────────────────
  async function ladeCfg() {
    try {
      var d = await idbGet(IDB_KEY);
      if (d) {
        if (d.ordner) ordner = d.ordner;
        if (d.cfg) Object.assign(cfg, d.cfg);
      }
    } catch (e) { console.warn('[Backup] Konfiguration:', e); }
  }
  function speichereCfg() { return idbSet(IDB_KEY, { ordner: ordner, cfg: cfg }); }

  async function darfSchreiben(nachfragen) {
    if (!ordner) return false;
    var opt = { mode: 'readwrite' };
    if ((await ordner.queryPermission(opt)) === 'granted') return true;
    if (!nachfragen) return false;
    return (await ordner.requestPermission(opt)) === 'granted';
  }

  // ── JSON stueckweise erzeugen ─────────────────────────────────────────
  function* teile(value) {
    if (value === undefined || value === null || typeof value !== 'object') {
      yield JSON.stringify(value === undefined ? null : value);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length <= 32) { yield JSON.stringify(value); return; }
      yield '[';
      for (var i = 0; i < value.length; i++) { if (i) yield ','; yield* teile(value[i]); }
      yield ']';
      return;
    }
    var keys = Object.keys(value);
    if (keys.length <= 32) {
      var s = null;
      try { s = JSON.stringify(value); } catch (e) { s = null; }
      // 8 MB: gross genug um nicht alles zu zerlegen, klein genug fuers Streamen
      if (typeof s === 'string' && s.length <= 8 * 1024 * 1024) { yield s; return; }
    }
    yield '{';
    var erster = true;
    for (var k = 0; k < keys.length; k++) {
      var v = value[keys[k]];
      if (v === undefined) continue;
      if (!erster) yield ',';
      erster = false;
      yield JSON.stringify(keys[k]) + ':';
      yield* teile(v);
    }
    yield '}';
  }

  function baueDaten() {
    var g = function (fallback, f) { try { var v = f(); return v === undefined ? fallback : v; } catch (e) { return fallback; } };
    return {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: 2, tool: 'BC Konfigurator', art: 'auto-vollbackup'
      },
      profiles:           g({}, function () { return PROFILES; }),
      curseDatabase:      g({}, function () { return CURSE_DB; }),
      lscgTable:          g({}, function () { return CURSE_LSCG; }),
      lscgCache:          g({}, function () { return CURSE_CACHE_LSCG; }),
      curseComments:      g({}, function () { return CURSE_COMMENTS; }),
      curseOutfitFlags:   g({}, function () { return CURSE_OUTFIT_FLAGS; }),
      curseFavourites:    g([], function () { return Array.from(CURSE_FAVOURITES); }),
      lscgDB:             g({}, function () { return LSCG_DB; }),
      lscgSlots:          g({}, function () { return _lscgSlots; }),
      lscgScreenshots:    g({}, function () { return LSCG_SCREENSHOTS; }),
      profileScreenshots: g({}, function () { return PROFILE_SCREENSHOTS; }),
      profileFavs:        g([], function () { return Array.from(PROFILE_FAVS); }),
      mbsWheel:           g([], function () { return _mbsWheelData; }),
      mbsWheelFavs:       g([], function () { return Array.from(_mbsWheelFavs); }),
      mbsWheelOutfitFavs: g([], function () { return Array.from(_mbsWheelOutfitFavs); }),
      mbsWheelShots:      g({}, function () { return _mbsWheelShots; }),
      rangDaten:          g(null, function () { return _rankData; }),
      moneyDaten:         g(null, function () { return _money; }),
      botLogs:            g(null, function () { return window._BCBotLog; }),
      defaultOutfit:      g(null, function () {
        return CURSE_DEFAULT_OUTFIT_CODE
          ? { code: CURSE_DEFAULT_OUTFIT_CODE, date: CURSE_DEFAULT_OUTFIT_DATE } : null;
      })
    };
  }

  // ── Schreiben ─────────────────────────────────────────────────────────
  async function schreibe(dateiname) {
    var datei = await ordner.getFileHandle(dateiname, { create: true });
    var strom = await datei.createWritable();
    var daten = baueDaten();
    var bytes = 0, bloecke = 0, puffer = '';
    try {
      for (var stueck of teile(daten)) {
        puffer += stueck;
        if (puffer.length >= 4 * 1024 * 1024) {
          await strom.write(puffer);
          bytes += puffer.length;
          puffer = '';
          if (++bloecke % 8 === 0) await new Promise(function (r) { setTimeout(r, 0); });
        }
      }
      if (puffer) { await strom.write(puffer); bytes += puffer.length; }
      await strom.close();
    } catch (e) {
      try { await strom.abort(); } catch (e2) {}
      throw e;
    }
    return bytes;
  }

  async function raeumeAuf() {
    var vorhanden = [];
    for await (var eintrag of ordner.values()) {
      if (eintrag.kind === 'file' && eintrag.name.indexOf(PREFIX) === 0) vorhanden.push(eintrag.name);
    }
    vorhanden.sort();   // Zeitstempel im Namen: alphabetisch = chronologisch
    var weg = vorhanden.slice(0, Math.max(0, vorhanden.length - cfg.behalten));
    for (var i = 0; i < weg.length; i++) {
      try { await ordner.removeEntry(weg[i]); } catch (e) {}
    }
    return weg.length;
  }

  async function sichern(erzwingen) {
    if (laeuft) return { uebersprungen: 'laeuft bereits' };
    if (!ordner) return { uebersprungen: 'kein Ordner gewaehlt' };
    if (!erzwingen && !cfg.aktiv) return { uebersprungen: 'deaktiviert' };
    if (!erzwingen && Date.now() - (cfg.zuletzt || 0) < cfg.abstandH * 3600e3) {
      return { uebersprungen: 'zu frueh' };
    }
    if (!(await darfSchreiben(!!erzwingen))) return { uebersprungen: 'keine Berechtigung' };

    laeuft = true;
    var t0 = Date.now();
    try {
      var ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var name  = PREFIX + ts + '.json';
      var bytes = await schreibe(name);
      var weg   = await raeumeAuf();
      cfg.zuletzt = Date.now();
      await speichereCfg();
      var mb  = +(bytes / 1048576).toFixed(1);
      var sek = +((Date.now() - t0) / 1000).toFixed(1);
      console.info('[Backup] ' + name + ' – ' + mb + ' MB in ' + sek + ' s'
        + (weg ? ', ' + weg + ' alte entfernt' : ''));
      return { datei: name, mb: mb, sekunden: sek, geloescht: weg };
    } catch (e) {
      console.error('[Backup] fehlgeschlagen:', e);
      return { fehler: e.message };
    } finally {
      laeuft = false;
    }
  }

  // ── Oeffentliche Befehle ──────────────────────────────────────────────
  root.bcBackupOrdnerWaehlen = async function () {
    if (!window.showDirectoryPicker) { alert('Dieser Browser kennt keine Ordnerauswahl.'); return; }
    try {
      ordner = await window.showDirectoryPicker({ id: 'bcBackup', mode: 'readwrite', startIn: 'documents' });
    } catch (e) { return; }   // vom Nutzer abgebrochen
    if (!(await darfSchreiben(true))) { alert('Ohne Schreibrecht kann nicht gesichert werden.'); return; }
    cfg.aktiv = true;
    await speichereCfg();
    // Verhindert, dass der Browser die Daten bei Speicherdruck verwirft
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    if (typeof showStatus === 'function') showStatus('✅ Backup-Ordner: ' + ordner.name, 'success');
    return sichern(true);
  };

  root.bcBackupJetzt = function () { return sichern(true); };

  root.bcBackupStatus = async function () {
    return {
      ordner: ordner ? ordner.name : null,
      berechtigung: ordner ? await ordner.queryPermission({ mode: 'readwrite' }) : 'kein Ordner',
      aktiv: cfg.aktiv,
      zuletzt: cfg.zuletzt ? new Date(cfg.zuletzt).toLocaleString('de-DE') : 'nie',
      abstandStunden: cfg.abstandH,
      behalten: cfg.behalten
    };
  };

  root.bcBackupEinstellen = async function (o) {
    if (o && typeof o.abstandH === 'number') cfg.abstandH = Math.max(1, o.abstandH);
    if (o && typeof o.behalten === 'number') cfg.behalten = Math.max(1, o.behalten);
    if (o && typeof o.aktiv === 'boolean')   cfg.aktiv = o.aktiv;
    await speichereCfg();
    return root.bcBackupStatus();
  };

  // fuer Tests: Zielordner direkt setzen (z. B. das Origin-Private-Dateisystem)
  root._bcBackupSetzeOrdner = function (h) { ordner = h; };

  // ── Automatik ─────────────────────────────────────────────────────────
  async function start() {
    await ladeCfg();
    if (!ordner) return;
    // Ohne bereits erteiltes Recht braucht es eine Nutzeraktion. Einmalig an
    // den naechsten Klick haengen, damit von allein nichts aufpoppt.
    if (!(await darfSchreiben(false))) {
      var einmal = function () {
        document.removeEventListener('click', einmal, true);
        darfSchreiben(true).then(function (ok) { if (ok) sichern(false); });
      };
      document.addEventListener('click', einmal, true);
      return;
    }
    setTimeout(function () { sichern(false); }, 20000);       // kurz nach dem Laden
    setInterval(function () { sichern(false); }, 30 * 60e3);  // danach regelmaessig pruefen
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})(window);
