import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { loadScript, evalIn, makeElementStub } from './helpers/loadScript.js';

// Profil-Code mit gesperrten Items: BCs InventoryLock(C, Item, Lock, By, Update=true) ruft
// CharacterRefresh(C, true, false) auf – für den eigenen Charakter ein AccountUpdate (bei WCE samt
// WCEOverrides) PRO gesperrtem Item. Der Auto-Screenshot-Durchlauf der Profile löste so Salven von
// 5–16 Pushes in einer Millisekunde aus und damit "ErrorRateLimited" (Sende-Monitor, Bericht 01:10).
// Der erzeugte Code sperrt jetzt mit Update=false, setzt den Timer des Schlosses selbst (das tut BC
// bei Update=true zusätzlich) und pusht gesammelt am Ende.

const GRUPPEN = Array.from({ length: 15 }, (_, i) => 'ItemG' + i);

function profilCode(items) {
  const el = makeElementStub();
  const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
  ctx.document.getElementById = (id) => (id === 'outfitCode' ? el : makeElementStub());
  ctx.__items = items;
  evalIn(ctx, 'OUTFIT = __items; _outfitTargetNum = null;');
  evalIn(ctx, 'generateOutfitCode()');
  return el.value;
}

function gesperrteItems(extra = []) {
  return [
    ...GRUPPEN.map((g, i) => ({ group: g, asset: 'Asset' + i, colors: ['#ffffff'], lock: 'MetalPadlock', lockParams: {} })),
    ...extra,
  ];
}

// Minimal nachgebautes BC: zählt, was zum Server ginge
function spiel() {
  const z = { pushes: 0, syncs: 0, charUpdates: 0, timer: [], lockCalls: [] };
  const queue = [];
  const Player = { MemberNumber: 1, Appearance: [] };
  const sandbox = {
    Player,
    ChatRoomCharacter: [],
    console: { log() {}, error() {}, warn() {} },
    atob: globalThis.atob,
    setTimeout: (fn) => { queue.push(fn); return queue.length; },
    Asset: [
      { Name: 'MetalPadlock', Group: { Name: 'ItemMisc' }, RemoveTimer: 0 },
      { Name: 'TimerPadlock', Group: { Name: 'ItemMisc' }, RemoveTimer: 300000 },
    ],
    ExtendedItemInit() {},
    CharacterRefreshSource() {},
    InventoryGet: (C, g) => C.Appearance.find((i) => i.Asset.Group.Name === g) || null,
    // BC: Refresh=true ist die Voreinstellung und pusht für den Spieler
    InventoryWear(C, name, grp, col, diff, mem, craft, refresh = true) {
      C.Appearance = C.Appearance.filter((i) => i.Asset.Group.Name !== grp);
      const it = { Asset: { Name: name, Group: { Name: grp }, AllowNone: true }, Color: col, Property: {} };
      C.Appearance.push(it);
      if (refresh) sandbox.CharacterRefresh(C, true);
      return it;
    },
    // BC: Update=true setzt den Schloss-Timer und refresht mit Push
    InventoryLock(C, item, lock, by, update = true) {
      z.lockCalls.push(update);
      item.Property.LockedBy = lock.Asset.Name;
      if (update) {
        if (lock.Asset.RemoveTimer > 0) sandbox.TimerInventoryRemoveSet(C, item.Asset.Group.Name, lock.Asset.RemoveTimer);
        sandbox.CharacterRefresh(C, true, false);
      }
    },
    TimerInventoryRemoveSet(C, g, t) { z.timer.push([g, t]); },
    CharacterRefresh(C, push = true) { if (C === Player && push) z.pushes++; },
    ServerPlayerAppearanceSync() { z.syncs++; },
    ChatRoomCharacterUpdate() { z.charUpdates++; },
  };
  const ctx = vm.createContext(sandbox);
  return {
    z, Player,
    lauf(code) { vm.runInContext('(function(){' + code + '\n})()', ctx); },
    zeitenAblaufen() { while (queue.length) queue.shift()(); },
  };
}

describe('Profil-Code: gesperrte Items pushen nicht einzeln', () => {
  it('15 gesperrte Items: vor dem verzögerten Sync kein einziger Push, danach genau ein Sync', () => {
    const code = profilCode(gesperrteItems());
    const s = spiel();
    s.lauf(code);
    expect(s.Player.Appearance.length).toBe(15);
    expect(s.Player.Appearance.every((i) => i.Property.LockedBy === 'MetalPadlock')).toBe(true);
    expect(s.z.pushes).toBe(0);
    expect(s.z.lockCalls).toEqual(Array(15).fill(false));
    s.zeitenAblaufen();
    expect(s.z.syncs).toBe(1);
    expect(s.z.charUpdates).toBe(1);
  });

  it('Timer-Schloss: den Timer setzt der Code selbst (wie BC bei Update=true), genau einmal pro Schloss', () => {
    const code = profilCode(gesperrteItems([
      { group: 'ItemTimer', asset: 'AssetT', colors: ['#ffffff'], lock: 'TimerPadlock', lockParams: {} },
    ]));
    const s = spiel();
    s.lauf(code);
    expect(s.z.timer).toEqual([['ItemTimer', 300000]]);
    expect(s.z.pushes).toBe(0);
  });

  it('Kontrolle: mit Update=true (altes Verhalten) zählt der Aufbau 15 Pushes', () => {
    const alt = profilCode(gesperrteItems()).replace(/(InventoryLock\([^\n;]*,\s*)false(\s*\))/g, '$1true$2');
    const s = spiel();
    s.lauf(alt);
    expect(s.z.pushes).toBe(15);
  });

  it('der Code ist gültiges JavaScript', () => {
    expect(() => new Function(profilCode(gesperrteItems()))).not.toThrow();
  });
});

describe('Screenshot-Durchlauf: Absicherung gegen Push durch Schlösser', () => {
  const fn = (code) => {
    const ctx = loadScript(['items.js'], { setTimeout: () => 0, clearTimeout: () => {} });
    ctx.__c = code;
    return evalIn(ctx, '_screenshotCodeOhnePush(__c)');
  };

  it('InventoryLock(…, true) wird zu false – in beiden Schreibweisen des Generators', () => {
    const roh = 'InventoryLock(TARGET,_li,{Asset:_la},Player.MemberNumber,true);\n'
      + 'InventoryLock(TARGET, item, { Asset: lockAsset }, Player.MemberNumber, true);';
    const neu = fn(roh);
    expect(neu).toBe('InventoryLock(TARGET,_li,{Asset:_la},Player.MemberNumber,false);\n'
      + 'InventoryLock(TARGET, item, { Asset: lockAsset }, Player.MemberNumber, false);');
  });

  it('andere Aufrufe mit true und bereits abgeschaltete Schlösser bleiben unberührt', () => {
    const roh = 'foo(true);\nInventoryLock(C,w,{Asset:x},1,false);\nExtendedItemInit(TARGET,it,true,true);';
    expect(fn(roh)).toBe(roh);
  });
});
