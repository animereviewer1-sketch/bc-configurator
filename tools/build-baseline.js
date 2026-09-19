// tools/build-baseline.js — dev-only Node-Skript (SCAN-09).
// Wird NIE von index.html geladen und ist kein Build-Schritt (CLAUDE.md-
// Constraint "Vanilla JS ohne Build-Schritt in Produktion"). Regeneriert
// deterministisch (sortiert, ohne Zeitstempel) die beiden committeten
// Dateien baseline-manifest.json (Tooling) und baseline-manifest.js
// (Konsumform fürs Tool, `const BASELINE_MANIFEST = {…};`, Zero-Fetch,
// funktioniert unter GitHub Pages UND file://) aus den fünf Quelldateien
// bot-engine.js/items.js/bot-ui.js/bot-data.js/loader.js.
//
// Nach jeder Änderung an einer dieser fünf Dateien: `npm run baseline`
// ausführen und beide generierten Dateien explizit stagen
// (`git add baseline-manifest.json baseline-manifest.js`), nie per
// `git add -A`. tests/baseline-manifest.test.js macht ein veraltetes
// Manifest rot (Frische-Diff, T-6-01).
//
// Klassifikations-Heuristik (classifyIdentifier, Pitfall 3 aus
// 06-RESEARCH.md): Aufruf-Form (`Name(` im Quelltext) → 'function'; sonst
// ein Item-Präfix als Anführungszeichen-Literal (Item-Gruppennamen stehen
// im Tool als String-Literale, z. B. in Item-Picker-Code) → 'assetGroup';
// sonst 'unknown' (Property-Zugriffe wie `Player.ChatSettings`, quoted
// Nicht-Item-Namen wie Hook-Listen). Aufruf-Evidenz schlägt Literal-
// Evidenz (Doppel-Evidenz → 'function'). Die Heuristik ist bewusst grob —
// Fehlklassifikationen sind harmlos, weil die Badges im Scan-Tab (Plan
// 06-03) über die Namensmenge aller drei kinds gebildet werden, nicht nur
// über 'function'.

const fs = require('fs');
const path = require('path');

const SOURCE_FILES = ['bot-engine.js', 'items.js', 'bot-ui.js', 'bot-data.js', 'loader.js'];
const IDENTIFIER_RE = /\b(Inventory|Character|ChatRoom|Server|Asset|Player|Dialog|Common|Item|Lock|Wardrobe|Pose|Skill|Reputation|Online|Chat)[A-Z]\w+/g;
// Chat-Hook-API ist eine feste, kleine Allowlist — nicht regex-abgeleitet.
const CHAT_HOOK_NAMES = ['ChatRoomRegisterMessageHandler'];
// Die fünf Fallback-Probes aus loader.js (SCAN-06), alphabetisch.
const MOD_PROBES = ['bcx', 'lscg', 'mbs', 'themed', 'wce'];
const MANIFEST_SCHEMA = 1;
const JSON_PATH = 'baseline-manifest.json';
const JS_PATH = 'baseline-manifest.js';

// Regex-Metazeichen maskieren, damit ein Bezeichner sicher in `new RegExp(...)` eingesetzt werden kann.
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classifyIdentifier(name, allText) {
  const callRe = new RegExp('\\b' + escapeRe(name) + '\\s*\\(');
  if (callRe.test(allText)) return 'function';
  if (/^Item[A-Z]/.test(name)) {
    const literalRe = new RegExp('[\'"`]' + escapeRe(name) + '[\'"`]');
    if (literalRe.test(allText)) return 'assetGroup';
  }
  return 'unknown';
}

// `sources` = Objekt Dateiname → Quelltext (Produktionslauf: readSources(repoRoot); Tests: synthetische Objekte).
function extractBaseline(sources) {
  const byName = new Map();
  for (const [file, text] of Object.entries(sources)) {
    for (const m of text.matchAll(IDENTIFIER_RE)) {
      const name = m[0];
      if (!byName.has(name)) byName.set(name, new Set());
      byName.get(name).add(file);
    }
  }
  const allText = Object.values(sources).join('\n');
  const identifiers = [...byName.entries()]
    .map(([name, files]) => ({ name, kind: classifyIdentifier(name, allText), files: [...files].sort() }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const counts = {
    identifiers: identifiers.length,
    function: identifiers.filter((e) => e.kind === 'function').length,
    assetGroup: identifiers.filter((e) => e.kind === 'assetGroup').length,
    unknown: identifiers.filter((e) => e.kind === 'unknown').length,
  };

  return {
    schema: MANIFEST_SCHEMA,
    sourceFiles: Object.keys(sources),
    identifierPattern: IDENTIFIER_RE.source,
    counts,
    identifiers,
    chatHooks: CHAT_HOOK_NAMES.slice(),
    modProbes: MOD_PROBES.slice(),
  };
}

function readSources(repoRoot) {
  const sources = {};
  for (const file of SOURCE_FILES) {
    sources[file] = fs.readFileSync(path.join(repoRoot, file), 'utf8');
  }
  return sources;
}

function renderManifestJson(manifest) {
  return JSON.stringify(manifest, null, 2) + '\n';
}

// Klassisches Skript (kein export/import/require) — die globale `const`-Bindung
// ist im gemeinsamen Skript-Scope sichtbar (Plan 06-03 liest sie per
// `typeof BASELINE_MANIFEST !== 'undefined'`). Zero-Fetch-Konsum: lädt unter
// GitHub Pages UND file:// per <script>, ein fetch() einer JSON-Datei scheitert
// unter file://.
function renderManifestJs(manifest) {
  const line1 = '// GENERIERT von tools/build-baseline.js (npm run baseline) — nicht von Hand editieren.';
  const line2 = '// Quelldateien: ' + manifest.sourceFiles.join(', ') + ' — Inhalt identisch mit baseline-manifest.json (SCAN-09).';
  return line1 + '\n' + line2 + '\n' + 'const BASELINE_MANIFEST = ' + JSON.stringify(manifest, null, 2) + ';\n';
}

function buildBaseline(repoRoot) {
  const sources = readSources(repoRoot);
  const manifest = extractBaseline(sources);
  return { manifest, json: renderManifestJson(manifest), js: renderManifestJs(manifest) };
}

function writeBaseline(repoRoot) {
  const { manifest, json, js } = buildBaseline(repoRoot);
  fs.writeFileSync(path.join(repoRoot, JSON_PATH), json);
  fs.writeFileSync(path.join(repoRoot, JS_PATH), js);
  return manifest;
}

module.exports = {
  SOURCE_FILES, IDENTIFIER_RE, CHAT_HOOK_NAMES, MOD_PROBES, MANIFEST_SCHEMA, JSON_PATH, JS_PATH,
  escapeRe, classifyIdentifier, readSources, extractBaseline, renderManifestJson, renderManifestJs,
  buildBaseline, writeBaseline,
};

if (require.main === module) {
  const repoRoot = path.resolve(__dirname, '..');
  const manifest = writeBaseline(repoRoot);
  const c = manifest.counts;
  console.log(
    'baseline-manifest.json/.js geschrieben: ' + c.identifiers + ' Bezeichner (' +
    c.function + ' function, ' + c.assetGroup + ' assetGroup, ' + c.unknown + ' unknown)'
  );
}
