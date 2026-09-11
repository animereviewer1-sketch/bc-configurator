<!-- refreshed: 2026-09-11 -->
# Architecture

**Analysis Date:** 2026-09-11

## System Overview

```text
┌───────────────────────────────────────────────────────────────────┐
│                    Configurator Tool (index.html)                 │
│  Tab-Based UI (items, outfit, curse, bot, shop, rank, money...) │
│  Location: `index.html` / `bot-ui.js` / Module Files             │
└─────────────────────────────┬───────────────────────────────────┘
                              │ postMessage (ALLOWED_ORIGIN check)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│           Loader Bridge (loader.js)                              │
│  Injected in BC Game Tab via Bookmarklet                         │
│  Builds Cache | Relays Game State | Executes Code               │
└─────────────────────────────┬───────────────────────────────────┘
                              │ postMessage (origin validation)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      BC Game Tab                                  │
│  Bondage Club (game) / Asset System / Player State               │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    Data Persistence                                │
│              IndexedDB ('BCKonfigurator' store)                    │
│          `items.js`: idbGet/idbSet helpers                        │
└───────────────────────────────────────────────────────────────────┘
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

**Overall:** Layered client-server architecture with cross-window bridge via postMessage.

**Key Characteristics:**
- **Browser-based, single-window tool** opens alongside BC game in separate window
- **Secure cross-origin bridge** with origin validation (`ALLOWED_ORIGIN` check in loader.js)
- **Two-way postMessage communication** for data exchange and command execution
- **IndexedDB persistence** of all user data (bots, outfits, profiles, settings)
- **Code generation pattern** for bot injection (template literals with Base64-encoded config)
- **Tab-based UI** with two groups: Items (outfits/curses) and Bots (scripting)

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user interactions, manage tabs
- Location: `index.html` (embedded CSS + structure), `bot-ui.js`, feature modules
- Contains: Tab definitions, form components, grid layouts, modal dialogs
- Depends on: Core controller (items.js), Feature modules
- Used by: User clicks, keyboard input

**Core Controller Layer:**
- Purpose: Central message dispatcher, tab switching, persistence orchestration
- Location: `items.js` (lines 1-11,684)
- Contains: `switchTab()`, `TAB_GROUPS` definition, `window.addEventListener('message')` handler
- Depends on: IndexedDB API, postMessage API
- Used by: All UI components, Bridge (for incoming data)

**Feature Module Layer:**
- Purpose: Domain-specific logic (bots, shops, inventory, ranks, money)
- Location: `bot-ui.js`, `bot-data.js`, `shop.js`, `inventar.js`, `rank.js`, `money.js`, `outfit-import.js`
- Contains: Rendering functions, data validation, persistence helpers
- Depends on: Core controller, IDB helpers from items.js
- Used by: Presentation layer, Core controller

**Code Generation Layer:**
- Purpose: Transform bot definitions into executable game code
- Location: `bot-engine.js`, function `_buildBotCode(bot)` (line 24+)
- Contains: Template literal builder, JSON-to-Base64 serialization, anti-strip/no-strip watchers
- Depends on: Bot definitions from memory (`_bots`, `_botData`)
- Used by: Bot UI (when "Execute Bot" button clicked)

**Bridge Layer:**
- Purpose: Game API access, cache building, code execution relay
- Location: `loader.js` (injected into BC tab via bookmarklet)
- Contains: `postMessage` event handler (line 825+), cache builder (line 35+), origin validation
- Depends on: BC globals (Asset[], Player, ChatRoom, etc.)
- Used by: Core controller (for data requests), Game execution (for EXEC commands)

**Persistence Layer:**
- Purpose: Store and retrieve all user data durably
- Location: IndexedDB `'BCKonfigurator'` database, `_IDB_STORE = 'kv'`
- Helpers: `idbGet()`, `idbSet()` in `items.js` (lines 22-66)
- Depends on: Browser's IndexedDB API
- Used by: All feature modules, Core controller
- Schema: Single object store, key-value pairs (e.g., `'BC_Money_v1'`, `'BC_Bots_v2'`)

## Data Flow

### Primary Request Path (Get Cache from Game)

1. **User clicks "Load Cache" button** (`items.js`)
2. **Tool sends postMessage** `{ type: 'GET_CACHE', app: 'BCKonfigurator' }` (line ~6400 in items.js)
3. **Loader receives & validates origin** (`loader.js` line 840)
4. **Loader builds cache** by iterating BC's Asset array (line 35-800 in loader.js)
5. **Loader sends postMessage back** `{ type: 'CACHE_DATA', cache: {...}, assetBase: '...' }` (line 884)
6. **Core controller receives in message handler** (`items.js` line 5917+)
7. **Stores to IDB** via `idbSet('CACHE', data)` (line ~6000 in items.js)
8. **Renders item tabs** with outfit/curse/lock data

### Bot Execution Path

1. **User edits bot in Bot Editor** (`bot-ui.js` renders form)
2. **User clicks "Execute Bot" button** (`bot-ui.js` function `botRun()`)
3. **Core controller calls `_buildBotCode(bot)`** (`bot-engine.js` line 24)
4. **Code generator builds template literal** containing:
   - Bot configuration (Base64-encoded triggers, actions, events, settings)
   - Anti-strip watchers
   - Chat event handlers
   - Execution loop
5. **Core controller sends EXEC postMessage** `{ type: 'EXEC', code: '...' }` (line ~7400 in items.js)
6. **Loader validates and injects code** via `eval()` in game tab (line 1236+ in loader.js)
7. **Code executes in game context**, has access to BC globals

### Outfit Application Path

1. **User selects outfit in Items tab** (`items.js`)
2. **User clicks "Apply" or trigger from bot**
3. **Code built for items/cursed items** (from outfit definition)
4. **EXEC postMessage sent** with item wear/lock/color commands
5. **Loader injects code** into BC game tab
6. **Game changes player appearance** via native Asset system

### Room Scan Auto-Trigger

1. **User enters room in BC game**
2. **Connection established** (PONG received, line ~5950 in items.js)
3. **Auto-scan triggered after 3s** (`startRoomScan()`, line ~6000 in items.js)
4. **Scan requests player list, locks, craft/curse status** via postMessage
5. **Loader scans ChatRoom.characters** and BC's item system
6. **Results sent back** as OUTFIT_SCAN_DATA / LOCKS_DATA (loader.js line 1060+)
7. **UI updates outfit scan results** and lock inventory

**State Management:**
- **Shared global variables** in items.js: `_bots`, `_botGroups`, `_botData`, `_money`, `_rankData`, `_shop`, `_inventar`
- **IndexedDB as source of truth** for persistence (survives page reload)
- **In-memory state** synced from IDB at startup
- **postMessage as async transport** — no blocking RPC, all responses are event-driven
- **Debounced saves** to IDB (`_debouncedSaveXxx` functions, lines ~110-120 in items.js)

## Key Abstractions

**Tab Groups (TAB_GROUPS):**
- Purpose: Organize tabs into two main categories (Items vs Bots)
- Examples: `items.js` line 4197
- Pattern: `const TAB_GROUPS = { items: ['items','outfit','curse',...], bots: ['bot','shop','rank',...] }`
- Used by: `switchTab()`, `_applyGroupUI()` to show/hide buttons and content areas

**Trigger/Action/Event System:**
- Purpose: Define bot automation rules
- Examples: Trigger (responds to chat), Action (performs item change), Event (time-based)
- Files: `bot-data.js` (definitions), `bot-ui.js` (editor UI), `bot-engine.js` (code gen)
- Pattern: Each has type/conditions/target; conditions can be grouped with AND/OR

**Outfit Definition:**
- Purpose: Store a collection of items/colors/curses for quick application
- Location: Stored in IDB as `BC_Outfits_v1`
- Structure: `{ id, name, items: [{asset, type, color, ...}], createdAt }`
- Used by: Outfit tab, profile slideshow, bot actions

**Curse Entry:**
- Purpose: Store locked items with metadata
- Location: Stored in IDB as `BC_CURSE_DB_v1`
- Structure: `{ id, Groupe, item, color, keys, locked, by, room, ts }`
- Used by: Curse tab, item wear prevention, curse tracking UI

## Entry Points

**Bookmarklet (Injection Point):**
- Location: User runs bookmarklet on BC game page
- Payload: Opens configurator popup and injects `loader.js` into BC tab
- Responsibility: Establishes bridge and makes game API accessible

**index.html (Tool Entry):**
- Location: Browser opens `https://animereviewer1-sketch.github.io/bc-configurator/`
- Responsibility: Loads all JS modules via `document.write()` (lines 3074-3515), renders initial UI
- Execution order:
  1. bc-icons.js (icon definitions)
  2. bc-icons-ergaenzung.js (icon additions)
  3. items.js (core, IDB helpers, postMessage listener)
  4. money.js, rank.js, shop.js, inventar.js, bot-data.js, bot-ui.js, bot-engine.js, outfit-import.js, bc-autobackup.js

**DOMContentLoaded (UI Initialization):**
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

**What happens:** Feature modules call rendering functions on every state change. For large datasets (500+ outfits), this repaints the entire DOM per update.

**Why it's wrong:** Performance degrades with large collections. Each update triggers layout recalculation and paint.

**Do this instead:** Use debounced render functions like `_debouncedRenderOutfitList = _debounce(renderOutfitList, 160)` (line ~110 in items.js). Batch updates and render once after a delay.

### Message Validation Without Origin Check

**What happens:** Tool accepts postMessage from any source (`ev.source !== window.opener` check was missing early on).

**Why it's wrong:** Any page with reference to the tool window can inject EXEC commands or forge data responses. Security hole.

**Do this instead:** Validate both `ev.source === window.opener` (tool only accepts from game) and `ev.origin === ALLOWED_ORIGIN` (loader only accepts from tool). See `loader.js` line 840.

### Storing Secrets in Template Literals Without Escaping

**What happens:** Bot code includes user data (item names, player names, curse entries) directly in template literal without escaping backticks.

**Why it's wrong:** User data with backticks breaks the template literal syntax.

**Do this instead:** Base64-encode all user config into a single JSON blob, insert via `${cfgJson}`, decode in game via `atob(decodeURIComponent(...))`. See `bot-engine.js` line ~50 `const cfgJson = btoa(...)`.

### IDB Write Without Quota Check

**What happens:** `idbSet()` called repeatedly without checking QuotaExceededError beforehand.

**Why it's wrong:** Quota exceeded silently fails, tool continues, user thinks data is saved when it isn't. Next reload loses data.

**Do this instead:** Catch `QuotaExceededError` in `idbSet()` and show error UI (`showStatus('❌ Speicher voll...', 'error')`). Throttle writes. See `items.js` line 50-66.

## Error Handling

**Strategy:** Layered try-catch with console logging and UI feedback.

**Patterns:**
- **Bridge errors** logged to console in game tab (loader.js uses BCK logger)
- **Tool errors** shown as status message `showStatus(msg, 'error')` (red alert in UI)
- **IDB errors** caught, quota errors trigger user-visible alert
- **postMessage delivery** not guaranteed — tool retries with ping/pong protocol (line ~5944 in items.js)

## Cross-Cutting Concerns

**Logging:** Mostly console.log/console.warn; game bridge uses color-coded logger (BCK in loader.js). No persistent event log outside of bot execution logs.

**Validation:** 
- Trigger conditions validated against condition type defs (bot-data.js)
- Item asset names validated against BC's Asset array
- Outfit wear validated on application (check for restrictions, effects, blocks)

**Authentication:** None at tool level. Security relies on postMessage origin check — tool/loader communication is internal only. No user login.

---

*Architecture analysis: 2026-09-11*
