/* ══════════════════════════════════════════════════════════
   BC Konfigurator – Nova Design · Laufzeit
   Legt sich als reine Präsentationsschicht über das bestehende
   DOM: keine IDs, Handler oder Daten werden verändert. Alles,
   was Nova hinzufügt, trägt .nv-only und ist im alten Design
   unsichtbar. Umschalten jederzeit ohne Neuladen.

   Bausteine:
     · Seitenleiste mit gleitender Aktiv-Pille (ersetzt Ober-/Untertabs)
     · Kopfzeile mit animiertem Seitentitel
     · Befehlspalette (Strg/⌘ K)
     · Toasts statt Statuspille (showStatus wird nur ergänzt)
     · WebGL-Aurora im Hintergrund (30 fps, pausiert wenn unsichtbar)
     · Mikro-Animationen via GSAP (vendor/gsap.min.js), CSS-Fallback
   Abhängigkeiten (weich): switchTab, showStatus, toggleTweaksPanel,
   bcIcon – jeweils per typeof geprüft.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DESIGN_KEY = 'BC_UI_Design';
  var SIDE_KEY   = 'BC_UI_NovaSide';
  var BG_KEY     = 'BC_UI_NovaBg';
  var root = document.documentElement;
  var G = window.gsap || null;
  var RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function isNova() { return root.getAttribute('data-ui') === 'nova'; }
  function canAnim() { return !!G && isNova() && !RM.matches; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ico(name, size) {
    if (typeof bcIcon === 'function') { var s = bcIcon(name, size || 16); if (s) return s; }
    return '';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  // ── Tab-Metadaten ────────────────────────────────────────
  var GROUPS = [
    { id: 'items', label: 'Items & Outfits', tabs: ['items', 'outfit', 'curse', 'outfit-scan', 'lscg-wheel', 'outfit-import', 'locks'] },
    { id: 'bots',  label: 'Bots & Systeme',  tabs: ['bot', 'shop', 'rank', 'money', 'itemdefs', 'inventar', 'log', 'spieler', 'variablen', 'scan'] }
  ];
  var TABS = {
    'items':         { t: 'Item Manager',     i: 'wrench',    d: 'Items wählen, färben, konfigurieren und anlegen' },
    'outfit':        { t: 'Outfit & Profile', i: 'shirt',     d: 'Outfits zusammenstellen, Profile sichern, Code erzeugen' },
    'curse':         { t: 'Craft & Curse',    i: 'orb',       d: 'Gecraftete und verfluchte Items im Überblick' },
    'outfit-scan':   { t: 'LSCG Outfits',     i: 'layers',    d: 'Gescannte LSCG-Outfits durchsuchen und anwenden' },
    'lscg-wheel':    { t: 'MBS Wheel',        i: 'wheel',     d: 'Glücksrad-Outfits aus MBS verwalten' },
    'outfit-import': { t: 'Outfit Import',    i: 'upload',    d: 'Outfit-Codes aus BC einlesen und prüfen' },
    'locks':         { t: 'Locks',            i: 'lock',      d: 'Schlösser, Timer und Restlaufzeiten' },
    'bot':           { t: 'Bot',              i: 'bot',       d: 'Bots aus Triggern, Aktionen und Events bauen' },
    'shop':          { t: 'Shop',             i: 'cart',      d: 'Kaufbare Artikel, Preise und Kaufverlauf' },
    'rank':          { t: 'Rang',             i: 'award',     d: 'Ränge definieren und Spielern zuweisen' },
    'money':         { t: 'Money',            i: 'money',     d: 'Kontostände der Spieler verwalten' },
    'itemdefs':      { t: 'Items',            i: 'gift',      d: 'Eigene Item-Definitionen für Shop und Inventar' },
    'inventar':      { t: 'Inventar',         i: 'package',   d: 'Inventare und Keywarden der Spieler' },
    'log':           { t: 'Logs',             i: 'clipboard', d: 'Bot-Protokoll mit Filtern' },
    'spieler':       { t: 'Spieler',          i: 'user',      d: 'Live-Daten der Spieler im Raum' },
    'variablen':     { t: 'Variablen',        i: 'hash',      d: 'Bot-Variablen live beobachten' },
    'scan':          { t: 'Scan',             i: 'search',    d: 'Spiel-Snapshots vergleichen und exportieren' }
  };
  function groupOf(tab) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].tabs.indexOf(tab) >= 0) return GROUPS[i];
    return GROUPS[0];
  }
  function currentTab() {
    try { if (typeof _activeTab !== 'undefined' && TABS[_activeTab]) return _activeTab; } catch (e) {}
    var a = $('.tab-pane.active');
    return a ? a.id.replace(/^tab-/, '') : 'items';
  }

  // ══════════════════════════════════════════════════════════
  //  SHELL AUFBAUEN
  // ══════════════════════════════════════════════════════════
  var sidebar, nav, pill, crumbTitle, crumbGroup, crumbDesc, scrim, toastBox, cmdk;

  function buildSidebar() {
    var navHtml = '<div class="nv-pill"></div>';
    GROUPS.forEach(function (g) {
      navHtml += '<div class="nv-nav-sec">' + esc(g.label) + '</div>';
      g.tabs.forEach(function (t) {
        var m = TABS[t];
        navHtml += '<button class="nv-nav-item" data-tab="' + t + '" title="' + esc(m.t + ' – ' + m.d) + '">' +
          '<span class="nv-ico">' + ico(m.i, 17) + '</span><span class="nv-lbl">' + esc(m.t) + '</span>' +
          '<span class="nv-count"></span></button>';
      });
    });
    sidebar = h(
      '<aside class="nv-sidebar nv-only" id="nvSidebar" aria-label="Navigation">' +
        '<div class="nv-brand">' +
          '<div class="nv-brand-mark"><img src="bc-logo.svg" alt=""></div>' +
          '<div class="nv-brand-text"><div class="nv-brand-name">Konfigurator</div><div class="nv-brand-ver" id="nvVer">BC Universal</div></div>' +
        '</div>' +
        '<button class="nv-search" data-nv="palette" title="Befehlspalette (Strg/⌘ K)">' + ico('search', 15) +
          '<span>Suchen…</span><kbd>' + (isMac() ? '⌘' : 'Strg') + ' K</kbd></button>' +
        '<nav class="nv-nav">' + navHtml + '</nav>' +
        '<div class="nv-side-foot">' +
          '<div class="nv-foot-row">' +
            '<div class="nv-conn" id="nvConn" title="Verbindungsstatus"><span class="nv-orb"></span><span class="nv-conn-txt">Nicht verbunden</span></div>' +
            '<button class="nv-icon-btn" data-nv="settings" title="Einstellungen">' + ico('settings', 17) + '</button>' +
          '</div>' +
          segHtml() +
        '</div>' +
      '</aside>'
    );
    document.body.insertBefore(sidebar, document.body.firstChild);
    nav = $('.nv-nav', sidebar);
    pill = $('.nv-pill', sidebar);
  }

  function segHtml() {
    return '<div class="nv-seg" data-v="' + (isNova() ? 'nova' : 'classic') + '" role="radiogroup" aria-label="Design">' +
      '<span class="nv-seg-thumb"></span>' +
      '<button data-design="classic" role="radio" title="Altes Design">' + ico('grid', 13) + 'Klassisch</button>' +
      '<button data-design="nova" role="radio" title="Neues Design">' + ico('sparkle', 13) + 'Nova</button>' +
    '</div>';
  }

  function buildTopbar() {
    var topbar = $('.topbar');
    if (!topbar) return;
    var crumb = h(
      '<div class="nv-crumb nv-only">' +
        '<button class="nv-icon-btn nv-side-collapse" data-nv="collapse" title="Seitenleiste ein-/ausklappen">' + ico('sliders', 17) + '</button>' +
        '<div class="nv-crumb-text">' +
          '<div class="nv-crumb-group"><i></i><span id="nvGroup"></span></div>' +
          '<div class="nv-crumb-row"><div class="nv-crumb-title"><span id="nvTitle"></span></div><div class="nv-crumb-desc" id="nvDesc"></div></div>' +
        '</div>' +
      '</div>'
    );
    topbar.insertBefore(crumb, topbar.firstChild);
    crumbTitle = $('#nvTitle'); crumbGroup = $('#nvGroup'); crumbDesc = $('#nvDesc');

    var right = $('.topbar-right', topbar);
    if (right) {
      right.insertBefore(h('<button class="nv-top-search nv-only" data-nv="palette" title="Befehlspalette (Strg/⌘ K)">' +
        ico('search', 14) + '<span>Befehle</span><kbd class="nv-kbd">' + (isMac() ? '⌘' : 'Strg') + ' K</kbd></button>'), right.firstChild);
      // Einstieg ins neue Design aus dem alten heraus
      var gear = $('#tweaksBtnToggle', right);
      var classicBtn = h('<button class="topbar-icon-btn nv-classic-only nv-classic-toggle" data-design="nova" title="Neues Design (Nova) ausprobieren">' + ico('sparkle', 16) + '</button>');
      right.insertBefore(classicBtn, gear || null);
    }
  }

  function buildTweaksSection() {
    var panel = $('#tweaksPanel');
    if (!panel) return;
    var sec = h(
      '<div class="nv-tw-design">' +
        '<div class="tweaks-section-title">Design</div>' +
        segHtml() +
        '<div class="nv-tw-row nv-only"><span>Hintergrund-Animation</span><button class="nv-switch" data-nv="bg" role="switch" aria-checked="' + (root.getAttribute('data-nv-bg') === 'off' ? 'false' : 'true') + '" title="Aurora-Hintergrund an/aus"></button></div>' +
        '<div class="nv-tw-row nv-only"><span>Seitenleiste kompakt</span><button class="nv-switch" data-nv="collapse-sw" role="switch" aria-checked="' + (root.getAttribute('data-nv-side') === 'collapsed' ? 'true' : 'false') + '" title="Nur Icons zeigen"></button></div>' +
      '</div>'
    );
    panel.insertBefore(sec, panel.firstChild);
  }

  function buildLayers() {
    scrim = h('<div class="nv-scrim" data-nv="scrim"></div>');
    toastBox = h('<div class="nv-toasts" aria-live="polite"></div>');
    document.body.appendChild(scrim);
    document.body.appendChild(toastBox);
    document.body.appendChild(h('<div class="nv-grain nv-only" aria-hidden="true"></div>'));
    document.body.appendChild(h('<div class="nv-vignette nv-only" aria-hidden="true"></div>'));
  }

  function isMac() { return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent); }

  // ══════════════════════════════════════════════════════════
  //  NAVIGATION: Aktiv-Zustand, Pille, Titel
  // ══════════════════════════════════════════════════════════
  var lastTab = null;

  function movePill(instant) {
    if (!nav || !pill) return;
    var act = $('.nv-nav-item.active[data-tab]', nav);
    if (!act) { pill.style.opacity = '0'; return; }
    var y = act.offsetTop, hgt = act.offsetHeight;
    if (G && !instant && !RM.matches && isNova()) {
      G.to(pill, { y: y, height: hgt, opacity: 1, duration: 0.55, ease: 'expo.out', overwrite: true });
      G.fromTo(pill, { scaleX: 0.94 }, { scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
    } else {
      if (G) G.set(pill, { y: y, height: hgt, opacity: 1 });
      else { pill.style.transform = 'translateY(' + y + 'px)'; pill.style.height = hgt + 'px'; pill.style.opacity = '1'; }
    }
    // aktiven Eintrag in Sichtweite halten
    var nr = nav.getBoundingClientRect(), ar = act.getBoundingClientRect();
    if (ar.top < nr.top || ar.bottom > nr.bottom) act.scrollIntoView({ block: 'nearest', behavior: RM.matches ? 'auto' : 'smooth' });
  }

  function setHeader(tab, animate) {
    var m = TABS[tab] || { t: tab, d: '' };
    var g = groupOf(tab);
    if (!crumbTitle) return;
    crumbGroup.textContent = g.label;
    crumbDesc.textContent = m.d || '';
    crumbTitle.textContent = m.t;
    if (animate && canAnim()) {
      G.fromTo(crumbTitle, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
      G.fromTo([crumbGroup, crumbDesc], { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.06, delay: 0.05 });
    }
    document.title = m.t + ' · BC Konfigurator';
  }

  function animatePane(tab) {
    if (!canAnim()) return;
    var pane = document.getElementById('tab-' + tab);
    if (!pane) return;
    // Transform nur kurz – position:fixed-Kinder (Modale) dürfen nicht dauerhaft daran hängen
    G.fromTo(pane, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' });
    var cards = $$('.section, .import-box, .bot-sidebar, .rank-cfg, .shop-cfg, .outfit-right', pane)
      .filter(function (el) { return el.offsetParent !== null; }).slice(0, 14);
    if (cards.length) {
      G.fromTo(cards, { opacity: 0, y: 16, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out', stagger: 0.035, delay: 0.04, clearProps: 'transform,opacity' });
    }
  }

  function markNav(tab, instant) {
    $$('.nv-nav-item[data-tab]', sidebar).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    movePill(instant);
  }

  function onTab(tab, animate) {
    if (!TABS[tab]) return;
    // Während navigate() läuft, haben Seitenleiste und Titel schon reagiert,
    // das Einblenden übernimmt hideLoader() – hier nur den Zustand merken.
    if (navBusy) { lastTab = tab; return; }
    markNav(tab, !animate);
    setHeader(tab, animate && tab !== lastTab);
    if (animate && tab !== lastTab) animatePane(tab);
    lastTab = tab;
  }

  // ══════════════════════════════════════════════════════════
  //  LADEZUSTAND BEIM TAB-WECHSEL
  //  Nur für Wechsel aus Seitenleiste/Befehlspalette. switchTab()
  //  selbst bleibt synchron, weil anderer Code direkt nach dem Aufruf
  //  mit dem neuen Tab weiterarbeitet (z. B. „zum Outfit hinzufügen“).
  //  Ablauf: Inhalt ausblenden + Ladebalken zeigen → zeichnen lassen →
  //  Original-switchTab rendert (blockiert den Hauptthread; Balken und
  //  Spinner laufen als CSS-Animation auf dem Compositor weiter) →
  //  verzögerte Renderer (setTimeout 0) und sichtbare Bilder abwarten →
  //  fertigen Inhalt auf einmal einblenden.
  // ══════════════════════════════════════════════════════════
  var navBusy = false, navToken = 0, loader = null, progress = null, loaderTimer = 0;
  var fastTabs = {};          // Tabs, deren Render zuletzt < FAST_MS dauerte → ohne Ladebildschirm
  var FAST_MS = 60, MAX_WAIT_MS = 6000, IMG_WAIT_MS = 900;

  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  function waitImages(tab, max) {
    var pane = document.getElementById('tab-' + tab);
    if (!pane) return Promise.resolve();
    var imgs = $$('img', pane).filter(function (i) { return !i.complete && i.offsetParent !== null; }).slice(0, 40);
    if (!imgs.length) return Promise.resolve();
    var all = Promise.all(imgs.map(function (i) {
      return new Promise(function (r) { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); });
    }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, max); })]);
  }

  function buildLoader() {
    progress = h('<div class="nv-progress nv-only" aria-hidden="true"><i></i></div>');
    loader = h('<div class="nv-loader nv-only" role="status" aria-live="polite">' +
      '<div class="nv-loader-card">' +
        '<div class="nv-loader-ring"><span class="nv-loader-ico"></span></div>' +
        '<div class="nv-loader-txt"></div>' +
        '<div class="nv-loader-skel"><i></i><i></i><i></i></div>' +
      '</div></div>');
    document.body.appendChild(progress);
    document.body.appendChild(loader);
  }

  function showLoader(tab) {
    var m = TABS[tab] || { t: tab, i: 'clock' };
    $('.nv-loader-ico', loader).innerHTML = ico(m.i, 22);
    $('.nv-loader-txt', loader).textContent = m.t + ' wird geladen…';
    // Animationen neu starten
    progress.classList.remove('on', 'done'); loader.classList.remove('on');
    void progress.offsetWidth;
    progress.classList.add('on');
    loader.classList.add('on');
    root.setAttribute('data-nv-loading', '1');
  }

  function hideLoader(tab) {
    clearTimeout(loaderTimer);
    progress.classList.add('done');
    loader.classList.remove('on');
    root.removeAttribute('data-nv-loading');
    setTimeout(function () { if (!root.hasAttribute('data-nv-loading')) progress.classList.remove('on', 'done'); }, 450);
    if (tab) animatePane(tab);
  }

  function navigate(tab) {
    if (typeof window.switchTab !== 'function' || !TABS[tab]) return;
    var cur = currentTab();
    if (!isNova() || tab === cur) { window.switchTab(tab); return; }

    // Schnelle Tabs direkt wechseln – ein Ladebildschirm wäre hier nur ein Flackern
    if (fastTabs[tab]) {
      var f0 = performance.now();
      window.switchTab(tab);
      if (performance.now() - f0 > FAST_MS) delete fastTabs[tab];
      return;
    }

    var my = ++navToken;
    navBusy = true;
    markNav(tab, false);
    setHeader(tab, true);
    showLoader(tab);
    // Notbremse: nie länger als MAX_WAIT_MS im Ladezustand hängen
    clearTimeout(loaderTimer);
    loaderTimer = setTimeout(function () { if (my === navToken) { navBusy = false; hideLoader(tab); } }, MAX_WAIT_MS);

    nextFrame().then(nextFrame).then(function () {
      if (my !== navToken) return;
      var t0 = performance.now();
      try { window.switchTab(tab); }
      catch (e) { console.warn('[Nova] Tab-Wechsel:', e); }
      // verzögerte Renderer aus switchTab (setTimeout 0) + Bilder abwarten
      return tick().then(tick).then(function () {
        // Render-Zeit inkl. verzögerter Renderer, ohne Bild-Wartezeit
        var dt = performance.now() - t0;
        return waitImages(tab, IMG_WAIT_MS).then(function () {
          if (my !== navToken) return;
          if (dt < FAST_MS) fastTabs[tab] = true; else delete fastTabs[tab];
          navBusy = false;
          lastTab = tab;
          hideLoader(tab);
        });
      });
    }).catch(function (e) {
      console.warn('[Nova] Ladezustand:', e);
      if (my === navToken) { navBusy = false; hideLoader(tab); }
    });
  }

  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function' || window.switchTab._nv) return;
    var orig = window.switchTab;
    var wrapped = function (tab) {
      var r = orig.apply(this, arguments);
      try { onTab(tab, true); } catch (e) { console.warn('[Nova] Tab-Sync:', e); }
      return r;
    };
    wrapped._nv = true;
    window.switchTab = wrapped;
  }

  // ── Zähler aus den (versteckten) Original-Tabs spiegeln ──
  function syncCounts() {
    Object.keys(TABS).forEach(function (t) {
      var src = document.getElementById('tab-' + t + '-btn');
      var dst = $('.nv-nav-item[data-tab="' + t + '"] .nv-count', sidebar);
      if (!src || !dst) return;
      var m = /\((\d+)\)\s*$/.exec(src.textContent.trim());
      var n = m ? m[1] : '';
      var show = n && n !== '0';
      if (dst.textContent !== (show ? n : '')) {
        dst.textContent = show ? n : '';
        dst.classList.toggle('has', !!show);
        if (show && canAnim()) G.fromTo(dst, { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      }
    });
  }

  // ── Verbindung + Engine-Version spiegeln ──
  var wasOn = null;
  function syncConn() {
    var src = $('#connStatus'), dst = $('#nvConn');
    if (!src || !dst) return;
    var on = src.getAttribute('data-conn') === 'on';
    dst.setAttribute('data-on', on ? '1' : '0');
    $('.nv-conn-txt', dst).textContent = src.textContent.trim() || (on ? 'Verbunden' : 'Nicht verbunden');
    dst.title = src.textContent.trim();
    if (wasOn === false && on && canAnim()) burst($('.nv-orb', dst), '#34d399');
    wasOn = on;
  }
  function syncVersion() {
    var v = $('#engineVer'), dst = $('#nvVer');
    if (!v || !dst) return;
    var txt = v.textContent.replace(/^[\s|·-]+/, '').trim();
    if (txt) dst.textContent = txt;
  }

  // Kleines Partikel-Feuerwerk (z. B. beim Verbinden)
  function burst(el, color) {
    if (!el || !canAnim()) return;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('span');
      p.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:9999;background:' + color + ';box-shadow:0 0 8px ' + color;
      document.body.appendChild(p);
      var a = (Math.PI * 2 * i) / 14, d = 26 + Math.random() * 26;
      G.to(p, { x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.2, duration: 0.8 + Math.random() * 0.4, ease: 'power3.out',
        onComplete: (function (n) { return function () { n.remove(); }; })(p) });
    }
  }

  // ══════════════════════════════════════════════════════════
  //  TOASTS (ergänzen showStatus, ersetzen es nicht)
  // ══════════════════════════════════════════════════════════
  var TOAST_ICON = { success: 'check', error: 'warning', info: 'bulb' };
  function toast(msg, type) {
    if (!isNova() || !toastBox || !msg) return;
    type = type || 'info';
    var clean = String(msg).replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '') || String(msg);
    // gleiche Meldung erneut → vorhandenen Toast auffrischen statt stapeln
    var last = toastBox.lastElementChild;
    if (last && last._msg === clean) { last._restart && last._restart(); return; }
    var el = h('<div class="nv-toast" role="status" data-type="' + esc(type) + '">' +
      '<span class="nv-toast-dot">' + ico(TOAST_ICON[type] || 'bulb', 15) + '</span>' +
      '<span class="nv-toast-msg"></span><span class="nv-toast-bar"></span></div>');
    $('.nv-toast-msg', el).textContent = clean;
    el._msg = clean;
    toastBox.appendChild(el);
    while (toastBox.children.length > 4) toastBox.firstElementChild.remove();

    var bar = $('.nv-toast-bar', el), tl = null, timer = null;
    function close() {
      clearTimeout(timer); if (tl) tl.kill();
      if (G && !RM.matches) G.to(el, { x: 40, opacity: 0, height: 0, marginTop: -10, paddingTop: 0, paddingBottom: 0, duration: 0.4, ease: 'power3.in', onComplete: function () { el.remove(); } });
      else el.remove();
    }
    el._restart = function () {
      clearTimeout(timer); if (tl) tl.kill();
      if (G) { tl = G.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: 4, ease: 'none', onComplete: close }); }
      else timer = setTimeout(close, 4000);
    };
    el.addEventListener('click', close);
    el.addEventListener('mouseenter', function () { if (tl) tl.pause(); });
    el.addEventListener('mouseleave', function () { if (tl) tl.resume(); });
    if (G && !RM.matches) G.fromTo(el, { x: 60, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
    el._restart();
  }
  function hookStatus() {
    if (typeof window.showStatus !== 'function' || window.showStatus._nv) return;
    var orig = window.showStatus;
    var wrapped = function (msg, type) {
      var r = orig.apply(this, arguments);
      try { toast(msg, type); } catch (e) {}
      return r;
    };
    wrapped._nv = true;
    window.showStatus = wrapped;
  }

  // ══════════════════════════════════════════════════════════
  //  BEFEHLSPALETTE
  // ══════════════════════════════════════════════════════════
  function fn(name) { return typeof window[name] === 'function' ? window[name] : null; }
  function commands() {
    var list = [];
    GROUPS.forEach(function (g) {
      g.tabs.forEach(function (t) {
        list.push({ sec: 'Springen zu', t: TABS[t].t, d: TABS[t].d, i: TABS[t].i, run: function () { navigate(t); } });
      });
    });
    var A = [
      ['loadCacheFromBC',     'Aus Spiel laden',            'Item-Daten aus dem laufenden Bondage Club holen', 'zap'],
      ['manualReconnect',     'Verbinden',                  'Verbindung zum Spiel neu herstellen',           'refresh'],
      ['scanRoom',            'Raum scannen',               'Spieler im aktuellen Raum neu einlesen',        'users'],
      ['triggerGameScan',     'Spiel scannen',              'Read-only-Snapshot des Spiels speichern',       'search'],
      ['exportAllData',       'Komplett-Backup exportieren','Alle Daten in eine Datei sichern',              'download'],
      ['exportScreenshotsOnly','Screenshots exportieren',   'Alle Bild-Sammlungen als JSON sichern',         'camera'],
      ['itemsExportCatalog',  'Item-Katalog exportieren',   'Alle Items mit Bild-URLs als JSON',             'package']
    ];
    A.forEach(function (a) {
      var f = fn(a[0]);
      if (f) list.push({ sec: 'Aktionen', t: a[1], d: a[2], i: a[3], run: function () { f(); } });
    });
    if (fn('bcBackupJetzt')) list.push({ sec: 'Aktionen', t: 'Backup jetzt schreiben', d: 'Sofortiges Voll-Backup in den gewählten Ordner', i: 'save',
      run: function () { var p = window.bcBackupJetzt(); if (p && p.then && fn('_bcBackupZeigeStatus')) p.then(window._bcBackupZeigeStatus); } });
    list.push({ sec: 'Oberfläche', t: 'Einstellungen öffnen', d: 'Theme, Akzentfarbe, Backups, Speicher', i: 'settings', run: openSettings });
    list.push({ sec: 'Oberfläche', t: 'Zum klassischen Design wechseln', d: 'Das alte Layout – jederzeit umkehrbar', i: 'grid', run: function () { setDesign('classic'); } });
    list.push({ sec: 'Oberfläche', t: 'Seitenleiste ein-/ausklappen', d: 'Nur Icons oder volle Beschriftung', i: 'sliders', run: toggleCollapse });
    list.push({ sec: 'Oberfläche', t: 'Hintergrund-Animation an/aus', d: 'WebGL-Aurora hinter der Oberfläche', i: 'sparkle', run: toggleBg });
    return list;
  }

  function score(q, s) {
    // Teilfolgen-Suche mit Bonus für Wortanfänge und zusammenhängende Treffer
    if (!q) return { s: 1, m: [] };
    var ql = q.toLowerCase(), sl = s.toLowerCase(), qi = 0, sc = 0, prev = -2, marks = [];
    for (var i = 0; i < sl.length && qi < ql.length; i++) {
      if (sl[i] === ql[qi]) {
        sc += 1 + (i === prev + 1 ? 2 : 0) + (i === 0 || /[\s&\-/]/.test(sl[i - 1]) ? 3 : 0);
        marks.push(i); prev = i; qi++;
      }
    }
    return qi === ql.length ? { s: sc - s.length * 0.01, m: marks } : null;
  }
  function markup(s, marks) {
    if (!marks.length) return esc(s);
    var out = '', set = {};
    marks.forEach(function (i) { set[i] = 1; });
    for (var i = 0; i < s.length; i++) out += set[i] ? '<mark>' + esc(s[i]) + '</mark>' : esc(s[i]);
    return out;
  }

  var cmdItems = [], cmdSel = 0, cmdOpenedFrom = null;
  function buildPalette() {
    cmdk = h(
      '<div class="nv-cmdk nv-only" data-nv="cmdk-bg" role="dialog" aria-modal="true" aria-label="Befehlspalette">' +
        '<div class="nv-cmdk-box">' +
          '<div class="nv-cmdk-head">' + ico('search', 18) + '<input type="text" placeholder="Wohin oder was? z. B. „shop“, „backup“, „laden“…" autocomplete="off" spellcheck="false"><kbd class="nv-kbd">Esc</kbd></div>' +
          '<div class="nv-cmdk-list" role="listbox"></div>' +
          '<div class="nv-cmdk-foot"><span><kbd class="nv-kbd">↑</kbd><kbd class="nv-kbd">↓</kbd> wählen</span><span><kbd class="nv-kbd">↵</kbd> ausführen</span><span><kbd class="nv-kbd">Esc</kbd> schließen</span></div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(cmdk);
    var input = $('input', cmdk);
    input.addEventListener('input', function () { cmdSel = 0; renderPalette(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); selPalette(cmdSel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selPalette(cmdSel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runPalette(cmdSel); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    cmdk.addEventListener('mousedown', function (e) { if (e.target === cmdk) closePalette(); });
    $('.nv-cmdk-list', cmdk).addEventListener('click', function (e) {
      var b = e.target.closest('.nv-cmdk-item'); if (b) runPalette(+b.getAttribute('data-i'));
    });
    $('.nv-cmdk-list', cmdk).addEventListener('mousemove', function (e) {
      var b = e.target.closest('.nv-cmdk-item'); if (b && +b.getAttribute('data-i') !== cmdSel) selPalette(+b.getAttribute('data-i'), true);
    });
  }
  function renderPalette(q) {
    q = (q || '').trim();
    var all = commands(), res = [];
    all.forEach(function (c) {
      var a = score(q, c.t), b = q ? score(q, c.d) : null;
      if (a || (b && q.length > 2)) res.push({ c: c, s: a ? a.s + 5 : b.s * 0.5, m: a ? a.m : [] });
    });
    if (q) res.sort(function (x, y) { return y.s - x.s; });
    cmdItems = res;
    var list = $('.nv-cmdk-list', cmdk), html = '', sec = null;
    if (!res.length) html = '<div class="nv-cmdk-empty">Nichts gefunden für „' + esc(q) + '“</div>';
    res.forEach(function (r, i) {
      var s = q ? 'Treffer' : r.c.sec;
      if (s !== sec) { html += '<div class="nv-cmdk-sec">' + esc(s) + '</div>'; sec = s; }
      html += '<button class="nv-cmdk-item' + (i === cmdSel ? ' sel' : '') + '" data-i="' + i + '" role="option">' +
        '<span class="nv-ico">' + ico(r.c.i, 15) + '</span>' +
        '<span class="nv-cmdk-t">' + markup(r.c.t, r.m) + '<small>' + esc(r.c.d || '') + '</small></span>' +
        '<span class="nv-enter">↵</span></button>';
    });
    list.innerHTML = html;
  }
  function selPalette(i, noScroll) {
    if (!cmdItems.length) return;
    cmdSel = (i + cmdItems.length) % cmdItems.length;
    $$('.nv-cmdk-item', cmdk).forEach(function (b) { b.classList.toggle('sel', +b.getAttribute('data-i') === cmdSel); });
    var s = $('.nv-cmdk-item.sel', cmdk);
    if (s && !noScroll) s.scrollIntoView({ block: 'nearest' });
  }
  function runPalette(i) {
    var r = cmdItems[i]; if (!r) return;
    closePalette(true);
    setTimeout(function () { try { r.c.run(); } catch (e) { console.warn('[Nova] Befehl:', e); } }, 60);
  }
  function openPalette() {
    if (!isNova() || !cmdk) return;
    if (cmdk.classList.contains('open')) { closePalette(); return; }
    cmdOpenedFrom = document.activeElement;
    cmdSel = 0;
    var input = $('input', cmdk); input.value = '';
    renderPalette('');
    cmdk.classList.add('open');
    input.focus();
    if (canAnim()) {
      G.fromTo(cmdk, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
      G.fromTo($('.nv-cmdk-box', cmdk), { y: -14, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' });
      G.fromTo($$('.nv-cmdk-item', cmdk).slice(0, 10), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.02, ease: 'power3.out', delay: 0.06 });
    }
  }
  function closePalette(ran) {
    if (!cmdk || !cmdk.classList.contains('open')) return;
    var done = function () {
      cmdk.classList.remove('open');
      if (!ran && cmdOpenedFrom && cmdOpenedFrom.focus) try { cmdOpenedFrom.focus(); } catch (e) {}
    };
    if (canAnim()) {
      G.to($('.nv-cmdk-box', cmdk), { y: -8, scale: 0.98, opacity: 0, duration: 0.18, ease: 'power2.in' });
      G.to(cmdk, { opacity: 0, duration: 0.2, onComplete: done });
    } else done();
  }

  // ══════════════════════════════════════════════════════════
  //  DESIGN-UMSCHALTER, SEITENLEISTE, HINTERGRUND
  // ══════════════════════════════════════════════════════════
  function setDesign(mode, originEl) {
    mode = mode === 'classic' ? 'classic' : 'nova';
    if (root.getAttribute('data-ui') === mode) return;
    store(DESIGN_KEY, mode);
    var apply = function () {
      root.setAttribute('data-ui', mode);
      $$('.nv-seg').forEach(function (s) { s.setAttribute('data-v', mode); });
      $$('.nv-seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-design') === mode); });
      if (mode !== 'nova') closePalette(true);
      updateScrim();
      measureChrome();
    };
    var after = function () {
      if (mode === 'nova') {
        bg.start();
        onTab(currentTab(), false);
        movePill(true);
        if (canAnim()) {
          G.fromTo('.nv-sidebar', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out', clearProps: 'transform,opacity' });
          G.fromTo('.nv-nav-item', { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.018, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity' });
          animatePane(currentTab());
        }
      } else bg.stop();
    };
    // Kreisförmige Enthüllung ab dem Klickpunkt (View Transitions API)
    if (document.startViewTransition && !RM.matches) {
      var r = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
      var x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2;
      var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(apply);
      vt.ready.then(function () {
        root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
      vt.finished.then(after, after);
    } else { apply(); after(); }
  }

  function toggleCollapse() {
    var c = root.getAttribute('data-nv-side') === 'collapsed';
    if (c) root.removeAttribute('data-nv-side'); else root.setAttribute('data-nv-side', 'collapsed');
    store(SIDE_KEY, c ? 'open' : 'collapsed');
    $$('[data-nv="collapse-sw"]').forEach(function (s) { s.setAttribute('aria-checked', c ? 'false' : 'true'); });
    setTimeout(function () { movePill(true); }, 60);
    setTimeout(function () { movePill(true); }, 520);
  }
  function toggleBg() {
    var off = root.getAttribute('data-nv-bg') !== 'off';
    if (off) { root.setAttribute('data-nv-bg', 'off'); bg.stop(); } else { root.removeAttribute('data-nv-bg'); bg.start(); }
    store(BG_KEY, off ? 'off' : 'on');
    $$('[data-nv="bg"]').forEach(function (s) { s.setAttribute('aria-checked', off ? 'false' : 'true'); });
  }
  function openSettings() {
    var p = $('#tweaksPanel');
    if (p && !p.classList.contains('open') && typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel();
  }

  // ── Scrim + Einblendung der Einstellungen ──
  function updateScrim() {
    var p = $('#tweaksPanel');
    var open = !!(p && p.classList.contains('open'));
    if (scrim) scrim.classList.toggle('on', open && isNova());
  }
  var panelWasOpen = false;
  function onPanelChange() {
    var p = $('#tweaksPanel'); if (!p) return;
    var open = p.classList.contains('open');
    updateScrim();
    if (open && !panelWasOpen && canAnim()) {
      G.fromTo(Array.prototype.slice.call(p.children, 0, 12), { opacity: 0, x: 24 },
        { opacity: 1, x: 0, duration: 0.55, stagger: 0.03, ease: 'expo.out', delay: 0.08, clearProps: 'transform,opacity' });
    }
    panelWasOpen = open;
  }

  // ── Höhe von Kopfzeile + Raumleiste messen → Arbeitsflächen füllen den Rest ──
  function measureChrome() {
    if (!isNova()) return;
    var tb = $('.topbar'), rp = $('#roomPanel'), rl = $('#roomLeiste');
    var hgt = (tb ? tb.offsetHeight : 64) + (rp && rp.offsetParent ? rp.offsetHeight + 12 : 0) +
      (rl && rl.offsetParent ? rl.offsetHeight + 8 : 0) + 12 + 16;
    root.style.setProperty('--nv-chrome', hgt + 'px');
  }

  // ── Akzent-Farbton aus den Tweaks übernehmen ──
  function syncHue() {
    var hue = parseFloat(root.getAttribute('data-accent-hue'));
    if (isNaN(hue)) hue = 58;
    root.style.setProperty('--nv-h', String(hue));
    bg.setHue(hue);
  }

  // ══════════════════════════════════════════════════════════
  //  WEBGL-AURORA
  // ══════════════════════════════════════════════════════════
  var bg = (function () {
    var canvas, gl, prog, uRes, uTime, uMouse, uC1, uC2, uC3, raf = 0, running = false, t0 = performance.now(), last = 0;
    var mouse = [0.5, 0.8], mouseT = [0.5, 0.8], hue = 58, SCALE = 0.25, FRAME = 1000 / 20;

    function oklch(L, C, H) {
      var a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
      var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
      var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
      var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
      var rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                 -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                 -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
      return rgb.map(function (x) { x = Math.max(0, Math.min(1, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; });
    }
    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FS = [
      'precision mediump float;',
      'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform vec3 uC1,uC2,uC3;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/uRes;vec2 p=uv;p.x*=uRes.x/uRes.y;',
      ' float t=uTime*.035;',
      ' vec2 q=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(3.1-t*.8,t)));',
      ' vec2 r=vec2(fbm(p*1.7+q*1.8+vec2(1.7,9.2)+t*1.2),fbm(p*1.7+q*1.8+vec2(8.3,2.8)-t));',
      ' float f=fbm(p*1.1+r*1.5+(uMouse-.5)*.25);',
      ' float top=smoothstep(.05,1.,uv.y);',
      ' vec3 col=vec3(.022,.025,.04);',
      ' col=mix(col,uC1*.62,smoothstep(.42,1.,f)*(.25+.75*top));',
      ' col=mix(col,uC2*.55,smoothstep(.5,1.05,r.x)*.6*top);',
      ' col=mix(col,uC3*.45,smoothstep(.55,1.,q.y)*.35);',
      ' float d=distance(uv,uMouse);col+=uC1*.07*smoothstep(.55,0.,d);',
      ' col*=mix(.35,1.,smoothstep(0.,.95,uv.y));',
      ' col+=(hash(gl_FragCoord.xy+uTime)-.5)*.012;',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    function init() {
      if (canvas) return !!gl;
      canvas = document.createElement('canvas');
      canvas.className = 'nv-bg nv-only';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(canvas, document.body.firstChild);
      try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch (e) { gl = null; }
      if (!gl) { canvas.style.background = 'radial-gradient(80% 60% at 30% 0%, oklch(40% .12 var(--nv-h) / .5), transparent 70%), radial-gradient(60% 50% at 80% 10%, oklch(40% .14 calc(var(--nv-h) + 48) / .4), transparent 70%), #06070b'; canvas.classList.add('ready'); return false; }
      function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[Nova] Shader:', gl.getShaderInfoLog(s)); return null; } return s; }
      var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) { gl = null; return false; }
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uRes = gl.getUniformLocation(prog, 'uRes'); uTime = gl.getUniformLocation(prog, 'uTime'); uMouse = gl.getUniformLocation(prog, 'uMouse');
      uC1 = gl.getUniformLocation(prog, 'uC1'); uC2 = gl.getUniformLocation(prog, 'uC2'); uC3 = gl.getUniformLocation(prog, 'uC3');
      canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); });
      resize(); colors();
      addEventListener('resize', resize);
      addEventListener('pointermove', function (e) { mouseT = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });
      document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else if (wanted()) start(); });
      // Popup neben dem Spiel: ohne Fokus steht das Bild still, damit das Spiel die Grafikleistung bekommt
      addEventListener('blur', function () { pause(); });
      addEventListener('focus', function () { if (wanted()) start(); });
      return true;
    }
    function resize() {
      if (!gl) return;
      canvas.width = Math.max(1, Math.round(innerWidth * SCALE)); canvas.height = Math.max(1, Math.round(innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!running) draw(performance.now());
    }
    function colors() {
      if (!gl) return;
      gl.useProgram(prog);
      gl.uniform3fv(uC1, oklch(0.62, 0.16, hue));
      gl.uniform3fv(uC2, oklch(0.55, 0.19, hue + 48));
      gl.uniform3fv(uC3, oklch(0.5, 0.13, hue - 40));
    }
    function draw(now) {
      if (!gl) return;
      mouse[0] += (mouseT[0] - mouse[0]) * 0.04; mouse[1] += (mouseT[1] - mouse[1]) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - last < FRAME) return;
      last = now; draw(now);
    }
    function wanted() { return isNova() && root.getAttribute('data-nv-bg') !== 'off'; }
    function start() {
      if (!wanted()) return;
      var ok = init();
      canvas.classList.add('ready');
      if (!ok) return;
      if (RM.matches || document.hidden || (document.hasFocus && !document.hasFocus())) { draw(performance.now()); return; }
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    }
    function pause() { running = false; cancelAnimationFrame(raf); }
    function stop() { pause(); }
    return { start: start, stop: stop, setHue: function (h) { hue = h; colors(); if (gl && !running) draw(performance.now()); } };
  })();

  // ══════════════════════════════════════════════════════════
  //  MIKRO-INTERAKTIONEN
  // ══════════════════════════════════════════════════════════
  var RIPPLE_SEL = '.btn, .btn-sync, .tweaks-btn, .btn-copy, .nv-nav-item, .nv-search, .nv-top-search, .nv-cmdk-item';
  function onPointerDown(e) {
    if (!isNova() || RM.matches || e.button !== 0) return;
    var b = e.target.closest && e.target.closest(RIPPLE_SEL);
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    var s = document.createElement('span');
    s.className = 'nv-ripple';
    s.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left) + 'px;top:' + (e.clientY - r.top) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 750);
  }

  var spotRaf = 0, spotEv = null;
  function onPointerMove(e) {
    if (!isNova()) return;
    spotEv = e;
    if (spotRaf) return;
    spotRaf = requestAnimationFrame(function () {
      spotRaf = 0;
      var ev = spotEv, t = ev.target && ev.target.closest && ev.target.closest('.section, .import-box');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      t.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  }

  function onClick(e) {
    var el = e.target.closest && e.target.closest('[data-nv], [data-tab], [data-design]');
    if (!el) return;
    if (el.hasAttribute('data-design')) { e.preventDefault(); setDesign(el.getAttribute('data-design'), el); return; }
    if (el.hasAttribute('data-tab') && el.classList.contains('nv-nav-item')) {
      var t = el.getAttribute('data-tab');
      navigate(t);
      return;
    }
    switch (el.getAttribute('data-nv')) {
      case 'palette': openPalette(); break;
      case 'settings': if (typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel(); break;
      case 'collapse': case 'collapse-sw': toggleCollapse(); break;
      case 'bg': toggleBg(); break;
      case 'scrim': if (typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel(); break;
    }
  }

  function onKey(e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'k') {
      if (!isNova()) return;
      e.preventDefault(); openPalette(); return;
    }
    if (k === 'escape' && isNova()) {
      var p = $('#tweaksPanel');
      if (cmdk && cmdk.classList.contains('open')) return; // Palette behandelt Esc selbst
      if (p && p.classList.contains('open') && typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel();
    }
  }

  // ══════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════
  function init() {
    if (window.__nvReady) return;
    window.__nvReady = true;
    buildSidebar();
    buildTopbar();
    buildTweaksSection();
    buildLayers();
    buildPalette();
    buildLoader();
    $$('.nv-seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-design') === root.getAttribute('data-ui')); });

    hookSwitchTab();
    hookStatus();

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });

    // Beobachter: Zähler, Verbindung, Version, Tweaks-Panel, Akzentfarbe
    var tabNav = $('.tab-nav');
    var countRaf = 0;
    if (tabNav) new MutationObserver(function () {
      if (countRaf) return;
      countRaf = requestAnimationFrame(function () { countRaf = 0; syncCounts(); });
    }).observe(tabNav, { subtree: true, childList: true, characterData: true });
    var cs = $('#connStatus');
    if (cs) new MutationObserver(syncConn).observe(cs, { attributes: true, childList: true, characterData: true, subtree: true });
    var ev = $('#engineVer');
    if (ev) new MutationObserver(syncVersion).observe(ev, { childList: true, characterData: true, subtree: true });
    var tp = $('#tweaksPanel');
    if (tp) new MutationObserver(onPanelChange).observe(tp, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncHue).observe(root, { attributes: true, attributeFilter: ['data-accent-hue', 'data-theme'] });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { measureChrome(); });
      ['.topbar', '#roomPanel', '#roomLeiste'].forEach(function (s) { var el = $(s); if (el) ro.observe(el); });
    }
    addEventListener('resize', function () { measureChrome(); movePill(true); });
    RM.addEventListener && RM.addEventListener('change', function () { if (isNova()) bg.start(); });

    syncHue(); syncCounts(); syncConn(); syncVersion(); measureChrome();
    onTab(currentTab(), false);
    lastTab = currentTab();
    // Schriften können die Zeilenhöhen verschieben → Pille nachziehen
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { movePill(true); measureChrome(); });
    setTimeout(function () { movePill(true); syncVersion(); measureChrome(); }, 400);

    if (isNova()) {
      bg.start();
      if (canAnim()) {
        G.from('.nv-sidebar', { x: -24, opacity: 0, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity' });
        G.from('.nv-nav-item, .nv-nav-sec', { x: -10, opacity: 0, duration: 0.6, stagger: 0.015, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity' });
        G.from('.topbar > *', { y: -8, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.15, clearProps: 'transform,opacity' });
        animatePane(currentTab());
      }
    }
  }

  // Öffentliche Mini-API (Konsole / andere Module)
  window.novaUI = { setDesign: setDesign, openPalette: openPalette, toast: toast, toggleCollapse: toggleCollapse, toggleBg: toggleBg };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
