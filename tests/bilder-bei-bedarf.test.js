import { describe, it, expect, vi } from 'vitest';
import { loadScript, evalIn, settle, makeElementStub } from './helpers/loadScript.js';

// Bilder nur bei Bedarf: Beim Start liest das Tool nur die Schlüssel der Bilder. Die Bilder selbst kommen einzeln (sichtbar / gebraucht) oder
// gesammelt (Sicherung, Export, Serien, "Alle löschen"). Kernregel dieser Datei: "nicht im Speicher" heißt NICHT "kein Bild" –
// ein Bild, das nur noch nicht geladen ist, wird nie ersetzt, nie übersehen und nie ungewollt gelöscht. Die Datenbank bleibt dabei unberührt.

const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const id = (p) => p + Math.random().toString(36).slice(2, 8);
const J = JSON.stringify;

async function boot({ confirm = () => true, extra = {} } = {}) {
  const ctx = loadScript(['items.js'], { console: quiet, confirm: (m) => confirm(String(m)), bilderEcht: true, ...extra });
  ctx.showStatus = vi.fn();
  evalIn(ctx, 'showStatus = globalThis.showStatus;');
  await ctx._screenshotStoreReady();
  await settle(60);
  return ctx;
}
// Bilder in die Datenbank legen, ohne dass ein späterer Start sie im Speicher hat
async function saeen(kind, paare) {
  const c = await boot();
  await c.idbScreenshotBatch(kind, paare, []);
}
const dbBild = async (ctx, kind, key) => (await ctx.idbScreenshotGetAll(kind))[key];
const imSpeicher = (ctx, map, key) => evalIn(ctx, `${map}[${J(key)}]`);

describe('Start: nur Schlüssel, keine Bilder', () => {
  it('nach dem Start sind die Schlüssel bekannt (_hatBild), die Bilder aber nicht im Speicher', async () => {
    const k = id('start');
    await saeen('profile', [[k, 'data:p']]);
    await saeen('lscg', [[k + '|F', 'data:l']]);
    await saeen('wheel', [['Cloth:' + k, 'data:w']]);
    const ctx = await boot();
    expect(evalIn(ctx, `_hatBild('profile', ${J(k)})`)).toBe(true);
    expect(evalIn(ctx, `_hatBild('lscg', ${J(k + '|F')})`)).toBe(true);
    expect(evalIn(ctx, `_hatBild('wheel', ${J('Cloth:' + k)})`)).toBe(true);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k)).toBeUndefined();
    expect(imSpeicher(ctx, 'LSCG_SCREENSHOTS', k + '|F')).toBeUndefined();
    expect(imSpeicher(ctx, '_mbsWheelShots', 'Cloth:' + k)).toBeUndefined();
    expect(evalIn(ctx, '[_bildFertig.profile, _bildFertig.lscg, _bildFertig.wheel]')).toEqual([false, false, false]);
    expect(evalIn(ctx, '_bildExistenzSicher("profile") && _bildExistenzSicher("lscg") && _bildExistenzSicher("wheel")')).toBe(true);
  });

  it('_bildAnzahl zählt geladene und noch nicht geladene Bilder zusammen (Zähler in der Oberfläche)', async () => {
    const k = id('zahl');
    await saeen('profile', [[k + 'a', 'data:a'], [k + 'b', 'data:b']]);
    const ctx = await boot();
    const vorher = evalIn(ctx, '_bildAnzahl("profile")');
    evalIn(ctx, `PROFILE_SCREENSHOTS[${J(k + 'neu')}] = 'data:n'`);
    expect(evalIn(ctx, '_bildAnzahl("profile")')).toBe(vorher + 1);
    await ctx._bildHolen('profile', [k + 'a']);                       // wird geladen → zählt nicht doppelt
    expect(evalIn(ctx, '_bildAnzahl("profile")')).toBe(vorher + 1);
  });

  it('bilderVollLaden holt das ganze Archiv; danach gibt es keine Schlüsselmenge mehr', async () => {
    const k = id('voll');
    await saeen('profile', [[k + 'a', 'data:a'], [k + 'b', 'data:b']]);
    const ctx = await boot();
    expect(await ctx.bilderVollLaden(['profile'])).toBe(true);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'a')).toBe('data:a');
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'b')).toBe('data:b');
    expect(evalIn(ctx, '_bildFertig.profile')).toBe(true);
    expect(evalIn(ctx, '_bildKeys.profile')).toBeNull();
    expect(evalIn(ctx, '_bildFertig.lscg')).toBe(false);              // nur die verlangte Art
  });

  it('lassen sich die Schlüssel nicht lesen, wird wie früher alles geladen (sonst wüsste das Tool nie, welche Bilder es gibt)', async () => {
    const k = id('rueckfall');
    await saeen('profile', [[k, 'data:p']]);
    const ctx = await boot();
    evalIn(ctx, '_bildKeys.profile = null; _bildVoll.profile = null; idbScreenshotKeysOf = async () => null;');
    await evalIn(ctx, "_bildStart('profile', null, null)");
    expect(await evalIn(ctx, '_bildVoll.profile')).toBe(true);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k)).toBe('data:p');
  });
});

describe('Ein Bild, das nur noch nicht geladen ist, wird nie ersetzt', () => {
  it('Outfit-Bild wird in Profile ohne Bild kopiert – ein Profil MIT (nicht geladenem) Bild behält seins', async () => {
    const mit = id('mit'), ohne = id('ohne'), mk = id('mk'), fp = id('fp');
    await saeen('profile', [[mit, 'data:alt-profilbild']]);
    const ctx = await boot();
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] };
      _lscgFpMap[${J(fp)}] = [${J(mit)}, ${J(ohne)}];
      LSCG_SCREENSHOTS[${J(mk + '|' + fp)}] = 'data:lscg-neu';`);
    ctx._syncLscgScreenshotToProfiles(mk, fp);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', ohne)).toBe('data:lscg-neu');   // ohne Bild: Kopie
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', mit)).toBeUndefined();           // mit Bild: unberührt
    await ctx._saveProfileScreenshotsJetzt();
    expect(await dbBild(ctx, 'profile', mit)).toBe('data:alt-profilbild');
    expect(await dbBild(ctx, 'profile', ohne)).toBe('data:lscg-neu');
  });

  it('Backup-Import (_bildEinspieler) ergänzt nur: ein vorhandenes, nicht geladenes Bild bleibt, ein neues kommt dazu', async () => {
    const alt = id('alt'), neu = id('neu');
    await saeen('wheel', [[alt, 'data:in-der-db']]);
    const ctx = await boot();
    const e = evalIn(ctx, '_bildEinspieler()');
    await e.add('mbsWheelShots', alt, 'data:aus-der-datei');
    await e.add('mbsWheelShots', neu, 'data:neu-aus-der-datei');
    expect(e.neu.wheel).toBe(1);
    await e.flush();
    expect(await dbBild(ctx, 'wheel', alt)).toBe('data:in-der-db');
    expect(await dbBild(ctx, 'wheel', neu)).toBe('data:neu-aus-der-datei');
  });

  it('Wheel-Import (Datei): vorhandene Bilder – auch nicht geladene – bleiben, neue kommen dazu', async () => {
    const alt = id('wi'), neu = id('wn');
    await saeen('wheel', [[alt, 'data:in-der-db']]);
    const eingabe = {};
    const ctx = await boot({ extra: { FileReader: class { readAsText(f) { this.onload({ target: { result: f.inhalt } }); } } } });
    const echt = ctx.document.createElement;
    ctx.document.createElement = (tag) => {
      if (tag === 'input') { const i = makeElementStub(); i.click = () => { eingabe.input = i; }; return i; }
      return echt(tag);
    };
    evalIn(ctx, '_renderMbsWheelTab = function () {}; _saveMbsWheelData = function () {}; _updateWheelTabBadge = function () {};');
    ctx.mbsWheelImportDB();
    eingabe.input.onchange({ target: { files: [{ inhalt: J({ type: 'BCU_WHEEL_DB', data: [], shots: { [alt]: 'data:aus-der-datei', [neu]: 'data:neu' } }) }] } });
    expect(imSpeicher(ctx, '_mbsWheelShots', alt)).toBeUndefined();
    expect(imSpeicher(ctx, '_mbsWheelShots', neu)).toBe('data:neu');
    await ctx._saveMbsWheelShotsJetzt();
    expect(await dbBild(ctx, 'wheel', alt)).toBe('data:in-der-db');
    expect(await dbBild(ctx, 'wheel', neu)).toBe('data:neu');
  });

  it('Profil ausführen macht nur dann ein Auto-Bild, wenn es sicher keins gibt – nicht bei einem nicht geladenen', async () => {
    const mitBild = id('hat'), ohneBild = id('keins');
    await saeen('profile', [[mitBild, 'data:vorhanden']]);
    const ctx = await boot({ extra: { setTimeout: (fn) => { fn(); return 0; } } });
    const aufnahmen = [];
    ctx.__auf = aufnahmen;
    evalIn(ctx, `_connected = true; loadProfile = function () {}; OUTFIT = [];
      captureProfileScreenshot = function (n) { __auf.push(n); };
      Object.assign(_profileNameMap, { p_1: ${J(mitBild)}, p_2: ${J(ohneBild)} });
      PROFILES[${J(mitBild)}] = { name: ${J(mitBild)}, items: [] }; PROFILES[${J(ohneBild)}] = { name: ${J(ohneBild)}, items: [] };`);
    ctx.document.getElementById = () => ({ value: 'code', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } });
    ctx.profileExecuteBySlot('p_1');
    ctx.profileExecuteBySlot('p_2');
    expect(aufnahmen).toEqual([ohneBild]);
    // unbekannt, welche Bilder es gibt (Schlüssel nicht gelesen): gar nichts aufnehmen
    aufnahmen.length = 0;
    evalIn(ctx, '_bildKeys.profile = null; _bildFertig.profile = false;');
    ctx.profileExecuteBySlot('p_2');
    expect(aufnahmen).toEqual([]);
  });

  it('Outfit als Profil speichern: das Outfit-Bild wird (falls nötig) geholt und übernommen; ein Profil mit nicht geladenem Bild behält seins', async () => {
    const mk = id('os'), neuName = id('Neu'), altName = id('Alt');
    await saeen('lscg', [[mk, 'data:lscg-legacy']]);
    await saeen('profile', [[altName, 'data:profilbild-alt']]);
    const ctx = await boot({ extra: { prompt: () => null } });
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'N', versions: [{ code: 'abc', ts: 1 }] }; PROFILES[${J(altName)}] = { name: ${J(altName)}, items: [] };`);
    let name = neuName;
    ctx.prompt = () => name;
    ctx.confirm = () => true;
    evalIn(ctx, 'prompt = globalThis.prompt; confirm = globalThis.confirm;');
    ctx.osSaveOutfitAsProfile(mk, 0);
    await settle(60);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', neuName)).toBe('data:lscg-legacy');     // Bild aus der Datenbank geholt und übernommen
    name = altName;
    ctx.osSaveOutfitAsProfile(mk, 0);
    await settle(60);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', altName)).toBeUndefined();               // vorhandenes (nicht geladenes) Bild nicht ersetzt
    await ctx._saveProfileScreenshotsJetzt();
    expect(await dbBild(ctx, 'profile', altName)).toBe('data:profilbild-alt');
  });

  it('Wheel-Outfit als Profil speichern: das Wheel-Bild wird geholt und geht mit ins Profil', async () => {
    const asset = id('W'), fp = 'Cloth:' + asset, name = id('Prof');
    await saeen('wheel', [[fp, 'data:wheel-bild']]);
    const ctx = await boot({ extra: { prompt: () => name } });
    evalIn(ctx, `_mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [{ name: 'A', items: [{ group: 'Cloth', asset: ${J(asset)} }] }] }];`);
    ctx.mbsWheelSaveProfile(5, 0);
    await settle(60);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', name)).toBe('data:wheel-bild');
    expect(ctx.showStatus.mock.calls.some((c) => String(c[0]).includes('inkl. Bild'))).toBe(true);
  });
});

describe('Löschen, wenn das Bild noch nicht im Speicher liegt', () => {
  it('LSCG-Bild (Versionsschlüssel) löschen: Zeile in der Datenbank weg, byte-gleiche Profil-Kopie (auch nicht geladen) mit weg, andere Profil-Bilder bleiben', async () => {
    const mk = id('del'), fp = id('fp'), kopie = id('kopie'), eigen = id('eigen');
    const key = mk + '|' + fp;
    await saeen('lscg', [[key, 'data:gleich']]);
    await saeen('profile', [[kopie, 'data:gleich'], [eigen, 'data:selbst-gemacht']]);
    const ctx = await boot();
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] }; _lscgFpMap[${J(fp)}] = [${J(kopie)}, ${J(eigen)}];`);
    await ctx.deleteOsScreenshotKey(key);
    await ctx._saveLscgScreenshotsJetzt();
    await ctx._saveProfileScreenshotsJetzt();
    expect(await dbBild(ctx, 'lscg', key)).toBeUndefined();
    expect(await dbBild(ctx, 'profile', kopie)).toBeUndefined();
    expect(await dbBild(ctx, 'profile', eigen)).toBe('data:selbst-gemacht');
    expect(evalIn(ctx, `_hatBild('lscg', ${J(key)})`)).toBe(false);
  });

  it('LSCG-Bild (alter Schlüssel nur mk) löschen', async () => {
    const mk = id('alt');
    await saeen('lscg', [[mk, 'data:legacy']]);
    const ctx = await boot();
    await ctx.deleteOsScreenshot(mk);
    await ctx._saveLscgScreenshotsJetzt();
    expect(await dbBild(ctx, 'lscg', mk)).toBeUndefined();
  });

  it('bei "Nein" in der Rückfrage bleibt alles', async () => {
    const mk = id('nein'), fp = id('fp'), key = mk + '|' + fp;
    await saeen('lscg', [[key, 'data:bleibt']]);
    const ctx = await boot({ confirm: () => false });
    await ctx.deleteOsScreenshotKey(key);
    await ctx._saveLscgScreenshotsJetzt();
    expect(await dbBild(ctx, 'lscg', key)).toBe('data:bleibt');
    expect(evalIn(ctx, `_hatBild('lscg', ${J(key)})`)).toBe(true);
  });

  it('Version löschen: Bild und byte-gleiche Kopien gehen mit, die Version ist weg', async () => {
    const mk = id('ver'), fp = id('fp'), kopie = id('kopie'), key = mk + '|' + fp;
    await saeen('lscg', [[key, 'data:v']]);
    await saeen('profile', [[kopie, 'data:v']]);
    const ctx = await boot();
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }, { fingerprint: 'anders', code: 'd', ts: 2 }] };
      _lscgFpMap[${J(fp)}] = [${J(kopie)}]; renderOutfitScanTab = function () {};`);
    await ctx.deleteLscgVersion(mk, 0);
    await ctx._saveLscgScreenshotsJetzt();
    await ctx._saveProfileScreenshotsJetzt();
    expect(await dbBild(ctx, 'lscg', key)).toBeUndefined();
    expect(await dbBild(ctx, 'profile', kopie)).toBeUndefined();
    expect(evalIn(ctx, `LSCG_DB[${J(mk)}].versions.length`)).toBe(1);
  });

  it('Code ersetzen löscht das alte, nicht geladene Bild (damit ein neues aufgenommen wird)', async () => {
    const mk = id('rep'), fp = id('fp'), key = mk + '|' + fp;
    await saeen('lscg', [[key, 'data:alt']]);
    const ctx = await boot();
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] }; _connected = false; renderOutfitScanTab = function () {};`);
    ctx.repairOsOutfitCode(mk, 0, 'neuer-code');
    await settle(60);
    expect(await dbBild(ctx, 'lscg', key)).toBeUndefined();
    expect(evalIn(ctx, `_hatBild('lscg', ${J(key)})`)).toBe(false);
  });

  it('Wheel-Bild löschen (Karte und Großansicht) entfernt auch ein nicht geladenes aus der Datenbank', async () => {
    const asset = id('D'), fp = 'Cloth:' + asset, asset2 = id('E'), fp2 = 'Cloth:' + asset2;
    await saeen('wheel', [[fp, 'data:eins'], [fp2, 'data:zwei']]);
    const ctx = await boot();
    evalIn(ctx, `_renderMbsWheelTab = function () {};
      _mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [
        { name: 'A', items: [{ group: 'Cloth', asset: ${J(asset)} }] }, { name: 'B', items: [{ group: 'Cloth', asset: ${J(asset2)} }] }] }];`);
    ctx.mbsWheelDeleteShot(5, 0);
    evalIn(ctx, `_osLightboxWheelFp = ${J(fp2)}; closeOsLightbox = function () {};`);
    ctx.deleteOsScreenshotFromLb();
    await ctx._saveMbsWheelShotsJetzt();
    await settle(30);
    expect(await dbBild(ctx, 'wheel', fp)).toBeUndefined();
    expect(await dbBild(ctx, 'wheel', fp2)).toBeUndefined();
  });

  it('Profil-Bild löschen (Knopf im Profil) entfernt ein nicht geladenes aus der Datenbank', async () => {
    const name = id('Prof');
    await saeen('profile', [[name, 'data:p']]);
    const ctx = await boot();
    evalIn(ctx, `PROFILES[${J(name)}] = { name: ${J(name)}, items: [] }; Object.assign(_profileNameMap, { p_1: ${J(name)} }); renderProfileList = function () {};`);
    ctx.removeProfileScreenshot('p_1');
    await settle(60);
    expect(await dbBild(ctx, 'profile', name)).toBeUndefined();
  });
});

describe('Alles, was das ganze Archiv braucht, lädt es zuerst', () => {
  it('"Alle LSCG-Bilder löschen": lädt LSCG- und Profil-Bilder, fragt mit der vollen Anzahl, entfernt auch die Profil-Kopien', async () => {
    const mk = id('all'), fp = id('fp'), key = mk + '|' + fp, kopie = id('kopie'), eigen = id('eigen');
    await saeen('lscg', [[key, 'data:gleich']]);
    await saeen('profile', [[kopie, 'data:gleich'], [eigen, 'data:eigen']]);
    const frage = vi.fn(() => true);
    const ctx = await boot({ confirm: frage });
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] }; _lscgFpMap[${J(fp)}] = [${J(kopie)}, ${J(eigen)}]; renderOutfitScanTab = function () {};`);
    const lauf = ctx.clearAllLscgScreenshots();
    expect(frage).not.toHaveBeenCalled();
    await lauf;
    await ctx._saveLscgScreenshotsJetzt();
    await ctx._saveProfileScreenshotsJetzt();
    expect(frage).toHaveBeenCalledTimes(1);
    expect((await ctx.idbScreenshotGetAll('lscg'))[key]).toBeUndefined();
    expect(await dbBild(ctx, 'profile', kopie)).toBeUndefined();
    expect(await dbBild(ctx, 'profile', eigen)).toBe('data:eigen');
  });

  it('"Alle Wheel-Bilder löschen": lädt zuerst, bei "Nein" bleiben alle Bilder in der Datenbank', async () => {
    const fp = 'Cloth:' + id('ww');
    await saeen('wheel', [[fp, 'data:w']]);
    const frage = vi.fn(() => false);
    const ctx = await boot({ confirm: frage });
    await ctx.mbsWheelClearAllShots();
    await ctx._saveMbsWheelShotsJetzt();
    expect(frage).toHaveBeenCalledTimes(1);
    expect(await dbBild(ctx, 'wheel', fp)).toBe('data:w');
  });

  it('Screenshot-Export enthält auch die nicht geladenen Bilder', async () => {
    const k = id('ex');
    await saeen('profile', [[k + 'p', 'data:p']]);
    await saeen('lscg', [[k + 'l|F', 'data:l']]);
    await saeen('wheel', [[k + 'w', 'data:w']]);
    const blobs = [];
    const ctx = await boot({ extra: {
      Blob: class { constructor(parts) { this.text = parts.join(''); blobs.push(this); this.size = this.text.length; } },
      URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    } });
    ctx.document.createElement = () => { const e = makeElementStub(); e.click = () => {}; return e; };
    await ctx.exportScreenshotsOnly();
    const p = JSON.parse(blobs.at(-1).text);
    expect(p.profileScreenshots[k + 'p']).toBe('data:p');
    expect(p.lscgScreenshots[k + 'l|F']).toBe('data:l');
    expect(p.mbsWheelShots[k + 'w']).toBe('data:w');
  });

  it('Wheel-Export enthält auch die nicht geladenen Bilder und gibt das Archiv danach wieder frei', async () => {
    const fp = 'Cloth:' + id('we');
    await saeen('wheel', [[fp, 'data:wheel']]);
    const blobs = [];
    const ctx = await boot({ extra: {
      Blob: class { constructor(parts) { this.text = parts.join(''); blobs.push(this); } },
      URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    } });
    ctx.document.createElement = () => { const e = makeElementStub(); e.click = () => {}; return e; };
    evalIn(ctx, "_mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [] }];");
    await ctx.mbsWheelExportDB();
    expect(JSON.parse(blobs.at(-1).text).shots[fp]).toBe('data:wheel');
    expect(evalIn(ctx, '_bildAusgeliehen')).toBe(0);
    expect(imSpeicher(ctx, '_mbsWheelShots', fp)).toBeUndefined();   // danach wieder aus dem Speicher genommen
    expect(evalIn(ctx, `_hatBild('wheel', ${J(fp)})`)).toBe(true);    // ... aber weiterhin bekannt
    expect(await dbBild(ctx, 'wheel', fp)).toBe('data:wheel');         // und unverändert in der Datenbank
  });
});

describe('Freigeben nach Sicherung/Export: nur Unverändertes, die Datenbank bleibt unberührt', () => {
  it('geleihte Bilder werden nach dem Zurückgeben wieder freigegeben; ein Speichervorgang danach löscht nichts', async () => {
    const k = id('frei');
    await saeen('profile', [[k + 'a', 'data:a'], [k + 'b', 'data:b']]);
    const ctx = await boot();
    const leihe = await ctx.bilderAusleihen(['profile']);
    expect(leihe.ok).toBe(true);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'a')).toBe('data:a');
    leihe.zurueck();
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'a')).toBeUndefined();
    expect(evalIn(ctx, '_bildFertig.profile')).toBe(false);
    expect(evalIn(ctx, `_hatBild('profile', ${J(k + 'a')})`)).toBe(true);
    await ctx._saveProfileScreenshotsJetzt();                             // das Diff-Speichern darf die freigegebenen Bilder nicht als gelöscht sehen
    const alle = await ctx.idbScreenshotGetAll('profile');
    expect(alle[k + 'a']).toBe('data:a');
    expect(alle[k + 'b']).toBe('data:b');
  });

  it('neu aufgenommene, noch nicht gespeicherte Bilder bleiben im Speicher und werden danach geschrieben', async () => {
    const k = id('neu');
    await saeen('profile', [[k + 'alt', 'data:alt']]);
    const ctx = await boot();
    const leihe = await ctx.bilderAusleihen(['profile']);
    evalIn(ctx, `PROFILE_SCREENSHOTS[${J(k + 'frisch')}] = 'data:frisch'`);         // noch nicht gespeichert
    leihe.zurueck();
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'frisch')).toBe('data:frisch');
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'alt')).toBeUndefined();
    await ctx._saveProfileScreenshotsJetzt();
    expect(await dbBild(ctx, 'profile', k + 'frisch')).toBe('data:frisch');
    expect(await dbBild(ctx, 'profile', k + 'alt')).toBe('data:alt');
  });

  it('ein neu aufgenommenes Bild ERSETZT das alte (gewollt) – auch nach Freigeben und erneutem Laden bleibt das neue', async () => {
    const k = id('ers');
    await saeen('profile', [[k, 'data:alt']]);
    const ctx = await boot();
    const l1 = await ctx.bilderAusleihen(['profile']);
    l1.zurueck();
    evalIn(ctx, `PROFILE_SCREENSHOTS[${J(k)}] = 'data:neu'`);
    await ctx._saveProfileScreenshotsJetzt();
    const l2 = await ctx.bilderAusleihen(['profile']);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k)).toBe('data:neu');
    l2.zurueck();
    expect(await dbBild(ctx, 'profile', k)).toBe('data:neu');
  });

  it('solange noch eine Leihe läuft, wird nichts freigegeben', async () => {
    const k = id('zwei');
    await saeen('profile', [[k, 'data:p']]);
    const ctx = await boot();
    const a = await ctx.bilderAusleihen(['profile']);
    const b = await ctx.bilderAusleihen(['profile']);
    a.zurueck();
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k)).toBe('data:p');
    b.zurueck();
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k)).toBeUndefined();
    a.zurueck();                                                          // doppeltes Zurückgeben zählt nicht doppelt
    expect(evalIn(ctx, '_bildAusgeliehen')).toBe(0);
  });

  it('wer das volle Archiv ohne Leihe braucht (bilderVollLaden, z. B. Wheel-Serie), dem wird es nie unter den Füßen weggenommen', async () => {
    const k = id('fest');
    await saeen('wheel', [[k, 'data:w']]);
    const ctx = await boot();
    await ctx.bilderVollLaden(['wheel']);
    const leihe = await ctx.bilderAusleihen(['wheel']);
    leihe.zurueck();
    expect(imSpeicher(ctx, '_mbsWheelShots', k)).toBe('data:w');
    expect(evalIn(ctx, '_bildFertig.wheel')).toBe(true);
  });

  it('nach dem Freigeben holt der Einzelabruf das Bild wieder; ein gelöschtes Bild kommt nicht zurück', async () => {
    const k = id('weg'), b = id('bleibt');
    await saeen('profile', [[k, 'data:x'], [b, 'data:y']]);
    const ctx = await boot();
    const leihe = await ctx.bilderAusleihen(['profile']);
    leihe.zurueck();
    await ctx._bildHolen('profile', [b]);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', b)).toBe('data:y');
    evalIn(ctx, `PROFILES[${J(k)}] = { name: ${J(k)}, items: [] }`);
    evalIn(ctx, `_profilEntfernen(${J(k)})`);
    await settle(60);
    expect(await dbBild(ctx, 'profile', k)).toBeUndefined();
    expect(evalIn(ctx, `_hatBild('profile', ${J(k)})`)).toBe(false);
  });
});

describe('Großansichten holen das Bild, wenn es noch in der Datenbank liegt', () => {
  function lightboxElemente(ctx) {
    const els = {};
    ctx.document.getElementById = (i) => (els[i] ||= makeElementStub());
    return els;
  }

  it('LSCG-Großansicht (Version): holt das Bild und öffnet', async () => {
    const mk = id('lb'), fp = id('fp');
    await saeen('lscg', [[mk + '|' + fp, 'data:gross']]);
    const ctx = await boot();
    const els = lightboxElemente(ctx);
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] };`);
    ctx.openOsLightboxVersion(mk, 0);
    await settle(60);
    expect(els.osLbImg.src).toBe('data:gross');
  });

  it('LSCG-Großansicht (älteres Bild nur mk): holt das Bild und öffnet', async () => {
    const mk = id('lb2');
    await saeen('lscg', [[mk, 'data:legacy']]);
    const ctx = await boot();
    const els = lightboxElemente(ctx);
    ctx.openOsLightbox(mk);
    await settle(60);
    expect(els.osLbImg.src).toBe('data:legacy');
  });

  it('LSCG-Großansicht: das richtige Bild gewinnt – eine Profil-Kopie im Speicher verdrängt das nicht geladene Versionsbild nicht', async () => {
    const mk = id('lb3'), fp = id('fp'), p = id('prof');
    await saeen('lscg', [[mk + '|' + fp, 'data:richtig']]);
    const ctx = await boot();
    const els = lightboxElemente(ctx);
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] }; _lscgFpMap[${J(fp)}] = [${J(p)}]; PROFILE_SCREENSHOTS[${J(p)}] = 'data:profil-kopie';`);
    ctx.openOsLightboxVersion(mk, 0);
    await settle(60);
    expect(els.osLbImg.src).toBe('data:richtig');
  });

  it('fehlt die Zeile in der Datenbank, endet die Großansicht ohne Schleife', async () => {
    const mk = id('lb4'), fp = id('fp');
    const ctx = await boot();
    lightboxElemente(ctx);
    evalIn(ctx, `LSCG_DB[${J(mk)}] = { name: 'X', versions: [{ fingerprint: ${J(fp)}, code: 'c', ts: 1 }] }; _bildKeys.lscg.add(${J(mk + '|' + fp)});`);
    const hol = vi.fn(async () => ({}));
    ctx.idbScreenshotGetMany = hol;
    evalIn(ctx, 'idbScreenshotGetMany = globalThis.idbScreenshotGetMany;');
    ctx.openOsLightboxVersion(mk, 0);
    await settle(60);
    expect(hol.mock.calls.length).toBe(1);
  });

  it('Wheel-Großansicht: holt das Bild und öffnet', async () => {
    const asset = id('LB'), fp = 'Cloth:' + asset;
    await saeen('wheel', [[fp, 'data:wheel-gross']]);
    const ctx = await boot();
    const els = lightboxElemente(ctx);
    evalIn(ctx, `_mbsWheelData = [{ memberNumber: 5, name: 'Mia', ts: 1, outfits: [{ name: 'A', items: [{ group: 'Cloth', asset: ${J(asset)} }] }] }];`);
    ctx.mbsWheelOpenShot(0, 5, 0);
    await settle(60);
    expect(els.osLbImg.src).toBe('data:wheel-gross');
  });
});

describe('Automatische Tagessicherung: leiht das Archiv, schreibt alle Bilder, gibt es danach frei', () => {
  function ordner() {
    const dateien = new Map();
    return {
      dateien,
      name: 'test',
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async getFileHandle(name) {
        return {
          async createWritable() {
            let text = '';
            return { async write(s) { text += s; }, async close() { dateien.set(name, text); }, async abort() {} };
          },
          async getFile() { return { size: (dateien.get(name) || '').length }; },
        };
      },
      async *values() { for (const n of dateien.keys()) yield { kind: 'file', name: n }; },
      async removeEntry(n) { dateien.delete(n); },
    };
  }

  it('die Sicherungsdatei enthält die nicht geladenen Bilder; danach ist die Leihe zurück und die Bilder sind wieder frei', async () => {
    const k = id('auto');
    await saeen('profile', [[k + 'p', 'data:profil']]);
    await saeen('wheel', [['Cloth:' + k, 'data:wheel']]);
    const ctx = loadScript(['items.js', 'bc-autobackup.js'], { console: quiet, confirm: () => true, bilderEcht: true });
    ctx.showStatus = vi.fn();
    await ctx._screenshotStoreReady();
    await settle(80);
    const o = ordner();
    ctx._bcBackupSetzeOrdner(o);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'p')).toBeUndefined();
    const r = await ctx._bcBackupAutoLauf();
    expect(r.fehler).toBeUndefined();
    expect(r.uebersprungen).toBeUndefined();
    const text = [...o.dateien.values()].join('');
    expect(text).toContain('"' + k + 'p":"data:profil"');
    expect(text).toContain('"Cloth:' + k + '":"data:wheel"');
    expect(evalIn(ctx, '_bildAusgeliehen')).toBe(0);
    expect(imSpeicher(ctx, 'PROFILE_SCREENSHOTS', k + 'p')).toBeUndefined();                  // wieder frei
    expect(evalIn(ctx, `_hatBild('profile', ${J(k + 'p')})`)).toBe(true);                     // aber bekannt
    expect(await dbBild(ctx, 'profile', k + 'p')).toBe('data:profil');                         // und in der Datenbank
  });

  it('schlägt das Lesen fehl, wird nicht gesichert, kein Tagesvermerk gesetzt und die Leihe trotzdem zurückgegeben', async () => {
    const ctx = loadScript(['items.js', 'bc-autobackup.js'], { console: quiet, confirm: () => true, bilderEcht: true });
    ctx.showStatus = vi.fn();
    await ctx._screenshotStoreReady();
    await settle(80);
    const o = ordner();
    ctx._bcBackupSetzeOrdner(o);
    evalIn(ctx, '_bildVoll.lscg = Promise.resolve(false);');
    const r = await ctx._bcBackupAutoLauf();
    expect(r.uebersprungen).toMatch(/nicht vollstaendig/);
    expect(o.dateien.size).toBe(0);
    expect(evalIn(ctx, '_bildAusgeliehen')).toBe(0);
  });
});

describe('Diagnose und Zähler kennen die nicht geladenen Bilder', () => {
  it('Export-Info zählt alle gespeicherten Bilder (nicht nur die geladenen) und sagt, wie viele im Speicher liegen', async () => {
    const k = id('info');
    await saeen('profile', [[k + 'a', 'data:a'], [k + 'b', 'data:b']]);
    const ctx = await boot();
    const n = evalIn(ctx, '_bildAnzahl("profile")');
    expect(n).toBeGreaterThanOrEqual(2);
    const text = String(await ctx.exportInfoSammeln());
    expect(text).toContain('Profil-Bilder: ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' · im Speicher 0 ');
    expect(text).toContain('nur Schlüssel + angesehene Bilder');
    await ctx._bildHolen('profile', [k + 'a']);
    expect(String(await ctx.exportInfoSammeln())).toContain(' · im Speicher 1 ');
  });
});
