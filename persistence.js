// ══════════════════════════════════════════════════════
//  Persistenz-Modul (SPLIT-01) — IndexedDB-Helfer, einmalige
//  localStorage→IDB-Migration und _debounce. Wörtlich aus items.js
//  (Zeilen 5-96, Stand 9b41340) verschoben, ohne Verhaltensänderung.
//  Muss VOR bridge.js und items.js geladen werden (siehe docs/LOAD-ORDER.md).
//  Klassisches Skript: Funktionsdeklarationen sind implizite Globals;
//  der Schwanz unten exportiert zusätzlich für Vitest/CJS (Dual-Export,
//  RESEARCH Pattern 1). Kein type="module" — bricht unter file://.
// ══════════════════════════════════════════════════════
const _IDB_NAME    = 'BCKonfigurator';
const _IDB_VERSION = 1;
const _IDB_STORE   = 'kv';
let   _IDB_DB      = null;

function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
    };
    req.onsuccess = e => { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror   = e => reject(e.target.error);
  });
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
    console.error('[IDB] Schreiben fehlgeschlagen:', key, err);
    const voll = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.name || ''));
    // Nicht bei jedem Tastendruck erneut aufpoppen
    if (Date.now() - _idbFehlerGemeldet > 10000 && typeof showStatus === 'function') {
      _idbFehlerGemeldet = Date.now();
      showStatus(voll
        ? '❌ Speicher voll – "' + key + '" wurde NICHT gesichert. Backup anlegen und aufräumen!'
        : '❌ Speichern fehlgeschlagen (' + key + '): ' + (err?.message || err), 'error');
    }
    return false;
  }
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
  module.exports = { idbGet, idbSet, _idbOpen, _debounce };
}
