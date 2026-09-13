import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers/loadScript.js';

// STAB-06 (Loader-Hälfte, statisch): `ALLOWED_ORIGIN` wird aus `POPUP_URL`
// abgeleitet (eine Origin-Quelle) und der Listener pinnt zusätzlich die
// Nachrichtenquelle (`ev.source`) gegen `window.__BCK_popupRef`. Rein
// statisch, weil eine vollständige loader.js-Sandbox erst Phase 5 kommt
// (RESEARCH Pitfall 4).

const L = fs.readFileSync(path.join(REPO_ROOT, 'loader.js'), 'utf8');
const lines = L.split('\n');

function originHost() {
  const popupUrlLine = lines.find((l) => /const POPUP_URL = '([^']+)'/.test(l));
  const m = /const POPUP_URL = '([^']+)'/.exec(popupUrlLine);
  return new URL(m[1]).host;
}

describe('loader.js Origin-Ableitung und Source-Pinning (STAB-06)', () => {
  it('Der Tool-Origin-String steht genau einmal in loader.js – in POPUP_URL', () => {
    const host = originHost();
    const matchingLines = lines.filter((l) => l.includes(host));
    expect(matchingLines.length).toBe(1);
    expect(matchingLines[0]).toContain('const POPUP_URL');
  });

  it('ALLOWED_ORIGIN wird aus POPUP_URL abgeleitet, nicht zweitdefiniert', () => {
    const occurrences = L.split('const ALLOWED_ORIGIN = new URL(POPUP_URL).origin;').length - 1;
    expect(occurrences).toBe(1);
    const defLines = lines.filter((l) => l.trim().startsWith('const ALLOWED_ORIGIN'));
    expect(defLines.length).toBe(1);
  });

  it('Listener pinnt die Quelle: Guard steht zwischen ev.source-Lesen und Pin-Zuweisung', () => {
    const iSrc = lines.findIndex((l) => l.includes('const src = ev.source;'));
    const iGuard = lines.findIndex((l) => l.includes('src !== window.__BCK_popupRef'));
    const iPin = lines.findIndex((l) => l.includes('window.__BCK_popupRef = src;'));
    expect(iSrc).toBeGreaterThanOrEqual(0);
    expect(iGuard).toBeGreaterThanOrEqual(0);
    expect(iPin).toBeGreaterThanOrEqual(0);
    expect(iSrc).toBeLessThan(iGuard);
    expect(iGuard).toBeLessThan(iPin);
    expect(lines[iGuard]).toContain("ev.data.type !== 'PING'");
  });

  it('Origin-Check bleibt erhalten, keine Wildcards', () => {
    const occurrences = L.split('if (ev.origin !== ALLOWED_ORIGIN)').length - 1;
    expect(occurrences).toBe(1);
    const wildcardLines = lines.filter((l) => /,\s*['"]\*['"]\)/.test(l));
    expect(wildcardLines.length).toBe(0);
    const allowedOriginCount = (L.match(/ALLOWED_ORIGIN/g) || []).length;
    expect(allowedOriginCount).toBe(34);
  });
});
