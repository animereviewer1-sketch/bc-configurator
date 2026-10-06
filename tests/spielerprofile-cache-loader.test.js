import { describe, it, expect } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import LZString from 'lz-string';
import { makeLoaderSandbox, LOADER_TOOL_ORIGIN } from './helpers/loaderSandbox.js';

// Spielerprofile (Loader im Spiel-Tab), Teil 2: der Profil-Speicher von WCE/FBC ("/profiles", Datenbank "bce-past-profiles") wird
// NUR gelesen, und Bilder entstehen entweder aus dem Zeichenpuffer eines Spielers im Raum oder aus dem gespeicherten Profil.

const DB_NAME = 'bce-past-profiles';

// WCE/FBC legt die Datenbank mit Version 31 an: Speicher "profiles" und "notes", Schlüssel memberNumber
function wceDatenbank(factory, profile = [], notizen = []) {
  return new Promise((resolve, reject) => {
    const rq = factory.open(DB_NAME, 31);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      db.createObjectStore('profiles', { keyPath: 'memberNumber' });
      db.createObjectStore('notes', { keyPath: 'memberNumber' });
    };
    rq.onsuccess = () => {
      const db = rq.result;
      const tx = db.transaction(['profiles', 'notes'], 'readwrite');
      profile.forEach((p) => tx.objectStore('profiles').put(p));
      notizen.forEach((n) => tx.objectStore('notes').put(n));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    rq.onerror = () => reject(rq.error);
  });
}
const bundle = (nr, extra = {}) => ({
  ID: 1000 + nr, MemberNumber: nr, Name: 'Name' + nr, Nickname: 'Nick' + nr, Description: 'Beschreibung ' + nr, Title: 'Kätzchen',
  Creation: 1700000000000, Difficulty: { Level: 1 }, ItemPermission: 2,
  Ownership: { MemberNumber: 9, Name: 'Herrin', Start: 1710000000000, Stage: 1 },
  Lovership: [{ MemberNumber: 7, Name: 'Schatz', Start: 1720000000000, Stage: 2 }],
  Appearance: [{ Group: 'Pronouns', Name: 'SheHer' }, { Group: 'Cloth', Name: 'Dress' }],
  ...extra,
});
const zeile = (nr, seen, extra = {}, b = bundle(nr)) => ({ memberNumber: nr, name: 'Name' + nr, lastNick: 'Nick' + nr, seen, characterBundle: JSON.stringify(b), ...extra });

// Ein einfacher Zeichenpuffer: alpha > 0 in einem Rechteck, damit der Zuschnitt etwas findet
function leinwand(w = 500, h = 1000, mitFigur = true) {
  const data = new Uint8ClampedArray(w * h * 4);
  if (mitFigur) for (let y = 200; y < 900; y++) for (let x = 150; x < 350; x++) { const i = (y * w + x) * 4; data[i] = 200; data[i + 3] = 255; }
  return { width: w, height: h, __data: data, getContext: () => ({ drawImage() {}, getImageData: () => ({ data }) }) };
}

// Ein Platzhalter für document.createElement('canvas'): drawImage(quelle, 0, 0) übernimmt die Pixel der Quelle
function neuerPuffer() {
  const c = {
    width: 0, height: 0, _data: null,
    getContext() {
      return {
        drawImage(src) { if (arguments.length === 3 && src && src.__data) c._data = src.__data; },
        fillRect() {},
        getImageData: () => ({ data: c._data || new Uint8ClampedArray(Math.max(1, c.width * c.height * 4)) }),
      };
    },
    toDataURL: (typ, q) => { c.typ = typ; c.qualitaet = q; return 'data:image/jpeg;base64,QUJD'; },
  };
  erzeugt.push(c);
  return c;
}
const erzeugt = [];   // alle im Test angelegten Zeichenpuffer (zum Prüfen von Größe und Qualität des fertigen Bildes)

function boot({ factory = new IDBFactory(), chars = [], character = [], mitCharacterLoadOnline = null, extra = {} } = {}) {
  const Player = { MemberNumber: 100, Name: 'Ich', Appearance: [], AssetFamily: 'Female3DCG', Canvas: leinwand() };
  const geladen = [];
  const globals = {
    ServerSocket: { on() {}, off() {}, emit() {} }, Player, ChatRoomCharacter: chars, ChatRoomData: { Name: 'Testraum' },
    GameVersion: 'R132', indexedDB: factory, IDBKeyRange, Character: character, LZString,
    setInterval: () => 0, clearInterval() {},
    ...extra,
  };
  if (mitCharacterLoadOnline) {
    globals.CharacterLoadOnline = (data, nr) => { geladen.push({ data, nr }); const C = mitCharacterLoadOnline(data, nr); if (C) character.push(C); return C; };
    globals.CharacterRefresh = () => {};
    globals.CharacterLoadCanvas = () => {};
  }
  const sb = makeLoaderSandbox({ withBcModSdk: false, withModGlobals: false, extraGlobals: globals });
  // Die Zeichenpuffer, die das Bild-Ergebnis anlegt, sind im Test Platzhalter
  sb.ctx.document.createElement = (tag) => (tag === 'canvas' ? neuerPuffer() : {});
  return { sb, factory, Player, geladen, character };
}

// Alle Nachrichten eines Typs, bis eine mit fertig:true / ohne Stapel eintrifft
async function frageCache(t, seit, reqId = 'c1') {
  t.sb.posts.length = 0;
  t.sb.send({ type: 'GET_SPIELER_CACHE', reqId, seit });
  await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.type === 'SPIELER_CACHE_DATA' && (p.msg.fertig || p.msg.err)), 5000);
  return t.sb.posts.filter((p) => p.msg.type === 'SPIELER_CACHE_DATA').map((p) => p.msg);
}
const alleErgebnisse = (nachrichten) => nachrichten.flatMap((m) => m.results || []);

describe('Spielerprofile (Loader): WCE/FBC-Profilspeicher lesen', () => {
  it('liest Profile und Notizen und macht daraus dieselben Felder wie ein Raum-Scan – ohne Rohdaten', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(5, 1750000000000), zeile(6, 1760000000000)], [{ memberNumber: 5, note: 'Nette Person', updatedAt: 1755000000000 }]);
    const t = boot({ factory });
    const n = await frageCache(t, 0);
    const r5 = alleErgebnisse(n).find((x) => x.nr === 5);
    expect(r5.name).toBe('Name5');
    expect(r5.nickname).toBe('Nick5');
    expect(r5.beschreibung).toBe('Beschreibung 5');
    expect(r5.titel).toBe('Kätzchen');
    expect(r5.erstellt).toBe(1700000000000);
    expect(r5.besitzer).toEqual({ nr: 9, name: 'Herrin', seit: 1710000000000, stufe: 1 });
    expect(r5.lover).toEqual([{ nr: 7, name: 'Schatz', seit: 1720000000000, stufe: 2 }]);
    expect(r5.pronomen).toBe('SheHer');
    expect(r5.items).toBe(2);
    expect(r5.gesehen).toBe(1750000000000);
    expect(r5.notiz).toBe('Nette Person');
    expect(r5.notizTs).toBe(1755000000000);
    expect('roh' in r5).toBe(false);
    expect(alleErgebnisse(n).find((x) => x.nr === 6).notiz).toBeUndefined();
    const letzte = n.at(-1);
    expect(letzte.fertig).toBe(true);
    expect(letzte.gesamt).toBe(2);
    expect(letzte.maxSeen).toBe(1760000000000);
  });

  it('antwortet an den Tool-Origin, jede Nachricht trägt die reqId; fremder Origin bekommt nichts', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(5, 10)]);
    const t = boot({ factory });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_CACHE', reqId: 'x' }, { origin: 'https://evil.test' });
    await new Promise((r) => setTimeout(r, 50));
    expect(t.sb.posts.filter((p) => p.msg.type === 'SPIELER_CACHE_DATA')).toHaveLength(0);
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_CACHE', reqId: 'x1', seit: 0 });
    await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.fertig), 5000);
    for (const p of t.sb.posts.filter((q) => q.msg.type === 'SPIELER_CACHE_DATA')) {
      expect(p.origin).toBe(LOADER_TOOL_ORIGIN);
      expect(p.msg.reqId).toBe('x1');
    }
  });

  it('"seit": nur Profile, die danach neu gesehen wurden', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(5, 100), zeile(6, 200), zeile(7, 300)]);
    const t = boot({ factory });
    const n = await frageCache(t, 150);
    expect(alleErgebnisse(n).map((x) => x.nr)).toEqual([6, 7]);
    expect(n.at(-1).gelesen).toBe(3);
    expect(n.at(-1).maxSeen).toBe(300);
  });

  it('viele Profile kommen in Stapeln, und es geht keins verloren', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, Array.from({ length: 150 }, (_, i) => zeile(i + 1, 1000 + i)));
    const t = boot({ factory });
    const n = await frageCache(t, 0);
    expect(n.filter((m) => !m.fertig).length).toBeGreaterThanOrEqual(3);
    expect(alleErgebnisse(n).map((x) => x.nr).sort((a, b) => a - b)).toEqual(Array.from({ length: 150 }, (_, i) => i + 1));
    expect(() => structuredClone(n)).not.toThrow();
  });

  it('ein unlesbares gespeichertes Profil liefert trotzdem einen Eintrag mit Namen und Nummer', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [{ memberNumber: 8, name: 'Kaputt', lastNick: 'Kapi', seen: 5, characterBundle: '{nicht json' }]);
    const t = boot({ factory });
    const r = alleErgebnisse(await frageCache(t, 0)).find((x) => x.nr === 8);
    expect(r.name).toBe('Kaputt');
    expect(r.nickname).toBe('Kapi');
    expect(r.gesehen).toBe(5);
  });

  it('ohne WCE/FBC-Datenbank: Hinweis statt Fehler – und die Datenbank wird NICHT angelegt', async () => {
    const factory = new IDBFactory();
    const t = boot({ factory });
    const n = await frageCache(t, 0);
    expect(n).toHaveLength(1);
    expect(n[0].vorhanden).toBe(false);
    expect(n[0].fertig).toBe(true);
    expect((await factory.databases()).map((d) => d.name)).not.toContain(DB_NAME);
  });

  it('nennt ähnlich benannte Datenbanken, wenn die erwartete fehlt', async () => {
    const factory = new IDBFactory();
    await new Promise((res) => { const rq = factory.open('fbc-profile-test', 1); rq.onsuccess = () => { rq.result.close(); res(); }; });
    const t = boot({ factory });
    const n = await frageCache(t, 0);
    expect(n[0].vorhanden).toBe(false);
    expect(n[0].andere).toContain('fbc-profile-test');
  });

  it('die Datenbank bleibt beim Lesen unverändert (Version und Inhalt)', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(5, 10), zeile(6, 20)], [{ memberNumber: 5, note: 'x', updatedAt: 1 }]);
    const vorher = (await factory.databases()).find((d) => d.name === DB_NAME);
    const t = boot({ factory });
    await frageCache(t, 0);
    await frageCache(t, 0, 'c2');
    const nachher = (await factory.databases()).find((d) => d.name === DB_NAME);
    expect(nachher.version).toBe(vorher.version);
    const t2 = boot({ factory });
    expect(alleErgebnisse(await frageCache(t2, 0)).map((x) => x.nr)).toEqual([5, 6]);
  });

  it('läuft schon eines, kommt ein Hinweis statt einer zweiten Lesung', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, Array.from({ length: 200 }, (_, i) => zeile(i + 1, 10)));
    const t = boot({ factory });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_CACHE', reqId: 'a', seit: 0 });
    t.sb.send({ type: 'GET_SPIELER_CACHE', reqId: 'b', seit: 0 });
    await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.reqId === 'a' && p.msg.fertig), 5000);
    expect(t.sb.posts.some((p) => p.msg.reqId === 'b' && p.msg.err)).toBe(true);
    expect(t.sb.posts.filter((p) => p.msg.reqId === 'b' && p.msg.results)).toHaveLength(0);
  });
});

describe('Spielerprofile (Loader): Beschreibung und erlaubte Interaktionen', () => {
  const MAGIC = String.fromCharCode(9580);
  const LANG = 'Hallo, willkommen in meiner Beschreibung!\n' + '-'.repeat(60) + '\nBackstory: ' + 'Schnee '.repeat(40) + ' https://i.imgur.com/abc.png';

  it('eine komprimierte Beschreibung ("╬" + LZString) aus dem WCE/FBC-Speicher wird entpackt', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(5, 10, {}, bundle(5, { Description: MAGIC + LZString.compressToUTF16(LANG) }))]);
    const t = boot({ factory });
    const r = alleErgebnisse(await frageCache(t, 0)).find((x) => x.nr === 5);
    expect(r.beschreibung).toBe(LANG);
  });

  it('ein Spieler im Raum: komprimiert oder schon entpackt – beides ergibt den lesbaren Text', () => {
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Description: MAGIC + LZString.compressToUTF16(LANG) }, { MemberNumber: 6, Name: 'B', Appearance: [], Description: 'schon lesbar' }] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r' });
    const a = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg;
    expect(a.results.find((r) => r.nr === 5).beschreibung).toBe(LANG);
    expect(a.results.find((r) => r.nr === 6).beschreibung).toBe('schon lesbar');
  });

  it('lässt sich nichts entpacken (kein LZString), bleibt der Text unverändert', async () => {
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Description: MAGIC + 'abc' }], extra: { LZString: undefined } });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r' });
    expect(t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg.results.find((r) => r.nr === 5).beschreibung).toBe(MAGIC + 'abc');
  });

  it('"Erlaubte Interaktionen": das Feld heißt in neueren Spielversionen AllowedInteractions (früher ItemPermission)', async () => {
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], AllowedInteractions: 1 }, { MemberNumber: 6, Name: 'B', Appearance: [], ItemPermission: 3 }, { MemberNumber: 7, Name: 'C', Appearance: [] }] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r' });
    const a = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg;
    expect(a.results.find((r) => r.nr === 5).itemPermission).toBe(1);
    expect(a.results.find((r) => r.nr === 6).itemPermission).toBe(3);
    expect(a.results.find((r) => r.nr === 7).itemPermission).toBeNull();
    // auch im gespeicherten Profil
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(8, 10, {}, bundle(8, { AllowedInteractions: 0 }))]);
    const t2 = boot({ factory });
    expect(alleErgebnisse(await frageCache(t2, 0)).find((x) => x.nr === 8).itemPermission).toBe(0);
  });
});

describe('Spielerprofile (Loader): Bildgröße wie bei den Screenshots', () => {
  it('die Figur wird nicht verkleinert, solange sie in 520×1040 passt; JPEG mit Qualität 0,88; V2 wird gemeldet', () => {
    erzeugt.length = 0;
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Canvas: leinwand() }] });
    erzeugt.length = 0;
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r', fehlt: [5] });
    const a = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg;
    expect(a.bildV).toBe(2);
    expect(a.results.find((r) => r.nr === 5).bild.v).toBe(2);
    const fertig = erzeugt.filter((c) => c.qualitaet !== undefined).at(-1);
    expect(fertig.typ).toBe('image/jpeg');
    expect(fertig.qualitaet).toBe(0.88);
    // Figur 200×700 plus je 10 Rand = 220×720: bleibt in Originalgröße (früher auf 180×360 verkleinert)
    expect([fertig.width, fertig.height]).toEqual([220, 720]);
  });

  it('ist die Figur größer als 520×1040, wird sie proportional verkleinert', () => {
    const gross = leinwand(1200, 2400);
    const data = gross.__data;
    for (let y = 100; y < 2300; y++) for (let x = 100; x < 1100; x++) { const i = (y * 1200 + x) * 4; data[i] = 200; data[i + 3] = 255; }
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Canvas: gross }] });
    erzeugt.length = 0;
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r', fehlt: [5] });
    const fertig = erzeugt.filter((c) => c.qualitaet !== undefined).at(-1);
    expect(fertig.width).toBeLessThanOrEqual(520);
    expect(fertig.height).toBeLessThanOrEqual(1040);
    expect(Math.abs(fertig.width / fertig.height - 1020 / 2220)).toBeLessThan(0.01);
  });
});

describe('Spielerprofile (Loader): Bilder im Raum (GET_SPIELER_PROFILE mit "fehlt")', () => {
  const spieler = (nr) => ({ MemberNumber: nr, Name: 'Name' + nr, Appearance: [], Canvas: leinwand() });

  it('nur für die Spieler, die das Tool ohne Bild führt, und nur wenn sie im Raum sind', () => {
    const t = boot({ chars: [spieler(5), spieler(6)] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r', fehlt: [5, 77] });
    const a = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg;
    expect(a.results.find((r) => r.nr === 5).bild.img).toMatch(/^data:image\/jpeg;base64,/);
    expect(a.results.find((r) => r.nr === 5).bild.stabil).toBe(true);
    expect(a.results.find((r) => r.nr === 6).bild).toBeUndefined();
    expect(a.results.find((r) => r.nr === 100).bild).toBeUndefined();
    expect(() => structuredClone(a)).not.toThrow();
  });

  it('ohne "fehlt" keine Bilder (wie bisher)', () => {
    const t = boot({ chars: [spieler(5)] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r' });
    expect(t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg.results.every((r) => r.bild === undefined)).toBe(true);
  });

  it('ein leerer Zeichenpuffer ergibt kein Bild – das Profil kommt trotzdem', () => {
    const leer = { MemberNumber: 5, Name: 'Leer', Appearance: [], Canvas: leinwand(500, 1000, false) };
    const t = boot({ chars: [leer] });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r', fehlt: [5] });
    const r = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg.results.find((x) => x.nr === 5);
    expect(r.name).toBe('Leer');
    expect(r.bild).toBeUndefined();
  });

  it('höchstens 40 Bilder je Auslesen', () => {
    const viele = Array.from({ length: 60 }, (_, i) => spieler(i + 1));
    const t = boot({ chars: viele });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_PROFILE', reqId: 'r', fehlt: viele.map((c) => c.MemberNumber) });
    const a = t.sb.posts.find((p) => p.msg.type === 'SPIELER_PROFILE_DATA').msg;
    expect(a.results.filter((r) => r.bild).length).toBe(40);
  });
});

describe('Spielerprofile (Loader): Bremsen gegen Speichermangel im Spiel-Tab', () => {
  async function bilderAnfrage(t, nrs, reqId) {
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_BILDER', reqId, nrs });
    await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.type === 'SPIELER_BILDER_DATA' && p.msg.reqId === reqId), 8000);
    return t.sb.posts.find((p) => p.msg.type === 'SPIELER_BILDER_DATA' && p.msg.reqId === reqId).msg;
  }
  const mitProfilen = async (n) => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, Array.from({ length: n }, (_, i) => zeile(i + 1, 10)));
    return factory;
  };

  it('ist der JavaScript-Speicher zu über 70 % voll, wird VOR dem nächsten Profil angehalten – mit klarer Meldung, ohne Fehler zu erfinden', async () => {
    const factory = await mitProfilen(3);
    const t = boot({ factory, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }), extra: { performance: { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 800 } } } });
    const a = await bilderAnfrage(t, [1, 2, 3], 'm1');
    expect(a.bilder).toEqual([]);
    expect(a.fehler).toEqual([]);                          // niemand wird als „fehlgeschlagen“ vermerkt
    expect(a.stopp).toMatch(/Speicher des Spiel-Tabs ist fast voll/);
    expect(t.geladen).toHaveLength(0);                     // es wurde nichts mehr gezeichnet
  });

  it('bei genug Speicher läuft alles; Spieler im Raum zählen nicht zur Grenze und werden auch bei vollem Speicher aufgenommen', async () => {
    const factory = await mitProfilen(2);
    const t = boot({ factory, chars: [{ MemberNumber: 50, Name: 'Raum', Appearance: [], Canvas: leinwand() }],
      mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }), extra: { performance: { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 100 } } } });
    const a = await bilderAnfrage(t, [1, 2], 'm2');
    expect(a.bilder.map((b) => b.nr)).toEqual([1, 2]);
    expect(a.stopp).toBeNull();
    const voll = boot({ chars: [{ MemberNumber: 50, Name: 'Raum', Appearance: [], Canvas: leinwand() }], extra: { performance: { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 990 } } } });
    const b = await bilderAnfrage(voll, [50], 'm3');
    expect(b.bilder.map((x) => x.nr)).toEqual([50]);        // ein Spieler im Raum braucht nichts nachzuladen
    expect(b.stopp).toBeNull();
  });

  it('je Seitenaufruf werden höchstens 250 Profile gezeichnet; danach Stopp mit Hinweis, dass der BC-Tab neu geladen werden muss', async () => {
    const factory = await mitProfilen(6);
    const t = boot({ factory, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }) });
    t.sb.ctx.__BCK_SP_RENDER_N = 248;
    const a = await bilderAnfrage(t, [1, 2, 3, 4], 'm4');
    expect(a.bilder.map((b) => b.nr)).toEqual([1, 2]);      // 249 und 250
    expect(a.stopp).toMatch(/Grenze von 250/);
    expect(a.stopp).toMatch(/BC-Tab neu laden/);
    expect(t.sb.ctx.__BCK_SP_RENDER_N).toBe(250);
    expect(a.fehler).toEqual([]);
    const b = await bilderAnfrage(t, [3], 'm5');             // gleich wieder: gleiche Grenze
    expect(b.bilder).toEqual([]);
    expect(b.stopp).toMatch(/Grenze/);
  });

  it('ohne Speicherangabe des Browsers (kein performance.memory) läuft es normal', async () => {
    const factory = await mitProfilen(1);
    const t = boot({ factory, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }), extra: { performance: {} } });
    const a = await bilderAnfrage(t, [1], 'm6');
    expect(a.bilder).toHaveLength(1);
    expect(a.stopp).toBeNull();
  });
});

describe('Spielerprofile (Loader): GET_SPIELER_BILDER', () => {
  async function bilder(t, nrs, reqId = 'b1') {
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_BILDER', reqId, nrs });
    await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.type === 'SPIELER_BILDER_DATA' && p.msg.reqId === reqId), 8000);
    return t.sb.posts.find((p) => p.msg.type === 'SPIELER_BILDER_DATA' && p.msg.reqId === reqId);
  }

  it('Spieler im Raum: das Bild kommt aus seinem Zeichenpuffer', async () => {
    const t = boot({ chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Canvas: leinwand() }] });
    const a = await bilder(t, [5]);
    expect(a.origin).toBe(LOADER_TOOL_ORIGIN);
    expect(a.msg.bilder).toEqual([{ nr: 5, img: expect.stringMatching(/^data:image\/jpeg;base64,/), stabil: true, quelle: 'raum', v: 2 }]);
    expect(a.msg.bildV).toBe(2);
    expect(a.msg.fehler).toEqual([]);
  });

  it('Spieler aus dem Profilspeicher: wird mit einer EIGENEN Kennung geladen, gezeichnet und wieder aus der Charakterliste genommen', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(42, 10, {}, bundle(42, { ID: 4242 }))]);
    const echteFigur = { MemberNumber: 1, AccountName: 'Online-1' };
    const character = [echteFigur];
    const t = boot({ factory, character, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, AccountName: 'Online-' + data.ID, Canvas: leinwand(), data }) });
    const a = await bilder(t, [42]);
    expect(a.msg.bilder).toHaveLength(1);
    expect(a.msg.bilder[0]).toMatchObject({ nr: 42, quelle: 'cache', stabil: true });
    expect(t.geladen).toHaveLength(1);
    expect(t.geladen[0].data.ID).toBe('bcu-bild-42');       // nicht die echte Kennung → kein echter Charakter wird berührt
    expect(t.geladen[0].data.MemberNumber).toBe(42);
    expect(t.geladen[0].nr).toBe(42);
    expect(character).toEqual([echteFigur]);                  // aufgeräumt
  });

  it('zum Aufräumen wird bevorzugt CharacterDelete des Spiels benutzt', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(42, 10)]);
    const character = [];
    const geloescht = [];
    const t = boot({ factory, character, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }),
      extra: { CharacterDelete: (C) => { geloescht.push(C.MemberNumber); const i = character.indexOf(C); if (i >= 0) character.splice(i, 1); } } });
    const a = await bilder(t, [42]);
    expect(a.msg.bilder).toHaveLength(1);
    expect(geloescht).toEqual([42]);
    expect(character).toEqual([]);
  });

  it('wirft das Zeichnen einen Fehler, wird auch dann aufgeräumt, und der Fehler wird gemeldet', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(42, 10)]);
    const character = [];
    const t = boot({ factory, character, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand(500, 1000, false) }) });
    const a = await bilder(t, [42]);
    expect(a.msg.bilder).toEqual([]);
    expect(a.msg.fehler).toEqual([{ nr: 42, grund: 'Der Zeichenpuffer ist leer' }]);
    expect(character).toEqual([]);
  });

  it('in dieser BC-Version ohne CharacterLoadOnline: klare Meldung statt Absturz', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(42, 10)]);
    const t = boot({ factory });
    const a = await bilder(t, [42]);
    expect(a.msg.fehler[0].nr).toBe(42);
    expect(a.msg.fehler[0].grund).toMatch(/CharacterLoadOnline/);
  });

  it('weder im Raum noch im Profilspeicher: Fehler für genau diesen Spieler, die anderen kommen durch', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, []);
    const t = boot({ factory, chars: [{ MemberNumber: 5, Name: 'A', Appearance: [], Canvas: leinwand() }] });
    const a = await bilder(t, [5, 999]);
    expect(a.msg.bilder.map((b) => b.nr)).toEqual([5]);
    expect(a.msg.fehler).toEqual([{ nr: 999, grund: 'Nicht im Profilspeicher' }]);
  });

  it('ohne Profilspeicher und nicht im Raum: Fehler mit Hinweis', async () => {
    const t = boot({});
    const a = await bilder(t, [999]);
    expect(a.msg.fehler[0].grund).toMatch(/WCE\/FBC/);
  });

  it('höchstens 10 Spieler je Anfrage; fremder Origin bekommt nichts', async () => {
    const chars = Array.from({ length: 15 }, (_, i) => ({ MemberNumber: i + 1, Name: 'N', Appearance: [], Canvas: leinwand() }));
    const t = boot({ chars });
    const a = await bilder(t, chars.map((c) => c.MemberNumber));
    expect(a.msg.bilder.length + a.msg.fehler.length).toBe(10);
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_BILDER', reqId: 'z', nrs: [1] }, { origin: 'https://evil.test' });
    await new Promise((r) => setTimeout(r, 40));
    expect(t.sb.posts.filter((p) => p.msg.type === 'SPIELER_BILDER_DATA')).toHaveLength(0);
  });

  it('eine zweite Anfrage während der ersten bekommt "belegt"', async () => {
    const factory = new IDBFactory();
    await wceDatenbank(factory, [zeile(42, 10)]);
    const t = boot({ factory, mitCharacterLoadOnline: (data, nr) => ({ MemberNumber: nr, Canvas: leinwand() }) });
    t.sb.posts.length = 0;
    t.sb.send({ type: 'GET_SPIELER_BILDER', reqId: 'e', nrs: [42] });
    t.sb.send({ type: 'GET_SPIELER_BILDER', reqId: 'f', nrs: [42] });
    await t.sb.waitFor(() => t.sb.posts.some((p) => p.msg.reqId === 'e'), 8000);
    expect(t.sb.posts.find((p) => p.msg.reqId === 'f').msg.err).toBe('belegt');
  });
});
