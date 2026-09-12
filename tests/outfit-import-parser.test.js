import { describe, it, expect, beforeAll } from 'vitest';
import LZString from 'lz-string';
import { loadScript } from './helpers/loadScript.js';

let ctx;
let ctxNoLz;

// Nur parsen, NIE aufrufen — der generierte Code enthält AssetGet/Player-
// Zugriffe, die ausschließlich im BC-Spiel-Tab existieren.
function parses(code) {
  expect(() => new Function(code)).not.toThrow();
}

beforeAll(() => {
  ctx = loadScript(['items.js', 'outfit-import.js'], { LZString });
  ctxNoLz = loadScript(['items.js', 'outfit-import.js']);
});

const ARR = [{ Group: 'Cloth', Name: 'Dress', Color: '#ff0000' }, { Group: 'Hat', Name: 'Beret' }];
const B64 = LZString.compressToBase64(JSON.stringify(ARR));
const URI_MIXED = LZString.compressToEncodedURIComponent(JSON.stringify(ARR));

const ARR_URI = [{ Group: 'Hat', Name: 'Dress', Color: '#000000' }];
const URI_DASH = LZString.compressToEncodedURIComponent(JSON.stringify(ARR_URI));

const RAW_JS = 'ServerPlayerInventoryLoad([])';
const GARBAGE = 'A'.repeat(40);
const STR_B64 = LZString.compressToBase64('ChatRoomSendLocal("hi")');

describe('_oiDetectType (TEST-05)', () => {
  it('erkennt echte compressToBase64-Ausgabe als lzbase64', () => {
    expect(ctx._oiDetectType(B64)).toBe('lzbase64');
    expect(ctx._oiDetectType('  ' + B64 + '\n')).toBe('lzbase64');
  });

  it('Leerstring, Whitespace, 19-Zeichen-Strings und roher JS-Code sind js', () => {
    expect(ctx._oiDetectType('')).toBe('js');
    expect(ctx._oiDetectType('   ')).toBe('js');
    expect(ctx._oiDetectType('A'.repeat(19))).toBe('js');
    expect(ctx._oiDetectType(RAW_JS)).toBe('js');
    expect(ctx._oiDetectType('Player.Name')).toBe('js');
  });

  it('Grenze: 20 Base64-Zeichen sind lzbase64, Bindestrich-Alphabet ist lzuri, Dollar ist js', () => {
    expect(ctx._oiDetectType('A'.repeat(20))).toBe('lzbase64');
    expect(ctx._oiDetectType('A'.repeat(19) + '-')).toBe('lzuri');
    expect(ctx._oiDetectType(URI_DASH)).toBe('lzuri');
    expect(ctx._oiDetectType('A'.repeat(19) + '$')).toBe('js');
  });

  it.fails('erkennt compressToEncodedURIComponent-Ausgaben mit + und - als LZ-Code — bekannte Lücke (URI-Alphabet ist + - $, nicht - _ . ~); Fix nicht in Phase 1', () => {
    // Dokumentierter Befund Phase 1 (Planer-Probe 2026-09-12); outfit-import.js
    // bleibt in Phase 1 unverändert; Kandidat für Phase 2 oder Quick-Task.
    expect(ctx._oiDetectType(URI_MIXED)).not.toBe('js');
  });
});

describe('_oiBuildExecCode (TEST-05)', () => {
  it('gültiger lzbase64-Code erzeugt den Apply-Pfad mit dekodiertem Array', () => {
    const out = ctx._oiBuildExecCode(B64);
    expect(out).toContain('var _raw=' + JSON.stringify(ARR));
    expect(out).toContain('AssetGet(');
    parses(out);
    const outPadded = ctx._oiBuildExecCode('  ' + B64 + '  ');
    expect(outPadded).toBe(out);
  });

  it('roher JS-Code wird nur in den try/catch-Wrapper gehüllt', () => {
    const out = ctx._oiBuildExecCode(RAW_JS);
    expect(out).toContain(RAW_JS);
    expect(out).not.toContain('var _raw=');
    expect(out).toMatch(/^\(function\(\)\{ try \{/);
    parses(out);
  });

  it('ungültige Base64-ähnliche Eingabe erreicht nie den Apply-Pfad', () => {
    const out = ctx._oiBuildExecCode(GARBAGE);
    expect(out).toContain(GARBAGE);
    expect(out).not.toContain('var _raw=');
    parses(out);
  });

  it('komprimierter Nicht-JSON-Inhalt fällt auf den Roh-Wrapper zurück', () => {
    const out = ctx._oiBuildExecCode(STR_B64);
    expect(out).not.toContain('var _raw=');
    expect(out).toContain(STR_B64);
    parses(out);
  });

  it('ohne LZString-Global bleibt auch gültiger lzbase64-Code roh (typeof-Guard)', () => {
    const out = ctxNoLz._oiBuildExecCode(B64);
    expect(out).not.toContain('var _raw=');
    expect(out).toContain(B64);
    parses(out);
  });

  it('komprimierter JSON-String-Literal landet als Code im Wrapper', () => {
    const s = LZString.compressToBase64('"ChatRoomSendLocal(1)"');
    const out = ctx._oiBuildExecCode(s);
    expect(out).toContain('"ChatRoomSendLocal(1)"');
    expect(out).not.toContain('var _raw=');
    parses(out);
  });

  it.fails('lzuri-Code (nur Bindestrich) wird über den URI-Decoder entpackt — bekannte Lücke (Base64-Decoder liefert truncated Garbage, URI-Decoder wird nie versucht); Fix nicht in Phase 1', () => {
    // Dokumentierter Befund Phase 1 (Planer-Probe 2026-09-12); outfit-import.js
    // bleibt in Phase 1 unverändert; Kandidat für Phase 2 oder Quick-Task.
    expect(ctx._oiBuildExecCode(URI_DASH)).toContain('var _raw=' + JSON.stringify(ARR_URI));
  });
});
