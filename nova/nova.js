/* ══════════════════════════════════════════════════════════
   BC Konfigurator – Oberfläche (Nova) · Laufzeit
   Schlanke Präsentationsschicht über dem bestehenden DOM: keine
   IDs, Handler oder Daten werden verändert.

   Leitlinie Performance (das Tool läuft neben dem Spiel):
     · Nichts läuft im Leerlauf – keine Dauer-Animationen, kein
       Canvas/WebGL, keine rAF-Schleifen, keine Maus-Handler.
     · Animationen nur per CSS auf transform/opacity (Compositor).
     · DOM-Beobachter schauen nur auf winzige Bereiche.

   Bausteine: Seitenleiste mit Zählern · Seitentitel · Befehlspalette
   (Strg/⌘ K) · Toasts · Ladezustand beim Tab-Wechsel.
   Abhängigkeiten (weich, per typeof geprüft): switchTab, showStatus,
   toggleTweaksPanel, bcIcon.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SIDE_KEY = 'BC_UI_NovaSide';
  var root = document.documentElement;

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
  function isMac() { return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent); }
  // CSS-Animation erneut abspielen (Klasse kurz entfernen)
  function replay(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

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
  var sidebar, nav, pill, crumbTitle, crumbGroup, crumbDesc, crumbBox, scrim, toastBox, cmdk, loader, progress;

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
      '<aside class="nv-sidebar" id="nvSidebar" aria-label="Navigation">' +
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
        '</div>' +
      '</aside>'
    );
    document.body.insertBefore(sidebar, document.body.firstChild);
    nav = $('.nv-nav', sidebar);
    pill = $('.nv-pill', sidebar);
  }

  function buildTopbar() {
    var topbar = $('.topbar');
    if (!topbar) return;
    crumbBox = h(
      '<div class="nv-crumb">' +
        '<button class="nv-icon-btn nv-side-collapse" data-nv="collapse" title="Seitenleiste ein-/ausklappen">' + ico('sliders', 17) + '</button>' +
        '<div class="nv-crumb-text">' +
          '<div class="nv-crumb-group"><i></i><span id="nvGroup"></span></div>' +
          '<div class="nv-crumb-row"><div class="nv-crumb-title"><span id="nvTitle"></span></div><div class="nv-crumb-desc" id="nvDesc"></div></div>' +
        '</div>' +
      '</div>'
    );
    topbar.insertBefore(crumbBox, topbar.firstChild);
    crumbTitle = $('#nvTitle'); crumbGroup = $('#nvGroup'); crumbDesc = $('#nvDesc');
    var right = $('.topbar-right', topbar);
    if (right) {
      right.insertBefore(h('<button class="nv-top-search" data-nv="palette" title="Befehlspalette (Strg/⌘ K)">' +
        ico('search', 14) + '<span>Befehle</span><kbd class="nv-kbd">' + (isMac() ? '⌘' : 'Strg') + ' K</kbd></button>'), right.firstChild);
    }
  }

  function buildTweaksSection() {
    var panel = $('#tweaksPanel');
    if (!panel) return;
    panel.insertBefore(h(
      '<div class="nv-tw-design">' +
        '<div class="tweaks-section-title">Oberfläche</div>' +
        '<div class="nv-tw-row"><span>Seitenleiste kompakt</span><button class="nv-switch" data-nv="collapse" role="switch" aria-checked="' +
          (root.getAttribute('data-nv-side') === 'collapsed' ? 'true' : 'false') + '" title="Nur Icons zeigen"></button></div>' +
      '</div>'), panel.firstChild);
  }

  function buildLayers() {
    scrim = h('<div class="nv-scrim" data-nv="scrim"></div>');
    toastBox = h('<div class="nv-toasts" aria-live="polite"></div>');
    progress = h('<div class="nv-progress" aria-hidden="true"><i></i></div>');
    loader = h('<div class="nv-loader" role="status" aria-live="polite">' +
      '<div class="nv-loader-card">' +
        '<div class="nv-loader-ring"><span class="nv-loader-ico"></span></div>' +
        '<div class="nv-loader-txt"></div>' +
      '</div></div>');
    [scrim, toastBox, progress, loader].forEach(function (el) { document.body.appendChild(el); });
  }

  // ══════════════════════════════════════════════════════════
  //  NAVIGATION: Aktiv-Zustand, Pille, Titel
  // ══════════════════════════════════════════════════════════
  var lastTab = null;

  function movePill() {
    if (!nav || !pill) return;
    var act = $('.nv-nav-item.active[data-tab]', nav);
    if (!act) { pill.style.opacity = '0'; return; }
    // transform statt top → Compositor, kein Layout
    pill.style.transform = 'translateY(' + act.offsetTop + 'px)';
    pill.style.height = act.offsetHeight + 'px';
    pill.style.opacity = '1';
    var nr = nav.getBoundingClientRect(), ar = act.getBoundingClientRect();
    if (ar.top < nr.top || ar.bottom > nr.bottom) act.scrollIntoView({ block: 'nearest' });
  }

  function markNav(tab) {
    $$('.nv-nav-item[data-tab]', sidebar).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    movePill();
  }

  function setHeader(tab, animate) {
    var m = TABS[tab] || { t: tab, d: '' };
    if (!crumbTitle) return;
    crumbGroup.textContent = groupOf(tab).label;
    crumbDesc.textContent = m.d || '';
    crumbTitle.textContent = m.t;
    if (animate) replay(crumbBox, 'nv-swap');
    document.title = m.t + ' · BC Konfigurator';
  }

  function enterPane(tab) {
    var pane = document.getElementById('tab-' + tab);
    if (pane) replay(pane, 'nv-enter');
  }

  function onTab(tab, animate) {
    if (!TABS[tab]) return;
    // Während navigate() läuft, haben Leiste und Titel schon reagiert
    if (navBusy) { lastTab = tab; return; }
    markNav(tab);
    var changed = tab !== lastTab;
    setHeader(tab, animate && changed);
    if (animate && changed) enterPane(tab);
    lastTab = tab;
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

  // ══════════════════════════════════════════════════════════
  //  LADEZUSTAND BEIM TAB-WECHSEL
  //  Nur für Wechsel aus Seitenleiste/Befehlspalette. switchTab()
  //  selbst bleibt synchron, weil anderer Code direkt nach dem Aufruf
  //  mit dem neuen Tab weiterarbeitet (z. B. „zum Outfit hinzufügen“).
  //  Ablauf: Inhalt ausblenden + Ladebalken → zeichnen lassen →
  //  switchTab rendert (Balken/Spinner laufen als CSS-Animation auf
  //  dem Compositor weiter) → verzögerte Renderer abwarten → einblenden.
  //  Schnelle Tabs (< FAST_MS) wechseln ab dem zweiten Mal direkt.
  // ══════════════════════════════════════════════════════════
  var navBusy = false, navToken = 0, loaderTimer = 0;
  var fastTabs = {};
  var FAST_MS = 60, MAX_WAIT_MS = 6000;

  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  function showLoader(tab) {
    var m = TABS[tab] || { t: tab, i: 'clock' };
    $('.nv-loader-ico', loader).innerHTML = ico(m.i, 22);
    $('.nv-loader-txt', loader).textContent = m.t + ' wird geladen…';
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
    if (tab) enterPane(tab);
  }

  function navigate(tab) {
    if (typeof window.switchTab !== 'function' || !TABS[tab]) return;
    if (tab === currentTab()) { window.switchTab(tab); return; }
    if (fastTabs[tab]) {
      var f0 = performance.now();
      window.switchTab(tab);
      if (performance.now() - f0 > FAST_MS) delete fastTabs[tab];
      return;
    }
    var my = ++navToken;
    navBusy = true;
    markNav(tab);
    setHeader(tab, true);
    showLoader(tab);
    clearTimeout(loaderTimer);
    loaderTimer = setTimeout(function () { if (my === navToken) { navBusy = false; hideLoader(tab); } }, MAX_WAIT_MS);

    nextFrame().then(nextFrame).then(function () {
      if (my !== navToken) return;
      var t0 = performance.now();
      try { window.switchTab(tab); } catch (e) { console.warn('[Nova] Tab-Wechsel:', e); }
      return tick().then(tick).then(function () {
        if (my !== navToken) return;
        if (performance.now() - t0 < FAST_MS) fastTabs[tab] = true; else delete fastTabs[tab];
        navBusy = false;
        lastTab = tab;
        hideLoader(tab);
      });
    }).catch(function (e) {
      console.warn('[Nova] Ladezustand:', e);
      if (my === navToken) { navBusy = false; hideLoader(tab); }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  SPIEGELUNGEN (Zähler, Verbindung, Version)
  // ══════════════════════════════════════════════════════════
  function syncCounts() {
    Object.keys(TABS).forEach(function (t) {
      var src = document.getElementById('tab-' + t + '-btn');
      var dst = $('.nv-nav-item[data-tab="' + t + '"] .nv-count', sidebar);
      if (!src || !dst) return;
      var m = /\((\d+)\)\s*$/.exec(src.textContent.trim());
      var n = m && m[1] !== '0' ? m[1] : '';
      if (dst.textContent !== n) { dst.textContent = n; dst.classList.toggle('has', !!n); }
    });
  }

  function syncConn() {
    var src = $('#connStatus'), dst = $('#nvConn');
    if (!src || !dst) return;
    var on = src.getAttribute('data-conn') === 'on';
    var txt = src.textContent.trim() || (on ? 'Verbunden' : 'Nicht verbunden');
    dst.setAttribute('data-on', on ? '1' : '0');
    var t = $('.nv-conn-txt', dst);
    if (t.textContent !== txt) t.textContent = txt;
    dst.title = txt;
  }

  function syncVersion() {
    var v = $('#engineVer'), dst = $('#nvVer');
    if (!v || !dst) return;
    var txt = v.textContent.replace(/^[\s|·-]+/, '').trim();
    if (txt && dst.textContent !== txt) dst.textContent = txt;
  }

  // ══════════════════════════════════════════════════════════
  //  TOASTS (ergänzen showStatus, ersetzen es nicht)
  //  Reine CSS-Animationen; Fortschrittsbalken pausiert bei Hover.
  // ══════════════════════════════════════════════════════════
  var TOAST_ICON = { success: 'check', error: 'warning', info: 'bulb' };
  var TOAST_MS = 4000;
  function toast(msg, type) {
    if (!toastBox || !msg) return;
    type = type || 'info';
    var clean = String(msg).replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '') || String(msg);
    var last = toastBox.lastElementChild;
    if (last && last._msg === clean && !last.classList.contains('out')) { last._restart(); return; }
    var el = h('<div class="nv-toast" role="status" data-type="' + esc(type) + '">' +
      '<span class="nv-toast-dot">' + ico(TOAST_ICON[type] || 'bulb', 15) + '</span>' +
      '<span class="nv-toast-msg"></span><span class="nv-toast-bar"></span></div>');
    $('.nv-toast-msg', el).textContent = clean;
    el._msg = clean;
    var bar = $('.nv-toast-bar', el);
    function close() {
      if (el.classList.contains('out')) return;
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 220);
    }
    el._restart = function () { replay(bar, 'run'); };
    bar.addEventListener('animationend', close);
    el.addEventListener('click', close);
    toastBox.appendChild(el);
    while (toastBox.children.length > 4) toastBox.firstElementChild.remove();
    bar.style.animationDuration = TOAST_MS + 'ms';
    bar.classList.add('run');
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
    [
      ['loadCacheFromBC',      'Aus Spiel laden',             'Item-Daten aus dem laufenden Bondage Club holen', 'zap'],
      ['manualReconnect',      'Verbinden',                   'Verbindung zum Spiel neu herstellen',           'refresh'],
      ['scanRoom',             'Raum scannen',                'Spieler im aktuellen Raum neu einlesen',        'users'],
      ['triggerGameScan',      'Spiel scannen',               'Read-only-Snapshot des Spiels speichern',       'search'],
      ['exportAllData',        'Komplett-Backup exportieren', 'Alle Daten in eine Datei sichern',              'download'],
      ['exportScreenshotsOnly','Screenshots exportieren',     'Alle Bild-Sammlungen als JSON sichern',         'camera'],
      ['itemsExportCatalog',   'Item-Katalog exportieren',    'Alle Items mit Bild-URLs als JSON',             'package'],
      ['importLscgOutfits',    'Nur LSCG-Outfits wiederherstellen', 'Aus Backup-Dateien (auch sehr große) nur die Outfits zurückholen', 'layers']
    ].forEach(function (a) {
      var f = fn(a[0]);
      if (f) list.push({ sec: 'Aktionen', t: a[1], d: a[2], i: a[3], run: function () { f(); } });
    });
    if (fn('bcBackupJetzt')) list.push({ sec: 'Aktionen', t: 'Backup jetzt schreiben', d: 'Sofortiges Voll-Backup in den gewählten Ordner', i: 'save',
      run: function () { var p = window.bcBackupJetzt(); if (p && p.then && fn('_bcBackupZeigeStatus')) p.then(window._bcBackupZeigeStatus); } });
    list.push({ sec: 'Oberfläche', t: 'Einstellungen öffnen', d: 'Theme, Akzentfarbe, Backups, Speicher', i: 'settings', run: openSettings });
    list.push({ sec: 'Oberfläche', t: 'Seitenleiste ein-/ausklappen', d: 'Nur Icons oder volle Beschriftung', i: 'sliders', run: toggleCollapse });
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
      '<div class="nv-cmdk" role="dialog" aria-modal="true" aria-label="Befehlspalette">' +
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
    var list = $('.nv-cmdk-list', cmdk);
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.nv-cmdk-item'); if (b) runPalette(+b.getAttribute('data-i'));
    });
    list.addEventListener('mousemove', function (e) {
      var b = e.target.closest('.nv-cmdk-item'); if (b && +b.getAttribute('data-i') !== cmdSel) selPalette(+b.getAttribute('data-i'), true);
    });
  }
  function renderPalette(q) {
    q = (q || '').trim();
    var res = [];
    commands().forEach(function (c) {
      var a = score(q, c.t), b = q ? score(q, c.d) : null;
      if (a || (b && q.length > 2)) res.push({ c: c, s: a ? a.s + 5 : b.s * 0.5, m: a ? a.m : [] });
    });
    if (q) res.sort(function (x, y) { return y.s - x.s; });
    cmdItems = res;
    var html = '', sec = null;
    if (!res.length) html = '<div class="nv-cmdk-empty">Nichts gefunden für „' + esc(q) + '“</div>';
    res.forEach(function (r, i) {
      var s = q ? 'Treffer' : r.c.sec;
      if (s !== sec) { html += '<div class="nv-cmdk-sec">' + esc(s) + '</div>'; sec = s; }
      html += '<button class="nv-cmdk-item' + (i === cmdSel ? ' sel' : '') + '" data-i="' + i + '" role="option">' +
        '<span class="nv-ico">' + ico(r.c.i, 15) + '</span>' +
        '<span class="nv-cmdk-t">' + markup(r.c.t, r.m) + '<small>' + esc(r.c.d || '') + '</small></span>' +
        '<span class="nv-enter">↵</span></button>';
    });
    $('.nv-cmdk-list', cmdk).innerHTML = html;
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
    setTimeout(function () { try { r.c.run(); } catch (e) { console.warn('[Nova] Befehl:', e); } }, 0);
  }
  function openPalette() {
    if (!cmdk) return;
    if (cmdk.classList.contains('open')) { closePalette(); return; }
    cmdOpenedFrom = document.activeElement;
    cmdSel = 0;
    var input = $('input', cmdk); input.value = '';
    renderPalette('');
    cmdk.classList.add('open');
    input.focus();
  }
  function closePalette(ran) {
    if (!cmdk || !cmdk.classList.contains('open')) return;
    cmdk.classList.remove('open');
    if (!ran && cmdOpenedFrom && cmdOpenedFrom.focus) try { cmdOpenedFrom.focus(); } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════
  //  SEITENLEISTE, EINSTELLUNGEN, MASSE
  // ══════════════════════════════════════════════════════════
  function toggleCollapse() {
    var c = root.getAttribute('data-nv-side') === 'collapsed';
    if (c) root.removeAttribute('data-nv-side'); else root.setAttribute('data-nv-side', 'collapsed');
    store(SIDE_KEY, c ? 'open' : 'collapsed');
    $$('.nv-switch[data-nv="collapse"]').forEach(function (s) { s.setAttribute('aria-checked', c ? 'false' : 'true'); });
    movePill();
  }
  function openSettings() {
    var p = $('#tweaksPanel');
    if (p && !p.classList.contains('open') && typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel();
  }
  function onPanelChange() {
    var p = $('#tweaksPanel');
    if (scrim) scrim.classList.toggle('on', !!(p && p.classList.contains('open')));
  }

  // Höhe von Kopfzeile + Raumleiste → Arbeitsflächen füllen den Rest
  var chromePx = -1;
  function measureChrome() {
    var tb = $('.topbar'), rp = $('#roomPanel'), rl = $('#roomLeiste');
    var hgt = (tb ? tb.offsetHeight : 64) + (rp && rp.offsetParent ? rp.offsetHeight + 12 : 0) +
      (rl && rl.offsetParent ? rl.offsetHeight + 8 : 0) + 12 + 16;
    if (hgt !== chromePx) { chromePx = hgt; root.style.setProperty('--nv-chrome', hgt + 'px'); }
  }

  // Akzent-Farbton aus den Tweaks übernehmen
  function syncHue() {
    var hue = parseFloat(root.getAttribute('data-accent-hue'));
    root.style.setProperty('--nv-h', String(isNaN(hue) ? 58 : hue));
  }

  // ── Ereignisse (delegiert, keine Maus-Bewegungs-Handler) ──
  function onClick(e) {
    var el = e.target.closest && e.target.closest('[data-nv], .nv-nav-item[data-tab]');
    if (!el) return;
    if (el.hasAttribute('data-tab')) { navigate(el.getAttribute('data-tab')); return; }
    switch (el.getAttribute('data-nv')) {
      case 'palette': openPalette(); break;
      case 'settings': case 'scrim': if (typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel(); break;
      case 'collapse': toggleCollapse(); break;
    }
  }
  function onKey(e) {
    var k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && k === 'k') { e.preventDefault(); openPalette(); return; }
    if (k === 'escape') {
      if (cmdk && cmdk.classList.contains('open')) return; // Palette behandelt Esc selbst
      var p = $('#tweaksPanel');
      if (p && p.classList.contains('open') && typeof window.toggleTweaksPanel === 'function') window.toggleTweaksPanel();
    }
  }

  // ══════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════
  function observe(sel, cb, opts) {
    var el = $(sel);
    if (el) new MutationObserver(cb).observe(el, opts);
  }
  function init() {
    if (window.__nvReady) return;
    window.__nvReady = true;
    buildSidebar();
    buildTopbar();
    buildTweaksSection();
    buildLayers();
    buildPalette();
    hookSwitchTab();
    hookStatus();

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    // Beobachter nur auf kleine Bereiche; Zähler gebündelt pro Frame
    var countRaf = 0;
    observe('.tab-nav', function () {
      if (countRaf) return;
      countRaf = requestAnimationFrame(function () { countRaf = 0; syncCounts(); });
    }, { subtree: true, childList: true, characterData: true });
    observe('#connStatus', syncConn, { attributes: true, childList: true, characterData: true, subtree: true });
    observe('#engineVer', syncVersion, { childList: true, characterData: true, subtree: true });
    observe('#tweaksPanel', onPanelChange, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncHue).observe(root, { attributes: true, attributeFilter: ['data-accent-hue'] });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(measureChrome);
      ['.topbar', '#roomPanel', '#roomLeiste'].forEach(function (s) { var el = $(s); if (el) ro.observe(el); });
    }
    addEventListener('resize', function () { measureChrome(); movePill(); });

    syncHue(); syncCounts(); syncConn(); syncVersion(); measureChrome();
    onTab(currentTab(), false);
    lastTab = currentTab();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { movePill(); measureChrome(); });
    setTimeout(function () { movePill(); syncVersion(); measureChrome(); }, 400);
  }

  window.novaUI = { openPalette: openPalette, toast: toast, toggleCollapse: toggleCollapse, navigate: navigate };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
