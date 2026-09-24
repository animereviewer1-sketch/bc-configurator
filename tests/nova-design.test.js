// Nova-Design — reine Präsentationsschicht mit Umschalter alt ↔ neu.
// Abgesichert wird:
//   1. nova-boot.js setzt data-ui vor dem ersten Zeichnen (Default nova,
//      'classic' bleibt 'classic') und übernimmt Seitenleiste/Hintergrund.
//   2. Jede Regel in nova/nova.css ist gescoped – das alte Design bleibt
//      unverändert, solange data-ui="classic" gesetzt ist.
//   3. index.html lädt nova.js NACH allen Feature-Modulen (sonst fehlen
//      switchTab/showStatus zum Umhüllen), und die Kern-Ladereihenfolge
//      bleibt unberührt.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { REPO_ROOT } from './helpers/loadScript.js';

function src(file) {
  return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
}

function runBoot(stored) {
  const attrs = {};
  const written = [];
  const ctx = {
    localStorage: { getItem: (k) => (k in stored ? stored[k] : null) },
    document: {
      documentElement: { setAttribute: (k, v) => { attrs[k] = v; } },
      write: (s) => written.push(s),
    },
  };
  vm.runInNewContext(src('nova/nova-boot.js'), ctx);
  return { attrs, written };
}

describe('nova-boot.js', () => {
  it('ohne gespeicherte Wahl → Nova', () => {
    const { attrs, written } = runBoot({});
    expect(attrs['data-ui']).toBe('nova');
    expect(attrs['data-nv-side']).toBeUndefined();
    expect(written.join('')).toMatch(/nova\/nova\.css\?_=\d+/);
  });

  it("'classic' bleibt klassisch, Seitenleiste/Hintergrund werden übernommen", () => {
    const { attrs } = runBoot({ BC_UI_Design: 'classic', BC_UI_NovaSide: 'collapsed', BC_UI_NovaBg: 'off' });
    expect(attrs['data-ui']).toBe('classic');
    expect(attrs['data-nv-side']).toBe('collapsed');
    expect(attrs['data-nv-bg']).toBe('off');
  });

  it('localStorage wirft (z. B. blockiert) → kein Absturz, Nova', () => {
    const attrs = {};
    vm.runInNewContext(src('nova/nova-boot.js'), {
      get localStorage() { throw new Error('blocked'); },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, write() {} },
    });
    expect(attrs['data-ui']).toBe('nova');
  });
});

// Top-Level-Selektoren (auch innerhalb von @media/@supports) einsammeln.
// Verschachtelte Regeln (`& …`) erben den Scope ihres Elternblocks.
function topLevelSelectors(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = []; // 'at' | 'keyframes' | 'rule'
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const prelude = buf.trim();
      buf = '';
      if (prelude.startsWith('@keyframes') || prelude.startsWith('@property')) stack.push('keyframes');
      else if (prelude.startsWith('@')) stack.push('at');
      else {
        if (stack.every((s) => s === 'at')) out.push(prelude);
        stack.push('rule');
      }
    } else if (ch === '}') {
      stack.pop();
      buf = '';
    } else if (ch === ';') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

describe('nova/nova.css ist vollständig gescoped', () => {
  const ALLOWED = [
    /^html\[data-ui="nova"\]/,
    /^html:not\(\[data-ui="nova"\]\)/,
    /^html\[data-nv-(side|bg)="[a-z]+"\] \.nv-/,
    /^\.nv-[a-z]/,
    /^::view-transition-(old|new)\(root\)$/,
  ];
  it('jede Top-Level-Regel trifft nur Nova oder Nova-eigene Elemente', () => {
    const sels = topLevelSelectors(src('nova/nova.css'))
      .flatMap((s) => s.split(',').map((x) => x.trim()))
      .filter(Boolean);
    expect(sels.length).toBeGreaterThan(50);
    const bad = sels.filter((s) => !ALLOWED.some((re) => re.test(s)));
    expect(bad).toEqual([]);
  });
});

describe('index.html bindet Nova korrekt ein', () => {
  const html = src('index.html');
  it('Boot im <head>, vor dem ersten <style>', () => {
    const boot = html.indexOf('nova/nova-boot.js');
    expect(boot).toBeGreaterThan(-1);
    expect(boot).toBeLessThan(html.indexOf('<style>'));
    expect(boot).toBeLessThan(html.indexOf('<body>'));
  });
  it('GSAP und nova.js nach bc-autobackup.js (letztes Feature-Modul)', () => {
    const last = html.indexOf('bc-autobackup.js?_=');
    const gsap = html.indexOf('vendor/gsap.min.js');
    const nova = html.indexOf('nova/nova.js?_=');
    expect(last).toBeGreaterThan(-1);
    expect(gsap).toBeGreaterThan(last);
    expect(nova).toBeGreaterThan(gsap);
  });
  it('vendor/gsap.min.js liegt lokal im Repo (kein CDN-Ausfallrisiko)', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'vendor/gsap.min.js'))).toBe(true);
  });
});
