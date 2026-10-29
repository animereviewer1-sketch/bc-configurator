// Versionsnummer des Tools (Einstellungen, Kopf des Panels). Wird von tools/stempel.js gepflegt – nicht von Hand ändern:
// `npm run stempel` zählt die Build-Nummer hoch, sobald sich eine geladene Datei geändert hat.
var BC_VERSION = { build: 791, stand: '2026-10-29 14:52', quelle: 'c1e01864' };

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
