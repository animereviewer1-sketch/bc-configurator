import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Start-Filter (Einstellungen → Darstellung): welche Filter beim Start eines Tabs schon gesetzt sind.
// Craft & Curse startet mit "Neu + Cursed + Kein Outfit"; alles ist konfigurierbar und wird im localStorage gehalten.

const KEY = 'BC_StartFilter_v1';

function boot({ gespeichert, optionen = [] } = {}) {
  const els = {};
  const el = (id, extra = {}) => (els[id] ||= Object.assign(makeElementStub(), { classList: { toggle: vi.fn(), add() {}, remove() {}, contains: () => false } }, extra));
  const chips = ['all', 'fav', 'withshot', 'noshot', 'noold'].map((f) => ({ dataset: { filter: f }, classList: { toggle: vi.fn() } }));
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  if (gespeichert !== undefined) ctx.localStorage.setItem(KEY, typeof gespeichert === 'string' ? gespeichert : JSON.stringify(gespeichert));
  ctx.document.getElementById = (id) => el(id);
  ctx.document.querySelectorAll = (sel) => (sel === '.profile-fc' ? chips : []);
  el('slotFilter', { options: optionen.map((v) => ({ value: v })) });
  ctx.__r = [];
  evalIn(ctx, `
    renderCurseTab = function () { __r.push('curse'); };
    renderProfileList = function () { __r.push('profile'); };
    _renderMbsWheelTab = function () { __r.push('wheel'); };
    osSetLockFilter = function (v) { __r.push('os:' + v); };
  `);
  // gespeicherten Stand neu einlesen (der Start in loadScript lief vor dem Setzen)
  evalIn(ctx, '_startFilter = _sfLaden()');
  return { ctx, el, els, chips, r: () => ctx.__r };
}
const lies = (ctx, ausdruck) => evalIn(ctx, ausdruck);

describe('Normieren und Laden', () => {
  it('ohne gespeicherten Stand: Craft & Curse startet mit Neu + Cursed + Kein Outfit, alles andere ungefiltert', () => {
    const { ctx } = boot();
    expect(lies(ctx, '_startFilter')).toEqual({
      curse:   { filter: ['neu', 'cursed', 'no-outfit'], cache: false, slot: '', suche: '' },
      profile: { filter: 'all', tag: '', suche: '' },
      os:      { filter: 'all', schloss: '', suche: '' },
      wheel:   { filter: 'all', suche: '' },
    });
  });

  it('kaputtes JSON oder Unsinn im Speicher: Standardwerte, kein Absturz', () => {
    for (const roh of ['{kaputt', 'null', '42', '"text"', '[]']) {
      const { ctx } = boot({ gespeichert: roh });
      expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu', 'cursed', 'no-outfit']);
    }
  });

  it('gespeicherter Stand wird übernommen; ein bewusst leerer Curse-Filter bleibt leer (nicht wieder Standard)', () => {
    const { ctx } = boot({ gespeichert: { curse: { filter: [], cache: true, slot: 'ItemArms', suche: 'ada' }, wheel: { filter: 'new', suche: '' } } });
    expect(lies(ctx, '_startFilter.curse')).toEqual({ filter: [], cache: true, slot: 'ItemArms', suche: 'ada' });
    expect(lies(ctx, '_startFilter.wheel.filter')).toBe('new');
  });

  it('unbekannte Werte fliegen raus, fehlende kommen aus dem Standard', () => {
    const { ctx } = boot({ gespeichert: { curse: { filter: ['neu', 'quatsch', 'neu', 7] }, profile: { filter: 'nope' }, os: { schloss: 'x' }, wheel: { filter: 'hm' } } });
    expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu']);
    expect(lies(ctx, '_startFilter.profile.filter')).toBe('all');
    expect(lies(ctx, '_startFilter.os.schloss')).toBe('');
    expect(lies(ctx, '_startFilter.wheel.filter')).toBe('all');
  });

  it('"Outfit" schließt "Neu" und "Kein Outfit" aus – wie im Tab', () => {
    const { ctx } = boot({ gespeichert: { curse: { filter: ['outfit', 'neu', 'cursed'] } } });
    expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu', 'cursed']);
    const b = boot({ gespeichert: { curse: { filter: ['outfit', 'cursed'] } } });
    expect(lies(b.ctx, '_startFilter.curse.filter')).toEqual(['outfit', 'cursed']);
  });

  it('Texte werden begrenzt und nur als Text akzeptiert', () => {
    const { ctx } = boot({ gespeichert: { curse: { suche: 'x'.repeat(500), slot: 5 } } });
    expect(lies(ctx, '_startFilter.curse.suche').length).toBe(80);
    expect(lies(ctx, '_startFilter.curse.slot')).toBe('');
  });
});

describe('Anwenden in den Tabs', () => {
  it('Craft & Curse: Filter, Cache-Chip und Suche stehen; die Anzeige der Filter wird nachgezogen', () => {
    const { ctx, el } = boot({ gespeichert: { curse: { filter: ['neu', 'cursed', 'no-outfit'], cache: true, suche: 'ada' } } });
    ctx.__sync = 0;
    evalIn(ctx, '_syncCurseFilterUI = function () { __sync++; }');
    evalIn(ctx, "startFilterAnwenden('curse')");
    expect([...lies(ctx, '_curseActiveFilters')].sort()).toEqual(['cursed', 'neu', 'no-outfit']);
    expect(ctx.__sync).toBe(1);
    expect(el('fc-cache').classList.toggle).toHaveBeenCalledWith('on', true);
    expect(el('curseSearch').value).toBe('ada');
  });

  it('ersetzt einen früheren Stand statt ihn zu ergänzen', () => {
    const { ctx } = boot({ gespeichert: { curse: { filter: ['fav'] } } });
    evalIn(ctx, "_curseActiveFilters.add('neu'); _curseActiveFilters.add('outfit'); startFilterAnwenden('curse')");
    expect([...lies(ctx, '_curseActiveFilters')]).toEqual(['fav']);
  });

  it('Craft & Curse zeichnet nur, wenn der Tab gerade offen ist', () => {
    const { ctx, r } = boot();
    evalIn(ctx, "_activeTab = 'items'; startFilterAnwenden('curse')");
    expect(r()).toEqual([]);
    evalIn(ctx, "_activeTab = 'curse'; startFilterAnwenden('curse')");
    expect(r()).toEqual(['curse']);
  });

  it('Start-Slot: sofort gesetzt, wenn die Liste ihn schon kennt', () => {
    const { ctx, el } = boot({ gespeichert: { curse: { slot: 'ItemArms' } }, optionen: ['', 'ItemArms', 'ItemLegs'] });
    evalIn(ctx, "startFilterAnwenden('curse')");
    expect(el('slotFilter').value).toBe('ItemArms');
    expect(lies(ctx, '_sfSlotWunsch')).toBe('');
  });

  it('Start-Slot: Liste noch leer → wird vorgemerkt und beim ersten Befüllen genau einmal angewendet', () => {
    const { ctx, el } = boot({ gespeichert: { curse: { slot: 'ItemArms' } }, optionen: [''] });
    evalIn(ctx, "startFilterAnwenden('curse')");
    expect(lies(ctx, '_sfSlotWunsch')).toBe('ItemArms');
    el('slotFilter').value = '';
    evalIn(ctx, 'CURSE_DB = { k: { ItemName: "X", CraftName: "Y", Gruppe: "ItemArms", Besitzer: { Nummer: 1 } } }; _populateSlotFilter()');
    expect(el('slotFilter').innerHTML).toContain('value="ItemArms" selected');
    expect(lies(ctx, '_sfSlotWunsch')).toBe('');
    // beim nächsten Befüllen wirkt der Wunsch nicht mehr (der Nutzer darf umstellen)
    el('slotFilter').value = '';
    evalIn(ctx, '_populateSlotFilter()');
    expect(el('slotFilter').innerHTML).not.toContain('selected');
  });

  it('Outfit & Profile: Filter, Chips und Suche', () => {
    const { ctx, el, chips, r } = boot({ gespeichert: { profile: { filter: 'noshot', suche: 'bea' } } });
    evalIn(ctx, "_activeTab = 'outfit'; startFilterAnwenden('profile')");
    expect(lies(ctx, '_profileFilter')).toBe('noshot');
    expect(chips.map((c) => c.classList.toggle.mock.calls.at(-1))).toEqual([
      ['on', false], ['on', false], ['on', false], ['on', true], ['on', false],
    ]);
    expect(el('profileSearch').value).toBe('bea');
    expect(r()).toEqual(['profile']);
  });

  it('MBS Wheel: Filter und Suche', () => {
    const { ctx, el, r } = boot({ gespeichert: { wheel: { filter: 'fav', suche: ' Ada ' } } });
    evalIn(ctx, "_activeTab = 'lscg-wheel'; startFilterAnwenden('wheel')");
    expect(lies(ctx, '_mbsWheelFilter')).toBe('fav');
    expect(lies(ctx, '_mbsWheelSearch')).toBe('ada');
    expect(el('wheelSearchInput').value).toBe(' Ada '.slice(0, 80));
    expect(r()).toEqual(['wheel']);
  });

  it('LSCG Outfits: Suche sofort; der Schlossfilter erst beim ersten Öffnen des Tabs (Codes müssen entpackt werden)', () => {
    const { ctx, el, r } = boot({ gespeichert: { os: { schloss: 'afc', suche: 'Bea' } } });
    evalIn(ctx, "_activeTab = 'items'; startFilterAnwenden('os')");
    expect(lies(ctx, '_osSearchQuery')).toBe('bea');
    expect(lies(ctx, '_osLockFilter')).toBe('');          // noch nichts entpackt
    expect(el('osLockFilter').value).toBe('afc');          // Anzeige steht
    expect(r()).toEqual([]);
    expect(lies(ctx, '_sfOsErstmals()')).toBe(true);       // erstes Öffnen: Filter übernimmt das Zeichnen
    expect(r()).toEqual(['os:afc']);
    expect(lies(ctx, '_sfOsErstmals()')).toBe(false);      // danach nicht mehr
  });

  it('LSCG Outfits ohne Schlossfilter: das erste Öffnen zeichnet ganz normal', () => {
    const { ctx } = boot();
    evalIn(ctx, "_activeTab = 'items'; startFilterAnwenden('os')");
    expect(lies(ctx, '_sfOsErstmals()')).toBe(false);
  });

  it('LSCG Outfits bei offenem Tab: Filter greift sofort', () => {
    const { ctx, r } = boot({ gespeichert: { os: { schloss: 'timer' } } });
    evalIn(ctx, "_activeTab = 'outfit-scan'; startFilterAnwenden('os')");
    expect(r()).toEqual(['os:timer']);
  });

  it('ohne Angabe wird alles angewendet; ein Fehler in einem Bereich verhindert die anderen nicht', () => {
    const { ctx } = boot({ gespeichert: { wheel: { filter: 'new' }, profile: { filter: 'fav' } } });
    evalIn(ctx, "_activeTab = 'items'; startFilterAnwenden()");
    expect(lies(ctx, '_mbsWheelFilter')).toBe('new');
    expect(lies(ctx, '_profileFilter')).toBe('fav');
    expect([...lies(ctx, '_curseActiveFilters')].sort()).toEqual(['cursed', 'neu', 'no-outfit']);
  });
});

describe('Einstellungen: ändern, übernehmen, zurücksetzen', () => {
  const gespeichert = (ctx) => JSON.parse(ctx.localStorage.getItem(KEY));

  it('Häkchen in der Einstellung ändert den Stand und speichert; "Outfit" und "Neu" schließen sich aus', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfCurseFilter('outfit', true)");
    expect(gespeichert(ctx).curse.filter).toEqual(['cursed', 'outfit']);          // neu + no-outfit abgewählt
    evalIn(ctx, "sfCurseFilter('neu', true)");
    expect(gespeichert(ctx).curse.filter).toEqual(['cursed', 'neu']);             // outfit abgewählt
    evalIn(ctx, "sfCurseFilter('cursed', false)");
    expect(gespeichert(ctx).curse.filter).toEqual(['neu']);
  });

  it('unbekannte Filter-Namen werden ignoriert', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfCurseFilter('boese', true)");
    expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu', 'cursed', 'no-outfit']);
  });

  it('Einzelwerte: Cache, Slot, Suche, Filter der anderen Tabs', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfSet('curse','cache',true); sfSet('curse','slot','ItemArms'); sfSet('profile','filter','withshot'); sfSet('wheel','filter','fav'); sfSet('os','schloss','dogs'); sfSet('os','suche','bea')");
    const s = gespeichert(ctx);
    expect(s.curse.cache).toBe(true);
    expect(s.curse.slot).toBe('ItemArms');
    expect(s.profile.filter).toBe('withshot');
    expect(s.wheel.filter).toBe('fav');
    expect(s.os).toEqual({ filter: 'all', schloss: 'dogs', suche: 'bea' });
  });

  it('die gemeinsamen Filter (Alle · Favoriten · Neu · Mit Bild · Ohne Bild) gelten für Profile, LSCG und Wheel gleich', () => {
    const { ctx } = boot();
    for (const f of ['all', 'fav', 'new', 'withshot', 'noshot']) {
      evalIn(ctx, `sfSet('profile','filter','${f}'); sfSet('os','filter','${f}'); sfSet('wheel','filter','${f}')`);
      expect(lies(ctx, '[_startFilter.profile.filter, _startFilter.os.filter, _startFilter.wheel.filter]')).toEqual([f, f, f]);
    }
    evalIn(ctx, "sfSet('profile','filter','noold')");   // nur bei den Profilen
    expect(lies(ctx, '_startFilter.profile.filter')).toBe('noold');
    evalIn(ctx, "sfSet('os','filter','noold'); sfSet('wheel','filter','noold')");
    expect(lies(ctx, '[_startFilter.os.filter, _startFilter.wheel.filter]')).toEqual(['all', 'all']);   // dort gibt es "(old) aus" nicht → Standard
  });

  it('Profil-Tag als Start-Filter', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfSet('profile','tag','sommer')");
    expect(lies(ctx, '_startFilter.profile.tag')).toBe('sommer');
    evalIn(ctx, "startFilterAnwenden('profile')");
    expect(lies(ctx, '_profileTagFilter')).toBe('sommer');
    evalIn(ctx, "sfSet('profile','tag','')");
    evalIn(ctx, "startFilterAnwenden('profile')");
    expect(lies(ctx, '_profileTagFilter')).toBeNull();
  });

  it('LSCG-Filter als Start-Filter: gesetzt beim Anwenden, wird mit "Aktuelle Auswahl" übernommen', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfSet('os','filter','withshot'); startFilterAnwenden('os')");
    expect(lies(ctx, '[_osFavFilter, _osBildFilter]')).toEqual([false, 'withshot']);
    evalIn(ctx, "osSetFilter('fav')");
    evalIn(ctx, "startFilterUebernehmen('os')");
    expect(lies(ctx, '_startFilter.os.filter')).toBe('fav');
    evalIn(ctx, "sfSet('os','filter','all'); startFilterAnwenden('os')");
    expect(lies(ctx, '[_osFavFilter, _osBildFilter]')).toEqual([false, '']);
  });

  it('ungültige Einzelwerte werden zurückgewiesen (Filter fällt auf Standard, Fremdes ändert nichts)', () => {
    const { ctx } = boot();
    evalIn(ctx, "sfSet('profile','filter','quatsch'); sfSet('wheel','nix','y'); sfSet('gibtsnicht','filter','all'); sfSet('curse','filter',['fav'])");
    expect(lies(ctx, '_startFilter.profile.filter')).toBe('all');
    expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu', 'cursed', 'no-outfit']);   // nur über sfCurseFilter
  });

  it('"Aktuelle Auswahl": übernimmt, was im Tab gerade eingestellt ist', () => {
    const { ctx, el } = boot();
    evalIn(ctx, "_curseActiveFilters.clear(); _curseActiveFilters.add('fav'); _curseActiveFilters.add('outfit');");
    el('fc-cache').classList.contains = () => true;
    el('slotFilter').value = 'ItemLegs';
    el('curseSearch').value = 'rot';
    evalIn(ctx, "startFilterUebernehmen('curse')");
    expect(gespeichert(ctx).curse).toEqual({ filter: ['fav', 'outfit'], cache: true, slot: 'ItemLegs', suche: 'rot' });

    evalIn(ctx, "_profileFilter = 'noold'");
    el('profileSearch').value = 'x';
    evalIn(ctx, "startFilterUebernehmen('profile')");
    expect(gespeichert(ctx).profile).toEqual({ filter: 'noold', tag: '', suche: 'x' });

    evalIn(ctx, "_mbsWheelFilter = 'new'; _osLockFilter = 'afc'");
    evalIn(ctx, "startFilterUebernehmen('wheel'); startFilterUebernehmen('os')");
    expect(gespeichert(ctx).wheel.filter).toBe('new');
    expect(gespeichert(ctx).os.schloss).toBe('afc');
  });

  it('"Aktuelle Auswahl" mit unbekanntem Bereich tut nichts', () => {
    const { ctx } = boot();
    evalIn(ctx, "startFilterUebernehmen('quatsch')");
    expect(ctx.localStorage.getItem(KEY)).toBeNull();
  });

  it('"↺ Standard" setzt nur diesen Bereich zurück', () => {
    const { ctx } = boot({ gespeichert: { curse: { filter: ['fav'] }, wheel: { filter: 'new' } } });
    evalIn(ctx, "startFilterStandard('curse')");
    expect(lies(ctx, '_startFilter.curse.filter')).toEqual(['neu', 'cursed', 'no-outfit']);
    expect(lies(ctx, '_startFilter.wheel.filter')).toBe('new');
  });

  it('die Karte zeigt die Steuerelemente und Werte; Fremdtext wird maskiert', () => {
    const { ctx, el } = boot({ gespeichert: { curse: { slot: 'a"><img src=x onerror=alert(1)>', suche: "o'Brien" } } });
    evalIn(ctx, 'startFilterRender()');
    const html = el('startFilterBox').innerHTML;
    for (const t of ['Craft &amp; Curse', 'Outfit &amp; Profile', 'LSCG Outfits', 'MBS Wheel', 'Aktuelle Auswahl', 'Kein Outfit', 'Im Cache']) expect(html).toContain(t);
    expect(html).toMatch(/sfCurseFilter\('neu',this\.checked\)/);
    expect(html).toMatch(/<input type="checkbox" checked onchange="sfCurseFilter\('cursed',this\.checked\)">/);   // Standard: Cursed an
    expect(html).not.toMatch(/<input type="checkbox" checked onchange="sfCurseFilter\('fav'/);                   // Favoriten aus
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
    expect(html).toContain('o&#39;Brien');
  });

  it('speichern, wenn localStorage nicht schreibbar ist: kein Absturz', () => {
    const { ctx } = boot();
    ctx.localStorage.setItem = () => { throw new Error('voll'); };
    expect(() => evalIn(ctx, "sfSet('wheel','filter','fav')")).not.toThrow();
    expect(lies(ctx, '_startFilter.wheel.filter')).toBe('fav');
  });
});
