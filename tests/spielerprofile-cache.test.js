import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, settle, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Spielerprofile, Teil 2 (Tool): Profile aus dem Speicher von WCE/FBC ("/profiles") einarbeiten – nur ergänzen – und je Spieler ein Bild.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const T0 = new Date(2026, 9, 5, 20, 0, 0).getTime();
const STUNDE = 3600 * 1000;
const BILD = 'data:image/jpeg;base64,QUJDREVGRw==';
const BILD2 = 'data:image/jpeg;base64,WFlaWFla';

function boot({ idb = new IDBFactory(), confirm = () => true } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js', 'spielerprofile.js'], { console: quiet, indexedDB: idb, opener, setTimeout, clearTimeout, confirm,
    navigator: { clipboard: { writeText: vi.fn(async () => {}) }, userAgent: 'Test' } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.querySelectorAll = () => [];
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  evalIn(ctx, '_connected = true; _bcOrigin = "https://bc.test";');
  return { ctx, idb, opener, els };
}
const res = (nr, extra = {}) => ({ nr, name: 'Name' + nr, nickname: null, titel: null, beschreibung: null, besitzer: null, lover: [], mods: [], geteilt: [], crafts: [], roh: { a: 1 }, ...extra });
const cres = (nr, gesehen, extra = {}) => ({ nr, name: 'Name' + nr, nickname: 'Nick' + nr, titel: null, beschreibung: 'Aus dem Cache ' + nr, besitzer: null, lover: [], mods: [], geteilt: [], crafts: [], gesehen, ...extra });
const merge = (t, results, ts = T0, raum = 'Raum A') => evalIn(t.ctx, `spielerMerge(SPIELER_DB, ${JSON.stringify(results)}, ${ts}, ${JSON.stringify(raum)}, 'R132')`);
const cmerge = (t, results) => evalIn(t.ctx, `spielerCacheMerge(SPIELER_DB, ${JSON.stringify(results)})`);
const db = (t) => JSON.parse(JSON.stringify(evalIn(t.ctx, 'SPIELER_DB')));
const senden = (t) => t.opener.postMessage.mock.calls.map((c) => c[0]);
const bridge = (t, data) => dispatchMessage(t.ctx, { app: 'BCKonfigurator', ...data }, { origin: 'https://bc.test', source: t.opener });
const pong = (t) => bridge(t, { type: 'PONG' });
async function bis(fn, ms = 4000) { for (let i = 0; i < ms / 20 && !fn(); i++) await settle(20); }

describe('WCE/FBC-Profile einarbeiten (spielerCacheMerge)', () => {
  it('neue Spieler: erstmals/zuletzt = wann WCE/FBC sie sah, eine Begegnung, als „im Speicher“ vermerkt', () => {
    const t = boot();
    const r = cmerge(t, [cres(5, T0 - 3 * STUNDE, { titel: 'Kätzchen' })]);
    expect(r).toMatchObject({ neu: 1, aktualisiert: 0, maxSeen: T0 - 3 * STUNDE });
    const s = db(t)['5'];
    expect(s).toMatchObject({ nr: 5, name: 'Name5', nickname: 'Nick5', titel: 'Kätzchen', beschreibung: 'Aus dem Cache 5', erstmals: T0 - 3 * STUNDE, zuletzt: T0 - 3 * STUNDE, begegnungen: 1, inCache: true, cacheGesehen: T0 - 3 * STUNDE });
    expect(s.verlauf).toEqual([]);
  });

  it('der Speicher ist ÄLTER als unser Stand: nur Fehlendes wird ergänzt, nichts überschrieben, kein Verlauf', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'Aktuell von mir gelesen', titel: null })], T0);
    cmerge(t, [cres(5, T0 - 10 * STUNDE, { beschreibung: 'Alte Fassung', titel: 'Nur im Cache', nickname: 'Cachi' })]);
    const s = db(t)['5'];
    expect(s.beschreibung).toBe('Aktuell von mir gelesen');
    expect(s.titel).toBe('Nur im Cache');            // fehlte bei uns → ergänzt
    expect(s.verlauf).toEqual([]);
    expect(s.zuletzt).toBe(T0);
    expect(s.erstmals).toBe(T0 - 10 * STUNDE);        // wir wissen jetzt: schon früher gesehen
    expect(s.raeume).toEqual({ 'Raum A': T0 });
    expect(s.inCache).toBe(true);
    expect(s.mods).toEqual({});
  });

  it('der Speicher ist NEUER: zählt wie ein Scan zu diesem Zeitpunkt – die Änderung steht im Verlauf', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'Alt' })], T0);
    const r = cmerge(t, [cres(5, T0 + 5 * STUNDE, { beschreibung: 'Neu' })]);
    expect(r).toMatchObject({ neu: 0, aktualisiert: 1 });
    const s = db(t)['5'];
    expect(s.beschreibung).toBe('Neu');
    expect(s.verlauf).toEqual([{ ts: T0 + 5 * STUNDE, feld: 'beschreibung', alt: 'Alt', neu: 'Neu' }]);
    expect(s.zuletzt).toBe(T0 + 5 * STUNDE);
    expect(s.begegnungen).toBe(2);
  });

  it('das Einlesen ändert nichts an bekannten Mods und Rohdaten', () => {
    const t = boot();
    merge(t, [res(5, { mods: [{ name: 'BCX', quelle: 'Nachricht' }], roh: { x: 1 } })], T0);
    cmerge(t, [cres(5, T0 + STUNDE)]);
    const s = db(t)['5'];
    expect(Object.keys(s.mods)).toEqual(['bcx']);
    expect(s.roh).toEqual({ x: 1 });
  });

  it('Notizen: die erste wird übernommen, eine neuere ersetzt sie (die alte bleibt im Verlauf), eine ältere wird ignoriert', () => {
    const t = boot();
    cmerge(t, [cres(5, T0, { notiz: 'Erste Notiz', notizTs: T0 - 100 })]);
    expect(db(t)['5']).toMatchObject({ notiz: 'Erste Notiz', notizTs: T0 - 100 });
    cmerge(t, [cres(5, T0, { notiz: 'Neuere Notiz', notizTs: T0 + 500 })]);
    expect(db(t)['5']).toMatchObject({ notiz: 'Neuere Notiz', notizTs: T0 + 500 });
    expect(db(t)['5'].verlauf).toEqual([{ ts: T0 + 500, feld: 'notiz', alt: 'Erste Notiz', neu: 'Neuere Notiz' }]);
    cmerge(t, [cres(5, T0, { notiz: 'Uralte Notiz', notizTs: T0 - 9999 })]);
    expect(db(t)['5'].notiz).toBe('Neuere Notiz');
    expect(db(t)['5'].verlauf).toHaveLength(1);
  });

  it('leere oder fehlende Notizen löschen nichts', () => {
    const t = boot();
    cmerge(t, [cres(5, T0, { notiz: 'Bleibt', notizTs: T0 })]);
    cmerge(t, [cres(5, T0 + 1, { notiz: '', notizTs: 0 })]);
    cmerge(t, [cres(5, T0 + 2)]);
    expect(db(t)['5'].notiz).toBe('Bleibt');
  });

  it('beliebig oft hintereinander: dieselben Daten ändern nichts mehr (Wiederholung ist harmlos)', () => {
    const t = boot();
    const daten = [cres(5, T0, { notiz: 'N', notizTs: T0 }), cres(6, T0 - STUNDE)];
    cmerge(t, daten);
    const a = db(t);
    cmerge(t, daten);
    cmerge(t, daten);
    expect(db(t)).toEqual(a);
  });

  it('ungültige Einträge werden übersprungen', () => {
    const t = boot();
    expect(cmerge(t, [null, { name: 'ohne Nummer' }, cres(7, T0)])).toMatchObject({ neu: 1 });
    expect(Object.keys(db(t))).toEqual(['7']);
  });
});

describe('Zwei Fassungen zusammenführen mit Bild, Notiz und Speicher-Merkmalen', () => {
  it('Bild: das neuere Vermerk gewinnt; ein Fehlervermerk fällt weg, sobald es ein Bild gibt', () => {
    const t = boot();
    const r = evalIn(t.ctx, `spielerRecMerge(
      { nr: 5, zuletzt: 10, bildFehler: { ts: 5, grund: 'x' } },
      { nr: 5, zuletzt: 20, bild: { ts: 7, quelle: 'raum', stabil: true }, inCache: true, cacheGesehen: 15, notiz: 'N', notizTs: 3 })`);
    expect(JSON.parse(JSON.stringify(r))).toMatchObject({ bild: { ts: 7, quelle: 'raum', stabil: true }, inCache: true, cacheGesehen: 15, notiz: 'N', notizTs: 3 });
    expect(r.bildFehler).toBeUndefined();
  });

  it('zwei Bilder: das mit dem späteren Zeitpunkt zählt; Notiz: die neuere', () => {
    const t = boot();
    const r = evalIn(t.ctx, `spielerRecMerge(
      { nr: 5, zuletzt: 10, bild: { ts: 100, quelle: 'raum', stabil: true }, notiz: 'neu', notizTs: 50 },
      { nr: 5, zuletzt: 10, bild: { ts: 200, quelle: 'cache', stabil: false }, notiz: 'alt', notizTs: 10 })`);
    expect(r.bild.ts).toBe(200);
    expect(r.notiz).toBe('neu');
  });
});

describe('Suche und Filter mit Bild/Notiz', () => {
  it('Filter „Mit Bild“ / „Ohne Bild“; die Notiz ist durchsuchbar', () => {
    const t = boot();
    merge(t, [res(5), res(6)], T0);
    cmerge(t, [cres(6, T0, { notiz: 'Wichtige Freundin', notizTs: 1 })]);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true }");
    const nrn = (o) => JSON.parse(JSON.stringify(evalIn(t.ctx, `spielerGefiltert(SPIELER_DB, ${JSON.stringify(o)}).map(r => r.nr)`)));
    expect(nrn({ filter: 'bild' })).toEqual([5]);
    expect(nrn({ filter: 'ohnebild' })).toEqual([6]);
    expect(nrn({ suche: 'freundin' })).toEqual([6]);
  });
});

describe('Einlesen des WCE/FBC-Speichers (Bridge)', () => {
  it('Auslesen von Hand sendet GET_SPIELER_CACHE mit seit=0; später (bei vorhandenen Spielern) nur ab dem gemerkten Stand', async () => {
    const t = boot();
    await settle(60);
    t.opener.postMessage.mockClear();
    expect(t.ctx.spielerCacheLesen(true, true)).toBe(true);
    expect(senden(t).find((m) => m.type === 'GET_SPIELER_CACHE')).toMatchObject({ seit: 0 });
    evalIn(t.ctx, '_spCacheReq = null; _spCacheVersucht = false; _spMeta = { seit: 12345, ts: 1, n: 2 };');
    merge(t, [res(5)]);
    t.opener.postMessage.mockClear();
    t.ctx.spielerCacheLesen(false, false);
    expect(senden(t).find((m) => m.type === 'GET_SPIELER_CACHE').seit).toBe(12345);
    evalIn(t.ctx, '_spCacheReq = null;');
    t.opener.postMessage.mockClear();
    t.ctx.spielerCacheLesen(true, false);                 // „alles“ ignoriert den Stand
    expect(senden(t).find((m) => m.type === 'GET_SPIELER_CACHE').seit).toBe(0);
  });

  it('sendet nichts ohne Verbindung', async () => {
    const t = boot();
    await settle(60);
    evalIn(t.ctx, '_connected = false;');
    t.opener.postMessage.mockClear();
    expect(t.ctx.spielerCacheLesen(true, true)).toBe(false);
    expect(senden(t).filter((m) => m.type === 'GET_SPIELER_CACHE')).toHaveLength(0);
  });

  it('beim ersten Auslesen der Sitzung wird der Speicher von selbst mit eingelesen – danach nicht mehr bei jedem Scan', async () => {
    const t = boot();
    await settle(60);
    t.opener.postMessage.mockClear();
    t.ctx.spielerProfileScan('join');
    await bis(() => senden(t).some((m) => m.type === 'GET_SPIELER_CACHE'));
    expect(senden(t).filter((m) => m.type === 'GET_SPIELER_CACHE')).toHaveLength(1);
    evalIn(t.ctx, '_spCacheReq = null; _spLetzterScan = 0;');
    t.opener.postMessage.mockClear();
    t.ctx.spielerProfileScan('join');
    await settle(80);
    expect(senden(t).filter((m) => m.type === 'GET_SPIELER_CACHE')).toHaveLength(0);
  });

  it('Stapel werden eingearbeitet, der Stand erst am Ende gemerkt und in der Datenbank abgelegt', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    t.ctx.spielerCacheLesen(true, true);
    const id = evalIn(t.ctx, '_spCacheReq.id');
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, vorhanden: true, results: [cres(5, T0), cres(6, T0 + 10)], gesamt: 3, gelesen: 2, fertig: false });
    expect(Object.keys(db(t)).sort()).toEqual(['5', '6']);
    expect(t.els.spStatus.textContent).toContain('2 von 3');
    expect(evalIn(t.ctx, '_spMeta.seit')).toBe(0);                   // noch nicht fertig
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, vorhanden: true, results: [cres(7, T0 + 99)], gesamt: 3, gelesen: 3, fertig: false });
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, vorhanden: true, results: [], gesamt: 3, gelesen: 3, fertig: true, maxSeen: T0 + 99 });
    expect(Object.keys(db(t)).sort()).toEqual(['5', '6', '7']);
    expect(evalIn(t.ctx, '_spMeta.seit')).toBe(T0 + 99);
    expect(t.els.spStatus.textContent).toContain('3 Profile');
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('3 Profile'), 'success');
    await settle(100);
    expect(await t.ctx.idbGet('BC_SPIELERCACHE_META_v1')).toMatchObject({ seit: T0 + 99, n: 3 });
    expect(evalIn(t.ctx, '_spCacheReq')).toBeNull();
  });

  it('Antworten zu einer fremden Anfrage werden ignoriert', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    t.ctx.spielerCacheLesen(true, true);
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: 'fremd', vorhanden: true, results: [cres(5, T0)], fertig: true });
    expect(db(t)).toEqual({});
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: 'x', vorhanden: true, results: [cres(5, T0)], fertig: false });
    expect(db(t)).toEqual({});
  });

  it('kein WCE/FBC-Speicher: ein deutlicher Hinweis, nichts wird verändert, später ist ein neuer Versuch möglich', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    merge(t, [res(5)]);
    t.ctx.spielerCacheLesen(true, true);
    const id = evalIn(t.ctx, '_spCacheReq.id');
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, vorhanden: false, grund: null, andere: ['fbc-profile-test'], results: [], fertig: true });
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('Past Profiles'), 'info');
    expect(t.els.spStatus.textContent).toContain('fbc-profile-test');
    expect(Object.keys(db(t))).toEqual(['5']);
    expect(evalIn(t.ctx, '_spCacheReq')).toBeNull();
    expect(evalIn(t.ctx, '_spMeta.seit')).toBe(0);
  });

  it('Fehler des Loaders: Meldung, nichts verändert, Stand nicht vorgerückt', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    t.ctx.spielerCacheLesen(true, true);
    const id = evalIn(t.ctx, '_spCacheReq.id');
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, err: 'kaputt' });
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('kaputt'), 'error');
    expect(evalIn(t.ctx, '_spMeta.seit')).toBe(0);
    expect(evalIn(t.ctx, '_spCacheVersucht')).toBe(false);
  });

  it('die eingelesenen Profile stehen nach dem Speichern in der Datenbank und im Gesamt-Backup', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    t.ctx.spielerCacheLesen(true, true);
    const id = evalIn(t.ctx, '_spCacheReq.id');
    bridge(t, { type: 'SPIELER_CACHE_DATA', reqId: id, vorhanden: true, results: [cres(5, T0, { notiz: 'Notiz', notizTs: 1 })], gesamt: 1, gelesen: 1, fertig: true, maxSeen: T0 });
    t.ctx.bcSpeichernJetzt();
    await settle(150);
    const e = await t.ctx._backupExtras();
    expect(e.idb.BC_SPIELERPROFILE_v1['5']).toMatchObject({ beschreibung: 'Aus dem Cache 5', inCache: true, notiz: 'Notiz' });
    expect(e.idb.BC_SPIELERCACHE_META_v1.seit).toBe(T0);
  });
});

describe('Bilder: Spieler im Raum', () => {
  it('das Auslesen nennt dem Spiel-Tab die Spieler ohne Bild', () => {
    const t = boot();
    merge(t, [res(5), res(6), res(7)]);
    evalIn(t.ctx, "SPIELER_DB['6'].bild = { ts: 1, quelle: 'raum', stabil: true }");
    t.opener.postMessage.mockClear();
    t.ctx.spielerProfileScan('manuell', true);
    const m = senden(t).find((x) => x.type === 'GET_SPIELER_PROFILE');
    expect(m.fehlt.sort()).toEqual([5, 7]);
    expect(m.erzwingen).toEqual([]);
  });

  it('ein mitgeliefertes Bild wird in der Datenbank abgelegt, am Profil vermerkt und angezeigt', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    bridge(t, { type: 'SPIELER_PROFILE_DATA', results: [res(5, { bild: { img: BILD, stabil: true } }), res(6)], room: 'R', scanTime: T0 });
    await bis(() => db(t)['5']?.bild);
    expect(db(t)['5'].bild).toMatchObject({ quelle: 'raum', stabil: true });
    expect(db(t)['6'].bild).toBeUndefined();
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD);
    expect(evalIn(t.ctx, '_spBilder["5"]')).toBe(BILD);
  });

  it('ein vorhandenes Bild wird NICHT automatisch ersetzt', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    bridge(t, { type: 'SPIELER_PROFILE_DATA', results: [res(5, { bild: { img: BILD, stabil: true } })], room: 'R', scanTime: T0 });
    await bis(() => db(t)['5']?.bild);
    bridge(t, { type: 'SPIELER_PROFILE_DATA', results: [res(5, { bild: { img: BILD2, stabil: true } })], room: 'R', scanTime: T0 + 1000 });
    await settle(100);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD);
  });

  it('ein unfertiges Bild (stabil: false) wird durch ein fertiges ersetzt – aber nicht umgekehrt', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)]);
    expect(await evalIn(t.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'cache', false, false)`)).toBe(true);
    expect(await evalIn(t.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD2)}, 'raum', true, false)`)).toBe(true);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
    expect(await evalIn(t.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'cache', false, false)`)).toBe(false);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
  });

  it('„Bild neu aufnehmen“: nach Rückfrage und nur für Spieler im Raum wird das Bild ersetzt; „Abbrechen“ ändert nichts', async () => {
    const nein = boot({ confirm: () => false });
    await settle(60);
    merge(nein, [res(5)]);
    evalIn(nein.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true }; _spImRaum = new Set(['5']);");
    nein.opener.postMessage.mockClear();
    nein.ctx.spBildErzeugen(5, true);
    expect(senden(nein).filter((m) => m.type === 'GET_SPIELER_PROFILE')).toHaveLength(0);

    const ja = boot();
    await settle(60);
    pong(ja);
    merge(ja, [res(5)]);
    await evalIn(ja.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'raum', true, false)`);
    evalIn(ja.ctx, '_spImRaum = new Set(["5"]);');
    ja.opener.postMessage.mockClear();
    ja.ctx.spBildErzeugen(5, true);
    expect(senden(ja).find((m) => m.type === 'GET_SPIELER_PROFILE').erzwingen).toEqual([5]);
    bridge(ja, { type: 'SPIELER_PROFILE_DATA', results: [res(5, { bild: { img: BILD2, stabil: true } })], room: 'R', scanTime: T0 });
    await settle(100);
    await settle(80);
    expect(await ja.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
    expect(evalIn(ja.ctx, '_spBildErzwingen.size')).toBe(0);
  });

  it('schlägt das Speichern fehl, gibt es keinen Vermerk, aber eine sichtbare Meldung (einmal)', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5), res(6)]);
    evalIn(t.ctx, 'idbSet = async function () { return false; };');
    expect(await evalIn(t.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'raum', true, false)`)).toBe(false);
    expect(await evalIn(t.ctx, `_spBildSpeichern(6, ${JSON.stringify(BILD)}, 'raum', true, false)`)).toBe(false);
    expect(db(t)['5'].bild).toBeUndefined();
    expect(t.ctx.showStatus.mock.calls.filter((c) => String(c[0]).includes('Spielerbild konnte nicht gespeichert')).length).toBe(1);
  });

  it('nur echte Bild-Adressen werden akzeptiert (kein javascript:, kein fremdes Netz)', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)]);
    for (const boese of ['javascript:alert(1)', 'https://evil.test/x.png', 'data:text/html;base64,AAAA', 'data:image/jpeg;base64,"><script>', '', null, 5]) {
      t.ctx.__b = boese;
      expect(await evalIn(t.ctx, "_spBildSpeichern(5, __b, 'raum', true, false)")).toBe(false);
    }
    expect(db(t)['5'].bild).toBeUndefined();
  });
});

describe('Bilder aus dem gespeicherten Profil (Serie)', () => {
  function vorbereiten(t, n = 14) {
    merge(t, Array.from({ length: n }, (_, i) => res(i + 1)), T0);
    evalIn(t.ctx, `Object.values(SPIELER_DB).forEach((r, i) => { r.inCache = true; r.zuletzt = ${T0} + i; });`);
  }
  const anfragen = (t) => senden(t).filter((m) => m.type === 'GET_SPIELER_BILDER');

  it('ohne Rückfrage-Zustimmung passiert nichts', async () => {
    const t = boot({ confirm: () => false });
    await settle(60);
    vorbereiten(t);
    t.opener.postMessage.mockClear();
    t.ctx.spBilderAusCache();
    await settle(80);
    expect(anfragen(t)).toHaveLength(0);
    expect(evalIn(t.ctx, '_spBilderLaeuft')).toBe(false);
  });

  it('schickt Stapel von 6, die zuletzt gesehenen zuerst, und macht nach jeder Antwort weiter; am Ende steht das Ergebnis', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 14);
    t.opener.postMessage.mockClear();
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    const erste = anfragen(t)[0];
    expect(erste.nrs).toEqual([14, 13, 12, 11, 10, 9]);
    for (let i = 0; i < 3; i++) {
      await bis(() => anfragen(t).length >= i + 1);
      const m = anfragen(t)[i];
      bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: m.nrs.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache' })), fehler: [] });
    }
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t).map((m) => m.nrs.length)).toEqual([6, 6, 2]);
    const d = db(t);
    expect(Object.values(d).every((r) => r.bild && r.bild.quelle === 'cache')).toBe(true);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:3')).toBe(BILD);
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('14 erstellt'), 'success');
  });

  it('einzelne Fehler werden am Spieler vermerkt, die Serie läuft weiter, und beim nächsten Mal werden sie übersprungen', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 3);
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: [{ nr: 3, img: BILD, stabil: true, quelle: 'cache' }, { nr: 2, img: BILD, stabil: true, quelle: 'cache' }], fehler: [{ nr: 1, grund: 'Nicht im Profilspeicher' }] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(db(t)['1'].bildFehler).toMatchObject({ grund: 'Nicht im Profilspeicher' });
    expect(db(t)['1'].bild).toBeUndefined();
    expect(JSON.parse(JSON.stringify(evalIn(t.ctx, '_spBilderKandidaten()')))).toEqual([]);   // 1 wird nicht noch einmal versucht
    // „Bild erzeugen“ am Profil versucht es erneut
    t.opener.postMessage.mockClear();
    t.ctx.spBildErzeugen(1);
    expect(db(t)['1'].bildFehler).toBeUndefined();
    await bis(() => anfragen(t).length >= 1);
    expect(anfragen(t)[0].nrs).toEqual([1]);
  });

  it('scheitert alles zweimal hintereinander, bricht die Serie mit dem Grund ab (statt endlos zu laufen)', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 30);
    t.ctx.spBilderAusCache();
    for (let i = 0; i < 2; i++) {
      await bis(() => anfragen(t).length >= i + 1);
      const m = anfragen(t)[i];
      bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: [], fehler: m.nrs.map((nr) => ({ nr, grund: 'CharacterLoadOnline fehlt in dieser BC-Version' })) });
    }
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t)).toHaveLength(2);
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('CharacterLoadOnline fehlt'), 'error');
  });

  it('„Stop“ hält nach dem laufenden Stapel an', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 30);
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    t.ctx.spBilderAusCache();                                // zweiter Klick = Stop
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: m.nrs.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache' })), fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t)).toHaveLength(1);
    expect(Object.values(db(t)).filter((r) => r.bild)).toHaveLength(6);
  });

  it('bereits vorhandene Bilder werden von der Serie nicht überschrieben', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 2);
    await evalIn(t.ctx, `_spBildSpeichern(2, ${JSON.stringify(BILD)}, 'raum', true, false)`);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, '_spBilderStarten([1, 2])');
    await bis(() => anfragen(t).length >= 1);
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: [{ nr: 1, img: BILD2, stabil: true, quelle: 'cache' }, { nr: 2, img: BILD2, stabil: true, quelle: 'cache' }], fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:2')).toBe(BILD);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:1')).toBe(BILD2);
  });

  it('„belegt“ vom Spiel-Tab: derselbe Stapel wird später noch einmal geschickt', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 2);
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: anfragen(t)[0].reqId, err: 'belegt' });
    await bis(() => anfragen(t).length >= 2, 4000);
    expect(anfragen(t)[1].nrs.sort()).toEqual(anfragen(t)[0].nrs.sort());
    expect(Object.values(db(t)).some((r) => r.bildFehler)).toBe(false);
  });

  it('Ohne Antwort des Spiel-Tabs wird nichts als „fehlgeschlagen“ vermerkt (der Stapel bleibt in der Warteschlange)', async () => {
    const t = boot();
    await settle(60);
    pong(t);
    vorbereiten(t, 2);
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    evalIn(t.ctx, '_dcPauseJob("spielerBilder", "Test")');
    expect(evalIn(t.ctx, '_spBilderPaused')).toBe(true);
    expect(evalIn(t.ctx, '_spBilderQueue.length')).toBe(2);
    expect(Object.values(db(t)).some((r) => r.bildFehler)).toBe(false);
  });
});

describe('Anzeige mit Bild', () => {
  it('die Karte zeigt das Bild (nur gültige Adressen), den WCE-Hinweis und die Notiz; ohne Bild einen Platzhalter', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5, { name: 'Mia' }), res(6, { name: 'Ada' })], T0);
    cmerge(t, [cres(6, T0, { notiz: 'Meine <b>Notiz</b>', notizTs: 1 })]);
    await evalIn(t.ctx, `_spBildSpeichern(6, ${JSON.stringify(BILD)}, 'raum', true, false)`);
    const html6 = evalIn(t.ctx, 'spielerKarteHtml(SPIELER_DB["6"], ' + T0 + ')');
    expect(html6).toContain('<img src="' + BILD + '"');
    expect(html6).toContain('sp-wce');
    expect(html6).toContain('Meine &lt;b&gt;Notiz&lt;/b&gt;');
    expect(html6).not.toContain('<b>Notiz</b>');
    const html5 = evalIn(t.ctx, 'spielerKarteHtml(SPIELER_DB["5"], ' + T0 + ')');
    expect(html5).not.toContain('<img');
    expect(html5).toContain('👤');
  });

  it('ein Bild im Speicher mit unzulässiger Adresse wird nicht eingesetzt', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)], T0);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true }; _spBilder['5'] = 'javascript:alert(1)';");
    expect(evalIn(t.ctx, 'spielerKarteHtml(SPIELER_DB["5"], ' + T0 + ')')).not.toContain('javascript:');
  });

  it('beim Zeichnen werden die Bilder der gezeigten Karten aus der Datenbank nachgeladen', async () => {
    const a = boot();
    await settle(60);
    merge(a, [res(5)], T0);
    await evalIn(a.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'raum', true, false)`);
    a.ctx.spielerSpeichern(0); a.ctx.bcSpeichernJetzt();
    await settle(100);
    for (let i = 0; i < 60 && !(await a.ctx.idbGet('BC_SPIELERPROFILE_v1'))?.['5']?.bild; i++) await settle(50);
    const b = boot({ idb: a.idb });
    await bis(() => db(b)['5']);
    expect(evalIn(b.ctx, '_spBilder["5"]')).toBeUndefined();
    evalIn(b.ctx, 'renderSpielerProfileTab()');
    await bis(() => evalIn(b.ctx, '_spBilder["5"]'));
    expect(evalIn(b.ctx, '_spBilder["5"]')).toBe(BILD);
  });

  it('die Bilder stehen einzeln im Gesamt-Backup', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)], T0);
    await evalIn(t.ctx, `_spBildSpeichern(5, ${JSON.stringify(BILD)}, 'raum', true, false)`);
    const e = await t.ctx._backupExtras();
    expect(e.idb['BC_SPIELERBILD_v1:5']).toBe(BILD);
  });
});
