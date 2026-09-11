# Technology Stack

**Analysis Date:** 2026-09-11

## Languages

**Primary:**
- JavaScript (ES6+) - All core application logic and UI
- HTML5 - Single-page application shell (`index.html`)

**Note:** No build step or transpilation — code runs directly in browser

## Runtime

**Environment:**
- Browser JavaScript (no Node.js)
- GitHub Pages static hosting

**Package Manager:**
- None — this is a static site with no build toolchain or dependencies manifest

## Frameworks

**Core:**
- Vanilla JavaScript — no framework, direct DOM manipulation

**Libraries:**
- **lz-string** (1.5.0) — compression/decompression for outfit codes and serialized data
  - Loaded from CDN: `https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js`

**Fonts:**
- **Google Fonts** — typography delivery
  - Families: Inter Tight, Inter, JetBrains Mono
  - Loaded from: `https://fonts.googleapis.com`

## Key Dependencies

**Critical:**
- **lz-string** — required for outfit import/export and data serialization; any outage breaks save/load functionality
  - Used in: `items.js`, `loader.js`, outfit import/export workflows

**External Assets:**
- Google Fonts — typography only, graceful degradation to system fonts if CDN unavailable
- bc-favicon.svg — local asset

## Configuration

**Environment:**
- No .env files or external configuration
- Settings stored in localStorage (browser local storage)
- Game communication via hardcoded origin: `https://animereviewer1-sketch.github.io`

**Build:**
- No build config — direct HTML/JS deployment
- Cache busting via query string: `?_=[version]` on script includes

## Platform Requirements

**Development:**
- Text editor + browser with JavaScript support
- No build dependencies or install steps required
- Can be served locally or via HTTP

**Production:**
- Static HTTPS hosting (GitHub Pages)
- Browser must support:
  - ES6 JavaScript
  - localStorage API
  - IndexedDB API
  - window.postMessage API
  - Modern CSS (custom properties, flexbox, grid)

## Storage & Persistence

**Browser APIs:**
- **localStorage** — configuration, state, player settings (synchronous, ~5-10MB limit)
- **IndexedDB** — bot logs and large datasets (asynchronous, larger quota)

**Communication:**
- No database backend — all state client-side
- No server-side API — communicates only with Bondage Club game via `window.postMessage`

## Code Generation

**bot-engine.js** (`BOT_ENGINE_VERSION: 1.5.0`)
- Generates JavaScript code strings to be executed in the BC game tab
- Uses Base64 encoding for configuration serialization (prevents template literal injection)
- No external code evaluation — generated code is injected via `eval()` in BC context only

---

*Stack analysis: 2026-09-11*
