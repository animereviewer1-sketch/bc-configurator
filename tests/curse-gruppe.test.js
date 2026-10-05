import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';
import { makeLoaderSandbox } from './helpers/loaderSandbox.js';

// Craft & Curse: "UNBEKANNT" als Gruppe. Früher blieb ein einmal nicht gefundener Name für die ganze Sitzung unbekannt, und das
// Item ließ sich nicht anziehen. Jetzt: erneuter Versuch, Gruppe vom getragenen Item, und im Tool Nachschlagen im Item-Cache.

describe('Scanner im Spiel (loader.js)', () => {
  function scanner() {
    const sb = makeLoaderSandbox({ withBcModSdk: false, withModGlobals: false });
    const jetzt = { t: 1_000_000 };
    const RealDate = Date;
    sb.ctx.Date = Object.assign(function (...a) { return new RealDate(...(a.length ? a : [jetzt.t])); }, RealDate, { now: () => jetzt.t });
    return { ...sb, jetzt };
  }
  const raum = (appearance = []) => [{
    MemberNumber: 5, Name: 'Mia', Nickname: 'Mia',
    Crafting: [{ Item: '自定义贴图', Name: 'Deko', Description: '', Color: '#fff', Property: 'Normal', Private: false }],
    Appearance: appearance,
  }];
  const eintrag = (sb) => sb.ctx.CurseScanner.scan().database['5:自定义贴图:Deko'];

  it('BC kennt den Namen nicht, die Besitzerin trägt das Item aber: Gruppe vom getragenen Item', () => {
    const sb = scanner();
    sb.ctx.ChatRoomCharacter = raum([{ Asset: { Name: '自定义贴图', Group: { Name: 'Decals' } }, Craft: { Name: 'Deko' } }]);
    expect(eintrag(sb).Gruppe).toBe('Decals');
  });

  it('weder bekannt noch getragen: UNBEKANNT – aber ein späterer Scan versucht es erneut (nach 20 s), statt es für immer zu merken', () => {
    const sb = scanner();
    sb.ctx.ChatRoomCharacter = raum([]);
    expect(eintrag(sb).Gruppe).toBe('UNBEKANNT');
    // BC (oder ein Mod) bringt das Asset nachträglich mit
    sb.ctx.Asset.push({ Name: '自定义贴图', Group: { Name: 'ClothAccessory' } });
    expect(eintrag(sb).Gruppe).toBe('UNBEKANNT');   // innerhalb von 20 s wird nicht neu gesucht (kein Dauerlauf über alle Assets)
    sb.jetzt.t += 21000;
    expect(eintrag(sb).Gruppe).toBe('ClothAccessory');
  });

  it('wear() schlägt eine unbekannte Gruppe noch einmal nach, bevor es aufgibt', () => {
    const sb = scanner();
    sb.ctx.ChatRoomCharacter = raum([]);
    const db = sb.ctx.CurseScanner.scan().database;
    expect(db['5:自定义贴图:Deko'].Gruppe).toBe('UNBEKANNT');
    sb.ctx.Asset.push({ Name: '自定义贴图', Group: { Name: 'ClothAccessory' } });
    sb.jetzt.t += 21000;
    const wear = [];
    sb.ctx.InventoryWear = (...a) => { wear.push(a); return {}; };
    sb.ctx.CharacterRefresh = () => {}; sb.ctx.ChatRoomCharacterUpdate = () => {};
    const r = sb.ctx.CurseScanner.wear('5:自定义贴图:Deko');
    expect(r.err).toBeUndefined();
    expect(wear[0][2]).toBe('ClothAccessory');
  });

  it('bleibt es unbekannt, meldet wear() das weiterhin klar', () => {
    const sb = scanner();
    sb.ctx.ChatRoomCharacter = raum([]);
    sb.ctx.CurseScanner.scan();
    expect(sb.ctx.CurseScanner.wear('5:自定义贴图:Deko').err).toMatch(/Gruppe unbekannt/);
  });
});

describe('Tool: Gruppe nachschlagen', () => {
  function boot() {
    const opener = { closed: false, postMessage: vi.fn() };
    const els = {};
    const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
    ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
    dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: opener });
    opener.postMessage.mockClear();
    evalIn(ctx, `
      Object.keys(CURSE_GRUPPE_OVERRIDES).forEach(k => delete CURSE_GRUPPE_OVERRIDES[k]);
      CACHE = { ClothAccessory: { '自定义贴图': { Name: 'x' }, Glasses1: {} }, Hat: { Hat1: {} } };
      _preCurseSnapshotCode = 'aktiv';   // kein Sichern des Outfits vorweg
    `);
    return { ctx, opener };
  }
  const eintrag = (extra = {}) => ({ ItemName: '自定义贴图', CraftName: 'Deko', Gruppe: 'UNBEKANNT', Besitzer: { Nummer: 5, Name: 'Mia' }, Farbe: '#fff', ...extra });
  const wirksam = (ctx, e) => { ctx.__e = e; return evalIn(ctx, "_getEffectiveGruppe(__e, '5:自定义贴图:Deko')"); };

  it('Reihenfolge: von Hand gesetzt > erkannt > Item-Cache > UNBEKANNT', () => {
    const { ctx } = boot();
    expect(wirksam(ctx, eintrag())).toBe('ClothAccessory');                                  // aus dem Cache
    expect(wirksam(ctx, eintrag({ Gruppe: 'Decals' }))).toBe('Decals');                      // erkannt
    evalIn(ctx, "CURSE_GRUPPE_OVERRIDES['5:自定义贴图:Deko'] = 'Hat'");
    expect(wirksam(ctx, eintrag({ Gruppe: 'Decals' }))).toBe('Hat');                         // von Hand
    evalIn(ctx, "delete CURSE_GRUPPE_OVERRIDES['5:自定义贴图:Deko']; CACHE = {};");
    expect(wirksam(ctx, eintrag())).toBe('UNBEKANNT');                                       // nirgends bekannt
    expect(wirksam(ctx, eintrag({ Gruppe: undefined }))).toBe('UNBEKANNT');
  });

  it('der Cache-Index folgt einem neuen Cache', () => {
    const { ctx } = boot();
    expect(wirksam(ctx, eintrag())).toBe('ClothAccessory');
    evalIn(ctx, "CACHE = { Mask: { '自定义贴图': {} } }");
    expect(wirksam(ctx, eintrag())).toBe('Mask');
  });

  it('Anziehen: die aufgelöste Gruppe geht ans Spiel (statt "UNBEKANNT")', () => {
    const { ctx, opener } = boot();
    evalIn(ctx, "CURSE_DB['5:自定义贴图:Deko'] = " + JSON.stringify(eintrag()));
    ctx.wearCurse('5:自定义贴图:Deko', null);
    const msg = opener.postMessage.mock.calls.map((c) => c[0]).find((m) => m.type === 'WEAR_CURSE');
    expect(msg.entry.Gruppe).toBe('ClothAccessory');
    expect(msg.dbKey).toBe('5:自定义贴图:Deko');
  });

  it('als Profil gespeichert: das Item bekommt die aufgelöste Gruppe', () => {
    const { ctx } = boot();
    ctx.__e = eintrag();
    expect(evalIn(ctx, '_curseEntryToProfileItem(__e).group')).toBe('ClothAccessory');
  });
});
