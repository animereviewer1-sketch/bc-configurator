import { describe, it, expect, beforeEach } from 'vitest';
import LZString from 'lz-string';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Schloss-Filter im LSCG-Outfits-Tab: nur Spieler/Versionen mit DOGS-, Lover-
// (AFC), Owner- oder anderen Mod-Schlössern zeigen – zum Testen der
// Schloss-Regeln. Karten zeigen Schloss-Abzeichen mit Tooltip.

const code = (items) => LZString.compressToBase64(JSON.stringify(items));
const DOGS  = { LockedBy: 'ExclusivePadlock', Name: 'DeviousPadlock', LockMemberNumber: 555 };
const LOVER = { LockedBy: 'LoversPadlock', LockMemberNumber: 556 };

const DB = {
  '1': { name: 'Anna', versions: [
    { ts: 1, fingerprint: 'a1', code: code([{ Group: 'Cloth', Name: 'Dress' }]) },
    { ts: 2, fingerprint: 'a2', code: code([{ Group: 'ItemNeck', Name: 'Collar', Property: DOGS }, { Group: 'Cloth', Name: 'Dress' }]) },
  ] },
  '2': { name: 'Bea', versions: [
    { ts: 3, fingerprint: 'b1', code: code([{ Group: 'ItemPelvis', Name: 'Belt', Property: LOVER }]) },
    { ts: 4, fingerprint: 'b2', code: code([{ Group: 'ItemPelvis', Name: 'Belt', Property: { LockedBy: 'LoversTimerPadlock', LockMemberNumber: 9 } }]) },
  ] },
  '3': { name: 'Cleo', versions: [
    { ts: 5, fingerprint: 'c1', code: code([{ Group: 'ItemNeck', Name: 'Collar', Property: { LockedBy: 'OwnerPadlock', LockMemberNumber: 7 } }]) },
    { ts: 6, fingerprint: 'c2', code: code([{ Group: 'ItemNeck', Name: 'Collar', Property: { LockedBy: 'FamilyPadlock', LockMemberNumber: 7 } }]) },
  ] },
  '4': { name: 'Dora', versions: [
    { ts: 7, fingerprint: 'd1', code: code([{ Group: 'ItemArms', Name: 'Cuffs', Property: { LockedBy: 'LewdCrestPadlock' } }]) },
    // DOGS mit Lover-Unterbau ist DOGS, kein AFC-Lover-Schloss
    { ts: 8, fingerprint: 'd2', code: code([{ Group: 'ItemArms', Name: 'Cuffs', Property: { LockedBy: 'LoversPadlock', Name: 'DeviousPadlock' } }]) },
  ] },
  '5': { name: 'Emma', versions: [
    { ts: 9, fingerprint: 'e1', code: code([{ Group: 'ItemFeet', Name: 'Chain', Property: { LockedBy: 'MetalPadlock' } }]) },
  ] },
};

let c, els;
beforeEach(() => {
  els = {};
  c = loadScript(['items.js'], { LZString, setTimeout: (fn) => { fn(); return 0; }, clearTimeout: () => {} });
  c.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(c, `Object.keys(LSCG_DB).forEach(k => delete LSCG_DB[k]); Object.assign(LSCG_DB, ${JSON.stringify(DB)});`);
});

const html = () => els.outfitScanBody.innerHTML;
const spieler = () => ['1', '2', '3', '4', '5'].filter((mk) => html().includes('id="osm_' + mk + '"'));
const karten = () => (html().match(/class="os-card[" ]/g) || []).length;

describe('LSCG-Tab: Schloss-Filter', () => {
  it('ohne Filter: alle Spieler und Versionen', () => {
    evalIn(c, 'renderOutfitScanTab()');
    expect(spieler()).toEqual(['1', '2', '3', '4', '5']);
    expect(karten()).toBe(9);
  });

  it('DOGS: nur Versionen mit DOGS-Schloss (auch mit Lover-Unterbau)', () => {
    evalIn(c, "osSetLockFilter('dogs')");
    expect(spieler()).toEqual(['1', '4']);
    expect(karten()).toBe(2);
    expect(html()).toContain('1/2x');   // Anna: 1 von 2 Versionen
  });

  it('Lover (AFC): LoversPadlock und Lover-Timer – nicht Family, nicht DOGS mit Lover-Unterbau', () => {
    evalIn(c, "osSetLockFilter('lover')");
    expect(spieler()).toEqual(['2']);
    expect(karten()).toBe(2);
  });

  it('Owner, andere Mod-Schlösser, jede Art', () => {
    evalIn(c, "osSetLockFilter('owner')");
    expect(spieler()).toEqual(['3']);
    expect(karten()).toBe(1);
    evalIn(c, "osSetLockFilter('mod')");
    expect(spieler()).toEqual(['4']);
    expect(karten()).toBe(1);
    evalIn(c, "osSetLockFilter('schloss')");
    expect(karten()).toBe(8);   // alles außer Annas Version ohne Schloss
  });

  it('kein Treffer → Hinweis; Filter zurück → alles wieder da', () => {
    evalIn(c, "Object.keys(LSCG_DB).forEach(k => { if (k !== '5') delete LSCG_DB[k]; })");
    evalIn(c, "osSetLockFilter('dogs')");
    expect(html()).toContain('Keine Outfits mit diesem Schloss gefunden');
    evalIn(c, "osSetLockFilter('')");
    expect(spieler()).toEqual(['5']);
  });

  it('unbekannter Filterwert = kein Filter', () => {
    evalIn(c, "osSetLockFilter('quatsch')");
    expect(evalIn(c, '_osLockFilter')).toBe('');
    evalIn(c, 'renderOutfitScanTab()');
    expect(karten()).toBe(9);
  });
});

describe('LSCG-Tab: Schloss-Abzeichen und Item-Anzahl', () => {
  it('Karte zeigt Abzeichen und Tooltip mit Gruppe, Schloss und Setzer', () => {
    evalIn(c, "osSetLockFilter('dogs')");
    expect(html()).toContain('class="os-card-locks" title="ItemNeck: DeviousPadlock (#555)">😈</span>');
    expect(html()).toContain('2 Items');   // Anzahl stimmt weiter
  });

  it('Lover- und Owner-Abzeichen', () => {
    evalIn(c, "osSetLockFilter('schloss')");
    expect(html()).toContain('title="ItemPelvis: LoversPadlock (#556)">💕');
    expect(html()).toContain('title="ItemNeck: OwnerPadlock (#7)">👑');
  });

  it('fremde Schloss-Namen werden escaped', () => {
    evalIn(c, `LSCG_DB['9'] = { name: 'X', versions: [{ ts: 1, fingerprint: 'x1', code: ${JSON.stringify(code([{ Group: 'ItemArms', Name: 'Cuffs', Property: { LockedBy: '"><img src=x onerror=alert(1)>Padlock' } }]))} }] };`);
    evalIn(c, "osSetLockFilter('mod')");
    expect(html()).not.toContain('<img');
    expect(html()).toContain('&quot;&gt;&lt;img');
  });

  it('Info-Cache liest einen reparierten Code neu', () => {
    const vorher = evalIn(c, "_osDecodeInfo(LSCG_DB['5'].versions[0].code, 'e1').locks.length");
    expect(vorher).toBe(1);
    evalIn(c, `LSCG_DB['5'].versions[0].code = ${JSON.stringify(code([{ Group: 'ItemFeet', Name: 'Chain' }, { Group: 'Cloth', Name: 'Dress' }]))}`);
    expect(evalIn(c, "_osDecodeInfo(LSCG_DB['5'].versions[0].code, 'e1').locks.length")).toBe(0);
    expect(evalIn(c, "_osItemCount(LSCG_DB['5'].versions[0].code, 'e1')")).toBe(2);
  });

  it('Filtern verändert keine gespeicherten Codes', () => {
    const vorher = evalIn(c, 'JSON.stringify(LSCG_DB)');
    evalIn(c, "osSetLockFilter('dogs'); osSetLockFilter('lover'); osSetLockFilter('')");
    expect(evalIn(c, 'JSON.stringify(LSCG_DB)')).toBe(vorher);
  });
});
