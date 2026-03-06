// ══════════════════════════════════════════════════════
//  MONEY SYSTEM
// ══════════════════════════════════════════════════════
const MONEY_KEY = 'BC_Money_v1';
let _money = {
  settings: { name: 'Gold', queryCmd: '!gold', queryTyp: 'whisper' },
  balances: {}
};

// Async load from IndexedDB on startup
(async () => {
  try {
    const saved = await idbGet(MONEY_KEY);
    if (saved) {
      _money = Object.assign(
        { settings: { name: 'Gold', queryCmd: '!gold', queryTyp: 'whisper' }, balances: {} },
        saved
      );
    }
  } catch (err) {
    console.warn('[Money] IDB load error:', err);
  }
  // Re-render if tab is already open
  if (document.getElementById('tab-money')?.classList.contains('active')) renderMoneyTab();
  // Update tab badge
  const btn = document.getElementById('tab-money-btn');
  if (btn) btn.textContent = '💰 Money (' + Object.keys(_money.balances).length + ')';
})();

function _saveMoney() {
  idbSet(MONEY_KEY, _money);
}

function renderMoneyTab() {
  // Init UI values
  document.getElementById('money-name-inp').value = _money.settings.name ?? 'Gold';
  document.getElementById('money-cmd-inp').value  = _money.settings.queryCmd ?? '!gold';
  const typSel = document.getElementById('money-typ-inp');
  if (typSel) typSel.value = _money.settings.queryTyp ?? 'whisper';
  const entries = Object.entries(_money.balances);
  const cur = _money.settings.name || 'Gold';
  if (!entries.length) {
    document.getElementById('money-entries').innerHTML = `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Noch keine Spieler – „+ Spieler hinzufügen" oder wird automatisch via Bot befüllt</div>`;
    return;
  }
  const html = entries.sort((a,b)=>b[1].balance-a[1].balance).map(([id, p]) => `
    <div class="money-card" id="mcrd-${id}">
      <span class="money-name">👤 ${escHtml(p.name||id)}</span>
      <span class="money-balance">${p.balance ?? 0}</span>
      <span style="font-size:.65rem;color:var(--text3)">${escHtml(cur)}</span>
      <div class="money-adj">
        <input class="cf" type="number" id="madj-${id}" value="0" style="width:64px">
        <button class="money-plus" onclick="moneyAdj('${id}',+1)">+</button>
        <button class="money-minus" onclick="moneyAdj('${id}',-1)">−</button>
        <button onclick="moneySet('${id}',prompt('Genauen Wert setzen für ${escHtml(p.name||id)}:',${p.balance??0}))" style="font-size:.62rem;padding:3px 7px;background:var(--bg3);border:1px solid var(--border2);color:var(--text3);border-radius:4px;cursor:pointer">= Setzen</button>
        <button onclick="moneyRemovePlayer('${id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 6px">✕</button>
      </div>
    </div>`).join('');
  document.getElementById('money-entries').innerHTML = html;
}

function moneySetName(v) { _money.settings.name = v.trim()||'Gold'; _saveMoney(); }
function moneySetCmd(v)  { _money.settings.queryCmd = v.trim(); _saveMoney(); }
function moneySetTyp(v)  { _money.settings.queryTyp = v; _saveMoney(); }

function moneyAdj(id, sign) {
  const amt = +document.getElementById('madj-'+id)?.value || 0;
  if (!amt) return;
  const p = _money.balances[id]; if (!p) return;
  p.balance = (p.balance??0) + sign*amt;
  _saveMoney(); renderMoneyTab();
}

function moneySet(id, val) {
  if (val === null || val === '') return;
  const p = _money.balances[id]; if (!p) return;
  p.balance = parseInt(val)||0;
  _saveMoney(); renderMoneyTab();
}

function moneyAddPlayer() {
  const name = prompt('Spielername oder MemberNumber:');
  if (!name?.trim()) return;
  const id = 'manual_'+Date.now();
  _money.balances[id] = { name: name.trim(), balance: 0 };
  _saveMoney(); renderMoneyTab();
}

function moneyRemovePlayer(id) {
  delete _money.balances[id]; _saveMoney(); renderMoneyTab();
}

function moneyResetAll() {
  if (!confirm('Alle Guthaben auf 0 zurücksetzen?')) return;
  Object.values(_money.balances).forEach(p => p.balance = 0);
  _saveMoney(); renderMoneyTab();
}

// Called by bot via postMessage
function _moneyApply(memberNum, name, delta, setVal) {
  const id = memberNum; // key = raw MemberNumber
  if (!_money.balances[id]) _money.balances[id] = { name: name||('#'+memberNum), balance: 0 };
  const p = _money.balances[id];
  p.name = name || p.name;
  if (setVal !== undefined) p.balance = parseInt(setVal)||0;
  else p.balance = (p.balance??0) + (parseInt(delta)||0);
  _saveMoney();
  // Live update if tab open
  if (document.getElementById('tab-money')?.classList.contains('active')) renderMoneyTab();
  // Update tab badge
  const btn = document.getElementById('tab-money-btn');
  if (btn) btn.textContent = '💰 Money (' + Object.keys(_money.balances).length + ')';
}


// ══════════════════════════════════════════════════════
//  RANG SYSTEM
// ══════════════════════════════════════════════════════