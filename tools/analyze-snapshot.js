// tools/analyze-snapshot.js — dev-only Analysewerkzeug (SCAN-12-Grundlage).
// Liest einen Snapshot-Export (⬇ aus dem Scan-Tab, scan-tab.js
// exportGameSnapshot) plus baseline-manifest.json und wendet EXAKT die
// Badge-/Flatten-Funktionen des Scan-Tabs an (_scanFlatten/_scanBaselineSets/
// _scanBadge/_scanCountBadges aus scan-tab.js, Dual-Export) — eine Quelle der
// Wahrheit, damit die hier gedruckten Zahlen identisch mit dem sind, was der
// Tab anzeigt (Grundlage für GAME-INVENTORY.md, Plan 06-04). Nur `fs`/`path`,
// kein Build-Schritt, nie von index.html geladen.
//
// CLI: npm run analyze -- <export.json> [manifest.json] [--limit N]

const fs = require('fs');
const path = require('path');
const tab = require(path.join(__dirname, '..', 'scan-tab.js'));

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function unwrapSnapshot(exported) {
  if (exported && exported.snapshot && exported.snapshot.inventory) return { rec: exported.snapshot };
  if (exported && exported.inventory) return { rec: exported };
  throw new Error('Kein Snapshot: erwartet {_meta, snapshot} oder einen Datensatz mit inventory');
}

function analyzeSnapshot(exported, manifest) {
  const rec = unwrapSnapshot(exported).rec;
  const rows = tab._scanFlatten(rec.inventory);
  const sets = tab._scanBaselineSets(manifest);
  const counts = tab._scanCountBadges(rows, sets);
  const neu = {};
  const genutzt = {};
  tab.SCAN_CATEGORIES.forEach(function (cat) {
    const catRows = rows.filter(function (r) { return r.category === cat; });
    neu[cat] = Array.from(new Set(
      catRows.filter(function (r) { return tab._scanBadge(r, sets) === 'neu'; }).map(function (r) { return r.name; })
    )).sort();
    genutzt[cat] = Array.from(new Set(
      catRows.filter(function (r) { return tab._scanBadge(r, sets) === 'genutzt'; }).map(function (r) { return r.name; })
    )).sort();
  });
  const meta = {
    id: rec.id ?? null,
    ts: rec.ts ?? null,
    gameVersion: rec.gameVersion ?? null,
    modCount: rec.modCount ?? null,
    sizeBytes: rec.sizeBytes ?? null,
  };
  const baseline = sets ? sets.counts : null;
  return { meta: meta, baseline: baseline, counts: counts, neu: neu, genutzt: genutzt };
}

function renderMarkdown(result, opts) {
  opts = opts || {};
  const limit = opts.limit != null ? opts.limit : 40;
  const meta = result.meta || {};
  const tsIso = meta.ts != null ? new Date(meta.ts).toISOString() : 'unbekannt';
  let md = '## Snapshot vs. Baseline\n\n';
  md += 'Snapshot: ' + tsIso + ' · BC ' + (meta.gameVersion || '?') + ' · ' + (meta.modCount ?? '?') + ' Mods · ' + (meta.sizeBytes ?? '?') + ' Bytes\n';
  if (result.baseline) {
    md += 'Baseline: ' + result.baseline.identifiers + ' Bezeichner (' + result.baseline.function + ' Funktionen, '
      + result.baseline.assetGroup + ' Asset-Gruppen, ' + result.baseline.unknown + ' unklassifiziert)\n';
  } else {
    md += 'Baseline: nicht geladen\n';
  }
  md += '\n| Kategorie | gesamt | genutzt | neu | unbekannt |\n';
  md += '|---|---|---|---|---|\n';
  const cats = tab.SCAN_CATEGORIES.concat(['all']);
  cats.forEach(function (cat) {
    const c = result.counts[cat] || { total: 0, genutzt: 0, neu: 0, unbekannt: 0 };
    md += '| ' + cat + ' | ' + c.total + ' | ' + c.genutzt + ' | ' + c.neu + ' | ' + c.unbekannt + ' |\n';
  });
  md += '\n';
  tab.SCAN_CATEGORIES.forEach(function (cat) {
    const names = (result.neu && result.neu[cat]) || [];
    const shown = names.slice(0, limit);
    const rest = names.length - shown.length;
    md += '### neu: ' + cat + ' (' + names.length + ')\n';
    md += shown.length ? shown.map(function (n) { return '`' + n + '`'; }).join(', ') : '—';
    if (rest > 0) md += ' … (+' + rest + ' weitere)';
    md += '\n\n';
  });
  return md;
}

module.exports = { loadJson: loadJson, unwrapSnapshot: unwrapSnapshot, analyzeSnapshot: analyzeSnapshot, renderMarkdown: renderMarkdown };

if (require.main === module) {
  const args = process.argv.slice(2);
  let exportFile = null;
  let manifestFile = null;
  let limit = 40;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit') {
      limit = parseInt(args[++i], 10) || 40;
    } else if (!exportFile) {
      exportFile = a;
    } else if (!manifestFile) {
      manifestFile = a;
    }
  }
  if (!exportFile) {
    console.error('Usage: node tools/analyze-snapshot.js <export.json> [manifest.json] [--limit N]');
    process.exit(2);
  }
  manifestFile = manifestFile || path.join(__dirname, '..', 'baseline-manifest.json');
  const exported = loadJson(exportFile);
  let manifest = null;
  try {
    manifest = loadJson(manifestFile);
  } catch (e) {
    manifest = null;
  }
  const result = analyzeSnapshot(exported, manifest);
  process.stdout.write(renderMarkdown(result, { limit: limit }));
}
