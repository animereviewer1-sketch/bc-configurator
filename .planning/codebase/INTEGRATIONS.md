# External Integrations

**Analysis Date:** 2026-09-11

## APIs & External Services

**None — No external API integrations.**

The tool is a standalone client that communicates exclusively with the Bondage Club (BC) game via cross-window messaging. No third-party APIs are called.

## Data Storage

**Databases:**
- None — no backend database
- All state is client-side only

**Browser Storage:**
- **localStorage** — Direct key-value storage
  - Keys used: `__BCKBotStates`, `_tweaksKey`, `BCBot_Logs`, `BC_RoomEver_v1`
  - Migration path from localStorage to IndexedDB for logs
  - Connection: None (browser-native, no connection string)

- **IndexedDB** — Structured data storage
  - Used for: Bot logs, large outfit/config datasets
  - Migration: Legacy localStorage data migrated on first run
  - Client: `indexedDB.open(_IDB_NAME, _IDB_VERSION)` — see `items.js` line 13

**File Storage:**
- None — no file upload/download integration
- Export via: Outfit codes (LZString-compressed JSON, copy-paste)

**Caching:**
- Browser-native HTTP caching only
- Cache busting: Query string version stamps (`?_=<version>`)

## Authentication & Identity

**Auth Provider:**
- Custom — no OAuth/identity service
- Member number validation only: Bondage Club player ID (numeric)
- No authentication backend

**How it works:**
- Tool identifies players via their BC member number (integer)
- Member number passed from BC game via `window.postMessage`
- No login credentials; member number is the sole identifier

## Monitoring & Observability

**Error Tracking:**
- None — no external error reporting service
- Errors logged to browser console only

**Logs:**
- Client-side console.log via `BCK` logger in `loader.js`
- Persistent logs stored in IndexedDB via `bot-data.js`
- No centralized logging backend

## CI/CD & Deployment

**Hosting:**
- **GitHub Pages** (static hosting)
- Repository: `https://github.com/animereviewer1-sketch/bc-configurator`
- Published at: `https://animereviewer1-sketch.github.io/bc-configurator/`

**CI Pipeline:**
- None detected — manual push to GitHub triggers Pages rebuild
- No automated tests or build step

## Environment Configuration

**Required env vars:**
- None — tool has no environment variables

**Secrets location:**
- None — no secrets required
- CORS origin hardcoded: `https://animereviewer1-sketch.github.io` (security via origin check, not secrets)

**Configuration methods:**
1. UI form fields in index.html — settings persist to localStorage
2. JavaScript global variables — injected by bot-engine.js into BC game context
3. Direct IndexedDB writes for logs and state

## Cross-Window Communication (Bondage Club Integration)

**Protocol:** `window.postMessage()`

**Message Flow:**

**From loader.js (BC game tab) ← → index.html (configurator window):**

| Message Type | Direction | Purpose | Payload |
|---|---|---|---|
| `PING` / `PONG` | Bidirectional | Handshake — verify listener active | `{ app, type }` |
| `CACHE_DATA` | → Configurator | BC asset/item metadata | `{ cache, assetBase, assetFamily }` |
| `PLAYER_DATA` | → Configurator | Current character appearance | `{ player }` |
| `POS_DATA` | → Configurator | Character coordinates | `{ x, y }` |
| `CHAR_APPEARANCE_DATA` | → Configurator | Target character outfit | `{ character }` |
| `SCREENSHOT_DATA` | → Configurator | Screenshot blob | `{ screenshot }` |
| `OUTFIT_SCAN_DATA` | → Configurator | Room outfit inventory | `{ results, room }` |
| `MBS_WHEEL_DATA` | → Configurator | Wheel of Fortune data | `{ results, total }` |
| `LSCG_OUTFITS_DATA` | → Configurator | LSCG mod outfit list | `{ outfits }` |
| `LOCKS_DATA` | → Configurator | Item lock states | `{ locks }` |
| `CURSE_DATA` | → Configurator | Curse metadata | `{ curses }` |
| `EXEC` | ← Configurator | Execute JavaScript in BC | `{ code }` |
| `EXEC_OK` / `EXEC_ERR` | → Configurator | Command result | `{ msg }` |
| `WEAR_CURSE_OK` / `WEAR_CURSE_ERR` | → Configurator | Apply curse result | `{ msg }` |

**Validation:**
- Origin check: Only accepts messages from `https://animereviewer1-sketch.github.io` (see `loader.js` line 32)
- App identifier check: `ev.data.app === 'BCKonfigurator'` (prevents spoofed messages)

**Related files:**
- `loader.js` — Lines 800–1350: Message handlers and BC API calls
- `index.html` — Inline `<script>` handling `message` events
- `bot-ui.js` — `bcSend()` function for sending messages to BC tab

## Webhooks & Callbacks

**Incoming:**
- None — tool is passive, no listening endpoints

**Outgoing:**
- None — tool makes no webhook calls
- One-way communication only: BC game → Configurator window

## Game-Specific Integrations (Bondage Club)

**Global Variables Accessed from BC game:**
- `Asset` — Item definitions (array)
- `AssetFemale3DCGExtended` — Extended character assets
- `Player` — Current character object with inventory, appearance, settings
- `ChatRoomCharacters` — Room members
- `ChatRoomData` — Current room metadata
- `ExtensionSettings` — Player's extension-stored configuration (LSCG, DOGS, etc.)
- `ServerPlayerInventoryLoad()` — Function to apply outfit to character
- `CharacterRefresh()` — Function to update character on screen
- `AssetTextGet()` — Function to fetch asset label strings

**Third-Party Mod Support:**
- **LSCG** (Little Shackles Configuration Game) — outfit profile integration
- **DOGS** (Dungeons of Game Settings) — curse system integration
- **Wheel of Fortune** — minigame outfit scanning

## Data Formats

**Serialization:**
- **JSON** — Configuration, triggers, events, outfits
- **Base64** (LZString) — Compressed outfit codes and large data bundles
  - Example: `LZString.compressToBase64(JSON.stringify(outfit))`
  - Decompression: `JSON.parse(LZString.decompressFromBase64(code))`

**Code Injection:**
- **Template literal** — bot-engine generates ES6 template strings with embedded Base64 config
- Safe by design: No user input directly in template; config always Base64-encoded

---

*Integration audit: 2026-09-11*
