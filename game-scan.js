// ── game-scan.js — Spiel-Scan (SCAN-01/SCAN-08): Trigger, Fortschritt, Snapshot-Speicherung ──
// Lädt NACH persistence.js, bridge.js, items.js (docs/LOAD-ORDER.md).
// Registriert seine zwei Nachrichtentypen über onBridgeMessage — keine
// Änderung an items.js/bridge.js (SPLIT-02-Muster). Snapshots werden nie
// überschrieben oder automatisch gelöscht (Kernwert; Löschen mit Bestätigung
// folgt in Phase 6).

// ── Ladereihenfolge-Guard (Muster bot-ui.js, docs/LOAD-ORDER.md) ──────────
(function () {
  const required = [['idbSnapshotPut', 'persistence.js'], ['bcSend', 'bridge.js'], ['onBridgeMessage', 'bridge.js'], ['showStatus', 'items.js']];
  const missing = required.filter(function (e) { return typeof window[e[0]] !== 'function'; }).map(function (e) { return e[1]; }).filter(function (f, i, a) { return a.indexOf(f) === i; });
  if (!missing.length) return;
  const msg = 'FATAL: ' + missing.join(', ') + ' wurde nicht vor game-scan.js geladen – Ladereihenfolge in index.html prüfen (siehe docs/LOAD-ORDER.md)';
  try {
    const box = document.createElement('div');
    box.id = 'loadOrderFatal';
    box.textContent = msg;
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:16px 20px;background:#3b0a0a;color:#ffb4b4;font:14px/1.5 monospace;border-bottom:2px solid #f66;white-space:pre-wrap';
    (document.body || document.documentElement).appendChild(box);
  } catch (e) {}
  console.error('[BCK-Popup] ' + msg);
  throw new Error(msg);
})();

// ── Zustand ────────────────────────────────────────────────────────────
let _giSeq = 0;
// Plain-Object statt Map: die statischen Sicherheits-Gates zählen jede
// Lösch-Operation im Quelltext (SCAN-08-Verbot); eine verbrauchte reqId wird
// deshalb auf null gesetzt statt aus einer Map entfernt zu werden.
let _giPending = Object.create(null); // reqId → { startedAt } | null (verbraucht)

function _giPendingHas(reqId) {
  return Object.prototype.hasOwnProperty.call(_giPending, reqId) && !!_giPending[reqId];
}

// ── Statuszeile-Helfer ─────────────────────────────────────────────────
function _gameScanInfo(text) {
  const el = document.getElementById('gameScanInfo');
  if (el) el.textContent = text;
}

function _gameScanFormatTs(ts) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function _gameScanKb(bytes) {
  return Math.round((bytes || 0) / 1024);
}

// ── Trigger (SCAN-01) ────────────────────────────────────────────────────
function triggerGameScan() {
  const reqId = 'gi_' + Date.now() + '_' + (++_giSeq);
  if (!bcSend({ type: 'GET_GAME_INVENTORY', reqId })) {
    _gameScanInfo('❌ Nicht verbunden – erst 🔄 Verbinden, dann erneut scannen');
    return null;
  }
  _giPending[reqId] = { startedAt: Date.now() };
  _gameScanInfo('Scan läuft… (angefordert ' + _gameScanFormatTs(Date.now()) + ')');
  return reqId;
}

// ── Fortschritt ────────────────────────────────────────────────────────
onBridgeMessage('GAME_INVENTORY_PROGRESS', function (ev) {
  const d = ev.data || {};
  if (!_giPendingHas(d.reqId)) return;
  _gameScanInfo('Scan läuft… Schritt ' + d.step + '/' + d.total + ' – ' + (d.label || ''));
});

// ── Ergebnis → Snapshot (SCAN-08) ─────────────────────────────────────────
onBridgeMessage('GAME_INVENTORY_DATA', function (ev) {
  const d = ev.data || {};
  if (!_giPendingHas(d.reqId)) return;
  const meta = _giPending[d.reqId];
  _giPending[d.reqId] = null; // verbraucht — kein zweiter Speichervorgang für dieselbe reqId
  if (d.err || !d.snapshot || typeof d.snapshot !== 'object') {
    const why = d.err ? String(d.err) : 'keine Daten empfangen';
    showStatus('❌ Spiel-Scan fehlgeschlagen: ' + why, 'error');
    _gameScanInfo('❌ Scan fehlgeschlagen: ' + why);
    return;
  }
  _saveGameInventorySnapshot(d.snapshot, meta);
});

async function _saveGameInventorySnapshot(inventory, meta) {
  const ts = Date.now();
  const modsRaw = Array.isArray(inventory.mods) ? inventory.mods : [];
  const mods = modsRaw.map(function (m) { return { name: String((m && m.name) ?? ''), version: String((m && m.version) ?? '') }; });
  let sizeBytes = null;
  try { sizeBytes = JSON.stringify(inventory).length; } catch (e) { sizeBytes = null; }
  const record = {
    id: ts,
    ts,
    gameVersion: typeof inventory.gameVersion === 'string' ? inventory.gameVersion : null,
    modCount: mods.length,
    mods,
    sizeBytes,
    inventory,
  };
  console.info('[GameScan] Snapshot-Größe (JSON-Zeichen):', sizeBytes, '· Mods:', mods.length, '· BC', record.gameVersion, '· Dauer ms:', meta && meta.startedAt ? ts - meta.startedAt : null);
  const ok = await idbSnapshotPut(record);
  if (!ok) {
    _gameScanInfo('❌ Snapshot NICHT gespeichert – siehe Statusmeldung (Speicher voll?)');
    return false;
  }
  showStatus('✅ Spiel-Scan gespeichert – ' + mods.length + ' Mods, ' + _gameScanKb(sizeBytes) + ' KB', 'success');
  await _renderGameScanInfo(record);
  return true;
}

// ── Statuszeile-Rendering (Init + nach jedem Scan) ────────────────────────
async function _renderGameScanInfo(last) {
  try {
    const keys = await idbSnapshotKeys();
    const n = keys.length;
    let text;
    if (last) {
      text = 'Letzter Scan ' + _gameScanFormatTs(last.ts) + ' · BC ' + (last.gameVersion || '?') + ' · ' + last.modCount + ' Mods · ' + _gameScanKb(last.sizeBytes) + ' KB · ' + n + ' Snapshot' + (n === 1 ? '' : 's') + ' gespeichert';
    } else if (n > 0) {
      const numericKeys = keys.filter(function (k) { return typeof k === 'number'; });
      text = n + ' Snapshot' + (n === 1 ? '' : 's') + ' gespeichert · letzter ' + _gameScanFormatTs(Math.max.apply(null, numericKeys));
    } else {
      text = 'Noch kein Scan gespeichert';
    }
    _gameScanInfo(text);
  } catch (e) {
    // still: Statuszeile ist Komfort, kein Datenpfad
  }
}

// ── Init-Hook (Konvention 02-03) ───────────────────────────────────────
try {
  if (document.readyState !== 'loading') _renderGameScanInfo();
  else document.addEventListener('DOMContentLoaded', function () { _renderGameScanInfo(); });
} catch (e) {}
