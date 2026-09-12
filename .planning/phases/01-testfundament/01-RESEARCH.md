# Phase 1: Testfundament - Research

**Researched:** 2026-09-12
**Domain:** Vitest-Testinfrastruktur für ein bestehendes, buildfreies Vanilla-JS-Tool (Node-`vm`-Sandbox für globale `<script>`-Dateien, fake-indexeddb, Escaping-Tests für Code-Generierung)
**Confidence:** MEDIUM-HIGH — Paketversionen und alle projektspezifischen Code-Aussagen sind direkt am Quellcode verifiziert (HIGH); allgemeine Vitest/vm-Praxis stammt aus der bereits vorliegenden Projekt-Recherche und Web-Quellen (MEDIUM/LOW, siehe `.planning/research/STACK.md`)

## Summary

Phase 1 fügt dem Repo eine Vitest-5-Testsuite hinzu, ohne die Produktionsauslieferung (statische `<script>`-Tags auf GitHub Pages) anzufassen. Aktuell existiert **kein** `package.json`, **kein** `.gitignore` und **kein** Build-Artefakt im Repo — beides muss neu angelegt werden, was risikofrei ist: GitHub Pages hat keine Actions-Workflows (`.github/workflows/` existiert nicht) und nutzt bereits `.nojekyll`, das heißt die Auslieferung ist ein reines "serve as-is" ohne Build-Erkennung. `node_modules/` muss über eine neue `.gitignore` ausgeschlossen werden.

Die drei Zieldateien `items.js`, `bot-data.js`, `outfit-import.js` sind reine globale `<script>`-Dateien ohne `export`/`import`. Sie lassen sich unverändert per Node-`vm`-Sandbox laden (Pattern A aus `.planning/research/STACK.md`), aber die Recherche hat mehrere **konkrete, am Quellcode verifizierte** Stolperstellen gefunden, die über die generische Projekt-Recherche hinausgehen (siehe Common Pitfalls): `items.js` enthält eine ungeschützte, nicht try/catch-umschlossene Top-Level-`localStorage.getItem(...)`-Anweisung (Zeile 4180), die den gesamten Ladevorgang der Datei abbricht, wenn `localStorage` im Sandbox-Objekt fehlt. `bot-data.js` löst am Ende seiner Top-Level-Async-IIFE unter bestimmten Bedingungen einen bloßen (nicht per `window.` qualifizierten) `addEventListener(...)`-Aufruf aus. `bot-engine.js`s `_buildBotCode()` referenziert `_money`, `_rankData` und `_shop` **ungeschützt** (ohne `typeof`-Guard) — diese Globals müssen im Test-Sandbox vordeklariert sein, sonst wirft der Aufruf einen `ReferenceError`.

Die wichtigste Einzelerkenntnis der Recherche: Ein direkter, mit `new Function()` reproduzierter Test der bestehenden `_buildBotCode()`-Escaping-Logik (`bot-engine.js:49`) zeigt, dass **Bot-Namen mit einem einfachen Anführungszeichen (`'`) aktuell einen `SyntaxError` im generierten Code auslösen** — die Escaping-Funktion behandelt nur Backslash und Backtick, nicht das einfache Anführungszeichen, in das der Name eingebettet wird. Das widerspricht dem in den Erfolgskriterien geforderten Verhalten ("Code, den `new Function()` ohne SyntaxError akzeptiert") und muss dem Planner explizit vorgelegt werden (siehe Pitfall 5 und Assumptions Log A1).

Ein weiterer wichtiger, am Code verifizierter Befund: `bot-data.js` enthält in seiner aktuellen (unkommittierten) Fassung **keine** Funktionen, die sich sinnvoll "Validatoren" nennen lassen (keine `TRIGGER_TYPES`/`ACTION_TYPES`-Definitionen, keine `isValid*`-Funktionen). Die Datei besteht fast vollständig aus DOM-gebundenen CRUD-/Render-Funktionen für Event-Editor-UI. Die einzigen Funktionen mit echtem Input-Guard-Verhalten sind `_botVarApply(memberNum, name, value)`, `_playerKeyApply(memberNum, name, key, has)` und `_normLogik(arr)`/`_migriereLogik()`. Diese sollten als TEST-05-Ziel für "Bot-Validatoren" verwendet werden — das muss aber als Annahme markiert und im Zweifel mit dem Nutzer bestätigt werden, da REQUIREMENTS.md keine konkreten Funktionsnamen nennt.

**Primary recommendation:** Vitest 5 + `@vitest/coverage-v8` + `fake-indexeddb` als reine devDependencies installieren; einen gemeinsamen `tests/helpers/loadScript.js`-Helfer bauen, der `items.js` → `bot-data.js`/`outfit-import.js` **in derselben `vm`-Context, in Script-Lade-Reihenfolge** lädt (nicht isoliert je Datei), mit den unten dokumentierten Pflicht-Stubs (`document`, `window`, `localStorage`, `setTimeout`/`clearTimeout`, `console`, `indexedDB` via `fake-indexeddb/auto`). Für TEST-06 zuerst mit adversariellen Fixtures (Backtick, `${`, einfaches Anführungszeichen) beweisen, ob `_buildBotCode()` bricht — der Recherchebefund zeigt, dass er es für das einfache Anführungszeichen tut — und dann entscheiden, ob der Plan eine minimale Escaping-Korrektur in `bot-engine.js` enthält.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Testausführung (`npm test`) | Dev-Tooling (Node, lokal) | — | Vitest läuft nur auf der Entwicklermaschine; nie Teil der Auslieferung |
| IDB-Helfer (`idbGet`/`idbSet`) | Browser / Client (Persistence) | Dev-Tooling (Test via fake-indexeddb) | Produktionscode bleibt im Browser-Tier; Tests simulieren die Browser-API in Node |
| Bot-Validatoren (`_botVarApply`, `_playerKeyApply`, `_normLogik`) | Browser / Client (UI-Layer, DOM-gebunden) | Dev-Tooling (Test via vm-Sandbox) | Funktionen mutieren In-Memory-State und rufen `document.getElementById` auf — gehören zur Presentation-/Feature-Schicht, nicht zu einer separaten Business-Logic-Schicht |
| Outfit-Import-Parser (`_oiDetectType`, `_oiBuildExecCode`) | Browser / Client (reine Funktionen, kein DOM-Zugriff nötig) | Dev-Tooling (Test via vm-Sandbox + LZString) | Parst Text zu Datenstruktur/Code-String; keine Rendering-Abhängigkeit — am leichtesten isoliert testbar |
| Bot-Code-Generator (`_buildBotCode`) | Browser / Client (Code-Generierung für Game-Tab) | Dev-Tooling (Test via vm-Sandbox + `new Function()`-Parse-Check) | Generiert Strings, die später in einem *anderen* Kontext (BC-Game-Tab) ausgeführt werden — Testgrenze ist "parst korrekt", nicht "läuft korrekt in BC" |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | `npm test` führt eine Vitest-Suite lokal aus; Produktionsauslieferung bleibt unverändert und ohne Build-Schritt | Kein `package.json`/`.gitignore` vorhanden (verifiziert) → beide neu anlegen; keine GitHub-Actions-Workflows vorhanden (verifiziert) → nichts an der Pages-Auslieferung ändert sich durch `package.json`. Siehe Standard Stack, Validation Architecture |
| TEST-02 | `items.js`, `bot-data.js`, `outfit-import.js` sind ohne Quelländerung per `vm`-Sandbox testbar | Konkrete Stub-Anforderungen je Datei am Quellcode verifiziert (Common Pitfalls 1–4, Code Examples) |
| TEST-03 | Canary-Test schlägt fehl, wenn `fake-indexeddb` fehlt | `idbGet`/`idbSet` fangen alle Fehler intern ab und geben `null`/`false` zurück, statt sichtbar zu werfen (verifiziert, `items.js:23-65`) — canary muss `globalThis.indexedDB` explizit prüfen, siehe Pitfall 3 |
| TEST-05 | Bot-Validatoren aus `bot-data.js` + Outfit-Import-Parser mit gültigen/ungültigen Eingaben getestet | Kein Treffer für "Validator"-Funktionen in `bot-data.js` per Namenskonvention — konkrete Ersatzkandidaten identifiziert (`_botVarApply`, `_playerKeyApply`, `_normLogik`); Parser-Funktionen `_oiDetectType`/`_oiBuildExecCode` lokalisiert und Verhalten verifiziert. Siehe Summary, Pitfall 6, Assumptions Log A2 |
| TEST-06 | Bot-Code-Generator erzeugt für Backticks/`${`/Sonderzeichen syntaktisch gültigen Code | **Reproduzierter Bug**: einfaches Anführungszeichen in `bot.name` bricht aktuell den generierten Code (VERIFIED per Node-Reproduktion). Siehe Pitfall 5, Code Examples, Assumptions Log A1 |
</phase_requirements>

## Standard Stack

Übernommen aus der bereits vorliegenden Projekt-Recherche `.planning/research/STACK.md` (dort am 2026-09-12 gegen die npm-Registry verifiziert) und in dieser Sitzung erneut gegen die Registry geprüft:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 5.0.0 | Test-Runner für browserfreie Logik | `npm view vitest version` → `5.0.0` [VERIFIED: npm registry, geprüft 2026-09-12]. Läuft nur lokal (devDependency); rührt die `<script>`-Auslieferung nicht an |
| @vitest/coverage-v8 | 5.0.0 | Coverage-Reporting | `npm view @vitest/coverage-v8 version` → `5.0.0` [VERIFIED: npm registry]. Major-Version muss mit `vitest` übereinstimmen |
| fake-indexeddb | 6.2.5 | In-Memory-IndexedDB für Node | `npm view fake-indexeddb version` → `6.2.5` [VERIFIED: npm registry]. `engines.node: >=18` [VERIFIED: npm registry] — Projekt-Node ist v24.12.0, passt |
| Node.js `vm`-Modul | eingebaut | Lädt globale `<script>`-Dateien ohne Quelländerung in Sandbox | Kein Install nötig; Kern des Pattern-A-Ansatzes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lz-string | 1.5.0 (bereits Produktionsabhängigkeit, per CDN) | Für realistische `outfit-import.js`-Tests als `devDependency` zusätzlich lokal installieren (`npm install -D lz-string@1.5.0`), damit `LZString.compressToBase64`/`decompressFromBase64` im Sandbox real funktionieren statt nur den Fallback-Pfad zu testen | Immer wenn `_oiBuildExecCode` mit echten komprimierten Fixtures getestet wird (empfohlen für TEST-05) |

Kein `happy-dom`/`jsdom` nötig — alle drei Zieldateien lassen sich mit reinen Objekt-Stubs (`document`, `window`) laden; ein echtes DOM wird für Phase 1 nicht gebraucht (siehe Common Pitfalls für die exakten Stub-Anforderungen).

**Installation:**
```bash
npm install -D vitest@5 @vitest/coverage-v8@5 fake-indexeddb@6 lz-string@1.5.0
```

**package.json (minimal, neu anzulegen):**
```json
{
  "name": "bc-universal-configurator-tests",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "5.0.0",
    "@vitest/coverage-v8": "5.0.0",
    "fake-indexeddb": "6.2.5",
    "lz-string": "1.5.0"
  }
}
```
`"private": true` verhindert versehentliches Publizieren; `"type": "commonjs"` hält die Test-Dateien im gewohnten Stil (kein `import`/`export` in den Produktionsdateien nötig). Kein `dependencies`-Feld — `lz-string` bleibt in Produktion ein CDN-`<script>`-Tag, die lokale Kopie dient ausschließlich Tests.

**`.gitignore` (neu anzulegen — existiert aktuell nicht im Repo, verifiziert):**
```
node_modules/
coverage/
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| vitest | npm | veröffentlicht 2026-09-03 (~9 Tage alt zum Recherchezeitpunkt) | 77.062.981/Woche | github.com/vitest-dev/vitest | `SUS` (Grund: "too-new") | **Approved trotz SUS-Flag** — Downloadzahl und Repo widerlegen den Heuristik-Alarm eindeutig (Major-Release eines etablierten Projekts, kein neues/verwaistes Paket). Planner sollte trotzdem einen `checkpoint:human-verify` vor der Installation einfügen, da das die Vorgabe des Legitimacy-Gates ist |
| @vitest/coverage-v8 | npm | veröffentlicht 2026-09-03 | 29.446.354/Woche | github.com/vitest-dev/vitest | `SUS` (Grund: "too-new") | Gleiche Einschätzung wie vitest — selbes Monorepo, gleicher Release-Zyklus |
| fake-indexeddb | npm | veröffentlicht 2025-11-07 | 4.461.949/Woche | github.com/dumbmatter/fakeIndexedDB | `OK` | Approved |
| lz-string | — (bereits Produktionsabhängigkeit, unverändert) | — | — | — | n/a | Kein neuer Audit nötig — nur als lokale Dev-Kopie derselben bereits genutzten Version hinzugefügt |

**Packages removed due to [SLOP] verdict:** keine
**Packages flagged as suspicious [SUS]:** `vitest`, `@vitest/coverage-v8` — Grund ist ausschließlich das Veröffentlichungsdatum der Major-Version (9 Tage), nicht Download-Zahl oder fehlendes Repo. Der Planner **muss** dennoch einen `checkpoint:human-verify` vor `npm install -D vitest@5 @vitest/coverage-v8@5` einplanen, wie vom Legitimacy-Gate-Protokoll gefordert — unabhängig davon, dass die Downloadzahlen (77M/Woche) das Risiko in der Praxis stark relativieren.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Vitest Test-Datei (*.test.js)│        │  tests/helpers/loadScript.js  │
│  z.B. tests/idb-helpers.test.js│──────▶│  liest Quelldatei per fs,     │
└─────────────────────────────┘  ruft   │  baut Sandbox-Objekt,         │
                                  auf    │  vm.createContext + runInContext│
                                         └───────────────┬──────────────┘
                                                          │ füllt Sandbox mit:
                                                          ▼
                        ┌───────────────────────────────────────────────────┐
                        │ Sandbox: { console, setTimeout, clearTimeout,      │
                        │   document:{getElementById,addEventListener},      │
                        │   window:<self>, localStorage:{getItem,setItem,…}, │
                        │   indexedDB: globalThis.indexedDB (fake-indexeddb),│
                        │   addEventListener:<no-op>, LZString (optional) }  │
                        └───────────────────────┬─────────────────────────────┘
                                                 │ vm.runInContext(items.js) zuerst
                                                 ▼
                        ┌───────────────────────────────────────────────────┐
                        │ Sandbox jetzt erweitert um: idbGet, idbSet,         │
                        │ _debounce, APP, CACHE, PROFILES, …                  │
                        └───────────────────────┬─────────────────────────────┘
                                                 │ vm.runInContext(bot-data.js) danach
                                                 │ (referenziert idbGet/idbSet aus obigem Schritt)
                                                 ▼
                        ┌───────────────────────────────────────────────────┐
                        │ Sandbox jetzt erweitert um: _bots, _botVarApply,    │
                        │ _playerKeyApply, _normLogik, …                      │
                        └───────────────────────┬─────────────────────────────┘
                                                 │ Test greift auf sandbox.<fn> zu
                                                 ▼
                                    ┌────────────────────────┐
                                    │ expect(sandbox.idbGet…) │
                                    │ expect(sandbox._botVarApply…)│
                                    └────────────────────────┘
```

Getrennt davon, ohne Sandbox-Kopplung an `items.js` (da `_buildBotCode` nur `window` + drei bare Globals braucht):

```
┌───────────────────────────┐    minimaler Sandbox: window, _money, _rankData, _shop
│ bot-engine.js (vm-geladen)│───▶ vm.runInContext liefert sandbox._buildBotCode
└───────────┬───────────────┘
            │ Test ruft sandbox._buildBotCode(adversarialBotFixture) auf
            ▼
   generierter Code-String
            │
            ▼
   new Function(code)   ──▶ wirft SyntaxError? ──▶ Test schlägt fehl / dokumentiert Bug
```

### Recommended Project Structure
```
tests/
├── helpers/
│   └── loadScript.js         # vm-Sandbox-Loader, gemeinsam für alle Zieldateien
├── setup/
│   └── fake-indexeddb.js     # setupFiles-Eintrag: import 'fake-indexeddb/auto'
├── idb-helpers.test.js       # TEST-02 + TEST-03 (idbGet/idbSet + Canary)
├── idb-canary.test.js        # TEST-03: eigener Test, damit "genau ein Test" beim Entfernen fehlschlägt
├── bot-data-validators.test.js  # TEST-05 (_botVarApply, _playerKeyApply, _normLogik)
├── outfit-import-parser.test.js # TEST-05 (_oiDetectType, _oiBuildExecCode)
└── bot-engine-escaping.test.js  # TEST-06 (_buildBotCode + new Function())
vitest.config.js
package.json
.gitignore
```

### Pattern 1: Sequenzielles Laden in gemeinsame vm-Context (Ladereihenfolge nachbilden)
**What:** `items.js` zuerst in eine Sandbox laden, danach `bot-data.js`/`outfit-import.js` **in dieselbe** Sandbox — nicht in isolierte, separate Contexts.
**When to use:** Immer, wenn eine Zieldatei auf Globals aus `items.js` zugreift (bot-data.js nutzt `idbGet`/`idbSet` direkt, ohne `typeof`-Guard — `items.js:78-106` vs `bot-data.js:78-106`).
**Example:**
```js
// tests/helpers/loadScript.js
const fs = require('node:fs');
const vm = require('node:vm');

function makeBaseSandbox(extra = {}) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: {
      _store: new Map(),
      getItem(k) { return this._store.has(k) ? this._store.get(k) : null; },
      setItem(k, v) { this._store.set(k, String(v)); },
      removeItem(k) { this._store.delete(k); },
    },
    document: {
      getElementById: () => null,
      addEventListener: () => {},
    },
    addEventListener: () => {}, // bare (unqualified) global — siehe Pitfall 2
    indexedDB: globalThis.indexedDB, // von fake-indexeddb/auto in setupFiles bereitgestellt
    ...extra,
  };
  sandbox.window = sandbox; // self-reference, klassisches Browser-Pattern
  vm.createContext(sandbox);
  return sandbox;
}

function loadInto(sandbox, path) {
  const code = fs.readFileSync(path, 'utf8');
  vm.runInContext(code, sandbox, { filename: path });
  return sandbox;
}

module.exports = { makeBaseSandbox, loadInto };
```
```js
// tests/idb-helpers.test.js
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll } from 'vitest';
import { makeBaseSandbox, loadInto } from './helpers/loadScript.js';

let ctx;
beforeAll(() => {
  ctx = makeBaseSandbox();
  loadInto(ctx, new URL('../items.js', import.meta.url).pathname);
  loadInto(ctx, new URL('../bot-data.js', import.meta.url).pathname); // nutzt ctx.idbGet/idbSet
});

it('idbSet/idbGet round-trip', async () => {
  await ctx.idbSet('foo', { a: 1 });
  expect(await ctx.idbGet('foo')).toEqual({ a: 1 });
});
```

### Pattern 2: IDB-Canary als eigener Test (TEST-03)
**What:** Ein dedizierter Test, der ausschließlich prüft, dass `indexedDB` echt vorhanden ist — getrennt von den funktionalen IDB-Tests.
**When to use:** Immer als allererster Test in der Suite, damit ein Fehlen von `fake-indexeddb` in `setupFiles` sofort und mit klarer Meldung auffällt, statt in einem funktionalen Test unterzugehen (siehe Pitfall 3).
**Example:**
```js
// tests/idb-canary.test.js
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';

describe('IDB canary', () => {
  it('fake-indexeddb ist aktiv (kein stiller localStorage-Fallback)', () => {
    expect(globalThis.indexedDB, 'globalThis.indexedDB fehlt — fake-indexeddb/auto wurde nicht geladen. idbGet/idbSet würden jeden Fehler intern verschlucken und still null/false liefern.').toBeDefined();
    expect(typeof globalThis.indexedDB.open).toBe('function');
  });
});
```
Entfernt man den `setupFiles`-Eintrag, schlägt **genau dieser** Test mit der oben angegebenen, klaren Meldung fehl — alle anderen Tests, die `idbGet`/`idbSet` verwenden, würden ohne diesen Canary lediglich generische "expected null to equal {...}"-Fehler zeigen (verifiziert per Code-Lesung von `items.js:23-65`: beide Funktionen fangen jeden Fehler intern ab).

### Pattern 3: `_buildBotCode` mit minimalem Bot-Fixture + Parse-Check (TEST-06)
**What:** `bot-engine.js` isoliert laden (nur `window` + `_money`/`_rankData`/`_shop` als Sandbox-Globals, siehe Pitfall 4), mit einem minimalen `bot`-Objekt (leere `triggers`/`events`, damit `CURSE_DB`/`PROFILES` nicht referenziert werden) aufrufen und den Rückgabewert durch `new Function()` parsen.
**Example:**
```js
// tests/bot-engine-escaping.test.js
import { describe, it, expect } from 'vitest';
import { makeBaseSandbox, loadInto } from './helpers/loadScript.js';

function makeBotFixture(name) {
  return {
    id: 'b1', name,
    settings: { hearChat: true, modus: 'chat' },
    triggers: [], events: [], szenen: [],
  };
}

const ADVERSARIAL_NAMES = [
  'NormalName',
  'Back`tick',
  'Dollar${brace}',
  "O'Brien",          // <-- verifiziert: bricht aktuell den generierten Code
  'Quote"Double',
  'Combo `${x}` and \'quote\'',
];

describe('_buildBotCode escaping', () => {
  let ctx;
  beforeAll(() => {
    ctx = makeBaseSandbox({ _money: undefined, _rankData: undefined, _shop: undefined });
    loadInto(ctx, new URL('../bot-engine.js', import.meta.url).pathname);
  });

  it.each(ADVERSARIAL_NAMES)('bot.name=%s erzeugt parsbaren Code', (name) => {
    const code = ctx._buildBotCode(makeBotFixture(name));
    expect(() => new Function(code)).not.toThrow();
  });
});
```
**Bekanntes Ergebnis (VERIFIED per Node-Reproduktion in dieser Recherche):** Der Fall `"O'Brien"` schlägt mit der aktuellen `bot-engine.js`-Implementierung fehl (`SyntaxError: missing ) after argument list`), weil `safeName = bot.name.replace(/\\/g,'\\\\').replace(/\`/g,'\\\`')` (`bot-engine.js:49`) einfache Anführungszeichen nicht escaped, obwohl `${safeName}` mehrfach in einfach gequoteten Strings des generierten Codes landet (`bot-engine.js:802,1826,2923,3213,3241,3244`). Backtick und `${` allein brechen **nicht** (sie landen in einem einfach gequoteten Kontext, in dem `${` keine Sonderbedeutung hat und Backtick durch die vorhandene Escaping-Regel neutralisiert wird).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| IndexedDB-Simulation in Node | Eigener IDB-Mock/Stub-Objekt | `fake-indexeddb` | Deckt Transaktionen, `onupgradeneeded`, `onblocked`, echte Fehlerarten (`QuotaExceededError`) ab — ein Handmock würde genau die Semantik verfehlen, die TEST-03/TEST-04 später prüfen sollen |
| LZString-Kompatibilitätsprüfung für `outfit-import.js` | Eigene Fake-Kompression | echtes `lz-string`-npm-Paket (gleiche Version 1.5.0 wie Produktion) als Dev-Dependency | `_oiBuildExecCode` prüft `typeof LZString !== 'undefined'` — nur mit echter Bibliothek werden reale Kompressions-Bugs sichtbar, nicht nur der Fallback-Pfad |
| Prüfung, ob generierter Code syntaktisch gültig ist | Eigener Mini-Parser/Regex-Check auf Backticks/Quotes | `new Function(code)` (nur Parse, nicht ausführen) | Ist der native JS-Parser selbst — genau das Werkzeug, das später `eval()`/Injection in BC verwendet, um den Code zu interpretieren |

**Key insight:** Für Phase 1 gilt: alles, was eine Browser-API simuliert (IndexedDB, LZString-Kompression, JS-Syntaxprüfung), sollte durch echte, für Node verfügbare Implementierungen ersetzt werden statt durch handgeschriebene Stubs — Stubs sind nur für reine Vorhandensein-Checks (`document.getElementById` → `null`, `addEventListener` → No-op) angemessen, nicht für Verhalten, das ein Test tatsächlich verifizieren soll.

## Common Pitfalls

### Pitfall 1: Ungeschützter Top-Level-`localStorage.getItem`-Aufruf in `items.js` bricht das gesamte Laden ab
**What goes wrong:** `items.js:4178-4189` enthält eine Top-Level-IIFE `(function() { const s = localStorage.getItem('BC_CACHE_v12'); ... })();`, deren `localStorage.getItem`-Aufruf **nicht** in ein try/catch eingebettet ist (nur das nachfolgende `JSON.parse` ist es). Andere `localStorage`-Zugriffe im selben File (z. B. Zeilen 459-460, 488) sind sehr wohl mit `try {} catch {}` umschlossen — diese Stelle ist eine Ausnahme.
**Why it happens:** Der Datei fehlt eine einheitliche Konvention; die meisten `localStorage`-Zugriffe sind defensiv, diese eine Top-Level-IIFE nicht.
**How to avoid:** Der `vm`-Sandbox **muss** ein `localStorage`-Objekt mit funktionierendem `getItem` (z. B. gibt `null` zurück) bereitstellen, bevor `items.js` geladen wird — sonst wirft `vm.runInContext(itemsJsCode, sandbox)` einen `ReferenceError: localStorage is not defined`, der den kompletten Ladevorgang abbricht und alles, was danach in der Datei folgt (u. a. `TAB_GROUPS`, der `postMessage`-Handler bei Zeile 5917, `APP` bei Zeile 5810), niemals in der Sandbox definiert wird.
**Warning signs:** `ReferenceError: localStorage is not defined` beim ersten Testlauf; Symptome wie "`ctx.idbGet` ist keine Funktion", obwohl `idbGet` weit vor Zeile 4178 im File steht — Ursache ist der Abbruch bei Zeile 4180, nicht ein Problem mit `idbGet` selbst.
**Phase to address:** Testfundament (Setup-Task für den `loadScript.js`-Helfer).

### Pitfall 2: Bloßer (unqualifizierter) `addEventListener`-Aufruf am Ende von `bot-data.js`s Async-Init
**What goes wrong:** `bot-data.js:149` ruft `addEventListener('DOMContentLoaded', function () {...})` **ohne** `window.`-Präfix auf, falls `renderBotTab` zum Zeitpunkt der Auflösung noch nicht existiert (Zeile 148-151). Dieser Aufruf läuft asynchron nach dem `await idbGet(...)` **außerhalb** des umschließenden try/catch (das bei Zeile 143 endet).
**Why it happens:** In echten Browsern ist `addEventListener` ohne Präfix identisch mit `window.addEventListener`, weil `window` das globale Objekt ist. In einer `vm`-Sandbox ist das nur der Fall, wenn `addEventListener` explizit als Property **auf dem Sandbox-Objekt selbst** (nicht nur unter `sandbox.window.addEventListener`) gesetzt ist.
**How to avoid:** Sandbox muss sowohl `sandbox.addEventListener` als auch `sandbox.window.addEventListener` bereitstellen (trivial, wenn `sandbox.window = sandbox` gesetzt wird, siehe Code-Beispiel oben) — als No-op-Funktion.
**Warning signs:** Unhandled Promise Rejection in der Testausgabe ("addEventListener is not defined") ohne erkennbaren synchronen Fehler; Vitest kann solche unhandled rejections je nach Konfiguration als Testfehler in einer *anderen*, scheinbar unbeteiligten Testdatei melden.
**Phase to address:** Testfundament (Setup-Task).

### Pitfall 3: `idbGet`/`idbSet` verschlucken jeden Fehler — Canary-Test ist die einzige Absicherung gegen stille Fallbacks (TEST-03)
**What goes wrong:** `items.js:23-65` zeigt: Sowohl `idbGet` als auch `idbSet` fangen **jeden** Fehler (inkl. `ReferenceError: indexedDB is not defined`, falls `fake-indexeddb` fehlt) intern ab und geben `null` bzw. `false` zurück — niemals wird ein Fehler sichtbar geworfen. Ein funktionaler Test wie `idbSet('foo',{a:1}); expect(await idbGet('foo')).toEqual({a:1})` würde beim Fehlen von `fake-indexeddb` einfach mit "expected null to equal {a:1}" fehlschlagen — eine generische, nicht selbsterklärende Meldung.
**Why it happens:** Das Verschlucken ist im Produktionscode absichtlich (verhindert Abstürze bei vollem Speicher/fehlendem Browser-Support), macht aber Testfehler ohne dedizierten Canary uneindeutig.
**How to avoid:** Eigener Canary-Test (siehe Pattern 2 oben), der **vor** allen funktionalen IDB-Tests `globalThis.indexedDB` explizit auf Vorhandensein und Funktionsfähigkeit prüft, mit einer Fehlermeldung, die exakt erklärt, was fehlt und warum.
**Warning signs:** IDB-Tests "bestehen" nie richtig grün, liefern aber auch keine aussagekräftige Fehlermeldung beim Fehlschlagen.
**Phase to address:** Testfundament — Canary muss im selben Commit wie das `setupFiles`-Wiring entstehen.

### Pitfall 4: `_buildBotCode` referenziert `_money`, `_rankData`, `_shop` ungeschützt (kein `typeof`-Guard)
**What goes wrong:** In `bot-engine.js:52` (der `_cfgRaw`-Konstruktion) werden `_money?.settings?.queryCmd`, `_rankData?.settings?.queryCmd` und `_shop?.settings?.cmd` per Optional Chaining abgefragt — Optional Chaining schützt aber nur vor `null`/`undefined` **Werten**, nicht vor komplett **undeklarierten** Identifiern. Andere Globals in derselben Zeile (`_botVars`, `_playerKeys`, `_itemDefs`, `_inventar`) sind hingegen korrekt mit `typeof X !== 'undefined'` abgesichert.
**Why it happens:** Inkonsistente Absicherung zwischen den elf referenzierten Globals in derselben Zeile — drei fehlen den Guard.
**How to avoid:** Sandbox für `bot-engine.js`-Tests muss `_money`, `_rankData`, `_shop` explizit deklarieren (auch als `undefined`-Wert reicht, solange die Property auf dem Sandbox-Objekt existiert).
**Warning signs:** `ReferenceError: _money is not defined` beim ersten Aufruf von `_buildBotCode()` in einem Test.
**Phase to address:** Testfundament (TEST-06-Test-Setup).

### Pitfall 5: `_buildBotCode`-Escaping deckt einfaches Anführungszeichen nicht ab — verifizierter Bug, betrifft TEST-06 direkt
**What goes wrong:** `safeName = bot.name.replace(/\\/g,'\\\\').replace(/\`/g,'\\\`')` (`bot-engine.js:49`) escaped nur Backslash und Backtick. `${safeName}` wird an sechs Stellen (`bot-engine.js:802,1826,2923,3213,3241,3244`) in **einfach gequotete** Strings des generierten Codes eingebettet (z. B. `botName:'${safeName}'`). Enthält `bot.name` ein einfaches Anführungszeichen (z. B. `O'Brien`), terminiert dieses Zeichen den generierten String vorzeitig → der von `_buildBotCode` zurückgegebene Code ist syntaktisch ungültig.
**Reproduktion (in dieser Recherche durchgeführt, mit den exakten Regex-Ersetzungen aus `bot-engine.js:49` gegen `new Function()` getestet):**
```
FAIL : "O'Brien" -> missing ) after argument list
       | generated: "function _log(){ console.log('[Bot:O'Brien]'); }"
OK   : "Back`tick"          (Backtick allein bricht nicht — wird korrekt escaped)
OK   : "Dollar${brace}"     (${ allein bricht nicht — inert in einfach gequotetem Kontext)
```
**Why it happens:** Die Escaping-Funktion wurde offenbar für einen Backtick-/Template-Literal-Kontext geschrieben (daher Backtick-Escaping), aber tatsächlich landet der Wert überall in einfach gequoteten Strings, wo stattdessen das einfache Anführungszeichen das kritische Zeichen ist.
**How to avoid:** Der Plan für Phase 1 muss explizit entscheiden: (a) TEST-06 schreibt einen Test, der diesen bekannten Fehlerfall **dokumentiert und erwartet** (`expect(...).toThrow()`), ohne `bot-engine.js` zu ändern — das widerspricht aber dem Wortlaut des Erfolgskriteriums 5 ("...Code, den `new Function()` **ohne SyntaxError** akzeptiert"); oder (b) der Plan enthält eine minimale, gezielte Korrektur der `safeName`-Escaping-Regel (z. B. zusätzlich `.replace(/'/g, "\\'")`), da `bot-engine.js` nicht zu den in TEST-02 explizit als "unverändert zu lassen" benannten drei Dateien (`items.js`, `bot-data.js`, `outfit-import.js`) gehört. **Empfehlung:** Option (b), da sie das explizite Erfolgskriterium erfüllbar macht und keine der harten Produktions-Constraints (kein Build-Schritt, keine `<script>`-Änderung in `index.html`) verletzt.
**Warning signs:** Bot-Injection schlägt "für manche Spielernamen/Bot-Namen" fehl — klassisches Symptom von Escaping-Lücken bei Sonderzeichen (siehe auch `.planning/research/PITFALLS.md` Pitfall 5, dort bereits als generisches Muster beschrieben, hier am Code konkret verifiziert).
**Phase to address:** Testfundament (TEST-06) — Entscheidung muss vor Planerstellung getroffen oder als offene Frage/Checkpoint markiert werden.

### Pitfall 6: `bot-data.js` enthält keine Funktionen, die sich "Validatoren" nennen lassen
**What goes wrong:** REQUIREMENTS.md (TEST-05) verlangt Tests für "Bot-Validatoren aus `bot-data.js`". Eine vollständige Durchsicht der 911 Zeilen zeigt: keine `TRIGGER_TYPES`/`ACTION_TYPES`-Definitionen, keine Funktion mit "valid" im Namen, keine zentrale Eingabeprüfung. Die Datei besteht aus Gruppen-CRUD (`groupNew`, `groupDelete`, …), Event-CRUD (`eventNew`, `evField`, `evCondField`, …) und Log-Handling — praktisch alles DOM-gebunden über `document.getElementById`/`_saveBots()`/`renderEventsTab()`.
**Why it happens:** Vermutlich hat sich `bot-data.js` seit der ursprünglichen Anforderungsdefinition inhaltlich verschoben (die Datei ist Teil der ~900 unkommittierten lokalen Änderungen laut STATE.md), oder die Anforderung bezog sich von Anfang an lose auf Guard-Clauses statt auf dedizierte Validator-Funktionen.
**How to avoid:** Die einzigen Kandidaten mit echtem Eingabe-Guard-Verhalten sind: `_botVarApply(memberNum, name, value)` (verwirft bei `memberNum==null || !name`), `_playerKeyApply(memberNum, name, key, has)` (verwirft bei `memberNum==null`, validiert `key` gegen `['bronze','silver','gold']`) und `_normLogik(arr)`/`_migriereLogik()` (normalisiert das erste Element eines Bedingungs-Arrays). Diese sollten als TEST-05-Ziel dienen — der Plan sollte das explizit benennen statt sich auf eine wörtliche "Validator"-Suche zu verlassen.
**Warning signs:** Ein Planner, der versucht, eine Funktion namens `validateXyz` in `bot-data.js` zu finden, wird keine finden — das ist erwartet, keine Fehlkonfiguration.
**Phase to address:** Testfundament (TEST-05) — vor Planerstellung mit dem Nutzer abgleichen oder im Plan explizit als Scoping-Entscheidung dokumentieren (siehe Assumptions Log A2).

### Pitfall 7: `core.autocrlf=true` ohne `.gitattributes` — CRLF-Warnung ist real, aber harmlos für `vm`
**What goes wrong:** `git config core.autocrlf` steht auf `true`, es existiert kein `.gitattributes`. Ein `git add`-Trockenlauf auf `items.js` erzeugt tatsächlich `warning: in the working copy of 'items.js', LF will be replaced by CRLF the next time Git touches it` [VERIFIED: git-Ausgabe auf diesem Rechner]. Die Dateien selbst liegen aktuell mit reinen LF-Zeilenenden auf der Platte [VERIFIED: Byte-Inspektion von `items.js`].
**Why it happens:** Windows-typische Git-Konfiguration ohne projektweite Zeilenenden-Policy.
**How to avoid:** Für `vm.runInContext` und `fs.readFileSync(path, 'utf8')` spielt CRLF vs. LF keine Rolle — der JS-Parser akzeptiert beide als Zeilenumbruch. Das Risiko ist rein kosmetisch (verrauschte Diffs), betrifft aber **neue** Testdateien: ohne `.gitattributes` könnten neu erstellte `tests/*.js`-Dateien beim ersten Commit von LF auf CRLF konvertiert werden. Empfehlung: neue Testdateien mit `.gitattributes`-Eintrag (`tests/** text eol=lf`) versehen oder bewusst hinnehmen, da es keine Funktionsauswirkung hat.
**Phase to address:** Testfundament (optional, geringe Priorität).

## Code Examples

Siehe Architecture-Patterns-Sektion oben für vollständige, direkt einsetzbare Beispiele (`loadScript.js`-Helfer, IDB-Canary-Test, `_buildBotCode`-Escaping-Test).

### `_oiDetectType` — reine Funktion, ideal für TEST-05
```js
// Quelle: outfit-import.js:346-353 (verifiziert per Lesen)
function _oiDetectType(code) {
  if (/^[A-Za-z0-9+/=]{20,}$/.test(code.trim())) return 'lzbase64';
  if (/^[A-Za-z0-9\-_.~]{20,}$/.test(code.trim())) return 'lzuri';
  return 'js';
}
```
Testfälle (gültig/ungültig): ein echter LZString-Base64-Output (`LZString.compressToBase64(...)` mit echtem `lz-string`-Paket) → `'lzbase64'`; ein URL-sicherer LZString-Output (`compressToEncodedURIComponent`) → `'lzuri'`; roher JS-Code (`'ServerPlayerInventoryLoad([...])'`) → `'js'`; leerer String → `'js'` (Edge Case, da beide Regexe `{20,}` verlangen).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TEST-06 erfordert eine minimale Escaping-Korrektur in `bot-engine.js` (Single-Quote-Escaping ergänzen), da der aktuelle Code das explizite Erfolgskriterium 5 nicht erfüllt | Pitfall 5, Phase Requirements | Falls der Nutzer keine Quelländerung an `bot-engine.js` in Phase 1 wünscht, muss der Plan stattdessen einen Test schreiben, der den Bug dokumentiert (`toThrow()`), und Erfolgskriterium 5 gilt dann nur für Backtick/`${`, nicht für Anführungszeichen — das widerspricht dem Wortlaut "Sonderzeichen" und sollte vor Planerstellung geklärt werden |
| A2 | "Bot-Validatoren aus `bot-data.js`" (TEST-05) bezieht sich auf `_botVarApply`, `_playerKeyApply` und `_normLogik`/`_migriereLogik`, da keine wörtlich benannten Validator-Funktionen existieren | Pitfall 6, Phase Requirements | Falls der Nutzer andere Funktionen meinte (z. B. aus `bot-ui.js`, das nicht Teil von TEST-02s vm-Sandbox-Liste ist), deckt der Plan die falschen Funktionen ab und TEST-05 bleibt inhaltlich unerfüllt trotz grüner Tests |
| A3 | Ein `package.json` mit `"private": true` und ohne `dependencies`-Feld beeinflusst die GitHub-Pages-Auslieferung nicht, da keine Actions-Workflows existieren und `.nojekyll` bereits gesetzt ist | Standard Stack, TEST-01 | Gering — direkt verifiziert (kein `.github/workflows/`), Risiko nur falls der Nutzer künftig doch eine Actions-Pipeline einrichtet, die `package.json` fälschlich als Build-Trigger interpretiert |

## Open Questions

1. **Soll `bot-engine.js`s Escaping-Bug (Pitfall 5) in Phase 1 gefixt werden oder nur dokumentiert?**
   - What we know: Der Bug ist reproduziert und verifiziert; Erfolgskriterium 5 verlangt explizit "ohne SyntaxError" für "Sonderzeichen"
   - What's unclear: Ob "unveränderte Produktionsdateien" (Phase-Ziel) sich auch auf `bot-engine.js` bezieht oder nur auf die in TEST-02 genannten drei Dateien
   - Recommendation: Im Plan als expliziten Task mit Checkpoint aufnehmen: minimale Korrektur (`.replace(/'/g, "\\'")` in `safeName`) + Regressionstest; falls der Nutzer widerspricht, TEST-06 auf Backtick/`${` beschränken und den Quote-Fall als bekannten, ausdrücklich akzeptierten Fehler in STATE.md vermerken

2. **Welche Funktionen genau zählen als "Bot-Validatoren" für TEST-05?**
   - What we know: Kandidaten identifiziert (siehe A2)
   - What's unclear: Ob der ursprüngliche Requirements-Autor etwas anderes im Sinn hatte (z. B. künftige, noch zu schreibende Validierungslogik statt bestehender Guard-Clauses)
   - Recommendation: Vor Planerstellung kurz mit dem Nutzer bestätigen oder die A2-Annahme im Plan sichtbar dokumentieren, damit sie bei Bedarf korrigiert werden kann

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest-Ausführung | ✓ | v24.12.0 [VERIFIED: `node --version`] | — |
| npm | Paketinstallation | ✓ | 11.6.2 [VERIFIED: `npm --version`] | — |
| package.json | `npm test`/`npm install` | ✗ (existiert nicht) | — | Neu anlegen (siehe Standard Stack) — kein Fallback nötig, da Neuanlage risikofrei |
| .gitignore | `node_modules` von Git ausschließen | ✗ (existiert nicht) | — | Neu anlegen (siehe Standard Stack) |
| .github/workflows | (keine Relevanz für Deploy) | ✗ (existiert nicht) | — | GitHub Pages nutzt "Deploy from branch", kein CI/CD-Build betroffen |

**Missing dependencies with no fallback:** keine — `package.json`/`.gitignore` sind Neuanlagen, kein Blocker.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 (neu einzurichten) |
| Config file | `vitest.config.js` — noch nicht vorhanden, siehe Wave 0 |
| Quick run command | `npx vitest run tests/idb-canary.test.js` |
| Full suite command | `npm test` (→ `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | `npm test` läuft lokal grün, Produktionsdateien unverändert | integration (Suite läuft) + manueller Repo-Check (`git diff --stat index.html` zeigt keine Phase-1-Änderungen) | `npm test` | ❌ Wave 0 |
| TEST-02 | `items.js`/`bot-data.js`/`outfit-import.js` laden ohne Quelländerung per vm-Sandbox | unit/integration | `npx vitest run tests/idb-helpers.test.js` | ❌ Wave 0 |
| TEST-03 | Canary schlägt fehl ohne `fake-indexeddb` in `setupFiles` | unit (+ manuelle Meta-Verifikation: `setupFiles`-Eintrag temporär entfernen, `npx vitest run tests/idb-canary.test.js` erneut ausführen, genau 1 Fehlschlag erwarten) | `npx vitest run tests/idb-canary.test.js` | ❌ Wave 0 |
| TEST-05 | `_botVarApply`/`_playerKeyApply`/`_normLogik` + `_oiDetectType`/`_oiBuildExecCode` mit gültigen/ungültigen Eingaben | unit | `npx vitest run tests/bot-data-validators.test.js tests/outfit-import-parser.test.js` | ❌ Wave 0 |
| TEST-06 | `_buildBotCode` erzeugt bei Backtick/`${`/Anführungszeichen parsbaren Code | unit | `npx vitest run tests/bot-engine-escaping.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** jeweils betroffene Testdatei per `npx vitest run <file>`
- **Per wave merge:** `npm test` (volle Suite)
- **Phase gate:** volle Suite grün vor `/gsd-verify-work`, zusätzlich manueller Diff-Check, dass `index.html` und alle `<script>`-Tags unverändert sind

### Wave 0 Gaps
- [ ] `package.json` — Grundgerüst mit `test`-Script (siehe Standard Stack)
- [ ] `vitest.config.js` — `setupFiles: ['./tests/setup/fake-indexeddb.js']`, `environment: 'node'`
- [ ] `.gitignore` — `node_modules/`, `coverage/`
- [ ] `tests/helpers/loadScript.js` — gemeinsamer vm-Sandbox-Loader (siehe Code Examples)
- [ ] `tests/setup/fake-indexeddb.js` — `import 'fake-indexeddb/auto';`
- [ ] Framework-Install: `npm install -D vitest@5 @vitest/coverage-v8@5 fake-indexeddb@6 lz-string@1.5.0` (Legitimacy-Gate-Checkpoint vor Ausführung, siehe Package Legitimacy Audit)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | nein | Kein Auth-Mechanismus in Phase 1 betroffen |
| V3 Session Management | nein | Nicht betroffen |
| V4 Access Control | nein | Nicht betroffen |
| V5 Input Validation | **ja** | TEST-06 prüft genau diese Kategorie für `_buildBotCode` — Fund in Pitfall 5 ist ein direkter V5-Verstoß (unvollständiges Output-Encoding/Escaping bei Code-Generierung) |
| V6 Cryptography | nein | Nicht betroffen — Base64 in `_buildBotCode` dient Injection-Vermeidung, nicht Verschlüsselung |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Unvollständiges String-Escaping bei Code-Generierung (`_buildBotCode`) | Tampering (generierter Code kann durch Sonderzeichen im Bot-/Spielernamen manipuliert/gebrochen werden) | Vollständiges Escaping aller Zeichen, die im jeweiligen Zielkontext (hier: einfach gequoteter String) Sonderbedeutung haben — nicht nur Backslash/Backtick, siehe Pitfall 5-Empfehlung |
| Stiller Fallback bei fehlender Browser-API in Tests (IDB) | Tampering/Repudiation (Test "besteht", verifiziert aber nichts) | Canary-Test, der Vorhandensein der simulierten API explizit prüft, siehe Pitfall 3 |

## Sources

### Primary (HIGH confidence)
- Direkte Quellcode-Lektüre (diese Sitzung): `items.js` (Zeilen 1-150, 440-510, 3025-3045, 4170-4230, 5900-5940, 5810), `bot-data.js` (vollständig, 911 Zeilen), `outfit-import.js` (Zeilen 1-130, 340-472, 592-606), `bot-engine.js` (Zeilen 1-160, 1815-1830, 2915-2930), `index.html` (Zeilen 3060-3080, 3500-3520)
- npm-Registry (`npm view <pkg> version`) — vitest 5.0.0, @vitest/coverage-v8 5.0.0, fake-indexeddb 6.2.5, engines.node >=18 — [VERIFIED: npm registry, 2026-09-12]
- Node-Reproduktion der `_buildBotCode`-Escaping-Logik gegen `new Function()` (diese Sitzung, siehe Pitfall 5) — [VERIFIED: lokale Ausführung]
- `git status --short`, `git add --dry-run`, `git config core.autocrlf` (diese Sitzung) — [VERIFIED: lokale Git-Ausgabe]
- `gsd_run query package-legitimacy check` (diese Sitzung) — [VERIFIED: Tool-Ausgabe]
- `.planning/codebase/STACK.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md` (Projekt-Mapping, 2026-09-11)

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` (Projekt-Level-Recherche, 2026-09-12) — Versionen HIGH, allgemeine Pattern-Empfehlungen MEDIUM/LOW laut dortiger Selbstbewertung

### Tertiary (LOW confidence)
- Keine zusätzlichen Web-Quellen in dieser Sitzung konsultiert — alle sicherheitsrelevanten/versionsrelevanten Aussagen wurden direkt am Code oder an der Registry verifiziert

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Versionen frisch gegen npm-Registry verifiziert, identisch mit Projekt-Recherche vom selben Tag
- Architecture (vm-Sandbox-Anforderungen): HIGH — alle Stub-Anforderungen direkt am Quellcode mit Zeilenangaben verifiziert, teils per Node-Reproduktion bestätigt
- Pitfalls: HIGH für Pitfalls 1-5 und 7 (Code-/Tool-verifiziert), MEDIUM für Pitfall 6 (Interpretationsfrage zur Requirements-Formulierung, siehe Assumptions Log A2)

**Research date:** 2026-09-12
**Valid until:** Bis zur nächsten Änderung an `items.js`/`bot-data.js`/`outfit-import.js`/`bot-engine.js` (Dateien sind Teil der ~900 unkommittierten lokalen Änderungen laut STATE.md) — Zeilenangaben in diesem Dokument können sich verschieben, sobald diese Änderungen committet oder weiterbearbeitet werden. Paketversionen: 30 Tage.
