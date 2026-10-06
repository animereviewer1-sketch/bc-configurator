import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import LZString from 'lz-string';
import { loadScript, evalIn, settle, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Spielerprofile: Beschreibungen. BC legt lange Beschreibungen komprimiert ab ("╬" + LZString.compressToUTF16) – das Tool zeigte sie als
// Zeichenmüll. Außerdem: Links und Bilder in der Beschreibung, das Charakterblatt (Besitzer, Beziehungen, erlaubte Interaktionen) und die
// automatischen Bilder für die gezeigten Karten.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const MAGIC = String.fromCharCode(9580);
const komprimiert = (text) => MAGIC + LZString.compressToUTF16(text);
const T0 = new Date(2026, 9, 5, 20, 0, 0).getTime();
const BILD = 'data:image/jpeg;base64,QUJDREVGRw==';

function boot({ idb = new IDBFactory(), mitLz = true, confirm = () => true, tab = null, auto = false } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js', 'spielerprofile.js'], { console: quiet, indexedDB: idb, opener, setTimeout, clearTimeout, confirm, URL, ...(mitLz ? { LZString } : {}),
    navigator: { clipboard: { writeText: vi.fn(async () => {}) }, userAgent: 'Test' } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.querySelectorAll = () => [];
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  evalIn(ctx, '_connected = true; _bcOrigin = "https://bc.test";');
  if (tab) evalIn(ctx, `_activeTab = ${JSON.stringify(tab)};`);
  if (auto) evalIn(ctx, '_spAutoAn = true;');   // die Automatik ist standardmäßig aus
  return { ctx, idb, opener, els };
}
const res = (nr, extra = {}) => ({ nr, name: 'Name' + nr, nickname: null, titel: null, beschreibung: null, besitzer: null, lover: [], mods: [], geteilt: [], crafts: [], roh: { a: 1 }, ...extra });
const merge = (t, results, ts = T0, raum = 'Raum A') => evalIn(t.ctx, `spielerMerge(SPIELER_DB, ${JSON.stringify(results)}, ${ts}, ${JSON.stringify(raum)}, 'R132')`);
const cmerge = (t, results) => evalIn(t.ctx, `spielerCacheMerge(SPIELER_DB, ${JSON.stringify(results)})`);
const db = (t) => JSON.parse(JSON.stringify(evalIn(t.ctx, 'SPIELER_DB')));
const senden = (t) => t.opener.postMessage.mock.calls.map((c) => c[0]);
const bridge = (t, data) => dispatchMessage(t.ctx, { app: 'BCKonfigurator', ...data }, { origin: 'https://bc.test', source: t.opener });
const html = (t, text) => { t.ctx.__t = text; return evalIn(t.ctx, 'spielerBeschreibungHtml(__t)'); };
async function bis(fn, ms = 4000) { for (let i = 0; i < ms / 20 && !fn(); i++) await settle(20); }

const LANG = 'Hello there dear reader, welcome. Find yourself at home in my bio!\n' + '-'.repeat(80) + '\n\nBackstory:\n\nComing from the remote, cold northern country of Snowland, 雪の国 ' + 'x'.repeat(300);

describe('Komprimierte Beschreibung („╬…“) wird wie im Spiel entpackt', () => {
  it('spielerBeschreibung: entpackt, lässt Normaltext und Unentpackbares unverändert', () => {
    const t = boot();
    t.ctx.__k = komprimiert(LANG);
    expect(evalIn(t.ctx, 'spielerBeschreibung(__k)')).toBe(LANG);
    t.ctx.__n = 'ganz normaler Text';
    expect(evalIn(t.ctx, 'spielerBeschreibung(__n)')).toBe('ganz normaler Text');
    t.ctx.LZString = { decompressFromUTF16: () => null };   // Entpacken scheitert: der Originaltext bleibt
    t.ctx.__m = MAGIC + 'kaputt';
    expect(evalIn(t.ctx, 'spielerBeschreibung(__m)')).toBe(MAGIC + 'kaputt');
    expect(evalIn(t.ctx, 'spielerBeschreibung(null)')).toBeNull();
    expect(evalIn(t.ctx, 'spielerBeschreibung(undefined)')).toBeUndefined();
  });

  it('ohne LZString bleibt der Text unverändert (nichts geht verloren)', () => {
    const t = boot({ mitLz: false });
    t.ctx.__k = komprimiert(LANG);
    expect(evalIn(t.ctx, 'spielerBeschreibung(__k)')).toBe(komprimiert(LANG));
  });

  it('ein Scan mit komprimierter Beschreibung speichert den lesbaren Text', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: komprimiert(LANG) })]);
    expect(db(t)['5'].beschreibung).toBe(LANG);
  });

  it('Profile aus dem WCE/FBC-Speicher: ebenso – auch im „älteren Stand“-Zweig', () => {
    const t = boot();
    cmerge(t, [{ ...res(5), gesehen: T0, beschreibung: komprimiert(LANG) }]);
    expect(db(t)['5'].beschreibung).toBe(LANG);
    merge(t, [res(6, { beschreibung: null })], T0);
    cmerge(t, [{ ...res(6), gesehen: T0 - 1000, beschreibung: komprimiert('Aus dem Cache') }]);
    expect(db(t)['6'].beschreibung).toBe('Aus dem Cache');
  });

  it('dieselbe Beschreibung einmal komprimiert, einmal entpackt gelesen ergibt keinen falschen Verlaufseintrag', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: LANG })], T0);
    merge(t, [res(5, { beschreibung: komprimiert(LANG) })], T0 + 1000);
    expect(db(t)['5'].verlauf).toEqual([]);
  });

  it('bereits gespeicherte Profile mit Zeichenmüll werden beim Laden repariert – in Beschreibung, Verlauf und Rohdaten – und neu gespeichert', async () => {
    const a = boot();
    await settle(60);
    await a.ctx.idbSet('BC_SPIELERPROFILE_v1', { 5: { nr: 5, name: 'Alt', beschreibung: komprimiert(LANG), erstmals: T0, zuletzt: T0, begegnungen: 1, mods: {}, raeume: {},
      verlauf: [{ ts: T0, feld: 'beschreibung', alt: komprimiert('alt'), neu: komprimiert('neu') }, { ts: T0, feld: 'titel', alt: 'a', neu: 'b' }], roh: { Description: komprimiert('roh') } } });
    const b = boot({ idb: a.idb });
    await bis(() => db(b)['5']);
    const s = db(b)['5'];
    expect(s.beschreibung).toBe(LANG);
    expect(s.verlauf[0]).toMatchObject({ alt: 'alt', neu: 'neu' });
    expect(s.verlauf[1]).toMatchObject({ alt: 'a', neu: 'b' });
    expect(s.roh.Description).toBe('roh');
    // gespeichert wird der entpackte Stand
    for (let i = 0; i < 80 && (await b.ctx.idbGet('BC_SPIELERPROFILE_v1'))['5'].beschreibung !== LANG; i++) await settle(50);
    expect((await b.ctx.idbGet('BC_SPIELERPROFILE_v1'))['5'].beschreibung).toBe(LANG);
  });

  it('beim Zusammenführen mit einem Backup wird ebenfalls entpackt', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: null })], T0);
    t.ctx.__q = { 5: { nr: 5, name: 'X', beschreibung: komprimiert('aus dem Backup'), zuletzt: T0 + 5, erstmals: T0, mods: {}, raeume: {}, verlauf: [] } };
    evalIn(t.ctx, 'spielerDbEinmischen(SPIELER_DB, __q)');
    expect(db(t)['5'].beschreibung).toBe('aus dem Backup');
  });
});

describe('Beschreibung mit Links und Bildern (spielerBeschreibungHtml)', () => {
  it('Zeilenumbrüche und Text bleiben, alles wird maskiert', () => {
    const t = boot();
    const h = html(t, 'Zeile 1\n<b>fett</b> & "Anführung"\n\nZeile 3');
    expect(h).toContain('Zeile 1\n&lt;b&gt;fett&lt;/b&gt; &amp; &quot;Anführung&quot;\n\nZeile 3');
    expect(h).not.toContain('<b>');
  });

  it('Links sind klickbar: neuer Tab, ohne Herkunftsangabe; Satzzeichen am Ende gehören nicht zum Link', () => {
    const t = boot();
    const h = html(t, 'Mehr unter https://example.com/seite?x=1, oder (https://example.org/a).');
    expect(h).toContain('<a href="https://example.com/seite?x=1" target="_blank" rel="noopener noreferrer"');
    expect(h).toContain('>https://example.com/seite?x=1</a>,');
    expect(h).toContain('(<a href="https://example.org/a"');
    expect(h).toContain('</a>).');
  });

  it('Bild-Adressen bekannter Hosts erscheinen als Bild (im Link), ohne Herkunftsangabe', () => {
    const t = boot();
    const h = html(t, 'https://i.imgur.com/abc.png https://cdn.discordapp.com/attachments/1/2/pic.jpeg?ex=1');
    expect(h).toContain('<img class="sp-beschr-bild" src="https://i.imgur.com/abc.png"');
    expect(h).toContain('referrerpolicy="no-referrer"');
    // Adresse mit Abfrage-Teil: der Pfad endet auf .jpeg → Bild
    expect(h).toContain('src="https://cdn.discordapp.com/attachments/1/2/pic.jpeg?ex=1"');
  });

  it('Bilder von unbekannten Hosts werden NICHT geladen, sondern als Link mit „laden“-Knopf gezeigt', () => {
    const t = boot();
    const h = html(t, 'https://fremd.example/bild.gif');
    expect(h).not.toContain('<img');
    expect(h).toContain('<a href="https://fremd.example/bild.gif"');
    expect(h).toContain('class="btn sp-bild-laden" data-url="https://fremd.example/bild.gif" onclick="spBeschrBildLaden(this)"');
  });

  it('der „laden“-Knopf ersetzt sich durch ein Bild ohne Herkunftsangabe – nur für http(s)', () => {
    const t = boot();
    const bilder = [];
    t.ctx.document.createElement = () => { const e = { replaceWith: vi.fn() }; bilder.push(e); return e; };
    const knopf = { dataset: { url: 'https://fremd.example/bild.gif' }, replaceWith: vi.fn() };
    t.ctx.spBeschrBildLaden(knopf);
    expect(knopf.replaceWith).toHaveBeenCalledTimes(1);
    expect(bilder[0]).toMatchObject({ src: 'https://fremd.example/bild.gif', referrerPolicy: 'no-referrer' });
    const boese = { dataset: { url: 'javascript:alert(1)' }, replaceWith: vi.fn() };
    t.ctx.spBeschrBildLaden(boese);
    expect(boese.replaceWith).not.toHaveBeenCalled();
  });

  it('gefährliche Adressen werden nie zum Link (javascript:, data:, Anführungszeichen im Text)', () => {
    const t = boot();
    for (const boese of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://x.test/a.png']) {
      const h = html(t, boese);
      expect(h).not.toContain('<a ');
      expect(h).not.toContain('<script');
    }
    // Anführungszeichen können nie aus dem Attribut ausbrechen (maskiert), auch wenn der Browser die Adresse als gültig ansieht
    const h0 = html(t, 'http://"onmouseover="alert(1)');
    expect(h0).not.toContain('onmouseover="');
    expect(h0).not.toMatch(/<a [^>]*" onmouseover/);
    // eine http-Adresse mit Anführungszeichen im Pfad wird maskiert, nicht eingeschleust
    const h = html(t, 'https://x.test/a"onerror="alert(1)');
    expect(h).not.toMatch(/<a [^>]*"onerror=/);
  });

  it('leer oder kein Text ergibt leer', () => {
    const t = boot();
    expect(html(t, '')).toBe('');
    expect(html(t, null)).toBe('');
  });

  it('die Detailansicht zeigt Links/Bilder, die Karte den reinen Text', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'Hallo https://i.imgur.com/abc.png\nund https://example.com' })], T0);
    expect(evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['5'], ${T0})`)).toContain('<img class="sp-beschr-bild"');
    expect(evalIn(t.ctx, `spielerKarteHtml(SPIELER_DB['5'], ${T0})`)).not.toContain('<img class="sp-beschr-bild"');
  });
});

describe('Charakterblatt im Detail', () => {
  it('Dauer wie im Spiel: Jahre, Monate, Tage', () => {
    const t = boot();
    const d = (a, b) => evalIn(t.ctx, `spielerDauer(${new Date(...a).getTime()}, ${new Date(...b).getTime()})`);
    expect(d([2022, 11, 7], [2026, 9, 5])).toBe('3 Jahre, 9 Monate, 28 Tage');
    expect(d([2025, 9, 4], [2026, 9, 5])).toBe('1 Jahr, 1 Tag');
    expect(d([2026, 9, 5], [2026, 9, 5])).toBe('0 Tage');
    expect(d([2026, 7, 3], [2026, 9, 5])).toBe('2 Monate, 2 Tage');
    expect(evalIn(t.ctx, 'spielerDauer(0, 5)')).toBe('');
  });

  it('Besitzer (Probezeit/Halsband/keiner), Beziehungen mit Stufe und Dauer, Mitglied seit, erlaubte Interaktionen', () => {
    const t = boot();
    const jetzt = new Date(2026, 9, 5, 12).getTime();
    merge(t, [
      res(5, { erstellt: new Date(2023, 0, 5).getTime(), schwierigkeit: 2, itemPermission: 1, besitzer: { nr: 9, name: 'Herrin', seit: new Date(2025, 9, 4).getTime(), stufe: 1 },
        lover: [{ nr: 101591, name: 'Lyonara', seit: new Date(2025, 9, 4).getTime(), stufe: 2 }, { nr: 136883, name: 'Katie', seit: new Date(2024, 3, 1).getTime(), stufe: 1 }, { nr: 137247, name: 'Jullie', seit: new Date(2024, 4, 9).getTime(), stufe: 0 }] }),
      res(6, { besitzer: { nr: 9, name: 'Herrin', seit: null, stufe: 0 } }),
      res(7, { besitzer: null }),
    ], jetzt);
    const h5 = evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['5'], ${jetzt})`);
    for (const teil of ['3 Jahre, 9 Monate', 'Hardcore', 'Alle außer Blacklist', 'Halsband von Herrin (9)', '1 Jahr, 1 Tag', 'Verheiratet mit Lyonara (101591)', 'Verlobt mit Katie (136883)', 'Dating Jullie (137247)', 'Beziehungen'])
      expect(h5).toContain(teil);
    expect(evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['6'], ${jetzt})`)).toContain('Probezeit bei Herrin (9)');
    expect(evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['7'], ${jetzt})`)).toContain('keiner');
    const text = evalIn(t.ctx, `spielerDetailText(SPIELER_DB['5'], ${jetzt})`);
    expect(text).toContain('Mitglied seit:');
    expect(text).toContain('Erlaubte Interaktionen: Alle außer Blacklist');
    expect(text).toContain('Verheiratet mit Lyonara (101591)');
  });

  it('alle sechs Stufen der erlaubten Interaktionen haben einen Text', () => {
    const t = boot();
    expect(evalIn(t.ctx, 'SP_ERLAUBT.length')).toBe(6);
    expect(evalIn(t.ctx, 'SP_ERLAUBT[5]')).toBe('Nur Besitzer');
  });
});

describe('Liste untereinander', () => {
  it('die Spielerliste ist einspaltig (Profile stehen untereinander)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const html5 = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const zeile = html5.split('\n').find((l) => l.startsWith('.sp-body '));
    expect(zeile).toContain('grid-template-columns:minmax(0, 1fr)');
    expect(zeile).not.toContain('auto-fill');
  });
});

describe('Bilder automatisch für die gezeigten Karten', () => {
  function vorbereiten(t, n = 8) {
    merge(t, Array.from({ length: n }, (_, i) => res(i + 1)), T0);
    evalIn(t.ctx, `Object.values(SPIELER_DB).forEach((r, i) => { r.inCache = true; r.zuletzt = ${T0} + i; });`);
  }
  const anfragen = (t) => senden(t).filter((m) => m.type === 'GET_SPIELER_BILDER');

  it('mit offenem Tab fordert das Tool von selbst Bilder für die gezeigten Spieler mit Cache-Profil an – ohne Rückfrage', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true, confirm: () => { throw new Error('keine Rückfrage erwartet'); } });
    await settle(60);
    vorbereiten(t, 8);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => anfragen(t).length >= 1);
    expect(anfragen(t)[0].nrs).toEqual([8, 7, 6, 5, 4, 3]);
    expect(evalIn(t.ctx, '_spBilderAuto')).toBe(true);
  });

  it('bei geschlossenem Tab, ausgeschalteter Automatik, ohne Verbindung oder ohne Cache-Profil passiert nichts', async () => {
    const zu = boot({ tab: 'items' });
    await settle(60);
    vorbereiten(zu);
    zu.opener.postMessage.mockClear();
    evalIn(zu.ctx, 'renderSpielerProfileTab()');
    await settle(100);
    expect(anfragen(zu)).toHaveLength(0);

    const aus = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    vorbereiten(aus);
    aus.ctx.spAutoBilderSetzen(false);
    aus.opener.postMessage.mockClear();
    evalIn(aus.ctx, 'renderSpielerProfileTab()');
    await settle(100);
    expect(anfragen(aus)).toHaveLength(0);
    expect(aus.ctx.localStorage.getItem('BC_SPIELERPROFILE_AUTOBILD_v1')).toBe('0');

    const offline = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    vorbereiten(offline);
    evalIn(offline.ctx, '_connected = false;');
    offline.opener.postMessage.mockClear();
    evalIn(offline.ctx, 'renderSpielerProfileTab()');
    await settle(100);
    expect(anfragen(offline)).toHaveLength(0);

    const ohneCache = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    merge(ohneCache, [res(1), res(2)], T0);
    ohneCache.opener.postMessage.mockClear();
    evalIn(ohneCache.ctx, 'renderSpielerProfileTab()');
    await settle(100);
    expect(anfragen(ohneCache)).toHaveLength(0);
  });

  it('wer schon ein Bild hat, einen Fehlervermerk trägt oder im Raum ist, wird nicht angefordert', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    pongSetzen(t);
    vorbereiten(t, 5);
    evalIn(t.ctx, "SPIELER_DB['1'].bild = { ts: 1, quelle: 'raum', stabil: true }; SPIELER_DB['2'].bildFehler = { ts: 1, grund: 'x' }; _spImRaum = new Set(['3']);");
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => anfragen(t).length >= 1);
    expect(anfragen(t)[0].nrs.sort()).toEqual([4, 5]);
  });

  function pongSetzen(t) { bridge(t, { type: 'PONG' }); }

  it('jeder Spieler wird höchstens einmal je Sitzung automatisch versucht – kein Endlos-Kreis', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    pongSetzen(t);
    vorbereiten(t, 3);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => anfragen(t).length >= 1);
    const m = anfragen(t)[0];
    // Antwort: nur für einen Spieler ein Fehler – die beiden anderen bleiben unbeantwortet
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: [], fehler: [{ nr: 1, grund: 'Nicht im Profilspeicher' }] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    await settle(150);
    expect(anfragen(t)).toHaveLength(1);       // dieselben Spieler werden von selbst nicht noch einmal angefordert
    expect(db(t)['1'].bildFehler).toBeTruthy();
  });

  it('scheitert alles zweimal hintereinander, schaltet sich die Automatik bis zum nächsten Klick ab', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    pongSetzen(t);
    vorbereiten(t, 40);
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    for (let i = 0; i < 2; i++) {
      await bis(() => anfragen(t).length >= i + 1);
      const m = anfragen(t)[i];
      bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: [], fehler: m.nrs.map((nr) => ({ nr, grund: 'CharacterLoadOnline fehlt in dieser BC-Version' })) });
    }
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    await settle(150);
    expect(anfragen(t)).toHaveLength(2);
    expect(evalIn(t.ctx, '_spAutoGesperrt')).toBe(true);
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await settle(100);
    expect(anfragen(t)).toHaveLength(2);       // keine neue Serie von selbst
  });

  it('verlässt man den Tab, hört die Automatik auf; nicht Abgearbeitetes darf beim nächsten Besuch wieder drankommen', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    pongSetzen(t);
    vorbereiten(t, 20);
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => anfragen(t).length >= 1);
    evalIn(t.ctx, "_activeTab = 'items';");
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: m.nrs.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache' })), fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t)).toHaveLength(1);
    expect(evalIn(t.ctx, '_spAutoVersucht.size')).toBe(6);   // nur die wirklich versuchten bleiben vermerkt
  });

  it('ein automatischer Durchgang meldet sich ohne Probleme nicht per Meldung, nur in der Statuszeile', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    pongSetzen(t);
    vorbereiten(t, 2);
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => anfragen(t).length >= 1);
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bilder: m.nrs.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache' })), fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(t.els.spStatus.textContent).toContain('2 erstellt');
    expect(t.ctx.showStatus).not.toHaveBeenCalledWith(expect.stringContaining('2 erstellt'), expect.anything());
  });
});

describe('Kleine Bilder (Version 1) werden durch große (Version 2) ersetzt – nie umgekehrt, nie ohne fertiges neues Bild', () => {
  const BILD2 = 'data:image/jpeg;base64,WFlaWFla';
  const speichern = (t, nr, img, stabil, v) => { t.ctx.__i = img; return evalIn(t.ctx, `_spBildSpeichern(${nr}, __i, 'cache', ${stabil}, false, ${v})`); };

  it('ein kleines Bild wird von einem fertigen großen ersetzt; das Große bleibt dann stehen', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)], T0);
    expect(await speichern(t, 5, BILD, true, 1)).toBe(true);
    expect(db(t)['5'].bild.v).toBe(1);
    expect(await speichern(t, 5, BILD2, true, 2)).toBe(true);
    expect(db(t)['5'].bild.v).toBe(2);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
    expect(await speichern(t, 5, BILD, true, 1)).toBe(false);          // nie zurück zum kleinen
    expect(await speichern(t, 5, BILD, true, 2)).toBe(false);          // gleich groß: bleibt
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
  });

  it('ein unfertiges großes Bild ersetzt kein fertiges kleines', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)], T0);
    await speichern(t, 5, BILD, true, 1);
    expect(await speichern(t, 5, BILD2, false, 2)).toBe(false);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD);
  });

  it('Bilder ohne Versionsangabe (von früher) gelten als klein', () => {
    const t = boot();
    merge(t, [res(5)], T0);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true }");
    expect(evalIn(t.ctx, "_spBildNiedrig(SPIELER_DB['5'])")).toBe(true);
    evalIn(t.ctx, "SPIELER_DB['5'].bild.v = 2");
    expect(evalIn(t.ctx, "_spBildNiedrig(SPIELER_DB['5'])")).toBe(false);
  });

  it('kleine Bilder werden erst angefordert, wenn der Spiel-Tab große liefern kann (alter Loader: keine sinnlose Aufnahme bei jedem Auslesen)', () => {
    const t = boot();
    merge(t, [res(5), res(6)], T0);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true }");   // klein
    expect(evalIn(t.ctx, '_spOhneBild()')).toEqual([6]);
    t.opener.postMessage.mockClear();
    bridge(t, { type: 'PONG' });
    bridge(t, { type: 'SPIELER_PROFILE_DATA', results: [res(5)], room: 'R', scanTime: T0, bildV: 2 });
    expect(evalIn(t.ctx, '_spLoaderBildV')).toBe(2);
    expect(evalIn(t.ctx, '_spOhneBild()').slice().sort()).toEqual([5, 6]);
  });

  it('ein neues großes Bild aus dem Raum ersetzt das kleine von selbst', async () => {
    const t = boot();
    await settle(60);
    bridge(t, { type: 'PONG' });
    merge(t, [res(5)], T0);
    await speichern(t, 5, BILD, true, 1);
    bridge(t, { type: 'SPIELER_PROFILE_DATA', results: [res(5, { bild: { img: BILD2, stabil: true, v: 2 } })], room: 'R', scanTime: T0 + 1000, bildV: 2 });
    await bis(() => db(t)['5']?.bild?.v === 2);
    expect(await t.ctx.idbGet('BC_SPIELERBILD_v1:5')).toBe(BILD2);
  });

  it('die Serie und die Automatik nehmen kleine Bilder mit, sobald V2 bekannt ist – und ersetzen sie erst, wenn das große ankommt', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    bridge(t, { type: 'PONG' });
    merge(t, [res(5), res(6)], T0);
    evalIn(t.ctx, "Object.values(SPIELER_DB).forEach(r => { r.inCache = true; }); SPIELER_DB['5'].bild = { ts: 1, quelle: 'cache', stabil: true };");
    await evalIn(t.ctx, `(_spBilder['5'] = ${JSON.stringify(BILD)}, 0)`);
    // V1-Loader: das kleine Bild gilt als vorhanden
    expect(evalIn(t.ctx, '_spBilderKandidaten()')).toEqual([6]);
    evalIn(t.ctx, '_spLoaderBildV = 2;');
    expect(evalIn(t.ctx, '_spBilderKandidaten()').slice().sort()).toEqual([5, 6]);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await bis(() => senden(t).some((m) => m.type === 'GET_SPIELER_BILDER'));
    const m = senden(t).find((x) => x.type === 'GET_SPIELER_BILDER');
    expect(m.nrs.slice().sort()).toEqual([5, 6]);
    expect(db(t)['5'].bild.v).toBeUndefined();       // bis das große da ist, bleibt das kleine
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bildV: 2, bilder: [{ nr: 5, img: BILD2, stabil: true, quelle: 'cache', v: 2 }, { nr: 6, img: BILD2, stabil: true, quelle: 'cache', v: 2 }], fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(db(t)['5'].bild.v).toBe(2);
    expect(db(t)['6'].bild.v).toBe(2);
  });

  it('die Detailansicht weist auf ein kleines Bild hin', () => {
    const t = boot();
    merge(t, [res(5)], T0);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'cache', stabil: true }");
    expect(evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['5'], ${T0})`)).toContain('niedrige Auflösung');
  });

  it('eine Beschreibung, die sich zu "" entpackt, obwohl der Text länger ist, bleibt unverändert (nichts geht verloren)', () => {
    const t = boot();
    t.ctx.LZString = { decompressFromUTF16: () => '' };
    t.ctx.__x = MAGIC + 'abcdef';
    expect(evalIn(t.ctx, 'spielerBeschreibung(__x)')).toBe(MAGIC + 'abcdef');
  });
});

describe('Bremsen gegen „Out of Memory“ (Tool-Tab)', () => {
  const anfragen = (t) => senden(t).filter((m) => m.type === 'GET_SPIELER_BILDER');
  function vorbereiten(t, n) {
    merge(t, Array.from({ length: n }, (_, i) => res(i + 1)), T0);
    evalIn(t.ctx, `Object.values(SPIELER_DB).forEach((r, i) => { r.inCache = true; r.zuletzt = ${T0} + i; });`);
  }

  it('die Automatik ist ohne ausdrückliches Einschalten aus – auch mit offenem Tab und vielen Spielern ohne Bild', async () => {
    const t = boot({ tab: 'spielerprofile' });
    await settle(60);
    vorbereiten(t, 10);
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await settle(150);
    expect(anfragen(t)).toHaveLength(0);
    expect(evalIn(t.ctx, '_spAutoAn')).toBe(false);
  });

  it('Einschalten merkt sich der Browser ("1"), ausschalten auch; ein früherer Stand "an" (kein Wert) bleibt aus', async () => {
    const t = boot({ tab: 'spielerprofile' });
    t.ctx.spAutoBilderSetzen(true);
    expect(t.ctx.localStorage.getItem('BC_SPIELERPROFILE_AUTOBILD_v1')).toBe('1');
    t.ctx.spAutoBilderSetzen(false);
    expect(t.ctx.localStorage.getItem('BC_SPIELERPROFILE_AUTOBILD_v1')).toBe('0');
  });

  it('ist der Speicher dieses Tabs zu über 70 % voll, startet die Automatik nicht – und eine laufende Serie hält an', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    bridge(t, { type: 'PONG' });
    vorbereiten(t, 14);
    t.ctx.performance = { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 800 } };
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    await settle(150);
    expect(anfragen(t)).toHaveLength(0);
    // Serie von Hand starten, dann wird der Speicher knapp
    t.ctx.performance = { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 100 } };
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    t.ctx.performance = { memory: { jsHeapSizeLimit: 1000, usedJSHeapSize: 900 } };
    const m = anfragen(t)[0];
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bildV: 2, bilder: m.nrs.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache', v: 2 })), fehler: [] });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t)).toHaveLength(1);
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('Speicher dieses Tool-Tabs'), 'error');
    expect(evalIn(t.ctx, '_spAutoGesperrt')).toBe(true);
  });

  it('meldet der Spiel-Tab „Stopp“ (Grenze/Speicher), bleiben die nicht bearbeiteten Spieler unvermerkt, die Serie hält an und die Automatik bleibt aus', async () => {
    const t = boot({ tab: 'spielerprofile', auto: true });
    await settle(60);
    bridge(t, { type: 'PONG' });
    vorbereiten(t, 12);
    t.ctx.spBilderAusCache();
    await bis(() => anfragen(t).length >= 1);
    const m = anfragen(t)[0];
    const fertig = m.nrs.slice(0, 2);
    bridge(t, { type: 'SPIELER_BILDER_DATA', reqId: m.reqId, bildV: 2, bilder: fertig.map((nr) => ({ nr, img: BILD, stabil: true, quelle: 'cache', v: 2 })), fehler: [],
      stopp: 'Der Speicher des Spiel-Tabs ist fast voll – BC-Tab neu laden (F5), dann geht es weiter' });
    await bis(() => !evalIn(t.ctx, '_spBilderLaeuft'));
    expect(anfragen(t)).toHaveLength(1);                                   // danach nichts mehr angefordert
    const d = db(t);
    expect(fertig.every((nr) => d[nr].bild)).toBe(true);
    expect(Object.values(d).some((r) => r.bildFehler)).toBe(false);        // niemand als „fehlgeschlagen“ vermerkt
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('Speicher des Spiel-Tabs ist fast voll'), 'error');
    expect(evalIn(t.ctx, '_spAutoGesperrt')).toBe(true);
    // beim nächsten manuellen Start kommen die übrigen Spieler wieder dran
    expect(evalIn(t.ctx, '_spBilderKandidaten().length')).toBe(10);
  });

  it('der Bild-Zwischenspeicher bleibt klein (nur das Gezeigte), und Karten-Bilder werden asynchron dekodiert', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5)], T0);
    evalIn(t.ctx, "SPIELER_DB['5'].bild = { ts: 1, quelle: 'raum', stabil: true, v: 2 }; for (let i = 0; i < 300; i++) _spBilder['x' + i] = 'data:image/jpeg;base64,AAAA';");
    await evalIn(t.ctx, "_spBilderNachladen(['5'])");
    expect(evalIn(t.ctx, 'Object.keys(_spBilder).length')).toBeLessThan(10);
    evalIn(t.ctx, `_spBilder['5'] = ${JSON.stringify(BILD)}`);
    expect(evalIn(t.ctx, `spielerKarteHtml(SPIELER_DB['5'], ${T0})`)).toContain('decoding="async"');
  });
});
