import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Export-Info (Einstellungen → Werkzeuge): alles für einen Performance-Test als Text, inkl. Ladezeiten.
// Ladezeit-Marken (_ladeMarke). Großansicht von LSCG/Wheel: ◀ ▶ blättert nur durch Karten MIT Bild.

function boot() {
  const els = {};
  let zeit = 0;
  const performance = { now: () => (zeit += 7.3) };   // im Browser vorhanden, in der Test-Sandbox nicht
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: () => true, performance });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  return { ctx, els };
}

describe('Export-Info', () => {
  it('nennt Bestände, Bilder, Speicher, Ladezeiten und Zeichenzeiten – mit den richtigen Zahlen', async () => {
    const { ctx } = boot();
    evalIn(ctx, `
      Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
      PROFILES['A'] = { name: 'A', items: [{ group: 'Cloth', asset: 'X' }, { group: 'Cloth', asset: 'Y' }] };
      PROFILES['B'] = { name: 'B', items: [{ group: 'Cloth', asset: 'X' }] };
      PROFILES['C'] = { name: 'C', items: [] };
      Object.keys(PROFILE_SCREENSHOTS).forEach(k => delete PROFILE_SCREENSHOTS[k]);
      PROFILE_SCREENSHOTS['A'] = 'data:image/jpeg;base64,AAAA';
      PROFILE_SCREENSHOTS['B'] = 'data:image/jpeg;base64,BBBBBBBB';
    `);
    const text = await ctx.exportInfoSammeln();
    for (const abschnitt of ['BESTÄNDE', 'BILDER', 'SPEICHER IM BROWSER', 'OBERFLÄCHE', 'LADEZEITEN (ms seit Seitenstart)', 'ZEICHNEN', 'GESAMT-BACKUP']) {
      expect(text).toContain(abschnitt);
    }
    expect(text).toMatch(/Outfit & Profile: 3 Profile \(2 mit Bild\) · 3 Items gesamt · größtes Profil 2 Items/);
    expect(text).toMatch(/Profil-Bilder: 2 ·/);
  });

  it('die Ladezeit-Marken von items.js erscheinen mit Zeit in ms', async () => {
    const { ctx } = boot();
    const text = await ctx.exportInfoSammeln();
    expect(text).toMatch(/\n\s*\d+\s+items\.js gestartet/);
    const abschnitt = text.split('LADEZEITEN (ms seit Seitenstart)')[1].split('\n\n')[0];
    expect(abschnitt).toMatch(/Profile geladen|Start-Filter angewendet/);
  });

  it('ein Fehler in einem Teil bricht den Bericht nicht ab', async () => {
    const { ctx } = boot();
    evalIn(ctx, "PROFILES['K'] = { name: 'K' };");   // kaputtes Profil ohne items
    const text = await ctx.exportInfoSammeln();
    expect(text).toContain('BESTÄNDE');
    expect(text).toContain('LADEZEITEN');
  });

  it('exportInfoErzeugen füllt das Textfeld; Kopieren legt genau diesen Text in die Zwischenablage', async () => {
    const { ctx, els } = boot();
    let kopiert = null;
    Object.defineProperty(ctx, 'navigator', { value: { clipboard: { writeText: async (t) => { kopiert = t; } }, userAgent: 'Test' }, configurable: true });
    await ctx.exportInfoErzeugen();
    expect(els.exportInfoText.textContent).toContain('Export-Info');
    await ctx.exportInfoKopieren();
    expect(kopiert).toBe(els.exportInfoText.textContent);
  });
});

describe('Ladezeit-Marken', () => {
  it('eine Marke wird nur beim ersten Mal gesetzt', () => {
    const { ctx } = boot();
    evalIn(ctx, "_ladeMarke('Test-Marke'); globalThis.__erste = _ladeMarken['Test-Marke'];");
    const erste = evalIn(ctx, '__erste');
    expect(typeof erste).toBe('number');
    evalIn(ctx, "_ladeMarke('Test-Marke');");
    expect(evalIn(ctx, "_ladeMarken['Test-Marke']")).toBe(erste);
  });
});

describe('Großansicht: ◀ ▶ blättert durch Karten mit Bild', () => {
  // Karten eines Spielers: Nr. 3 hat kein Bild (kein Löschen-Knopf) → wird übersprungen
  function mitKarten() {
    const t = boot();
    const karten = [1, 2, 3, 4].map((i) => ({
      dataset: { vidx: String(i) },
      querySelector: (sel) => (sel === '.os-card-del' && i !== 3 ? {} : null),
    }));
    t.els.osm_5 = Object.assign(makeElementStub(), { querySelectorAll: () => karten });
    t.els.osLbPrev = makeElementStub(); t.els.osLbNext = makeElementStub();
    evalIn(t.ctx, 'globalThis.__geoeffnet = [];');
    return t;
  }
  const setzen = (ctx, aktuell) => evalIn(ctx, `_osLbNavSetzen('osm_5', 'vidx', (i) => () => { __geoeffnet.push(i); }, ${aktuell})`);

  it('Reihenfolge der Karten, ohne die Karte ohne Bild', () => {
    const { ctx } = mitKarten();
    setzen(ctx, 2);
    ctx.osLightboxBlaettern(1);
    ctx.osLightboxBlaettern(-1);
    expect(evalIn(ctx, '__geoeffnet')).toEqual([4, 1]);
  });

  it('am Anfang und am Ende gibt es kein Weiter-Blättern', () => {
    const { ctx } = mitKarten();
    setzen(ctx, 1);
    ctx.osLightboxBlaettern(-1);
    expect(evalIn(ctx, '__geoeffnet')).toEqual([]);
    setzen(ctx, 4);
    ctx.osLightboxBlaettern(1);
    expect(evalIn(ctx, '__geoeffnet')).toEqual([]);
  });

  it('die Knöpfe ◀ ▶ erscheinen nur, wenn es in die Richtung weitergeht', () => {
    const { ctx, els } = mitKarten();
    setzen(ctx, 1);
    expect([els.osLbPrev.style.display, els.osLbNext.style.display]).toEqual(['none', '']);
    setzen(ctx, 2);
    expect([els.osLbPrev.style.display, els.osLbNext.style.display]).toEqual(['', '']);
    setzen(ctx, 4);
    expect([els.osLbPrev.style.display, els.osLbNext.style.display]).toEqual(['', 'none']);
  });

  it('eine Karte, die nicht in der Liste steht (z. B. gefiltert), blättert nirgends hin', () => {
    const { ctx, els } = mitKarten();
    setzen(ctx, 3);
    ctx.osLightboxBlaettern(1);
    expect(evalIn(ctx, '__geoeffnet')).toEqual([]);
    expect([els.osLbPrev.style.display, els.osLbNext.style.display]).toEqual(['none', 'none']);
  });
});
