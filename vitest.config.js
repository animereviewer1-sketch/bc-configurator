import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup/fake-indexeddb.js'],
    // Die Sandboxen (items.js/game-scan.js/persistence.js) loggen asynchron nach
    // Testende (IDB-Bootstrap, Migration). Über den Worker-RPC abgefangen kollidiert
    // das mit dem Teardown ("Closing rpc while onUserConsoleLog was pending") und
    // liefert Exit 1 trotz grüner Tests. Direkt auf stdout schreiben umgeht den RPC.
    disableConsoleIntercept: true
  }
})
