import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, dispatchMessage, makeElementStub } from './helpers/loadScript.js';

// Craft & Curse → Profil speichern: das Foto wird gemacht, SOLANGE du das Profil noch trägst – erst danach wechselt das Outfit
// (Mein Outfit / Standard-Outfit). Früher lief das Wechseln zuerst, das Bild kam 5 s später über Auto-Bild.

function boot({ prompt = 'Neues Profil' } = {}) {
  const opener = { closed: false, postMessage: vi.fn() };
  const els = {};
  const timer = [];
  class Bild { set src(v) { this._s = v; this.naturalWidth = 100; this.naturalHeight = 200; if (this.onload) this.onload(); } get src() { return this._s; } }
  const ctx = loadScript(['items.js'], {
    opener, Image: Bild, prompt: () => prompt, confirm: () => true,
    setTimeout: (fn, ms) => { timer.push({ fn, ms }); return timer.length; }, clearTimeout: () => {},
  });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  ctx.document.createElement = () => Object.assign(makeElementStub(), {
    getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,FOTO', width: 0, height: 0,
  });
  dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'PONG' }, { origin: 'https://bc.test', source: opener });
  opener.postMessage.mockClear();
  ctx.__m = [];
  evalIn(ctx, `
    showStatus = function (m) { __m.push(m); };
    _saveProfiles = function () {}; renderProfileList = function () {}; _saveProfileScreenshots = function () {};
    _profilBildAktualisieren = function () { return true; };
    Object.keys(PROFILES).forEach(k => delete PROFILES[k]); Object.keys(PROFILE_SCREENSHOTS).forEach(k => delete PROFILE_SCREENSHOTS[k]);
    CACHE = { Cloth: { Dress: { Name: 'Dress' } } };
    _connected = true; _slideshowRunning = false; _gameState = null;
    try { localStorage.removeItem('BC_AutoBild_v1'); } catch (e) {}
  `);
  timer.length = 0;
  const execs = () => opener.postMessage.mock.calls.map((c) => c[0]).filter((m) => m.type === 'EXEC').map((m) => m.code);
  const antwort = (extra) => {
    const reqId = evalIn(ctx, 'Object.keys(_pendingScreenshot)')[0];
    dispatchMessage(ctx, { app: 'BCKonfigurator', type: 'SCREENSHOT_DATA', reqId, ...extra }, { origin: 'https://bc.test', source: opener });
  };
  return { ctx, opener, timer, execs, antwort };
}
const items = [{ group: 'Cloth', asset: 'Dress', colors: ['#fff'] }];
const speichern = (t, afterSave, vomTragen = true, name = 'Neues Profil') => {
  t.ctx.__after = afterSave;
  return evalIn(t.ctx, `_doSaveProfile(${JSON.stringify(items)}, ${JSON.stringify(name)}, undefined, __after, ${vomTragen})`);
};

describe('Erst fotografieren, dann das Outfit wechseln', () => {
  it('das Foto geht SOFORT raus; das Outfit wechselt erst, nachdem das Bild angekommen ist', () => {
    const t = boot();
    const danach = vi.fn();
    speichern(t, danach);
    expect(t.execs()).toHaveLength(1);
    expect(t.execs()[0]).toContain('Player.Canvas');          // Foto des aktuell getragenen Aussehens, ohne etwas anzuziehen
    expect(danach).not.toHaveBeenCalled();                    // Outfit-Wechsel wartet
    t.antwort({ data: 'data:image/jpeg;base64,ORIGINAL' });
    expect(evalIn(t.ctx, "PROFILE_SCREENSHOTS['Neues Profil']")).toBe('data:image/jpeg;base64,FOTO');
    expect(danach).toHaveBeenCalledTimes(1);                  // erst jetzt
    // das Bild ist da: Auto-Bild plant nichts mehr nach
    expect(t.timer.some((x) => x.ms === 5000)).toBe(false);
  });

  it('klappt das Foto nicht (Fehler), wechselt das Outfit trotzdem – und Auto-Bild holt das Bild wie sonst nach', () => {
    const t = boot();
    const danach = vi.fn();
    speichern(t, danach);
    t.antwort({ err: 'Canvas leer' });
    expect(danach).toHaveBeenCalledTimes(1);
    expect(t.timer.some((x) => x.ms === 5000)).toBe(true);
  });

  it('bleibt die Antwort aus, geht es nach 8 s trotzdem weiter – genau einmal', () => {
    const t = boot();
    const danach = vi.fn();
    speichern(t, danach);
    expect(danach).not.toHaveBeenCalled();
    const netz = t.timer.find((x) => x.ms === 8000);
    expect(netz).toBeTruthy();
    netz.fn();
    expect(danach).toHaveBeenCalledTimes(1);
    t.antwort({ data: 'data:image/jpeg;base64,SPAET' });       // verspätete Antwort ruft nichts ein zweites Mal auf
    expect(danach).toHaveBeenCalledTimes(1);
  });

  it('ohne "vomTragen" (Items aus der Datenbank / anderer Spieler) bleibt alles wie früher: sofort wechseln, Bild später über Auto-Bild', () => {
    const t = boot();
    const danach = vi.fn();
    speichern(t, danach, false);
    expect(danach).toHaveBeenCalledTimes(1);
    expect(t.execs()).toHaveLength(0);
    expect(t.timer.some((x) => x.ms === 5000)).toBe(true);
  });

  it('läuft gerade eine Bilderserie (getragenes Aussehen ist ein Test-Outfit), wird nicht fotografiert', () => {
    const t = boot();
    const danach = vi.fn();
    evalIn(t.ctx, '_slideshowRunning = true;');
    speichern(t, danach);
    expect(t.execs()).toHaveLength(0);
    expect(danach).toHaveBeenCalledTimes(1);
  });

  it('Auto-Bild aus oder schon ein Bild vorhanden: kein Foto, Wechsel sofort', () => {
    const aus = boot();
    evalIn(aus.ctx, "localStorage.setItem('BC_AutoBild_v1', '0');");
    const d1 = vi.fn();
    speichern(aus, d1);
    expect(aus.execs()).toHaveLength(0);
    expect(d1).toHaveBeenCalledTimes(1);

    const hat = boot();
    evalIn(hat.ctx, "PROFILE_SCREENSHOTS['Neues Profil'] = 'data:alt';");
    const d2 = vi.fn();
    speichern(hat, d2);
    expect(hat.execs()).toHaveLength(0);
    expect(d2).toHaveBeenCalledTimes(1);
    expect(evalIn(hat.ctx, "PROFILE_SCREENSHOTS['Neues Profil']")).toBe('data:alt');   // nie ersetzt
  });

  it('ohne Nachher-Aktion (Outfit scannen): wird trotzdem sofort fotografiert, ohne etwas neu anzuziehen', () => {
    const t = boot();
    speichern(t, undefined);
    expect(t.execs()).toHaveLength(1);
    expect(t.execs()[0]).toContain('Player.Canvas');
    expect(t.execs()[0]).not.toContain('InventoryWear');
  });
});
