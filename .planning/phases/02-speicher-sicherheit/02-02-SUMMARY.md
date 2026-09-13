---
phase: 02-speicher-sicherheit
plan: 02
subsystem: storage
tags: [delete-confirmation, screenshots, lscg, profile-screenshots, mbs-wheel, vm-sandbox, red-green]

# Dependency graph
requires:
  - phase: 02-speicher-sicherheit
    provides: "02-01: _syncLscgScreenshotToProfiles(mk, fp) korrekt (mk|fp-Schlüssel), Test-Infrastruktur (loadScript/evalIn/settle)"
provides:
  - "STAB-09: Alle zehn UI-erreichbaren Lösch-Pfade verlangen confirm() genau einmal; statischer Quell-Audit beweist, dass keine andere Zeile einen der vier Stores mutiert"
  - "STAB-10: Zentraler Aufräum-Helfer (_removeLscgScreenshotFromProfiles / _removeLscgScreenshotKeyFromProfiles / _removeAllLscgScreenshotsFromProfiles) entfernt bei jedem LSCG-Löschpfad ausschließlich byte-identische Profil-Kopien, inkl. Cross-Version-Kopien und IDB-Persistenz"
affects: [02-03-PLAN.md]

# Actuals (#2632)
actuals:
  tokens: 5011
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Statischer Quell-Audit über items.js (Regex + Enclosing-Funktion-Tracking) als Sicherheits-Invariante: jede destruktive Store-Zeile muss in einer bekannten, bestätigten Funktion oder auf einer dokumentierten Ausnahmeliste liegen"
    - "Spiegel-Helfer-Paar: _removeLscgScreenshotFromProfiles ist das exakte Gegenstück zu _syncLscgScreenshotToProfiles (Plan 02-01) — dieselbe Fingerprint→Slot-Auflösung, einmal kopierend, einmal entfernend mit Identitätsprüfung"

key-files:
  created:
    - tests/delete-confirmation.test.js
    - tests/delete-consistency.test.js
  modified:
    - items.js

key-decisions:
  - "Helfer-Signatur um `img` erweitert (_removeLscgScreenshotFromProfiles(fp, img)) statt nur `fp` — die Identitätsprüfung `PROFILE_SCREENSHOTS[k] === img` ist die einzige Möglichkeit, synchronisierte Kopien von manuellen Uploads zu unterscheiden (Planer-Ermessen, must_haves-Annahme bestätigt)"
  - "Wheel-Zweig von deleteOsScreenshotFromLb als sechster confirm-loser Pfad mitgefixt (Planer-Probe hatte ihn zusätzlich zur RESEARCH-Tabelle gefunden) — gleicher Aufwand, gleiche Bug-Klasse, kein Doppeldialog in den anderen beiden Zweigen (die rufen bereits deleteOsScreenshotKey/deleteOsScreenshot auf, welche selbst bestätigen)"
  - "LSCG_MAX_VERSIONS-Trim (Scan-Import, ~1500 Versionen/Member) bewusst nicht angetastet — Obergrenze, nicht UI-erreichbar, nicht Teil des STAB-09/10-Scopes"
  - "enrichProfileNamesWithIDs() bewusst nicht geändert (Orchestrator-Entscheidung 4 aus 02-01) — Umbenennung ohne Screenshot-Mitzug ist UX-Lücke, kein Datenverlust, separates Backlog-Thema"
  - "window.repairOsOutfitCode bewusst nicht geändert — Konsolen-Reparaturbefehl, nicht UI-erreichbar, nimmt den Screenshot ohnehin neu auf"

patterns-established:
  - "Löschpfad-Guard-Reihenfolge: Existenz-Prüfung → confirm() → Cleanup-Helfer (braucht das Bild) → eigentliche Mutation → Save → Status mit optionaler Kopien-Zahl"

requirements-completed: [STAB-09, STAB-10]

coverage:
  - id: D1
    description: "Alle zehn UI-erreichbaren Lösch-Pfade (removeProfileScreenshot, deleteOsScreenshot, deleteOsScreenshotKey, mbsWheelDeleteShot, deleteOsScreenshotFromLb-Wheel-Zweig, deleteLscgVersion, clearAllProfileScreenshots, clearAllLscgScreenshots, clearAllLscgOutfits, mbsWheelClearAllShots) rufen confirm() genau einmal auf; bei false bleiben alle vier Stores byte-identisch"
    requirement: "STAB-09"
    verification:
      - kind: unit
        ref: "tests/delete-confirmation.test.js#Löschen nur mit Bestätigung (STAB-09) — it.each(DELETE_PATHS) × 2 (20 Fälle) + confirm-Text-Test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Statischer Quell-Audit beweist: keine Zeile, die LSCG_SCREENSHOTS/PROFILE_SCREENSHOTS/_mbsWheelShots/LSCG_DB löscht oder auf {} zurücksetzt, liegt außerhalb einer bestätigten Funktion oder der dokumentierten Ausnahmeliste (Umbenennungen, Konsolen-Reparatur, Aufräum-Helfer)"
    requirement: "STAB-09"
    verification:
      - kind: unit
        ref: "tests/delete-confirmation.test.js#jede Lösch-Zeile der vier Stores liegt in einer Funktion mit confirm() oder auf der Ausnahmeliste"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zentraler Aufräum-Helfer entfernt bei jedem der fünf LSCG-Löschpfade (deleteLscgVersion, deleteOsScreenshot, deleteOsScreenshotKey, clearAllLscgScreenshots, clearAllLscgOutfits) alle byte-identischen Profil-Kopien inkl. Cross-Version-Kopien; manuelle Uploads und fremde Profile bleiben unverändert"
    requirement: "STAB-10"
    verification:
      - kind: unit
        ref: "tests/delete-consistency.test.js#deleteLscgVersion entfernt das Versionsbild und alle identischen Profil-Kopien des Members (inkl. Cross-Version-Kopie Anna_v2c)"
        status: pass
      - kind: unit
        ref: "tests/delete-consistency.test.js#deleteOsScreenshotKey entfernt nur identische Kopien — manuelle Profil-Bilder bleiben"
        status: pass
      - kind: unit
        ref: "tests/delete-consistency.test.js#deleteOsScreenshot (Legacy-Schlüssel mk) räumt die Profil-Kopie über die Versions-Fingerprints"
        status: pass
      - kind: unit
        ref: "tests/delete-consistency.test.js#clearAllLscgScreenshots leert LSCG_SCREENSHOTS und alle identischen Profil-Kopien, LSCG_DB bleibt"
        status: pass
      - kind: unit
        ref: "tests/delete-consistency.test.js#clearAllLscgOutfits leert LSCG_DB, LSCG_SCREENSHOTS, _lscgFpMap und alle identischen Profil-Kopien"
        status: pass
    human_judgment: false
  - id: D4
    description: "Helfer-Vertrag: _removeLscgScreenshotFromProfiles(fp, img) und _removeLscgScreenshotKeyFromProfiles(key) liefern die korrekte Anzahl entfernter Kopien, inkl. Cross-Version-Fingerprint-Auflösung; unbekannte Schlüssel/Fingerprints liefern 0"
    requirement: "STAB-10"
    verification:
      - kind: unit
        ref: "tests/delete-consistency.test.js#Helfer-Vertrag: _removeLscgScreenshotFromProfiles(fp, img) entfernt nur identische Slots und liefert die Anzahl"
        status: pass
    human_judgment: false
  - id: D5
    description: "Nach bcSpeichernJetzt() sind die entfernten Profil-Kopien auch in IDB (BC_PROFILE_SCREENSHOTS_v1) weg, unveränderte Bilder (BC_LSCG_SCREENSHOTS_v1) bleiben"
    requirement: "STAB-10"
    verification:
      - kind: unit
        ref: "tests/delete-consistency.test.js#nach bcSpeichernJetzt() sind die Kopien auch in IDB weg"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manuelle Browser-Verifikation: 🗑 auf einer Versions-Karte und ✕ Entfernen im Profil-Modal zeigen tatsächlich einen Dialog; Abbrechen lässt das Bild unverändert; Bestätigen entfernt es aus Outfit-Scan UND Profil"
    verification: []
    human_judgment: true
    rationale: "Erfordert einen echten Browser/BC-Kontext (DOM-Click, Lightbox-Rendering); die vm-Sandbox-Tests decken die Store-Mutationslogik vollständig ab, nicht das tatsächliche Klickverhalten der UI-Buttons"

# Metrics
duration: 15min
completed: 2026-09-13
status: complete
plan_head_before: 34fe988
---

# Phase 2 Plan 2: Lösch-Bestätigung und Konsistenz-Bereinigung Summary

**Fünf zuvor confirm-lose Lösch-Pfade (inkl. eines im Planer-Probe zusätzlich gefundenen Wheel-Zweigs) verlangen jetzt genau einmal `confirm()`, und ein neuer Spiegel-Helfer zu `_syncLscgScreenshotToProfiles` räumt bei jedem LSCG-Löschvorgang byte-identische Profil-Kopien auf — RED→GREEN mit statischem Quell-Audit als Regressionsschutz.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-13T09:53:00Z (approx.)
- **Completed:** 2026-09-13T10:07:28Z
- **Tasks:** 3
- **Files modified:** 3 (2 neu, 1 geändert)

## Accomplishments

- `tests/delete-confirmation.test.js` (STAB-09): 10-Pfad-Tabelle `DELETE_PATHS` × {confirm→false: nichts gelöscht + genau 1× gefragt; confirm→true: Ziel entfernt + genau 1× gefragt}, plus statischer Quell-Audit (`DELETE_RE`/`FN_RE`/`CONFIRM_REQUIRED`/`ALLOWED_WITHOUT_CONFIRM`) — **RED-CONFIRMED** vor dem Fix (Pfade 1–5 in beiden it.each-Blöcken rot, Audit rot; Pfade 6–10 bereits grün als Regressionsschutz)
- `tests/delete-consistency.test.js` (STAB-10): sieben Fälle (fünf Löschpfade ohne verwaiste Kopien, Helfer-Vertrag, IDB-Persistenz) — **RED-CONFIRMED**, alle sieben rot (Helfer existierten noch nicht)
- `items.js` Task 2: `confirm()`-Guards in `removeProfileScreenshot`, `deleteOsScreenshot`, `deleteOsScreenshotKey`, `mbsWheelDeleteShot`, `deleteOsScreenshotFromLb` (Wheel-Zweig) — `confirm(` Vorkommen 28 → 33 (+5); Confirmation-Test **GREEN** (22 passed), Konsistenz-Test bewusst noch rot (Helfer kommt in Task 3)
- `items.js` Task 3: `_LSCG_PROFIL_KOPIEN_HINWEIS` + drei Helfer (`_removeLscgScreenshotFromProfiles`, `_removeLscgScreenshotKeyFromProfiles`, `_removeAllLscgScreenshotsFromProfiles`) verdrahtet vor der Mutation in allen fünf LSCG-Löschpfaden; beide Testdateien **GREEN** (29 passed), volle Suite grün (85 passed + 2 expected fail)

### RED-Ausgabe Task 1 (vor jedem Fix)

```
❯ tests/delete-confirmation.test.js (22 tests | 12 failed)
   Löschen nur mit Bestätigung (STAB-09)
     × removeProfileScreenshot: confirm → false löscht nichts und fragt genau einmal
     × deleteOsScreenshot: confirm → false löscht nichts und fragt genau einmal
     × deleteOsScreenshotKey: confirm → false löscht nichts und fragt genau einmal
     × mbsWheelDeleteShot: confirm → false löscht nichts und fragt genau einmal
     × deleteOsScreenshotFromLb (Wheel-Zweig): confirm → false löscht nichts und fragt genau einmal
     × removeProfileScreenshot: confirm → true entfernt das Ziel und fragt genau einmal
     × deleteOsScreenshot: confirm → true entfernt das Ziel und fragt genau einmal
     × deleteOsScreenshotKey: confirm → true entfernt das Ziel und fragt genau einmal
     × mbsWheelDeleteShot: confirm → true entfernt das Ziel und fragt genau einmal
     × deleteOsScreenshotFromLb (Wheel-Zweig): confirm → true entfernt das Ziel und fragt genau einmal
     × confirm-Text ist ein nicht-leerer String
     × jede Lösch-Zeile der vier Stores liegt in einer Funktion mit confirm() oder auf der Ausnahmeliste
     (10 weitere Fälle grün — Pfade 6-10, bereits vorher confirm()-abgesichert)

❯ tests/delete-consistency.test.js (7 tests | 7 failed)
   Bestätigtes Löschen hinterlässt keine verwaisten Kopien (STAB-10)
     × deleteLscgVersion entfernt das Versionsbild und alle identischen Profil-Kopien des Members (inkl. Cross-Version-Kopie Anna_v2c)
     × deleteOsScreenshotKey entfernt nur identische Kopien — manuelle Profil-Bilder bleiben
     × deleteOsScreenshot (Legacy-Schlüssel mk) räumt die Profil-Kopie über die Versions-Fingerprints
     × clearAllLscgScreenshots leert LSCG_SCREENSHOTS und alle identischen Profil-Kopien, LSCG_DB bleibt
     × clearAllLscgOutfits leert LSCG_DB, LSCG_SCREENSHOTS, _lscgFpMap und alle identischen Profil-Kopien
     × Helfer-Vertrag: _removeLscgScreenshotFromProfiles(fp, img) entfernt nur identische Slots und liefert die Anzahl
     × nach bcSpeichernJetzt() sind die Kopien auch in IDB weg

 Test Files  2 failed (2)
      Tests  19 failed | 10 passed (29)
```

RED-CONFIRMED (`RED-CONFIRMED`-Marker der Plan-Verify-Befehle wurde ausgegeben).

### GREEN-Ausgabe Task 2 (nach STAB-09-Fix)

```
 Test Files  1 passed (1)
      Tests  22 passed (22)
```
`confirm(` Vorkommen: 28 (vorher) → 33 (nachher), +5 — exakt die fünf neuen Guards.
`tests/delete-consistency.test.js` bleibt erwartungsgemäß rot (`STILL-RED-AS-EXPECTED`, 7 failed) — Helfer folgen in Task 3.

### GREEN-Ausgabe Task 3 (nach STAB-10-Fix)

```
 Test Files  2 passed (2)
      Tests  29 passed (29)
```
`npm test`: 9 Testdateien, 85 passed + 2 expected fail (87 gesamt), Exit 0. `node --check items.js` grün.

### `git show --stat` je Fix-Commit

```
f489d12 fix(02-02): require confirm() on every screenshot delete path (STAB-09)
 items.js | 10 +++++++++-
 1 file changed, 9 insertions(+), 1 deletion(-)

096a5f0 fix(02-02): remove synced profile copies on LSCG screenshot delete (STAB-10)
 items.js | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++--------
 1 file changed, 54 insertions(+), 8 deletions(-)
```

## Task Commits

Each task was committed atomically:

1. **Task 1: Lösch-Bestätigungs- und Konsistenz-Tests schreiben, RED bestätigen** - `f161085` (test)
2. **Task 2: `confirm()` in die fünf confirm-losen Lösch-Pfade einbauen, Confirmation-Test GREEN** - `f489d12` (fix)
3. **Task 3: Aufräum-Helfer + Aufrufe in allen LSCG-Löschpfaden, beide Tests GREEN** - `096a5f0` (fix)

**Plan metadata:** wird im Anschluss committet (docs)

_Note: RED→GREEN wie geplant — Task 1 committet die roten Tests, bevor items.js angefasst wird._

## Files Created/Modified

- `tests/delete-confirmation.test.js` - Neu: STAB-09, 10-Pfad-Tabelle `DELETE_PATHS` (confirm→false/true × 10), confirm-Text-Test, statischer Quell-Audit über items.js
- `tests/delete-consistency.test.js` - Neu: STAB-10, sieben Fälle für die fünf LSCG-Löschpfade + Helfer-Vertrag + IDB-Persistenz
- `items.js` - fünf `confirm()`-Guards (STAB-09); `_LSCG_PROFIL_KOPIEN_HINWEIS` + drei Aufräum-Helfer + fünf Aufrufstellen (STAB-10)

## Decisions Made

- Helfer-Signatur `_removeLscgScreenshotFromProfiles(fp, img)` statt nur `(fp)` — die Identitätsprüfung `=== img` ist die einzige praktikable Unterscheidung zwischen synchronisierter Kopie und manuellem Upload (Planer-Ermessen, im Plan als must_haves-Annahme vorgesehen und hier bestätigt umgesetzt)
- Wheel-Zweig von `deleteOsScreenshotFromLb` als sechster confirm-loser Pfad mitgefixt — von der Planer-Probe zusätzlich zur RESEARCH-Tabelle gefunden, gleicher Bug, gleicher Aufwand; die beiden anderen Zweige der Funktion bekommen KEIN zusätzliches `confirm()`, weil sie bereits über `deleteOsScreenshotKey`/`deleteOsScreenshot` bestätigen (sonst Doppeldialog)
- `mbsWheelClearAll` und `mbsWheelDeleteShot` bleiben ohne Aufräum-Helfer — eigener Store (`_mbsWheelShots`), kein Sync nach `PROFILE_SCREENSHOTS`, daher strukturell keine Verwaisungs-Gefahr für STAB-10

## Bewusst nicht geänderte Pfade

- **`LSCG_MAX_VERSIONS = 1500`-Trim** (Scan-Import, `versions.slice(-1500)`): bewusste Obergrenze pro Member, nicht UI-erreichbar, kein Lösch-Pfad im Sinne von STAB-09/10
- **`enrichProfileNamesWithIDs()`**: Umbenennung ohne Screenshot-Key-Mitzug (bereits in 02-01-SUMMARY.md als Deferred dokumentiert, Orchestrator-Entscheidung 4) — UX-Lücke, kein Datenverlust, außerhalb dieses Plan-Scopes
- **`window.repairOsOutfitCode`**: Konsolen-Reparaturbefehl, nicht UI-erreichbar, löscht den alten Screenshot nur, um ihn sofort neu aufzunehmen — kein Datenverlust, bleibt auf der Audit-Ausnahmeliste

## Deviations from Plan

None - plan executed exactly as written (der Wheel-Zweig von `deleteOsScreenshotFromLb` war bereits im Plan als sechster Pfad vorgesehen, kein ungeplanter Zusatz).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm test` grün: 9 Testdateien, 85 passed + 2 expected fail
- `node --check items.js` grün
- Drei Commits in der Reihenfolge test (RED) → fix (STAB-09) → fix (STAB-10); jeder Fix-Commit enthält ausschließlich `items.js`
- `git log 34fe988..HEAD -- index.html loader.js bot-data.js bot-ui.js bot-engine.js outfit-import.js` ist leer — keine anderen Produktionsdateien berührt
- Manuelle Browser-Verifikation (🗑 / ✕ Entfernen-Buttons, Dialog + Konsequenz) steht noch aus — siehe Coverage D6, `VALIDATION.md` „Manual-Only"
- Bereit für 02-03 (STAB-03, Speicherplatz-Anzeige)
- Kein Blocker

---
*Phase: 02-speicher-sicherheit*
*Completed: 2026-09-13*

## Self-Check: PASSED
