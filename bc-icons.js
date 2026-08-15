/* ══════════════════════════════════════════════════════════
   BC Konfigurator – Icon-Set
   Stroke-Icons im Stil des vorhandenen Einstellungen-Zahnrads
   (24er viewBox, stroke-width 1.8, currentColor).

   Einbinden:  <script src="bc-icons.js"></script>
   Nutzung:    bcIcon('zap')                 -> SVG-String
               <button class="btn btn-green" data-icon="zap">Laden</button>
               bcIconsApply();               -> ersetzt Emojis + data-icon
               bcIconsAuto();                -> hält dynamisch gerenderte UI aktuell
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var P = {
    zap:        '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    refresh:    '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    undo:       '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    trash:      '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    search:     '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    clock:      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    edit:       '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    home:       '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    copy:       '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    clipboard:  '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    play:       '<polygon points="5 3 19 12 5 21 5 3"/>',
    playCircle: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    forward:    '<polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/>',
    stop:       '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    pause:      '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    prev:       '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>',
    next:       '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
    camera:     '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    image:      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    warning:    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    scissors:   '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    archive:    '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>',
    chart:      '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    save:       '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    radio:      '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>',
    plus:       '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    close:      '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check:      '<polyline points="20 6 9 17 4 12"/>',
    folder:     '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    download:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    star:       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    sparkle:    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><line x1="18" y1="15" x2="18" y2="19"/><line x1="16" y1="17" x2="20" y2="17"/>',
    type:       '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    filter:     '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    sliders:    '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    grid:       '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    package:    '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22" x2="12" y2="12"/>',
    user:       '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users:      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    shirt:      '<path d="M16 3l4.5 2.6-2 4.4-2.5-1.2V21h-8V8.8L5.5 10l-2-4.4L8 3a4 4 0 0 0 8 0z"/>',
    lock:       '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock:     '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    login:      '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    logout:     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    cart:       '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    award:      '<circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    money:      '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    list:       '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    hash:       '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    bot:        '<rect x="4" y="8" width="16" height="12" rx="2"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1"/><line x1="9" y1="13" x2="9" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/>',
    wheel:      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="2" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="22" y2="12"/>',
    layers:     '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    wrench:     '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    orb:        '<circle cx="12" cy="10" r="7"/><path d="M9 8a3 3 0 0 1 3-3"/><line x1="6" y1="21" x2="18" y2="21"/>',
    eye:        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:     '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    ban:        '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    database:   '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    droplet:    '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    flask:      '<path d="M9 3h6"/><path d="M10 3v6L5.2 18a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L14 9V3"/>',
    new:        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    link:       '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    settings:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };

  /** Emoji -> Icon-Name. Basis für die automatische Migration. */
  var EMOJI = {
    '⚡': 'zap',        '🔄': 'refresh',   '🔃': 'refresh',   '⟳': 'refresh',
    '↺': 'undo',       '↩': 'undo',       '🗑️': 'trash',     '🗑': 'trash',
    '🔍': 'search',    '⏰': 'clock',     '📝': 'edit',      '✏️': 'edit',
    '✏': 'edit',       '🏠': 'home',      '📋': 'clipboard', '▶': 'play',
    '▶️': 'play',      '▶▶': 'forward',   '⏩': 'forward',   '⏹': 'stop',
    '⏸': 'pause',      '⏮': 'prev',       '⏭': 'next',       '📷': 'camera',
    '📸': 'camera',    '🖼️': 'image',     '🖼': 'image',     '⚠️': 'warning',
    '⚠': 'warning',    '💇': 'scissors',  '🗂️': 'archive',   '🗂': 'archive',
    '📊': 'chart',     '💾': 'save',      '📡': 'radio',     '➕': 'plus',
    '✕': 'close',      '✖': 'close',      '❌': 'close',     '✓': 'check',
    '✅': 'check',      '📂': 'folder',    '📁': 'folder',    '⬇️': 'download',
    '⬇': 'download',   '📤': 'download',  '⬆️': 'upload',    '⬆': 'upload',
    '📥': 'upload',    '⭐': 'star',      '✨': 'sparkle',   '🔤': 'type',
    '🎛': 'sliders',   '🎛️': 'sliders',   '🧩': 'grid',      '📦': 'package',
    '👤': 'user',      '🧍': 'user',      '👥': 'users',     '👗': 'shirt',
    '🔒': 'lock',      '🔓': 'unlock',    '👋': 'login',     '🚪': 'logout',
    '🛒': 'cart',      '🏆': 'award',     '💰': 'money',
    '🔢': 'hash',      '🤖': 'bot',       '🎡': 'wheel',     '🧬': 'layers',
    '🔧': 'wrench',    '🔮': 'orb',       '🧿': 'eye',       '👁️': 'eye',       '🙈': 'eyeOff',    '🚫': 'ban',
    '🎨': 'droplet',
    '🧪': 'flask',     '🆕': 'new',       '🔗': 'link',      '⚙️': 'settings',
    '⚙': 'settings',   '🎭': 'playCircle'
  };

  var EMOJI_RE = /(?:▶▶|[←-⇿⌀-➿⬀-⯿️\u{1F000}-\u{1FAFF}])+/gu;

  /** Selektoren, in denen Emojis automatisch ersetzt werden. */
  var SEL = 'button, .filter-chip, .tab-btn, .obertab-btn, .tweaks-btn, .stats-tab-btn';

  function bcIcon(name, size) {
    var p = P[name];
    if (!p) return '';
    var s = size || 16;
    return '<svg class="bci" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + p + '</svg>';
  }

  function iconNode(name) {
    var wrap = document.createElement('span');
    wrap.innerHTML = bcIcon(name);
    return wrap.firstChild;
  }

  function lookup(key) {
    return EMOJI[key] || EMOJI[key.replace(/️/g, '')] || null;
  }

  /**
   * Sucht den ersten Textknoten mit einem bekannten Emoji und entfernt es dort.
   * Textknoten statt innerHTML, damit Event-Listener und Attribute (title="🗑️ …")
   * unangetastet bleiben.
   */
  function stripLeadingEmoji(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      EMOJI_RE.lastIndex = 0;
      var m = EMOJI_RE.exec(node.nodeValue);
      if (!m) continue;
      var name = lookup(m[0].trim());
      if (!name) continue;
      node.nodeValue = (node.nodeValue.slice(0, m.index) + node.nodeValue.slice(m.index + m[0].length))
        .replace(/^\s+/, '');
      return name;
    }
    return null;
  }

  /**
   * Ersetzt in allen Buttons Emojis durch Icons.
   * - <button data-icon="zap">   -> Icon wird vorangestellt
   * - führendes Emoji im Text    -> passendes Icon aus EMOJI
   * Mehrfachaufruf ist sicher (bereits migrierte Buttons werden übersprungen).
   */
  function bcIconsApply(scope) {
    var root = scope || document;
    var els = root.querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.dataset.bciDone) continue;
      var name = el.dataset.icon || stripLeadingEmoji(el);
      if (!name || !P[name]) continue;
      el.insertBefore(iconNode(name), el.firstChild);
      el.dataset.bciDone = '1';
      if (!el.textContent.trim()) el.classList.add('btn-icon-only');
    }
  }

  var observer = null;
  var queued = false;

  /**
   * Hält dynamisch nachgerenderte Listen (Item-Grid, Bot-UI, Shop …) aktuell.
   * Der Observer wird während des eigenen Umbaus pausiert, damit die von
   * bcIconsApply erzeugten Mutationen keine Endlosschleife auslösen.
   */
  function bcIconsAuto() {
    if (observer) return observer;
    observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      // setTimeout statt requestAnimationFrame: rAF pausiert in Hintergrund-Tabs,
      // die Icons würden dort erst beim Zurückwechseln erscheinen.
      setTimeout(function () {
        queued = false;
        observer.disconnect();
        try { bcIconsApply(); }
        finally { observer.observe(document.body, { childList: true, subtree: true }); }
      }, 16);
    });
    bcIconsApply();
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  root.bcIcon = bcIcon;
  root.bcIconsApply = bcIconsApply;
  root.bcIconsAuto = bcIconsAuto;
  root.BC_ICONS = P;
  root.BC_ICON_EMOJI_MAP = EMOJI;
})(window);
