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
      vibratingInfo: { baselineProps: { PunishStruggle: false, AccessMode: '' } },
    } };
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
    expect(evalIn(ctx, '_profilEditKontext')).toEqual({ name: 'P', idx: 0 });
  });
});

describe('Änderung ins Profil übernehmen', () => {
  it('ohne Änderung bleibt das Item unverändert (nichts geht verloren)', () => {
    const { ctx } = boot();
    const vorher = seilItem();
    oeffnen(ctx, vorher);
    ctx.profilItemUebernehmen();
    const nachher = profilItem(ctx);
    expect(nachher.property).toEqual(vorher.property);
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
