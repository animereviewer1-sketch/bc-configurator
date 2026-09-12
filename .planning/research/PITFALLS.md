# Pitfalls Research

**Domain:** Vanilla-JS browser companion tool with cross-window postMessage bridge + IndexedDB persistence (BC Universal Configurator)
**Researched:** 2026-09-12
**Confidence:** MEDIUM (general patterns cross-checked across multiple independent sources; project-specific pitfalls verified directly against `.planning/codebase/CONCERNS.md` and `ARCHITECTURE.md`, which is HIGH confidence — those are first-party codebase findings, not web research)

This file maps pitfalls to the milestone's three phases as named in PROJECT.md: **Stabilisierung** (stabilization — fix bugs, add tests, harden postMessage), **Entflechtung** (extraction — split `items.js`/`bot-ui.js`/`bot-engine.js` into modules), **Gamecode-Scan** (scan — runtime enumeration of game/mod globals).

---

## Critical Pitfalls

### Pitfall 1: Module extraction reorders script execution and breaks implicit-global dependencies

**What goes wrong:**
`index.html` currently loads scripts via `document.write()` in a fixed sequence (bc-icons → items.js → money/rank/shop/inventar/bot-* → outfit-import → bc-autobackup). Every feature module assumes `items.js` globals (`idbGet`, `idbSet`, `showStatus`, `CACHE`, `_debounce`, TAB_GROUPS, etc.) already exist on `window` at parse/execute time. The moment persistence or bridge logic is pulled out of `items.js` into `persistence.js` / `bridge.js`, the new file's `<script>` tag must be inserted **before** every module that references it — but nothing in the codebase enforces or documents that ordering. It is trivial to insert the new script after a module that already calls `idbGet()` at top-level or in a DOMContentLoaded handler that fires before the new script parses.

**Why it happens:**
Without a bundler there is no dependency graph — only physical `<script>` order in `index.html`. Vanilla global-scope scripts silently tolerate reordering until the exact moment a forward reference is hit, which may only occur on a specific tab or a cold cache (e.g., first load with empty IDB triggers a code path a warm reload doesn't).

**How to avoid:**
- Extraction must preserve a documented dependency order: write it down as a comment block at the top of `index.html` (`<!-- LOAD ORDER: persistence.js -> bridge.js -> items.js -> feature modules -->`).
- Each extracted module should defensively check for its dependencies at the top (`if (typeof idbGet !== 'function') throw new Error('persistence.js must load before bridge.js')`) so a misordering fails loudly at load time instead of silently later.
- Do the extraction in the smallest possible slices (one module at a time), reload the tool after each slice, and exercise every tab — not just the one you touched.

**Warning signs:**
- `ReferenceError: X is not defined` in console on page load (easy to catch) — but also watch for *silent* failures where a function exists as `undefined` because it was overwritten by a later re-declaration with `var` (no error, just wrong behavior).
- A feature works on warm reload (cached, already-initialized globals) but breaks on hard refresh / incognito — classic sign of load-order-dependent state.

**Phase to address:** Entflechtung (module split) — but the guard checks and load-order documentation should be added as part of Stabilisierung *before* extraction begins, since they're cheap and immediately reduce risk once files start moving.

---

### Pitfall 2: `var`/implicit-global re-declaration silently shadows state instead of erroring

**What goes wrong:**
Classic (non-module) scripts sharing one global `window` scope allow the same identifier to be declared with `var` in two files without any error — the second declaration silently wins (or, if it runs first, is silently overwritten). During extraction it's easy to accidentally leave a duplicate helper (e.g., a second `_debounce`, a second `showStatus`) in both the old file and the new module during a transitional period. Both parse fine; only one wins, and which one wins depends on script order, not on which one is "correct."

**Why it happens:**
No bundler/module system means no "duplicate export" or "already declared" error the way ESM or CommonJS would give you. Copy-paste extraction (duplicating a function into a new file "to be safe" before deleting the original) is exactly the workflow most likely to trigger this.

**How to avoid:**
- After moving a function to a new module, **delete** it from the source file in the same commit — don't leave a "just in case" copy.
- Add `'use strict'` at the top of new extracted modules; this at least turns *implicit* undeclared-variable globals (typo assignments like `CAHCE = {}`) into errors, though it won't catch two intentional `var` declarations of the same name.
- Since Vitest will run over the extracted logic files as plain Node modules (per PROJECT.md decision), a simple grep-based check ("does this identifier appear as a top-level declaration in more than one file loaded into the same page?") run in CI/pre-commit catches this class of bug before it reaches the browser.

**Warning signs:** A function behaves as if an old bugfix "reverted itself" after a refactor — usually means the old, unfixed copy is the one that's still winning the load-order race.

**Phase to address:** Entflechtung. Add the duplicate-declaration lint check as an early Entflechtung task, before the bulk of file-splitting work starts.

---

### Pitfall 3: Adding tests to code with 50+ mutable globals gives false confidence

**What goes wrong:**
`items.js` has 50+ module-level globals (`CACHE`, `CURRENT`, `OUTFIT`, `LSCG_DB`, `PROFILE_SCREENSHOTS`, `_activeTab`, …) mutated throughout the file (see CONCERNS.md "Global State in items.js"). The natural first move when "finally adding tests" is to `require()`/`vm`-load the file and write unit tests against exported functions. But because state is shared and mutated across the whole file, tests that pass in isolation can pass *only* because of leftover state from a previous test in the same run (or fail only because of it) — order-dependent tests that look green but don't actually verify the function in question.

**Why it happens:**
There is no `beforeEach` reset path today because there is no `reset()`/`init()` function that fully re-establishes clean global state — state was only ever initialized once, at page load, by scattered assignments.

**How to avoid:**
- Before writing tests for a global-state-heavy function, first extract or add a `resetState()` (or per-module `resetX()`) function that zeroes every relevant global back to its initial value, and call it in `beforeEach`.
- Prefer testing the pieces PROJECT.md explicitly scopes for Vitest — IDB helpers, bot validators in `bot-data.js`, the outfit-import parser — since these are comparatively pure (input → output) and don't depend on `_activeTab`/`CURRENT` UI state. Save the tab-rendering/global-state-soup functions for after Entflechtung, when they have real module boundaries.
- Run Vitest with `--no-file-parallelism` (or single-threaded) initially if globals are shared via `require` cache across test files, to avoid cross-file leakage masking bugs.

**Warning signs:** Tests pass individually (`vitest run foo.test.js`) but fail when run as part of the full suite, or vice versa — the single clearest signal of shared-mutable-state test pollution.

**Phase to address:** Stabilisierung. Scope the first Vitest suite strictly to the pure/stateless pieces named in PROJECT.md; explicitly defer testing `_activeTab`/`CURRENT`-dependent rendering code until Entflechtung produces real modules with an `init()`/`reset()` seam.

---

### Pitfall 4: fake-indexeddb + happy-dom silently no-ops instead of failing when misconfigured

**What goes wrong:**
`happy-dom` (a common fast alternative to `jsdom` for Vitest) does **not** implement `indexedDB` itself — it must be polyfilled via `fake-indexeddb`. If the polyfill is wired up incorrectly (e.g., imported after the module under test already captured a reference to `window.indexedDB`, or only imported in one test file's setup and not globally in `vitest.config.ts`), `indexedDB` inside the test can be `undefined` and code that does `if (!window.indexedDB) fallbackToLocalStorage()` (the project's existing IDB→localStorage fallback pattern) will silently take the fallback path in every test — meaning the "IDB tests" are actually testing the localStorage fallback and never touch real IDB semantics (quota errors, versionchange, transactions) at all.

**Why it happens:**
The fallback-on-missing-IndexedDB pattern that makes the app robust in production (CONCERNS.md: "IDB (primary) with localStorage fallback") is exactly what makes broken test setup invisible — there's no crash, just quietly wrong coverage.

**How to avoid:**
- Import `fake-indexeddb/auto` (the side-effecting global-polyfill entry point) in Vitest's global `setupFiles`, not per-test, so `indexedDB`/`IDBKeyRange` exist on `globalThis` before any module under test loads.
- Assert `expect(globalThis.indexedDB).toBeDefined()` at the top of the IDB test suite as a canary — if this ever fails, every "IDB" test downstream is silently exercising the localStorage fallback instead.
- Pin `fake-indexeddb` and check its changelog on upgrade: v5+ dropped the bundled `structuredClone` polyfill, which matters for older Node/jsdom combinations and can turn cloning of complex outfit objects (nested arrays, Base64 blobs) into a runtime error that wasn't there before.
- Since `happy-dom` lacks parts of the full DOM/`structuredClone` surface that `jsdom` has, if any IDB test relies on structured-clone semantics for non-JSON-safe values (Dates, Maps, ArrayBuffers used for screenshot binary data), prefer `jsdom` for that specific suite or verify `structuredClone` is polyfilled — don't assume the two environments are interchangeable.

**Warning signs:** IDB tests pass with 100% "coverage" of `idbGet`/`idbSet` but never fail even when you deliberately introduce a wrong key or version bump — a strong sign they're not touching real IndexedDB transaction/versioning behavior at all.

**Phase to address:** Stabilisierung, specifically the Vitest suite setup task — add the canary assertion in the same commit that wires up `fake-indexeddb`.

---

### Pitfall 5: Testing the bot code-generator by only checking "no exception thrown," not the generated code's behavior

**What goes wrong:**
`bot-engine.js`'s `_buildBotCode(bot)` produces a template-literal string of injectable game code with a Base64-encoded config blob (`btoa(JSON.stringify(...))`) spliced in via `${cfgJson}`. The natural first test is a snapshot test of the generated string. Two failure modes are common here: (1) snapshots capture the Base64 blob itself, which changes on every key-order or timestamp change in the input object, making the snapshot brittle and getting rubber-stamp-updated without real review; (2) a snapshot proves the *string* didn't change, but never proves the generated code is syntactically valid JS or that it does the right thing when actually run in a game-like context — a bug in the template literal's escaping (e.g., an unescaped backtick or `${` in a player/curse name) can produce broken code that a plain string-diff snapshot won't flag as broken, only as "different."

**Why it happens:**
Template-literal code generation naturally invites snapshot testing because "the output is a string," but the thing that actually matters (does the generated code parse and run correctly) requires an extra step nobody adds by default.

**How to avoid:**
- Decode the Base64 config blob out of the snapshot before comparing (snapshot the decoded JSON config plus the *shape* of the surrounding template, not the opaque encoded blob) so snapshots are reviewable and only change when they should.
- After generating code in a test, run it through `new Function(code)` (constructor only, don't execute) purely to assert it **parses** as valid JavaScript — this catches escaping bugs from special characters in user-controlled strings (item names, curse notes, player names with backticks or `${`) that a snapshot diff alone would miss.
- Specifically test the escaping path with adversarial input fixtures: names containing backticks, `${...}`, quotes, and Unicode — since these are exactly the values (player names, curse notes) that come from the game and are outside the tool's control.

**Warning signs:** Bot code injection intermittently fails "for some players" — the classic symptom of template-literal injection breaking only on inputs containing the delimiter characters your fixtures never included.

**Phase to address:** Stabilisierung (bot-data.js validators get covered per PROJECT.md); extend to `_buildBotCode` parse-validity + adversarial-input tests either at the end of Stabilisierung or as an explicit Entflechtung task when `bot-engine.js` is split, since code-gen is one of the riskiest pieces to move.

---

### Pitfall 6: Fixing `postMessage(..., "*")` only on one side of the bridge leaves the other side exploitable

**What goes wrong:**
CONCERNS.md documents that the *tool's* outgoing `postMessage` calls use `"*"` as target origin in several places (items.js lines 2507, 2509, 2685, 2694, 2698) while `loader.js` validates `ALLOWED_ORIGIN` only on the *receiving* end. It's tempting to treat this as "one bug, one fix" — replace `"*"` with the popup's known origin — but there are actually two independent trust boundaries that both need hardening: (a) the tool → loader direction (EXEC commands, data requests) and (b) the loader → tool direction (SCREENSHOT_DATA, CACHE_DATA, scan results). Hardening only the direction that was flagged as a security issue while leaving the other with a wildcard target still lets any third window with a reference to either endpoint intercept or spoof messages in the untouched direction.

**Why it happens:**
Security findings tend to get read as "line N has a wildcard, fix line N," rather than "audit both legs of every bridge message type." The bridge has multiple message types (GET_CACHE/CACHE_DATA, EXEC, OUTFIT_SCAN_DATA, LOCKS_DATA, SCREENSHOT_DATA, PING/PONG) each with its own send call, and it's easy to fix the ones a grep for `"*"` finds while missing a `postMessage(msg, someVar)` where `someVar` itself was computed loosely (e.g., defaults to `"*"` when the origin lookup fails).

**How to avoid:**
- Grep for *every* `postMessage(` call in `items.js`, `loader.js`, and the code strings generated by `bot-engine.js` (the injected code itself calls `postMessage` from inside the game tab) — not just the ones already flagged. The bot-engine-generated code is easy to miss because it's a string inside `bot-engine.js`, not a literal `postMessage(...)` call that a simple grep across `.js` files would find as a direct call.
- Establish the target origin as a single named constant per direction (`TOOL_ORIGIN`, `ALLOWED_ORIGIN`) computed once at bridge-init time from `window.location.origin` / the known GitHub Pages origin, and require every `postMessage` call site to use it — never inline a fresh origin computation per call site (that's where a silent `"*"` fallback creeps back in).
- On the receiving side, additionally validate `event.source` (must equal the expected `window.opener` or the specific popup reference), not just `event.origin` — origin alone doesn't confirm which window sent the message if multiple windows could share an origin (e.g., the user opens two configurator tabs against the same game tab).
- Add the "EXEC calls are logged" item from PROJECT.md's Active list as a lightweight intrusion-detection measure: log `{type, origin, timestamp}` for every EXEC receipt so an origin-check bypass would leave a visible trail even if the check itself had a bug.

**Warning signs:** A postMessage handler fires but the response processed appears to be for a different/stale request (see Pitfall 9 on correlation-ID leaks) — can indicate cross-window message bleed-through from a loosely targeted origin.

**Phase to address:** Stabilisierung — this is explicitly one of the Active stabilization items in PROJECT.md; the addition here is to insist on an *exhaustive* audit (both directions, including bot-engine-generated code) rather than patching only the lines CONCERNS.md already named.

---

### Pitfall 7: `window.opener` becomes `null` after game-tab navigation, silently breaking the bridge until reload

**What goes wrong:**
The bridge relies on `window.opener` (from the tool's perspective) or a captured popup reference (`window.__BCK_popupRef`, from the game tab's perspective) to know who to `postMessage` back to. Browsers null out `window.opener` in several situations: when `rel="noopener"` is present on the link/bookmarklet-created anchor, when Chrome's "Strict-Origin-Isolation"/COOP headers apply, or simply when the game tab navigates to a new BC room URL or reconnects after a disconnect (some SPA-style navigations replace the `window` object's opener linkage in ways that vary by browser). If `window.opener` is `null` when a message needs to be sent back, `opener.postMessage(...)` throws (`Cannot read properties of null`), and depending on where that throw happens (inside an async callback with no surrounding try/catch — see CONCERNS.md's "Callback Chain Without Error Propagation" anti-pattern), the failure can be entirely silent to the user: the bridge just stops responding and nothing in the UI indicates why.

**Why it happens:**
BC itself, as a long-running single-page app, doesn't do full-page navigations often, but reconnects, tab-visibility changes, or the user manually reloading the game tab (common when BC has connection issues) all reset or null the opener reference. The loader script re-injects on reload, but nothing currently re-establishes which popup it belongs to unless the handshake is explicit.

**How to avoid:**
- Never assume `window.opener`/`__BCK_popupRef` is still valid — wrap every use in a null check that surfaces a visible status message ("Bridge disconnected — reopen from bookmarklet") rather than throwing into a swallowed promise rejection.
- Implement (or verify) a PING/PONG heartbeat (CONCERNS.md mentions one exists around items.js line ~5944) that actively detects opener loss within a bounded time (e.g., a few seconds) and flips the UI into a visible "disconnected" state, rather than relying on the next real command to discover the break.
- Prefer storing the tool's reference to the game window (and vice versa) via a value obtained at handshake time and re-validated (`try { ref.closed } catch { ref = null }`) before every send, since a closed or navigated-away window reference can throw in more ways than just "is null."

**Warning signs:** Bridge "just stops working" after the user reloads the BC tab or it auto-reconnects after a disconnect, but works again only after the user closes and reopens the tool via the bookmarklet — a strong signal that opener-loss is the cause and it isn't being detected/recovered from automatically.

**Phase to address:** Stabilisierung, as part of the postMessage-hardening work — add an explicit opener-liveness check alongside the origin-hardening fixes, since both live in the same bridge code paths.

---

### Pitfall 8: GitHub Pages origin assumptions break under custom domains, path changes, or local dev

**What goes wrong:**
`ALLOWED_ORIGIN = 'https://animereviewer1-sketch.github.io'` is hardcoded in `loader.js`. This is correct today, but two common ways this silently breaks: (1) testing the tool locally (`file://` origin, or `http://localhost:PORT` during development) will always fail the origin check with no useful error, tempting a "just comment out the origin check for testing" shortcut that occasionally survives into a commit; (2) GitHub Pages project sites include the repo name in the path (`/bc-universal-configurator/`) but **not** in the origin — so origin-only checks are actually fine for path changes, but a future custom domain, or moving between a user site (`animereviewer1-sketch.github.io`) and a project site path, changes the origin string and requires updating the constant in lockstep in both `loader.js` and wherever the tool computes its own origin to send to the loader.

**Why it happens:**
Hardcoded origin strings have no single source of truth — they live independently in the bookmarklet source (which embeds the popup URL), `loader.js`'s `ALLOWED_ORIGIN`, and potentially in `items.js`'s outgoing postMessage target-origin fixes from Pitfall 6. Updating one without the others reintroduces either a wildcard fallback or a hard failure.

**How to avoid:**
- Define the allowed origin(s) in exactly one place (e.g., a small `config.js` loaded first, or computed as `new URL(POPUP_URL).origin` from a single `POPUP_URL` constant used to build the bookmarklet itself) and import/reference it everywhere else — never re-type the origin string a second time.
- For local development, support an explicit allow-list (`['https://animereviewer1-sketch.github.io', 'http://localhost:5500']`) gated by an obvious, grep-able flag (e.g., a `DEV_MODE` constant) rather than commenting out the check — makes it impossible to accidentally ship a disabled check, since `DEV_MODE = true` is easy to lint/grep for before a release.
- Since the project's constraint list explicitly notes "no build step," this config value has to be a plain JS file loaded before `loader.js`/`items.js`, not an env var — document that whoever changes hosting (custom domain, repo rename) must update this one file and nothing else.

**Warning signs:** Origin check failures that only happen for the developer (never for the deployed tool) are the signal this needs a documented dev-mode path rather than ad hoc `// TODO: remove` comments in the origin check.

**Phase to address:** Stabilisierung — bundle this with the origin-hardening task (Pitfall 6/7) since it's the same code region and the same review pass should catch all three at once.

---

### Pitfall 9: IndexedDB migration blocked by a second open tab, or partially applied then abandoned

**What goes wrong:**
Two distinct IDB migration failure modes threaten the "never lose scanned data" core value: (1) **`blocked` event** — if the user has the configurator open in two tabs (easy to do accidentally, e.g., middle-click "open in new tab" on a bookmark) and one tab tries to open the database at a higher version while the other still holds an open connection at the old version, the `versionchange` transaction fires `onblocked` and simply never completes until the other tab is closed — the user sees a hang, not an error, unless the code explicitly listens for `onblocked` and surfaces it; (2) **partial migration** — if `onupgradeneeded`'s migration logic (e.g., moving screenshots from one storage shape to another, per the Entflechtường plan to store screenshots individually instead of one large object) throws partway through iterating records, IndexedDB does **not** automatically roll back data already written in that same versionchange transaction in every browser consistently, and the DB is left at the new version with an incomplete dataset — reopening it won't re-trigger `onupgradeneeded` (version already matches) so the migration never gets a second chance to finish.
Additionally, this project has a **known instance of exactly this class of bug already**: CONCERNS.md documents the existing "migration runs once at startup (lines 68-87) — if it fails silently, data loss possible," which is the general-purpose antecedent of any new migration-during-refactor risk.

**Why it happens:**
Browsers keep IndexedDB connections open across tabs unless explicitly closed, and `onupgradeneeded`/`onblocked` are two different events that must both be handled — most tutorials only show the happy-path `onupgradeneeded` and skip `onblocked` entirely, so it's easy to ship migration code that "works" in every manual test (single tab) and then locks up or partially-migrates the first time the user has two tabs open, which given this tool's own popup-based workflow (game tab + tool tab, and the user may reasonably keep the tool open across sessions) is not an edge case but a plausible normal usage pattern.

**How to avoid:**
- Always attach an `onblocked` handler on every `indexedDB.open()` call that bumps the version, and surface it visibly ("Bitte alle anderen Tabs des Configurators schließen, um das Datenbank-Update abzuschließen") — never let a version-bump migration hang silently.
- Before writing any destructive/structural transform inside `onupgradeneeded`, **read all data needed for the migration into memory first**, then write the transformed result — so a mid-migration exception leaves the original data unread but also not yet destroyed (fail before you mutate, not while you mutate), and prefer writing to a **new** object store and deleting the old one only after the new one is confirmed populated, rather than transforming records in place.
- Since PROJECT.md's core value is explicit ("gescannte Daten... gehen nie verloren"), any IDB version bump during Entflechtung must ship with an automatic pre-migration export (dump the entire old-shape data as JSON to a recovery key, e.g., `BC_PreMigrationBackup_<timestamp>`) that is *not* deleted automatically — this gives a manual recovery path if the transform itself has a bug, independent of whatever `bc-autobackup.js` already does to the filesystem.
- Test migrations against fake-indexeddb with fixtures captured from real exported data (not synthetic minimal fixtures) so record shapes, sizes, and edge cases (missing fields, legacy key formats) that only exist in the author's real 1500-version LSCG_DB are actually exercised.

**Warning signs:** The tool "hangs on load" intermittently — especially correlated with the user having left a previous tab open — is the `onblocked` symptom; data that "used to be there" disappearing after an update, with no error shown, is the partial-migration symptom.

**Phase to address:** Entflechtung, specifically whenever the screenshot-storage-shape change ("Screenshots werden einzeln gespeichert statt als ein großes Objekt") is implemented — this is exactly the kind of structural IDB change that needs the pre-migration-backup + onblocked-handling pattern, not a simple in-place rewrite.

---

### Pitfall 10: QuotaExceededError caught but not distinguished from "quota exceeded during migration," leaving the DB half-updated

**What goes wrong:**
PROJECT.md's Stabilisierung list already calls for `idbSet()` to catch `QuotaExceededError` and show it to the user instead of failing silently — necessary, but insufficient on its own for the migration case specifically. If quota is exceeded *during* a version-bump migration (writing the transformed/new-shape data back), the transaction as a whole aborts, but depending on when the abort happens relative to per-record writes already flushed to disk in that transaction, the resulting state can be a database now at the *new* schema version with only some of the new-shape records present and the old-shape store already deleted (if the migration code deletes-then-repopulates rather than populate-then-delete) — a straightforward `try/catch` around `idbSet()` for *ordinary* runtime saves doesn't protect against this because the migration isn't calling `idbSet()`, it's running inside the `onupgradeneeded` versionchange transaction directly.

**Why it happens:**
The general "catch quota errors on save" fix (aimed at day-to-day screenshot/outfit saves) is a different code path from the one-time migration transaction, and it's easy to consider the quota-handling task "done" once regular saves are covered without re-checking the migration path specifically — especially since migrations are rare and hard to manually re-trigger for testing once already applied to the dev database.

**How to avoid:**
- Explicitly test the migration under artificially constrained quota (Chrome DevTools > Application > Storage has quota override / `navigator.storage.estimate()` can be checked before deciding whether to even attempt an in-place migration of a large screenshot set).
- As in Pitfall 9, structure the migration as populate-new-store-first, verify-count-matches, delete-old-store-last — so a quota abort during the populate phase leaves the old data fully intact and the DB is simply retried on next load (still at old version, `onupgradeneeded` fires again).
- Never let a migration proceed automatically for datasets above a size threshold without first checking `navigator.storage.estimate()` headroom and warning the user if free space is tight, given the project's own scaling note that LSCG_DB can already approach the ~50MB typical origin quota with 1500 versions/player.

**Warning signs:** Migration succeeds in dev (small dataset) but fails only for the author's real, much larger production dataset — a reminder that migration testing must use realistic data volumes, not just a handful of synthetic fixture records.

**Phase to address:** Entflechtung (same task as Pitfall 9 — screenshot storage-shape migration). Address together; they share the same populate-first/delete-last mitigation.

---

### Pitfall 11: Enumerating game/mod globals at runtime freezes the tab or captures a snapshot with hidden side effects

**What goes wrong:**
The Gamecode-Scan phase needs to walk `window` in the BC game tab (via the loader) and report back what's there — Player, ChatRoom, Inventory, Asset arrays, plus whatever LSCG/BCX/FBC(WCE)/MBS add. Several concrete failure modes are likely:
1. **Getters with side effects fire during enumeration.** Naive enumeration (`for (const k in window)` or `Object.keys(window)` followed by `window[k]`) *evaluates* every accessor property to read its value. If any mod defines a getter that does work when accessed (lazy-computes a value, logs, or — worse — mutates state as a side effect of being read), a "read-only" scan can silently alter game state or trigger expensive computation for every property, not just the ones that matter.
2. **Circular references crash naive serialization.** BC's `Player`/`ChatRoom`/`Asset` objects are deeply cross-referential (a character object referencing the room it's in, which references its list of characters, which includes itself). A scan that tries to `JSON.stringify()` or deep-clone what it finds for transport back over postMessage will throw (`TypeError: Converting circular structure to JSON`) unless it explicitly guards against cycles.
3. **Huge objects freeze the tab.** `Asset` catalogs and character appearance layers are large; a full deep-walk of every reachable object graph from `window` (not just top-level enumeration) can be effectively unbounded and freeze the single-threaded game tab for seconds, which — since BC is itself a real-time chat/room application — is disruptive to the user's actual game session, not just an inconvenience to the scan.
4. **bcModSdk-patched functions look like natives but aren't.** Mods using `bcModSdk`'s `hookFunction`/`patchFunction` wrap original BC functions; the wrapped function is what ends up on `window`/`Player`/etc. A scan that inspects `.toString()` of a function to detect "is this a mod addition" will see the wrapper's source, not the original — useful for spotting *that* something is patched, but naive heuristics (e.g., "native code" string checks) will misclassify patched functions as either fully-native or fully-custom depending on how the wrapper is written, when the more reliable signal is checking for the SDK's own bookkeeping (bcModSdk keeps a registry of hooked functions) if it's present.

**Why it happens:**
`window` in a live BC session isn't a static data structure — it's a running application's full runtime state, shared with however many mods happen to be loaded, and none of that is under this project's control (PROJECT.md explicitly notes "kein Gamecode im Repo" — the scan target is opaque and only knowable by asking the live game).

**How to avoid:**
- Enumerate **shallowly and explicitly by allow-list first**: start from `Object.getOwnPropertyNames(window)` (not `for...in`, which walks the prototype chain too) and use `Object.getOwnPropertyDescriptor(window, key)` to check `.get`/`.value` *before* touching the property — only invoke getters for a small, deliberately-chosen set of known-safe keys (or skip getter-backed properties entirely in a first pass, listing them as "accessor, not read" rather than evaluating them).
- Never deep-clone/stringify arbitrary discovered objects for transport. Instead, report a shallow shape (constructor name, own-key list, typeof of each key, one level deep) and let the user/analysis step drill into specific known objects (`Player`, `ChatRoom`) with hand-written, bounded extraction logic — not a generic recursive walker.
- Guard any recursive walk with (a) a `WeakSet` of already-visited objects to break cycles, (b) a maximum depth (e.g., 3-4 levels), and (c) a maximum node-count budget, aborting and reporting "truncated" rather than continuing unboundedly.
- Run the scan in slices (`requestIdleCallback`/`setTimeout(0)` chunking) rather than one synchronous pass, so a large Asset catalog doesn't block the single-threaded game tab for one long uninterruptible tick — matters even more here because freezing the *game* tab, not just the tool tab, directly interrupts the user's live BC session.
- For mod detection, prefer checking for `window.bcModSdk` presence and any documented registry it exposes, and cross-reference against known mod-global names (LSCG's, BCX's, FBC/WCE's own top-level globals) rather than trying to infer "is this modded" purely from function source inspection.
- Since the user "can execute commands in the ingame browser console and return output" (per PROJECT.md), prototype the exact enumeration snippet manually in the console first against a real session with mods loaded, and only promote it into `loader.js` once it's been shown not to hang or misbehave live — don't guess at the scan logic against the abstract idea of "BC globals."

**Warning signs:** The BC tab visibly stutters or the chat connection drops immediately after triggering a scan — a strong signal the scan did a long synchronous unbounded walk. A scan report containing wildly more or fewer keys than expected between two runs against the same session, with no game state change in between, points at getters producing different values each time they're read (lazy computation) rather than stable data being reported.

**Phase to address:** Gamecode-Scan. This should be the very first design question for that phase — prototype the enumeration approach interactively in the live console (per PROJECT.md's noted capability) before writing any `loader.js` scan code.

---

### Pitfall 12: "Delete with confirmation" still loses data because confirmation ≠ complete/reversible deletion

**What goes wrong:**
CONCERNS.md already flags that `deleteLscgVersion()` and `deleteProfile()` show a confirmation dialog and then perform a genuine, permanent delete — which is arguably a violation of the "never lose data" core value even though it's user-initiated, and separately, the triple-storage screenshot bug (RAM `LSCG_SCREENSHOTS`, IDB+localStorage `PROFILE_SCREENSHOTS`) means a "confirmed" deletion in one location can leave stale, orphaned data in the other two — which is worse than either "fully deleted" or "fully kept," because the UI will show the item as gone while storage quota is still consumed by an orphaned copy, and a future sync/restore path might resurrect the "deleted" data unexpectedly because it was never actually removed everywhere.

**Why it happens:**
A confirmation dialog answers "did the user mean to click delete," not "does the delete operation correctly and completely remove the data everywhere it's stored, and is it recoverable if the user meant something else." Those are three separate concerns (intent confirmation, delete completeness, recoverability) that get bundled into "there's a confirm dialog" and treated as solved.

**How to avoid:**
- Decide explicitly (this is flagged in PROJECT.md's Key Decisions as "Pending") whether manual delete should be a true permanent delete or a soft-delete/archive, and implement consistently — don't leave some delete functions doing hard deletes and others soft, since that's confusing to reason about and to test.
- If hard delete is kept for manual actions (which PROJECT.md's decision leans toward — "Löschen bleibt möglich, aber nur manuell mit Bestätigung"), the confirmation dialog should state precisely what will be removed (not just "delete this?") — e.g., "This removes 1 outfit version and its screenshot, freeing ~X MB. This cannot be undone." — and the delete implementation must be updated in the same change to actually clear all three storage locations (RAM, IDB, localStorage) atomically, closing the exact gap CONCERNS.md documents at line 7979.
- Regardless of hard vs. soft delete, favor a short-window undo (Gmail-style "Outfit gelöscht — Rückgängig" toast with a 5-10 second grace period) over a modal confirm-before-delete for lower-stakes single-item deletes — the research consensus is that modal confirms suffer from "click fatigue" (habitual confirm-clicking) while undo-toasts protect against accidental loss without training users to blindly dismiss dialogs; reserve a hard modal confirmation for higher-stakes bulk actions like `clearAllProfileScreenshots()`.
- Add a test (once the persistence layer is extracted and testable) that asserts: after calling delete, the item is absent from **all** three storage locations, not just the one the delete function directly touched — this is the concrete regression test for the bug CONCERNS.md already found.

**Warning signs:** IDB/localStorage size doesn't shrink as expected after deletions accumulate — orphaned data in a location the delete function didn't touch. Users (or the author) reporting a "deleted" outfit or screenshot reappearing after a reload or resync.

**Phase to address:** Stabilisierung — this is explicitly named as an Active stabilization item in PROJECT.md ("Löschen von Bildern und einzelnen Outfits/Versionen ist nur manuell und nur nach Bestätigungsdialog möglich"). The decision on hard-vs-soft delete should be made and documented as a Key Decision before Entflechtung touches the persistence layer, since the extracted persistence module's delete API shape depends on this choice.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Leave a duplicate copy of a function in both old and new file "during" extraction | Feels safer, easy rollback | Silent load-order-dependent shadowing (Pitfall 2) | Never — delete the old copy in the same commit as adding the new one |
| Comment out the postMessage origin check for local testing | Unblocks dev quickly | Risk of the disabled check surviving into a commit/release | Only behind a grep-able `DEV_MODE` flag, never a bare comment-out |
| Snapshot-test the raw Base64-encoded bot code string | Fast to write, "passes" immediately | Brittle, unreviewable diffs; doesn't catch escaping bugs (Pitfall 5) | Never for the encoded blob; acceptable for the decoded config shape only |
| Migrate IDB data in place (transform-then-overwrite same store) | Simpler code, one store | Partial migration on error destroys originals with no fallback (Pitfall 9) | Only for trivial, purely-additive schema changes with no data transform |
| Treat `deleteX()` confirmation dialog as "the fix" for the data-preservation rule | Closes the CONCERNS.md item quickly | Doesn't address storage-location completeness or recoverability (Pitfall 12) | Never as the sole fix — must pair with a triple-storage-cleanup test |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| fake-indexeddb + happy-dom (Vitest) | Assuming happy-dom includes IndexedDB, or wiring the polyfill per-test instead of globally | Import `fake-indexeddb/auto` in a global Vitest `setupFiles` entry; assert `globalThis.indexedDB` is defined as a canary |
| bcModSdk-patched game functions | Detecting mods purely via `Function.prototype.toString()` heuristics | Check for `window.bcModSdk` presence / its hook registry first; treat source-string checks as a weak secondary signal only |
| GitHub Pages origin as security boundary | Hardcoding the origin string in more than one file (bookmarklet, loader.js, items.js) | Single source-of-truth constant/config file for `POPUP_URL`/`ALLOWED_ORIGIN`, referenced everywhere |
| window.opener-based bridge | Assuming `window.opener` stays valid for the life of the session | Treat every send as possibly-failing; heartbeat-detect opener loss and surface a visible "disconnected" state |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Unbounded recursive walk of BC's `window`/`Player`/`ChatRoom` graph during scan | Game tab freezes/stutters, chat connection drops | Depth + visited-set + node-count budget, chunked via `setTimeout(0)`/`requestIdleCallback` | Immediately on first real scan against a modded session — BC's object graph is large and circular by design |
| Full-object JSON.stringify of LSCG_DB/PROFILE_SCREENSHOTS on every save | Main-thread jank on every save/screenshot capture (already noted in CONCERNS.md) | Per-screenshot individual storage instead of one giant object (already planned in Entflechtung) | Grows worse linearly with scanned-outfit count; already an issue at current ~1500-version scale |
| Reading getter-backed properties during window enumeration | Scan results vary between runs with no game-state change, or scan is slow | Skip accessor properties by default; only invoke a deliberate allow-list of known-safe getters | As soon as any mod defines a computed/lazy getter on a globally-reachable object |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Wildcard `postMessage(..., "*")` fixed on only one leg of the bridge (tool→loader) while the other (loader→tool) or bot-engine-generated injected code still uses `"*"` | Any third window with a reference to either endpoint can intercept/spoof messages the "fixed" side never protected | Exhaustive grep across `items.js`, `loader.js`, and bot-engine-generated code strings for every `postMessage(` call; single named origin constant per direction |
| Validating `event.origin` but not `event.source` | A same-origin but unexpected window (e.g., a second configurator tab) could inject or receive messages meant for another instance | Check both `event.origin === ALLOWED_ORIGIN` and `event.source === expectedWindowRef` |
| `new Function()`/`eval` execution of EXEC payloads with only origin-check as the trust boundary | If the origin check has any bypass bug, arbitrary code executes in the game tab with full Player/Asset access | Document EXEC as a privileged, same-origin-only operation; add logging of every EXEC call (already an Active PROJECT.md item) for audit trail even if the check itself is later found flawed |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Modal confirm-before-delete for every single-item delete | Click fatigue trains users to blindly confirm, defeating the safeguard | Short-window undo toast for low-stakes single deletes; reserve modal confirmation for high-stakes bulk actions |
| Confirmation dialog with generic "Delete this?" wording | User doesn't know the real scope/impact (does it also remove the screenshot? free how much space?) | State precisely what is removed and that it's permanent, before the click that commits it |
| Bridge silently stops responding after opener loss, with no visible state change | User assumes the tool is broken or their action didn't register; may retry destructively or lose trust in the tool | Heartbeat-based visible "Bridge getrennt" status the moment opener/connection is lost |

## "Looks Done But Isn't" Checklist

- [ ] **postMessage origin hardening:** Often only fixes the flagged direction — verify every `postMessage(` call site across `items.js`, `loader.js`, and bot-engine-generated code strings uses a named origin constant, not just the lines CONCERNS.md cited.
- [ ] **IDB delete function with confirmation dialog:** Often only removes data from one of the three storage locations (RAM/IDB/localStorage) — verify a test asserts absence from all three after delete.
- [ ] **Vitest suite for IDB helpers:** Often silently tests the localStorage fallback path instead of real IndexedDB because fake-indexeddb wasn't wired into `setupFiles` — verify a canary assertion (`globalThis.indexedDB` defined) exists and passes.
- [ ] **Bot code-generator tests:** Often only snapshot the final string (including the opaque Base64 blob) — verify the decoded config is what's asserted against, and that at least one adversarial-input (backtick/`${`/quote-containing name) test exists.
- [ ] **IDB schema migration for screenshot restructuring:** Often transforms data in place — verify it populates the new store first, verifies record counts match, and only then deletes the old store; verify an `onblocked` handler exists and is user-visible.
- [ ] **Gamecode-Scan enumeration:** Often walks `window` naively with `for...in` and full property access — verify it uses `getOwnPropertyDescriptor` to skip unintended getter invocation, and has a depth/count budget to avoid freezing the game tab.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Partial IDB migration leaves DB at new version with incomplete data | HIGH | If a pre-migration JSON export exists (Pitfall 9 mitigation), manually re-import from that export key; without it, recovery depends on whatever `bc-autobackup.js` filesystem backups still hold from before the migration ran |
| Duplicate global declaration causes an old bugfix to "revert" after extraction | LOW | Grep both old and new files for the identifier, delete the stale declaration, reload and re-verify affected feature |
| Bridge silently broken due to `window.opener` becoming null | LOW | User closes and reopens the tool via the bookmarklet, re-establishing the opener reference; add heartbeat detection so this becomes a visible prompt instead of a silent hang |
| Delete function only cleared one of three screenshot storage locations, leaving orphaned data | MEDIUM | Write a one-off cleanup script that cross-references all three storage locations and removes orphans found in only one or two of them, run once after the delete-completeness fix ships |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Load-order breakage from module extraction | Entflechtung (guards added in Stabilisierung) | Hard-refresh test after every extraction slice, across every tab, not just the one touched |
| Duplicate global declarations shadow bugfixes | Entflechtung | Grep-based duplicate-declaration check in pre-commit/CI |
| Global-state test pollution gives false green | Stabilisierung | Run Vitest with cross-file isolation; scope first suite to stateless pieces named in PROJECT.md |
| fake-indexeddb/happy-dom silently falls back to localStorage path | Stabilisierung | Canary assertion for `globalThis.indexedDB` in test setup |
| Bot code-generator snapshot tests miss escaping bugs | Stabilisierung (extend in Entflechtung) | Parse-validity check (`new Function`) + adversarial-input fixtures |
| postMessage wildcard fixed on only one bridge leg | Stabilisierung | Exhaustive grep of all `postMessage(` call sites incl. bot-engine-generated code |
| `window.opener` null breaks bridge silently | Stabilisierung | Heartbeat/PING-PONG surfaces visible disconnect state within seconds |
| Hardcoded origin duplicated across files | Stabilisierung | Single-source-of-truth origin constant; grep confirms no second literal origin string |
| IDB migration blocked/partial during screenshot restructuring | Entflechtung | Populate-new-then-delete-old pattern + pre-migration JSON export + `onblocked` handler, tested with fake-indexeddb using realistic data volume |
| Quota exceeded specifically during migration (not just regular saves) | Entflechtung | Test migration under constrained/simulated quota, not just regular `idbSet()` quota handling |
| Runtime window/mod enumeration freezes game tab or has side effects | Gamecode-Scan | Prototype enumeration live in-game console first; ship with depth/count budget and getter-skipping by default |
| Delete-with-confirmation still loses/orphans data | Stabilisierung | Test asserting deletion clears all three screenshot storage locations; explicit hard-vs-soft-delete decision recorded in PROJECT.md Key Decisions |

## Sources

- Project-specific findings (HIGH confidence, first-party): `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/PROJECT.md`
- [postMessage: Security, Vulnerabilities, and Solutions — SecureLayer7](https://blog.securelayer7.net/postmessage-common-issues-and-how-you-can-mitigate-them/) (MEDIUM/LOW confidence, web research)
- [Unchecked Origin in postMessage Vulnerability — SecureFlag](https://knowledge-base.secureflag.com/vulnerabilities/broken_authorization/unchecked_origin_in_postmessage_vulnerability.html)
- [Window: postMessage() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Managing database migrations in IndexedDB](https://colinchjs.github.io/2023-10-01/18-36-30-229308-managing-database-migrations-in-indexeddb/)
- [How do you handle version changes in IndexedDB? — MindStick](https://www.mindstick.com/interview/34310/how-do-you-handle-version-changes-in-indexeddb)
- [Fake IndexedDB — GitHub (dumbmatter/fakeIndexedDB)](https://github.com/dumbmatter/fakeIndexedDB) and its [CHANGELOG](https://github.com/dumbmatter/fakeIndexedDB/blob/master/CHANGELOG.md) (v5 structuredClone removal)
- [fake-indexeddb — npm](https://www.npmjs.com/package/fake-indexeddb)
- [bondage-club-mod-sdk — GitHub (Jomshir98)](https://github.com/Jomshir98/bondage-club-mod-sdk) and [README](https://github.com/Jomshir98/bondage-club-mod-sdk/blob/master/README.md)
- [When Splitting a Large File Makes Your Architecture Worse — DEV Community](https://dev.to/bonzai2carn/why-splitting-a-2500-line-file-broke-our-architecture-2lc1)
- [Confirmation Dialogs Can Prevent User Errors — Nielsen Norman Group](https://www.nngroup.com/articles/confirmation-dialog/)
- [The Ultimate Guide to Delete Dialog UX Design — Almax Agency](https://almaxagency.com/user-experience-ux-design/the-ultimate-guide-to-delete-dialog-ux-design/)
- [Using property getters/setters is dramatically slower — Mozilla Bugzilla #782913](https://bugzilla.mozilla.org/show_bug.cgi?id=782913)
- [Testing window.postMessage (race condition?) — testing-library/dom-testing-library#199](https://github.com/testing-library/dom-testing-library/issues/199)
- [Snapshot | Guide | Vitest](https://vitest.dev/guide/snapshot)

---
*Pitfalls research for: BC Universal Configurator (Stabilisierung / Entflechtung / Gamecode-Scan milestone)*
*Researched: 2026-09-12*
