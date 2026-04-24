// ═══════════════════════════════════════════════════════════════════
//  OUTFIT IMPORT MODULE  –  BC Konfigurator
//  Verwaltet importierte Outfit-Codes (LZString / roher JS-Code)
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ── Storage ──────────────────────────────────────────────────────────
let OI_LIST = [];          // [{id, label, code, date}]
let _oiSeqRunning  = false;
let _oiSeqIdx      = 0;
let _oiSeqTimer    = null;
const OI_IDB_KEY   = 'BC_IMPORT_OUTFITS_v1';

async function _oiLoad() {
  try {
    const d = await idbGet(OI_IDB_KEY);
    if (Array.isArray(d) && d.length) OI_LIST = d;
  } catch(e) { console.warn('[OI] Load error', e); }
}

function _oiSave() {
  idbSet(OI_IDB_KEY, OI_LIST).catch(e => console.warn('[OI] Save error', e));
}

// ── LZString decompression (self-contained subset) ───────────────────
// Benötigt für Preview und client-seitige Verarbeitung.
// Vollständige LZString-Bibliothek über CDN wird via index.html geladen.
function _oiDecompress(str) {
  try {
    if (typeof LZString !== 'undefined') {
      return LZString.decompressFromBase64(str);
    }
  } catch(e) {}
  return null;
}

function _oiPreview(code) {
  // Versuche LZString-Dekomprimierung für Preview
  const dec = _oiDecompress(code);
  if (dec) {
    try {
      const arr = JSON.parse(dec);
      if (Array.isArray(arr)) {
        const itemNames = arr.slice(0, 5).map(i => i?.Asset?.Name || i?.Name || '?');
        return '🗜️ ' + itemNames.join(', ') + (arr.length > 5 ? ` … +${arr.length - 5}` : '') + ` (${arr.length} Items)`;
      }
      if (typeof dec === 'string' && dec.length < 200) return '📄 ' + dec.slice(0, 100);
    } catch(e) {}
    return '🗜️ Komprimiert (' + dec.length + ' Zeichen nach Dekomprimierung)';
  }
  // Keine LZString-Dekomprimierung möglich – zeige rohen Code-Anfang
  return '📝 ' + code.slice(0, 80) + (code.length > 80 ? '…' : '');
}

// ── Rendering ─────────────────────────────────────────────────────────
function renderOutfitImportTab() {
  const el = document.getElementById('oiListEl');
  if (!el) return;

  if (!OI_LIST.length) {
    el.innerHTML = '<div class="oi-empty"><div style="font-size:2rem;margin-bottom:10px">📥</div>'
      + '<div>Noch keine Outfits importiert.</div>'
      + '<div style="font-size:.72rem;color:var(--text3);margin-top:6px">Lade eine <code>.txt</code>-Datei hoch – jede Zeile ein Outfit-Code.</div>'
      + '</div>';
    _oiUpdateProgress();
    return;
  }

  el.innerHTML = OI_LIST.map((item, i) => {
    const isActive = _oiSeqRunning && _oiSeqIdx === i;
    const isDone   = _oiSeqRunning && _oiSeqIdx > i;
    return `<div class="oi-row${isActive ? ' oi-active' : ''}${isDone ? ' oi-done' : ''}" id="oir_${i}">
      <div class="oi-row-num">${i + 1}</div>
      <div class="oi-row-body">
        <div class="oi-row-label" id="oilabel_${i}">${escHtml(item.label || 'Outfit ' + (i+1))}</div>
        <div class="oi-row-preview">${escHtml(_oiPreview(item.code))}</div>
        <div class="oi-row-meta">${item.date || ''} &nbsp;·&nbsp; ${item.code.length} Zeichen</div>
      </div>
      <div class="oi-row-actions">
        <button class="oi-btn oi-btn-exec" onclick="oiExecuteOne(${i})" title="Outfit anwenden">▶</button>
        <button class="oi-btn oi-btn-save" onclick="oiSaveAsProfile(${i})" title="Als Profil speichern">💾</button>
        <button class="oi-btn oi-btn-edit" onclick="oiEditLabel(${i})" title="Umbenennen">✏️</button>
        <button class="oi-btn oi-btn-del"  onclick="oiDelete(${i})" title="Löschen">✕</button>
      </div>
    </div>`;
  }).join('');

  _oiUpdateProgress();
}

function _oiUpdateProgress() {
  const bar  = document.getElementById('oiProgressBar');
  const info = document.getElementById('oiProgressInfo');
  const stopBtn = document.getElementById('oiStopBtn');
  const seqBtn  = document.getElementById('oiSeqBtn');
  if (!bar) return;

  if (!OI_LIST.length) {
    bar.style.display = 'none';
    if (info) info.textContent = '';
    return;
  }

  bar.style.display = 'block';
  if (_oiSeqRunning) {
    const pct = Math.round((_oiSeqIdx / OI_LIST.length) * 100);
    bar.querySelector('.oi-bar-fill').style.width = pct + '%';
    if (info) info.textContent = _oiSeqIdx + ' / ' + OI_LIST.length + ' ausgeführt';
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (seqBtn)  seqBtn.textContent = '⏸ Läuft…';
  } else {
    bar.querySelector('.oi-bar-fill').style.width = '0%';
    if (info) info.textContent = OI_LIST.length + ' Einträge';
    if (stopBtn) stopBtn.style.display = 'none';
    if (seqBtn)  seqBtn.textContent = '▶▶ Sequenziell';
  }
}

// ── File Import ───────────────────────────────────────────────────────
function oiOpenFilePicker() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.txt,text/plain';
  inp.multiple = true;
  inp.onchange = e => {
    const files = [...e.target.files];
    if (!files.length) return;
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const lines = (ev.target.result || '')
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 10); // Leerzeilen und Kurzzeilen überspringen
        const newItems = lines.map(code => ({
          id:    'oi_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          label: file.name.replace(/\.txt$/i, '') + (lines.length > 1 ? ' #' + (lines.indexOf(code) + 1) : ''),
          code,
          date:  new Date().toLocaleDateString('de-DE'),
        }));
        OI_LIST.push(...newItems);
        loaded++;
        if (loaded === files.length) {
          _oiSave();
          renderOutfitImportTab();
          showStatus('✅ ' + OI_LIST.length + ' Outfit-Codes geladen', 'success');
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  };
  inp.click();
}

// Drag & Drop
function _oiDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('oi-drag'); }
function _oiDragLeave(e) { e.currentTarget.classList.remove('oi-drag'); }
function _oiDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('oi-drag');
  const files = [...(e.dataTransfer?.files || [])].filter(f => f.name.endsWith('.txt') || f.type === 'text/plain');
  if (!files.length) { showStatus('⚠️ Nur .txt Dateien werden akzeptiert', 'info'); return; }
  // Simuliere File-Input-Event
  const fakeEvt = { target: { files } };
  oiOpenFilePicker.call(null);  // reuse logic via direct processing
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = (ev.target.result || '').split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 10);
      const newItems = lines.map((code, i) => ({
        id:    'oi_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        label: file.name.replace(/\.txt$/i, '') + (lines.length > 1 ? ' #' + (i + 1) : ''),
        code,
        date:  new Date().toLocaleDateString('de-DE'),
      }));
      OI_LIST.push(...newItems);
      loaded++;
      if (loaded === files.length) {
        _oiSave();
        renderOutfitImportTab();
        showStatus('✅ ' + newItems.length + ' Outfits aus ' + file.name + ' geladen', 'success');
      }
    };
    reader.readAsText(file, 'utf-8');
  });
}

// Manueller Code-Einfüge-Dialog
function oiAddManual() {
  const code = prompt('Outfit-Code einfügen (LZString oder JS):');
  if (!code?.trim() || code.trim().length < 10) return;
  const item = {
    id:    'oi_' + Date.now(),
    label: 'Manuell ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    code:  code.trim(),
    date:  new Date().toLocaleDateString('de-DE'),
  };
  OI_LIST.push(item);
  _oiSave();
  renderOutfitImportTab();
  showStatus('✅ Outfit-Code hinzugefügt', 'success');
}

// ── Execution ─────────────────────────────────────────────────────────
// Detektiert den Typ eines Outfit-Strings
function _oiDetectType(code) {
  // LZString base64: alphanumerisch + typische LZ-Endzeichen, kein Leerzeichen/Semikolon
  if (/^[A-Za-z0-9+/=]{20,}$/.test(code.trim())) return 'lzbase64';
  // LZString URI-encoded: wie base64 aber mit - statt + und ohne =
  if (/^[A-Za-z0-9\-_.~]{20,}$/.test(code.trim())) return 'lzuri';
  // Sieht nach JS-Code aus
  return 'js';
}

function _oiBuildExecCode(code) {
  // ── Strategie: Dekomprimierung HIER im Konfigurator-Kontext (LZString verfügbar),
  //    dann bereits dekodiertes Array als einfachen ServerPlayerInventoryLoad-Aufruf senden.
  //    BC selbst braucht kein LZString mehr.

  const trimmed = code.trim();
  const type = _oiDetectType(trimmed);

  // Versuche LZString.decompressFromBase64
  if ((type === 'lzbase64' || type === 'lzuri') && typeof LZString !== 'undefined') {
    let dec = null;
    try { dec = LZString.decompressFromBase64(trimmed); } catch(e) {}
    // Falls base64 scheitert, URI-Variante versuchen
    if (!dec) {
      try { dec = LZString.decompressFromEncodedURIComponent(trimmed); } catch(e) {}
    }

    if (dec) {
      try {
        const arr = JSON.parse(dec);
        if (Array.isArray(arr)) {
          // Optimaler Pfad: Array hier dekodiert → live Asset-Referenzen via AssetGet rekonstruieren.
          // Player.Appearance braucht echte Asset-Objekte aus BCs Asset-DB, keine serialisierten.
          const safeJson = JSON.stringify(arr);
          return `(function(){
  try {
    var _raw=${safeJson};

    // ── 1. Packed-Format → live AssetObjects resolven ──────────────────
    var _incoming=[];
    for(var i=0;i<_raw.length;i++){
      var _it=_raw[i];
      // Drei Formate: {Group,Name}, {Asset:{Group:{Name},Name}}, Mixed
      var _rawGrp=_it.Group||(_it.Asset&&_it.Asset.Group);
      var _grp=(_rawGrp&&typeof _rawGrp==='object')?_rawGrp.Name:_rawGrp;
      var _nam=_it.Name||(_it.Asset&&_it.Asset.Name);
      if(!_grp||!_nam) continue;
      var _asset=AssetGet(Player.AssetFamily,_grp,_nam);
      if(!_asset||!_asset.Group) continue;
      var _ni={Asset:_asset};
      if(_it.Color!==undefined)     _ni.Color=_it.Color;
      if(_it.Difficulty!==undefined) _ni.Difficulty=_it.Difficulty;
      if(_it.Property)               _ni.Property=_it.Property;
      if(_it.Craft)                  _ni.Craft=_it.Craft;
      _incoming.push(_ni);
    }

    // ── 2. Merge: nur Gruppen ersetzen die im Outfit vorkommen ──────────
    // Outfit-Codes ohne Körperdaten (Skin, Haare, Gesicht …) würden bei
    // einem Komplett-Replace den Körper unsichtbar machen.
    // Merge bewahrt alle Gruppen die das Outfit nicht abdeckt.
    var _outfitGrps={};
    for(var j=0;j<_incoming.length;j++){
      _outfitGrps[_incoming[j].Asset.Group.Name]=true;
    }
    var _base=Player.Appearance.filter(function(item){
      return item.Asset&&item.Asset.Group&&!_outfitGrps[item.Asset.Group.Name];
    });
    Player.Appearance=_base.concat(_incoming);

    // ── 3. Refresh – Mod-Hook-Fehler separat abfangen ───────────────────
    try{
      CharacterRefresh(Player,true,false);
    }catch(_re){
      console.warn('[OI] CharacterRefresh Warnung (Mod-Hook):',_re.message);
    }
  } catch(_e){ console.error('[OI] Apply fail:',_e.message); }
})();`;
        }
        // dec ist ein String aber kein Array – als JS ausführen
        if (typeof dec === 'string') {
          return `(function(){ try { ${dec} } catch(_e){ console.error('[OI] Exec fail:',_e.message); } })();`;
        }
      } catch(e) {
        console.warn('[OI] JSON.parse nach Dekomprimierung fehlgeschlagen:', e.message);
      }
    } else {
      console.warn('[OI] LZString-Dekomprimierung ergab null – Code wird als JS behandelt');
    }
  }

  // Fallback: als rohen JS-Code senden (nur sinnvoll wenn code wirklich JS ist)
  return `(function(){ try { ${trimmed} } catch(_e){ console.error('[OI] Exec fail:',_e.message); } })();`;
}

function oiExecuteOne(idx) {
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  const item = OI_LIST[idx];
  if (!item) return;

  // Code im Konfigurator-Kontext aufbauen (LZString wird hier dekomprimiert)
  let execCode;
  try {
    execCode = _oiBuildExecCode(item.code);
  } catch(e) {
    showStatus('❌ Code-Fehler: ' + e.message, 'error');
    console.error('[OI] _oiBuildExecCode Fehler:', e);
    return;
  }

  bcSend({ type: 'EXEC', code: execCode });

  // Visuelles Feedback
  document.getElementById('oir_' + idx)?.classList.add('oi-flash');
  setTimeout(() => document.getElementById('oir_' + idx)?.classList.remove('oi-flash'), 600);
  showStatus('▶ Outfit "' + (item.label || '#' + (idx+1)) + '" wird angewendet…', 'info');
}

// ── Sequenzielle Ausführung ───────────────────────────────────────────
let _oiSeqDelay = 3000; // ms zwischen Ausführungen

function oiStartSequential() {
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  if (!OI_LIST.length) { showStatus('⚠️ Keine Outfits geladen', 'info'); return; }
  if (_oiSeqRunning) { oiStopSequential(); return; }

  _oiSeqRunning = true;
  _oiSeqIdx     = 0;
  _oiRunNext();
}

function _oiRunNext() {
  if (!_oiSeqRunning || _oiSeqIdx >= OI_LIST.length) {
    oiStopSequential();
    if (_oiSeqIdx >= OI_LIST.length) showStatus('✅ Alle ' + OI_LIST.length + ' Outfits ausgeführt', 'success');
    return;
  }

  const item = OI_LIST[_oiSeqIdx];
  bcSend({ type: 'EXEC', code: _oiBuildExecCode(item.code) });
  showStatus('▶ [' + (_oiSeqIdx + 1) + '/' + OI_LIST.length + '] "' + (item.label || 'Outfit') + '"', 'info');

  // Scroll to current row
  const row = document.getElementById('oir_' + _oiSeqIdx);
  row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  renderOutfitImportTab();  // Highlight aktualisieren

  _oiSeqIdx++;
  _oiSeqTimer = setTimeout(_oiRunNext, _oiSeqDelay);
}

function oiStopSequential() {
  _oiSeqRunning = false;
  if (_oiSeqTimer) { clearTimeout(_oiSeqTimer); _oiSeqTimer = null; }
  renderOutfitImportTab();
}

function oiSetDelay(ms) {
  _oiSeqDelay = Math.max(500, parseInt(ms) || 3000);
}

// ── Profil speichern ─────────────────────────────────────────────────
function oiSaveAsProfile(idx) {
  const item = OI_LIST[idx];
  if (!item) return;
  const defaultName = item.label || ('Outfit Import ' + (idx + 1));
  const name = prompt('Profilname:', defaultName);
  if (!name?.trim()) return;
  const trimmed = name.trim();
  if (PROFILES[trimmed] && !confirm('Profil "' + trimmed + '" existiert bereits. Überschreiben?')) return;

  PROFILES[trimmed] = {
    name:        trimmed,
    date:        new Date().toLocaleDateString('de-DE'),
    _outfitCode: item.code,   // Direkt-Ausführungs-Flag
    items:       [],          // Kompatibilitäts-Stub
  };
  _saveProfiles();
  showStatus('✅ Als Profil "' + trimmed + '" gespeichert', 'success');
}

// ── Bearbeiten / Löschen ─────────────────────────────────────────────
function oiEditLabel(idx) {
  const item = OI_LIST[idx];
  if (!item) return;
  const newLabel = prompt('Neuer Name:', item.label || '');
  if (!newLabel?.trim()) return;
  OI_LIST[idx].label = newLabel.trim();
  _oiSave();
  renderOutfitImportTab();
}

function oiDelete(idx) {
  OI_LIST.splice(idx, 1);
  _oiSave();
  renderOutfitImportTab();
}

function oiClearAll() {
  if (!OI_LIST.length) return;
  if (!confirm('Alle ' + OI_LIST.length + ' Outfit-Codes löschen?')) return;
  OI_LIST = [];
  _oiSeqRunning = false;
  _oiSave();
  renderOutfitImportTab();
  showStatus('🗑️ Import-Liste geleert', 'success');
}

// ── Init ─────────────────────────────────────────────────────────────
_oiLoad().then(() => {
  if (typeof renderOutfitImportTab === 'function') renderOutfitImportTab();
});
