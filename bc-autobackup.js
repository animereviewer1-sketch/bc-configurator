/* ══════════════════════════════════════════════════════════════
   Automatisches Backup in einen Ordner – inkrementell

   Ablauf:
     · Einmal taeglich beim ersten Start des Tools
     · Jeder Lauf schreibt nur die Aenderungen  (BC_Inkr_…)
     · Nach 10 Inkrementen ein Voll-Backup      (BC_Voll_…)
     · Es bleiben 3 Generationen liegen; die aelteste wird
       samt ihrer Inkremente geloescht

   Eine Generation = ein Voll-Backup und alle darauf aufbauenden
   Inkremente. Zum Zurueckspielen wird eine Generation wieder zu
   einem vollstaendigen Datensatz zusammengefuehrt.

   Geschrieben wird stueckweise in die Datei, damit nie ein
   einzelner Riesenstring entsteht (V8-Limit ~512 MB) und die
   Oberflaeche bedienbar bleibt.

   Befehle:
     bcBackupOrdnerWaehlen()      Zielordner festlegen
     bcBackupJetzt()              sofort sichern (Art automatisch)
     bcBackupVollJetzt()          Voll-Backup erzwingen
     bcBackupStatus()             Zustand abfragen
     bcBackupEinstellen({...})    proVoll / generationen / aktiv
     bcBackupRekonstruieren()     Generation zu einer Datei zusammenfuehren
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var IDB_KEY = 'BC_AUTOBACKUP_v2';
  var P_VOLL  = 'BC_Voll_';
  var P_INKR  = 'BC_Inkr_';

  var ordner = null;                  // FileSystemDirectoryHandle
  var cfg = {
    zuletzt: 0,
    letzterTag: null,   // 'JJJJ-M-T' des letzten Laufs
    aktiv: true,
    proVoll: 10,        // nach so vielen Inkrementen ein Voll-Backup
    generationen: 3     // so viele Voll-Staende samt Inkrementen bleiben
  };
  var stand = { basis: null, zaehler: 0, manifest: null };
  var laeuft = false;

  /* Sammlungen als Schluessel/Wert-Paare – hier wird inkrementell verglichen. */
  var SAMMLUNGEN = ['profiles', 'curseDatabase', 'lscgTable', 'lscgCache', 'curseComments',
    'curseOutfitFlags', 'lscgDB', 'lscgSlots', 'lscgScreenshots', 'profileScreenshots',
    'mbsWheelShots'];
  /* Alles Uebrige ist klein bzw. schlecht teilbar und wandert jedes Mal komplett mit. */
  var KOMPLETT = ['curseFavourites', 'profileFavs', 'mbsWheel', 'mbsWheelFavs',
    'mbsWheelOutfitFavs', 'rangDaten', 'moneyDaten', 'botLogs', 'defaultOutfit',
    'bots', 'botGroups', 'botVars', 'playerKeys', 'shopDaten'];

  /* Kalendertag als Schluessel – die Sicherung laeuft einmal pro Tag,
     beim ersten Start. */
  function heute() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // ── Konfiguration ─────────────────────────────────────────────────────
  async function ladeCfg() {
    try {
      var d = await idbGet(IDB_KEY);
      if (d) {
        if (d.ordner) ordner = d.ordner;
        if (d.cfg) Object.assign(cfg, d.cfg);
        if (d.stand) stand = d.stand;
      }
    } catch (e) { console.warn('[Backup] Konfiguration:', e); }
  }
  function speichereCfg() { return idbSet(IDB_KEY, { ordner: ordner, cfg: cfg, stand: stand }); }

  async function darfSchreiben(nachfragen) {
    if (!ordner) return false;
    var opt = { mode: 'readwrite' };
    if ((await ordner.queryPermission(opt)) === 'granted') return true;
    if (!nachfragen) return false;
    return (await ordner.requestPermission(opt)) === 'granted';
  }

  // ── Signaturen zum Vergleich ──────────────────────────────────────────
  /* Kurzer Hash (cyrb53) fuer kleine Werte. */
  function hash(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  /* Signatur eines Eintrags. Bilder (lange Strings) werden nicht komplett
     gehasht – das waeren pro Lauf hunderte MB Zeichenarbeit. Laenge plus
     Anfang und Ende genuegt: ein Screenshot aendert sich nur, wenn er neu
     aufgenommen wird, und dann auch in diesen Bereichen. */
  function sig(v) {
    if (typeof v === 'string') {
      return v.length > 512
        ? 's' + v.length + '~' + v.slice(0, 64) + v.slice(-32)
        : 's' + hash(v);
    }
    var s;
    try { s = JSON.stringify(v); } catch (e) { return 'x'; }
    if (s === undefined) return 'u';
    return 'o' + s.length + hash(s);
  }

  function manifestVon(daten) {
    var m = {};
    for (var i = 0; i < SAMMLUNGEN.length; i++) {
      var name = SAMMLUNGEN[i], obj = daten[name], teil = {};
      if (obj && typeof obj === 'object') {
        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) teil[keys[k]] = sig(obj[keys[k]]);
      }
      m[name] = teil;
    }
    return m;
  }

  function diffVon(daten, alt) {
    var geaendert = {}, geloescht = {}, anzNeu = 0, anzWeg = 0;
    for (var i = 0; i < SAMMLUNGEN.length; i++) {
      var name = SAMMLUNGEN[i];
      var jetzt = daten[name] || {};
      var vorher = (alt && alt[name]) || {};
      var g = {}, w = [];
      var keys = Object.keys(jetzt);
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (vorher[key] !== sig(jetzt[key])) { g[key] = jetzt[key]; anzNeu++; }
      }
      var alteKeys = Object.keys(vorher);
      for (var a = 0; a < alteKeys.length; a++) {
        if (!(alteKeys[a] in jetzt)) { w.push(alteKeys[a]); anzWeg++; }
      }
      if (Object.keys(g).length) geaendert[name] = g;
      if (w.length) geloescht[name] = w;
    }
    return { geaendert: geaendert, geloescht: geloescht, anzNeu: anzNeu, anzWeg: anzWeg };
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
    var g = function (fallback, f) {
      try { var v = f(); return v === undefined ? fallback : v; } catch (e) { return fallback; }
    };
    return {
      profiles:           g({}, function () { return PROFILES; }),
      curseDatabase:      g({}, function () { return CURSE_DB; }),
      lscgTable:          g({}, function () { return CURSE_LSCG; }),
      lscgCache:          g({}, function () { return CURSE_CACHE_LSCG; }),
      curseComments:      g({}, function () { return CURSE_COMMENTS; }),
      curseOutfitFlags:   g({}, function () { return CURSE_OUTFIT_FLAGS; }),
      lscgDB:             g({}, function () { return LSCG_DB; }),
      lscgSlots:          g({}, function () { return _lscgSlots; }),
      lscgScreenshots:    g({}, function () { return LSCG_SCREENSHOTS; }),
      profileScreenshots: g({}, function () { return PROFILE_SCREENSHOTS; }),
      mbsWheelShots:      g({}, function () { return _mbsWheelShots; }),
      curseFavourites:    g([], function () { return Array.from(CURSE_FAVOURITES); }),
      profileFavs:        g([], function () { return Array.from(PROFILE_FAVS); }),
      mbsWheel:           g([], function () { return _mbsWheelData; }),
      mbsWheelFavs:       g([], function () { return Array.from(_mbsWheelFavs); }),
      mbsWheelOutfitFavs: g([], function () { return Array.from(_mbsWheelOutfitFavs); }),
      rangDaten:          g(null, function () { return _rankData; }),
      moneyDaten:         g(null, function () { return _money; }),
      botLogs:            g(null, function () { return window._BCBotLog; }),
      // Bot- und Shop-Bestand: fehlten hier komplett, obwohl Trigger, Events,
      // Szenen und der Kaufverlauf nur an dieser einen Stelle liegen.
      bots:               g([],   function () { return _bots; }),
      botGroups:          g([],   function () { return _botGroups; }),
      botVars:            g({},   function () { return _botVars; }),
      playerKeys:         g({},   function () { return _playerKeys; }),
      shopDaten:          g(null, function () { return _shop; }),
      defaultOutfit:      g(null, function () {
        return CURSE_DEFAULT_OUTFIT_CODE
          ? { code: CURSE_DEFAULT_OUTFIT_CODE, date: CURSE_DEFAULT_OUTFIT_DATE } : null;
      })
    };
  }

  // ── Schreiben ─────────────────────────────────────────────────────────
  async function schreibeDatei(name, inhalt) {
    var datei = await ordner.getFileHandle(name, { create: true });
    var strom = await datei.createWritable();
    // zeichen zaehlt UTF-16-Codeeinheiten – die tatsaechliche Dateigroesse in
    // Bytes steht danach im FileHandle. Frueher wurde die Zeichenzahl als
    // "bytes" gemeldet, was bei Umlauten und Emojis zu niedrig lag.
    var zeichen = 0, bloecke = 0, puffer = '';
    try {
      for (var stueck of teile(inhalt)) {
        puffer += stueck;
        if (puffer.length >= 4 * 1024 * 1024) {
          await strom.write(puffer);
          zeichen += puffer.length;
          puffer = '';
          if (++bloecke % 8 === 0) await new Promise(function (r) { setTimeout(r, 0); });
        }
      }
      if (puffer) { await strom.write(puffer); zeichen += puffer.length; }
      await strom.close();
    } catch (e) {
      try { await strom.abort(); } catch (e2) {}
      throw e;
    }
    try { return (await datei.getFile()).size; } catch (e) { return zeichen; }
  }

  // Millisekunden mit im Namen: sonst wuerden zwei Sicherungen in derselben
  // Sekunde dieselbe Datei treffen und die erste ueberschreiben.
  function stempel() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23); }

  /* Dateinamen einer Generation erkennen:
       BC_Voll_<gen>.json          das Voll-Backup
       BC_Inkr_<ts>__<gen>.json    ein darauf aufbauendes Inkrement            */
  function genVon(name) {
    if (name.indexOf(P_VOLL) === 0) return name.slice(P_VOLL.length, -5);
    if (name.indexOf(P_INKR) === 0) {
      var p = name.indexOf('__');
      if (p > 0) return name.slice(p + 2, -5);
    }
    return null;
  }

  async function dateien() {
    var liste = [];
    for await (var e of ordner.values()) {
      if (e.kind === 'file' && (e.name.indexOf(P_VOLL) === 0 || e.name.indexOf(P_INKR) === 0)) {
        liste.push(e.name);
      }
    }
    return liste;
  }

  async function raeumeAuf() {
    var liste = await dateien();
    var gen = {};
    for (var i = 0; i < liste.length; i++) {
      var g = genVon(liste[i]);
      if (!g) continue;
      (gen[g] = gen[g] || []).push(liste[i]);
    }
    var ids = Object.keys(gen).sort();               // Zeitstempel: alphabetisch = chronologisch
    var weg = ids.slice(0, Math.max(0, ids.length - cfg.generationen));
    var n = 0;
    for (var w = 0; w < weg.length; w++) {
      var files = gen[weg[w]];
      for (var f = 0; f < files.length; f++) {
        try { await ordner.removeEntry(files[f]); n++; } catch (e) {}
      }
    }
    return { dateien: n, generationen: weg.length };
  }

  async function sichern(erzwingen, vollErzwingen) {
    if (laeuft) return { uebersprungen: 'laeuft bereits' };
    if (!ordner) return { uebersprungen: 'kein Ordner gewaehlt' };
    if (!erzwingen && !cfg.aktiv) return { uebersprungen: 'deaktiviert' };
    if (!erzwingen && cfg.letzterTag === heute()) {
      return { uebersprungen: 'heute bereits gesichert' };
    }
    if (!(await darfSchreiben(!!erzwingen))) return { uebersprungen: 'keine Berechtigung' };

    laeuft = true;
    var t0 = Date.now();
    try {
      var daten = baueDaten();
      var voll = vollErzwingen || !stand.basis || !stand.manifest || stand.zaehler >= cfg.proVoll;

      var name, bytes, info;
      if (voll) {
        var gen = stempel();
        name = P_VOLL + gen + '.json';
        bytes = await schreibeDatei(name, {
          _meta: { exportedAt: new Date().toISOString(), version: 3, tool: 'BC Konfigurator',
                   art: 'voll', generation: gen },
          daten: daten
        });
        stand = { basis: gen, zaehler: 0, manifest: manifestVon(daten) };
        info = { art: 'voll' };
      } else {
        var d = diffVon(daten, stand.manifest);
        var komplett = {};
        for (var i = 0; i < KOMPLETT.length; i++) komplett[KOMPLETT[i]] = daten[KOMPLETT[i]];
        name = P_INKR + stempel() + '__' + stand.basis + '.json';
        bytes = await schreibeDatei(name, {
          _meta: { exportedAt: new Date().toISOString(), version: 3, tool: 'BC Konfigurator',
                   art: 'inkrement', generation: stand.basis, nummer: stand.zaehler + 1 },
          geaendert: d.geaendert,
          geloescht: d.geloescht,
          komplett: komplett
        });
        stand.zaehler++;
        stand.manifest = manifestVon(daten);
        info = { art: 'inkrement', geaendert: d.anzNeu, entfernt: d.anzWeg, nummer: stand.zaehler };
      }

      var auf = await raeumeAuf();
      cfg.zuletzt = Date.now();
      cfg.letzterTag = heute();
      await speichereCfg();

      var mb = +(bytes / 1048576).toFixed(2);
      var sek = +((Date.now() - t0) / 1000).toFixed(1);
      console.info('[Backup] ' + name + ' – ' + mb + ' MB in ' + sek + ' s'
        + (auf.generationen ? ', ' + auf.generationen + ' alte Generation(en) entfernt' : ''));
      return Object.assign({ datei: name, mb: mb, sekunden: sek, aufgeraeumt: auf }, info);
    } catch (e) {
      console.error('[Backup] fehlgeschlagen:', e);
      return { fehler: e.message };
    } finally {
      laeuft = false;
    }
  }

  // ── Generation wieder zusammenfuehren ─────────────────────────────────
  async function leseJson(name) {
    var f = await (await ordner.getFileHandle(name)).getFile();
    return JSON.parse(await f.text());
  }

  root.bcBackupRekonstruieren = async function (generation) {
    if (!ordner) { console.error('[Backup] kein Ordner'); return; }
    if (!(await darfSchreiben(true))) return;
    var liste = await dateien();
    var gen = {};
    for (var i = 0; i < liste.length; i++) {
      var g = genVon(liste[i]);
      if (g) (gen[g] = gen[g] || []).push(liste[i]);
    }
    var ids = Object.keys(gen).sort();
    var ziel = generation || ids[ids.length - 1];
    if (!ziel || !gen[ziel]) { console.error('[Backup] Generation nicht gefunden'); return; }

    var vollName = P_VOLL + ziel + '.json';
    if (gen[ziel].indexOf(vollName) < 0) { console.error('[Backup] Voll-Backup der Generation fehlt'); return; }
    var basis = await leseJson(vollName);
    var daten = basis.daten;

    var inkr = gen[ziel].filter(function (n) { return n !== vollName; }).sort();
    for (var k = 0; k < inkr.length; k++) {
      var d = await leseJson(inkr[k]);
      var s;
      for (s in (d.geaendert || {})) {
        daten[s] = daten[s] || {};
        Object.assign(daten[s], d.geaendert[s]);
      }
      for (s in (d.geloescht || {})) {
        var keys = d.geloescht[s];
        for (var x = 0; x < keys.length; x++) if (daten[s]) delete daten[s][keys[x]];
      }
      for (s in (d.komplett || {})) daten[s] = d.komplett[s];
      await new Promise(function (r) { setTimeout(r, 0); });
    }

    // Im Format des normalen Komplett-Backups ablegen, damit "⬆️ Restore" es liest
    var ausgabe = Object.assign({
      _meta: { exportedAt: new Date().toISOString(), version: 3, tool: 'BC Konfigurator',
               art: 'rekonstruiert', generation: ziel, inkremente: inkr.length }
    }, daten);
    var name = 'BC_Wiederhergestellt_' + ziel + '.json';
    var bytes = await schreibeDatei(name, ausgabe);
    console.info('[Backup] ' + name + ' aus 1 Voll + ' + inkr.length + ' Inkrement(en), '
      + (bytes / 1048576).toFixed(1) + ' MB');
    return { datei: name, mb: +(bytes / 1048576).toFixed(1), inkremente: inkr.length, generation: ziel };
  };

  // ── Oeffentliche Befehle ──────────────────────────────────────────────
  root.bcBackupOrdnerWaehlen = async function () {
    if (!window.showDirectoryPicker) { alert('Dieser Browser kennt keine Ordnerauswahl.'); return; }
    try {
      ordner = await window.showDirectoryPicker({ id: 'bcBackup', mode: 'readwrite', startIn: 'documents' });
    } catch (e) { return; }
    if (!(await darfSchreiben(true))) { alert('Ohne Schreibrecht kann nicht gesichert werden.'); return; }
    cfg.aktiv = true;
    stand = { basis: null, zaehler: 0, manifest: null };   // neuer Ordner -> mit Voll-Backup beginnen
    await speichereCfg();
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    if (typeof showStatus === 'function') showStatus('✅ Backup-Ordner: ' + ordner.name, 'success');
    return sichern(true);
  };

  root.bcBackupJetzt     = function () { return sichern(true, false); };
  root.bcBackupVollJetzt = function () { return sichern(true, true); };

  root.bcBackupStatus = async function () {
    var gen = null, anzahl = null;
    if (ordner && (await darfSchreiben(false))) {
      try {
        var liste = await dateien(), g = {};
        for (var i = 0; i < liste.length; i++) { var x = genVon(liste[i]); if (x) (g[x] = g[x] || []).push(liste[i]); }
        gen = Object.keys(g).sort();
        anzahl = gen.map(function (k) { return { generation: k, dateien: g[k].length }; });
      } catch (e) {}
    }
    return {
      ordner: ordner ? ordner.name : null,
      berechtigung: ordner ? await ordner.queryPermission({ mode: 'readwrite' }) : 'kein Ordner',
      aktiv: cfg.aktiv,
      zuletzt: cfg.zuletzt ? new Date(cfg.zuletzt).toLocaleString('de-DE') : 'nie',
      laeuft: 'einmal taeglich beim ersten Start',
      heuteSchonGesichert: cfg.letzterTag === heute(),
      inkrementeProVoll: cfg.proVoll,
      generationen: cfg.generationen,
      aktuelleGeneration: stand.basis,
      inkrementeSeitVoll: stand.zaehler,
      imOrdner: anzahl
    };
  };

  /* Was liegt im Backup-Ordner? Nach Generationen gruppiert. */
  root.bcBackupDateien = async function () {
    if (!ordner) return 'kein Ordner gewaehlt';
    if (!(await darfSchreiben(true))) return 'keine Berechtigung';
    var zeilen = [];
    for await (var e of ordner.values()) {
      if (e.kind !== 'file') continue;
      if (e.name.indexOf(P_VOLL) !== 0 && e.name.indexOf(P_INKR) !== 0) continue;
      var f = await e.getFile();
      zeilen.push({
        datei: e.name,
        art: e.name.indexOf(P_VOLL) === 0 ? 'voll' : 'inkrement',
        generation: genVon(e.name),
        mb: +(f.size / 1048576).toFixed(2),
        geschrieben: new Date(f.lastModified).toLocaleString('de-DE')
      });
    }
    zeilen.sort(function (a, b) { return a.datei < b.datei ? -1 : 1; });
    console.table(zeilen);
    var summe = zeilen.reduce(function (s, z) { return s + z.mb; }, 0);
    console.log(zeilen.length + ' Dateien, ' + summe.toFixed(1) + ' MB gesamt');
    return zeilen;
  };

  root.bcBackupEinstellen = async function (o) {
    if (o && typeof o.proVoll === 'number')      cfg.proVoll = Math.max(1, o.proVoll);
    if (o && typeof o.generationen === 'number') cfg.generationen = Math.max(1, o.generationen);
    if (o && typeof o.aktiv === 'boolean')       cfg.aktiv = o.aktiv;
    await speichereCfg();
    return root.bcBackupStatus();
  };

  // fuer Tests: Zielordner direkt setzen
  root._bcBackupAutoLauf = function () { return sichern(false); };

  root._bcBackupSetzeOrdner = function (h) {
    ordner = h;
    stand = { basis: null, zaehler: 0, manifest: null };
  };

  // ── Automatik ─────────────────────────────────────────────────────────
  async function start() {
    await ladeCfg();
    if (!ordner) return;
    // Der stuendliche Takt muss in BEIDEN Faellen laufen: frueher kehrte der
    // Berechtigungs-Zweig vorzeitig zurueck, dann sicherte eine ueber
    // Mitternacht offene Sitzung nie wieder.
    var takt = function () {
      setInterval(function () { sichern(false); }, 60 * 60e3);    // Sitzung ueber Mitternacht
    };
    if (!(await darfSchreiben(false))) {
      var einmal = function () {
        document.removeEventListener('click', einmal, true);
        darfSchreiben(true).then(function (ok) { if (ok) { sichern(false); takt(); } });
      };
      document.addEventListener('click', einmal, true);
      return;
    }
    setTimeout(function () { sichern(false); }, 20000);           // erster Start des Tages
    takt();
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})(window);
