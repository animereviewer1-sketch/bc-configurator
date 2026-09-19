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
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return '(ungültiger Zeitstempel)';
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
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
// onclick-Handler liefern ids immer als String; persistence.js erlaubt aber
// auch numerische ids. Zuerst exakt suchen, dann – nur wenn nichts gefunden
// und die id rein numerisch ist – als Zahl. Ein String-Datensatz hat Vorrang.
async function _scanGetSnapshot(id) {
  const rec = await idbSnapshotGet(id);
  if (rec) return rec;
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    const n = Number(id);
    if (Number.isSafeInteger(n)) return idbSnapshotGet(n);
  }
  return null;
}

// Einzige Aufrufstelle von idbSnapshotDelete im Repo. Existenz-Prüfung vor
// der Bestätigung; ohne verfügbare confirm-Funktion wird fail-closed nichts
// gelöscht. Kein „alle löschen“ — keine Schleife um diese Funktion.
async function deleteGameSnapshot(id) {
  const rec = await _scanGetSnapshot(id);
  if (!rec) {
    showStatus('⚠️ Snapshot nicht gefunden', 'info');
    return false;
  }
  if (typeof confirm !== 'function') return false;
  if (!confirm('Snapshot vom ' + _scanFormatTs(rec.ts) + ' (BC ' + (rec.gameVersion || '?') + ', ' + rec.modCount + ' Mods) wirklich löschen? Das kann nicht rückgängig gemacht werden.')) {
    return false;
  }
  const ok = await idbSnapshotDelete(rec.id);
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
  const rec = await _scanGetSnapshot(id);
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

// ── Rendering (SCAN-10) ───────────────────────────────────────────────────
// Reine Funktionen (kein DOM, kein Global außer Argumenten) zuerst — die
// nutzt auch tools/analyze-snapshot.js (Plan 06-03) über den Dual-Export.
const SCAN_PAGE_SIZE = 300;
const SCAN_CATEGORIES = ['globals', 'assets', 'groups', 'hooks', 'mods', 'patching', 'probes'];
const SCAN_BADGE_LABEL = { genutzt: 'bereits genutzt', neu: 'neu', unbekannt: 'unbekannt' };
let _scanState = { records: [], selectedId: null, rowsForId: null, rows: [], shown: SCAN_PAGE_SIZE };
let _scanRenderDebounced = null;

function _scanFlatten(inventory) {
  if (!inventory || typeof inventory !== 'object') return [];
  const rows = [];
  function push(category, kind, name, detail, extra) {
    const n = String(name ?? '');
    if (!n) return;
    const row = { category: category, kind: kind, name: n, detail: String(detail ?? '') };
    if (extra) Object.assign(row, extra);
    rows.push(row);
  }

  const globals = inventory.globals || {};
  (globals.getters || []).forEach(function (g) { push('globals', 'getter', g, ''); });
  (globals.functions || []).forEach(function (f) { push('globals', 'function', f && f.name, 'Arität ' + (f && f.arity)); });
  (globals.values || []).forEach(function (v) { push('globals', 'value', v && v.name, v && v.type); });

  const assets = inventory.assets || {};
  (assets.items || []).forEach(function (it) {
    const group = String((it && it.Group) ?? '');
    push('assets', 'item', it && it.Name, 'Gruppe ' + group, { group: group });
  });
  (assets.groups || []).forEach(function (g) {
    push('groups', 'group', g && g.Name, (g && g.assetCount != null) ? (g.assetCount + ' Assets') : '');
  });

  const chatHooks = inventory.chatHooks || {};
  if (chatHooks.ChatRoomRegisterMessageHandler) {
    const h = chatHooks.ChatRoomRegisterMessageHandler;
    push('hooks', 'api', 'ChatRoomRegisterMessageHandler', h.exists ? ('vorhanden · Arität ' + h.arity) : 'fehlt');
  }
  const registry = chatHooks.registry || {};
  (registry.handlers || []).forEach(function (h) {
    push('hooks', 'handler', (h && h.Description) || '(ohne Beschreibung)', 'Priority ' + (h && h.Priority));
  });
  (chatHooks.hookedChatFunctions || []).forEach(function (f) {
    push('hooks', 'hooked', f && f.name, 'gehookt von ' + ((f && f.hookedByMods) || []).join(', '));
  });

  (inventory.mods || []).forEach(function (m) {
    push('mods', 'mod', m && m.name, ((m && m.version) || '') + ((m && m.fullName) ? (' · ' + m.fullName) : ''));
  });

  const modSdk = inventory.modSdk || {};
  (modSdk.patching || []).forEach(function (p) {
    const hookDetail = 'gehookt von ' + ((p && p.hookedByMods) || []).join(', ');
    const patchedDetail = (p && p.patchedByMods && p.patchedByMods.length) ? (' · gepatcht von ' + p.patchedByMods.join(', ')) : '';
    push('patching', 'patch', p && p.name, hookDetail + patchedDetail);
  });

  const probes = inventory.probes || {};
  Object.keys(probes).filter(function (k) { return k !== 'sweep'; }).forEach(function (key) {
    const p = probes[key] || {};
    push('probes', 'probe', key, p.present ? ('vorhanden' + (p.version ? (' · ' + p.version) : '')) : 'nicht vorhanden', { probe: key });
    // loader.js (giDescribeApi) liefert api-Einträge als {name, kind}; functions/
    // sample sind Strings. Alle Quellen zusammen, nicht exklusiv (CR-01).
    const names = [].concat(p.functions || [], p.api || [], (p.screenFunctions && p.screenFunctions.sample) || [], p.sample || [])
      .map(function (fn) { return (fn && typeof fn === 'object') ? fn.name : fn; })
      .filter(function (n) { return typeof n === 'string' && n.length > 0; });
    names.forEach(function (fn) {
      push('probes', 'probe-api', key + '.' + fn, '', { probe: key });
    });
  });
  (probes.sweep || []).forEach(function (name) {
    push('probes', 'sweep', name, 'Global mit Mod-Präfix', { probe: '' });
  });

  return rows;
}

function _scanBaselineSets(manifest) {
  if (!manifest) return null;
  const ids = Array.isArray(manifest.identifiers) ? manifest.identifiers : [];
  const identifiers = new Set(ids.map(function (e) { return e && e.name; }));
  const modProbes = new Set((manifest.modProbes || []).map(function (s) { return String(s).toLowerCase(); }));
  const counts = { identifiers: ids.length, function: 0, assetGroup: 0, unknown: 0 };
  ids.forEach(function (e) {
    const kind = e && e.kind;
    if (kind === 'function') counts.function++;
    else if (kind === 'assetGroup') counts.assetGroup++;
    else counts.unknown++;
  });
  return { identifiers: identifiers, modProbes: modProbes, counts: counts };
}

function _scanBadge(row, sets) {
  if (!row || !sets) return 'unbekannt';
  let used;
  if (row.category === 'assets') {
    used = sets.identifiers.has(row.group);
  } else if (row.category === 'mods') {
    used = sets.modProbes.has(String(row.name).toLowerCase());
  } else if (row.category === 'probes') {
    used = !!(row.probe && sets.modProbes.has(String(row.probe).toLowerCase()));
  } else {
    used = sets.identifiers.has(row.name);
  }
  return used ? 'genutzt' : 'neu';
}

function _scanFilter(rows, query, category) {
  const list = Array.isArray(rows) ? rows : [];
  const q = String(query || '').trim().toLowerCase();
  const cat = category || 'all';
  return list.filter(function (r) {
    if (cat !== 'all' && r.category !== cat) return false;
    if (!q) return true;
    const hay = (r.name + ' ' + (r.detail || '')).toLowerCase();
    return hay.includes(q);
  });
}

function _scanCountBadges(rows, sets) {
  const list = Array.isArray(rows) ? rows : [];
  const result = { all: { total: 0, genutzt: 0, neu: 0, unbekannt: 0 } };
  SCAN_CATEGORIES.forEach(function (cat) { result[cat] = { total: 0, genutzt: 0, neu: 0, unbekannt: 0 }; });
  list.forEach(function (r) {
    const badge = _scanBadge(r, sets);
    result.all.total++;
    result.all[badge]++;
    if (result[r.category]) {
      result[r.category].total++;
      result[r.category][badge]++;
    }
  });
  return result;
}

// ── DOM-Teil (nur im Browser aufgerufen) ─────────────────────────────────
function _scanEl(id) {
  return document.getElementById(id);
}

function _scanManifest() {
  return (typeof BASELINE_MANIFEST !== 'undefined') ? BASELINE_MANIFEST : null;
}

async function renderScanTab() {
  const records = await idbSnapshotGetAll();
  _scanState.records = records;
  if (!records.find(function (r) { return r.id === _scanState.selectedId; })) {
    _scanState.selectedId = records.length ? records[records.length - 1].id : null;
  }
  _scanApplySelection();
}

function _scanApplySelection() {
  const rec = _scanState.records.find(function (r) { return r.id === _scanState.selectedId; });
  if (rec) {
    if (_scanState.rowsForId !== rec.id) {
      _scanState.rows = _scanFlatten(rec.inventory);
      _scanState.rowsForId = rec.id;
    }
  } else {
    _scanState.rows = [];
    _scanState.rowsForId = null;
  }
  _scanState.shown = SCAN_PAGE_SIZE;
  _scanRenderSnapshots();
  _scanRenderBaselineInfo();
  _scanRender();
}

function _scanRenderSnapshots() {
  const el = _scanEl('scanSnapshotList');
  const records = _scanState.records;
  if (!records.length) {
    el.innerHTML = `<div class="scan-empty">Noch kein Snapshot – ⚙️ Tweaks → 🔎 Spiel scannen`
      + (typeof triggerGameScan === 'function' ? ` <button class="scan-btn" onclick="triggerGameScan()">🔎 Neuer Scan</button>` : '')
      + `</div>`;
    return;
  }
  const rowsHtml = records.slice().reverse().map(function (r) {
    const active = r.id === _scanState.selectedId;
    return `<div class="scan-snap${active ? ' scan-snap-active' : ''}" onclick="scanSelectSnapshot('${escJsAttr(r.id)}')">`
      + `📸 ${escHtml(_scanFormatTs(r.ts))}`
      + ` · BC ${escHtml(r.gameVersion || '?')}`
      + ` · ${escHtml(String(r.modCount))} Mods`
      + ` · ${escHtml(String(_scanKb(r.sizeBytes)))} KB`
      + `<button class="scan-btn" onclick="event.stopPropagation(); exportGameSnapshot('${escJsAttr(r.id)}')">⬇ Exportieren</button>`
      + `<button class="scan-btn scan-btn-danger" onclick="event.stopPropagation(); deleteGameSnapshot('${escJsAttr(r.id)}')">🗑 Löschen</button>`
      + `</div>`;
  }).join('');
  el.innerHTML = rowsHtml;
}

function _scanRenderBaselineInfo() {
  const el = _scanEl('scanBaselineInfo');
  const manifest = _scanManifest();
  if (!manifest) {
    el.textContent = '⚠️ baseline-manifest.js nicht geladen – Badges zeigen „unbekannt“';
    return;
  }
  const sets = _scanBaselineSets(manifest);
  const c = sets.counts;
  el.textContent = `Baseline: ${c.identifiers} Bezeichner (${c.function} Funktionen, ${c.assetGroup} Asset-Gruppen, ${c.unknown} unklassifiziert) · „bereits genutzt“ = Name steht im Baseline-Manifest des Tools; Assets nach Gruppe (gruppenweise Präzision)`;
}

function _scanRender() {
  const query = _scanEl('scanSearch')?.value ?? '';
  const category = _scanEl('scanCategory')?.value || 'all';
  const manifest = _scanManifest();
  const sets = _scanBaselineSets(manifest);
  const filtered = _scanFilter(_scanState.rows, query, category);
  const shown = _scanState.shown;
  const slice = filtered.slice(0, shown);
  let html = slice.map(function (r) {
    const badge = _scanBadge(r, sets);
    return `<div class="scan-row">`
      + `<span class="scan-cat">${escHtml(r.category)}</span>`
      + `<span class="scan-kind">${escHtml(r.kind)}</span>`
      + `<span class="scan-name">${escHtml(r.name)}</span>`
      + `<span class="scan-detail">${escHtml(r.detail || '')}</span>`
      + `<span class="scan-badge scan-badge-${badge}">${SCAN_BADGE_LABEL[badge]}</span></div>`;
  }).join('');
  if (filtered.length > shown) {
    html += `<button class="scan-btn" onclick="scanLoadMore()">mehr laden (${filtered.length - shown} weitere)</button>`;
  }
  _scanEl('scanList').innerHTML = html;
  const c = _scanCountBadges(filtered, sets);
  _scanEl('scanCount').textContent = `${slice.length} von ${filtered.length} Einträgen (${c.all.genutzt} genutzt · ${c.all.neu} neu)`;
}

function scanSelectSnapshot(id) {
  // onclick liefert Strings – auf die echte id des Datensatzes zurückführen
  const hit = _scanState.records.find(function (r) { return r.id === id; })
    || _scanState.records.find(function (r) { return String(r.id) === String(id); });
  _scanState.selectedId = hit ? hit.id : id;
  _scanApplySelection();
}

function scanOnSearch() {
  _scanState.shown = SCAN_PAGE_SIZE;
  if (!_scanRenderDebounced) _scanRenderDebounced = _debounce(_scanRender, 150);
  _scanRenderDebounced();
}

function scanOnFilter() {
  _scanState.shown = SCAN_PAGE_SIZE;
  _scanRender();
}

function scanLoadMore() {
  _scanState.shown += SCAN_PAGE_SIZE;
  _scanRender();
}

// Dual-Export für Vitest (CJS-Require); im Browser ist `module` undefined.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deleteGameSnapshot, exportGameSnapshot, _scanFormatTs, _scanKb, _scanSafeName, _scanExportName,
    SCAN_PAGE_SIZE, SCAN_CATEGORIES, _scanFlatten, _scanBaselineSets, _scanBadge, _scanFilter, _scanCountBadges,
  };
}
