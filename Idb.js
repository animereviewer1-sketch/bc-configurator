// ══════════════════════════════════════════════════════
//  IndexedDB Helper – BCKonfigurator
//  Globale Funktionen (kein IIFE) damit alle Scripts
//  idbGet / idbSet sofort beim Laden nutzen können.
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
      if (!db.objectStoreNames.contains(_IDB_STORE)) {
        db.createObjectStore(_IDB_STORE);
      }
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
  } catch (err) {
    console.warn('[IDB] get error:', err);
    return null;
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
    });
  } catch (err) {
    console.warn('[IDB] set error:', err);
  }
}

// One-time migration: bestehende localStorage-Daten nach IDB umziehen
(async function _idbMigrate() {
  const keys = ['BC_Money_v1', 'BC_Rank_v1', 'BC_Shop_v1',
                 'BC_Bots_v2', 'BC_BotGroups_v1', 'BCBot_Logs',
                 'BC_CURSE_DB_v1', 'BC_CURSE_COMMENTS_v1', 'BC_CURSE_FAV_v1'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const existing = await idbGet(key);
      if (existing === null) {
        await idbSet(key, JSON.parse(raw));
        console.info('[IDB] Migriert aus localStorage:', key);
      }
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('[IDB] Migrations-Fehler für', key, err);
    }
  }
})();