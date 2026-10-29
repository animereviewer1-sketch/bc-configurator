import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// LSCG-Bilder (captureOsScreenshot) brauchten ein Mehrfaches der Wheel-Bilder: Der Prüflauf hatte keinen
// Vergleichswert (null) und wartete je Lauf 100–150 ms, zeichnete zweimal neu (Refresh + LoadCanvas) und
// brauchte mindestens zwei Läufe. Jetzt wie Profil und Wheel: Vergleichswert direkt nach dem Anlegen,
// ein Neuzeichnen je Lauf, 40 ms bis zum ersten Lauf, 60 ms zwischen den Läufen.

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function tool() {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {},
    Image: class { set src(v) { this._s = v; } } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, execs };
}

// Nachgebautes BC-Fenster: Timer mit Wartezeit, Canvas mit veränderbarem Inhalt, Zähler für Neuzeichnen
// bilder: Einträge des BC-Bildcaches (DrawImageCache), z. B. { state: 'loading', fertigNach: 300 } (ms Spielzeit bis "loaded")
function spiel({ aendernBis = 0, bilder = null, glBilder = null } = {}) {
  const z = { refresh: 0, loadCanvas: 0, antworten: [], timers: [], t: 0, bilder: bilder || [], glBilder: glBilder || [], refreshMitOffenen: 0, offenBeiAntwort: null };
  const offen = () => z.bilder.concat(z.glBilder).filter((b) => b.state === 'loading').length;
  const px = new Uint8ClampedArray(4 * 8 * 8).fill(10);
  const canvas = () => ({
    width: 8, height: 8,
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: px }), fillRect() {}, set fillStyle(v) {} }),
    toDataURL: () => 'data:image/jpeg;base64,AAAA',
  });
  const Player = { OnlineID: 7, MemberNumber: 100, AssetFamily: 'Female3DCG', Appearance: [], Canvas: canvas() };
  const g = {
    Player, JSON, Array, Object, Math, Error, Uint8ClampedArray, performance: { now: () => 0 },
    Date: { now: () => z.t },
    setTimeout: (fn, ms) => { z.timers.push({ fn, ms }); return z.timers.length; },
    clearTimeout() {},
    document: { createElement: () => canvas() },
    CharacterRefresh() {
      z.refresh++;
      if (offen() > 0) z.refreshMitOffenen++;
      if (z.refresh <= aendernBis) px[0] += 1;   // Bild ändert sich noch (Bilder laden nach)
    },
    CharacterLoadCanvas() { z.loadCanvas++; },
    ServerSend() {}, ServerPlayerAppearanceSync() {}, InventoryExpressionTriggerApply() {},
    __BCK_popupRef: { postMessage: (m) => { z.offenBeiAntwort = offen(); z.antworten.push(m); } },
  };
  if (bilder) g.DrawImageCache = { forEach: (fn) => z.bilder.forEach((b) => fn(b)) };
  if (glBilder) g.GLDrawImageCache = { forEach: (fn) => z.glBilder.forEach((b) => fn(b)) };
  g.window = g;
  const ctx = vm.createContext(g);
  return {
    z, lauf: (code) => vm.runInContext(code, ctx),
    // Timer der Reihe nach ablaufen lassen, bis die Antwort da ist; Rückgabe = Summe der Wartezeiten bis dahin
    bisAntwort: () => {
      let summe = 0, n = 0;
      while (!z.antworten.length && z.timers.length && n++ < 500) {
        const t = z.timers.shift();
        summe += t.ms || 0; z.t += t.ms || 0;
        z.bilder.concat(z.glBilder).forEach((b) => { if (b.state === 'loading' && b.fertigNach != null && z.t >= b.fertigNach) b.state = 'loaded'; });   // BC lädt nebenher
        t.fn();
      }
      return summe;
    },
  };
}

function aufnahmeCode() {
  const t = tool();
  evalIn(t.ctx, "LSCG_DB['1001'] = { name: 'Alice', versions: [{ fingerprint: 'fpA' }] }");   // ohne Outfit-Code: nur der Prüflauf wird gemessen
  t.ctx.captureOsScreenshot('1001', 0);
  return t.execs()[0];
}

describe('LSCG-Aufnahme: Prüflauf wie bei Profil und Wheel', () => {
  it('der erzeugte Code ist gültiges JavaScript und enthält die schnelle Schleife', () => {
    const code = aufnahmeCode();
    expect(() => new Function(code)).not.toThrow();
    expect(code).toContain('var _prevHash=_canvasHash(Player.Canvas),_checksDone=0,_maxChecks=3;');
    expect(code).toContain('setTimeout(_renderCheck,40);');
    expect(code).toContain('setTimeout(_renderCheck,60);');
    const lauf = code.slice(code.indexOf('function _renderCheck(){'), code.indexOf('setTimeout(_renderCheck,40);'));
    expect(lauf).not.toContain('CharacterLoadCanvas');                 // CharacterRefresh zeichnet selbst
    expect(lauf).not.toMatch(/setTimeout\(function\(\)\{/);            // keine feste Wartezeit vor dem Vergleich mehr
  });

  it('stabiles Bild: ein Neuzeichnen im Prüflauf, kein LoadCanvas, Antwort nach 40 ms Wartezeit', () => {
    const s = spiel();
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(s.z.antworten[0].data).toMatch(/^data:image\/jpeg/);
    expect(s.z.antworten[0].err).toBeUndefined();
    expect(warten).toBe(40);
    expect(s.z.loadCanvas).toBe(0);
    expect(s.z.refresh).toBe(3);        // Anlegen (ohne Outfit: einfacher Refresh), ein Prüflauf, Zurücksetzen der Ausgangslage
  });

  it('Bild ändert sich noch (Bilder laden nach): nochmal prüfen, höchstens 3 Wiederholungen, dann trotzdem fertig', () => {
    const s = spiel({ aendernBis: 99 });   // ändert sich bei jedem Neuzeichnen
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(s.z.antworten[0].data).toBeTruthy();
    expect(warten).toBe(40 + 3 * 60);
  });

  it('Bild wird erst nach einem weiteren Lauf stabil: genau ein Wiederholungslauf', () => {
    const s = spiel({ aendernBis: 2 });    // Anlegen + erster Prüflauf ändern das Bild, der zweite nicht
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(warten).toBe(40 + 60);
  });

  it('danach ist das Aussehen wieder da und die Antwort geht an das Tool', () => {
    const s = spiel();
    s.lauf(aufnahmeCode());
    s.bisAntwort();
    expect(s.z.antworten[0]).toMatchObject({ app: 'BCKonfigurator', type: 'CANVAS_PREVIEW_DATA' });
  });
});

// BC R133 lädt die Teile der Figur asynchron (DrawImageCache, Zustand "loading"). Ein noch nicht geladenes Bild fehlt beim Zeichnen
// einfach – und sieht beim nächsten Neuaufbau genauso leer aus. Ein Hash-Vergleich allein fotografiert dann Glatze, nackte Figur oder
// ein Gesicht ohne Augen. Der Prüflauf wartet darum, bis kein Bild mehr lädt.
describe('Aufnahme wartet auf ladende Bilder', () => {
  it('Bilder laden noch: erst nach dem Laden wird neu gezeichnet und fotografiert', () => {
    const s = spiel({ bilder: [{ state: 'loading', fertigNach: 300 }, { state: 'loading', fertigNach: 500 }, { state: 'loaded' }] });
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(s.z.antworten[0].data).toBeTruthy();
    expect(s.z.offenBeiAntwort).toBe(0);             // beim Foto ist nichts mehr offen
    expect(warten).toBeGreaterThanOrEqual(500);       // mindestens bis das letzte Bild da ist
    expect(s.z.refreshMitOffenen).toBe(1);            // nur der erste Aufbau beim Anlegen lief mit offenen Bildern, der Prüflauf nicht
  });

  it('nur der WebGL-Bildspeicher lädt noch (der normale ist leer/fertig): es wird trotzdem gewartet – der Fehler aus dem Protokoll', () => {
    const s = spiel({ bilder: [{ state: 'loaded' }], glBilder: [{ state: 'loading', fertigNach: 400 }, { state: 'loading', fertigNach: 650 }] });
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(s.z.offenBeiAntwort).toBe(0);
    expect(warten).toBeGreaterThanOrEqual(650);
    expect(s.z.antworten[0].diag.offenGl).toBe(0);
  });

  it('ein Bild lädt nie fertig: nach SHOT_BILDER_MAX_MS wird trotzdem fotografiert', () => {
    const s = spiel({ bilder: [{ state: 'loading' }] });
    s.lauf(aufnahmeCode());
    const warten = s.bisAntwort();
    expect(s.z.antworten).toHaveLength(1);
    expect(s.z.antworten[0].data).toBeTruthy();
    expect(warten).toBeGreaterThanOrEqual(6000);
    expect(warten).toBeLessThan(6000 + 500);
  });

  it('fehlgeschlagene und geladene Bilder zählen nicht als offen: keine Verzögerung', () => {
    const s = spiel({ bilder: [{ state: 'failed' }, { state: 'loaded' }, { state: 'uncached' }] });
    s.lauf(aufnahmeCode());
    expect(s.bisAntwort()).toBe(40);
    expect(s.z.antworten).toHaveLength(1);
  });

  it('ein Cache, der beim Durchgehen wirft, blockiert die Aufnahme nicht', () => {
    const s = spiel({ bilder: [] });
    s.lauf('window.DrawImageCache={forEach:function(){throw new Error("kaputt");}};' + aufnahmeCode());
    expect(s.bisAntwort()).toBe(40);
    expect(s.z.antworten).toHaveLength(1);
  });

  it('Profil- und Wheel-Aufnahme warten ebenfalls (vor und nach dem Neuzeichnen)', () => {
    const t = tool();
    t.ctx.captureProfileViaCanvas('A - B', 'BUNDLE', null);
    t.ctx.__i = [{ group: 'ItemArms', asset: 'X', colors: ['#fff'] }];
    const wheel = evalIn(t.ctx, "_wheelShotCode('wss_1', __i, true)");
    for (const code of [t.execs()[0], wheel]) {
      expect(() => new Function(code)).not.toThrow();
      const lauf = code.slice(code.indexOf('function _renderCheck(){'), code.indexOf('setTimeout(_renderCheck,40);'));
      expect(lauf.match(/_bilderWarten\(\)/g)).toHaveLength(2);
      expect(lauf.indexOf('_bilderWarten()')).toBeLessThan(lauf.indexOf('CharacterRefresh(Player,false,false)'));
      expect(lauf.lastIndexOf('_bilderWarten()')).toBeGreaterThan(lauf.indexOf('CharacterRefresh(Player,false,false)'));
      expect(code).toContain('"DrawImageCache"');
      expect(code).toContain('"GLDrawImageCache"');     // BC zeichnet über WebGL und lädt die Teile in einen eigenen Bildspeicher
    }
  });
});
