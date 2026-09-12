import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Eigene Minimal-Sandbox: bot-engine.js braucht weder DOM noch IDB noch
// items.js; haelt 01-03 unabhaengig vom parallel laufenden Plan 01-02
// (dessen gemeinsamer Sandbox-Loader hier bewusst NICHT importiert wird).

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function buildSandbox() {
  const sandbox = { console, btoa, atob, _money: undefined, _rankData: undefined, _shop: undefined }
  sandbox.window = sandbox
  vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, 'bot-engine.js'), 'utf8'), sandbox, { filename: 'bot-engine.js' })
  return sandbox
}

function makeBot(name, extra = {}) {
  return { id: 'b1', name, settings: { hearChat: true, modus: 'chat' }, triggers: [], events: [], szenen: [], ...extra }
}

// Der generierte Code wird NUR geparst, NIE aufgerufen (referenziert
// bcModSdk, ChatRoom, Player, die nur im Spiel-Tab existieren).
function parseOnly(code) {
  expect(() => new Function(code)).not.toThrow()
}

const ADVERSARIAL_NAMES = [
  'NormalName',
  'Back`tick',
  'Dollar${brace}',
  "O'Brien",
  'Quote"Double',
  "Combo `${x}` and 'quote'",
  'Trail\\',
  "Back\\'slash",
  'Multi\nLine',
  'CR\rLF\r\n',
  'Umlaut Ärger ✓',
];

describe('_buildBotCode Escaping (TEST-06)', () => {
  let ctx

  beforeAll(() => {
    ctx = buildSandbox()
    expect(typeof ctx._buildBotCode).toBe('function')
  })

  it.each(ADVERSARIAL_NAMES)('bot.name=%j erzeugt Code, den new Function() ohne SyntaxError akzeptiert', (name) => {
    parseOnly(ctx._buildBotCode(makeBot(name)))
  })

  it('bot.name überlebt die Generierung verlustfrei (botName-Literal)', () => {
    for (const name of ADVERSARIAL_NAMES) {
      const code = ctx._buildBotCode(makeBot(name))
      const m = code.match(/botName:'((?:[^'\\]|\\.)*)'/)
      expect(m, 'botName-Literal nicht gefunden für ' + JSON.stringify(name)).not.toBeNull()
      // Nur das isolierte String-Literal wird evaluiert, nicht der Bot-Code.
      expect(new Function("return '" + m[1] + "';")()).toBe(name)
    }
  })

  it('adversariale Nutzerdaten in id, settings, triggers, events und szenen brechen den Code nicht (Base64-Pfad)', () => {
    const evil = "x'\"`${y}\\\n\r</script>"
    const bot = makeBot(evil, {
      id: "b1'`${x}",
      settings: { hearChat: true, modus: 'chat', figurName: evil, figurRede: evil, figurErzaehler: evil },
      triggers: [{
        id: 't1', name: evil, aktiv: true,
        bedingungen: [{ typ: 'wort', wert: evil, logik: 'und' }],
        aktionen: [{ typ: 'chat', text: evil }],
      }],
      events: [{
        id: 'e1', name: evil, aktiv: true,
        bedingungen: [],
        aktionen: [{ typ: 'chat', text: evil }],
      }],
      szenen: [{ id: 's1', name: evil }],
    })
    const code = ctx._buildBotCode(bot)
    parseOnly(code)
    expect(code).toContain('_BID=')
    expect(code).toContain(JSON.stringify(bot.id))
  })

  it('Sandbox-Vertrag: ohne vordeklarierte _money/_rankData/_shop wirft _buildBotCode ReferenceError', () => {
    const sb = { console, btoa, atob }
    sb.window = sb
    vm.createContext(sb)
    vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, 'bot-engine.js'), 'utf8'), sb, { filename: 'bot-engine.js' })
    // Dokumentiert Pitfall 4 — die Produktionsdatei ist hier absichtlich unveraendert.
    // Cross-Realm-Hinweis (wie tests/load-script.test.js): vm.createContext() erzeugt eine
    // eigene Realm mit eigenem ReferenceError-Konstruktor, daher Nachricht statt Konstruktor prüfen.
    expect(() => sb._buildBotCode(makeBot('X'))).toThrow(/_money is not defined/)
  })
})
