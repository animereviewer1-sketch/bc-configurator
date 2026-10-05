import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, settle, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Tab "Spielerprofile": alle gesehenen Spieler mit Beschreibung, Mods und "zuletzt gesehen". Daten werden nur ergänzt, nie gelöscht.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const T0 = new Date(2026, 9, 5, 20, 0, 0).getTime();   // 5.10.2026 20:00 (Ortszeit)
const TAG = 24 * 3600 * 1000;

function boot({ idb = new IDBFactory() } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js', 'spielerprofile.js'], { console: quiet, indexedDB: idb, opener, setTimeout, clearTimeout,
    navigator: { clipboard: { writeText: vi.fn(async () => {}) }, userAgent: 'Test' } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.querySelectorAll = () => [];
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  return { ctx, idb, opener, els };
}
const res = (nr, extra = {}) => ({ nr, name: 'Name' + nr, nickname: null, titel: null, beschreibung: null, besitzer: null, lover: [], mods: [], geteilt: [], crafts: [], roh: { a: 1 }, ...extra });
const merge = (t, results, ts = T0, raum = 'Raum A') => evalIn(t.ctx, `spielerMerge(SPIELER_DB, ${JSON.stringify(results)}, ${ts}, ${JSON.stringify(raum)}, 'R132')`);
const db = (t) => JSON.parse(JSON.stringify(evalIn(t.ctx, 'SPIELER_DB')));

describe('Zusammenführen (spielerMerge)', () => {
  it('neue Spieler werden angelegt, bekannte aktualisiert – nichts wird gelöscht', () => {
    const t = boot();
    expect(merge(t, [res(5, { beschreibung: 'Hallo' }), res(6)])).toEqual({ neu: 2, geaendert: 0 });
    expect(merge(t, [res(5, { beschreibung: 'Hallo' })], T0 + 1000)).toEqual({ neu: 0, geaendert: 0 });
    const d = db(t);
    expect(Object.keys(d).sort()).toEqual(['5', '6']);        // 6 war im zweiten Scan nicht dabei und bleibt
    expect(d['5'].zuletzt).toBe(T0 + 1000);
    expect(d['5'].erstmals).toBe(T0);
    expect(d['6'].zuletzt).toBe(T0);
  });

  it('zuletzt/erstmals, Begegnungen (neue ab 30 Minuten Pause) und Räume', () => {
    const t = boot();
    merge(t, [res(5)], T0, 'Raum A');
    merge(t, [res(5)], T0 + 5 * 60000, 'Raum A');          // gleiche Begegnung
    merge(t, [res(5)], T0 + 2 * 3600000, 'Raum B');        // neue Begegnung
    const r = db(t)['5'];
    expect(r.begegnungen).toBe(2);
    expect(r.erstmals).toBe(T0);
    expect(r.zuletzt).toBe(T0 + 2 * 3600000);
    expect(r.raeume).toEqual({ 'Raum A': T0 + 5 * 60000, 'Raum B': T0 + 2 * 3600000 });
  });

  it('ändert sich die Beschreibung (oder ein anderes Feld), steht die Änderung im Verlauf – die alte Fassung bleibt lesbar', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'Alt', titel: 'Kätzchen', besitzer: { nr: 9, name: 'Herrin', seit: 1, stufe: 1 } })], T0);
    merge(t, [res(5, { beschreibung: 'Alt', titel: 'Kätzchen', besitzer: { nr: 9, name: 'Herrin', seit: 1, stufe: 1 } })], T0 + 1000);   // nichts geändert
    expect(db(t)['5'].verlauf).toEqual([]);
    expect(merge(t, [res(5, { beschreibung: 'Neu', titel: 'Kätzchen', besitzer: null })], T0 + 2000)).toEqual({ neu: 0, geaendert: 1 });
    const v = db(t)['5'].verlauf;
    expect(v.map((x) => x.feld).sort()).toEqual(['beschreibung', 'besitzer']);
    expect(v.find((x) => x.feld === 'beschreibung')).toMatchObject({ alt: 'Alt', neu: 'Neu', ts: T0 + 2000 });
    expect(v.find((x) => x.feld === 'besitzer')).toMatchObject({ alt: 'Herrin #9', neu: '' });
    expect(db(t)['5'].beschreibung).toBe('Neu');
  });

  it('erstmals gelesene Felder und nicht gelieferte Werte sind keine Änderung; vorhandene Werte bleiben, wenn ein Scan sie nicht liefert', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: null })], T0);          // Beschreibung war nicht lesbar
    merge(t, [res(5, { beschreibung: 'Jetzt lesbar' })], T0 + 1000);
    expect(db(t)['5'].verlauf).toEqual([]);
    merge(t, [res(5, { beschreibung: null })], T0 + 2000);   // wieder nicht geliefert
    expect(db(t)['5'].beschreibung).toBe('Jetzt lesbar');
    expect(db(t)['5'].verlauf).toEqual([]);
  });

  it('Mods werden vereinigt (nie entfernt), gleiche Namen ohne Msg-Endung/Groß-Kleinschreibung sind derselbe Mod, Version und Zeiten wandern mit', () => {
    const t = boot();
    merge(t, [res(5, { mods: [{ name: 'BCEMsg', quelle: 'Nachricht', erstmals: T0 - 1000, zuletzt: T0, version: '5.1' }] })], T0);
    merge(t, [res(5, { mods: [{ name: 'bce', quelle: 'Charakterdaten' }, { name: 'KIKILINK/1', quelle: 'Nachricht', erstmals: T0 + 5, zuletzt: T0 + 5 }] })], T0 + 10);
    merge(t, [res(5, { mods: [] })], T0 + 20);                // dieser Scan sieht keine Mods: die bekannten bleiben
    const m = db(t)['5'].mods;
    expect(Object.keys(m).sort()).toEqual(['bce', 'kikilink']);
    expect(m.bce).toMatchObject({ name: 'BCE', version: '5.1', erstmals: T0 - 1000 });
    expect(m.bce.quellen.sort()).toEqual(['Charakterdaten', 'Nachricht']);
    expect(m.bce.roh.sort()).toEqual(['BCEMsg', 'bce']);
    expect(m.bce.zuletzt).toBe(T0 + 10);
  });

  it('ein leerer Scan löscht keine geteilten Einstellungen und keine Crafts', () => {
    const t = boot();
    merge(t, [res(5, { geteilt: ['MBS', 'GameVersion'], crafts: [{ name: 'Halsband', item: 'Collar', beschreibung: '', eigenschaft: '' }] })], T0);
    merge(t, [res(5, { geteilt: ['BCX'], crafts: [] })], T0 + 1000);
    const r = db(t)['5'];
    expect(r.geteilt.sort()).toEqual(['BCX', 'GameVersion', 'MBS']);
    expect(r.crafts).toHaveLength(1);
  });

  it('Modnamen: Msg-Endung, /1 und _INFO2 fallen weg', () => {
    const t = boot();
    expect(evalIn(t.ctx, "['BCXMsg','LSCGMsg','KIKILINK/1','ECHO_INFO2','MoonCE','DOGS'].map(spielerModName)")).toEqual(['BCX', 'LSCG', 'KIKILINK', 'ECHO', 'MoonCE', 'DOGS']);
  });

  it('Ungültige Einträge (ohne Nummer) werden übersprungen, statt alles zu kippen', () => {
    const t = boot();
    expect(merge(t, [null, { name: 'x' }, res(7)])).toEqual({ neu: 1, geaendert: 0 });
    expect(Object.keys(db(t))).toEqual(['7']);
  });
});

describe('Zwei Fassungen zusammenführen (Laden, Backup)', () => {
  it('die jüngere liefert die Felder; Mods, Räume und Verlauf werden vereinigt; erstmals = frühester Wert', () => {
    const t = boot();
    const a = { nr: 5, name: 'Alt', beschreibung: 'alt', erstmals: T0, zuletzt: T0 + 10, begegnungen: 2, mods: { x: { name: 'X', erstmals: T0, zuletzt: T0 + 10 } }, raeume: { A: 1 }, verlauf: [{ ts: 1, feld: 'name', alt: 'a', neu: 'b' }] };
    const b = { nr: 5, name: 'Neu', beschreibung: 'neu', erstmals: T0 - 500, zuletzt: T0 + 99, begegnungen: 5, mods: { y: { name: 'Y', erstmals: T0, zuletzt: T0 } }, raeume: { A: 9, B: 2 }, verlauf: [{ ts: 1, feld: 'name', alt: 'a', neu: 'b' }, { ts: 2, feld: 'titel', alt: '', neu: 't' }] };
    const r = JSON.parse(JSON.stringify(evalIn(t.ctx, `spielerRecMerge(${JSON.stringify(a)}, ${JSON.stringify(b)})`)));
    expect(r).toMatchObject({ name: 'Neu', beschreibung: 'neu', erstmals: T0 - 500, zuletzt: T0 + 99, begegnungen: 5 });
    expect(Object.keys(r.mods).sort()).toEqual(['x', 'y']);
    expect(r.raeume).toEqual({ A: 9, B: 2 });
    expect(r.verlauf).toHaveLength(2);       // doppelter Eintrag nur einmal
  });

  it('Einmischen: unbekannte Spieler kommen dazu, bekannte werden zusammengeführt, keiner geht verloren', () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'lokal' })], T0 + 100);
    const n = evalIn(t.ctx, `spielerDbEinmischen(SPIELER_DB, ${JSON.stringify({ 5: { nr: 5, beschreibung: 'alt', zuletzt: T0, erstmals: T0 - 50 }, 8: { nr: 8, name: 'Acht', zuletzt: T0, erstmals: T0 } })})`);
    expect(n).toBe(1);
    const d = db(t);
    expect(Object.keys(d).sort()).toEqual(['5', '8']);
    expect(d['5'].beschreibung).toBe('lokal');      // lokal ist jünger
    expect(d['5'].erstmals).toBe(T0 - 50);
  });
});

describe('Suche, Filter, Sortierung', () => {
  function befuellen() {
    const t = boot();
    const jetzt = T0;
    merge(t, [res(1, { name: 'Mia', beschreibung: 'Liebe Katzen und Seile', mods: [{ name: 'BCXMsg', quelle: 'Nachricht' }], titel: 'Kätzchen' })], jetzt - 10 * TAG);
    merge(t, [res(2, { name: 'Ada', nickname: 'Adi', beschreibung: '', besitzer: { nr: 9, name: 'Herrin', seit: 1, stufe: 1 } })], jetzt - 1 * TAG);
    merge(t, [res(3, { name: 'Zoe', beschreibung: 'Hallo Welt', mods: [{ name: 'LSCGMsg', quelle: 'Nachricht' }, { name: 'BCXMsg', quelle: 'Nachricht' }] })], jetzt - 3600000);
    return { t, jetzt };
  }
  const liste = (t, jetzt, opt = {}) => JSON.parse(JSON.stringify(evalIn(t.ctx, `spielerGefiltert(SPIELER_DB, ${JSON.stringify({ jetzt, ...opt, imRaum: undefined })}).map(r => r.nr)`)));

  it('Standard: zuletzt gesehen zuerst', () => {
    const { t, jetzt } = befuellen();
    expect(liste(t, jetzt)).toEqual([3, 2, 1]);
  });

  it('Sortierungen: Name (Spitzname zählt), Nummer, zuerst gesehen, Begegnungen', () => {
    const { t, jetzt } = befuellen();
    expect(liste(t, jetzt, { sort: 'name' })).toEqual([2, 1, 3]);      // Adi, Mia, Zoe
    expect(liste(t, jetzt, { sort: 'nr' })).toEqual([1, 2, 3]);
    expect(liste(t, jetzt, { sort: 'erstmals' })).toEqual([3, 2, 1]);
  });

  it('Suche in Name, Spitzname, Nummer, Beschreibung, Titel, Mod und Besitzer', () => {
    const { t, jetzt } = befuellen();
    expect(liste(t, jetzt, { suche: 'mia' })).toEqual([1]);
    expect(liste(t, jetzt, { suche: 'adi' })).toEqual([2]);
    expect(liste(t, jetzt, { suche: '3' }).includes(3)).toBe(true);
    expect(liste(t, jetzt, { suche: 'katzen seile' })).toEqual([1]);   // alle Wörter müssen vorkommen
    expect(liste(t, jetzt, { suche: 'kätzchen' })).toEqual([1]);
    expect(liste(t, jetzt, { suche: 'lscg' })).toEqual([3]);
    expect(liste(t, jetzt, { suche: 'herrin' })).toEqual([2]);
  });

  it('Suche nach Datum findet die Spieler, die du an dem Tag gesehen hast', () => {
    const { t, jetzt } = befuellen();
    const d = new Date(jetzt - 10 * TAG);
    expect(liste(t, jetzt, { suche: d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() })).toEqual([1]);
  });

  it('Filter: Neu (48 h), Heute, Mit Beschreibung, Mit Mods, einzelner Mod', () => {
    const { t, jetzt } = befuellen();
    expect(liste(t, jetzt, { filter: 'neu' })).toEqual([3, 2]);
    expect(liste(t, jetzt, { filter: 'heute' })).toEqual([3]);
    expect(liste(t, jetzt, { filter: 'desc' })).toEqual([3, 1]);        // Ada hat eine leere Beschreibung
    expect(liste(t, jetzt, { filter: 'mods' })).toEqual([3, 1]);
    expect(liste(t, jetzt, { mod: 'bcx' })).toEqual([3, 1]);
    expect(liste(t, jetzt, { mod: 'lscg' })).toEqual([3]);
  });

  it('Filter „Im Raum“ nutzt die Nummern des letzten Scans', () => {
    const { t, jetzt } = befuellen();
    const r = JSON.parse(JSON.stringify(evalIn(t.ctx, `spielerGefiltert(SPIELER_DB, { filter: 'raum', imRaum: new Set(['2']), jetzt: ${jetzt} }).map(x => x.nr)`)));
    expect(r).toEqual([2]);
  });

  it('Mod-Liste: häufigste zuerst mit Anzahl', () => {
    const { t } = befuellen();
    expect(JSON.parse(JSON.stringify(evalIn(t.ctx, 'spielerModListe(SPIELER_DB)'))).map((m) => [m.name, m.n])).toEqual([['BCX', 2], ['LSCG', 1]]);
  });
});

describe('Darstellung', () => {
  const gefaehrlich = '<img src=x onerror=alert(1)><script>boom()</script>';

  it('Beschreibung, Name und Mods anderer Spieler werden nie als HTML eingefügt (Karte, Detail, Verlauf, Rohdaten)', () => {
    const t = boot();
    merge(t, [res(5, { name: gefaehrlich, nickname: gefaehrlich, titel: gefaehrlich, beschreibung: gefaehrlich, mods: [{ name: gefaehrlich, quelle: 'Nachricht', version: gefaehrlich }],
      crafts: [{ name: gefaehrlich, item: gefaehrlich, beschreibung: gefaehrlich }], roh: { x: gefaehrlich } })], T0);
    merge(t, [res(5, { beschreibung: gefaehrlich + 'neu' })], T0 + 5000);
    evalIn(t.ctx, '_spOffen.add(5)');
    const html = evalIn(t.ctx, "spielerKarteHtml(SPIELER_DB['5'], Date.now())");
    expect(html).not.toMatch(/<img|<script/i);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('Karte zeigt Name, Nummer, zuletzt gesehen (Datum + Uhrzeit), Begegnungen, Mod-Plaketten und die Beschreibung', () => {
    const t = boot();
    merge(t, [res(5, { name: 'Mia', nickname: 'Miez', beschreibung: 'Liebe Katzen', mods: [{ name: 'BCXMsg', quelle: 'Nachricht', version: '1.2' }] })], T0);
    const html = evalIn(t.ctx, `spielerKarteHtml(SPIELER_DB['5'], ${T0 + 60000})`);
    expect(html).toContain('Miez (Mia)');
    expect(html).toContain('#5');
    expect(html).toContain('5.10.2026 20:00');
    expect(html).toContain('vor 1 Min.');
    expect(html).toContain('1× begegnet');
    expect(html).toContain('BCX');
    expect(html).toContain('1.2');
    expect(html).toContain('Liebe Katzen');
  });

  it('Detail: alle Abschnitte, die Daten haben, und der Text zum Kopieren enthält Beschreibung und Änderungen', () => {
    const t = boot();
    const voll = { name: 'Mia', beschreibung: 'Zeile 1\nZeile 2', titel: 'Kätzchen', pronomen: 'SheHer', erstellt: new Date(2020, 0, 15).getTime(), schwierigkeit: 2, itemPermission: 3,
      besitzer: { nr: 9, name: 'Herrin', seit: new Date(2024, 4, 1).getTime(), stufe: 1 }, lover: [{ nr: 7, name: 'Schatz', seit: null, stufe: 2 }],
      geteilt: ['MBS', 'GameVersion'], crafts: [{ name: 'Halsband', item: 'Collar', beschreibung: 'weich', eigenschaft: 'Normal' }],
      mods: [{ name: 'LSCGMsg', quelle: 'Nachricht' }] };
    merge(t, [res(5, voll)], T0, 'Raum A');
    merge(t, [res(5, { ...voll, beschreibung: 'Geändert' })], T0 + 60000, 'Raum B');
    const html = evalIn(t.ctx, `spielerDetailHtml(SPIELER_DB['5'], ${T0 + 120000})`);
    for (const teil of ['Mitgliedsnummer', 'Kätzchen', 'SheHer', '15.1.2020', 'Hardcore', 'Nur Besitzer, Lover und Whitelist', 'Halsband von Herrin (9)', 'Verheiratet mit Schatz (7)', 'Mods (1)', 'Geteilte Einstellungen', 'Crafts (1)', 'Gesehen in', 'Raum B', 'Beschreibung', 'Änderungen (1)', 'Rohdaten', 'Als Text kopieren'])
      expect(html).toContain(teil);
    const text = evalIn(t.ctx, `spielerDetailText(SPIELER_DB['5'], ${T0 + 120000})`);
    expect(text).toContain('Mia  #5');
    expect(text).toContain('Zuletzt gesehen: 5.10.2026 20:01');
    expect(text).toContain('Geändert');
    expect(text).toMatch(/Beschreibung: ?→? ?Zeile 1\nZeile 2|Zeile 1\nZeile 2 → Geändert/);
  });

  it('der Tab zeichnet die Liste, zählt, und zeigt bei vielen Spielern „Mehr anzeigen“', () => {
    const t = boot();
    merge(t, Array.from({ length: 250 }, (_, i) => res(i + 1)));
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    const body = t.els.spBody.innerHTML;
    expect((body.match(/class="sp-karte[ "]/g) || []).length).toBe(200);
    expect(body).toContain('Mehr anzeigen (50 weitere)');
    expect(t.els.spZaehler.textContent).toBe('250 Spieler');
    evalIn(t.ctx, 'spMehr()');
    expect((t.els.spBody.innerHTML.match(/class="sp-karte[ "]/g) || []).length).toBe(250);
  });

  it('leere Liste: Hinweis; Suche ohne Treffer: „Keine Treffer“', () => {
    const t = boot();
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    expect(t.els.spBody.innerHTML).toContain('Noch keine Spieler gespeichert');
    merge(t, [res(5)]);
    t.els.spSearchInput.value = 'gibtsnicht';
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    expect(t.els.spBody.innerHTML).toContain('Keine Treffer');
  });

  it('Karte aufklappen zeichnet nur diese Karte neu', () => {
    const t = boot();
    merge(t, [res(5, { name: 'Mia' })]);
    evalIn(t.ctx, 'renderSpielerProfileTab()');
    const neu = { firstElementChild: { tag: 'neu' } };
    t.ctx.document.createElement = () => ({ set innerHTML(v) { neu.html = v; }, get firstElementChild() { return neu.firstElementChild; } });
    const alt = { replaceWith: vi.fn() };
    t.els.sp_k_5 = alt;
    evalIn(t.ctx, 'spOeffnen(5)');
    expect(alt.replaceWith).toHaveBeenCalledTimes(1);
    expect(neu.html).toContain('sp-detail');
    expect(evalIn(t.ctx, '_spOffen.has(5)')).toBe(true);
  });
});

describe('Scan, Speichern, Bridge', () => {
  it('Scan sendet GET_SPIELER_PROFILE nur wenn verbunden; mehrere Auslöser kurz hintereinander werden zu einem', () => {
    const t = boot();
    evalIn(t.ctx, '_connected = false;');
    expect(t.ctx.spielerProfileScan('join')).toBe(false);
    evalIn(t.ctx, '_connected = true; _bcOrigin = "https://bc.test";');
    t.opener.postMessage.mockClear();
    expect(t.ctx.spielerProfileScan('join')).toBe(true);
    expect(t.ctx.spielerProfileScan('+Mia')).toBe(false);    // gleich danach: gedrosselt
    expect(t.ctx.spielerProfileScan('manuell', true)).toBe(true);   // von Hand immer
    const typen = t.opener.postMessage.mock.calls.map((c) => c[0].type);
    expect(typen.filter((x) => x === 'GET_SPIELER_PROFILE')).toHaveLength(2);
  });

  it('Antwort des Loaders landet in der Datenbank, der Raum wird gemerkt, die Anzeige aktualisiert', async () => {
    const t = boot();
    dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: t.opener });
    dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'SPIELER_PROFILE_DATA', results: [res(5, { beschreibung: 'Hi' }), res(6)], room: 'Testraum', gameVersion: 'R132', scanTime: T0 },
      { origin: 'https://bc.test', source: t.opener });
    const d = db(t);
    expect(Object.keys(d).sort()).toEqual(['5', '6']);
    expect(d['5'].raeume).toEqual({ Testraum: T0 });
    expect(d['5'].spielVersion).toBe('R132');
    expect([...evalIn(t.ctx, '_spImRaum')].sort()).toEqual(['5', '6']);
    expect(t.els.spStatus.textContent).toContain('2 im Raum');
    expect(t.els.spStatus.textContent).toContain('2 neu');
  });

  it('Fehlermeldung des Loaders wird gezeigt und verändert nichts', () => {
    const t = boot();
    merge(t, [res(5)]);
    dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: t.opener });
    dispatchMessage(t.ctx, { app: 'BCKonfigurator', type: 'SPIELER_PROFILE_DATA', err: 'kaputt' }, { origin: 'https://bc.test', source: t.opener });
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('kaputt'), 'error');
    expect(Object.keys(db(t))).toEqual(['5']);
  });

  it('gespeichert wird in der Datenbank; ein neuer Start liest sie wieder', async () => {
    const a = boot();
    await settle(60);
    merge(a, [res(5, { beschreibung: 'bleibt' })]);
    a.ctx.spielerSpeichern(0);
    a.ctx.bcSpeichernJetzt();
    // nicht auf feste Zeiten verlassen (fake-indexeddb ist unter Last unterschiedlich schnell): warten, bis es drin steht
    for (let i = 0; i < 60 && !(await a.ctx.idbGet('BC_SPIELERPROFILE_v1'))?.['5']; i++) await settle(50);
    const b = boot({ idb: a.idb });
    for (let i = 0; i < 60 && !db(b)['5']; i++) await settle(50);
    expect(db(b)['5'].beschreibung).toBe('bleibt');
  });

  it('der erste Schreibvorgang liest den Bestand noch einmal – ein Lesefehler beim Start überschreibt nichts', async () => {
    const a = boot();
    await settle(60);
    await a.ctx.idbSet('BC_SPIELERPROFILE_v1', { 8: { nr: 8, name: 'Alt', zuletzt: T0, erstmals: T0, mods: {}, raeume: {}, verlauf: [] } });
    evalIn(a.ctx, 'SPIELER_DB = {}; _spErstSchreiben = false; _spLoaded = true;');   // so, als wäre das Lesen beim Start fehlgeschlagen
    merge(a, [res(5)]);
    await evalIn(a.ctx, '_spielerSpeichernJetzt()');
    const gespeichert = await a.ctx.idbGet('BC_SPIELERPROFILE_v1');
    expect(Object.keys(gespeichert).sort()).toEqual(['5', '8']);
  });

  it('vor dem Laden wird nicht geschrieben (der Bestand kann nicht überschrieben werden)', async () => {
    const t = boot();
    evalIn(t.ctx, '_spLoaded = false;');
    expect(await evalIn(t.ctx, '_spielerSpeichernJetzt()')).toBe(false);
    expect(evalIn(t.ctx, '_spSavePending')).toBe(true);
  });

  it('leichte Sichtung aus der Raumliste: bekannte Spieler bekommen „zuletzt gesehen“, unbekannte werden nicht angelegt', () => {
    const t = boot();
    merge(t, [res(5)], 1000);
    evalIn(t.ctx, "spielerSichtung({ members: [{ num: 5, name: 'a' }, { num: 99, name: 'neu' }], memberNumber: 100 })");
    const d = db(t);
    expect(d['5'].zuletzt).toBeGreaterThan(1000);
    expect(d['99']).toBeUndefined();
    expect([...evalIn(t.ctx, '_spImRaum')].sort()).toEqual(['100', '5', '99']);
  });

  it('die Spielerprofile stehen im Gesamt-Backup (alle Datenbank-Schlüssel)', async () => {
    const t = boot();
    await settle(60);
    merge(t, [res(5, { beschreibung: 'im Backup' })]);
    t.ctx.spielerSpeichern(0);
    t.ctx.bcSpeichernJetzt();
    await settle(100);
    const e = await t.ctx._backupExtras();
    expect(e.idb.BC_SPIELERPROFILE_v1['5'].beschreibung).toBe('im Backup');
  });

  it('Export schreibt alle Spieler in eine Datei', () => {
    const teile = [];
    const t = boot();
    t.ctx.Blob = class { constructor(p) { teile.push(...p); } get size() { return teile.join('').length; } };
    t.ctx.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    t.ctx.document.createElement = () => Object.assign(makeElementStub(), { click() {} });
    merge(t, [res(5, { beschreibung: 'Export' })]);
    t.ctx.spielerProfileExport();
    const j = JSON.parse(teile.join(''));
    expect(j._meta.art).toBe('spielerprofile');
    expect(j.spieler['5'].beschreibung).toBe('Export');
  });
});

describe('Einbindung in das Tool', () => {
  const lies = (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');

  it('index.html: Tab-Knopf, Tab-Fläche und Skript nach scan-tab.js', () => {
    const h = lies('index.html');
    expect(h).toContain('id="tab-spielerprofile-btn"');
    expect(h).toContain('id="tab-spielerprofile" class="tab-pane"');
    expect(h.indexOf("src=\"spielerprofile.js?_=")).toBeGreaterThan(h.indexOf("src=\"scan-tab.js?_="));
  });

  it('items.js und Nova-Seitenleiste kennen den Tab (Gruppe „Items & Outfits“)', () => {
    expect(lies('items.js')).toMatch(/items: \['items','outfit','curse','outfit-scan','lscg-wheel','outfit-import','spielerprofile','locks'\]/);
    const n = lies('nova/nova.js');
    expect(n).toContain("'spielerprofile'");
    expect(n).toMatch(/'spielerprofile':\s*\{ t: 'Spielerprofile'/);
  });

  it('switchTab zeichnet den Tab und liest sofort aus; der Auto-Scan beim Beitritt liest die Spielerprofile mit', () => {
    const t = boot();
    evalIn(t.ctx, '_connected = true; _bcOrigin = "https://bc.test";');
    t.opener.postMessage.mockClear();
    evalIn(t.ctx, "switchTab('spielerprofile')");
    expect(t.els.spBody.innerHTML).toContain('Noch keine Spieler');
    expect(t.opener.postMessage.mock.calls.some((c) => c[0].type === 'GET_SPIELER_PROFILE')).toBe(true);
    const items = lies('items.js');
    expect(items).toContain("spielerProfileScan(_autoScanLastReason)");
    expect(items).toContain("spielerProfileScan('join-retry')");
  });

  it('Tab-Zähler zeigt die Zahl der Spieler', () => {
    const t = boot();
    merge(t, [res(5), res(6)]);
    const z = JSON.parse(JSON.stringify(evalIn(t.ctx, "_TAB_ZAEHLER.find(x => x.id === 'spielerprofile').anzahl()")));
    expect(z).toBe(2);
  });

  it('Export-Info nennt die Spielerprofile', async () => {
    const t = boot();
    merge(t, [res(5, { beschreibung: 'x', mods: [{ name: 'DOGS', quelle: 'Nachricht' }] })]);
    const text = await t.ctx.exportInfoSammeln();
    expect(text).toMatch(/Spielerprofile: 1 Spieler · 1 mit Beschreibung · 1 mit erkannten Mods/);
  });
});
