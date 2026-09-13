// vm-Sandbox-Loader für die unveränderten Produktionsdateien (TEST-02).
// `setInterval` ist ein No-op, weil items.js beim Laden unbedingte Intervalle
// registriert (~Zeile 4325/5838) — ein echtes Timer würde den Testprozess
// am Leben halten. `document.getElementById` liefert ein Element-Stub statt
// `null`, weil die Auto-Init-IIFE in items.js (~Zeile 6711) sofort
// `renderGroups()` aufruft, das `.classList` auf dem Rückgabewert
// dereferenziert. Top-Level-`let`/`const` der geladenen Dateien (`_bots`,
// `_botVars`, `_playerKeys`) werden KEINE Sandbox-Properties — dafür gibt es
// `evalIn`, das denselben vm-Kontext erneut ausführt.
//
// Das Sandbox-`addEventListener` sammelt registrierte Handler in `_listeners`
// (Map: Typ → Array von Funktionen) statt sie zu verwerfen (Phase 3, TEST-07).
// `dispatch`/`dispatchMessage` rufen sie mit einem synthetischen Event auf.
// Ein `location`-Stub (Default-Origin `SANDBOX_ORIGIN`, per `extraGlobals`
// überschreibbar) steht bereit, weil Plan 03-02 `window.location.origin` in
// items.js einführt.

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const SANDBOX_ORIGIN = 'https://tool.test';

export function makeElementStub() {
  const stub = {
    classList: {
      add() {}, remove() {},
      toggle() { return false; },
      contains() { return false; },
    },
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    innerText: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    className: '',
    id: '',
    title: '',
    children: [],
    childNodes: [],
    options: [],
    appendChild(c) { return c; },
    removeChild(c) { return c; },
    insertBefore(c) { return c; },
    remove() {},
    replaceChildren() {},
    append() {},
    prepend() {},
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    click() {},
    select() {},
    scrollIntoView() {},
    getAttribute() { return null; },
    hasAttribute() { return false; },
    contains() { return false; },
    matches() { return false; },
    dispatchEvent() { return true; },
    querySelector() { return null; },
    closest() { return null; },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    getElementsByTagName() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }; },
    parentElement: null,
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    offsetWidth: 0,
    offsetHeight: 0,
    scrollTop: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0,
  };
  return stub;
}

export function makeSandbox(extraGlobals = {}) {
  const localStorageStore = new Map();
  const localStorage = {
    getItem(k) { return localStorageStore.has(k) ? localStorageStore.get(k) : null; },
    setItem(k, v) { localStorageStore.set(k, String(v)); },
    removeItem(k) { localStorageStore.delete(k); },
    clear() { localStorageStore.clear(); },
    key(i) { return Array.from(localStorageStore.keys())[i] ?? null; },
    get length() { return localStorageStore.size; },
  };

  const document = {
    getElementById() { return makeElementStub(); },
    querySelector() { return makeElementStub(); },
    createElement() { return makeElementStub(); },
    querySelectorAll() { return []; },
    createTextNode() { return {}; },
    addEventListener() {},
    removeEventListener() {},
    body: makeElementStub(),
    head: makeElementStub(),
    documentElement: makeElementStub(),
    readyState: 'complete',
    title: '',
    hidden: false,
    activeElement: null,
  };

  const listeners = new Map();

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    btoa,
    atob,
    localStorage,
    document,
    location: {
      origin: SANDBOX_ORIGIN,
      href: SANDBOX_ORIGIN + '/bc-configurator/',
      protocol: 'https:',
      host: 'tool.test',
      hostname: 'tool.test',
      pathname: '/bc-configurator/',
      search: '',
      hash: '',
    },
    _listeners: listeners,
    addEventListener(type, fn) {
      if (typeof fn !== 'function') return;
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = listeners.get(type);
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    },
    indexedDB: globalThis.indexedDB,
    _money: undefined,
    _rankData: undefined,
    _shop: undefined,
    ...extraGlobals,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

export function loadInto(sandbox, file) {
  const code = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox;
}

export function loadScript(files, extraGlobals = {}) {
  if (!Array.isArray(files)) {
    throw new TypeError('loadScript: files must be an array of repo-relative paths');
  }
  const sandbox = makeSandbox(extraGlobals);
  for (const file of files) {
    loadInto(sandbox, file);
  }
  return sandbox;
}

export function evalIn(sandbox, code) {
  return vm.runInContext(code, sandbox);
}

export function dispatch(sandbox, type, event) {
  const handlers = sandbox._listeners.get(type);
  if (!handlers || handlers.length === 0) return 0;
  let called = 0;
  for (const fn of handlers.slice()) {
    fn.call(sandbox, event);
    called++;
  }
  return called;
}

export function dispatchMessage(sandbox, data, opts = {}) {
  return dispatch(sandbox, 'message', { data, origin: opts.origin, source: opts.source });
}

export function settle(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
