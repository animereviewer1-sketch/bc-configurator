---
phase: 06-scan-tab-analyse
reviewed: 2026-09-19T13:06:15Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - scan-tab.js
  - persistence.js
  - items.js
  - index.html
  - baseline-manifest.js
  - baseline-manifest.json
  - tools/build-baseline.js
  - tools/analyze-snapshot.js
  - vitest.config.js
  - tests/scan-tab.test.js
  - tests/scan-tab-export.test.js
  - tests/snapshot-delete.test.js
  - tests/analyze-snapshot.test.js
  - tests/baseline-manifest.test.js
  - tests/helpers/scanFixtures.js
findings:
  critical: 1
  warning: 3
  info: 5
  total: 9
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-09-19T13:06:15Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Fix-Status (2026-09-19, Commit `bbc7854`)

| Befund | Status |
|---|---|
| CR-01 | ✅ behoben — `_scanFlatten` reduziert `{name, kind}` auf den Namen, alle Quellen (functions/api/screenFunctions.sample/sample) werden konkateniert |
| WR-01 | ✅ behoben — `_scanGetSnapshot(id)` (exakt, dann numerischer Fallback; String-Datensatz hat Vorrang), `scanSelectSnapshot` führt auf die echte id zurück, Löschung mit `rec.id` |
| WR-02 | ✅ behoben — `_scanFormatTs` liefert „(ungültiger Zeitstempel)“ statt RangeError |
| WR-03 | ✅ behoben — Fixture `mbs.api` in Objektform |
| IN-01..05 | offen (advisory) — Kandidaten für Backlog |

Regressionstests: `tests/scan-tab-review.test.js` (9 Fälle). Dokument-Zahlen (probes/all) in GAME-INVENTORY.md neu übernommen.

## Summary

Geprüft wurde der Phase-6-Diff (`83cd7d5^..HEAD`): das neue Modul `scan-tab.js`, die Lösch-Primitive `idbSnapshotDelete` in `persistence.js`, die Verdrahtung in `items.js`/`index.html`, die generierten Baseline-Dateien, die beiden Dev-CLIs und die neuen Tests. Zusätzlich wurde `scan-tab.js` gegen den echten Snapshot `.planning/analysis/snapshot.json` (R132, 38 Mods, 8,3 MB) und gegen die Datenform aus `loader.js` (`giDescribeApi`) ausgeführt, statt nur gegen die Test-Fixtures.

**Kernwert (nie automatisch löschen):** eingehalten. `idbSnapshotDelete` ist die einzige Lösch-Operation auf dem Store `snapshots`, hat genau einen Aufrufer (`deleteGameSnapshot`), der vor `confirm()` die Existenz prüft und ohne `confirm`-Funktion fail-closed `false` liefert. Keine Schleife, keine `clear`/`deleteDatabase`. Der statische Audit in `tests/snapshot-delete.test.js` sichert das ab.

**Sicherheit (XSS):** eingehalten. Alle snapshot-abgeleiteten Strings in `_scanRender`/`_scanRenderSnapshots` laufen durch `escHtml`, ids in `onclick` durch `escJsAttr` in einfachen Anführungszeichen; Badge-Klasse/-Label kommen aus festen Mengen; `scanBaselineInfo` nutzt `textContent`. Der XSS-Test (T-6-05) deckt Mod-Namen ab.

**Hauptbefund:** `_scanFlatten` verarbeitet die Probe-APIs (`bcx.api`, `mbs.api`, `lscg.api`) falsch. `loader.js` liefert dort `[{name, kind}]`-Objekte, `scan-tab.js` erwartet Strings — im echten Snapshot entstehen 21 Zeilen `mbs.[object Object]` / `lscg.[object Object]`, und die 18 LSCG-Screen-Funktionen fallen ganz weg. Die Test-Fixture (`api: ['getActive']`) weicht vom Loader-Vertrag ab und hat den Fehler verdeckt. Dazu kommen zwei Robustheitslücken (numerische Alt-ids, ungültiger `ts`), die Auswahl/Export/Löschen einzelner Datensätze unmöglich machen können.

## Critical Issues

### CR-01: Probe-APIs werden als `[object Object]` gerendert, LSCG-Screen-Funktionen gehen verloren

**File:** `scan-tab.js:183-186`
**Issue:** `const names = p.functions || p.api || (p.screenFunctions && p.screenFunctions.sample) || p.sample || [];` nimmt an, dass alle vier Quellen String-Arrays sind. Laut `loader.js:950-964` (`giDescribeApi`) sind `bcx.api`, `mbs.api` und `lscg.api` aber Arrays von `{ name, kind }`. `key + '.' + fn` ergibt dann `mbs.[object Object]`. Gegen den echten Snapshot (`.planning/analysis/snapshot.json`) liefert `_scanFlatten` 21 solcher Zeilen (10× mbs, 11× lscg); die eigentlichen API-Namen (`wheelOutfits`, `getModule`, `sendLSCGBeep` …) sind im Tab nicht sichtbar und nicht suchbar. Zusätzlich ist die `||`-Kette exklusiv: bei `lscg` ist `api` truthy (auch `[]`), daher wird `screenFunctions.sample` (18 Namen `LSCG_*` im echten Snapshot) nie gelistet. Die Zahlen fließen über `tools/analyze-snapshot.js` unverändert in GAME-INVENTORY.md (probes: 166 gesamt / 81 genutzt enthalten die 21 Müllzeilen).
**Fix:**
```js
// scan-tab.js, in _scanFlatten, Probes-Block
function apiName(x) { return typeof x === 'string' ? x : String((x && x.name) ?? ''); }
const sources = [p.functions, p.api, p.screenFunctions && p.screenFunctions.sample, p.sample];
const names = [];
sources.forEach(function (src) {
  if (Array.isArray(src)) src.forEach(function (x) { const n = apiName(x); if (n) names.push(n); });
});
names.forEach(function (fn) {
  push('probes', 'probe-api', key + '.' + fn, '', { probe: key });
});
```
Anschließend `tests/helpers/scanFixtures.js` auf den Loader-Vertrag umstellen (siehe WR-03) und `EXPECTED_ROWS` nachziehen; GAME-INVENTORY.md per `npm run analyze` neu erzeugen.

## Warnings

### WR-01: Snapshots mit numerischer id lassen sich weder auswählen noch exportieren noch löschen

**File:** `scan-tab.js:299-305`, `scan-tab.js:265-272`
**Issue:** Die id wird in `onclick="scanSelectSnapshot('${escJsAttr(r.id)}')"` (ebenso für Export/Löschen) immer als String übergeben. `persistence.js` (`idbSnapshotPut`/`idbSnapshotDelete`: `typeof id === 'number' || …`) und `game-scan.js:136` („Schlüssel sind '<ts>_<reqId>' oder Zahlen (ältere Datensätze)") unterstützen numerische ids ausdrücklich; der ursprüngliche Stand `d2e8351` hat `id: ts` (Zahl) geschrieben. Für einen solchen Datensatz gilt: `idbSnapshotGet('1758…')` liefert für den Zahl-Key `undefined` (IDB vergleicht typisiert, verifiziert mit fake-indexeddb) → „Snapshot nicht gefunden", und `records.find(r => r.id === _scanState.selectedId)` scheitert am `===` → Fundliste leer, kein aktiver Eintrag. Der Datensatz ist damit im UI unbenutzbar und auch manuell nicht löschbar.
**Fix:** id vor der Verwendung typgetreu auflösen — im Browser aus der bereits geladenen Liste:
```js
function _scanResolveId(id) {
  const hit = _scanState.records.find(function (r) { return String(r.id) === String(id); });
  return hit ? hit.id : id;
}
// scanSelectSnapshot / deleteGameSnapshot / exportGameSnapshot:
id = _scanResolveId(id);
```
Alternativ in `deleteGameSnapshot`/`exportGameSnapshot` bei `!rec` und rein numerischem String einen zweiten `idbSnapshotGet(Number(id))` versuchen. Test: Datensatz mit `id: 1758000000000` seeden, `deleteGameSnapshot('1758000000000')` muss `confirm` erreichen.

### WR-02: Ungültiger `ts` wirft in `_scanFormatTs` und blockiert den gesamten Scan-Tab

**File:** `scan-tab.js:37-39`, `scan-tab.js:300`, `scan-tab.js:65`, `items.js:4267`
**Issue:** `new Date(undefined|NaN|'x').toISOString()` wirft `RangeError: Invalid time value`. `_scanRenderSnapshots` ruft `_scanFormatTs(r.ts)` für jeden Datensatz auf; ein einziger Datensatz ohne gültigen `ts` lässt `renderScanTab()` vor `_scanRender()` abbrechen. `switchTab('scan')` ruft `renderScanTab()` ohne `await`/`catch` auf → unbehandelte Promise-Rejection, keine `showStatus`-Meldung, Tab bleibt leer, und der fehlerhafte Datensatz kann nicht einmal gelöscht werden (auch `deleteGameSnapshot` wirft bei Zeile 65 vor `confirm`). `persistence.js` validiert nur `id`; `idbSnapshotGetAll` und `game-scan.js` (Review WR-02 aus Phase 5) rechnen ausdrücklich mit fehlendem `ts` (`a.ts ?? a.id`, `Number.isFinite`-Filter). `scan-tab.js` ist damit strenger als die Schicht darunter.
**Fix:**
```js
function _scanFormatTs(ts) {
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return 'unbekannt';
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}
// _scanExportName: analog 'undatiert' statt toISOString().slice(0,10)
```
Zusätzlich `renderScanTab` defensiv abschließen: `try { … } catch (e) { showStatus('❌ Scan-Tab: ' + (e?.message || e), 'error'); }`, damit ein Render-Fehler sichtbar wird (Kernwert „sichtbar fehlgeschlagen").

### WR-03: Test-Fixture weicht vom Loader-Vertrag ab und hat CR-01 verdeckt

**File:** `tests/helpers/scanFixtures.js:51-56`, `tests/scan-tab.test.js:95-120`
**Issue:** Die Fixture modelliert `mbs.api` als `['getActive']` (Strings), während `loader.js` `[{ name, kind }]` liefert. Alle Flatten-/Badge-/Render-Tests laufen dadurch gegen eine Datenform, die das Spiel nie liefert; die `[object Object]`-Zeilen und der Verlust der LSCG-Screen-Funktionen sind mit 52 grünen Tests unentdeckt geblieben. Der Kommentar „Task-2-Vertrag" in `EXPECTED_ROWS` verankert die falsche Form sogar als Vertrag.
**Fix:** Fixture an `giDescribeApi` angleichen (`api: [{ name: 'getActive', kind: 'function' }]`, `lscg.api` nicht leer UND `screenFunctions.sample` nicht leer), `EXPECTED_ROWS` anpassen und eine Invariante ergänzen:
```js
expect(rows.some((r) => r.name.includes('[object'))).toBe(false);
expect(rows.filter((r) => r.kind === 'probe-api').map((r) => r.name)).toContain('lscg.LSCG_SuggestionMiniGameRun');
```
Optional ein schlanker Vertragstest, der die Probe-Formen direkt aus dem Fallback-Objekt in `loader.js:1349-1358` ableitet, damit Loader und Tab nicht erneut auseinanderlaufen.

## Info

### IN-01: Baseline enthält die Sonden-Bezeichner des Scanners selbst („bereits genutzt" wird verwässert)

**File:** `tools/build-baseline.js:30`, `baseline-manifest.json`
**Issue:** `loader.js` ist Quelldatei der Baseline, enthält seit Phase 5 aber den Inventar-Enumerator, der BC-Bezeichner nur nennt, um sie zu scannen (`'ChatRoomMessageHandlers'`, `'InventoryItem'`, `AssetGroup`, `AssetName`, `InventoryID` …). 22 der 83 Bezeichner stammen ausschließlich aus `loader.js`. Solche Namen bekommen im Tab das Badge „bereits genutzt", obwohl das Tool sie funktional nicht nutzt — die Aussage der Badges und von GAME-INVENTORY.md verschiebt sich.
**Fix:** Den Enumerator-Abschnitt (z. B. zwischen Marker-Kommentaren `// GI:BEGIN`/`// GI:END`) vor dem Regex-Lauf aus dem `loader.js`-Text schneiden, oder loader.js-only-Treffer im Manifest als `files: ['loader.js']` gesondert klassifizieren und im Tab als „Scanner" statt „genutzt" badgen.

### IN-02: `_debounce` fehlt in der `required`-Liste des Ladereihenfolge-Guards

**File:** `scan-tab.js:13-21`, `scan-tab.js:355`
**Issue:** `scanOnSearch` nutzt `_debounce` aus `persistence.js`; der Guard prüft aus persistence.js nur die drei Snapshot-Funktionen. Praktisch abgedeckt (gleiche Datei), aber die Liste dokumentiert die Abhängigkeit unvollständig — bei einem späteren Split von persistence.js würde der Fehler erst beim ersten Tastendruck als `ReferenceError` auftreten.
**Fix:** `['_debounce', 'persistence.js']` ergänzen.

### IN-03: Kleinere CLI-Schwächen in `tools/analyze-snapshot.js`

**File:** `tools/analyze-snapshot.js:96`, `:108`, `:110-114`, `:79`
**Issue:** (a) `parseInt(args[++i], 10) || 40` macht `--limit 0` unbrauchbar (0 → 40). (b) `loadJson(exportFile)` ohne `try/catch` — eine fehlende/ungültige Datei endet mit rohem Stacktrace statt Usage-artiger Meldung. (c) Ein nicht ladbares Manifest wird still zu `null` (alle Badges „unbekannt") — nur die Markdown-Zeile „Baseline: nicht geladen" verrät es; ein `console.error` auf stderr wäre angemessen. (d) Namen werden unmaskiert in Backticks gesetzt; ein Backtick im Mod-Namen zerlegt die Markdown-Ausgabe.
**Fix:** `Number.isFinite(n) && n >= 0 ? n : 40`; `try { loadJson } catch → console.error + exit(2)`; `console.error('[analyze] Manifest nicht geladen: ' + e.message)`; Backticks im Namen durch `` ` `` → `'` ersetzen oder doppelte Backticks als Code-Span nutzen.

### IN-04: `renderScanTab` lädt alle Snapshots vollständig in den Speicher (Robustheit im Popup)

**File:** `scan-tab.js:263-264`, `persistence.js:213-225`
**Issue:** Für die reine Liste (Datum, Version, Mods, KB) holt `idbSnapshotGetAll()` jeden Datensatz samt `inventory` (8,3 MB je Snapshot laut echtem Export) und hält alle in `_scanState.records`. Bei jedem Tab-Wechsel und jedem „Aktualisieren" wird das erneut structured-cloned. Mit wachsender Snapshot-Zahl droht im Popup-Fenster Speicherdruck bis zum Tab-Absturz — dann ist auch Löschen nicht mehr erreichbar. (Performance ist out-of-scope; hier geht es um die Erreichbarkeit des Lösch-Pfads.)
**Fix:** Liste aus Metadaten aufbauen (Cursor über den Store mit Projektion auf `id/ts/gameVersion/modCount/sizeBytes`, oder ein read-only `idbSnapshotMeta()` in persistence.js) und nur den ausgewählten Datensatz per `idbSnapshotGet` laden; `_scanState.records` auf Metadaten reduzieren.

### IN-05: Badge für Chat-Handler-Zeilen ist bedeutungslos („neu" für Freitext-Beschreibungen)

**File:** `scan-tab.js:161-163`, `scan-tab.js:219-221`
**Issue:** `hooks/handler`-Zeilen tragen als `name` die Freitext-`Description` („Reset minigame on room updates"). `_scanBadge` vergleicht diesen Text mit der Bezeichner-Menge → immer „neu". Gleiches gilt für `probes/sweep` (probe `''` → immer „neu"). Die Zähler „neu" (im echten Snapshot hooks 115, probes 85) werden dadurch systematisch überschätzt.
**Fix:** Für Kinds ohne Bezeichner-Semantik (`handler`, `sweep`) `'unbekannt'` zurückgeben, oder für `sweep` gegen `sets.identifiers`/den Mod-Präfix (`/^(WCE|FBC|LSCG|MBS|BCX|Themed)/i` → `modProbes`) badgen.

---

_Reviewed: 2026-09-19T13:06:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
