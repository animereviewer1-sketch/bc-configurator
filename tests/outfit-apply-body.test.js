import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import LZString from 'lz-string';
import { loadScript } from './helpers/loadScript.js';
import { makeLoaderSandbox } from './helpers/loaderSandbox.js';

// Zwei Ursachen für "Figur zerschießt sich / Item-Dialog stürzt ab" nach dem Anlegen:
// 1. Der Run-Knopf (_oiBuildExecCode) hat BC-Pflichtgruppen (AllowNone:false, z. B.
//    ArmsLeft/HandsLeft) verworfen, wenn das Outfit sie nicht enthielt → BC blockiert
//    "Invalid removal", der Server setzt das Aussehen zurück.
// 2. Items ohne Property-Objekt: BCs DialogInventoryBuild klont CurItem.Property und wirft
//    ('"undefined" is not valid JSON'). Entsteht beim Anlegen ohne Property und durch AFC,
//    das nach dem Aufschließen item.Property = undefined setzt.

const silent = { log() {}, info() {}, warn() {}, error() {} };

function spiel(appearance) {
  const gruppe = (name, allowNone = true) => ({ Name: name, AllowNone: allowNone });
  const pflicht = new Set(['ArmsLeft', 'ArmsRight', 'HandsLeft', 'HandsRight']);
  const asset = (g, n) => ({ Name: n, Group: gruppe(g, !pflicht.has(g)) });
  const g = {
    console: silent, LZString,
    Player: { MemberNumber: 100, Name: 'Ich', AssetFamily: 'Female3DCG', Ownership: null, Lovership: [],
      Appearance: appearance.map(([grp, name, prop]) => ({ Asset: asset(grp, name), Property: prop })) },
    AssetGet: (f, grp, n) => asset(grp, n),
    InventoryGet: (C, grp) => C.Appearance.find((a) => a.Asset.Group.Name === grp) || null,
    CharacterRefresh() {}, localStorage: { getItem() { return null; } }, __BCK_popupRef: { postMessage() {} },
  };
  g.window = g;
  vm.createContext(g);
  return g;
}

describe('Run-Knopf (_oiBuildExecCode): Körper bleibt heil', () => {
  const tool = loadScript(['items.js', 'outfit-import.js'], { LZString, console: silent });
  const OUTFIT = [
    { Group: 'BodyUpper', Name: 'XLarge' },
    { Group: 'Cloth', Name: 'Dress' },                       // ohne Property
    { Group: 'ItemNeck', Name: 'Collar', Property: { Effect: [] } },
  ];

  it('fehlende Pflichtgruppen (ArmsLeft/ArmsRight/HandsLeft/HandsRight) und namenlose Teile bleiben erhalten', () => {
    const g = spiel([
      ['BodyUpper', 'Small', {}], ['ArmsLeft', '', {}], ['ArmsRight', '', {}], ['HandsLeft', '', {}], ['HandsRight', '', {}],
      ['Hat', 'Beret', {}],   // normales Kleidungsstück – darf vom Outfit ersetzt/entfernt werden
    ]);
    vm.runInContext(tool._oiBuildExecCode(LZString.compressToBase64(JSON.stringify(OUTFIT))), g);
    const gruppen = g.Player.Appearance.map((a) => a.Asset.Group.Name);
    for (const p of ['ArmsLeft', 'ArmsRight', 'HandsLeft', 'HandsRight']) expect(gruppen).toContain(p);
    expect(gruppen).not.toContain('Hat');
    expect(gruppen.filter((x) => x === 'BodyUpper')).toHaveLength(1);   // aus dem Outfit, nicht doppelt
    expect(g.Player.Appearance.find((a) => a.Asset.Group.Name === 'BodyUpper').Asset.Name).toBe('XLarge');
  });

  it('jedes angelegte Item hat ein Property-Objekt', () => {
    const g = spiel([['ArmsLeft', '', undefined]]);
    vm.runInContext(tool._oiBuildExecCode(LZString.compressToBase64(JSON.stringify(OUTFIT))), g);
    for (const a of g.Player.Appearance) expect(a.Property && typeof a.Property === 'object').toBe(true);
  });
});

describe('Loader: Property-Schutz gegen den AFC-Fehler', () => {
  function mitHooks() {
    const hooks = {};
    const bcModSdk = {
      registerMod: () => ({ hookFunction: (name, prio, fn) => { (hooks[name] ||= []).push({ prio, fn }); }, patchFunction() {}, removeHook() {} }),
      getModsInfo: () => [],
    };
    const sb = makeLoaderSandbox({ withBcModSdk: false, extraGlobals: { bcModSdk } });
    return { ...sb, hooks };
  }

  it('registriert Hooks auf DialogInventoryBuild und InventoryUnlock (Priorität über AFC)', () => {
    const { hooks } = mitHooks();
    expect(hooks.DialogInventoryBuild?.[0]?.prio).toBe(100);
    expect(hooks.InventoryUnlock?.[0]?.prio).toBe(100);
  });

  it('vor dem Item-Dialog: fehlende Property wird {} – sonst würde BC beim Klonen werfen', () => {
    const { hooks } = mitHooks();
    const C = { Appearance: [{ Asset: {}, Property: undefined }, { Asset: {}, Property: { Effect: ['Lock'] } }] };
    let gesehen = null;
    hooks.DialogInventoryBuild[0].fn([C], () => { gesehen = C.Appearance.map((i) => JSON.parse(JSON.stringify(i.Property))); });
    expect(gesehen).toEqual([{}, { Effect: ['Lock'] }]);
  });

  it('nach dem Aufschließen: repariert, was AFC beim Aufräumen gelöscht hat', () => {
    const { hooks } = mitHooks();
    const item = { Asset: {}, Property: { Effect: ['Lock'], LockedBy: 'HighSecurityPadlock' } };
    const C = { Appearance: [item] };
    // "next" = AFC + BC: Schloss weg, AFC setzt Property auf undefined
    hooks.InventoryUnlock[0].fn([C, item], () => { item.Property = undefined; return true; });
    expect(item.Property).toEqual({});
  });

  it('wird beim erneuten Ausführen des Bookmarklets nicht doppelt registriert', () => {
    const { ctx, hooks } = mitHooks();
    expect(ctx.__BCK_PROP_SCHUTZ__).toBe(true);
    expect(hooks.InventoryUnlock).toHaveLength(1);
  });
});
