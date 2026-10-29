import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import LZString from 'lz-string';
import { loadScript, evalIn } from './helpers/loadScript.js';

// Viele Outfit-Codes enthalten keine Gesichtsgruppen (Eyes, Eyes2, Eyebrows, Mouth) oder Grundkörper. _buildApplyCode leert das Aussehen komplett und
// legt nur den Code an – das Gesicht blieb leer (Screenshots ohne Augen, Brauen, Mund). Jetzt bleiben die bisherigen Kerngruppen, wenn der Code
// sie nicht mitbringt (wie der Run-Knopf mit seinen Pflichtgruppen). Alles andere (Haare, Kleidung) kommt weiterhin nur aus dem Code.

const silent = { log() {}, info() {}, warn() {}, error() {} };

function spiel(vorher) {
  const asset = (g, n) => ({ Name: n, Group: { Name: g, AllowNone: !['ArmsLeft', 'HandsLeft'].includes(g) } });
  const g = {
    console: silent, LZString,
    Player: { MemberNumber: 100, Name: 'Ich', AssetFamily: 'Female3DCG', Ownership: null, Lovership: [],
      Appearance: vorher.map(([grp, name]) => ({ Asset: asset(grp, name), Property: {} })) },
    AssetGet: (f, grp, n) => asset(grp, n),
    InventoryGet: (C, grp) => C.Appearance.find((a) => a.Asset.Group.Name === grp) || null,
    CharacterRefresh() {}, InventoryExpressionTriggerApply() {}, localStorage: { getItem() { return null; } }, __BCK_popupRef: { postMessage() {} },
  };
  g.window = g;
  vm.createContext(g);
  return g;
}

const DEIN_AUSSEHEN = [
  ['BodyUpper', 'Small'], ['BodyLower', 'Small'], ['Head', 'Default'], ['Eyes', 'Eyes1'], ['Eyes2', 'Eyes1'], ['Eyebrows', 'Eyebrows1'], ['Mouth', 'Regular'],
  ['HairBack', 'HairBack1'], ['Cloth', 'Dress'], ['ArmsLeft', ''],
];
const codeVon = (items) => LZString.compressToBase64(JSON.stringify(items));
const namen = (g) => Object.fromEntries(g.Player.Appearance.filter((a) => a.Asset.Name).map((a) => [a.Asset.Group.Name, a.Asset.Name]));

describe('Anlegen behält Gesicht und Grundkörper, wenn der Outfit-Code sie nicht enthält', () => {
  const tool = loadScript(['items.js'], { LZString, console: silent });
  const lauf = (g, modus) => vm.runInContext('(function(){' + evalIn(tool, `_buildApplyCode(${JSON.stringify(g.__code)}, ${modus})`) + '})();', g);

  for (const modus of ["'bild'", 'true']) {
    it(`_buildApplyCode(${modus}): Code ohne Gesicht → dein Gesicht und Körper bleiben, Haare und Kleidung nicht`, () => {
      const g = spiel(DEIN_AUSSEHEN);
      g.__code = codeVon([{ Group: 'Suit', Name: 'LatexCatsuit' }, { Group: 'HairBack', Name: 'HairBack83' }]);
      lauf(g, modus);
      const n = namen(g);
      expect(n).toMatchObject({ Suit: 'LatexCatsuit', HairBack: 'HairBack83', Head: 'Default', Eyes: 'Eyes1', Eyes2: 'Eyes1', Eyebrows: 'Eyebrows1', Mouth: 'Regular', BodyUpper: 'Small', BodyLower: 'Small' });
      expect(n.Cloth).toBeUndefined();                          // Kleidung gehört nur dazu, wenn der Code sie enthält
      expect(g.Player.Appearance.some((a) => a.Asset.Group.Name === 'ArmsLeft')).toBe(true);   // Pflichtgruppe ohne Namen wie bisher
    });
  }

  it('Gruppen, die der Code mitbringt, ersetzen deine – ohne doppelte Einträge', () => {
    const g = spiel(DEIN_AUSSEHEN);
    g.__code = codeVon([{ Group: 'Eyes', Name: 'Eyes12' }, { Group: 'Mouth', Name: 'Grin' }]);
    lauf(g, "'bild'");
    const n = namen(g);
    expect(n.Eyes).toBe('Eyes12');
    expect(n.Mouth).toBe('Grin');
    expect(n.Eyebrows).toBe('Eyebrows1');                       // fehlte im Code → deine bleibt
    for (const grp of ['Eyes', 'Mouth', 'Eyebrows', 'Head']) expect(g.Player.Appearance.filter((a) => a.Asset.Group.Name === grp)).toHaveLength(1);
  });

  it('hattest du die Gruppe selbst nicht, wird auch nichts erfunden', () => {
    const g = spiel([['BodyUpper', 'Small'], ['ArmsLeft', '']]);
    g.__code = codeVon([{ Group: 'Suit', Name: 'LatexCatsuit' }]);
    lauf(g, "'bild'");
    expect(namen(g)).toEqual({ BodyUpper: 'Small', Suit: 'LatexCatsuit' });
  });

  it('eine Gruppe nur mit leerem Namen im alten Aussehen zählt nicht als Gesicht', () => {
    const g = spiel([['Eyes', ''], ['BodyUpper', 'Small']]);
    g.__code = codeVon([{ Group: 'Suit', Name: 'X' }]);
    lauf(g, "'bild'");
    expect(namen(g).Eyes).toBeUndefined();
  });
});

describe('Diagnose: kernFehlt', () => {
  const tool = loadScript(['items.js'], { LZString, console: silent });
  function diag(vorhanden) {
    const g = { JSON, Array, Object, Math, Date, Error, Player: { Appearance: vorhanden.map(([grp, n]) => ({ Asset: { Name: n, Group: { Name: grp } } })) } };
    g.window = g; vm.createContext(g);
    return vm.runInContext(evalIn(tool, '_SHOT_BILDER') + 'var _checksDone=0;' + evalIn(tool, '_shotDiagCode(null)') + ';_diag()', g);
  }
  it('nennt Kerngruppen (Gesicht, Körper), die zum Foto fehlen', () => {
    expect(diag([['BodyUpper', 'Small'], ['Eyes', 'Eyes1'], ['Cloth', 'Dress']]).kernFehlt).toEqual(['BodyLower', 'Head', 'Eyes2', 'Eyebrows', 'Mouth']);
  });
  it('leer, wenn alles da ist', () => {
    expect(diag(DEIN_AUSSEHEN).kernFehlt).toEqual([]);
  });
  it('das Protokoll zeigt fehlenden Kern deutlich', () => {
    tool.__d = { items: 3, offen: 0, gewartet: 80, checks: 0, kernFehlt: ['Eyes', 'Mouth'] };
    evalIn(tool, "_shotProtokollEintrag('LSCG', '#1', __d, { ok: true, grund: '' }, 1, 'gespeichert')");
    expect(evalIn(tool, '_shotProtokollText()')).toContain('KERN FEHLT: Eyes,Mouth');
  });
});
