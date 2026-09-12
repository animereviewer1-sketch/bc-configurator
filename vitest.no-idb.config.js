// Meta-Check für TEST-03 — nur für: npx vitest run tests/idb-canary.test.js --config vitest.no-idb.config.js (erwartetes Ergebnis: 1 failed). Nicht für den normalen Testlauf.
import { defineConfig } from 'vitest/config'
import base from './vitest.config.js'

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    setupFiles: []
  }
})
