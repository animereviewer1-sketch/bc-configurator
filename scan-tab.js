// ── scan-tab.js — Scan-Tab (SCAN-10/11/12): Snapshot-Browser, Löschen nur
// mit Bestätigung, Export. Lädt NACH persistence.js, items.js, game-scan.js
// und baseline-manifest.js (docs/LOAD-ORDER.md). Kein Eintrag in
// CORE_SCRIPTS (Blatt-Modul — Tests laden es explizit über loadScript).
// Keine eigene Bridge-/IDB-Logik: liest/löscht ausschließlich über die
// Snapshot-Primitive aus persistence.js. Node-tauglich für
// tools/analyze-snapshot.js (Dual-Export, kein Top-Level-DOM-Zugriff).
// Plan 06-03 hängt das Rendering (renderScanTab) an.

// ── Ladereihenfolge-Guard (Muster game-scan.js, docs/LOAD-ORDER.md) ──────────
(function () {
  if (typeof window === 'undefined') return; // Node/require: DOM wird nie zur Ladezeit berührt
  const required = [
    ['idbSnapshotGetAll', 'persistence.js'],
    ['idbSnapshotGet', 'persistence.js'],
    ['idbSnapshotDelete', 'persistence.js'],
    ['showStatus', 'items.js'],
    ['escHtml', 'items.js'],
    ['escJsAttr', 'items.js'],
    ['_jsonParts', 'items.js'],
  ];
  const missing = required.filter(function (e) { return typeof window[e[0]] !== 'function'; }).map(function (e) { return e[1]; }).filter(function (f, i, a) { return a.indexOf(f) === i; });
  if (!missing.length) return;
  const msg = 'FATAL: ' + missing.join(', ') + ' wurde nicht vor scan-tab.js geladen – Ladereihenfolge in index.html prüfen (siehe docs/LOAD-ORDER.md)';
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

// ── Helfer ────────────────────────────────────────────────────────────────
function _scanFormatTs(ts) {
  return new Date(ts).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function _scanKb(bytes) {
  return Math.round((bytes || 0) / 1024);
}

function _scanSafeName(s) {
  return String(s ?? '').replace(/[^\w.-]/g, '_');
}

function _scanExportName(rec) {
  return 'BC_Snapshot_' + new Date(rec.ts).toISOString().slice(0, 10) + '_'
    + (rec.gameVersion ? _scanSafeName(rec.gameVersion) : 'unbekannt') + '_' + _scanSafeName(rec.id) + '.json';
}

// ── Löschen mit Bestätigung (SCAN-11) ────────────────────────────────────
// Einzige Aufrufstelle von idbSnapshotDelete im Repo. Existenz-Prüfung vor
// der Bestätigung; ohne verfügbare confirm-Funktion wird fail-closed nichts
// gelöscht. Kein „alle löschen“ — keine Schleife um diese Funktion.
async function deleteGameSnapshot(id) {
  const rec = await idbSnapshotGet(id);
  if (!rec) {
    showStatus('⚠️ Snapshot nicht gefunden', 'info');
    return false;
  }
  if (typeof confirm !== 'function') return false;
  if (!confirm('Snapshot vom ' + _scanFormatTs(rec.ts) + ' (BC ' + (rec.gameVersion || '?') + ', ' + rec.modCount + ' Mods) wirklich löschen? Das kann nicht rückgängig gemacht werden.')) {
    return false;
  }
  const ok = await idbSnapshotDelete(id);
  if (!ok) {
    showStatus('❌ Snapshot konnte nicht gelöscht werden', 'error');
    return false;
  }
  showStatus('✅ Snapshot gelöscht', 'success');
  if (typeof renderScanTab === 'function') await renderScanTab();
  return true;
}

// ── Export eines einzelnen Snapshots (SCAN-12-Eingabe) ───────────────────
// Nur Lesezugriffe; Muster exportScreenshotsOnly (items.js, Plan 04-03).
async function exportGameSnapshot(id) {
  const rec = await idbSnapshotGet(id);
  if (!rec) {
    showStatus('⚠️ Snapshot nicht gefunden', 'info');
    return false;
  }
  try {
    const inv = rec.inventory || {};
    const payload = {
      _meta: {
        version: 1,
        tool: 'BC Konfigurator – Snapshot-Export',
        exportedAt: new Date().toISOString(),
        snapshotId: rec.id,
        counts: {
          globals: inv.globals?.total ?? null,
          assets: inv.assets?.count ?? null,
          groups: inv.assets?.groupCount ?? null,
          patching: inv.modSdk?.patchingCount ?? null,
          mods: rec.modCount ?? null,
        },
      },
      snapshot: rec,
    };
    const parts = _jsonParts(payload);
    const blob  = new Blob(parts, { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = _scanExportName(rec);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    showStatus('✅ Snapshot exportiert – ' + _scanKb(blob.size ?? rec.sizeBytes) + ' KB', 'success');
    return true;
  } catch (e) {
    showStatus('❌ Snapshot-Export fehlgeschlagen: ' + (e?.message || e), 'error');
    return false;
  }
}

// Dual-Export für Vitest (CJS-Require); im Browser ist `module` undefined.
// Plan 06-03 erweitert diese Liste um die Rendering-Funktionen.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { deleteGameSnapshot, exportGameSnapshot, _scanFormatTs, _scanKb, _scanSafeName, _scanExportName };
}
