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
  // FIX: Validate origin to prevent other pages from sending EXEC commands
  const ALLOWED_ORIGIN = 'https://animereviewer1-sketch.github.io';

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
        lscgCache[aliasKey] = { ...lscgCache[C.MemberNumber + ':' + lscgMatch.Name.toLowerCase()], _craftAlias: craft.Name };
        changed = true;
      }
    });
    if (changed) _persistLscgCache();
  }

  let _hookInstalled = false;
  function installLSCGHook() {
    if (_hookInstalled) return;
    // Poll alle 6s – kein CharacterRefresh-Override (kein BCX-Warning)
    setInterval(() => {
      try { [Player, ...(ChatRoomCharacter ?? [])].forEach(_snapshotAllLSCG); } catch {}
    }, 6000);
    _hookInstalled = true;
    console.log('✅ LSCG-Cache-Polling aktiv (alle 6s, eigener persistenter Cache)');
  }

  function _getLSCGFromCache(memberNumber, craftName) {
    return lscgCache[memberNumber + ':' + craftName.toLowerCase()] ?? null;
  }

  function findeGruppe(itemName) {
    const gruppen = [
      'ItemHandheld','ItemMisc','ItemAddon','ItemHands','ItemArms','ItemLegs','ItemFeet',
      'ItemNeck','ItemHead','ItemMouth','ItemEyes','ItemEars','ItemNose','ItemTorso',
      'ItemTorso2','ItemPelvis','ItemVulva','ItemVulvaPiercings','ItemButt','ItemNipples',
      'ItemNipplesPiercings','ItemBoots','ItemHood','ItemDevices','ItemNeckAccessories',
      'ItemNeckRestraints','ItemMouthAccessory','Cloth','ClothLower','ClothAccessory',
      'Shoes','Hat','Gloves','Socks','Bracelet','Mask','Decals','Bra','Panties',
      'Corset','SocksRight'
    ];
    for (const g of gruppen) {
      if (typeof AssetGet === 'function' && AssetGet('Female3DCG', g, itemName)) return g;
    }
    return null;
  }

  function isCursed(craft) {
    const terms = ['cursed','enchanted'];
    const name = (craft.Name ?? '').toLowerCase();
    const desc = (craft.Description ?? '').toLowerCase();
    return terms.some(b => name.includes(b) || desc.includes(b));
  }

  function scan() {
    // Nur Raum-Charaktere scannen (nicht Player.Crafting – das ist die gesamte Garderobe)
    // Vor dem Scan: craftCache in database laden (historische Einträge verfügbar halten)
    Object.entries(craftCache).forEach(([k, e]) => { if (!database[k]) database[k] = { ...e, _fromCache: true }; });
    const raumChars = ChatRoomCharacter ?? [];
    _snapshotAllLSCG(Player);
    const spieler = raumChars;
    let neuDB = 0, aktualisiert = 0, neuLSCG = 0;
    spieler.forEach(C => {
      _snapshotAllLSCG(C);
      (C.Crafting ?? []).forEach(craft => {
        if (!craft?.Item) return;
        const gruppe = findeGruppe(craft.Item);
        const key    = C.MemberNumber + ':' + craft.Item + ':' + craft.Name;
        const istNeu = !database[key];
        // LSCG: erst live schauen, dann in eigenem persistenten Cache nachschlagen
        const liveCursedItems = C.LSCG?.CursedItemModule?.CursedItems ?? [];
        const lscgLive = liveCursedItems.find(ci => ci.Name?.toLowerCase() === craft.Name?.toLowerCase()) ?? null;
        if (lscgLive) _cacheLSCGWithCraftAlias(C.MemberNumber, lscgLive, craft.Name); // immer cachen
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
          Besitzer:       { Name: C.Name, Nummer: C.MemberNumber },
          ZuletztGesehen: new Date().toLocaleTimeString(),
          Craft:          { ...craft, MemberName: C.Name, MemberNumber: C.MemberNumber },
          LSCG:           lscg,
          LSCGAusCache:   lscgIsFromCache,
        };
        if (istNeu) neuDB++; else aktualisiert++;
        database[key] = eintrag;
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
    return { database, lscgTable, lscgCache, neuDB, aktualisiert, neuLSCG };
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

  function injectEntry(key, entry) {
    if (!database[key]) database[key] = { ...entry, _injected: true };
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


  // ── PostMessage Listener ───────────────────────────────
  if (!window.__BCK_LISTENER__) {
    window.__BCK_LISTENER__ = true;

    window.addEventListener('message', function (ev) {
      // FIX: Validate origin - only accept messages from the known popup URL
      // This prevents arbitrary pages from executing EXEC commands in the BC context
      if (!ev.data || ev.data.app !== APP) return;
      if (ev.origin !== ALLOWED_ORIGIN) {
        BCK.warn('postMessage von unbekannter Origin blockiert:', ev.origin);
        return;
      }
      const src = ev.source;
      window.__BCK_popupRef = src; // Bot kann damit Logs zurückschicken
      BCK.info('\u2190 postMessage:', ev.data.type, '| origin:', ev.origin);

      switch (ev.data.type) {
        case 'PING':
          BCK.info('PING \u2192 sende PONG');
          src.postMessage({ app: APP, type: 'PONG' }, ALLOWED_ORIGIN);
          break;

        case 'GET_CACHE': {
          BCK.info('GET_CACHE \u2013 baue Cache...');
          let cache = {}, err = null;
          try {
            cache = buildBCCache();
            const gc = Object.keys(cache).length;
            const ic = Object.values(cache).reduce((n,g)=>n+Object.keys(g).length,0);
            BCK.ok('Cache: ' + gc + ' Gruppen, ' + ic + ' Items');
          } catch (ex) {
            err = ex.message;
            BCK.err('buildBCCache FEHLER:', ex.message);
          }
          BCK.info('Sende CACHE_DATA | err:', err ?? 'keiner');
          src.postMessage({ app: APP, type: 'CACHE_DATA', cache, err }, ALLOWED_ORIGIN);
          break;
        }

        case 'GET_PLAYER': {
          try {
            const P = window.Player;
            src.postMessage({ app: APP, type: 'PLAYER_DATA',
              memberNumber: P?.MemberNumber,
              name: P?.Name,
              members: (window.ChatRoomCharacter ?? []).map(c => ({ num: c.MemberNumber, name: c.Name })),
            }, ALLOWED_ORIGIN);
          } catch (ex) {
            src.postMessage({ app: APP, type: 'PLAYER_DATA', err: ex.message }, ALLOWED_ORIGIN);
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
            src.postMessage({
              app: APP, type: 'CURSE_DATA',
              database:  result.database,
              lscgTable: result.lscgTable,
              lscgCache: result.lscgCache,
            }, ALLOWED_ORIGIN);
            BCK.ok('CURSE_DATA gesendet: ' + Object.keys(result.database).length + ' Crafts');
          } catch (ex) {
            BCK.err('SCAN_CURSES Fehler:', ex.message);
            src.postMessage({ app: APP, type: 'CURSE_DATA', err: ex.message }, ALLOWED_ORIGIN);
          }
          break;
        }

        case 'WEAR_CURSE': {
          BCK.info('WEAR_CURSE key=' + ev.data.dbKey + ' target=' + ev.data.targetNum);
          try {
            // Inject entry from popup if local DB empty (browser switch / restart)
            if (ev.data.entry) {
              window.CurseScanner.injectEntry(ev.data.dbKey, ev.data.entry);
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
      }
    });

    console.log('[BC-Konfigurator] Listener aktiv ✅');
  }

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