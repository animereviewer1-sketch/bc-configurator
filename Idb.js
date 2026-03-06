// ══════════════════════════════════════════════════════
//  IndexedDB Helper – BCKonfigurator
//  Replaces localStorage for money / rank / shop data.
//  API:
//    idbGet(key)        → Promise<value | null>
//    idbSet(key, value) → Promise<void>  (fire-and-forget safe)
// ══════════════════════════════════════════════════════
const _IDB = (() => {
  const DB_NAME    = 'BCKonfigurator';
  const DB_VERSION = 1;
  const STORE      = 'kv';

  let _db = null;

  function _open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function idbGet(key) {
    try {
      const db = await _open();
      return await new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
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
      const db = await _open();
      await new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror   = e => reject(e.target.error);
      });
    } catch (err) {
      console.warn('[IDB] set error:', err);
    }
  }

  // One-time migration: pull existing localStorage data into IDB, then remove it.
  async function migrateFromLocalStorage(keys) {
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const existing = await idbGet(key);
        if (existing === null) {
          // Nothing in IDB yet → migrate
          await idbSet(key, JSON.parse(raw));
          console.info('[IDB] Migrated from localStorage:', key);
        }
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('[IDB] Migration error for', key, err);
      }
    }
  }

  // Run migration immediately for all module keys
  migrateFromLocalStorage(['BC_Money_v1', 'BC_Rank_v1', 'BC_Shop_v1', 'BC_Bots_v2', 'BC_BotGroups_v1', 'BCBot_Logs']);

  return { idbGet, idbSet };
})();

const idbGet = _IDB.idbGet;
const idbSet = _IDB.idbSet;