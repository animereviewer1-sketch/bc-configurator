import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// "Duplikate entfernen" in Outfit & Profile: löscht NUR Kopien (DUP), die als (old) markiert sind. Das Original (ORG) und
// Duplikate bei aktuellen Profilen bleiben.

function boot({ bestaetigen = true } = {}) {
  const els = {};
  const fragen = [];
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {}, confirm: (m) => { fragen.push(String(m)); return bestaetigen; } });
  ctx.document.getElementById = (id) => (els[id] ||= makeElementStub());
  evalIn(ctx, `
    renderProfileList = function () {};
    Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
    const dress = [{ group: 'Cloth', asset: 'Dress' }];
    const rock  = [{ group: 'Cloth', asset: 'Skirt' }];
    // Gruppe 1 (Kleid): Original bei Mia (aktuell), Kopien bei Ada (old im Namen) und bei Zoe (aktuell)
    PROFILES['Kleid - Mia']        = { name: 'Kleid - Mia', items: dress };
    PROFILES['Kleid - Ada (old)']  = { name: 'Kleid - Ada (old)', items: dress };
    PROFILES['Kleid - Zoe']        = { name: 'Kleid - Zoe', items: dress };
    // Gruppe 2 (Rock): Original ist selbst (old), die Kopie ist aktuell → bleibt
    PROFILES['Rock - Kim (old)']   = { name: 'Rock - Kim (old)', items: rock };
    PROFILES['Rock - Lea']         = { name: 'Rock - Lea', items: rock };
    // Gruppe 3 (Hose): Kopie über die Alt-Markierung (🔘 (old)) statt über den Namen
    PROFILES['Hose - Eva']         = { name: 'Hose - Eva', items: [{ group: 'Cloth', asset: 'Pants' }] };
    PROFILES['Hose - Uma']         = { name: 'Hose - Uma', items: [{ group: 'Cloth', asset: 'Pants' }] };
    PROFILE_ALT_OWNERS = new Set(['Uma']);
    PROFILE_FAVS.clear(); PROFILE_TAGS = {};
    PROFILE_SCREENSHOTS['Kleid - Ada (old)'] = 'data:x';
    PROFILE_FAVS.add('Kleid - Ada (old)'); PROFILE_TAGS['Kleid - Ada (old)'] = ['sommer'];
  `);
  return { ctx, els, fragen };
}
const namen = (ctx) => evalIn(ctx, 'Object.keys(PROFILES).sort()');

describe('Duplikate entfernen: nur (old)', () => {
  it('erkennt als löschbar nur Kopien mit (old) – über den Namen oder die Alt-Markierung', () => {
    const { ctx } = boot();
    expect(evalIn(ctx, '_profileOldDuplikate().sort()')).toEqual(['Hose - Uma', 'Kleid - Ada (old)']);
  });

  it('Original bleibt, auch wenn es selbst (old) ist; aktuelle Kopien bleiben', () => {
    const { ctx } = boot();
    ctx.removeProfileDuplicates();
    expect(namen(ctx)).toEqual(['Hose - Eva', 'Kleid - Mia', 'Kleid - Zoe', 'Rock - Kim (old)', 'Rock - Lea']);
  });

  it('fragt vorher genau einmal und nennt, was gelöscht wird; bei "Abbrechen" bleibt alles', () => {
    const { ctx, fragen } = boot({ bestaetigen: false });
    const vorher = namen(ctx);
    ctx.removeProfileDuplicates();
    expect(fragen.length).toBe(1);
    expect(fragen[0]).toContain('Kleid - Ada (old)');
    expect(fragen[0]).not.toContain('Kleid - Zoe');
    expect(namen(ctx)).toEqual(vorher);
  });

  it('räumt Bild, Favorit und Tags der gelöschten Kopie mit auf', () => {
    const { ctx } = boot();
    ctx.removeProfileDuplicates();
    expect(evalIn(ctx, "PROFILE_SCREENSHOTS['Kleid - Ada (old)']")).toBeUndefined();
    expect(evalIn(ctx, "PROFILE_FAVS.has('Kleid - Ada (old)')")).toBe(false);
    expect(evalIn(ctx, "PROFILE_TAGS['Kleid - Ada (old)']")).toBeUndefined();
  });

  it('gibt es keine (old)-Duplikate: nichts passiert, keine Rückfrage', () => {
    const { ctx, fragen } = boot();
    evalIn(ctx, "delete PROFILES['Kleid - Ada (old)']; PROFILE_ALT_OWNERS = new Set();");
    ctx.removeProfileDuplicates();
    expect(fragen.length).toBe(0);
    expect(namen(ctx).length).toBe(6);
  });

  it('der Einzel-Löschweg räumt jetzt ebenfalls Favorit und Tags auf', () => {
    const { ctx } = boot();
    ctx.deleteProfile('Kleid - Ada (old)');
    expect(evalIn(ctx, "PROFILE_FAVS.has('Kleid - Ada (old)')")).toBe(false);
    expect(evalIn(ctx, "PROFILE_TAGS['Kleid - Ada (old)']")).toBeUndefined();
  });
});
