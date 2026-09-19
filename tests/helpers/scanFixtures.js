// Gemeinsame Fixtures für tests/scan-tab.test.js und tests/analyze-snapshot.test.js
// (06-03): ein synthetisches Inventar (`inv`) und ein synthetisches
// Baseline-Manifest (`SYN_MANIFEST`), damit beide Testdateien dieselben
// Erwartungen gegen `_scanFlatten`/`_scanBaselineSets`/`_scanBadge`/
// `_scanCountBadges` aus scan-tab.js prüfen (eine Quelle der Wahrheit für
// die Fixture-Zahlen, siehe 06-03-PLAN.md Task 1).

export function inv(extra = {}) {
  return {
    schema: 1,
    gameVersion: 'R131',
    globals: {
      total: 4,
      getters: ['PlayerG1'],
      functions: [
        { name: 'ChatRoomSendChat', arity: 1 },
        { name: 'CharacterNickname', arity: 1 },
      ],
      values: [{ name: 'ChatRoomData', type: 'object' }],
      byPrefix: {},
      inventory: { groups: [], other: { count: 0, names: [] } },
    },
    assets: {
      count: 3,
      groupCount: 2,
      groups: [
        { Name: 'ItemNeck', assetCount: 1 },
        { Name: 'ItemUnknownGrp', assetCount: 1 },
      ],
      items: [
        { Name: 'Collar', Group: 'ItemNeck' },
        { Name: 'Ballgag', Group: 'ItemMouth' },
        { Name: 'Weird', Group: 'ItemUnknownGrp' },
      ],
    },
    modSdk: {
      available: true,
      version: '1.2.0',
      modCount: 2,
      patchingCount: 2,
      patching: [
        { name: 'ServerSend', hookedByMods: ['BCX'], patchedByMods: [] },
        { name: 'DrawImage', hookedByMods: ['LSCG', 'MBS'], patchedByMods: [] },
      ],
    },
    mods: [
      { name: 'BCX', fullName: 'Bondage Club Extended', version: '1', repository: 'r' },
      { name: '<img src=x onerror=alert(1)>', fullName: 'Böse', version: '0', repository: 'r' },
    ],
    probes: {
      wce: { present: true, version: '6', functions: ['fbcVersion'] },
      bcx: { present: false, loaded: null, version: null, api: [] },
      mbs: { present: true, version: '2', apiVersion: 1, api: ['getActive'] },
      lscg: { present: false, loaded: null, api: [], screenFunctions: { count: 0, sample: [] } },
      themed: { present: false, loaded: null, screenFunctionCount: 0, sample: [] },
      sweep: ['FUSAM'],
    },
    chatHooks: {
      ChatRoomRegisterMessageHandler: { exists: true, arity: 1, kind: 'function' },
      registry: { introspectable: true, source: 'ChatRoomMessageHandlers', count: 1, handlers: [{ Description: 'BCX handler', Priority: 100 }] },
      hookedChatFunctions: [{ name: 'ChatRoomMessage', hookedByMods: ['BCX'] }],
    },
    errors: [],
    ...extra,
  };
}

export const SYN_MANIFEST = {
  schema: 1,
  identifiers: [
    { name: 'ChatRoomSendChat', kind: 'function', files: [] },
    { name: 'ItemNeck', kind: 'assetGroup', files: [] },
    { name: 'ServerSend', kind: 'function', files: [] },
  ],
  chatHooks: ['ChatRoomRegisterMessageHandler'],
  modProbes: ['wce'],
};

// Anzahl der von _scanFlatten(inv()) erzeugten Zeilen (Task-2-Vertrag):
// globals 4 (1 getter + 2 functions + 1 value) + assets 3 + groups 2 +
// hooks 3 (1 api + 1 handler + 1 hooked) + mods 2 + patching 2 +
// probes 8 (5 Probe-Zeilen + 2 Probe-API-Namen [wce.fbcVersion, mbs.getActive] + 1 sweep) = 24
export const EXPECTED_ROWS = 24;
