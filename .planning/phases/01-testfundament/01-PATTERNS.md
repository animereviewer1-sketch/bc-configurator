# Phase 1: Testfundament - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 10 (7 new tooling/test files, 1 modified production file, 3 production files loaded read-only by tests)
**Analogs found:** 0 exact / 10 (greenfield: no `package.json`, no `.gitignore`, no `tests/` dir exist yet — this is expected for TEST-01/TEST-02)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | batch (tooling install) | none | greenfield |
| `.gitignore` | config | — | none | greenfield |
| `vitest.config.js` | config | — | none | greenfield |
| `tests/setup/fake-indexeddb.js` | config/utility | event-driven (setupFiles hook) | none | greenfield |
| `tests/helpers/loadScript.js` | utility | file-I/O + transform (vm sandbox loader) | `items.js` (production code it loads) | role-match (loader must model the file it wraps) |
| `tests/idb-canary.test.js` | test | CRUD (indexedDB presence check) | `items.js:23-65` (`idbGet`/`idbSet`) | role-match |
| `tests/idb-helpers.test.js` | test | CRUD | `items.js:23-65` (`idbGet`/`idbSet`) | role-match |
| `tests/bot-data-validators.test.js` | test | transform/event-driven (guard clauses) | `bot-data.js:18-106` (`_normLogik`, `_migriereLogik`, `_botVarApply`, `_playerKeyApply`) | role-match |
| `tests/outfit-import-parser.test.js` | test | transform (parser) | `outfit-import.js:346-380` (`_oiDetectType`, `_oiBuildExecCode`) | role-match |
| `tests/bot-engine-escaping.test.js` | test | transform (code generation) | `bot-engine.js:29-50` (`_buildBotCode`) | role-match |
| `bot-engine.js` (modify, ~line 49) | utility (escaping helper inside code generator) | transform | itself (minimal fix, not a new file) | n/a — in-place fix |

No exact analog exists anywhere in the repo for "test file" or "npm tooling config" because the project has never had a test suite (verified: `git ls-files -- tests package.json vitest.config.js .gitignore` returns nothing tracked). All test/tooling files must be built fresh from RESEARCH.md's Code Examples section, using the **production files they wrap** as the source of truth for what stubs/sandbox shape is required.

## Pattern Assignments

### `tests/helpers/loadScript.js` (utility, file-I/O + transform)

**Analog:** `items.js` (top of file, defines the globals every other file depends on) — read to determine sandbox stub shape, not to copy a loader pattern (none exists).

**What the sandbox must expose** (verified against `items.js:1-65`):
```javascript
// items.js:9 — indexedDB used directly, unguarded
const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
// items.js:23-31 — idbGet swallows all errors, returns null on failure
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
```
```javascript
// items.js:4178-4188 — unguarded top-level localStorage.getItem, must not throw
(function() {
  const s = localStorage.getItem('BC_CACHE_v12');
  if (s) { try { const data = JSON.parse(s); /* ... */ } catch {} }
})();
```
**Required sandbox globals (derived, not copied from an existing loader):** `console`, `setTimeout`, `clearTimeout`, `localStorage` (object with working `getItem`/`setItem`/`removeItem`), `document.getElementById` (no-op returning `null`), `document.addEventListener` (no-op), a bare `addEventListener` on the sandbox root itself (not just `sandbox.window.addEventListener` — see bot-data.js pitfall below), `indexedDB: globalThis.indexedDB` (from `fake-indexeddb/auto`), `sandbox.window = sandbox` self-reference. Use RESEARCH.md's Pattern 1 code block verbatim as the implementation (already vetted against these production constraints).

**Load order requirement (verified):** `items.js` must run in the sandbox before `bot-data.js`, because `bot-data.js` calls `idbGet`/`idbSet`/`idbSet` directly without a `typeof` guard:
```javascript
// bot-data.js:79-80
function _saveBots()      { idbSet(BOT_KEY,      _bots); _autoSync(); }
function _saveBotGroups() { idbSet(BOT_GROUP_KEY, _botGroups); }
```
and at module scope:
```javascript
// bot-data.js:90
idbGet(BOT_VARS_KEY).then(d => { if (d && typeof d === 'object' && !Array.isArray(d)) _botVars = d; });
```
This runs at load time — if `idbGet` is undefined, loading `bot-data.js` throws immediately.

---

### `tests/idb-canary.test.js` and `tests/idb-helpers.test.js` (test, CRUD)

**Analog:** `items.js:9-65` (`_idbOpen`, `idbGet`, `idbSet`)

**Core pattern to test against** (imports/error-handling in the production code, verbatim):
```javascript
// items.js:34-59 — idbSet: never throws, returns boolean; reports quota errors via showStatus
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
    if (Date.now() - _idbFehlerGemeldet > 10000 && typeof showStatus === 'function') {
      _idbFehlerGemeldet = Date.now();
      showStatus(voll ? '...' : '...', 'error');
    }
    return false;
  }
}
```
**Implication for tests:** because both functions swallow all errors and return `null`/`false` rather than throwing, the canary test (RESEARCH.md Pattern 2) that checks `globalThis.indexedDB` is defined **before** any functional round-trip test is mandatory — a missing `fake-indexeddb` produces a generic assertion failure otherwise, not a clear one. Use RESEARCH.md's Pattern 2 code block as-is.

---

### `tests/bot-data-validators.test.js` (test, transform/event-driven)

**Analog:** `bot-data.js:18-106`

**Guard-clause pattern to test** (verbatim, these are the "validators" — see RESEARCH.md Pitfall 6 / Assumptions A2):
```javascript
// bot-data.js:18-20
function _normLogik(arr) {
  if (Array.isArray(arr) && arr[0]) arr[0].logik = 'und';
  return arr;
}
```
```javascript
// bot-data.js:85-90
function _botVarApply(memberNum, name, value){
  if(memberNum==null || !name) return;
  const k = String(memberNum);
  (_botVars[k] = _botVars[k] || {})[name] = value;
  _saveBotVars();
}
```
```javascript
// bot-data.js:97-105
function _playerKeyApply(memberNum, name, key, has){
  if(memberNum==null) return;
  const k = String(memberNum);
  const rec = (_playerKeys[k] = _playerKeys[k] || { name:'', bronze:false, silver:false, gold:false });
  if(name) rec.name = name;
  if(['bronze','silver','gold'].includes(key)) rec[key] = !!has;
  _savePlayerKeys();
  if (document.getElementById('tab-spieler')?.classList.contains('active') && typeof renderSpielerTab==='function') renderSpielerTab();
}
```
**Note:** `_playerKeyApply` calls `document.getElementById(...)?.classList.contains(...)` — the sandbox's `document.getElementById` stub returning `null` is sufficient (optional chaining short-circuits safely). `_migriereLogik` (bot-data.js:27-39) iterates `_bots` and calls `_saveBots()` — tests should seed `ctx._bots` before calling it.

---

### `tests/outfit-import-parser.test.js` (test, transform)

**Analog:** `outfit-import.js:346-380`

**Core parser pattern** (verbatim, pure function, ideal test target):
```javascript
// outfit-import.js:346-353
function _oiDetectType(code) {
  if (/^[A-Za-z0-9+/=]{20,}$/.test(code.trim())) return 'lzbase64';
  if (/^[A-Za-z0-9\-_.~]{20,}$/.test(code.trim())) return 'lzuri';
  return 'js';
}
```
```javascript
// outfit-import.js:355-361 — _oiBuildExecCode entry point, branches on LZString availability
function _oiBuildExecCode(code) {
  const trimmed = code.trim();
  const type = _oiDetectType(trimmed);
  if ((type === 'lzbase64' || type === 'lzuri') && typeof LZString !== 'undefined') {
    let dec = null;
    try { dec = LZString.decompressFromBase64(trimmed); } catch(e) {}
    if (!dec) { try { dec = LZString.decompressFromEncodedURIComponent(trimmed); } catch(e) {} }
    // ...
  }
}
```
**Test data requirement:** use real `lz-string` npm package (devDependency, same version 1.5.0 as production CDN copy) to generate `lzbase64`/`lzuri` fixtures — do not hand-roll fake compressed strings (see RESEARCH.md Don't Hand-Roll table).

---

### `tests/bot-engine-escaping.test.js` (test, transform) + `bot-engine.js` (modify)

**Analog:** `bot-engine.js:29-50` (`_buildBotCode`)

**Core pattern — current (buggy) escaping** (verbatim, line ~49):
```javascript
// bot-engine.js:49
const safeName = bot.name.replace(/\\/g,'\\\\').replace(/`/g,'\\`');
```
**Where it's embedded** (single-quoted string context — confirms the bug):
```javascript
// bot-engine.js:52 (excerpt) — safeName interpolated into JSON.stringify'd object via template literal,
// but downstream usages at lines 802, 1826, 2923, 3213, 3241, 3244 embed it into single-quoted
// strings inside the generated code, e.g. botName:'${safeName}'
```
**Required minimal fix (per RESEARCH.md Pitfall 5 / Assumption A1, recommended Option b):**
```javascript
// Proposed replacement for bot-engine.js:49
const safeName = bot.name.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/'/g,"\\'");
```
**Sandbox requirement for this test file** (verified, `bot-engine.js:52` references three unguarded globals):
```javascript
// bot-engine.js:52 (excerpt) — _money, _rankData, _shop used with optional chaining only,
// NOT typeof-guarded like _botVars/_playerKeys/_itemDefs/_inventar elsewhere in the same line:
// moneyQueryCmd:_money?.settings?.queryCmd??''  ... rankDefs:_rankData?.defs??[] ... shopCmd:_shop?.settings?.cmd??'!pay'
```
Sandbox for this test must declare `_money`, `_rankData`, `_shop` (even as `undefined`) as properties on the sandbox object, or `_buildBotCode()` throws `ReferenceError`. This is a narrower sandbox than `loadScript.js`'s full `items.js`+`bot-data.js` chain — `bot-engine.js` does not need `items.js` loaded first.

**Adversarial fixture set (from RESEARCH.md Pattern 3, use verbatim):**
```javascript
const ADVERSARIAL_NAMES = [
  'NormalName', 'Back`tick', 'Dollar${brace}',
  "O'Brien", 'Quote"Double', 'Combo `${x}` and \'quote\'',
];
```
Verified result before fix: `"O'Brien"` throws `SyntaxError: missing ) after argument list` when passed through `new Function(code)`. After the proposed fix, all six fixtures must parse cleanly.

---

## Shared Patterns

### vm-Sandbox base shape (applies to all test files that load production `<script>` files)
**Source:** derived from `items.js:1-65`, `bot-data.js:1-106` (no existing analog — greenfield)
```javascript
function makeBaseSandbox(extra = {}) {
  const sandbox = {
    console, setTimeout, clearTimeout,
    localStorage: {
      _store: new Map(),
      getItem(k) { return this._store.has(k) ? this._store.get(k) : null; },
      setItem(k, v) { this._store.set(k, String(v)); },
      removeItem(k) { this._store.delete(k); },
    },
    document: { getElementById: () => null, addEventListener: () => {} },
    addEventListener: () => {}, // bare global, required by bot-data.js:149's unqualified call
    indexedDB: globalThis.indexedDB, // from fake-indexeddb/auto
    ...extra,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}
```
**Apply to:** `tests/helpers/loadScript.js`, and transitively every `*.test.js` that loads `items.js`/`bot-data.js`.

### Error-swallowing IDB helpers require a canary
**Source:** `items.js:23-31, 34-59`
**Apply to:** `tests/idb-canary.test.js` (must run first / independently), `tests/idb-helpers.test.js`.

### Unguarded globals in code generators
**Source:** `bot-engine.js:52` (`_money`, `_rankData`, `_shop`)
**Apply to:** `tests/bot-engine-escaping.test.js` sandbox setup — declare these three explicitly.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `package.json` | config | batch | No package.json exists in repo (verified: `git ls-files -- package.json` empty) — use RESEARCH.md's Standard Stack minimal template verbatim |
| `.gitignore` | config | — | No .gitignore exists (verified) — use RESEARCH.md's two-line template (`node_modules/`, `coverage/`) |
| `vitest.config.js` | config | — | No test config exists — use RESEARCH.md Wave 0 Gaps spec (`setupFiles`, `environment: 'node'`) |
| `tests/setup/fake-indexeddb.js` | config | event-driven | No setup file exists — single line: `import 'fake-indexeddb/auto';` |

## Metadata

**Analog search scope:** repo root (`items.js`, `bot-data.js`, `bot-engine.js`, `outfit-import.js`, `money.js`, `rank.js`, `shop.js`, `inventar.js`, `bot-ui.js`, `index.html`); no `tests/`, `package.json`, `.gitignore`, or `vitest.config.js` present anywhere in git history search
**Files scanned:** items.js (lines 1-65, 4170-4195), bot-engine.js (lines 1-60), bot-data.js (lines 1-110), outfit-import.js (lines 340-380)
**Tracked-source verification:** `git ls-files -- items.js bot-data.js bot-engine.js outfit-import.js` all returned tracked (non-empty) — no gitignored mirrors involved
**Pattern extraction date:** 2026-09-12
