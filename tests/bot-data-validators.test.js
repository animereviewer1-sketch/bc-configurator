import { describe, it, expect, beforeAll } from 'vitest';
import { loadScript, evalIn, settle } from './helpers/loadScript.js';

let ctx;

beforeAll(async () => {
  ctx = loadScript(['items.js', 'bot-data.js']);
  // Die async Init-IIFE von bot-data.js (Zeile ~110-152) ruft nach dem
  // idbGet-Resolve selbst _migriereLogik() auf. Ohne Wartezeit könnte sie
  // unsere Fixtures vor der Assertion bereinigen (Race).
  await settle(150);
});

describe('_normLogik (TEST-05)', () => {
  it('setzt logik der ersten Bedingung auf und, lässt Folgeelemente unverändert und liefert dieselbe Referenz', () => {
    const arr = [{ logik: 'oder', typ: 'wort' }, { logik: 'oder' }];
    expect(ctx._normLogik(arr)).toBe(arr);
    expect(arr[0].logik).toBe('und');
    expect(arr[0].typ).toBe('wort');
    expect(arr[1].logik).toBe('oder');
  });

  it('normalisiert alle Legacy-Werte an erster Stelle', () => {
    for (const v of ['oder', 'und_oder', 'und_nicht']) {
      expect(ctx._normLogik([{ logik: v }])[0].logik).toBe('und');
    }
    expect(ctx._normLogik([{ typ: 'wort' }])[0].logik).toBe('und');
  });

  it('ungültige Eingaben werden unverändert und ohne Exception durchgereicht', () => {
    expect(ctx._normLogik(null)).toBeNull();
    expect(ctx._normLogik(undefined)).toBeUndefined();
    expect(ctx._normLogik('x')).toBe('x');
    expect(ctx._normLogik(42)).toBe(42);
    const o = { logik: 'oder' };
    expect(ctx._normLogik(o)).toBe(o);
    expect(o.logik).toBe('oder');
    const e = [];
    expect(ctx._normLogik(e)).toBe(e);
    expect(e.length).toBe(0);
    expect(ctx._normLogik([null])).toEqual([null]);
  });
});

describe('_migriereLogik (TEST-05)', () => {
  it('bereinigt Legacy-Logik in triggers.bedingungen, triggers.ifBedingungen und events.bedingungen und liefert die Anzahl', async () => {
    const bots = evalIn(ctx, '_bots');
    bots.length = 0;
    bots.push({
      id: 'b1',
      name: 'B',
      triggers: [
        { bedingungen: [{ logik: 'oder' }, { logik: 'oder' }], ifBedingungen: [{ logik: 'und_nicht' }] },
      ],
      events: [{ bedingungen: [{ logik: 'und_oder' }] }],
    });
    expect(ctx._migriereLogik()).toBe(3);
    expect(bots[0].triggers[0].bedingungen[0].logik).toBe('und');
    expect(bots[0].triggers[0].bedingungen[1].logik).toBe('oder');
    expect(bots[0].triggers[0].ifBedingungen[0].logik).toBe('und');
    expect(bots[0].events[0].bedingungen[0].logik).toBe('und');
  });

  it('ist idempotent', () => {
    expect(ctx._migriereLogik()).toBe(0);
  });

  it('Bots ohne triggers/events, leere und bereits korrekte Bedingungen sind unkritisch', () => {
    const bots = evalIn(ctx, '_bots');
    bots.length = 0;
    bots.push(
      { id: 'b2' },
      { id: 'b3', triggers: [{ bedingungen: [] }, {}, { bedingungen: [{ logik: 'und' }] }], events: [{}] },
    );
    expect(() => ctx._migriereLogik()).not.toThrow();
    expect(ctx._migriereLogik()).toBe(0);
  });

  it('persistiert bereinigte Bots unter BC_Bots_v2', async () => {
    const bots = evalIn(ctx, '_bots');
    bots.length = 0;
    bots.push({
      id: 'b4',
      name: 'P',
      triggers: [{ bedingungen: [{ logik: 'oder', typ: 'wort' }] }],
    });
    expect(ctx._migriereLogik()).toBe(1);
    await settle(100);
    const saved = await ctx.idbGet('BC_Bots_v2');
    expect(JSON.stringify(saved)).toContain('"logik":"und"');
    expect(JSON.stringify(saved)).toContain('"id":"b4"');
  });
});

describe('Extras: _botVarApply / _playerKeyApply (Guard-Clauses)', () => {
  it('_botVarApply verwirft null-memberNum und leeren Namen, akzeptiert 0 als memberNum', () => {
    ctx._botVarApply(null, 'x', 1);
    ctx._botVarApply(5, '', 1);
    ctx._botVarApply(5, 'gold', 3);
    ctx._botVarApply(0, 'z', 'ok');
    const vars = evalIn(ctx, '_botVars');
    expect(vars['5']).toEqual({ gold: 3 });
    expect(vars['0']).toEqual({ z: 'ok' });
    expect(Object.keys(vars).sort()).toEqual(['0', '5']);
  });

  it('_playerKeyApply verwirft null-memberNum und unbekannte Schlüssel, behält den Namen', () => {
    ctx._playerKeyApply(null, 'A', 'gold', true);
    ctx._playerKeyApply(7, 'Anna', 'gold', true);
    ctx._playerKeyApply(7, '', 'platinum', true);
    const keys = evalIn(ctx, '_playerKeys');
    expect(keys['7']).toEqual({ name: 'Anna', bronze: false, silver: false, gold: true });
    expect(keys['7'].platinum).toBeUndefined();
    expect(Object.keys(keys)).toEqual(['7']);
  });
});
