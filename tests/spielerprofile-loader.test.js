import { describe, it, expect, vi } from 'vitest';
import { makeLoaderSandbox, LOADER_TOOL_ORIGIN } from './helpers/loaderSandbox.js';

// Spielerprofile (Loader im Spiel-Tab): GET_SPIELER_PROFILE liest alles Auslesbare der Spieler im Raum, wandelt es in reine Daten um
// und erkennt Mods an versteckten Nachrichten und Merkmalen. Nur lesen – es wird nichts gesendet oder verändert.

function boot({ chars = [], ich, raum = 'Testraum', mods } = {}) {
  const handler = {};
  const intervals = [];
  const ServerSocket = { on(ev, cb) { (handler[ev] ||= []).push(cb); }, off() {}, emit() {} };
  const Player = ich || { MemberNumber: 100, Name: 'Ich', Nickname: 'Ichi', Appearance: [] };
  const bcModSdk = {
    registerMod: () => ({ hookFunction() {}, patchFunction() {}, removeHook() {} }),
    getModsInfo: () => mods || [{ name: 'BCX', fullName: 'Bondage Club Extended', version: '1.2.3' }],
  };
  const sb = makeLoaderSandbox({
    withBcModSdk: false, withModGlobals: false,
    extraGlobals: { ServerSocket, Player, ChatRoomCharacter: chars, ChatRoomData: raum ? { Name: raum } : null, bcModSdk, GameVersion: 'R132',
      setInterval: (fn) => { intervals.push(fn); return intervals.length; }, clearInterval() {} },
  });
  const frage = () => {
    sb.posts.length = 0;
    sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r1' });
    return sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA');
  };
  return { sb, handler, intervals, frage, Player };
}
const spieler = (nr, extra = {}) => ({ MemberNumber: nr, Name: 'Name' + nr, Appearance: [], ...extra });

describe('Spielerprofile (Loader): GET_SPIELER_PROFILE', () => {
  it('antwortet an den Tool-Origin mit allen Spielern im Raum und dir selbst', () => {
    const t = boot({ chars: [spieler(5, { Nickname: 'Fünf' }), spieler(6)] });
    const a = t.frage();
    expect(a.origin).toBe(LOADER_TOOL_ORIGIN);
    expect(a.msg.reqId).toBe('r1');
    expect(a.msg.room).toBe('Testraum');
    expect(a.msg.gameVersion).toBe('R132');
    expect(a.msg.results.map((r) => r.nr).sort((x, y) => x - y)).toEqual([5, 6, 100]);
    const fuenf = a.msg.results.find((r) => r.nr === 5);
    expect(fuenf.nickname).toBe('Fünf');
    expect(a.msg.results.find((r) => r.nr === 100).istIch).toBe(true);
  });

  it('außerhalb eines Raums kommst du trotzdem dran', () => {
    const t = boot({ chars: [], raum: null });
    const a = t.frage();
    expect(a.msg.results.map((r) => r.nr)).toEqual([100]);
    expect(a.msg.room).toBeNull();
  });

  it('fremder Origin bekommt keine Antwort', () => {
    const t = boot({ chars: [spieler(5)] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE' }, { origin: 'https://evil.test' });
    expect(t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA')).toBeUndefined();
  });

  it('liest Beschreibung, Titel, Besitzer, Lover, Konto-Alter, Pronomen, Crafts und geteilte Einstellungen', () => {
    const t = boot({ chars: [spieler(5, {
      Description: 'Hallo!\nIch bin Mia.', Title: 'Kätzchen', Creation: 1700000000000,
      Ownership: { MemberNumber: 9, Name: 'Herrin', Start: 1710000000000, Stage: 1 },
      Lovership: [{ MemberNumber: 7, Name: 'Schatz', Start: 1720000000000, Stage: 2 }],
      Difficulty: { Level: 2 }, ItemPermission: 3,
      OnlineSharedSettings: { GameVersion: 'R132', MBS: 'abc', BlockBodyCosplay: true },
      Appearance: [{ Asset: { Name: 'SheHer', Group: { Name: 'Pronouns' } } }, { Asset: { Name: 'Dress', Group: { Name: 'Cloth' } } }],
      Crafting: [{ Item: 'Collar', Name: 'Mein Halsband', Description: 'weich', Property: 'Normal' }, null],
    })] });
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    expect(r.beschreibung).toBe('Hallo!\nIch bin Mia.');
    expect(r.titel).toBe('Kätzchen');
    expect(r.erstellt).toBe(1700000000000);
    expect(r.besitzer).toEqual({ nr: 9, name: 'Herrin', seit: 1710000000000, stufe: 1 });
    expect(r.lover).toEqual([{ nr: 7, name: 'Schatz', seit: 1720000000000, stufe: 2 }]);
    expect(r.schwierigkeit).toBe(2);
    expect(r.itemPermission).toBe(3);
    expect(r.spielVersion).toBe('R132');
    expect(r.geteilt).toEqual(['GameVersion', 'MBS', 'BlockBodyCosplay']);
    expect(r.pronomen).toBe('SheHer');
    expect(r.items).toBe(2);
    expect(r.crafts).toEqual([{ name: 'Mein Halsband', item: 'Collar', beschreibung: 'weich', eigenschaft: 'Normal' }]);
  });

  it('Besitzer nur als Name (alter Datenstand) und fehlende Felder werden still ausgelassen', () => {
    const t = boot({ chars: [spieler(5, { Owner: 'Altbesitzerin' })] });
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    expect(r.besitzer).toEqual({ nr: null, name: 'Altbesitzerin', seit: null, stufe: null });
    expect(r.beschreibung).toBeNull();
    expect(r.lover).toEqual([]);
    expect(r.crafts).toEqual([]);
  });
});

describe('Spielerprofile (Loader): Daten sicher machen', () => {
  it('Kreisverweise, Funktionen, Knoten, Zeichenpuffer und Aussehen kommen nicht mit; die Antwort ist per structuredClone verschickbar', () => {
    const kreis = { a: 1 }; kreis.selbst = kreis;
    const t = boot({ chars: [spieler(5, {
      Kreis: kreis, Funktion: () => 1, Knoten: { nodeType: 1 }, Canvas: { width: 5 }, Inventory: [1, 2, 3], Wardrobe: [1],
      Einfach: { x: 1, y: [1, 2, { z: 'ok' }] },
    })] });
    const a = t.frage();
    expect(() => structuredClone(a.msg)).not.toThrow();
    const roh = a.msg.results.find((x) => x.nr === 5).roh;
    expect(roh.Einfach).toEqual({ x: 1, y: [1, 2, { z: 'ok' }] });
    expect(roh.Kreis).toEqual({ a: 1 });
    expect('Funktion' in roh).toBe(false);
    expect('Knoten' in roh).toBe(false);
    for (const k of ['Canvas', 'Inventory', 'Wardrobe', 'Appearance']) expect(k in roh).toBe(false);
  });

  it('riesige Listen und zu tiefe Verschachtelung werden begrenzt und als gekürzt gemeldet', () => {
    let tief = { ende: true };
    for (let i = 0; i < 12; i++) tief = { n: tief };
    const t = boot({ chars: [spieler(5, { Gross: Array.from({ length: 5000 }, (_, i) => i), Tief: tief })] });
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    expect(r.gekuerzt).toBe(true);
    expect(r.roh.Gross.length).toBeLessThanOrEqual(100);
  });

  it('zu große Rohdaten werden durch einen Hinweis ersetzt – die ausgeschriebenen Felder (Beschreibung …) bleiben', () => {
    const viel = {};
    for (let i = 0; i < 70; i++) viel['k' + i] = 'x'.repeat(2000);
    const t = boot({ chars: [spieler(5, { Description: 'bleibt', Viel: viel })] });
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    expect(r.beschreibung).toBe('bleibt');
    expect(r.gekuerzt).toBe(true);
    expect(JSON.stringify(r.roh)).toContain('zu groß');
  });

  it('ein Spieler, dessen Daten beim Lesen werfen, reißt die anderen nicht mit', () => {
    const kaputt = spieler(5);
    Object.defineProperty(kaputt, 'Name', { get() { throw new Error('boom'); }, enumerable: true });
    const t = boot({ chars: [kaputt, spieler(6)] });
    const a = t.frage();
    expect(a.msg.err).toBeUndefined();
    expect(a.msg.results.map((r) => r.nr)).toContain(6);
  });

  it('die Beschreibung wird bei 30000 Zeichen gekappt', () => {
    const t = boot({ chars: [spieler(5, { Description: 'a'.repeat(40000) })] });
    expect(t.frage().msg.results.find((x) => x.nr === 5).beschreibung.length).toBe(30000);
  });
});

describe('Spielerprofile (Loader): Mods erkennen', () => {
  it('versteckte Nachrichten verraten den Mod – nur Name, Zeiten und Version, nie der Inhalt', () => {
    const t = boot({ chars: [spieler(5)] });
    const hoerer = t.handler.ChatRoomMessage[0];
    hoerer({ Type: 'Hidden', Sender: 5, Content: 'BCEMsg', Dictionary: { version: '5.1' } });
    hoerer({ Type: 'Hidden', Sender: 5, Content: 'LSCGMsg {"geheim":"streng"}', Dictionary: [{ message: { v: 3 } }] });
    hoerer({ Type: 'Chat', Sender: 5, Content: 'normaler Chat' });            // kein Mod
    hoerer({ Type: 'Hidden', Sender: 'x', Content: 'Quatsch' });               // kein gültiger Absender
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    const namen = r.mods.map((m) => m.name).sort();
    expect(namen).toEqual(['BCEMsg', 'LSCGMsg']);
    expect(r.mods.find((m) => m.name === 'BCEMsg').version).toBe('5.1');
    expect(r.mods.find((m) => m.name === 'LSCGMsg').version).toBe('3');
    expect(typeof r.mods[0].erstmals).toBe('number');
    expect(JSON.stringify(r)).not.toContain('streng');
    expect(JSON.stringify(r)).not.toContain('normaler Chat');
  });

  it('Merkmale am Charakter: LSCG, FBC (mit Version), MBS', () => {
    const t = boot({ chars: [spieler(5, { LSCG: { x: 1 }, FBC: '5.2', OnlineSharedSettings: { MBS: 'z' } })] });
    const r = t.frage().msg.results.find((x) => x.nr === 5);
    const m = Object.fromEntries(r.mods.map((x) => [x.name, x]));
    expect(Object.keys(m).sort()).toEqual(['FBC', 'LSCG', 'MBS']);
    expect(m.FBC.version).toBe('5.2');
    expect(m.LSCG.quelle).toBe('Charakterdaten');
  });

  it('bei dir selbst kommen die Mods aus ModSDK (Name + Version)', () => {
    const t = boot({ chars: [] });
    const ich = t.frage().msg.results.find((x) => x.istIch);
    expect(ich.mods).toEqual([{ name: 'Bondage Club Extended', quelle: 'ModSDK', version: '1.2.3' }].map((x) => expect.objectContaining({ ...x, name: 'BCX' })));
  });

  it('nach einem Relog (neues Socket) hört der Loader am neuen Socket weiter – und nicht doppelt', () => {
    const t = boot({ chars: [spieler(5)] });
    const neu = { handlers: {}, on(ev, cb) { (this.handlers[ev] ||= []).push(cb); }, off() {}, emit() {} };
    t.sb.ctx.ServerSocket = neu;
    t.intervals.forEach((f) => f());
    expect(neu.handlers.ChatRoomMessage).toHaveLength(1);
    t.intervals.forEach((f) => f());
    expect(neu.handlers.ChatRoomMessage).toHaveLength(1);
    neu.handlers.ChatRoomMessage[0]({ Type: 'Hidden', Sender: 5, Content: 'DOGS' });
    expect(t.frage().msg.results.find((x) => x.nr === 5).mods.map((m) => m.name)).toEqual(['DOGS']);
  });
});
