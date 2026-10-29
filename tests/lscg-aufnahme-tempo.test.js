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
function spiel({ aendernBis = 0 } = {}) {
  const z = { refresh: 0, loadCanvas: 0, antworten: [], timers: [] };
  const px = new Uint8ClampedArray(4 * 8 * 8).fill(10);
  const canvas = () => ({
    width: 8, height: 8,
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: px }), fillRect() {}, set fillStyle(v) {} }),
    toDataURL: () => 'data:image/jpeg;base64,AAAA',
  });
  const Player = { OnlineID: 7, MemberNumber: 100, AssetFamily: 'Female3DCG', Appearance: [], Canvas: canvas() };
  const g = {
    Player, JSON, Array, Object, Math, Date, Error, Uint8ClampedArray, performance: { now: () => 0 },
    setTimeout: (fn, ms) => { z.timers.push({ fn, ms }); return z.timers.length; },
    clearTimeout() {},
    document: { createElement: () => canvas() },
    CharacterRefresh() { z.refresh++; if (z.refresh <= aendernBis) px[0] += 1; },   // Bild ändert sich noch (Bilder laden nach)
    CharacterLoadCanvas() { z.loadCanvas++; },
    ServerSend() {}, ServerPlayerAppearanceSync() {}, InventoryExpressionTriggerApply() {},
    __BCK_popupRef: { postMessage: (m) => z.antworten.push(m) },
  };
  g.window = g;
  const ctx = vm.createContext(g);
  return {
    z, lauf: (code) => vm.runInContext(code, ctx),
    // Timer der Reihe nach ablaufen lassen, bis die Antwort da ist; Rückgabe = Summe der Wartezeiten bis dahin
    bisAntwort: () => {
      let summe = 0, n = 0;
      while (!z.antworten.length && z.timers.length && n++ < 50) { const t = z.timers.shift(); summe += t.ms || 0; t.fn(); }
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
