import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import vm from 'node:vm';
import LZString from 'lz-string';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Kopierte Outfits (LSCG-Scan, MBS-Wheel, Import) tragen die Schlösser des
// ursprünglichen Trägers mit. Beim Anlegen werden fremde Schlösser entfernt;
// es bleiben nur Schlösser der eigenen Owner/Lover und solche, die man an
// genau diesem Item schon trägt. Gespeicherte Daten bleiben unverändert.

const BC = 'https://bc.test';
const APP = 'BCKonfigurator';
const ME = 100, OWNER = 111, LOVER = 222, FREMD = 555;

const LOVER_LOCK = (by) => ({
  LockedBy: 'LoversPadlock', LockMemberNumber: by, Effect: ['Lock', 'Chaste'],
  TypeRecord: { typed: 1 }, RemoveTimer: 123,
});

function silent() { return { log() {}, info() {}, warn() {}, error() {}, debug() {} }; }

// Spiel-Tab-Attrappe: genug BC, damit der generierte Code durchläuft
function makeGame({ worn = [], ownership = null, lovership = [] } = {}) {
  const posts = [];
  const asset = (g, n) => ({ Name: n, Group: { Name: g } });
  const game = {
    console: silent(),
    LZString,
    Player: {
      MemberNumber: ME, Name: 'Ich', AssetFamily: 'Female3DCG', Ownership: ownership, Lovership: lovership,
      Appearance: worn.map((w) => ({ Asset: asset(w.Group, w.Name), Property: w.Property })),
    },
    AssetGet: (fam, g, n) => asset(g, n),
    InventoryGet: (C, g) => C.Appearance.find((a) => a.Asset.Group.Name === g) || null,
    CharacterRefresh() {},
    localStorage: { getItem() { return null; }, setItem() {} },
    __BCK_popupRef: { postMessage: (m, o) => posts.push({ m, o }) },
  };
  game.window = game;
  vm.createContext(game);
  return { game, posts, plain: (v) => JSON.parse(JSON.stringify(v)) };
}

let ctx;
beforeAll(() => {
  ctx = loadScript(['items.js', 'outfit-import.js'], { LZString });
});

function fixIn(g, melden = true) {
  vm.runInContext(evalIn(ctx, `_lockFilterPrelude(${melden})`) + ';this.__fix=__bcuLockFix;', g.game);
  return g.game.__fix;
}

describe('Schloss-Filter: Regeln', () => {
  it('fremdes Lover-Schloss wird entfernt, das Item behält seine übrigen Eigenschaften', () => {
    const g = makeGame();
    const p = LOVER_LOCK(FREMD);
    const out = g.plain(fixIn(g)('ItemPelvis', 'PolishedChastityBelt', p));
    expect(out.LockedBy).toBeUndefined();
    expect(out.LockMemberNumber).toBeUndefined();
    expect(out.RemoveTimer).toBeUndefined();
    expect(out.Effect).toEqual(['Chaste']);
    expect(out.TypeRecord).toEqual({ typed: 1 });
    // Eingabe (= gespeicherte Daten) bleibt unangetastet
    expect(p.LockedBy).toBe('LoversPadlock');
    expect(p.Effect).toEqual(['Lock', 'Chaste']);
  });

  it('meldet das entfernte Schloss ans Tool (an den Tool-Origin)', () => {
    const g = makeGame();
    fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD));
    expect(g.posts).toHaveLength(1);
    expect(g.plain(g.posts[0].m)).toEqual({ app: APP, type: 'LOCK_STRIPPED', group: 'ItemPelvis', lock: 'LoversPadlock', by: FREMD, aktion: 'weg', info: null });
    expect(g.posts[0].o).toBe(evalIn(ctx, 'TOOL_ORIGIN'));
  });

  it('melden=false (lokale Screenshots) → keine Meldung', () => {
    const g = makeGame();
    fixIn(g, false)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD));
    expect(g.posts).toHaveLength(0);
  });

  it('Schloss der eigenen Owner bleibt', () => {
    const g = makeGame({ ownership: { MemberNumber: OWNER } });
    const p = LOVER_LOCK(OWNER);
    expect(fixIn(g)('ItemPelvis', 'Belt', p)).toBe(p);
  });

  it('Schloss eines eigenen Lovers bleibt', () => {
    const g = makeGame({ lovership: [{ MemberNumber: 999 }, { MemberNumber: LOVER }] });
    const p = LOVER_LOCK(LOVER);
    expect(fixIn(g)('ItemPelvis', 'Belt', p)).toBe(p);
  });

  it('selbst gesetztes Lover-Schloss wird entfernt (der Träger kann es nicht öffnen)', () => {
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(ME)));
    expect(out.LockedBy).toBeUndefined();
  });

  it('genau dieses Schloss an genau diesem Item schon getragen → bleibt (Ursprung/Standard-Outfit)', () => {
    const g = makeGame({ worn: [{ Group: 'ItemPelvis', Name: 'Belt', Property: LOVER_LOCK(FREMD) }] });
    const p = LOVER_LOCK(FREMD);
    expect(fixIn(g)('ItemPelvis', 'Belt', p)).toBe(p);
  });

  it('gleiches Schloss, aber anderes Item getragen → entfernt', () => {
    const g = makeGame({ worn: [{ Group: 'ItemPelvis', Name: 'AnderesItem', Property: LOVER_LOCK(FREMD) }] });
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out.LockedBy).toBeUndefined();
  });

  it('ohne Schloss → Property unverändert (gleiches Objekt)', () => {
    const g = makeGame();
    const p = { TypeRecord: { a: 1 } };
    expect(fixIn(g)('ItemArms', 'Rope', p)).toBe(p);
  });

  it('nutzt BCs ValidationDeleteLock, falls vorhanden', () => {
    const g = makeGame();
    g.game.ValidationDeleteLock = vi.fn((prop) => { delete prop.LockedBy; });
    fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD));
    expect(g.game.ValidationDeleteLock).toHaveBeenCalledTimes(1);
  });

  it('alle Schloss-Arten auf "Übernehmen" → Filter ist ein Durchreicher, Regeln werden gespeichert', () => {
    const c = loadScript(['items.js'], {});
    evalIn(c, "lockRuleSetAll('behalten')");
    expect(JSON.parse(c.localStorage.getItem('BC_LOCK_RULES_v1')).lover).toBe('behalten');
    expect(evalIn(c, '_lockFilterPrelude(true)')).toBe('var __bcuLockFix=function(g,n,p){return p;};');
  });

  it('alter Schalter "Übernehmen" (BC_LOCK_FILTER_v1 = 0) wird übernommen', () => {
    const store = new Map([['BC_LOCK_FILTER_v1', '0']]);
    const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const c = loadScript(['items.js'], { localStorage });
    expect(evalIn(c, '_lockRules.owner')).toBe('behalten');
    expect(evalIn(c, '_lockRules.mod')).toBe('behalten');
  });
});

describe('Schloss-Regeln je Schloss-Art (Entfernen / Übernehmen / Mir gehört)', () => {
  afterEach(() => { evalIn(ctx, "lockRuleSetAll('weg')"); });

  // Je Fall: nur die erwartete Art steht auf "Übernehmen" – bleibt das Schloss, stimmt die Zuordnung
  const FAELLE = [
    ['OwnerPadlock', {}, 'owner'],
    ['OwnerTimerPadlock', {}, 'owner'],
    ['LoversPadlock', {}, 'lover'],
    ['LoversTimerPadlock', {}, 'lover'],
    ['FamilyPadlock', {}, 'lover'],
    ['ExclusivePadlock', {}, 'exklusiv'],
    ['MetalPadlock', {}, 'schluessel'],
    ['HighSecurityPadlock', {}, 'schluessel'],
    ['IntricatePadlock', {}, 'schluessel'],
    ['TimerPadlock', {}, 'timer'],
    ['MistressTimerPadlock', {}, 'timer'],
    ['TimerPasswordPadlock', {}, 'timer'],
    ['SafewordPadlock', {}, 'code'],
    ['PasswordPadlock', {}, 'code'],
    ['CombinationPadlock', {}, 'code'],
    ['ExclusivePadlock', { Name: 'DeviousPadlock' }, 'mod'],   // DOGS tarnt sich als Exklusiv
    ['LewdCrestPadlock', {}, 'mod'],
    ['淫纹锁LuziPadlock', {}, 'mod'],
    ['Best Friend Padlock', {}, 'mod'],
    ['IrgendeinNeuesModPadlock', {}, 'mod'],
  ];

  it.each(FAELLE)('%s %j → Art "%s"', (lockedBy, extra, art) => {
    evalIn(ctx, `lockRuleSetAll('weg'); lockRuleSet(${JSON.stringify(art)}, 'behalten')`);
    const g = makeGame();
    const p = { LockedBy: lockedBy, LockMemberNumber: FREMD, Effect: ['Lock'], ...extra };
    expect(fixIn(g)('ItemPelvis', 'Belt', p)).toBe(p);
    // Gegenprobe: Art auf "Entfernen" → Schloss weg
    evalIn(ctx, `lockRuleSet(${JSON.stringify(art)}, 'weg')`);
    const g2 = makeGame();
    expect(g2.plain(fixIn(g2)('ItemPelvis', 'Belt', { ...p })).LockedBy).toBeUndefined();
  });

  it('"Mir gehört": fremdes Lover-Schloss wird dein High-Security-Schloss', () => {
    evalIn(ctx, "lockRuleSet('lover', 'meins')");
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(out.LockMemberNumber).toBe(ME);
    expect(out.LockMemberName).toBe('Ich');
    expect(out.MemberNumberListKeys).toBe(String(ME));
    expect(out.RemoveTimer).toBeUndefined();
    expect(out.Effect).toEqual(['Chaste', 'Lock']);
    expect(out.TypeRecord).toEqual({ typed: 1 });
    expect(g.posts[0].m.aktion).toBe('meins');
  });

  it('"Mir gehört" bei DOGS-Devious ohne DOGS-Mod: Mod-Kennung wird entfernt', () => {
    evalIn(ctx, "lockRuleSet('mod', 'meins')");
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemNeck', 'Collar', { LockedBy: 'ExclusivePadlock', Name: 'DeviousPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] }));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(out.Name).toBeUndefined();
    expect(out.MemberNumberListKeys).toBe(String(ME));
  });

  it('"Mir gehört", aber das Item erlaubt kein High-Security-Schloss → entfernen', () => {
    evalIn(ctx, "lockRuleSet('lover', 'meins')");
    const g = makeGame();
    g.game.AssetGet = (fam, grp, n) => ({ Name: n, Group: { Name: grp }, AllowLockType: ['MetalPadlock'] });
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out.LockedBy).toBeUndefined();
    expect(out.Effect).toEqual(['Chaste']);
    expect(g.posts[0].m.aktion).toBe('weg');
  });

  it('Schutzregeln gelten auch bei "Mir gehört": Owner-Schloss der eigenen Owner bleibt original', () => {
    evalIn(ctx, "lockRuleSetAll('meins')");
    const g = makeGame({ ownership: { MemberNumber: OWNER } });
    const p = { LockedBy: 'OwnerPadlock', LockMemberNumber: OWNER, Effect: ['Lock'] };
    expect(fixIn(g)('ItemNeck', 'Collar', p)).toBe(p);
  });

  it('ohne Effect-Feld wird beim Entfernen kein leeres Effect angelegt', () => {
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', { LockedBy: 'MetalPadlock', LockMemberNumber: FREMD }));
    expect('Effect' in out).toBe(false);
  });
});

describe('Schloss-Filter in allen Anlege-Wegen (durchgängig im Spiel-Tab-Nachbau)', () => {
  const OUTFIT = [
    { Group: 'ItemPelvis', Name: 'PolishedChastityBelt', Color: 'Default', Property: LOVER_LOCK(FREMD) },
    { Group: 'Cloth', Name: 'Dress', Color: '#ff0000' },
  ];
  const CODE = LZString.compressToBase64(JSON.stringify(OUTFIT));
  const pelvis = (g) => g.plain(g.game.Player.Appearance.find((a) => a.Asset.Group.Name === 'ItemPelvis'));

  it('LSCG-Outfit "Anlegen" / Import / Profil (_oiBuildExecCode)', () => {
    const g = makeGame();
    vm.runInContext(ctx._oiBuildExecCode(CODE), g.game);
    const it = pelvis(g);
    expect(it.Asset.Name).toBe('PolishedChastityBelt');   // Item ist an …
    expect(it.Property.LockedBy).toBeUndefined();          // … aber ohne fremdes Schloss
    expect(g.posts.map((p) => p.m.type)).toEqual(['LOCK_STRIPPED']);
  });

  it('Standard-Outfit / Ursprung (_buildApplyCode über _applyBundleWithSync)', () => {
    const g = makeGame();
    g.game.setTimeout = () => 0;
    vm.runInContext(evalIn(ctx, `_applyBundleWithSync(${JSON.stringify(CODE)})`), g.game);
    expect(pelvis(g).Property.LockedBy).toBeUndefined();
    expect(g.posts).toHaveLength(1);
  });

  it('Screenshot-Pfad (_buildApplyCode ohne melden) filtert still', () => {
    const g = makeGame();
    vm.runInContext('(function(){' + evalIn(ctx, `_buildApplyCode(${JSON.stringify(CODE)})`) + '})();', g.game);
    expect(pelvis(g).Property.LockedBy).toBeUndefined();
    expect(g.posts).toHaveLength(0);
  });

  it('MBS-Wheel-Outfit (_mbsBuildApplyCode)', () => {
    const g = makeGame();
    const worn = [];
    g.game.InventoryWear = (C, name, group, colors, diff, mn, prop) => worn.push({ group, prop: g.plain(prop) });
    g.game.setTimeout = () => 0;
    const items = [{ group: 'ItemPelvis', asset: 'Belt', colors: 'Default', property: LOVER_LOCK(FREMD) }];
    vm.runInContext(evalIn(ctx, `_mbsBuildApplyCode(${JSON.stringify(items)})`), g.game);
    expect(worn).toHaveLength(1);
    expect(worn[0].prop.LockedBy).toBeUndefined();
    expect(g.posts).toHaveLength(1);
  });
});

describe('Tool-Meldung LOCK_STRIPPED', () => {
  it('sammelt die Schlösser eines Outfits in einer Statuszeile', () => {
    const opener = { closed: false, postMessage: vi.fn() };
    const els = {};
    const c = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
    c.document.getElementById = (id) => (els[id] ||= makeElementStub());
    const send = (data) => dispatchMessage(c, { app: APP, ...data }, { origin: BC, source: opener });
    send({ type: 'PONG' });
    send({ type: 'LOCK_STRIPPED', group: 'ItemPelvis', lock: 'LoversPadlock', by: FREMD });
    expect(els.statusMsg.textContent).toBe('🔓 Fremdes Schloss: LoversPadlock an ItemPelvis (von #555) entfernt');
    send({ type: 'LOCK_STRIPPED', group: 'ItemNeck', lock: 'OwnerPadlock', by: 777, aktion: 'meins' });
    expect(els.statusMsg.textContent).toContain('2 fremde Schlösser');
    expect(els.statusMsg.textContent).toContain('OwnerPadlock an ItemNeck (von #777) → dein High-Security');
  });
});

describe('Mod-Schlösser einzeln', () => {
  function frisch() {
    const opener = { closed: false, postMessage: vi.fn() };
    const els = {};
    const c = loadScript(['items.js'], { opener, LZString, setTimeout: () => 0, clearTimeout: () => {} });
    c.document.getElementById = (id) => (els[id] ||= makeElementStub());
    const send = (data) => dispatchMessage(c, { app: APP, ...data }, { origin: BC, source: opener });
    send({ type: 'PONG' });
    const fix = (g, melden = true) => {
      vm.runInContext(evalIn(c, `_lockFilterPrelude(${melden})`) + ';this.__fix=__bcuLockFix;', g.game);
      return g.game.__fix;
    };
    return { c, els, send, fix };
  }
  const DEVIOUS = () => ({ LockedBy: 'ExclusivePadlock', Name: 'DeviousPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] });
  const HEART   = () => ({ LockedBy: 'HeartPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] });
  const NEU     = () => ({ LockedBy: 'XyzNeuPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] });

  it('jede bekannte Mod-Art hat ihre eigene Regel, der Rest folgt "alle anderen"', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('mod:DeviousPadlock','meins'); lockRuleSet('mod:AFCHeart','behalten'); lockRuleSet('mod','weg')");
    const g = makeGame();
    const f = t.fix(g);
    expect(g.plain(f('ItemNeck', 'Collar', DEVIOUS())).LockedBy).toBe('HighSecurityPadlock');
    const heart = HEART();
    expect(f('ItemArms', 'Cuffs', heart)).toBe(heart);
    expect(g.plain(f('ItemPelvis', 'Belt', NEU())).LockedBy).toBeUndefined();
  });

  it('alte und neue Namen eines Schlosses teilen sich eine Regel (Lewd Crest / Luzi)', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('mod:LewdCrest','behalten')");
    const g = makeGame();
    const f = t.fix(g);
    for (const lb of ['LewdCrestPadlock', '淫纹锁LuziPadlock', 'LuziPadlock']) {
      const p = { LockedBy: lb, LockMemberNumber: FREMD };
      expect(f('ItemPelvis', 'Belt', p)).toBe(p);
    }
  });

  it('"Alle: …" setzt auch die einzelnen Mod-Regeln zurück', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('mod:DeviousPadlock','meins'); lockRuleSetAll('behalten')");
    expect(evalIn(t.c, "_lockRules['mod:DeviousPadlock']")).toBeUndefined();
    expect(evalIn(t.c, '_lockFilterPrelude(true)')).toBe('var __bcuLockFix=function(g,n,p){return p;};');
  });

  it('unbekanntes Mod-Schloss: Spiel-Tab meldet es einmal (auch bei Screenshots), Tool legt eine Zeile an', () => {
    const t = frisch();
    const g = makeGame();
    const f = t.fix(g, false);                      // melden=false wie bei Screenshots
    f('ItemPelvis', 'Belt', NEU());
    f('ItemArms', 'Cuffs', NEU());
    const seen = g.posts.filter((p) => p.m.type === 'LOCK_SEEN');
    expect(seen).toHaveLength(1);
    expect(g.plain(seen[0].m)).toEqual({ app: APP, type: 'LOCK_SEEN', lock: 'XyzNeuPadlock' });
    expect(g.posts.filter((p) => p.m.type === 'LOCK_STRIPPED')).toHaveLength(0);
    // bekannte Mod-Schlösser und BC-eigene werden nicht als "neu" gemeldet
    const g2 = makeGame();
    const f2 = t.fix(g2, false);
    f2('ItemNeck', 'Collar', DEVIOUS());
    f2('ItemPelvis', 'Belt', LOVER_LOCK(FREMD));
    expect(g2.posts.filter((p) => p.m.type === 'LOCK_SEEN')).toHaveLength(0);

    t.send({ type: 'LOCK_SEEN', lock: 'XyzNeuPadlock' });
    expect(evalIn(t.c, '_lockModsSeen.slice()')).toEqual(['XyzNeuPadlock']);
    expect(JSON.parse(t.c.localStorage.getItem('BC_LOCK_MODS_SEEN_v1'))).toEqual(['XyzNeuPadlock']);
    expect(t.els.statusMsg.textContent).toContain('Neues Mod-Schloss entdeckt: XyzNeuPadlock');
    // jetzt mit eigener Regel steuerbar
    evalIn(t.c, "lockRuleSet('mod:XyzNeuPadlock','behalten')");
    const g3 = makeGame();
    const p = NEU();
    expect(t.fix(g3)('ItemPelvis', 'Belt', p)).toBe(p);
  });

  it('LOCK_SEEN mit BC-eigenem, bekanntem oder zu langem Namen wird ignoriert', () => {
    const t = frisch();
    for (const lock of ['LoversPadlock', 'DeviousPadlock', 'LewdCrestPadlock', 'Heart Padlock', 'HeartPadlock', 'x'.repeat(81), '', 42]) {
      t.send({ type: 'LOCK_SEEN', lock });
    }
    expect(evalIn(t.c, '_lockModsSeen.length')).toBe(0);
  });

  it('Regel für nicht entdecktes Mod-Schloss wird abgelehnt', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('mod:GibtsNichtPadlock','meins')");
    expect(evalIn(t.c, "_lockRules['mod:GibtsNichtPadlock']")).toBeUndefined();
  });

  it('fremde Schloss-Namen landen escaped im Einstellungs-HTML', () => {
    const t = frisch();
    t.send({ type: 'LOCK_SEEN', lock: "Böse'\"<img src=x onerror=alert(1)>Padlock" });
    evalIn(t.c, '_lockRulesRender()');
    const html = t.els.lockRulesBox.innerHTML;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    // ' → \' (JS-String bleibt geschlossen), " → &quot; (Attribut bleibt geschlossen), < → &lt;
    expect(html).toContain("lockRuleSet('mod:Böse\\'&quot;&lt;img");
  });

  it('Suche in gespeicherten Outfits zählt Mod-Schlösser je Outfit und legt Zeilen an', () => {
    const t = frisch();
    const code = (items) => LZString.compressToBase64(JSON.stringify(items));
    const DEV = { LockedBy: 'ExclusivePadlock', Name: 'DeviousPadlock' };
    evalIn(t.c, `
      LSCG_DB['5'] = { versions: [
        { code: ${JSON.stringify(code([{ Group: 'ItemNeck', Name: 'Collar', Property: DEV }, { Group: 'ItemArms', Name: 'Cuffs', Property: DEV }]))} },
        { code: ${JSON.stringify(code([{ Group: 'ItemPelvis', Name: 'Belt', Property: { LockedBy: 'QrsPadlock' } }]))} },
        { code: ${JSON.stringify(code([{ Group: 'ItemPelvis', Name: 'Belt', Property: { LockedBy: 'LoversPadlock' } }]))} },
        { code: 'kaputt' },
      ] };
      PROFILES['P'] = { _outfitCode: ${JSON.stringify(code([{ Group: 'ItemNeck', Name: 'Collar', Property: DEV }]))} };
      var __ergebnis = null; lockModsScan(function (z) { __ergebnis = z; });
    `);
    expect(evalIn(t.c, 'JSON.parse(JSON.stringify(__ergebnis))')).toEqual({ 'mod:DeviousPadlock': 2, 'mod:QrsPadlock': 1 });
    expect(evalIn(t.c, '_lockModsSeen.slice()')).toEqual(['QrsPadlock']);
    expect(t.els.statusMsg.textContent).toContain('DOGS Devious 2×');
    expect(t.els.lockRulesBox.innerHTML).toContain('in 2 gespeicherten Outfits');
    // nur gelesen: gespeicherte Codes unverändert
    expect(evalIn(t.c, "LSCG_DB['5'].versions[3].code")).toBe('kaputt');
  });
});

describe('DOGS Devious "Mir gehört": bleibt DOGS-Schloss, du als Besitzerin', () => {
  afterEach(() => { evalIn(ctx, "lockRuleSetAll('weg')"); });

  // DOGS-Umgebung im Spiel-Tab-Nachbau: Mod geladen, Devious-Schloss an/aus, Timer und Trigger mitschneiden
  function mitDogs(g, { installiert = true, an = true } = {}) {
    const timer = [];
    const trigger = [];
    g.game.setTimeout = (fn, ms) => { timer.push({ fn, ms }); return timer.length; };
    g.game.bcModSdk = { getModsInfo: () => (installiert ? [{ name: 'LSCG' }, { name: 'DOGS', version: '2.2.3' }] : [{ name: 'LSCG' }]) };
    g.game.Player.ExtensionSettings = { DOGS: LZString.compressToBase64(JSON.stringify({ deviousPadlock: { state: an } })) };
    g.game.ChatRoomCharacterItemUpdate = (C, grp) => trigger.push({ C, grp });
    return { timer, trigger };
  }
  const DOGS_FREMD = (base = 'ExclusivePadlock') => ({ LockedBy: base, Name: 'DeviousPadlock', LockMemberNumber: FREMD, LockMemberName: 'Fremd', Effect: ['Lock'] });

  it('DOGS aktiv: Schloss bleibt DOGS (Exklusiv-Unterbau), du als Besitzerin, DOGS-Prüfung mit dir als Auslöser', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    const d = mitDogs(g);
    const out = g.plain(fixIn(g)('ItemNeck', 'Collar', DOGS_FREMD()));
    expect(out).toMatchObject({ Name: 'DeviousPadlock', LockedBy: 'ExclusivePadlock', LockMemberNumber: ME, LockMemberName: 'Ich' });
    expect(out.Effect).toEqual(['Lock']);
    expect(g.posts.find((p) => p.m.type === 'LOCK_STRIPPED').m.aktion).toBe('dogs');
    // erst nach dem Anlegen (Timer) – und dann genau einmal mit dir selbst als Auslöser
    expect(d.trigger).toHaveLength(0);
    expect(d.timer).toHaveLength(1);
    d.timer[0].fn();
    expect(d.trigger).toHaveLength(1);
    expect(d.trigger[0].C).toBe(g.game.Player);
    expect(d.trigger[0].grp).toBe('ItemNeck');
  });

  it('mehrere DOGS-Schlösser in einem Outfit → nur ein Trigger (DOGS prüft alles auf einmal)', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    const d = mitDogs(g);
    const f = fixIn(g);
    f('ItemNeck', 'Collar', DOGS_FREMD());
    f('ItemArms', 'Cuffs', DOGS_FREMD());
    expect(d.timer).toHaveLength(1);
  });

  it('DOGS mit Lover-Unterbau wird auf Exklusiv-Unterbau mit dir umgestellt', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    mitDogs(g);
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', DOGS_FREMD('LoversPadlock')));
    expect(out.LockedBy).toBe('ExclusivePadlock');
    expect(out.LockMemberNumber).toBe(ME);
  });

  it('DOGS installiert, aber Devious-Schloss aus → kein DOGS-Schloss (würde nie aufgehen), sondern dein High-Security', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    const d = mitDogs(g, { an: false });
    const out = g.plain(fixIn(g)('ItemNeck', 'Collar', DOGS_FREMD()));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(out.Name).toBeUndefined();
    expect(d.timer).toHaveLength(0);
  });

  it('ohne DOGS → dein High-Security', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    mitDogs(g, { installiert: false });
    expect(g.plain(fixIn(g)('ItemNeck', 'Collar', DOGS_FREMD())).LockedBy).toBe('HighSecurityPadlock');
  });

  it('Screenshot (melden=false): DOGS-Schloss wird immer weggelassen – DOGS registriert nichts', () => {
    for (const regel of ['meins', 'behalten']) {
      evalIn(ctx, `lockRuleSet('mod:DeviousPadlock','${regel}')`);
      const g = makeGame();
      const d = mitDogs(g);
      const out = g.plain(fixIn(g, false)('ItemNeck', 'Collar', DOGS_FREMD()));
      expect(out.LockedBy).toBeUndefined();
      expect(out.Name).toBeUndefined();
      expect(d.timer).toHaveLength(0);
      expect(d.trigger).toHaveLength(0);
    }
  });

  it('Tool-Meldung für den DOGS-Weg', () => {
    const opener = { closed: false, postMessage: vi.fn() };
    const els = {};
    const c = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
    c.document.getElementById = (id) => (els[id] ||= makeElementStub());
    const send = (data) => dispatchMessage(c, { app: APP, ...data }, { origin: BC, source: opener });
    send({ type: 'PONG' });
    send({ type: 'LOCK_STRIPPED', group: 'ItemNeck', lock: 'DeviousPadlock', by: FREMD, aktion: 'dogs' });
    expect(els.statusMsg.textContent).toBe('🔓 Fremdes Schloss: DeviousPadlock an ItemNeck (von #555) → DOGS, du als Besitzerin');
  });
});

describe('"Neuer Setzer": AFC-/Lover-Schloss behalten, aber mit bekannter Person oder dir', () => {
  function frisch() {
    const opener = { closed: false, postMessage: vi.fn() };
    const els = {};
    const c = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
    c.document.getElementById = (id) => (els[id] ||= makeElementStub());
    const fix = (g, melden = true) => {
      vm.runInContext(evalIn(c, `_lockFilterPrelude(${melden})`) + ';this.__fix=__bcuLockFix;', g.game);
      return g.game.__fix;
    };
    return { c, els, opener, fix };
  }

  it('Setzer "ich selbst": Lover-Schloss bleibt Lover-Schloss, nur Setzer ersetzt (du hast eine Lover → BC-gültig)', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer')");
    const g = makeGame({ lovership: [{ MemberNumber: 321, Name: 'Mia' }] });
    const out = g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out).toMatchObject({ LockedBy: 'LoversPadlock', LockMemberNumber: ME, LockMemberName: 'Ich', RemoveTimer: 123 });
    expect(out.Effect).toEqual(['Lock', 'Chaste']);
    const m = g.plain(g.posts[0].m);
    expect(m.aktion).toBe('setzer');
    expect(m.info).toBe('Ich (#100)');
  });

  it('Setzer "Lover-Partnerin": erste Lover-Beziehung aus BC mit Namen', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer'); lockSetzerSet('lover')");
    const g = makeGame({ lovership: [{ Name: 'NPC-Lover' }, { MemberNumber: 321, Name: 'Mia' }] });
    const out = g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out).toMatchObject({ LockedBy: 'LoversPadlock', LockMemberNumber: 321, LockMemberName: 'Mia' });
  });

  it('Lover-Schloss ohne eigene Lover: BC ließe keinen Setzer gelten → dein High-Security', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer'); lockSetzerSet('lover')");
    const g = makeGame();
    const out = g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out).toMatchObject({ LockedBy: 'HighSecurityPadlock', LockMemberNumber: ME, MemberNumberListKeys: String(ME) });
    expect(g.posts[0].m.aktion).toBe('meins');
    expect(g.posts[0].m.info).toContain('kein gültiger Setzer');
  });

  it('feste Nummer (eigene Lover): Name aus Freundesliste, sonst aus Eingabe, sonst #Nummer', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer'); lockSetzerSet('nummer', '4711', 'Bekannte')");
    expect(JSON.parse(t.c.localStorage.getItem('BC_LOCK_SETZER_v1'))).toEqual({ modus: 'nummer', nummer: 4711, name: 'Bekannte' });
    const MIT_LOVER = { lovership: [{ MemberNumber: 4711 }] };   // Lover ohne Namen in BC
    const g = makeGame(MIT_LOVER);
    g.game.Player.FriendNames = new Map([[4711, 'Freundin']]);
    expect(g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD))).LockMemberName).toBe('Freundin');
    const g2 = makeGame(MIT_LOVER);
    expect(g2.plain(t.fix(g2)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)))).toMatchObject({ LockedBy: 'LoversPadlock', LockMemberNumber: 4711, LockMemberName: 'Bekannte' });
    evalIn(t.c, "lockSetzerSet('nummer', '4711', '')");
    const g3 = makeGame(MIT_LOVER);
    expect(g3.plain(t.fix(g3)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD))).LockMemberName).toBe('#4711');
  });

  it('feste Nummer, die keine Lover ist → BC würde löschen → erste eigene Lover wird Setzer', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer'); lockSetzerSet('nummer', '4711', 'Bekannte')");
    const g = makeGame({ lovership: [{ Name: 'NPC' }, { MemberNumber: 211929, Name: 'Yuumisu' }] });
    expect(g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)))).toMatchObject({ LockedBy: 'LoversPadlock', LockMemberNumber: 211929, LockMemberName: 'Yuumisu' });
  });

  it('Lover-Regel "BlockLoverLockSelf" verbietet dich als Setzer → deine Lover wird Setzer', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer')");
    const g = makeGame({ lovership: [{ MemberNumber: 211929, Name: 'Yuumisu' }] });
    g.game.LogQuery = (name, grp) => name === 'BlockLoverLockSelf' && grp === 'LoverRule';
    expect(g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD))).LockMemberNumber).toBe(211929);
  });

  it('Owner-Schloss ohne eigene Owner (dein Fall: Halsband) → BC ungültig → dein High-Security', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('owner','setzer')");
    const g = makeGame({ lovership: [{ MemberNumber: 211929, Name: 'Yuumisu' }] });
    const out = g.plain(t.fix(g)('ItemNeck', 'PetCollar', { LockedBy: 'OwnerPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] }));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(out.MemberNumberListKeys).toBe(String(ME));
    expect(g.posts[0].m.info).toContain('Owner-Schloss geht nur mit Owner');
  });

  it('Owner-Schloss mit eigener Owner: du als Setzer ist gültig, außer die Owner-Regel verbietet es', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('owner','setzer')");
    const OWN = { ownership: { MemberNumber: OWNER, Name: 'Herrin' } };
    const g = makeGame(OWN);
    expect(g.plain(t.fix(g)('ItemNeck', 'Collar', { LockedBy: 'OwnerPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] }))).toMatchObject({ LockedBy: 'OwnerPadlock', LockMemberNumber: ME });
    const g2 = makeGame(OWN);
    g2.game.LogQuery = (name, grp) => name === 'BlockOwnerLockSelf' && grp === 'OwnerRule';
    expect(g2.plain(t.fix(g2)('ItemNeck', 'Collar', { LockedBy: 'OwnerPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] }))).toMatchObject({ LockedBy: 'OwnerPadlock', LockMemberNumber: OWNER, LockMemberName: 'Herrin' });
  });

  it('"Neuer Setzer" gibt es nur bei Owner, Lover und AFC – nicht bei Exklusiv, Schlüssel, Code, anderen Mods oder "Alle"', () => {
    const t = frisch();
    for (const k of ['exklusiv', 'schluessel', 'code', 'mod', 'mod:DeviousPadlock']) evalIn(t.c, `lockRuleSet('${k}','setzer')`);
    evalIn(t.c, "lockRuleSetAll('setzer')");
    const regeln = JSON.parse(JSON.stringify(evalIn(t.c, '_lockRules')));
    expect(Object.values(regeln).includes('setzer')).toBe(false);
    evalIn(t.c, "lockRuleSet('lover','setzer'); _lockRulesRender()");
    const html = t.els.lockRulesBox.innerHTML;
    expect((html.match(/>Neuer Setzer</g) || []).length).toBe(3);   // Owner-, Lover- und AFC-Zeile
    expect(html).toContain('id="lockSetzerModus"');                  // Setzer-Auswahl sichtbar
  });

  it('gespeicherte "setzer"-Regel für andere Arten wird beim Laden verworfen', () => {
    const store = new Map([['BC_LOCK_RULES_v1', JSON.stringify({ lover: 'setzer', exklusiv: 'setzer' })]]);
    const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const c = loadScript(['items.js'], { localStorage });
    expect(evalIn(c, '_lockRules.lover')).toBe('setzer');
    expect(evalIn(c, '_lockRules.exklusiv')).toBe('weg');
  });

  it('ungültige Setzer-Eingaben werden bereinigt (Nummer, Länge, Typ)', () => {
    const t = frisch();
    evalIn(t.c, "lockSetzerSet('nummer', 'abc', 'x')");
    expect(evalIn(t.c, '_lockSetzer.modus')).toBe('ich');
    evalIn(t.c, "lockSetzerSet('nummer', '12', 'A'.repeat(99))");
    expect(evalIn(t.c, '_lockSetzer.name.length')).toBe(40);
    evalIn(t.c, "lockSetzerSet('quatsch')");
    expect(evalIn(t.c, '_lockSetzer.modus')).toBe('ich');
  });

  it('Setzer-Name aus der Eingabe kann den Spielcode nicht aufbrechen', () => {
    const t = frisch();
    evalIn(t.c, `lockRuleSet('lover','setzer'); lockSetzerSet('nummer', '77', '");alert(1);//')`);
    const g = makeGame({ lovership: [{ MemberNumber: 77 }] });
    const out = g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD)));
    expect(out.LockMemberName).toBe('");alert(1);//');
  });

  it('Tool-Meldung zeigt den neuen Setzer', () => {
    const t = frisch();
    dispatchMessage(t.c, { app: APP, type: 'PONG' }, { origin: BC, source: t.opener });
    dispatchMessage(t.c, { app: APP, type: 'LOCK_STRIPPED', group: 'ItemPelvis', lock: 'LoversPadlock', by: FREMD, aktion: 'setzer', info: 'Mia (#321)' }, { origin: BC, source: t.opener });
    expect(t.els.statusMsg.textContent).toBe('🔓 Fremdes Schloss: LoversPadlock an ItemPelvis (von #555) → behalten, Setzer: Mia (#321)');
  });
});

describe('AFC Heart Padlock (Abundantia Florum Chromatica): bleibt AFC-Herzschloss mit bekanntem Besitzer', () => {
  afterEach(() => { evalIn(ctx, "lockRuleSetAll('weg'); lockSetzerSet('ich')"); });

  // genau so steht es im echten Outfit (ItemNeckAccessories / CollarButterfly)
  const AFC_FREMD = () => ({ LockedBy: 'HighSecurityPadlock', LockMemberNumber: 249474, LockMemberName: 'thanh',
    MemberNumberListKeys: '249474', Name: 'Heart Padlock', HeartLockId: '7955493f-5da2-41aa-a947-473bf5f92b48',
    LockPickSeed: '8,3,5,10,4,2,6,7,1,9,0,11', Effect: ['Lock'] });

  it('wird als eigene Art erkannt – auch wenn nur die HeartLockId übrig ist', () => {
    expect(evalIn(ctx, `_lockKatTool(${JSON.stringify(AFC_FREMD())})`)).toBe('mod:AFCHeart');
    expect(evalIn(ctx, `_lockKatTool({ LockedBy: 'HighSecurityPadlock', HeartLockId: 'x' })`)).toBe('mod:AFCHeart');
    expect(evalIn(ctx, `_lockKatTool({ LockedBy: 'HighSecurityPadlock', MemberNumberListKeys: '1' })`)).toBe('schluessel');
  });

  it('"Mir gehört": bleibt Herzschloss, du bist Besitzerin und Schlüsselhalterin, neue Schloss-ID', () => {
    evalIn(ctx, "lockRuleSet('mod:AFCHeart','meins')");
    const g = makeGame();
    const alt = AFC_FREMD();
    const out = g.plain(fixIn(g)('ItemNeckAccessories', 'CollarButterfly', alt));
    expect(out).toMatchObject({ LockedBy: 'HighSecurityPadlock', Name: 'Heart Padlock', LockMemberNumber: ME, LockMemberName: 'Ich', MemberNumberListKeys: String(ME) });
    expect(out.HeartLockId).toBeTruthy();
    expect(out.HeartLockId).not.toBe(alt.HeartLockId);
    expect(out.Effect).toEqual(['Lock']);
    const m = g.plain(g.posts.find((p) => p.m.type === 'LOCK_STRIPPED').m);
    expect(m).toMatchObject({ aktion: 'afc', info: 'Ich (#100)', lock: 'Heart Padlock' });
  });

  it('"Neuer Setzer" mit fester Nummer: Bekannte wird Besitzerin und Schlüsselhalterin', () => {
    evalIn(ctx, "lockRuleSet('mod:AFCHeart','setzer'); lockSetzerSet('nummer', '4711', 'Mia')");
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemNeckAccessories', 'CollarButterfly', AFC_FREMD()));
    expect(out).toMatchObject({ Name: 'Heart Padlock', LockMemberNumber: 4711, LockMemberName: 'Mia', MemberNumberListKeys: '4711' });
  });

  it('"Entfernen": Herzschloss samt AFC-Kennung weg, Item bleibt', () => {
    const g = makeGame();
    const out = g.plain(fixIn(g)('ItemNeckAccessories', 'CollarButterfly', AFC_FREMD()));
    for (const k of ['LockedBy', 'Name', 'HeartLockId', 'MemberNumberListKeys', 'LockPickSeed', 'LockMemberNumber']) expect(out[k]).toBeUndefined();
  });

  it('"Übernehmen": unverändert (AFC würde dann die fremde Person als Besitzerin eintragen)', () => {
    evalIn(ctx, "lockRuleSet('mod:AFCHeart','behalten')");
    const g = makeGame();
    const p = AFC_FREMD();
    expect(fixIn(g)('ItemNeckAccessories', 'CollarButterfly', p)).toBe(p);
  });

  it('Screenshot: Herzschloss wird immer weggelassen (AFC registriert schon bei CharacterRefresh)', () => {
    for (const regel of ['meins', 'setzer', 'behalten']) {
      evalIn(ctx, `lockRuleSet('mod:AFCHeart','${regel}')`);
      const g = makeGame();
      const out = g.plain(fixIn(g, false)('ItemNeckAccessories', 'CollarButterfly', AFC_FREMD()));
      expect(out.Name).toBeUndefined();
      expect(out.HeartLockId).toBeUndefined();
      expect(out.LockedBy).toBeUndefined();
    }
  });

  it('alte Regel der entdeckten Zeile "Heart Padlock" wird übernommen', () => {
    const store = new Map([
      ['BC_LOCK_RULES_v1', JSON.stringify({ lover: 'setzer', 'mod:Heart Padlock': 'meins', 'mod:HeartPadlock': 'weg' })],
      ['BC_LOCK_MODS_SEEN_v1', JSON.stringify(['Heart Padlock', 'XyzPadlock'])],
    ]);
    const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const c = loadScript(['items.js'], { localStorage });
    expect(evalIn(c, "_lockRules['mod:AFCHeart']")).toBe('meins');
    expect(evalIn(c, "'mod:Heart Padlock' in _lockRules")).toBe(false);
    expect(evalIn(c, '_lockModsSeen.slice()')).toEqual(['XyzPadlock']);
  });

  it('durchgängig: dein echtes Outfit-String-Item wird beim Anlegen zum AFC-Herzschloss mit dir', () => {
    evalIn(ctx, "lockRuleSet('mod:AFCHeart','meins')");
    const g = makeGame();
    const code = LZString.compressToBase64(JSON.stringify([{ Group: 'ItemNeckAccessories', Name: 'CollarButterfly', Property: AFC_FREMD() }]));
    vm.runInContext(ctx._oiBuildExecCode(code), g.game);
    const it = g.plain(g.game.Player.Appearance.find((a) => a.Asset.Group.Name === 'ItemNeckAccessories'));
    expect(it.Property).toMatchObject({ LockedBy: 'HighSecurityPadlock', Name: 'Heart Padlock', LockMemberNumber: ME, MemberNumberListKeys: String(ME) });
  });
});

describe('Umwandeln, Timer und Codes', () => {
  afterEach(() => { evalIn(ctx, "lockRuleSetAll('weg'); lockSetzerSet('ich'); lockCodeSet('', '', ''); Object.keys(_lockZiel).forEach(k => delete _lockZiel[k]); Object.keys(_lockZeit).forEach(k => delete _lockZeit[k]);"); });

  const JETZT = 1_000_000_000;
  const TIMER_FREMD = () => ({ LockedBy: 'TimerPadlock', LockMemberNumber: FREMD, RemoveTimer: 5, Effect: ['Lock'] });
  const spiel = (opt) => { const g = makeGame(opt); g.game.CurrentTime = JETZT; return g; };
  const ziel = (kat, typ, minuten, itemWeg) => evalIn(ctx, `lockRuleSet('${kat}','umwandeln'); lockZielSet('${kat}','typ','${typ}');`
    + (minuten !== undefined ? `lockZielSet('${kat}','minuten',${minuten});` : '') + (itemWeg ? `lockZielSet('${kat}','itemWeg',true);` : ''));

  it('Timer-Schloss → Lover-Timer 90 Min (mit eigener Lover)', () => {
    ziel('timer', 'LoversTimerPadlock', 90);
    const g = spiel({ lovership: [{ MemberNumber: 211929, Name: 'Yuumisu' }] });
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', TIMER_FREMD()));
    expect(out).toMatchObject({ LockedBy: 'LoversTimerPadlock', LockMemberNumber: ME, RemoveTimer: JETZT + 90 * 60000,
      ShowTimer: true, EnableRandomInput: false, RemoveItem: false, MemberNumberList: [] });
    expect(out.Effect).toEqual(['Lock']);
    const m = g.plain(g.posts.find((p) => p.m.type === 'LOCK_STRIPPED').m);
    expect(m.aktion).toBe('umwandeln');
    expect(m.info).toContain('LoversTimerPadlock, 90 Min');
  });

  it('Timer wird auf das BC-Maximum begrenzt; Timer-Schloss bleibt fest bei 5 Min', () => {
    ziel('timer', 'TimerPasswordPadlock', 10000);
    const g = spiel();
    expect(g.plain(fixIn(g)('ItemPelvis', 'Belt', TIMER_FREMD())).RemoveTimer).toBe(JETZT + 14400 * 1000);
    ziel('timer', 'TimerPadlock', 999);
    const g2 = spiel();
    expect(g2.plain(fixIn(g2)('ItemPelvis', 'Belt', TIMER_FREMD())).RemoveTimer).toBe(JETZT + 300 * 1000);
  });

  it('"Item fällt mit ab" setzt RemoveItem', () => {
    ziel('timer', 'MistressTimerPadlock', 20, true);
    const g = spiel();
    expect(g.plain(fixIn(g)('ItemPelvis', 'Belt', TIMER_FREMD()))).toMatchObject({ LockedBy: 'MistressTimerPadlock', RemoveItem: true, RemoveTimer: JETZT + 20 * 60000 });
  });

  it('Passwort/Safeword/Kombination bekommen die Codes aus den Einstellungen', () => {
    evalIn(ctx, "lockCodeSet('geheim', 'Tipp: Blume', '4711')");
    ziel('code', 'SafewordPadlock');
    const g = spiel();
    expect(g.plain(fixIn(g)('ItemPelvis', 'Belt', { LockedBy: 'PasswordPadlock', Password: 'FREMD', LockMemberNumber: FREMD, Effect: ['Lock'] })))
      .toMatchObject({ LockedBy: 'SafewordPadlock', Password: 'GEHEIM', Hint: 'Tipp: Blume', LockSet: true, LockMemberNumber: ME });
    ziel('code', 'CombinationPadlock');
    const g2 = spiel();
    const out = g2.plain(fixIn(g2)('ItemPelvis', 'Belt', { LockedBy: 'CombinationPadlock', CombinationNumber: '9999', LockMemberNumber: FREMD, Effect: ['Lock'] }));
    expect(out).toMatchObject({ LockedBy: 'CombinationPadlock', CombinationNumber: '4711' });
    expect(out.Password).toBeUndefined();
  });

  it('Codes werden an BC-Regeln angepasst (A–Z max. 8, 4 Ziffern)', () => {
    evalIn(ctx, "lockCodeSet('ab1cd!efghij', 'x', '12a')");
    expect(evalIn(ctx, '_lockCode.passwort')).toBe('ABCDEFGH');
    expect(evalIn(ctx, '_lockCode.kombination')).toBe('0000');
    evalIn(ctx, "lockCodeSet('', '', '4321')");
    expect(evalIn(ctx, '_lockCode.passwort')).toBe('UNLOCK');
    expect(evalIn(ctx, '_lockCode.kombination')).toBe('4321');
  });

  it('Lover-/Owner-Ziel ohne Beziehung → High Security, mit Grund', () => {
    ziel('timer', 'OwnerTimerPadlock', 60);
    const g = spiel();
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', TIMER_FREMD()));
    expect(out).toMatchObject({ LockedBy: 'HighSecurityPadlock', MemberNumberListKeys: String(ME) });
    expect(out.RemoveTimer).toBeUndefined();   // High Security hat keinen Timer
    expect(g.posts.find((p) => p.m.type === 'LOCK_STRIPPED').m.info).toContain('Owner-Schloss geht nur mit Owner');
  });

  it('Exklusiv-Ziel: mit dir als Setzer → High Security; mit fester Nummer → Exklusiv für diese Person', () => {
    ziel('schluessel', 'ExclusivePadlock');
    const g = spiel();
    const metall = () => ({ LockedBy: 'MetalPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] });
    expect(g.plain(fixIn(g)('ItemArms', 'Cuffs', metall())).LockedBy).toBe('HighSecurityPadlock');
    evalIn(ctx, "lockSetzerSet('nummer', '4711', 'Mia')");
    const g2 = spiel();
    expect(g2.plain(fixIn(g2)('ItemArms', 'Cuffs', metall()))).toMatchObject({ LockedBy: 'ExclusivePadlock', LockMemberNumber: 4711, LockMemberName: 'Mia' });
  });

  it('Item erlaubt das Ziel nicht → High Security, erlaubt auch das nicht → Schloss weg', () => {
    ziel('timer', 'MistressTimerPadlock', 10);
    const g = spiel();
    g.game.AssetGet = (f, gr, n) => ({ Name: n, Group: { Name: gr }, AllowLockType: ['HighSecurityPadlock'] });
    expect(g.plain(fixIn(g)('ItemPelvis', 'Belt', TIMER_FREMD())).LockedBy).toBe('HighSecurityPadlock');
    const g2 = spiel();
    g2.game.AssetGet = (f, gr, n) => ({ Name: n, Group: { Name: gr }, AllowLockType: ['MetalPadlock'] });
    const out = g2.plain(fixIn(g2)('ItemPelvis', 'Belt', TIMER_FREMD()));
    expect(out.LockedBy).toBeUndefined();
    expect(out.RemoveTimer).toBeUndefined();
  });

  it('"Übernehmen" mit "Timer neu ab jetzt": nur Timer-Schlösser bekommen eine neue Zeit', () => {
    evalIn(ctx, "lockRuleSet('lover','behalten'); lockZeitSet('lover', 45)");
    const g = spiel({ lovership: [{ MemberNumber: 211929 }] });
    const timer = { LockedBy: 'LoversTimerPadlock', LockMemberNumber: 211929, RemoveTimer: 5, Effect: ['Lock'] };
    // eigene Lover hat es gesetzt → Schutzregel: bleibt unverändert, auch der Timer
    expect(fixIn(g)('ItemPelvis', 'Belt', timer)).toBe(timer);
    const fremdTimer = { ...timer, LockMemberNumber: FREMD };
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', fremdTimer));
    expect(out).toMatchObject({ LockedBy: 'LoversTimerPadlock', LockMemberNumber: FREMD, RemoveTimer: JETZT + 45 * 60000 });
    expect(fremdTimer.RemoveTimer).toBe(5);   // gespeicherte Daten unangetastet
    const ohneTimer = LOVER_LOCK(FREMD);
    expect(fixIn(g)('ItemPelvis', 'Belt', ohneTimer)).toBe(ohneTimer);
  });

  it('"Neuer Setzer" + "Timer neu": Setzer und Zeit werden gesetzt', () => {
    evalIn(ctx, "lockRuleSet('lover','setzer'); lockZeitSet('lover', 15)");
    const g = spiel({ lovership: [{ MemberNumber: 211929, Name: 'Yuumisu' }] });
    const out = g.plain(fixIn(g)('ItemPelvis', 'Belt', { LockedBy: 'LoversTimerPadlock', LockMemberNumber: FREMD, RemoveTimer: 5, Effect: ['Lock'] }));
    expect(out).toMatchObject({ LockMemberNumber: ME, RemoveTimer: JETZT + 15 * 60000 });
    expect(g.posts.find((p) => p.m.type === 'LOCK_STRIPPED').m.info).toContain('Timer 15 Min');
  });

  it('Screenshot: Umwandeln in AFC/DOGS wird ein schlichtes High-Security-Schloss', () => {
    ziel('timer', 'AFCHeart');
    const g = spiel();
    const out = g.plain(fixIn(g, false)('ItemPelvis', 'Belt', TIMER_FREMD()));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(out.Name).toBeUndefined();
    expect(out.HeartLockId).toBeUndefined();
  });

  it('alte Regel "Zeit & Code" gilt nach dem Update für Timer und Code', () => {
    const store = new Map([['BC_LOCK_RULES_v1', JSON.stringify({ code: 'meins', lover: 'weg' })]]);
    const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
    const c = loadScript(['items.js'], { localStorage });
    expect(evalIn(c, '_lockRules.timer')).toBe('meins');
    expect(evalIn(c, '_lockRules.code')).toBe('meins');
  });

  it('durchgängig: Outfit mit Timer-Schloss → umgewandelt beim Anlegen', () => {
    ziel('timer', 'TimerPasswordPadlock', 30);
    const g = spiel();
    const code = LZString.compressToBase64(JSON.stringify([{ Group: 'ItemPelvis', Name: 'Belt', Property: TIMER_FREMD() }]));
    vm.runInContext(ctx._oiBuildExecCode(code), g.game);
    const it = g.plain(g.game.Player.Appearance.find((a) => a.Asset.Group.Name === 'ItemPelvis'));
    expect(it.Property).toMatchObject({ LockedBy: 'TimerPasswordPadlock', Password: 'UNLOCK', RemoveTimer: JETZT + 30 * 60000 });
  });
});

describe('Menü "Fremde Schlösser"', () => {
  function menue(setup) {
    const els = {};
    const c = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
    c.document.getElementById = (id) => (els[id] ||= makeElementStub());
    evalIn(c, (setup || '') + '; _lockRulesRender()');
    return { c, html: () => els.lockRulesBox.innerHTML };
  }

  it('zeigt Einstellungen (Setzer, Codes), BC- und Mod-Gruppen, je Zeile Aktion und Erklärung', () => {
    const { html } = menue();
    for (const id of ['lockSetzerModus', 'lockCodePw', 'lockCodeHint', 'lockCodeKombi']) expect(html()).toContain('id="' + id + '"');
    expect(html()).toContain('BC-Schlösser');
    expect(html()).toContain('Mod-Schlösser');
    expect((html().match(/ⓘ Erklärung/g) || []).length).toBeGreaterThanOrEqual(12);
    expect(html()).toContain('Original an dir:');
    expect(html()).toContain('<option value="umwandeln"');
  });

  it('"Umwandeln" zeigt Zielauswahl, Minuten (mit BC-Maximum), "Item fällt mit ab" und die Ziel-Erklärung', () => {
    const { html } = menue("lockRuleSet('timer','umwandeln'); lockZielSet('timer','typ','LoversTimerPadlock')");
    expect(html()).toContain('<option value="LoversTimerPadlock" selected>');
    expect(html()).toContain('max="10080"');            // 7 Tage in Minuten
    expect(html()).toContain('Item fällt mit ab');
    expect(html()).toContain('max. 7 Tage');
  });

  it('Timer-Schloss (fest 5 Min) zeigt kein Minutenfeld', () => {
    const { html } = menue("lockRuleSet('timer','umwandeln'); lockZielSet('timer','typ','TimerPadlock')");
    expect(html()).not.toContain('lr-min');
  });

  it('"Timer neu ab jetzt" erscheint nur bei Timer-Arten mit Übernehmen/Neuer Setzer', () => {
    const { html } = menue("lockRuleSet('lover','behalten'); lockRuleSet('code','behalten')");
    expect((html().match(/>wie im Outfit<\/option>/g) || []).length).toBe(1);   // nur Lover (Code hat keine Timer)
  });

  it('Mod-Zeile ohne eigene Regel folgt "alle anderen"; Auswahl "" löscht die eigene Regel', () => {
    const { c, html } = menue("lockRuleSet('mod','meins')");
    expect(html()).toContain('wie „alle anderen“ (Mir gehört)</option>');
    evalIn(c, "lockRuleSet('mod:LewdCrest','behalten')");
    expect(evalIn(c, "_lockRules['mod:LewdCrest']")).toBe('behalten');
    evalIn(c, "lockRuleSet('mod:LewdCrest','')");
    expect(evalIn(c, "'mod:LewdCrest' in _lockRules")).toBe(false);
  });

  it('"Neuer Setzer" ist nur bei Owner, Lover und AFC auswählbar', () => {
    const { html } = menue();
    expect((html().match(/<option value="setzer"/g) || []).length).toBe(3);
  });
});
