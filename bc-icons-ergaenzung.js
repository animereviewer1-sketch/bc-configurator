/* ══════════════════════════════════════════════════════════
   bc-icons – Ergänzung 2
   Deckt die Symbole ab, die noch nicht ersetzt waren:
   Sektions-Titel (<h3>), Filter-Chips, Select-Optionen,
   Info-/Warn-Boxen, Badges, Placeholders, Raum-Leiste.

   Nach bc-icons.js laden:
     <script src="bc-icons.js"></script>
     <script src="bc-icons-ergaenzung.js"></script>
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (!root.BC_ICONS) { console.warn('[bc-icons] Ergänzung ohne bc-icons.js geladen'); return; }

  Object.assign(root.BC_ICONS, {
    target:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    pin:        '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.6"/>',
    chat:       '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.9-.4L4 21l1.4-4.1A8.1 8.1 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/>',
    whisper:    '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    portal:     '<ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M21 12c0 5-4 9-9 9"/><path d="M12 3c-5 0-9 4-9 9"/>',
    card:       '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>',
    loop:       '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    pointer:    '<path d="M5 3l14 9-6 1 3.5 6.5-2.6 1.4L10.4 14 5 18z"/>',
    dice:       '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
    gift:       '<rect x="3" y="8" width="18" height="13" rx="2"/><line x1="12" y1="8" x2="12" y2="21"/><line x1="3" y1="13" x2="21" y2="13"/><path d="M12 8 9.5 5.5a2 2 0 1 1 2.5-1zM12 8l2.5-2.5a2 2 0 1 0-2.5-1z"/>',
    trending:   '<polyline points="22 7 13.5 15.5 9 11 2 18"/><polyline points="16 7 22 7 22 13"/>',
    tshirt:     '<path d="M8 3 4 5.5 6 10l2-.8V21h8V9.2l2 .8 2-4.5L16 3z"/><path d="M8 3a4 4 0 0 0 8 0"/>',
    book:       '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z"/><line x1="8" y1="7" x2="16" y2="7"/>',
    clapper:    '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 8 5.5 3l16 2.2L20 8z"/><line x1="9" y1="4" x2="7.5" y2="8"/><line x1="14" y1="4.7" x2="12.5" y2="8"/>',
    hourglass:  '<path d="M7 3h10"/><path d="M7 21h10"/><path d="M8 3v3.5L12 11l4-4.5V3"/><path d="M8 21v-3.5L12 13l4 4.5V21"/>',
    question:   '<circle cx="12" cy="12" r="10"/><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 2-2.8 2.3-2.8 4"/><line x1="12" y1="17.5" x2="12.01" y2="17.5"/>',
    branch:     '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    flag:       '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    heart:      '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    burst:      '<polygon points="13 2 4 13 10 13 8 22 18 10 12 10 13 2"/>',
    key:        '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.8 12.2 21 2"/><line x1="16.5" y1="6.5" x2="19.5" y2="9.5"/>',
    medal:      '<circle cx="12" cy="15" r="6"/><path d="M9 3h6l-1.6 5.4"/><path d="M9 3l1.6 5.4"/><path d="M12 12.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    map:        '<polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/>',
    ruler:      '<rect x="2" y="8" width="20" height="8" rx="2" transform="rotate(-45 12 12)"/><line x1="9" y1="9" x2="10.5" y2="10.5"/><line x1="12" y1="12" x2="13.5" y2="13.5"/>',
    timer:      '<circle cx="12" cy="13" r="8"/><polyline points="12 9.5 12 13 14.5 14.5"/><line x1="9.5" y1="2.5" x2="14.5" y2="2.5"/><line x1="12" y1="2.5" x2="12" y2="5"/>',
    shield:     '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/>',
    crown:      '<path d="M3 18h18l-1.5-9-4.5 4L12 6 9 13 4.5 9z"/><line x1="3" y1="21" x2="21" y2="21"/>',
    hat:        '<ellipse cx="12" cy="17" rx="9" ry="3"/><path d="M7 17V8a5 5 0 0 1 10 0v9"/>',
    flower:     '<circle cx="12" cy="12" r="2.6"/><path d="M12 9.4C12 6.8 10.6 5 12 3c1.4 2 0 3.8 0 6.4z"/><path d="M12 14.6c0 2.6 1.4 4.4 0 6.4-1.4-2 0-3.8 0-6.4z"/><path d="M9.4 12C6.8 12 5 13.4 3 12c2-1.4 3.8 0 6.4 0z"/><path d="M14.6 12c2.6 0 4.4-1.4 6.4 0-2 1.4-3.8 0-6.4 0z"/>',
    devil:      '<path d="M4 8c0-2.5 3.6-4.5 8-4.5S20 5.5 20 8v3a8 8 0 0 1-16 0z"/><path d="M4 8 2.5 3.5 6 5.5M20 8l1.5-4.5L18 5.5"/><line x1="9" y1="11" x2="9.01" y2="11"/><line x1="15" y1="11" x2="15.01" y2="11"/>',
    lockPlus:   '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="15" x2="12" y2="18"/><line x1="10.5" y1="16.5" x2="13.5" y2="16.5"/>',
    volume:     '<polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 6a9 9 0 0 1 0 12"/>',
    code:       '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    bulb:       '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.5.4-.5 1.1-.5 1.6v.5H9v-.5c0-.5 0-1.2-.5-1.6A6 6 0 0 1 12 3z"/>',
    checkbox:   '<rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12.5 11 15.5 16.5 9"/>',
    caretDown:  '<polyline points="6 9 12 15 18 9"/>',
    xCircle:    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    party:      '<path d="M3 21l6.5-16 11.5 11.5z"/><line x1="14" y1="3" x2="14.01" y2="3"/><line x1="19" y1="6" x2="19.01" y2="6"/><line x1="21" y1="11" x2="21.01" y2="11"/>',
    rope:       '<path d="M12 21c-4 0-4-5 0-5s4-5 0-5-4-5 0-5"/><path d="M12 21c4 0 4-5 0-5s-4-5 0-5 4-5 0-5"/>'
  });

  Object.assign(root.BC_ICON_EMOJI_MAP, {
    '🎯': 'target',   '📍': 'pin',       '💬': 'chat',     '🤫': 'whisper',
    '🌀': 'portal',   '💳': 'card',      '🔁': 'loop',     '🖱': 'pointer',
    '🖱️': 'pointer',  '🎲': 'dice',      '🎁': 'gift',     '📈': 'trending',
    '👕': 'tshirt',   '📖': 'book',      '🎬': 'clapper',  '⏳': 'hourglass',
    '❓': 'question',  '❔': 'question',   '🔀': 'branch',   '🏁': 'flag',
    '💗': 'heart',    '💕': 'heart',     '💥': 'burst',    '🔑': 'key',
    '🥉': 'medal',    '🥈': 'medal',     '🥇': 'medal',    '🗺️': 'map',
    '🗺': 'map',      '📐': 'ruler',     '⏱': 'timer',     '⏱️': 'timer',
    '🛡️': 'shield',   '🛡': 'shield',    '👑': 'crown',    '🎩': 'hat',
    '🌸': 'flower',   '😈': 'devil',     '🔐': 'lockPlus', '🔊': 'volume',
    '💻': 'code',     '💡': 'bulb',      '☑': 'checkbox',  '☑️': 'checkbox',
    '▾': 'caretDown', '▼': 'caretDown',  '❌': 'xCircle',  '🎉': 'party'
  });

  /* Fundstellen außerhalb von Buttons: Sektions-Titel, Chips, Badges,
     Info-Boxen, Raum-Leiste. Selektoren für bcIconsApply(). */
  root.BC_ICON_EXTRA_SELECTORS = [
    '.sec-hdr h3', '.tweaks-section-title', '.te-section-title', '.filter-chip',
    '.arch-badge', '.info-box', '.warn', '.hint', '.room-label', '.fav-hdr',
    '.log-badge', '.cond-when-lbl', '.trig-label', '.be-empty-icon', '.outfit-target-label',
    '.section-hdr2', '.oi-title', '.search-wrap'
  ].join(',');

  /* Select-Optionen behalten ihr Emoji nicht: <option> kann kein SVG enthalten.
     Dort das Emoji ersatzlos streichen – die Beschriftung trägt die Bedeutung. */
  root.bcStripOptionEmojis = function (scope) {
    var re = /(?:▶▶|[←-⇿⌀-➿⬀-⯿️\u{1F000}-\u{1FAFF}])+\s*/gu;
    var opts = (scope || document).querySelectorAll('option');
    for (var i = 0; i < opts.length; i++) {
      var t = opts[i].textContent;
      var c = t.replace(re, '').trim();
      if (c && c !== t.trim()) opts[i].textContent = c;
    }
  };

  /* Placeholder-Emojis in Suchfeldern entfernen – dort steht ohnehin ein
     Lupen-Icon davor (siehe .search-wrap im CSS). */
  /* Nur Felder in .search-wrap: Die Icon-Picker in den Rang- und Shop-Dialogen
     tragen bewusst ein Emoji als Placeholder (das ist dort der Beispielwert),
     das darf nicht gestrippt werden. */
  root.bcStripPlaceholderEmojis = function (scope) {
    var re = /^[^\w\s]*\s*/u;
    var ins = (scope || document).querySelectorAll('.search-wrap input[placeholder]');
    for (var i = 0; i < ins.length; i++) {
      var p = ins[i].getAttribute('placeholder');
      if (/[\u{1F000}-\u{1FAFF}←-➿]/u.test(p)) {
        ins[i].setAttribute('placeholder', p.replace(re, ''));
      }
    }
  };
})(window);
