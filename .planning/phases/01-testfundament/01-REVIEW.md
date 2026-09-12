---
phase: 01-testfundament
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - .gitignore
  - bot-engine.js
  - package.json
  - tests/package.json
  - vitest.config.js
  - vitest.no-idb.config.js
  - tests/setup/fake-indexeddb.js
  - tests/helpers/loadScript.js
  - tests/idb-canary.test.js
  - tests/idb-helpers.test.js
  - tests/load-script.test.js
  - tests/bot-data-validators.test.js
  - tests/outfit-import-parser.test.js
  - tests/bot-engine-escaping.test.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 01-testfundament: Code Review Report

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Geprüft wurden der neue Vitest-Testunterbau (Konfiguration, vm-Sandbox-Loader, fake-indexeddb-Setup, sechs Testdateien) sowie isoliert die eine geänderte Zeile in `bot-engine.js` (`safeName`-Escaping) in ihrem Verwendungskontext.

**bot-engine.js-Diff:** Die Erweiterung der `safeName`-Eskapierung um `'`, `\r`, `\n` wurde gegen alle sechs Einbettungsstellen (`_log`, `botName:'...'`, `fullName:'...'`, zwei `console.log`-Meldungen, Start-Log) verifiziert — an jeder Stelle steht `safeName` in einem einfach gequoteten String-Kontext innerhalb des äußeren Backtick-Templates. Die Reihenfolge der `.replace()`-Aufrufe (Backslash zuerst, danach `` ` ``, `'`, `\r`, `\n`) verhindert Doppel-Escaping korrekt, da jeder Schritt nur sein eigenes Zeichen matcht und keine bereits eingefügten Backslashes erneut anfasst. Der zugehörige Test `tests/bot-engine-escaping.test.js` verifiziert das nicht nur per `new Function()`-Parse-Check, sondern zusätzlich per echtem Round-Trip (Literal aus dem generierten Code extrahieren und gegen den Original-Namen vergleichen) — das ist eine belastbare, nicht-tautologische Prüfung. Ich habe keinen Defekt in der geänderten Zeile selbst gefunden.

Der Testunterbau selbst ist überwiegend solide (`npx vitest run` lokal ausgeführt: 44 passed, 2 erwartet fehlgeschlagen `it.fails`, alle 6 Dateien grün). Es gibt jedoch reale Lücken in der Testinfrastruktur, die zu falscher Sicherheit führen können — insbesondere ein DOM-Stub, der bestimmte Codepfade strukturell unsichtbar macht, sowie ein bereits jetzt sichtbares Tooling-Warning, das künftige Vite-Versionen brechen wird. Keine der gefundenen Probleme ist ein Blocker; sie sind als Warnungen bzw. Hinweise für die weitere Phasenarbeit eingestuft.

## Warnings

### WR-01: Vitest-Configs nutzen ESM-Syntax in einem als CommonJS deklarierten Package — von Vite bereits als künftig brechend markiert

**File:** `vitest.config.js:1`, `vitest.no-idb.config.js:2`
**Issue:** Ein realer Testlauf (`npx vitest run`) gibt bei jedem Aufruf diese Warnung aus:
```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.js:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
```
Ursache: Das Wurzel-`package.json` deklariert `"type": "commonjs"` (Zeile 5), während `vitest.config.js`/`vitest.no-idb.config.js` `import`-Syntax verwenden. Aktuell funktioniert das nur, weil Vite/Vitest den alten Bundling-Configloader nutzt; sobald `configLoader: 'native'` zum Default wird, bricht `npm test` und `npm run coverage` ersatzlos.
**Fix:** Die beiden Config-Dateien auf `.mjs` umbenennen (`vitest.config.mjs`, `vitest.no-idb.config.mjs`) und die Referenz in `vitest.no-idb.config.js` (`import base from './vitest.config.js'`) entsprechend anpassen. **Nicht** das Wurzel-`package.json` auf `"type":"module"` umstellen — das würde `node --check` auf den Produktionsdateien (die bewusst klassische Skripte ohne `import`/`export` sind, siehe CLAUDE.md „Code checked via `node --check`") in einen ES-Modul-Kontext zwingen und dort andere Strict-Mode-Regeln aktivieren.
```js
// vitest.no-idb.config.js
import { defineConfig } from 'vitest/config'
import base from './vitest.config.mjs'   // statt .js
```

### WR-02: DOM-Stub in `tests/helpers/loadScript.js` liefert nie `null` und nie echten Zustand zurück — maskiert reale Codepfade

**File:** `tests/helpers/loadScript.js:94-109` (Sandbox-`document`), `tests/helpers/loadScript.js:18-81` (`makeElementStub`)
**Issue:** `document.getElementById`/`querySelector` geben für **jede** ID/jeden Selektor ein frisches, funktionsfähiges Element-Stub zurück (nie `null`), und `classList.contains()`/`toggle()` liefern hart-codiert immer `false`. Damit ist jeder Codepfad, der auf „Element nicht gefunden" (`if(!el) return`) oder „Klasse aktiv" (`classList.contains('active')`) verzweigt, über diese Sandbox strukturell nie in seinem True-Zweig erreichbar — nicht weil die Produktionslogik das so vorsieht, sondern weil der Stub es unmöglich macht, das zu testen.

Das ist kein hypothetisches Risiko: `_playerKeyApply` in `bot-data.js:104` enthält genau so eine Weiche:
```js
if (document.getElementById('tab-spieler')?.classList.contains('active') && typeof renderSpielerTab==='function') renderSpielerTab();
```
`tests/bot-data-validators.test.js` ruft `_playerKeyApply` mehrfach auf (Zeilen 107-115) und deckt damit implizit **nur** den `false`-Zweig ab; der `renderSpielerTab()`-Aufruf ist über diesen Testunterbau nicht erreichbar und kann nie grün oder rot werden. Ein zukünftiger Test, der genau diesen UI-Sync-Pfad prüfen will, wird fälschlich „bestehen", ohne je etwas geprüft zu haben.
**Fix:** Den Stub um eine einfache ID-Registry erweitern, die tatsächlich gesetzte Attribute/Klassen widerspiegelt, oder zumindest den Kommentar im Loader um diesen Nebeneffekt ergänzen und in künftigen Test-PLANs explizit vermerken, dass „Element aktiv"-Zweige mit diesem Loader nicht testbar sind:
```js
document: {
  getElementById(id) { return registry.get(id) ?? makeElementStub(); },
  ...
}
```

### WR-03: Fehlerpfad von `idbSet()` (Kernwert „sichtbar fehlgeschlagen") ist in `tests/idb-helpers.test.js` ungetestet

**File:** `tests/idb-helpers.test.js` (gesamte Datei, vgl. `items.js:42-65`)
**Issue:** `tests/idb-helpers.test.js` prüft nur den Erfolgspfad von `idbSet`/`idbGet` (Round-Trip, unbekannter Key, Überschreiben). Der in CLAUDE.md explizit als Kernwert benannte Fall — „jede Speicherung ist entweder erfolgreich oder sichtbar fehlgeschlagen" — also z. B. eine abgelehnte Transaktion oder `QuotaExceededError` in `idbSet()` (`items.js:53-64`, inkl. `showStatus(...,'error')`-Zweig) hat keinerlei Testabdeckung. Gerade weil dieses Verhalten als das zentrale Qualitätsversprechen des Tools benannt ist, ist das Fehlen einer Regression-Guard hier eine echte Lücke für ein „Testfundament"-Phase-Deliverable.
**Fix:** Einen Test ergänzen, der `IDBObjectStore.put` (bzw. die Transaktion) über einen Mock/Spy zum Fehlschlagen bringt und prüft, dass `idbSet()` `false` zurückgibt und die Statusmeldung ausgelöst wird (z. B. `showStatus`-Stub auf dem Sandbox-Objekt setzen und den Aufruf verifizieren).

## Info

### IN-01: Keine Coverage-Schwellenwerte in `vitest.config.js` konfiguriert

**File:** `vitest.config.js:3-9`
**Issue:** `npm run coverage` (`vitest run --coverage`) erzeugt einen Report, kann aber mangels `test.coverage.thresholds` nie fehlschlagen, selbst wenn die Abdeckung einbricht.
**Fix:** Optionale Schwellenwerte ergänzen, z. B. `coverage: { thresholds: { lines: 60, functions: 60 } }`, sobald die Basisabdeckung aus Phase 1 etabliert ist.

### IN-02: Gemeinsam genutzter, nicht zurückgesetzter Zustand zwischen `it()`-Blöcken

**File:** `tests/idb-helpers.test.js:7-9`, `tests/bot-data-validators.test.js:6-12`
**Issue:** `ctx` (inkl. der realen fake-indexeddb-Instanz und `_bots`) wird einmal in `beforeAll` geladen und danach von allen Tests der Datei geteilt, ohne `beforeEach`-Reset. Aktuell kollidieren die verwendeten Keys nicht (`TEST_rt`/`TEST_missing`/`TEST_over` bzw. `b1`-`b4`), das Ergebnis ist also derzeit korrekt, aber die Tests sind implizit reihenfolgeabhängig — ein später eingefügter Test mit kollidierendem Key/Bot-Id würde stillschweigend falsche Ergebnisse liefern statt eines klaren Fehlers.
**Fix:** In künftigen Testdateien einen `beforeEach`, der `_bots.length = 0` bzw. die betroffenen IDB-Keys zurücksetzt, als Konvention etablieren.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
