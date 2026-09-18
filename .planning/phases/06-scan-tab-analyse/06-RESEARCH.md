# Phase 6: Scan-Tab & Analyse - Research

**Researched:** 2026-09-19
**Domain:** Client-side JS diff/inventory UI (no framework, no build), Node dev-tooling for a checked-in baseline manifest, static-audit test extension for a second IDB delete API
**Confidence:** HIGH (all core facts read directly from this session's own source files, prior-phase SUMMARYs, and a real console-verified snapshot; no new external libraries or unverified package names are involved)

## Summary

Phase 6 is pure consolidation of what Phase 5 already built: `game-scan.js` writes add-only snapshot records `{id, ts, gameVersion, modCount, mods, sizeBytes, inventory}` into the IDB `snapshots` store via `idbSnapshotPut` [VERIFIED: game-scan.js:94-121, persistence.js:183-210]. Nothing in this phase touches the enumerator or the wire protocol — it is entirely UI (`scan-tab.js`, `index.html` insertions), one new persistence function (`idbSnapshotDelete`), and one dev-only Node script (`tools/build-baseline.js`) plus its Vitest freshness check. No new npm packages are required.

The four requirements decompose cleanly: SCAN-09 (baseline manifest) is a **static extraction problem** — grep the tool's own already-existing source files (`bot-engine.js`, `items.js`, `bot-ui.js`, `bot-data.js`, `loader.js`) for BC identifier patterns and asset-group names, write the result to a checked-in `baseline-manifest.json`, and prove via a Vitest test that regenerating it produces the same file (so it can't silently drift). SCAN-10 (Scan-Tab) is a new tab following the exact same wiring pattern already used four times in this codebase (`money`/`rank`/`shop`/`inventar`) — `TAB_GROUPS` entry, tab-visibility array entry, guarded `switchTab` render call, index.html button + pane — rendering a filtered, paginated list against one selected snapshot with a badge computed by set-membership against the baseline. SCAN-11 (delete) is one new `idbSnapshotDelete(id)` function modeled directly on the existing `idbScreenshotDelete` pattern, gated by `confirm()`, with a **new** static audit test (the existing STAB-09 audit in `tests/delete-confirmation.test.js` is items.js-only and property-delete-regex-only — it structurally cannot and does not cover an IDB-store `.delete()` call in a different file). SCAN-12 (analysis doc) is a planning artifact, not code — it needs one human step (export a real snapshot as JSON) before an agent can write `.planning/analysis/GAME-INVENTORY.md`.

**Primary recommendation:** Build the baseline manifest generator and its freshness test FIRST (Wave 0/1) — the Scan-Tab's badge computation is meaningless without it, and the generator itself needs zero new dependencies (pure `fs`/`path`, same as every other script in this repo).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Baseline manifest generation (SCAN-09) | Dev tooling (Node, offline) | — | Runs against the repo's own `.js` source files on disk; never runs in the browser; output is a checked-in static JSON asset, not a runtime computation |
| Baseline manifest consumption (badge diff) | Browser / Client (`scan-tab.js`) | — | `fetch`/inline-load of the committed `baseline-manifest.json`, compared in-memory against the selected snapshot — no server round-trip, single-user static-hosted tool |
| Scan-Tab rendering, search, filter (SCAN-10) | Browser / Client (`scan-tab.js`) | — | Direct DOM manipulation matching every other tab module (`shop.js`, `rank.js`, `inventar.js`) — no framework in this codebase |
| Snapshot storage/read/delete (SCAN-08 done, SCAN-11 new) | Database / Storage (`persistence.js`, IndexedDB `snapshots` store) | — | Persistence layer already isolated behind `idbSnapshot*` functions since Phase 4 (SPLIT-01); a delete function belongs beside its siblings, not in `scan-tab.js` |
| Delete confirmation gate (SCAN-11) | Browser / Client (`scan-tab.js`, calling `confirm()`) | — | Matches the established STAB-09 pattern: the UI layer owns the `confirm()` call, the persistence layer only executes what it's told |
| Snapshot export for analysis (SCAN-12 input) | Browser / Client (`scan-tab.js`, `Blob`/`URL.createObjectURL`) | — | Identical mechanism to `exportScreenshotsOnly()` (Phase 4, SPLIT-07) — no new architecture needed |
| Analysis document authoring (SCAN-12) | Planning artifact (outside the app; human + agent) | — | `.planning/analysis/GAME-INVENTORY.md` is Markdown written by reading an exported JSON file, not application code |

## Project Constraints (from CLAUDE.md)

Extracted from `./.claude/CLAUDE.md` — the planner must not propose anything that violates these:

- **Datenschutz-Regel:** scanned data (including snapshots) is never auto-deleted or overwritten; manual delete requires confirmation. Directly binds SCAN-11 — no "delete all" without per-item confirmation, no automatic pruning ever.
- **Tech-Stack:** vanilla JS, no build step in production. `scan-tab.js` must be a classic `<script>` file, global-scope, no ES modules, no bundler. `tools/build-baseline.js` is exempt (it's a **dev-only** Node script that produces a committed data file — it never runs in the deployed page and is not a build step for GitHub Pages).
- **Kompatibilität:** existing IDB keys/stores must stay migratable — adding `idbSnapshotDelete` must not touch the `snapshots` store's schema (`_IDB_VERSION` stays at 3; deleting a record is a normal `readwrite` transaction, not a schema change).
- **Sicherheit:** the bridge is the only trust boundary; this phase adds no bridge traffic at all (SCAN-09..12 are 100% local to the tool window — no new `postMessage` types, no loader.js changes).
- **Reihenfolge:** Phase 5's tests must stay green; this phase's new tests must not regress the 23-file / 321-passed baseline (see 05-03-SUMMARY.md).
- **response_language:** German prose for user-facing text and docs (index.html labels, `GAME-INVENTORY.md` prose); identifiers stay English (function/variable names), matching the codebase's own convention (German UI strings, English/German-mixed identifiers per the naming-patterns section of CLAUDE.md).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-09 | Baseline-Manifest listet, welche Spielfunktionen/Assets/Hooks Tool + Bot-Editor bereits nutzen | See "Pattern 1: Static Baseline Extraction" — regex set, verified counts against current source, `tools/build-baseline.js` + Vitest freshness test design |
| SCAN-10 | Scan-Tab: durchsuchbar, Kategorie-Filter, Badge „bereits genutzt"/„neu" | See "Pattern 2: Scan-Tab Wiring" — exact TAB_GROUPS/switchTab/index.html insertion points, virtualization/paging design for ~18.7k globals + 4.7k assets + 546 patches |
| SCAN-11 | Snapshots nur manuell + Bestätigung löschbar | See "Pattern 3: idbSnapshotDelete" — modeled on `idbScreenshotDelete`, new static audit test (cannot reuse `tests/delete-confirmation.test.js` as-is) |
| SCAN-12 | Analyse-Dokument `.planning/analysis/GAME-INVENTORY.md` mit Vorschlagsliste | See "Pattern 4: Export + Analysis Doc" — human export step, doc structure, precedent (MBS "new items" screen per FEATURES.md) |
</phase_requirements>

## Standard Stack

No new external packages for this phase. Everything is built on tools already present in the repo.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | bundled with Node ≥22.12.0 (already required, see `package.json` `engines`) [VERIFIED: package.json:6-8] | `tools/build-baseline.js` reads source files and writes `baseline-manifest.json` | Every other script/test helper in this repo (`tests/helpers/loadScript.js`) uses only `fs`/`path`/`vm` — zero new dependencies is the established pattern |
| Vitest 5.0.0 (already a devDependency) [VERIFIED: package.json:14] | 5.0.0 | Freshness test for the baseline manifest, plus all new SCAN-09..12 test files | Already the project's sole test runner (TEST-01) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | This phase adds no runtime dependency; `scan-tab.js` is plain DOM code like `shop.js`/`rank.js` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written regex extraction (`tools/build-baseline.js`) | A JS parser (acorn/esprima/babel) for a "real" AST-based identifier extraction | Rejected: adds a new npm dependency for a one-off, dev-only, offline script; regex-over-source-text is already this codebase's own established pattern for source audits (`tests/delete-confirmation.test.js`'s `DELETE_RE`/`FN_RE`, `tests/screenshot-export.test.js`'s body-slice checks) — consistency with existing test style outweighs parser precision here |
| Full virtualized list library (e.g. a windowing package) for the Scan-Tab | Manual "render first N, click to load more" pagination | Rejected: new dependency for a single-user static tool with no other virtualization anywhere in the codebase; a plain slice-and-render with a debounced search input (`_debounce`, already in `persistence.js` [VERIFIED: persistence.js:358-364]) is proportionate to the ~18.7k-row worst case |

### Installation
No install step. `tools/build-baseline.js` is invoked with plain `node tools/build-baseline.js`; it is never referenced from `index.html` or any `<script>` tag.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages (npm, pip, or otherwise). No `package.json` changes are needed.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  DEV TIME (offline, human-triggered, not shipped to browser)     │
│                                                                   │
│  bot-engine.js ─┐                                                │
│  items.js ──────┼──▶ tools/build-baseline.js ──▶ baseline-       │
│  bot-ui.js ─────┤       (regex extraction,          manifest.json │
│  bot-data.js ───┤        asset-group allowlist       (committed)  │
│  loader.js ─────┘        cross-reference)                        │
│                                                                   │
│  tests/baseline-manifest.test.js: re-run generator in-memory,    │
│  diff against committed file → fails if stale                    │
└─────────────────────────────────────────────────────────────────┘
                              │ (committed file, loaded like a script/JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER (tool window, static hosting)                           │
│                                                                   │
│  User clicks "🔎 Spiel scannen" (existing, Phase 5)               │
│        │                                                          │
│        ▼                                                          │
│  game-scan.js → idbSnapshotPut → IDB store `snapshots` (existing)│
│                                                                   │
│  User opens Scan-Tab (NEW, this phase)                            │
│        │                                                          │
│        ▼                                                          │
│  scan-tab.js:                                                    │
│    1. idbSnapshotGetAll() → snapshot picker (newest default)     │
│    2. load baseline-manifest.json (fetch or inline <script>)     │
│    3. flatten selected snapshot.inventory into rows              │
│         {category, name, usedByTool: bool}                       │
│    4. debounced search + category filter → slice(0,300) render  │
│    5. "🗑" per snapshot → confirm() → idbSnapshotDelete(id)       │
│    6. "⬇ Snapshot exportieren" → Blob/JSON download              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │ (human exports snapshot.json, places it)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PLANNING ARTIFACT (outside the running app)                     │
│  .planning/analysis/GAME-INVENTORY.md — agent reads exported     │
│  snapshot.json + baseline-manifest.json, writes proposals doc    │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
tools/
└── build-baseline.js        # dev-only Node script — NOT loaded by index.html
baseline-manifest.json       # committed output, loaded by scan-tab.js
scan-tab.js                  # new tab module, loads after game-scan.js
persistence.js               # + idbSnapshotDelete (one new function)
tests/
├── baseline-manifest.test.js    # regenerate-and-diff freshness test
├── scan-tab.test.js              # rendering/search/filter tests
├── snapshot-delete.test.js       # STAB-09-style confirm+audit tests (or extend delete-confirmation.test.js's pattern, new file)
└── scan-tab-export.test.js       # modeled on screenshot-export.test.js
.planning/analysis/
└── GAME-INVENTORY.md          # SCAN-12 output (planning artifact, not shipped)
```

### Pattern 1: Static Baseline Extraction (SCAN-09)

**What:** A Node script reads the tool's own source files as text and extracts BC-identifier-shaped tokens via regex, producing a checked-in JSON manifest of "things the tool already references."

**Verified today's yield** — run this session directly against the current repo (`node -e`, regex `/\b(Inventory|Character|ChatRoom|Server|Asset|Player|Dialog|Common|Item|Lock|Wardrobe|Pose|Skill|Reputation|Online|Chat)[A-Z]\w+/g` over `bot-engine.js`, `items.js`, `bot-ui.js`, `bot-data.js`, `loader.js`) [VERIFIED: ran `node -e` this session against the five listed files in the repo root]:

| File | Raw matches | Unique identifiers |
|------|------------|---------------------|
| `bot-engine.js` | 216 | 21 |
| `items.js` | 208 | 25 |
| `bot-ui.js` | 32 | 30 |
| `bot-data.js` | 1 | 1 |
| `loader.js` | 142 | 61 |
| **Total (all files)** | **599** | **83 unique** |

Sample of the 83 unique identifiers found: `ChatRoomRegisterMessageHandler`, `InventoryGet`, `InventoryWear`, `InventoryLock`, `InventoryRemove`, `ServerSend`, `ServerPlayerAppearanceSync`, `AssetGroup`, `AssetGet`, `CharacterRefresh`, `ItemNeck`, `ItemTorso`, `ItemPelvisModularChastityBeltOption`, `LockMemberNumber`, `LockPickSeed`, `DialogPrefix`, `ChatSetting` [VERIFIED: same `node -e` run].

**Important classification gotcha found during verification:** many `Item*` matches (`ItemNeck`, `ItemTorso`, `ItemVulva`, …) are **AssetGroup names used as string literals**, not function calls — they appear as group identifiers in item-picker code, not as callable game functions. The generator must **not** dump every regex hit into one flat "functions" bucket; it must cross-reference each hit against the snapshot's own `inventory.assets.groups[].Name` list and `inventory.globals.functions[].name` list (both already produced by the Phase-5 enumerator, see the schema-1 contract below) to classify each baseline entry as `function` / `assetGroup` / `unknown` before badges are computed. An entry that matches neither is not necessarily wrong — the source pattern may reference a name the current game version doesn't expose — record it as `unknown` and don't fail the build over it.

**When to use:** Run manually whenever the tool's own bot-engine/items/bot-ui/bot-data/loader source changes in a way that references new BC identifiers — i.e., whenever a phase adds a new game function/asset-group reference to the tool. Not run automatically as a build step (`response contract` explicitly forbids build steps in production), but the Vitest freshness test catches drift on every `npm test`.

**Design for `tools/build-baseline.js`:**
```javascript
// tools/build-baseline.js — dev-only, never loaded by index.html.
// Regenerates baseline-manifest.json. Run manually after touching
// bot-engine.js/items.js/bot-ui.js/bot-data.js/loader.js.
const fs = require('fs');
const path = require('path');

const SOURCE_FILES = ['bot-engine.js', 'items.js', 'bot-ui.js', 'bot-data.js', 'loader.js'];
const IDENTIFIER_RE = /\b(Inventory|Character|ChatRoom|Server|Asset|Player|Dialog|Common|Item|Lock|Wardrobe|Pose|Skill|Reputation|Online|Chat)[A-Z]\w+/g;
// Chat-hook API is checked separately (fixed, small allowlist — not regex-derived):
const CHAT_HOOK_NAMES = ['ChatRoomRegisterMessageHandler'];

function extractBaseline(repoRoot) {
  const names = new Set();
  for (const file of SOURCE_FILES) {
    const src = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    for (const m of src.matchAll(IDENTIFIER_RE)) names.add(m[0]);
  }
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    sourceFiles: SOURCE_FILES,
    identifiers: [...names].sort(),
    chatHooks: CHAT_HOOK_NAMES,
  };
}

module.exports = { extractBaseline, SOURCE_FILES, IDENTIFIER_RE };

if (require.main === module) {
  const repoRoot = path.resolve(__dirname, '..');
  const manifest = extractBaseline(repoRoot);
  fs.writeFileSync(path.join(repoRoot, 'baseline-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('baseline-manifest.json written:', manifest.identifiers.length, 'identifiers');
}
```

`generatedAt` must be **excluded** from the freshness diff (it changes every run) — the freshness test should compare `identifiers`/`sourceFiles`/`chatHooks` only, not the whole file byte-for-byte.

**Freshness test (Vitest, Wave 0 gap):**
```javascript
// tests/baseline-manifest.test.js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extractBaseline } from '../tools/build-baseline.js'; // requires build-baseline.js to also work as a CJS-requirable module (Dual-Export pattern, same as persistence.js)
import { REPO_ROOT } from './helpers/loadScript.js';

describe('baseline-manifest.json ist aktuell (SCAN-09)', () => {
  it('committed manifest stimmt inhaltlich mit einer frischen Generierung überein', () => {
    const committed = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'baseline-manifest.json'), 'utf8'));
    const fresh = extractBaseline(REPO_ROOT);
    expect(committed.identifiers).toEqual(fresh.identifiers);
    expect(committed.chatHooks).toEqual(fresh.chatHooks);
    expect(committed.sourceFiles).toEqual(fresh.sourceFiles);
  });
});
```

### Pattern 2: Scan-Tab Wiring (SCAN-10)

**Exact insertion points, all read this session:**

1. **`items.js` TAB_GROUPS** [VERIFIED: items.js:4223-4226 — `const TAB_GROUPS = { items: ['items','outfit','curse','outfit-scan','lscg-wheel','outfit-import','locks'], bots: ['bot','shop','rank','money','itemdefs','inventar','log','spieler','variablen'] };`] — add `'scan'` to the `bots` array (matches ROADMAP's Bot-group placement; the scan tab is reached via the 🤖 Bots obertab, alongside `shop`/`rank`/`inventar`).

2. **`items.js` `switchTab`'s hardcoded visibility array** [VERIFIED: items.js:4253 — `['items','outfit','curse','bot','log','money','events','rank','shop','outfit-import','outfit-scan','lscg-wheel','locks','spieler','variablen','itemdefs','inventar'].forEach(t => {...})`] — this is a **second, separate list from TAB_GROUPS** that toggles `.active` on the tab pane and its button. `'scan'` must be added here too, or the tab pane will never show/hide correctly. (Note the pre-existing `'events'` entry that has no TAB_GROUPS membership — a latent inconsistency in the existing code, not something to fix in this phase, but proof that these two lists are genuinely independent and both need editing.)

3. **`items.js` guarded render call** — add one line following the exact convention already used for `itemdefs`/`inventar` [VERIFIED: items.js:4265-4266 — `if (tab === 'itemdefs') { if (typeof renderItemDefsTab === 'function') renderItemDefsTab(); } if (tab === 'inventar') { if (typeof renderInventarTab === 'function') renderInventarTab(); }`]: add `if (tab === 'scan') { if (typeof renderScanTab === 'function') renderScanTab(); }`. This is the **only** runtime coupling `items.js` needs to `scan-tab.js` — and it's guarded, so `scan-tab.js` can load after `items.js` without a load-order guard on the `items.js` side (matches the SPLIT-02 "no items.js change needed for new message types" spirit, extended to tab rendering).

4. **`index.html` tab button** [VERIFIED: index.html:2547-2555, existing bot-group buttons e.g. `<button class="tab-btn" id="tab-shop-btn" onclick="switchTab('shop')">🛒 Shop</button>`] — insert `<button class="tab-btn" id="tab-scan-btn" onclick="switchTab('scan')">🔎 Scan</button>` among the other bot-group buttons (after `tab-inventar-btn` or `tab-variablen-btn`, insertion only, no existing line touched).

5. **`index.html` tab pane** [VERIFIED: index.html:3892-3894 markup analog `<div id="tab-inventar" class="tab-pane"><div style="padding:16px 18px">`] — new `<div id="tab-scan" class="tab-pane">…</div>` block, same shell.

6. **`index.html` script load** [VERIFIED: index.html:3546-3554 write block, and the LADEREIHENFOLGE comment on line 3106] — add `document.write('<scr'+'ipt src="scan-tab.js?_='+_cbv+'"><\/scr'+'ipt>');` **after** the `game-scan.js` line (position 8, before `money.js`), since `scan-tab.js` needs `idbSnapshotGetAll`/`idbSnapshotDelete` (persistence.js) and reads the `bots` TAB_GROUPS entry (items.js) but has no dependency on money/rank/shop/inventar. The existing LADEREIHENFOLGE **comment line** (3106) is expected to be edited (not just inserted) to append `→ scan-tab.js` — Phase 5 already established this precedent by editing the same comment line to insert `→ game-scan.js` [VERIFIED: 05-03-SUMMARY.md — "index.html-Kommentar ergänzt" pattern, and the current line 3106 text already contains "→ game-scan.js →"].

7. **`docs/LOAD-ORDER.md`** [VERIFIED: docs/LOAD-ORDER.md full file, "Neues Modul hinzufügen" 5-step checklist] — add table row for `scan-tab.js` at position 8 (renumbering `money.js`→9 through `bc-autobackup.js`→17), update the guard paragraph, and per the checklist's own step 4: **do not** add `scan-tab.js` to `CORE_SCRIPTS`, because "only add to `CORE_SCRIPTS` if the new module is a runtime prerequisite for `items.js` or `bot-ui.js`" [VERIFIED: docs/LOAD-ORDER.md:57] — `scan-tab.js` is a leaf consumer, nothing requires it. This exactly matches why `money.js`/`rank.js`/`shop.js`/`inventar.js` are also absent from `CORE_SCRIPTS` [VERIFIED: tests/helpers/loadScript.js:40 — `CORE_SCRIPTS = ['persistence.js', 'bridge.js', 'items.js', 'game-scan.js']`].

**Data volume and rendering strategy** — real numbers from the one live 28-mod scan already captured [VERIFIED: 05-CONSOLE-FINDINGS.md — "window hat 18.700 eigene Properties", "4.764 Assets, 120 Gruppen", "getPatchingInfo() → Map (546 Einträge)"]:

- `inventory.globals` ≈ 18,700 entries (getters + functions + values, already bucketed by `giReadData` classification per the schema-1 contract [VERIFIED: 05-02-SUMMARY.md snapshot-contract block: `globals: { total, getters: [Name], functions: [{name, arity}], values: [{name, type}], byPrefix: {...}, inventory: {groups:[...], other:{...}} }`])
- `inventory.assets.items` ≈ 4,764 entries, 120 groups
- `inventory.modSdk.patching` ≈ 546 entries
- `inventory.probes` — fixed 5 mods + sweep array
- `inventory.chatHooks` — small, fixed shape

Rendering all ~24,000 rows unfiltered would freeze the tool tab (the same class of problem SCAN-07 solved for the *game* tab — this phase must solve the analogous problem for the *tool* tab). Recommended approach, consistent with the codebase's existing `_debounce` helper [VERIFIED: persistence.js:358-364]:

```javascript
// scan-tab.js sketch — flatten once per snapshot selection, filter+slice on every keystroke
function _scanFlatten(inventory) {
  const rows = [];
  for (const g of inventory.globals.getters || [])   rows.push({ category: 'globals', kind: 'getter',   name: g });
  for (const f of inventory.globals.functions || [])  rows.push({ category: 'globals', kind: 'function', name: f.name, arity: f.arity });
  for (const v of inventory.globals.values || [])     rows.push({ category: 'globals', kind: 'value',    name: v.name, type: v.type });
  for (const a of (inventory.assets.items || []))     rows.push({ category: 'assets',  kind: 'item',     name: a.Name || a.ItemName, group: a.Group });
  for (const grp of (inventory.assets.groups || []))  rows.push({ category: 'groups',  kind: 'group',    name: grp.Name });
  for (const p of (inventory.modSdk.patching || []))  rows.push({ category: 'patching', kind: 'hook',    name: p.name, hookedByMods: p.hookedByMods });
  for (const m of (inventory.mods || []))             rows.push({ category: 'mods',    kind: 'mod',      name: m.name, version: m.version });
  return rows;
}

const _scanBadgeSets = { functions: new Set(), assetGroups: new Set(), chatHooks: new Set() };
function _scanBadge(row) {
  if (row.category === 'globals' && row.kind === 'function') return _scanBadgeSets.functions.has(row.name) ? 'genutzt' : 'neu';
  if (row.category === 'groups') return _scanBadgeSets.assetGroups.has(row.name) ? 'genutzt' : 'neu';
  return 'neu'; // unklassifizierte Kategorien defaulten auf "neu" statt falsch "genutzt" zu behaupten
}

const _scanRenderDebounced = _debounce(_scanRender, 150);
const SCAN_PAGE_SIZE = 300;
let _scanRowsCache = [];
let _scanShown = SCAN_PAGE_SIZE;

function _scanRender() {
  const q = (document.getElementById('scanSearch')?.value || '').toLowerCase();
  const cat = document.getElementById('scanCategory')?.value || 'all';
  const filtered = _scanRowsCache.filter(r =>
    (cat === 'all' || r.category === cat) &&
    (!q || r.name.toLowerCase().includes(q))
  );
  const slice = filtered.slice(0, _scanShown);
  const el = document.getElementById('scanList');
  if (el) el.innerHTML = slice.map(r =>
    `<div class="scan-row"><span class="scan-cat">${escHtml(r.category)}</span> ` +
    `<span class="scan-name">${escHtml(r.name)}</span> ` +
    `<span class="scan-badge scan-badge-${_scanBadge(r)}">${_scanBadge(r) === 'genutzt' ? 'bereits genutzt' : 'neu'}</span></div>`
  ).join('') + (filtered.length > _scanShown ? `<button onclick="_scanLoadMore()">mehr laden (${filtered.length - _scanShown} weitere)</button>` : '');
}
function _scanLoadMore() { _scanShown += SCAN_PAGE_SIZE; _scanRender(); }
```

Every user-controlled string (mod names, asset names, patch function names — all come from the *game*/mod tab, which this tool does not control) is rendered via `escHtml()` inside a template literal, matching the codebase's own documented convention [VERIFIED: items.js:6504-6520 `escHtml`/`escJsAttr` definitions and the CLAUDE.md "HTML Escaping & Attribute Safety" section]. Do **not** use `escJsAttr` here — there are no `onclick="fn('${...}')"` calls carrying untrusted mod-derived strings in the sketch above; if the plan adds a per-row action button that embeds a mod/asset name into an inline handler, `escJsAttr` must be used for that attribute per the same convention.

### Pattern 3: `idbSnapshotDelete` (SCAN-11)

**Model directly on the existing screenshot-delete pair** [VERIFIED: persistence.js:118-148]:
```javascript
async function idbScreenshotBatch(kind, puts, deletes) { /* ... */ }
function idbScreenshotDelete(kind, key) { return idbScreenshotBatch(kind, [], [key]); }
```

The snapshot store is simpler (no batching, no keyPath-prefix range query) — one record, one delete:

```javascript
// persistence.js — add beside idbSnapshotPut/GetAll/Get/Keys (SCAN-11).
// Snapshots leave add-only territory only through this explicit, confirmed
// delete path — no other function in the codebase may call
// tx.objectStore(_IDB_SNAPSHOTS).delete(...).
async function idbSnapshotDelete(id) {
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_SNAPSHOTS, 'readwrite');
      tx.objectStore(_IDB_SNAPSHOTS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
      tx.onabort    = e => reject(tx.error || e.target.error);
    });
    return true;
  } catch (err) { console.warn('[IDB] snapshot delete:', err); return false; }
}
```

Add to the Dual-Export tail [VERIFIED: persistence.js:366-375 existing `module.exports` block] alongside the other `idbSnapshot*` names.

`scan-tab.js` calls it behind `confirm()`, matching the STAB-09 pattern's guard-order convention [VERIFIED: 02-02-SUMMARY.md `patterns-established`: "Löschpfad-Guard-Reihenfolge: Existenz-Prüfung → confirm() → Cleanup-Helfer → eigentliche Mutation → Save → Status"]:
```javascript
async function scanDeleteSnapshot(id) {
  if (!confirm('Diesen Scan-Snapshot wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return;
  const ok = await idbSnapshotDelete(id);
  if (!ok) { showStatus('❌ Snapshot konnte nicht gelöscht werden', 'error'); return; }
  showStatus('✅ Snapshot gelöscht', 'success');
  await renderScanTab();
}
```

**Why the existing STAB-09 static audit (`tests/delete-confirmation.test.js`) cannot be extended in place** [VERIFIED: tests/delete-confirmation.test.js:135-181, full file read]: its `DELETE_RE` only matches property-delete syntax against **one hardcoded file, `items.js`** — `/delete (LSCG_SCREENSHOTS|PROFILE_SCREENSHOTS|_mbsWheelShots|LSCG_DB)\[|^\s*(LSCG_SCREENSHOTS|PROFILE_SCREENSHOTS|_mbsWheelShots|LSCG_DB)\s*=\s*\{\}/` and its `FN_RE` walks `items.js`'s own line array. An IDB `tx.objectStore(...).delete(id)` call inside `persistence.js` matches neither the store-name list nor the file being scanned. **This phase needs a new, analogous static audit**, not a patch to the existing one:

```javascript
// tests/snapshot-delete.test.js — SCAN-11, modeled on tests/delete-confirmation.test.js's audit shape
// but scoped to persistence.js (the IDB delete call) + scan-tab.js (the confirm() gate),
// since STAB-09's own audit is items.js/property-delete-specific and does not cover this call.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, REPO_ROOT } from './helpers/loadScript.js';

describe('Snapshot-Löschen nur mit Bestätigung (SCAN-11)', () => {
  it('confirm → false löscht nichts, fragt genau einmal', async () => {
    let calls = 0;
    const ctx = loadScript(['items.js', 'scan-tab.js'], { confirm: () => { calls++; return false; } });
    // seed one snapshot via idbSnapshotPut, then call scanDeleteSnapshot(id)...
    expect(calls).toBe(1);
    // assert idbSnapshotGetAll() still contains the record
  });

  it('idbSnapshotDelete ist die einzige .delete(-Zeile auf dem snapshots-Store in persistence.js', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'persistence.js'), 'utf8');
    const hits = [...src.matchAll(/_IDB_SNAPSHOTS\)\.delete\(/g)];
    expect(hits.length).toBe(1); // nur in idbSnapshotDelete selbst
  });

  it('scan-tab.js ruft idbSnapshotDelete ausschließlich hinter confirm() auf', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'scan-tab.js'), 'utf8');
    const fnBody = src.slice(src.indexOf('async function scanDeleteSnapshot'));
    const confirmIdx = fnBody.indexOf('confirm(');
    const deleteIdx = fnBody.indexOf('idbSnapshotDelete(');
    expect(confirmIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(confirmIdx);
  });
});
```

Use the op-spy pattern already proven for the screenshot store to assert the IDB call actually happens [VERIFIED: tests/screenshot-store.test.js:19-43 `installOpSpy` wrapping `IDBObjectStore.prototype.put`/`.delete`] and the add-spy pattern already proven for the snapshot store specifically [VERIFIED: tests/game-scan-bridge.test.js:58-74 `installAddSpy` wrapping `IDBObjectStore.prototype.add`, `store: this.name` filter] — the same technique, swapped to `.delete` and filtered to `store === 'snapshots'`.

**No "delete all" for snapshots** — SCAN-11's text and the Out of Scope table both forbid bulk/automatic removal [VERIFIED: REQUIREMENTS.md:56, 90 — "Automatisches Aufräumen/Pruning von Snapshots oder Scan-Daten | Verletzt den Kernwert"]. Unlike the LSCG screenshot paths (which do have `clearAllLscgScreenshots` etc.), snapshots get **only** a per-record delete button.

### Pattern 4: Export + Analysis Doc (SCAN-12)

**Export button, modeled directly on `exportScreenshotsOnly()`** [VERIFIED: tests/screenshot-export.test.js full file — `Blob`/`URL.createObjectURL`/anchor-click pattern, `_meta` shape with `version`/`tool`/`exportedAt`/`counts`]:

```javascript
function exportSnapshotAsJson(id) {
  idbSnapshotGet(id).then(record => {
    if (!record) { showStatus('❌ Snapshot nicht gefunden', 'error'); return; }
    try {
      const payload = { _meta: { version: 1, tool: 'BC Universal Configurator Snapshot-Export', exportedAt: new Date().toISOString() }, ...record };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'BC_Snapshot_' + record.ts + '.json';
      a.click();
      showStatus('✅ Snapshot exportiert', 'success');
    } catch (e) { showStatus('❌ Export fehlgeschlagen: ' + (e?.message || e), 'error'); }
  });
}
```

**The human step this phase must plan for explicitly:** SCAN-12's analysis doc is authored by reading a real exported snapshot, not by code running inside the browser. The plan should include an explicit non-code task: *"Nutzer öffnet den Scan-Tab, wählt den zuletzt aufgenommenen 28-Mod-Snapshot, klickt ⬇ Snapshot exportieren, legt die Datei unter `.planning/analysis/snapshot.json` ab"* — **before** the task that writes `GAME-INVENTORY.md`. This mirrors SCAN-13's already-successful pattern in Phase 5 (user ran a console snippet, pasted results, which became `05-CONSOLE-FINDINGS.md`) [VERIFIED: 05-CONSOLE-FINDINGS.md:1-3 "Quelle: Nutzer hat das unten stehende Snippet in der Konsole des BC-Tabs ausgeführt"].

**Analysis doc structure** — precedent for a diff-against-baseline UI already exists inside the BC ecosystem itself (MBS's "new items in this version" screen) [CITED: .planning/research/FEATURES.md:33 "MBS ships 'a new screen showing all items added in the current BC version'"], which validates the shape but does not prescribe a file format — recommend:

```markdown
# GAME-INVENTORY.md — Snapshot vs. Baseline (SCAN-12)

**Snapshot:** <ts, gameVersion, modCount> · **Baseline:** <baseline-manifest.json generatedAt>

## Zusammenfassung
- Globals: N gesamt, M bereits genutzt, K neu
- Assets/Gruppen: ...
- Chat-Hooks: ...
- Mods (bcModSdk + Fallback-Probes): ...

## Top-Vorschläge
| # | Fund (Kategorie, Name) | Warum interessant | Vorschlag |
|---|------------------------|--------------------| ---------|
| 1 | patching, CommonDrawAppearanceBuild (gehookt von LSCG, BCT) | zeigt, was bereits von zwei Mods beansprucht ist | Hook-Konflikt-Hinweis im Bot-Editor (v2, siehe SCAN-P2-03) |
| ... | | | Trigger-Skelett / Action-Parameter / Tab-Idee — manuell zu prüfen, nie automatisch generierter Code (Anti-Feature) |

## Nicht übernommen (bewusst)
...
```

Each proposal row must stay a *suggestion requiring manual review* — never a generated, ready-to-run bot snippet, per the project's explicit Out-of-Scope entry ("Automatisch generierter Bot-Code ohne Review") [VERIFIED: REQUIREMENTS.md:89].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Identifier extraction from source | A JS AST parser dependency | Regex-over-source-text (`tools/build-baseline.js`) | Matches the codebase's own established audit style (`DELETE_RE`/`FN_RE` in `tests/delete-confirmation.test.js`, body-slice checks in `tests/screenshot-export.test.js`); one dev-only, offline script does not justify a new npm dependency |
| Large-list rendering performance | A virtual-scrolling library | Filter-then-`slice(0, N)` + "mehr laden" button, debounced search | No other tab in this codebase virtualizes lists; ~18.7k rows filtered to a search term is almost always far below 300 matches in practice, and unfiltered browsing is opt-in via repeated "mehr laden" clicks |
| Snapshot delete confirmation | A generic modal/dialog component | The same `confirm()` used by all ten existing STAB-09 delete paths | Zero new UI code, and the existing static-audit *style* (even though a new test file is needed) is proven and understood |
| JSON export/download | A file-saving library | `Blob` + `URL.createObjectURL` + `<a download>` | Exact mechanism already used by `exportScreenshotsOnly()` and `exportAllData()` — proven, tested, zero new dependencies |

**Key insight:** every piece of this phase has a near-identical precedent already merged and tested somewhere in this same repository from Phases 2, 4, and 5. The main risk is not "what pattern to use" but "don't assume an existing test/audit already covers the new file" — see Pattern 3's static-audit gap.

## Common Pitfalls

### Pitfall 1: Assuming `TAB_GROUPS` alone controls tab visibility
**What goes wrong:** A plan adds `'scan'` only to `TAB_GROUPS.bots` and the tab button never becomes visible/active because `switchTab`'s separate hardcoded array (line 4253) doesn't include it.
**Why it happens:** The two lists look redundant but are independently maintained; `TAB_GROUPS` controls the obertab group switch, the second array controls per-tab `.active` toggling.
**How to avoid:** Every task that adds a tab must touch both lists plus the guarded render-call line — three edits to `items.js`, not one.
**Warning signs:** Tab button highlights but the pane never shows, or the pane shows but never triggers its render function.

### Pitfall 2: Testing rendered `innerHTML` against a stale DOM stub
**What goes wrong:** `tests/helpers/loadScript.js`'s default `document.getElementById()` returns a **brand-new stub on every call** [VERIFIED: tests/helpers/loadScript.js:127-129 `getElementById() { return makeElementStub(); }`] — a naive test that calls `renderScanTab()` then separately calls `ctx.document.getElementById('scanList')` to check `.innerHTML` will always see an empty fresh stub, never the one the render function actually wrote to.
**Why it happens:** The sandbox optimizes for "never throw on missing elements," not "track element identity."
**How to avoid:** Override `ctx.document.getElementById = (id) => id === 'scanList' ? capturedEl : makeElementStub();` **before** calling the render function, exactly as done for `#storageInfo` and `#execLogInfo` [VERIFIED: tests/storage-estimate.test.js:14-18 `captureInfo`, tests/exec-log.test.js:15-18 analogous pattern].
**Warning signs:** A rendering test that always passes trivially (asserting on an empty string) is the classic symptom.

### Pitfall 3: Confusing asset-group names with function names in the baseline
**What goes wrong:** Regex extraction of `Item*`-prefixed tokens pulls in `ItemNeck`, `ItemTorso`, etc. — these are **asset group name string literals**, not callable functions — verified today in this session's own extraction run. Treating them as "used functions" and comparing them against `snapshot.inventory.globals.functions` will always show them as "new" (false positive) because they were never functions to begin with.
**Why it happens:** A single flat regex over source text cannot distinguish "this identifier is called as a function" from "this identifier is a group-name string literal."
**How to avoid:** Classify each baseline entry against both `inventory.assets.groups[].Name` and `inventory.globals.functions[].name` (both already present in the schema-1 contract) before badge computation; anything matching neither is `unknown`, not silently wrong.
**Warning signs:** The Scan-Tab shows well-known, long-used asset groups (e.g. `ItemNeck`) flagged "neu."

### Pitfall 4: Extending the wrong static audit for SCAN-11
**What goes wrong:** A plan tries to add the snapshot delete path to `tests/delete-confirmation.test.js`'s `CONFIRM_REQUIRED`/`ALLOWED_WITHOUT_CONFIRM` lists, assuming that test's audit already generalizes.
**Why it happens:** STAB-09's audit is the only precedent in the codebase for "prove every delete path requires confirm()," so it's tempting to reuse it directly.
**How to avoid:** Read the audit's actual regex scope first (see Pattern 3) — it's items.js-only and property-delete-only. Write a new, narrower audit scoped to `persistence.js` (the `.delete(` call site) and `scan-tab.js` (the `confirm()` gate).
**Warning signs:** A "green" STAB-09 test suite that never actually executed a single assertion against the new snapshot-delete code path.

### Pitfall 5: Forgetting `generatedAt` in the freshness diff
**What goes wrong:** The Vitest freshness test for `baseline-manifest.json` compares the whole JSON file byte-for-byte, including a `generatedAt` timestamp — the test fails on every run even when the actual identifier list hasn't changed, because `generatedAt` differs each time the generator runs.
**Why it happens:** Copy-pasting a naive `toEqual(fullFreshObject)` instead of comparing only the semantically meaningful fields.
**How to avoid:** Compare `identifiers`/`chatHooks`/`sourceFiles` explicitly (see Pattern 1's test sketch), never the whole object.
**Warning signs:** A freshness test that's red immediately after `node tools/build-baseline.js` was just run with no source changes.

## Code Examples

See the four inline code blocks under "Architecture Patterns" above (`tools/build-baseline.js`, `_scanFlatten`/`_scanRender`, `idbSnapshotDelete`/`scanDeleteSnapshot`, `exportSnapshotAsJson`) — all modeled on source read this session, not invented from scratch.

## State of the Art

| Old Approach (Phase 5, done) | Current Approach (Phase 6) | When Changed | Impact |
|--------------------------|------------------|-----------|--------|
| Snapshot is write-only (add-only, no read UI, no delete) | Snapshot gains a read/browse UI (Scan-Tab) and a confirmed, single-record delete | This phase | First time a user can inspect scan contents without opening DevTools; first (only) delete path for the `snapshots` store |
| No notion of "used vs new" | Baseline manifest + badge computation | This phase | Turns a raw dump into an actionable diff, matching the MBS "new items" precedent already validated in the BC ecosystem [CITED: .planning/research/FEATURES.md] |

**Deprecated/outdated:** Nothing in this phase deprecates prior work — Phase 5's enumerator, wire protocol, and add-only store are all consumed unchanged.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Scan-Tab belongs in the `bots` TAB_GROUPS entry (alongside shop/rank/inventar), not `items` | Pattern 2, point 1 | Low — a one-line change if the planner/user prefers the `items` group instead; no data-model impact |
| A2 | `scan-tab.js` should load at load-order position 8 (right after `game-scan.js`, before `money.js`) rather than at the very end (after `bc-autobackup.js`) | Pattern 2, point 6 | Low — position only matters if a later-loading module also needs to read scan-tab.js globals, which none currently do; any position after `items.js`+`game-scan.js` is functionally equivalent |
| A3 | `GI_GROUP_KEYS` (the asset-group field allowlist used by the Phase-5 enumerator) is itself flagged `[ASSUMED]` upstream and not console-verified [VERIFIED: 05-02-SUMMARY.md key-decisions: "GI_GROUP_KEYS bleibt [ASSUMED]"] — the baseline's asset-group cross-reference in Pitfall 3 inherits this upstream uncertainty | Pattern 1, Pitfall 3 | Low — degrades non-breaking per the existing design (unknown keys are skipped, not errored); a badge might occasionally misclassify an asset-group field name until corrected |
| A4 | `tools/build-baseline.js` needs a CJS `module.exports` (Dual-Export pattern) so `tests/baseline-manifest.test.js` can `require`/import its `extractBaseline` function directly, rather than shelling out to `node tools/build-baseline.js` from the test | Pattern 1 | Low — either approach works; Dual-Export matches `persistence.js`'s own established pattern [VERIFIED: persistence.js:366-375] more closely than a subprocess call |

**If this table is empty:** N/A — see above; all four assumptions are low-risk and independently correctable without touching data already stored by users.

## Open Questions

1. **Exact badge semantics for `assets.items` (individual assets) vs `assets.groups` (asset groups)**
   - What we know: the baseline realistically can only track asset **group** names (e.g. `ItemNeck`) via static grep, not individual **asset** names (e.g. a specific collar item) — no source file in the tool references individual asset names as string literals in a greppable way.
   - What's unclear: whether SCAN-10's "badge on every entry" should apply a real used/new distinction to individual assets, or whether assets should show a group-level badge only (inherited from their `Group` field).
   - Recommendation: badge `assets` rows by their `Group` membership in the baseline's asset-group set (inherited badge), and be explicit in the UI that this is group-level, not item-level, precision — avoids fabricating a false-precision "used" claim about individual items the tool has no way to have referenced by name.

2. **Whether `scan-tab.js` should also expose the already-existing `triggerGameScan()` button**, consolidating the `⚙️ Tweaks-Panel → 🔎 Spiel-Scan` section (Phase 5) into the new tab, or leave scan-triggering in the Tweaks panel and use the new tab purely for browsing/deleting/exporting.
   - What we know: ROADMAP Phase 6 goal text only mentions browsing/filtering/deleting/badges — it does not explicitly ask to move the trigger button.
   - What's unclear: whether leaving two separate scan-related UI locations (Tweaks-Panel trigger + Bots-tab browser) is acceptable UX or should be consolidated.
   - Recommendation: leave `triggerGameScan()`/`#gameScanBtn`/`#gameScanInfo` exactly where Phase 5 put them (Tweaks-Panel) — this phase's requirements don't call for moving it, and moving it would touch already-tested, already-shipped Phase-5 code for no requirement-driven reason. The Scan-Tab can optionally show a "🔎 Neuer Scan" shortcut that calls the existing `triggerGameScan()` global, without removing the Tweaks-Panel entry.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `tools/build-baseline.js`, `npm test` | ✓ | ≥22.12.0 (per `package.json` engines) [VERIFIED: package.json:6-8] | — |
| Vitest | freshness test, all new SCAN-09..12 tests | ✓ | 5.0.0 (already a devDependency) [VERIFIED: package.json:14] | — |
| Browser `Blob`/`URL.createObjectURL` | snapshot export | ✓ (already used by `exportScreenshotsOnly`/`exportAllData`) | — | — |
| Browser `fetch` or inline `<script>` for `baseline-manifest.json` | loading the committed manifest into `scan-tab.js` | ✓ | — | If `fetch` is undesirable for a `file://`-served copy of the tool, inline the manifest as a `<script>` global (`window.BASELINE_MANIFEST = {...}`) generated by the same `tools/build-baseline.js` script — matches the project's "no build step" constraint either way |

No missing dependencies; nothing blocks execution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 [VERIFIED: package.json:11,14] |
| Config file | `vitest.config.js` (existing, unchanged by this phase) |
| Quick run command | `npx vitest run tests/<new-file>.test.js` |
| Full suite command | `npm test` (must stay ≥23 files, ≥321 passed + 2 expected fail per the Phase-5 baseline [VERIFIED: 05-03-SUMMARY.md GREEN-Ausgabe]) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-09 | `baseline-manifest.json` matches a fresh regeneration | unit | `npx vitest run tests/baseline-manifest.test.js` | ❌ Wave 0 |
| SCAN-09 | Classification distinguishes function/assetGroup/unknown (Pitfall 3) | unit | `npx vitest run tests/baseline-manifest.test.js -t classif` | ❌ Wave 0 |
| SCAN-10 | Scan-Tab renders filtered/paginated rows with correct badges | unit | `npx vitest run tests/scan-tab.test.js` | ❌ Wave 0 |
| SCAN-10 | Search + category filter narrow the rendered list | unit | `npx vitest run tests/scan-tab.test.js -t filter` | ❌ Wave 0 |
| SCAN-10 | Tab wiring: TAB_GROUPS, visibility array, index.html insertions (statisch) | unit | `npx vitest run tests/scan-tab.test.js -t statisch` | ❌ Wave 0 |
| SCAN-11 | `idbSnapshotDelete` requires `confirm()`, false leaves store untouched | unit | `npx vitest run tests/snapshot-delete.test.js` | ❌ Wave 0 |
| SCAN-11 | Only one `.delete(` call site exists on the `snapshots` store (static audit) | unit | `npx vitest run tests/snapshot-delete.test.js -t audit` | ❌ Wave 0 |
| SCAN-12 | Export produces restore-shaped JSON (record fields intact) | unit | `npx vitest run tests/scan-tab-export.test.js` | ❌ Wave 0 |
| SCAN-12 | `.planning/analysis/GAME-INVENTORY.md` exists and references real snapshot data | manual-only | human review after human export step (see Pattern 4) | N/A — planning artifact, not test-automatable |

### Sampling Rate
- **Per task commit:** the relevant single test file (`npx vitest run tests/<file>.test.js`)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** full suite green before `/gsd-verify-work`; plus the SCAN-12 human export + doc-review step (non-blocking per this project's "End-of-Phase-Human-Checks" convention already used in Phases 2, 3, 5)

### Wave 0 Gaps
- [ ] `tools/build-baseline.js` — does not exist yet; needed before `tests/baseline-manifest.test.js` can pass
- [ ] `baseline-manifest.json` — committed output, generated by the above, does not exist yet
- [ ] `scan-tab.js` — does not exist yet
- [ ] `tests/baseline-manifest.test.js`, `tests/scan-tab.test.js`, `tests/snapshot-delete.test.js`, `tests/scan-tab-export.test.js` — none exist yet (RED→GREEN convention: write these first, confirm RED, then implement)
- [ ] `.planning/analysis/` directory — does not exist yet
- [ ] Framework install: none needed — Vitest already present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-user, no-auth static tool (per PROJECT scope: "Einziger Nutzer ist der Autor") — no change from prior phases |
| V3 Session Management | No | No sessions introduced by this phase |
| V4 Access Control | No | No new privilege boundary; the bridge (the tool's one trust boundary) is untouched by this phase |
| V5 Input Validation | Yes | Mod names, asset names, patch function names, chat-hook names all originate from the *game* tab (an environment the tool does not control) and are rendered in the Scan-Tab — must go through `escHtml()` before insertion into `innerHTML`, exactly as the codebase's existing convention requires [VERIFIED: items.js:6504-6520] |
| V6 Cryptography | No | Nothing in this phase touches crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via a maliciously-named mod/asset rendered unescaped in the Scan-Tab | Tampering / Elevation of Privilege | `escHtml()` on every rendered mod/asset/hook/function name (Pattern 2's `_scanRender` sketch already applies this); never use raw `innerHTML +=` with un-escaped snapshot fields |
| A forged/tampered snapshot record surviving deletion review because delete has no confirmation | Repudiation / Tampering | `confirm()` gate before every `idbSnapshotDelete` call, plus the new static audit in Pattern 3 that proves no code path bypasses it |
| Silent data loss on export failure (e.g. `Blob`/`createObjectURL` throwing) | Denial of Service (of the export feature, not the app) | Wrap in try/catch and surface via `showStatus('error')`, exactly as `exportScreenshotsOnly()`'s own fehlerpfad already does [VERIFIED: tests/screenshot-export.test.js:136-145 "Fehlerpfad: createObjectURL wirft → showStatus(error), kein Throw"] |
| Baseline manifest silently drifting from actual source (stale "used" claims) | Tampering (of trust in the tool's own diff) | The freshness Vitest test (Pattern 1) fails `npm test` if `baseline-manifest.json` and a fresh regeneration disagree |

## Sources

### Primary (HIGH confidence — read directly this session)
- `persistence.js` (full file) — `idbSnapshotPut/GetAll/Get/Keys`, `idbScreenshotDelete` pattern, Dual-Export tail
- `game-scan.js` (full file) — snapshot record shape, trigger/progress/save flow
- `items.js` lines 4223-4288 — `TAB_GROUPS`, `switchTab`, tab-visibility array; lines 6504-6520 — `escHtml`/`escJsAttr`
- `index.html` lines 2500-2600, 3106, 3530-3560, 3830-3894 — tab buttons, LADEREIHENFOLGE comment, script-write block, tab pane markup analogs
- `docs/LOAD-ORDER.md` (full file) — load-order table, guard behavior, "Neues Modul hinzufügen" checklist, CORE_SCRIPTS test convention
- `tests/helpers/loadScript.js` (full file) — `makeElementStub`, `expandLoadOrder`, `CORE_SCRIPTS`
- `tests/delete-confirmation.test.js` (full file) — STAB-09 audit scope and its file/regex specificity
- `tests/screenshot-export.test.js` (full file) — SPLIT-07 export pattern precedent
- `tests/screenshot-store.test.js` lines 19-51 — op-spy pattern for IDB put/delete
- `tests/game-scan-bridge.test.js` lines 58-338 — add-spy pattern, statisch describe blocks
- `tests/storage-estimate.test.js` (full file) — `captureInfo` DOM-stub-identity workaround
- `.planning/phases/05-gamecode-inventar/05-02-SUMMARY.md`, `05-03-SUMMARY.md` — snapshot schema-1 contract, record shape, GI_GROUP_KEYS assumption
- `.planning/phases/05-gamecode-inventar/05-CONSOLE-FINDINGS.md` — real numbers (18,700 globals, 4,764 assets, 120 groups, 546 patches, 28 mods)
- `.planning/phases/02-speicher-sicherheit/02-02-SUMMARY.md` — STAB-09/10 confirm-guard pattern precedent
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` — SCAN-09..12 text, Phase 6 success criteria, Out-of-Scope table
- `package.json` — Node/Vitest versions, no new deps needed
- A `node -e` one-liner run this session against `bot-engine.js`/`items.js`/`bot-ui.js`/`bot-data.js`/`loader.js` — verified identifier-extraction counts and classification gotcha (Pitfall 3)

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — MBS "new items" screen as diff-UI precedent, anti-features table (cited, not independently re-verified against the MBS repo this session)

### Tertiary (LOW confidence)
- None — no WebSearch-only claims in this research; everything needed was already resolved in-repo

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, every mechanism modeled on code read this session
- Architecture: HIGH — every insertion point cited with exact line numbers from files read this session
- Pitfalls: HIGH — three of five pitfalls were discovered empirically this session (regex classification gotcha, DOM-stub identity, static-audit scope), not speculated

**Research date:** 2026-09-19
**Valid until:** stable — this phase depends only on this repo's own already-merged Phase 4/5 code and Node/Vitest versions already pinned in `package.json`; re-verify only if Phase 5's snapshot schema changes before Phase 6 executes
