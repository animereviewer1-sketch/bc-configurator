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
    ['TimerPadlock', {}, 'code'],
    ['MistressTimerPadlock', {}, 'code'],
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
    evalIn(t.c, "lockRuleSet('mod:DeviousPadlock','meins'); lockRuleSet('mod:HeartPadlock','behalten'); lockRuleSet('mod','weg')");
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
    for (const lock of ['LoversPadlock', 'DeviousPadlock', 'LewdCrestPadlock', 'x'.repeat(81), '', 42]) {
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

  it('Screenshot (melden=false) registriert nie etwas bei DOGS', () => {
    evalIn(ctx, "lockRuleSet('mod:DeviousPadlock','meins')");
    const g = makeGame();
    const d = mitDogs(g);
    const out = g.plain(fixIn(g, false)('ItemNeck', 'Collar', DOGS_FREMD()));
    expect(out.LockedBy).toBe('HighSecurityPadlock');
    expect(d.timer).toHaveLength(0);
    expect(d.trigger).toHaveLength(0);
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

  it('Setzer "ich selbst": Lover-Schloss bleibt Lover-Schloss, nur Setzer ersetzt', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer')");
    const g = makeGame();
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

  it('Setzer "Lover-Partnerin" ohne Lover → du selbst', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('lover','setzer'); lockSetzerSet('lover')");
    const g = makeGame();
    expect(g.plain(t.fix(g)('ItemPelvis', 'Belt', LOVER_LOCK(FREMD))).LockMemberNumber).toBe(ME);
  });

  it('feste Nummer: Name aus Freundesliste, sonst aus Eingabe, sonst #Nummer', () => {
    const t = frisch();
    evalIn(t.c, "lockRuleSet('owner','setzer'); lockSetzerSet('nummer', '4711', 'Bekannte')");
    expect(JSON.parse(t.c.localStorage.getItem('BC_LOCK_SETZER_v1'))).toEqual({ modus: 'nummer', nummer: 4711, name: 'Bekannte' });
    const OWNER_LOCK = () => ({ LockedBy: 'OwnerPadlock', LockMemberNumber: FREMD, Effect: ['Lock'] });
    const g = makeGame();
    g.game.Player.FriendNames = new Map([[4711, 'Freundin']]);
    expect(g.plain(t.fix(g)('ItemNeck', 'Collar', OWNER_LOCK())).LockMemberName).toBe('Freundin');
    const g2 = makeGame();
    expect(g2.plain(t.fix(g2)('ItemNeck', 'Collar', OWNER_LOCK()))).toMatchObject({ LockedBy: 'OwnerPadlock', LockMemberNumber: 4711, LockMemberName: 'Bekannte' });
    evalIn(t.c, "lockSetzerSet('nummer', '4711', '')");
    const g3 = makeGame();
    expect(g3.plain(t.fix(g3)('ItemNeck', 'Collar', OWNER_LOCK())).LockMemberName).toBe('#4711');
  });

  it('"Neuer Setzer" gibt es nur bei Owner und Lover – nicht bei Exklusiv, Schlüssel, Code, Mod oder "Alle"', () => {
    const t = frisch();
    for (const k of ['exklusiv', 'schluessel', 'code', 'mod', 'mod:DeviousPadlock']) evalIn(t.c, `lockRuleSet('${k}','setzer')`);
    evalIn(t.c, "lockRuleSetAll('setzer')");
    const regeln = JSON.parse(JSON.stringify(evalIn(t.c, '_lockRules')));
    expect(Object.values(regeln).includes('setzer')).toBe(false);
    evalIn(t.c, "lockRuleSet('lover','setzer'); _lockRulesRender()");
    const html = t.els.lockRulesBox.innerHTML;
    expect((html.match(/>Neuer Setzer</g) || []).length).toBe(2);   // Owner- und Lover-Zeile
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
    const g = makeGame();
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
