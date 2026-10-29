import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import LZString from 'lz-string';
import { loadScript, evalIn, dispatchMessage, makeElementStub, REPO_ROOT } from './helpers/loadScript.js';

// Aufnahme-Diagnose: Im Spiel-Tab prüft jedes Foto im Moment der Aufnahme, ob Teile des Outfits fehlen (nie angelegt), ob BC noch Bilder lädt
// und ob etwas verdeckt/ohne TypeRecord ist. Das Tool wiederholt unvollständige Bilder (bis zu 2×), ersetzt nie ein vorhandenes Bild durch ein
// unvollständiges, markiert LSCG-Karten mit ⚠ und führt ein Protokoll (Einstellungen → Werkzeuge).

const APP = 'BCKonfigurator';
const BC = 'https://bc.test';

function tool(wiederholungBeobachten = true) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const timers = [];
  const ctx = loadScript(['items.js'], {
    LZString, opener, setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout() {},
    // Bild-Dekodierung sofort fertig; Canvas liefert eine feste Antwort
    Image: class { set src(v) { this.naturalWidth = 100; this.naturalHeight = 200; if (this.onload) this.onload(); } },
    navigator: { clipboard: { writeText: (t) => { ctx.__kopiert = t; } } },
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.createElement = () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,NEU' });
  dispatchMessage(ctx, { app: APP, type: 'PONG' }, { origin: BC, source: opener });
  opener.postMessage.mockClear();
  ctx.__aufnahmen = [];
  if (wiederholungBeobachten) evalIn(ctx, "captureOsScreenshot = function (mk, i) { __aufnahmen.push([mk, i]); }");   // die Wiederholung beobachten, nicht ausführen
  const laufen = () => { let n = 0; while (timers.length && n++ < 50) timers.shift()(); };
  return { ctx, els, opener, laufen, execs: () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code) };
}

const VOLL = { items: 10, erwartet: 10, fehlt: [], offen: 0, abgelaufen: false, gewartet: 80, checks: 1, ohneTyp: [], verdeckt: [] };
const FEHLT = { ...VOLL, items: 8, fehlt: ['Suit', 'ItemHands'] };
const LAEDT = { ...VOLL, offen: 3, abgelaufen: true, gewartet: 6000 };

describe('Urteil über die Diagnose', () => {
  const t = tool();
  const urteil = (d) => { t.ctx.__d = d; return evalIn(t.ctx, '_shotDiagUrteil(__d)'); };

  it('vollständig, wenn nichts fehlt und nichts mehr lädt (ohneTyp/verdeckt sind nur Hinweise)', () => {
    expect(urteil(VOLL)).toEqual({ ok: true, grund: '' });
    expect(urteil({ ...VOLL, ohneTyp: ['ItemHood'], verdeckt: ['Cloth'] }).ok).toBe(true);
  });
  it('unvollständig: nicht angelegte Gruppen werden genannt', () => {
    const u = urteil(FEHLT);
    expect(u.ok).toBe(false);
    expect(u.grund).toContain('nicht angelegt: Suit, ItemHands');
  });
  it('unvollständig: BC lädt noch (rechtzeitig vs. Zeit abgelaufen)', () => {
    expect(urteil({ ...VOLL, offen: 1 }).grund).toBe('1 Bild laden noch');
    expect(urteil(LAEDT).grund).toBe('3 Bilder nicht rechtzeitig geladen (6 s)');
  });
  it('ohne Diagnose (älterer Code im Spiel-Tab) oder mit Diagnose-Fehler: wie bisher speichern', () => {
    expect(urteil(undefined).ok).toBe(true);
    expect(urteil({ fehler: 'kaputt' }).ok).toBe(true);
    expect(urteil({ fehler: 'kaputt' }).grund).toContain('kaputt');
  });
  it('Wiederholen nur bis SHOT_WIEDERHOLUNGEN, danach endgültig unvollständig; ein vollständiges Bild setzt zurück', () => {
    const e = (k, ok, kann = true) => { t.ctx.__u = { ok, grund: 'x' }; return evalIn(t.ctx, `_shotEntscheiden(${JSON.stringify(k)}, __u, ${kann})`).art; };
    expect([e('a', false), e('a', false), e('a', false), e('a', false)]).toEqual(['wiederholen', 'wiederholen', 'unvollstaendig', 'wiederholen']);
    expect(e('b', false), 'b').toBe('wiederholen');
    expect(e('b', true)).toBe('ok');
    expect(e('b', false)).toBe('wiederholen');            // Zähler begann neu
    expect(e('c', false, false)).toBe('unvollstaendig');  // Einzelaufnahme: keine Serie, nicht wiederholbar
  });
});

describe('Diagnose im Spiel-Tab (_diag)', () => {
  const t = tool();
  function lauf(erwartet, spiel) {
    const g = { JSON, Array, Object, Math, Date, Error, Player: { Appearance: [] }, ...spiel };
    g.window = g;
    vm.createContext(g);
    const code = evalIn(t.ctx, '_SHOT_BILDER') + 'var _checksDone=2;' + t.ctx.__diag(erwartet) + ';_diag()';
    return vm.runInContext(code, g);
  }
  t.ctx.__diag = (e) => { t.ctx.__e = e; return evalIn(t.ctx, '_shotDiagCode(__e)'); };
  const item = (g, n, extra = {}) => ({ Asset: { Name: n, Group: { Name: g }, ...extra.asset }, Property: extra.prop });

  it('meldet Gruppen, die im Outfit stehen, aber nicht angelegt wurden', () => {
    const d = lauf(['Suit', 'ItemHands', 'Cloth'], { Player: { Appearance: [item('Cloth', 'Dress'), item('ArmsLeft', '')] } });
    expect(d.fehlt).toEqual(['Suit', 'ItemHands']);
    expect(d.items).toBe(1);            // namenlose Pflichtgruppen zählen nicht
    expect(d.erwartet).toBe(3);
    expect(d.checks).toBe(2);
  });
  it('ohne erwartete Gruppen (rohes JavaScript statt Outfit-Code): keine Fehlt-Liste', () => {
    const d = lauf(null, { Player: { Appearance: [item('Cloth', 'Dress')] } });
    expect(d.fehlt).toBeUndefined();
    expect(d.items).toBe(1);
  });
  it('zählt Bilder im Zustand "loading" und erkennt abgelaufene Wartezeit', () => {
    const bilder = [{ state: 'loading' }, { state: 'loading' }, { state: 'loaded' }, { state: 'failed' }];
    const d = lauf([], { DrawImageCache: { forEach: (fn) => bilder.forEach((b) => fn(b)) } });
    expect(d.offen).toBe(2);
    expect(d.abgelaufen).toBe(false);
    const d2 = lauf([], { DrawImageCache: { forEach: (fn) => bilder.forEach((b) => fn(b)) }, Date: { now: (() => { let n = 0; return () => (n += 7000); })() } });
    expect(d2.abgelaufen).toBe(true);
  });
  it('zählt auch den WebGL-Bildspeicher (GLDrawImageCache): BC lädt die Teile der Figur dort, nicht im normalen', () => {
    const normal = [{ state: 'loaded' }];
    const gl = [{ state: 'loading' }, { state: 'loading' }, { state: 'loaded' }];
    const d = lauf([], { DrawImageCache: { forEach: (fn) => normal.forEach((b) => fn(b)) }, GLDrawImageCache: { forEach: (fn) => gl.forEach((b) => fn(b)) }, GLVersion: 'webgl2' });
    expect(d.offen).toBe(2);
    expect(d.offenGl).toBe(2);
    expect(d.zeichnen).toBe('webgl2');
    // beide Speicher laden: Summe
    const d2 = lauf([], { DrawImageCache: { forEach: (fn) => [{ state: 'loading' }].forEach((b) => fn(b)) }, GLDrawImageCache: { forEach: (fn) => gl.forEach((b) => fn(b)) } });
    expect(d2.offen).toBe(3);
    expect(d2.zeichnen).toBe('?');
  });
  it('Emoticons gelten nie als nicht angelegt (sie werden vor dem Foto absichtlich entfernt)', () => {
    const d = lauf(['Suit', 'Emoticon'], { Player: { Appearance: [item('Suit', 'X')] } });
    expect(d.fehlt).toEqual([]);
    expect(d.erwartet).toBe(1);
  });
  it('nennt erweiterte Items ohne TypeRecord und von BC nicht gezeichnete Items', () => {
    const d = lauf([], {
      Player: { Appearance: [
        item('ItemLegs', 'ShinyLegBinder', { asset: { Extended: true } }),
        item('ItemHood', 'DroneMask', { asset: { Extended: true }, prop: { TypeRecord: { typed: 0 } } }),
        item('Cloth', 'Dress'),
      ] },
      CharacterAppearanceVisible: (C, n) => n !== 'Dress',
    });
    expect(d.ohneTyp).toEqual(['ItemLegs']);
    expect(d.verdeckt).toEqual(['Cloth']);
  });
  it('wirft bei kaputten Daten nicht, sondern meldet den Fehler', () => {
    const d = lauf([], { Player: { Appearance: null, get Canvas() { throw new Error('x'); } } });
    expect(d.items).toBe(0);
    const d2 = lauf([], { Player: { Appearance: [{ Asset: { get Group() { throw new Error('kaputt'); } } }] } });
    expect(d2.fehler).toBe('kaputt');
  });
  it('die Aufnahmen schicken die Diagnose mit dem Bild (LSCG, Profil, Wheel) und lesen sie vor dem Zurücksetzen aus', () => {
    const bundle = LZString.compressToBase64(JSON.stringify([{ Group: 'Suit', Name: 'X' }, { Group: 'Cloth', Name: 'Y' }]));
    const echt = tool(false);                                  // mit dem echten captureOsScreenshot
    evalIn(echt.ctx, "LSCG_DB['1001'] = { name: 'Alice', versions: [{ code: " + JSON.stringify(bundle) + ", fingerprint: 'fpA' }] }");
    echt.ctx.captureOsScreenshot('1001', 0);
    t.ctx.captureProfileViaCanvas('A - B', bundle, null);
    t.ctx.__i = [{ group: 'ItemArms', asset: 'X' }];
    const wheel = evalIn(t.ctx, "_wheelShotCode('wss_1', __i, true)");
    const codes = [echt.execs()[0], t.execs()[0], wheel];       // LSCG, Profil, Wheel
    for (const code of codes) {
      expect(() => new Function(code)).not.toThrow();
      expect(code).toContain('function _diag(){');
      const s = code.indexOf('function _sendCapture(){');
      const d = code.indexOf('diag:_diag()', s);
      expect(d).toBeGreaterThan(s);
      expect(d).toBeLessThan(code.indexOf('}finally{', s));     // Diagnose vor dem Zurücksetzen (_restore)
    }
    expect(codes[0]).toContain('_diagErw=["Suit","Cloth"]');    // LSCG: Gruppen aus dem Outfit-Code
    expect(codes[1]).toContain('_diagErw=["Suit","Cloth"]');    // Profil: ebenso
    expect(codes[2]).toContain('_diagErw=["ItemArms"]');        // Wheel: Wheel-Outfit (+ Standard-Outfit, hier keins)
  });
});

describe('LSCG: Wiederholen, Markieren, nichts überschreiben', () => {
  function bereit(vorher = {}) {
    const t = tool();
    evalIn(t.ctx, "LSCG_DB['1001'] = { name: 'Alice', versions: [{ code: 'C', fingerprint: 'fpA' }] }");
    if (vorher.bild) evalIn(t.ctx, "LSCG_SCREENSHOTS['1001|fpA'] = 'data:image/jpeg;base64,ALT'");
    if (vorher.markiert) evalIn(t.ctx, "_bildUnvoll.add('lscg:1001|fpA')");
    let n = 0;
    const antwort = (diag) => {
      const reqId = 'os_test_' + (++n);
      evalIn(t.ctx, `_pendingOsCapture[${JSON.stringify(reqId)}] = { mk: '1001', fp: 'fpA', vIdx: 0 }`);
      t.ctx.__msg = { reqId, data: 'data:image/jpeg;base64,X', diag };
      evalIn(t.ctx, '_handleCanvasPreviewData(__msg)');
      t.laufen();
    };
    const lies = (a) => evalIn(t.ctx, a);
    return { t, antwort, lies };
  }

  it('unvollständig: zweimal wiederholen (nichts gespeichert), beim dritten Mal speichern und mit ⚠ markieren', () => {
    const { t, antwort, lies } = bereit();
    antwort(FEHLT);
    expect(t.ctx.__aufnahmen).toEqual([['1001', 0]]);                  // Wiederholung 1 angestoßen
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBeUndefined();
    antwort(FEHLT);
    expect(t.ctx.__aufnahmen).toEqual([['1001', 0], ['1001', 0]]);     // Wiederholung 2
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBeUndefined();
    antwort(FEHLT);
    expect(t.ctx.__aufnahmen).toHaveLength(2);                         // keine dritte Wiederholung
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBe('data:image/jpeg;base64,NEU');
    expect(lies("_bildUnvoll.has('lscg:1001|fpA')")).toBe(true);
    const akt = lies('_shotProtokoll').map((e) => e.aktion);
    expect(akt).toEqual(['gespeichert, als unvollständig markiert', 'wiederholt', 'wiederholt']);
  });

  it('wird es bei der Wiederholung vollständig: speichern, keine Markierung', () => {
    const { t, antwort, lies } = bereit();
    antwort(LAEDT);
    antwort(VOLL);
    expect(t.ctx.__aufnahmen).toEqual([['1001', 0]]);
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBe('data:image/jpeg;base64,NEU');
    expect(lies("_bildUnvoll.has('lscg:1001|fpA')")).toBe(false);
  });

  it('ein vorhandenes Bild wird von einem dauerhaft unvollständigen NIE ersetzt', () => {
    const { t, antwort, lies } = bereit({ bild: true });
    antwort(FEHLT); antwort(FEHLT); antwort(FEHLT);
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBe('data:image/jpeg;base64,ALT');
    expect(lies("_bildUnvoll.has('lscg:1001|fpA')")).toBe(false);
    expect(lies('_shotProtokoll')[0].aktion).toContain('vorhandene Bild bleibt');
    expect(t.ctx.__aufnahmen).toHaveLength(2);
  });

  it('ein bereits als unvollständig markiertes Bild darf ersetzt werden; ein vollständiges nimmt die Markierung weg', () => {
    const { antwort, lies } = bereit({ bild: true, markiert: true });
    antwort(VOLL);
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBe('data:image/jpeg;base64,NEU');
    expect(lies("_bildUnvoll.has('lscg:1001|fpA')")).toBe(false);
  });

  it('ohne Diagnose (älteres Spiel-Tab-Skript): sofort speichern wie bisher, nichts wiederholen', () => {
    const { t, antwort, lies } = bereit();
    antwort(undefined);
    expect(lies("LSCG_SCREENSHOTS['1001|fpA']")).toBe('data:image/jpeg;base64,NEU');
    expect(t.ctx.__aufnahmen).toEqual([]);
  });

  it('die Markierung wird in der Datenbank gespeichert und steht im Gesamt-Backup', () => {
    const speicher = fs.readFileSync(path.join(REPO_ROOT, 'speicher.js'), 'utf8');
    expect(speicher).toContain("'BC_BILD_UNVOLLSTAENDIG_v2'");
    expect(speicher).toContain("'BC_BILD_UNVOLLSTAENDIG_v1'");   // die alten Markierungen bleiben im Backup, werden aber nicht mehr gelesen
    const { antwort, lies } = bereit();
    antwort(FEHLT); antwort(FEHLT); antwort(FEHLT);
    expect(lies('_kleinStatus["BC_BILD_UNVOLLSTAENDIG_v2"].satz.has("lscg:1001|fpA")')).toBe(true);
    expect(lies('_kleinStatus["BC_BILD_UNVOLLSTAENDIG_v1"]')).toBeUndefined();   // v1 wird nicht mehr geladen
  });

  it('die Karte zeigt ⚠ unvollständig, wenn das Bild markiert ist', () => {
    const q = fs.readFileSync(path.join(REPO_ROOT, 'items.js'), 'utf8');
    expect(q).toContain("const unvollBild = vThumb && _bildUnvoll.has('lscg:' + vKey);");
    expect(q).toContain('⚠ unvollständig</span>');
  });
});

describe('LSCG-Serie: Stopp', () => {
  function laufendeSerie() {
    const t = tool();
    evalIn(t.ctx, "_osCaptureRunning = true; _osCaptureNeedSync = true; _osCaptureQueue = [{ mk: '1', vIdx: 0 }, { mk: '1', vIdx: 1 }];"
      + " _pendingOsCapture['os_x'] = { mk: '1', fp: 'f', vIdx: 0 }; _shotVersuche['lscg:1|f'] = 1;");
    return t;
  }

  it('der Knopf "Fehlende Bilder" stoppt eine laufende Serie: Warteschlange leer, Lauf beendet, Pose und Aussehen zurück', () => {
    const t = laufendeSerie();
    t.ctx.captureAllMissingOsScreenshots();
    expect(evalIn(t.ctx, '_osCaptureQueue')).toEqual([]);
    expect(evalIn(t.ctx, '_osCaptureRunning')).toBe(false);
    expect(evalIn(t.ctx, '_osCaptureNeedSync')).toBe(false);
    const exec = t.execs().at(-1);                                  // Abschluss der Serie: Pose und Aussehen zurück
    expect(exec).toContain('__BCU_poseOrig');
    expect(exec).toContain('ServerPlayerAppearanceSync');
    expect(evalIn(t.ctx, 'Object.keys(_pendingOsCapture).length')).toBe(0);
    expect(evalIn(t.ctx, "_shotVersuche['lscg:1|f']")).toBeUndefined();   // Wiederholungszähler zurückgesetzt
  });

  it('eine noch ausstehende Aufnahme wird nach dem Stopp ignoriert: nichts gespeichert, nichts neu gestartet', () => {
    const t = laufendeSerie();
    evalIn(t.ctx, "LSCG_DB['1'] = { name: 'A', versions: [{ code: 'C', fingerprint: 'f' }, { code: 'D', fingerprint: 'g' }] }");
    t.ctx.osCaptureStop();
    t.ctx.__m = { reqId: 'os_x', data: 'data:image/jpeg;base64,X', diag: FEHLT };
    evalIn(t.ctx, '_handleCanvasPreviewData(__m)');
    t.laufen();
    expect(evalIn(t.ctx, "LSCG_SCREENSHOTS['1|f']")).toBeUndefined();
    expect(t.ctx.__aufnahmen).toEqual([]);
    expect(evalIn(t.ctx, '_shotProtokoll.length')).toBe(0);
  });

  it('der Knopf zeigt während der Serie Stop mit der Zahl der offenen Bilder und danach wieder "Fehlende Bilder"', () => {
    const t = laufendeSerie();
    evalIn(t.ctx, '_updateOsCaptureBtn()');
    expect(t.els.osCaptureAllBtn.textContent).toBe('⏹ Stop (2 übrig)');
    t.ctx.osCaptureStop();
    expect(t.els.osCaptureAllBtn.textContent).toBe('📸 Fehlende Bilder');
  });

  it('ohne laufende Serie tut der Stopp nichts', () => {
    const t = tool();
    expect(() => t.ctx.osCaptureStop()).not.toThrow();
    expect(t.execs()).toEqual([]);
  });

  it('ohne laufende Serie startet der Knopf die Serie (nur Versionen ohne Bild) und zeigt dann Stop', () => {
    const t = tool();
    evalIn(t.ctx, "_connected = true; _bildExistenzSicher = () => true;"
      + " LSCG_DB['1'] = { name: 'A', versions: [{ code: 'C', fingerprint: 'f' }, { code: 'D', fingerprint: 'g' }, { code: 'E', fingerprint: 'h' }] };"
      + " LSCG_SCREENSHOTS['1|g'] = 'data:image/jpeg;base64,ALT';");
    t.ctx.captureAllMissingOsScreenshots();
    expect(evalIn(t.ctx, '_osCaptureRunning')).toBe(true);
    expect(evalIn(t.ctx, '_osCaptureQueue')).toEqual([{ mk: '1', vIdx: 2 }]);          // Version 2 hat schon ein Bild; Version 1 läuft schon
    expect(t.els.osCaptureAllBtn.textContent).toBe('⏹ Stop (1 übrig)');
    t.laufen();
    expect(t.ctx.__aufnahmen).toEqual([['1', 0]]);
  });

  it('index.html: der Knopf hat die Kennung osCaptureAllBtn', () => {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    expect(html).toMatch(/id="osCaptureAllBtn"[^>]*onclick="captureAllMissingOsScreenshots\(\)"/);
  });
});

describe('Wheel und Profil: Wiederholen in der Serie', () => {
  it('Wheel: unvollständig → das Outfit geht zurück an die Spitze der Warteschlange, nichts gespeichert', () => {
    const t = tool();
    evalIn(t.ctx, "_mbsWheelData = [{ memberNumber: 5, name: 'Bea', outfits: [{ name: 'Latex', items: [] }] }]; _wheelGenRunning = true; _wheelGenJob = { mn: 5, oi: 0 };"
      + " _wheelGenShotReq = 'wss_1'; _pendingWheelShot['wss_1'] = 'fpW'; _wheelGenQueue = [{ mn: 9, oi: 0 }];");
    t.ctx.__m = { reqId: 'wss_1', data: 'data:image/jpeg;base64,X', diag: FEHLT };
    evalIn(t.ctx, '_handleWheelShotData(__m)');
    expect(evalIn(t.ctx, '_wheelGenQueue')).toEqual([{ mn: 5, oi: 0 }, { mn: 9, oi: 0 }]);
    expect(evalIn(t.ctx, "_mbsWheelShots['fpW']")).toBeUndefined();
    expect(evalIn(t.ctx, '_shotProtokoll')[0]).toMatchObject({ art: 'Wheel', name: 'Wheel: Latex', aktion: 'wiederholt', ok: false });
  });

  it('Wheel: vollständig → gespeichert; nach dauerhaft unvollständig bleibt ein vorhandenes Bild', () => {
    const t = tool();
    evalIn(t.ctx, "_wheelGenRunning = false; _pendingWheelShot['wss_1'] = 'fpW';");
    t.ctx.__m = { reqId: 'wss_1', data: 'data:image/jpeg;base64,X', diag: VOLL };
    evalIn(t.ctx, '_handleWheelShotData(__m)');
    expect(evalIn(t.ctx, "_mbsWheelShots['fpW']")).toBe('data:image/jpeg;base64,NEU');
    // Einzelaufnahme (keine Serie): nicht wiederholbar → sofort endgültig, vorhandenes Bild bleibt
    evalIn(t.ctx, "_pendingWheelShot['wss_2'] = 'fpW';");
    t.ctx.__m = { reqId: 'wss_2', data: 'data:image/jpeg;base64,Y', diag: LAEDT };
    evalIn(t.ctx, '_handleWheelShotData(__m)');
    expect(evalIn(t.ctx, "_mbsWheelShots['fpW']")).toBe('data:image/jpeg;base64,NEU');
    expect(evalIn(t.ctx, '_shotProtokoll')[0].aktion).toContain('vorhandene Bild bleibt');
  });

  it('Profil im Durchlauf: unvollständig → zurück an die Spitze der Warteschlange', () => {
    const t = tool();
    evalIn(t.ctx, "_slideshowRunning = true; _slideshowQueue = ['Z - Z']; _pendingProfileCapture['ps_1'] = { name: 'A - B', timeoutId: 0, t0: Date.now() };");
    t.ctx.__m = { reqId: 'ps_1', data: 'data:image/jpeg;base64,X', diag: FEHLT };
    evalIn(t.ctx, '_handleCanvasPreviewData(__m)');
    expect(evalIn(t.ctx, '_slideshowQueue')).toEqual(['A - B', 'Z - Z']);
    expect(evalIn(t.ctx, "PROFILE_SCREENSHOTS['A - B']")).toBeUndefined();
    expect(evalIn(t.ctx, '_shotProtokoll')[0]).toMatchObject({ art: 'Profil', aktion: 'wiederholt' });
  });

  it('Profil: Einzelaufnahme mit fehlenden Teilen wird gespeichert (nichts da, das geschützt werden müsste) und im Protokoll vermerkt', () => {
    const t = tool();
    evalIn(t.ctx, "_slideshowRunning = false; _pendingProfileCapture['ps_2'] = { name: 'A - B', timeoutId: 0, t0: Date.now() };");
    t.ctx.__m = { reqId: 'ps_2', data: 'data:image/jpeg;base64,X', diag: FEHLT };
    evalIn(t.ctx, '_handleCanvasPreviewData(__m)');
    expect(evalIn(t.ctx, "PROFILE_SCREENSHOTS['A - B']")).toBe('data:image/jpeg;base64,NEU');
    expect(evalIn(t.ctx, '_shotProtokoll')[0].aktion).toBe('gespeichert (unvollständig)');
  });
});

describe('Aufnahme-Protokoll (Einstellungen → Werkzeuge)', () => {
  it('rendert die Zeilen, kopiert sie, und sagt es, wenn noch nichts da ist', () => {
    const t = tool();
    t.ctx.shotProtokollRender();
    expect(t.els.shotProtokollBody.textContent).toContain('Noch keine Aufnahme');
    t.ctx.__d = FEHLT;
    evalIn(t.ctx, "_shotProtokollEintrag('LSCG', '#1001 Alice · Version 1', __d, { ok: false, grund: 'nicht angelegt: Suit, ItemHands' }, 1, 'wiederholt')");
    const text = t.els.shotProtokollBody.textContent;
    expect(text).toContain('LSCG · #1001 Alice · Version 1 · Versuch 1 · UNVOLLSTÄNDIG: nicht angelegt: Suit, ItemHands → wiederholt');
    expect(text).toContain('Items 8/10');
    t.ctx.shotProtokollKopieren();
    expect(t.ctx.__kopiert).toBe(text);
  });

  it('behält höchstens SHOT_PROTOKOLL_MAX Einträge, neueste zuerst', () => {
    const t = tool();
    for (let i = 0; i < 130; i++) evalIn(t.ctx, `_shotProtokollEintrag('LSCG', 'n${i}', null, { ok: true, grund: '' }, 1, 'gespeichert')`);
    expect(evalIn(t.ctx, '_shotProtokoll.length')).toBe(100);
    expect(evalIn(t.ctx, '_shotProtokoll[0].name')).toBe('n129');
  });

  it('index.html: Karte mit Anzeige und Knöpfen im Werkzeuge-Tab', () => {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
    const w = html.indexOf('data-set-page="werkzeuge"');
    const k = html.indexOf('id="shotProtokollBody"');
    expect(k).toBeGreaterThan(w);
    expect(k).toBeLessThan(html.indexOf('data-set-page="gefahr"'));
    expect(html).toContain('onclick="shotProtokollKopieren()"');
    expect(html).toContain('onclick="shotProtokollRender()"');
  });
});
