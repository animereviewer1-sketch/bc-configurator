<!-- GSD:project-start source:PROJECT.md -->

## Project

**BC Universal Configurator**

Ein browserbasiertes Begleit-Tool für Bondage Club (BC), das in einem eigenen Fenster neben dem Spiel läuft und per Bookmarklet-Loader über `postMessage` mit dem Spiel-Tab spricht. Es verwaltet Outfits, Curses, Inventar, Shop, Rang und Geld, scannt Outfits aus dem Spiel (inkl. Screenshots) und enthält einen Bot-Editor, dessen Trigger/Aktionen/Events zu injizierbarem Spielcode kompiliert werden. Alle Daten liegen clientseitig in IndexedDB; gehostet wird statisch auf GitHub Pages. Einziger Nutzer ist der Autor selbst.

**Core Value:** Gescannte Daten (Outfits, Versionen, Screenshots, Bots) gehen nie verloren — nichts wird automatisch gelöscht oder überschrieben, und jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen.

### Constraints

- **Datenschutz-Regel**: Gespeicherte Scan-Daten werden nie automatisch gelöscht oder überschrieben — Kernwert des Tools; manuelles Löschen nur mit Bestätigung
- **Tech-Stack**: Vanilla JS ohne Build-Schritt in Produktion — das Tool muss weiterhin als statische Seite deploybar sein
- **Kompatibilität**: Bestehende IDB-Schlüssel (`BC_Bots_v2`, `BC_Outfits_v1`, `LSCG_DB`, `PROFILE_SCREENSHOTS` …) müssen beim Refactoring migrierbar bleiben; kein Datenverlust beim Update
- **Sicherheit**: Die Bridge ist die einzige Vertrauensgrenze — Origin-Prüfung auf beiden Seiten, EXEC nur aus dem Tool-Origin
- **Reihenfolge**: Refactoring erst, wenn die Tests aus der Stabilisierung existieren

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- JavaScript (ES6+) - All core application logic and UI
- HTML5 - Single-page application shell (`index.html`)

## Runtime

- Browser JavaScript (no Node.js)
- GitHub Pages static hosting
- None — this is a static site with no build toolchain or dependencies manifest

## Frameworks

- Vanilla JavaScript — no framework, direct DOM manipulation
- **lz-string** (1.5.0) — compression/decompression for outfit codes and serialized data
- **Google Fonts** — typography delivery

## Key Dependencies

- **lz-string** — required for outfit import/export and data serialization; any outage breaks save/load functionality
- Google Fonts — typography only, graceful degradation to system fonts if CDN unavailable
- bc-favicon.svg — local asset

## Configuration

- No .env files or external configuration
- Settings stored in localStorage (browser local storage)
- Game communication via hardcoded origin: `https://animereviewer1-sketch.github.io`
- No build config — direct HTML/JS deployment
- Cache busting via query string: `?_=[version]` on script includes

## Platform Requirements

- Text editor + browser with JavaScript support
- No build dependencies or install steps required
- Can be served locally or via HTTP
- Static HTTPS hosting (GitHub Pages)
- Browser must support:

## Storage & Persistence

- **localStorage** — configuration, state, player settings (synchronous, ~5-10MB limit)
- **IndexedDB** — bot logs and large datasets (asynchronous, larger quota)
- No database backend — all state client-side
- No server-side API — communicates only with Bondage Club game via `window.postMessage`

## Code Generation

- Generates JavaScript code strings to be executed in the BC game tab
- Uses Base64 encoding for configuration serialization (prevents template literal injection)
- No external code evaluation — generated code is injected via `eval()` in BC context only

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Lowercase with hyphens: `bot-engine.js`, `bot-data.js`, `bot-ui.js`
- Descriptive names reflecting module purpose: `inventar.js`, `rank.js`, `money.js`, `shop.js`
- Utility files prefixed with domain: `bc-icons.js`, `bc-autobackup.js`
- Userscript files suffixed with `.user.js`: `dogs-lock-remover.user.js`
- camelCase for all functions: `renderRankTab()`, `_rankById()`, `moneyAdj()`, `escJsAttr()`
- Module-private functions prefixed with underscore: `_saveRank()`, `_rankData`, `_buildBotCode()`
- Public API functions unprefixed: `rankDefNew()`, `moneyAddPlayer()`, `botField()`
- Event handlers use descriptive camelCase: `rankDefMoveUp()`, `moneyPromptSet()`, `evField()`
- camelCase for regular variables: `maxLevel`, `entries`, `safeName`
- UPPER_SNAKE_CASE for module-level constants: `RANK_KEY`, `MONEY_KEY`, `BOT_ENGINE_VERSION`, `POPUP_W`
- Module-private state prefixed with underscore: `_rankData`, `_money`, `_rankData.players`
- German identifiers throughout codebase (comments, variable names, UI text): `Spieler`, `Rang`, `farbe`, `Zonenname`
- No TypeScript; plain JavaScript objects with informal structure conventions
- Objects use camelCase properties: `{name, icon, farbe, level, group}`
- Database/storage keys use SCREAMING_SNAKE_CASE: `'BC_Rank_v1'`, `'BC_Money_v1'`

## Code Style

- No formatter configured (.prettierrc, biome.json, etc. not present)
- Mixed spacing conventions observed:
- Ternary operators: no consistent spacing (`a?b:c` or `a ? b : c` both used)
- Semicolons present but not enforced; some lines omitted
- No linting configuration found (.eslintrc*, eslint.config.*, biome.json)
- No automated formatting
- Code checked via `node --check` on all files (ad-hoc, manual process)

## Import Organization

- No imports/exports (plain browser JavaScript, no build step)
- Script loading via `<script>` tags in HTML (`index.html`)
- Order in index.html:
- Global namespace pollution: all functions and state are global or module-scoped
- Module A depends on Module B by checking `typeof B !== 'undefined'` before use
- Cross-module state access via globals: `typeof _money === 'function'` to call `_money` functions
- No explicit dependency declaration; implicit via function/variable references
- Immediate invocation IIFE for initialization: `(async () => { ... })()`
- Module-level state maintained in uppercase constants and underscore-prefixed objects
- Each file is self-contained; no barrel exports

## Error Handling

- Try/catch blocks used for risky async operations:
- `console.warn()` for recoverable errors with prefixed context: `'[Rank] IDB load error:'`
- `console.error()` rarely used; falls back to `console.warn()`
- User-facing errors via `alert()` and `confirm()`: `if(!confirm('Really delete?')) return;`
- Status messages via `showStatus()` helper: `showStatus('✅ Ränge: '+added+' neu...','success')`
- Null coalescing (`??`) and optional chaining (`?.`) used to prevent undefined errors
- Early return pattern for guard clauses: `if(!name?.trim()) return;`
- Errors don't throw; functions silently return `null` or `undefined`
- Fallback values via nullish coalescing: `_rankData.settings.queryCmd ?? '!rang'`
- Validation before state mutation: checks object exists before modifying: `if(!p) return;`

## Logging

- Prefixed log messages with context in brackets: `'[Rank]'`, `'[Money]'`, `'[Bot]'`
- Severity levels via method: `console.warn()`, `console.error()`, `console.log()`
- Colored console output in loader via CSS formatting: `'%c' + P + ' [' + lv + ']'`, `'color:' + color`
- UTF-8 Unicode emojis for visual distinction: `'⚠ AntiStrip:'`, `'\u{1F512} NoStrip:'`
- Log output immediately during operations, not batched
- Async operation start/completion: "IDB load error"
- Feature activation/deactivation: "AntiStrip aktiv", "NoStrip beendet"
- User actions with side effects: implicit via console prefixes
- Errors and warnings only; success operations use UI feedback (showStatus)

## Comments

- Complex algorithms need explanation: `// i / anz beziehen sich auf die Gruppe...` explains index scope
- Clarification of intent: `// Nicht die Level-Zahlen tauschen, sondern die Plaetze...`
- Workarounds and known issues: `// (_rankRelevel entfernt – wurde nur...` documents deletion reason
- Bug fixes referenced inline: `// FIX: validate origin to prevent other pages...`
- Large sections marked with separator lines: `// ── Section Name ────────────────────────────`
- Not used; comments are informal
- No function signatures documented

## Function Design

- Functions average 10–30 lines; largest is `_buildBotCode()` at ~100 lines
- Rendering functions 30–50 lines common (e.g., `renderRankTab()`, `renderRankPlayers()`)
- Single-responsibility observed: data mutation separated from rendering
- 0–3 parameters typical: `moneyAdj(id, sign)`, `rankDefEdit(id)`
- Complex data passed as object properties, not multiple params
- IDs passed as strings, not object references
- Functions often return nothing; side effects via state mutation
- Some return computed values: `_rankSorted()` returns array, `_rankById()` returns object or null
- Null (`null`) used for "not found" (consistent): `return _rankData.defs.find(...) ?? null`

## Module Design

- No exports; all functions global or module-private
- Module-private pattern: prefix underscore, stored in file scope
- Public functions available on window implicitly
- No barrel exports; each file is loaded individually
- index.html controls module loading order via script tags
- Top-level IIFE for async init:
- Initialization runs immediately on script load, not on demand

## HTML Escaping & Attribute Safety

- Escapes: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`
- Used for all user-provided text in HTML templates
- Pattern: `` `<span>${escHtml(value)}</span>` ``
- File: `items.js` (defined once, used globally)
- Escapes for use inside single-quoted JavaScript strings in onclick handlers
- Escapes: `\` → `\\`, `'` → `\'`, `\r` → `\\r`, `\n` → `\\n`, plus HTML entities
- NEVER use JSON.stringify for onclick values; use escJsAttr inside single quotes
- Pattern: `` `onclick="functionName('${escJsAttr(id)}')"` ``
- File: `items.js`
- Example from `rank.js`: `` `onclick="rankDefMoveUp('${r.id}')"` `` — r.id is already safe (synthetic), but pattern requires escJsAttr for user input
- Example from `inventar.js`: `` `onclick="itemDefDelete('${escJsAttr(d.id)}')"` `` — d.id is trusted but escJsAttr applied for consistency
- Reason: JSON.stringify uses double quotes, but onclick uses single quotes
- This breaks when value contains `"` character
- Special escaping rules for code generation in `bot-engine.js` `_buildBotCode()` function
- Template literal contains JavaScript code that must be valid on injection
- Rules:
- File: `bot-engine.js` lines 81–150 show injection pattern

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File | Lines |
|-----------|----------------|------|-------|
| **Core Controller** | Tab switching, postMessage handler, persistence layer | `items.js` | 11,684 |
| **Bot UI** | Bot editor, trigger/action/event definitions, bot execution UI | `bot-ui.js` | 3,548 |
| **Bot Engine** | Code generator: transforms bot definitions into template literal for game injection | `bot-engine.js` | 3,356 |
| **Loader Bridge** | Bookmarklet-injected bridge; cache builder; game API access | `loader.js` | 1,636 |
| **Bot Data** | Trigger/action/condition type definitions and validators | `bot-data.js` | 911 |
| **Shop System** | Shop management UI and logic | `shop.js` | 454 |
| **Inventory System** | Inventory/keywarden logic | `inventar.js` | 624 |
| **Money System** | Money/currency tracking | `money.js` | 128 |
| **Rank System** | Rank definitions and player rank tracking | `rank.js` | 313 |
| **Outfit Import** | Parse and import outfit codes from BC | `outfit-import.js` | 606 |
| **Backup System** | Automatic incremental backups to filesystem | `bc-autobackup.js` | 510 |
| **Icon Definitions** | Stroke icon SVG library and icon replacement | `bc-icons.js`, `bc-icons-ergaenzung.js` | 227+128 |

## Pattern Overview

- **Browser-based, single-window tool** opens alongside BC game in separate window
- **Secure cross-origin bridge** with origin validation (`ALLOWED_ORIGIN` check in loader.js)
- **Two-way postMessage communication** for data exchange and command execution
- **IndexedDB persistence** of all user data (bots, outfits, profiles, settings)
- **Code generation pattern** for bot injection (template literals with Base64-encoded config)
- **Tab-based UI** with two groups: Items (outfits/curses) and Bots (scripting)

## Layers

- Purpose: Render UI, handle user interactions, manage tabs
- Location: `index.html` (embedded CSS + structure), `bot-ui.js`, feature modules
- Contains: Tab definitions, form components, grid layouts, modal dialogs
- Depends on: Core controller (items.js), Feature modules
- Used by: User clicks, keyboard input
- Purpose: Central message dispatcher, tab switching, persistence orchestration
- Location: `items.js` (lines 1-11,684)
- Contains: `switchTab()`, `TAB_GROUPS` definition, `window.addEventListener('message')` handler
- Depends on: IndexedDB API, postMessage API
- Used by: All UI components, Bridge (for incoming data)
- Purpose: Domain-specific logic (bots, shops, inventory, ranks, money)
- Location: `bot-ui.js`, `bot-data.js`, `shop.js`, `inventar.js`, `rank.js`, `money.js`, `outfit-import.js`
- Contains: Rendering functions, data validation, persistence helpers
- Depends on: Core controller, IDB helpers from items.js
- Used by: Presentation layer, Core controller
- Purpose: Transform bot definitions into executable game code
- Location: `bot-engine.js`, function `_buildBotCode(bot)` (line 24+)
- Contains: Template literal builder, JSON-to-Base64 serialization, anti-strip/no-strip watchers
- Depends on: Bot definitions from memory (`_bots`, `_botData`)
- Used by: Bot UI (when "Execute Bot" button clicked)
- Purpose: Game API access, cache building, code execution relay
- Location: `loader.js` (injected into BC tab via bookmarklet)
- Contains: `postMessage` event handler (line 825+), cache builder (line 35+), origin validation
- Depends on: BC globals (Asset[], Player, ChatRoom, etc.)
- Used by: Core controller (for data requests), Game execution (for EXEC commands)
- Purpose: Store and retrieve all user data durably
- Location: IndexedDB `'BCKonfigurator'` database, `_IDB_STORE = 'kv'`
- Helpers: `idbGet()`, `idbSet()` in `items.js` (lines 22-66)
- Depends on: Browser's IndexedDB API
- Used by: All feature modules, Core controller
- Schema: Single object store, key-value pairs (e.g., `'BC_Money_v1'`, `'BC_Bots_v2'`)

## Data Flow

### Primary Request Path (Get Cache from Game)

### Bot Execution Path

### Outfit Application Path

### Room Scan Auto-Trigger

- **Shared global variables** in items.js: `_bots`, `_botGroups`, `_botData`, `_money`, `_rankData`, `_shop`, `_inventar`
- **IndexedDB as source of truth** for persistence (survives page reload)
- **In-memory state** synced from IDB at startup
- **postMessage as async transport** — no blocking RPC, all responses are event-driven
- **Debounced saves** to IDB (`_debouncedSaveXxx` functions, lines ~110-120 in items.js)

## Key Abstractions

- Purpose: Organize tabs into two main categories (Items vs Bots)
- Examples: `items.js` line 4197
- Pattern: `const TAB_GROUPS = { items: ['items','outfit','curse',...], bots: ['bot','shop','rank',...] }`
- Used by: `switchTab()`, `_applyGroupUI()` to show/hide buttons and content areas
- Purpose: Define bot automation rules
- Examples: Trigger (responds to chat), Action (performs item change), Event (time-based)
- Files: `bot-data.js` (definitions), `bot-ui.js` (editor UI), `bot-engine.js` (code gen)
- Pattern: Each has type/conditions/target; conditions can be grouped with AND/OR
- Purpose: Store a collection of items/colors/curses for quick application
- Location: Stored in IDB as `BC_Outfits_v1`
- Structure: `{ id, name, items: [{asset, type, color, ...}], createdAt }`
- Used by: Outfit tab, profile slideshow, bot actions
- Purpose: Store locked items with metadata
- Location: Stored in IDB as `BC_CURSE_DB_v1`
- Structure: `{ id, Groupe, item, color, keys, locked, by, room, ts }`
- Used by: Curse tab, item wear prevention, curse tracking UI

## Entry Points

- Location: User runs bookmarklet on BC game page
- Payload: Opens configurator popup and injects `loader.js` into BC tab
- Responsibility: Establishes bridge and makes game API accessible
- Location: Browser opens `https://animereviewer1-sketch.github.io/bc-configurator/`
- Responsibility: Loads all JS modules via `document.write()` (lines 3074-3515), renders initial UI
- Execution order:
- Location: `items.js` end + various modules
- Responsibility: Initialize tab UI, load persisted data from IDB, set up icon observer
- Runs: After all scripts load and DOM is ready

## Architectural Constraints

- **Single window tool** — communicates with game via postMessage, no localStorage (uses IDB instead)
- **Origin-locked bridge** — `ALLOWED_ORIGIN = 'https://animereviewer1-sketch.github.io'` in loader.js, cannot receive messages from other origins
- **Template literal code generation** — bot code must be valid JavaScript and escape properly in template literal (hence Base64 encoding of config)
- **Event-driven async** — all postMessage responses are asynchronous, no blocking calls
- **No circular imports** — each module depends downward on items.js; items.js doesn't depend on feature modules (they register globals)
- **Global state in memory** — modules export functions and data as window globals; no module system

## Anti-Patterns

### Direct DOM Manipulation Without Debounce

### Message Validation Without Origin Check

### Storing Secrets in Template Literals Without Escaping

### IDB Write Without Quota Check

## Error Handling

- **Bridge errors** logged to console in game tab (loader.js uses BCK logger)
- **Tool errors** shown as status message `showStatus(msg, 'error')` (red alert in UI)
- **IDB errors** caught, quota errors trigger user-visible alert
- **postMessage delivery** not guaranteed — tool retries with ping/pong protocol (line ~5944 in items.js)

## Cross-Cutting Concerns

- Trigger conditions validated against condition type defs (bot-data.js)
- Item asset names validated against BC's Asset array
- Outfit wear validated on application (check for restrictions, effects, blocks)

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
