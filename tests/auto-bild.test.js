import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Neu gespeicherte Profile (z. B. aus Craft & Curse) bekommen automatisch ihr Bild – nacheinander, nie parallel zu einer anderen
// Aufnahme, ohne den Outfit-Aufbau im Item Manager anzufassen, ohne ein vorhandenes Bild zu ersetzen.

function boot({ prompt = 'Neues Profil' } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const timer = [];
  const ctx = loadScript(['items.js'], {
    opener, prompt: (m, vorschlag) => (prompt === 'VORSCHLAG' ? vorschlag : prompt), confirm: () => true,
    setTimeout: (fn, ms) => { timer.push({ fn, ms }); return timer.length; }, clearTimeout: () => {},
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: opener });
  opener.postMessage.mockClear();
  ctx.__m = [];
  evalIn(ctx, `
    showStatus = function (m) { __m.push(m); };
    _saveProfiles = function () {}; renderProfileList = function () {};
    Object.keys(PROFILES).forEach(k => delete PROFILES[k]); Object.keys(PROFILE_SCREENSHOTS).forEach(k => delete PROFILE_SCREENSHOTS[k]);
    CACHE = { Cloth: { Dress: { Name: 'Dress' } } };
    _connected = true; _slideshowRunning = false; _gameState = null;
    try { localStorage.removeItem('BC_AutoBild_v1'); } catch (e) {}
  `);
  timer.length = 0;
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  const laufen = (n = 1) => { for (let i = 0; i < n && timer.length; i++) timer.shift().fn(); };
  return { ctx, opener, timer, execs, laufen, meldungen: ctx.__m };
}
const items = [{ group: 'Cloth', asset: 'Dress', colors: ['#fff'] }];
const speichern = (t, name = 'Neues Profil') => evalIn(t.ctx, `_doSaveProfile(${JSON.stringify(items)}, ${JSON.stringify(name)})`);

describe('Bild nach dem Speichern', () => {
  it('Speichern plant die Aufnahme nach einer kurzen Wartezeit; dann geht EIN Aufnahme-EXEC raus', () => {
    const t = boot();
    speichern(t);
    expect(evalIn(t.ctx, "'Neues Profil' in PROFILES")).toBe(true);
    expect(t.timer.some((x) => x.ms === 5000)).toBe(true);          // Wartezeit (das Wiederherstellen deines Outfits läuft noch)
    expect(t.execs().length).toBe(0);                                // noch nichts gesendet
    t.laufen();
    expect(t.execs().length).toBe(1);
    const code = t.execs()[0];
    expect(() => new Function(code)).not.toThrow();
    expect(code).toContain('__BCU_sperreGen');                       // Sync-Sperre, stehend, ohne Schloss: wie jede Aufnahme
    expect(code).toContain('Dress');
  });

  it('der Outfit-Aufbau im Item Manager bleibt dabei unberührt', () => {
    const t = boot();
    evalIn(t.ctx, "OUTFIT = [{ stehengeblieben: true }]; _currentProfileKeepHairGroups = ['HairBack'];");
    speichern(t);
    t.laufen();
    expect(t.execs().length).toBe(1);
    expect(evalIn(t.ctx, 'OUTFIT')).toEqual([{ stehengeblieben: true }]);
    expect(evalIn(t.ctx, '_currentProfileKeepHairGroups')).toEqual(['HairBack']);
  });

  it('hat das Profil schon ein Bild (Überschreiben eines Profils), wird es nicht ersetzt', () => {
    const t = boot();
    evalIn(t.ctx, "PROFILES['Neues Profil'] = { name: 'Neues Profil', items: [] }; PROFILE_SCREENSHOTS['Neues Profil'] = 'data:alt';");
    speichern(t);
    t.laufen();
    expect(t.execs().length).toBe(0);
    expect(evalIn(t.ctx, "PROFILE_SCREENSHOTS['Neues Profil']")).toBe('data:alt');
  });

  it('abgeschaltet in den Einstellungen: kein Bild', () => {
    const t = boot();
    t.ctx.autoBildSetzen(false);
    expect(t.ctx.localStorage.getItem('BC_AutoBild_v1')).toBe('0');
    speichern(t);
    t.laufen();
    expect(t.execs().length).toBe(0);
    t.ctx.autoBildSetzen(true);
    expect(t.ctx.autoBildAn()).toBe(true);
  });

  it('Abbrechen der Namensabfrage speichert nichts und plant nichts', () => {
    const t = boot({ prompt: null });
    speichern(t);
    expect(t.timer.length).toBe(0);
  });

  it('nicht verbunden / läuft eine andere Serie: es wird nichts dazwischengeschoben, später erneut versucht', () => {
    const t = boot();
    speichern(t);
    evalIn(t.ctx, '_slideshowRunning = true');
    t.laufen();
    expect(t.execs().length).toBe(0);
    expect(t.timer.some((x) => x.ms === 3000)).toBe(true);           // neuer Versuch in 3 s
    evalIn(t.ctx, '_slideshowRunning = false');
    t.laufen();
    expect(t.execs().length).toBe(1);
  });

  it('läuft gerade eine Profil-Aufnahme (Antwort steht aus), wartet es', () => {
    const t = boot();
    speichern(t);
    evalIn(t.ctx, "_pendingProfileCapture['ps_x'] = { name: 'Anderes', timeoutId: 0, t0: 0 }");
    t.laufen();
    expect(t.execs().length).toBe(0);
    evalIn(t.ctx, "delete _pendingProfileCapture['ps_x']");
    t.laufen();
    expect(t.execs().length).toBe(1);
  });

  it('mehrere neue Profile: nacheinander, jeweils erst nach der Antwort des vorigen', () => {
    const t = boot({ prompt: 'VORSCHLAG' });
    // nur die Takte des Auto-Bilds auslösen (nicht den 12-s-Wächter einer Aufnahme)
    const takt = () => { const i = t.timer.findIndex((x) => x.ms === 3000 || x.ms === 5000); if (i >= 0) t.timer.splice(i, 1)[0].fn(); };
    speichern(t, 'Erstes'); speichern(t, 'Zweites');
    takt();                                                          // Erstes
    expect(t.execs().length).toBe(1);
    takt();                                                          // Zweites wartet, weil die Antwort fehlt
    expect(t.execs().length).toBe(1);
    evalIn(t.ctx, "Object.keys(_pendingProfileCapture).forEach(k => delete _pendingProfileCapture[k])");
    takt();
    expect(t.execs().length).toBe(2);
    expect(t.execs()[1]).not.toBe(t.execs()[0]);
  });

  it('nach 20 vergeblichen Versuchen wird aufgegeben (das Profil bleibt ohne Bild, es hängt nichts)', () => {
    const t = boot();
    speichern(t);
    evalIn(t.ctx, '_connected = false');
    for (let i = 0; i < 40 && t.timer.length; i++) t.laufen();
    expect(t.timer.length).toBe(0);
    expect(t.execs().length).toBe(0);
    expect(evalIn(t.ctx, '_autoBildQueue.length')).toBe(0);
  });
});

describe('Aufnahmecode ohne Eingriff', () => {
  it('Profil ohne Items oder ohne Cache: kein Code, nichts verändert', () => {
    const t = boot();
    evalIn(t.ctx, "PROFILES['Leer'] = { name: 'Leer', items: [] }; PROFILES['Voll'] = { name: 'Voll', items: [{ group: 'Cloth', asset: 'Dress', colors: ['#fff'] }] }; OUTFIT = [1, 2];");
    expect(evalIn(t.ctx, "_profilCodeOhneEingriff('Leer')")).toBeNull();
    evalIn(t.ctx, 'CACHE = {}');
    expect(evalIn(t.ctx, "_profilCodeOhneEingriff('Voll')")).toBeNull();
    expect(evalIn(t.ctx, 'OUTFIT')).toEqual([1, 2]);
  });

  it('Wirft die Code-Erzeugung, wird der Aufbau trotzdem zurückgesetzt', () => {
    const t = boot();
    evalIn(t.ctx, "PROFILES['Voll'] = { name: 'Voll', items: [{ group: 'Cloth', asset: 'Dress', colors: ['#fff'] }] }; OUTFIT = ['alt']; _outfitCodeBauen = function () { throw new Error('kaputt'); };");
    expect(() => evalIn(t.ctx, "_profilCodeOhneEingriff('Voll')")).toThrow();
    expect(evalIn(t.ctx, 'OUTFIT')).toEqual(['alt']);
  });
});
