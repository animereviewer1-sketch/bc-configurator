import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { REPO_ROOT } from './helpers/loadScript.js';

// Versionsnummer in den Einstellungen (version.js, gepflegt von tools/stempel.js): Der Nutzer liest "Build N · Datum · #Kennung" ab und
// kann so sagen, auf welchem Stand er ist. Ändert sich eine geladene Datei, ohne dass `npm run stempel` lief, wird dieser Test rot.

const require = createRequire(import.meta.url);
const st = require('../tools/stempel.js');

function werkstatt() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stempel-'));
  fs.mkdirSync(path.join(dir, 'nova'));
  fs.mkdirSync(path.join(dir, 'tests'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(dir, 'items.js'), 'var a = 1;\n');
  fs.writeFileSync(path.join(dir, 'nova', 'nova.css'), 'a{}');
  return dir;
}

describe('Stempel ist aktuell', () => {
  it('version.js passt zum aktuellen Stand aller geladenen Dateien (sonst: npm run stempel)', () => {
    expect(st.lies(REPO_ROOT), 'version.js fehlt oder ist unlesbar – `npm run stempel`').not.toBeNull();
    expect(st.aktuell(REPO_ROOT), 'geladene Dateien haben sich geändert – `npm run stempel` ausführen und version.js mit committen').toBe(true);
  });
});

describe('Prüfsumme', () => {
  it('ändert sich mit dem Inhalt einer geladenen Datei (auch in nova/)', () => {
    const d = werkstatt();
    const a = st.berechne(d);
    fs.writeFileSync(path.join(d, 'items.js'), 'var a = 2;\n');
    const b = st.berechne(d);
    fs.writeFileSync(path.join(d, 'nova', 'nova.css'), 'b{}');
    const c = st.berechne(d);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('ignoriert version.js, Userscripts, Test-Konfiguration, Tests und Zeilenenden', () => {
    const d = werkstatt();
    const a = st.berechne(d);
    fs.writeFileSync(path.join(d, 'version.js'), 'var BC_VERSION = {};');
    fs.writeFileSync(path.join(d, 'x.user.js'), 'egal');
    fs.writeFileSync(path.join(d, 'vitest.config.js'), 'egal');
    fs.writeFileSync(path.join(d, 'tests', 'a.test.js'), 'egal');
    fs.writeFileSync(path.join(d, 'items.js'), 'var a = 1;\r\n');   // CRLF statt LF
    expect(st.berechne(d)).toBe(a);
  });

  it('eine neue geladene Datei zählt mit', () => {
    const d = werkstatt();
    const a = st.berechne(d);
    fs.writeFileSync(path.join(d, 'neu.js'), 'var n = 1;');
    expect(st.berechne(d)).not.toBe(a);
  });
});

describe('Stempeln', () => {
  it('erster Lauf legt version.js an, ohne Änderung bleibt sie unverändert, nach einer Änderung zählt Build hoch', () => {
    const d = werkstatt();
    const r1 = st.stempeln(d);
    expect(r1.geaendert).toBe(true);
    expect(r1.version.build).toBeGreaterThanOrEqual(1);
    expect(st.aktuell(d)).toBe(true);
    const text1 = fs.readFileSync(path.join(d, 'version.js'), 'utf8');

    const r2 = st.stempeln(d);
    expect(r2.geaendert).toBe(false);
    expect(fs.readFileSync(path.join(d, 'version.js'), 'utf8')).toBe(text1);

    fs.writeFileSync(path.join(d, 'items.js'), 'var a = 3;\n');
    expect(st.aktuell(d)).toBe(false);
    const r3 = st.stempeln(d);
    expect(r3.geaendert).toBe(true);
    expect(r3.version.build).toBe(r1.version.build + 1);
    expect(r3.version.quelle).not.toBe(r1.version.quelle);
    expect(st.lies(d)).toEqual(r3.version);
    expect(st.aktuell(d)).toBe(true);
  });
});

describe('Anzeige im Browser', () => {
  function laufen(quelle, dom = {}) {
    const el = { textContent: '' };
    const gespeichert = [];
    const g = {
      console: { info() {}, log() {}, warn() {} },
      document: { readyState: 'complete', getElementById: (id) => (id === 'setVersion' ? el : null), addEventListener: vi.fn() },
      navigator: { clipboard: { writeText: (t) => gespeichert.push(t) } },
      showStatus: vi.fn(),
      ...dom,
    };
    vm.createContext(g);
    vm.runInContext(quelle, g);
    return { el, g, gespeichert };
  }
  const quelleVersion = () => fs.readFileSync(path.join(REPO_ROOT, 'version.js'), 'utf8');

  it('schreibt "Version Build N · TT.MM.JJJJ HH:MM · #Kennung" in #setVersion', () => {
    const { el } = laufen(quelleVersion());
    const v = st.lies(REPO_ROOT);
    const s = v.stand;
    expect(el.textContent).toBe('Version Build ' + v.build + ' · ' + s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) + ' ' + s.slice(11) + ' · #' + v.quelle);
    expect(el.textContent).toMatch(/^Version Build \d+ · \d{2}\.\d{2}\.\d{4} \d{2}:\d{2} · #[0-9a-f]{8}$/);
  });

  it('Klick kopiert denselben Text in die Zwischenablage', () => {
    const { el, g, gespeichert } = laufen(quelleVersion());
    vm.runInContext('bcVersionKopieren()', g);
    expect(gespeichert).toEqual([el.textContent]);
  });

  it('wartet auf das fertige Dokument, wenn es noch lädt', () => {
    const { el, g } = laufen(quelleVersion(), { document: { readyState: 'loading', getElementById: () => null, addEventListener: vi.fn() } });
    expect(el.textContent).toBe('');
    expect(g.document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
  });

  it('ohne Zwischenablage oder ohne Element: kein Absturz', () => {
    expect(() => laufen(quelleVersion(), { navigator: {}, document: { readyState: 'complete', getElementById: () => null, addEventListener() {} } })).not.toThrow();
    const { g } = laufen(quelleVersion(), { navigator: {} });
    expect(() => vm.runInContext('bcVersionKopieren()', g)).not.toThrow();
  });
});

describe('Einbindung in index.html', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

  it('version.js wird vor den übrigen Skripten geladen', () => {
    const v = html.indexOf('src="version.js?_=');
    expect(v).toBeGreaterThan(-1);
    expect(v).toBeLessThan(html.indexOf('src="persistence.js?_='));
    expect(v).toBeLessThan(html.indexOf('src="items.js?_='));
  });

  it('die Nummer steht im Kopf des Einstellungs-Panels', () => {
    const panel = html.indexOf('id="tweaksPanel"');
    const kopf = html.indexOf('class="set-tabs"', panel);
    const el = html.indexOf('id="setVersion"');
    expect(el).toBeGreaterThan(panel);
    expect(el).toBeLessThan(kopf);
  });
});
