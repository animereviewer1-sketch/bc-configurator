import { describe, it, expect } from 'vitest'

describe('IDB canary (TEST-03)', () => {
  it('fake-indexeddb ist aktiv — kein stiller localStorage-Fallback', () => {
    expect(
      typeof globalThis.indexedDB?.open,
      'CANARY: globalThis.indexedDB fehlt — fake-indexeddb/auto nicht geladen (test.setupFiles in vitest.config.js prüfen). idbGet/idbSet in items.js verschlucken jeden Fehler und liefern still null/false — ohne diesen Canary bliebe das unsichtbar.'
    ).toBe('function')
  })
})
