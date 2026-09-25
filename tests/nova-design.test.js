// Oberfläche (Nova) – einzige Oberfläche, auf Leistung ausgelegt.
// Das alte Design liegt im Branch archiv/klassisches-design.
// Abgesichert wird:
//   1. nova-boot.js setzt data-ui="nova" vor dem ersten Zeichnen und übernimmt
//      die gemerkte Seitenleisten-Breite.
//   2. Leistungs-Leitplanken: kein WebGL/Canvas, kein GSAP, keine Endlos-
//      Animationen außer dem Ladespinner, kein backdrop-filter, keine
//      Maus-Bewegungs-Handler, kein fixed-Hintergrund.
//   3. index.html lädt nova.js NACH allen Feature-Modulen (sonst fehlen
//      switchTab/showStatus zum Umhüllen).

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
  it('setzt immer Nova und lädt das Stylesheet mit Cache-Buster', () => {
    const { attrs, written } = runBoot({});
    expect(attrs['data-ui']).toBe('nova');
    expect(attrs['data-nv-side']).toBeUndefined();
    expect(written.join('')).toMatch(/nova\/nova\.css\?_=\d+/);
  });

  it("eine alte Wahl 'classic' wird ignoriert, die Seitenleisten-Breite übernommen", () => {
    const { attrs } = runBoot({ BC_UI_Design: 'classic', BC_UI_NovaSide: 'collapsed' });
    expect(attrs['data-ui']).toBe('nova');
    expect(attrs['data-nv-side']).toBe('collapsed');
  });

  it('localStorage wirft (z. B. blockiert) → kein Absturz', () => {
    const attrs = {};
    vm.runInNewContext(src('nova/nova-boot.js'), {
      get localStorage() { throw new Error('blocked'); },
      document: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, write() {} },
    });
    expect(attrs['data-ui']).toBe('nova');
  });
});

describe('Leistungs-Leitplanken', () => {
  const css = src('nova/nova.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const js = src('nova/nova.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('kein WebGL/Canvas, kein GSAP, keine rAF-Schleife, keine Maus-Bewegungs-Handler', () => {
    expect(js).not.toMatch(/getContext\(|webgl|gsap|requestAnimationFrame\(\s*loop/i);
    // Keine globalen Bewegungs-/Scroll-Handler (die Palette hat einen mousemove
    // nur auf ihrer eigenen Liste – der läuft nur, solange sie offen ist)
    expect(js).not.toMatch(/(document|window)\.addEventListener\(\s*['"](pointermove|mousemove|scroll)['"]/);
    expect(js).not.toMatch(/(^|[^.\w])addEventListener\(\s*['"](pointermove|mousemove|scroll)['"]/m);
    expect(fs.existsSync(path.join(REPO_ROOT, 'vendor/gsap.min.js'))).toBe(false);
    expect(src('index.html')).not.toMatch(/gsap/i);
  });

  it('Endlos-Animation nur für den Ladespinner (läuft nur, solange er sichtbar ist)', () => {
    const endlos = css.match(/animation:[^;]*infinite[^;]*;/g) || [];
    expect(endlos).toEqual(['animation: nvRot .8s linear infinite;']);
  });

  it('kein backdrop-filter (außer ausdrücklich abgeschaltet) und kein fixed-Hintergrund', () => {
    const bf = css.match(/backdrop-filter:[^;]*;/g) || [];
    expect(bf.every((d) => /:\s*none/.test(d))).toBe(true);
    expect(css).not.toMatch(/background-attachment:\s*fixed/);
  });
});

describe('index.html bindet die Oberfläche korrekt ein', () => {
  const html = src('index.html');
  it('Boot im <head>, vor dem ersten <style>', () => {
    const boot = html.indexOf('nova/nova-boot.js');
    expect(boot).toBeGreaterThan(-1);
    expect(boot).toBeLessThan(html.indexOf('<style>'));
    expect(boot).toBeLessThan(html.indexOf('<body>'));
  });
  it('nova.js nach bc-autobackup.js (letztes Feature-Modul)', () => {
    const last = html.indexOf('bc-autobackup.js?_=');
    const nova = html.indexOf('nova/nova.js?_=');
    expect(last).toBeGreaterThan(-1);
    expect(nova).toBeGreaterThan(last);
  });
});
