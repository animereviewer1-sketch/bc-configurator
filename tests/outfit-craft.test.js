import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Profil ausführen (▶ in Outfit & Profile): das Craft eines Items (Name, Beschreibung, Eigenschaft …) muss im Spiel ankommen.
// Früher zog der Outfit-Code jedes Item ohne Craft an – das Item war da, aber ohne Namen und Beschreibung.

const silent = { log() {}, info() {}, warn() {}, error() {} };

function spiel() {
  const g = {
    console: silent, atob, setTimeout: () => 0,
    Player: { MemberNumber: 100, Appearance: [] },
    InventoryWear(C, name, grp, col) {
      const it = { Asset: { Name: name, Group: { Name: grp, AllowNone: true } }, Color: col };
      C.Appearance = C.Appearance.filter((a) => a.Asset.Group.Name !== grp);
      C.Appearance.push(it);
      return it;
    },
    InventoryGet: (C, grp) => C.Appearance.find((a) => a.Asset.Group.Name === grp) || null,
    CharacterRefresh() {}, ServerPlayerAppearanceSync() {}, ChatRoomCharacterUpdate() {}, ExtendedItemInit() {},
  };
  g.window = g;
  vm.createContext(g);
  return g;
}

function boot() {
  const els = {};
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: () => true });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(ctx, `
    CACHE['ItemNeck'] = { HighCollar: { colorCount: 1, defaultColors: ['Default'], typeKeys: {}, props: [] } };
    CACHE['ItemMouth'] = { Regular: { colorCount: 1, defaultColors: ['Default'], typeKeys: {}, props: [] } };
    Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
  `);
  return { ctx };
}

const CRAFT = { Name: "Hellhound's Lash", Description: 'Weich "gepolstert" – für Ärger', Property: 'Large', Color: '#aa0000', Lock: '', Item: 'HighCollar', MemberNumber: 7, Private: false };

describe('Profil ausführen: Craft kommt im Spiel an', () => {
  it('Name, Beschreibung und Eigenschaft des Crafts stehen am angezogenen Item (auch mit Sonderzeichen)', () => {
    const { ctx } = boot();
    evalIn(ctx, `PROFILES['P'] = { name: 'P', items: [
      { group: 'ItemNeck', asset: 'HighCollar', colors: ['#ffffff'], tr: {}, craft: ${JSON.stringify(CRAFT)} },
      { group: 'ItemMouth', asset: 'Regular', colors: ['Default'], tr: {} },
    ] };`);
    ctx.loadProfile('P');
    const code = evalIn(ctx, '_outfitCodeBauen({})');
    const g = spiel();
    vm.runInContext(code, g);
    const hals = g.Player.Appearance.find((a) => a.Asset.Group.Name === 'ItemNeck');
    expect(hals.Craft).toEqual(CRAFT);
    const mund = g.Player.Appearance.find((a) => a.Asset.Group.Name === 'ItemMouth');
    expect(mund.Craft).toBeUndefined();   // Items ohne Craft bleiben ohne
  });

  it('fehlt dem Craft die Hersteller-Nummer, wird bei dir selbst deine eingetragen; eine vorhandene bleibt', () => {
    const { ctx } = boot();
    const ohne = { ...CRAFT }; delete ohne.MemberNumber;
    evalIn(ctx, `PROFILES['P'] = { name: 'P', items: [{ group: 'ItemNeck', asset: 'HighCollar', colors: ['#fff'], tr: {}, craft: ${JSON.stringify(ohne)} }] };`);
    ctx.loadProfile('P');
    const g = spiel();
    vm.runInContext(evalIn(ctx, '_outfitCodeBauen({})'), g);
    expect(g.Player.Appearance[0].Craft.MemberNumber).toBe(100);
  });

  it('auch bei Screenshot-Durchläufen (ohne Schlösser) und für andere Spieler als Ziel bleibt das Craft', () => {
    const { ctx } = boot();
    evalIn(ctx, `PROFILES['P'] = { name: 'P', items: [{ group: 'ItemNeck', asset: 'HighCollar', colors: ['#fff'], tr: {}, craft: ${JSON.stringify(CRAFT)}, lock: 'MetalPadlock' }] };`);
    ctx.loadProfile('P');
    const g = spiel();
    vm.runInContext(evalIn(ctx, '_outfitCodeBauen({ ohneSchloesser: true })'), g);
    expect(g.Player.Appearance[0].Craft).toEqual(CRAFT);
  });

  it('ein Craft ohne Namen wird nicht angewendet (kein leeres Craft-Objekt am Item)', () => {
    const { ctx } = boot();
    evalIn(ctx, `PROFILES['P'] = { name: 'P', items: [{ group: 'ItemNeck', asset: 'HighCollar', colors: ['#fff'], tr: {}, craft: { Name: '', Property: 'Normal' } }] };`);
    ctx.loadProfile('P');
    const g = spiel();
    vm.runInContext(evalIn(ctx, '_outfitCodeBauen({})'), g);
    expect(g.Player.Appearance[0].Craft).toBeUndefined();
  });
});
