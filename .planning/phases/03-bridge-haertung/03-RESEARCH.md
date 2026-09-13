# Phase 3: Bridge-Härtung - Research

**Researched:** 2026-09-13
**Domain:** Cross-window `postMessage`-Bridge zwischen einem statischen Vanilla-JS-Tool (GitHub Pages) und einem via Bookmarklet injizierten Loader im Bondage-Club-Spiel-Tab; kein Framework, kein Build.
**Confidence:** HIGH (jede Kernaussage ist gegen den tatsächlichen Quellcode verifiziert, mit Zeilenangaben; keine externen Libraries im Spiel)

## Summary

Der wichtigste Befund dieser Recherche: **Phase 3 ist kein Greenfield-Hardening.** Ein erheblicher Teil von STAB-04/06/07 ist bereits implementiert und committet (nicht Teil des früheren uncommitteten WIP) — vermutlich aus einer früheren, informellen Sicherheitsrunde vor Beginn dieses Milestones. Konkret: `bcSend()` (`items.js:5916-5933`) sendet bereits gezielt an `_bcOrigin || '*'` statt hart an `'*'`; der Empfänger in `items.js` prüft bereits `ev.source !== window.opener` (`items.js:5967`); ein Heartbeat-Watchdog (`items.js:5875-5892`) erkennt Verbindungsverlust und ein `🔄 Verbinden`-Button (`index.html:2369`, `onclick="manualReconnect()"`) ist bereits im Topbar verdrahtet. Was **fehlt**, ist präziser als die Phasenbeschreibung suggeriert:

1. **STAB-04** ist für den Tool→Spiel-Direktversand faktisch erledigt bis auf zwei Bootstrap-PINGs (`items.js:5871`, `items.js:6776`), die zwangsläufig `'*'` verwenden müssen, weil vor dem ersten Handshake kein Origin bekannt ist — das ist eine dokumentierbare Ausnahme, kein Bug. Diese zwei Stellen duplizieren zudem die Opener-Lebendigkeits-Prüfung, die `bcSend` bereits kapselt; Konsolidierung auf `bcSend({type:'PING'}, true)` beseitigt die Duplikation strukturell.
2. **STAB-05** ist die eigentliche Wildcard-Arbeit dieser Phase: **36 Stellen** in **injiziertem Code** (17× `items.js`, 18× `bot-engine.js`, 1× `bot-ui.js`) — nicht die vom Prompt geschätzten ~25 — senden von der generierten Spiel-Code-Zeichenkette aus `window.__BCK_popupRef.postMessage({...}, "*")`. Diese Stellen sind über `.js`-Grep auf `postMessage(` in der Bridge-Sende-Richtung *nicht* sichtbar in `loader.js`, weil `loader.js` bereits vollständig auf `ALLOWED_ORIGIN` umgestellt ist (0 Wildcard-Treffer) — die Wildcards leben ausschließlich in Zeichenketten innerhalb von `items.js`/`bot-engine.js`/`bot-ui.js`, die zur Laufzeit im Spiel-Tab ausgewertet werden.
3. Der von CONCERNS.md vorgeschlagene Fix (`new URL(window.__BCK_popupRef.location).origin`) **funktioniert nicht** und darf nicht übernommen werden: `window.__BCK_popupRef` zeigt auf ein Fenster mit einer anderen Origin (Tool-Origin ≠ Spiel-Origin); das Lesen von `.location`-Eigenschaften eines Cross-Origin-Fensters wirft `SecurityError` [CITED: developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy]. Der richtige Fix: Der generierende Code läuft im Tool-eigenen Fenster (`items.js`/`bot-engine.js`), kennt seine eigene Origin also direkt über `window.location.origin` — dieser Wert wird als Literal in die zu injizierende Zeichenkette eingebettet, nicht zur Laufzeit im Spiel-Tab berechnet.
4. **STAB-06** deckt eine echte, bisher unbemerkte Asymmetrie auf: Die Tool-Seite prüft `ev.source`, aber **nicht** `ev.origin`; die Loader-Seite prüft `ev.origin` (`ALLOWED_ORIGIN`), aber **nicht** `ev.source` gegen eine gepinnte Referenz. Keine Seite prüft aktuell beides, wie es die Anforderung verlangt. Zusätzlich definiert `loader.js` den Origin-String zweimal unabhängig (`POPUP_URL` und `ALLOWED_ORIGIN` enthalten denselben Origin-Teilstring, ohne dass einer vom anderen abgeleitet ist) — ein Fall genau des Problems, das STAB-06 verbietet.
5. **STAB-08** (EXEC-Logging) profitiert enorm davon, dass `bcSend` eine echte `function`-Deklaration ist (kein `const`), also über alle Dateien hinweg als `window.bcSend` sichtbar ist [VERIFIED: items.js:5916 — `function bcSend(msg, silent) {`]. Sie ist der **einzige** Sendepfad für EXEC (≥40 Aufrufstellen über `items.js` und `bot-engine.js` verteilt) — Logging gehört **in `bcSend` selbst**, nicht an jede Aufrufstelle.
6. **TEST-07** deckt eine Lücke im bestehenden Test-Harness auf: `tests/helpers/loadScript.js`s Sandbox-Stub für `addEventListener`/`removeEventListener` ist aktuell ein reines No-op (`addEventListener() {}`) — ein in `items.js` registrierter `message`-Handler kann damit **nicht** angesprochen werden. Das muss vor den eigentlichen Bridge-Tests behoben werden (Wave-0-Gap, siehe unten).

**Primary recommendation:** Origin-Härtung als reine, additive Konsolidierung behandeln — nicht als Neubau. Ein `TOOL_ORIGIN`-Konstante (`window.location.origin`, je einmal in `items.js` und `bot-engine.js`) ersetzt alle 36 injizierten `"*"`-Literale; ein `_isValidBridgeSender(ev)`-Muster ergänzt die fehlende Prüfhälfte auf beiden Seiten; ein EXEC-Ringpuffer in `bcSend` selbst deckt STAB-08 ohne Änderung an einer der ≥40 Aufrufstellen ab; die Sandbox-Erweiterung in `tests/helpers/loadScript.js` ist Voraussetzung für TEST-07 und sollte als erste Task der Phase laufen.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| STAB-04 | Alle `postMessage`-Aufrufe vom Tool zum Spiel verwenden den beim Handshake gelernten Spiel-Origin statt `"*"` | `bcSend()` (`items.js:5916-5933`) nutzt bereits `_bcOrigin \|\| '*'`; nur 2 Bootstrap-PINGs (`items.js:5871`, `6776`) verbleiben als dokumentierte Ausnahme — siehe Pattern 1, Pitfall 2, Enumeration |
| STAB-05 | Alle `postMessage`-Aufrufe im injizierten Code (Bot-Engine-Generator, Watcher) zum Tool verwenden den statischen Tool-Origin statt `"*"` | 36 konkrete Fundstellen enumeriert (17× items.js, 18× bot-engine.js, 1× bot-ui.js); `TOOL_ORIGIN = window.location.origin`-Pattern statt des nicht funktionierenden CONCERNS.md-Vorschlags — siehe Pattern 1, Pitfall 1, Enumeration |
| STAB-06 | Beide Seiten der Bridge prüfen `event.origin` und `event.source` gegen eine einzige gemeinsame Origin-Konstante; keine zweite Definition des Origins im Code | Asymmetrie verifiziert (Tool prüft nur Source, Loader nur Origin); Fix-Entwurf für beide Seiten plus Ableitung von `ALLOWED_ORIGIN` aus `POPUP_URL` statt zweitem Literal — siehe Pattern 2, Code Examples |
| STAB-07 | Verliert das Tool die Verbindung, zeigt es das sichtbar an und bietet erneutes Verbinden an | `#connStatus`/`#reconnectBtn`/Heartbeat-Watchdog bereits implementiert und committet — Phase muss primär verifizieren + `manualReconnect()` um `_bcOrigin`-Reset ergänzen (siehe Assumption A3) — siehe State of the Art, Open Question 1 |
| STAB-08 | Jeder EXEC-Aufruf wird mit Zeitstempel und Kurzbeschreibung protokolliert und ist im Tool einsehbar | Einziger Sendepfad `bcSend` als Log-Hakenpunkt identifiziert (≥40 EXEC-Aufrufstellen müssen nicht angefasst werden); Ringpuffer+IDB-Design, UI-Vorbild aus Phase 2 (`📊 Speicher`) — siehe Pattern 3, EXEC-Aufrufstellen-Enumeration |
| TEST-07 | Das Bridge-Protokoll (Nachrichtentypen, Origin-Prüfung, Handler-Dispatch) ist mit simulierten Nachrichten getestet | Wave-0-Gap identifiziert: Sandbox-`addEventListener` ist No-op, muss zuerst erweitert werden; `loader.js`-Seite hat hohen Stub-Aufwand (Pitfall 4) — siehe Validation Architecture, Pitfall 3/4 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Origin-Lernen (Tool→Spiel) | Tool-Fenster (Browser/Client) | — | `_bcOrigin` ist Tool-lokaler State, gelernt aus `ev.origin` beim ersten validen Handshake |
| Origin-Prüfung eingehender Nachrichten (Tool-Seite) | Tool-Fenster (Browser/Client) | — | Läuft im `window.addEventListener('message', …)`-Handler in `items.js`, keine Server-Komponente vorhanden |
| Origin-Konstante (Spiel-Seite) | Injizierter Loader (Browser/Client, im Spiel-Tab) | — | `ALLOWED_ORIGIN` ist statisch, weil der Loader die eigene (Tool-)Gegenstelle nicht dynamisch lernen kann — er kennt sie nur, weil er vom Bookmarklet mit `POPUP_URL` gebaut wurde |
| Tool-Origin für injizierten Code | Tool-Fenster (Browser/Client) — zur Generierungszeit | Injizierter Code (läuft im Spiel-Tab, aber sendet zurück zum Tool) | `window.location.origin` wird im Tool-Fenster berechnet und als Literal in die Code-Zeichenkette eingebettet; der injizierte Code selbst berechnet nichts, er trägt nur das fertige Literal |
| EXEC-Log (Speicherung) | Tool-Fenster (Browser/Client) + IndexedDB | — | Kein Backend; Ringpuffer im RAM + Persistenz via bestehendes `idbGet`/`idbSet` (`items.js:1-65`) |
| EXEC-Log (Anzeige) | Tool-Fenster (Browser/Client, Tweaks-Panel) | — | Folgt dem in Phase 2 etablierten Muster (`📊 Speicher`-Sektion, `items.js` `_speicherZeigeStatus()`) |
| Verbindungsstatus-Anzeige | Tool-Fenster (Browser/Client, Topbar) | — | `#connStatus`-Badge + `#reconnectBtn` bereits vorhanden (`index.html:2365-2369`); Heartbeat-Logik in `items.js:5875-5892` |
| EXEC-Ausführung | Injizierter Loader (Browser/Client, im Spiel-Tab) | — | `new Function(_execCode)()` in `loader.js:1234`, einzige privilegierte Code-Ausführung im System |

## Standard Stack

Diese Phase installiert **keine** neuen Pakete — reine Härtung von bestehendem Vanilla-JS. Der Package-Legitimacy-Gate entfällt (kein `npm install`).

### Core
Kein neuer Code-Stack. Alle Änderungen nutzen vorhandene Browser-APIs:

| API | Zweck | Warum Standard |
|-----|-------|-----------------|
| `window.postMessage(msg, targetOrigin)` | Cross-Window-Nachrichten | Bereits im Einsatz, MDN-Standard [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/postMessage] |
| `window.location.origin` | Tool-eigene Origin zur Laufzeit ermitteln | Selbstaktualisierend — kein hartcodiertes Literal, das bei Domain-/Pfadwechsel nachgepflegt werden müsste (behebt Pitfall 8 für diese Richtung) |
| `MessageEvent.origin` / `MessageEvent.source` | Absenderprüfung beim Empfang | Einzige verlässliche Herkunftsinformation bei `postMessage` [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/postMessage] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.location.origin` zur Laufzeit im Tool berechnen | Hartcodierte `TOOL_ORIGIN`-Stringkonstante wie `ALLOWED_ORIGIN` in `loader.js` | Hartcodiert bräuchte manuelle Pflege bei Domain-/Pfadwechsel (Pitfall 8); `window.location.origin` ist immer korrekt, auch lokal (`http://localhost:…`) — kein Vorteil der hartcodierten Variante für diese Richtung |
| `new URL(popupRef.location).origin` (CONCERNS.md-Vorschlag) | — | **Verworfen**: wirft `SecurityError` bei Cross-Origin-Fenstern [CITED: developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy] — nicht funktionsfähig, siehe Pitfall unten |
| Ringpuffer + IDB für EXEC-Log | Nur IDB (kein RAM-Puffer) | Reiner IDB-Zugriff ist async und für ein Live-UI-Update pro EXEC zu langsam/umständlich; RAM-Ringpuffer + gedrosseltes IDB-Persistieren (wie bestehendes `_debounce`-Muster) ist konsistent mit Codebase-Konventionen |

**Installation:** Keine — reine Quelländerung, kein `npm install`.

## Package Legitimacy Audit

**Nicht anwendbar.** Diese Phase installiert keine externen Pakete (weder Produktions- noch Test-Dependencies). `package.json`/`tests/package.json` bleiben unverändert.

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Tool-Fenster (items.js, bot-ui.js, bot-engine.js — GitHub Pages)     │
│                                                                       │
│  bcSend(msg, silent)  ◄── ALLE ≥40 EXEC-Aufrufstellen + alle anderen │
│  │  window.opener.postMessage({app,...msg}, _bcOrigin || '*')       │  ← STAB-04: fast fertig,
│  │                                                                   │     nur Bootstrap-PING
│  │  [NEU] wenn msg.type==='EXEC': _execLogAppend(ts, desc, len)      │  ← STAB-08: einziger
│  ▼                                                                   │     Hakenpunkt
│  window.addEventListener('message', ev => {                         │
│    if (ev.data.app !== APP) return;                                 │
│    if (ev.source !== window.opener) return;   // ✓ vorhanden        │
│    [NEU] if (_bcOrigin && ev.origin !== _bcOrigin) return;           │  ← STAB-06: fehlende Hälfte
│    _bcOrigin = ev.origin;  // lernen beim Handshake                  │
│    switch(ev.data.type) { … }                                       │
│  })                                                                  │
│                                                                       │
│  [NEU] const TOOL_ORIGIN = window.location.origin;                  │  ← einmal pro Datei
│  bot-engine.js Template-Strings interpolieren TOOL_ORIGIN            │  ← STAB-05: 36 Stellen
│  statt "*" in generierten window.__BCK_popupRef.postMessage(...)     │
└──────────────────────────────┬────────────────────────────────────────┘
                                │ postMessage(msg, gelernter/statischer Origin)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ loader.js (injiziert per Bookmarklet in den Spiel-Tab)               │
│                                                                       │
│  const ALLOWED_ORIGIN = new URL(POPUP_URL).origin;  // [NEU] statt   │  ← STAB-06: zweite
│                                                       zweitem Literal │     Definition beseitigt
│  window.addEventListener('message', ev => {                          │
│    if (ev.data.app !== APP) return;                                  │
│    if (ev.origin !== ALLOWED_ORIGIN) return;   // ✓ vorhanden        │
│    [NEU] if (_popupRef && ev.source !== _popupRef                    │  ← STAB-06: fehlende
│              && ev.data.type !== 'PING') return;                     │     Hälfte
│    _popupRef = ev.source;  // pinnen beim Handshake (PING/PONG)      │
│    switch(ev.data.type) {                                            │
│      case 'EXEC': new Function(code)(); src.postMessage(EXEC_OK, …)  │
│      …                                                                │
│    }                                                                  │
│  });                                                                  │
│                                                                       │
│  Injizierter Bot-/Watcher-Code (aus bot-engine.js-Templates):         │
│    window.__BCK_popupRef.postMessage({...}, "<TOOL_ORIGIN-Literal>") │  ← STAB-05 Ziel-Zustand
└──────────────────────────────┬────────────────────────────────────────┘
                                │ liest/schreibt
                          BC-Spiel-Globals (Player, ChatRoom, Asset, …)
```

### Recommended Project Structure

Keine neuen Dateien in Produktion — `bridge.js`-Extraktion ist explizit Phase 4 (SPLIT-02), nicht Phase 3. Alle Änderungen bleiben in `items.js`, `bot-engine.js`, `bot-ui.js`, `loader.js`, `index.html` (nur Einfügung), plus ein neuer Test:

```
bc-universal-configurator/
├── items.js         # bcSend()-Erweiterung (EXEC-Log-Hook), Empfänger-Origin-Check, TOOL_ORIGIN-Konstante,
│                     #   Bootstrap-PING-Konsolidierung, 17 Injected-Code-Stellen, EXEC-Log-Anzeigefunktionen
├── bot-engine.js     # TOOL_ORIGIN-Konstante, 18 Injected-Code-Stellen
├── bot-ui.js         # 1 Injected-Code-Stelle
├── loader.js         # ALLOWED_ORIGIN aus POPUP_URL ableiten, Source-Pinning im Listener
├── index.html        # NUR Einfügung: EXEC-Log-Sektion im Tweaks-Panel (Vorbild: 📊 Speicher aus 02-03)
└── tests/
    ├── helpers/loadScript.js       # ERWEITERT: echte addEventListener/dispatch-Fähigkeit (Wave-0-Gap)
    ├── bridge-protocol.test.js     # NEU — TEST-07: Origin-Prüfung, Handler-Dispatch, Nachrichtentypen
    └── exec-log.test.js            # NEU — STAB-08: Ringpuffer, Formatierung, Persistenz
```

### Pattern 1: Origin lernen statt hartcodieren (Tool→Spiel), Origin fest verankern (Spiel→Tool)

**What:** Zwei grundsätzlich verschiedene Origin-Strategien für die zwei Bridge-Richtungen, weil die zwei Seiten unterschiedliche Informationen zur Verfügung haben:
- **Tool→Spiel:** Das Spiel läuft auf mehreren möglichen Domains (Kommentar in `items.js:5859`: „BC läuft auf mehreren Domains"), daher **kann** der Origin nicht hartcodiert werden. Er wird beim ersten validen Handshake gelernt (`_bcOrigin = ev.origin`, `items.js:5974`) und danach für alle Sends verwendet.
- **Spiel→Tool (direkt, `loader.js`) und Spiel→Tool (injizierter Code):** Das Tool läuft auf genau einer bekannten Origin (`window.location.origin` zur Generierungszeit im Tool-Fenster, oder statisch `ALLOWED_ORIGIN` im separat injizierten `loader.js`, das die Tool-Origin nicht selbst erfragen kann).

**When to use:** Bei jedem neuen Message-Typ in beide Richtungen. Nie eine Richtung mit der Strategie der anderen verwechseln — das ist exakt der Fehler, den der CONCERNS.md-Vorschlag macht (versucht, die Tool-Origin aus einer Cross-Origin-`location` zu lesen, obwohl sie im Tool selbst trivial verfügbar ist).

**Example:**
```javascript
// items.js — bereits vorhanden, Ziel-Zustand nach Konsolidierung (STAB-04):
const APP = 'BCKonfigurator';
const TOOL_ORIGIN = window.location.origin;   // NEU — für injizierten Code
let _bcOrigin = null;                          // bereits vorhanden — für Tool→Spiel

function bcSend(msg, silent) {                 // Quelle: items.js:5916 (unverändert in dieser Zeile)
  const ok = !!window.opener && !window.opener.closed;
  if (!ok) { /* … */ return false; }
  window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*'); // '*' NUR vor erstem Handshake
  return true;
}

// Bootstrap-PING konsolidiert statt dupliziert (ersetzt items.js:5871 und items.js:6776):
bcSend({ type: 'PING' }, true);
```

```javascript
// bot-engine.js — Ziel-Zustand für injizierten Code (STAB-05), ersetzt z.B. bot-engine.js:1837:
const TOOL_ORIGIN = window.location.origin;   // NEU, einmal am Dateianfang
// ... Template-String-Erzeugung im Tool-Fenster, TOOL_ORIGIN wird interpoliert:
'window.__BCK_popupRef?.postMessage({app:"BCKonfigurator",type:"BOT_LOG",entry},' + JSON.stringify(TOOL_ORIGIN) + ');'
// erzeugt im Spiel-Tab ausgeführten Code wie:
//   window.__BCK_popupRef?.postMessage({...}, "https://animereviewer1-sketch.github.io");
```

**Trade-offs:** `window.location.origin` im Tool-Fenster berechnet sich bei jedem Seitenaufruf neu — passt sich automatisch an lokale Entwicklung (`http://localhost:5500`) an, ohne einen `DEV_MODE`-Flag zu benötigen (löst Pitfall 8 für diese eine Richtung). Für die Spiel-Seite (`loader.js`) bleibt ein hartcodierter String zwingend nötig, weil `loader.js` nicht im Tool-Fenster läuft.

### Pattern 2: Zwei-Faktor-Absenderprüfung (Origin UND Source) auf beiden Seiten

**What:** STAB-06 verlangt, dass **beide** Seiten **beide** Eigenschaften prüfen. Aktueller Stand [VERIFIED: items.js:5960-5974, quote unten] und [VERIFIED: loader.js:836-846, quote unten] zeigt eine Asymmetrie:

- Tool-Seite (`items.js:5967`): `if (!window.opener || ev.source !== window.opener) { … return; }` — **nur Source**, kein `ev.origin`-Vergleich.
  ```
  5967	  if (!window.opener || ev.source !== window.opener) {
  ```
- Loader-Seite (`loader.js:840`): `if (ev.origin !== ALLOWED_ORIGIN) { … return; }` — **nur Origin**; `ev.source` wird direkt als neue `window.__BCK_popupRef` übernommen (`loader.js:845`), ohne gegen eine vorher gepinnte Referenz geprüft zu werden.
  ```
  840	      if (ev.origin !== ALLOWED_ORIGIN) {
  845	      window.__BCK_popupRef = src; // Bot kann damit Logs zurückschicken
  ```

**Fix-Entwurf:**
- Tool-Seite: Nach dem `ev.source !== window.opener`-Check zusätzlich `if (_bcOrigin && ev.origin !== _bcOrigin) { warn; return; }` **vor** dem Lernen/Überschreiben von `_bcOrigin`. Vor dem ersten Handshake ist `_bcOrigin` `null` → der erste Origin wird bedingungslos gelernt (Trust-on-first-use, konsistent mit dem bestehenden Kommentar in `items.js:5858-5860`).
- Loader-Seite: Eine modul-lokale `let _pinnedSource = null;` wird beim ersten `PING` gesetzt (`_pinnedSource = ev.source`) und bei jeder Nachricht außer `PING` geprüft: `if (_pinnedSource && ev.source !== _pinnedSource) { warn; return; }`. `PING` selbst darf immer eine neue Quelle pinnen, weil das der Punkt ist, an dem ein neu geladenes Tool-Fenster (Reload/neuer Tab) sich legitim neu verbindet.
- **Manuelles Reconnect muss `_bcOrigin` auf der Tool-Seite zurücksetzen**: `manualReconnect()` (`items.js:5904-5914`) setzt aktuell `_connected`/`_playerChecked`/`_playerAbgelehnt` zurück, aber **nicht** `_bcOrigin`. Wird `_bcOrigin` nach dem ersten Lernen dauerhaft erzwungen, muss ein manueller Reconnect es auf `null` zurücksetzen dürfen — sonst kann sich das Tool nach einem echten Domain-Wechsel des Spiels (BC-Mirror-Wechsel) nie wieder neu verbinden. **Dies ist eine Design-Entscheidung, die der Plan explizit treffen muss** (siehe Open Questions).

**When to use:** Genau diese zwei Stellen, keine Neuerfindung — STAB-06 ist ein Lückenschluss, keine neue Architektur.

**Trade-offs:** Härterer Check kann legitime Szenarien blockieren (BC-Mirror-Wechsel mitten in der Session, Tool-Fenster-Reload während laufender Verbindung). Der Heartbeat-Watchdog (bereits vorhanden, `items.js:5875-5892`) fängt den Fall ab: eine blockierte Nachricht führt einfach dazu, dass 15s lang keine Nachricht mehr ankommt → sichtbarer Verbindungsverlust → Nutzer klickt `🔄 Verbinden` → `manualReconnect()` (muss `_bcOrigin=null` setzen) → neuer Handshake lernt die neue Origin. Kein stiller Fehlschlag, aber ein zusätzlicher Klick in einem seltenen Fall.

### Pattern 3: Einziger Sendepfad als Log-Hakenpunkt (STAB-08)

**What:** `bcSend` ist eine `function`-Deklaration (kein `const`/`let`), dadurch echtes globales `window.bcSend`, erreichbar aus `bot-engine.js`, `bot-ui.js`, `shop.js` etc. [VERIFIED: items.js:5916 — `function bcSend(msg, silent) {`]. Alle ≥40 `bcSend({type:'EXEC', …})`-Aufrufe (siehe Enumeration unten) laufen durch exakt diese eine Funktion. Ein Log-Append direkt in `bcSend` erfasst jeden EXEC-Aufruf, ohne eine der Aufrufstellen anzufassen — minimales Risiko, keine Verhaltensänderung an 40+ Stellen.

**Example:**
```javascript
// items.js — Erweiterung von bcSend (Zeile 5916), Kurzbeschreibung ohne neue Parameter an Aufrufstellen:
const EXEC_LOG_KEY = 'BC_ExecLog_v1';
const EXEC_LOG_MAX = 200;               // Rotation, betrifft NUR das Log selbst, nie Scan-Daten
let _execLog = [];                       // RAM-Ringpuffer, mit IDB vorbelegt bei Start

function _execAutoDesc(code) {
  if (!code) return '(leer)';
  const m = /^\(function\(\)\{\s*(?:try\s*\{)?\s*(?:var |let |const )?(\w+)/.exec(code);
  return (m ? m[1] : code.slice(0, 40).replace(/\s+/g, ' ')) + '…';
}

function bcSend(msg, silent) {
  // … bestehende Guard-Klauseln unverändert …
  if (msg.type === 'EXEC') {
    _execLog.push({ ts: Date.now(), desc: msg.desc || _execAutoDesc(msg.code), len: (msg.code||'').length });
    if (_execLog.length > EXEC_LOG_MAX) _execLog.shift();
    _debouncedSaveExecLog();   // gleiches Debounce-Muster wie _debouncedSaveCurseDB (items.js:97)
  }
  window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*');
  return true;
}
```

**When to use:** Genau in `bcSend`, nirgendwo sonst. Keine Korrelation mit `EXEC_OK`/`EXEC_ERR` (siehe Scope-Entscheidung unten) — reines Senden-Log, wie von STAB-08 gefordert ("Zeitstempel und Kurzbeschreibung", nicht "Ergebnis").

**Trade-offs:** Ohne Korrelations-ID (siehe unten) zeigt das Log nicht, ob ein EXEC erfolgreich war — nur, dass es gesendet wurde. Das ist bewusst minimal und deckungsgleich mit dem Wortlaut von STAB-08.

### Anti-Patterns to Avoid

- **Cross-Origin-`location`-Lesen zur Origin-Ermittlung:** `new URL(window.__BCK_popupRef.location).origin` wirft `SecurityError`, sobald Tool- und Spiel-Origin unterschiedlich sind — das ist immer der Fall. Nicht übernehmen, obwohl in CONCERNS.md so vorgeschlagen.
- **Neue Korrelations-IDs für EXEC einführen, nur um STAB-08 "vollständiger" zu machen:** Erhöht Änderungsumfang an `loader.js`s EXEC-Handler (Rückgabe müsste die ID echoen) und an ≥40 Aufrufstellen. Nicht Teil der Anforderung — bewusst weglassen (siehe Scope-Grenze unten).
- **`_bcOrigin` beim ersten Handshake pinnen, aber `manualReconnect()` nicht anpassen:** Sperrt echtes Reconnect nach Origin-Wechsel dauerhaft aus. Beide Änderungen gehören in denselben Commit.
- **Bridge-Härtung mit `bridge.js`-Extraktion vermischen:** SPLIT-02 (Bridge-Extraktion in eigenes Modul) ist Phase 4. Diese Phase ändert Origin-/Source-Prüfung und Logging **an Ort und Stelle** in `items.js`/`loader.js`/`bot-engine.js`/`bot-ui.js` — keine Dateiverschiebung.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-Origin-Herkunftsprüfung | Eigene Origin-Parsing-Logik (String-Split auf `://`) | `MessageEvent.origin`/`MessageEvent.source`, `new URL(x).origin` | Browser-native, robust gegen Edge-Cases (Port, IDN, IPv6) |
| EXEC-Log-Persistenz | Eigenes Speicherformat / eigene Datei | Bestehendes `idbGet`/`idbSet` (`items.js:23-65`) mit neuem Key `BC_ExecLog_v1` | Konsistent mit allen anderen Keys (`BC_Money_v1`, `BC_CURSE_DB_v1`, …), Quota-Fehlerpfad bereits vorhanden |
| Verbindungsstatus-UI | Neue Statuskomponente | Bestehendes `#connStatus`-Badge + `#reconnectBtn` (bereits vorhanden) | Schon implementiert — nur verifizieren, nicht neu bauen |

**Key insight:** Der größte Fehler in dieser Phase wäre, Dinge neu zu bauen, die bereits existieren (Verbindungsstatus, Origin-Lernen, Ping-Retry). Die Recherche-Aufgabe hier ist in erster Linie **Bestandsaufnahme + gezielte Lückenschließung**, nicht Neubau.

## Common Pitfalls

### Pitfall 1: CONCERNS.md-Fix für STAB-05 ist nicht ausführbar (SecurityError)

**What goes wrong:** Der in `.planning/codebase/CONCERNS.md` (Zeile 142-145) vorgeschlagene Fix `new URL(window.__BCK_popupRef.location).origin` wird beim Ausführen im Spiel-Tab eine `SecurityError`-Exception werfen, weil `window.__BCK_popupRef` ein Cross-Origin-Fenster ist.
**Why it happens:** Same-Origin-Policy erlaubt bei Cross-Origin-Fensterreferenzen nur eine sehr eingeschränkte Untermenge von `Location`-Zugriffen (schreiben von `.href`, aber nicht lesen von `.href`/`.origin`/`.pathname`) [CITED: developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy].
**How to avoid:** Tool-Origin (`window.location.origin`) im **Tool-eigenen** Kontext berechnen (in `items.js`/`bot-engine.js`, die im Tool-Fenster laufen), als Literal in die generierte Code-Zeichenkette einbetten.
**Warning signs:** `Uncaught SecurityError: Blocked a frame with origin "…" from accessing a cross-origin frame.` in der Spiel-Tab-Konsole nach Ausführen von injiziertem Watcher-Code.
**Phase to address:** Bridge-Härtung (diese Phase) — direkt bei der STAB-05-Umsetzung vermeiden.

### Pitfall 2: Bootstrap-PING kann nicht origin-gepinnt werden

**What goes wrong:** Ein Versuch, STAB-04 zu 100% wörtlich umzusetzen ("alle" Tool→Spiel-Sends nutzen den gelernten Origin), scheitert am ersten PING — vor dem ersten Handshake gibt es keinen gelernten Origin.
**Why it happens:** Henne-Ei-Problem: Der Handshake selbst ist die erste Nachricht.
**How to avoid:** Diese zwei Stellen (`items.js:5871`, `items.js:6776`) explizit als dokumentierte Ausnahme behandeln, nicht als offenen Bug. Auf `bcSend({type:'PING'}, true)` konsolidieren, damit es nur noch **eine** Stelle mit dieser Ausnahme gibt statt drei duplizierten Prüfungen.
**Warning signs:** Ein Plan, der versucht, auch den Bootstrap-PING gegen einen Origin zu prüfen, den es zu diesem Zeitpunkt noch nicht geben kann — Zeichen für einen unausführbaren Task.
**Phase to address:** Bridge-Härtung — als bewusste, dokumentierte Ausnahme in die PLAN.md-Akzeptanzkriterien aufnehmen (z.B. "genau 2 verbleibende `'*'`-Direktsends, beide vor dem ersten PONG").

### Pitfall 3: Sandbox-`addEventListener` ist ein No-op — TEST-07 kann ohne Sandbox-Erweiterung nicht geschrieben werden

**What goes wrong:** `tests/helpers/loadScript.js`s `makeSandbox()` definiert `addEventListener() {}` als reinen No-op [VERIFIED: tests/helpers/loadScript.js:121 — `addEventListener() {},`]. Wird `items.js` (das intern `window.addEventListener('message', function(ev) {...})` aufruft, `items.js:5960`) in dieser Sandbox geladen, wird der Handler registriert-und-sofort-verworfen — es gibt keinen Weg, ihn später mit einem simulierten `MessageEvent` aufzurufen.
**Why it happens:** Die Sandbox wurde in Phase 1 für Lade-Reihenfolge- und Parser-Tests gebaut, nicht für Event-Dispatch-Tests — `message`-Handler-Tests waren damals außerhalb des Scopes.
**How to avoid:** `makeSandbox()` (oder ein neuer, dedizierter Sandbox-Wrapper für Bridge-Tests) muss `addEventListener`/`removeEventListener` so implementieren, dass registrierte Handler in einer Struktur (z.B. `sandbox._listeners[type] = […]`) gesammelt werden, und einen Weg bieten, sie mit einem synthetischen `{data, origin, source}`-Objekt aufzurufen.
**Warning signs:** Ein Test, der `loadScript(['items.js'])` aufruft und danach erwartet, dass irgendein simuliertes `postMessage`-Event etwas bewirkt — er wird grün sein, aber nichts wirklich geprüft haben (falsches Grün, ähnlich Pitfall 4 aus PITFALLS.md).
**Phase to address:** Bridge-Härtung, als **erste** Task vor den eigentlichen Origin-Fixes (siehe Wave 0 Gaps).

### Pitfall 4: `loader.js` hat massive Top-Level-Seiteneffekte — vollständiges Laden in vm-Sandbox ist teuer

**What goes wrong:** `loader.js` ist eine einzige große IIFE ohne Exportgrenze; am Dateiende (`loader.js:~1613-1634`) wird unbedingt `window.open(...)` aufgerufen (außer ein vorheriges `window.__BCK_WIN__` existiert bereits und ist nicht geschlossen), sowie `screen.width`/`screen.height` gelesen. Weiter oben laufen zusätzliche unbedingt ausgeführte Setups (z.B. ein Chat-Observer/`MutationObserver` und `ServerSocket.on('ChatRoomMessage', …)` im „CurseTestMonitor"-Abschnitt, `loader.js:~1585-1610`). Ein naives `loadScript(['loader.js'])` in der bestehenden Sandbox wirft `ReferenceError`/`TypeError`, weil `window.open`, `screen`, `MutationObserver`, `ServerSocket` dort nicht existieren.
**Why it happens:** `loader.js` ist für die Ausführung in einem echten Browser-Tab mit vollem BC-Window geschrieben, nicht für isolierte Tests — das war nie ein Ziel vor dieser Phase.
**How to avoid:** Für TEST-07s loader-seitigen Anteil (Origin+Source-Check im `message`-Listener) entweder (a) eine eigene, deutlich breitere Sandbox nur für `loader.js` bauen (Stubs für `window.open`, `screen`, `MutationObserver`, `ServerSocket.on/off`, wiederverwendbar für spätere Gamecode-Scan-Tests in Phase 5), oder (b) den Fokus von TEST-07 auf die Tool-Seite (`items.js`) legen, wo die Sandbox bereits funktioniert, und den `loader.js`-Anteil als optionalen Stretch-Task mit klar dokumentiertem Zusatzaufwand einplanen.
**Warning signs:** Ein Testlauf, der beim Laden von `loader.js` sofort mit `ReferenceError: screen is not defined` oder `TypeError: window.open is not a function` abbricht.
**Phase to address:** Bridge-Härtung — Aufwand explizit im Plan einpreisen, nicht stillschweigend überspringen (TEST-07 nennt "Origin-Prüfung" ausdrücklich, und die Loader-Seite ist die Hälfte davon).

### Pitfall 5: EXEC-Log-Rotation darf niemals Scan-Daten berühren

**What goes wrong:** Ein Ringpuffer mit Kapazitätsgrenze (z.B. 200 Einträge) ist per Definition eine Form von automatischem Löschen. Der Kernwert des Projekts ("gescannte Daten gehen nie verloren") bezieht sich auf Outfits/Screenshots/Bots — **nicht** auf Betriebs-Telemetrie wie das EXEC-Log. Eine unklare Formulierung im Plan könnte das verwischen.
**Why it happens:** "Nie automatisch löschen" ist eine griffige Regel, die ohne Kontext zu wörtlich auf jede neue Datenstruktur angewendet werden könnte.
**How to avoid:** Im Plan explizit dokumentieren: Das EXEC-Log ist Betriebs-Telemetrie (Diagnose/Audit), kein Scan-Datensatz — Kapazitätsbegrenzung (Rotation) ist hier zulässig und beabsichtigt, im Unterschied zu `LSCG_DB`/`PROFILE_SCREENSHOTS`/Bot-Definitionen.
**Warning signs:** Ein Reviewer, der die Rotation als Verstoß gegen die Datenschutz-Regel liest, weil der Unterschied nicht explizit gemacht wurde.
**Phase to address:** Bridge-Härtung — als eine Zeile in der PLAN.md-Begründung festhalten.

## Code Examples

### Origin-Ableitung ohne zweite Definition (loader.js, STAB-06)
```javascript
// Ersetzt die aktuell unabhängige zweite Definition:
//   loader.js:30  const POPUP_URL = 'https://animereviewer1-sketch.github.io/bc-configurator/';
//   loader.js:32  const ALLOWED_ORIGIN = 'https://animereviewer1-sketch.github.io';
const POPUP_URL = 'https://animereviewer1-sketch.github.io/bc-configurator/';
const ALLOWED_ORIGIN = new URL(POPUP_URL).origin;  // abgeleitet, nicht zweites Literal
```
Testbare Behauptung für einen Grep-basierten Check: `grep -c "animereviewer1-sketch.github.io" loader.js` sinkt von 2 auf 1 (nur noch in `POPUP_URL`).

### Simulierter Bridge-Test gegen den echten `items.js`-Handler (TEST-07, Konzept)
```javascript
// tests/bridge-protocol.test.js — Konzept, abhängig von der Sandbox-Erweiterung (Pitfall 3)
import { loadScript, evalIn } from './helpers/loadScript.js';

test('lehnt Nachrichten von falscher Origin ab, sobald _bcOrigin gelernt wurde', () => {
  const fakeOpener = { closed: false, postMessage: vi.fn() };
  const sandbox = loadScript(['items.js'], { opener: fakeOpener });
  // Erster (legitimer) Handshake lernt die Origin:
  sandbox._listeners.message[0]({ data: { app: 'BCKonfigurator', type: 'PONG' }, origin: 'https://bondage-europe.com', source: fakeOpener });
  // Zweite Nachricht von ANDERER Origin, gleiche source-Referenz (Spoofing-Versuch):
  sandbox._listeners.message[0]({ data: { app: 'BCKonfigurator', type: 'CACHE_DATA', cache: {} }, origin: 'https://evil.example', source: fakeOpener });
  // Erwartung: CACHE_DATA wird NICHT verarbeitet (z.B. CACHE bleibt leer)
});
```
Dieses Beispiel ist ein **Entwurf**, kein verifizierter, lauffähiger Test — die tatsächliche Assertion hängt von der finalen Sandbox-API ab, die der Plan festlegt.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `postMessage(msg, '*')` bei Tool→Spiel-Direktsends | `postMessage(msg, _bcOrigin \|\| '*')` in `bcSend` | Bereits vor Phasenbeginn (Commit-Historie zeigt `82a9daa "Big Update"`) | STAB-04 zu ~90% bereits erledigt — Phase muss das nur noch verifizieren + Bootstrap-Ausnahme dokumentieren + konsolidieren |
| Kein Verbindungsstatus sichtbar | `#connStatus`-Badge + Heartbeat-Watchdog + `#reconnectBtn` | Bereits vor Phasenbeginn | STAB-07 ist bereits weitgehend erledigt — Phase muss primär verifizieren (Live-Smoke-Test) und ggf. Origin-Reset bei Reconnect ergänzen |

**Deprecated/outdated:**
- CONCERNS.md-Zeilenangaben (2507, 2509, 2685, 2694, 2698) sind **stale** — der Datei-Stand hat sich seit der Codebase-Analyse (2026-09-11) durch Phase-1/2-Arbeit verschoben. Die tatsächlichen Wildcard-Stellen in `items.js` liegen heute bei 2548, 2550, 2726, 2735-2739, 5317-5321, 7686, 7763-7765, 7872, 7933-7935, 8015-8022, 10024-10026 (siehe Enumeration unten). Der Plan darf sich nicht auf die alten Zeilennummern verlassen — jede Task muss mit einem frischen Grep beginnen.

## Enumeration: Alle `postMessage(`-Aufrufstellen

> Vollständig gegrept am 2026-09-13 gegen den aktuellen Arbeitsbaum (HEAD `c3cda19`). `bot-data.js`, `outfit-import.js`, `bc-autobackup.js`, `index.html` enthalten **keine** `postMessage(`-Aufrufe (0 Treffer, verifiziert).

### `loader.js` — bereits vollständig origin-gepinnt (0 Wildcards)

Alle direkten `src.postMessage(…, ALLOWED_ORIGIN)`-Aufrufe sind bereits korrekt: `loader.js:851, 884, 891, 897, 905, 907, 1006, 1015, 1039, 1044, 1060, 1063, 1118, 1120, 1128, 1138, 1140, 1220, 1223, 1236, 1247, 1267, 1282, 1301, 1303, 1307, 1324, 1327, 1345, 1348, 1475, 1524` — Richtung: Spiel→Tool. **Kein Task-Bedarf für STAB-05 in dieser Datei.**

### `items.js` — Direktsends (Tool→Spiel, `window.opener.postMessage`)

| Zeile | Kontext | Ziel-Origin | Status |
|-------|---------|-------------|--------|
| 5871 | `startPingRetry()` — periodischer Retry-PING | `'*'` | Ausnahme: vor Handshake, kein Origin bekannt (Pitfall 2) |
| 5926 | `bcSend()` — Haupt-Sendepfad, alle anderen Nachrichten | `_bcOrigin \|\| '*'` | Bereits korrekt (Fallback nur vor Handshake) |
| 6776 | Start-IIFE — allererster PING beim Laden | `'*'` | Ausnahme: identisch zu 5871, Kandidat für Konsolidierung |

### `items.js` — Injizierter Code (Spiel→Tool, `window.__BCK_popupRef.postMessage`, 17 Stellen mit `"*"`)

`2548, 2550, 2726, 2735-2739 (Block), 5317-5321 (Block), 7686, 7763-7765 (Block), 7872, 7933-7935 (Block), 8015-8019 (Block), 8021-8022 (Block), 10024, 10026`

### `bot-engine.js` — Injizierter Code (18 Stellen mit `'*'`)

`216, 469, 1548-1549 (Block), 1564-1565 (Block), 1605, 1837, 1844, 2167-2168 (Block), 2173-2176 (Block), 2273-2274 (Block), 2288-2291 (Block), 2388, 2397, 2615, 2617, 3065-3066 (Block), 3099-3100 (Block), 3139`

### `bot-ui.js` — Injizierter Code (1 Stelle mit `'*'`)

`1023`

**Gesamtsumme STAB-05-Ziel:** 17 + 18 + 1 = **36 Stellen**, alle im Muster `window.__BCK_popupRef?.postMessage({...}, '*')` oder `window.__BCK_popupRef&&window.__BCK_popupRef.postMessage({...},'*')`, alle Teil von Template-Strings, die als Code in den Spiel-Tab injiziert werden.

## EXEC-Aufrufstellen (für STAB-08-Kontext, nicht alle müssen geändert werden)

`bcSend({type:'EXEC', …})` erscheint **≥35× in `items.js`** (u.a. Zeilen 2555, 2580, 2655, 2744, 3101, 3104, 3114, 4034, 5160, 5324, 5344, 5396, 5411, 5581, 6025, 6187, 6339, 6348, 7791, 7957, 8026, 8128, 8160, 8408, 9090, 9130, 9157, 9235, 9766, 9790, 9795, 9800, 9990, 10111, 10132, 10135, 10138, 10142, 10527, 11262, 11366, 11718, 11736) und **5× in `bot-engine.js`** (3252, 3298, 3313, 3341, 3348). Der loader-seitige Handler ist ein einziger `case 'EXEC':`-Block, `loader.js:1228-1250`, der `new Function(_execCode)()` ausführt und blind `EXEC_OK`/`EXEC_ERR` ohne Korrelations-ID zurücksendet.

**Design-Konsequenz:** Keine dieser ≥40 Aufrufstellen muss für STAB-08 geändert werden — das Logging gehört ausschließlich in `bcSend` (Pattern 3 oben).

## Runtime State Inventory

> Diese Phase ist keine Rename-/Rebrand-Phase — kein Kategorie-Audit nötig. Die einzige neue Persistenz ist der EXEC-Log-Key `BC_ExecLog_v1` (additiv, neuer Key, keine Migration bestehender Daten nötig).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Ein RAM-Ringpuffer (Cap 200) + gedrosseltes IDB-Persistieren ist die richtige Balance für STAB-08 — nicht explizit im Requirement vorgegeben | Pattern 3, Code Examples | Falls der Nutzer eine unbegrenzte/andere Kapazität erwartet, muss die Zahl im Plan diskutiert/angepasst werden |
| A2 | Trust-on-first-use (Origin/Source beim ersten Handshake lernen, danach erzwingen) ist die richtige STAB-06-Strategie, nicht ein hartcodierter Origin-Allowlist mit mehreren bekannten BC-Mirror-Domains | Pattern 2 | Falls es eine dokumentierte, endliche Liste bekannter BC-Domains gibt (nicht im Repo gefunden), wäre eine Allowlist robuster als Trust-on-first-use — muss in Discuss-Phase geklärt werden |
| A3 | `manualReconnect()` muss `_bcOrigin = null` setzen, sobald Origin nach dem ersten Handshake erzwungen wird | Pattern 2 | Ohne diese Ergänzung könnte ein echter Mirror-Wechsel das Tool dauerhaft aussperren — Risiko: Verbindungsverlust ohne Recovery-Pfad |
| A4 | `_execAutoDesc()`s Heuristik (erster erkannter Funktions-/Bezeichnername via Regex, sonst Code-Präfix) liefert eine für den Nutzer brauchbare "Kurzbeschreibung" ohne die ≥40 Aufrufstellen um ein `desc`-Feld zu erweitern | Pattern 3 | Falls die automatische Beschreibung zu kryptisch ist, könnte der Nutzer lesbare Labels an den wichtigsten Aufrufstellen (z.B. "Outfit anwenden", "Screenshot") nachrüsten wollen — optionaler Folge-Task, kein Blocker für STAB-08 selbst |

**Risiko-Einordnung:** Alle vier Annahmen sind mittel-niedrig — keine betrifft Compliance/Datenschutz/Kryptografie. A2/A3 sollten vor der Planung kurz mit dem Nutzer bestätigt werden, da sie das Verhalten bei seltenen, aber für den Alleinnutzer real möglichen Szenarien (Mirror-Wechsel) festlegen.

## Open Questions

1. **Soll `_bcOrigin` nach dem ersten Handshake strikt erzwungen werden, oder bleibt "lernen bei jeder Nachricht" (aktuelles Verhalten) bestehen?**
   - What we know: Der Kommentar in `items.js:5858-5860` sagt ausdrücklich, dass BC auf mehreren Domains läuft, und dass das Origin-Lernen genau deshalb existiert (nicht als Härtung, sondern als Nötigkeit).
   - What's unclear: Ob "lernen bei jeder Nachricht" (aktuell: `_bcOrigin` wird bei **jeder** eingehenden Nachricht überschrieben, `items.js:5974`, ohne vorherigen Abgleich) für STAB-06 als "Prüfung gegen eine Konstante" ausreicht, oder ob eine strikte Erzwingung ab dem zweiten Handshake nötig ist.
   - Recommendation: Trust-on-first-use mit Erzwingung ab der zweiten Nachricht (Pattern 2) — schließt die Lücke, ohne den Multi-Domain-Anwendungsfall zu brechen, solange `manualReconnect()` das Origin-Reset übernimmt (A3).

2. **Ist der Aufwand für eine `loader.js`-Sandbox (Pitfall 4) in dieser Phase gerechtfertigt, oder wird TEST-07 bewusst auf die Tool-Seite beschränkt?**
   - What we know: Die Tool-Seite ist mit der bestehenden Sandbox (nach Erweiterung, Pitfall 3) günstig testbar. Die Loader-Seite braucht einen deutlich breiteren Stub-Aufwand.
   - What's unclear: Ob der Mehraufwand jetzt investiert wird (zahlt auf Phase 5s Gamecode-Scan-Tests ein, die ohnehin eine `loader.js`-Sandbox brauchen werden) oder verschoben wird.
   - Recommendation: Im Plan als zwei getrennte, priorisierbare Tasks führen (Tool-Seite = Muss, Loader-Seite = Soll mit explizit dokumentiertem Mehraufwand), damit ein Scope-Cut nicht stillschweigend passiert.

## Environment Availability

> Keine externen Abhängigkeiten außer dem bereits vorhandenen Test-Stack. Kein neues Tool nötig.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | TEST-07, STAB-08-Tests | ✓ | 5.0.0 (aus `package.json`) | — |
| fake-indexeddb | EXEC-Log-Persistenztests | ✓ | 6.2.5 (aus `package.json`) | — |
| Echter Browser + Bookmarklet + laufendes BC-Spiel | Live-Smoke-Test (Cache, EXEC, Screenshot, Raum-Scan) | Nur durch den Nutzer prüfbar | — | Kein Fallback — als `checkpoint:human-verify` am Phasenende einplanen (siehe PROJECT.md Blocker „Nach Origin-Pinning Live-Smoke-Test nötig") |

**Missing dependencies with no fallback:**
- Live-Browser-Smoke-Test aller vier Bridge-Flows — nur der Nutzer kann das im echten Spiel verifizieren (bereits in STATE.md als Blocker vermerkt).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.0 |
| Config file | `vitest.config.js` (environment: node, setupFiles: `tests/setup/fake-indexeddb.js`) |
| Quick run command | `npx vitest run tests/bridge-protocol.test.js tests/exec-log.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-04 | `bcSend()` nutzt `_bcOrigin` statt `'*'`, außer bei den zwei dokumentierten Bootstrap-Ausnahmen | unit | `npx vitest run tests/bridge-protocol.test.js -t "bcSend nutzt gelernten Origin"` | ❌ Wave 0 |
| STAB-05 | Generierte injizierte Code-Strings enthalten `TOOL_ORIGIN`-Literal statt `"*"` | unit | `npx vitest run tests/bridge-protocol.test.js -t "injizierter Code nutzt Tool-Origin"` | ❌ Wave 0 |
| STAB-06 | Tool-Seite lehnt Nachrichten mit falscher `ev.origin` ab (nach Handshake); Loader-Seite lehnt Nachrichten mit falscher `ev.source` ab (nach Handshake) | unit | `npx vitest run tests/bridge-protocol.test.js -t "Origin-Source-Doppelpruefung"` | ❌ Wave 0 |
| STAB-07 | `#connStatus`/`#reconnectBtn` bereits vorhanden — Test verifiziert Heartbeat-Timeout setzt `dataset.conn='off'` | unit | `npx vitest run tests/bridge-protocol.test.js -t "Heartbeat setzt Verbindungsstatus"` | ❌ Wave 0 (Funktion existiert, Test fehlt) |
| STAB-07 | Live-Smoke: Tool zeigt sichtbaren Disconnect + erfolgreiches Reconnect im echten Browser | manual | — (Browser + BC-Tab) | human_judgment |
| STAB-08 | `bcSend({type:'EXEC',…})` erzeugt einen Log-Eintrag mit `ts`+`desc`; Rotation bei >200 Einträgen; Persistenz unter `BC_ExecLog_v1` | unit | `npx vitest run tests/exec-log.test.js` | ❌ Wave 0 |
| TEST-07 | Nachrichtentypen, Origin-Prüfung, Handler-Dispatch mit simulierten Nachrichten getestet (Tool-Seite mindestens, Loader-Seite falls Aufwand vertretbar) | unit | `npx vitest run tests/bridge-protocol.test.js` | ❌ Wave 0 |
| — | Live-Smoke: Cache-Load, EXEC, Screenshot, Raum-Scan funktionieren nach allen Origin-Änderungen weiterhin | manual | — (Browser + BC-Tab) | human_judgment (bereits als Blocker in STATE.md vermerkt) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/bridge-protocol.test.js tests/exec-log.test.js`
- **Per wave merge:** `npm test` (volle Suite, aktuell 10 Testdateien / 97 passed + 2 expected fail vor dieser Phase)
- **Phase gate:** Volle Suite grün + Live-Smoke-Test (Cache/EXEC/Screenshot/Raum-Scan) vor `/gsd-verify-work`, da dies laut STATE.md-Blocker explizit nur der Nutzer im echten Spiel prüfen kann

### Wave 0 Gaps
- [ ] `tests/helpers/loadScript.js` — `makeSandbox()` braucht eine echte `addEventListener`/`removeEventListener`-Implementierung (Listener-Sammlung + Dispatch-Fähigkeit), sonst ist kein `message`-Handler-Test möglich (Pitfall 3). **Dies ist der einzige Wave-0-Task mit Abhängigkeit für alle anderen TEST-07-Tests — zuerst einplanen.**
- [ ] `tests/bridge-protocol.test.js` — neu, deckt STAB-04/05/06/07(Heartbeat)/TEST-07
- [ ] `tests/exec-log.test.js` — neu, deckt STAB-08
- [ ] Optional: dedizierte, breitere Sandbox für `loader.js` (Stubs: `window.open`, `screen`, `MutationObserver`, `ServerSocket.on/off`) — nur falls der Plan sich für den Loader-seitigen TEST-07-Anteil entscheidet (Open Question 2); zahlt auf Phase 5 (Gamecode-Scan) ein, falls investiert.

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Nein | Kein Login/Auth-System — Member-Number-basierte Identifikation ohne Credentials (INTEGRATIONS.md) |
| V3 Session Management | Teilweise | `_bcOrigin`/gepinnte `ev.source`-Referenz sind faktisch die "Session" der Bridge — Origin/Source-Doppelprüfung (Pattern 2) ist die einschlägige Kontrolle |
| V4 Access Control | Ja | EXEC ist eine privilegierte Operation, nur für die same-origin-Gegenstelle zulässig — bereits durch `ALLOWED_ORIGIN`-Check in `loader.js:840` kontrolliert, hier verstärkt um Source-Pinning |
| V5 Input Validation | Teilweise | `ev.data.app === APP`-Typprüfung bereits vorhanden auf beiden Seiten; kein strukturiertes Schema für `ev.data.type`/Payload (out of scope für diese Phase) |
| V6 Cryptography | Nein | Keine Kryptografie im System — keine Secrets, keine Tokens |
| V14 Configuration | Ja | `ALLOWED_ORIGIN`/`POPUP_URL`-Ableitung (Pattern: eine Quelle statt zwei) ist eine Konfigurationshärtung |

### Known Threat Patterns for postMessage-Bridge

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Wildcard-`postMessage`-Ziel erlaubt Abfangen durch Drittfenster | Information Disclosure | Origin-spezifisches Ziel statt `'*'` (STAB-04/05, Pattern 1) [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/postMessage — "always specify an exact target origin"] |
| Nur `ev.origin` ODER nur `ev.source` geprüft, nie beide | Spoofing | Doppelprüfung Origin+Source (STAB-06, Pattern 2) |
| `new Function()`-Ausführung von EXEC-Payload ohne Audit-Trail | Repudiation | EXEC-Log mit Zeitstempel+Beschreibung (STAB-08, Pattern 3) — macht einen Origin-Check-Bypass nachträglich sichtbar, selbst wenn der Check selbst einen Fehler hätte |
| Stiller Verbindungsverlust (`window.opener` wird `null`) ohne Nutzer-Feedback | Denial of Service (aus Nutzersicht) | Heartbeat-Watchdog + sichtbarer Status + Reconnect-Button (STAB-07, bereits vorhanden — diese Phase verifiziert nur) |
| Zwei unabhängige Origin-String-Definitionen driften auseinander | Tampering (durch Fehlkonfiguration) | Eine Quelle, davon abgeleitet (STAB-06 — `ALLOWED_ORIGIN = new URL(POPUP_URL).origin`) |

## Sources

### Primary (HIGH confidence)
- `items.js` (dieses Repo, gelesen 2026-09-13) — `bcSend`, Origin-Lernen, Heartbeat, Message-Handler, alle Zeilenangaben in diesem Dokument sind direkt gegrept/gelesen
- `loader.js` (dieses Repo, gelesen 2026-09-13) — `ALLOWED_ORIGIN`, `POPUP_URL`, EXEC-Handler, Message-Listener
- `bot-engine.js`, `bot-ui.js` (dieses Repo, gegrept 2026-09-13) — injizierte-Code-Wildcard-Enumeration
- `tests/helpers/loadScript.js` (dieses Repo, gelesen 2026-09-13) — Sandbox-Grenzen, Basis für Wave-0-Gap
- `.planning/phases/01-testfundament/01-02-SUMMARY.md`, `.planning/phases/02-speicher-sicherheit/02-03-SUMMARY.md` (dieses Repo) — etablierte Test-/UI-Muster
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/PROJECT.md` (dieses Repo) — Scope, Constraints, offene Blocker

### Secondary (MEDIUM confidence)
- [Window: postMessage() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) — Best-Practice "always specify an exact target origin", API-Semantik von `origin`/`source`
- [Same-origin policy — MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) — Cross-Origin-`Location`-Zugriffsbeschränkung (Grundlage für Pitfall 1)

### Tertiary (LOW confidence)
- `.planning/codebase/CONCERNS.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` — wertvoller Kontext, aber mit **stale Zeilenangaben** (Stand 2026-09-11/12, vor Phase 1/2); in diesem Dokument nur als Ausgangshypothese verwendet, jede konkrete Zeilenangabe wurde gegen den aktuellen Stand neu verifiziert

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Pakete, reine Browser-API-Nutzung, gegen MDN verifiziert
- Architecture: HIGH — jede Codestelle in dieser Recherche wurde mit `Read`/`Grep` gegen den aktuellen Arbeitsbaum gelesen, nicht aus den älteren `.planning/research/`-Dokumenten übernommen
- Pitfalls: HIGH für Pitfall 1 (MDN-verifiziert) und 2-3 (Code-verifiziert); MEDIUM für Pitfall 4 (Einschätzung des Sandbox-Aufwands ohne tatsächlichen Testlauf)

**Research date:** 2026-09-13
**Valid until:** Bis zum nächsten Commit, der `items.js`/`loader.js`/`bot-engine.js`/`bot-ui.js` verändert — Zeilenangaben in diesem Dokument sind an den Commit `c3cda19` gebunden und veralten bei jeder weiteren Änderung an diesen Dateien (siehe "State of the Art"-Hinweis zu stale CONCERNS.md-Zeilen als Warnung).

---
*Phase: 03-bridge-haertung*
*Researched: 2026-09-13*
