/* ══════════════════════════════════════════════════════════════
   MBS Wheel – geretteten Bestand zurückschreiben

   Liest MBS_Wheel_Rettung_<Datum>.json und legt die Outfits als
   eigenen Eintrag „Wiederhergestellt" im Wheel-Tab an. Die noch
   vorhandenen Screenshots hängen sich automatisch wieder an,
   weil der Fingerprint identisch neu berechnet wird.

   Bestehende Spieler werden NICHT angefasst – es wird nur
   ergänzt. Mehrfaches Ausführen ersetzt den Rettungs-Eintrag,
   statt ihn zu verdoppeln.

   Anwendung: Konfigurator öffnen, F12 → Konsole, einfügen,
   Enter, dann die JSON-Datei auswählen.
   ══════════════════════════════════════════════════════════════ */
(() => {
  const MN = 0, NAME = 'Wiederhergestellt';

  window.bcWheelRestore = function (data) {
    const src = (data && data.outfits) || [];
    if (!src.length) { console.warn('[Rettung] Keine Outfits in der Datei.'); return; }
    if (typeof _mbsWheelData === 'undefined') { console.error('[Rettung] Wheel-Daten nicht geladen.'); return; }
    if (typeof _mbsWheelLoaded !== 'undefined' && !_mbsWheelLoaded) {
      console.error('[Rettung] Wheel-Daten noch nicht geladen – bitte kurz warten und erneut ausführen.');
      return;
    }

    // Die echten Outfit-Namen sind mit dem ueberschriebenen Datensatz verloren.
    // Ersatzweise ein sprechender Name aus der Zusammensetzung: die zwei
    // charakteristischsten Kleidungs-Slots plus Item-Zahl. Damit bleibt das
    // Outfit ueber die Suche auffindbar.
    const PRIO = ['Cloth','ClothLower','Suit','SuitLower','Bra','Panties',
                  'ItemArms','ItemNeck','ItemHead','ItemMouth','ItemDevices','ItemBoots'];
    const benennen = items => {
      const by = {};
      for (const it of items) if (!(it.group in by)) by[it.group] = it.asset;
      let teile = PRIO.filter(g => g in by).map(g => by[g]).slice(0, 2);
      if (!teile.length) teile = [items[0].asset];
      return teile.join(' · ');
    };

    const gesehen = {};
    const outfits = src.map(o => {
      const items = (o.items || []).map(it => ({ group: it.group, asset: it.asset }));
      if (!items.length) return null;
      let nm = benennen(items) + ' (' + items.length + ')';
      gesehen[nm] = (gesehen[nm] || 0) + 1;
      if (gesehen[nm] > 1) nm += ' #' + gesehen[nm];
      return { name: nm, firstSeen: 0, items };   // firstSeen 0 = kein NEU-Badge
    }).filter(Boolean);

    const rec = { memberNumber: MN, name: NAME, room: 'Wiederhergestellt', ts: Date.now(), outfits };
    const idx = _mbsWheelData.findIndex(x => Number(x.memberNumber) === MN);
    if (idx >= 0) _mbsWheelData[idx] = rec; else _mbsWheelData.push(rec);

    _saveMbsWheelData();
    if (typeof _updateWheelTabBadge === 'function') _updateWheelTabBadge();
    if (typeof _renderMbsWheelTab === 'function') _renderMbsWheelTab();

    const shots = (typeof _mbsWheelShots !== 'undefined') ? _mbsWheelShots : {};
    const mitBild = outfits.filter(o => shots[_mbsOutfitFp(o)]).length;
    console.log('%cZurückgeschrieben', 'color:#4ade80;font-weight:700;font-size:14px');
    console.table({
      outfits: outfits.length,
      items: outfits.reduce((s, o) => s + o.items.length, 0),
      mitPassendemBild: mitBild,
      andereSpielerUnberuehrt: _mbsWheelData.length - 1
    });
    return { outfits: outfits.length, mitBild };
  };

  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { window.bcWheelRestore(JSON.parse(rd.result)); }
      catch (e) { console.error('[Rettung] Datei nicht lesbar:', e.message); }
    };
    rd.readAsText(f);
  };
  inp.click();
  console.log('[Rettung] Bitte MBS_Wheel_Rettung_….json auswählen.');
})()
