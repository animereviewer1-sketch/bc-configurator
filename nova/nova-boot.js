/* ══════════════════════════════════════════════════════════
   BC Konfigurator – Nova Design · Boot
   Läuft synchron im <head>, BEVOR der Body gezeichnet wird:
   setzt data-ui="nova" | "classic" auf <html>, damit beim
   Laden kein Flackern zwischen altem und neuem Design entsteht.
   Umschalten zur Laufzeit übernimmt nova/nova.js.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = document.documentElement, d, side, bg;
  try {
    d    = localStorage.getItem('BC_UI_Design');
    side = localStorage.getItem('BC_UI_NovaSide');
    bg   = localStorage.getItem('BC_UI_NovaBg');
  } catch (e) {}
  root.setAttribute('data-ui', d === 'classic' ? 'classic' : 'nova');
  if (side === 'collapsed') root.setAttribute('data-nv-side', 'collapsed');
  if (bg === 'off') root.setAttribute('data-nv-bg', 'off');
  // Stylesheet mit Cache-Buster wie bei den JS-Modulen
  document.write('<link rel="stylesheet" href="nova/nova.css?_=' + Date.now() + '">');
})();
