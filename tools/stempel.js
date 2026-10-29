// tools/stempel.js — dev-only Node-Skript. Wird NIE von index.html geladen und ist kein Build-Schritt
// (CLAUDE.md-Constraint "Vanilla JS ohne Build-Schritt in Produktion").
//
// Pflegt version.js, die Versionsnummer in Einstellungen (Kopf des Panels). Die Nummer lässt den Nutzer sagen,
// auf welchem Stand das Tool läuft:  Build · Datum · Code-Kennung (#xxxxxxxx).
//   - "Code-Kennung" = Prüfsumme über alles, was die Seite lädt (index.html, nova/*, alle *.js im Hauptordner
//     außer version.js selbst, Userscripts und Test-Konfigurationen). Zeilenenden werden angeglichen.
//   - Änderte sich die Prüfsumme gegenüber version.js, zählt `npm run stempel` die Build-Nummer hoch und setzt das Datum.
//     Ohne Änderung bleibt alles, wie es ist (idempotent).
//
// Nach jeder Änderung an einer geladenen Datei: `npm run stempel` ausführen (nach `npm run baseline`, falls nötig)
// und version.js mit committen. tests/version-stempel.test.js macht einen veralteten Stempel rot.
//
// Wiederfinden eines Standes: `git log -S"build: 187" --oneline -- version.js` bzw. `node tools/stempel.js --suche 187`.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const VERSION_JS = 'version.js';

// Dateien, die der Browser lädt. version.js zählt nicht mit (sonst ändert der Stempel seine eigene Prüfsumme).
function geladeneDateien(root) {
  const liste = [];
  for (const name of fs.readdirSync(root)) {
    const voll = path.join(root, name);
    if (!fs.statSync(voll).isFile()) continue;
    if (name === VERSION_JS) continue;
    if (name === 'index.html') { liste.push(name); continue; }
    if (!name.endsWith('.js')) continue;
    if (name.endsWith('.user.js') || /^vitest[.\w-]*\.js$/.test(name)) continue;
    liste.push(name);
  }
  const nova = path.join(root, 'nova');
  if (fs.existsSync(nova)) {
    for (const name of fs.readdirSync(nova)) {
      if (/\.(js|css)$/.test(name) && fs.statSync(path.join(nova, name)).isFile()) liste.push('nova/' + name);
    }
  }
  return liste.sort();
}

// 8 Hex-Zeichen; unabhängig von CRLF/LF (Windows-Arbeitskopie gegen LF im Repository)
function berechne(root) {
  const h = crypto.createHash('sha1');
  for (const name of geladeneDateien(root)) {
    h.update(name + '\0');
    h.update(fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 8);
}

function lies(root) {
  const pfad = path.join(root, VERSION_JS);
  if (!fs.existsSync(pfad)) return null;
  const q = fs.readFileSync(pfad, 'utf8');
  const build = /build:\s*(\d+)/.exec(q);
  const stand = /stand:\s*'([^']*)'/.exec(q);
  const quelle = /quelle:\s*'([0-9a-f]+)'/.exec(q);
  if (!build || !quelle) return null;
  return { build: Number(build[1]), stand: stand ? stand[1] : '', quelle: quelle[1] };
}

function jetzt() {
  const d = new Date(), z = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
}

// Erste Nummer: Anzahl der Commits (damit sie zur Historie passt), sonst 1
function startBuild(root) {
  try { return Number(execSync('git rev-list --count HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) + 1 || 1; }
  catch (e) { return 1; }
}

function quelltext(version, anzeige) {
  return anzeige.replace('%BUILD%', version.build).replace('%STAND%', version.stand).replace('%QUELLE%', version.quelle);
}

const VORLAGE = `// Versionsnummer des Tools (Einstellungen, Kopf des Panels). Wird von tools/stempel.js gepflegt – nicht von Hand ändern:
// \`npm run stempel\` zählt die Build-Nummer hoch, sobald sich eine geladene Datei geändert hat.
var BC_VERSION = { build: %BUILD%, stand: '%STAND%', quelle: '%QUELLE%' };
`;

// Anzeige-Code (läuft im Browser): schreibt die Nummer in #setVersion; Klick kopiert sie
const ANZEIGE = `
function bcVersionText() {
  var s = BC_VERSION.stand || '', t = s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) + ' ' + s.slice(11);
  return 'Version Build ' + BC_VERSION.build + ' · ' + t + ' · #' + BC_VERSION.quelle;
}
function bcVersionAnzeigen() {
  var el = document.getElementById('setVersion');
  if (el) el.textContent = bcVersionText();
}
function bcVersionKopieren() {
  var text = bcVersionText();
  try { navigator.clipboard.writeText(text); if (typeof showStatus === 'function') showStatus('📋 ' + text + ' kopiert', 'info'); } catch (e) {}
}
try { console.info('[BCK] ' + bcVersionText()); } catch (e) {}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bcVersionAnzeigen);
else bcVersionAnzeigen();
`;

// Stempelt, wenn nötig. Gibt { geaendert, version } zurück.
function stempeln(root) {
  const quelle = berechne(root);
  const alt = lies(root);
  if (alt && alt.quelle === quelle) return { geaendert: false, version: alt };
  const version = { build: alt ? alt.build + 1 : startBuild(root), stand: jetzt(), quelle };
  fs.writeFileSync(path.join(root, VERSION_JS), quelltext(version, VORLAGE) + ANZEIGE);
  return { geaendert: true, version };
}

// true, wenn version.js zum aktuellen Stand der geladenen Dateien passt
function aktuell(root) {
  const alt = lies(root);
  return !!alt && alt.quelle === berechne(root);
}

module.exports = { geladeneDateien, berechne, lies, stempeln, aktuell, VERSION_JS };

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const i = process.argv.indexOf('--suche');
  if (i !== -1) {
    const nr = process.argv[i + 1];
    try {
      process.stdout.write(execSync('git log -S"build: ' + nr + ',"  --format="%h %ad %s" --date=format:"%d.%m.%Y %H:%M" -- ' + VERSION_JS, { cwd: root }).toString() || 'Kein Commit gefunden.\n');
    } catch (e) { console.log('Suche fehlgeschlagen:', e.message); }
  } else if (process.argv.includes('--pruefen')) {
    const ok = aktuell(root);
    console.log(ok ? 'version.js ist aktuell.' : 'version.js ist veraltet – `npm run stempel` ausführen.');
    process.exit(ok ? 0 : 1);
  } else {
    const r = stempeln(root);
    console.log(r.geaendert ? 'version.js gestempelt: Build ' + r.version.build + ' · ' + r.version.stand + ' · #' + r.version.quelle
      : 'Unverändert: Build ' + r.version.build + ' · #' + r.version.quelle);
  }
}
