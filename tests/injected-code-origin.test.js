import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadScript, evalIn, REPO_ROOT, SANDBOX_ORIGIN } from './helpers/loadScript.js';

// STAB-05 / STAB-06 (Tool-Seite): Injizierter Code (Spiel-Tab) sendet an den
// Tool-Origin statt an '*'. Der Wert wird im Tool-Fenster aus
// `window.location.origin` berechnet (`TOOL_ORIGIN`) und als String-Literal
// in die generierte EXEC-Zeichenkette eingebettet — niemals im Spiel-Tab neu
// berechnet (SecurityError bei Cross-Origin-`location`-Zugriff, RESEARCH
// Pitfall 1).

const WILD = /,\s*['"]\*['"]\)/;

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function lastCode(opener) {
  const calls = opener.postMessage.mock.calls;
  return calls[calls.length - 1][0].code;
}

function makeBot(extra = {}) {
  return { id: 'b1', name: 'N', settings: { hearChat: true, modus: 'chat' }, triggers: [], events: [], szenen: [], ...extra };
}

describe('Injizierter Code sendet an den Tool-Origin statt an "*" (STAB-05)', () => {
  let opener, ctx;

  beforeAll(() => {
    opener = { closed: false, postMessage: vi.fn() };
    ctx = loadScript(['items.js', 'bot-data.js', 'bot-ui.js', 'bot-engine.js'], {
      opener,
      setTimeout: () => 0,
      clearTimeout: () => {},
    });
    evalIn(ctx, "_bcOrigin = 'https://game.test'"); // Handshake simulieren (STAB-04-Sperre in bcSend)
    opener.postMessage.mockClear();
  });

  it('TOOL_ORIGIN ist die Origin des Tool-Fensters', () => {
    expect(evalIn(ctx, 'TOOL_ORIGIN')).toBe(SANDBOX_ORIGIN);
  });

  it('debugOsOutfit: Analyse-EXEC antwortet an den Tool-Origin', () => {
    evalIn(ctx, "LSCG_DB['1']={versions:[{code:'abc'}]}");
    ctx.debugOsOutfit('1', 0);
    const code = lastCode(opener);
    expect(code).toContain('"' + SANDBOX_ORIGIN + '"');
    expect(code).not.toMatch(WILD);
    expect(() => new Function(code)).not.toThrow();
  });

  it('bcKeys: Key-Bericht-EXEC antwortet an den Tool-Origin', () => {
    ctx._selBot = () => ({ id: 'b1', laufend: true });
    evalIn(ctx, '_connected = true');
    ctx.bcKeys();
    const code = lastCode(opener);
    expect(code).toContain("'" + SANDBOX_ORIGIN + "'");
    expect(code).not.toMatch(WILD);
    expect(() => new Function(code)).not.toThrow();
  });

  it('_buildBotCode: generierter Bot-Code deklariert _TOOL_ORIGIN einmal und sendet nur dorthin', () => {
    const code = ctx._buildBotCode(makeBot());
    const declMatches = code.match(/const _TOOL_ORIGIN="https:\/\/tool\.test";/g) || [];
    const useMatches = code.match(/,_TOOL_ORIGIN\)/g) || [];
    expect(declMatches.length).toBe(1);
    expect(useMatches.length).toBe(18);
    expect(code).not.toMatch(WILD);
    expect(() => new Function(code)).not.toThrow();
  });
});

describe('Statischer Quell-Audit (STAB-05 / STAB-06 Tool-Seite)', () => {
  function wildcardLines(file) {
    return src(file).split('\n').filter((l) => WILD.test(l));
  }

  it.each([
    ['bot-engine.js', 0],
    ['bot-ui.js', 0],
    ['loader.js', 0],
    ['items.js', 0],
    ['persistence.js', 0],
  ])('%s: %i Wildcard-Ziele', (file, expected) => {
    expect(wildcardLines(file).length).toBe(expected);
  });

  it('bridge.js: genau 1 Wildcard-Zeile – Bootstrap-PING in startPingRetry über window.opener', () => {
    const lines = wildcardLines('bridge.js');
    expect(lines.length).toBe(1);
    for (const l of lines) {
      expect(l).toContain("type: 'PING'");
      expect(l).toContain('window.opener.postMessage(');
    }
  });

  it('Tool-Origin ist genau einmal definiert', () => {
    const itemsSrc = src('items.js');
    const defMatches = itemsSrc.match(/const TOOL_ORIGIN = window\.location\.origin;/g) || [];
    expect(defMatches.length).toBe(1);

    const combined = itemsSrc + src('bot-engine.js') + src('bot-ui.js') + src('bridge.js') + src('persistence.js');
    const originOccurrences = combined.match(/location\.origin/g) || [];
    expect(originOccurrences.length).toBe(1);

    expect((src('bot-engine.js').match(/const TOOL_ORIGIN/g) || []).length).toBe(0);
    expect((src('bot-ui.js').match(/const TOOL_ORIGIN/g) || []).length).toBe(0);
    expect((src('bridge.js').match(/const TOOL_ORIGIN/g) || []).length).toBe(0);
  });

  it('kein GitHub-Pages-Origin-String in Tool-Dateien', () => {
    const loaderSrc = src('loader.js');
    const popupUrlLine = loaderSrc.split('\n').find((l) => /const POPUP_URL = '([^']+)'/.test(l));
    const m = /const POPUP_URL = '([^']+)'/.exec(popupUrlLine);
    const originHost = new URL(m[1]).host;

    for (const file of ['items.js', 'bot-engine.js', 'bot-ui.js', 'bridge.js', 'persistence.js']) {
      const occurrences = src(file).split(originHost).length - 1;
      expect(occurrences).toBe(0);
    }
  });

  it('items.js: 17 Stellen konkatenieren TOOL_ORIGIN, bot-ui.js: 1', () => {
    const itemsCount = src('items.js').split('+ TOOL_ORIGIN +').length - 1;
    const botUiCount = src('bot-ui.js').split('+ TOOL_ORIGIN +').length - 1;
    expect(itemsCount).toBe(17);
    expect(botUiCount).toBe(1);
  });
});
