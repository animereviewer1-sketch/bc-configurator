---
phase: 05-gamecode-inventar
reviewed: 2026-09-19T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - loader.js
  - game-scan.js
  - persistence.js
  - index.html
  - tests/game-inventory-enumerator.test.js
  - tests/game-scan-bridge.test.js
  - tests/helpers/loaderSandbox.js
  - tests/loader-sandbox.test.js
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 05: Code Review Report — Gamecode-Inventar (SCAN-01..08)

**Reviewed:** 2026-09-19T00:00:00Z
**Depth:** standard (loader.js/persistence.js strikt nach Diff `b7e0881..HEAD`)
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Geprüft wurde der neue Gamecode-Inventar-Block in `loader.js` (`buildGameInventory`, `giReadData`/`giBounded`/`giChunked`/`giNext`, `GI_ASSET_KEYS`, Mod-Probes, `case 'GET_GAME_INVENTORY'`), das neue Modul `game-scan.js`, der additive Snapshot-Store in `persistence.js` (IDB v3), die `index.html`-Diffs sowie die zugehörigen Enumerator-/Bridge-/Sandbox-Tests.

**Read-only-Garantie (Priorität 1):** hält. Jeder Wertzugriff läuft über `giReadData` (Deskriptor, kein Getter-Read), `Object.getOwnPropertyNames` statt `Object.keys` wo nötig (`giDescribeApi`), `Array.isArray`/`Object.keys` lösen keine Traps mit Nebenwirkung aus, und die einzigen Funktionsaufrufe (`bcModSdk.getModsInfo()`/`getPatchingInfo()`) sind die dokumentierte SCAN-05-Ausnahme. Die Fixture-Zähler (`hits.getter/fn/dynamic/patching`) bestätigen das durch echte Ausführung in `tests/game-inventory-enumerator.test.js`, nicht nur durch Behauptung im Kommentar.

**Freeze-Sicherheit (Priorität 2):** `giChunked` yieldet korrekt vor jedem Slice (auch dem ersten) über `giNext`/`requestIdleCallback`/`setTimeout(...,0)`; kein synchrones Drain von 18.7k Namen oder 4.764×88 Asset-Keys. Kein Fall von echtem O(n²)-Wachstum über die volle Datenmenge gefunden (das `groupNames.find(...)` in Schritt 1 ist durch die Gruppenanzahl beschränkt und läuft ohnehin gechunkt).

**structuredClone-Sicherheit (Priorität 3):** hält. Funktionswerte werden in `giBounded`/`giScalar` konsequent herausgefiltert, `patchedByMods`/`hookedByMods` werden vor dem Einbetten skalarisiert, das rohe `Map`-Objekt aus `getPatchingInfo()` verlässt `giPatching()` nie.

**Der eine echte Blocker (CR-01) liegt nicht im Loader, sondern in der Tool-seitigen Persistenz:** `game-scan.js` vergibt die Snapshot-ID über `Date.now()` zum Empfangszeitpunkt und schreibt add-only in einen Store, dessen Primärschlüssel genau dieses Feld ist. Zwei nahezu gleichzeitig abgeschlossene Scans (der Button ist während eines laufenden Scans nicht gesperrt, siehe WR-01) kollidieren dann sichtbar, aber mit echtem Datenverlust des zweiten, vollständig berechneten Scans. Der zugehörige Test maskiert das Problem durch eine künstliche Verzögerung (WR-03).

## Critical Issues

### CR-01: Snapshot-ID-Kollision (`Date.now()` als Primärschlüssel) verursacht Datenverlust bei praktisch auslösbaren Doppel-Scans

**File:** `game-scan.js:85-91` (Store-Definition: `persistence.js:29` `_IDB_SNAPSHOTS`, add-only via `persistence.js:196` `.add(record)`)

**Issue:**
`_saveGameInventorySnapshot` berechnet die Snapshot-ID beim Empfang der Daten:
```js
async function _saveGameInventorySnapshot(inventory, meta) {
  const ts = Date.now();
  ...
  const record = { id: ts, ts, ... };
  ...
  const ok = await idbSnapshotPut(record); // add-only → ConstraintError bei doppelter id
```
`idbSnapshotPut` schreibt per `.add()` (bewusst add-only, `persistence.js:196`), d.h. eine zweite ID-Kollision scheitert am Primärschlüssel. Zwei Scans, die im selben Millisekunden-Fenster fertig werden, erzeugen exakt dieselbe `id`. Das ist praktisch auslösbar, nicht nur theoretisch:

1. Der „🔎 Spiel scannen“-Button wird beim Starten eines Scans nicht deaktiviert (siehe WR-01) — ein zweiter Klick während des laufenden (gechunkten, potenziell mehrere hundert ms dauernden) Scans erzeugt einen zweiten Scan mit eigener `reqId`, aber beide laufen strukturell ähnlich lang und können im selben Event-Loop-Tick abgeschlossen werden.
2. `_saveGameInventorySnapshot` ist eine `async`-Funktion, die **vor** dem ersten `await` synchron `ts = Date.now()` berechnet. Wenn zwei `GAME_INVENTORY_DATA`-Nachrichten unmittelbar hintereinander eintreffen (keine Zeit-konsumierende Arbeit zwischen den beiden Aufrufen), liefert `Date.now()` in gängigen Testumgebungen und auch reellen Browsern mit hoher Wahrscheinlichkeit denselben Millisekundenwert.
3. Manche Browser drosseln `Date.now()` aus Privacy-Gründen (z. B. Firefox `resistFingerprinting`, div. Extensions) auf Auflösungen von 20–100 ms oder gröber — dort kollidieren auch **klar sequenzielle** Scans, die Sekundenbruchteile auseinanderliegen.

Der zweite (vollständig berechnete!) Scan geht dabei komplett verloren: `idbSnapshotPut` gibt `false` zurück, `_saveGameInventorySnapshot` bricht mit `_gameScanInfo('❌ Snapshot NICHT gespeichert…')` ab, es gibt keinen Retry und keinen alternativen Speicherpfad. Das widerspricht dem Kernwert des Projekts („Gescannte Daten … gehen nie verloren“) — hier geht ein bereits fertig berechneter Scan durch eine vermeidbare Kollision unwiederbringlich verloren, obwohl der Fehler technisch „sichtbar“ gemeldet wird.

Die zugehörige reqId (`gi_<Date.now()>_<++_giSeq>`) ist bereits kollisionsfrei, weil sie einen monotonen Zähler enthält — dieselbe Absicherung fehlt beim Snapshot-`id`.

**Fix:** ID kollisionsfrei ableiten, z. B. den bereits eindeutigen `reqId`-Zähler wiederverwenden oder einen monotonen Store-Zähler führen:
```js
let _giSaveSeq = 0;
async function _saveGameInventorySnapshot(inventory, meta) {
  const ts = Date.now();
  const id = ts * 1000 + (++_giSaveSeq % 1000); // oder: IDB-Store mit autoIncrement führen
  ...
  const record = { id, ts, ... };
```
Alternativ: `idbSnapshotPut` bei `ConstraintError` automatisch mit `id + 1` (oder `id + Math.random()`-Suffix) retryen, bevor der Fehler als endgültig gemeldet wird — so bleibt „add-only“ als Semantik erhalten, ohne dass ein vollständig berechneter Scan verworfen wird.

## Warnings

### WR-01: Scan-Button bleibt während eines laufenden Scans aktiv — Hauptauslöser für CR-01

**File:** `index.html:2487` (`<button id="gameScanBtn" onclick="triggerGameScan()">`), `game-scan.js:51-60` (`triggerGameScan`)

**Issue:** `triggerGameScan()` setzt `_giPending[reqId]`, deaktiviert aber weder den Button noch verhindert es einen zweiten Aufruf, während ein Scan bereits läuft. Ein Nutzer, der versehentlich zweimal klickt (oder ungeduldig erneut klickt, weil der Scan bei 4.764 Assets/18k Globals spürbar dauert), löst zwei parallele Voll-Scans aus — der direkte, leicht reproduzierbare Trigger für CR-01. Zusätzlich schreiben beide Scans ihre `GAME_INVENTORY_PROGRESS`-Meldungen auf dasselbe `#gameScanInfo`-Element, wodurch die Fortschrittsanzeige zwischen den beiden Scans hin- und herspringt und für den Nutzer nicht mehr nachvollziehbar ist, welcher Scan gerade welchen Schritt erreicht hat.

**Fix:**
```js
function triggerGameScan() {
  if (Object.values(_giPending).some(Boolean)) {
    _gameScanInfo('⏳ Scan läuft bereits – bitte warten');
    return null;
  }
  ...
}
```
und den Button in `index.html` beim Start/Ende des Scans per `disabled` umschalten (analog zum bestehenden Muster in `items.js:3654`/`3691`).

### WR-02: `_renderGameScanInfo` kann bei leerem `numericKeys`-Array eine unbehandelte `RangeError` erzeugen

**File:** `game-scan.js:118-121`

**Issue:**
```js
const numericKeys = keys.filter(function (k) { return typeof k === 'number'; });
text = n + ' Snapshot' + (n === 1 ? '' : 's') + ' gespeichert · letzter ' + _gameScanFormatTs(Math.max.apply(null, numericKeys));
```
Ist `keys.length > 0`, aber `numericKeys.length === 0` (z. B. wenn der Store durch eine zukünftige Migration/einen Fremdzugriff nicht-numerische Keys enthält), liefert `Math.max.apply(null, [])` `-Infinity`. `_gameScanFormatTs(-Infinity)` ruft `new Date(-Infinity).toISOString()` auf, was eine `RangeError: Invalid time value` wirft. Der äußere `try/catch` in `_renderGameScanInfo` fängt das zwar ab, lässt die Statuszeile aber im letzten (ggf. veralteten) Zustand hängen, ohne Hinweis auf den Fehler. Aktuell praktisch unerreichbar, da alle IDs aus `Date.now()` stammen — aber ein fragiler, unbegründeter Aufruf ohne Empty-Check.

**Fix:**
```js
const newest = numericKeys.length ? Math.max.apply(null, numericKeys) : null;
text = n + ' Snapshot' + (n === 1 ? '' : 's') + ' gespeichert' + (newest != null ? ' · letzter ' + _gameScanFormatTs(newest) : '');
```

### WR-03: Test zu „gleichzeitigen Scans“ maskiert CR-01 durch künstliche Verzögerung (false-green)

**File:** `tests/game-scan-bridge.test.js:210-225`

**Issue:** Der Test „gleichzeitige Scans: DATA für beide pendenden reqIds wird gespeichert“ fügt zwischen den beiden `recv(..., GAME_INVENTORY_DATA)`-Aufrufen ein `await settle(5)` ein:
```js
recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: a, snapshot: inventory() });
await settle(5);
recv(ctx, opener, { type: 'GAME_INVENTORY_DATA', reqId: b, snapshot: inventory({ gameVersion: 'R132' }) });
```
Damit wird genau die in CR-01 beschriebene Millisekunden-Kollision umgangen: Ohne das `settle(5)` würden beide `_saveGameInventorySnapshot`-Aufrufe ihren `Date.now()`-Wert synchron und ohne jede zwischenzeitliche Arbeit berechnen — in einer schnellen Testumgebung mit sehr hoher Wahrscheinlichkeit identisch, was zu einem `ConstraintError` beim zweiten `add()` führen würde. Der Test beweist damit nicht das, was der Name suggeriert („gleichzeitige Scans“), sondern nur zwei Scans mit garantiertem zeitlichem Abstand. Er ist ein Beleg dafür, dass CR-01 zum Zeitpunkt der Implementierung nicht erkannt wurde.

**Fix:** Einen echten Kollisionstest ergänzen, der `Date.now` für beide Aufrufe auf denselben Wert fixiert (`vi.spyOn(Date, 'now').mockReturnValue(...)`) und prüft, dass **beide** Snapshots dennoch gespeichert werden (nach Behebung von CR-01); zusätzlich den bestehenden Test unverändert lassen, aber nicht als Beweis für „gleichzeitig“ deklarieren, solange die künstliche Verzögerung nötig ist.

## Info

### IN-01: Truncation von Arrays/Strings (`GI_LIST_MAX`, `GI_STR_MAX`) ohne Kennzeichnung im Snapshot

**File:** `loader.js` (`GI_LIST_MAX = 200`, `GI_STR_MAX = 500`, `giBounded`)

**Issue:** Arrays/Strings, die die Grenzwerte überschreiten (z. B. `AllowLockType`, `hookedByMods`, lange `Description`-Texte), werden still gekappt — der Snapshot enthält keinen Hinweis darauf, dass Daten fehlen. Für ein Diagnose-/Analyse-Werkzeug kann das zu falschen Schlussfolgerungen führen („Mod X hat keinen Hook auf Y“, obwohl die Liste nur abgeschnitten wurde).

**Fix:** Optionales `*_truncated: true`-Flag mitschreiben, wenn `array.length > GI_LIST_MAX` bzw. `string.length > GI_STR_MAX`.

### IN-02: Überlappende `GI_PREFIXES` führen zu Doppelzählung in `globals.byPrefix`

**File:** `loader.js` (`GI_PREFIXES = [..., 'Asset', ..., 'Assets', ...]`)

**Issue:** Jeder Name, der mit `Assets` beginnt, beginnt zwangsläufig auch mit `Asset` — die Schleife `for (const p of GI_PREFIXES) if (name.startsWith(p)) byPrefix[p]++;` zählt solche Namen in beide Buckets. Das ist kein Crash und vermutlich beabsichtigt (deskriptive Statistik), aber ohne Kommentar für Leser der Snapshot-Daten überraschend, da die Summe der `byPrefix`-Werte nicht der Gesamtzahl der Globals entspricht.

**Fix:** Kurzer Kommentar bei `GI_PREFIXES`, dass Präfixe bewusst überlappen können, oder Verschiebung von `'Assets'` in eine gesonderte Kategorie.

### IN-03: `window.__BCK_buildGameInventory`-Test-Seam ist im Produktivbuild global exponiert

**File:** `loader.js` (`window.__BCK_buildGameInventory = buildGameInventory;`)

**Issue:** Da es keinen Build-Schritt gibt, landet der Test-Seam unverändert im ausgelieferten `loader.js` und ist von jedem anderen im Spiel-Tab laufenden Skript (z. B. einem Mod) direkt mit einer beliebigen `post`-Funktion aufrufbar, unter Umgehung der Origin-/Source-Pinning-Prüfung des `postMessage`-Handlers. Das erweitert die Angriffsfläche nicht grundsätzlich (ein bereits im selben Tab laufendes Skript hätte ohnehin Vollzugriff auf `window`/`Asset`/etc.), ist aber musterkonform zu bestehenden Test-Seams (`_BCU_serializeChar`) und bereits im Code kommentiert.

**Fix:** Kein Handlungsbedarf zwingend nötig; falls gewünscht, könnte der Seam hinter einen Debug-Flag oder `Object.defineProperty(..., { enumerable: false })` gestellt werden, um ihn aus `Object.keys(window)`/Casual-Discovery herauszuhalten.

---

_Reviewed: 2026-09-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
