/* ══════════════════════════════════════════════════════════════
   MBS Wheel – Rettung aus den überlebenden Resten

   Der Outfit-Datensatz (BC_MBS_WHEEL_v1) wurde überschrieben.
   Zwei andere Schlüssel blieben unangetastet:

     BC_MBS_WHEEL_SS_v1     Screenshots, Schlüssel = Fingerprint
                            "group:asset|group:asset|…"  → die
                            vollständige Item-Liste des Outfits
     BC_MBS_WHEEL_OFAVS_v1  Outfit-Favoriten, Schlüssel =
                            "memberNumber|Outfitname" → ID + Name

   Anwendung: BC Konfigurator öffnen, F12 → Konsole, alles hier
   einfügen, Enter. Es wird nur gelesen; es lädt eine JSON-Datei
   herunter und verändert nichts.
   ══════════════════════════════════════════════════════════════ */
(async () => {
  const get = async k => { try { return await idbGet(k); } catch { return null; } };
  const ls  = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

  // Dieses Skript laeuft, wenn der Bestand bereits beschaedigt ist – ein Wert,
  // der wider Erwarten kein Array ist, darf die Rettung nicht abbrechen.
  const alsListe = v => (Array.isArray(v) ? v : []);
  const beides = async k => [...new Set([...alsListe(await get(k)), ...alsListe(ls(k))])];

  const shots = (await get('BC_MBS_WHEEL_SS_v1')) || {};
  const favs  = await beides('BC_MBS_WHEEL_FAVS_v1');
  const ofavs = await beides('BC_MBS_WHEEL_OFAVS_v1');

  const outfits = Object.keys(shots).map(fp => ({
    fingerprint: fp,
    itemAnzahl: fp ? fp.split('|').length : 0,
    items: fp ? fp.split('|').map(s => {
      const i = s.indexOf(':');
      return i < 0 ? { group: s, asset: '' } : { group: s.slice(0, i), asset: s.slice(i + 1) };
    }) : []
  })).sort((a, b) => b.itemAnzahl - a.itemAnzahl);

  const idNamen = ofavs.map(k => {
    const s = String(k), i = s.indexOf('|');
    return i < 0 ? null : { memberNumber: s.slice(0, i), outfitName: s.slice(i + 1) };
  }).filter(Boolean);

  const out = {
    type: 'BCU_WHEEL_RECOVERY',
    erstellt: new Date().toISOString(),
    zusammenfassung: {
      outfitsMitItemListe: outfits.length,
      itemsGesamt: outfits.reduce((s, o) => s + o.itemAnzahl, 0),
      idNamenPaare: idNamen.length,
      spielerFavoriten: favs.length
    },
    spielerFavoriten: favs,
    idNamen,
    outfits
  };

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = 'MBS_Wheel_Rettung_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();

  console.log('%cGerettet', 'color:#4ade80;font-weight:700;font-size:14px');
  console.table(out.zusammenfassung);
  return out.zusammenfassung;
})()
