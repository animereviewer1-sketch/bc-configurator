<!-- refreshed: 2026-09-11 -->
# Codebase Concerns

**Analysis Date:** 2026-09-11

## Tech Debt

### Monolithic File Architecture — Items Tab Logic Mixed With Persistence

**Issue:** `items.js` (11,684 lines, 543KB) contains tab rendering logic, postMessage handling, data persistence, and UI event management in a single file. This makes changes risky and reasoning about dependencies difficult.

**Files:** `items.js`

**Impact:** 
- Testing any one concern requires understanding the entire file
- Changes to persistence logic risk breaking UI rendering
- Difficult to isolate and debug issues
- Cognitive load when onboarding or maintaining

**Fix approach:** 
- Extract persistence layer (IDB/localStorage operations) into `persistence.js`
- Extract postMessage protocol handling into `bridge.js`
- Extract tab rendering logic into `tabs/`
- Keep `items.js` as the coordinator

### Missing Test Coverage — No Automated Safety Net

**Issue:** No test files, no test framework configuration, no test runner. Only manual verification via `node --check` for syntax.

**Files:** Entire codebase (no test files)

**Impact:** 
- Regressions in core functionality (outfit scanning, profile management, data sync) go undetected until runtime
- Data corruption edge cases (IDB migration failures, screenshot sync) cannot be automatically verified
- Each code change requires manual testing across multiple tabs and browser contexts
- Persistence bugs may only surface after user data loss

**Fix approach:** 
- Set up Jest or Vitest for unit and integration tests
- Add tests for:
  - IDB migration logic
  - Screenshot sync and storage key matching
  - Profile CRUD operations
  - Message protocol between popup and BC
- Add e2e tests using puppeteer for cross-window postMessage flows

### Large Monolithic Bot Files

**Issue:** `bot-ui.js` (3,548 lines, 211KB) and `bot-engine.js` (3,356 lines, 164KB) mix UI rendering, state management, event handling, and command execution.

**Files:** `bot-ui.js`, `bot-engine.js`

**Impact:** 
- Difficult to locate specific functionality
- Changes to one concern (rendering) risk breaking another (state transitions)
- Complex interdependencies between event handlers
- Large switch statements (50+ cases in `bot-engine.js` line 910+) make logic flow hard to follow

**Fix approach:** 
- Separate concerns: event handlers, condition evaluation, action execution, UI rendering
- Move action execution to `bot-actions.js`, condition checking to `bot-conditions.js`
- Extract UI rendering to `bot-ui-components.js`

---

## Known Bugs

### Screenshot Storage Key Mismatch — `_syncLscgScreenshotToProfiles(mk, fp)`

**Symptoms:** 
- Screenshots stored with version-specific fingerprint keys (`mk|fp`) may not sync properly
- Function called with two parameters but only accepts one
- Images stored at `LSCG_SCREENSHOTS[mk + '|' + fp]` but read from `LSCG_SCREENSHOTS[mk]`

**Files:** `items.js` lines 2735–2738, 7551–7569

**Trigger:** 
1. Capture a screenshot of an outfit version that has a fingerprint (`fp`)
2. The image is stored under key `mk|fp` (line 2735)
3. Function is called as `_syncLscgScreenshotToProfiles(mk, fp)` (line 2738)
4. But function signature is `function _syncLscgScreenshotToProfiles(mk)` (line 7551)
5. Function reads from `LSCG_SCREENSHOTS[mk]` (line 7552) — wrong key, returns undefined

**Workaround:** 
- Refactor function to accept and use the `fp` parameter:
  ```javascript
  function _syncLscgScreenshotToProfiles(mk, fp) {
    const key = fp ? (mk + '|' + fp) : mk;
    const img = LSCG_SCREENSHOTS[key];
    // ... rest of function
  }
  ```

### Outfit Version Deletion Violates Data Preservation Rule

**Symptoms:** 
- User explicitly deletes outfit versions from LSCG database via UI
- Function `deleteLscgVersion()` calls `delete LSCG_DB[mk]` when last version is removed

**Files:** `items.js` lines 10451–10478

**Trigger:** User clicks delete button on an outfit version in the Outfit Scan tab

**Standing Rule Violation:** 
The user has stated that "stored data (scanned outfits/items) must never be deleted or overwritten." The `deleteLscgVersion(mk, vIdx)` function at line 10451 explicitly deletes data from `LSCG_DB`, violating this rule.

**Current State:** 
- Function shows confirmation dialog (line 10456)
- User explicitly approves deletion
- This is intentional user action, not accidental overwrite

**Decision Needed:** 
- Should deletion be disabled entirely? 
- Should deleted versions be marked inactive instead of removed?
- Should deletion move to an archive rather than permanent removal?

---

## Security Considerations

### Code Injection via postMessage — Origin Wildcard in Injected Code

**Risk:** 
Code injected into BC via `bcSend({type:'EXEC', code:...})` uses `postMessage(..., "*")` instead of origin-specific targets, allowing the response to be received by any window listening to the configurator's messages.

**Files:** 
- `items.js` lines 2507, 2509, 2685, 2694, 2698 (postMessage with "*")
- `loader.js` lines 32, 840 (origin check present but only on receive side)
- `bot-data.js`, `bot-engine.js`, `bot-ui.js` (bcSend calls)

**Current Mitigation:** 
- `loader.js` validates `ALLOWED_ORIGIN` on the receiving end (line 840)
- Code injection requires passing through BC's own postMessage validation
- Messages are stamped with `app:"BCKonfigurator"` for identification

**Recommendations:** 
1. Change injected code to use origin-specific targets:
   ```javascript
   // Current (unsafe):
   window.__BCK_popupRef.postMessage({...}, "*")
   
   // Better (origin-specific):
   const originUrl = new URL(window.__BCK_popupRef.location);
   window.__BCK_popupRef.postMessage({...}, originUrl.origin)
   ```
2. Add Origin header validation to bcSend calls
3. Document the security boundary: injection trust is implicit in loading BC's extension code

### EXEC Command Execution — Uses `new Function()`

**Risk:** 
`loader.js` line 1234 uses `new Function()` to execute arbitrary code strings. While origin is validated before this point, the execution is still dynamic code eval.

**Files:** `loader.js` lines 1228–1238

**Current Mitigation:** 
- Origin check at line 840 prevents unauthorized callers from reaching EXEC handler
- Code is only executed if it comes from the known POPUP_URL origin
- No eval of user input; code is generated internally by the configurator

**Recommendations:** 
- Document that EXEC is a privileged operation reserved for the same-origin configurator
- Consider limiting EXEC to a whitelist of safe operations instead of arbitrary code
- Add logging of all EXEC calls for audit purposes

---

## Performance Bottlenecks

### IDB JSON Serialization and Parsing

**Problem:** 
Large datasets (LSCG_DB with 1500 max versions per player, PROFILE_SCREENSHOTS) are serialized/deserialized on every save and load, blocking the main thread.

**Files:** `items.js` lines 23–64 (idbGet/idbSet), lines 8164–8170 (LSCG_DB), lines 561–562 (PROFILE_SCREENSHOTS)

**Cause:** 
- `JSON.parse()` and `JSON.stringify()` are synchronous
- Large outfits stored as compressed Base64 strings
- Every screenshot save triggers full database write

**Improvement path:** 
1. Implement incremental saves instead of full rewrites
2. Use IndexedDB's structured clone instead of JSON serialization where possible
3. Debounce screenshot saves (currently using `_debouncedSaveLscgScreenshots` but with 250ms delay)
4. Consider storing each screenshot separately rather than one large PROFILE_SCREENSHOTS object

### Debounce Implementation — 100+ Uses Scattered

**Problem:** 
`_debounce` function (line 90–95) is used 100+ times throughout the codebase with inconsistent delays (250ms, 1200ms, etc.), making timing behavior unpredictable.

**Files:** `items.js` lines 97–104 (debounce definitions)

**Cause:** 
- No centralized configuration of debounce delays
- Different parts of the code have different assumptions about what "responsive" means
- Race conditions possible if one debounced save is still pending when another fires

**Improvement path:** 
- Create a debounce configuration object with semantic names (e.g., DEBOUNCE.UI_RENDER, DEBOUNCE.PERSIST_HEAVY)
- Use consistent delays for the same type of operation
- Add tests to verify debounce behavior under rapid changes

---

## Fragile Areas

### Tab Logic and State Synchronization

**Files:** `items.js` lines 4195 (\_activeTab), 4222–4323 (switchTab), entire UI render functions

**Why fragile:** 
- `_activeTab` is a global variable that controls which content is rendered
- Each tab has its own render function (renderProfileList, renderOutfitScanTab, renderCurseTab, etc.)
- Tab state not explicitly validated; if a tab's data loads asynchronously and the user switches tabs before load completes, rendering may use stale data
- No error boundary: if one tab's render throws an exception, the UI can get stuck

**Safe modification:** 
1. Always validate that the current tab matches the data being rendered before paint
2. Cancel async operations when switching tabs
3. Wrap each tab's render function in try-catch with fallback UI
4. Consider using a state machine for tab transitions

**Test coverage:** 
- Manual testing of tab switching during data load
- No automated tests for race conditions (user switches tab while LSCG_DB is loading from IDB)

### Global State in items.js — 50+ Variables

**Files:** `items.js` lines 452–481, 486–562, scattered throughout

**Why fragile:** 
- Global variables (CACHE, CURRENT, OUTFIT, FAVORITES, BC_ASSET_BASE, etc.) are mutated throughout the code
- No clear owner or initialization order
- Functions assume global state exists; if loaded in wrong order, silent failures
- Example: `selectItem()` sets `CURRENT` which affects rendering, but no validation that CURRENT is valid before rendering

**Safe modification:** 
1. Require all global state to be initialized in a startup() function before any UI event handlers fire
2. Make critical globals immutable or use Object.freeze() to prevent accidental mutation
3. Encapsulate related globals into objects (e.g., `itemState = { CURRENT, CACHE, dimMode, ... }`)
4. Use accessor functions instead of direct mutation (`setCurrent()` instead of `CURRENT = {...}`)

**Test coverage:** 
- Manual verification that pages load in correct state
- No automated tests for initialization order or missing state

### Screenshot Storage — Triple Storage (IDB, localStorage, RAM)

**Files:** `items.js` lines 2736 (set), 7979 (delete), 8057–8058 (check)

**Why fragile:** 
- Screenshots stored in `LSCG_SCREENSHOTS` (RAM), `PROFILE_SCREENSHOTS` (IDB + localStorage)
- Three storage locations must stay in sync
- Deletion happens in only one location (line 7979 deletes from LSCG_SCREENSHOTS but might not clean up PROFILE_SCREENSHOTS)
- IDB failure could leave stale screenshots while RAM version is deleted

**Safe modification:** 
1. Consolidate to single storage location (IDB preferred)
2. Add explicit cleanup when deleting: delete from all three
3. Verify in tests that cleanup is comprehensive

---

## Architectural Constraints

**Threading:** 
- Single-threaded JavaScript event loop
- Large operations (JSON.parse on LSCG_DB) block UI thread momentarily

**Global state:** 
- Module-level variables scattered throughout `items.js`, `bot-engine.js`, `bot-ui.js`
- No clear initialization order documented
- Example globals with side effects: `LSCG_DB`, `PROFILE_SCREENSHOTS`, `CURRENT`, `OUTFIT`, `_activeTab`

**Circular message flow:** 
- Configurator popup → BC via postMessage(EXEC) → BC code executes → BC → Configurator via postMessage(SCREENSHOT_DATA, etc.)
- Order of message handlers matters; if one handler is missing, the chain breaks silently

**Data persistence:** 
- IDB (primary) with localStorage fallback
- Migration runs once at startup (lines 68–87) — if it fails silently, data loss possible
- No atomic guarantees across multiple storage operations

---

## Anti-Patterns

### Pattern: Callback Chain Without Error Propagation

**What happens:** 
Async operations are chained via `.then()` without catching errors. If an IDB operation fails, the error is silently logged to console but never surfaces to the UI.

Example: `items.js` line 494:
```javascript
idbGet('BC_PROFILES_v12').then(d => { 
  if (d && typeof d === 'object') Object.assign(PROFILES, d); 
});
```

**Why it's wrong:** 
- If IDB is full or corrupted, profiles don't load, but the user sees no error message
- Silent failures make debugging difficult
- User may lose work without knowing why

**Do this instead:** 
```javascript
idbGet('BC_PROFILES_v12')
  .then(d => { 
    if (d && typeof d === 'object') Object.assign(PROFILES, d); 
    return true;
  })
  .catch(e => {
    console.error('Failed to load profiles:', e);
    showStatus('⚠️ Profile data could not be loaded from storage', 'error');
    return false;
  });
```

See `items.js` lines 488–495 for context.

### Pattern: Defensive Coding Without Validation

**What happens:** 
Functions check `if (CURRENT?.cfg)` but never validate that CURRENT has a valid structure. If corrupted data is loaded, subsequent operations fail in cryptic ways.

Example: `items.js` lines 765–789:
```javascript
const { cfg } = CURRENT;  // If CURRENT is null or incomplete, destructuring silently fails
const dimCount = cfg.dimCount || 0;
```

**Why it's wrong:** 
- Errors surface deep in the call stack, not at the point of corruption
- Hard to distinguish between "feature not configured" and "data corruption"

**Do this instead:** 
```javascript
function getCurrent() {
  if (!CURRENT || !CURRENT.cfg || !CURRENT.group || !CURRENT.asset) {
    throw new Error('CURRENT state incomplete; selectItem() must be called first');
  }
  return CURRENT;
}

// Then use:
const { cfg } = getCurrent(); // Fails immediately with clear message
```

See `items.js` lines 738–765 for context (selectItem sets CURRENT).

### Pattern: postMessage Without Correlation ID Cleanup

**What happens:** 
Each screenshot request gets a unique `reqId`, but if the user navigates away before the response arrives, the handler (`_screenshotDataReceived`) remains registered indefinitely, consuming memory.

Example: `items.js` lines 2452–2515:
```javascript
const reqId = 'os_' + Date.now() + '_' + mk;
bcSend({ type: 'EXEC', code }, true);
// Handler waits for response with this reqId, but never cleans up if response doesn't arrive
```

**Why it's wrong:** 
- Long-running configurator session accumulates orphaned request handlers
- Memory leak; repeated screenshot requests create handlers that never fire
- Hard to debug: no visible error, just increasing memory usage

**Do this instead:** 
```javascript
const reqId = 'os_' + Date.now() + '_' + mk;
const timeout = setTimeout(() => {
  showStatus('📸 Screenshot request timed out', 'error');
  delete _pendingOsCapture[reqId];
}, 30000); // 30 second timeout

// In handler:
clearTimeout(timeout);
delete _pendingOsCapture[reqId];
```

See `items.js` lines 7420–7430 for context (handling SCREENSHOT_DATA).

---

## Test Coverage Gaps

### Scanned Outfit Persistence — Unvalidated After Migration

**What's not tested:** 
- IDB migration from localStorage (lines 68–87) for scanned outfits
- Screenshots sync between LSCG_SCREENSHOTS and PROFILE_SCREENSHOTS
- Outfit loading after browser cache clear

**Files:** `items.js` lines 8163–8500 (LSCG_DB loading and sync)

**Risk:** 
- Outfit data lost silently if IDB write fails during migration
- Screenshots deleted but profile still references missing image

**Priority:** High

### Profile Management — Concurrent Access Not Tested

**What's not tested:** 
- Two tabs open, one modifies profile, other loads profile at same time
- Profile rename while screenshot save is in flight
- IDB quota exceeded during large profile save

**Files:** `items.js` lines 1990–2082 (profile operations)

**Risk:** 
- Race condition: profile deleted but screenshot still referenced
- Data corruption: two saves interleave, second write overwrites incomplete first write

**Priority:** High

### Bot Command Execution — Message Order Not Enforced

**What's not tested:** 
- Commands sent in rapid succession (e.g., via bot schedule)
- BC is unresponsive or slow; configurator sends EXEC while previous one still running
- postMessage handler fires out of order

**Files:** `bot-engine.js` (action execution), `items.js` (bcSend protocol)

**Risk:** 
- Race condition: action A starts, action B starts before A completes, B fails because A didn't finish setup
- Silent failure: message dropped if BC is in wrong state

**Priority:** Medium

### Curse Database Sync — Fresh Data Overwrite

**What's not tested:** 
- CURSE_DB populated from BC, then configurator makes local changes, BC sends fresh data
- Does fresh data overwrite local changes or merge?

**Files:** `items.js` lines 5735–5751 (CURSE_LSCG and CURSE_CACHE_LSCG reset)

**Risk:** 
- User's local curse configuration overwritten without warning

**Priority:** Medium

---

## Scaling Limits

### LSCG_DB Maximum Versions Per Player

**Current capacity:** 1500 versions per player (line 8162)

**Limit:** Browser IndexedDB quota (typically 50MB per origin)

**Scaling path:** 
- If users scan same outfit repeatedly, versions accumulate
- 1500 limit may be insufficient for long-term use
- Need compression or archival strategy (move old versions to localStorage, retain only recent)

### postMessage Round-Trip Latency

**Current bottleneck:** 
- Each screenshot request requires:
  1. Configurator → BC (EXEC)
  2. BC captures and encodes image
  3. BC → Configurator (SCREENSHOT_DATA)
- Multiple screenshots queued serially (line 2745: `_runNextOsCapture()`)

**Scaling path:** 
- Batch multiple screenshot requests in single EXEC
- Use Web Workers to offload image processing from main thread
- Implement request timeout and cancellation (currently missing)

---

## Concerns Needing User Clarification

### Data Preservation Rule and Deletion Functions

**Issue:** User rule states "stored data must never be deleted or overwritten," but the UI provides `deleteProfile()` and `deleteLscgVersion()` functions that do exactly that.

**Functions affected:**
- `deleteProfile()` at `items.js` line 2075 — deletes entire profile
- `deleteLscgVersion()` at `items.js` line 10451 — deletes one outfit version
- `clearAllProfileScreenshots()` at `items.js` line 10480 — clears all screenshots

**Clarification needed:**
1. Are these deletions user-initiated (explicit delete button) vs. automatic cleanup? User action is different from code deleting without consent.
2. Should deletion be disabled in the UI, or is the rule "don't let data expire/get overwritten automatically"?
3. Should deleted data move to an "archive" or "trash" instead of permanent removal?

---

## Summary of Urgent Fixes

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Screenshot key mismatch (_syncLscgScreenshotToProfiles) | Image sync broken | 1 hour | **Critical** |
| No test coverage | Undetected regressions | 20 hours | **Critical** |
| postMessage origin wildcard | Security weakening | 2 hours | **High** |
| Monolithic items.js | Maintenance burden | 40 hours | **High** |
| Data deletion vs. preservation rule | Unclear intended behavior | 1 hour | **High** |
| IDB migration error handling | Silent data loss | 4 hours | **Medium** |

---

*Concerns audit: 2026-09-11*
