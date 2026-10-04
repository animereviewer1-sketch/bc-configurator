import vm from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Profil-Screenshots schneller:
//  - Spiel-Tab: Der Prüflauf zeichnet EINMAL neu (CharacterRefresh ruft CharacterLoadCanvas selbst auf, der frühere
//    zweite Aufruf zeichnete doppelt) und vergleicht mit dem Bild direkt nach dem Anlegen. Früher: Vergleichswert
//    null → immer mindestens zwei Prüfläufe mit je zwei Mal Neuzeichnen (insgesamt fünf volle Aufbauten pro Profil).
//  - Tool: Das nächste Profil startet sofort nach der Antwort, nicht erst nach Dekodieren/Verkleinern/Speichern und
//    250 ms Pause. Zeiten werden mitgemessen und angezeigt.

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function tool(setTimeoutSpy) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const ctx = loadScript(['items.js'], { opener, setTimeout: setTimeoutSpy || (() => 0), clearTimeout: () => {},
    Image: class { set src(v) { this._src = v; } } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  return { ctx, opener, els, execs };
}

// Nachgebautes BC: Das Bild von Player.Canvas ändert sich nach einem Skript (je Neuzeichnen eine "Version")
function spiel(code, versionen) {
  const z = { refresh: 0, loadCanvas: 0, gesendet: [], refreshBeiSenden: null };
  const timers = [];
  let version = 0;
  let jetzt = 0;
  const leinwand = (breite, hoehe, get) => ({
    width: breite, height: hoehe,
    getContext: () => ({
      drawImage() {}, fillRect() {}, fillStyle: '',
      getImageData: (x, y, w, h) => {
        const d = new Uint8ClampedArray(w * h * 4);
        const v = get();
        for (let i = 0; i < d.length; i += 4) { d[i] = v * 10; d[i + 1] = 200; d[i + 2] = 50; d[i + 3] = 255; }
        return { data: d };
      },
    }),
    toDataURL: () => 'data:image/jpeg;base64,AAAA',
  });
  const Player = {
    Appearance: [], ActivePoseMapping: { BodyLower: 'BaseLower', BodyUpper: 'BaseUpper' },
    Canvas: leinwand(8, 16, () => version),
  };
  const g = {
    Player, JSON, Array, Math, Uint8ClampedArray, Error,
    performance: { now: () => (jetzt += 5) },
    document: { createElement: () => leinwand(8, 16, () => version) },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    CharacterRefresh() { z.refresh++; version = versionen[Math.min(z.refresh - 1, versionen.length - 1)]; },
    CharacterLoadCanvas() { z.loadCanvas++; },
  };
  g.window = g;
  g.__BCK_popupRef = {
    postMessage: (m) => { z.gesendet.push(m); if (z.refreshBeiSenden === null) z.refreshBeiSenden = z.refresh; },
  };
  const ctx = vm.createContext(g);
  vm.runInContext(code, ctx);
  let n = 0;
  while (timers.length && n++ < 50) timers.shift()();
  return { z, Player };
}

function captureCode(raw = 'var x = 1;') {
  const t = tool();
  t.ctx.captureProfileViaCanvas('A - B', null, raw);
  return t.execs()[0];
}

describe('Prüflauf im Spiel-Tab: weniger Neuzeichnen', () => {
  it('Bild ist sofort stabil: nur das Anlegen und EIN Prüflauf zeichnen – dann wird aufgenommen', () => {
    const { z } = spiel(captureCode(), [1, 1, 1, 1]);
    expect(z.refreshBeiSenden).toBe(2);            // Anlegen (1) + ein Prüflauf (1)
    expect(z.gesendet.length).toBe(1);
    expect(z.gesendet[0].data).toBeTruthy();
  });

  it('CharacterLoadCanvas wird nicht mehr zusätzlich aufgerufen (steckt in CharacterRefresh)', () => {
    const { z } = spiel(captureCode(), [1, 1, 1, 1]);
    expect(z.loadCanvas).toBe(0);
  });

  it('nachgeladenes Bild: ein weiterer Prüflauf, dann stabil → aufgenommen', () => {
    const { z } = spiel(captureCode(), [1, 2, 2, 2]);
    expect(z.refreshBeiSenden).toBe(3);
    expect(z.gesendet.length).toBe(1);
  });

  it('wird es nie stabil, ist nach höchstens drei Wiederholungen Schluss (es wird trotzdem aufgenommen)', () => {
    const { z } = spiel(captureCode(), [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(z.refreshBeiSenden).toBeLessThanOrEqual(1 + 4);   // Anlegen + höchstens vier Prüfläufe
    expect(z.gesendet.length).toBe(1);
  });

  it('die Antwort trägt die Zeitmessung (Anlegen / Zeichnen / Bild) als Zahlen', () => {
    const { z } = spiel(captureCode(), [1, 1, 1]);
    const t = z.gesendet[0].t;
    expect(t).toBeTruthy();
    for (const k of ['a', 'r', 'c']) expect(Number.isFinite(t[k])).toBe(true);
  });

  it('danach wird lokal zurückgesetzt (Aussehen und – bei Einzelaufnahme – Pose), jeweils ohne Server-Push', () => {
    const { z } = spiel(captureCode(), [1, 1, 1]);
    expect(z.refresh).toBeGreaterThan(z.refreshBeiSenden);
    expect(z.refresh - z.refreshBeiSenden).toBeLessThanOrEqual(2);
  });

  it('der erzeugte Code ist gültiges JavaScript', () => {
    expect(() => new Function(captureCode())).not.toThrow();
  });
});

describe('Entfernen eines Emoticons: nur dann zusätzlich neu zeichnen', () => {
  it('Emoticon vorhanden → ein Neuzeichnen mehr vor dem ersten Vergleichswert, sonst nicht', () => {
    const code = captureCode();
    const ohne = spiel(code, [1, 1, 1]);
    expect(ohne.z.refreshBeiSenden).toBe(2);
    // Mit Emoticon im Aussehen: erst nach dem Anlegen entfernen + neu zeichnen
    const mit = (() => {
      const t = spiel(code.replace('var x = 1;', 'Player.Appearance.push({Asset:{Name:"Afk",Group:{Name:"Emoticon"}}});'), [1, 1, 1, 1]);
      return t;
    })();
    expect(mit.z.refreshBeiSenden).toBe(3);
    expect(mit.Player.Appearance.length).toBe(0);
  });
});

describe('Tool: das nächste Profil startet sofort', () => {
  function laeuft() {
    const spy = vi.fn(() => 0);
    const t = tool(spy);
    evalIn(t.ctx, `
      _slideshowRunning = true; _slideshowTotal = 3; _slideshowQueue = ['B', 'C'];
      _slideshowStat = { n: 0, ms: 0, a: 0, r: 0, c: 0, mit: 0 };
      _pendingProfileCapture['ps_1'] = { name: 'A', timeoutId: 0, t0: Date.now() - 600 };`);
    spy.mockClear();
    return { ...t, spy };
  }

  it('sofort nach der Antwort wird das nächste angestoßen – mit der kurzen Pause, nicht mit 250 ms', () => {
    const { ctx, spy } = laeuft();
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', data: 'data:image/jpeg;base64,xx', t: { a: 100, r: 200, c: 30 } }, { origin: BC, source: ctx.opener });
    const gap = evalIn(ctx, 'SLIDESHOW_GAP_MS');
    expect(gap).toBeLessThanOrEqual(50);
    // genau ein setTimeout mit der kurzen Pause, der das nächste Profil startet
    const kurz = spy.mock.calls.filter((c) => c[1] === gap);
    expect(kurz.length).toBe(1);
    expect(spy.mock.calls.some((c) => c[1] === 250)).toBe(false);
  });

  it('auch bei einer Fehlermeldung des Spiels geht es sofort weiter (nie hängen bleiben)', () => {
    const { ctx, spy } = laeuft();
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', err: 'Canvas leer' }, { origin: BC, source: ctx.opener });
    expect(spy.mock.calls.filter((c) => c[1] === evalIn(ctx, 'SLIDESHOW_GAP_MS')).length).toBe(1);
  });

  it('Zeiten werden verbucht und als Durchschnitt angezeigt', () => {
    const { ctx } = laeuft();
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', data: 'data:image/jpeg;base64,xx', t: { a: 100, r: 200, c: 30 } }, { origin: BC, source: ctx.opener });
    const s = evalIn(ctx, '_slideshowStat');
    expect(s.n).toBe(1);
    expect(s.ms).toBeGreaterThanOrEqual(600);
    expect(s.a).toBe(100); expect(s.r).toBe(200); expect(s.c).toBe(30);
    const kurz = evalIn(ctx, '_slideshowZeitText(false)');
    expect(kurz).toMatch(/^Ø \d+,\d s\/Profil$/);
    const lang = evalIn(ctx, '_slideshowZeitText(true)');
    expect(lang).toContain('im Spiel: Anlegen 100 · Zeichnen 200 · Bild 30 ms');
  });

  it('ein altes Spiel-Skript ohne Zeitangabe wird weiter akzeptiert', () => {
    const { ctx } = laeuft();
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', data: 'data:image/jpeg;base64,xx' }, { origin: BC, source: ctx.opener });
    expect(evalIn(ctx, '_slideshowStat').n).toBe(1);
    expect(evalIn(ctx, '_slideshowZeitText(true)')).toMatch(/^Ø \d+,\d s\/Profil$/);
  });

  it('ohne laufenden Durchlauf (Einzelaufnahme) wird nichts verbucht', () => {
    const { ctx } = laeuft();
    evalIn(ctx, '_slideshowRunning = false');
    dispatchMessage(ctx, { app: APP, type: 'CANVAS_PREVIEW_DATA', reqId: 'ps_1', data: 'data:image/jpeg;base64,xx' }, { origin: BC, source: ctx.opener });
    expect(evalIn(ctx, '_slideshowStat').n).toBe(0);
  });
});
