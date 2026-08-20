/* ══════════════════════════════════════════════════════════════
   LSCG Outfits – Wiederherstellung aus den Screenshot-Schluesseln

   Die Outfit-Datenbank (LSCG_DB) wurde zurueckgesetzt, die Screenshots
   nicht. Deren Schluessel lautet  memberNumber|fingerprint , und der
   Fingerprint ist der Outfit-Inhalt:

       GroupNameFarbe   ...verbunden mit 

   Daraus lassen sich Spieler-ID, Items und Farben zurueckgewinnen und ein
   Outfit-Code neu erzeugen. Spielernamen kommen aus der Curse-Datenbank
   (Besitzer), dem Wheel und dem verbliebenen LSCG-Bestand.

   Nicht enthalten: die Original-Outfitnamen und Craft-/Property-Details,
   die nie im Fingerprint standen.

   Anwendung: Konfigurator oeffnen, F12 -> Konsole, einfuegen, Enter.
   ══════════════════════════════════════════════════════════════ */
(async () => {
  const US = String.fromCharCode(31), RS = String.fromCharCode(30);

  if (typeof LSCG_SCREENSHOTS === 'undefined' || typeof LSCG_DB === 'undefined') {
    console.error('[LSCG-Rettung] LSCG-Daten nicht geladen.'); return;
  }
  if (typeof LZString === 'undefined') {
    console.error('[LSCG-Rettung] LZString fehlt.'); return;
  }

  // ── Namensregister aufbauen ───────────────────────────────────────────
  const namen = {};
  try {
    for (const e of Object.values(CURSE_DB || {})) {
      const n = e && e.Besitzer;
      if (n && n.Nummer != null && n.Name && !namen[n.Nummer]) namen[n.Nummer] = n.Name;
    }
  } catch (e) {}
  try {
    for (const r of (_mbsWheelData || [])) {
      if (r && r.memberNumber != null && r.name && !namen[r.memberNumber]) namen[r.memberNumber] = r.name;
    }
  } catch (e) {}
  for (const [mk, v] of Object.entries(LSCG_DB)) if (v && v.name && !namen[mk]) namen[mk] = v.name;

  // ── Screenshots auswerten ─────────────────────────────────────────────
  let neu = 0, schonDa = 0, ohneFp = 0, kaputt = 0;
  const spieler = new Set(), benannt = new Set();

  for (const key of Object.keys(LSCG_SCREENSHOTS)) {
    const p = key.indexOf('|');
    if (p < 0) { ohneFp++; continue; }
    const mk = key.slice(0, p), fp = key.slice(p + 1);
    if (!fp) { ohneFp++; continue; }

    let items;
    try {
      items = fp.split(RS).map(teil => {
        const f = teil.split(US);
        if (f.length < 2) throw new Error('Feld fehlt');
        let farbe = 'Default';
        if (f[2] !== undefined && f[2] !== '') { try { farbe = JSON.parse(f[2]); } catch (e) { farbe = f[2]; } }
        return { Group: f[0], Name: f[1], Color: farbe };
      });
    } catch (e) { kaputt++; continue; }
    if (!items.length) { kaputt++; continue; }

    if (!LSCG_DB[mk]) {
      LSCG_DB[mk] = { name: namen[mk] || null, nickname: null, versions: [] };
      if (namen[mk]) benannt.add(mk);
    } else if (!LSCG_DB[mk].name && namen[mk]) {
      LSCG_DB[mk].name = namen[mk]; benannt.add(mk);
    }
    const eintrag = LSCG_DB[mk];
    if (!Array.isArray(eintrag.versions)) eintrag.versions = [];
    spieler.add(mk);

    if (eintrag.versions.some(v => v.fingerprint === fp)) { schonDa++; continue; }

    eintrag.versions.push({
      code: LZString.compressToBase64(JSON.stringify(items)),
      fingerprint: fp,          // haelt die Verknuepfung zum vorhandenen Bild
      ts: 0,                    // Zeitpunkt unbekannt
      wiederhergestellt: true
    });
    neu++;
  }

  _saveLscgDB();
  if (typeof renderOutfitScanTab === 'function') { try { renderOutfitScanTab(); } catch (e) {} }

  console.log('%cLSCG wiederhergestellt', 'color:#4ade80;font-weight:700;font-size:14px');
  console.table({
    neueOutfits: neu,
    bereitsVorhanden: schonDa,
    betroffeneSpieler: spieler.size,
    davonNeuBenannt: benannt.size,
    ohneOutfitDaten: ohneFp,
    unlesbar: kaputt
  });
  return { neu, schonDa, spieler: spieler.size };
})()
