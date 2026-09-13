---
phase: 03-bridge-haertung
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - items.js
  - loader.js
  - bot-engine.js
  - bot-ui.js
  - index.html
  - tests/helpers/loadScript.js
  - tests/bridge-protocol.test.js
  - tests/injected-code-origin.test.js
  - tests/loader-origin.test.js
  - tests/exec-log.test.js
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 03: Code Review Report — Bridge-Härtung

**Reviewed:** 2026-09-13
**Depth:** standard (Diff gegen `44c0ada`)
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed wurde ausschließlich der Diff `44c0ada..HEAD` für die sechs Quelldateien und vier neuen Testdateien der Bridge-Härtung. Die Kernmechanismen sind solide umgesetzt und durch 47 grüne Tests abgesichert (`npx vitest run` bestätigt lokal, keine roten oder übersprungenen Tests):

- Tool-Seite (`items.js`): `_bridgeSenderOk` prüft `ev.source === window.opener` UND (nach dem ersten Handshake) `ev.origin === _bcOrigin` (Trust-on-first-use). Die Reihenfolge Origin-Lernen → `_connected=true` ist korrekt, sodass alle mit `_connected`-Guard versehenen EXEC-Aufrufstellen (visuell stichprobenartig verifiziert, u. a. `bcKeys()`) zum Sendezeitpunkt bereits einen gelernten `_bcOrigin` haben.
- Loader-Seite (`loader.js`): `ALLOWED_ORIGIN` wird jetzt aus `POPUP_URL` abgeleitet (eine Quelle der Wahrheit) und per Test verifiziert (34 Vorkommen, ein Origin-Check, keine Wildcards). Source-Pinning (`ev.source` gegen `window.__BCK_popupRef`) läuft NACH dem Origin-Check, PING ist explizit von der Pin-Sperre ausgenommen und korrekt für den Fall "Tool-Fenster neu geöffnet" gedacht.
- Generierter Code: `bot-engine.js` bettet `_TOOL_ORIGIN` sauber via `JSON.stringify` ein (kollisionsfrei, korrekt escaped). `items.js` (17 Stellen) und `bot-ui.js` (1 Stelle) nutzen dagegen rohe String-Konkatenation ohne Escaping — aktuell ungefährlich, aber inkonsistent und fragil (siehe WR-03).
- EXEC-Log: Rendering ausschließlich über `textContent` (kein XSS-Vektor), Ringpuffer-Rotation korrekt (älteste zuerst verworfen, Scan-Daten unberührt — durch eigenen Test abgesichert), Persistenz debounced (1200 ms), nicht bei jedem EXEC synchron geschrieben.

Trotzdem bleiben mehrere Härtungslücken und ein Testabdeckungsproblem, die für eine als "Bridge-Härtung" benannte Phase explizit benannt werden sollten (siehe Warnings unten). Keine der gefundenen Probleme wird als BLOCKER eingestuft, weil sie entweder (a) bereits vor diesem Diff in abgeschwächter Form bestanden und durch den Diff strikt verbessert wurden, oder (b) einen zusätzlichen, außerhalb der Kontrolle dieses Tools liegenden Kompromittierungsschritt voraussetzen (z. B. Navigation des Spiel-Tabs).

## Warnings

### WR-01: `bcSend` hat keine strukturelle Sperre für EXEC vor dem Handshake — Kommentar ist irreführend

**File:** `items.js:6006-6009`
**Issue:** Der neue Kommentar `// Gezielte Origin sobald bekannt; '*' nur für den PING-Bootstrap nötig` behauptet, `'*'` werde nur für PING verwendet. Tatsächlich sendet `bcSend` **jede** Nachricht (auch `type:'EXEC'`) mit `_bcOrigin || '*'` — für PING ist das eine bewusste Ausnahme (Bootstrap), für alles andere ist es reiner Zufall, dass es aktuell nicht passiert: Es gibt keine Prüfung in `bcSend` selbst, die ein EXEC vor gelerntem `_bcOrigin` verhindert. Der Schutz besteht ausschließlich aus den `if (!_connected) return;`-Guards an den ca. 49 Aufrufstellen — und `_connected` wird erst gesetzt, nachdem `_bcOrigin` im selben Handler bereits gelernt wurde (`items.js:6058` vor `case 'PONG'` bei `items.js:6072`). Das ist im aktuellen Code korrekt verkettet, aber es ist eine implizite, über den ganzen 11k-Zeilen-File verteilte Invariante ohne zentrale Durchsetzung. Ein zukünftiger EXEC-Aufruf (z. B. ein neues Feature), der den `_connected`-Guard vergisst, würde beliebigen generierten Code mit `targetOrigin:'*'` an `window.opener` senden — d. h. an das Fenster, auf das `window.opener` *aktuell* zeigt, unabhängig davon, ob es noch die BC-Domain ist.
**Fix:**
```js
function bcSend(msg, silent) {
  try {
    const ok = !!window.opener && !window.opener.closed;
    if (!ok) { /* ... */ return false; }
    if (msg.type !== 'PING' && !_bcOrigin) {
      console.warn('[BCK-Popup] bcSend blockiert – kein Spiel-Origin gelernt:', msg.type);
      return false;
    }
    ...
    window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*');
```
Damit wird die Invariante zentral in `bcSend` erzwungen statt implizit über Aufrufer-Disziplin, und der Kommentar entspricht wieder der Realität.

### WR-02: Trust-on-first-use ohne Domain-Allowlist — gelernter `_bcOrigin` kann ein fremder Origin sein

**File:** `items.js:6043-6058`, `_bridgeSenderOk` (`items.js:5972-5976`)
**Issue:** `_bridgeSenderOk` verhindert Fremdfenster (prüft `ev.source === window.opener`), aber **nicht** einen fremden Origin *im selben* `window.opener`-Handle. Navigiert der Spiel-Tab (aus welchem Grund auch immer, z. B. ein Link/Redirect im BC-Chat) vor dem ersten echten Handshake zu einer fremden Seite, und postet diese Seite eine Nachricht im Format `{app:'BCKonfigurator', type:'PONG'}`, wird deren Origin dauerhaft als `_bcOrigin` gelernt (bis zum nächsten manuellen "🔄 Verbinden") — inklusive aller künftigen EXEC-Ziel-Origins. Das ist eine reale Verbesserung gegenüber vorher (früher wurde der Origin bei *jeder* Nachricht neu gelernt, jetzt nur einmalig), schließt die Lücke aber nicht vollständig, weil es keine Allowlist der bekannten BC-Domains gibt (dokumentiert als bewusster Trade-off wegen mehrerer BC-Mirror-Domains).
**Fix:** Falls die BC-Mirror-Domains ein gemeinsames Muster haben (z. B. Suffix `.bondageprojects.com` o. ä.), zusätzliche Plausibilitätsprüfung beim Lernen ergänzen:
```js
function _looksLikeBcOrigin(origin) {
  try { return /\.bondageprojects\.com$/i.test(new URL(origin).hostname); } catch { return false; }
}
if (!_bcOrigin && ev.origin && ev.origin !== 'null' && _looksLikeBcOrigin(ev.origin)) _bcOrigin = ev.origin;
```
Falls keine gemeinsame Domain existiert, den Trade-off zumindest explizit im Code dokumentieren (aktuell nur implizit über den TOFU-Kommentar) und in Betracht ziehen, den gelernten Origin beim ersten Mal sichtbar in der UI anzuzeigen, damit der Nutzer eine offensichtliche Fehlverbindung bemerkt.

### WR-03: `TOOL_ORIGIN` wird an 18 Stellen unescaped in generierten Code eingebettet

**File:** `items.js` (17 Stellen, z. B. `items.js:2548`, `items.js:2726`, `items.js:5318-5321`), `bot-ui.js:1023`
**Issue:** Alle 18 Stellen bauen den Zielstring per roher Konkatenation `'"' + TOOL_ORIGIN + '"'` bzw. `"'" + TOOL_ORIGIN + "'"` in Code, der später im Spiel-Tab ausgeführt wird. `bot-engine.js` macht dasselbe an vergleichbarer Stelle korrekt mit `JSON.stringify(TOOL_ORIGIN)` (sauber escaped, ein zentrales `const _TOOL_ORIGIN=...`). Da `TOOL_ORIGIN = window.location.origin` im Tool-Fenster berechnet wird, ist der Wert praktisch nie ein String mit `"`/`'`/`\` — das Risiko einer echten Code-Injection ist damit sehr gering. Es ist aber inkonsistent mit der eigenen Absicherung in `bot-engine.js` und mit der Projektkonvention aus `CLAUDE.md` ("NEVER use JSON.stringify for onclick values" gilt für Attribute — hier geht es um Code-Injection in Template-Strings, wo laut Projektkonvention gerade *keine* rohe Konkatenation ohne Escaping-Funktion verwendet werden soll).
**Fix:** Einheitlich `JSON.stringify(TOOL_ORIGIN)` verwenden, z. B.:
```js
+ '    ...},' + JSON.stringify(TOOL_ORIGIN) + ');'
```
statt
```js
+ '    ...},"' + TOOL_ORIGIN + '");'
```
Das entfernt die Abhängigkeit von der Annahme "Origin-Strings enthalten nie Anführungszeichen" und macht alle Stellen konsistent mit `bot-engine.js`.

### WR-04: Loader-seitiges Source-Pinning lässt sich von jedem Sender mit demselben Origin per PING kapern

**File:** `loader.js:836-847`
**Issue:** Der Origin-Check (`ev.origin !== ALLOWED_ORIGIN`) läuft für **alle** Nachrichtentypen, auch PING — das ist korrekt. Das Source-Pinning danach lässt aber jede Nachricht vom Typ `PING`, unabhängig von `ev.source`, `window.__BCK_popupRef` überschreiben:
```js
if (window.__BCK_popupRef && src !== window.__BCK_popupRef && ev.data.type !== 'PING') { ...; return; }
window.__BCK_popupRef = src;
```
Das ist explizit so gedacht für "Tool-Fenster neu geladen" (neues Fenster-Objekt nach Schließen+Neuöffnen). Es bedeutet aber auch: Öffnet der Nutzer (versehentlich oder bewusst) ein zweites Tool-Fenster vom selben Origin, sendet dessen `startPingRetry()` alle 3 s einen PING — und kapert damit `__BCK_popupRef` vom ersten, aktiv verbundenen Tool-Fenster, ohne dass Letzteres davon erfährt. Alle folgenden `EXEC_OK`/`CURSE_DATA`/`BOT_LOG`-Antworten würden dann an das *zweite* Fenster gehen, während das erste weiterhin "Verbunden" anzeigt (bis der 15s-Heartbeat-Timeout im ersten Fenster anschlägt). Das ist kein Fremd-Origin-Angriff, aber eine reale Robustheitslücke innerhalb des eigenen Trust-Bereichs, die zu verwirrendem Verhalten und im schlimmsten Fall zu fehlgeleiteten Bot-Kontrollnachrichten führen kann.
**Fix:** Minimal: PING-Ausnahme nur greifen lassen, wenn der aktuell gepinnte Ref bereits "tot" ist (z. B. `window.__BCK_popupRef?.closed`), oder ein Session-Token beim ersten Handshake vergeben und bei PING mitschicken, damit ein Re-Pin nur mit passendem Token erfolgt.

### WR-05: `loader-origin.test.js` prüft die Pinning-Logik nur statisch (Text/Regex), nie zur Laufzeit

**File:** `tests/loader-origin.test.js`
**Issue:** Alle vier Tests in dieser Datei lesen `loader.js` als reinen Text und prüfen Zeilenreihenfolge/Vorkommen-Anzahl (`iSrc < iGuard < iPin`, Anzahl `ALLOWED_ORIGIN`-Vorkommen etc.). Keiner davon lädt `loader.js` in eine VM/JSDOM-Sandbox und simuliert tatsächlich zwei unterschiedliche `ev.source`-Werte, um zu verifizieren, dass der Guard tatsächlich blockiert bzw. durchlässt. Eine Logikumkehr (z. B. `!==` zu `===`, oder Entfernen der Bedingung `ev.data.type !== 'PING'`) würde von keinem der vier Tests erkannt, solange die Textbausteine an sich noch vorhanden sind (z. B. würde `if (window.__BCK_popupRef && src === window.__BCK_popupRef && ...)` — invertierter Bug — weiterhin alle vier Assertions erfüllen, weil sie nur Zeilenreihenfolge und Stringvorkommen prüfen, nicht das tatsächliche Verhalten). Der Kommentar im Testfile benennt das selbst als bewusste Einschränkung ("Rein statisch, weil eine vollständige loader.js-Sandbox erst Phase 5 kommt") — das ist nachvollziehbar, aber für eine sicherheitskritische Kontrolle in einer Härtungs-Phase ein Test-Coverage-Risiko, das im REVIEW festgehalten werden sollte, nicht nur im Testkommentar.
**Fix:** Sobald eine loader.js-Sandbox verfügbar ist (laut Kommentar Phase 5), diese vier Tests um mindestens einen Verhaltenstest ergänzen: zwei unterschiedliche `source`-Stubs simulieren, prüfen dass die zweite Quelle nach dem ersten Pin abgewiesen wird (außer bei PING), und dass `window.__BCK_popupRef` tatsächlich nicht überschrieben wird.

## Info

### IN-01: Debounced Auto-Save-Pfad wird in `exec-log.test.js` nie tatsächlich ausgeführt

**File:** `tests/exec-log.test.js`, `items.js:5946-5947`
**Issue:** Die Sandbox wird mit `setTimeout: () => 0` gebootet — der Stub nimmt zwar `fn`/`ms` entgegen, ruft `fn` aber nie auf. Das bedeutet, `_debouncedSaveExecLog()` (intern per `_debounce(..., 1200)` auf `setTimeout` aufgebaut) feuert in keinem Test jemals von selbst; alle Persistenztests rufen stattdessen explizit `await ctx._saveExecLog()` auf, um den Schreibvorgang zu erzwingen. Der eigentliche Verkabelungspfad "EXEC → Append → Debounce → tatsächliches idbSet nach 1.2s" wird dadurch nie end-to-end getestet; ein Regressions-Bug in `_debounce` selbst oder in der Verdrahtung von `_execLogAppend` → `_debouncedSaveExecLog` würde nicht auffallen.
**Fix:** Optional einen zusätzlichen Test mit echtem (oder gefaktem, aber tatsächlich feuerndem) Timer ergänzen, der verifiziert, dass nach Ablauf der Debounce-Zeit ohne expliziten `_saveExecLog()`-Aufruf ein Eintrag in IDB landet.

### IN-02: `_heartbeatCheck` setzt `_bcOrigin` bei Verbindungsverlust nicht zurück

**File:** `items.js:5889-5897`
**Issue:** Nur `manualReconnect()` setzt `_bcOrigin = null`. Bei automatisch erkanntem Verbindungsverlust (`_heartbeatCheck`, 15s ohne Nachricht) bleibt `_bcOrigin` auf dem alten Wert stehen. Das ist laut Test "Origin-Wechsel ohne Reconnect bleibt gesperrt" so gewollt (Mirror-Wechsel erfordert bewusstes Reconnect), aber der Zusammenhang ist nur im Kommentar bei `manualReconnect` dokumentiert, nicht bei `_heartbeatCheck` selbst — für Leser, die nur die Heartbeat-Funktion sehen, ist nicht offensichtlich, warum dort kein Reset erfolgt.
**Fix:** Kurzer Kommentar bei `_heartbeatCheck` ergänzen, z. B. `// _bcOrigin bleibt bewusst erhalten – nur manualReconnect() vertraut nach Verbindungsverlust neu (STAB-07)`.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
