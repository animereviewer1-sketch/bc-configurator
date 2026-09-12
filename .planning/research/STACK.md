# Stack Research

**Domain:** Adding a Vitest test suite, module boundaries, and hardened postMessage/IndexedDB handling to an existing no-build vanilla-JS browser tool (production stays plain `<script>` includes on GitHub Pages)
**Researched:** 2026-09-12
**Confidence:** MEDIUM overall (version numbers verified directly against the npm registry = HIGH; pattern/best-practice recommendations are WebSearch-sourced, no MCP docs provider was available in this environment, so those are tagged LOW/MEDIUM per finding — see Sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 5.0.0 | Test runner for browser-free logic (`bot-data.js` validators, outfit-import parser, IDB helpers, future persistence/bridge modules) | Current stable (released Sep 2026, verified via npm registry). Runs on Vite/vite-node but is a **devDependency only** — it never touches the production script-tag deployment, satisfying the "no bundler in production" constraint. Fast, Jest-compatible API, zero-config TypeScript/ESM support if ever needed, and its default `environment: 'node'` is exactly what's needed for logic-only tests (no DOM required). |
| @vitest/coverage-v8 | 5.0.0 | Coverage reporting | Matches the Vitest version; V8-based coverage has used AST-based remapping since Vitest 3.2, giving Istanbul-level accuracy at V8 speed — no reason to add Istanbul separately. |
| fake-indexeddb | 6.2.5 | In-memory IndexedDB implementation for Node | Neither `jsdom` nor `happy-dom` implement IndexedDB (confirmed: jsdom explicitly lists it as unimplemented; happy-dom likewise has no IDB support). This is the standard, widely-used pure-JS IDB shim and is required regardless of which (if any) DOM environment is chosen. Import via `import 'fake-indexeddb/auto'` in a Vitest setup file to populate `globalThis.indexedDB`. |
| Node.js | ≥20 LTS (project machine has v24.12.0) | Runs Vitest locally | `structuredClone` and modern `vm`/ESM interop are built in from Node 17+; no polyfills needed. Node itself never ships to production — GitHub Pages only serves static files. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| happy-dom | 20.14.5 | Optional lightweight DOM environment for Vitest | Only if/when a future phase needs to assert on actual DOM output (not in this milestone's browser-free-logic scope). Vitest's own docs favor it as the faster default (2–10x jsdom) for cases that don't need jsdom's fuller spec coverage. Configure per-file via a `// @vitest-environment happy-dom` docblock rather than globally, to keep the default fast `node` environment for pure-logic tests. |
| jsdom | 30.0.1 | Alternative, more spec-complete DOM environment | Only if a specific test needs a browser quirk happy-dom doesn't implement (rare). Not needed for this milestone. |
| lz-string | 1.5.0 (already in use) | Outfit-code compression | No change — already the project's only production dependency, unaffected by this research. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node `vm` module (built-in, no install) | Execute legacy plain-global `<script>` files inside a Vitest test with **zero source changes** | See "Testing plain-global files" pattern below. Best for `items.js` and other files as they exist *today*, before they're split apart. |
| npm (or pnpm) with a plain `package.json` | Holds `devDependencies` only (`vitest`, `@vitest/coverage-v8`, `fake-indexeddb`) | No `dependencies` field needed for production code — the only runtime dependency (`lz-string`) stays a CDN `<script>` tag exactly as today. `package.json`/`node_modules` are dev-tooling only and must be `.gitignore`d from the deploy surface (GitHub Pages serves the repo as-is, so keep `node_modules` out of the published root or exclude it via `.nojekyll`/Pages config — it's already outside `index.html`'s script includes so this is a documentation point, not a risk). |

## Installation

```bash
# Dev dependencies only — nothing here ships to GitHub Pages
npm install -D vitest@5 @vitest/coverage-v8@5 fake-indexeddb@6

# package.json test script
# "test": "vitest run", "test:watch": "vitest", "coverage": "vitest run --coverage"
```

No `npm install` step is ever required for production deployment — `index.html` keeps loading `bc-icons.js`, `items.js`, `bot-data.js`, etc. via plain `<script src="...">` tags exactly as it does today, plus the `lz-string` CDN `<script>` tag. This is the load-bearing constraint from `PROJECT.md`: *"Build-Toolchain … für die Auslieferung [ist Out of Scope]; Vitest läuft nur lokal."*

## Testing plain-global files without touching production code (the concrete pattern)

Two complementary patterns cover the two situations this milestone creates:

### Pattern A — `vm` script injection (use for existing files, unmodified)

For `items.js`, `bot-data.js`, etc. **as they exist right now** (no `export`, no `module.exports`, everything hangs off implicit globals), load the raw source into a Node `vm` sandbox instead of `import`-ing it. This requires **no changes to the production file at all**:

```js
// tests/helpers/loadScript.js
import fs from 'node:fs';
import vm from 'node:vm';

export function loadGlobalScript(path, extraGlobals = {}) {
  const code = fs.readFileSync(path, 'utf8');
  const sandbox = {
    console,
    window: {},
    document: { addEventListener() {}, /* stub only what the file touches at load time */ },
    ...extraGlobals,        // e.g. { indexedDB: fakeIndexedDB } from fake-indexeddb
  };
  sandbox.window = sandbox; // classic "globals live on window" pattern
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: path });
  return sandbox; // functions like sandbox.idbGet, sandbox.idbSet are now reachable
}
```

```js
// tests/idb-helpers.test.js
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { loadGlobalScript } from './helpers/loadScript.js';

const ctx = loadGlobalScript('../items.js', { indexedDB: globalThis.indexedDB });

it('idbSet/idbGet round-trip', async () => {
  await ctx.idbSet('foo', { a: 1 });
  expect(await ctx.idbGet('foo')).toEqual({ a: 1 });
});
```

This is the fastest way to get the Stabilisierung-phase test suite (IDB helpers, bot validators, outfit-import parser) running against `items.js`/`bot-data.js` *before* any Entflechtung work starts — it directly satisfies "Vitest-Testsuite für browserfreie Logik" without requiring the module split to happen first. Caveat: only the top-level side effects that the sandbox stubs allow will run at load time — if a file does heavy DOM work at parse time (`document.write`, `DOMContentLoaded` listeners firing immediately), stub just enough (`addEventListener` as a no-op, etc.) to let the file finish loading; you don't need a full DOM.

### Pattern B — dual-mode export guard (use for newly extracted modules)

When the Entflechtung phase extracts the persistence layer and the bridge protocol into their own files, write them so they are still loadable as classic `<script>` tags **and** natively `import`-able in Vitest, with one small addition at the bottom of the file:

```js
// persistence.js — new extracted module, still loaded via <script src="persistence.js">
function idbGet(key) { /* ... */ }
async function idbSet(key, value) { /* ... quota handling ... */ }

// Browser: keep exposing globals exactly like every other file in this codebase today
window.idbGet = idbGet;
window.idbSet = idbSet;

// Node/Vitest only — this branch never runs in the browser (module is undefined there)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { idbGet, idbSet };
}
```

```js
// tests/persistence.test.js
import 'fake-indexeddb/auto';
import { idbGet, idbSet } from '../persistence.js'; // vite-node resolves the CJS export via cjs-module-lexer interop
```

This keeps the explicit project decision ("Modulschnitt über normale Script-Includes", "Kein Bundler") intact: the file is still a plain, dependency-order `<script>` include in `index.html`, nothing changes about how the browser loads it. **Do not** switch these new files to `<script type="module">` — native ESM script tags are blocked by CORS when the tool is opened via `file://` (a real risk for a tool the author may open locally before pushing to GitHub Pages), so the CJS-export-guard is the safer 2025/2026 no-build compromise, not native ESM.

Recommendation: use Pattern A to get tests running immediately against the current monolith (Stabilisierung phase), and require Pattern B for every new file the Entflechtung phase creates, so the module split is testable from the moment each module is born.

## Hardening postMessage

| Practice | Detail |
|----------|--------|
| Never send with `targetOrigin: '*'` | Every `postMessage(...)` call in `items.js` and the injected game code must pass the exact known origin (`https://animereviewer1-sketch.github.io` on the tool side; the game's own origin, captured from the bookmarklet's `window.opener`/`window.location`, on the loader side). Sending with `'*'` lets any page that obtains a reference to the window read the message — this is a documented, actively exploited vulnerability class (cited in Microsoft's own MSRC blog, Aug 2025). |
| Always validate `event.origin` on receipt | Already partially done (`ALLOWED_ORIGIN` check exists per `ARCHITECTURE.md`); extend the same check to the tool side's message handler, not just the loader side. |
| Validate `event.source` too, where feasible | Origin string alone isn't enough if multiple windows could share an origin; checking `event.source === window.opener` (tool side) / `=== <the popup you opened>` (loader side) closes the gap the codebase's own `ARCHITECTURE.md` anti-pattern section already flags. |
| Log EXEC calls | Per the Active requirements, keep a lightweight in-memory/console log of every `EXEC` postMessage so a compromised or buggy trigger is traceable after the fact — this is a logging discipline, not a new library. |
| Testability | Structure the message handler as a pure function `handleBridgeMessage(event, deps)` that the real `window.addEventListener('message', ...)` merely calls — this lets Vitest exercise origin/shape validation by constructing fake event objects (`{ origin, source, data }`) directly, with no real `postMessage` round-trip and no DOM environment needed. |

No library is needed for this — `postMessage` hardening is entirely a call-site discipline change, not a dependency.

## Hardening IndexedDB writes

| Practice | Detail |
|----------|--------|
| Catch `QuotaExceededError` explicitly | Wrap `idbSet` (or its promise chain) so `error.name === 'QuotaExceededError'` is caught and surfaced to the user via the existing `showStatus(msg, 'error')` UI convention — never let it fail silently, per the project's Core Value ("jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen"). |
| Use `navigator.storage.estimate()` proactively | Check `{usage, quota}` before/after large writes (e.g. screenshot imports) and warn the user at ~80% usage, rather than only reacting after a write fails. |
| Consider `navigator.storage.persist()` | Requests "persistent" (non-evictable) storage for the origin — relevant given the Core Value that scanned data must never be silently lost; best-effort storage can otherwise be evicted by the browser under global pressure. |
| Store screenshots/large blobs as separate per-item keys, not one big object | This is already an Active requirement ("Screenshots werden einzeln gespeichert statt als ein großes Objekt"). Per-item storage means a single quota failure only loses/blocks the one write in flight, not the entire `LSCG_DB`/`PROFILE_SCREENSHOTS` blob, and makes retry-after-quota-freed tractable. |
| Optional: `idb-keyval` (6.3.0) or `idb` (8.0.3) as a promise wrapper | Both are current, small, dependency-free-at-runtime (usable via a single vendored file or CDN `<script>`, no bundler needed) IndexedDB conveniences. **Not required** — the project's existing `idbGet`/`idbSet` helpers in `items.js` are already a similar thin abstraction; adding one of these libraries is optional polish (nicer promise ergonomics, built-in cursor helpers for iterating per-item keys) rather than something the quota/per-item-storage requirements depend on. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Vitest | Jest | Jest still works but is slower to start, needs more config for ESM/Node-native APIs, and the project has zero existing Jest setup — no reason to introduce it. Use Jest only if the team already standardizes on it elsewhere. |
| `vm`-based script loading (Pattern A) | Rewriting `items.js` to ESM before writing any tests | Rewriting first would violate the project's own ordering decision ("Refactoring erst, wenn die Tests aus der Stabilisierung existieren") — tests must come first, against the code as it is. |
| CJS-export-guard dual pattern (Pattern B) | `<script type="module">` for new extracted files | Only if the tool will never be opened via `file://` and the team is fine with a bigger step away from the current all-classic-scripts loading model. Given the tool is opened locally by its single author, avoid this. |
| `environment: 'node'` (default) for all current tests | `happy-dom` / `jsdom` globally | Only adopt a DOM environment once a phase actually needs to assert on rendered DOM output — this milestone's scope is explicitly "browserfreie Logik" only. |
| Keep hand-rolled `idbGet`/`idbSet` + add quota handling | Adopt `idb-keyval` | If the team wants nicer ergonomics (transactions, cursors) while extracting the persistence module anyway — a reasonable one-time swap during the Entflechtung phase, but not a prerequisite for the quota-handling or per-item-storage requirements. |
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Only if a specific report format Istanbul supports and V8 doesn't is needed — not the case here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Any bundler (Webpack, Rollup, esbuild-as-build-step, Vite in build mode) for production | Explicit Out-of-Scope decision in `PROJECT.md`; GitHub Pages static hosting with zero build step is a hard constraint | Keep plain `<script>` includes; Vitest's internal use of Vite is a *test-runner implementation detail*, not a production build step |
| `<script type="module">` for the split-out persistence/bridge files | Breaks under `file://` due to CORS on ES module loading; also changes execution-order semantics (`type="module"` scripts are deferred by default) relative to the rest of the classic-script codebase | Classic `<script>` + explicit `window.x = x` assignment + the CJS-export guard (Pattern B) |
| UMD wrapper boilerplate (the classic `(function (root, factory) { ... AMD ... CJS ... })` pattern) | Solves a problem this project doesn't have (AMD/RequireJS support); adds indirection for zero benefit over the much smaller `window.x = x` + `module.exports` guard | Pattern B above — two lines, not a wrapper function |
| `jest` or `jest-environment-jsdom` | No existing Jest investment in this repo; Vitest is faster to set up with zero config for plain Node-flavored logic tests and shares the Vite tooling already implied by "Vitest" in the milestone brief | Vitest 5 |
| Relying on `postMessage(..., '*')` "because it's simpler" | Actively documented vulnerability class; explicitly called out as a Stabilisierung requirement to fix | Exact origin string on every call, both directions |
| One giant serialized blob per IDB key for large/growing datasets (current `LSCG_DB` pattern) | A single write failure (quota) invalidates the whole blob; full re-serialization on every save is wasteful and risks losing everything on a bad write | Per-item keys (already an Active requirement) |

## Stack Patterns by Variant

**If testing code that exists today, unmodified (Stabilisierung phase):**
- Use Pattern A (`vm` script injection) against `items.js`, `bot-data.js`, `outfit-import.js` as-is
- Because the project's own ordering decision requires a test safety net *before* refactoring touches these files

**If writing a brand-new extracted module (Entflechtung phase):**
- Use Pattern B (window assignment + `module.exports` guard) from the first line of the new file
- Because it's naturally test-friendly from birth and still satisfies "plain script includes, no bundler"

**If a test needs to assert on IndexedDB behavior:**
- Always add `fake-indexeddb` regardless of DOM environment
- Because neither `jsdom` nor `happy-dom` implement IndexedDB — this is an orthogonal concern from DOM simulation

**If a test needs to assert on postMessage/bridge logic:**
- Extract a pure `handleBridgeMessage(event, deps)` function and call it directly with constructed fake event objects
- Because it avoids needing any DOM environment or real cross-window messaging just to test origin/shape validation

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| vitest@5.0.0 | @vitest/coverage-v8@5.0.0 | Coverage package major version must track the Vitest major version; pin both to `5` |
| vitest@5.0.0 | Node ≥20 LTS | Vitest 5 requires a current Node LTS; the project's Node v24.12.0 is well within range |
| fake-indexeddb@6.2.5 | vitest@5.0.0 (any environment: node/happy-dom/jsdom) | Works identically regardless of DOM environment since it's not itself a DOM feature |
| happy-dom@20.x / jsdom@30.x | vitest@5.0.0 | Both are valid `test.environment` values in Vitest's config; only one is needed at a time, selectable per-file |

## Sources

- npm registry (`registry.npmjs.org`, direct JSON API) — version numbers for vitest, @vitest/coverage-v8, fake-indexeddb, happy-dom, jsdom, idb-keyval, idb — **HIGH confidence** (primary/authoritative source, not a search result)
- WebSearch: "jsdom vs happy-dom Vitest 2025 recommended default structuredClone postMessage support" — **LOW confidence** (aggregated web search, not cross-checked against Vitest's own docs directly in this session)
- WebSearch: "fake-indexeddb npm Vitest setup example latest version" — **LOW confidence**
- WebSearch: "Vitest test plain global script files no ES modules vm.runInContext" — **LOW confidence** (no single authoritative source found; pattern is a synthesis of general Node/Vitest testing knowledge, cross-checked against how Vite/vite-node's CJS interop is known to work)
- WebSearch: "dual module pattern UMD-like script that works as classic script and ES module without bundler" — **LOW confidence**
- WebSearch: "postMessage targetOrigin wildcard star security MDN best practices 2025" (cross-checked against MDN's own `Window.postMessage()` guidance plus a 2025 Microsoft MSRC blog post on a real postMessage wildcard vulnerability) — **MEDIUM confidence** (verified against a second independent source)
- WebSearch: "IndexedDB QuotaExceededError handling navigator.storage.estimate best practices per-item storage 2025" — **LOW confidence**
- WebSearch: "idb-keyval vs raw IndexedDB API 2025" — **LOW confidence**
- WebSearch: "splitting a large vanilla JS file into ES modules while keeping plain script tag loading" — **LOW confidence**
- WebSearch: "Vitest 5 default coverage provider v8 istanbul recommendation" (cross-checked against the official `vitest.dev/guide/coverage` doc surfaced in results) — **MEDIUM confidence**

**Caveat on tooling:** No Context7/MCP documentation provider was available in this execution environment (`gsd_run query research-plan` returned only `websearch` as fetch provider for every non-registry item). Version numbers were independently verified against the live npm registry (HIGH confidence); pattern/best-practice claims rely on WebSearch synthesis and should be spot-checked against `vitest.dev` and `developer.mozilla.org` directly during phase planning if anything here looks surprising once implementation starts.

---
*Stack research for: no-build vanilla-JS browser tool — testing, module boundaries, postMessage/IndexedDB hardening*
*Researched: 2026-09-12*
