import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { loadScript, evalIn, settle, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Speicher-Wächter (Warnung vor „Out of Memory“) und Aufräumen ungenutzter Daten. Gelöscht wird nur nach Rückfrage, nur Ungenutztes.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const LEGACY = ['BC_PROFILE_SCREENSHOTS_v1', 'BC_LSCG_SCREENSHOTS_v1', 'BC_MBS_WHEEL_SS_v1'];

function boot({ idb = new IDBFactory(), confirm = vi.fn(() => true), memory = null, ls = {}, sessionId = null } = {}) {
  const els = {};
  const globals = { console: quiet, indexedDB: idb, setTimeout, clearTimeout, confirm, navigator: { userAgent: 'T', storage: { estimate: async () => ({ usage: 5 * 1048576, quota: 100 * 1048576 }) } } };
  globals.performance = memory ? { memory } : {};
  const ctx = loadScript(['items.js', 'speicher.js'], globals);
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.querySelector = () => makeElementStub();
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  for (const [k, v] of Object.entries(ls)) ctx.localStorage.setItem(k, v);
  return { ctx, idb, els, confirm };
}
const kvSetzen = async (t, daten) => { for (const [k, v] of Object.entries(daten)) await t.ctx.idbSet(k, v); };
const kvSchluessel = async (t) => (await t.ctx.idbKvSchluessel()).sort();

describe('Schwellen und Stufen (reine Logik)', () => {
  const t = boot();
  const f = (code) => evalIn(t.ctx, code);

  it('Standard: gelb ab 1.100 MB, rot ab 1.400 MB; ein Limit-Anteil über 70 % ist immer rot', () => {
    expect(f('speicherSchwellen([])')).toEqual({ gelb: 1100, rot: 1400 });
    expect(f('speicherStufe(800, 4000, [])')).toBe('ok');
    expect(f('speicherStufe(1100, 4000, [])')).toBe('gelb');
    expect(f('speicherStufe(1399, 4000, [])')).toBe('gelb');
    expect(f('speicherStufe(1400, 4000, [])')).toBe('rot');
    expect(f('speicherStufe(700, 900, [])')).toBe('rot');      // 78 % des Limits
    expect(f('speicherStufe(700, 0, [])')).toBe('ok');         // Limit unbekannt
  });

  it('nach einem Absturz bei 1.700 MB liegen die Schwellen bei 60 % / 80 % davon, aber nie über den Standardwerten', () => {
    expect(f('speicherSchwellen([{ ts: 1, spitzeMB: 1700 }])')).toEqual({ gelb: 1020, rot: 1360 });
    expect(f('speicherSchwellen([{ ts: 1, spitzeMB: 3000 }])')).toEqual({ gelb: 1100, rot: 1400 });
    expect(f('speicherSchwellen([{ ts: 1, spitzeMB: 1700 }, { ts: 2, spitzeMB: 900 }])')).toEqual({ gelb: 540, rot: 720 });   // der niedrigste zählt
  });

  it('nie unter 400 MB; rot immer mindestens 100 MB über gelb', () => {
    const s = f('speicherSchwellen([{ ts: 1, spitzeMB: 300 }])');
    expect(s.gelb).toBe(400);
    expect(s.rot).toBe(500);
  });

  it('Formatierung', () => {
    expect(f('speicherMBText(850)')).toBe('850 MB');
    expect(f('speicherMBText(1536)')).toBe('1,5 GB');
    expect(f('speicherBytesText(5 * 1048576)')).toBe('5,0 MB');
    expect(f('speicherBytesText(2048)')).toBe('2 KB');
  });
});

describe('Einordnen der gespeicherten Schlüssel', () => {
  const t = boot();
  const e = (kv, ls) => JSON.parse(JSON.stringify(evalIn(t.ctx, `speicherEinordnen(${JSON.stringify(kv)}, ${JSON.stringify(ls)})`)));

  it('benutzte Schlüssel erscheinen nie in den Aufräum-Gruppen', () => {
    const r = e(['BC_Bots_v2', 'BC_PROFILES_v12', 'BC_CURSE_DB_v1', 'BCBot_Logs', 'BC_FAVORITES_v9'], ['BC_UI_NovaSide', 'BCK_Tweaks_v1', 'BC_PROFILES_v11']);
    expect(r.aktiv).toBe(8);
    expect(r.altKopien).toEqual([]);
    expect(r.unbekannt).toEqual({ kv: [], ls: [] });
  });

  it('Alt-Kopien, Spielerprofil-Daten (auch die Bilder je Spieler), Veraltetes und Unbekanntes werden getrennt', () => {
    const r = e([...LEGACY, 'BC_SPIELERPROFILE_v1', 'BC_SPIELERCACHE_META_v1', 'BC_SPIELERBILD_v1:123', 'BC_SPIELERBILD_v1:9', 'BC_CACHE_v11', 'BC_GANZ_ALT_v3', 'BC_Money_v1'],
      ['BC_SPIELERPROFILE_SORT_v1', 'BC_CURSE_DEFAULT_OUTFIT_v1', 'IRGENDWAS', 'BC_UI_SetTab']);
    expect(r.altKopien).toEqual(LEGACY);
    expect(r.spieler.kv).toEqual(['BC_SPIELERPROFILE_v1', 'BC_SPIELERCACHE_META_v1', 'BC_SPIELERBILD_v1:123', 'BC_SPIELERBILD_v1:9']);
    expect(r.spieler.ls).toEqual(['BC_SPIELERPROFILE_SORT_v1']);
    expect(r.veraltet).toEqual({ kv: ['BC_CACHE_v11'], ls: ['BC_CURSE_DEFAULT_OUTFIT_v1'] });
    expect(r.unbekannt).toEqual({ kv: ['BC_GANZ_ALT_v3'], ls: ['IRGENDWAS'] });
    expect(r.aktiv).toBe(2);
  });
});

describe('Die Liste der benutzten Schlüssel stimmt mit dem Code überein', () => {
  const lies = (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
  const PRODUKTION = ['items.js', 'persistence.js', 'bridge.js', 'scan-tab.js', 'game-scan.js', 'bc-autobackup.js', 'bot-data.js', 'bot-ui.js', 'inventar.js', 'money.js',
    'rank.js', 'shop.js', 'outfit-import.js', 'nova/nova.js', 'nova/nova-boot.js', 'index.html'];

  it('jeder im Produktionscode vorkommende Speicher-Schlüssel steht in einer der Listen (neue Schlüssel müssen in speicher.js eingetragen werden)', () => {
    const t = boot();
    const bekannt = new Set(evalIn(t.ctx, '[].concat(SPEICHER_AKTIV, SPEICHER_ALTKOPIEN, SPEICHER_SPIELER_KV, SPEICHER_SPIELER_LS, SPEICHER_VERALTET)'));
    const fehlend = new Set();
    for (const f of PRODUKTION) {
      const code = lies(f);
      for (const m of code.matchAll(/(['"`])((?:BC|BCK|BCBot|__OI)_[A-Za-z0-9_]*[A-Za-z0-9]|BCBot_Logs)\1/g)) {
        const key = m[2];
        if (bekannt.has(key)) continue;
        fehlend.add(key + '   (' + f + ')');
      }
    }
    // Dateinamen-Vorlagen (BC_Voll_…, BC_Backup_…) enden auf "_" und passen nicht auf das Muster; hier bleibt nur Echtes übrig
    expect([...fehlend]).toEqual([]);
  });

  it('die Liste enthält keine Schlüssel, die der Code gar nicht mehr nennt (sonst bliebe Totes ewig „in Benutzung“)', () => {
    const t = boot();
    const aktiv = evalIn(t.ctx, 'SPEICHER_AKTIV.slice()');
    const alles = PRODUKTION.map(lies).join('\n') + '\n' + lies('speicher.js').split('const SPEICHER_AKTIV')[0];
    const tot = aktiv.filter((k) => !alles.includes("'" + k + "'") && !alles.includes('"' + k + '"') && !alles.includes('`' + k + '`') && !alles.includes('SPEICHER_SITZUNG_KEY') );
    expect(tot.filter((k) => !k.startsWith('BC_SPEICHER_'))).toEqual([]);
  });

  it('idbKvLoeschen wird ausschließlich von speicher.js aufgerufen – nichts im restlichen Tool löscht Datenbank-Schlüssel', () => {
    for (const f of PRODUKTION) {
      const treffer = (lies(f).match(/idbKvLoeschen\s*\(/g) || []).length;
      expect([f, treffer]).toEqual([f, f === 'persistence.js' ? 1 : 0]);   // in persistence.js nur die Definition, sonst nirgends
    }
    expect((lies('speicher.js').match(/idbKvLoeschen\(/g) || []).length).toBeGreaterThan(0);
  });
});

describe('idbKvAlle liest die Alt-Kopien nicht in den Speicher', () => {
  it('standardmäßig ohne die eingefrorenen Alt-Kopien (kein 400-MB-Sprung bei Sicherung/Export-Info); mit mitAltKopien: true doch', async () => {
    const t = boot();
    await settle(80);
    await kvSetzen(t, { BC_Bots_v2: [1], BC_PROFILE_SCREENSHOTS_v1: { a: 'x'.repeat(1000) }, BC_LSCG_SCREENSHOTS_v1: { b: 'y' }, BC_MBS_WHEEL_SS_v1: { c: 'z' } });
    const alle = await t.ctx.idbKvAlle();
    expect(alle.BC_Bots_v2).toEqual([1]);
    for (const k of LEGACY) expect(k in alle).toBe(false);
    const mit = await t.ctx.idbKvAlle({ mitAltKopien: true });
    for (const k of LEGACY) expect(k in mit).toBe(true);
  });

  it('die Gesamt-Sicherung enthält sie weiterhin nicht (wie bisher), und die Export-Info nennt sie, ohne sie zu lesen', async () => {
    const t = boot();
    await settle(80);
    await kvSetzen(t, { BC_PROFILE_SCREENSHOTS_v1: { a: 'x' } });
    const e = await t.ctx._backupExtras();
    expect('BC_PROFILE_SCREENSHOTS_v1' in e.idb).toBe(false);
    const info = await t.ctx.exportInfoSammeln();
    expect(info).toContain('Alt-Kopien der Bilder (eingefroren, nicht gelesen): BC_PROFILE_SCREENSHOTS_v1');
  });
});

describe('Alt-Kopien der Bilder entfernen', () => {
  async function vorbereiten(t, { marker = { done: true, count: 3, counts: { profile: 1, lscg: 1, wheel: 1 }, ts: 1 }, imStore = { profile: ['A'], lscg: ['B'], wheel: ['C'] } } = {}) {
    await settle(80);
    await kvSetzen(t, { BC_Bots_v2: [1], BC_PROFILE_SCREENSHOTS_v1: { A: 'x' }, BC_LSCG_SCREENSHOTS_v1: { B: 'y' }, BC_MBS_WHEEL_SS_v1: { C: 'z' } });
    if (marker) await t.ctx.idbSet('BC_SCREENSHOT_MIGRATION_v1', marker);
    else await t.ctx.idbKvLoeschen('BC_SCREENSHOT_MIGRATION_v1');
    for (const [kind, keys] of Object.entries(imStore)) for (const k of keys) await t.ctx.idbScreenshotPut(kind, k, 'data:' + k);
  }

  it('nach Rückfrage werden genau die drei Alt-Kopien entfernt – alles Benutzte bleibt', async () => {
    const t = boot();
    await vorbereiten(t);
    expect(await t.ctx.speicherAltKopienEntfernen()).toBe(true);
    expect(t.confirm).toHaveBeenCalledTimes(1);
    const k = await kvSchluessel(t);
    for (const l of LEGACY) expect(k).not.toContain(l);
    expect(k).toContain('BC_Bots_v2');
    expect(k).toContain('BC_SCREENSHOT_MIGRATION_v1');
    expect((await t.ctx.idbScreenshotKeysOf('lscg'))).toEqual(['B']);   // die Bilder im Bild-Speicher bleiben
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('3 Alt-Kopie(n) der Bilder entfernt'), 'success');
  });

  it('„Abbrechen“ löscht nichts', async () => {
    const t = boot({ confirm: vi.fn(() => false) });
    await vorbereiten(t);
    expect(await t.ctx.speicherAltKopienEntfernen()).toBe(false);
    expect(await kvSchluessel(t)).toEqual(expect.arrayContaining(LEGACY));
  });

  it('ohne abgeschlossene, geprüfte Übernahme (kein Marker) wird NICHT entfernt – und nicht einmal gefragt', async () => {
    const t = boot();
    await vorbereiten(t, { marker: null });
    expect(await t.ctx.speicherAltKopienEntfernen()).toBe(false);
    expect(t.confirm).not.toHaveBeenCalled();
    expect(await kvSchluessel(t)).toEqual(expect.arrayContaining(LEGACY));
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('noch nicht'), 'error');
  });

  it('hat der Bild-Speicher weniger Bilder als bei der Übernahme, steht das in der Rückfrage', async () => {
    const t = boot();
    await vorbereiten(t, { imStore: { profile: [], lscg: ['B'], wheel: ['C'] } });
    await t.ctx.speicherAltKopienEntfernen();
    expect(t.confirm.mock.calls[0][0]).toContain('weniger Bilder');
    expect(t.confirm.mock.calls[0][0]).toContain('Profil: 0 statt 1');
  });

  it('gibt es keine Alt-Kopien, passiert nichts', async () => {
    const t = boot();
    await settle(80);
    expect(await t.ctx.speicherAltKopienEntfernen()).toBe(false);
    expect(t.confirm).not.toHaveBeenCalled();
  });
});

describe('Spielerprofil-Daten, Veraltetes und Unbekanntes entfernen', () => {
  it('Spielerprofile: die Datei, der Einlese-Stand, ALLE Spielerbilder und die Browser-Einstellungen gehen – sonst nichts', async () => {
    const t = boot({ ls: { BC_SPIELERPROFILE_SORT_v1: 'name', BC_UI_SetTab: 'speicher' } });
    await settle(80);
    await kvSetzen(t, { BC_SPIELERPROFILE_v1: { 5: {} }, BC_SPIELERCACHE_META_v1: {}, 'BC_SPIELERBILD_v1:5': 'a', 'BC_SPIELERBILD_v1:6': 'b', BC_Bots_v2: [1], BC_CURSE_DB_v1: { x: 1 } });
    expect(await t.ctx.speicherSpielerprofileEntfernen()).toBe(true);
    expect(t.confirm.mock.calls[0][0]).toContain('Spielerbilder: 2');
    const k = await kvSchluessel(t);
    expect(k.filter((x) => x.startsWith('BC_SPIELER'))).toEqual([]);
    expect(k).toEqual(expect.arrayContaining(['BC_Bots_v2', 'BC_CURSE_DB_v1']));
    expect(t.ctx.localStorage.getItem('BC_SPIELERPROFILE_SORT_v1')).toBeNull();
    expect(t.ctx.localStorage.getItem('BC_UI_SetTab')).toBe('speicher');
  });

  it('Veraltetes: nur die ersetzten Schlüssel (Datenbank und Browser-Speicher)', async () => {
    const t = boot({ ls: { BC_CURSE_DEFAULT_OUTFIT_v1: 'x', BC_CURSE_DEFAULT_OUTFIT_v2: 'y', BC_Money_v1: 'bleibt' } });
    await settle(80);
    await kvSetzen(t, { BC_CACHE_v11: { a: 1 }, BC_Bots_v2: [1] });
    expect(await t.ctx.speicherVeraltetEntfernen()).toBe(true);
    expect(await kvSchluessel(t)).not.toContain('BC_CACHE_v11');
    expect(await kvSchluessel(t)).toContain('BC_Bots_v2');
    expect(t.ctx.localStorage.getItem('BC_CURSE_DEFAULT_OUTFIT_v1')).toBeNull();
    expect(t.ctx.localStorage.getItem('BC_Money_v1')).toBe('bleibt');
  });

  it('Unbekanntes: nur ein tatsächlich unbekannter Schlüssel, einzeln und mit Rückfrage – ein benutzter wird abgelehnt', async () => {
    const t = boot({ ls: { BC_ZUFALL_v9: 'abc' } });
    await settle(80);
    await kvSetzen(t, { BC_GANZ_ALT_v3: { x: 1 }, BC_Bots_v2: [1] });
    expect(await t.ctx.speicherUnbekanntEntfernen('kv', 'BC_Bots_v2')).toBe(false);          // benutzt → nicht erlaubt
    expect(t.confirm).not.toHaveBeenCalled();
    expect(await kvSchluessel(t)).toContain('BC_Bots_v2');
    expect(await t.ctx.speicherUnbekanntEntfernen('kv', 'BC_GANZ_ALT_v3')).toBe(true);
    expect(await kvSchluessel(t)).not.toContain('BC_GANZ_ALT_v3');
    expect(await t.ctx.speicherUnbekanntEntfernen('ls', 'BC_ZUFALL_v9')).toBe(true);
    expect(t.ctx.localStorage.getItem('BC_ZUFALL_v9')).toBeNull();
    expect(t.confirm).toHaveBeenCalledTimes(2);
  });

  it('„Abbrechen“ beim Unbekannten lässt alles', async () => {
    const t = boot({ confirm: vi.fn(() => false) });
    await settle(80);
    await kvSetzen(t, { BC_GANZ_ALT_v3: { x: 1 } });
    expect(await t.ctx.speicherUnbekanntEntfernen('kv', 'BC_GANZ_ALT_v3')).toBe(false);
    expect(await kvSchluessel(t)).toContain('BC_GANZ_ALT_v3');
  });
});

describe('Seite „Speicher“', () => {
  it('zeigt Speicherstand, Gruppen und unbekannte Einträge (maskiert); benutzte Daten werden nicht zum Löschen angeboten', async () => {
    const t = boot({ memory: { usedJSHeapSize: 900 * 1048576, jsHeapSizeLimit: 4000 * 1048576 }, ls: { 'BC_<b>evil</b>': 'x' } });
    await settle(80);
    await kvSetzen(t, { BC_Bots_v2: [1], BC_PROFILE_SCREENSHOTS_v1: { A: 'x' }, BC_GANZ_ALT_v3: { x: 1 } });
    await evalIn(t.ctx, 'speicherSeiteAktualisieren()');
    const h = t.els.speicherSeite.innerHTML;
    expect(h).toContain('900 MB');
    expect(h).toContain('✅ in Ordnung');
    expect(h).toContain('BC_PROFILE_SCREENSHOTS_v1');
    expect(h).toContain('speicherAltKopienEntfernen()');
    expect(h).toContain('BC_GANZ_ALT_v3');
    expect(h).toContain('BC_&lt;b&gt;evil&lt;/b&gt;');
    expect(h).not.toContain('<b>evil</b>');
    expect(h).not.toContain('BC_Bots_v2');                      // Benutztes steht nirgends zur Auswahl
  });
});

describe('Absturz-Erkennung', () => {
  const SIT = 'BC_SPEICHER_SITZUNGEN_v1', AB = 'BC_SPEICHER_ABSTUERZE_v1';
  const jetzt = 1_800_000_000_000;

  it('eine nicht sauber beendete Sitzung dieses Fensters gilt als Absturz bei ihrem höchsten Stand – und senkt die Schwellen', () => {
    const t = boot();
    const id = evalIn(t.ctx, '_spchId');
    t.ctx.localStorage.setItem(SIT, JSON.stringify({ [id]: { start: 1, ts: jetzt - 20000, laeuft: true, spitzeMB: 1712 } }));
    evalIn(t.ctx, '_spchAbstuerze = [];');
    expect(evalIn(t.ctx, `speicherAbstuerzeErkennen(${jetzt})`)).toBe(1);
    expect(JSON.parse(t.ctx.localStorage.getItem(AB))).toEqual([{ ts: jetzt - 20000, spitzeMB: 1712 }]);
    expect(evalIn(t.ctx, 'speicherSchwellen(_spchAbstuerze)')).toEqual({ gelb: 1027, rot: 1370 });
  });

  it('eine sauber beendete Sitzung ist kein Absturz', () => {
    const t = boot();
    const id = evalIn(t.ctx, '_spchId');
    t.ctx.localStorage.setItem(SIT, JSON.stringify({ [id]: { start: 1, ts: jetzt - 20000, laeuft: false, spitzeMB: 1712 } }));
    evalIn(t.ctx, '_spchAbstuerze = [];');
    expect(evalIn(t.ctx, `speicherAbstuerzeErkennen(${jetzt})`)).toBe(0);
  });

  it('ein anderes Fenster, das sich gerade noch meldet, ist kein Absturz; eines, das sich 90 s nicht mehr meldet, schon', () => {
    const t = boot();
    t.ctx.localStorage.setItem(SIT, JSON.stringify({
      lebendig: { start: 1, ts: jetzt - 5000, laeuft: true, spitzeMB: 1000 },
      weg: { start: 1, ts: jetzt - 200000, laeuft: true, spitzeMB: 1500 },
    }));
    evalIn(t.ctx, '_spchAbstuerze = [];');
    expect(evalIn(t.ctx, `speicherAbstuerzeErkennen(${jetzt})`)).toBe(1);
    expect(JSON.parse(t.ctx.localStorage.getItem(AB))[0].spitzeMB).toBe(1500);
    expect(Object.keys(JSON.parse(t.ctx.localStorage.getItem(SIT)))).toEqual(['lebendig']);
    // ein zweites Mal wird derselbe Absturz nicht noch einmal gezählt
    expect(evalIn(t.ctx, `speicherAbstuerzeErkennen(${jetzt + 1000})`)).toBe(0);
  });

  it('es werden höchstens die letzten 5 Abstürze gemerkt', () => {
    const t = boot();
    const sit = {};
    for (let i = 0; i < 8; i++) sit['x' + i] = { start: 1, ts: jetzt - 500000 - i, laeuft: true, spitzeMB: 1000 + i };
    t.ctx.localStorage.setItem(SIT, JSON.stringify(sit));
    evalIn(t.ctx, '_spchAbstuerze = [];');
    evalIn(t.ctx, `speicherAbstuerzeErkennen(${jetzt})`);
    expect(JSON.parse(t.ctx.localStorage.getItem(AB))).toHaveLength(5);
  });
});

describe('Wächter und Meldung', () => {
  const MB = 1048576;
  it('ohne Speicherangabe des Browsers startet kein Zeitgeber und es passiert nichts', () => {
    const t = boot();
    expect(evalIn(t.ctx, 'speicherLesen()')).toBeNull();
    expect(evalIn(t.ctx, 'speicherTick()')).toBeNull();
  });

  it('steigt der Speicher, kommt genau eine Meldung je Stufe (gelb, dann rot) – kein Dauerfeuer', () => {
    const mem = { usedJSHeapSize: 800 * MB, jsHeapSizeLimit: 4000 * MB };
    const t = boot({ memory: mem });
    t.ctx.showStatus.mockClear();
    mem.usedJSHeapSize = 1150 * MB; evalIn(t.ctx, 'speicherTick()');
    mem.usedJSHeapSize = 1200 * MB; evalIn(t.ctx, 'speicherTick()');
    expect(t.ctx.showStatus.mock.calls.filter((c) => String(c[0]).includes('Speicher wird knapp'))).toHaveLength(1);
    mem.usedJSHeapSize = 1450 * MB; evalIn(t.ctx, 'speicherTick()');
    mem.usedJSHeapSize = 1500 * MB; evalIn(t.ctx, 'speicherTick()');
    expect(t.ctx.showStatus.mock.calls.filter((c) => String(c[0]).includes('Absturzgefahr'))).toHaveLength(1);
    expect(evalIn(t.ctx, '_spchSpitze')).toBeCloseTo(1500, 0);
  });

  it('der Stand wird für die Absturz-Erkennung festgehalten', () => {
    const mem = { usedJSHeapSize: 1300 * MB, jsHeapSizeLimit: 4000 * MB };
    const t = boot({ memory: mem });
    evalIn(t.ctx, '_spchLetzterSchreib = 0;');     // „vor längerer Zeit zuletzt geschrieben“
    evalIn(t.ctx, 'speicherTick()');
    const sit = JSON.parse(t.ctx.localStorage.getItem('BC_SPEICHER_SITZUNGEN_v1'));
    const id = evalIn(t.ctx, '_spchId');
    expect(sit[id].laeuft).toBe(true);
    expect(sit[id].spitzeMB).toBeGreaterThanOrEqual(1299);
  });

  it('der Banner nennt Stand, Limit und den letzten Absturz; Text wird maskiert', () => {
    const t = boot();
    t.ctx.__a = [{ ts: 1, spitzeMB: 1700 }];
    const h = evalIn(t.ctx, 'speicherBannerHtml("rot", 1500, 4000, __a)');
    expect(h).toContain('Absturzgefahr');
    expect(h).toContain('1,5 GB');
    expect(h).toContain('abgestürzt');
    expect(h).toContain('speicherSeiteOeffnen()');
    expect(evalIn(t.ctx, 'speicherBannerHtml("gelb", 1200, 0, [])')).toContain('Speicher wird knapp');
  });

  it('beim Start nach einem Absturz kommt eine Meldung mit dem Stand', () => {
    const t = boot();
    t.ctx.localStorage.setItem('BC_SPEICHER_SITZUNGEN_v1', JSON.stringify({ altesFenster: { start: 1, ts: Date.now() - 300000, laeuft: true, spitzeMB: 1650 } }));
    evalIn(t.ctx, '_spchAbstuerze = [];');
    t.ctx.showStatus.mockClear();
    evalIn(t.ctx, 'speicherWaechterStarten()');
    expect(t.ctx.showStatus).toHaveBeenCalledWith(expect.stringContaining('abgestürzt'), 'error');
    expect(t.ctx.showStatus.mock.calls[0][0]).toContain('1,6 GB');
  });
});
