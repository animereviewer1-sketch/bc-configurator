import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, REPO_ROOT } from './helpers/loadScript.js';
import { makeLoaderSandbox } from './helpers/loaderSandbox.js';

// Ruhe vor dem Bild: Eine Aufnahme (Wheel, Profil, LSCG) wartet im Spiel-Tab kurz, wenn gerade viel gesendet wird (z. B. die Beitrittswelle der Mods
// nach einem Raumwechsel), sonst fotografiert sie sofort. Hintergrund: ErrorRateLimited-Trennung des BC-Servers.

const lies = (f) => fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');

// Den eingewickelten Code in einer kleinen Umgebung laufen lassen: eigene Uhr, eigener Zeitgeber, eigener Sende-Monitor
function laufen({ last, start = 1_000_000 } = {}) {
  const ctx = loadScript(['items.js'], {});
  const code = evalIn(ctx, "_shotMitRuhe('window.__lauf.push(Date.now());')");
  const uhr = { t: start };
  const aufgaben = [];
  const win = { __lauf: [], __BCK_SendeLast: last };
  const FakeDate = { now: () => uhr.t };
  const setTimeoutFake = (fn, ms) => { aufgaben.push({ fn, an: uhr.t + ms }); return aufgaben.length; };
  new Function('window', 'setTimeout', 'Date', code)(win, setTimeoutFake, FakeDate);
  // Zeit in 200-ms-Schritten laufen lassen (wie der Zeitgeber im Code), bis nichts mehr ansteht oder 60 s um sind
  const schritt = () => {
    uhr.t += 200;
    const faellig = aufgaben.filter((a) => a.an <= uhr.t);
    for (const a of faellig) { aufgaben.splice(aufgaben.indexOf(a), 1); a.fn(); }
  };
  return { win, uhr, aufgaben, schritt, start, vor: (ms) => { const bis = uhr.t + ms; while (uhr.t < bis && (aufgaben.length)) schritt(); } };
}

describe('_shotMitRuhe: Aufnahme wartet nur, wenn gerade viel gesendet wird', () => {
  it('ruhig: die Aufnahme startet sofort, ohne Zeitgeber', () => {
    const t = laufen({ last: () => ({ aufrufe: 3, raumwechsel: null }) });
    expect(t.win.__lauf).toEqual([t.start]);
    expect(t.aufgaben).toHaveLength(0);
  });

  it('ohne Sende-Monitor (alter Loader) oder bei einem Fehler im Monitor: kein Warten', () => {
    expect(laufen({ last: undefined }).win.__lauf).toHaveLength(1);
    expect(laufen({ last: () => { throw new Error('kaputt'); } }).win.__lauf).toHaveLength(1);
    expect(laufen({ last: () => null }).win.__lauf).toHaveLength(1);
  });

  it('laut (12 und mehr Sendungen in 3 s): wartet, bis es ruhig wird, und startet dann sofort', () => {
    let aufrufe = 20;
    const t = laufen({ last: () => ({ aufrufe, raumwechsel: null }) });
    expect(t.win.__lauf).toEqual([]);
    t.vor(1000);
    expect(t.win.__lauf).toEqual([]);          // noch laut
    aufrufe = 5;
    t.vor(400);
    expect(t.win.__lauf).toHaveLength(1);
    expect(t.win.__lauf[0] - t.start).toBeLessThan(2000);
  });

  it('genau an der Grenze: 11 Sendungen sind noch ruhig, 12 sind laut', () => {
    expect(laufen({ last: () => ({ aufrufe: 11, raumwechsel: null }) }).win.__lauf).toHaveLength(1);
    expect(laufen({ last: () => ({ aufrufe: 12, raumwechsel: null }) }).win.__lauf).toHaveLength(0);
  });

  it('kurz nach einem Raumwechsel (unter 3,5 s) wird gewartet – danach nicht mehr', () => {
    let seit = 500;
    const t = laufen({ last: () => ({ aufrufe: 0, raumwechsel: seit }) });
    expect(t.win.__lauf).toEqual([]);
    seit = 3600;
    t.vor(400);
    expect(t.win.__lauf).toHaveLength(1);
    // Ein lange zurückliegender Raumwechsel hält nicht auf
    expect(laufen({ last: () => ({ aufrufe: 0, raumwechsel: 60000 }) }).win.__lauf).toHaveLength(1);
  });

  it('bleibt es laut, wartet die Aufnahme höchstens 15 s und fotografiert dann trotzdem (nie ewig)', () => {
    const t = laufen({ last: () => ({ aufrufe: 99, raumwechsel: 100 }) });
    t.vor(14000);
    expect(t.win.__lauf).toEqual([]);
    t.vor(2500);
    expect(t.win.__lauf).toHaveLength(1);
    expect(t.win.__lauf[0] - t.start).toBeLessThanOrEqual(15400);
    expect(t.win.__lauf[0] - t.start).toBeGreaterThanOrEqual(15000);
  });

  it('die Aufnahme läuft genau einmal', () => {
    let aufrufe = 20;
    const t = laufen({ last: () => ({ aufrufe, raumwechsel: null }) });
    t.vor(600); aufrufe = 0; t.vor(2000);
    expect(t.win.__lauf).toHaveLength(1);
  });
});

describe('Alle Aufnahme-Wege sind eingewickelt', () => {
  const src = lies('items.js');

  it('Wheel (Serie und Einzelbild), Profil-Aufnahme und LSCG-Aufnahme senden ihren Code über _shotMitRuhe', () => {
    expect(src).toContain("return _shotMitRuhe('(function(){'");                                           // _wheelShotCode
    expect((src.match(/bcSend\(\{ type: 'EXEC', code: _shotMitRuhe\(code\) \}, true\);/g) || []).length).toBe(2);   // captureOsScreenshot + captureProfileViaCanvas
  });

  it('die Antwort-Wächter von Wheel und Profil rechnen die Wartezeit mit ein (sonst gälte ein wartendes Bild als verloren)', () => {
    expect((src.match(/12000 \+ SHOT_RUHE_MAX_MS/g) || []).length).toBe(2);
  });

  it('das eingewickelte Wheel-Bild enthält weiterhin die Sync-Sperre, das Bild und die Antwort an das Tool', () => {
    const ctx = loadScript(['items.js'], {});
    const code = evalIn(ctx, "_wheelShotCode('wss_1', [{ group: 'Cloth', asset: 'Dress', colors: 'Default' }], true)");
    expect(code.startsWith('(function(){var _run=function(){')).toBe(true);
    expect(code).toContain('BCU_captureGen');
    expect(code).toContain('SCREENSHOT_DATA');
    expect(code).toContain('window.__BCK_SendeLast');
    expect(() => new Function(code)).not.toThrow();
  });
});

describe('Loader: window.__BCK_SendeLast', () => {
  const boot = () => makeLoaderSandbox({ withBcModSdk: false, withModGlobals: false });
  const eintrag = (typ, vorMs, extra = {}) => ({ t: Date.now() - vorMs, k: 'send', typ, sub: '', kette: [], tool: false, aufnahme: false, dup: false, screen: '', ...extra });

  it('zählt alle Sendungen der letzten Millisekunden (auch die der Mods) und nennt die Zeit seit dem letzten Raumwechsel', () => {
    const sb = boot();
    const sm = sb.ctx.__BCK_SENDLOG2;
    expect(typeof sb.ctx.__BCK_SendeLast).toBe('function');
    sm.ring.push(eintrag('ChatRoomChat', 9000), eintrag('ChatRoomJoin', 2400), eintrag('ChatRoomChat', 2300), eintrag('AccountUpdate', 1500, { tool: true }), eintrag('ChatRoomChat', 200));
    const r = sb.ctx.__BCK_SendeLast(3000);
    expect(r.aufrufe).toBe(4);                 // Join, 3× danach – die vor 9 s zählt nicht
    expect(r.raumwechsel).toBeGreaterThanOrEqual(2400);
    expect(r.raumwechsel).toBeLessThan(2700);
  });

  it('Beitreten und Verlassen zählen als Raumwechsel; ohne beides ist es null', () => {
    const sb = boot();
    const sm = sb.ctx.__BCK_SENDLOG2;
    sm.ring.length = 0;
    sm.ring.push(eintrag('ChatRoomChat', 500));
    expect(sb.ctx.__BCK_SendeLast(3000).raumwechsel).toBeNull();
    sm.ring.push(eintrag('ChatRoomLeave', 1200));
    const r = sb.ctx.__BCK_SendeLast(3000);
    expect(r.raumwechsel).toBeGreaterThanOrEqual(1200);
    expect(r.raumwechsel).toBeLessThan(1500);
  });

  it('nur das Neueste zählt als Raumwechsel; Einträge, die keine Sendungen sind (Zustandswechsel), werden übersprungen', () => {
    const sb = boot();
    const sm = sb.ctx.__BCK_SENDLOG2;
    sm.ring.length = 0;
    sm.ring.push(eintrag('ChatRoomJoin', 20000), eintrag('ChatRoomLeave', 800), { t: Date.now() - 100, k: 'zustand', screen: 'ChatRoom' });
    const r = sb.ctx.__BCK_SendeLast(3000);
    expect(r.raumwechsel).toBeLessThan(1100);
    expect(r.aufrufe).toBe(1);
  });

  it('ohne Monitor-Daten kommt null (das Tool wartet dann nicht)', () => {
    const sb = boot();
    sb.ctx.__BCK_SENDLOG2 = undefined;
    expect(sb.ctx.__BCK_SendeLast(3000)).toBeNull();
  });
});
