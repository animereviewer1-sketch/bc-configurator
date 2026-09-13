import { describe, it, expect } from 'vitest';
import { loadScript, makeElementStub } from './helpers/loadScript.js';

// STAB-03: Speicherplatz-Anzeige im Tweaks-Panel.
// `navigator` ist in der vm-Sandbox standardmaessig `undefined` — wird per
// `extraGlobals` injiziert (RESEARCH, Planer-Probe Befund 1). `document.getElementById`
// liefert im Sandbox-Default bei jedem Aufruf einen frischen Stub (01-REVIEW WR-02);
// fuer einen inspizierbaren `textContent` ueberschreibt `captureInfo` die Methode
// auf dem Sandbox-`document` selbst, fest fuer die ID `storageInfo`.

const NAV_OK = { storage: { estimate: async () => ({ usage: 12582912, quota: 1073741824 }) } };
const NAV_FAIL = { storage: { estimate: async () => { throw new Error('estimate kaputt'); } } };

function captureInfo(ctx) {
  const el = makeElementStub();
  ctx.document.getElementById = (id) => id === 'storageInfo' ? el : makeElementStub();
  return el;
}

describe('Speicheranzeige (STAB-03)', () => {
  it.each([
    [0, '0,0 MB'],
    [1048576, '1,0 MB'],
    [12582912, '12,0 MB'],
    [1073741824, '1,00 GB'],
  ])('_speicherFormatBytes(%i) → %s', (n, erwartet) => {
    const ctx = loadScript(['items.js']);
    expect(ctx._speicherFormatBytes(n)).toBe(erwartet);
  });

  it('_speicherFormat: belegt/verfügbar/Prozent', () => {
    const ctx = loadScript(['items.js']);
    expect(ctx._speicherFormat(12582912, 1073741824)).toBe('12,0 MB von 1,00 GB belegt (1 %)');
  });

  it('_speicherFormat: ab 90 % Warnhinweis', () => {
    const ctx = loadScript(['items.js']);
    expect(ctx._speicherFormat(966367642, 1073741824)).toBe('921,6 MB von 1,00 GB belegt (90 %) – Speicher fast voll!');
  });

  it('_speicherFormat: ohne Kontingent', () => {
    const ctx = loadScript(['items.js']);
    expect(ctx._speicherFormat(5242880, 0)).toBe('5,0 MB belegt (Kontingent unbekannt)');
    expect(ctx._speicherFormat(5242880, undefined)).toBe('5,0 MB belegt (Kontingent unbekannt)');
  });

  it('_speicherZeigeStatus schreibt das Ergebnis von navigator.storage.estimate() nach #storageInfo', async () => {
    const ctx = loadScript(['items.js'], { navigator: NAV_OK });
    const el = captureInfo(ctx);
    await ctx._speicherZeigeStatus();
    expect(el.textContent).toBe('12,0 MB von 1,00 GB belegt (1 %)');
  });

  it('ohne navigator: Fallback-Text, keine Exception', async () => {
    const ctx = loadScript(['items.js']);
    const el = captureInfo(ctx);
    await expect(ctx._speicherZeigeStatus()).resolves.toBeUndefined();
    expect(el.textContent).toBe('Speicher-API nicht verfügbar');
  });

  it('navigator ohne storage.estimate: Fallback-Text', async () => {
    const ctx = loadScript(['items.js'], { navigator: {} });
    const el = captureInfo(ctx);
    await expect(ctx._speicherZeigeStatus()).resolves.toBeUndefined();
    expect(el.textContent).toBe('Speicher-API nicht verfügbar');
  });

  it('estimate() wirft: sichtbare Fehlermeldung statt Exception', async () => {
    const ctx = loadScript(['items.js'], { navigator: NAV_FAIL });
    const el = captureInfo(ctx);
    await expect(ctx._speicherZeigeStatus()).resolves.toBeUndefined();
    expect(el.textContent).toBe('Speicherabfrage fehlgeschlagen');
  });

  it('Laden von items.js ohne navigator wirft nicht (Init-Hook ist guarded)', () => {
    let ctx;
    expect(() => { ctx = loadScript(['items.js']); }).not.toThrow();
    expect(typeof ctx._speicherZeigeStatus).toBe('function');
  });
});
