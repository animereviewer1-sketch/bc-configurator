// ══════════════════════════════════════════════════════
//  bridge.js — postMessage-Protokoll zum Spiel-Tab (SPLIT-02)
// ══════════════════════════════════════════════════════
// Wörtlich aus items.js verschoben (Stand Plan 04-02): APP, Ping-Retry,
// Heartbeat, Spieler-Check-Zustand, _bridgeSenderOk, manualReconnect, bcSend,
// message-Listener. Neu: Handler-Registry onBridgeMessage/offBridgeMessage.
// Lädt NACH persistence.js und VOR items.js (docs/LOAD-ORDER.md).
// Einzige Vertrauensgrenze des Tools: Origin-/Source-Prüfung (Phase 3) liegt
// hier. Registrieren können nur Skripte dieser Seite (same-origin, klassischer
// Script-Scope) — T-4-03. Ein werfender Handler bricht wie bisher den
// Listener ab (kein try/catch, verbatim-Semantik).
// Zur Laufzeit erwartete items.js-Globals: showStatus, stopRoomScan,
// _execLogAppend (geguardet), _botRueckschreibStart (geguardet).
const APP = 'BCKonfigurator';

// ── Ping-Retry ────────────────────────────────────────
let _pingInterval = null;
let _connected    = false;
// Echte BC-Origin – wird beim ersten empfangenen Message vom Opener gelernt.
// Danach sendet bcSend gezielt dorthin statt an '*' (kein Daten-Leak, falls
// der Opener zwischenzeitlich auf eine fremde Seite navigiert wurde).
let _bcOrigin     = null;

function startPingRetry() {
  if (_pingInterval) clearInterval(_pingInterval);
  let n = 0;
  _pingInterval = setInterval(function() {
    if (_connected) { clearInterval(_pingInterval); _pingInterval = null; return; }
    n++;
    const ok = !!window.opener && !window.opener.closed;
    console.log('[BCK-Popup] Ping-Retry #' + n + ' | opener=' + ok);
    // STAB-04-Ausnahme: Bootstrap-PING vor dem Handshake — Spiel-Origin noch unbekannt, Payload trägt keine Daten
    if (ok) window.opener.postMessage({ app: APP, type: 'PING' }, '*');
  }, 3000);
}

// ── Heartbeat-Watchdog ────────────────────────────────────────────────────────
// Der Room-Scan liefert alle 5s PLAYER_DATA. Kommt 15s lang GAR keine Nachricht
// mehr (BC-Tab neu geladen / Loader weg), gilt die Verbindung als tot →
// Status rot + Ping-Retry neu starten (verbindet automatisch sobald der Loader
// im BC-Tab wieder aktiv ist).
let _lastMsgTs = Date.now();
// benannt, damit der Test ihn ohne Timer aufrufen kann
function _heartbeatCheck() {
  if (!_connected) return;
  if (Date.now() - _lastMsgTs > 15000) {
    console.warn('[BCK-Popup] Heartbeat verloren – Verbindung als tot markiert');
    _connected = false;
    _playerChecked = false;
    stopRoomScan();
    const cs = document.getElementById('connStatus');
    if (cs) { cs.textContent = 'Verbindung verloren'; cs.dataset.conn = 'off'; }
    startPingRetry();
  }
}
setInterval(_heartbeatCheck, 5000);

// ── Spieler-Check: nur mit dem zuletzt bekannten Account verbinden ────────────
const _LAST_MEMBER_KEY = 'BC_LAST_MEMBER_v1';
let _playerChecked = false;
/* Wurde die Verbindung wegen eines anderen BC-Accounts abgelehnt, schiebt der
   Loader im BC-Tab trotzdem weiter Daten herueber (Auto-Scan bei Raumwechsel,
   LSCG-Schnappschuesse). Die kamen bisher normal durch und landeten in der
   Datenbank – also genau die Daten des Accounts, den der Nutzer abgelehnt hat.
   Bis zu einem bewussten "Neu verbinden" wird alles verworfen. */
let _playerAbgelehnt = false;

// Absender-Doppelprüfung (STAB-06, Tool-Seite): Quelle muss der Opener sein;
// sobald beim ersten gültigen Handshake ein Spiel-Origin gelernt wurde, muss
// jede weitere Nachricht von genau diesem Origin kommen (Trust-on-first-use).
// Bei Mirror-Wechsel läuft der Heartbeat ab; nur manualReconnect() darf neu
// vertrauen.
function _bridgeSenderOk(ev) {
  if (!window.opener || ev.source !== window.opener) return false;
  if (_bcOrigin && ev.origin !== _bcOrigin) return false;
  return true;
}

function manualReconnect() {
  _connected = false;
  _playerChecked = false;
  _playerAbgelehnt = false;
  stopRoomScan();
  // Origin beim nächsten Handshake neu lernen (Mirror-Wechsel, STAB-07)
  _bcOrigin = null;
  document.getElementById('connStatus').textContent = 'Nicht verbunden';
  document.getElementById('connStatus').dataset.conn = 'off';
  console.log('[BCK-Popup] manualReconnect()');
  bcSend({ type: 'PING' });
  startPingRetry();
}

function bcSend(msg, silent) {
  try {
    const ok = !!window.opener && !window.opener.closed;
    if (!ok) {
      console.warn('[BCK-Popup] bcSend FAIL – kein opener', msg.type);
      if (!silent) showStatus('\u274c BC-Fenster nicht verf\u00fcgbar \u2013 Bookmarklet nochmal klicken', 'error');
      return false;
    }
    if (!silent || msg.type !== 'PING') console.log('[BCK-Popup] bcSend \u2192', msg.type);
    // STAB-04: Vor dem Handshake ist der Spiel-Origin unbekannt \u2013 dann darf nur der
    // PING-Bootstrap raus (an '*'). Alles andere (insb. EXEC) wird zentral abgewiesen,
    // damit kein Aufrufer versehentlich an ein unbekanntes Fenster sendet.
    if (!_bcOrigin && msg.type !== 'PING') {
      console.warn('[BCK-Popup] bcSend abgewiesen \u2013 kein Handshake', msg.type);
      if (!silent) showStatus('\u274c Noch nicht mit BC verbunden \u2013 erst \ud83d\udd04 Verbinden', 'error');
      return false;
    }
    if (msg.type === 'EXEC' && typeof _execLogAppend === 'function') _execLogAppend(msg); // STAB-08: einziger Sendepfad = einziger Log-Hakenpunkt (Hook lebt in items.js)
    window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*');
    return true;
  } catch(e) {
    console.error('[BCK-Popup] bcSend Exception:', e.message);
    if (!silent) showStatus('\u274c postMessage Fehler: ' + e.message, 'error');
    return false;
  }
}

// ── Handler-Registry (SPLIT-02) ──────────────────────────────────────────
// type -> Array<function(ev)>. items.js registriert seine 35 Handler-Körper
// hier statt selbst einen switch(ev.data.type) zu betreiben; neue Typen
// (z. B. GAME_SCAN_DATA in Phase 5) brauchen keine Änderung an dieser Datei
// oder an items.js.
const _bridgeHandlers = new Map();

function onBridgeMessage(type, handler) {
  if (typeof handler !== 'function') throw new TypeError('onBridgeMessage: handler muss eine Funktion sein (' + type + ')');
  if (!_bridgeHandlers.has(type)) _bridgeHandlers.set(type, []);
  _bridgeHandlers.get(type).push(handler);
  return handler;
}

function offBridgeMessage(type, handler) {
  const list = _bridgeHandlers.get(type);
  if (!list) return false;
  const idx = list.indexOf(handler);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}

function _bridgeDispatch(ev) {
  const list = _bridgeHandlers.get(ev.data.type);
  if (!list || !list.length) return 0;
  for (const fn of list.slice()) fn(ev); // Kopie: Selbst-Entfernung während Dispatch bleibt sicher
  return list.length;
}

window.addEventListener('message', function(ev) {
  if (!ev.data || ev.data.app !== APP) return;
  // Sicherheit: nur Nachrichten vom BC-Fenster (opener) akzeptieren, UND nach
  // dem ersten Handshake nur vom gelernten Spiel-Origin (STAB-06, TOFU).
  // Verhindert, dass fremde Fenster/Tabs gef\u00e4lschte CURSE_DATA/EXEC_OK etc. einschleusen.
  // Ohne opener gibt es keine legitime Gegenstelle \u2013 frueher entfiel die Pruefung
  // in dem Fall komplett, und jedes Fenster mit einem Handle auf dieses hier
  // konnte Daten einschleusen.
  if (!_bridgeSenderOk(ev)) {
    console.warn('[BCK-Popup] message von fremder Quelle/Origin ignoriert:', ev.origin);
    return;
  }
  // Abgelehnter Account: nichts annehmen bis der Nutzer neu verbindet
  if (_playerAbgelehnt) return;
  // Spiel-Origin einmalig lernen (BC l\u00e4uft auf mehreren Domains); danach erzwingt `_bridgeSenderOk` ihn
  if (!_bcOrigin && ev.origin && ev.origin !== 'null') _bcOrigin = ev.origin;
  _lastMsgTs = Date.now();
  console.log('[BCK-Popup] \u2190 message:', ev.data.type);

  // Meldungen des Bots fuehren zu Speichervorgaengen. Waehrend die laufen,
  // darf der automatische Sync nicht anspringen - sonst startet sich der Bot
  // bei jedem Einkauf selbst neu.
  if (/^(BOT_|RANG_INIT|MONEY_INIT_NEW)/.test(String(ev.data.type || '')) &&
      typeof _botRueckschreibStart === 'function') _botRueckschreibStart();

  _bridgeDispatch(ev);
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APP, onBridgeMessage, offBridgeMessage, bcSend, _bridgeSenderOk, manualReconnect, startPingRetry, _heartbeatCheck };
}
