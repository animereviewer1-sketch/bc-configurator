<!-- refreshed: 2026-09-11 -->
# Codebase Structure

**Analysis Date:** 2026-09-11

## Directory Layout

```
bc-universal-configurator/
├── .planning/
│   └── codebase/              # This documentation
├── index.html                 # Entry point, HTML + embedded CSS
├── loader.js                  # Bookmarklet payload, injected into BC game tab
├── items.js                   # Core controller (~11.7k lines)
├── bot-ui.js                  # Bot editor UI, bot list, trigger/action forms
├── bot-engine.js              # Bot code generator (template literal builder)
├── bot-data.js                # Trigger/action/condition type definitions
├── shop.js                    # Shop system UI and logic
├── inventar.js                # Inventory and keywarden UI
├── money.js                   # Money/currency system
├── rank.js                    # Rank definitions and tracking UI
├── outfit-import.js           # Outfit code parsing and import
├── bc-autobackup.js           # Incremental backup to filesystem
├── bc-icons.js                # Stroke icon SVG library (bc-icons:svg selector)
├── bc-icons-ergaenzung.js     # Additional icon definitions
├── bc-favicon.svg             # Favicon
├── bc-logo.svg                # Logo
├── README.md                  # Project overview
├── BOT-DOKU.md                # Bot scripting documentation (German)
├── JSON-IMPORT.md             # JSON import guide
├── .nojekyll                  # GitHub Pages: disable Jekyll processing
├── (rescue scripts)
│   ├── lscg-rettung.js        # LSCG outfit backup recovery
│   ├── lscg-namen.js          # LSCG name extraction helper
│   ├── wheel-rettung.js       # Wheel rotation backup recovery
│   ├── wheel-import-rettung.js # Wheel import recovery
│   └── dogs-lock-remover.user.js # Userscript: lock removal utility
└── .git/                      # Version control
```

## Directory Purposes

**Repository Root:**
- Purpose: Deployed directly to GitHub Pages; all files served as-is
- Contains: HTML, JS, documentation, SVG assets
- No build step; all JS loaded synchronously via `document.write()` in index.html

**.planning/codebase/**
- Purpose: GSD codebase mapping documents (this analysis)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

## Key File Locations

**Entry Points:**

| File | Purpose | Access |
|------|---------|--------|
| `index.html` (lines 1-4184) | HTML shell + CSS theming; loads all JS modules via `document.write()`; defines topbar, sidebar, tabs, modals | Browser: `https://animereviewer1-sketch.github.io/bc-configurator/` |
| `index.html` (line 3074+) | Script loader sequence — order is critical (items.js must load before other modules) | Auto-runs on page load |
| `loader.js` (line 4) | IIFE; injected via bookmarklet into BC game tab; establishes postMessage bridge | Runs in game tab (separate origin) |

**Configuration & Styles:**

| File | Purpose | Format |
|------|---------|--------|
| `index.html` (lines 14-108) | CSS variables: colors (--accent, --text, --bg*), spacing (--sp-*), fonts, transitions, shadows | Embedded CSS in HEAD |
| `index.html` (lines 166-186) | Dark + high-contrast theme variants (`[data-theme="hc"]`) | CSS attribute selectors |
| `index.html` (lines 189-190) | Radius customization (`[data-radius="sharp"|"round"]`) | CSS attribute selectors |

**Core Logic (must load first):**

| File | Purpose | Key Functions |
|------|---------|---|
| `items.js` (lines 1-100) | IndexedDB setup: `_idbOpen()`, `idbGet()`, `idbSet()` | Must be available to all other modules |
| `items.js` (lines 4197-4230) | Tab management: `TAB_GROUPS`, `switchTab()`, `switchGroup()` | Shared by all modules |
| `items.js` (lines 5917-6500) | postMessage handler: receives data from loader, dispatches to handlers | Central message bus |

**Feature Modules (order independent):**

| File | Purpose | Loads to IDB as |
|------|---------|---|
| `money.js` (128 lines) | Money/currency system UI | `BC_Money_v1` |
| `rank.js` (313 lines) | Rank definitions and player rank tracking | `BC_Rank_v1` |
| `shop.js` (454 lines) | Shop management (prices, items, sale log) | `BC_Shop_v1` |
| `inventar.js` (624 lines) | Inventory (item storage, keywarden sync) | (embedded in custom obj) |
| `bot-data.js` (911 lines) | Trigger/action/event/condition type definitions and metadata | Referenced by bot-ui.js and bot-engine.js |
| `outfit-import.js` (606 lines) | Parse BC outfit codes and create outfit entries | `BC_Outfits_v1` |
| `bot-ui.js` (3548 lines) | Bot editor, list, trigger/action/event forms, execution UI | `BC_Bots_v2`, `BC_BotGroups_v1` |
| `bot-engine.js` (3356 lines) | Generates bot execution code from bot definitions | Called by bot-ui.js, returns template literal |
| `bc-autobackup.js` (510 lines) | Filesystem backup integration (File System Access API) | `BCAutoBackup_*` |
| `bc-icons.js` (227 lines) | Stroke icon library + auto-replacement in DOM | Mutates DOM on load |
| `bc-icons-ergaenzung.js` (128 lines) | Additional icon definitions (extends bc-icons.js) | Extends existing icon map |

**Bridge / Game Integration:**

| File | Purpose | Origin | Port |
|------|---------|--------|------|
| `loader.js` (1636 lines) | Injected bookmarklet payload; cache builder; postMessage handler | BC game domain | Receives from tool via postMessage |

**Documentation:**

| File | Audience | Content |
|------|----------|---------|
| `README.md` | Users | Setup, quick start, features overview |
| `BOT-DOKU.md` | Bot scripters | Trigger/action/condition reference, examples |
| `JSON-IMPORT.md` | Advanced users | How to import outfits/bots as JSON |

## Naming Conventions

**Files:**
- JavaScript: kebab-case for module files (`bot-ui.js`, `bc-icons.js`)
- HTML/CSS: Single `index.html` with all styles embedded
- Documentation: Markdown (`.md`), uppercase if primary (README, ARCHITECTURE)
- Rescue scripts: `-rettung.js` suffix indicates data recovery utility

**Directories:**
- Flat structure at root (no subdirs except `.planning/`, `.git/`)
- All served files in root so they're accessible from deployment URL

**Identifiers (JavaScript):**

| Pattern | Example | Usage |
|---------|---------|-------|
| Private variables | `_bots`, `_selBotId`, `_idbVersion` | Prefix `_` for module-private globals |
| Global functions | `switchTab()`, `bcSend()`, `showStatus()` | Exported to window, called from HTML onclick handlers |
| IDB keys | `'BC_Money_v1'`, `'BC_Curse_DB_v1'` | Versioned for migration support |
| CSS classes | `.item-btn`, `.opt-row`, `.section` | kebab-case; prefixed by component (`.item-`, `.opt-`, `.modal-`) |
| CSS variables | `--accent`, `--text3`, `--sp-4` | Double dash; grouped by category (colors, spacing, transitions) |
| Tab IDs | `'items'`, `'bot'`, `'curse'`, `'outfit'` | All lowercase; single word or hyphenated |

## Where to Add New Code

**New Feature (e.g., "Curse Auction System"):**

1. **Logic Module:**
   - Create `curse-auction.js` in repo root
   - Follow pattern from `shop.js`:
     ```javascript
     // ══════════════════════════════════════
     // Curse Auction System
     // ══════════════════════════════════════
     let _curseAuction = { bidders: {}, activeAuctions: [] };
     
     async function _loadCurseAuction() {
       _curseAuction = await idbGet('BC_CurseAuction_v1') || _curseAuction;
     }
     ```
   - Add IDB key: `'BC_CurseAuction_v1'`
   - Export functions for tab UI

2. **UI Rendering:**
   - Add tab definition in `items.js` line 4197 (TAB_GROUPS):
     ```javascript
     bots: ['bot','shop','rank','money','curse-auction', ...]
     ```
   - Create render function `renderCurseAuctionTab()` in new module:
     ```javascript
     function renderCurseAuctionTab() {
       const el = document.getElementById('tab-curse-auction');
       if (!el) return;
       el.innerHTML = /* render bids, active auctions */;
     }
     ```
   - Add HTML element in `index.html` (after other tabs):
     ```html
     <div id="tab-curse-auction" class="tab-content"></div>
     ```

3. **Script Loading:**
   - Add to `index.html` line 3514 (before or after similar modules):
     ```javascript
     document.write('<script src="curse-auction.js?_='+_cbv+'"><\/script>');
     ```

4. **postMessage Handling (if needs game data):**
   - Add case in `items.js` line 5917 (message handler):
     ```javascript
     case 'CURSE_AUCTION_DATA': {
       _curseAuction = ev.data.auctions || {};
       if (ev.data.err) { showStatus('❌ ' + ev.data.err, 'error'); return; }
       await idbSet('BC_CurseAuction_v1', _curseAuction);
       renderCurseAuctionTab();
       break;
     }
     ```
   - Add request sender in curse-auction.js:
     ```javascript
     function fetchCurseAuctionData() {
       bcSend({ type: 'GET_CURSE_AUCTIONS' }, true);
     }
     ```
   - Add handler in `loader.js` line 825 (game-side handler):
     ```javascript
     case 'GET_CURSE_AUCTIONS': {
       // Build auction data from game state
       const auctions = /* scan curse items */;
       src.postMessage({ app: APP, type: 'CURSE_AUCTION_DATA', 
         auctions }, ALLOWED_ORIGIN);
       break;
     }
     ```

**New Bot Trigger Type:**

1. **Type Definition in `bot-data.js`:**
   ```javascript
   const TRIGGER_TYPES = {
     // existing...
     auktion_bid: {
       name: 'Auf Curse-Auktion bieten',
       icon: '🏷️',
       params: [
         { id: 'minPrice', label: 'Min. Gebot', type: 'number', default: 0 }
       ]
     }
   };
   ```

2. **Condition Handler in `bot-engine.js`:**
   - Add to trigger evaluation (line ~1500 in generated code):
   ```javascript
   case 'auktion_bid':
     // Check if user sent bid command; extract amount
     break;
   ```

3. **Action Handler in `bot-engine.js`:**
   - Add to action execution (line ~2000 in generated code):
   ```javascript
   case 'auction_place_bid':
     // Place bid in auction
     break;
   ```

4. **UI Form in `bot-ui.js`:**
   - Add form renderer:
   ```javascript
   function renderTriggerForm_auktion_bid(trigger) {
     return `<div>
       <input type="number" value="${trigger.minPrice||0}" 
         onchange="...">
     </div>`;
   }
   ```

**New Tab Group:**

- Currently two groups: `items` and `bots` (line 4197 in items.js)
- To add (e.g., `admin` group): 
  1. Add to `TAB_GROUPS`: `admin: ['settings','logs','backup']`
  2. Update `_applyGroupUI()` to toggle visibility properly (line 4207)
  3. Add obertab button in index.html for switching between groups
  4. Implement tab content modules

## Special Directories

**`.planning/codebase/`:**
- Generated by GSD mapping tool
- Contains architecture/structure/conventions/testing/concerns docs
- Do not edit manually; regenerate with `/gsd-map-codebase arch`

**`.git/`:**
- Standard Git history
- Commits track changes to all files above

## Patterns for Adding Code

**IDB Storage:**
```javascript
// 1. Define key constant
const _IDB_KEY = 'BC_MyFeature_v1';

// 2. Load at startup
async function _loadMyFeature() {
  _myData = await idbGet(_IDB_KEY) || { /* defaults */ };
}

// 3. Save with debounce
const _debouncedSaveMyFeature = _debounce(() => {
  idbSet(_IDB_KEY, _myData);
}, 1200);

// 4. On data change, call debounced save
_myData.value = newValue;
_debouncedSaveMyFeature();
```

**Rendering on Tab Switch:**
```javascript
// In module (e.g., curse-auction.js):
function renderCurseAuctionTab() {
  const el = document.getElementById('tab-curse-auction');
  if (!el) return;
  // Render UI from _curseAuction data
}

// Trigger from items.js switchTab():
// case 'curse-auction': renderCurseAuctionTab(); break;
```

**postMessage Request/Response:**
```javascript
// Tool sends:
function fetchAuctionData() {
  bcSend({ type: 'GET_CURSE_AUCTIONS' }, true);
}

// Loader receives & responds:
case 'GET_CURSE_AUCTIONS':
  const data = /* build from game state */;
  src.postMessage({ app: APP, type: 'CURSE_AUCTION_DATA', data }, ALLOWED_ORIGIN);
  break;

// Tool receives:
case 'CURSE_AUCTION_DATA':
  _curseAuction = ev.data.data;
  await idbSet(_IDB_KEY, _curseAuction);
  renderCurseAuctionTab();
  break;
```

---

*Structure analysis: 2026-09-11*
