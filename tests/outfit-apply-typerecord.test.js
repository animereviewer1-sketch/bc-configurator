import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import LZString from 'lz-string';
import { loadScript, evalIn } from './helpers/loadScript.js';

// BC R133 zeichnet Layer mit AllowTypes nur, wenn das Item Property.TypeRecord hat
// (CharacterAppearanceAllowForTypes gibt ohne TypeRecord false zurück). Direkt in
// Player.Appearance eingefügte Items haben keins → Teile der Figur (Suit, Beine, Hände, Haube …)
// fehlten sichtbar, obwohl alle Gruppen im Aussehen standen. BC/BCX setzen es beim Laden per
// ExtendedItemInit; Run-Knopf und _buildApplyCode müssen das ebenfalls tun.

const silent = { log() {}, info() {}, warn() {}, error() {} };
const ERWEITERT = new Set(['ShinyLegBinder', 'LatexBondageMitts', 'DroneMask', 'LatexCatsuit']);

function spiel({ mitInit = true } = {}) {
  const asset = (g, n) => ({ Name: n, Group: { Name: g, AllowNone: !['ArmsLeft', 'HandsLeft'].includes(g) }, Extended: ERWEITERT.has(n) });
  const g = {
    console: silent, LZString,
    Player: { MemberNumber: 100, Name: 'Ich', AssetFamily: 'Female3DCG', Ownership: null, Lovership: [],
      Appearance: [{ Asset: asset('ArmsLeft', ''), Property: {} }, { Asset: asset('HandsLeft', ''), Property: {} }] },
    AssetGet: (f, grp, n) => asset(grp, n),
    InventoryGet: (C, grp) => C.Appearance.find((a) => a.Asset.Group.Name === grp) || null,
    CharacterRefresh() {}, localStorage: { getItem() { return null; } }, __BCK_popupRef: { postMessage() {} },
    initAufrufe: [],
  };
  if (mitInit) {
    // wie BCs TypedItemInit: fehlendes TypeRecord wird auf den Standardtyp gesetzt
    g.ExtendedItemInit = (C, item, push, refresh) => {
      g.initAufrufe.push([item.Asset.Name, push, refresh]);
      if (!item.Property || typeof item.Property !== 'object') item.Property = {};
      if (!item.Property.TypeRecord) { item.Property.TypeRecord = { typed: 0 }; return true; }
      return false;
    };
  }
  g.window = g;
  vm.createContext(g);
  return g;
}

const OUTFIT = [
  { Group: 'Suit', Name: 'LatexCatsuit', Color: '#222' },
  { Group: 'ItemLegs', Name: 'ShinyLegBinder', Color: '#222' },
  { Group: 'ItemHands', Name: 'LatexBondageMitts' },
  { Group: 'ItemHood', Name: 'DroneMask' },
  { Group: 'Cloth', Name: 'Dress' },                       // nicht erweitert
];
const CODE = LZString.compressToBase64(JSON.stringify(OUTFIT));

// Was BC zeichnen würde: erweiterte Items ohne TypeRecord haben keine sichtbaren Layer
const unsichtbar = (g) => g.Player.Appearance.filter((a) => a.Asset.Extended && !a.Property?.TypeRecord).map((a) => a.Asset.Group.Name);

describe('Anlegen setzt TypeRecord über ExtendedItemInit', () => {
  const tool = loadScript(['items.js', 'outfit-import.js'], { LZString, console: silent });

  it('Run-Knopf (_oiBuildExecCode): kein erweitertes Item bleibt ohne TypeRecord', () => {
    const g = spiel();
    vm.runInContext(tool._oiBuildExecCode(CODE), g);
    expect(unsichtbar(g)).toEqual([]);
    expect(g.initAufrufe.map((x) => x[0]).sort()).toEqual(['DroneMask', 'LatexBondageMitts', 'LatexCatsuit', 'ShinyLegBinder']);
  });

  for (const modus of [true, "'bild'"]) {
    it(`_buildApplyCode(${modus}): kein erweitertes Item bleibt ohne TypeRecord`, () => {
      const g = spiel();
      vm.runInContext('(function(){' + evalIn(tool, `_buildApplyCode(${JSON.stringify(CODE)}, ${modus === true ? 'true' : "'bild'"})`) + '})();', g);
      expect(unsichtbar(g)).toEqual([]);
      expect(g.initAufrufe.length).toBe(4);
    });
  }

  it('Init läuft ohne Senden und ohne eigenen Refresh (push=false, refresh=false)', () => {
    const g = spiel();
    vm.runInContext(tool._oiBuildExecCode(CODE), g);
    expect(g.initAufrufe.every(([, push, refresh]) => push === false && refresh === false)).toBe(true);
  });

  it('ohne ExtendedItemInit im Spiel: kein Absturz, alle Gruppen werden trotzdem angelegt', () => {
    const g = spiel({ mitInit: false });
    vm.runInContext(tool._oiBuildExecCode(CODE), g);
    const gruppen = g.Player.Appearance.map((a) => a.Asset.Group.Name);
    for (const x of ['Suit', 'ItemLegs', 'ItemHands', 'ItemHood', 'Cloth']) expect(gruppen).toContain(x);
  });

  it('wirft ExtendedItemInit bei einem Item, werden die übrigen trotzdem initialisiert', () => {
    const g = spiel();
    const echt = g.ExtendedItemInit;
    g.ExtendedItemInit = (C, item, p, r) => { if (item.Asset.Name === 'DroneMask') throw new Error('Mod kaputt'); return echt(C, item, p, r); };
    vm.runInContext(tool._oiBuildExecCode(CODE), g);
    expect(unsichtbar(g)).toEqual(['ItemHood']);
  });
});
