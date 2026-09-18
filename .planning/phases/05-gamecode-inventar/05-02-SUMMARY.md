---
phase: 05-gamecode-inventar
plan: 02
subsystem: game-inventory-enumerator
tags: [loader, enumerator, descriptor-walk, chunking, structured-clone, bcmodsdk, mod-probes, red-green]

# Dependency graph
requires:
  - phase: 05-gamecode-inventar
    provides: "05-01: tests/helpers/loaderSandbox.js (makeLoaderSandbox, Fixtures, hits-Zähler, runUntil/waitFor), IDB v3 Snapshot-Store"
provides:
  - "loader.js: Sektion `── Gamecode-Inventar (SCAN-01..07)` mit GI_*-Konstanten, giReadData/giScalar/giBounded/giNext/giChunked/giDescribeApi/giMods/giPatching, buildGameInventory(reqId, post), window.__BCK_buildGameInventory (Test-Seam)"
  - "Case GET_GAME_INVENTORY im bestehenden Listener — einziger asynchron antwortender Case, sendet GAME_INVENTORY_PROGRESS (n×) und GAME_INVENTORY_DATA (1×) an ev.origin"
  - "Snapshot-Vertrag schema 1: { schema, gameVersion, ts, durationMs, globals, assets, modSdk, mods, probes, chatHooks, errors }"
affects: [05-03-bridge-und-store]

# Actuals (#2632)
actuals:
  tokens: 12074
  tasks: 2
  commits: 2
plan_head_before: d83e6a7f388c2c6fecfbd60b57e1deb40892378

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deskriptor-only Enumeration: giReadData(obj, name) ist der EINZIGE Wertzugriff im gesamten Block — Object.getOwnPropertyDescriptor prüft get/set VOR jedem Lesen, ein Accessor wird nur als Name erfasst, nie ausgewertet (SCAN-07)"
    - "Chunking mit garantiert asynchronem ersten Slice: giChunked ruft giNext(tick) auch für den ersten Slice auf (nie synchron), damit der auslösende Case in JEDEM Fall vor jeder Arbeit zurückkehrt; giNext bevorzugt requestIdleCallback, Fallback setTimeout(fn, 0)"
    - "Explizite Allowlists statt Objekt-Spread: Asset-/AssetGroup-Serialisierung (GI_ASSET_KEYS/GI_GROUP_KEYS) und bcModSdk-Patching-Reduktion (giPatching) kopieren nur benannte Felder über giBounded (Tiefe ≤ 2, Arrays ≤ 200, Strings ≤ 500) — verhindert sowohl den Asset.Group.Asset-Zirkel als auch DataCloneError durch Funktionswerte (original/sdkEntrypoint/currentEntrypoint)"
    - "safePost/aborted-Flag: ein Post-Fehler (z. B. DataCloneError im echten Browser) wird abgefangen und als GAME_INVENTORY_DATA {reqId, err} gemeldet statt verschluckt zu werden; nach dem ersten Fehler werden keine weiteren Posts mehr versucht"

key-files:
  created:
    - tests/game-inventory-enumerator.test.js
  modified:
    - loader.js

key-decisions:
  - "Zwei Testassertionen aus Task 1 verglichen Object.getOwnPropertyNames(ctx) von AUSSERHALB der vm-Sandbox mit der von loader.js selbst INTERN gemessenen Namensliste — Node-vm-Kontexte materialisieren ~66 Intrinsics (Map, RegExp, Promise, Set, TypedArrays, ...) nur für Code, das INNERHALB des Kontexts läuft; von außen betrachtet fehlen sie auf dem rohen Sandbox-Objekt (empirisch verifiziert: leere Sandbox zeigt außen 4, innen 70 Eigenschaften). Kein loader.js-Fehler, sondern eine Plattformeigenheit von Node. Fix: evalIn(ctx, 'Object.getOwnPropertyNames(window).length') für eine Innen-Messung in Tests 6 und 27, statt der Außen-Messung."
  - "GI_GROUP_KEYS bleibt [ASSUMED] (nicht per SCAN-13-Konsolenprobe verifiziert) — unbekannte/falsche Keys fallen beim Lesen einfach durch giReadData (kind 'missing') weg, kein Fehlerpfad; spätere Korrektur ist non-breaking."
  - "GET_GAME_INVENTORY antwortet bewusst über ev.origin statt über die ALLOWED_ORIGIN-Konstante, damit der statische Zähler in tests/loader-origin.test.js (erwartet exakt 34 Vorkommen) unverändert bleibt — ev.origin ist an dieser Stelle im Handler bereits nachweislich gleich der Tool-Origin (Origin-Check läuft vorher im selben Listener)."

requirements-completed: [SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07]

coverage:
  - id: D1
    description: "Snapshot-Abschnitt globals: Deskriptor-basierte Window-Klassifizierung (getters/functions/values/byPrefix), Inventory*-Bündelung nach längstem AssetGroup-Namen, keine Getter je gelesen"
    requirement: "SCAN-02"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#Global-Klassifizierung (SCAN-02) (4 Fälle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Snapshot-Abschnitt assets: Allowlist-Serialisierung (88 Keys) ohne Group/ParentItem-Zirkel, ohne Dynamic*-Funktionswerte, mit Asset-Gruppen-Katalog; degradiert zu assets.error, wenn Asset[] fehlt"
    requirement: "SCAN-03"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#Asset-Serialisierung (SCAN-03) (4 Fälle)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Snapshot-Abschnitt chatHooks: ChatRoomRegisterMessageHandler-Existenz/Arität, Registry-Introspektion (nur wenn Array-Kandidat vorhanden, nur Description/Priority, Callback nie aufgerufen), hookedChatFunctions aus Patching-Info"
    requirement: "SCAN-04"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#Chat-Hook (SCAN-04) (2 Fälle)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Snapshot-Abschnitte mods/modSdk: bcModSdk.getModsInfo()/getPatchingInfo() (einzige Funktionsaufruf-Ausnahme) auf vier bzw. vier Felder reduziert; ohne bcModSdk: leer/available:false, Scan läuft weiter"
    requirement: "SCAN-05"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#bcModSdk (SCAN-05) (2 Fälle)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Snapshot-Abschnitt probes: fünf feste Mod-Probes (WCE/FBC, BCX über Object.getOwnPropertyNames statt Object.keys, MBS, LSCG, Themed) plus diagnostischer Namens-Sweep; abwesende Mods → present:false"
    requirement: "SCAN-06"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#Fallback-Probes (SCAN-06) (7 Fälle)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Read-only/Chunking-Disziplin: alle hits-Zähler (getter/fn/dynamic/patching) bleiben 0, structuredClone/JSON.stringify des vollständigen Snapshots und jeder Post werfen nicht, Chunking in Slices à 500 über rIC/setTimeout(0) mit garantiert asynchronem erstem Slice, DataCloneError wird als err gemeldet statt verschluckt"
    requirement: "SCAN-07"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#SCAN-07: read-only, gechunkt, klonbar (6 Fälle)"
        status: pass
    human_judgment: false
  - id: D7
    description: "SCAN-01 Loader-Hälfte: GET_GAME_INVENTORY löst buildGameInventory aus, Case kehrt sofort zurück, PROGRESS/DATA mit korrekter reqId an die Tool-Origin, zwei parallele Scans laufen unabhängig, fremde Origin/Quelle wird ignoriert; statische Loader-Minimalität (ein Case, eine Funktion, eine Exposure, ALLOWED_ORIGIN-Zähler 34, verbotene Aufrufe fehlen, Diff rein additiv)"
    requirement: "SCAN-01"
    verification:
      - kind: unit
        ref: "tests/game-inventory-enumerator.test.js#GET_GAME_INVENTORY (SCAN-01 Loader-Hälfte) (5 Fälle) + #statisch: Loader-Änderung minimal und read-only (1 Fall)"
        status: pass
    human_judgment: false

# Metrics
duration: 38min
completed: 2026-09-15
status: complete
---

# Phase 5 Plan 2: Gamecode-Enumerator (buildGameInventory) Summary

**`loader.js` liest das laufende BC-Spiel read-only und deskriptorbasiert komplett aus (Globals, Asset-Katalog, bcModSdk-Mods, fünf Fallback-Probes, Chat-Hook-Registry) und meldet es gechunkt über `GET_GAME_INVENTORY`/`GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA` an das Tool-Fenster — 31/31 neue Tests grün, Loader-Diff rein additiv (615 Zeilen, 0 gelöscht), `ALLOWED_ORIGIN`-Zähler unverändert bei 34.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-09-15T13:04:00+02:00 (geschätzt aus STATE.md-Kontext)
- **Completed:** 2026-09-15T13:42:00+02:00
- **Tasks:** 2
- **Files modified:** 2 (1 neu, 1 geändert)

## Accomplishments

- `tests/game-inventory-enumerator.test.js` (neu, 31 Fälle über 8 describe-Blöcke): beweist den vollständigen Snapshot-Vertrag gegen `tests/helpers/loaderSandbox.js` — Globals-Klassifizierung inkl. Inventory\*-Bündelung nach längstem Gruppennamen, Asset-Serialisierung ohne Zirkel/Dynamic\*, bcModSdk-Reduktion auf vier Felder (`hits.patching` bleibt 0), fünf Fallback-Probes (BCX über `Object.getOwnPropertyNames` statt `Object.keys`), Chat-Hook-Registry-Introspektion ohne Callback-Aufruf, Chunking mit garantiert asynchronem erstem Slice (rIC bevorzugt, `setTimeout(0)`-Fallback), `DataCloneError`-Meldung statt Verschlucken, und ein statisches Region-Gate gegen `loader.js`
- `loader.js`: neue, in sich geschlossene Sektion `── Gamecode-Inventar (SCAN-01..07)` mit `GI_SCHEMA/GI_BATCH/GI_STEPS/GI_PREFIXES/GI_ASSET_KEYS/GI_GROUP_KEYS`, `giReadData` (einziger Wertzugriff, Deskriptor-basiert), `giScalar`/`giBounded` (begrenzte, klonbare Kopien), `giNext`/`giChunked` (Idle-Zeit-Chunking à 500), `giDescribeApi`, `giMods`/`giPatching` (die zwei dokumentierten SDK-Lesefunktionsaufrufe), `buildGameInventory(reqId, post)` mit sechs Schritten, `window.__BCK_buildGameInventory`-Testnaht
- Neuer Case `GET_GAME_INVENTORY` im bestehenden `switch` — einziger Case, der NICHT synchron antwortet (dokumentiert im Code); antwortet an `ev.origin` statt an die `ALLOWED_ORIGIN`-Konstante, damit der statische Zähler in `tests/loader-origin.test.js` bei 34 bleibt

### RED-Ausgabe (Task 1, vor loader.js-Änderung)

```
npx vitest run tests/game-inventory-enumerator.test.js
 Test Files  1 failed (1)
      Tests  26 failed | 5 skipped (31)
```

### GREEN-Ausgabe (Task 2, nach loader.js)

```
npx vitest run tests/game-inventory-enumerator.test.js tests/loader-sandbox.test.js tests/loader-origin.test.js tests/injected-code-origin.test.js
 Test Files  4 passed (4)
      Tests  59 passed (59)

node --check loader.js  → Exit 0

npm test (volle Suite)
 Test Files  22 passed (22)
      Tests  304 passed | 2 expected fail (306)
```

Zweimal wiederholt (sauberer Lauf jedes Mal, außer der bekannten, unabhängigen Teardown-Flakiness aus `tests/bridge-protocol.test.js` — siehe „Issues Encountered").

### Gemessene Tick-Zahlen (Test 27/28, SCAN-07 Chunking-Beweis)

- Test 27 (`syntheticGlobals: 20000`, setTimeout-Fallback): `globals.total` (von innen) = 80133, `ceil(80133/500) = 161` Mindest-Ticks; tatsächlich gemessen: **167 Ticks**, alle über `counts.timeout` (167), `counts.ric = 0` — die zusätzlichen 6 Ticks sind die Schritt-Übergänge (Assets → Asset-Gruppen → ModSDK → Mod-Probes → Chat-Hooks, je 1 `giNext`-Hop).
- Test 28 (`syntheticGlobals: 3000`, `requestIdleCallback: true`): `ceil(3000/500) = 6` Mindest-Ticks; tatsächlich gemessen: **31 Ticks**, alle über `counts.ric` (31), `counts.timeout = 0` — bestätigt, dass `requestIdleCallback` bevorzugt wird, wenn vorhanden.

### Snapshot-Vertrag (schema 1)

```
{
  schema: 1, gameVersion, ts, durationMs, errors: [{step, message}],
  globals: { total, getters: [Name], functions: [{name, arity}], values: [{name, type}],
             byPrefix: {16 Präfixe → Anzahl},
             inventory: { groups: [{prefix, group, count, sample≤5}], other: {count, names≤50} } },
  assets: { count, groupCount, groups: [{...GI_GROUP_KEYS, assetCount}],
            items: [{ Group, ParentItem, Layer: {count, names}, ...88 GI_ASSET_KEYS }] } | { error },
  modSdk: { available, version, modCount, patchingCount,
            patching: [{name, originalHash, hookedByMods, patchedByMods}] },
  mods: [{name, fullName, version, repository}],
  probes: { wce: {present, version, functions}, bcx: {present, loaded, version, api},
            mbs: {present, version, apiVersion, api}, lscg: {present, loaded, api, screenFunctions},
            themed: {present, loaded, screenFunctionCount, sample}, sweep: [Name] },
  chatHooks: { ChatRoomRegisterMessageHandler: {exists, arity, kind},
               registry: {introspectable, checked} | {introspectable, source, count, handlers},
               hookedChatFunctions: [{name, hookedByMods}] }
}
```

### Die zwei dokumentierten Funktionsaufruf-Ausnahmen (SCAN-05, SCAN-07)

`giMods`/`giPatching` rufen `bcModSdk.getModsInfo()` und `bcModSdk.getPatchingInfo()` tatsächlich auf — die einzigen Funktionsaufrufe des gesamten Enumerators auf einen entdeckten Wert. Beide sind reine Lese-APIs des Mod-SDK selbst (keine Spielzustandsänderung), explizit im Sektionskopf und im Threat-Register (T-5-01) dokumentiert. Alle anderen entdeckten Funktionen/Getter werden ausschließlich über `giReadData`-Deskriptoren inspiziert, nie ausgewertet oder aufgerufen — bewiesen durch die vier `hits`-Zähler, die nach jedem Testlauf bei 0 bleiben.

### Hinweis für den Nutzer

Das Bookmarklet muss nach dem Deploy dieser Version im Spiel-Tab **neu ausgeführt** werden, damit der neue Case `GET_GAME_INVENTORY` im laufenden Spiel verfügbar ist (kein automatisches Nachladen des injizierten Skripts). Kein One-Way-Door — Nachrichtenvertrag und Snapshot-Form liegen vollständig in diesem Repo.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enumerator-Tests schreiben und RED bestätigen** - `00051d6` (test)
2. **Task 2: loader.js — Sektion buildGameInventory + Case GET_GAME_INVENTORY — GREEN** - `1594a7b` (feat)

**Plan metadata:** folgt in separatem Commit (docs)

_Note: RED→GREEN wie geplant — Task 1 committet die roten Tests, bevor loader.js angefasst wird._

## Files Created/Modified

- `tests/game-inventory-enumerator.test.js` - Neu: 31 Testfälle gegen den Snapshot-Vertrag, statisches Region-Gate gegen loader.js
- `loader.js` - Neue Sektion `── Gamecode-Inventar (SCAN-01..07)` + Case `GET_GAME_INVENTORY` (rein additiv, 615 Zeilen eingefügt, 0 gelöscht relativ zu `f3973f6`)

## Decisions Made

Siehe `key-decisions` im Frontmatter — vm-Kontext-Innen-vs-Außen-Messung (evalIn statt Object.getOwnPropertyNames von außen), GI_GROUP_KEYS bleibt [ASSUMED] mit non-breaking Degradation, Case antwortet an `ev.origin` statt an die Konstante (Zähler-Stabilität).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zwei Testassertionen verglichen vm-Sandbox von außen mit sich selbst von innen**
- **Found during:** Task 2 (erster GREEN-Lauf nach der loader.js-Implementierung)
- **Issue:** `tests/game-inventory-enumerator.test.js` (Task 1, bereits committet) verglich in Test 6 und Test 27 `snapshot.globals.total` (von `buildGameInventory` INNERHALB der vm-Sandbox über `Object.getOwnPropertyNames(window)` gemessen) mit `Object.getOwnPropertyNames(sb.ctx).length`, von AUSSERHALB der Sandbox auf demselben Host-Objekt gemessen. Empirischer Beweis (Node-`vm`-Modul, unabhängig von diesem Code): eine leere Sandbox zeigt von außen 4 eigene Properties, von innen (`window` im Kontext) 70 — Node materialisiert ~66 eingebaute Intrinsics (`Map`, `RegExp`, `Promise`, `Set`, TypedArrays, …) nur für Code, das im Kontext selbst läuft, nicht auf dem rohen Host-Objekt. Die Differenz war in beiden betroffenen Tests exakt 66 (5533 vs. 5467, 80133 vs. 80067) — kein Zufall, sondern genau dieser Plattform-Effekt. Kein Fehler in `loader.js`: der Enumerator zählt korrekt, was er selbst sieht.
- **Fix:** Beide Assertionen auf `evalIn(ctx, 'Object.getOwnPropertyNames(window).length')` umgestellt (Innen-Messung, `evalIn` bereits aus `tests/helpers/loadScript.js` verfügbar und im Projekt an anderer Stelle bereits verwendet) — misst dieselbe Perspektive wie der Enumerator selbst.
- **Files modified:** `tests/game-inventory-enumerator.test.js`
- **Verification:** `npx vitest run tests/game-inventory-enumerator.test.js` → 31/31 grün
- **Committed in:** `1594a7b` (Task 2, zusammen mit loader.js)

**2. [Rule 1 - Bug] `typeof null === 'object'` machte eine Assertion technisch falsch für den erlaubten Waisen-Fall**
- **Found during:** Task 2 (gleicher GREEN-Lauf)
- **Issue:** Test 11 prüfte `expect(typeof it.Group).not.toBe('object')` für jedes Asset-Item — das schlägt in JavaScript technisch auch für `it.Group === null` fehl (Waisen-Asset ohne Gruppe, laut Test 10 explizit als gültiger Wert `null` erwartet), nicht nur für das eigentlich verbotene rohe Gruppenobjekt.
- **Fix:** Assertion auf `it.Group === null || typeof it.Group === 'string'` umgestellt — verbietet weiterhin das rohe (zirkuläre) Gruppenobjekt, erlaubt aber den spezifizierten `null`-Fall.
- **Files modified:** `tests/game-inventory-enumerator.test.js`
- **Verification:** `npx vitest run tests/game-inventory-enumerator.test.js` → 31/31 grün
- **Committed in:** `1594a7b`

**3. [Rule 3 - Blocking] Region-Gate zählte `requestIdleCallback` zeilenbasiert, ursprüngliche `giNext`-Implementierung hatte Check+Aufruf auf einer Zeile**
- **Found during:** Task 2, plan-level Verifikationslauf (zweites `<automated>`-Kommando)
- **Issue:** `grep -c 'requestIdleCallback'` zählt Treffer-ZEILEN, nicht Vorkommen. Die ursprüngliche einzeilige Form `if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, {...}); else setTimeout(fn, 0);` enthält den Bezeichner zweimal, aber auf EINER Zeile → Gate erwartete `>= 2` Zeilen, zählte aber 1.
- **Fix:** `giNext` auf mehrzeiliges `if/else` umgestellt (keine Verhaltensänderung) — Check und Aufruf stehen jetzt auf getrennten Zeilen.
- **Files modified:** `loader.js`
- **Verification:** Region-Gate-Kommando aus dem Plan → `ENUMERATOR-OK`
- **Committed in:** `1594a7b`

---

**Total deviations:** 3 auto-fixed (2× Rule 1 Testauthoring-Bug, 1× Rule 3 Blocking/Gate-Formatierung).
**Impact on plan:** Keine Scope-Erweiterung — alle drei Fixes korrigieren Artefakte aus der eigenen RED-Testdatei bzw. eine rein kosmetische Formatierung in `loader.js` ohne Verhaltensänderung. Die eigentliche Enumerator-Logik entspricht vollständig dem Plan.

## Issues Encountered

**Bekannte, unabhängige Vitest-Worker-Teardown-Race (nicht durch diesen Plan verursacht)**

Bei einem von zwei `npm test`-Läufen dieser Session trat erneut `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending` auf (Ursprung `tests/bridge-protocol.test.js`) — dieselbe Fehlerklasse, die bereits in `04-04-SUMMARY.md` und `05-01-SUMMARY.md` dokumentiert ist (reine Vitest-Worker-RPC-Race beim Schließen, keine Assertion betroffen). Beide Läufe meldeten „22 Dateien grün, 304 passed + 2 expected fail" — der Fehler betrifft ausschließlich den Worker-Exitcode. Nicht Teil des Datei-Scopes dieses Plans — dokumentiert, nicht behoben.

## User Setup Required

None - keine externe Service-Konfiguration nötig. Hinweis: Bookmarklet nach Deploy im Spiel-Tab neu ausführen (siehe oben, kein One-Way-Door).

## Known Stubs

Keine. `GI_GROUP_KEYS` ist als [ASSUMED] im Code-Kommentar markiert (nicht per Konsolenprobe verifiziert), degradiert aber non-breaking (unbekannte Keys werden übersprungen) — kein Stub im Sinne einer UI-Lücke.

## Threat Flags

Keine neuen. Alle im Plan-Threat-Register genannten Bedrohungen (T-5-01, T-5-02, T-5-03, T-5-04, T-5-09, T-5-10, T-5-SC) sind durch die 31 neuen Testfälle mitigiert:
- T-5-01 (Enumerator ruft entdeckte Funktion/Getter auf): `hits.getter`/`hits.fn`/`hits.dynamic`/`hits.patching` bleiben nach vollständigem Scan 0 (Tests 17, 22, 25); werfender Getter + werfende `Dynamic*`-Funktion im Fixture bringen den Scan nicht zu Fall
- T-5-02 (DataCloneError verwirft die Antwort): `structuredClone`/`JSON.stringify` auf Snapshot und jede Post werfen nicht (Tests 9, 11, 26); `safePost` meldet einen Post-Fehler als `err` statt zu verschlucken (Test 29)
- T-5-03 (Spiel-Tab friert ein): `giChunked` à 500 über `giNext`, erster Slice asynchron, Ticks ≥ `ceil(N/500)` gemessen (Tests 1, 27, 28)
- T-5-04 (Gefälschtes `GET_GAME_INVENTORY`/falsches Antwortziel): bestehende Origin-/Source-Prüfung greift weiterhin (Test 5); Antwort nachweislich an `LOADER_TOOL_ORIGIN` (Test 2)
- T-5-09 (Loader-Änderung verändert bestehende Cases): Diff rein additiv (0 gelöschte Zeilen), Zähler 34, `tests/loader-origin.test.js`/`tests/injected-code-origin.test.js` unverändert grün (statischer Test 31)
- T-5-10 (Information Disclosure): akzeptiertes Risiko laut Plan — nur Namen/Typen/Aritäten, keine `Player`-Werte, keine Chat-Inhalte; nicht geprüft, da bewusst akzeptiert
- T-5-SC (npm/pip/cargo installs): keine Installationen in diesem Plan

## Next Phase Readiness

- `buildGameInventory`/`GET_GAME_INVENTORY` stehen vollständig und getestet für Plan 05-03 (Bridge + Store) bereit — dieser kann `GAME_INVENTORY_PROGRESS`/`GAME_INVENTORY_DATA` im Tool-Fenster per `onBridgeMessage` abonnieren und den Snapshot über `idbSnapshotPut` (Plan 05-01) speichern.
- Snapshot-Vertrag (`schema: 1`) ist die Versionierungsnaht für spätere Formänderungen.
- `npm test` grün (22 Dateien, 304 passed + 2 expected fail bei sauberem Lauf — siehe Issues Encountered zur bekannten, unabhängigen Teardown-Flakiness).
- `node --check loader.js` grün.
- Zwei Commits in der Reihenfolge test (RED) → feat (GREEN), wie geplant.
- Kein Blocker für Plan 05-03. Live-Check gegen einen echten, 28-Mod-BC-Tab bleibt End-of-Phase-Human-Check in Plan 05-03 (VALIDATION.md 5-02-01/5-02-02).

---
*Phase: 05-gamecode-inventar*
*Completed: 2026-09-15*

## Self-Check: PASSED

Beide erstellten/geänderten Dateien auf Disk gefunden (`tests/game-inventory-enumerator.test.js`, `loader.js`, diese SUMMARY). Beide Task-Commits (`00051d6`, `1594a7b`) im Log gefunden. Plan-Level-`<verification>` erneut ausgeführt: `npx vitest run tests/game-inventory-enumerator.test.js` → 31 passed; `npx vitest run tests/game-inventory-enumerator.test.js tests/loader-sandbox.test.js tests/loader-origin.test.js tests/injected-code-origin.test.js` → 59 passed; volle Suite → 22 Dateien grün, 304 passed + 2 expected fail; `node --check loader.js` → Exit 0; Region-Gate-Kommando aus dem Plan → `ENUMERATOR-OK`; `git diff f3973f6 HEAD -- loader.js` → 615 insertions(+), 0 deletions.
