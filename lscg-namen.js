/* ══════════════════════════════════════════════════════════════
   LSCG – Spielernamen nachtragen

   Nach der Wiederherstellung tragen viele Eintraege nur ihre
   MemberNumber, weil der Name nie im Screenshot-Schluessel stand.
   Dieses Skript sucht die Namen in allen anderen Bestaenden
   zusammen und traegt sie nach. Bereits gesetzte Namen bleiben.

   Anwendung: Konfigurator oeffnen, F12 -> Konsole, einfuegen.
   ══════════════════════════════════════════════════════════════ */
(async () => {
  if (typeof LSCG_DB === 'undefined') { console.error('[Namen] LSCG nicht geladen.'); return; }

  const namen = {};
  const quelle = {};
  const setze = (num, name, q) => {
    if (num == null || !name) return;
    const k = String(num).trim();
    const n = String(name).trim();
    if (!k || !n || n === k || n === '#' + k) return;
    if (namen[k]) return;
    namen[k] = n; quelle[q] = (quelle[q] || 0) + 1;
  };

  // 1 – Curse-Datenbank: Besitzer der Crafts
  try { for (const e of Object.values(CURSE_DB || {})) setze(e?.Besitzer?.Nummer, e?.Besitzer?.Name, 'curseDB'); } catch (e) {}
  // 2 – MBS Wheel
  try { for (const r of (_mbsWheelData || [])) setze(r?.memberNumber, r?.name, 'wheel'); } catch (e) {}
  // 3 – Rang-Register
  try { for (const [id, p] of Object.entries(_rankData?.players || {})) setze(id, p?.name, 'rang'); } catch (e) {}
  // 4 – Money-Konten
  try { for (const [id, b] of Object.entries(_money?.balances || {})) setze(id, b?.name, 'money'); } catch (e) {}
  // 5 – Bot-Logs: Eintraege der Form "Name #12345"
  try {
    const logs = window._BCBotLog || (await idbGet('BCBot_Logs')) || [];
    for (const l of logs) {
      const m = /^(.*?)\s+#(\d+)$/.exec(String(l?.player || ''));
      if (m) setze(m[2], m[1], 'botLogs');
    }
  } catch (e) {}
  // 6 – bereits benannte LSCG-Eintraege
  try { for (const [mk, v] of Object.entries(LSCG_DB)) setze(mk, v?.name, 'lscg'); } catch (e) {}

  // ── Nachtragen ────────────────────────────────────────────────────────
  let ergaenzt = 0, hatteSchon = 0, weiterhinOhne = 0;
  const offen = [];
  for (const [mk, v] of Object.entries(LSCG_DB)) {
    if (!v) continue;
    const leer = !v.name || v.name === mk || v.name === '#' + mk;
    if (!leer) { hatteSchon++; continue; }
    if (namen[mk]) { v.name = namen[mk]; ergaenzt++; }
    else { weiterhinOhne++; if (offen.length < 20) offen.push(mk); }
  }
  if (ergaenzt) _saveLscgDB();
  if (typeof renderOutfitScanTab === 'function') { try { renderOutfitScanTab(); } catch (e) {} }

  console.log('%cNamen nachgetragen', 'color:#4ade80;font-weight:700;font-size:14px');
  console.table({ ergaenzt, hatteBereitsNamen: hatteSchon, weiterhinOhneNamen: weiterhinOhne,
                  namensregister: Object.keys(namen).length });
  console.log('Quellen:', quelle);
  if (offen.length) console.log('Beispiele ohne Namen:', offen.join(', '));
  return { ergaenzt, weiterhinOhne };
})()
