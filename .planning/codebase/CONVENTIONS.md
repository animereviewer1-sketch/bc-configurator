# Coding Conventions

**Analysis Date:** 2026-09-11

## Naming Patterns

**Files:**
- Lowercase with hyphens: `bot-engine.js`, `bot-data.js`, `bot-ui.js`
- Descriptive names reflecting module purpose: `inventar.js`, `rank.js`, `money.js`, `shop.js`
- Utility files prefixed with domain: `bc-icons.js`, `bc-autobackup.js`
- Userscript files suffixed with `.user.js`: `dogs-lock-remover.user.js`

**Functions:**
- camelCase for all functions: `renderRankTab()`, `_rankById()`, `moneyAdj()`, `escJsAttr()`
- Module-private functions prefixed with underscore: `_saveRank()`, `_rankData`, `_buildBotCode()`
- Public API functions unprefixed: `rankDefNew()`, `moneyAddPlayer()`, `botField()`
- Event handlers use descriptive camelCase: `rankDefMoveUp()`, `moneyPromptSet()`, `evField()`

**Variables:**
- camelCase for regular variables: `maxLevel`, `entries`, `safeName`
- UPPER_SNAKE_CASE for module-level constants: `RANK_KEY`, `MONEY_KEY`, `BOT_ENGINE_VERSION`, `POPUP_W`
- Module-private state prefixed with underscore: `_rankData`, `_money`, `_rankData.players`
- German identifiers throughout codebase (comments, variable names, UI text): `Spieler`, `Rang`, `farbe`, `Zonenname`

**Types:**
- No TypeScript; plain JavaScript objects with informal structure conventions
- Objects use camelCase properties: `{name, icon, farbe, level, group}`
- Database/storage keys use SCREAMING_SNAKE_CASE: `'BC_Rank_v1'`, `'BC_Money_v1'`

## Code Style

**Formatting:**
- No formatter configured (.prettierrc, biome.json, etc. not present)
- Mixed spacing conventions observed:
  - Common: `function f() { ... }` with space after `function`
  - Also observed: `function f(){...}` without space
  - Arrow functions: `(a,b)=>a.level-b.level` (no spaces around =>)
  - Spaces around binary operators: `a + b`, `r.level - b.level`
- Ternary operators: no consistent spacing (`a?b:c` or `a ? b : c` both used)
- Semicolons present but not enforced; some lines omitted

**Linting:**
- No linting configuration found (.eslintrc*, eslint.config.*, biome.json)
- No automated formatting
- Code checked via `node --check` on all files (ad-hoc, manual process)

## Import Organization

**Structure:**
- No imports/exports (plain browser JavaScript, no build step)
- Script loading via `<script>` tags in HTML (`index.html`)
- Order in index.html:
  1. External libraries (LZ-string, Google Fonts)
  2. Core modules (bc-icons.js, bc-icons-ergaenzung.js)
  3. Feature modules loaded sequentially
- Global namespace pollution: all functions and state are global or module-scoped

**Dependency Pattern:**
- Module A depends on Module B by checking `typeof B !== 'undefined'` before use
- Cross-module state access via globals: `typeof _money === 'function'` to call `_money` functions
- No explicit dependency declaration; implicit via function/variable references

**Module Pattern:**
- Immediate invocation IIFE for initialization: `(async () => { ... })()`
- Module-level state maintained in uppercase constants and underscore-prefixed objects
- Each file is self-contained; no barrel exports

## Error Handling

**Patterns:**
- Try/catch blocks used for risky async operations:
  ```javascript
  try {
    const saved = await idbGet(RANK_KEY);
    // ... operations
  } catch (err) {
    console.warn('[Rank] IDB load error:', err);
  }
  ```
- `console.warn()` for recoverable errors with prefixed context: `'[Rank] IDB load error:'`
- `console.error()` rarely used; falls back to `console.warn()`
- User-facing errors via `alert()` and `confirm()`: `if(!confirm('Really delete?')) return;`
- Status messages via `showStatus()` helper: `showStatus('✅ Ränge: '+added+' neu...','success')`
- Null coalescing (`??`) and optional chaining (`?.`) used to prevent undefined errors
- Early return pattern for guard clauses: `if(!name?.trim()) return;`

**Error Recovery:**
- Errors don't throw; functions silently return `null` or `undefined`
- Fallback values via nullish coalescing: `_rankData.settings.queryCmd ?? '!rang'`
- Validation before state mutation: checks object exists before modifying: `if(!p) return;`

## Logging

**Framework:** console (browser native)

**Patterns:**
- Prefixed log messages with context in brackets: `'[Rank]'`, `'[Money]'`, `'[Bot]'`
- Severity levels via method: `console.warn()`, `console.error()`, `console.log()`
- Colored console output in loader via CSS formatting: `'%c' + P + ' [' + lv + ']'`, `'color:' + color`
- UTF-8 Unicode emojis for visual distinction: `'⚠ AntiStrip:'`, `'\u{1F512} NoStrip:'`
- Log output immediately during operations, not batched

**When to Log:**
- Async operation start/completion: "IDB load error"
- Feature activation/deactivation: "AntiStrip aktiv", "NoStrip beendet"
- User actions with side effects: implicit via console prefixes
- Errors and warnings only; success operations use UI feedback (showStatus)

## Comments

**When to Comment:**
- Complex algorithms need explanation: `// i / anz beziehen sich auf die Gruppe...` explains index scope
- Clarification of intent: `// Nicht die Level-Zahlen tauschen, sondern die Plaetze...`
- Workarounds and known issues: `// (_rankRelevel entfernt – wurde nur...` documents deletion reason
- Bug fixes referenced inline: `// FIX: validate origin to prevent other pages...`
- Large sections marked with separator lines: `// ── Section Name ────────────────────────────`

**JSDoc/TSDoc:**
- Not used; comments are informal
- No function signatures documented

## Function Design

**Size:** 
- Functions average 10–30 lines; largest is `_buildBotCode()` at ~100 lines
- Rendering functions 30–50 lines common (e.g., `renderRankTab()`, `renderRankPlayers()`)
- Single-responsibility observed: data mutation separated from rendering

**Parameters:**
- 0–3 parameters typical: `moneyAdj(id, sign)`, `rankDefEdit(id)`
- Complex data passed as object properties, not multiple params
- IDs passed as strings, not object references

**Return Values:**
- Functions often return nothing; side effects via state mutation
- Some return computed values: `_rankSorted()` returns array, `_rankById()` returns object or null
- Null (`null`) used for "not found" (consistent): `return _rankData.defs.find(...) ?? null`

## Module Design

**Exports:**
- No exports; all functions global or module-private
- Module-private pattern: prefix underscore, stored in file scope
- Public functions available on window implicitly

**Barrel Files:**
- No barrel exports; each file is loaded individually
- index.html controls module loading order via script tags

**Initialization Pattern:**
- Top-level IIFE for async init:
  ```javascript
  (async () => {
    try {
      const saved = await idbGet(RANK_KEY);
      // ... restore or initialize
    } catch (err) {
      console.warn('[Module] Error:', err);
    }
    renderTab();
  })();
  ```
- Initialization runs immediately on script load, not on demand

## HTML Escaping & Attribute Safety

**escHtml() — For HTML Content:**
- Escapes: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`
- Used for all user-provided text in HTML templates
- Pattern: `` `<span>${escHtml(value)}</span>` ``
- File: `items.js` (defined once, used globally)

**escJsAttr() — For onclick Attributes:**
- Escapes for use inside single-quoted JavaScript strings in onclick handlers
- Escapes: `\` → `\\`, `'` → `\'`, `\r` → `\\r`, `\n` → `\\n`, plus HTML entities
- NEVER use JSON.stringify for onclick values; use escJsAttr inside single quotes
- Pattern: `` `onclick="functionName('${escJsAttr(id)}')"` ``
- File: `items.js`
- Example from `rank.js`: `` `onclick="rankDefMoveUp('${r.id}')"` `` — r.id is already safe (synthetic), but pattern requires escJsAttr for user input
- Example from `inventar.js`: `` `onclick="itemDefDelete('${escJsAttr(d.id)}')"` `` — d.id is trusted but escJsAttr applied for consistency

**Never use JSON.stringify for onclick:**
- Reason: JSON.stringify uses double quotes, but onclick uses single quotes
- This breaks when value contains `"` character

**Code Inside _buildBotCode Template Literal:**
- Special escaping rules for code generation in `bot-engine.js` `_buildBotCode()` function
- Template literal contains JavaScript code that must be valid on injection
- Rules:
  - `\n` in generated code must be written as `\\n` (escaped backslash-n for newline in generated string)
  - Regex escapes: `\d` in generated code becomes `d` (backslash is consumed by template)
  - Variable interpolation via `${}`: used for safe IDs and Base64-encoded config
- File: `bot-engine.js` lines 81–150 show injection pattern

---

*Convention analysis: 2026-09-11*
