// GENERIERT von tools/build-baseline.js (npm run baseline) — nicht von Hand editieren.
// Quelldateien: bot-engine.js, items.js, bot-ui.js, bot-data.js, loader.js — Inhalt identisch mit baseline-manifest.json (SCAN-09).
const BASELINE_MANIFEST = {
  "schema": 1,
  "sourceFiles": [
    "bot-engine.js",
    "items.js",
    "bot-ui.js",
    "bot-data.js",
    "loader.js"
  ],
  "identifierPattern": "\\b(Inventory|Character|ChatRoom|Server|Asset|Player|Dialog|Common|Item|Lock|Wardrobe|Pose|Skill|Reputation|Online|Chat)[A-Z]\\w+",
  "counts": {
    "identifiers": 83,
    "function": 19,
    "assetGroup": 33,
    "unknown": 31
  },
  "identifiers": [
    {
      "name": "AssetFamily",
      "kind": "unknown",
      "files": [
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "AssetFemale3DCGExtended",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "AssetGet",
      "kind": "function",
      "files": [
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "AssetGroup",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "AssetMale3DCGExtended",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "AssetName",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "AssetTextGet",
      "kind": "function",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "CharacterAppearanceBundle",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "CharacterAppearanceSetFromBundle",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "CharacterLoadCanvas",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "CharacterRefresh",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "CharacterRefreshSource",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "CharacterUpdate",
      "kind": "unknown",
      "files": [
        "bot-engine.js"
      ]
    },
    {
      "name": "ChatMessagePrefix",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatRoom",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomCharacter",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomCharacterItemUpdate",
      "kind": "unknown",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "ChatRoomCharacterUpdate",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomChat",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomData",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomMapViewChangeKey",
      "kind": "unknown",
      "files": [
        "bot-engine.js"
      ]
    },
    {
      "name": "ChatRoomMapViewTeleport",
      "kind": "function",
      "files": [
        "bot-engine.js"
      ]
    },
    {
      "name": "ChatRoomMessage",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomMessageHandlers",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomPlayerIsAdmin",
      "kind": "function",
      "files": [
        "bot-engine.js"
      ]
    },
    {
      "name": "ChatRoomRegisterMessageHandler",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomSendChat",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js"
      ]
    },
    {
      "name": "ChatRoomSync",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatRoomSyncMemberJoin",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatSetting",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ChatTags",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "DialogPrefix",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "DialogSortOverride",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "InventoryGet",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js"
      ]
    },
    {
      "name": "InventoryID",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "InventoryItem",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "InventoryLock",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js"
      ]
    },
    {
      "name": "InventoryRemove",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js"
      ]
    },
    {
      "name": "InventoryWear",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemAddon",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemArms",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemBoots",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemBreast",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js"
      ]
    },
    {
      "name": "ItemButt",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemDevices",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemEars",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemEyes",
      "kind": "assetGroup",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ItemFeet",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemHandheld",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemHands",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemHead",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemHidden",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js"
      ]
    },
    {
      "name": "ItemHood",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemLegs",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemMisc",
      "kind": "assetGroup",
      "files": [
        "bot-engine.js",
        "bot-ui.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemMouth",
      "kind": "assetGroup",
      "files": [
        "bot-data.js",
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemMouth2",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemMouth3",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js"
      ]
    },
    {
      "name": "ItemMouthAccessory",
      "kind": "assetGroup",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ItemName",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "bot-ui.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNeck",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNeckAccessories",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNeckRestraints",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNipples",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNipplesPiercings",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemNose",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemPelvis",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemPelvisModularChastityBeltOption",
      "kind": "assetGroup",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ItemRemove",
      "kind": "assetGroup",
      "files": [
        "bot-engine.js"
      ]
    },
    {
      "name": "ItemTorso",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemTorso2",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemVulva",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "ItemVulvaPiercings",
      "kind": "assetGroup",
      "files": [
        "bot-ui.js",
        "loader.js"
      ]
    },
    {
      "name": "LockMemberNumber",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "LockPickSeed",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "LockSet",
      "kind": "unknown",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "OnlineSharedSettings",
      "kind": "unknown",
      "files": [
        "loader.js"
      ]
    },
    {
      "name": "ServerAppearanceLoadFromBundle",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "ServerPlayerAppearanceSync",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "ServerPlayerInventoryLoad",
      "kind": "function",
      "files": [
        "items.js"
      ]
    },
    {
      "name": "ServerSend",
      "kind": "function",
      "files": [
        "bot-engine.js",
        "items.js",
        "loader.js"
      ]
    },
    {
      "name": "ServerSocket",
      "kind": "unknown",
      "files": [
        "bot-engine.js",
        "loader.js"
      ]
    },
    {
      "name": "ServerSync",
      "kind": "unknown",
      "files": [
        "items.js"
      ]
    }
  ],
  "chatHooks": [
    "ChatRoomRegisterMessageHandler"
  ],
  "modProbes": [
    "bcx",
    "lscg",
    "mbs",
    "themed",
    "wce"
  ]
};
