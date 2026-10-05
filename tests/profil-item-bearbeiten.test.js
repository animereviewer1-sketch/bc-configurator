import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Profil-Item im Item Manager bearbeiten: die gespeicherte Konfiguration wird 1:1 geladen (Optionen, Eigenschaften, Vibrator,
// Farben, Schwierigkeit, Schloss, Craft, Priorität, Ebenen, übrige Eigenschaften), und "Änderung ins Profil übernehmen" schreibt sie
// ohne Verlust zurück. Dazu: "Erweitert"-Bereich im Code, "👗 Outfit" gibt die Werte als echte Felder weiter.

function boot() {
  const els = {};
  const meldungen = [];
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: () => true, alert: () => {} });
  const dummy = () => Object.assign(makeElementStub(), { querySelector: () => makeElementStub(), querySelectorAll: () => [] });
  ctx.document.createElement = dummy;
  ctx.document.getElementById = (id) => {
    if (!els[id]) {
      els[id] = Object.assign(makeElementStub(), { id, options: [] });
      if (/^ci_\d+$/.test(id)) els[id].querySelector = () => ({ textContent: '' });
      if (id === 'lockType') els[id].value = '';
      if (id === 'timerH') els[id].value = '1';
      if (id === 'comboCode') els[id].value = '1234';
    }
    return els[id];
  };
  ctx.__meldungen = meldungen;
  evalIn(ctx, `
    renderProfileList = function () {};
    switchTab = function () {};
    _autoOutfitCode = function () {};
    showStatus = function (m) { __meldungen.push(String(m)); };
    Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
    _profileNameMap['pf1'] = 'P';
    CACHE['ItemArms'] = { TestRope: {
      archetype: 'modular', isModular: true, colorCount: 2, defaultColors: ['Default', 'Default'], difficulty: 2,
      typeKeys: { a: [{ name: 'Plain' }, { name: 'Shock' }, { name: 'Loose' }], b: [{ name: 'x' }, { name: 'y' }] },
      props: ['ShockLevel', 'ShowText', 'Opacity', 'Mystery'], allowedCraftProps: ['Normal', 'Large'],
    } };
    CACHE['ItemVulva'] = { TestEgg: {
      archetype: 'vibrating', colorCount: 1, defaultColors: ['Default'], typeKeys: {}, props: [], allowedCraftProps: ['Normal'],
      vibratingInfo: { baselineProps: { PunishStruggle: false, AccessMode: '', TriggerValues: 'Increase,Decrease' } },
    } };
    CACHE['ItemBoots'] = { Tri: { colorCount: 3, defaultColors: ['#202020', '#808080', '#ffffff'], typeKeys: {}, props: [], allowedCraftProps: ['Normal'] } };
    CACHE['ItemMouth'] = { TestGag: {
      colorCount: 1, defaultColors: ['Default'], typeKeys: {}, props: [], directOptions: ['Normal', 'Tight', 'Loose'], allowedCraftProps: ['Normal'],
    } };
  `);
  return { ctx, els, meldungen };
}

const seilItem = () => ({
  group: 'ItemArms', asset: 'TestRope',
  colors: ['#ff0000', '#00ff00'],
  tr: { a: 1, b: 0, extra: 7 },
  difficulty: 4,
  lock: 'MetalPadlock', lockMember: 12,
  craft: { Name: 'Hübsch', Description: 'weich', Property: 'Large', Private: true, Color: '#ff0000', Lock: '', Item: 'TestRope', MemberNumber: 7 },
  property: {
    ShockLevel: 3, ShowText: true, Opacity: 0.5, Mystery: 'x', Type: 'a1b0',
    LockedBy: 'MetalPadlock', LockMemberNumber: 12, Effect: ['Lock', 'Block'],
    Fremd: { tief: [1, 2, { z: 3 }] },
    OverridePriority: 5, LayerProperties: [{ Opacity: 0.5 }],
  },
});

function oeffnen(ctx, item) {
  evalIn(ctx, `PROFILES['P'] = { name: 'P', items: [${JSON.stringify(item)}] };`);
  ctx.profileOpenInItemManager('pf1', 0);
}
const profilItem = (ctx) => JSON.parse(JSON.stringify(evalIn(ctx, "PROFILES['P'].items[0]")));
const wert = (els, id) => els[id]?.value;

describe('Konfiguration 1:1 laden', () => {
  it('Optionen: Einzelwert, unbekannte Schlüssel bleiben im Profil', () => {
    const { ctx } = boot();
    oeffnen(ctx, seilItem());
    expect(evalIn(ctx, 'CURRENT.asset')).toBe('TestRope');
    expect(evalIn(ctx, '[...dimSelected.a]')).toEqual([1]);
    expect(evalIn(ctx, '[...dimSelected.b]')).toEqual([0]);
    expect(evalIn(ctx, 'dimMode.a')).toBe('single');
  });

  it('Mehrfachauswahl (Bitmaske) wird als Multi mit den richtigen Optionen geladen', () => {
    const { ctx } = boot();
    const it = seilItem(); it.tr = { a: 5, b: 0 };   // 5 = Option 0 + Option 2 (Wert größer als die Optionszahl)
    oeffnen(ctx, it);
    expect(evalIn(ctx, 'dimMode.a')).toBe('multi');
    expect(evalIn(ctx, '[...dimSelected.a].sort()')).toEqual([0, 2]);
  });

  it('Eigenschaften: passende Werte in die Felder, nicht passende (Zahl mit Komma, Objekte) in "Erweitert"', () => {
    const { ctx, els } = boot();
    oeffnen(ctx, seilItem());
    expect(evalIn(ctx, 'dimSubProps.a[1].ShockLevel')).toBe(3);
    expect(evalIn(ctx, 'globalPropVals.ShowText')).toBe(true);
    expect(evalIn(ctx, 'globalPropVals.Mystery')).toBe('x');
    const extras = JSON.parse(wert(els, 'extraProps'));
    expect(extras).toEqual({ Opacity: 0.5, Effect: ['Lock', 'Block'], Fremd: { tief: [1, 2, { z: 3 }] } });
  });

  it('Farben, Schwierigkeit, Schloss, Craft, Priorität und Ebenen stehen in den Feldern', () => {
    const { ctx, els } = boot();
    oeffnen(ctx, seilItem());
    expect(wert(els, 'color_0')).toBe('#ff0000');
    expect(wert(els, 'color_1')).toBe('#00ff00');
    expect(evalIn(ctx, 'tightnessOn')).toBe(true);
    expect(evalIn(ctx, 'tightnessVal')).toBe(4);
    expect(wert(els, 'lockType')).toBe('MetalPadlock');
    expect(wert(els, 'craftName')).toBe('Hübsch');
    expect(wert(els, 'craftDesc')).toBe('weich');
    expect(wert(els, 'craftProp')).toBe('Large');
    expect(els.craftPrivate.checked).toBe(true);
    expect(JSON.parse(wert(els, 'extraOverride'))).toBe(5);
    expect(JSON.parse(wert(els, 'extraLayers'))).toEqual([{ Opacity: 0.5 }]);
  });

  it('Schwierigkeit, die dem Basiswert des Items entspricht, wird trotzdem als gesetzt gezeigt', () => {
    const { ctx } = boot();
    const it = seilItem(); it.difficulty = 2;   // = cfg.difficulty
    oeffnen(ctx, it);
    expect(evalIn(ctx, 'tightnessOn')).toBe(true);
    expect(evalIn(ctx, 'tightnessVal')).toBe(2);
  });

  it('Vibrator: Modus/Intensität aus dem Wert 0–9, Effekte, Punishment-Felder; Fremdes bleibt erhalten', () => {
    const { ctx, els } = boot();
    oeffnen(ctx, {
      group: 'ItemVulva', asset: 'TestEgg', colors: ['Default'], tr: { vibrating: 3 }, lock: 'MetalPadlock',
      property: { Mode: 'Constant', Intensity: 2, Effect: ['Egged', 'Vibrating', 'Lock'], PunishStruggle: true, Fremd: 1, LockedBy: 'MetalPadlock' },
    });
    expect(evalIn(ctx, 'vibratingMode')).toBe('Constant');
    expect(evalIn(ctx, 'vibratingIntensity')).toBe(2);
    expect(evalIn(ctx, 'vibratingTR')).toBe(3);
    expect(evalIn(ctx, '[...vibratingEffects].sort()')).toEqual(['Egged', 'Vibrating']);
    expect(evalIn(ctx, 'vibratingExtraEffects')).toEqual(['Lock']);
    expect(evalIn(ctx, 'baselinePropVals.PunishStruggle')).toBe(true);
    expect(JSON.parse(wert(els, 'extraProps'))).toEqual({ Fremd: 1 });
  });

  it('Einfache Option (z. B. Knebel) wird gewählt', () => {
    const { ctx } = boot();
    oeffnen(ctx, { group: 'ItemMouth', asset: 'TestGag', colors: ['Default'], tr: {}, property: { Type: 'Tight' } });
    expect(evalIn(ctx, 'classicOptionSel')).toBe(1);
  });

  it('zeigt die Bearbeiten-Leiste und merkt sich Profil und Position', () => {
    const { ctx } = boot();
    oeffnen(ctx, seilItem());
    expect(evalIn(ctx, '_profilEditKontext')).toMatchObject({ name: 'P', idx: 0 });
  });
});

describe('Änderung ins Profil übernehmen', () => {
  it('ohne Änderung bleibt das Item unverändert (nichts geht verloren)', () => {
    const { ctx } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    ctx.profilItemUebernehmen();
    const nachher = profilItem(ctx);
    // die Variante steht jetzt (wie im Spiel-Snapshot) auch in property.TypeRecord – Bots lesen nur property
    expect(nachher.property).toEqual({ ...vorher.property, TypeRecord: vorher.tr });
    expect(nachher.tr).toEqual(vorher.tr);
    expect(nachher.colors).toEqual(vorher.colors);
    expect(nachher.difficulty).toBe(4);
    expect(nachher.lock).toBe('MetalPadlock');
    expect(nachher.craft).toEqual(vorher.craft);
    expect(evalIn(ctx, '_profilEditKontext')).toBeNull();
  });

  it('eine Änderung (Option, Farbe, Craft-Privat) landet im Profil, der Rest bleibt', () => {
    const { ctx, els } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    evalIn(ctx, 'dimSelected.a = new Set([2]);');
    els.color_0.value = '#123456';
    els.craftPrivate.checked = false;
    els.extraOverride.value = '9';
    ctx.profilItemUebernehmen();
    const nachher = profilItem(ctx);
    expect(nachher.tr).toEqual({ a: 2, b: 0, extra: 7 });
    expect(nachher.property.Type).toBe('a2b0');   // Typ folgt der geänderten Option
    expect(nachher.colors).toEqual(['#123456', '#00ff00']);
    expect(nachher.craft.Private).toBe(false);
    expect(nachher.craft.MemberNumber).toBe(7);   // Feld ohne eigenes Eingabefeld bleibt erhalten
    expect(nachher.property.OverridePriority).toBe(9);
    expect(nachher.property.Fremd).toEqual(vorher.property.Fremd);
    expect(nachher.property.LockedBy).toBe('MetalPadlock');   // Schloss unverändert → Schloss-Eigenschaften bleiben
  });

  it('Schloss entfernt: Schloss-Eigenschaften und der Effekt "Lock" verschwinden', () => {
    const { ctx, els } = boot();
    oeffnen(ctx, seilItem());
    els.lockType.value = '';
    ctx.profilItemUebernehmen();
    const nachher = profilItem(ctx);
    expect(nachher.lock).toBeNull();
    expect(nachher.property.LockedBy).toBeUndefined();
    expect(nachher.property.Effect).toEqual(['Block']);
  });

  it('Vibrator-Item: Modus, Effekte (auch unbekannte) und Punishment bleiben beim Zurückschreiben erhalten', () => {
    const { ctx } = boot();
    const vorher = {
      group: 'ItemVulva', asset: 'TestEgg', colors: ['Default'], tr: { vibrating: 3 }, lock: 'MetalPadlock',
      property: { Mode: 'Constant', Intensity: 2, Effect: ['Egged', 'Vibrating', 'Lock'], PunishStruggle: true, Fremd: 1, LockedBy: 'MetalPadlock' },
    };
    oeffnen(ctx, vorher);
    ctx.profilItemUebernehmen();
    const nachher = profilItem(ctx);
    expect(nachher.tr).toEqual({ vibrating: 3 });
    expect(nachher.property.Mode).toBe('Constant');
    expect(nachher.property.Intensity).toBe(2);
    expect(nachher.property.Effect.sort()).toEqual(['Egged', 'Lock', 'Vibrating']);
    expect(nachher.property.PunishStruggle).toBe(true);
    expect(nachher.property.Fremd).toBe(1);
  });

  it('einzelne Farbe als Text (für alle Ebenen) bleibt Text, solange sie nicht geändert wird', () => {
    const { ctx } = boot();
    const it = seilItem(); it.colors = '#ffffff';
    oeffnen(ctx, it);
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).colors).toBe('#ffffff');
  });

  it('ungültiges JSON in "Erweitert": nichts wird übernommen, das Profil bleibt, es gibt eine Meldung', () => {
    const { ctx, els, meldungen } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    els.extraProps.value = '{ kaputt';
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property).toEqual(vorher.property);
    expect(meldungen.some(m => m.includes('kein gültiges JSON') && m.includes('nichts übernommen'))).toBe(true);
    expect(els.extraFehler.style.display).toBe('block');
    expect(evalIn(ctx, '_profilEditKontext')).not.toBeNull();   // Bearbeitung bleibt offen
  });

  it('eine Auswahl in der Seitenleiste (auch dasselbe Item) beendet das Bearbeiten – kein Überschreiben mit Standardwerten', () => {
    const { ctx, meldungen } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    ctx.selectItem('ItemArms', 'TestRope');
    expect(evalIn(ctx, '_profilEditKontext')).toBeNull();
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property).toEqual(vorher.property);
    expect(profilItem(ctx).tr).toEqual(vorher.tr);
    expect(meldungen.some(m => m.includes('Kein Profil-Item in Bearbeitung'))).toBe(true);
  });

  it('ist inzwischen ein anderes Item gewählt, wird nichts überschrieben', () => {
    const { ctx } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    evalIn(ctx, "CURRENT = { group: 'ItemMouth', asset: 'TestGag', cfg: CACHE.ItemMouth.TestGag };");
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property).toEqual(vorher.property);
  });
});

describe('Item Manager → Code und Outfit', () => {
  const b64 = (code) => [...code.matchAll(/atob\("([^"]+)"\)/g)].map(m => Buffer.from(m[1], 'base64').toString('utf8'));

  it('"Erweitert" fließt in den erzeugten Code ein (Eigenschaften vor, Priorität/Ebenen nach der Initialisierung)', () => {
    const { ctx, els } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    els.extraProps.value = '{"Opacity":0.5}';
    els.extraOverride.value = '4';
    els.extraLayers.value = '[{"Opacity":0.2}]';
    ctx.generate();
    const teile = b64(els.codeOut.value);
    expect(teile.some(t => t.includes('"Opacity":0.5'))).toBe(true);
    expect(teile.some(t => t.includes('"OverridePriority":4') && t.includes('"LayerProperties":[{"Opacity":0.2}]'))).toBe(true);
  });

  it('Craft "privat" kommt im Code an', () => {
    const { ctx, els } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    els.craftName.value = 'Hübsch';
    els.craftPrivate.checked = true;
    ctx.generate();
    expect(els.codeOut.value).toContain('Private: true');
  });

  it('"👗 Outfit" gibt Eigenschaften, Schwierigkeit und Craft als echte Felder weiter – und das Profil speichert sie', () => {
    const { ctx, els } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    evalIn(ctx, 'globalPropVals.ShowText = true; tightnessOn = true; tightnessVal = 6; OUTFIT = [];');
    els.craftName.value = 'Hübsch';
    els.extraProps.value = '{"Opacity":0.5}';
    ctx.addToOutfit();
    const o = JSON.parse(JSON.stringify(evalIn(ctx, 'OUTFIT[0]', {})));
    expect(o.property).toMatchObject({ ShowText: true, Opacity: 0.5 });
    expect(o.difficulty).toBe(6);
    expect(o.craft.Name).toBe('Hübsch');
    ctx.document.getElementById('profileNameInput').value = 'Neu';
    ctx.saveProfile();
    const gespeichert = JSON.parse(JSON.stringify(evalIn(ctx, "PROFILES['Neu'].items[0]")));
    expect(gespeichert.property).toMatchObject({ ShowText: true, Opacity: 0.5 });
    expect(gespeichert.difficulty).toBe(6);
    expect(gespeichert.craft.Name).toBe('Hübsch');
  });

  it('"👗 Outfit" bricht bei ungültigem JSON ab, statt Daten wegzulassen', () => {
    const { ctx, els, meldungen } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    evalIn(ctx, 'OUTFIT = [];');
    els.extraLayers.value = 'nein';
    ctx.addToOutfit();
    expect(evalIn(ctx, 'OUTFIT.length')).toBe(0);
    expect(meldungen.some(m => m.includes('Erweitert'))).toBe(true);
  });

  it('einfache Option (Knebel) wird im Outfit-Code wie im Einzel-Code gesetzt', () => {
    const { ctx } = boot();
    evalIn(ctx, `OUTFIT = [{ group: 'ItemMouth', asset: 'TestGag', colors: ['#fff'], tr: {}, directOption: 'Tight' }];`);
    const code = evalIn(ctx, '_outfitCodeBauen({})');
    expect(code).toContain('TypedItemSetOptionByName(TARGET,_di,"Tight")');
  });
});

describe('Duplikate: Namen mit v2/v3 am Ende zählen als Kopie', () => {
  function bootDup() {
    const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: () => true });
    ctx.document.getElementById = () => makeElementStub();
    evalIn(ctx, `
      renderProfileList = function () {};
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      const dress = [{ group: 'Cloth', asset: 'Dress' }];
      PROFILES['Kleid - Mia']   = { name: 'Kleid - Mia', items: dress };
      PROFILES['Kleid - Miav2'] = { name: 'Kleid - Miav2', items: dress };
      PROFILES['Kleid - Miav3'] = { name: 'Kleid - Miav3', items: dress };
      PROFILES['Rock - Kim']    = { name: 'Rock - Kim', items: [{ group: 'Cloth', asset: 'Skirt' }] };
      PROFILES['Rock - Kimv2']  = { name: 'Rock - Kimv2', items: [{ group: 'Cloth', asset: 'Skirt2' }] };   // andere Items → kein Duplikat
      PROFILE_ALT_OWNERS = new Set(); PROFILE_FAVS.clear(); PROFILE_TAGS = {};
    `);
    return ctx;
  }

  it('v2/v3 mit identischen Items sind löschbar, das Original bleibt', () => {
    const ctx = bootDup();
    expect(evalIn(ctx, '_profileOldDuplikate().sort()')).toEqual(['Kleid - Miav2', 'Kleid - Miav3']);
    ctx.removeProfileDuplicates();
    expect(evalIn(ctx, 'Object.keys(PROFILES).sort()')).toEqual(['Kleid - Mia', 'Rock - Kim', 'Rock - Kimv2']);
  });

  it('nur echte v2+: "v1" oder "Rev" am Ende zählen nicht', () => {
    const ctx = bootDup();
    expect(evalIn(ctx, "['A v1','Rev','Anv2','X-v10','Dv0'].map(_profileIstOld)")).toEqual([false, false, true, true, false]);
  });
});

describe('Prüfbericht: Randfälle beim Bearbeiten', () => {
  it('Bots lesen nur property: die Variante steht nach "👗 Outfit" auch in property.TypeRecord', () => {
    const { ctx } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    evalIn(ctx, 'OUTFIT = []; dimSelected.a = new Set([2]);');
    ctx.addToOutfit();
    expect(JSON.parse(JSON.stringify(evalIn(ctx, 'OUTFIT[0].property.TypeRecord')))).toEqual({ a: 2, b: 0 });
  });

  it('Item, das die Variante nur in property.TypeRecord trägt (ohne Feld tr), wird mit den richtigen Optionen geöffnet und behält sie', () => {
    const { ctx } = boot();
    const it = seilItem(); delete it.tr; it.property.TypeRecord = { a: 2, b: 1 };
    oeffnen(ctx, it);
    expect(evalIn(ctx, '[...dimSelected.a]')).toEqual([2]);
    expect(evalIn(ctx, '[...dimSelected.b]')).toEqual([1]);
    ctx.profilItemUebernehmen();
    const n = profilItem(ctx);
    expect(n.property.TypeRecord).toEqual({ a: 2, b: 1 });
    expect(n.tr).toEqual({ a: 2, b: 1 });
  });

  it('einfaches Item (Knebel): die Option kommt aus tr.typed, nicht aus der ersten Option', () => {
    const { ctx } = boot();
    oeffnen(ctx, { group: 'ItemMouth', asset: 'TestGag', colors: ['Default'], tr: { typed: 2 } });
    expect(evalIn(ctx, 'classicOptionSel')).toBe(2);
    ctx.profilItemUebernehmen();
    const n = profilItem(ctx);
    expect(n.directOption).toBe('Loose');
    expect(n.property.Type).toBe('Loose');
  });

  it('einfaches Item, dessen Option sich nicht bestimmen lässt: nichts wird erfunden (kein "Normal")', () => {
    const { ctx } = boot();
    oeffnen(ctx, { group: 'ItemMouth', asset: 'TestGag', colors: ['Default'], tr: {} });
    ctx.profilItemUebernehmen();
    const n = profilItem(ctx);
    expect(n.directOption).toBeUndefined();
    expect(n.property?.Type).toBeUndefined();
  });

  it('Farben: Text für alle Ebenen bleibt, "Default"-Ebenen bleiben "Default" (auch bei Ebenen mit Hex-Standard)', () => {
    const t1 = boot();
    ['#202020', '#808080', '#ffffff'].forEach((c, i) => { t1.ctx.document.getElementById('color_' + i).value = c; });
    oeffnen(t1.ctx, { group: 'ItemBoots', asset: 'Tri', colors: '#000000', tr: {} });
    t1.ctx.profilItemUebernehmen();
    expect(profilItem(t1.ctx).colors).toBe('#000000');

    const t2 = boot();
    ['#202020', '#808080', '#ffffff'].forEach((c, i) => { t2.ctx.document.getElementById('color_' + i).value = c; });
    oeffnen(t2.ctx, { group: 'ItemBoots', asset: 'Tri', colors: ['Default', '#000000', 'Default'], tr: {} });
    t2.ctx.profilItemUebernehmen();
    expect(profilItem(t2.ctx).colors).toEqual(['Default', '#000000', 'Default']);
  });

  it('Farben: eine geänderte Ebene wird übernommen, die übrigen bleiben im Original', () => {
    const { ctx } = boot();
    ['#202020', '#808080', '#ffffff'].forEach((c, i) => { ctx.document.getElementById('color_' + i).value = c; });
    oeffnen(ctx, { group: 'ItemBoots', asset: 'Tri', colors: ['Default', '#000000', 'Default'], tr: {} });
    ctx.document.getElementById('color_2').value = '#123456';
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).colors).toEqual(['Default', '#000000', '#123456']);
  });

  it('Vibrator: eigene TriggerValues (Wörter, Reihenfolge) bleiben unverändert', () => {
    const { ctx } = boot();
    oeffnen(ctx, { group: 'ItemVulva', asset: 'TestEgg', colors: ['Default'], tr: { vibrating: 0 },
      property: { Mode: 'Off', Intensity: -1, TriggerValues: 'Hallo,Welt,Extra' } });
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property.TriggerValues).toBe('Hallo,Welt,Extra');
  });

  it('Vibrator: eine gespeicherte Intensität, die nicht zum Modus-Knopf passt, bleibt erhalten', () => {
    const { ctx } = boot();
    oeffnen(ctx, { group: 'ItemVulva', asset: 'TestEgg', colors: ['Default'], tr: { vibrating: 6 },
      property: { Mode: 'Escalate', Intensity: 0, Effect: ['Egged'] } });
    ctx.profilItemUebernehmen();
    const n = profilItem(ctx);
    expect(n.property.Mode).toBe('Escalate');
    expect(n.property.Intensity).toBe(0);
  });

  it('Ladefehler: kein Bearbeiten-Kontext, das Profil bleibt unverändert', () => {
    const { ctx, meldungen } = boot();
    const vorher = seilItem();
    evalIn(ctx, '_itemManagerBelegen = function () { throw new Error("kaputt"); };');
    oeffnen(ctx, vorher);
    expect(evalIn(ctx, '_profilEditKontext')).toBeNull();
    expect(meldungen.some(m => m.includes('Bearbeiten abgebrochen'))).toBe(true);
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property).toEqual(vorher.property);
  });

  it('wurde das Item im Profil seit dem Öffnen ersetzt (z. B. neu gespeichert), wird nichts überschrieben', () => {
    const { ctx, meldungen } = boot();
    oeffnen(ctx, seilItem());
    const neuGescannt = { ...seilItem(), colors: ['#0000ff', '#0000ff'], property: { Frisch: 1 } };
    evalIn(ctx, `PROFILES['P'].items[0] = ${JSON.stringify(neuGescannt)};`);
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).property).toEqual({ Frisch: 1 });
    expect(meldungen.some(m => m.includes('seit dem Öffnen geändert'))).toBe(true);
    expect(evalIn(ctx, '_profilEditKontext')).toBeNull();
  });
});

describe('Prüfbericht: Profil ausführen und Bild-Aufnahme', () => {
  it('eingestellte Schloss-Werte (Timer, Kombination) des Profils wirken beim Ausführen; der Besitzer fällt auf lockMember zurück', () => {
    const { ctx } = boot();
    evalIn(ctx, `PROFILES['L'] = { name: 'L', items: [
      { group: 'ItemArms', asset: 'TestRope', colors: ['#fff'], tr: {}, lock: 'CombinationPadlock', lockParams: { timer: 3600000, combo: '4321' }, lockMember: 12 },
      { group: 'ItemMouth', asset: 'TestGag', colors: ['#fff'], tr: {}, lock: 'OwnerPadlock', lockMember: 77 },
    ] };`);
    ctx.loadProfile('L');
    const lp = JSON.parse(JSON.stringify(evalIn(ctx, 'OUTFIT.map(i => i.lockParams)')));
    expect(lp[0]).toMatchObject({ timer: 3600000, combo: '4321', relMember: 12 });
    expect(lp[1]).toMatchObject({ timer: 0, combo: '', relMember: 77 });   // Spiel-Import ohne lockParams: wie bisher
  });

  it('Bild-Aufnahme nutzt immer dein eigenes Aussehen, auch wenn ein anderer Spieler als Outfit-Ziel gewählt ist', () => {
    const { ctx } = boot();
    evalIn(ctx, `PROFILES['B'] = { name: 'B', items: [{ group: 'ItemArms', asset: 'TestRope', colors: ['#fff'], tr: {} }] }; _outfitTargetNum = 55;`);
    const code = evalIn(ctx, "_profilCodeOhneEingriff('B')");
    expect(code).toContain('const TARGET = Player;');
    expect(code).not.toContain('55');
    expect(evalIn(ctx, '_outfitTargetNum')).toBe(55);   // die Auswahl des Nutzers bleibt
  });
});

describe('Prüfbericht: Duplikate mit v2/v3', () => {
  function bootDup2() {
    const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: () => true });
    ctx.document.getElementById = () => makeElementStub();
    evalIn(ctx, `
      renderProfileList = function () {};
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      const it = (col, craft) => [{ group: 'Cloth', asset: 'Dress', colors: [col], craft: craft || null }];
      PROFILES['Kleid - Mia']       = { name: 'Kleid - Mia',       items: it('#ff0000') };
      PROFILES['Kleid - Miav2']     = { name: 'Kleid - Miav2',     items: it('#ff0000') };   // identisch → löschbar
      PROFILES['Kleid - Miav3']     = { name: 'Kleid - Miav3',     items: it('#0000ff') };   // andere Farbe → echte Variante, bleibt
      PROFILES['Kleid - Miav4']     = { name: 'Kleid - Miav4',     items: it('#ff0000', { Name: 'Besonders' }) };   // anderes Craft → bleibt
      PROFILES['Kleid - Ada (old)'] = { name: 'Kleid - Ada (old)', items: it('#00ff00') };   // vom Nutzer als (old) markiert → wie bisher löschbar
      PROFILE_ALT_OWNERS = new Set(); PROFILE_FAVS.clear(); PROFILE_TAGS = {};
    `);
    return ctx;
  }

  it('v2/v3 werden nur gelöscht, wenn der Inhalt (Farben, Craft …) wirklich gleich ist; "(old)" bleibt wie bisher löschbar', () => {
    const ctx = bootDup2();
    expect(evalIn(ctx, '_profileOldDuplikate().sort()')).toEqual(['Kleid - Ada (old)', 'Kleid - Miav2']);
  });
});

describe('Crafter anpassen: das Item läuft auf dich', () => {
  it('öffnet das Item mit der bisherigen Crafter-Nummer und dem Namen', () => {
    const { ctx, els } = boot();
    const it = seilItem(); it.craft.MemberName = 'Fremde';
    oeffnen(ctx, it);
    expect(els.craftMember.value).toBe(7);
    expect(els.craftMemberName.value).toBe('Fremde');
  });

  it('„Auf mich“ trägt deine Nummer und deinen Namen ein; „Übernehmen“ schreibt sie ins Profil, der Rest des Crafts bleibt', () => {
    const { ctx, els } = boot();
    const it = seilItem(); it.craft.MemberName = 'Fremde';
    oeffnen(ctx, it);
    evalIn(ctx, "_myMemberNumber = 999; _myMemberName = 'Ich';");
    els.craftName.value = 'Hübsch (neu)';
    ctx.craftCrafterAufMich();
    expect([els.craftMember.value, els.craftMemberName.value]).toEqual([999, 'Ich']);
    ctx.profilItemUebernehmen();
    const c = profilItem(ctx).craft;
    expect(c).toMatchObject({ Name: 'Hübsch (neu)', MemberNumber: 999, MemberName: 'Ich', Description: 'weich', Color: '#ff0000', Private: true });
  });

  it('nur die Nummer geändert, Name nicht angefasst: der alte Name des fremden Crafters wird nicht stehen gelassen', () => {
    const { ctx, els } = boot();
    const it = seilItem(); it.craft.MemberName = 'Fremde';
    oeffnen(ctx, it);
    els.craftMember.value = 555;
    els.craftMemberName.value = '';
    ctx.profilItemUebernehmen();
    const c = profilItem(ctx).craft;
    expect(c.MemberNumber).toBe(555);
    expect(c.MemberName).toBeUndefined();
  });

  it('ohne Auswahl bleibt der Crafter unverändert; ohne bekannte Nummer meldet „Auf mich“ den Grund', () => {
    const { ctx, meldungen } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    ctx.craftCrafterAufMich();
    expect(meldungen.some(m => m.includes('Mitgliedsnummer ist noch nicht bekannt'))).toBe(true);
    ctx.profilItemUebernehmen();
    expect(profilItem(ctx).craft).toEqual(vorher.craft);
  });

  it('der erzeugte Code setzt den gewählten Crafter statt Player.MemberNumber', () => {
    const { ctx, els } = boot();
    ctx.selectItem('ItemArms', 'TestRope');
    els.craftName.value = 'Mein Item';
    ctx.generate();
    expect(els.codeOut.value).toContain('MemberNumber: Player.MemberNumber');
    els.craftMember.value = 999; els.craftMemberName.value = 'Ich';
    ctx.generate();
    expect(els.codeOut.value).toContain('MemberNumber: 999, MemberName: "Ich"');
    expect(els.codeOut.value).not.toContain('MemberNumber: Player.MemberNumber');
  });
});
