// ═══════════════════════════════════════════════════════════
//  BC UNIVERSAL CONFIGURATOR BOOKMARKLET v13
//  Kombiniert Dump-Script + UI mit direkter Code-Ausführung
//  und automatischer Spieler-Erkennung
// ═══════════════════════════════════════════════════════════
(function() {
  'use strict';

  // ══════════════════════════════════════════════════════
  //  TEIL 1: ITEM CACHE SCANNER (BC-DUMP-SCRIPT)
  // ══════════════════════════════════════════════════════
  function generateItemCache() {
    const VIBRATING_MODES = ["Off","Constant","Escalate","Random","Tease","Sync","Deny","Edge"];
    
    function getModularOptionName(prefix, moduleKey, optionIndex) {
      if (!prefix) return null;
      try {
        const text = AssetTextGet(`${prefix}${moduleKey}${optionIndex}`);
        if (text && !text.startsWith("MISSING") && text !== `${prefix}${moduleKey}${optionIndex}`) return text;
      } catch {}
      return null;
    }

    function getDialogPrefix(extCfg) {
      const dp = extCfg?.DialogPrefix;
      if (!dp) return null;
      return dp.option ?? dp.Option ?? dp.select ?? dp.Select ?? null;
    }

    function buildFallbackPrefix(group, name) {
      return `${group}${name}Option`;
    }

    function extractModularTypeKeys(extCfg, group, name) {
      const modules = extCfg?.Modules;
      if (!Array.isArray(modules)) return { typeKeys: {}, moduleNames: {} };

      const dp = getDialogPrefix(extCfg) ?? buildFallbackPrefix(group, name);
      const typeKeys = {}, moduleNames = {};
      
      for (const rawMod of modules) {
        const key = rawMod.Key ?? String(Object.keys(typeKeys).length);
        const modName = rawMod.Name ?? key;
        moduleNames[key] = modName;

        typeKeys[key] = (rawMod.Options ?? []).map((opt, i) => {
          const realText = getModularOptionName(dp, key, i);
          const propType = typeof opt?.Property?.Type === 'string' ? opt.Property.Type : null;
          const label = realText ?? propType ?? opt?.Name ?? opt?.Label ?? `${key}${i}`;

          const e = { index: i, name: label };
          if (opt?.Property?.Effect?.length) e.effect = opt.Property.Effect;
          if (opt?.Property?.Block?.length) e.block = opt.Property.Block;
          if (opt?.Prerequisite?.length) e.prereq = opt.Prerequisite;
          return e;
        });
      }
      return { typeKeys, moduleNames };
    }

    function extractDirectOptions(extCfg, assetObj) {
      const opts = extCfg?.Options;
      if (Array.isArray(opts) && opts.length > 0) {
        const prefix = extCfg?.DialogPrefix?.Option ?? extCfg?.DialogPrefix?.option ?? "";
        return opts.map((o, i) => {
          if (typeof o === "string") return o;
          if (prefix && o.Name) {
            try {
              const t = AssetTextGet(prefix + o.Name);
              if (t && t !== prefix + o.Name && !t.startsWith("MISSING")) return t;
            } catch {}
          }
          return o.Name ?? `Option ${i}`;
        });
      }
      if (Array.isArray(assetObj?.Type) && assetObj.Type.length > 0)
        return assetObj.Type;
      return null;
    }

    const META_KEYS = new Set([
      "Layer","Options","ScriptParams","ChatSetting","ChatTags","GroupName","Top","Left",
      "Height","Width","Fetching","Alpha","Prerequisite","Effect","Block","Restrain","Hide",
      "HideItem","AllowLock","Random","IsRestraint","BodyCosplay","OverrideHeight",
      "DrawingPriority","DrawingLeft","DrawingTop","DefaultColor","Opacity","MinOpacity",
      "MaxOpacity","Attribute","RemoveItemOnRemove","ArousalZone","AllowActivity","AllowEffect",
      "DynamicBeforeDraw","DynamicAfterDraw","DynamicGroupName","DynamicDescription","DynamicName",
      "Extended","FuturisticRecolor","FuturisticRecolorDisplay","AllowLockType",
      "DontHavePrerequisite","CustomBlindBackground","HideDefaultEars","HideDefaultHairs",
      "IgnoreParentGroup","ChildGroup","MirrorExpression","AllowColorize","AllowTypes",
      "InheritColor","CopyLayerColor","TextureNames","AnimationData","HasType","Difficulty",
      "SelfUnlock","MemberNumberListKeys","PortalLinkCode","PortalLinkTarget","ChatMessagePrefix",
      "Archetype","Modules","BaselineProperty","ScriptHooks","ChangeWhenLocked","DrawImages","DrawData",
      "DialogPrefix","MirrorActivitiesFrom","AllowExpression","PassthroughProps",
    ]);

    function isLayerObj(obj) {
      return typeof obj === "object" && obj !== null &&
        ("DrawingLeft" in obj || "DrawingTop" in obj || "AllowColorize" in obj ||
         "CopyLayerColor" in obj || "InheritColor" in obj || "Name" in obj && "Priority" in obj);
    }

    function isClassicOptionArray(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return false;
      if (typeof arr[0] === "string") return true;
      if (arr.some(v => typeof v !== "object" || v === null || isLayerObj(v))) return false;
      const OPTKEYS = ["Name","Property","Prerequisite","Description","Default","BuyGroup","Fetching","HasSubscreen"];
      return arr.some(v => OPTKEYS.some(k => k in v));
    }

    function parseClassicOption(opt, idx, key) {
      if (typeof opt === "string") return { index: idx, name: opt };
      const propType = opt?.Property?.Type;
      const name = (typeof propType === "string" ? propType : null) ?? opt?.Name ?? opt?.Label ?? `${key}${idx}`;
      const e = { index: idx, name };
      if (opt?.Property?.Effect?.length) e.effect = opt.Property.Effect;
      if (opt?.Property?.Block?.length) e.block = opt.Property.Block;
      return e;
    }

    function extractClassicTypeKeys(extCfg) {
      const typeKeys = {};
      for (const key in extCfg) {
        if (META_KEYS.has(key) || key === "Options") continue;
        const val = extCfg[key];
        if (!isClassicOptionArray(val)) continue;
        typeKeys[key] = val.map((opt, idx) => parseClassicOption(opt, idx, key));
      }
      return typeKeys;
    }

    function isValidHex(c) { return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c); }

    function getColorInfo(assetObj, extCfg) {
      const assetLayers = assetObj?.Layer ?? [];
      const extLayers = extCfg?.Layer ?? [];
      const layerSrc = assetLayers.length > 0 ? assetLayers : extLayers;

      if (layerSrc.length > 0) {
        const colorable = layerSrc.filter(l => l.AllowColorize !== false);
        if (colorable.length > 0) {
          const assetDef = assetObj?.DefaultColor;
          const extDef = extCfg?.DefaultColor;

          const resolveLayerColor = (l, i) => {
            if (Array.isArray(assetDef) && isValidHex(assetDef[i])) return assetDef[i];
            if (isValidHex(assetDef)) return assetDef;
            if (Array.isArray(extDef) && isValidHex(extDef[i])) return extDef[i];
            if (isValidHex(extDef)) return extDef;
            const lc = l.DefaultColor;
            if (isValidHex(lc)) return lc;
            if (Array.isArray(lc) && isValidHex(lc[0])) return lc[0];
            if (typeof l.CopyLayerColor === "string") {
              const src = colorable.find(ll => ll.Name === l.CopyLayerColor);
              if (src) {
                const sc = src.DefaultColor;
                if (isValidHex(sc)) return sc;
                if (Array.isArray(sc) && isValidHex(sc[0])) return sc[0];
              }
            }
            if (l.InheritColor) {
              for (let j = 0; j < i; j++) {
                const prevColor = resolveLayerColor(colorable[j], j);
                if (prevColor !== "Default") return prevColor;
              }
            }
            return "Default";
          };

          return {
            count: colorable.length,
            names: colorable.map(l => l.Name ?? ""),
            defaults: colorable.map(resolveLayerColor)
          };
        }
      }
      return { count: 0, names: [], defaults: [] };
    }

    const PROP_SKIP = new Set([
      "Type","Effect","Block","Difficulty","SelfBondage","RemoveTimer","ShowTimer","EnableRandomInput",
      "Attribute","Hide","HideItem","OverridePriority","Audio","Expression","Pose","SetPose",
      "AllowActivity","AllowEffect","AllowExpression","AllowPose","LockedBy","RemoveOnOrgasm",
    ]);

    function extractProps(group, name) {
      const prefix = `InventoryItem${group}${name}`;
      const fns = [], props = new Set();
      for (const s of ["Update","CheckPunish","HandleChat","Init","Load","Draw","Click","Exit"]) {
        const fn = window[prefix + s];
        if (typeof fn !== "function") continue;
        fns.push(s);
        const src = fn.toString();
        for (const m of src.matchAll(/\.Property\??\.(\w+)\s*(?:[=!<>]|[^.[\w])/g)) props.add(m[1]);
        for (const m of src.matchAll(/Property\[["'](\w+)["']\]/g)) props.add(m[1]);
      }
      return { functions: fns, props: [...props].filter(p => !PROP_SKIP.has(p) && /^[A-Z]/.test(p)) };
    }

    const extFemale = typeof AssetFemale3DCGExtended !== "undefined" ? AssetFemale3DCGExtended : {};
    const extMale = typeof AssetMale3DCGExtended !== "undefined" ? AssetMale3DCGExtended : {};

    if (!Array.isArray(Asset) || Asset.length === 0) {
      console.error("❌ Asset-Array nicht gefunden!");
      return null;
    }

    const cache = {};
    let total = 0;

    for (const assetObj of Asset) {
      const group = assetObj.Group?.Name;
      const name = assetObj.Name;
      if (!group || !name) continue;
      if (!group.startsWith("Item") && !group.startsWith("Cloth")) continue;

      let extCfg = extFemale[group]?.[name] ?? extMale[group]?.[name];
      
      if (extCfg?.CopyConfig) {
        const srcName = extCfg.CopyConfig.AssetName ?? name;
        const parentGroup = group.replace(/\d+$/, '');
        const srcGroup = extCfg.CopyConfig.Group ?? (parentGroup !== group ? parentGroup : group);
        const resolved = extFemale[srcGroup]?.[srcName] ?? extMale[srcGroup]?.[srcName]
          ?? extFemale[group]?.[srcName] ?? extMale[group]?.[srcName];
        if (resolved) extCfg = resolved;
      }
      
      if (!extCfg) {
        const parentGroup = group.replace(/\d+$/, '');
        if (parentGroup !== group) {
          let parentCfg = extFemale[parentGroup]?.[name] ?? extMale[parentGroup]?.[name];
          if (parentCfg?.CopyConfig) {
            const srcGroup = parentCfg.CopyConfig.Group ?? parentGroup;
            const srcName = parentCfg.CopyConfig.AssetName ?? name;
            parentCfg = extFemale[srcGroup]?.[srcName] ?? extMale[srcGroup]?.[srcName] ?? parentCfg;
          }
          extCfg = parentCfg;
        }
      }
      extCfg = extCfg ?? {};

      let typeKeys = {}, moduleNames = {}, archetype = "classic";
      let vibratingInfo = null, directOptions = null;

      if (extCfg.Archetype === "modular" && Array.isArray(extCfg.Modules)) {
        archetype = "modular";
        const ext = extractModularTypeKeys(extCfg, group, name);
        typeKeys = ext.typeKeys;
        moduleNames = ext.moduleNames;
      } else if (extCfg.Archetype === "vibrating") {
        archetype = "vibrating";
        const defaultTriggers = "Increase,Decrease,Disable,Edge,Random,Deny,Tease,Shock";
        const availTriggers = (extCfg.BaselineProperty?.TriggerValues ?? defaultTriggers).split(",").filter(Boolean);
        const availAccess = ["", "Locked"];
        vibratingInfo = {
          modes: VIBRATING_MODES,
          allowedEffects: extCfg.AllowEffect ?? [],
          baselineProps: extCfg.BaselineProperty ?? {},
          availTriggers,
          availAccess,
        };
      } else if (extCfg.Archetype === "typed") {
        archetype = "classic";
        directOptions = extractDirectOptions(extCfg, assetObj);
      } else {
        directOptions = extractDirectOptions(extCfg, assetObj);
        if (!directOptions?.length && Array.isArray(assetObj.Type) && assetObj.Type.length > 0) {
          directOptions = assetObj.Type;
        }
        typeKeys = extractClassicTypeKeys(extCfg);
      }

      const colorInfo = getColorInfo(assetObj, extCfg);
      const { functions, props } = extractProps(group, name);

      if (!cache[group]) cache[group] = {};
      cache[group][name] = {
        archetype,
        colorCount: colorInfo.count,
        layerNames: colorInfo.names,
        defaultColors: colorInfo.defaults,
        typeKeys,
        moduleNames,
        directOptions,
        vibratingInfo,
        props,
        difficulty: assetObj.Difficulty ?? 0,
        allowedCraftProps: assetObj.Crafting?.Property ?? ["Normal"],
        hasLock: !!(assetObj.AllowLock ?? extCfg.AllowLock),
        functions,
      };
      total++;
    }

    console.log(`✅ BC Cache generiert: ${total} Items in ${Object.keys(cache).length} Gruppen`);
    return cache;
  }

  // ══════════════════════════════════════════════════════
  //  TEIL 2: SPIELER IM RAUM FINDEN
  // ══════════════════════════════════════════════════════
  function getRoomPlayers() {
    const players = [];
    
    if (typeof ChatRoomCharacter !== 'undefined' && Array.isArray(ChatRoomCharacter)) {
      for (const char of ChatRoomCharacter) {
        if (char && char.MemberNumber) {
          players.push({
            memberNumber: char.MemberNumber,
            name: char.Name || char.Nickname || `Player ${char.MemberNumber}`,
            isPlayer: char.MemberNumber === Player?.MemberNumber
          });
        }
      }
    }
    
    return players;
  }

  // ══════════════════════════════════════════════════════
  //  TEIL 3: CODE-AUSFÜHRUNG IN BC
  // ══════════════════════════════════════════════════════
  function executeCode(code) {
    try {
      // Code im BC-Kontext ausführen
      const result = eval(code);
      console.log('✅ Code ausgeführt:', code);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Code-Fehler:', error);
      return { success: false, error: error.message };
    }
  }

  // ══════════════════════════════════════════════════════
  //  TEIL 4: UI IN NEUEM FENSTER ÖFFNEN
  // ══════════════════════════════════════════════════════
  function openConfigWindow() {
    const cache = generateItemCache();
    if (!cache) {
      alert('❌ Fehler beim Generieren des Item-Cache!');
      return;
    }

    const players = getRoomPlayers();
    
    const configWindow = window.open('', 'BCConfigurator', 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no');
    
    if (!configWindow) {
      alert('❌ Popup wurde blockiert! Bitte Popup-Blocker deaktivieren.');
      return;
    }

    // HTML-Inhalt für das neue Fenster generieren
    configWindow.document.write(generateHTML(cache, players));
    configWindow.document.close();

    // Kommunikation zwischen Fenstern einrichten
    configWindow.addEventListener('message', function(event) {
      if (event.data.type === 'EXECUTE_CODE') {
        const result = executeCode(event.data.code);
        event.source.postMessage({
          type: 'EXECUTION_RESULT',
          result: result
        }, '*');
      } else if (event.data.type === 'REFRESH_PLAYERS') {
        const updatedPlayers = getRoomPlayers();
        event.source.postMessage({
          type: 'PLAYERS_UPDATE',
          players: updatedPlayers
        }, '*');
      }
    });

    console.log('✅ Konfigurator geöffnet mit', Object.keys(cache).length, 'Gruppen und', players.length, 'Spielern');
  }

  // ══════════════════════════════════════════════════════
  //  TEIL 5: HTML-GENERIERUNG
  // ══════════════════════════════════════════════════════
  function generateHTML(cache, players) {
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>BC Universal Konfigurator v13</title>
<style>
:root {
  --bg:#0a0a14;--bg2:#0f0f1e;--bg3:#111827;--bg4:#0d0d1a;
  --border:#1e293b;--border2:#2d3748;
  --purple:#7c3aed;--pl:#a78bfa;--pd:#4c1d95;
  --green:#6ee7b7;--gd:#064e3b;
  --red:#fca5a5;--rd:#450a0a;
  --yellow:#fbbf24;--yd:#78350f;
  --blue:#93c5fd;--bd:#1e3a5f;
  --orange:#fb923c;--od:#7c2d12;
  --pink:#f9a8d4;--pkd:#831843;
  --text:#e2e8f0;--text2:#94a3b8;--text3:#64748b;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',sans-serif;min-height:100vh;overflow:hidden}

/* ── TOPBAR ── */
.topbar{background:#070710;border-bottom:1px solid var(--border);padding:8px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.topbar h1{font-size:0.9rem;color:var(--pl);flex-shrink:0}
.tbadge{font-size:0.68rem;padding:2px 7px;border-radius:3px;background:var(--pd);color:var(--pl)}
.player-info{font-size:0.75rem;color:var(--text2);display:flex;align-items:center;gap:8px;margin-left:auto}
.player-count{background:var(--gd);color:var(--green);padding:3px 8px;border-radius:4px;font-family:monospace}
.refresh-btn{background:var(--pd);color:var(--pl);border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.7rem}
.refresh-btn:hover{background:var(--purple)}

/* ── BUTTONS ── */
.btn{padding:5px 12px;border:none;border-radius:5px;font-size:0.78rem;cursor:pointer;transition:all 0.15s;white-space:nowrap}
.btn-primary{background:var(--pd);color:var(--pl)}.btn-primary:hover{background:var(--purple)}
.btn-green{background:var(--gd);color:var(--green)}.btn-green:hover{background:#065f46}
.btn-red{background:var(--rd);color:var(--red)}.btn-red:hover{background:#7f1d1d}
.btn-orange{background:var(--od);color:var(--orange)}.btn-orange:hover{background:#9a3412}
.btn-execute{background:var(--gd);color:var(--green);width:100%;margin-top:8px;padding:10px;font-size:0.85rem;font-weight:600;border:none;border-radius:5px;cursor:pointer}
.btn-execute:hover{background:#065f46;transform:translateY(-1px);box-shadow:0 4px 12px rgba(110,231,183,0.3)}
.btn-execute.executing{background:var(--yd);color:var(--yellow);cursor:wait}
.btn-execute:disabled{opacity:0.5;cursor:not-allowed}
.btn-row{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}

/* ── LAYOUT ── */
.layout{display:grid;grid-template-columns:260px 1fr;height:calc(100vh - 44px)}
.sidebar{background:var(--bg2);border-right:1px solid var(--border);padding:12px;overflow-y:auto}
.main{padding:18px;overflow-y:auto}

/* ── TARGET SELECTOR ── */
.target-section{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:13px;margin-bottom:10px}
.target-section h3{font-size:0.75rem;color:var(--text2);margin-bottom:8px}
.target-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px}
.target-option{background:var(--bg2);border:2px solid var(--border);border-radius:6px;padding:8px 10px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:8px}
.target-option:hover{border-color:var(--border2);background:var(--bg3)}
.target-option.selected{border-color:var(--purple);background:var(--pd)}
.target-option input[type=radio]{accent-color:var(--purple);width:16px;height:16px}
.target-option label{font-size:0.78rem;color:var(--text2);cursor:pointer;flex:1}
.target-option.selected label{color:var(--pl);font-weight:600}
.target-badge{font-size:0.65rem;padding:2px 5px;border-radius:3px;background:var(--gd);color:var(--green)}

/* ── SECTIONS ── */
.section{background:var(--bg3);border:1px solid var(--border);border-radius:9px;padding:13px;margin-bottom:10px}
.sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.sec-hdr h3{font-size:0.71rem;color:var(--text2);text-transform:uppercase;letter-spacing:1px;margin:0}

/* ── OUTFIT LIST ── */
.outfit-item{background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:10px;margin-bottom:8px}
.outfit-item-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.outfit-item-name{font-size:0.85rem;color:var(--pl);font-weight:600}
.outfit-item-target{font-size:0.7rem;color:var(--text3);margin-top:2px}
.outfit-item-target.other{color:var(--orange)}

/* ── CODE OUTPUT ── */
.code-box{background:#070712;border:1px solid var(--border);border-radius:6px;padding:10px;font-family:'Consolas','Monaco',monospace;font-size:0.75rem;color:#86efac;max-height:200px;overflow-y:auto;white-space:pre;margin-top:10px}
.execution-result{margin-top:10px;padding:8px 10px;border-radius:5px;font-size:0.75rem}
.execution-result.success{background:var(--gd);color:var(--green);border:1px solid #166534}
.execution-result.error{background:var(--rd);color:var(--red);border:1px solid #991b1b}

</style>
</head>
<body>

<!-- ── TOPBAR ── -->
<div class="topbar">
  <h1>🎮 BC Universal Konfigurator v13</h1>
  <span class="tbadge">Bookmarklet Edition</span>
  <div class="player-info">
    <span>👥 Spieler im Raum:</span>
    <span class="player-count" id="playerCount">${players.length}</span>
    <button class="refresh-btn" onclick="refreshPlayers()">🔄 Aktualisieren</button>
  </div>
</div>

<!-- ── LAYOUT ── -->
<div class="layout">
  <div class="sidebar">
    <input type="text" class="sidebar-search" placeholder="🔍 Item suchen..." oninput="filterItems(this.value)">
    <div id="sidebar"></div>
  </div>
  
  <div class="main">
    <!-- Target Selection -->
    <div class="target-section" id="targetSection">
      <h3>🎯 Ziel auswählen</h3>
      <div class="target-grid" id="targetGrid"></div>
    </div>

    <!-- Item Configuration -->
    <div id="itemConfig" style="display:none;">
      <div class="section">
        <div class="sec-hdr">
          <h3>Item Konfiguration</h3>
        </div>
        <div id="configContent"></div>
      </div>
    </div>

    <!-- Outfit -->
    <div class="section">
      <div class="sec-hdr">
        <h3>📦 Aktuelles Outfit (<span id="outfitCount">0</span>)</h3>
        <button class="btn btn-orange" onclick="generateCode()">⚡ Code generieren & ausführen</button>
      </div>
      <div id="outfitList"></div>
      <div id="codeOutput" class="hidden"></div>
    </div>
  </div>
</div>

<script>
// ══════════════════════════════════════════════════════
//  GLOBALS
// ══════════════════════════════════════════════════════
const CACHE = ${JSON.stringify(cache)};
let PLAYERS = ${JSON.stringify(players)};
let OUTFIT = [];
let CURRENT_ITEM = null;
let SELECTED_TARGET = null;

// ══════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════
function init() {
  renderSidebar();
  renderTargetSelection();
  updateOutfitDisplay();
}

function renderSidebar() {
  const container = document.getElementById('sidebar');
  let html = '';
  
  for (const group in CACHE) {
    const items = Object.keys(CACHE[group]);
    html += \`
      <div class="group-hdr" onclick="toggleGroup(this)">
        <span>\${group}</span>
        <span>(\${items.length})</span>
      </div>
      <div class="group-items">
        \${items.map(name => \`
          <div class="item-row">
            <button class="item-btn" onclick="selectItem('\${group}', '\${name}')">\${name}</button>
          </div>
        \`).join('')}
      </div>
    \`;
  }
  
  container.innerHTML = html;
}

function toggleGroup(el) {
  const items = el.nextElementSibling;
  items.classList.toggle('open');
  el.classList.toggle('open');
}

function filterItems(query) {
  const groups = document.querySelectorAll('.group-items');
  const q = query.toLowerCase();
  
  groups.forEach(group => {
    const items = group.querySelectorAll('.item-btn');
    let hasVisible = false;
    
    items.forEach(btn => {
      const match = btn.textContent.toLowerCase().includes(q);
      btn.parentElement.style.display = match ? '' : 'none';
      if (match) hasVisible = true;
    });
    
    group.style.display = hasVisible || !q ? '' : 'none';
    if (hasVisible && q) group.classList.add('open');
  });
}

// ══════════════════════════════════════════════════════
//  TARGET SELECTION
// ══════════════════════════════════════════════════════
function renderTargetSelection() {
  const container = document.getElementById('targetGrid');
  
  let html = PLAYERS.map((player, idx) => \`
    <div class="target-option \${idx === 0 ? 'selected' : ''}" onclick="selectTarget(\${idx})">
      <input type="radio" name="target" value="\${idx}" \${idx === 0 ? 'checked' : ''}>
      <label>\${player.name}</label>
      \${player.isPlayer ? '<span class="target-badge">Du</span>' : ''}
    </div>
  \`).join('');
  
  container.innerHTML = html;
  SELECTED_TARGET = PLAYERS[0] || null;
}

function selectTarget(idx) {
  SELECTED_TARGET = PLAYERS[idx];
  
  document.querySelectorAll('.target-option').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
    el.querySelector('input').checked = (i === idx);
  });
}

function refreshPlayers() {
  window.opener.postMessage({ type: 'REFRESH_PLAYERS' }, '*');
}

window.addEventListener('message', function(event) {
  if (event.data.type === 'PLAYERS_UPDATE') {
    PLAYERS = event.data.players;
    document.getElementById('playerCount').textContent = PLAYERS.length;
    renderTargetSelection();
  } else if (event.data.type === 'EXECUTION_RESULT') {
    showExecutionResult(event.data.result);
  }
});

// ══════════════════════════════════════════════════════
//  ITEM SELECTION & CONFIGURATION
// ══════════════════════════════════════════════════════
function selectItem(group, name) {
  CURRENT_ITEM = { group, name, cfg: CACHE[group][name] };
  
  document.querySelectorAll('.item-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  document.getElementById('itemConfig').style.display = 'block';
  renderItemConfig();
}

function renderItemConfig() {
  const { group, name, cfg } = CURRENT_ITEM;
  const content = document.getElementById('configContent');
  
  let html = \`
    <div style="margin-bottom:15px">
      <h2 style="color:var(--pl);font-size:1rem;margin-bottom:5px">\${name}</h2>
      <p style="color:var(--text3);font-size:0.75rem">\${group}</p>
      <span class="arch-badge \${cfg.archetype}">\${cfg.archetype}</span>
    </div>
    <button class="btn btn-green" style="width:100%" onclick="addToOutfit()">
      ➕ Zu Outfit hinzufügen (\${SELECTED_TARGET?.name || 'Kein Ziel'})
    </button>
  \`;
  
  content.innerHTML = html;
}

// ══════════════════════════════════════════════════════
//  OUTFIT MANAGEMENT
// ══════════════════════════════════════════════════════
function addToOutfit() {
  if (!CURRENT_ITEM || !SELECTED_TARGET) {
    alert('❌ Bitte Item und Ziel auswählen!');
    return;
  }
  
  const item = {
    group: CURRENT_ITEM.group,
    asset: CURRENT_ITEM.name,
    target: SELECTED_TARGET,
    colors: [],
    cfg: CURRENT_ITEM.cfg
  };
  
  OUTFIT.push(item);
  updateOutfitDisplay();
  alert(\`✅ \${item.asset} zu Outfit hinzugefügt (Ziel: \${item.target.name})\`);
}

function removeFromOutfit(idx) {
  OUTFIT.splice(idx, 1);
  updateOutfitDisplay();
}

function updateOutfitDisplay() {
  document.getElementById('outfitCount').textContent = OUTFIT.length;
  
  const container = document.getElementById('outfitList');
  
  if (OUTFIT.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.8rem">Noch keine Items im Outfit.</p>';
    return;
  }
  
  container.innerHTML = OUTFIT.map((item, idx) => \`
    <div class="outfit-item">
      <div class="outfit-item-header">
        <div>
          <div class="outfit-item-name">[\${item.group}] \${item.asset}</div>
          <div class="outfit-item-target \${!item.target.isPlayer ? 'other' : ''}">
            🎯 Ziel: \${item.target.name} (${item.target.memberNumber})
          </div>
        </div>
        <button class="btn btn-red" onclick="removeFromOutfit(\${idx})">🗑️</button>
      </div>
    </div>
  \`).join('');
}

// ══════════════════════════════════════════════════════
//  CODE GENERATION & EXECUTION
// ══════════════════════════════════════════════════════
function generateCode() {
  if (OUTFIT.length === 0) {
    alert('❌ Outfit ist leer!');
    return;
  }
  
  let code = '';
  
  // Gruppiere nach Ziel
  const byTarget = {};
  OUTFIT.forEach(item => {
    const key = item.target.memberNumber;
    if (!byTarget[key]) byTarget[key] = { target: item.target, items: [] };
    byTarget[key].items.push(item);
  });
  
  // Code für jedes Ziel generieren
  for (const key in byTarget) {
    const { target, items } = byTarget[key];
    
    if (target.isPlayer) {
      // Auf sich selbst anwenden
      items.forEach(item => {
        code += \`InventoryWear(Player, "\${item.asset}", "\${item.group}", "Default");\n\`;
      });
    } else {
      // Auf anderen Spieler anwenden
      code += \`var C = ChatRoomCharacter.find(c => c.MemberNumber === \${target.memberNumber});\n\`;
      code += \`if (C) {\n\`;
      items.forEach(item => {
        code += \`  InventoryWear(C, "\${item.asset}", "\${item.group}", "Default");\n\`;
      });
      code += \`  ChatRoomCharacterUpdate(C);\n\`;
      code += \`}\n\`;
    }
  }
  
  code += 'ChatRoomCharacterUpdate(Player);';
  
  // Code anzeigen und ausführen
  const output = document.getElementById('codeOutput');
  output.className = '';
  output.innerHTML = \`
    <div class="code-box">\${code}</div>
    <button class="btn-execute" onclick="executeGeneratedCode()" id="executeBtn">
      ⚡ JETZT AUSFÜHREN
    </button>
    <div id="executionResult"></div>
  \`;
  
  window.generatedCode = code;
}

function executeGeneratedCode() {
  const btn = document.getElementById('executeBtn');
  btn.classList.add('executing');
  btn.textContent = '⏳ Wird ausgeführt...';
  btn.disabled = true;
  
  window.opener.postMessage({
    type: 'EXECUTE_CODE',
    code: window.generatedCode
  }, '*');
}

function showExecutionResult(result) {
  const btn = document.getElementById('executeBtn');
  btn.classList.remove('executing');
  btn.disabled = false;
  
  const resultDiv = document.getElementById('executionResult');
  
  if (result.success) {
    btn.textContent = '✅ Erfolgreich ausgeführt!';
    btn.style.background = 'var(--gd)';
    resultDiv.innerHTML = \`
      <div class="execution-result success">
        ✅ Code wurde erfolgreich im Spiel ausgeführt!
      </div>
    \`;
    setTimeout(() => {
      btn.textContent = '⚡ JETZT AUSFÜHREN';
      btn.style.background = '';
    }, 3000);
  } else {
    btn.textContent = '❌ Fehler aufgetreten';
    btn.style.background = 'var(--rd)';
    resultDiv.innerHTML = \`
      <div class="execution-result error">
        ❌ Fehler: \${result.error}
      </div>
    \`;
    setTimeout(() => {
      btn.textContent = '⚡ NOCHMAL VERSUCHEN';
      btn.style.background = '';
    }, 3000);
  }
}

// ══════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════
init();
</script>

</body>
</html>`;
  }

  // ══════════════════════════════════════════════════════
  //  MAIN EXECUTION
  // ══════════════════════════════════════════════════════
  openConfigWindow();

})();
