# Testing Patterns

**Analysis Date:** 2026-09-11

## Test Framework

**Runner:**
- No test framework checked in (no Jest, Vitest, Mocha, etc.)
- Testing approach: ad-hoc Node.js harnesses (not committed)
- Validation: `node --check` on all `.js` files (syntax checking only)

**Assertion Library:**
- Not applicable; no test framework present

**Run Commands:**
```bash
node --check *.js           # Syntax validation of all files
# Manual Node harnesses (created per test session, not committed)
# Tests run the generated bot code against stubbed BC environment
```

## Test File Organization

**Location:**
- No committed test files in codebase
- Test harnesses created ad-hoc in temporary directories or command-line tools
- Testing is exploratory, not part of the build/CI pipeline

**Naming:**
- Not applicable (no committed tests)

**Structure:**
- Manual test scripts created outside the repo when needed
- Pattern: run generated bot code (`_buildBotCode()` output) against mocked BC API

## Test Structure

**Ad-Hoc Testing Pattern:**
The only documented test pattern is manual harnesses that:
1. Load the configurator and generate bot code via `_buildBotCode()`
2. Create a stubbed BC environment with mock objects (Asset, CharacterSetFaction, etc.)
3. Execute the generated bot code against stubs
4. Verify output/side effects manually

**Syntax Validation:**
```bash
# All files checked for syntax errors before deployment
find . -name "*.js" -not -path "*/node_modules/*" | xargs node --check
```

**No Unit Tests:**
- No isolated function tests
- No integration test suite
- No E2E test harness

**No Fixtures or Factories:**
- Test data created inline in manual harnesses
- No shared test utilities

## Mocking

**Framework:** None; manual mocking in temporary test scripts

**Patterns:**
Example pattern for mocking BC API (created ad-hoc, not in repo):
```javascript
// Manual mock setup in test harness
const mockBC = {
  Account: {
    MemberNumber: 123,
    Name: 'TestPlayer'
  },
  Player: {
    MemberNumber: 123,
    Name: 'TestPlayer',
    Appearance: []
  },
  ServerSocket: {
    send: (type, data) => {
      console.log('ServerSocket.send:', type, data);
    }
  },
  ChatRoomCharacter: []
};

// Set globals
global.CharacterCache = mockBC;
global.ServerSocket = mockBC.ServerSocket;

// Load and execute generated bot code
const botCode = _buildBotCode(botConfig);
eval(botCode);
```

**What to Mock:**
- BC global API: `Asset`, `CharacterCache`, `ServerSocket`, `Character` constructor
- UI globals: `document`, browser APIs (for unit tests of dom-manipulation functions)
- IndexedDB: mock `idbGet()`, `idbSet()` to return test data

**What NOT to Mock:**
- HTML generation logic: test templates by rendering and inspecting output
- State mutations: test via state inspection (check `_rankData` after operation)
- Cross-module calls: let them execute (integration-style test)

## Coverage

**Requirements:** 
- None enforced
- No coverage tracking configured
- Coverage tracking would require a test runner (not present)

**View Coverage:**
- Not applicable; no test suite exists

## Test Types

**Unit Tests:**
- None committed
- Would test: escaping functions (`escHtml()`, `escJsAttr()`), ID generation, state mutations
- Current approach: manual verification during development

**Integration Tests:**
- None committed
- Manual harnesses test bot code generation + BC API interaction
- Scope: generated bot code execution against mocked BC environment

**E2E Tests:**
- Not used
- Manual testing in actual BC browser environment is the final validation

## Common Patterns

**Validation Before Test:**
Before testing, ensure:
1. `node --check *.js` passes (all files have valid syntax)
2. Manual mock setup matches current BC API (verify against BC source)
3. Bot code generation logic hasn't changed escaping rules

**Manual Testing Checklist for Bot Code Changes:**
1. Generate new bot code via `_buildBotCode(botConfig)`
2. Set up mock BC environment with required globals
3. Execute generated code: `eval(botCode)`
4. Verify:
   - No console errors
   - Event handlers attached correctly
   - State initialized (triggers, events, configurations)
   - Special characters in names don't break code injection (test with: `O'Brien`, `<script>`, etc.)

**Template Literal Escaping Tests:**
- For code inside `_buildBotCode()` template (lines 81–150 in `bot-engine.js`):
  - Verify `\n` in generated code is `\\n` (escaped)
  - Verify regex patterns like `\d` become `d` (not `\\d`)
  - Test with config values containing: backslashes, quotes, newlines
- Pattern: inject bot code with problematic characters and verify it still parses

**HTML Escaping Tests (Manual):**
Examples of test cases (would be automated if test framework existed):
```javascript
// escHtml() — for HTML content
escHtml("O'Brien")      // → O&#39;Brien (safe in HTML)
escHtml('<script>')     // → &lt;script&gt;
escHtml('{name}')       // → {name} (unchanged, safe)

// escJsAttr() — for onclick="func('...')"
escJsAttr("O'Brien")    // → O\'Brien (escaped single quote)
escJsAttr("a\\b")       // → a\\\\b (escaped backslash)
escJsAttr("line1\nline2") // → line1\\nline2 (escaped newline)
```

## Known Testing Limitations

**No Automated Testing:**
- Changes to bot code generation rely on manual verification
- Risk: escaping bugs in `_buildBotCode()` not caught until bot fails in BC
- Risk: HTML injection via user input goes unnoticed

**No Test Framework Setup Cost:**
- High cost to add test framework (requires build step or Node test imports)
- Codebase is plain browser JS with no build step; adding tests would require restructuring

**Manual Harness Approach:**
- Ad-hoc Node harnesses are created/discarded per session
- No knowledge transfer between test sessions
- Pattern not documented in code (only in conventions)

**Regex/Escaping Complexity:**
- Template literal escaping in `_buildBotCode()` is error-prone
- Rules differ from normal JS strings
- Only caught by running generated code and testing in BC environment

---

*Testing analysis: 2026-09-11*
