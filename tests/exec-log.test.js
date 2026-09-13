import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, settle, makeElementStub } from './helpers/loadScript.js';

// STAB-08: EXEC-Log — RAM-Ringpuffer in bcSend (einziger Sendepfad aller
// EXEC-Aufrufstellen), gedrosselte Persistenz unter BC_ExecLog_v1, Anzeige im
// Tweaks-Panel (#execLogInfo). Rotation darf NUR das Log selbst betreffen —
// LSCG_DB/PROFILE_SCREENSHOTS (Scan-Daten, Kernwert) bleiben unberührt.
//
// fake-indexeddb ist pro Testdatei prozessweit (RESEARCH Befund 4): mehrere
// loadScript-Sandboxen in dieser Datei teilen dieselbe DB. Deshalb nutzen die
// Persistenztests eindeutige desc-Labels statt absoluter Zählungen.

async function boot() {
  const opener = { closed: false, postMessage: vi.fn() };
  const el = makeElementStub();
  const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0, clearTimeout: () => {} });
  evalIn(ctx, "_bcOrigin = 'https://game.test'"); // Handshake simulieren – bcSend weist sonst alles außer PING ab (STAB-04)
  ctx.document.getElementById = (id) => (id === 'execLogInfo' ? el : makeElementStub());
  await settle(50);
  opener.postMessage.mockClear();
  return { ctx, opener, el };
}

function log(ctx) {
  return evalIn(ctx, '_execLog');
}

function exec(ctx, code, extra = {}) {
  return ctx.bcSend({ type: 'EXEC', code, ...extra }, true);
}

describe('EXEC-Log: Append in bcSend (STAB-08)', () => {
  it('ein EXEC erzeugt genau einen Eintrag {ts, desc, len}', async () => {
    const { ctx } = await boot();
    const n0 = log(ctx).length;
    expect(exec(ctx, '(function(){ Foo(); })();')).toBe(true);
    expect(log(ctx).length).toBe(n0 + 1);
    const entry = log(ctx)[log(ctx).length - 1];
    expect(typeof entry.ts).toBe('number');
    expect(Math.abs(entry.ts - Date.now())).toBeLessThan(5000);
    expect(entry.desc).toBe('(function(){ Foo(); })();');
    expect(entry.len).toBe(25);
  });

  it('desc: Aufrufer-Label hat Vorrang, sonst die ersten 60 Zeichen (Whitespace kollabiert)', async () => {
    const { ctx } = await boot();

    exec(ctx, 'x', { desc: 'Outfit anwenden' });
    expect(log(ctx).at(-1).desc).toBe('Outfit anwenden');

    exec(ctx, 'a'.repeat(100));
    const longEntry = log(ctx).at(-1);
    expect(longEntry.desc.length).toBe(60);
    expect(longEntry.len).toBe(100);

    exec(ctx, '(function(){\n  var a = 1;\n})();');
    expect(log(ctx).at(-1).desc).toBe('(function(){ var a = 1; })();');
  });

  it('Nicht-EXEC-Nachrichten erzeugen keinen Eintrag', async () => {
    const { ctx } = await boot();
    const n0 = log(ctx).length;
    ctx.bcSend({ type: 'GET_PLAYER' }, true);
    ctx.bcSend({ type: 'PING' }, true);
    expect(log(ctx).length).toBe(n0);
  });

  it('ohne opener wird nicht gesendet und nicht geloggt', async () => {
    const ctx = loadScript(['items.js'], { setTimeout: () => 0 });
    await settle(50);
    const n0 = log(ctx).length;
    expect(ctx.bcSend({ type: 'EXEC', code: 'x' }, true)).toBe(false);
    expect(log(ctx).length).toBe(n0);
  });

  it('EXEC_LOG_MAX ist 200; Überlauf verwirft die ältesten Log-Einträge', async () => {
    const { ctx } = await boot();
    evalIn(ctx, '_execLog.length = 0');
    for (let i = 1; i <= 201; i++) {
      exec(ctx, 'c' + i, { desc: 'exec-' + i });
    }
    expect(log(ctx).length).toBe(200);
    expect(log(ctx)[0].desc).toBe('exec-2');
    expect(log(ctx)[199].desc).toBe('exec-201');
    expect(evalIn(ctx, 'EXEC_LOG_MAX')).toBe(200);
  });
});

describe('EXEC-Log: Rotation berührt keine Scan-Daten (Kernwert)', () => {
  it('nach 250 EXECs und Save ist LSCG_DB in IDB byte-identisch', async () => {
    const { ctx } = await boot();
    const seed = { 4711: { versions: [{ code: 'abc', ts: 1 }] } };
    await ctx.idbSet('LSCG_DB', seed);
    await ctx.idbSet('PROFILE_SCREENSHOTS', { p: 1 });
    for (let i = 1; i <= 250; i++) {
      exec(ctx, 'c' + i);
    }
    await ctx._saveExecLog();
    expect(await ctx.idbGet('LSCG_DB')).toEqual(seed);
    expect(await ctx.idbGet('PROFILE_SCREENSHOTS')).toEqual({ p: 1 });
  });
});

describe('EXEC-Log: Persistenz unter BC_ExecLog_v1', () => {
  it('_saveExecLog schreibt den Puffer; eine neue Sandbox lädt und mergt ihn', async () => {
    const { ctx } = await boot();
    const tag = 'persist-' + Date.now();
    exec(ctx, 'x', { desc: tag });
    await ctx._saveExecLog();
    const stored = await ctx.idbGet('BC_ExecLog_v1');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.at(-1).desc).toBe(tag);

    const { ctx: ctx2 } = await boot();
    expect(log(ctx2).some((e) => e.desc === tag)).toBe(true);
    expect(log(ctx2).length).toBeLessThanOrEqual(200);
  });

  it('_loadExecLog überschreibt keine bereits im RAM liegenden Einträge (Merge)', async () => {
    const opener = { closed: false, postMessage: vi.fn() };
    const ctx = loadScript(['items.js'], { opener, setTimeout: () => 0 });
    evalIn(ctx, "_bcOrigin = 'https://game.test'");
    const earlyDesc = 'early-' + Date.now();
    exec(ctx, 'early', { desc: earlyDesc });
    await settle(50);
    const entries = log(ctx);
    const idx = entries.findIndex((e) => e.desc === earlyDesc);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBe(entries.length - 1);
  });
});

describe('EXEC-Log: Anzeige im Tweaks-Panel', () => {
  it('_execLogFormat: HH:MM:SS · desc (len Zeichen)', async () => {
    const { ctx } = await boot();
    const text = ctx._execLogFormat({ ts: Date.now(), desc: 'Outfit anwenden', len: 42 });
    expect(text).toMatch(/^\d{2}:\d{2}:\d{2} · Outfit anwenden \(42 Zeichen\)$/);
  });

  it('_renderExecLog: leer → Hinweistext; sonst neueste zuerst, max EXEC_LOG_SHOWN Zeilen', async () => {
    const { ctx, el } = await boot();
    evalIn(ctx, '_execLog.length = 0');
    ctx._renderExecLog();
    expect(el.textContent).toBe('Noch kein EXEC gesendet');

    exec(ctx, 'a', { desc: 'erster' });
    exec(ctx, 'b', { desc: 'zweiter' });
    ctx._renderExecLog();
    expect(el.textContent.indexOf('zweiter')).toBeLessThan(el.textContent.indexOf('erster'));

    for (let i = 1; i <= 40; i++) {
      exec(ctx, 'x' + i, { desc: 'x' + i });
    }
    const shown = evalIn(ctx, 'EXEC_LOG_SHOWN');
    expect(el.textContent.split('\n').length).toBeLessThanOrEqual(shown + 1);
    expect(el.textContent).toContain('ältere');
  });

  it('Append aktualisiert die Anzeige automatisch', async () => {
    const { ctx, el } = await boot();
    exec(ctx, 'z', { desc: 'auto-render' });
    expect(el.textContent).toContain('auto-render');
  });
});
