// BC-Konfigurator Loader v1
// Wird via Bookmarklet in die BC-Seite injiziert.
// Öffnet das Konfigurator-Popup und leitet Befehle direkt ans Spiel.
(function () {
  'use strict';

  const APP      = 'BCKonfigurator';
  const POPUP_W  = 1380;
  const POPUP_H  = 900;
  const POPUP_URL = 'https://animereviewer1-sketch.github.io/bc-configurator/';

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

  // ── PostMessage Listener ───────────────────────────────
  if (!window.__BCK_LISTENER__) {
    window.__BCK_LISTENER__ = true;

    window.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.app !== APP) return;
      const src = ev.source;

      switch (ev.data.type) {
        case 'PING':
          src.postMessage({ app: APP, type: 'PONG' }, '*');
          break;

        case 'GET_CACHE': {
          let cache = {}, err = null;
          try { cache = buildBCCache(); }
          catch (ex) { err = ex.message; }
          src.postMessage({ app: APP, type: 'CACHE_DATA', cache, err }, '*');
          break;
        }

        case 'GET_PLAYER': {
          try {
            const P = window.Player;
            src.postMessage({ app: APP, type: 'PLAYER_DATA',
              memberNumber: P?.MemberNumber,
              name: P?.Name,
              members: (window.ChatRoomCharacter ?? []).map(c => ({ num: c.MemberNumber, name: c.Name })),
            }, '*');
          } catch (ex) {
            src.postMessage({ app: APP, type: 'PLAYER_DATA', err: ex.message }, '*');
          }
          break;
        }

        case 'EXEC':
          try {
            // eslint-disable-next-line no-new-func
            new Function(ev.data.code)();
            src.postMessage({ app: APP, type: 'EXEC_OK' }, '*');
          } catch (ex) {
            src.postMessage({ app: APP, type: 'EXEC_ERR', msg: ex.message }, '*');
          }
          break;
      }
    });

    console.log('[BC-Konfigurator] Listener aktiv ✅');
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