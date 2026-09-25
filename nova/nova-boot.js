/* ══════════════════════════════════════════════════════════
   BC Konfigurator – Oberfläche · Boot
   Läuft synchron im <head>, BEVOR der Body gezeichnet wird:
   setzt data-ui="nova" (alle Oberflächen-Regeln in nova/nova.css
   sind darunter gescoped) und die gemerkte Seitenleisten-Breite,
   damit beim Laden nichts springt. Das alte Design liegt im Branch
   archiv/klassisches-design.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var root = document.documentElement, side;
  try { side = localStorage.getItem('BC_UI_NovaSide'); } catch (e) {}
  root.setAttribute('data-ui', 'nova');
  if (side === 'collapsed') root.setAttribute('data-nv-side', 'collapsed');
  // Stylesheet mit Cache-Buster wie bei den JS-Modulen
  document.write('<link rel="stylesheet" href="nova/nova.css?_=' + Date.now() + '">');
})();
