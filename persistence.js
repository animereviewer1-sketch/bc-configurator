// ══════════════════════════════════════════════════════
//  Persistenz-Modul (SPLIT-01) — IndexedDB-Helfer, einmalige
//  localStorage→IDB-Migration und _debounce. Wörtlich aus items.js
//  (Zeilen 5-96, Stand 9b41340) verschoben, ohne Verhaltensänderung.
//  Muss VOR bridge.js und items.js geladen werden (siehe docs/LOAD-ORDER.md).
//  Klassisches Skript: Funktionsdeklarationen sind implizite Globals;
//  der Schwanz unten exportiert zusätzlich für Vitest/CJS (Dual-Export,
//  RESEARCH Pattern 1). Kein type="module" — bricht unter file://.
//  v3 (SCAN-08): additiver Object-Store 'snapshots' für Spiel-Scans, add-only.
// ══════════════════════════════════════════════════════
const _IDB_NAME    = 'BCKonfigurator';
const _IDB_VERSION = 3; // v3: Object-Store 'snapshots' (SCAN-08). Nie senken – IDB kennt kein Downgrade.
const _IDB_STORE   = 'kv';
let   _IDB_DB      = null;
let   _IDB_OPENING = null;

// Screenshot-Store (SPLIT-05/06): ein Datensatz je Bild, id = '<kind>|<key>'.
const _IDB_SCREENSHOTS = 'screenshots';
const SCREENSHOT_KINDS = ['profile', 'lscg', 'wheel'];
// Alt-Blobs: nur lesen, nie schreiben oder löschen — eingefrorener Rollback-Stand, Kernwert.
const SCREENSHOT_LEGACY_KEYS = {
  profile: 'BC_PROFILE_SCREENSHOTS_v1',
  lscg:    'BC_LSCG_SCREENSHOTS_v1',
  wheel:   'BC_MBS_WHEEL_SS_v1',
};
const SCREENSHOT_MIGRATION_KEY = 'BC_SCREENSHOT_MIGRATION_v1';

// Snapshot-Store (SCAN-08): ein Datensatz je Spiel-Scan, id = Zeitstempel (Tool-Uhr).
// Add-only – nie überschreiben, nie automatisch löschen (Kernwert); Löschen mit
// Bestätigung folgt in Phase 6 (SCAN-11).
const _IDB_SNAPSHOTS = 'snapshots';

function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  if (_IDB_OPENING) return _IDB_OPENING;
  _IDB_OPENING = new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
      if (!db.objectStoreNames.contains(_IDB_SCREENSHOTS)) db.createObjectStore(_IDB_SCREENSHOTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(_IDB_SNAPSHOTS)) db.createObjectStore(_IDB_SNAPSHOTS, { keyPath: 'id' });
    };
    req.onblocked = () => {
      // SPLIT-06: sichtbar machen statt still zu haengen oder den anderen Tab
      // zu blockieren. Kein reject, kein resolve — das Open-Request bleibt
      // offen, bis der andere Tab seine Verbindung schliesst.
      console.warn('[IDB] Datenbank-Update blockiert – ein anderer Tab hält die alte Version offen');
      if (typeof showStatus === 'function') showStatus('❌ Datenbank-Update blockiert – bitte andere Tool-Tabs schließen', 'error');
    };
    req.onsuccess = e => {
      const db = e.target.result;
      db.onversionchange = () => {
        db.close();
        if (_IDB_DB === db) _IDB_DB = null;
        console.warn('[IDB] versionchange – Verbindung geschlossen');
        if (typeof showStatus === 'function') showStatus('⚠️ Datenbank wurde in einem anderen Tab aktualisiert – bitte dieses Fenster neu laden', 'error');
      };
      _IDB_DB = db;
      _IDB_OPENING = null;
      resolve(db);
    };
    req.onerror = e => { _IDB_OPENING = null; reject(e.target.error); };
  });
  return _IDB_OPENING;
}

async function idbGet(key) {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readonly');
      const req = tx.objectStore(_IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] get:', err); return null; }
}

/* Gibt true zurueck, wenn wirklich geschrieben wurde. Wirft nicht – die
   meisten Aufrufer speichern nebenbei und warten das Ergebnis nicht ab.
   Ein Fehler ist hier aber nichts zum Verschlucken: bei vollem Speicher
   (QuotaExceededError) laeuft das Tool sonst weiter, als waere gesichert,
   und der naechste Neustart faengt bei den Defaults an. Darum zusaetzlich
   ein sichtbarer Hinweis in der Statuszeile. */
let _idbFehlerGemeldet = 0;
function _idbSchreibfehler(label, err) {
  console.error('[IDB] Schreiben fehlgeschlagen:', label, err);
  const voll = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.name || ''));
  // Nicht bei jedem Tastendruck erneut aufpoppen
  if (Date.now() - _idbFehlerGemeldet > 10000 && typeof showStatus === 'function') {
    _idbFehlerGemeldet = Date.now();
    showStatus(voll
      ? '❌ Speicher voll – "' + label + '" wurde NICHT gesichert. Backup anlegen und aufräumen!'
      : '❌ Speichern fehlgeschlagen (' + label + '): ' + (err?.message || err), 'error');
  }
}
async function idbSet(key, value) {
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readwrite');
      const req = tx.objectStore(_IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) {
    _idbSchreibfehler(key, err);
    return false;
  }
}

// ── Screenshot-Store: ein Datensatz je Bild (SPLIT-05/06) ──
function _screenshotId(kind, key) { return kind + '|' + key; }

async function idbScreenshotBatch(kind, puts, deletes) {
  if (!(puts && puts.length) && !(deletes && deletes.length)) return true;
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_SCREENSHOTS, 'readwrite');
      const st = tx.objectStore(_IDB_SCREENSHOTS);
      try {
        for (const [key, img] of (puts || [])) {
          st.put({ id: _screenshotId(kind, key), img });
        }
        for (const key of (deletes || [])) {
          st.delete(_screenshotId(kind, key));
        }
      } catch (err) {
        try { tx.abort(); } catch (e) {}
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) {
    _idbSchreibfehler(kind + '-Screenshots', err);
    return false;
  }
}
function idbScreenshotPut(kind, key, img) { return idbScreenshotBatch(kind, [[key, img]], []); }
function idbScreenshotDelete(kind, key) { return idbScreenshotBatch(kind, [], [key]); }

async function idbScreenshotGetAll(kind) {
  try {
    const db = await _idbOpen();
    const records = await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_SCREENSHOTS, 'readonly');
      const req = tx.objectStore(_IDB_SCREENSHOTS).getAll(IDBKeyRange.bound(kind + '|', kind + '|￿'));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = e => reject(e.target.error);
    });
    const out = {};
    for (const rec of records) out[rec.id.slice(kind.length + 1)] = rec.img;
    return out;
  } catch (err) { console.warn('[IDB] screenshots getAll:', kind, err); return {}; }
}

async function idbScreenshotKeys() {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_SCREENSHOTS, 'readonly');
      const req = tx.objectStore(_IDB_SCREENSHOTS).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] screenshots keys:', err); return []; }
}

// ── Snapshot-Store: ein Datensatz je Spiel-Scan (SCAN-08) ──
// Add-only: `add` statt `put` — ein zweiter Schreibversuch mit derselben id
// scheitert sichtbar (ConstraintError → _idbSchreibfehler), der erste
// Datensatz bleibt unverändert. Löschen eines einzelnen Snapshots ist
// ausschließlich über idbSnapshotDelete möglich, das nur aus dem
// bestätigten UI-Pfad deleteGameSnapshot (scan-tab.js) aufgerufen wird
// (Phase 6, SCAN-11) — keine Leer-/Sammellösch-Funktion (Kernwert „nie
// automatisch entfernt“).
async function idbSnapshotPut(record) {
  // id: Zahl (Zeitstempel) oder nicht-leerer String (Zeitstempel + reqId-Suffix, Review CR-01)
  const idOk = record && (typeof record.id === 'number' || (typeof record.id === 'string' && record.id.length > 0));
  if (!idOk) {
    _idbSchreibfehler('Spiel-Snapshot', new Error('ungültiger Snapshot-Datensatz'));
    return false;
  }
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_SNAPSHOTS, 'readwrite');
      try {
        tx.objectStore(_IDB_SNAPSHOTS).add(record);
      } catch (err) {
        try { tx.abort(); } catch (e) {}
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) {
    _idbSchreibfehler('Spiel-Snapshot', err);
    return false;
  }
}

async function idbSnapshotGetAll() {
  try {
    const db = await _idbOpen();
    const records = await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_SNAPSHOTS, 'readonly');
      const req = tx.objectStore(_IDB_SNAPSHOTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = e => reject(e.target.error);
    });
    return records.sort((a, b) => (a.ts ?? a.id) - (b.ts ?? b.id));
  } catch (err) { console.warn('[IDB] snapshots getAll:', err); return []; }
}

async function idbSnapshotGet(id) {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_SNAPSHOTS, 'readonly');
      const req = tx.objectStore(_IDB_SNAPSHOTS).get(id);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] snapshots get:', err); return null; }
}

async function idbSnapshotKeys() {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_SNAPSHOTS, 'readonly');
      const req = tx.objectStore(_IDB_SNAPSHOTS).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] snapshots keys:', err); return []; }
}

// Löscht genau einen Snapshot (SCAN-11). Einzige Lösch-Operation auf diesem
// Store im gesamten Repo — der Aufrufer (scan-tab.js, deleteGameSnapshot)
// bestätigt vorher per confirm(). Ungültige id: false, ohne IDB-Zugriff.
async function idbSnapshotDelete(id) {
  const idOk = typeof id === 'number' || (typeof id === 'string' && id.length > 0);
  if (!idOk) return false;
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_SNAPSHOTS, 'readwrite');
      try {
        tx.objectStore(_IDB_SNAPSHOTS).delete(id);
      } catch (err) {
        try { tx.abort(); } catch (e) {}
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) {
    console.warn('[IDB] snapshot delete:', err);
    return false;
  }
}

// Additive, verifizierte, idempotente Migration der drei Alt-Blobs in den
// Screenshot-Store. Alt-Blobs werden NUR gelesen — nie geschrieben, nie
// geloescht (Kernwert). Marker wird erst nach erfolgreicher Verifikation
// gesetzt; jeder Fehler (Quota, Verifikation) bricht die Transaktion ab,
// schreibt keinen Marker und wiederholt beim naechsten Start.
async function _migrateScreenshotsToStore() {
  try {
    const db = await _idbOpen();
    const marker = await idbGet(SCREENSHOT_MIGRATION_KEY);
    if (marker && marker.done) return { done: true, skipped: true, marker };

    const blobs = {};
    for (const kind of SCREENSHOT_KINDS) {
      const b = await idbGet(SCREENSHOT_LEGACY_KEYS[kind]);
      blobs[kind] = (b && typeof b === 'object') ? b : {};
    }

    // Kopie, Verifikation und Marker laufen in EINER Transaktion ueber beide
    // Stores: Entweder landen Bilder UND Marker, oder gar nichts. Ein Marker
    // ohne Bilder (oder Bilder ohne Marker) ist damit ausgeschlossen — sonst
    // koennte ein Wiederholungslauf zwischenzeitlich vom Nutzer geloeschte
    // Bilder aus dem eingefrorenen Alt-Blob wiederbeleben (Review CR-02).
    const counts = {};
    let total = 0;
    for (const kind of SCREENSHOT_KINDS) { counts[kind] = Object.keys(blobs[kind]).length; total += counts[kind]; }
    const m = { done: true, count: total, counts, ts: Date.now() };

    const written = await new Promise((resolve, reject) => {
      const tx = db.transaction([_IDB_SCREENSHOTS, _IDB_STORE], 'readwrite');
      const st = tx.objectStore(_IDB_SCREENSHOTS);
      const kv = tx.objectStore(_IDB_STORE);
      let count = 0;
      const fail = err => { try { tx.abort(); } catch (e) {} reject(err); };
      const keysReq = st.getAllKeys();
      keysReq.onsuccess = () => {
        try {
          const have = new Set(keysReq.result);
          for (const kind of SCREENSHOT_KINDS) {
            for (const key of Object.keys(blobs[kind])) {
              const id = _screenshotId(kind, key);
              if (!have.has(id)) {
                st.put({ id, img: blobs[kind][key] }); // add-if-absent: nie ueberschreiben
                count++;
              }
            }
          }
          // Verifikation in derselben Transaktion: Requests laufen in Reihenfolge,
          // die puts oben sind hier bereits sichtbar.
          const verifyReq = st.getAllKeys();
          verifyReq.onsuccess = () => {
            try {
              const ids = new Set(verifyReq.result);
              for (const kind of SCREENSHOT_KINDS) {
                for (const key of Object.keys(blobs[kind])) {
                  if (!ids.has(_screenshotId(kind, key))) throw new Error('Verifikation fehlgeschlagen: ' + kind + '|' + key + ' fehlt im Store');
                }
              }
              kv.put(m, SCREENSHOT_MIGRATION_KEY); // Marker nur zusammen mit den Bildern
            } catch (err) { fail(err); }
          };
          verifyReq.onerror = e => fail(e.target.error);
        } catch (err) { fail(err); }
      };
      keysReq.onerror = e => fail(e.target.error);
      tx.oncomplete   = () => resolve(count);
      tx.onerror      = e => reject(e.target.error);
      tx.onabort      = e => reject(tx.error || e.target.error);
    });

    console.info('[IDB] Screenshot-Migration abgeschlossen:', m);
    return { done: true, migrated: written, marker: m };
  } catch (err) {
    console.warn('[IDB] Screenshot-Migration verschoben – Alt-Bestände bleiben unverändert:', err);
    if (typeof showStatus === 'function') {
      showStatus('⚠️ Screenshot-Migration nicht abgeschlossen – wird beim nächsten Start wiederholt (' + (err && err.message ? err.message : err) + ')', 'error');
    }
    return { done: false, error: err };
  }
}

let _screenshotStoreReadyPromise = null;
function _screenshotStoreReady() {
  if (!_screenshotStoreReadyPromise) _screenshotStoreReadyPromise = _migrateScreenshotsToStore();
  return _screenshotStoreReadyPromise;
}

// Migration localStorage → IDB (einmalig)
(async function() {
  const keys = ['BC_Money_v1','BC_Rank_v1','BC_Shop_v1','BC_Bots_v2','BC_BotGroups_v1',
                 'BCBot_Logs','BC_CURSE_DB_v1','BC_CURSE_COMMENTS_v1','BC_CURSE_FAV_v1'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if ((await idbGet(key)) === null) {
        // Die Quelle erst loeschen, wenn die Kopie wirklich liegt – sonst
        // vernichtet ein fehlgeschlagener Schreibvorgang die Daten.
        if (!(await idbSet(key, JSON.parse(raw)))) {
          console.warn('[IDB] Migration verschoben, localStorage bleibt:', key);
          continue;
        }
        console.info('[IDB] Migriert:', key);
      }
      localStorage.removeItem(key);
    } catch(e) { console.warn('[IDB] Migration:', key, e); }
  }
})();

// ── Utility: Debounce ─────────────────────────────────────────
function _debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn.apply(this, args); }, delay);
  };
}

// Dual-Export für Vitest (CJS-Require); im Browser ist `module` undefined.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    idbGet, idbSet, _idbOpen, _debounce,
    idbScreenshotBatch, idbScreenshotPut, idbScreenshotDelete, idbScreenshotGetAll, idbScreenshotKeys,
    idbSnapshotPut, idbSnapshotGetAll, idbSnapshotGet, idbSnapshotKeys, idbSnapshotDelete,
    _screenshotStoreReady, _migrateScreenshotsToStore,
    SCREENSHOT_KINDS, SCREENSHOT_LEGACY_KEYS, SCREENSHOT_MIGRATION_KEY,
  };
}
