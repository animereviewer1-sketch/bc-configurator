// BC-Konfigurator Loader v1
// Wird via Bookmarklet in die BC-Seite injiziert.
// Öffnet das Konfigurator-Popup und leitet Befehle direkt ans Spiel.
(function () {
  'use strict';

  // ── 🪵 BC-Seite Logger ────────────────────────────────────────────
  const BCK = (function() {
    const P = '[BCK-BC]';
    function _l(lv, color, ...a) { console.log('%c' + P + ' [' + lv + ']', 'color:' + color + ';font-weight:bold', ...a); }
    return {
      info: (...a) => _l('INFO', '#93c5fd', ...a),
      ok:   (...a) => _l('OK',   '#6ee7b7', ...a),
      // FIX: warn and err now use the correct console methods for proper DevTools filtering
      warn: (...a) => console.warn('%c' + P + ' [WARN]', 'color:#fbbf24;font-weight:bold', ...a),
      err:  (...a) => console.error('%c' + P + ' [ERR]',  'color:#fca5a5;font-weight:bold', ...a),
    };
  })();

  BCK.info('Loader gestartet');
  BCK.info('Asset[]:', typeof Asset !== 'undefined' ? Asset.length + ' Items' : 'FEHLT!');
  BCK.info('AssetFemale3DCGExtended:', typeof AssetFemale3DCGExtended !== 'undefined');
  BCK.info('Listener bereits aktiv:', !!window.__BCK_LISTENER__);
  BCK.info('Popup-Ref:', !!window.__BCK_WIN__, '| geschlossen:', window.__BCK_WIN__?.closed);


  const APP      = 'BCKonfigurator';
  const POPUP_W  = 1380;
  const POPUP_H  = 900;
  const POPUP_URL = 'https://animereviewer1-sketch.github.io/bc-configurator/';
  // FIX: Validate origin to prevent other pages from sending EXEC commands (aus POPUP_URL abgeleitet — eine Origin-Quelle, STAB-06)
  const ALLOWED_ORIGIN = new URL(POPUP_URL).origin;

  // ── Cache-Builder ─────────────────────────────────────
  function buildBCCache() {
  const VIBRATING_MODES = ["Off","Constant","Escalate","Random","Tease","Deny","Edge"];

  // ── Echte Modul-Namen via AssetTextGet ───────────────
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

  // Fallback-Prefix wenn kein DialogPrefix: "ItemPelvisModularChastityBeltOption"
  function buildFallbackPrefix(group, name) {
    return `${group}${name}Option`;
  }

  // ── Modular: Module + Optionen extrahieren ────────────
  function extractModularTypeKeys(extCfg, group, name) {
    const modules = extCfg?.Modules;
    if (!Array.isArray(modules)) return { typeKeys: {}, moduleNames: {} };

    const dp = getDialogPrefix(extCfg) ?? buildFallbackPrefix(group, name);

    const typeKeys = {}, moduleNames = {};
    for (const rawMod of modules) {
      const key    = rawMod.Key  ?? String(Object.keys(typeKeys).length);
      const modName = rawMod.Name ?? key;
      moduleNames[key] = modName;

      typeKeys[key] = (rawMod.Options ?? []).map((opt, i) => {
        // 1. Echter Text via AssetTextGet
        const realText = getModularOptionName(dp, key, i);
        // 2. Fallback: Property.Type CamelCase → Label
        const propType = typeof opt?.Property?.Type === 'string' ? opt.Property.Type : null;
        const label    = realText ?? propType ?? opt?.Name ?? opt?.Label ?? `${key}${i}`;

        const e = { index: i, name: label };
        if (opt?.Property?.Effect?.length)  e.effect  = opt.Property.Effect;
        if (opt?.Property?.Block?.length)   e.block   = opt.Property.Block;
        if (opt?.Prerequisite?.length)      e.prereq  = opt.Prerequisite;
        return e;
      });
    }
    return { typeKeys, moduleNames };
  }

  // ── Classic Options (BallGag, FuturisticMittens) ─────
  function extractDirectOptions(extCfg, assetObj) {
    // 1. extCfg.Options (typed/copied items, e.g. BallGag, HarnessBallGag via CopyConfig)
    const opts = extCfg?.Options;
    if (Array.isArray(opts) && opts.length > 0) {
      const prefix = extCfg?.DialogPrefix?.Option ?? extCfg?.DialogPrefix?.option ?? "";
      return opts.map((o, i) => {
        if (typeof o === "string") return o;
        // Versuche echten Text via AssetTextGet
        if (prefix && o.Name) {
          try {
            const t = AssetTextGet(prefix + o.Name);
            if (t && t !== prefix + o.Name && !t.startsWith("MISSING")) return t;
          } catch {}
        }
        return o.Name ?? `Option ${i}`;
      });
    }
    // 2. assetObj.Type[] direkt (letzter Fallback)
    if (Array.isArray(assetObj?.Type) && assetObj.Type.length > 0)
      return assetObj.Type;
    return null;
  }

  // ── Classic TypeRecord Key-Arrays ────────────────────
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
    if (opt?.Property?.Effect?.length)  e.effect = opt.Property.Effect;
    if (opt?.Property?.Block?.length)   e.block  = opt.Property.Block;
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

  // ── Farben: echte DefaultColor aus Asset.Layer ────────
  function isValidHex(c) { return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c); }

  function getColorInfo(assetObj, extCfg) {
    const assetLayers = assetObj?.Layer ?? [];
    const extLayers   = extCfg?.Layer   ?? [];
    const assetDef    = assetObj?.DefaultColor;
    const extDef      = extCfg?.DefaultColor;

    // Layer-Quelle: assetObj für Namen/Struktur
    const layerSrc = assetLayers.length > 0 ? assetLayers : extLayers;
    if (layerSrc.length === 0) {
      // Kein Layer-Array: DefaultColor direkt als Fallback
      const dc = assetDef ?? extDef;
      if (Array.isArray(dc) && dc.length > 0)
        return { count: dc.length, names: dc.map((_,i) => `Layer ${i+1}`), defaults: dc.map(c => isValidHex(c) ? c : "Default") };
      if (isValidHex(dc))
        return { count: 1, names: ["Layer 1"], defaults: [dc] };
      return { count: 1, names: ["Layer 1"], defaults: ["Default"] };
    }

    const colorable = layerSrc.filter(l => l.AllowColorize !== false);
    if (colorable.length === 0)
      return { count: 1, names: ["Layer 1"], defaults: ["Default"] };

    // Baut eine Name→DefaultColor Map aus extCfg.Layer (für CopyConfig-Items)
    const extLayerByName = {};
    for (const el of extLayers) {
      if (el.Name && el.DefaultColor) extLayerByName[el.Name] = el.DefaultColor;
    }

    const resolveColor = (l, i) => {
      // 1. assetObj.DefaultColor[i]
      if (Array.isArray(assetDef) && isValidHex(assetDef[i])) return assetDef[i];
      if (isValidHex(assetDef)) return assetDef;
      // 2. extCfg.DefaultColor[i]
      if (Array.isArray(extDef) && isValidHex(extDef[i])) return extDef[i];
      if (isValidHex(extDef)) return extDef;
      // 3. Layer.DefaultColor direkt (am besten für klassische Items wie ClassicBelt)
      const lc = l.DefaultColor;
      if (isValidHex(lc)) return lc;
      if (Array.isArray(lc) && isValidHex(lc[0])) return lc[0];
      // 4. extCfg.Layer by Name (für CopyConfig-aufgelöste Items)
      if (l.Name && extLayerByName[l.Name]) {
        const ec = extLayerByName[l.Name];
        if (isValidHex(ec)) return ec;
        if (Array.isArray(ec) && isValidHex(ec[0])) return ec[0];
      }
      // 5. CopyLayerColor → Farbe von anderem Layer
      if (typeof l.CopyLayerColor === "string") {
        const src = colorable.find(ll => ll.Name === l.CopyLayerColor);
        if (src) {
          // Direkt auf src
          const sc = src.DefaultColor;
          if (isValidHex(sc)) return sc;
          if (Array.isArray(sc) && isValidHex(sc[0])) return sc[0];
          // Via extLayerByName
          if (src.Name && extLayerByName[src.Name]) {
            const ec2 = extLayerByName[src.Name];
            if (isValidHex(ec2)) return ec2;
          }
          // Via assetDef/extDef am Index des src-Layers
          const srcIdx = colorable.indexOf(src);
          if (srcIdx >= 0) {
            if (Array.isArray(assetDef) && isValidHex(assetDef[srcIdx])) return assetDef[srcIdx];
            if (Array.isArray(extDef) && isValidHex(extDef[srcIdx])) return extDef[srcIdx];
          }
        }
      }
      // 6. InheritColor → ersten vorherigen Layer mit bekannter Farbe
      if (l.InheritColor) {
        for (let j = 0; j < i; j++) {
          if (Array.isArray(assetDef) && isValidHex(assetDef[j])) return assetDef[j];
          if (Array.isArray(extDef) && isValidHex(extDef[j])) return extDef[j];
          const pc = colorable[j]?.DefaultColor;
          if (isValidHex(pc)) return pc;
        }
      }
      return "Default";
    };

    return {
      count:    colorable.length,
      names:    colorable.map((l, i) => l.Name || `Layer ${i+1}`),
      defaults: colorable.map((l, i) => resolveColor(l, i)),
    };
  }

  // ── Props aus Funktionscode ───────────────────────────
  const PROP_SKIP = new Set([
    "LockedBy","LockMemberNumber","RemoveTimer","Password","CombinationNumber","Type","TypeRecord",
    "Effect","Block","Hide","HideItem","AllowLock","Attribute","Restrain","Prerequisite","Opacity",
    "DrawingPriority","InflateLevel","Intensity","ShockLevel","SelfUnlock","MemberNumberListKeys",
    "LockPickSeed","EnableRandomInput","HeightModifier","OverridePriority","Length","Size",
    "Position","PortalLinkCode","Color","Craft","Locked","ShowTimer","Mode","AccessMode","TriggerValues",
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

  // ── HAUPT-LOOP ────────────────────────────────────────
  const extFemale = typeof AssetFemale3DCGExtended !== "undefined" ? AssetFemale3DCGExtended : {};
  const extMale   = typeof AssetMale3DCGExtended   !== "undefined" ? AssetMale3DCGExtended   : {};

  if (!Array.isArray(Asset) || Asset.length === 0) {
    console.error("❌ Asset-Array nicht gefunden!");
    return;
  }

  const cache = {};
  let total = 0, modularCnt = 0, vibratingCnt = 0, classicOptCnt = 0, classicTRCnt = 0;

  for (const assetObj of Asset) {
    const group = assetObj.Group?.Name;
    const name  = assetObj.Name;
    if (!group || !name) continue;
    if (!group.startsWith("Item") && !group.startsWith("Cloth")) continue;

    // 1. Direkte Suche
    let extCfg = extFemale[group]?.[name] ?? extMale[group]?.[name];
    // 2. CopyConfig auflösen (z.B. HarnessBallGag/BallGag in ItemMouth2 → ItemMouth)
    if (extCfg?.CopyConfig) {
      const srcName = extCfg.CopyConfig.AssetName ?? name;
      // Wenn kein Group angegeben: zuerst Parent-Gruppe (ItemMouth2→ItemMouth), dann gleiche Gruppe
      const parentGroup = group.replace(/\d+$/, '');
      const srcGroup = extCfg.CopyConfig.Group
        ?? (parentGroup !== group ? parentGroup : group);
      const resolved = extFemale[srcGroup]?.[srcName] ?? extMale[srcGroup]?.[srcName]
        ?? extFemale[group]?.[srcName] ?? extMale[group]?.[srcName];
      if (resolved) extCfg = resolved;
    }
    // 3. Parent-Gruppe als Fallback (ItemMouth2 → ItemMouth)
    if (!extCfg) {
      const parentGroup = group.replace(/\d+$/, '');
      if (parentGroup !== group) {
        let parentCfg = extFemale[parentGroup]?.[name] ?? extMale[parentGroup]?.[name];
        if (parentCfg?.CopyConfig) {
          const srcGroup = parentCfg.CopyConfig.Group    ?? parentGroup;
          const srcName  = parentCfg.CopyConfig.AssetName ?? name;
          parentCfg = extFemale[srcGroup]?.[srcName] ?? extMale[srcGroup]?.[srcName] ?? parentCfg;
        }
        extCfg = parentCfg;
      }
    }
    extCfg = extCfg ?? {};

    let typeKeys = {}, moduleNames = {}, archetype = "classic";
    let vibratingInfo = null, directOptions = null;

    if (extCfg.Archetype === "modular" && Array.isArray(extCfg.Modules)) {
      archetype = "modular"; modularCnt++;
      const ext = extractModularTypeKeys(extCfg, group, name);
      typeKeys = ext.typeKeys; moduleNames = ext.moduleNames;

    } else if (extCfg.Archetype === "vibrating") {
      archetype = "vibrating"; vibratingCnt++;
      // AccessMode options and TriggerValues for FuturisticVibrator-style items
      const defaultTriggers = "Increase,Decrease,Disable,Edge,Random,Deny,Tease,Shock";
      const availTriggers = (extCfg.BaselineProperty?.TriggerValues ?? defaultTriggers).split(",").filter(Boolean);
      const availAccess = ["", "Locked"];  // "" = always, "Locked" = only when locked
      vibratingInfo = {
        modes:           VIBRATING_MODES,
        allowedEffects:  extCfg.AllowEffect ?? [],
        baselineProps:   extCfg.BaselineProperty ?? {},
        availTriggers,
        availAccess,
      };

    } else if (extCfg.Archetype === "typed") {
      // "typed" = Classic Options array (HarnessBallGag, etc.)
      archetype = "classic";
      directOptions = extractDirectOptions(extCfg, assetObj);
      if (directOptions?.length) classicOptCnt++;

    } else {
      directOptions = extractDirectOptions(extCfg, assetObj);
      // Ultimativer Fallback: assetObj.Type[] direkt (z.B. HarnessBallGag in ItemMouth2/3)
      if (!directOptions?.length && Array.isArray(assetObj.Type) && assetObj.Type.length > 0) {
        directOptions = assetObj.Type;
        classicOptCnt++;
      } else if (directOptions?.length) {
        classicOptCnt++;
      }
      typeKeys = extractClassicTypeKeys(extCfg);
      if (Object.keys(typeKeys).length > 0) classicTRCnt++;
    }

    const colorInfo = getColorInfo(assetObj, extCfg);
    const { functions, props } = extractProps(group, name);

    if (!cache[group]) cache[group] = {};
    cache[group][name] = {
      archetype,
      colorCount:    colorInfo.count,
      layerNames:    colorInfo.names,
      defaultColors: colorInfo.defaults,
      typeKeys, moduleNames,
      directOptions,
      vibratingInfo,
      props,
      difficulty:        assetObj.Difficulty ?? 0,
      allowedCraftProps: assetObj.Crafting?.Property ?? ["Normal"],
      hasLock:           !!(assetObj.AllowLock ?? extCfg.AllowLock),
      functions,
    };
    total++;
  }
  return cache;
  }


  // ══════════════════════════════════════════════════════
  //  CURSE SCANNER (eingebettet)
  // ══════════════════════════════════════════════════════

window.CurseScanner = (() => {
  let database = {};
  let lscgTable = {};

  // ── Eigener persistenter Cache via IndexedDB (kein localStorage-Quota-Problem) ──
  const LSCG_CACHE_KEY  = 'CurseScanner_lscgCache_v1';
  const CRAFT_CACHE_KEY = 'CurseScanner_craftCache_v1';

  // Minimaler IndexedDB-Wrapper (läuft auf BC's Origin)
  const _CS_IDB = (() => {
    const DB_NAME = 'BCKonfigurator_CS';
    const STORE   = 'kv';
    let _db = null;
    function _open() {
      if (_db) return Promise.resolve(_db);
      return new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
        r.onsuccess = e => { _db = e.target.result; res(_db); };
        r.onerror   = e => rej(e.target.error);
      });
    }
    return {
      get: async key => { try { const db = await _open(); return await new Promise((res,rej)=>{ const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key); r.onsuccess=e=>res(e.target.result??null); r.onerror=e=>rej(e.target.error); }); } catch { return null; } },
      set: async (key, val) => { try { const db = await _open(); await new Promise((res,rej)=>{ const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(val,key); r.onsuccess=()=>res(); r.onerror=e=>rej(e.target.error); }); } catch(e) { console.warn('[CS-IDB] set error:', e); } },
    };
  })();

  // In-Memory Caches – werden async aus IDB befüllt
  const lscgCache  = {};
  const craftCache = {};

  // Einmalige Migration aus localStorage → IDB + RAM
  (async () => {
    for (const [key, target] of [[LSCG_CACHE_KEY, lscgCache],[CRAFT_CACHE_KEY, craftCache]]) {
      try {
        // Erst IDB laden
        const idbVal = await _CS_IDB.get(key);
        if (idbVal) Object.assign(target, idbVal);
        // Dann ggf. localStorage migrieren (falls noch vorhanden)
        const lsRaw = localStorage.getItem(key);
        if (lsRaw) {
          Object.assign(target, JSON.parse(lsRaw));
          await _CS_IDB.set(key, target);
          localStorage.removeItem(key);
          console.info('[CurseScanner] Migriert aus localStorage:', key);
        }
      } catch(e) { console.warn('[CurseScanner] Cache-Init-Fehler:', key, e); }
    }
    console.log('[CurseScanner] Craft-Cache: ' + Object.keys(craftCache).length + ' Einträge, LSCG-Cache: ' + Object.keys(lscgCache).length + ' Einträge');
  })();

  let _persistTimer = null;
  function _persistLscgCache() {
    if (_persistTimer) return;
    _persistTimer = setTimeout(() => {
      _persistTimer = null;
      _CS_IDB.set(LSCG_CACHE_KEY, lscgCache);
    }, 2000);
  }

  let _craftPersistTimer = null;
  function _persistCraftCache() {
    if (_craftPersistTimer) return;
    _craftPersistTimer = setTimeout(() => {
      _craftPersistTimer = null;
      _CS_IDB.set(CRAFT_CACHE_KEY, craftCache);
    }, 2000);
  }

  function _cacheLSCG(memberNumber, curseObj) {
    if (!curseObj?.Name) return;
    // Speichere unter LSCG-Name UND unter Craft-Namen (falls verfügbar) gleichzeitig
    const key = memberNumber + ':' + curseObj.Name.toLowerCase();
    const isNew = !lscgCache[key];
    lscgCache[key] = { ...curseObj, _cachedAt: new Date().toLocaleTimeString(), _memberNum: memberNumber };
    if (isNew) {
      console.log('💾 LSCG Cache: #' + memberNumber + ' → "' + curseObj.Name + '"');
      _persistLscgCache();
    }
  }

  function _cacheLSCGWithCraftAlias(memberNumber, curseObj, craftName) {
    _cacheLSCG(memberNumber, curseObj);
    // Auch unter Craft-Namen speichern wenn abweichend → lookup by craftName funktioniert immer
    if (craftName && craftName.toLowerCase() !== curseObj.Name?.toLowerCase()) {
      const aliasKey = memberNumber + ':' + craftName.toLowerCase();
      lscgCache[aliasKey] = { ...lscgCache[memberNumber + ':' + curseObj.Name.toLowerCase()], _craftAlias: craftName };
      _persistLscgCache();
    }
  }

  // Snapshot ALLE LSCG-Curse-Daten eines Charakters aggressiv
  function _snapshotAllLSCG(C) {
    const items = C?.LSCG?.CursedItemModule?.CursedItems;
    if (!Array.isArray(items) || items.length === 0) return;
    let changed = false;
    items.forEach(ci => {
      if (!ci?.Name) return;
      const key = C.MemberNumber + ':' + ci.Name.toLowerCase();
      const existing = lscgCache[key];
      // Immer aktualisieren wenn live-Daten vorhanden (nie auf alten Cache stehen lassen)
      lscgCache[key] = { ...ci, _cachedAt: new Date().toLocaleTimeString(), _memberNum: C.MemberNumber };
      if (!existing) changed = true;
    });
    // Craft-Namen als Aliases eintragen: gehe alle crafts durch und verknüpfe
    (C.Crafting ?? []).forEach(craft => {
      if (!craft?.Name) return;
      const lscgMatch = items.find(ci => ci.Name?.toLowerCase() === craft.Name?.toLowerCase());
      if (lscgMatch && lscgMatch.Name?.toLowerCase() !== craft.Name?.toLowerCase()) {
        const aliasKey = C.MemberNumber + ':' + craft.Name.toLowerCase();
        // Nur als Aenderung zaehlen, wenn der Alias wirklich neu ist. Vorher
        // stand hier ein unbedingtes changed=true: der Poll laeuft alle 6 s,
        // also wurde der Cache dauerhaft immer wieder geschrieben, obwohl sich
        // nichts geaendert hatte.
        const istNeu = !lscgCache[aliasKey];
        lscgCache[aliasKey] = { ...lscgCache[C.MemberNumber + ':' + lscgMatch.Name.toLowerCase()], _craftAlias: craft.Name };
        if (istNeu) changed = true;
      }
    });
    if (changed) _persistLscgCache();
  }

  let _hookInstalled = false;
  function installLSCGHook() {
    if (_hookInstalled) return;
    // Der Merker oben liegt im IIFE-Scope. Beim erneuten Klick auf das
    // Bookmarklet laeuft loader.js in einem NEUEN Scope – er steht dann wieder
    // auf false. Ohne den window-Merker liefe nach jedem Klick ein weiteres
    // Polling-Interval mit, das alle Raum-Charaktere durchgeht. Gleiches
    // Muster wie __BCK_LISTENER_FN__ und __BCK_BCX_FILTER__.
    if (window.__BCK_LSCG_POLL) clearInterval(window.__BCK_LSCG_POLL);
    // Poll alle 6s – kein CharacterRefresh-Override (kein BCX-Warning)
    window.__BCK_LSCG_POLL = setInterval(() => {
      try { [Player, ...(ChatRoomCharacter ?? [])].forEach(_snapshotAllLSCG); } catch {}
    }, 6000);
    _hookInstalled = true;
    console.log('✅ LSCG-Cache-Polling aktiv (alle 6s, eigener persistenter Cache)');
  }

  function _getLSCGFromCache(memberNumber, craftName) {
    return lscgCache[memberNumber + ':' + craftName.toLowerCase()] ?? null;
  }

  // Memoization-Cache: itemName → groupName (session-persistent)
  const _groupCache = {};
  // Ein erfolgloser Nachschlag wird NICHT dauerhaft gemerkt: Mods und Assets kommen mit Verzögerung dazu. Früher blieb ein
  // einmal gescheiterter Name für die ganze Sitzung "UNBEKANNT". Jetzt höchstens alle 20 s ein neuer Versuch.
  const _groupMiss = {};

  function findeGruppe(itemName) {
    if (_groupCache[itemName]) return _groupCache[itemName];
    if (_groupMiss[itemName] && Date.now() - _groupMiss[itemName] < 20000) return null;
    // Schnellster Weg: Asset-Array einmal direkt durchsuchen (kein Group-by-Group Loop)
    if (typeof Asset !== 'undefined') {
      for (let i = 0; i < Asset.length; i++) {
        const a = Asset[i];
        if (a.Name === itemName && a.Group?.Name) {
          _groupCache[itemName] = a.Group.Name;
          return a.Group.Name;
        }
      }
    }
    // Fallback: AssetGet per Gruppe (wenn Asset-Array nicht verfügbar)
    const gruppen = [
      'ItemHandheld','ItemMisc','ItemAddon','ItemHands','ItemArms','ItemLegs','ItemFeet',
      'ItemNeck','ItemHead','ItemMouth','ItemEyes','ItemEars','ItemNose','ItemTorso',
      'ItemTorso2','ItemPelvis','ItemVulva','ItemVulvaPiercings','ItemButt','ItemNipples',
      'ItemNipplesPiercings','ItemBoots','ItemHood','ItemDevices','ItemNeckAccessories',
      'ItemNeckRestraints','ItemMouthAccessory','Cloth','ClothLower','ClothAccessory',
      'Shoes','Hat','Gloves','Socks','Bracelet','Mask','Decals','Bra','Panties',
      'Corset','SocksRight'
    ];
    if (typeof AssetGet === 'function') {
      const _fam = (typeof Player !== 'undefined' && Player.AssetFamily) ? Player.AssetFamily : 'Female3DCG';
      for (const g of gruppen) {
        if (AssetGet(_fam, g, itemName) || AssetGet('Female3DCG', g, itemName)) {
          _groupCache[itemName] = g;
          return g;
        }
      }
    }
    _groupMiss[itemName] = Date.now();
    return null;
  }

  // Weiß BC den Namen nicht (mehr), trägt die Besitzerin das Item aber gerade: die Gruppe steht am getragenen Item.
  function gruppeAusGetragen(C, craft) {
    try {
      const it = (C.Appearance ?? []).find(i => i?.Asset?.Name === craft.Item && i?.Craft?.Name === craft.Name)
        ?? (C.Appearance ?? []).find(i => i?.Asset?.Name === craft.Item);
      return it?.Asset?.Group?.Name ?? null;
    } catch (e) { return null; }
  }

  function isCursed(craft) {
    const terms = ['cursed','enchanted'];
    const name = (craft.Name ?? '').toLowerCase();
    const desc = (craft.Description ?? '').toLowerCase();
    return terms.some(b => name.includes(b) || desc.includes(b));
  }

  function scan() {
    // Vor dem Scan: craftCache in database laden (historische Einträge verfügbar halten).
    // Nur Einträge eintragen die noch nicht in der DB sind – kein Object.entries wenn DB schon vollständig.
    // Schneller check: wenn craftCache nicht größer als database → nichts zu mergen.
    if (Object.keys(craftCache).length > Object.keys(database).length) {
      for (const k in craftCache) {
        if (!database[k]) database[k] = { ...craftCache[k], _fromCache: true };
      }
    }
    const raumChars = ChatRoomCharacter ?? [];
    _snapshotAllLSCG(Player);
    const spieler = raumChars;
    let neuDB = 0, aktualisiert = 0, neuLSCG = 0;
    // Delta-Tracking: nur in DIESEM Scan geschriebene Einträge (Crafts der
    // anwesenden Spieler) – Grundlage für die Delta-Übertragung ans Popup.
    const changed = {};
    spieler.forEach(C => {
      _snapshotAllLSCG(C);
      // LSCG-Map einmal pro Charakter aufbauen (O(1) Lookup statt O(n) find pro Craft)
      const liveCursedItems = C.LSCG?.CursedItemModule?.CursedItems ?? [];
      const lscgByName = new Map();
      for (const ci of liveCursedItems) {
        if (ci?.Name) lscgByName.set(ci.Name.toLowerCase(), ci);
      }
      (C.Crafting ?? []).forEach(craft => {
        if (!craft?.Item) return;
        const gruppe = findeGruppe(craft.Item) ?? gruppeAusGetragen(C, craft);
        const key    = C.MemberNumber + ':' + craft.Item + ':' + craft.Name;
        const istNeu = !database[key];
        // LSCG: O(1) Lookup via Map statt linearer Suche
        const lscgLive = lscgByName.get((craft.Name ?? '').toLowerCase()) ?? null;
        if (lscgLive) _cacheLSCGWithCraftAlias(C.MemberNumber, lscgLive, craft.Name);
        const lscg = lscgLive ?? _getLSCGFromCache(C.MemberNumber, craft.Name);
        const lscgIsFromCache = lscg !== null && lscgLive === null;

        const cursed = isCursed(craft);
        // R125: craft.Property kann jetzt ein Objekt/Array sein (multiple craft properties)
        const craftProperty = (() => {
          const p = craft.Property;
          if (!p) return '';
          if (typeof p === 'string') return p;
          if (Array.isArray(p)) return p.join(',');
          if (typeof p === 'object') return JSON.stringify(p);
          return String(p);
        })();
        const eintrag = {
          CraftName:      craft.Name ?? craft.Item,
          Description:    craft.Description ?? '',
          ItemName:       craft.Item,
          Gruppe:         gruppe ?? 'UNBEKANNT',
          Farbe:          craft.Color ?? '#ffffff',
          Property:       craftProperty,
          Private:        craft.Private ?? false,
          IstCursed:      cursed,
          IstLSCGCurse:   lscg !== null,
          Besitzer:       { Name: C.Nickname || C.Name, Nummer: C.MemberNumber },
          ZuletztGesehen: new Date().toLocaleTimeString(),
          Craft:          { ...craft, MemberName: C.Name, MemberNumber: C.MemberNumber },
          LSCG:           lscg,
          LSCGAusCache:   lscgIsFromCache,
        };
        if (istNeu) neuDB++; else aktualisiert++;
        database[key] = eintrag;
        changed[key]  = eintrag;
        // Persistenter Craft-Cache: immer aktualisieren wenn live-Daten vorhanden
        craftCache[key] = eintrag;
        _persistCraftCache();
        if (lscg !== null) {
          const lscgKey = C.MemberNumber + ':' + craft.Name;
          if (!lscgTable[lscgKey]) neuLSCG++;
          lscgTable[lscgKey] = {
            CraftName: eintrag.CraftName, ItemName: eintrag.ItemName,
            Gruppe: eintrag.Gruppe, Crafter: C.Name, CrafterNummer: C.MemberNumber,
            IstCursed: cursed, LSCGName: lscg.Name, OutfitKey: lscg.OutfitKey,
            Speed: lscg.Speed, Enabled: lscg.Enabled, Inexhaustable: lscg.Inexhaustable,
            AusCache: eintrag.LSCGAusCache, ZuletztGesehen: new Date().toLocaleTimeString(),
          };
        }
      });
    });
    return { database, lscgTable, lscgCache, neuDB, aktualisiert, neuLSCG, changed };
  }

  function _finde(indexOderName) {
    const entries = Object.values(database);
    if (typeof indexOderName === 'number') return entries[indexOderName];
    // Exact dbKey lookup: "memberNum:itemName:craftName"
    if (database[indexOderName]) return database[indexOderName];
    // Fallback: name search
    return entries.find(e =>
      e.CraftName.toLowerCase().includes(String(indexOderName).toLowerCase()) ||
      e.ItemName.toLowerCase().includes(String(indexOderName).toLowerCase())
    );
  }

  function wear(indexOderName, target) {
    target = target ?? Player;
    const entry = _finde(indexOderName);
    if (!entry) return { err: '"' + indexOderName + '" nicht gefunden' };
    if (entry.Gruppe === 'UNBEKANNT') {
      // Noch einmal nachschlagen – BC kennt den Namen inzwischen vielleicht
      const g = findeGruppe(entry.ItemName);
      if (g) entry.Gruppe = g;
    }
    if (entry.Gruppe === 'UNBEKANNT') return { err: 'Gruppe unbekannt für ' + entry.ItemName };
    // Color: BC wants string or array; parse comma-separated if needed
    let _color = entry.Farbe;
    if (typeof _color === 'string' && _color.includes(',')) _color = _color.split(',');
    // R125: craft.Property can be object/array - pass original Craft object as-is
    // BC's InventoryWear handles the craft object internally
    const craftObj = entry.Craft ?? null;
    InventoryWear(target, entry.ItemName, entry.Gruppe,
      _color, 0, Player.MemberNumber, craftObj);
    CharacterRefresh(target);
    ChatRoomCharacterUpdate(target);
    return { ok: true, msg: '"' + entry.CraftName + '" → ' + target.Name };
  }

  function wearOn(indexOderName, memberNumber) {
    const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === memberNumber);
    if (!TARGET) return { err: '#' + memberNumber + ' nicht im Raum' };
    return wear(indexOderName, TARGET);
  }

  installLSCGHook();

  function injectEntry(key, entry, force) {
    if (!database[key]) {
      database[key] = { ...entry, _injected: true };
    } else if (force) {
      // Merge: keep existing data, overwrite with incoming fields (e.g. corrected Gruppe)
      Object.assign(database[key], entry, { _injected: true });
    }
  }

  function loadDatabase(extDb) {
    let n = 0;
    Object.entries(extDb).forEach(([k, e]) => {
      const entry = { ...e, _injected: true };
      if (!database[k]) { database[k] = entry; n++; }
      // Auch in craftCache schreiben (neuere ZuletztGesehen gewinnt)
      if (!craftCache[k] || (e.ZuletztGesehen && e.ZuletztGesehen > (craftCache[k].ZuletztGesehen ?? ''))) {
        craftCache[k] = entry;
      }
    });
    if (n > 0) _persistCraftCache();
    console.log('[CurseScanner] loadDatabase: ' + n + ' neue Einträge (craftCache: ' + Object.keys(craftCache).length + ')');
  }

  function getLscgCache() {
    return { ...lscgCache };
  }

  function mergeLscgCache(extCache) {
    let n = 0;
    Object.entries(extCache).forEach(([key, val]) => {
      const existing = lscgCache[key];
      if (!existing || (val._cachedAt && (!existing._cachedAt || val._cachedAt > existing._cachedAt))) {
        lscgCache[key] = val;
        n++;
      }
    });
    if (n > 0) _persistLscgCache();
    console.log('[CurseScanner] mergeLscgCache: ' + n + ' neue/neuere Einträge');
    return n;
  }

  function getCraftCache() {
    return { ...craftCache };
  }

  function mergeCraftCache(extCache) {
    let n = 0;
    Object.entries(extCache).forEach(([key, val]) => {
      const existing = craftCache[key];
      if (!existing || (val.ZuletztGesehen && val.ZuletztGesehen > (existing.ZuletztGesehen ?? ''))) {
        craftCache[key] = { ...val, _injected: true };
        if (!database[key]) database[key] = craftCache[key];
        n++;
      }
    });
    if (n > 0) _persistCraftCache();
    console.log('[CurseScanner] mergeCraftCache: ' + n + ' neue/neuere Einträge');
    return n;
  }

  return { scan, wear, wearOn, injectEntry, loadDatabase, getLscgCache, mergeLscgCache, getCraftCache, mergeCraftCache, database, lscgTable, lscgCache, craftCache };
})();


  // ── Outfit-Serializer ─────────────────────────────────────────────────
  // Serialisiert einen BC-Charakter zu { memberNumber, name, nickname, code }.
  // code = LZString.compressToBase64(JSON.stringify([{Group,Name,Color,Craft?,Property?}]))
  // → Exakt das Format das LSCG's SetOutfitCode erwartet.
  function _BCU_safeClone(val) {
    if (val == null || typeof val !== 'object') return val;
    try {
      const _s = new WeakSet();
      return JSON.parse(JSON.stringify(val, function(k, v) {
        if (v && typeof v === 'object') { if (_s.has(v)) return undefined; _s.add(v); }
        return v;
      }));
    } catch(_) { return undefined; }
  }

  // Thumbnail aus C.Canvas extrahieren (80×160px JPEG)
  function _BCU_captureThumb(C) {
    try {
      const src = C.Canvas;
      if (!src || !src.width) return null;
      const W = 80, H = 160;
      const oc  = document.createElement('canvas');
      oc.width  = W; oc.height = H;
      const ctx = oc.getContext('2d');
      // BC-Canvas ist typisch 500px breit, Charakter mittig — crop auf Charakter-Bereich
      const sw = src.width, sh = src.height;
      const aspect = sh / sw;
      // Charakter nimmt ca. 60% der Canvas-Breite mittig ein
      const cx = sw * 0.2, cw = sw * 0.6, cy = 0, ch = sh;
      ctx.drawImage(src, cx, cy, cw, ch, 0, 0, W, H);
      return oc.toDataURL('image/jpeg', 0.55);
    } catch(_e) { return null; } // SecurityError bei tainted canvas → kein Thumbnail
  }

  window._BCU_serializeChar = function(C) {
    let code = null, fingerprint = '';
    try {
      const fam = C.AssetFamily ?? 'Female3DCG';
      const items = [];
      for (const item of (C.Appearance ?? [])) {
        const grp = item.Asset?.Group?.Name, name = item.Asset?.Name;
        if (!grp || !name) continue;
        if (typeof AssetGet === 'function' && !AssetGet(fam, grp, name)) continue;
        const obj = { Group: grp, Name: name, Color: _BCU_safeClone(item.Color) };
        const craft = _BCU_safeClone(item.Craft), prop = _BCU_safeClone(item.Property);
        if (craft != null) obj.Craft    = craft;
        if (prop  != null) obj.Property = prop;
        items.push(obj);
      }
      const _s2 = new WeakSet();
      code = LZString.compressToBase64(JSON.stringify(items, function(k, v) {
        if (v && typeof v === 'object') { if (_s2.has(v)) return undefined; _s2.add(v); }
        return v;
      }));
      fingerprint = items.slice()
        .sort((a, b) => a.Group.localeCompare(b.Group))
        .map(i => i.Group + '\x1f' + i.Name + '\x1f' + JSON.stringify(i.Color ?? ''))
        .join('\x1e');
    } catch(_e) { console.warn('[BCU] serializeChar:', _e); }
    const thumb = _BCU_captureThumb(C);
    return { memberNumber: C.MemberNumber, name: C.Name, nickname: C.Nickname ?? null, code, fingerprint, thumb };
  };

  // ── Gamecode-Inventar (SCAN-01..07): read-only, deskriptorbasiert, gechunkt ──
  // Enumeriert das laufende Spiel (window-Globals, Asset-Katalog, bcModSdk-
  // Mods, Fallback-Probes, Chat-Hook-Registry) und meldet das Ergebnis über
  // GAME_INVENTORY_PROGRESS/GAME_INVENTORY_DATA zurück. Regel: JEDER
  // Wertzugriff läuft ausschließlich über giReadData (Deskriptor-basiert) —
  // ein Accessor (Getter) wird nur als Name erfasst, NIE gelesen. Die
  // einzigen Funktionsaufrufe dieses Blocks auf entdeckte Werte sind
  // bcModSdk.getModsInfo()/getPatchingInfo() (dokumentierte SCAN-05-
  // Ausnahme, beides reine Lese-APIs des Mod-SDK selbst). Die Arbeit läuft
  // gechunkt in Leerlaufpausen (giNext/giChunked), damit der Spiel-Tab
  // bedienbar bleibt. Snapshot-Vertrag: { schema: 1, gameVersion, ts,
  // durationMs, globals, assets, modSdk, mods, probes, chatHooks, errors }.

  const GI_SCHEMA = 1;
  const GI_BATCH = 500;
  const GI_SAMPLE = 5;
  const GI_OTHER_MAX = 50;
  const GI_LIST_MAX = 200;
  const GI_STR_MAX = 500;
  const GI_DEPTH_MAX = 2;

  const GI_STEPS = ['Globals', 'Assets', 'Asset-Gruppen', 'ModSDK', 'Mod-Probes', 'Chat-Hooks'];

  const GI_PREFIXES = ['Character', 'Lock', 'Common', 'Player', 'Asset', 'Reputation', 'Skill', 'Pose', 'Dialog', 'Inventory', 'Item', 'Server', 'Assets', 'Online', 'Wardrobe', 'Chat'];

  // 88 Keys = die 100 SCAN-13-Keys (05-CONSOLE-RESULT.json) ohne Group,
  // ParentItem, Layer (gesondert behandelt, s.u.) und ohne die zwölf
  // Dynamic*-Keys (Funktionen — würden postMessage mit DataCloneError
  // abbrechen, RESEARCH Pitfall 6).
  const GI_ASSET_KEYS = ['Name', 'Description', 'Enable', 'Visible', 'DrawOffset', 'NotVisibleOnScreen', 'Wear', 'Activity', 'ActivityAudio', 'AllowActivity', 'AllowActivityOn', 'ActivityExpression', 'BuyGroup', 'InventoryID', 'Effect', 'Bonus', 'Block', 'Expose', 'Hide', 'HideItem', 'HideItemExclude', 'HideItemAttribute', 'Require', 'SetPose', 'AllowActivePose', 'Value', 'NeverSell', 'Difficulty', 'SelfBondage', 'SelfUnlock', 'ExclusiveUnlock', 'Random', 'RemoveAtLogin', 'WearTime', 'RemoveTime', 'RemoveTimer', 'MaxTimer', 'HeightModifier', 'ZoomModifier', 'Prerequisite', 'Extended', 'AlwaysExtend', 'AlwaysInteract', 'AllowLock', 'LayerVisibility', 'IsLock', 'PickDifficulty', 'OwnerOnly', 'LoverOnly', 'FamilyOnly', 'ExpressionTrigger', 'RemoveItemOnRemove', 'AllowEffect', 'AllowBlock', 'AllowTighten', 'AllowHide', 'AllowHideItem', 'DefaultColor', 'EditOpacity', 'Audio', 'Category', 'Fetish', 'ArousalZone', 'IsRestraint', 'BodyCosplay', 'OverrideBlinking', 'DialogSortOverride', 'AllowRemoveExclusive', 'InheritColor', 'CreateLayerTypes', 'AllowLockType', 'AvailableLocations', 'OverrideHeight', 'DrawLocks', 'AllowExpression', 'MirrorExpression', 'FixedPosition', 'ColorableLayerCount', 'CustomBlindBackground', 'Attribute', 'PreviewIcons', 'Tint', 'AllowTint', 'DefaultTint', 'Gender', 'CraftGroup', 'ExpressionPrerequisite', 'AllowColorize'];

  // [ASSUMED] Feldnamen aus BC-Quellcode-Kenntnis, nicht per SCAN-13
  // verifiziert; unbekannte Keys werden übersprungen, Funktionswerte fallen
  // durch giBounded weg (kein Fehlerpfad).
  const GI_GROUP_KEYS = ['Name', 'Description', 'Category', 'Family', 'IsDefault', 'IsRestraint', 'AllowNone', 'AllowColorize', 'AllowCustomize', 'Random', 'Color', 'ParentGroup', 'Clothing', 'Underwear', 'BodyCosplay', 'Hide', 'Block', 'Zone', 'SetPose', 'AllowPose', 'AllowExpression', 'Effect', 'MirrorGroup', 'RemoveItemOnRemove', 'DrawingPriority', 'DrawingLeft', 'DrawingTop', 'DrawingFullAlpha', 'DrawingBlink', 'InheritColor', 'FreezeActivePose', 'PreviewZone', 'MirrorActivitiesFrom', 'HasPreviewImages', 'IsAppearance', 'IsItem', 'IsScript'];

  // Einziger Wertzugriff des gesamten Blocks: Deskriptor lesen, Accessor
  // (Getter/Setter) NIE auswerten (SCAN-07, Pitfall 1).
  function giReadData(obj, name) {
    if (obj == null || (typeof obj !== 'object' && typeof obj !== 'function')) return { kind: 'missing' };
    let d;
    try { d = Object.getOwnPropertyDescriptor(obj, name); } catch (_e) { return { kind: 'missing' }; }
    if (!d) return { kind: 'missing' };
    if (d.get || d.set) return { kind: 'getter' };
    return { kind: 'data', value: d.value };
  }

  // Für Metafelder (Namen, Versionen, Hashes) — kürzt lange Strings.
  function giScalar(v) {
    if (v == null) return null;
    if (typeof v === 'string') return v.slice(0, GI_STR_MAX);
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    return String(v);
  }

  // Begrenzte, klonbare Kopie: Tiefe/Umfang/Stringlänge gedeckelt, Funktionen
  // und Symbole fallen durch (SCAN-07, T-5-02).
  function giBounded(v, depth) {
    if (v === undefined || typeof v === 'function' || typeof v === 'symbol') return undefined;
    if (v === null) return null;
    const t = typeof v;
    if (t === 'string') return v.slice(0, GI_STR_MAX);
    if (t === 'number' || t === 'boolean') return v;
    if (t === 'bigint') return String(v);
    if (depth > GI_DEPTH_MAX) return '[…]';
    if (Array.isArray(v)) {
      const out = [];
      for (const item of v.slice(0, GI_LIST_MAX)) {
        const b = giBounded(item, depth + 1);
        out.push(b === undefined ? null : b);
      }
      return out;
    }
    if (t === 'object') {
      const out = {};
      for (const k of Object.keys(v).slice(0, GI_LIST_MAX)) {
        const r = giReadData(v, k);
        if (r.kind !== 'data' || r.value === undefined) continue;
        const b = giBounded(r.value, depth + 1);
        if (b !== undefined) out[k] = b;
      }
      return out;
    }
    return undefined;
  }

  // Leerlaufpause, Muster _BCU_leerlauf: rIC bevorzugt, sonst
  // setTimeout(fn, 0) — bewusst 0ms statt 16ms (Orchestrator-Entscheidung 2),
  // damit dieser Block eigenständig bleibt und _BCU_leerlauf unverändert
  // bleibt.
  function giNext(fn) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 1500 });
    } else {
      setTimeout(fn, 0);
    }
  }

  // Verarbeitet `items` in Slices von GI_BATCH über giNext — der ERSTE
  // Slice läuft ebenfalls über giNext, damit der aufrufende Case IMMER vor
  // jeder Arbeit zurückkehrt (SCAN-07). Ein werfendes onItem überspringt nur
  // das eine Element, der Lauf geht weiter.
  function giChunked(items, onItem, onSlice, onDone) {
    let i = 0;
    let sliceIndex = 0;
    const sliceCount = Math.max(1, Math.ceil(items.length / GI_BATCH));
    function tick() {
      const end = Math.min(i + GI_BATCH, items.length);
      for (; i < end; i++) {
        try { onItem(items[i], i); } catch (_e) { /* einzelnes Element überspringen */ }
      }
      sliceIndex++;
      try { onSlice(sliceIndex, sliceCount); } catch (_e) {}
      if (i < items.length) giNext(tick);
      else onDone();
    }
    giNext(tick);
  }

  // Beschreibt die API-Fläche eines Objekts NUR über Namen+Art —
  // Object.getOwnPropertyNames statt Object.keys (Pitfall 5: nicht-
  // enumerierbare APIs wie bcx blieben sonst unsichtbar).
  function giDescribeApi(obj) {
    if (obj == null || (typeof obj !== 'object' && typeof obj !== 'function')) return [];
    let names;
    try { names = Object.getOwnPropertyNames(obj); } catch (_e) { return []; }
    const out = [];
    for (const name of names.slice(0, GI_LIST_MAX)) {
      const r = giReadData(obj, name);
      if (r.kind === 'missing') continue;
      if (r.kind === 'getter') { out.push({ name, kind: 'getter' }); continue; }
      const v = r.value;
      const t = typeof v;
      out.push({ name, kind: t === 'function' ? 'function' : (v === null ? 'null' : t) });
    }
    return out;
  }

  // SCAN-05: bcModSdk-Lese-API — die einzige dokumentierte Ausnahme von
  // "nie Funktionen aufrufen": getModsInfo()/getPatchingInfo() sind reine
  // Lesefunktionen des Mod-SDK selbst, kein Spielzustand wird verändert.
  function giMods(sdk) {
    const r = giReadData(sdk, 'getModsInfo');
    if (r.kind !== 'data' || typeof r.value !== 'function') return [];
    let list;
    try { list = r.value.call(sdk); } catch (_e) { return []; }
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const m of list) {
      out.push({
        name: giScalar(giReadData(m, 'name').value),
        fullName: giScalar(giReadData(m, 'fullName').value),
        version: giScalar(giReadData(m, 'version').value),
        repository: giScalar(giReadData(m, 'repository').value),
      });
    }
    return out;
  }

  function giPatching(sdk) {
    const r = giReadData(sdk, 'getPatchingInfo');
    if (r.kind !== 'data' || typeof r.value !== 'function') return [];
    let map;
    try { map = r.value.call(sdk); } catch (_e) { return []; }
    const out = [];
    function pushEntry(key, info) {
      const nameVal = giReadData(info, 'name');
      const hashVal = giReadData(info, 'originalHash');
      const hookedVal = giReadData(info, 'hookedByMods');
      const patchedVal = giReadData(info, 'patchedByMods');
      out.push({
        name: giScalar(nameVal.kind === 'data' ? nameVal.value : key),
        originalHash: giScalar(hashVal.kind === 'data' ? hashVal.value : null),
        hookedByMods: hookedVal.kind === 'data' && Array.isArray(hookedVal.value) ? hookedVal.value.map(giScalar) : [],
        patchedByMods: patchedVal.kind === 'data' && Array.isArray(patchedVal.value) ? patchedVal.value.map(giScalar) : [],
      });
    }
    if (map instanceof Map) {
      for (const [key, info] of map) pushEntry(key, info);
    } else if (map && typeof map.forEach === 'function') {
      map.forEach((info, key) => pushEntry(key, info));
    } else if (map && typeof map === 'object') {
      for (const key of Object.keys(map)) pushEntry(key, map[key]);
    }
    return out;
  }

  // Kernfunktion: baut den Snapshot Schritt für Schritt (Globals → Assets →
  // Asset-Gruppen → ModSDK → Mod-Probes → Chat-Hooks) und postet nach jedem
  // Schritt einen Fortschritt, am Ende genau einmal das Ergebnis. Ein
  // Fehler in einem Schritt bricht die Kette NIE ab (fail() sammelt ihn,
  // der nächste Schritt läuft trotzdem).
  function buildGameInventory(reqId, post) {
    const t0 = Date.now();
    const errors = [];
    const snapshot = {
      schema: GI_SCHEMA,
      gameVersion: null,
      ts: t0,
      durationMs: 0,
      globals: null,
      assets: null,
      modSdk: null,
      mods: [],
      probes: null,
      chatHooks: null,
      errors,
    };

    function fail(step, err) {
      errors.push({ step, message: String((err && err.message) || err) });
    }

    let aborted = false;
    function safePost(msg) {
      if (aborted) return;
      try {
        post(msg);
      } catch (err) {
        aborted = true;
        try {
          post({ type: 'GAME_INVENTORY_DATA', reqId, err: String((err && err.name) || 'Error') + ': ' + String((err && err.message) || err) });
        } catch (_e2) { /* Tool-Fenster nicht mehr erreichbar — nichts mehr zu tun */ }
      }
    }

    function progressMsg(step, sliceIndex, sliceCount) {
      safePost({
        type: 'GAME_INVENTORY_PROGRESS',
        reqId,
        step,
        total: GI_STEPS.length,
        label: GI_STEPS[step - 1] + (sliceCount > 1 ? ' ' + sliceIndex + '/' + sliceCount : ''),
      });
    }

    function step1() {
      try {
        const gv = giReadData(window, 'GameVersion');
        snapshot.gameVersion = gv.kind === 'data' && typeof gv.value === 'string' ? gv.value : null;

        let names;
        try {
          names = Object.getOwnPropertyNames(window);
        } catch (err) {
          fail(1, err);
          snapshot.globals = { error: String((err && err.message) || err) };
          giNext(step2);
          return;
        }

        const agr = giReadData(window, 'AssetGroup');
        let groupNames = [];
        if (agr.kind === 'data' && Array.isArray(agr.value)) {
          for (const g of agr.value) {
            const gn = giReadData(g, 'Name');
            if (gn.kind === 'data' && typeof gn.value === 'string') groupNames.push(gn.value);
          }
        }
        groupNames = groupNames.slice().sort((a, b) => b.length - a.length);

        const getters = [];
        const functions = [];
        const values = [];
        const byPrefix = {};
        for (const p of GI_PREFIXES) byPrefix[p] = 0;
        const buckets = new Map();
        const other = { count: 0, names: [] };

        function bucket(groupName) {
          let b = buckets.get(groupName);
          if (!b) {
            b = { prefix: 'InventoryItem' + groupName, group: groupName, count: 0, sample: [] };
            buckets.set(groupName, b);
          }
          return b;
        }

        giChunked(names, (name) => {
          for (const p of GI_PREFIXES) if (name.startsWith(p)) byPrefix[p]++;
          const r = giReadData(window, name);
          if (r.kind === 'missing') return;
          if (r.kind === 'getter') { getters.push(name); return; }
          const v = r.value;
          const t = typeof v;
          if (t === 'function') {
            const ar = giReadData(v, 'length');
            const arity = ar.kind === 'data' && typeof ar.value === 'number' ? ar.value : null;
            if (name.startsWith('InventoryItem')) {
              const g = groupNames.find((gn) => name.startsWith('InventoryItem' + gn));
              if (g) {
                const b = bucket(g);
                b.count++;
                if (b.sample.length < GI_SAMPLE) b.sample.push(name);
              } else {
                other.count++;
                if (other.names.length < GI_OTHER_MAX) other.names.push(name);
              }
            } else {
              functions.push({ name, arity });
            }
          } else {
            values.push({ name, type: v === null ? 'null' : t });
          }
        }, (si, sc) => progressMsg(1, si, sc), () => {
          snapshot.globals = {
            total: names.length,
            getters,
            functions,
            values,
            byPrefix,
            inventory: { groups: Array.from(buckets.values()), other },
          };
          giNext(step2);
        });
      } catch (err) {
        fail(1, err);
        if (!snapshot.globals) snapshot.globals = { error: String((err && err.message) || err) };
        giNext(step2);
      }
    }

    function step2() {
      try {
        const ar = giReadData(window, 'Asset');
        if (ar.kind !== 'data' || !Array.isArray(ar.value)) {
          snapshot.assets = { error: 'Asset[] nicht verfügbar', count: 0, groupCount: 0, groups: [], items: [] };
          progressMsg(2, 1, 1);
          giNext(step3);
          return;
        }
        const A = ar.value;
        const items = [];
        giChunked(A, (a) => {
          if (!a || (typeof a !== 'object' && typeof a !== 'function')) return;
          const it = {};

          const g = giReadData(a, 'Group');
          if (g.kind === 'data' && g.value && typeof g.value === 'object') {
            const gn = giReadData(g.value, 'Name');
            it.Group = gn.kind === 'data' && typeof gn.value === 'string' ? gn.value : null;
          } else if (g.kind === 'data' && typeof g.value === 'string') {
            it.Group = g.value;
          } else {
            it.Group = null;
          }

          const p = giReadData(a, 'ParentItem');
          if (p.kind !== 'data' || p.value == null) {
            it.ParentItem = null;
          } else if (typeof p.value === 'object') {
            const pn = giReadData(p.value, 'Name');
            it.ParentItem = pn.kind === 'data' ? giScalar(pn.value) : null;
          } else {
            it.ParentItem = giScalar(p.value);
          }

          const L = giReadData(a, 'Layer');
          if (L.kind === 'data' && Array.isArray(L.value)) {
            const layerNames = [];
            for (const l of L.value.slice(0, GI_OTHER_MAX)) {
              if (l && typeof l === 'object') {
                const ln = giReadData(l, 'Name');
                layerNames.push(ln.kind === 'data' ? giScalar(ln.value) : null);
              } else {
                layerNames.push(null);
              }
            }
            it.Layer = { count: L.value.length, names: layerNames };
          } else {
            it.Layer = { count: 0, names: [] };
          }

          for (const k of GI_ASSET_KEYS) {
            const r = giReadData(a, k);
            if (r.kind !== 'data' || r.value === undefined) continue;
            const b = giBounded(r.value, 0);
            if (b !== undefined) it[k] = b;
          }

          items.push(it);
        }, (si, sc) => progressMsg(2, si, sc), () => {
          snapshot.assets = { count: A.length, groupCount: 0, groups: [], items };
          giNext(step3);
        });
      } catch (err) {
        fail(2, err);
        if (!snapshot.assets) snapshot.assets = { error: String((err && err.message) || err), count: 0, groupCount: 0, groups: [], items: [] };
        giNext(step3);
      }
    }

    function step3() {
      try {
        const gr = giReadData(window, 'AssetGroup');
        if (gr.kind === 'data' && Array.isArray(gr.value)) {
          const groups = [];
          for (const g of gr.value.slice(0, 1000)) {
            const out = {};
            for (const k of GI_GROUP_KEYS) {
              const r = giReadData(g, k);
              if (r.kind !== 'data' || r.value === undefined) continue;
              const b = giBounded(r.value, 0);
              if (b !== undefined) out[k] = b;
            }
            const asr = giReadData(g, 'Asset');
            out.assetCount = asr.kind === 'data' && Array.isArray(asr.value) ? asr.value.length : 0;
            groups.push(out);
          }
          if (snapshot.assets) {
            snapshot.assets.groups = groups;
            snapshot.assets.groupCount = groups.length;
          }
        }
      } catch (err) {
        fail(3, err);
      }
      progressMsg(3, 1, 1);
      giNext(step4);
    }

    function step4() {
      try {
        const sr = giReadData(window, 'bcModSdk');
        if (sr.kind === 'data' && sr.value && (typeof sr.value === 'object' || typeof sr.value === 'function')) {
          const sdk = sr.value;
          let mods = [];
          let patching = [];
          try { mods = giMods(sdk); } catch (err) { fail(4, err); }
          try { patching = giPatching(sdk); } catch (err) { fail(4, err); }
          const vr = giReadData(sdk, 'version');
          snapshot.modSdk = {
            available: true,
            version: giScalar(vr.kind === 'data' ? vr.value : null),
            modCount: mods.length,
            patchingCount: patching.length,
            patching,
          };
          snapshot.mods = mods;
        } else {
          snapshot.modSdk = { available: false, version: null, modCount: 0, patchingCount: 0, patching: [] };
          snapshot.mods = [];
        }
      } catch (err) {
        fail(4, err);
        if (!snapshot.modSdk) snapshot.modSdk = { available: false, version: null, modCount: 0, patchingCount: 0, patching: [] };
      }
      progressMsg(4, 1, 1);
      giNext(step5);
    }

    function step5() {
      try {
        const g = snapshot.globals && !snapshot.globals.error ? snapshot.globals : null;
        const fnNames = g ? g.functions.map((f) => f.name) : [];
        const allNames = g ? g.getters.concat(fnNames, g.values.map((v) => v.name)) : [];

        const fbcVer = giReadData(window, 'FBC_VERSION');
        const wcePresent = fbcVer.kind === 'data' && typeof fbcVer.value === 'string';
        const wce = {
          present: wcePresent,
          version: wcePresent ? fbcVer.value : null,
          functions: fnNames.filter((n) => /^(fbc|wce)/i.test(n)).slice(0, GI_LIST_MAX),
        };

        const bcxLoadedR = giReadData(window, 'BCX_Loaded');
        const bcxLoaded = bcxLoadedR.kind === 'data' && typeof bcxLoadedR.value === 'boolean' ? bcxLoadedR.value : null;
        const bcxObjR = giReadData(window, 'bcx');
        const bcxPresent = bcxObjR.kind === 'data' && !!bcxObjR.value && typeof bcxObjR.value === 'object';
        let bcxVersion = null;
        if (bcxPresent) {
          const vr = giReadData(bcxObjR.value, 'version');
          if (vr.kind === 'data' && typeof vr.value === 'string') bcxVersion = vr.value;
          else if (vr.kind === 'getter') bcxVersion = 'getter';
        }
        const bcx = { present: bcxPresent, loaded: bcxLoaded, version: bcxVersion, api: bcxPresent ? giDescribeApi(bcxObjR.value) : [] };

        const mbsObjR = giReadData(window, 'mbs');
        const mbsPresent = mbsObjR.kind === 'data' && !!mbsObjR.value && typeof mbsObjR.value === 'object';
        let mbsVersion = null;
        let mbsApiVersion = null;
        if (mbsPresent) {
          const vr = giReadData(mbsObjR.value, 'MBS_VERSION');
          mbsVersion = giScalar(vr.kind === 'data' ? vr.value : null);
          const avr = giReadData(mbsObjR.value, 'API_VERSION');
          if (avr.kind === 'data' && avr.value && typeof avr.value === 'object') {
            mbsApiVersion = {
              major: giScalar(giReadData(avr.value, 'major').value),
              minor: giScalar(giReadData(avr.value, 'minor').value),
            };
          }
        }
        const mbs = { present: mbsPresent, version: mbsVersion, apiVersion: mbsApiVersion, api: mbsPresent ? giDescribeApi(mbsObjR.value) : [] };

        const lscgLoadedR = giReadData(window, 'LSCG_Loaded');
        const lscgLoaded = lscgLoadedR.kind === 'data' && typeof lscgLoadedR.value === 'boolean' ? lscgLoadedR.value : null;
        const lscgObjR = giReadData(window, 'LSCG');
        const lscgPresent = lscgObjR.kind === 'data' && !!lscgObjR.value && typeof lscgObjR.value === 'object';
        const screenFns = allNames.filter((n) => /^LSCG_/.test(n));
        const lscg = {
          present: lscgPresent,
          loaded: lscgLoaded,
          api: lscgPresent ? giDescribeApi(lscgObjR.value) : [],
          screenFunctions: { count: screenFns.length, sample: screenFns.slice(0, GI_OTHER_MAX) },
        };

        const themedLoadedR = giReadData(window, 'ThemedLoaded');
        const themedLoaded = themedLoadedR.kind === 'data' && typeof themedLoadedR.value === 'boolean' ? themedLoadedR.value : null;
        const themedFns = allNames.filter((n) => /^Themed_/.test(n));
        const themed = {
          present: themedLoaded === true || themedFns.length > 0,
          loaded: themedLoaded,
          screenFunctionCount: themedFns.length,
          sample: themedFns.slice(0, GI_OTHER_MAX),
        };

        const sweep = allNames.filter((n) => /^(WCE|FBC|LSCG|MBS|BCX|Themed)/i.test(n)).slice(0, GI_LIST_MAX);

        snapshot.probes = { wce, bcx, mbs, lscg, themed, sweep };
      } catch (err) {
        fail(5, err);
        if (!snapshot.probes) {
          snapshot.probes = {
            wce: { present: false, version: null, functions: [] },
            bcx: { present: false, loaded: null, version: null, api: [] },
            mbs: { present: false, version: null, apiVersion: null, api: [] },
            lscg: { present: false, loaded: null, api: [], screenFunctions: { count: 0, sample: [] } },
            themed: { present: false, loaded: null, screenFunctionCount: 0, sample: [] },
            sweep: [],
          };
        }
      }
      progressMsg(5, 1, 1);
      giNext(step6);
    }

    function step6() {
      try {
        const hr = giReadData(window, 'ChatRoomRegisterMessageHandler');
        const exists = hr.kind === 'data' && typeof hr.value === 'function';
        let arity = null;
        if (exists) {
          const ar = giReadData(hr.value, 'length');
          arity = ar.kind === 'data' && typeof ar.value === 'number' ? ar.value : null;
        }
        snapshot.chatHooks = {
          ChatRoomRegisterMessageHandler: { exists, arity, kind: hr.kind },
          registry: null,
          hookedChatFunctions: [],
        };

        const checked = ['ChatRoomMessageHandlers'];
        let registry = { introspectable: false, checked };
        for (const name of checked) {
          const cr = giReadData(window, name);
          if (cr.kind === 'data' && Array.isArray(cr.value)) {
            const handlers = [];
            for (const h of cr.value.slice(0, GI_LIST_MAX)) {
              const dr = giReadData(h, 'Description');
              const pr = giReadData(h, 'Priority');
              handlers.push({
                Description: giScalar(dr.kind === 'data' ? dr.value : null),
                Priority: pr.kind === 'data' && typeof pr.value === 'number' ? pr.value : null,
              });
            }
            registry = { introspectable: true, source: name, count: cr.value.length, handlers };
            break;
          }
        }
        snapshot.chatHooks.registry = registry;

        const patching = snapshot.modSdk && Array.isArray(snapshot.modSdk.patching) ? snapshot.modSdk.patching : [];
        snapshot.chatHooks.hookedChatFunctions = patching
          .filter((p) => /^ChatRoom/.test(p.name))
          .map((p) => ({ name: p.name, hookedByMods: p.hookedByMods }));
      } catch (err) {
        fail(6, err);
        if (!snapshot.chatHooks) {
          snapshot.chatHooks = {
            ChatRoomRegisterMessageHandler: { exists: false, arity: null, kind: 'missing' },
            registry: { introspectable: false, checked: ['ChatRoomMessageHandlers'] },
            hookedChatFunctions: [],
          };
        }
      }
      progressMsg(6, 1, 1);
      snapshot.durationMs = Date.now() - t0;
      safePost({ type: 'GAME_INVENTORY_DATA', reqId, snapshot });
      try {
        BCK.ok('[GameScan] Inventar gesendet: ' + ((snapshot.globals && snapshot.globals.total) || 0) + ' Globals, ' + ((snapshot.assets && snapshot.assets.count) || 0) + ' Assets, ' + snapshot.mods.length + ' Mods, ' + snapshot.durationMs + ' ms');
      } catch (_e) {}
    }

    step1();
  }

  window.__BCK_buildGameInventory = buildGameInventory; // Test-Seam (Muster _BCU_serializeChar); im Spiel ungenutzt

  // ── Spiel-Server-Zustand (DC-Pause im Tool) ─────────────
  // BC verliert gelegentlich die Verbindung zum Server ("Server connection lost"
  // → Relog-Screen → "Connected to the Bondage Club Server"). Der Loader lebt
  // dabei weiter, die Bridge merkt davon also nichts. Das Tool braucht diesen
  // Zustand, um laufende Abläufe (Screenshot-Serien, Curse-Test …) anzuhalten
  // und erst weiterzumachen, wenn BC wieder eingeloggt und im Raum ist.
  function _bckGameState() {
    const st = { online: true, loggedIn: false, screen: '', inRoom: false, room: null };
    try {
      if (typeof ServerIsConnected === 'boolean') st.online = ServerIsConnected;
      st.screen = (typeof CurrentScreen === 'string') ? CurrentScreen : '';
      st.loggedIn = !!(window.Player && window.Player.MemberNumber != null)
        && st.screen !== 'Relog' && st.screen !== 'Login';
      if (st.online && st.loggedIn) {
        st.inRoom = (typeof ServerPlayerIsInChatRoom === 'function')
          ? !!ServerPlayerIsInChatRoom()
          : st.screen === 'ChatRoom';
      }
      if (st.inRoom && typeof ChatRoomData !== 'undefined' && ChatRoomData?.Name) st.room = String(ChatRoomData.Name);
    } catch (e) {}
    return st;
  }
  window.__BCK_gameState = _bckGameState; // Test-Seam

  // ── PostMessage Listener ───────────────────────────────
  // Always replace the old listener so re-running the bookmarklet picks up new code
  if (window.__BCK_LISTENER_FN__) {
    window.removeEventListener('message', window.__BCK_LISTENER_FN__);
    BCK.info('Alter Listener entfernt – wird durch neue Version ersetzt');
  }
  window.__BCK_LISTENER__ = true;

  window.__BCK_LISTENER_FN__ = function (ev) {
      // FIX: Validate origin - only accept messages from the known popup URL
      // This prevents arbitrary pages from executing EXEC commands in the BC context
      if (!ev.data || ev.data.app !== APP) return;
      if (ev.origin !== ALLOWED_ORIGIN) {
        BCK.warn('postMessage von unbekannter Origin blockiert:', ev.origin);
        return;
      }
      const src = ev.source;
      // Source-Pinning (STAB-06): nach dem ersten Kontakt nur noch das gepinnte Tool-Fenster; PING darf immer neu pinnen (Tool-Fenster neu geladen / 🔄 Verbinden)
      if (window.__BCK_popupRef && src !== window.__BCK_popupRef && ev.data.type !== 'PING') { BCK.warn('postMessage von nicht gepinnter Quelle blockiert:', ev.data.type); return; }
      window.__BCK_popupRef = src; // Bot kann damit Logs zurückschicken
      BCK.info('\u2190 postMessage:', ev.data.type, '| origin:', ev.origin);

      switch (ev.data.type) {
        case 'PING':
          BCK.info('PING \u2192 sende PONG');
          src.postMessage({ app: APP, type: 'PONG', game: _bckGameState() }, ALLOWED_ORIGIN);
          break;

        case 'GET_CACHE': {
          BCK.info('GET_CACHE \u2013 baue Cache...');
          let cache = {}, err = null;
          try {
            // Memoize: Das Asset-Array ist nach Spielstart statisch. buildBCCache()
            // (kompletter Asset-Durchlauf + fn.toString()-Parsing) blockiert den
            // Main-Thread sekundenlang \u2192 nur einmal bauen, danach wiederverwenden.
            // ev.data.force erzwingt einen Rebuild (z.B. nach Mod-Nachladen).
            if (window.__BCK_cacheMemo && !ev.data.force) {
              cache = window.__BCK_cacheMemo;
              BCK.ok('Cache aus Memo (kein Rebuild)');
            } else {
              cache = buildBCCache();
              window.__BCK_cacheMemo = cache;
              const gc = Object.keys(cache).length;
              const ic = Object.values(cache).reduce((n,g)=>n+Object.keys(g).length,0);
              BCK.ok('Cache: ' + gc + ' Gruppen, ' + ic + ' Items');
            }
          } catch (ex) {
            err = ex.message;
            BCK.err('buildBCCache FEHLER:', ex.message);
          }
          BCK.info('Sende CACHE_DATA | err:', err ?? 'keiner');
          // Asset-Basis fuer Vorschaubild-URLs (Export-Katalog). BC serviert Previews unter
          // <origin>/Assets/<Family>/<Group>/Preview/<Name>.png
          let assetBase = '', assetFamily = 'Female3DCG';
          try {
            assetBase   = location.origin + location.pathname.replace(/[^/]*$/, '');
            assetFamily = (typeof Player !== 'undefined' && Player?.AssetFamily) ? Player.AssetFamily : 'Female3DCG';
          } catch (e) {}
          src.postMessage({ app: APP, type: 'CACHE_DATA', cache, err, assetBase, assetFamily }, ALLOWED_ORIGIN);
          break;
        }

        case 'GET_PLAYER': {
          try {
            const P = window.Player;
            src.postMessage({ app: APP, type: 'PLAYER_DATA',
              memberNumber: P?.MemberNumber,
              name: P?.Name,
              members: (window.ChatRoomCharacter ?? []).map(c => ({ num: c.MemberNumber, name: c.Name })),
              game: _bckGameState(),
            }, ALLOWED_ORIGIN);
          } catch (ex) {
            src.postMessage({ app: APP, type: 'PLAYER_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_SPIELER_PROFILE': {
          // Spielerprofile (Tab "Spielerprofile"): alles Auslesbare der Spieler im Raum + du selbst. Nur lesen.
          // fehlt / erzwingen: Nummern, von denen das Tool ein Bild haben will (Aufnahme nur, wenn der Spieler im Raum ist)
          try {
            const r = _spielerProfileScan({ fehlt: ev.data.fehlt, erzwingen: ev.data.erzwingen });
            src.postMessage({ app: APP, type: 'SPIELER_PROFILE_DATA', reqId: ev.data.reqId, results: r.results, room: r.room,
              gameVersion: r.gameVersion, scanTime: Date.now() }, ALLOWED_ORIGIN);
          } catch (ex) {
            src.postMessage({ app: APP, type: 'SPIELER_PROFILE_DATA', reqId: ev.data.reqId, err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_SPIELER_CACHE': {
          // Der Profil-Speicher von WCE/FBC ("/profiles"): alle gespeicherten Profile in Stapeln. Nur lesen.
          const reqId = ev.data.reqId;
          if (window.__BCK_SP_CACHE_LAEUFT) { src.postMessage({ app: APP, type: 'SPIELER_CACHE_DATA', reqId: reqId, err: 'Das Einlesen läuft bereits' }, ALLOWED_ORIGIN); break; }
          window.__BCK_SP_CACHE_LAEUFT = true;
          let teil = 0;
          _spCacheLesen(Number.isFinite(ev.data.seit) ? ev.data.seit : 0, function (m) {
            m.app = APP; m.type = 'SPIELER_CACHE_DATA'; m.reqId = reqId; m.teil = teil++;
            src.postMessage(m, ALLOWED_ORIGIN);
          }).catch(function (ex) {
            src.postMessage({ app: APP, type: 'SPIELER_CACHE_DATA', reqId: reqId, teil: teil++, err: String((ex && ex.message) || ex) }, ALLOWED_ORIGIN);
          }).then(function () { window.__BCK_SP_CACHE_LAEUFT = false; });
          break;
        }

        case 'GET_SPIELER_BILDER': {
          // Bilder für die genannten Spieler (höchstens 10 je Anfrage): im Raum → deren Zeichenpuffer, sonst aus dem WCE/FBC-Speicher
          const reqId = ev.data.reqId;
          const nrs = (Array.isArray(ev.data.nrs) ? ev.data.nrs : []).filter(Number.isInteger).slice(0, 10);
          if (_spBilderLaeuft) { src.postMessage({ app: APP, type: 'SPIELER_BILDER_DATA', reqId: reqId, err: 'belegt' }, ALLOWED_ORIGIN); break; }
          _spBilderLaeuft = true;
          _spBilderErzeugen(nrs).then(function (r) {
            src.postMessage({ app: APP, type: 'SPIELER_BILDER_DATA', reqId: reqId, bilder: r.bilder, fehler: r.fehler }, ALLOWED_ORIGIN);
          }, function (ex) {
            src.postMessage({ app: APP, type: 'SPIELER_BILDER_DATA', reqId: reqId, err: String((ex && ex.message) || ex) }, ALLOWED_ORIGIN);
          }).then(function () { _spBilderLaeuft = false; });
          break;
        }

        case 'GET_POS': {
          try {
            const P = window.Player;
            src.postMessage({ app: APP, type: 'POS_DATA', reqId: ev.data.reqId, x: P?.X ?? 0, y: P?.Y ?? 0 }, ALLOWED_ORIGIN);
          } catch (ex) {
            src.postMessage({ app: APP, type: 'POS_DATA', reqId: ev.data.reqId, err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_CHAR_APPEARANCE': {
          // Returns the full Appearance of a character as a saveable profile item list.
          // memberNum: number – target character. null/undefined → Player.
          // reqId: string – echoed back so the popup can match the response to a callback.
          try {
            const _targetNum = ev.data.memberNum;
            let _C = null;
            if (_targetNum) {
              _C = (window.ChatRoomCharacter ?? []).find(c => c.MemberNumber === _targetNum) ?? null;
            }
            if (!_C) _C = window.Player;
            if (!_C) throw new Error('Charakter nicht gefunden');

            // Convert BC Appearance items → profile item format.
            // _ALWAYS_SKIP: purely decorative / expression groups – never included.
            // _BODY_PROP_GROUPS: mandatory body slots (AllowNone===false) – include ONLY when
            //   curses have written non-trivial properties. Marked _bodyOnly:true so the code
            //   generator patches properties instead of calling InventoryWear.
            const _ALWAYS_SKIP = new Set([
              'Eyes','Eyes2','EyesColor','EyesColor2',
              'Blush','Emoticon','Fluids','ExpressionFull',
            ]);
            const _BODY_PROP_GROUPS = new Set([
              'BodyUpper','BodyLower','BodyMarkings','Head','Mouth',
            ]);
            // Hair colour overlay groups – include only if curse wrote props or explicit Color
            // (not in _ALWAYS_SKIP so this check actually runs)
            const _HAIR_COLOR_GROUPS = new Set([
              'HairColor','HairColorAccessory','HairColorUnder',
            ]);
            // Hair model groups – AllowNone===false in BC so they'd normally be skipped,
            // but we MUST capture them: the curse stores its colour change directly on
            // HairFront/HairBack, and Standard-Haare needs their default colour too.
            const _HAIR_MODEL_GROUPS = new Set([
              'HairFront','HairBack','HairSide','HairFront2','HairBack2',
            ]);

            const _PROP_SKIP = new Set([
              'LockedBy','LockMemberNumber','RemoveTimer','Password','CombinationNumber',
              'MemberNumberListKeys','LockPickSeed','ShowTimer',
            ]);

            const _items = (_C.Appearance ?? [])
              .filter(item => {
                if (!item?.Asset?.Group) return false;
                const gn = item.Asset.Group.Name ?? '';
                if (_ALWAYS_SKIP.has(gn)) return false;
                // Body slots: only include if a curse wrote properties worth saving
                if (_BODY_PROP_GROUPS.has(gn)) {
                  const prop = item.Property ?? {};
                  const relevantKeys = Object.keys(prop).filter(k => !_PROP_SKIP.has(k));
                  return relevantKeys.length > 0;
                }
                // Hair model groups: always capture – AllowNone===false would otherwise skip them,
                // but the curse colour is stored directly on these items.
                if (_HAIR_MODEL_GROUPS.has(gn)) return true;
                // Hair colour groups: include if Color is set (curse may have changed it)
                if (_HAIR_COLOR_GROUPS.has(gn)) {
                  const prop = item.Property ?? {};
                  const hasProps = Object.keys(prop).filter(k => !_PROP_SKIP.has(k)).length > 0;
                  const hasColor = Array.isArray(item.Color) && item.Color.length > 0;
                  return hasProps || hasColor;
                }
                // Regular slots: skip mandatory base items with nothing interesting on them
                if (item.Asset.Group.AllowNone === false) return false;
                return true;
              })
              .map(item => {
                const prop = item.Property ?? {};
                const tr = prop.TypeRecord && Object.keys(prop.TypeRecord).length
                  ? prop.TypeRecord : undefined;
                // Save full Property object minus lock-specific fields.
                // Captures TypeRecord, Type, OverridePriority, LayerProperties (WCE hidden layers)
                // and ALL other mod properties in one shot – nothing gets missed.
                const savedProp = {};
                for (const [k, v] of Object.entries(prop)) {
                  if (!_PROP_SKIP.has(k)) savedProp[k] = v;
                }
                const gn = item.Asset.Group.Name;
                return {
                  asset:      item.Asset.Name,
                  group:      gn,
                  colors:     item.Color ?? '#ffffff',
                  craft:      item.Craft ?? null,
                  lock:       prop.LockedBy ?? null,
                  lockMember: prop.LockMemberNumber ?? null,
                  tr,
                  property:   Object.keys(savedProp).length ? savedProp : null,
                  difficulty: item.Difficulty ?? null,
                  // Body groups: apply as patch only (item already exists on character)
                  _bodyOnly:  _BODY_PROP_GROUPS.has(gn) ? true : undefined,
                };
              });

            src.postMessage({
              app: APP, type: 'CHAR_APPEARANCE_DATA',
              reqId: ev.data.reqId,
              memberNum: _C.MemberNumber,
              name: _C.Name,
              items: _items,
            }, ALLOWED_ORIGIN);
            BCK.ok('CHAR_APPEARANCE_DATA: ' + _items.length + ' Items für ' + _C.Name);
          } catch (ex) {
            src.postMessage({ app: APP, type: 'CHAR_APPEARANCE_DATA',
              reqId: ev.data.reqId, err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'CAPTURE_SCREENSHOT': {
          // Capture a crop of the BC game canvas.
          // Must run inside requestAnimationFrame so the WebGL/2D buffer is filled
          // (BC clears the buffer between frames; reading outside rAF gives blank image).
          const _ssReqId = ev.data.reqId;
          const _sx = ev.data.x ?? 250, _sy = ev.data.y ?? 0,
                _sw = ev.data.w ?? 500, _sh = ev.data.h ?? 1000;
          requestAnimationFrame(function() {
            try {
              // BC may have several canvases – pick the largest (main game canvas)
              const _canvases = Array.from(document.querySelectorAll('canvas'));
              if (!_canvases.length) throw new Error('Kein Canvas im BC-Tab gefunden');
              const _sc = _canvases.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b));
              const _tc = document.createElement('canvas');
              _tc.width = _sw; _tc.height = _sh;
              _tc.getContext('2d', { willReadFrequently: true })
                 .drawImage(_sc, _sx, _sy, _sw, _sh, 0, 0, _sw, _sh);
              const _dataUrl = _tc.toDataURL('image/jpeg', 0.92);
              src.postMessage({ app: APP, type: 'SCREENSHOT_DATA',
                reqId: _ssReqId, data: _dataUrl }, ALLOWED_ORIGIN);
              BCK.ok('CAPTURE_SCREENSHOT: ' + _sw + 'x' + _sh + ' → ' + Math.round(_dataUrl.length / 1024) + ' KB');
            } catch(ex) {
              BCK.warn('CAPTURE_SCREENSHOT Fehler:', ex.message);
              src.postMessage({ app: APP, type: 'SCREENSHOT_DATA',
                reqId: _ssReqId, err: ex.message }, ALLOWED_ORIGIN);
            }
          });
          break;
        }


        case 'GET_OUTFIT_SCAN': {
          try {
            const _s = new Set();
            const _chars = [Player, ...(ChatRoomCharacter ?? [])]
              .filter(c => c?.MemberNumber && !_s.has(c.MemberNumber) && _s.add(c.MemberNumber));
            const _room = (typeof ChatRoomData !== 'undefined' && ChatRoomData?.Name) ? ChatRoomData.Name : 'Unbekannt';
            const _results = _chars.map(window._BCU_serializeChar);
            // _auto Flag durchreichen: verhindert Auto-Screenshots bei automatischen Scans
            src.postMessage({ app: APP, type: 'OUTFIT_SCAN_DATA', results: _results, room: _room, _auto: ev.data._auto === true }, ALLOWED_ORIGIN);
            BCK.ok('[OutfitScan] ' + _results.length + ' Chars @ ' + _room);
          } catch(ex) {
            src.postMessage({ app: APP, type: 'OUTFIT_SCAN_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_MBS_WHEEL': {
          try {
            const _seen = new Set();
            const _chars = [Player, ...(ChatRoomCharacter ?? [])].filter(c => {
              if (!c?.MemberNumber || _seen.has(c.MemberNumber)) return false;
              _seen.add(c.MemberNumber);
              return true;
            });
            const _results = [];
            for (const C of _chars) {
              // MBSSettings: lokal direkt, andere via OnlineSharedSettings.MBS (LZString-komprimiert)
              let _mbsSets = null;
              if (C === Player && Player.MBSSettings?.FortuneWheelItemSets) {
                _mbsSets = Player.MBSSettings.FortuneWheelItemSets;
              } else {
                const _raw = C.OnlineSharedSettings?.MBS ?? null;
                if (_raw && typeof LZString !== 'undefined') {
                  try {
                    const _dec = LZString.decompressFromUTF16(_raw)
                              ?? LZString.decompress(_raw)
                              ?? LZString.decompressFromBase64(_raw);
                    if (_dec) {
                      const _parsed = JSON.parse(_dec);
                      _mbsSets = _parsed?.FortuneWheelItemSets ?? null;
                    }
                  } catch(_e) {}
                }
              }
              if (!Array.isArray(_mbsSets)) continue;
              const _outfits = [];
              for (const s of _mbsSets) {
                if (!s?.name || !Array.isArray(s.itemList)) continue;
                const _items = s.itemList.map(i => ({
                  asset:    i.Name,
                  group:    i.Group,
                  colors:   i.Color ?? '#ffffff',
                  craft:    i.Craft ?? null,
                  property: Object.keys(i.Property ?? {}).length ? i.Property : null,
                  tr:       i.TypeRecord ?? {},
                  lock:     null,
                  lockMember: null,
                }));
                _outfits.push({ name: s.name, weight: s.weight ?? 1, items: _items });
              }
              if (_outfits.length) {
                _results.push({ memberNumber: C.MemberNumber, name: C.Nickname || C.Name, outfits: _outfits });
              }
            }
            const _room = (typeof ChatRoomData !== 'undefined' && ChatRoomData?.Name) ? ChatRoomData.Name : null;
            const _ts   = Date.now();
            src.postMessage({ app: APP, type: 'MBS_WHEEL_DATA', results: _results, total: _chars.length, room: _room, ts: _ts }, ALLOWED_ORIGIN);
          } catch(ex) {
            src.postMessage({ app: APP, type: 'MBS_WHEEL_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_LSCG_OUTFITS': {
          try {
            if (typeof LSCG_OUTFITS === 'undefined') {
              src.postMessage({ app: APP, type: 'LSCG_OUTFITS_DATA', err: 'LSCG nicht geladen' }, ALLOWED_ORIGIN);
              break;
            }
            const _keys = LSCG_OUTFITS.GetOutfitKeys ? LSCG_OUTFITS.GetOutfitKeys() : [];
            const _outfits = {};
            for (const _key of _keys) {
              try {
                _outfits[_key] = { code: LSCG_OUTFITS.GetOutfitCode(_key) };
              } catch(_e) { _outfits[_key] = { code: null }; }
            }
            src.postMessage({ app: APP, type: 'LSCG_OUTFITS_DATA', outfits: _outfits }, ALLOWED_ORIGIN);
          } catch(ex) {
            src.postMessage({ app: APP, type: 'LSCG_OUTFITS_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'GET_SEND_LOG': {
          src.postMessage({
            app: APP, type: 'SEND_LOG_DATA',
            log: typeof window.__BCK_sendMonSnapshot === 'function' ? window.__BCK_sendMonSnapshot() : null,
          }, ALLOWED_ORIGIN);
          break;
        }

        case 'GET_LOCKS': {
          try {
            const _s = new Set();
            const _allChars = [Player, ...(ChatRoomCharacter ?? [])]
              .filter(c => c?.MemberNumber && !_s.has(c.MemberNumber) && _s.add(c.MemberNumber));
            // Helper: look up a member's name from room
            const _nameMap = {};
            _allChars.forEach(function(c){ _nameMap[c.MemberNumber] = c.Name; });
            // Groups that can never accept a padlock
            const _LK_BODY_SKIP = new Set([
              'Eyes','Eyes2','EyesColor','EyesColor2','Blush','Emoticon','Fluids','ExpressionFull',
              'BodyUpper','BodyLower','BodyMarkings','Head','Mouth','Pronouns',
              'HairFront','HairBack','HairSide','HairFront2','HairBack2',
              'HairColor','HairColorAccessory','HairColorUnder',
            ]);
            const _results = _allChars.map(function(C) {
              const locks    = [];
              const lockable = [];   // items that can accept a new lock
              for (const _item of (C.Appearance ?? [])) {
                const _P  = _item.Property;
                const _gn = _item.Asset.Group.Name;
                if (_LK_BODY_SKIP.has(_gn)) continue;
                if (_P?.LockedBy) {
                  // Already locked — collect lock info
                  const _lockerNum  = _P.LockMemberNumber ?? null;
                  const _lockerName = _lockerNum != null ? (_nameMap[_lockerNum] ?? ('#' + _lockerNum)) : null;
                  locks.push({
                    group:       _gn,
                    asset:       _item.Asset.Name,
                    assetDesc:   _item.Asset.Description ?? _item.Asset.Name,
                    craftName:   _item.Craft?.Name ?? null,
                    // DOGS-DeviousPadlock stores Name:"DeviousPadlock" + LockedBy:"ExclusivePadlock"
                    lockType:    (_P.LockedBy === 'ExclusivePadlock' && _P.Name === 'DeviousPadlock')
                                   ? 'DeviousPadlock'
                                   : _P.LockedBy,
                    lockerNum:   _lockerNum,
                    lockerName:  _lockerName,
                    password:    _P.Password          ?? null,
                    combination: _P.CombinationNumber ?? null,
                    removeTimer: _P.RemoveTimer        ?? null,
                    timerReal:   _P.TimerReal          ?? null,
                    hint:        _P.Hint               ?? null,
                    selfUnlock:  _P.SelfUnlock         ?? false,
                    showTimer:   _P.ShowTimer          ?? false,
                    memberList:  _P.MemberNumberList   ?? null,
                    // Devious / Lewd Crest extended properties
                    shockLevel:        _P.ShockLevel         ?? null,
                    showText:          _P.ShowText           ?? null,
                    punishOrgasm:      _P.PunishOrgasm       ?? null,
                    punishStandup:     _P.PunishStandup      ?? null,
                    punishStruggle:    _P.PunishStruggle     ?? null,
                    punishStruggleOther: _P.PunishStruggleOther ?? null,
                    accessMode:        _P.AccessMode         ?? null,
                    triggerValues:     _P.TriggerValues      ?? null,
                    memberListKeys:    _P.MemberNumberListKeys ?? null,
                  });
                } else if (_item.Asset.AllowLock) {
                  // Not locked but can accept a lock
                  lockable.push({
                    group:     _gn,
                    asset:     _item.Asset.Name,
                    assetDesc: _item.Asset.Description ?? _item.Asset.Name,
                    craftName: _item.Craft?.Name ?? null,
                  });
                }
              }
              return {
                memberNumber: C.MemberNumber,
                name:    C.Name,
                nickname: C.Nickname ?? null,
                isPlayer: C.MemberNumber === Player.MemberNumber,
                locks,
                lockable,
              };
            });
            src.postMessage({ app: APP, type: 'LOCKS_DATA',
              results: _results, scanTime: Date.now() }, ALLOWED_ORIGIN);
          } catch(_ex) {
            src.postMessage({ app: APP, type: 'LOCKS_DATA', err: _ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'EXEC': {
          const _execCode = ev.data.code;
          const _execLen  = _execCode?.length ?? 0;

          try {
            // eslint-disable-next-line no-new-func
            new Function(_execCode)();
            BCK.ok('EXEC OK');
            src.postMessage({ app: APP, type: 'EXEC_OK' }, ALLOWED_ORIGIN);
          } catch (ex) {
            BCK.err('EXEC FEHLER:', ex.message);
            // Zeilennummer aus Error-Stack extrahieren
            const _lm = ex.message.match(/line (\d+)/i) || (ex.stack || '').match(/<anonymous>:(\d+)/);
            if (_lm) {
              const _el = parseInt(_lm[1]) - 2; // IIFE-Wrapper hat 2 Zeilen Overhead
              const _ls = (_execCode || '').split('\n');
              const _ef = Math.max(0, _el - 3), _et = Math.min(_ls.length, _el + 3);
              BCK.err('Fehler nahe Zeile ' + _el + ':', JSON.stringify(_ls.slice(_ef, _et).join('\n')));
            }
            src.postMessage({ app: APP, type: 'EXEC_ERR', msg: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'SCAN_CURSES': {
          BCK.info('SCAN_CURSES');
          try {
            const result = window.CurseScanner.scan();
            const _curseRoom = (typeof ChatRoomData !== 'undefined' && ChatRoomData?.Name) ? ChatRoomData.Name : null;
            // roomMembers: Member-Nummern die JETZT im Raum sind (zum Scan-Zeitpunkt auf BC-Seite)
            // Verlässlicher als _lastRoomMembers im Popup (das bei Raumwechsel schon veraltet sein kann)
            const _curseRoomMembers = (typeof ChatRoomCharacter !== 'undefined' && Array.isArray(ChatRoomCharacter))
              ? ChatRoomCharacter.map(c => c.MemberNumber).filter(Boolean)
              : [];
            // Delta-Übertragung: Die volle DB (kann >25k Einträge haben) wird nur
            // gesendet wenn das Popup sie anfordert (full:true – erster Scan nach
            // Connect/Reload). Sonst nur die in diesem Scan geänderten Einträge –
            // das vermeidet teures Structured-Cloning + Komplett-Verarbeitung.
            const _full = ev.data.full === true;
            src.postMessage({
              app: APP, type: 'CURSE_DATA',
              database:  _full ? result.database : null,
              delta:     _full ? null : result.changed,
              lscgTable: result.lscgTable,
              lscgCache: result.lscgCache,
              room: _curseRoom,
              roomMembers: _curseRoomMembers,
              neuDB: result.neuDB,
              aktualisiert: result.aktualisiert,
              _auto: ev.data._auto === true,
            }, ALLOWED_ORIGIN);
            BCK.ok('CURSE_DATA gesendet (' + (_full ? 'full: ' + Object.keys(result.database).length : 'delta: ' + Object.keys(result.changed).length) + ' Crafts)');
          } catch (ex) {
            BCK.err('SCAN_CURSES Fehler:', ex.message);
            src.postMessage({ app: APP, type: 'CURSE_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'WEAR_CURSE': {
          BCK.info('WEAR_CURSE key=' + ev.data.dbKey + ' target=' + ev.data.targetNum);
          try {
            // Always inject/update entry from popup — ensures corrected Gruppe overrides local DB
            if (ev.data.entry) {
              window.CurseScanner.injectEntry(ev.data.dbKey, ev.data.entry, true);
            }
            let result;
            if (ev.data.targetNum != null) {
              result = window.CurseScanner.wearOn(ev.data.dbKey, ev.data.targetNum);
            } else {
              result = window.CurseScanner.wear(ev.data.dbKey);
            }
            if (result?.err) {
              src.postMessage({ app: APP, type: 'WEAR_CURSE_ERR', msg: result.err }, ALLOWED_ORIGIN);
            } else {
              src.postMessage({ app: APP, type: 'WEAR_CURSE_OK', msg: result?.msg }, ALLOWED_ORIGIN);
            }
          } catch (ex) {
            BCK.err('WEAR_CURSE Fehler:', ex.message);
            src.postMessage({ app: APP, type: 'WEAR_CURSE_ERR', msg: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'LOAD_CURSE_DB': {
          BCK.info('LOAD_CURSE_DB: ' + Object.keys(ev.data.database ?? {}).length + ' Einträge');
          try {
            window.CurseScanner.loadDatabase(ev.data.database ?? {});
          } catch (ex) { BCK.err('LOAD_CURSE_DB Fehler:', ex.message); }
          break;
        }

        case 'GET_LSCG_CACHE': {
          BCK.info('GET_LSCG_CACHE');
          try {
            const cache = window.CurseScanner.getLscgCache();
            src.postMessage({ app: APP, type: 'LSCG_CACHE_DATA', cache }, ALLOWED_ORIGIN);
            BCK.ok('LSCG_CACHE_DATA: ' + Object.keys(cache).length + ' Einträge');
          } catch (ex) {
            src.postMessage({ app: APP, type: 'LSCG_CACHE_DATA', cache: {}, err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'LOAD_LSCG_CACHE': {
          BCK.info('LOAD_LSCG_CACHE: ' + Object.keys(ev.data.cache ?? {}).length + ' Einträge');
          try {
            const n = window.CurseScanner.mergeLscgCache(ev.data.cache ?? {});
            BCK.ok('LSCG-Cache: ' + n + ' neue Einträge gemergt');
          } catch (ex) { BCK.err('LOAD_LSCG_CACHE Fehler:', ex.message); }
          break;
        }

        case 'GET_CRAFT_CACHE': {
          BCK.info('GET_CRAFT_CACHE');
          try {
            const cache = window.CurseScanner.getCraftCache();
            src.postMessage({ app: APP, type: 'CRAFT_CACHE_DATA', cache }, ALLOWED_ORIGIN);
            BCK.ok('CRAFT_CACHE_DATA: ' + Object.keys(cache).length + ' Einträge');
          } catch (ex) {
            src.postMessage({ app: APP, type: 'CRAFT_CACHE_DATA', cache: {}, err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'LOAD_CRAFT_CACHE': {
          BCK.info('LOAD_CRAFT_CACHE: ' + Object.keys(ev.data.cache ?? {}).length + ' Einträge');
          try {
            const n = window.CurseScanner.mergeCraftCache(ev.data.cache ?? {});
            BCK.ok('Craft-Cache: ' + n + ' neue Einträge gemergt');
          } catch (ex) { BCK.err('LOAD_CRAFT_CACHE Fehler:', ex.message); }
          break;
        }

        case 'GET_GAME_INVENTORY': {
          // Einziger Case, der NICHT synchron antwortet: die Enumeration
          // läuft gechunkt in Leerlaufpausen (SCAN-07) und postet
          // PROGRESS/DATA später über denselben Absender. Ziel-Origin =
          // ev.origin — oben in diesem Handler bereits gegen die Tool-
          // Origin geprüft (identischer Wert); bewusst nicht erneut über
          // die Konstante, damit der statische Zähler in
          // tests/loader-origin.test.js unverändert bleibt.
          const _giTarget = ev.origin;
          const _giReqId = String(ev.data.reqId ?? '');
          BCK.info('GET_GAME_INVENTORY → Scan gestartet | reqId:', _giReqId);
          buildGameInventory(_giReqId, function (msg) {
            src.postMessage({ app: APP, ...msg }, _giTarget);
          });
          break;
        }
      }
    };
    window.addEventListener('message', window.__BCK_LISTENER_FN__);
    console.log('[BC-Konfigurator] Listener aktiv ✅');

  // ── BCX Ausgehende Whisper blockieren ────────────────────────────────
  // Priorität 9999 → läuft nach BCX, verwirft alle ausgehenden BCX-Whisper.
  // Guard __BCK_BCX_FILTER__ verhindert doppelte Registrierung beim erneuten
  // Ausführen des Bookmarklets. Kein unregisterMod() – existiert nicht in ModSDK 1.2.0.
  if (!window.__BCK_BCX_FILTER__) {
    window.__BCK_BCX_FILTER__ = true;

    function installBCXFilter() {
      if (typeof bcModSdk === 'undefined' || typeof bcModSdk.registerMod !== 'function') {
        BCK.warn('[BCXFilter] bcModSdk nicht bereit – retry in 500ms');
        setTimeout(installBCXFilter, 500);
        return;
      }

      try {
        var mod = bcModSdk.registerMod({
          name:     'BCK_BCXFilter',
          fullName: 'BCK BCX-Filter',
          version:  '1.0.0',
        });

        mod.hookFunction('ServerSend', 9999, function(args, next) {
          var typ  = args[0];
          var data = args[1];
          if (
            typ === 'ChatRoomChat' &&
            data &&
            data.Type === 'Whisper' &&
            typeof data.Content === 'string' &&
            data.Content.startsWith('[BCX]')
          ) {
            BCK.info('[BCXFilter] BCX-Whisper blockiert → Ziel #' + data.Target);
            return; // nicht senden
          }
          return next(args);
        });

        BCK.ok('[BCXFilter] aktiv ✅ – alle ausgehenden BCX-Whisper werden blockiert');
      } catch (e) {
        BCK.err('[BCXFilter] Fehler:', e.message);
      }
    }

    installBCXFilter();
  }

  // ── Schutz vor Items ohne Property (AFC-Fehler) ───────────────────────
  // AFC (Abundantia Florum Chromatica) setzt nach dem Aufschließen eines Herzschlosses
  // item.Property = undefined, wenn nur noch ein leeres Effect übrig ist. BC erwartet
  // überall ein Objekt: DialogInventoryBuild klont CurItem.Property und wirft
  // ('"undefined" is not valid JSON'), jeder Item-Dialog bricht ab. Fehlende Properties
  // werden darum – wie BC selbst in ValidationSanitizeProperties – auf {} gesetzt:
  // vor jedem Item-Dialog und nach jedem Aufschließen (Priorität über AFC, also nach
  // dessen Aufräumen). Eigener Mod + eigenes Merkmal, damit das auch greift, wenn der
  // BC-Tab schon einen älteren Loader hatte.
  if (!window.__BCK_PROP_SCHUTZ__) {
    window.__BCK_PROP_SCHUTZ__ = true;
    const _propHeilen = function (C) {
      try {
        ((C && C.Appearance) || []).forEach(function (i) { if (i && i.Property == null) i.Property = {}; });
      } catch (e) {}
    };
    window.__BCK_propHeilen = _propHeilen; // Test-Seam
    (function installPropSchutz() {
      if (typeof bcModSdk === 'undefined' || typeof bcModSdk.registerMod !== 'function') { setTimeout(installPropSchutz, 500); return; }
      try {
        const mod = bcModSdk.registerMod({ name: 'BCK_PropertySchutz', fullName: 'BCK Property-Schutz', version: '1.0.0' });
        mod.hookFunction('DialogInventoryBuild', 100, function (args, next) { _propHeilen(args[0]); return next(args); });
        mod.hookFunction('InventoryUnlock', 100, function (args, next) { const r = next(args); _propHeilen(args[0]); return r; });
        BCK.ok('[PropertySchutz] aktiv ✅ – fehlende Item-Properties (AFC) werden repariert');
      } catch (e) {
        BCK.err('[PropertySchutz] Fehler:', e.message);
      }
    })();
  }

  // ── Sende-Monitor: wer schickt wie viel an den BC-Server? ──────────────
  // "ErrorRateLimited" heißt: der Server hat zu viele vom Client GESENDETE
  // Nachrichten in kurzer Zeit gezählt und trennt die Verbindung. Die Scans des
  // Tools (GET_PLAYER, OUTFIT_SCAN, SCAN_CURSES …) lesen nur lokalen Speicher
  // und senden nichts – dieser Monitor zeigt, welche Quelle tatsächlich sendet.
  // Er zählt nur Typ, Unterart und Aufrufer (nie Nachrichtentexte) und ändert
  // nichts am Senden. Priorität -9999 → läuft zuletzt und zählt damit nur, was
  // nach BCX-Filter & Co. wirklich rausgeht. Zwei Zählstellen:
  //  - ServerSend-Aufrufe (Hook): wer hat gesendet, mit Aufrufer-Kette
  //  - socket.emit (Leitung): was nach BCs eigener Sende-Warteschlange wirklich
  //    beim Server ankommt – nur dieser Wert zählt für das Limit
  // Eigener Mod + eigenes Merkmal (V2), damit das auch greift, wenn der BC-Tab
  // schon einen älteren Loader hatte. Das Log liegt auf window und übersteht
  // erneute Bookmarklet-Klicks.
  if (!window.__BCK_SENDMON2__) {
    window.__BCK_SENDMON2__ = true;
    const SM_RING_MAX     = 400;    // Ringpuffer – verworfen werden nur eigene Log-Einträge
    const SM_VORFALL_MAX  = 50;
    const SM_WARN_PRO_SEK = 10;     // ab so vielen Sendungen in 1 s eine Konsolen-Warnung
    const SM_LAUF_MS      = 30000;  // so viel Ablauf vor einer Trennung wird festgehalten
    const SM_KETTE_MAX    = 40;     // so viele verschiedene Dateien der Aufrufer-Kette werden gemerkt
                                    // (jeder Mod, der ServerSend hakt, steht als Durchgang davor)
    const SM_ZEITEN_MAX   = 600;
    const SM_DUP_MS       = 10000;  // "identische Wiederholung" = gleicher Inhalt wie die vorige gleicher Art innerhalb so vieler ms
    // Sendungen, die oft unverändert wiederholt werden – nur hier wird der Inhalt verglichen
    const SM_DUP_TYPEN    = ['AccountUpdate', 'ChatRoomCharacterExpressionUpdate', 'ChatRoomCharacterPoseUpdate', 'ChatRoomCharacterArousalUpdate'];
    const sm = window.__BCK_SENDLOG2 = window.__BCK_SENDLOG2 || {
      seit: Date.now(), gesamt: 0, vomTool: 0, spitze: { n: 0, t: 0 }, letzteWarnung: 0,
      nachTyp: {}, dup: { gesamt: 0, nachTyp: {}, von: {} }, letzteFp: {}, ring: [], vorfaelle: [],
      leitung: { aktiv: false, gesamt: 0, spitze: { n: 0, t: 0 }, zeiten: [] },
    };

    // Eine Stack-Zeile → Dateiname. Code, den das Tool per new Function einspielt
    // (EXEC, Bots), heißt "eval@loader.js"; ModSDK-Patches ("eval@bcmodsdk.min.js")
    // und Server.js sind nur Durchgang und fallen später raus.
    const _smDatei = function (s) {
      const m = /([^\/\\\s()]+?\.(?:js|ts|mjs))(?:\?[^:\s)]*)?:\d+:\d+/.exec(s);
      return m ? m[1] : null;
    };
    const _smLabel = function (zeile) {
      const mE = /eval at [^(]*\(([^)]*)\)/.exec(zeile);
      if (mE) return 'eval@' + (_smDatei(mE[1]) || '?');
      if (/<anonymous>:\d+:\d+|\bVM\d+:\d+:\d+/.test(zeile)) return 'eval';
      return _smDatei(zeile);
    };
    // Tool = vom Tool eingespielter Code (EXEC, Bots). Reine loader.js-Frames zählen nicht:
    // dort stehen auch Hooks (BCX-Filter, ältere Monitor-Fassungen), die jede Sendung durchlaufen.
    const _smIstTool = function (kette) {
      return kette.indexOf('eval@loader.js') >= 0;
    };

    // Aufrufer-Kette aus dem Stack (nächster Aufrufer zuerst). Erst hinter dem
    // Hook-Frame beginnt der echte Aufrufer – davor liegen _smKette/_smErfassen/
    // Hook, alles loader.js und für den Bericht wertlos.
    const _smKette = function () {
      let stack = '';
      const alt = Error.stackTraceLimit;
      try { Error.stackTraceLimit = 150; stack = String(new Error().stack || ''); } catch (e) {}
      try { Error.stackTraceLimit = alt; } catch (e) {}
      const zeilen = stack.split('\n').slice(1);
      const ab = zeilen.findIndex(function (z) { return z.indexOf('BCK_SendMonHook') >= 0; });
      const kette = [];
      for (const zeile of zeilen.slice(ab + 1)) {
        if (zeile.indexOf('BCK_SendMon') >= 0) continue;   // auch ein älterer Monitor im selben Tab
        if (zeile.indexOf('BCU_Sperre') >= 0) continue;     // Hook der Sync-Sperre des Tools: Durchgang, kein Absender
        const name = _smLabel(zeile);
        if (!name || name === 'bcmodsdk.min.js' || name === 'Server.js' || name.indexOf('eval@bcmodsdk') === 0) continue;
        if (kette[kette.length - 1] !== name) kette.push(name);
        if (kette.length >= SM_KETTE_MAX) break;
      }
      return kette;
    };

    // Unterart ohne Inhalte: Chat-Typ (Hidden zusätzlich mit dem Namen des Mods,
    // z. B. BCXMsg/LSCGMsg – nur bis zum ersten Leer-/Doppelpunkt, Nutzdaten
    // mancher Mods stehen dahinter), bei AccountUpdate nur die Feldnamen.
    const _smSub = function (typ, data) {
      if (!data || typeof data !== 'object') return '';
      if (typ === 'ChatRoomChat') {
        let s = typeof data.Type === 'string' ? data.Type : '';
        if (s === 'Hidden' && typeof data.Content === 'string') s += ':' + data.Content.split(/[\s:{]/)[0].slice(0, 24);
        return s;
      }
      if (typ === 'AccountUpdate') return Object.keys(data).slice(0, 4).join(',');
      return '';
    };

    // Höchste Zahl an Zeitpunkten in einem gleitenden 1-s-Fenster
    const _smSpitzeZeiten = function (zeiten) {
      let max = 0, ende = 0, links = 0;
      for (let i = 0; i < zeiten.length; i++) {
        while (zeiten[i] - zeiten[links] >= 1000) links++;
        if (i - links + 1 > max) { max = i - links + 1; ende = zeiten[i]; }
      }
      return { n: max, t: ende };
    };
    const _smSpitze = function (liste) {
      return _smSpitzeZeiten(liste.filter(function (e) { return e.k === 'send'; }).map(function (e) { return e.t; }));
    };

    // Wrapper = Dateien, die bei fast jeder Sendung ganz vorn stehen (ein Mod, der
    // ServerSend umhüllt, z. B. KikiLink/FUSAM, oder ein Hook in loader.js) – sie
    // verdecken sonst den echten Absender. Eingespielter Tool-Code wird nie ausgeblendet.
    const _smWrapper = function (liste) {
      const sends = liste.filter(function (e) { return e.k === 'send' && e.kette && e.kette.length; });
      const w = [];
      if (sends.length < 10) return w;
      for (let runde = 0; runde < 40; runde++) {
        const z = {};
        sends.forEach(function (e) {
          const erste = e.kette.find(function (l) { return w.indexOf(l) < 0; });
          if (erste) z[erste] = (z[erste] || 0) + 1;
        });
        const top = Object.keys(z).sort(function (a, b) { return z[b] - z[a]; })[0];
        if (!top || z[top] < sends.length * 0.9) break;
        if (top === 'eval@loader.js') break;
        w.push(top);
      }
      return w;
    };
    const _smAnzeige = function (e, w) {
      if (e.k !== 'send') return e;
      const rest = e.kette.filter(function (l) { return w.indexOf(l) < 0; });
      return {
        t: e.t, k: 'send', typ: e.typ, sub: e.sub, screen: e.screen, tool: e.tool, dup: !!e.dup, aufnahme: !!e.aufnahme,
        quelle: rest.slice(0, 3).join(' ← ') || (e.kette.length ? '(nur Wrapper)' : '?'),
      };
    };

    const _smTop = function (liste, anz) {
      const z = {};
      liste.forEach(function (e) {
        if (e.k !== 'send') return;
        const key = e.typ + (e.sub ? ':' + e.sub : '') + ' [' + e.quelle + ']';
        z[key] = (z[key] || 0) + 1;
      });
      return Object.keys(z).map(function (k) { return { was: k, n: z[k] }; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, anz);
    };

    // Inhalts-Fingerabdruck (nur Zahl, nie der Inhalt selbst) – für die Frage, ob eine
    // Sendung nur wiederholt, was der Server schon hat
    const _smHash = function (str) {
      let h = 5381;
      for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      return h + ':' + str.length;
    };
    const _smDuplikat = function (typ, sub, data, t) {
      if (SM_DUP_TYPEN.indexOf(typ) < 0) return false;
      let fp;
      try { fp = _smHash(JSON.stringify(data)); } catch (e) { return false; }
      const key = typ + '|' + sub;
      const alt = sm.letzteFp[key];
      sm.letzteFp[key] = { fp, t };
      sm.dup.von[typ] = (sm.dup.von[typ] || 0) + 1;
      const dup = !!alt && alt.fp === fp && t - alt.t < SM_DUP_MS;
      if (dup) { sm.dup.gesamt++; sm.dup.nachTyp[typ] = (sm.dup.nachTyp[typ] || 0) + 1; }
      return dup;
    };

    const _smRingKuerzen = function () {
      if (sm.ring.length > SM_RING_MAX) sm.ring.splice(0, sm.ring.length - SM_RING_MAX);
    };

    const _smErfassen = function (typ, data) {
      const t = Date.now();
      const kette = _smKette();
      const sub = _smSub(typ, data);
      const e = {
        t, k: 'send', typ: String(typ), sub, kette, tool: _smIstTool(kette),
        aufnahme: window.__BCU_sperreBis > t,   // gesendet, während das Tool gerade ein Bild/Test-Outfit aufnahm
        dup: _smDuplikat(String(typ), sub, data, t),
        screen: typeof CurrentScreen === 'string' ? CurrentScreen : '',
      };
      sm.gesamt++;
      if (e.tool) sm.vomTool++;
      if (e.aufnahme) sm.waehrendAufnahme = (sm.waehrendAufnahme || 0) + 1;
      sm.nachTyp[e.typ] = (sm.nachTyp[e.typ] || 0) + 1;
      sm.ring.push(e);
      _smRingKuerzen();
      let n = 0;
      for (let i = sm.ring.length - 1; i >= 0 && sm.ring[i].t > t - 1000; i--) if (sm.ring[i].k === 'send') n++;
      if (n > sm.spitze.n) sm.spitze = { n, t };
      if (n >= SM_WARN_PRO_SEK && t - sm.letzteWarnung > 5000) {
        sm.letzteWarnung = t;
        const w = _smWrapper(sm.ring);
        BCK.warn('[SendMonitor] ' + n + ' Nachrichten in 1 s: '
          + _smTop(sm.ring.filter(function (r) { return r.k === 'send' && r.t > t - 1000; })
              .map(function (r) { return _smAnzeige(r, w); }), 4)
              .map(function (x) { return x.n + '× ' + x.was; }).join(' | '));
      }
    };

    // Was wirklich über die Leitung geht (socket.emit, nach BCs eigener Warteschlange)
    const _smLeitung = function () {
      const t = Date.now();
      const L = sm.leitung;
      L.gesamt++;
      L.zeiten.push(t);
      if (L.zeiten.length > SM_ZEITEN_MAX) L.zeiten.splice(0, L.zeiten.length - SM_ZEITEN_MAX);
      let n = 0;
      for (let i = L.zeiten.length - 1; i >= 0 && L.zeiten[i] > t - 1000; i--) n++;
      if (n > L.spitze.n) L.spitze = { n, t };
    };

    // Einen Vorfall für die Anzeige aufbereiten (Wrapper raus, Kennzahlen der letzten 10 s)
    const _smVorfallAnzeige = function (v, w) {
      const lauf = v.lauf.map(function (e) { return _smAnzeige(e, w); });
      const zehn = lauf.filter(function (e) { return e.t >= v.t - 10000; });
      const lt = v.leitung.filter(function (t) { return t >= v.t - 10000; });
      return {
        t: v.t, grund: v.grund,
        n10: zehn.filter(function (e) { return e.k === 'send'; }).length,
        tool10: zehn.filter(function (e) { return e.k === 'send' && e.tool; }).length,
        dup10: zehn.filter(function (e) { return e.k === 'send' && e.dup; }).length,
        aufnahme10: zehn.filter(function (e) { return e.k === 'send' && e.aufnahme; }).length,
        spitze10: _smSpitze(zehn), top: _smTop(zehn, 6), lauf,
        leitung10: lt.length, leitungSpitze10: _smSpitzeZeiten(lt),
      };
    };

    // Gründe einer Trennung: aussagekräftige (ServerDisconnect/ForceDisconnect) vor dem
    // nackten socket.io-"disconnect"
    const _smGrund = function (gruende) {
      return gruende.slice().sort(function (a, b) {
        return (a.indexOf('disconnect:') === 0 ? 1 : 0) - (b.indexOf('disconnect:') === 0 ? 1 : 0);
      }).join(' | ');
    };

    // Trennung (ServerDisconnect/ForceDisconnect/disconnect): Ablauf der letzten Sekunden festhalten
    const _smVorfall = function (grund) {
      const t = Date.now();
      const g = String(grund).slice(0, 80);
      const letzter = sm.vorfaelle[sm.vorfaelle.length - 1];
      // Eine Trennung meldet sich mehrfach (BC ruft intern disconnect() auf, noch bevor der
      // ForceDisconnect-Handler dran ist) – Gründe sammeln statt einen zweiten Vorfall anlegen
      if (letzter && t - letzter.t < 2000) {
        if (letzter.gruende.indexOf(g) < 0) { letzter.gruende.push(g); letzter.grund = _smGrund(letzter.gruende); }
        return;
      }
      sm.letzteFp = {};   // nach einer Trennung weiß der Server nichts mehr von früheren Sendungen
      const v = {
        t, gruende: [g], grund: g,
        lauf: sm.ring.filter(function (e) { return e.t >= t - SM_LAUF_MS; }).slice(-80),
        leitung: sm.leitung.zeiten.filter(function (z) { return z >= t - SM_LAUF_MS; }),
      };
      sm.vorfaelle.push(v);
      if (sm.vorfaelle.length > SM_VORFALL_MAX) sm.vorfaelle.splice(0, sm.vorfaelle.length - SM_VORFALL_MAX);
      const a = _smVorfallAnzeige(v, _smWrapper(sm.ring));
      BCK.warn('[SendMonitor] ⚠ Trennung (' + v.grund + '): ' + a.n10 + ' ServerSend-Aufrufe in den letzten 10 s (Spitze '
        + a.spitze10.n + '/s), an der Leitung ' + a.leitung10 + ' (Spitze ' + a.leitungSpitze10.n + '/s), davon vom Tool '
        + a.tool10 + ' | ' + a.top.map(function (x) { return x.n + '× ' + x.was; }).join(' | '));
      // Kurz warten: der aussagekräftigste Grund trifft oft ein paar Millisekunden später ein
      setTimeout(function () {
        const ref = window.__BCK_popupRef;
        if (!ref || ref.closed) return;
        try {
          ref.postMessage({ app: APP, type: 'SEND_MON_VORFALL', grund: v.grund, n10: a.n10, spitze10: a.spitze10.n,
            leitungSpitze10: a.leitungSpitze10.n }, ALLOWED_ORIGIN);
        } catch (e) {}
      }, 300);
    };

    // Zustandswechsel (Screen/Raum) in den Ablauf – zeigt Raum-Hopping neben den Sendungen
    window.__BCK_sendMonState = function (st) {
      sm.ring.push({ t: Date.now(), k: 'state', online: !!st.online, screen: st.screen || '', room: st.room || null });
      _smRingKuerzen();
    };
    window.__BCK_sendMonSnapshot = function () {
      const w = _smWrapper(sm.ring);
      const sends = sm.ring.filter(function (e) { return e.k === 'send'; });
      const nachQuelle = {};
      sends.forEach(function (e) {
        const q = _smAnzeige(e, w).quelle;
        nachQuelle[q] = (nachQuelle[q] || 0) + 1;
      });
      return {
        jetzt: Date.now(), seit: sm.seit, gesamt: sm.gesamt, vomTool: sm.vomTool, waehrendAufnahme: sm.waehrendAufnahme || 0,
        spitze: sm.spitze, warnAb: SM_WARN_PRO_SEK,
        nachTyp: sm.nachTyp, nachQuelle, ringSendungen: sends.length, wrapper: w,
        dup: { gesamt: sm.dup.gesamt, nachTyp: sm.dup.nachTyp, von: sm.dup.von, fensterMs: SM_DUP_MS },
        leitung: { aktiv: sm.leitung.aktiv, gesamt: sm.leitung.gesamt, spitze: sm.leitung.spitze },
        // BCs eigene Sende-Warteschlange (wenn die Globals existieren)
        bc: {
          limit: typeof ServerSendRateLimit === 'number' ? ServerSendRateLimit : null,
          intervall: typeof ServerSendRateLimitInterval === 'number' ? ServerSendRateLimitInterval : null,
          warteschlange: (typeof ServerSendQueue !== 'undefined' && ServerSendQueue && typeof ServerSendQueue.length === 'number')
            ? ServerSendQueue.length : null,
        },
        ring: sm.ring.slice(-150).map(function (e) { return _smAnzeige(e, w); }),
        vorfaelle: sm.vorfaelle.map(function (v) { return _smVorfallAnzeige(v, w); }),
      };
    };
    window.__BCK_sendMonVorfall = _smVorfall;   // Test-Seam

    (function installSendMon() {
      if (typeof bcModSdk === 'undefined' || typeof bcModSdk.registerMod !== 'function') { setTimeout(installSendMon, 500); return; }
      try {
        const mod = bcModSdk.registerMod({ name: 'BCK_SendMonitorV2', fullName: 'BCK Sende-Monitor', version: '2.0.0' });
        mod.hookFunction('ServerSend', -9999, function BCK_SendMonHook(args, next) {
          try { _smErfassen(args[0], args[1]); } catch (e) {}
          return next(args);
        });
        // ServerDisconnect(grund): der Grund (z. B. "ErrorRateLimited") steht schon im ersten Aufruf,
        // noch bevor BC den Socket schließt
        try {
          mod.hookFunction('ServerDisconnect', -9999, function BCK_SendMonDcHook(args, next) {
            try { _smVorfall('ServerDisconnect: ' + (args[0] == null ? '(ohne Angabe)' : (typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0])))); } catch (e) {}
            return next(args);
          });
        } catch (e) {
          BCK.warn('[SendMonitor] ServerDisconnect nicht hakbar:', e.message);
        }
        BCK.ok('[SendMonitor] aktiv ✅ – zählt ausgehende Server-Nachrichten (nur Typ/Aufrufer, keine Texte)');
      } catch (e) {
        BCK.err('[SendMonitor] Fehler:', e.message);
      }
    })();

    (function installSendMonSocket() {
      // Nach einer Trennung und dem Neuanmelden legt BC ein NEUES Socket-Objekt an: die Zähler und Trennungs-Hörer am alten gehen damit
      // verloren (im Bericht: "An der Leitung: 0" und kein ForceDisconnect-Grund bei der zweiten und dritten Trennung). Darum wird
      // regelmäßig geprüft, ob ServerSocket noch dasselbe Objekt ist, und sonst neu verdrahtet.
      let verdrahtet = null;
      const verdrahten = function () {
        if (typeof ServerSocket === 'undefined' || !ServerSocket || ServerSocket === verdrahtet) return;
        verdrahtet = ServerSocket;
        ServerSocket.on('ForceDisconnect', function (grund) {
          try { _smVorfall('ForceDisconnect: ' + (typeof grund === 'string' ? grund : JSON.stringify(grund))); } catch (e) {}
        });
        ServerSocket.on('disconnect', function (grund) {
          try { _smVorfall('disconnect: ' + String(grund)); } catch (e) {}
        });
        // Leitungs-Zähler: nur zählen, Rückgabe und Argumente unverändert
        try {
          const orig = ServerSocket.emit;
          if (typeof orig === 'function' && !orig.__bckSM) {
            const RESERVIERT = ['connect', 'connect_error', 'disconnect', 'disconnecting', 'newListener', 'removeListener', 'error'];
            const gezaehlt = function (ev) {
              try { if (typeof ev === 'string' && RESERVIERT.indexOf(ev) < 0) _smLeitung(); } catch (e) {}
              return orig.apply(this, arguments);
            };
            gezaehlt.__bckSM = true;
            ServerSocket.emit = gezaehlt;
            sm.leitung.aktiv = true;
          }
        } catch (e) {
          BCK.warn('[SendMonitor] Leitungs-Zähler nicht installiert:', e.message);
        }
      };
      verdrahten();
      setInterval(verdrahten, 2000);   // ServerSocket gibt es evtl. noch nicht – und nach einem Relog gibt es ein neues
    })();
  }

  // ── Spielerprofile: alles, was von den Spielern im Raum auslesbar ist ───────────────────────────────────────────
  // Das Tool (Tab "Spielerprofile") fragt mit GET_SPIELER_PROFILE; hier wird gelesen, was BC im Speicher hält: Beschreibung, Titel,
  // Besitzer/Lover, Konto-Alter, geteilte Mod-Einstellungen, Crafts … und – so gut es geht – welche Mods ein Spieler hat.
  // Nur lesen, nichts senden, nichts verändern. Alles wird vor dem Verschicken in reine Daten umgewandelt (keine Funktionen,
  // keine DOM-Knoten, keine Kreisverweise, begrenzte Tiefe/Größe), damit postMessage nie scheitert.
  //
  // Mods erkennt man an versteckten Chat-Nachrichten ("Hidden"): jeder Mod meldet sich mit einem Namen (BCXMsg, LSCGMsg, BCEMsg,
  // MoonCE, DOGS, KIKILINK/1 …). Der Loader merkt sich je Absender nur den NAMEN, wann zuerst/zuletzt und – falls die Nachricht eine
  // Version nennt – die Version, nie den Inhalt. Dazu kommen Merkmale am Charakter (LSCG, FBC, MBS) und für dich selbst ModSDK.
  const SP_STRING_MAX  = 30000;
  const SP_ARRAY_MAX   = 100;
  const SP_KEYS_MAX    = 80;
  const SP_TIEFE_MAX   = 4;
  const SP_KNOTEN_MAX  = 4000;
  const SP_ROH_MAX     = 60000;   // Zeichen je Spieler für den Rohdaten-Block
  // Große oder für ein Profil unwichtige Teile: Aussehen (Outfits haben eigene Tabs), Zeichenpuffer, Listen des eigenen Kontos
  const SP_UEBERSPRINGEN = new Set(['Canvas', 'CanvasBlink', 'MustDraw', 'Appearance', 'AppearanceLayers', 'DrawAppearance', 'DrawPose',
    'DrawPoseMapping', 'Inventory', 'Wardrobe', 'FriendList', 'FriendNames', 'BlackList', 'WhiteList', 'GhostList', 'Crafting',
    'AllowItem', 'Hooks', 'Dialog', 'FocusGroup', 'ArousalZoom', 'IsPlayer']);
  const SP_ZUERST = ['Description', 'Title', 'Nickname', 'Name', 'Ownership', 'Lovership', 'Owner', 'Lover', 'Difficulty', 'ItemPermission',
    'Creation', 'Reputation', 'OnlineSharedSettings', 'OnlineSettings', 'ArousalSettings', 'Game', 'LabelColor', 'Skill', 'Effect', 'ActivePose'];

  const _spSauber = function (v, tiefe, st) {
    if (v === null) return null;
    const t = typeof v;
    if (t === 'string') { if (v.length > SP_STRING_MAX) { st.gekuerzt = true; return v.slice(0, SP_STRING_MAX); } return v; }
    if (t === 'number') return isFinite(v) ? v : null;
    if (t === 'boolean') return v;
    if (t !== 'object') return undefined;                      // Funktionen, Symbole, undefined, BigInt
    if (st.knoten++ >= SP_KNOTEN_MAX || tiefe > SP_TIEFE_MAX) { st.gekuerzt = true; return undefined; }
    try { if (typeof v.nodeType === 'number' || v === window) return undefined; } catch (e) { return undefined; }   // DOM-Knoten, Fenster
    if (st.gesehen.has(v)) return undefined;                   // Kreisverweis
    st.gesehen.add(v);
    try {
      if (Array.isArray(v)) {
        const out = [];
        for (let i = 0; i < v.length && i < SP_ARRAY_MAX; i++) { const x = _spSauber(v[i], tiefe + 1, st); out.push(x === undefined ? null : x); }
        if (v.length > SP_ARRAY_MAX) st.gekuerzt = true;
        return out;
      }
      const out = {};
      let n = 0;
      for (const k of Object.keys(v)) {
        if (n >= SP_KEYS_MAX) { st.gekuerzt = true; break; }
        let w;
        try { w = v[k]; } catch (e) { continue; }
        const x = _spSauber(w, tiefe + 1, st);
        if (x !== undefined) { out[k] = x; n++; }
      }
      return out;
    } finally { st.gesehen.delete(v); }                        // dasselbe Objekt an zwei Stellen ist kein Kreis
  };

  // Alle auslesbaren Eigenschaften eines Charakters als reine Daten (die wichtigen zuerst, damit sie nie dem Größenlimit zum Opfer fallen)
  const _spRoh = function (C) {
    const st = { knoten: 0, gesehen: new WeakSet(), gekuerzt: false };
    const out = {};
    let schluessel = [];
    try { schluessel = Object.keys(C); } catch (e) {}
    schluessel.sort(function (a, b) {
      const ia = SP_ZUERST.indexOf(a), ib = SP_ZUERST.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    for (const k of schluessel) {
      if (SP_UEBERSPRINGEN.has(k)) continue;
      let w;
      try { w = C[k]; } catch (e) { continue; }
      const x = _spSauber(w, 1, st);
      if (x !== undefined) out[k] = x;
    }
    let groesse = 0;
    try { groesse = JSON.stringify(out).length; } catch (e) { groesse = SP_ROH_MAX + 1; }
    if (groesse > SP_ROH_MAX) { st.gekuerzt = true; return { roh: { _hinweis: 'zu groß für die Ablage (' + groesse + ' Zeichen) – die wichtigen Felder stehen oben im Profil' }, gekuerzt: true }; }
    return { roh: out, gekuerzt: st.gekuerzt };
  };

  // Sichtungen versteckter Mod-Nachrichten: Absender → { Modname → { erstmals, zuletzt, anzahl, version? } }
  const _spSichtungen = window.__BCK_SPIELER_SICHTUNGEN = window.__BCK_SPIELER_SICHTUNGEN || {};
  const _spVersion = function (dict) {
    const pruefe = function (o) {
      if (!o || typeof o !== 'object') return null;
      const keys = ['version', 'Version', 'ver', 'v'];
      for (let i = 0; i < keys.length; i++) {
        const w = o[keys[i]];
        if ((typeof w === 'string' && w.length > 0 && w.length <= 40) || (typeof w === 'number' && isFinite(w))) return String(w);
      }
      return null;
    };
    if (Array.isArray(dict)) {
      for (let i = 0; i < dict.length; i++) { const r = pruefe(dict[i]) || pruefe(dict[i] && dict[i].message); if (r) return r; }
      return null;
    }
    return pruefe(dict) || pruefe(dict && dict.message);
  };
  const _spHidden = function (data) {
    try {
      if (!data || data.Type !== 'Hidden' || typeof data.Content !== 'string') return;
      const nr = data.Sender;
      if (!Number.isInteger(nr)) return;
      const name = data.Content.split(/[\s:{]/)[0].slice(0, 40);
      if (!name) return;
      const t = Date.now();
      const m = _spSichtungen[nr] || (_spSichtungen[nr] = {});
      const e = m[name] || (m[name] = { erstmals: t, zuletzt: t, anzahl: 0 });
      e.zuletzt = t; e.anzahl++;
      const v = _spVersion(data.Dictionary);
      if (v) e.version = v;
    } catch (e) {}
  };

  // Hören, bis sich ein Mod meldet. BC legt nach einem Relog ein NEUES Socket an – darum regelmäßig prüfen und neu anhängen.
  (function installSpielerHidden() {
    const gen = window.__BCK_SP_GEN = Date.now() + Math.random();   // ein erneut eingespielter Loader löst den alten ab
    let verdrahtet = null;
    const verdrahten = function () {
      if (window.__BCK_SP_GEN !== gen) return;
      if (typeof ServerSocket === 'undefined' || !ServerSocket || ServerSocket === verdrahtet) return;
      verdrahtet = ServerSocket;
      try { ServerSocket.on('ChatRoomMessage', function (data) { if (window.__BCK_SP_GEN === gen) _spHidden(data); }); }
      catch (e) { BCK.warn('[Spielerprofile] Nachrichten-Hörer nicht angehängt:', e.message); }
    };
    verdrahten();
    const timer = setInterval(function () { if (window.__BCK_SP_GEN !== gen) { clearInterval(timer); return; } verdrahten(); }, 2000);
  })();

  const _spKurz = function (w, max) { return typeof w === 'string' ? w.slice(0, max) : (typeof w === 'number' && isFinite(w) ? String(w) : null); };

  // BC legt lange Beschreibungen komprimiert ab: Kennzeichen "╬" (U+256C) + LZString.compressToUTF16. Ein Charakter im Raum hat sie
  // schon entpackt, ein gespeichertes Profil (WCE/FBC) nicht. Entpackt wird wie im Spiel; geht es nicht, bleibt der Text unverändert.
  const SP_LZ_MAGIC = String.fromCharCode(9580);
  const _spBeschreibung = function (text) {
    if (typeof text !== 'string' || text.charAt(0) !== SP_LZ_MAGIC) return text;
    try {
      if (typeof LZString !== 'undefined' && LZString && typeof LZString.decompressFromUTF16 === 'function') {
        const d = LZString.decompressFromUTF16(text.substring(1));
        if (typeof d === 'string') return d;
      }
    } catch (e) {}
    return text;
  };

  // Ein Spieler: die wichtigsten Felder ausgeschrieben (stabil benannt, deutsch) + alles Übrige als "roh"
  // (ohneRoh: für die vielen Profile aus dem WCE/FBC-Speicher – dort genügen die ausgeschriebenen Felder)
  const _spProfil = function (C, ichNr, ohneRoh) {
    const nr = C.MemberNumber;
    const d = {
      nr: nr,
      name: _spKurz(C.Name, 100),
      nickname: _spKurz(C.Nickname, 100),
      titel: _spKurz(C.Title, 100),
      beschreibung: typeof C.Description === 'string' ? _spBeschreibung(C.Description).slice(0, SP_STRING_MAX) : null,
      istIch: nr === ichNr,
      erstellt: typeof C.Creation === 'number' && isFinite(C.Creation) ? C.Creation : null,
      schwierigkeit: C.Difficulty && typeof C.Difficulty.Level === 'number' ? C.Difficulty.Level : null,
      // Seit einer neueren Spielversion heißt das Feld AllowedInteractions (früher ItemPermission)
      itemPermission: typeof C.AllowedInteractions === 'number' ? C.AllowedInteractions : (typeof C.ItemPermission === 'number' ? C.ItemPermission : null),
      spielVersion: C.OnlineSharedSettings && typeof C.OnlineSharedSettings === 'object' ? _spKurz(C.OnlineSharedSettings.GameVersion, 40) : null,
      geteilt: [],
      besitzer: null,
      lover: [],
      pronomen: null,
      items: Array.isArray(C.Appearance) ? C.Appearance.length : null,
      crafts: [],
      mods: [],
    };
    try {
      if (C.OnlineSharedSettings && typeof C.OnlineSharedSettings === 'object') d.geteilt = Object.keys(C.OnlineSharedSettings).slice(0, 60);
      const o = C.Ownership;
      if (o && typeof o === 'object') d.besitzer = { nr: Number.isInteger(o.MemberNumber) ? o.MemberNumber : null, name: _spKurz(o.Name, 100), seit: typeof o.Start === 'number' ? o.Start : null, stufe: typeof o.Stage === 'number' ? o.Stage : null };
      else if (typeof C.Owner === 'string' && C.Owner) d.besitzer = { nr: null, name: C.Owner.slice(0, 100), seit: null, stufe: null };
      if (Array.isArray(C.Lovership)) {
        d.lover = C.Lovership.filter(Boolean).slice(0, 10).map(function (l) {
          return { nr: Number.isInteger(l.MemberNumber) ? l.MemberNumber : null, name: _spKurz(l.Name, 100), seit: typeof l.Start === 'number' ? l.Start : null, stufe: typeof l.Stage === 'number' ? l.Stage : null };
        });
      }
      // Im Spiel steht das Item mit Asset.Group.Name, in einem gespeicherten Profil (WCE/FBC) als { Group, Name }
      const pr = (C.Appearance || []).find(function (i) { return i && ((i.Asset && i.Asset.Group && i.Asset.Group.Name === 'Pronouns') || i.Group === 'Pronouns'); });
      if (pr) d.pronomen = _spKurz(pr.Asset ? pr.Asset.Name : pr.Name, 40);
      if (Array.isArray(C.Crafting)) {
        d.crafts = C.Crafting.filter(function (c) { return c && c.Item; }).slice(0, 100).map(function (c) {
          return { name: _spKurz(c.Name, 100) || '', item: _spKurz(c.Item, 100), beschreibung: _spKurz(c.Description, 300) || '', eigenschaft: _spKurz(typeof c.Property === 'string' ? c.Property : '', 40) || '' };
        });
      }
    } catch (e) {}

    // Mods: Sichtungen aus versteckten Nachrichten + Merkmale am Charakter (+ ModSDK bei dir selbst)
    const mods = {};
    const merke = function (name, quelle, extra) {
      if (!name) return;
      const e = mods[name] || (mods[name] = { name: name, quelle: quelle });
      if (extra) { if (extra.version) e.version = extra.version; if (extra.erstmals) e.erstmals = extra.erstmals; if (extra.zuletzt) e.zuletzt = extra.zuletzt; }
    };
    const s = _spSichtungen[nr];
    if (s) Object.keys(s).forEach(function (k) { merke(k, 'Nachricht', s[k]); });
    try {
      if (C.LSCG && typeof C.LSCG === 'object') merke('LSCG', 'Charakterdaten');
      if (C.FBC !== undefined && C.FBC !== null) merke('FBC', 'Charakterdaten', { version: _spKurz(typeof C.FBC === 'object' ? C.FBC.version : C.FBC, 40) });
      if (C.OnlineSharedSettings && C.OnlineSharedSettings.MBS !== undefined) merke('MBS', 'geteilte Einstellung');
      if (nr === ichNr && typeof bcModSdk !== 'undefined' && bcModSdk && typeof bcModSdk.getModsInfo === 'function') {
        (bcModSdk.getModsInfo() || []).forEach(function (m) { if (m && typeof m.name === 'string') merke(m.name, 'ModSDK', { version: _spKurz(m.version, 40) }); });
      }
    } catch (e) {}
    d.mods = Object.keys(mods).map(function (k) { return mods[k]; });

    if (ohneRoh) return d;
    const r = _spRoh(C);
    d.roh = r.roh;
    d.gekuerzt = r.gekuerzt;
    return d;
  };

  // ── Bilder der Spieler ───────────────────────────────────────────────────────
  // Von einem Zeichenpuffer (BC-Canvas, durchsichtiger Hintergrund) bleibt der Bereich um die Figur: zugeschnitten, auf höchstens
  // SP_BILD_W × SP_BILD_H verkleinert, als JPEG auf dunklem Grund. null = nichts zu sehen / nicht lesbar.
  const SP_BILD_W = 180, SP_BILD_H = 360, SP_BILDER_MAX = 40;
  const _spBildVonCanvas = function (src) {
    try {
      if (!src || !src.width || !src.height) return null;
      const W = src.width, H = src.height;
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = H;
      const octx = oc.getContext('2d');
      octx.drawImage(src, 0, 0);
      const px = octx.getImageData(0, 0, W, H).data;
      let x0 = W, x1 = -1, y0 = H, y1 = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (px[(y * W + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
      if (x1 < x0 || (x1 - x0) < 30 || (y1 - y0) < 60) return null;   // leer oder nur ein Fleck
      const pad = 10;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const s = Math.min(1, SP_BILD_W / cw, SP_BILD_H / ch);
      const ow = Math.max(1, Math.round(cw * s)), oh = Math.max(1, Math.round(ch * s));
      const out = document.createElement('canvas');
      out.width = ow; out.height = oh;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#14141a'; ctx.fillRect(0, 0, ow, oh);
      ctx.drawImage(oc, x0, y0, cw, ch, 0, 0, ow, oh);
      return out.toDataURL('image/jpeg', 0.72);
    } catch (e) { return null; }   // z. B. SecurityError bei einem "tainted" Canvas
  };
  // Prüfsumme eines Zeichenpuffers (grob, schnell): ändert sie sich nicht mehr, sind alle Bilder geladen
  const _spCanvasHash = function (canvas) {
    try {
      const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const n = d.length / 4, step = Math.max(1, Math.floor(n / 400));
      let r = 0;
      for (let i = 0; i < n; i += step) { const k = i * 4; r = ((r * 31) | 0) + d[k] + d[k + 1] + d[k + 2] + d[k + 3]; }
      return r;
    } catch (e) { return -1; }
  };
  const _spSchlafen = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // Ein Spieler, der gerade im Raum ist (oder du): sein bereits gezeichneter Puffer
  const _spBildLive = function (C) {
    try { if (typeof CharacterLoadCanvas === 'function') CharacterLoadCanvas(C); } catch (e) {}
    return _spBildVonCanvas(C.Canvas);
  };

  const _spielerProfileScan = function (opt) {
    const ich = window.Player;
    const ichNr = ich ? ich.MemberNumber : null;
    const liste = [];
    const gesehen = new Set();
    const dazu = function (C) { if (C && Number.isInteger(C.MemberNumber) && !gesehen.has(C.MemberNumber)) { gesehen.add(C.MemberNumber); liste.push(C); } };
    (window.ChatRoomCharacter || []).forEach(dazu);
    dazu(ich);                                                    // du selbst gehörst immer dazu, auch ohne Raum
    // Bilder gibt es nur für die Spieler, die das Tool noch ohne Bild hat (fehlt) bzw. neu aufnehmen will (erzwingen)
    const brauchtBild = new Set();
    [opt && opt.fehlt, opt && opt.erzwingen].forEach(function (l) { if (Array.isArray(l)) l.forEach(function (n) { if (Number.isInteger(n)) brauchtBild.add(n); }); });
    let bilder = 0;
    const results = [];
    liste.forEach(function (C) {
      try {
        const p = _spProfil(C, ichNr);
        if (bilder < SP_BILDER_MAX && brauchtBild.has(C.MemberNumber)) {
          const img = _spBildLive(C);
          if (img) { p.bild = { img: img, stabil: true }; bilder++; }
        }
        results.push(p);
      } catch (e) { BCK.warn('[Spielerprofile] #' + C.MemberNumber + ':', e.message); }
    });
    return {
      results: results,
      room: window.ChatRoomData && typeof window.ChatRoomData.Name === 'string' ? window.ChatRoomData.Name.slice(0, 100) : null,
      gameVersion: typeof window.GameVersion === 'string' ? window.GameVersion : null,
    };
  };

  // ── Der Profil-Speicher von WCE/FBC ("/profiles" im Spiel) ───────────────────────────────────────────────────
  // WCE/FBC legt jeden gesehenen Charakter in der Browser-Datenbank "bce-past-profiles" ab: Speicher "profiles"
  // { memberNumber, name, lastNick, seen, characterBundle (Text, JSON) } und "notes" { memberNumber, note, updatedAt }.
  // Hier wird nur GELESEN: die Datenbank wird nie angelegt (nur geöffnet, wenn sie existiert), nie beschrieben, nie verändert.
  const SP_CACHE_DB = 'bce-past-profiles';
  const SP_CACHE_STAPEL = 60;

  // → { db } | { fehlt: true, andere: [...] } | { fehler: '…' }
  const _spCacheOeffnen = function () {
    return new Promise(function (resolve) {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB || typeof indexedDB.databases !== 'function') { resolve({ fehler: 'Dieser Browser kann die vorhandenen Datenbanken nicht auflisten (indexedDB.databases)' }); return; }
        indexedDB.databases().then(function (liste) {
          const namen = (liste || []).map(function (d) { return d && d.name; }).filter(Boolean);
          if (namen.indexOf(SP_CACHE_DB) < 0) { resolve({ fehlt: true, andere: namen.filter(function (n) { return /profil|bce|fbc|wce/i.test(String(n)); }).slice(0, 10) }); return; }
          const rq = indexedDB.open(SP_CACHE_DB);
          // Ohne Versionsnummer wird eine vorhandene Datenbank unverändert geöffnet. Käme trotzdem ein Upgrade, wird es abgebrochen.
          rq.onupgradeneeded = function () { try { rq.transaction.abort(); } catch (e) {} };
          rq.onsuccess = function () { resolve({ db: rq.result }); };
          rq.onerror = function () { resolve({ fehler: 'Öffnen fehlgeschlagen: ' + ((rq.error && rq.error.message) || 'unbekannt') }); };
          rq.onblocked = function () { resolve({ fehler: 'Öffnen blockiert' }); };
        }, function (e) { resolve({ fehler: String((e && e.message) || e) }); });
      } catch (e) { resolve({ fehler: String((e && e.message) || e) }); }
    });
  };

  // Einträge eines Speichers nach dem Schlüssel `nach` (ohne Schlüssel = ab Anfang), höchstens n
  const _spStoreBatch = function (db, store, nach, n) {
    return new Promise(function (resolve, reject) {
      try {
        const rq = db.transaction(store, 'readonly').objectStore(store).getAll(nach == null ? undefined : IDBKeyRange.lowerBound(nach, true), n);
        rq.onsuccess = function () { resolve(rq.result || []); };
        rq.onerror = function () { reject(rq.error || new Error('Lesefehler')); };
      } catch (e) { reject(e); }
    });
  };
  const _spStoreAnzahl = function (db, store) {
    return new Promise(function (resolve) {
      try {
        const rq = db.transaction(store, 'readonly').objectStore(store).count();
        rq.onsuccess = function () { resolve(rq.result || 0); };
        rq.onerror = function () { resolve(0); };
      } catch (e) { resolve(0); }
    });
  };

  // Alle gespeicherten Profile (neuer als `seit`) in Stapeln an `senden` geben. Jedes Profil wie ein Raum-Scan, ohne Rohdaten.
  const _spCacheLesen = async function (seit, senden) {
    const o = await _spCacheOeffnen();
    if (!o.db) { senden({ vorhanden: false, grund: o.fehler || null, andere: o.andere || [], results: [], fertig: true }); return; }
    const db = o.db;
    try {
      if (!db.objectStoreNames.contains('profiles')) { senden({ vorhanden: false, grund: 'Der Speicher "profiles" fehlt in ' + SP_CACHE_DB, andere: [], results: [], fertig: true }); return; }
      const notizen = {};
      if (db.objectStoreNames.contains('notes')) {
        let nach = null;
        for (;;) {
          const teil = await _spStoreBatch(db, 'notes', nach, 200);
          if (!teil.length) break;
          nach = teil[teil.length - 1].memberNumber;
          teil.forEach(function (n) { if (n && Number.isInteger(n.memberNumber) && typeof n.note === 'string' && n.note) notizen[n.memberNumber] = n; });
        }
      }
      const gesamt = await _spStoreAnzahl(db, 'profiles');
      const ichNr = window.Player ? window.Player.MemberNumber : null;
      let nach = null, gelesen = 0, maxSeen = 0;
      for (;;) {
        const zeilen = await _spStoreBatch(db, 'profiles', nach, SP_CACHE_STAPEL);
        if (!zeilen.length) break;
        nach = zeilen[zeilen.length - 1].memberNumber;
        const results = [];
        zeilen.forEach(function (z) {
          gelesen++;
          if (!z || !Number.isInteger(z.memberNumber)) return;
          const seen = typeof z.seen === 'number' && isFinite(z.seen) ? z.seen : 0;
          if (seit && seen <= seit) return;                     // seit dem letzten Einlesen unverändert
          if (seen > maxSeen) maxSeen = seen;
          let b = null;
          try { b = typeof z.characterBundle === 'string' ? JSON.parse(z.characterBundle) : z.characterBundle; } catch (e) {}
          let p;
          try { p = b && typeof b === 'object' ? _spProfil(b, ichNr, true) : null; } catch (e) { p = null; }
          if (!p) p = { nr: z.memberNumber };
          p.nr = z.memberNumber;                                // maßgeblich ist der Schlüssel der Zeile
          if (!p.name) p.name = _spKurz(z.name, 100);
          if (!p.nickname && z.lastNick) p.nickname = _spKurz(z.lastNick, 100);
          p.istIch = p.nr === ichNr;
          p.gesehen = seen;
          const nz = notizen[z.memberNumber];
          if (nz) { p.notiz = nz.note.slice(0, SP_STRING_MAX); p.notizTs = typeof nz.updatedAt === 'number' ? nz.updatedAt : 0; }
          results.push(p);
        });
        senden({ vorhanden: true, results: results, gesamt: gesamt, gelesen: gelesen, fertig: false });
        await _spSchlafen(15);                                  // dem Spiel Luft lassen
      }
      senden({ vorhanden: true, results: [], gesamt: gesamt, gelesen: gelesen, fertig: true, maxSeen: maxSeen });
    } finally { try { db.close(); } catch (e) {} }
  };

  // Ein einzelnes Profil aus dem Speicher (Bilder)
  const _spCacheZeile = async function (db, nr) {
    return new Promise(function (resolve) {
      try {
        const rq = db.transaction('profiles', 'readonly').objectStore('profiles').get(nr);
        rq.onsuccess = function () { resolve(rq.result || null); };
        rq.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  };

  // Bild eines Spielers, der NICHT im Raum ist, aus seinem gespeicherten Profil: WCE/FBC öffnet dafür selbst einen Charakter per
  // CharacterLoadOnline (Befehl "/profiles" → Öffnen). Hier ebenso, aber mit einer eigenen Kennung (berührt keinen echten Charakter)
  // und der Charakter wird gleich danach wieder aus der Liste des Spiels genommen. Nichts wird gesendet.
  const _spBildAusBundle = async function (bundle, nr) {
    if (typeof CharacterLoadOnline !== 'function') throw new Error('CharacterLoadOnline fehlt in dieser BC-Version');
    if (typeof Character === 'undefined' || !Array.isArray(Character)) throw new Error('Die Charakterliste des Spiels fehlt');
    const kopie = JSON.parse(JSON.stringify(bundle));
    kopie.ID = 'bcu-bild-' + nr;
    kopie.MemberNumber = nr;
    let C = null;
    try {
      C = CharacterLoadOnline(kopie, nr);
      if (!C) throw new Error('Charakter wurde nicht erzeugt');
      let vorher = null, stabil = false;
      for (let i = 0; i < 12; i++) {
        try {
          if (i === 0 && typeof CharacterRefresh === 'function') CharacterRefresh(C, false, false);
          if (typeof CharacterLoadCanvas === 'function') CharacterLoadCanvas(C);
        } catch (e) {}
        await _spSchlafen(i === 0 ? 40 : 90);
        const h = C.Canvas ? _spCanvasHash(C.Canvas) : -1;
        if (h !== -1 && h === vorher) { stabil = true; break; }   // zwei gleiche Zeichnungen hintereinander: alle Teile sind geladen
        vorher = h;
      }
      const img = _spBildVonCanvas(C.Canvas);
      if (!img) throw new Error('Der Zeichenpuffer ist leer');
      return { img: img, stabil: stabil };
    } finally {
      // Wieder aus der Charakterliste nehmen: bevorzugt mit der Funktion des Spiels (räumt auch Animationen und Zwischenspeicher auf),
      // sonst direkt aus der Liste
      try { if (C && typeof CharacterDelete === 'function') CharacterDelete(C); } catch (e) {}
      try { const i = C ? Character.indexOf(C) : -1; if (i >= 0) Character.splice(i, 1); } catch (e) {}
    }
  };

  // Bilder für mehrere Spieler nacheinander: im Raum → deren Puffer, sonst aus dem WCE/FBC-Speicher
  let _spBilderLaeuft = false;
  const _spBilderErzeugen = async function (nrs) {
    const bilder = [], fehler = [];
    let cache = null;
    try {
      for (let k = 0; k < nrs.length; k++) {
        const nr = nrs[k];
        try {
          const raum = (window.ChatRoomCharacter || []).concat(window.Player ? [window.Player] : []);
          const live = raum.find(function (c) { return c && c.MemberNumber === nr; });
          if (live) {
            const img = _spBildLive(live);
            if (img) bilder.push({ nr: nr, img: img, stabil: true, quelle: 'raum' }); else fehler.push({ nr: nr, grund: 'Der Zeichenpuffer ist leer' });
            continue;
          }
          if (!cache) cache = await _spCacheOeffnen();
          if (!cache.db) { fehler.push({ nr: nr, grund: cache.fehlt ? 'Kein WCE/FBC-Profilspeicher gefunden' : (cache.fehler || 'Profilspeicher nicht lesbar') }); continue; }
          const zeile = await _spCacheZeile(cache.db, nr);
          if (!zeile || !zeile.characterBundle) { fehler.push({ nr: nr, grund: 'Nicht im Profilspeicher' }); continue; }
          let b = null;
          try { b = typeof zeile.characterBundle === 'string' ? JSON.parse(zeile.characterBundle) : zeile.characterBundle; } catch (e) {}
          if (!b || typeof b !== 'object') { fehler.push({ nr: nr, grund: 'Gespeichertes Profil nicht lesbar' }); continue; }
          const r = await _spBildAusBundle(b, nr);
          bilder.push({ nr: nr, img: r.img, stabil: r.stabil, quelle: 'cache' });
        } catch (e) {
          fehler.push({ nr: nr, grund: String((e && e.message) || e).slice(0, 160) });
        }
        await _spSchlafen(20);
      }
    } finally { if (cache && cache.db) { try { cache.db.close(); } catch (e) {} } }
    return { bilder: bilder, fehler: fehler };
  };

  // ── Auto-Scan bei Raumwechsel / Member-Join ───────────────────────────
  const _outfitRunId = Date.now();
  window.__BCK_OutfitRunId = _outfitRunId;

  /* Ein billiger Vergleichsschluessel: nur was sich beim Umziehen aendert.
     Gemessen ~0,4 ms je Person - gegenueber ~4 ms fuer den vollen Scan,
     davon 2,4 ms allein das Miniaturbild (JPEG-Kodierung des Charakter-
     Canvas) und 1,2 ms die LZ-Kompression. */
  function _BCU_schnellFp(C) {
    let s = '';
    for (const item of (C.Appearance ?? [])) {
      const g = item.Asset?.Group?.Name, n = item.Asset?.Name;
      if (!g || !n) continue;
      const col = typeof item.Color === 'string' ? item.Color
                : Array.isArray(item.Color) ? item.Color.join(',') : '';
      s += g + ':' + n + ':' + col
         + ':' + (item.Craft?.Name ?? '')
         + ':' + (item.Property?.LockedBy ?? '')
         + ':' + (item.Property?.Type ?? '') + ';';
    }
    return s;
  }

  /* Die teure Arbeit in Leerlaufpausen verteilen, eine Person je Abschnitt.
     Sonst blockiert ein Scan mit 8 Personen rund 32 ms am Stueck - zwei
     ausgelassene Bilder, und genau das war als Ruckeln in Chat und
     Positions-Updates zu spueren. */
  function _BCU_leerlauf(fn) {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 16);
  }

  function _outfitAutoScan() {
    if (window.__BCK_OutfitRunId !== _outfitRunId) return;
    const _popup = window.__BCK_popupRef;
    if (!_popup || _popup.closed) return;
    const _room = (typeof ChatRoomData !== 'undefined' && ChatRoomData?.Name) ? ChatRoomData.Name : null;
    if (!_room) return;
    try {
      const _s = new Set();
      const _chars = [Player, ...(ChatRoomCharacter ?? [])]
        .filter(c => c?.MemberNumber && !_s.has(c.MemberNumber) && _s.add(c.MemberNumber));

      /* ChatRoomSync feuert bei JEDER Bewegung im Raum. Bisher wurde daraufhin
         das komplette Outfit aller Anwesenden gepackt und ein Miniaturbild
         erzeugt - obwohl das Popup unveraenderte Outfits ohnehin verwirft.
         Jetzt entscheidet der billige Schluessel, wer ueberhaupt drankommt. */
      window.__BCK_outfitFp = window.__BCK_outfitFp || {};
      const _neu = [];
      for (const c of _chars) {
        const fp = _BCU_schnellFp(c);
        if (window.__BCK_outfitFp[c.MemberNumber] === fp) continue;
        window.__BCK_outfitFp[c.MemberNumber] = fp;
        _neu.push(c);
      }
      if (!_neu.length) return;

      const _raus = [];
      const _weiter = () => {
        if (window.__BCK_OutfitRunId !== _outfitRunId) return;
        const C = _neu.shift();
        if (!C) {
          if (_raus.length && _popup && !_popup.closed)
            _popup.postMessage({ app: APP, type: 'OUTFIT_SCAN_DATA', results: _raus, room: _room }, ALLOWED_ORIGIN);
          return;
        }
        try { _raus.push(window._BCU_serializeChar(C)); } catch (_) {}
        _BCU_leerlauf(_weiter);
      };
      _BCU_leerlauf(_weiter);
    } catch(_) {}
  }

  function _outfitDebounce() {
    if (window.__BCK_OutfitRunId !== _outfitRunId) return;
    clearTimeout(window.__BCK_outfitTimer);
    window.__BCK_outfitTimer = setTimeout(_outfitAutoScan, 3000);
  }

  (function _installOutfitScan() {
    if (typeof ServerSocket === 'undefined') { setTimeout(_installOutfitScan, 1000); return; }
    // Alte Listener vom vorherigen Bookmarklet-Aufruf entfernen – wie beim
    // CurseTestMonitor weiter unten. Die Run-ID macht sie zwar wirkungslos,
    // aber ohne off() haengt nach jedem Klick ein weiteres totes Paar am
    // Socket und wird bei jedem Raum-Sync mit aufgerufen.
    if (window.__BCK_outfitDebounceH) {
      try {
        ServerSocket.off('ChatRoomSync',           window.__BCK_outfitDebounceH);
        ServerSocket.off('ChatRoomSyncMemberJoin', window.__BCK_outfitDebounceH);
      } catch (e) {}
    }
    window.__BCK_outfitDebounceH = _outfitDebounce;
    ServerSocket.on('ChatRoomSync',           _outfitDebounce);
    ServerSocket.on('ChatRoomSyncMemberJoin', _outfitDebounce);
    BCK.ok('[OutfitScan] Auto-Scan aktiv (Run-ID: ' + _outfitRunId + ')');
  })();

  // ── Curse-Test Chat-Monitor ────────────────────────────────────────────────
  // Leitet LSCG-Curse-Systemmeldungen an das Popup weiter damit der Curse-Test
  // automatisch pausieren / weitermachen kann.
  (function _installCurseTestMonitor() {
    if (typeof ServerSocket === 'undefined') { setTimeout(_installCurseTestMonitor, 1000); return; }
    // Trackt ob ein Curse-Start erkannt wurde (für State-basierte Ende-Erkennung)
    // window-Property damit _ctStop() es von außen resetten kann
    window.__BCK_ctCurseWasActive = false;
    var _ctLastCurseActivationCount = -1;

    var _ctSendEvent = function(event, content) {
      var popup = window.__BCK_popupRef;
      if (!popup || popup.closed) return;
      BCK.info('[CurseTestMonitor] ' + (event === 'curse_end' ? '✅ CURSE ENDE' : '🔮 CURSE START')
        + ' → ' + content.slice(0, 100));
      popup.postMessage({
        app: APP, type: 'CT_CHAT_MSG',
        event: event, content: content,
        msgType: '', sender: null
      }, ALLOWED_ORIGIN);
    };

    var _ctMsgH = function(data) {
      // ── Curse-START: Type:"Action" Content:"Beep" + Tag:"msg" ────────
      if (data.Type === 'Action' && data.Content === 'Beep' && Array.isArray(data.Dictionary)) {
        var startText = '';
        data.Dictionary.forEach(function(d) {
          if (d && d.Tag === 'msg' && typeof d.Text === 'string') startText += d.Text + ' ';
        });
        if (startText.toLowerCase().indexOf('curse washes over') !== -1) {
          window.__BCK_ctCurseWasActive = true;
          _ctSendEvent('curse_start', startText.trim());
          return;
        }
      }

      // ── Curse-ENDE via LSCG-Sync: Hidden/LSCGMsg ────────────────────
      // Erkennung NUR über active:false (cursed-item gibt seinen Curse frei / fällt ab).
      // WICHTIG: activationCount NICHT als Ende werten! Ein Curse, der nacheinander
      // mehrere Items hinzufügt ("spreads further, adding …"), erhöht bei JEDER
      // Hinzufügung den Count. Würde das als Ende gewertet, bräche der Test die
      // Kette nach dem 1.–2. Item ab (Standard-Outfit entfernt die Items → Spiel
      // beendet den Curse vorzeitig). Das echte Ende liefert active:false bzw. der
      // "sigh of relief"-Chat-Observer weiter unten.
      if (data.Type === 'Hidden' && data.Content === 'LSCGMsg' && Array.isArray(data.Dictionary)) {
        var dict0 = data.Dictionary[0];
        if (dict0 && dict0.message && dict0.message.type === 'sync') {
          var sm = dict0.message.settings && dict0.message.settings.StateModule;
          if (sm && Array.isArray(sm.states)) {
            sm.states.forEach(function(st) {
              if (st.type === 'cursed-item') {
                var cnt = st.activationCount || 0;
                // Ende NUR wenn der Curse vorher aktiv war und jetzt inactive ist.
                if (window.__BCK_ctCurseWasActive && st.active === false) {
                  window.__BCK_ctCurseWasActive = false;
                  _ctLastCurseActivationCount = cnt;
                  _ctSendEvent('curse_end', 'cursed-item beendet (count:' + cnt + ')');
                } else {
                  // Count nur mitführen — eine Erhöhung bedeutet "Curse fügt gerade
                  // ein weiteres Item hinzu", NICHT dass er beendet ist.
                  _ctLastCurseActivationCount = cnt;
                }
              }
            });
          }
        }
      }
    };

    // ── MutationObserver: client-seitig gerenderte Chat-Texte ───────────
    // LSCG rendert "sigh of relief" direkt in den DOM ohne Server-Message
    // Alten Observer vom vorherigen Bookmarklet-Aufruf entfernen
    if (window.__BCK_ctObserver) {
      try { window.__BCK_ctObserver.disconnect(); } catch(e) {}
      window.__BCK_ctObserver = null;
    }
    (function _installChatObserver() {
      var chatLog = document.getElementById('TextAreaChatLog');
      if (!chatLog) { setTimeout(_installChatObserver, 2000); return; }
      var obs = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (!window.__BCK_ctCurseWasActive) return; // nur wenn Start erkannt wurde
            var txt = (node.textContent || node.innerText || '').toLowerCase();
            if (txt.indexOf('sigh of relief') !== -1 && txt.indexOf('curse') !== -1) {
              window.__BCK_ctCurseWasActive = false;
              _ctSendEvent('curse_end', node.textContent.trim().slice(0, 120));
            }
          });
        });
      });
      obs.observe(chatLog, { childList: true, subtree: true });
      window.__BCK_ctObserver = obs;
      BCK.ok('[CurseTestMonitor] Chat-Observer aktiv');
    })();
    // Alten Listener vom vorherigen Bookmarklet-Aufruf entfernen
    if (window.__BCK_ctMsgH) {
      try { ServerSocket.off('ChatRoomMessage', window.__BCK_ctMsgH); } catch(e) {}
    }
    window.__BCK_ctMsgH = _ctMsgH;
    ServerSocket.on('ChatRoomMessage', _ctMsgH);
    BCK.ok('[CurseTestMonitor] aktiv');
  })();

  // ── Server-Wächter: meldet jede Zustandsänderung sofort ans Tool ──────────
  // Nur Änderungen gehen raus; PONG und PLAYER_DATA tragen den Stand zusätzlich,
  // falls das Tool-Fenster zum Zeitpunkt der Änderung noch nicht gepinnt war.
  if (window.__BCK_gameStateTimer) clearInterval(window.__BCK_gameStateTimer);
  window.__BCK_gameStateLast = '';
  window.__BCK_gameStateTimer = setInterval(function () {
    const st = _bckGameState();
    const key = JSON.stringify(st);
    if (key === window.__BCK_gameStateLast) return;
    const hatteStand = !!window.__BCK_gameStateLast;
    window.__BCK_gameStateLast = key;
    if (window.__BCK_sendMonState) { try { window.__BCK_sendMonState(st); } catch (e) {} }
    if (hatteStand) BCK.info('Server-Zustand:', st.online ? 'online' : 'GETRENNT', '| Screen:', st.screen, '| Raum:', st.room ?? '–');
    const ref = window.__BCK_popupRef;
    if (!ref || ref.closed) return;
    try { ref.postMessage({ app: APP, type: 'GAME_STATE', game: st }, ALLOWED_ORIGIN); } catch (e) {}
  }, 1000);

  // ── Popup öffnen / fokussieren ─────────────────────────
  if (window.__BCK_WIN__ && !window.__BCK_WIN__.closed) {
    window.__BCK_WIN__.focus();
    console.log('[BC-Konfigurator] Popup fokussiert');
    return;
  }

  const left = Math.max(0, Math.round(screen.width  / 2 - POPUP_W / 2));
  const top  = Math.max(0, Math.round(screen.height / 2 - POPUP_H / 2));

  const win = window.open(
    POPUP_URL,
    APP,
    `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!win) {
    alert('❌ Popup blockiert!\nBitte Popup-Blocker für diese Seite deaktivieren und nochmal klicken.');
    return;
  }

  window.__BCK_WIN__ = win;
  console.log('[BC-Konfigurator] Popup geöffnet ✅');
})();
