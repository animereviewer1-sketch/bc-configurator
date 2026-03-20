// ══════════════════════════════════════════════════════
//  IndexedDB Helper – globale Funktionen, hier definiert
//  damit money.js / rank.js / shop.js / bot-data.js sie nutzen können
// ══════════════════════════════════════════════════════
const _IDB_NAME    = 'BCKonfigurator';
const _IDB_VERSION = 1;
const _IDB_STORE   = 'kv';
let   _IDB_DB      = null;

function _idbOpen() {
  if (_IDB_DB) return Promise.resolve(_IDB_DB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE);
    };
    req.onsuccess = e => { _IDB_DB = e.target.result; resolve(_IDB_DB); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function idbGet(key) {
  try {
    const db = await _idbOpen();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readonly');
      const req = tx.objectStore(_IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] get:', err); return null; }
}

async function idbSet(key, value) {
  try {
    const db = await _idbOpen();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(_IDB_STORE, 'readwrite');
      const req = tx.objectStore(_IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch (err) { console.warn('[IDB] set:', err); }
}

// Migration localStorage → IDB (einmalig)
(async function() {
  const keys = ['BC_Money_v1','BC_Rank_v1','BC_Shop_v1','BC_Bots_v2','BC_BotGroups_v1',
                 'BCBot_Logs','BC_CURSE_DB_v1','BC_CURSE_COMMENTS_v1','BC_CURSE_FAV_v1'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if ((await idbGet(key)) === null) {
        await idbSet(key, JSON.parse(raw));
        console.info('[IDB] Migriert:', key);
      }
      localStorage.removeItem(key);
    } catch(e) { console.warn('[IDB] Migration:', key, e); }
  }
})();

// Echo's Clothing Extension – Chinesisch → Englisch Lookup
// Quelle: Echo_Extension_CN_Items.docx
const ECHO_CN_NAMES = {
  '大衣': 'Overcoat',
  '插兜雨衣': 'Pocket Raincoat',
  '白大褂': 'White Lab Coat',
  '白布': 'White Sheet',
  '系腰外套小': 'Tied Waist Jacket (S)',
  '系腰外套大': 'Tied Waist Jacket (L)',
  '西装露肩': 'Off-Shoulder Suit',
  '小西装T': 'Cropped Suit T',
  '小西装S': 'Cropped Suit S',
  '敞夹克': 'Open Jacket',
  '假领子': 'Detachable Collar',
  '一块布': 'Simple Cloth',
  '圣诞25': 'Christmas Dress \'25',
  '黑白泳装': 'B&W Swimsuit',
  '奶牛': 'Cow Outfit',
  '披肩': 'Shawl',
  '斜肩上衣': 'Off-Shoulder Top',
  '时韵S': 'Shiyun Set S',
  '时韵B': 'Shiyun Set B',
  '露胸短袖': 'Open Chest Tee',
  '洋装': 'Western Dress',
  '白色礼服': 'White Formal Dress',
  '绛云墨韵旗袍裙': 'Crimson Cloud Ink Qipao',
  '花园连衣裙': 'Garden Dress',
  '花边连衣裙': 'Lace Dress',
  '蕾丝文胸睡裙': 'Lace Bra Nightgown',
  '运动套装top': 'Sports Outfit Top',
  '连体衣': 'Jumpsuit/Bodysuit',
  '连衣裙': 'Simple Dress',
  '透明兔女郎': 'Transparent Bunny Suit',
  '锦云绣雪旗袍': 'Brocade Snow Qipao',
  '长旗袍': 'Long Qipao',
  '露胸胶衣': 'Open Chest Latex',
  '女仆围裙': 'Maid Apron',
  '女仆围裙2': 'Maid Apron 2',
  '女仆装': 'Maid Outfit',
  '女仆装2': 'Maid Outfit 2',
  '女仆装3': 'Maid Outfit 3',
  '女仆装4': 'Maid Outfit 4',
  '长裙': 'Long Skirt',
  '羽毛内衣': 'Feather Lingerie',
  '乳贴1': 'Nipple Pasties 1',
  '乳贴2': 'Nipple Pasties 2',
  '创口贴': 'Bandage/Plaster',
  '皮革兔女郎镂空内衣': 'Leather Hollow Bunny Bra',
  '绷带全身': 'Full Body Bandage',
  '塑身衣1': 'Shapewear 1',
  '女仆胸罩': 'Maid Bra',
  '乳胶衣': 'Latex Bodysuit',
  '马油袜': 'Horse Oil Stockings Top',
  '乳胶紧身衣': 'Latex Catsuit 2',
  '束腰': 'Waist Cincher',
  '两侧镂空瑜伽裤': 'Side Cut-Out Yoga Pants',
  '半开百褶裙': 'Half-Open Pleated Skirt',
  '牛仔裤': 'Jeans',
  '皮革中空短裙': 'Leather Hollow Miniskirt',
  '裙': 'Skirt',
  '裙子': 'Skirt 2',
  '裙子2': 'Skirt 3',
  '运动套装bottom': 'Sports Outfit Bottom',
  '运动套装skirt': 'Sports Outfit Skirt',
  '迷你裤': 'Mini Shorts',
  '铅笔裙2': 'Pencil Skirt 2',
  '黑曜蝶翼裙': 'Obsidian Butterfly Skirt',
  '塑身衣2': 'Shapewear 2',
  '瑜伽裤': 'Yoga Pants',
  '蕾丝裤': 'Lace Pants',
  '裤子1': 'Pants 1',
  '马油袜下': 'Horse Oil Stockings Bottom',
  '丝袜': 'Silk Stockings',
  '猫袜': 'Cat Stockings',
  '珍珠带': 'Pearl Strap',
  '淫纹': 'Lewd Tattoo/Mark',
  '丝袜2': 'Silk Stockings 2',
  '丝袜3': 'Silk Stockings 3',
  '条纹袜': 'Striped Socks',
  '条纹袜2': 'Striped Socks 2',
  '网袜': 'Fishnet Socks',
  '荷叶边袜': 'Ruffle Socks',
  '袜套': 'Leg Warmers',
  '踩脚袜': 'Stirrup Socks',
  '露趾袜': 'Open-Toe Socks',
  '绷带': 'Bandage Wrap',
  '脚趾甲': 'Toenails',
  '脚趾戒指': 'Toe Ring',
  '兽蹄鞋': 'Beast Hoof Shoes',
  '凉鞋': 'Sandals',
  '洞洞鞋': 'Croc-style Shoes',
  '厚拖': 'Platform Slippers',
  '拖鞋': 'Slippers',
  '灰姑娘': 'Cinderella Heels',
  '玛丽珍皮鞋': 'Mary Jane Shoes',
  '绑带鞋': 'Lace-Up Shoes',
  '鱼嘴高跟鞋': 'Peep-Toe Heels',
  '拉链皮靴': 'Zipper Leather Boots',
  'NPC气泡': 'NPC Speech Bubble',
  '桂冠': 'Laurel Crown',
  '羽翼头饰': 'Wing Headpiece',
  '女巫帽子': 'Witch Hat 2',
  '冕旒': 'Emperor Crown',
  '狐狸面具': 'Fox Mask (Hat)',
  '帽子2': 'Hat 2',
  '斗笠1': 'Bamboo Hat 1',
  '斗笠2': 'Bamboo Hat 2',
  '医用眼罩左': 'Medical Eyepatch Left',
  '医用眼罩右': 'Medical Eyepatch Right',
  '单边眼镜左': 'Monocle Left',
  '单边眼镜右': 'Monocle Right',
  '眼镜卡': 'Glasses Clip',
  '爱心眼镜': 'Heart Glasses',
  '下半框眼镜': 'Half-Rim Glasses',
  '色散墨镜': 'Chromatic Sunglasses',
  '墨镜A': 'Sunglasses A',
  '羽翼眼罩': 'Wing Eye Mask',
  'X眼罩': 'X Eye Mask',
  '乳胶眼罩': 'Latex Eye Mask',
  '乳胶眼罩2': 'Latex Eye Mask 2',
  '乳胶口罩': 'Latex Face Mask',
  '时尚口罩': 'Fashion Face Mask',
  '嘴笼': 'Muzzle',
  '运动套装ha': 'Sports Outfit Headband',
  '茉莉花钿1': 'Jasmine Forehead Jewel 1',
  '茉莉花钿2': 'Jasmine Forehead Jewel 2',
  '发卡1': 'Hair Clip 1',
  '发卡2': 'Hair Clip 2',
  'X发卡': 'X Hair Clip',
  '心型发卡': 'Heart Hair Clip',
  '星星发卡': 'Star Hair Clip',
  '星星发卡2': 'Star Hair Clip 2',
  '月亮发饰': 'Moon Hair Ornament',
  '蝴蝶': 'Butterfly Hair Acc.',
  '蝴蝶2': 'Butterfly Hair Acc. 2',
  '蝙蝠翼发卡': 'Bat Wing Hair Clip',
  '天线': 'Antenna',
  '眉心坠': 'Brow Pendant',
  '蝴蝶结头饰小': 'Small Bow Headpiece',
  '蝴蝶结头饰大': 'Large Bow Headpiece',
  '铜钱簪': 'Copper Coin Hairpin',
  '树叶发饰': 'Leaf Hair Ornament',
  '金属发卡': 'Metal Hair Clip',
  '耳朵1': 'Ears Style 1',
  '耳朵2': 'Ears Style 2',
  '精灵耳2': 'Elf Ears 2',
  '小马耳2': 'Pony Ears 2',
  '鱼鳍耳朵': 'Fish Fin Ears',
  '耷拉下来的耳朵': 'Droopy Ears',
  '黑猫耳镜像': 'Black Cat Ears (Mirror)',
  '书包': 'School Bag / Restraint',
  '二胡': 'Erhu',
  '把手': 'Handle',
  '肩章': 'Epaulettes',
  '蝴蝶结背饰': 'Bow Back Decoration',
  '蝴蝶结装饰': 'Bow Decoration',
  '踝链A': 'Anklet A',
  '踝链B': 'Anklet B',
  '踝链C': 'Anklet C',
  '项链A': 'Necklace A',
  '围脖': 'Neck Warmer/Snood',
  '女巫小披肩': 'Witch Mini Cape',
  '披肩短': 'Short Cape',
  '披肩长': 'Long Cape',
  '立领披肩': 'Stand-Collar Cape',
  '白色礼服丝巾': 'White Formal Scarf',
  '运动套装nl': 'Sports Outfit Necklace',
  '围裙': 'Apron',
  '拐杖': 'Walking Cane',
  '电吉他': 'Electric Guitar',
  '铃铛C': 'Bell C',
  '枪套': 'Holster',
  'X腿带': 'X Leg Strap',
  '花边腿环': 'Lace Leg Ring',
  '蕾丝边': 'Lace Edge',
  '袜子蝴蝶结': 'Sock Bow',
  '花边大腿环': 'Lace Thigh Ring',
  '身体论文': 'Body Essay',
  '尾巴1': 'Tail Style 1',
  '尾巴2': 'Tail Style 2',
  '尾巴3': 'Tail Style 3',
  '雪豹尾巴': 'Snow Leopard Tail',
  '雪豹尾巴镜像': 'Snow Leopard Tail (Mirror)',
  '鱼尾1': 'Fish Tail 1',
  '鱼尾2': 'Fish Tail 2',
  '蝎子尾巴': 'Scorpion Tail',
  '穿戴式狗尾镜像': 'Wearable Dog Tail (M)',
  '白色穿戴式狼尾镜像': 'White Wolf Tail (M)',
  '穿戴式浅色猫尾镜像': 'Light Cat Tail (M)',
  '穿戴式软小狗尾镜像': 'Soft Puppy Tail (M)',
  '大型穿戴式狼尾镜像': 'Large Wolf Tail (M)',
  '小型穿戴式狼尾镜像': 'Small Wolf Tail (M)',
  '小型穿戴式软猫尾镜像': 'Small Soft Cat Tail (M)',
  '穿戴式浣熊尾镜像': 'Raccoon Tail (M)',
  '穿戴式猫尾镜像': 'Cat Tail (M)',
  '蛇身': 'Snake Body',
  '蜘蛛': 'Spider Body',
  '翅膀1': 'Wings Style 1',
  '翅2': 'Wings Style 2',
  '翅3': 'Wings Style 3',
  '刻度尺': 'Ruler Markings',
  '咬痕': 'Bite Marks',
  '大纹身': 'Large Tattoo',
  '标志纹饰': 'Logo Tattoo',
  '番茄酱': 'Ketchup',
  '花钿': 'Flower Jewel',
  '面部妆容': 'Face Makeup',
  '面部妆容1': 'Face Makeup 2',
  '小丑面妆': 'Clown Face Paint',
  '义肢拘束A': 'Prosthetic Arm Restraint A',
  '全身条带拘束': 'Full Body Strap Restraint',
  '拘束抱枕': 'Restraint Pillow',
  '花边手环': 'Lace Wrist Cuff',
  '举手杆': 'Arm-Raising Bar',
  '乳胶宠物拘束服': 'Latex Pet Restraint Suit',
  '充气式拘束袋': 'Inflatable Restraint Bag',
  '宠物服上': 'Pet Suit Upper',
  '简单绳': 'Simple Rope',
  '鬼手': 'Ghost Hands',
  '义肢拘束L': 'Prosthetic Leg Restraint',
  '电击器': 'Electric Shocker',
  '绳子': 'Rope',
  '分膝杆': 'Knee Spreader Bar',
  '宠物服下': 'Pet Suit Lower',
  '膝上过夜束缚器': 'Above-Knee Overnight Restraint',
  '绷带头部': 'Head Bandage',
  '义肢拘束H': 'Prosthetic Head Restraint',
  '毛毯头部': 'Blanket Hood',
  '麻袋': 'Burlap Sack',
  '乳胶头套': 'Latex Hood 2',
  '狗机仆头套': 'Robot Maid Hood',
  '汉堡头套': 'Hamburger Hood',
  '便携乳泵': 'Portable Breast Pump',
  '胶带全身': 'Full Body Tape',
  '睡袋改': 'Sleeping Bag (Modified)',
  '全包毛毯改': 'Full Wrap Blanket (Mod)',
  '全包毛毯': 'Full Wrap Blanket',
  '可移动玻璃柜': 'Portable Display Case',
  '尿袋': 'Urine Bag',
  '托盘': 'Serving Tray',
  '拘束套装': 'Restraint Suit Set',
  '触手服': 'Tentacle Suit',
  '鞍': 'Saddle',
  '缰绳': 'Reins',
  '南瓜马具口塞': 'Pumpkin Harness Gag',
  '蛋糕卷': 'Swiss Roll Gag',
  '棒棒糖': 'Lollipop',
  '烤鱼': 'Grilled Fish',
  '鸡腿': 'Chicken Leg',
  '煎包': 'Pan-Fried Bun',
  '曲奇': 'Cookie',
  '吐司': 'Toast',
  '蛋挞': 'Egg Tart',
  '月饼': 'Mooncake',
  '大号拉珠': 'Large Anal Beads',
  '肛鞭': 'Anal Whip',
  '哥布哥布': 'Goblin Leash',
  '栓柱': 'Tethering Post',
  '监控机器人': 'Surveillance Robot',
  '玩偶': 'Doll',
  '南瓜盆': 'Pumpkin Bowl',
  '斩标': 'Execution Mark',
  '扛起来的麻袋': 'Carried Burlap Sack',
  '抓住推车': 'Holding Cart',
  '抓住行李箱': 'Holding Suitcase',
  '抓住硬壳行李箱': 'Holding Hard Suitcase',
  '抓住宠物箱': 'Holding Pet Carrier',
  '拉紧的牵绳': 'Taut Leash',
  '拉紧的链子': 'Taut Chain',
  '贴贴': 'Sticker/Patch',
  '宠物箱': 'Pet Carrier Box',
  '猪猪': 'Piggy Device',
  '硬壳行李箱': 'Hard Shell Suitcase',
  '窝瓜': 'Pumpkin/Squash Device',
  '纸箱': 'Cardboard Box',
  '行李箱': 'Suitcase',
  '马车固定': 'Carriage Restraint',
  '马车': 'Carriage/Cart',
  '乳胶带床': 'Latex Strap Bed',
  '垃圾桶': 'Trash Can',
  '床左边': 'Bed Left Side',
  '床右边': 'Bed Right Side',
  '巨型玩偶': 'Giant Doll',
  '开腿展示架': 'Spread-Leg Display Stand',
  '拳击袋': 'Punching Bag',
  '木狗屋': 'Wooden Dog House',
  '架子鼓': 'Drum Kit',
  '树': 'Tree',
  '正坐椅': 'Seiza Chair',
  '正坐椅L': 'Seiza Chair L',
  '独角兽玩偶': 'Unicorn Doll',
  '玻璃罐子': 'Glass Jar',
  '铁架台': 'Iron Frame Stand',
  '单监': 'Single Monitor',
  '奶贩': 'Milk Vendor',
  '后背': 'Back Attachment',
  '隐形药水': 'Invisibility Potion',
  '裸空间': 'Naked Space',
  '调整高度': 'Height Adjustment',
  '被子左边': 'Duvet Left Side',
  '被子右边': 'Duvet Right Side',
  '香肠': 'Sausage',
  '阿巴阿巴': 'Abba Abba (Plush)',
  '折扇': 'Folding Fan',
  '油纸伞': 'Oiled Paper Umbrella',
  '刀': 'Knife/Sword',
  '分层剑': 'Layered Sword',
  '巧克力': 'Chocolate',
  '电蚊拍': 'Electric Mosquito Racket',
  '书': 'Book',
  '奶瓶': 'Baby Bottle',
  '红包': 'Red Envelope',
  '伊偶': 'Yi Doll',
  '武器组合': 'Weapon Combo',
  '杯饮': 'Cup Drink',
  '笔记本电脑': 'Laptop',
  '糖果手杖': 'Candy Cane',
  '汉堡': 'Hamburger',
  '奶茶': 'Bubble Tea',
  '榨汁枪': 'Juice Gun',
  '警棍': 'Police Baton',
  '更多有线跳蛋': 'More Wired Vibrating Eggs',
  '内套': 'Inner Sleeve',
  '乳夹': 'Nipple Clamps 3',
  '铃铛P': 'Bell Piercing',
  '穿环胸牌': 'Piercing Chest Badge',
  '短穿环': 'Short Piercing Bar',
  '贯穿穿刺': 'Through Piercing',
  '人偶': 'Puppet/Mannequin',
  '幽灵人形': 'Ghost Form',
  '生化人体': 'Bionic Body',
  '透明身体': 'Transparent Body',
  '鱼鱼尾': 'Fish Tail Body',
};

function echoTranslate(name) {
  return ECHO_CN_NAMES[name] || null;
}

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
let CACHE   = {};
let CURRENT = null;
window._BCCurrent = () => CURRENT; // expose for bot tab

let dimMode      = {};
let dimSelected  = {};
let dimSubProps  = {};
let globalPropVals = {};
let colorIsDefault = {};  // i → true wenn "Default" aktiv

let FAVORITES = new Set();
let OUTFIT    = [];

let tightnessOn  = false;
let tightnessVal = 0;

// ── Vibrating state ──────────────────────────────────
let vibratingMode      = 'Off';
let vibratingIntensity = -1;
let vibratingTR        = 0;
let vibratingEffects   = new Set();

// ── Direct options (BallGag) ─────────────────────────
let classicOptionSel = 0;

// ── Baseline / Punishment ────────────────────────────
let baselinePropVals = {};

// ── Outfit Profiles ──────────────────────────────────
let PROFILES = {};
try { PROFILES = JSON.parse(localStorage.getItem('BC_PROFILES_v11') || '{}'); } catch {}

// Build Set of "group::asset" for all profile items — used for Curse-Tab outfit check marks
function _buildProfileOutfitLookup() {
  const set = new Set();
  for (const p of Object.values(PROFILES)) {
    for (const item of (p.items || [])) {
      if (item.group && item.asset) set.add(item.group + '::' + item.asset);
    }
  }
  return set;
}


// ── Init ─────────────────────────────────────────────
try {
  const fav = localStorage.getItem('BC_FAVORITES_v9');
  if (fav) FAVORITES = new Set(JSON.parse(fav));
} catch {}

// ══════════════════════════════════════════════════════
//  CACHE
// ══════════════════════════════════════════════════════
function showImport() {
  document.getElementById('importBox').classList.remove('hidden');
}

async function pasteClipboard() {
  try { document.getElementById('importArea').value = await navigator.clipboard.readText(); }
  catch { alert('Clipboard verweigert – manuell einfügen.'); }
}

function loadCache() {
  const raw   = document.getElementById('importArea').value.trim();
  const errEl = document.getElementById('importError');
  try {
    const data  = JSON.parse(raw);
    const items = Object.values(data).reduce((s,g) => s + Object.keys(g).length, 0);
    if (items === 0) throw new Error('Kein gültiger BC-Cache');
    CACHE = data;
    try { localStorage.setItem('BC_CACHE_v11', raw); } catch {}
    errEl.classList.add('hidden');
    document.getElementById('importBox').classList.add('hidden');
    document.getElementById('importArea').value = '';
    const modCount = Object.values(data).flatMap(g => Object.values(g)).filter(i => i.isModular).length;
    document.getElementById('cacheInfo').textContent =
      `${items} Items | ${Object.keys(data).length} Gruppen${modCount ? ` | 🧩 ${modCount} Modular` : ''}`;
    document.getElementById('clearBtn').classList.remove('hidden');
    document.getElementById('outfitBtn')?.classList.remove('hidden');
    document.getElementById('profileBtn')?.classList.remove('hidden');
    renderGroups();
    showEmpty();
  } catch(e) {
    errEl.textContent = '❌ ' + e.message;
    errEl.classList.remove('hidden');
  }
}

// clearCache defined in BC comms block

// [auto-load moved to BC comms block below]

// ══════════════════════════════════════════════════════
//  SIDEBAR & FAVORITES
// ══════════════════════════════════════════════════════
function favKey(g, n) { return `${g}::${n}`; }

function toggleFav(group, name, e) {
  e.stopPropagation();
  const k = favKey(group, name);
  if (FAVORITES.has(k)) FAVORITES.delete(k);
  else FAVORITES.add(k);
  try { localStorage.setItem('BC_FAVORITES_v9', JSON.stringify([...FAVORITES])); } catch {}
  renderGroups(document.querySelector('.sidebar-search')?.value || '');
}

function renderGroups(filter = '') {
  const fl = filter.toLowerCase();

  // Favoriten
  const favEl   = document.getElementById('favSection');
  const favList = document.getElementById('favList');
  const favItems = [...FAVORITES].filter(k => {
    const [g,n] = k.split('::');
    return CACHE[g]?.[n] && (!fl || n.toLowerCase().includes(fl) || g.toLowerCase().includes(fl));
  });
  favEl.classList.toggle('hidden', favItems.length === 0);
  favList.innerHTML = '';
  favItems.forEach(k => {
    const [g,n] = k.split('::');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <button class="item-btn${CURRENT?.asset===n&&CURRENT?.group===g?' active':''}" onclick="selectItem('${g}','${n}')">${n}${echoTranslate(n)?'<span style="display:block;font-size:.57rem;color:#a78bfa;line-height:1.1;pointer-events:none">'+echoTranslate(n)+'</span>':''}</button>
      <button class="star-btn fav" onclick="toggleFav('${g}','${n}',event)" title="Favorit entfernen">⭐</button>`;
    favList.appendChild(row);
  });

  // Gruppen
  const container = document.getElementById('groupsList');
  container.innerHTML = '';
  for (const group in CACHE) {
    const names = Object.keys(CACHE[group]).filter(n =>
      !fl || n.toLowerCase().includes(fl) || group.toLowerCase().includes(fl));
    if (!names.length) continue;
    const wrap    = document.createElement('div');
    const hdr     = document.createElement('div');
    hdr.className = 'group-hdr' + (fl ? ' open' : '');
    hdr.innerHTML = `<span>${group}</span><span style="font-size:.62rem;color:var(--text3)">${names.length}</span>`;
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'group-items' + (fl ? ' open' : '');
    hdr.onclick = () => { hdr.classList.toggle('open'); itemsDiv.classList.toggle('open'); };
    wrap.append(hdr, itemsDiv);
    names.forEach(name => {
      const isFav = FAVORITES.has(favKey(group, name));
      const row   = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <button class="item-btn${CURRENT?.asset===name&&CURRENT?.group===group?' active':''}" id="ib_${group}_${name}" onclick="selectItem('${group}','${name}')">${name}${echoTranslate(name)?'<span style="display:block;font-size:.57rem;color:#a78bfa;line-height:1.1;pointer-events:none">'+echoTranslate(name)+'</span>':''}</button>
        <button class="star-btn${isFav?' fav':''}" onclick="toggleFav('${group}','${name}',event)" title="${isFav?'Favorit entfernen':'Zu Favoriten'}">${isFav?'⭐':'☆'}</button>`;
      itemsDiv.appendChild(row);
    });
    container.appendChild(wrap);
  }
}

// ══════════════════════════════════════════════════════
//  ITEM AUSWÄHLEN
// ══════════════════════════════════════════════════════
function selectItem(group, asset) {
  const cfg = CACHE[group]?.[asset];
  if (!cfg) return;
  CURRENT = { group, asset, cfg };
  dimMode = {}; dimSelected = {}; dimSubProps = {}; globalPropVals = {};
  colorIsDefault = {};
  tightnessOn = false; tightnessVal = 0;
  vibratingMode = 'Off'; vibratingIntensity = -1; vibratingTR = 0; vibratingEffects = new Set(['Egged']);
  classicOptionSel = 0; baselinePropVals = {};

  for (const key in (cfg.typeKeys || {})) {
    dimMode[key]     = 'single';
    dimSelected[key] = new Set([0]);
    dimSubProps[key] = {};
    (cfg.typeKeys[key] || []).forEach((_, i) => { dimSubProps[key][i] = {}; });
  }

  buildConfigurator();
  renderGroups(document.querySelector('.sidebar-search')?.value || '');
}

function showEmpty() {
  document.getElementById('configurator').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
}

// ══════════════════════════════════════════════════════
//  KONFIGURATOR AUFBAUEN
// ══════════════════════════════════════════════════════
function buildConfigurator() {
  const { cfg } = CURRENT;
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('configurator').classList.remove('hidden');
  buildModules();
  buildDirectOptions();
  buildVibrating();
  buildBaselinePropsUI();
  buildColors();
  buildTightness();
  buildGlobalPropsUI();

  const sel = document.getElementById('craftProp');
  sel.innerHTML = '';
  (cfg.allowedCraftProps?.length ? cfg.allowedCraftProps : ['Normal'])
    .forEach(p => { const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
  document.getElementById('craftName').value = '';
  document.getElementById('craftDesc').value = '';
  document.getElementById('lockType').value  = '';
  onLockChange();
  generate();
}

// ── MODULE ─────────────────────────────────────────
function buildModules() {
  const { cfg, asset } = CURRENT;
  const grid    = document.getElementById('moduleGrid');
  grid.innerHTML = '';
  const dimKeys  = Object.keys(cfg.typeKeys || {});
  document.getElementById('moduleSection').classList.toggle('hidden', dimKeys.length === 0);
  if (!dimKeys.length) return;

  const badge = document.createElement('div');
  badge.className = `arch-badge ${cfg.isModular ? 'modular' : 'classic'}`;
  badge.textContent = cfg.isModular ? '🧩 Modular Archetype' : '📋 TypeRecord';
  grid.appendChild(badge);

  dimKeys.forEach(key => {
    const opts    = cfg.typeKeys[key] || [];
    const modName = cfg.moduleNames?.[key] || key;
    const block   = document.createElement('div');
    block.className = 'dim-block';
    block.innerHTML = `<div class="dim-hdr">
      <span class="key-badge">${key}</span>
      <span class="dim-title">${modName} <span style="color:var(--text3);font-size:.66rem">(${opts.length} Optionen)</span></span>
      <label class="multi-toggle">
        <input type="checkbox" id="multi_${key}" onchange="toggleMulti('${key}')"> Multi
      </label></div>
    <div class="dim-opts" id="opts_${key}"></div>`;
    grid.appendChild(block);
    renderDimOpts(key);
  });
}

function renderDimOpts(key) {
  const { cfg } = CURRENT;
  const opts = cfg.typeKeys[key] || [];
  const container = document.getElementById(`opts_${key}`);
  container.innerHTML = '';

  opts.forEach((opt, idx) => {
    const isSel      = dimSelected[key].has(idx);
    const configProps = getPropsForOpt(cfg, key, idx);

    const badges = [
      ...(opt.effect||[]).map(e => `<span class="b e">⬤ ${e}</span>`),
      ...(opt.block ||[]).map(b => `<span class="b bl">⬤ ${b}</span>`),
      ...(opt.hide  ||[]).map(h => `<span class="b y">👁 ${h}</span>`),
      ...(opt.intensity != null ? [`<span class="b p">I:${opt.intensity}</span>`] : []),
      ...(opt.inflate   != null ? [`<span class="b p">↑${opt.inflate}</span>`] : []),
      ...(opt.shock     != null ? [`<span class="b bl">⚡${opt.shock}</span>`] : []),
    ].join('');

    const infoItems = [];
    if (opt.effect?.length)    infoItems.push(`<span class="sub-info-label">Effekte:</span>` + opt.effect.map(e=>`<span class="b e">${e}</span>`).join(''));
    if (opt.block?.length)     infoItems.push(`<span class="sub-info-label">Blockiert:</span>` + opt.block.map(b=>`<span class="b bl">${b}</span>`).join(''));
    if (opt.hide?.length)      infoItems.push(`<span class="sub-info-label">Versteckt:</span>` + opt.hide.map(h=>`<span class="b y">${h}</span>`).join(''));
    if (opt.hideItem?.length)  infoItems.push(`<span class="sub-info-label">HideItem:</span>` + opt.hideItem.map(h=>`<span class="b gr">${h}</span>`).join(''));
    if (opt.prereq?.length)    infoItems.push(`<span class="sub-info-label">Voraussetzung:</span>` + opt.prereq.map(p=>`<span class="b p">${p}</span>`).join(''));
    if (opt.intensity  != null) infoItems.push(`<span class="b p">Intensity: ${opt.intensity}</span>`);
    if (opt.inflate    != null) infoItems.push(`<span class="b p">InflateLevel: ${opt.inflate}</span>`);
    if (opt.shock      != null) infoItems.push(`<span class="b bl">ShockLevel: ${opt.shock}</span>`);
    if (opt.desc)               infoItems.push(`<span style="font-size:.66rem;color:var(--text3)">${opt.desc}</span>`);

    const subInfoHtml = infoItems.length ? infoItems.map(i => `<div class="sub-info">${i}</div>`).join('') : '';

    let subPropsHtml = '';
    if (configProps.length > 0) {
      subPropsHtml = `<div style="font-size:.65rem;color:var(--text3);margin:5px 0 3px">Konfigurierbare Properties:</div>
        <div class="sub-props">` +
        configProps.map(prop => {
          const id    = `sp_${key}_${idx}_${prop}`;
          const cur   = dimSubProps[key]?.[idx]?.[prop];
          const isBool = /^(Show|Punish|Enable|Allow|Has|Is|Can|Auto|Block)/.test(prop);
          const isNum  = /Level|Count|Timer|Num|Max|Min|Amount|Delay|Duration|Speed/.test(prop);
          if (isBool) return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <select onchange="setSubProp('${key}',${idx},'${prop}',this.value)">
                <option value="null"${cur==null?' selected':''}>– nicht setzen –</option>
                <option value="true"${cur===true?' selected':''}>true</option>
                <option value="false"${cur===false?' selected':''}>false</option>
              </select></div>`;
          if (isNum) return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <div class="sub-inline">
                <input type="checkbox" id="${id}_en"${cur!=null?' checked':''}
                  onchange="setSubPropN('${key}',${idx},'${prop}',this.checked,document.getElementById('${id}').value)">
                <input type="number" id="${id}" value="${cur??0}"
                  oninput="if(document.getElementById('${id}_en').checked)setSubPropN('${key}',${idx},'${prop}',true,this.value)">
              </div></div>`;
          return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <div class="sub-inline">
                <input type="checkbox" id="${id}_en"${cur!=null?' checked':''}
                  onchange="setSubPropS('${key}',${idx},'${prop}',this.checked,document.getElementById('${id}').value)">
                <input type="text" id="${id}" value="${cur??''}" placeholder="Wert"
                  oninput="if(document.getElementById('${id}_en').checked)setSubPropS('${key}',${idx},'${prop}',true,this.value)">
              </div></div>`;
        }).join('') + '</div>';
    }

    const hasSubContent = infoItems.length > 0 || configProps.length > 0;
    const subHtml = hasSubContent ? `<div class="opt-sub">${subInfoHtml}${subPropsHtml}</div>` : '';

    const row = document.createElement('div');
    row.className = 'opt-row' + (isSel ? ' sel' : '');
    row.id = `optrow_${key}_${idx}`;
    row.innerHTML = `
      <div class="opt-hdr">
        <input type="checkbox" class="opt-check" ${isSel?'checked':''}>
        <span class="opt-idx">[${idx}]</span>
        <span class="opt-name">${opt.name}</span>
        <div class="opt-badge-row">${badges}</div>
      </div>
      ${subHtml}`;
    row.querySelector('.opt-hdr').addEventListener('click', () => toggleOpt(key, idx));
    container.appendChild(row);
  });
}

function toggleMulti(key) {
  const isMulti = document.getElementById(`multi_${key}`).checked;
  dimMode[key] = isMulti ? 'multi' : 'single';
  if (!isMulti) {
    const first = [...dimSelected[key]].sort((a,b)=>a-b)[0] ?? 0;
    dimSelected[key] = new Set([first]);
  }
  renderDimOpts(key);
  generate();
}

function toggleOpt(key, idx) {
  if (dimMode[key] === 'single') {
    dimSelected[key] = new Set([idx]);
  } else {
    if (dimSelected[key].has(idx)) {
      dimSelected[key].delete(idx);
      if (dimSelected[key].size === 0) dimSelected[key].add(0);
    } else {
      dimSelected[key].add(idx);
    }
  }
  renderDimOpts(key);
  generate();
}

function setSubProp(key, idx, prop, raw)        { dimSubProps[key][idx][prop] = raw==='null'?null:raw==='true'; generate(); }
function setSubPropN(key, idx, prop, en, raw)   { dimSubProps[key][idx][prop] = en?(parseInt(raw)||0):null; generate(); }
function setSubPropS(key, idx, prop, en, val)   { dimSubProps[key][idx][prop] = en?val:null; generate(); }

// ── FARBEN ─────────────────────────────────────────
function buildColors() {
  const { cfg } = CURRENT;
  const grid = document.getElementById('colorGrid');
  grid.innerHTML = '';
  const n    = cfg.colorCount || 1;
  const defs = cfg.defaultColors || [];

  for (let i = 0; i < n; i++) {
    const name       = cfg.layerNames?.[i] || `Layer ${i+1}`;
    const def        = defs[i] || 'Default';
    const isDefault  = !def || def === 'Default' || def === 'default';
    const hasKnown   = /^#[0-9a-fA-F]{6}$/.test(def);
    colorIsDefault[i] = isDefault;

    const div = document.createElement('div');
    div.className = 'color-item' + (isDefault ? ' is-default' : '');
    div.id = `ci_${i}`;

    if (hasKnown) {
      // Echte Hex-Farbe aus dem Asset → direkt anzeigen
      div.innerHTML = `
        <label>${name}</label>
        <div class="color-row">
          <input type="color" id="color_${i}" value="${def}"
            title="Asset-Standard: ${def}" oninput="onColorChange(${i})">
          <button class="color-default-btn" onclick="resetColor(${i})" title="Auf Standard zurücksetzen">↺</button>
        </div>`;
    } else {
      // Kein Hex bekannt → neutraler Platzhalter, Custom-Color auf Wunsch
      div.innerHTML = `
        <label>${name} <span style="color:var(--text3);font-size:.6rem">(BC-Standard)</span></label>
        <div class="color-row">
          <div id="ci_placeholder_${i}" style="flex:1;height:26px;border:1px dashed var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.65rem;color:var(--text3)" title="Klicken um eigene Farbe zu setzen" onclick="activateColorPicker(${i})">
            + Farbe setzen
          </div>
          <input type="color" id="color_${i}" value="#808080" style="display:none" oninput="onColorChange(${i})">
          <button class="color-default-btn" id="ci_reset_${i}" style="display:none" onclick="resetColor(${i})" title="Auf BC-Standard zurücksetzen">↺</button>
        </div>`;
    }
    grid.appendChild(div);
  }
}

function activateColorPicker(i) {
  const el   = document.getElementById(`color_${i}`);
  const ph   = document.getElementById(`ci_placeholder_${i}`);
  const rst  = document.getElementById(`ci_reset_${i}`);
  if (!el) return;
  el.style.display = '';
  el.style.flex = '1';
  if (ph)  ph.style.display  = 'none';
  if (rst) rst.style.display = '';
  el.click(); // Picker direkt öffnen
}

function onColorChange(i) {
  colorIsDefault[i] = false;
  const el  = document.getElementById(`color_${i}`);
  const ci  = document.getElementById(`ci_${i}`);
  const ph  = document.getElementById(`ci_placeholder_${i}`);
  const rst = document.getElementById(`ci_reset_${i}`);
  ci.classList.remove('is-default');
  const lbl = ci.querySelector('label');
  const name = CURRENT.cfg.layerNames?.[i] || `Layer ${i+1}`;
  lbl.textContent = name;
  // Platzhalter ausblenden, echten Picker + Reset zeigen
  if (ph)  ph.style.display  = 'none';
  el.style.display = '';
  el.style.flex    = '1';
  if (rst) rst.style.display = '';
  generate();
}

function resetColor(i) {
  const def     = CURRENT.cfg.defaultColors?.[i] || 'Default';
  const isDefault = !def || def === 'Default';
  const hasKnown  = /^#[0-9a-fA-F]{6}$/.test(def);
  colorIsDefault[i] = isDefault;
  const el = document.getElementById(`color_${i}`);
  const ci = document.getElementById(`ci_${i}`);
  if (hasKnown) {
    el.value = def;
    el.classList.remove('is-default-input');
  } else {
    // Platzhalter wiederherstellen
    el.value = '#808080';
    el.style.display = 'none';
    const ph  = document.getElementById(`ci_placeholder_${i}`);
    const rst = document.getElementById(`ci_reset_${i}`);
    if (ph)  ph.style.display  = '';
    if (rst) rst.style.display = 'none';
  }
  ci.classList.toggle('is-default', isDefault);
  const name = CURRENT.cfg.layerNames?.[i] || `Layer ${i+1}`;
  ci.querySelector('label').innerHTML = name
    + (isDefault ? ' <span style="color:var(--text3);font-size:.6rem">' + (hasKnown ? '' : '(BC-Standard)') + '</span>' : '');
  generate();
}

function resetAllColors() {
  const n = CURRENT.cfg.colorCount || 1;
  for (let i = 0; i < n; i++) resetColor(i);
}

function getColors() {
  const n = CURRENT.cfg.colorCount || 1;
  return Array.from({length:n}, (_,i) => {
    if (colorIsDefault[i]) return 'Default';
    const el = document.getElementById(`color_${i}`);
    return el ? el.value : 'Default';
  });
}

// ── TIGHTNESS ──────────────────────────────────────
function buildTightness() {
  const { cfg } = CURRENT;
  // Anzeigen für alle Items (auch Direct-Options wie HarnessBallGag haben Tightness/Difficulty)
  document.getElementById('tightnessSection').classList.remove('hidden');
  const baseDiff = cfg.difficulty ?? 0;
  document.getElementById('tightnessBase').textContent = baseDiff;
  const minVal = baseDiff > 0 ? Math.max(-10, baseDiff - 20) : -10;
  const maxVal = Math.max(50, baseDiff + 30);
  const slider = document.getElementById('tightnessSlider');
  slider.min = minVal;
  slider.max = maxVal;
  slider.value = baseDiff;
  document.getElementById('tightnessMax').textContent = maxVal;
  const minEl = document.getElementById('tightnessMin'); if(minEl) minEl.textContent = minVal;
  document.getElementById('tightnessVal').textContent = baseDiff;
  document.getElementById('tightnessBody').classList.add('hidden');
  document.getElementById('tightnessEnabled').checked = false;
  tightnessOn  = false;
  tightnessVal = baseDiff;
}

function onTightnessToggle() {
  tightnessOn = document.getElementById('tightnessEnabled').checked;
  document.getElementById('tightnessBody').classList.toggle('hidden', !tightnessOn);
  generate();
}

function onTightnessChange() {
  tightnessVal = parseInt(document.getElementById('tightnessSlider').value) || 0;
  document.getElementById('tightnessVal').textContent = tightnessVal;
  generate();
}

// ── DIRECT OPTIONS (BallGag, FuturisticMittens...) ────
function buildDirectOptions() {
  const { cfg } = CURRENT;
  const sec = document.getElementById('directOptsSection');
  const opts = cfg.directOptions;
  sec.classList.toggle('hidden', !opts?.length);
  if (!opts?.length) return;
  classicOptionSel = 0;
  const container = document.getElementById('directOptsBtns');
  container.innerHTML = '';
  opts.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'dir-opt-btn' + (i === 0 ? ' on' : '');
    btn.textContent = name;
    btn.onclick = () => {
      classicOptionSel = i;
      container.querySelectorAll('.dir-opt-btn').forEach((b,j) => b.classList.toggle('on', j === i));
      generate();
    };
    container.appendChild(btn);
  });
  generate();
}

// ── VIBRATING (VibratingEgg, FuturisticTrainingBelt...) ─
function buildVibrating() {
  const { cfg } = CURRENT;
  const sec  = document.getElementById('vibratingSection');
  sec.classList.toggle('hidden', cfg.archetype !== 'vibrating');
  if (cfg.archetype !== 'vibrating') return;

  // BC kombiniert Mode+Intensität in einem einzigen TypeRecord-Wert 0–10
  // Wir zeigen genau dasselbe Grid wie BC intern
  const VIB_OPTIONS = [
    { tr:0,  label:'Off',      mode:'Off',      intensity:-1, group:'intensity' },
    { tr:1,  label:'Low',      mode:'Constant', intensity:0,  group:'intensity' },
    { tr:2,  label:'Medium',   mode:'Constant', intensity:1,  group:'intensity' },
    { tr:3,  label:'High',     mode:'Constant', intensity:2,  group:'intensity' },
    { tr:4,  label:'Maximum',  mode:'Constant', intensity:3,  group:'intensity' },
    { tr:5,  label:'Random',   mode:'Random',   intensity:3,  group:'mode' },
    { tr:6,  label:'Escalate', mode:'Escalate', intensity:3,  group:'mode' },
    { tr:7,  label:'Tease',    mode:'Tease',    intensity:3,  group:'mode' },
    { tr:8,  label:'Deny',     mode:'Deny',     intensity:3,  group:'mode' },
    { tr:9,  label:'Edge',     mode:'Edge',     intensity:3,  group:'mode' },
  ];
  window.__VIB_OPTIONS__ = VIB_OPTIONS;

  // Startzustand: Off
  vibratingMode      = 'Off';
  vibratingIntensity = -1;
  vibratingTR        = 0;

  // Effekte zurücksetzen
  vibratingEffects = new Set(['Egged']);

  // Bestehende Sektionen leeren und neu aufbauen
  const modeGrid = document.getElementById('vibModeGrid');
  const intRow   = document.getElementById('vibIntRow');
  const effRow   = document.getElementById('vibEffRow');
  modeGrid.innerHTML = '';
  intRow.innerHTML   = '';

  // Zeige ALLE Optionen in einem gemeinsamen Grid (wie BC intern)
  const allGrid = modeGrid; // modeGrid als Hauptcontainer
  intRow.style.display = 'none'; // Intensitäts-Reihe ausblenden - nicht mehr separat

  VIB_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'vib-mode-btn' + (opt.tr === 0 ? ' on' : '');
    btn.textContent = opt.label;
    // Gruppe-Indikator für Modi
    if (opt.group === 'mode') btn.style.borderColor = '#312e81';
    btn.onclick = () => {
      vibratingMode      = opt.mode;
      vibratingIntensity = opt.intensity;
      vibratingTR        = opt.tr;
      allGrid.querySelectorAll('.vib-mode-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      generate();
    };
    allGrid.appendChild(btn);
  });

  // Effekt-Buttons
  effRow.innerHTML = '';
  ['Egged','Vibrating','UseRemote','Edged'].forEach(eff => {
    const btn = document.createElement('button');
    btn.className = 'vib-eff-btn' + (['Egged'].includes(eff) ? ' on' : '');
    btn.textContent = eff;
    btn.onclick = () => {
      if (vibratingEffects.has(eff)) vibratingEffects.delete(eff);
      else vibratingEffects.add(eff);
      btn.classList.toggle('on', vibratingEffects.has(eff));
      generate();
    };
    effRow.appendChild(btn);
  });

  generate();
}

// ── BASELINE / PUNISHMENT PROPS ────────────────────────
function buildBaselinePropsUI() {
  const { cfg } = CURRENT;
  const sec      = document.getElementById('baselineSection');
  const baseline = cfg.vibratingInfo?.baselineProps;
  sec.classList.toggle('hidden', !baseline || Object.keys(baseline).length === 0);
  if (!baseline) return;
  baselinePropVals = { ...baseline };  // mit Defaults initialisieren
  const grid = document.getElementById('baselineGrid');
  grid.innerHTML = '';

  const BOOL_PROPS   = ['ShowText','PunishStruggle','PunishStruggleOther','PunishOrgasm','PunishStandup'];
  const NUM_PROPS    = ['PunishSpeech','PunishRequiredSpeech','PunishProhibitedSpeech'];
  const STR_PROPS    = ['PunishRequiredSpeechWord','PunishProhibitedSpeechWords'];
  const PERM_PROPS   = ['PublicModePermission','PublicModeCurrent'];
  const ACCESS_PROPS = ['AccessMode'];
  const TRIGGER_PROPS= ['TriggerValues'];

  function addCard(prop, ctrl) {
    const card = document.createElement('div');
    card.className = 'bl-card';
    card.innerHTML = '<div class="bl-card-label">' + prop.replace(/([A-Z])/g,' $1').trim() + '</div>';
    const wrapper = document.createElement('div');
    wrapper.appendChild(ctrl);
    card.appendChild(wrapper);
    grid.appendChild(card);
  }

  for (const prop of Object.keys(baseline)) {
    const val = baseline[prop];
    if (BOOL_PROPS.includes(prop)) {
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="false">false</option><option value="true">true</option>';
      sel.value = String(val);
      sel.onchange = () => { baselinePropVals[prop] = sel.value === 'true'; generate(); };
      addCard(prop, sel);
    } else if (NUM_PROPS.includes(prop)) {
      // 0=None 1=Shock 2=Orgasm
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="0">0 – None</option><option value="1">1 – Shock</option><option value="2">2 – Orgasm</option>';
      sel.value = String(val);
      sel.onchange = () => { baselinePropVals[prop] = parseInt(sel.value); generate(); };
      addCard(prop, sel);
    } else if (STR_PROPS.includes(prop)) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.value = val ?? '';
      inp.oninput = () => { baselinePropVals[prop] = inp.value; generate(); };
      addCard(prop, inp);
    } else if (PERM_PROPS.includes(prop)) {
      const PERM_LABELS = prop === 'PublicModePermission'
        ? ['0-Private','1-Public','2-Friends','3-Owner','4-Mistress','5-Lover']
        : ['0-None','1-Arousal','2-Vibrate','3-Orgasm','4-Edges','5-Deny','6-Punish'];
      const sel = document.createElement('select');
      sel.innerHTML = PERM_LABELS.map((l,i) => '<option value="'+i+'">'+l+'</option>').join('');
      sel.value = String(val ?? 0);
      sel.onchange = () => { baselinePropVals[prop] = parseInt(sel.value); generate(); };
      addCard(prop, sel);
    } else if (ACCESS_PROPS.includes(prop)) {
      // AccessMode: "" = Immer | "Locked" = Nur wenn gesperrt
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="">Immer (Standard)</option><option value="Locked">Nur wenn gesperrt</option>';
      sel.value = String(val ?? '');
      sel.onchange = () => { baselinePropVals[prop] = sel.value; generate(); };
      addCard(prop, sel);
    } else if (TRIGGER_PROPS.includes(prop)) {
      // TriggerValues: kommagetrennte Checkbox-Liste
      const info = CURRENT.cfg.vibratingInfo;
      const allTriggers = info?.availTriggers ?? (val ? String(val).split(',') : ['Increase','Decrease','Disable','Edge','Random','Deny','Tease','Shock']);
      const active = new Set(val ? String(val).split(',') : allTriggers);
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
      allTriggers.forEach(t => {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:.7rem;color:var(--text2);cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.style.accentColor = 'var(--purple)';
        cb.checked = active.has(t);
        cb.onchange = () => {
          if (cb.checked) active.add(t); else active.delete(t);
          baselinePropVals[prop] = [...active].join(',');
          generate();
        };
        lbl.appendChild(cb);
        lbl.append(t);
        wrap.appendChild(lbl);
      });
      baselinePropVals[prop] = [...active].join(',');
      addCard(prop, wrap);
    } else {
      // fallback: text input
      const inp = document.createElement('input');
      inp.type = typeof val === 'number' ? 'number' : 'text';
      inp.value = val ?? '';
      inp.oninput = () => { baselinePropVals[prop] = typeof val === 'number' ? parseFloat(inp.value) : inp.value; generate(); };
      addCard(prop, inp);
    }
  }
}

// ── GLOBALE PROPS ──────────────────────────────────
const KW_GROUPS = {
  shock:   ['shock','punish','stun','zap','electr'],
  voice:   ['voice','trigger','speech','word'],
  inflate: ['inflate','pump','air','pressure'],
  orgasm:  ['orgasm','edge','ruin','denial'],
  vibe:    ['vibrat','buzz','tease','stimul'],
};

function getPropsForOpt(cfg, dimKey, optIdx) {
  const opt = (cfg.typeKeys[dimKey] || [])[optIdx];
  if (!opt || !cfg.props?.length) return [];
  const nameLow = (opt.name || '').toLowerCase();
  const matched = new Set();
  for (const [, kws] of Object.entries(KW_GROUPS)) {
    if (kws.some(k => nameLow.includes(k))) {
      for (const p of cfg.props) if (kws.some(k => p.toLowerCase().includes(k))) matched.add(p);
    }
  }
  const parts = nameLow.split(/\s+/).filter(w => w.length > 3);
  for (const p of cfg.props) if (parts.some(part => p.toLowerCase().includes(part))) matched.add(p);
  for (const eff of [...(opt.effect||[]),...(opt.block||[])]) {
    for (const p of cfg.props) if (p.toLowerCase().includes(eff.toLowerCase())) matched.add(p);
  }
  return [...matched];
}

function getGlobalProps(cfg) {
  if (!cfg.props?.length) return [];
  const used = new Set();
  for (const key in (cfg.typeKeys||{})) {
    const opts = cfg.typeKeys[key]||[];
    for (let i=0; i<opts.length; i++) for (const p of getPropsForOpt(cfg, key, i)) used.add(p);
  }
  return cfg.props.filter(p => !used.has(p));
}

function buildGlobalPropsUI() {
  const { cfg } = CURRENT;
  const grid    = document.getElementById('propsGrid');
  grid.innerHTML = '';
  const gp = getGlobalProps(cfg);
  document.getElementById('propsSection').classList.toggle('hidden', gp.length === 0);
  if (!gp.length) return;
  document.getElementById('propsHint').textContent = `${gp.length} erkannt`;

  gp.forEach(prop => {
    globalPropVals[prop] = null;
    const isBool = /^(Show|Punish|Enable|Allow|Has|Is|Can|Auto|Block)/.test(prop);
    const isNum  = /Level|Count|Timer|Num|Max|Min|Amount|Delay|Duration|Speed/.test(prop);
    const id     = `gp_${prop}`;
    const card   = document.createElement('div');
    card.className = 'prop-card';
    let ctrl = '';
    if (isBool) {
      ctrl = `<select onchange="globalPropVals['${prop}']=this.value==='null'?null:this.value==='true';generate()">
        <option value="null">– nicht setzen –</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>`;
    } else if (isNum) {
      ctrl = `<input type="checkbox" id="${id}_en" style="accent-color:var(--purple);width:13px;height:13px;flex:none"
          onchange="globalPropVals['${prop}']=this.checked?(parseInt(document.getElementById('${id}').value)||0):null;generate()">
        <input type="number" id="${id}" value="0"
          oninput="if(document.getElementById('${id}_en').checked){globalPropVals['${prop}']=parseInt(this.value)||0;generate();}">`;
    } else {
      ctrl = `<input type="checkbox" id="${id}_en" style="accent-color:var(--purple);width:13px;height:13px;flex:none"
          onchange="globalPropVals['${prop}']=this.checked?(document.getElementById('${id}').value||''):null;generate()">
        <input type="text" id="${id}" value="" placeholder="Wert"
          oninput="if(document.getElementById('${id}_en').checked){globalPropVals['${prop}']=this.value;generate();}">`;
    }
    card.innerHTML = `<div class="prop-name">${prop}</div><div class="prop-ctrl">${ctrl}</div>`;
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════
//  LOCK
// ══════════════════════════════════════════════════════
const REL_LOCKS = ['OwnerPadlock','LoversPadlock','MistressPadlock'];
const BCX_LOCKS = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
const PW_LOCKS  = ['PasswordPadlock','TimerPasswordPadlock'];

function onLockChange() {
  const lock  = document.getElementById('lockType').value;
  const isRel = REL_LOCKS.includes(lock);
  const isBcx = BCX_LOCKS.includes(lock);
  document.getElementById('timerGroup').classList.toggle('hidden',    !lock.includes('Timer') || isRel);
  document.getElementById('comboGroup').classList.toggle('hidden',    lock !== 'CombinationPadlock');
  document.getElementById('passwordGroup').classList.toggle('hidden', !PW_LOCKS.includes(lock));
  document.getElementById('relLockGroup').classList.toggle('hidden',  !isRel);
  document.getElementById('bcxLockHint').classList.toggle('hidden',   !isBcx);
  generate();
}

function onTargetChange() {
  document.getElementById('targetMemberWrap').classList.toggle('hidden',
    document.getElementById('targetMode').value !== 'other');
  generate();
}

function validatePwInput(el) {
  const valid = /^[0-9]{4}$/.test(el.value);
  document.getElementById('pwHint').style.display = (!el.value || valid) ? 'none' : 'block';
  el.style.borderColor = valid || !el.value ? '' : 'var(--red)';
}

// ══════════════════════════════════════════════════════
//  CODE GENERIEREN
// ══════════════════════════════════════════════════════
function generate() {
  if (!CURRENT) return;
  const { group, asset, cfg } = CURRENT;
  const isOther   = document.getElementById('targetMode').value === 'other';
  const memberNum = parseInt(document.getElementById('targetMember')?.value) || 0;

  // TypeRecord (modular + classic TR)
  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...dimSelected[key]].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const hasTypeRecord = Object.keys(tr).length > 0;
  const trStr   = JSON.stringify(tr);
  const typeStr = Object.entries(tr).map(([k,v])=>k+v).join('');
  const colors  = getColors();

  // Sub-props + Global-props
  let propCode = '';
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of dimSelected[key]) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [prop,val] of Object.entries(sp)) {
        if (val!=null) propCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
      }
    }
  }
  for (const [prop,val] of Object.entries(globalPropVals)) {
    if (val!=null) propCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
  }

  // Tightness → item.Difficulty
  const tightCode = tightnessOn ? '\n    item.Difficulty = ' + tightnessVal + ';' : '';

  // Craft
  const craftName = document.getElementById('craftName').value.trim();
  const craftDesc = document.getElementById('craftDesc').value.trim();
  const craftProp = document.getElementById('craftProp').value;
  const firstColor = colors.find(c => c !== 'Default') ?? '#808080';
  const craftStr  = craftName
    ? ',\n  {\n    Name: ' + JSON.stringify(craftName) + ',\n    Description: ' + JSON.stringify(craftDesc) + ',\n    Property: "' + craftProp + '",\n    Color: ' + JSON.stringify(firstColor) + ',\n    Lock: "", Item: ' + JSON.stringify(asset) + ', Private: false, MemberNumber: Player.MemberNumber,\n  }'
    : '';

  // Lock
  const lock   = document.getElementById('lockType').value;
  const isRel  = REL_LOCKS.includes(lock);
  let lockParams = { timer:0, combo:'', password:'', relMember:0, relTimer:0 };
  if (lock) {
    if (lock.includes('Timer')&&!isRel) {
      const h=parseInt(document.getElementById('timerH').value)||0;
      const m=parseInt(document.getElementById('timerM').value)||0;
      const s=parseInt(document.getElementById('timerS').value)||0;
      lockParams.timer=(h*3600+m*60+s)*1000;
    }
    if (lock==='CombinationPadlock') lockParams.combo    = document.getElementById('comboCode').value||'1234';
    if (PW_LOCKS.includes(lock))     lockParams.password = document.getElementById('lockPassword').value||'1234';
    if (isRel) {
      lockParams.relMember=parseInt(document.getElementById('relMemberNum').value)||0;
      lockParams.relTimer=(parseInt(document.getElementById('relTimerH').value)||0)*3600*1000;
    }
  }

  // ── Archetype-spezifischer Code ──────────────────────
  let archetypeCode = '';

  if (cfg.archetype === 'vibrating') {
    // Vibrating: Mode + Intensity + Effects + Baseline props
    // Auto-sync: Vibrating-Effekt nur wenn Mode nicht Off
    const _effClone = new Set(vibratingEffects);
    if (vibratingMode !== 'Off') _effClone.add('Vibrating'); else _effClone.delete('Vibrating');
    const effArr = JSON.stringify([..._effClone]);
    archetypeCode += '\n    // Vibrating-Konfiguration';
    archetypeCode += '\n    item.Property = { ...item.Property, Mode: ' + JSON.stringify(vibratingMode) + ', Intensity: ' + vibratingIntensity + ', Effect: ' + effArr + ' };';
    archetypeCode += '\n    if (!item.Property.TypeRecord) item.Property.TypeRecord = {};';
    archetypeCode += '\n    item.Property.TypeRecord.vibrating = ' + vibratingTR + ';';
    // Baseline/Punishment + AccessMode + TriggerValues
    for (const [prop,val] of Object.entries(baselinePropVals)) {
      if (val === null || val === undefined) continue;
      // Strings in Anführungszeichen, Booleans/Zahlen direkt
      archetypeCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
    }

  } else if (cfg.directOptions?.length) {
    // Classic Direct Options (BallGag, FuturisticMittens): TypedItemSetOptionByName
    const optName = cfg.directOptions[classicOptionSel] ?? cfg.directOptions[0];
    archetypeCode += '\n    // Option setzen via TypedItemSetOptionByName';
    archetypeCode += '\n    TypedItemSetOptionByName(TARGET, item, ' + JSON.stringify(optName) + ');';
    archetypeCode += '\n    item.Color = ' + JSON.stringify(colors) + '; // Farbe erneut setzen (TypedItem überschreibt sie)';

  } else if (hasTypeRecord) {
    // Classic TypeRecord / Modular
    archetypeCode += '\n    item.Property.TypeRecord = ' + trStr + ';\n    item.Property.Type = "' + typeStr + '";';
    archetypeCode += propCode;
  } else {
    archetypeCode += propCode;
  }
  archetypeCode += tightCode;

  // ── Code-String zusammenbauen ────────────────────────
  const code = '// ═══════════════════════════════════════════\n'
    + '//  ' + asset + ' (' + group + ')' + (isOther&&memberNum ? ' → Spieler #'+memberNum : ' → Player') + '\n'
    + '// ═══════════════════════════════════════════\n'
    + buildItemCode({ group, asset, cfg, colors, tr, trStr, typeStr, propCode: archetypeCode, craftStr, lock, lockParams, tightCode:'', isOther, memberNum });

  document.getElementById('codeOut').value = code;

  // Preview
  const archLabel = cfg.archetype==='modular' ? '🧩 Modular' : cfg.archetype==='vibrating' ? '⚡ Vibrating' : (hasTypeRecord?'📋 TypeRecord': cfg.directOptions?.length?'🎛️ Classic-Opts':'');
  document.getElementById('typePreview').innerHTML =
    '<span style="color:var(--text3)">' + group + '</span> → <strong>' + asset + '</strong>' +
    (archLabel ? ' <span style="font-size:.62rem;color:var(--text3)">['+archLabel+']</span>' : '') +
    (cfg.archetype==='vibrating' ? '<br>⚡ Mode: '+vibratingMode+' | Intensity: '+vibratingIntensity : '') +
    (cfg.directOptions?.length ? '<br>🎛️ Option: '+cfg.directOptions[classicOptionSel] : '') +
    (hasTypeRecord && cfg.archetype!=='vibrating' ? '<br>TypeRecord: { '+Object.entries(tr).map(([k,v])=>k+':'+v).join(' ')+' }' : '') +
    (tightnessOn ? '<br>🔧 Difficulty: '+tightnessVal : '') +
    (lock ? '<br>🔒 '+lock : '') +
    '<br>' + (isOther&&memberNum ? '👥 Spieler #'+memberNum : '👤 Player (selbst)');
}


function encVal(val) {
  return typeof val === 'boolean' ? val : typeof val === 'number' ? val : JSON.stringify(val);
}

// ── Innerer Code-Block (ohne TARGET-Deklaration) ────
function buildItemInner({ group, asset, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode, delayOffset,
                          overridePriority, layerProperties, difficulty, property }) {
  const delay = delayOffset ?? 600;
  const BCX_LOCKS_L = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
  const REL_LOCKS_L = ['OwnerPadlock','LoversPadlock','MistressPadlock'];

  // ── Build the full property snapshot ────────────────────────────────────
  // Prefer 'property' (full snapshot from loader). Fall back to legacy fields.
  // We exclude layer-visual props from propB64 so we can set them AFTER ExtendedItemInit.
  // ExtendedItemInit resets LayerProperties → must be set after.
  const fullProp = property ? Object.assign({}, property) : null;
  // Merge legacy fields into fullProp if not already there
  if (!fullProp?.TypeRecord && tr && Object.keys(tr).length) {
    (fullProp ?? {})[0]; // just a guard
  }

  // Properties to apply BEFORE ExtendedItemInit (TypeRecord sets the variant)
  const preProp = {};
  const hasTr = tr && Object.keys(tr).length;
  if (hasTr) {
    preProp.TypeRecord = tr;
    preProp.Type = Object.entries(tr).map(([k,v]) => k+v).join('');
  }
  // Also include non-visual props from fullProp
  if (fullProp) {
    for (const [k,v] of Object.entries(fullProp)) {
      if (k !== 'TypeRecord' && k !== 'Type' && k !== 'OverridePriority' && k !== 'LayerProperties') {
        preProp[k] = v;
      }
    }
  }

  // Properties to apply AFTER ExtendedItemInit (visual layer overrides)
  const postProp = {};
  if (fullProp?.OverridePriority != null) postProp.OverridePriority = fullProp.OverridePriority;
  else if (overridePriority != null)      postProp.OverridePriority = overridePriority;
  if (fullProp?.LayerProperties)          postProp.LayerProperties  = fullProp.LayerProperties;
  else if (layerProperties)               postProp.LayerProperties  = layerProperties;

  const hasPreProp  = Object.keys(preProp).length > 0;
  const hasPostProp = Object.keys(postProp).length > 0;

  const preB64  = hasPreProp  ? btoa(unescape(encodeURIComponent(JSON.stringify(preProp))))  : null;
  const postB64 = hasPostProp ? btoa(unescape(encodeURIComponent(JSON.stringify(postProp)))) : null;

  // ── Lock code ────────────────────────────────────────────────────────────
  let lockCode = '';
  if (lock) {
    const isBcx = BCX_LOCKS_L.includes(lock);
    const isRel = REL_LOCKS_L.includes(lock);
    let extra = '';
    if (lockParams?.timer > 0)    extra += '\n      item.Property.RemoveTimer = Date.now() + ' + lockParams.timer + ';';
    if (lockParams?.combo)         extra += '\n      item.Property.CombinationNumber = ' + JSON.stringify(lockParams.combo) + ';';
    if (lockParams?.password)      extra += '\n      item.Property.Password = ' + JSON.stringify(lockParams.password) + ';';
    if (isRel) {
      extra += '\n      item.Property.LockMemberNumber = ' + (lockParams?.relMember || 'Player.MemberNumber') + ';';
      if (lockParams?.relTimer > 0) extra += '\n      item.Property.RemoveTimer = Date.now() + ' + lockParams.relTimer + ';';
    }
    const findLock = isBcx
      ? 'Asset.find(a => a.Name === ' + JSON.stringify(lock) + ' && a.Group?.Name === "ItemMisc") ?? Asset.find(a => a.Name === ' + JSON.stringify(lock) + ')'
      : 'Asset.find(a => a.Name === ' + JSON.stringify(lock) + ' && a.Group?.Name === "ItemMisc")';
    lockCode = '\n    const lockAsset = ' + findLock + ';\n'
      + '    if (lockAsset) {\n      InventoryLock(TARGET, item, { Asset: lockAsset }, Player.MemberNumber, true);'
      + extra + '\n      CharacterLoadCanvas(TARGET);\n    }';
  }

  // ── Generated code ───────────────────────────────────────────────────────
  let code = '  InventoryWear(TARGET, ' + JSON.stringify(asset) + ', ' + JSON.stringify(group) + ',\n'
    + '    ' + JSON.stringify(colors) + ', 0, null' + (craftStr || '') + '\n  );\n'
    + '  setTimeout(() => {\n'
    + '    const item = InventoryGet(TARGET, ' + JSON.stringify(group) + ');\n'
    + '    if (!item) return console.error("❌ Item nicht gefunden: ' + asset + '");\n'
    + '    item.Color = ' + JSON.stringify(colors) + ';\n'
    + '    item.Property = item.Property ?? {};\n';

  // STEP A: Apply pre-props (TypeRecord etc.) then ExtendedItemInit
  if (preB64) {
    code += '    Object.assign(item.Property, JSON.parse(decodeURIComponent(escape(atob(' + JSON.stringify(preB64) + ')))));\n';
  }
  if (hasTr) {
    code += '    try{ExtendedItemInit(TARGET,item,false,false);}catch(e){}\n';
  }

  // STEP B: Apply post-props (LayerProperties, OverridePriority) AFTER ExtendedItemInit
  // ExtendedItemInit resets these – must be set last
  if (postB64) {
    code += '    Object.assign(item.Property, JSON.parse(decodeURIComponent(escape(atob(' + JSON.stringify(postB64) + ')))));\n';
  }

  // Difficulty
  if (difficulty != null) {
    code += '    item.Difficulty = ' + Number(difficulty) + ';\n';
  }

  // Legacy propCode extra fields (modular archetype etc.)
  const legacyExtra = (propCode || '')
    .replace(/\s*item\.Property\s*=\s*item\.Property\s*\?\?\s*\{\};\s*/g, '')
    .replace(/\s*item\.Property\.(TypeRecord|Type)\s*=.*?;\s*/g, '');
  if (legacyExtra.trim()) code += legacyExtra + '\n';

  code += lockCode + '\n'
    + '    CharacterRefresh(TARGET);\n'
    + '    console.log("✅ ' + asset + ' fertig");\n'
    + '  }, ' + delay + ');';

  return code;
}

// ── Einzelnes Item (mit TARGET-Deklaration + Sync) ──
function buildItemCode({ group, asset, cfg, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode, isOther, memberNum }) {
  const inner = buildItemInner({ group, asset, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode });
  const syncLine = (isOther && memberNum)
    ? 'ChatRoomCharacterUpdate(TARGET);'
    : 'ServerPlayerAppearanceSync(); ChatRoomCharacterUpdate(TARGET);';
  const wrapped = inner + '\n  setTimeout(() => { ' + syncLine + ' }, 700);';
  if (isOther && memberNum) {
    return 'const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === ' + memberNum + ');\n'
      + 'if (!TARGET) { console.error("❌ Spieler #' + memberNum + ' nicht im Raum!"); } else {\n' + wrapped + '\n}';
  }
  return 'const TARGET = Player;\n' + wrapped;
}

// ══════════════════════════════════════════════════════
//  COPY
// ══════════════════════════════════════════════════════
function copyCode() {
  const ta = document.getElementById('codeOut');
  const text = ta.value;
  const btn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Kopiert!'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='📋 Code kopieren'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    // Fallback für ältere Browser
    ta.select(); document.execCommand('copy');
    btn.textContent = '✅ Kopiert!'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='📋 Code kopieren'; btn.classList.remove('copied'); }, 2000);
  });
}

// ══════════════════════════════════════════════════════
//  OUTFIT BUILDER
// ══════════════════════════════════════════════════════
function openOutfit()  { switchTab('outfit'); }
function closeOutfit() { switchTab('items'); }
function clearOutfit() { OUTFIT = []; renderOutfitList(); _autoOutfitCode(); }

function addToOutfit() {
  if (!CURRENT) return;
  const { group, asset, cfg } = CURRENT;

  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...dimSelected[key]].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const trStr   = JSON.stringify(tr);
  const typeStr = Object.entries(tr).map(([k,v])=>`${k}${v}`).join('');
  const colors  = getColors();

  let propCode = '';
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of dimSelected[key]) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [prop,val] of Object.entries(sp)) {
        if (val!=null) propCode += `\n    item.Property.${prop} = ${encVal(val)};`;
      }
    }
  }
  for (const [prop,val] of Object.entries(globalPropVals)) {
    if (val!=null) propCode += `\n    item.Property.${prop} = ${encVal(val)};`;
  }

  const lock = document.getElementById('lockType').value;
  const isRel = REL_LOCKS.includes(lock);
  let lockParams = { timer:0, combo:'', password:'', relMember:0, relTimer:0 };
  if (lock) {
    if (lock.includes('Timer')&&!isRel) {
      const h=parseInt(document.getElementById('timerH').value)||0;
      const m=parseInt(document.getElementById('timerM').value)||0;
      const s=parseInt(document.getElementById('timerS').value)||0;
      lockParams.timer=(h*3600+m*60+s)*1000;
    }
    if (lock==='CombinationPadlock') lockParams.combo=document.getElementById('comboCode').value||'1234';
    if (PW_LOCKS.includes(lock))     lockParams.password=document.getElementById('lockPassword').value||'1234';
    if (isRel) {
      lockParams.relMember=parseInt(document.getElementById('relMemberNum').value)||0;
      lockParams.relTimer=(parseInt(document.getElementById('relTimerH').value)||0)*3600*1000;
    }
  }

  const craftName = document.getElementById('craftName').value.trim();
  const craftDesc = document.getElementById('craftDesc').value.trim();
  const craftProp = document.getElementById('craftProp').value;
  const craftStr = craftName ? `,\n  {\n    Name: ${JSON.stringify(craftName)},\n    Description: ${JSON.stringify(craftDesc)},\n    Property: "${craftProp}",\n    Color: ${JSON.stringify(colors[0]==='Default'?'#808080':colors[0])},\n    Lock: "", Item: ${JSON.stringify(asset)}, Private: false, MemberNumber: Player.MemberNumber,\n  }` : '';

  const isOther   = document.getElementById('targetMode').value === 'other';
  const memberNum = parseInt(document.getElementById('targetMember')?.value)||0;


  // ── Konflikt-Check: Neues Item blockt existierende Outfit-Slots ──────────
  if (cfg) {
    const blockedByAsset = new Set(cfg.block || []);

    // Optionen-Block: aktiv für gerade gewählte Optionen
    const blockedByOptions = new Set();
    for (const key in (cfg.typeKeys || {})) {
      for (const idx of (dimSelected[key] || new Set())) {
        const opt = cfg.typeKeys[key][idx];
        for (const b of (opt?.block || [])) blockedByOptions.add(b);
      }
    }
    const allBlocked = new Set([...blockedByAsset, ...blockedByOptions]);

    // Vorhandene Items die durch das neue blockiert würden
    const conflicts = OUTFIT.filter(item => allBlocked.has(item.group));
    if (conflicts.length > 0) {
      const src = blockedByAsset.size ? 'Asset-Block' : 'Options-Block';
      const msg =
        `⚠️ Slot-Konflikt!\n\n` +
        `„${asset}" (${group}) hat Block-Gruppen [${src}]:\n` +
        `${[...allBlocked].map(b => '  • ' + b).join('\n')}\n\n` +
        `Folgende Items würden dadurch entfernt:\n` +
        `${conflicts.map(i => `  • ${i.group}  →  „${i.asset}"`).join('\n')}\n\n` +
        `→ OK = Trotzdem hinzufügen   → Abbrechen = Nichts ändern`;
      if (!confirm(msg)) return;
    }

    // Umgekehrter Check: existierende Items blocken das neue
    const blockedByExisting = [];
    for (const existing of OUTFIT) {
      const eb = new Set(existing.cfg?.block || []);
      for (const key in (existing.cfg?.typeKeys || {})) {
        const selVal = (existing.tr || {})[key];
        if (selVal != null) {
          const opts = existing.cfg.typeKeys[key] || [];
          for (let idx = 0; idx < opts.length; idx++) {
            const isSel = (selVal & Math.pow(2, idx)) > 0 || selVal === idx;
            if (isSel) for (const b of (opts[idx]?.block || [])) eb.add(b);
          }
        }
      }
      if (eb.has(group)) blockedByExisting.push(existing);
    }
    if (blockedByExisting.length > 0) {
      const msg =
        `⚠️ Umgekehrter Konflikt!\n\n` +
        `Folgende Outfit-Items blockieren „${asset}" (${group}):\n` +
        `${blockedByExisting.map(i => `  • „${i.asset}" (${i.group})`).join('\n')}\n\n` +
        `Das bedeutet: „${asset}" würde von BC wieder entfernt.\n\n` +
        `→ OK = Trotzdem hinzufügen   → Abbrechen = Nichts ändern`;
      if (!confirm(msg)) return;
    }
  }

  OUTFIT.push({
    group, asset, cfg, colors, tr, trStr, typeStr, propCode, craftStr,
    lock, lockParams,
    tightCode: tightnessOn ? `\n    item.Difficulty=${tightnessVal};` : '',
    isOther, memberNum,
    label: `${asset} (${group})`,
  });

  _autoOutfitCode();
}


function renderOutfitList() {
  const list = document.getElementById('outfitList');
  const q = (document.getElementById('outfitItemSearch')?.value || '').toLowerCase();
  const visItems = OUTFIT.map((item, i) => ({...item, _origIdx: i}))
                         .filter(item => !q || item.asset?.toLowerCase().includes(q) || item.group?.toLowerCase().includes(q));
  if (!visItems.length) {
    list.innerHTML = OUTFIT.length
      ? '<div class="outfit-empty-hint">🔍 Keine Treffer.</div>'
      : '<div class="outfit-empty-hint">Noch keine Items.<br>Konfiguriere ein Item im <strong>Item Manager</strong> und klicke <strong>„👗 Outfit"</strong>.</div>';
    return;
  }
  list.innerHTML = '';
  visItems.forEach(item => {
    const i = item._origIdx;
    const row = document.createElement('div');
    row.className = 'outfit-item-row';
    row.innerHTML = `
      <div style="flex:1">
        <div class="outfit-item-name">${item.asset}</div>
        <div class="outfit-item-group">${item.group}${item.lock ? ' | 🔒 '+item.lock : ''}${Object.keys(item.tr||{}).length ? ' | '+item.typeStr : ''}</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <button class="btn btn-primary" style="padding:3px 8px;font-size:.68rem" onclick="moveOutfitItem(${i},-1)">↑</button>
        <button class="btn btn-primary" style="padding:3px 8px;font-size:.68rem" onclick="moveOutfitItem(${i},1)">↓</button>
        <button class="btn btn-red" style="padding:3px 7px;font-size:.68rem" onclick="removeOutfitItem(${i})">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function removeOutfitItem(i) { OUTFIT.splice(i,1); renderOutfitList(); _autoOutfitCode(); }
function moveOutfitItem(i, d) {
  const j = i + d;
  if (j < 0 || j >= OUTFIT.length) return;
  [OUTFIT[i], OUTFIT[j]] = [OUTFIT[j], OUTFIT[i]];
  renderOutfitList();
  _autoOutfitCode();
}

function generateOutfitCode() {
  if (!OUTFIT.length) return;
  // Outfit-Ziel hat Vorrang; Fallback auf altes OUTFIT[0]-Ziel für Rückwärtskompatibilität
  const isOther   = _outfitTargetNum !== null;
  const memberNum = _outfitTargetNum ?? 0;

  let count = OUTFIT.length;
  let code = '// ═══════════════════════════════════════════\n//  OUTFIT – ' + count + ' Items';
  if (isOther) code += ' → Spieler #' + memberNum;
  code += '\n// ═══════════════════════════════════════════\n';

  if (isOther && memberNum) {
    code += 'const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === ' + memberNum + ');\n'
          + 'if (!TARGET) { console.error("❌ Spieler #' + memberNum + ' nicht im Raum!"); } else {\n\n';
  } else {
    code += 'const TARGET = Player;\n\n';
  }

  // Erst ausziehen damit keine alten Items unter dem neuen Outfit bleiben
  code += '// ── Strip: alte Items entfernen ──\n'
        + 'TARGET.Appearance = TARGET.Appearance.filter(i => i?.Asset?.Group?.AllowNone === false);\n\n';

  OUTFIT.forEach((item, i) => {
    code += '// ── ' + (i+1) + '. ' + item.asset + ' (' + item.group + ') ──\n';
    code += buildItemInner({ ...item, isOther, memberNum, delayOffset: 600 + i * 700 });
    code += '\n\n';
  });

  const syncLine = (isOther && memberNum)
    ? 'ChatRoomCharacterUpdate(TARGET);'
    : 'ServerPlayerAppearanceSync(); ChatRoomCharacterUpdate(TARGET);';
  const finalDelay = 600 + OUTFIT.length * 700 + 200;
  code += 'setTimeout(function() { ' + syncLine + ' console.log("✅ Outfit fertig!"); }, ' + finalDelay + ');\n';

  if (isOther && memberNum) code += '}\n';

  document.getElementById('outfitCode').value = code;
}

function copyOutfitCode() {
  const ta = document.getElementById('outfitCode');
  navigator.clipboard.writeText(ta.value).then(() => {
    showStatus('✅ Outfit-Code kopiert!', 'success');
  }).catch(() => {
    ta.select(); document.execCommand('copy');
    showStatus('✅ Outfit-Code kopiert!', 'success');
  });
}

// ══════════════════════════════════════════════════════
//  OUTFIT-PROFILE
// ══════════════════════════════════════════════════════
function openProfiles()  { switchTab('outfit'); renderProfileList(); }
function closeProfiles() { switchTab('outfit'); }

function saveProfile() {
  if (!OUTFIT.length) { showStatus('❌ Erst Outfit-Items hinzufügen!', 'error'); return; }
  const name = document.getElementById('profileNameInput').value.trim();
  if (!name) { showStatus('❌ Profilname eingeben!', 'error'); return; }

  // Nur die nötigen Felder speichern – cfg/propCode/craftStr sind zu groß (localStorage-Limit)
  const SAVE_KEYS = ['group','asset','colors','tr','trStr','typeStr','tightCode','lock','lockParams','isOther','memberNum','label'];
  const stripped = OUTFIT.map(item => {
    const out = {};
    SAVE_KEYS.forEach(k => { if (item[k] !== undefined) out[k] = item[k]; });
    return out;
  });

  PROFILES[name] = { name, date: new Date().toLocaleDateString('de-DE'), items: stripped, owner: null, favorite: false };

  try {
    const json = JSON.stringify(PROFILES);
    localStorage.setItem('BC_PROFILES_v11', json);
    renderProfileList();
    document.getElementById('profileNameInput').value = '';
    showStatus('✅ Profil "' + name + '" gespeichert (' + stripped.length + ' Items)', 'success');
  } catch(e) {
    showStatus('❌ Speichern fehlgeschlagen: ' + e.message, 'error');
  }
}

function loadProfile(name) {
  const profile = PROFILES[name];
  if (!profile) return;

  if (!Object.keys(CACHE).length) {
    showStatus('❌ Cache nicht geladen! Erst Dump-Script ausführen und Cache importieren.', 'error');
    return;
  }

  const restored = [];
  for (const item of profile.items) {
    const cfg = CACHE[item.group]?.[item.asset];
    if (!cfg) console.warn('⚠️ Item nicht im Cache: ' + item.group + '/' + item.asset);

    const tr = (item.tr && typeof item.tr === 'object' && Object.keys(item.tr).length) ? item.tr : null;

    // craftStr aus Craft-Objekt
    let craftStr = '';
    const craft = item.craft;
    if (craft && craft.Name) {
      const craftCol = Array.isArray(item.colors) ? item.colors[0] : (item.colors ?? '#808080');
      craftStr = ',\n  {\n    Name: ' + JSON.stringify(craft.Name)
               + ',\n    Description: ' + JSON.stringify(craft.Description ?? '')
               + ',\n    Property: ' + JSON.stringify(craft.Property ?? 'Normal')
               + ',\n    Color: ' + JSON.stringify(craftCol === 'Default' ? '#808080' : craftCol)
               + ',\n    Lock: "", Item: ' + JSON.stringify(item.asset)
               + ', Private: ' + (craft.Private ? 'true' : 'false')
               + ', MemberNumber: Player.MemberNumber,\n  }';
    }

    const lockParams = { timer: 0, combo: '', password: '', relMember: item.lockMember || 0, relTimer: 0 };

    restored.push({
      ...item,
      cfg:              cfg ?? {},
      propCode:         '',    // handled via property/preB64/postB64 in buildItemInner
      craftStr,
      lockParams,
      trStr:            tr ? JSON.stringify(tr) : '{}',
      typeStr:          tr ? Object.entries(tr).map(([k,v]) => k+v).join('') : '',
      // Full property snapshot forwarded to buildItemInner
      property:         item.property ?? null,
      // Legacy separate fields kept for backward compat
      overridePriority: item.overridePriority ?? null,
      layerProperties:  item.layerProperties  ?? null,
      difficulty:       item.difficulty       ?? null,
    });
  }

  OUTFIT = restored;
  switchTab('outfit');
  renderOutfitList();
  _autoOutfitCode();
}

function deleteProfile(name) {
  if (!confirm('Profil "' + name + '" löschen?')) return;
  delete PROFILES[name];
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
}

function renderProfileList() {
  const el = document.getElementById('profileListEl');
  if (!el) return;
  const q = (document.getElementById('profileSearch')?.value || '').toLowerCase();
  const keys = Object.keys(PROFILES).filter(k =>
    !q || k.toLowerCase().includes(q) || (PROFILES[k].owner || '').toLowerCase().includes(q)
  );

  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.8rem;grid-column:1/-1">Noch keine Profile gespeichert.</p>';
    el._profileKeys = [];
    return;
  }

  // Group by owner
  const byOwner = {};
  const noOwner = [];
  for (const k of keys) {
    const owner = (PROFILES[k].owner || '').trim();
    if (owner) {
      if (!byOwner[owner]) byOwner[owner] = [];
      byOwner[owner].push(k);
    } else {
      noOwner.push(k);
    }
  }

  el._profileKeys = keys;

  let html = '';

  // Owner folders (sorted: fav-heavy first, then alpha)
  const ownersSorted = Object.keys(byOwner).sort((a, b) => {
    const fa = byOwner[a].filter(k => PROFILES[k]?.favorite).length;
    const fb = byOwner[b].filter(k => PROFILES[k]?.favorite).length;
    return fb - fa || a.localeCompare(b);
  });

  for (const owner of ownersSorted) {
    const ownerKeys = byOwner[owner];
    const favCnt = ownerKeys.filter(k => PROFILES[k]?.favorite).length;
    const ownerEsc = escHtml(owner);
    const ownerJson = JSON.stringify(owner);
    html += `<div class="profile-owner-folder">
      <div class="profile-owner-hdr" onclick="this.parentElement.classList.toggle('open')">
        <span class="profile-owner-icon">📁</span>
        <span class="profile-owner-name">${ownerEsc}</span>
        ${favCnt ? `<span class="profile-owner-fav">⭐ ${favCnt}</span>` : ''}
        <span class="profile-owner-count">${ownerKeys.length} Profile</span>
        <button onclick="event.stopPropagation();profileRenameOwner(${ownerJson})"
          class="profile-folder-btn" title="Ordner umbenennen">✏️</button>
        <span class="profile-owner-chevron">▶</span>
      </div>
      <div class="profile-owner-body">`;
    for (const k of ownerKeys) html += _renderProfileCard(k);
    html += `</div></div>`;
  }

  // Unassigned profiles
  if (noOwner.length) {
    if (ownersSorted.length) html += `<div class="profile-owner-folder open">
      <div class="profile-owner-hdr" onclick="this.parentElement.classList.toggle('open')">
        <span class="profile-owner-icon">📂</span>
        <span class="profile-owner-name" style="color:var(--text3)">Ohne Ordner</span>
        <span class="profile-owner-count">${noOwner.length} Profile</span>
        <span class="profile-owner-chevron">▶</span>
      </div>
      <div class="profile-owner-body">`;
    for (const k of noOwner) html += _renderProfileCard(k);
    if (ownersSorted.length) html += `</div></div>`;
  }

  el.innerHTML = '<div class="profile-list">' + html + '</div>';
}

// ── Render a single profile card ───────────────────────────────────────────
function _renderProfileCard(k) {
  const p = PROFILES[k];
  if (!p) return '';
  const isFav = !!p.favorite;
  const kJson = JSON.stringify(k);
  return `<div class="profile-card ${isFav ? 'profile-fav' : ''}">
    <div class="profile-card-name">
      <button onclick="profileToggleFav(${kJson})" class="profile-star-btn" title="${isFav ? 'Favorit entfernen' : 'Als Favorit markieren'}">${isFav ? '⭐' : '☆'}</button>
      ${escHtml(p.name)}
    </div>
    <div class="profile-card-info">${p.items?.length ?? 0} Items · ${p.date || ''}${p.owner ? ' · 👤 ' + escHtml(p.owner) : ''}</div>
    <div class="btn-row" style="margin-top:7px;gap:4px">
      <button class="btn btn-green" style="flex:1;font-size:.68rem" onclick="loadProfileByKey(${kJson})">📥 Laden</button>
      <button class="btn btn-primary" style="font-size:.68rem;padding:4px 7px" onclick="profileExportSingleByKey(${kJson})" title="Exportieren">⬇️</button>
      <button class="btn" style="font-size:.68rem;padding:4px 7px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2)" onclick="profileRename(${kJson})" title="Umbenennen">✏️</button>
      <button class="btn btn-red" style="font-size:.68rem" onclick="deleteProfileByKey(${kJson})">🗑️</button>
    </div>
  </div>`;
}

// ── Key-based profile operations ────────────────────────────────────────────
function loadProfileByKey(key)    { loadProfile(key); }
function deleteProfileByKey(key)  { deleteProfile(key); }

function profileExportSingleByKey(key) {
  const profile = PROFILES[key];
  if (!profile) return;
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), version: 1, count: 1 },
    profiles: { [key]: profile },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const safeName = key.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim().slice(0, 60);
  a.download = 'Profil_' + safeName + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showStatus('✅ Profil "' + key + '" exportiert', 'success');
}

// ── Feature 4: Favoriten ────────────────────────────────────────────────────
function profileToggleFav(key) {
  const p = PROFILES[key];
  if (!p) return;
  p.favorite = !p.favorite;
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
}

// ── Feature 6: Profil umbenennen ────────────────────────────────────────────
function profileRename(key) {
  const p = PROFILES[key];
  if (!p) return;
  const newName = prompt('Neuer Name für "' + key + '":', key);
  if (!newName?.trim() || newName.trim() === key) return;
  const trimmed = newName.trim();
  if (PROFILES[trimmed] && !confirm('Profil "' + trimmed + '" existiert bereits. Überschreiben?')) return;
  PROFILES[trimmed] = { ...p, name: trimmed };
  delete PROFILES[key];
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
  showStatus('✅ Profil umbenannt: "' + trimmed + '"', 'success');
}

// ── Feature 7: Owner-Ordner umbenennen ─────────────────────────────────────
function profileRenameOwner(owner) {
  const newOwner = prompt('Ordner umbenennen von "' + owner + '":', owner);
  if (!newOwner?.trim() || newOwner.trim() === owner) return;
  const trimmed = newOwner.trim();
  let count = 0;
  for (const p of Object.values(PROFILES)) {
    if ((p.owner || '') === owner) { p.owner = trimmed; count++; }
  }
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
  showStatus('✅ Ordner umbenannt: "' + trimmed + '" (' + count + ' Profile)', 'success');
}

// ── Feature 5: Reorganisieren ───────────────────────────────────────────────
// Auto-detects owner from profile name patterns: "{anything} - {Owner}" or "{Owner} Outfit"
function profileAutoReorganize() {
  let changed = 0;
  for (const [key, p] of Object.entries(PROFILES)) {
    if (p.owner) continue;   // already has owner → skip
    let owner = null;

    // Pattern 1: "CraftName - OwnerName"  (created by curseSaveAsProfile)
    const m1 = key.match(/ - (.+)$/);
    if (m1) owner = m1[1].trim();

    // Pattern 2: "OwnerName Outfit"  (created by curseSaveAllAsProfile)
    if (!owner) {
      const m2 = key.match(/^(.+?) Outfit$/);
      if (m2) owner = m2[1].trim();
    }

    if (owner && owner.length > 0 && owner.length < 60) {
      p.owner = owner;
      changed++;
    }
  }
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
  showStatus(changed
    ? '✅ ' + changed + ' Profile automatisch in Ordner organisiert'
    : 'ℹ️ Keine neuen Owner-Zuordnungen erkannt', changed ? 'success' : 'info');
}

// ── Feature 2: Auto-Mark ───────────────────────────────────────────────────
// Adds "outfit" to the curse comment of items that are saved in any profile
function profileAutoMark() {
  const lookup = _buildProfileOutfitLookup();
  let marked = 0;
  for (const [dbKey, entry] of Object.entries(CURSE_DB)) {
    const lkKey = (entry.Gruppe || '') + '::' + (entry.ItemName || '');
    if (!lookup.has(lkKey)) continue;
    const existing = CURSE_COMMENTS[dbKey] || '';
    if (existing.includes('outfit')) continue;   // already marked
    CURSE_COMMENTS[dbKey] = (existing ? existing + ' · ' : '') + 'outfit';
    marked++;
  }
  if (marked) {
    _saveCurseComments();
    if (_activeTab === 'curse') renderCurseTab();
  }
  showStatus(marked
    ? '📝 ' + marked + ' Kommentare mit "outfit" markiert'
    : 'ℹ️ Alle Profil-Items bereits markiert', marked ? 'success' : 'info');
}

// ── Export / Import ──────────────────────────────────────────────────────

// Alle Profile exportieren
function profilesExportAll() {
  const count = Object.keys(PROFILES).length;
  if (!count) { showStatus('❌ Keine Profile zum Exportieren', 'error'); return; }
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), version: 1, count },
    profiles: PROFILES,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'BC_Profile_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showStatus('✅ ' + count + ' Profile exportiert', 'success');
}

// Einzelnes Profil exportieren (per Index aus _profileKeys)
function profileExportSingle(idx) {
  const el = document.getElementById('profileListEl');
  const keys = el._profileKeys;
  if (!keys || !keys[idx]) return;
  const name = keys[idx];
  const profile = PROFILES[name];
  if (!profile) return;
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), version: 1, count: 1 },
    profiles: { [name]: profile },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  // Sanitize filename
  const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim().slice(0, 60);
  a.download = 'Profil_' + safeName + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showStatus('✅ Profil "' + name + '" exportiert', 'success');
}

// Profile importieren (mit Duplikat-Behandlung)
function profilesImport() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        // Support both {profiles:{...}} format and raw {name:{items:[...]}} format
        const incoming = data.profiles ?? data;
        if (typeof incoming !== 'object' || !Object.keys(incoming).length) {
          showStatus('❌ Keine Profile in der Datei gefunden', 'error');
          return;
        }
        let added = 0, skipped = 0, overwritten = 0;
        for (const [name, profile] of Object.entries(incoming)) {
          if (!profile?.items) continue;
          if (PROFILES[name]) {
            // Eindeutigen Namen vergeben statt leise überschreiben
            const unique = _uniqueProfileName(name);
            PROFILES[unique] = { ...profile, name: unique };
            overwritten++;
          } else {
            PROFILES[name] = profile;
            added++;
          }
        }
        localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES));
        renderProfileList();
        const msg = [
          added    ? added + ' neu'           : '',
          overwritten ? overwritten + ' umbenannt' : '',
          skipped  ? skipped + ' übersprungen'  : '',
        ].filter(Boolean).join(', ');
        showStatus('✅ Import: ' + msg, 'success');
      } catch(err) {
        showStatus('❌ Import fehlgeschlagen: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

// Legacy idx helpers – kept for backwards-compat with any stored onclick strings
function loadProfileByIdx(idx) { const k = document.getElementById('profileListEl')?._profileKeys?.[idx]; if(k) loadProfile(k); }
function deleteProfileByIdx(idx) { const k = document.getElementById('profileListEl')?._profileKeys?.[idx]; if(k) deleteProfile(k); }
function profileExportSingle(idx) { const k = document.getElementById('profileListEl')?._profileKeys?.[idx]; if(k) profileExportSingleByKey(k); }

// Init profile button visibility
(function() {
  // FIX: was 'BC_CACHE_v11' (wrong version) and also duplicated the same key in fallback
  const s = localStorage.getItem('BC_CACHE_v12');
  if (s) {
    try {
      const data = JSON.parse(s);
      const items = Object.values(data).reduce((n,g)=>n+Object.keys(g).length,0);
      if (items > 0) {
        document.getElementById('profileBtn')?.classList.remove('hidden');
      }
    } catch {}
  }
})();


// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
let _activeTab = 'items';
function switchTab(tab) {
  _activeTab = tab;
  ['items','outfit','curse','bot','log','money','events','rank','shop'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('tab-'+t+'-btn')?.classList.toggle('active', t===tab);
  });
  if (tab === 'outfit') { renderOutfitList(); renderOutfitMemberChips(); renderProfileList(); _autoOutfitCode(); }
  if (tab === 'curse')  { renderCurseTab(); }
  if (tab === 'bot')    { renderBotTab(); }
  if (tab === 'log')    { renderLogTab(); }
  if (tab === 'money')  { renderMoneyTab(); }
  if (tab === 'rank')   { renderRankTab(); }
  if (tab === 'shop')   { renderShopTab(); }

}

// ── addToOutfit: auto-switch tab + auto-generate code after adding ──

// ══════════════════════════════════════════════════════
//  OUTFIT AUTO-CODE
// ══════════════════════════════════════════════════════
function _autoOutfitCode() {
  if (!OUTFIT.length) {
    document.getElementById('outfitCode').value = '';
    document.getElementById('outfitAutoStatus').textContent = '– kein Outfit –';
    return;
  }
  generateOutfitCode();
  document.getElementById('outfitAutoStatus').textContent =
    OUTFIT.length + ' Items · ' + (_outfitTargetNum ? 'Spieler #'+_outfitTargetNum : 'Player');
}

// ══════════════════════════════════════════════════════
//  CURSE STATE
// ══════════════════════════════════════════════════════

// ── Intervall-Event Laufzeit-Status (Countdown im UI) ────────────────────
let _evIntervalStatus = {};
function _evIntervalStatusUpdate(evId, nextMs, lo, hi, cnt) {
  _evIntervalStatus[evId] = { nextFireAt: Date.now() + nextMs, lo, hi, cnt };
  if (_activeTab === 'bot') _renderIntervalCountdowns();
}
function _renderIntervalCountdowns() {
  Object.entries(_evIntervalStatus).forEach(([evId, s]) => {
    const el = document.getElementById('trig-countdown-' + evId);
    if (!el) return;
    const rem = Math.max(0, Math.ceil((s.nextFireAt - Date.now()) / 1000));
    el.textContent = '⏱ ' + rem + 's | 🔥 ' + s.cnt + '×';
  });
}
setInterval(() => {
  if (_activeTab === 'bot' && Object.keys(_evIntervalStatus).length) _renderIntervalCountdowns();
}, 1000);

// ── Auto-Curse-Scan ───────────────────────────────────────────
let _autoCurseScanTimer = null;
function toggleAutoCurseScan() {
  const btn = document.getElementById('csAutoScanBtn');
  if (_autoCurseScanTimer) {
    clearInterval(_autoCurseScanTimer);
    _autoCurseScanTimer = null;
    if (btn) { btn.textContent = '⏰ Auto-Scan'; btn.classList.remove('on'); }
    showStatus('⏰ Auto-Scan deaktiviert', 'info');
  } else {
    _autoCurseScanTimer = setInterval(() => {
      if (_connected) {
        const prevDb = JSON.stringify(CURSE_DB);
        bcSend({ type: 'SCAN_CURSES', _auto: true });
        bcSend({ type: 'GET_CACHE' });
      }
    }, 30000);
    if (btn) { btn.textContent = '⏰ Auto (30s)'; btn.classList.add('on'); }
    showStatus('⏰ Auto-Scan aktiv – alle 30s', 'success');
  }
}

// ── Change-Detection für Curse-Scan ──────────────────────────
function _showChangeBadge(added, updated) {
  const el = document.getElementById('csChangeBadge');
  if (!el) return;
  if (!added.length && !updated.length) { el.style.display = 'none'; return; }
  const parts = [];
  if (added.length)   parts.push(`<span class="change-added">+${added.length} neu</span>`);
  if (updated.length) parts.push(`<span class="change-updated">~${updated.length} geändert</span>`);
  el.innerHTML = '🔔 Änderungen: ' + parts.join(' · ');
  el.style.display = '';
  setTimeout(() => { el.style.display = 'none'; }, 15000);
}

let CURSE_DB    = {};   // key → entry (from CurseScanner.database)
let CURSE_LSCG  = {};   // key → entry (from CurseScanner.lscgTable)
let CURSE_CACHE_LSCG = {}; // from lscgCache

// Comments: persisted in IndexedDB
let CURSE_COMMENTS = {};
function _saveCurseComments() { idbSet('BC_CURSE_COMMENTS_v1', CURSE_COMMENTS); }
// ── Favoriten ────────────────────────────────────────────────
let CURSE_FAVOURITES = new Set();
function _saveCurseFavourites() { idbSet('BC_CURSE_FAV_v1', [...CURSE_FAVOURITES]); }
function toggleCurseFavourite(dbKey, cellEl) {
  const wasFav = CURSE_FAVOURITES.has(dbKey);
  if (wasFav) CURSE_FAVOURITES.delete(dbKey); else CURSE_FAVOURITES.add(dbKey);
  _saveCurseFavourites();
  if (cellEl) {
    const isFav = !wasFav;
    cellEl.innerHTML = isFav ? '⭐' : '<span style="opacity:.25;font-size:.85em">☆</span>';
    const row = cellEl.closest('tr');
    if (row) row.classList.toggle('fav', isFav);
    // Fav-Zähler im Owner-Block aktualisieren
    const block = cellEl.closest('.curse-owner-block');
    if (block) {
      const badge = block.querySelector('.curse-owner-fav-badge');
      const cnt = block.querySelectorAll('.curse-row.fav').length;
      if (badge) {
        badge.textContent = '⭐ ' + cnt;
        badge.style.display = cnt > 0 ? '' : 'none';
      }
    }
  } else {
    renderCurseTab();
  }
}



// ── Scan ─────────────────────────────────────────────
function curseScan() {
  const statusEl = document.getElementById('csScanStatus');
  statusEl.textContent = '⏳ Scanne...';
  // Gleichzeitig Cache-Scan auslösen
  bcSend({ type: 'SCAN_CURSES' });
  bcSend({ type: 'GET_CACHE' });
}

// ── Handle SCAN_RESULT ────────────────────────────────
// called from postMessage handler

function _saveCurseDB() {
  idbSet('BC_CURSE_DB_v1', {database:CURSE_DB,lscgTable:CURSE_LSCG,lscgCache:CURSE_CACHE_LSCG,favourites:[...CURSE_FAVOURITES]});
}

function _handleCurseData(data) {
  if (data.err) { showStatus('❌ Curse-Scan: ' + data.err, 'error'); return; }
  const prevDB = {...CURSE_DB};
  CURSE_DB         = data.database    ?? {};
  CURSE_LSCG       = data.lscgTable   ?? {};
  CURSE_CACHE_LSCG = data.lscgCache   ?? {};
  _updateCurseStats();
  _populateSlotFilter();
  if (_activeTab === 'curse') renderCurseTab();
  const total = Object.keys(CURSE_DB).length;
  const isAuto = data._auto === true;
  // Change-Detection
  const added   = Object.keys(CURSE_DB).filter(k => !prevDB[k]);
  const updated = Object.keys(CURSE_DB).filter(k => prevDB[k] && JSON.stringify(prevDB[k]) !== JSON.stringify(CURSE_DB[k]));
  let statusText = '✅ ' + total + ' Crafts';
  if (added.length || updated.length) {
    statusText += ' | +' + added.length + ' neu, ' + updated.length + ' geändert';
    _showChangeBadge(added, updated);
  } else if (!isAuto) {
    statusText += ' | keine Änderungen';
  }
  document.getElementById('csScanStatus').textContent = isAuto
    ? '🔄 ' + new Date().toLocaleTimeString() + ' — ' + total + ' Crafts'
    : statusText;
  if (!isAuto || added.length || updated.length) {
    showStatus(statusText, added.length + updated.length > 0 ? 'success' : 'info');
  }
  // persist
  _saveCurseDB();
}


// ── CURSE FILTER STATE ───────────────────────────────
let _curseFilter  = 'all';  // 'all' | 'cursed' | 'lscg'
let _pendingExport = false;
let _curseEntryMap = {};    // rowId → dbKey, for safe onclick

function toggleCacheFilter() {
  const el = document.getElementById('fc-cache');
  if (el) el.classList.toggle('on');
  renderCurseTab();
}

function setCurseFilter(f) {
  _curseFilter = f;
  ['all','cursed','lscg','fav'].forEach(k => {
    const el = document.getElementById('fc-' + k);
    if (el) el.classList.toggle('on', k === f);
  });
  renderCurseTab();
}

function _populateSlotFilter() {
  const sel = document.getElementById('slotFilter');
  if (!sel) return;
  const current = sel.value;
  const slots = [...new Set(Object.values(CURSE_DB).map(e => e.Gruppe).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Alle Slots</option>' +
    slots.map(s => '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' + s + '</option>').join('');
}

function _updateCurseStats() {
  const entries = Object.values(CURSE_DB);
  document.getElementById('csStat-total').textContent  = entries.length;
  document.getElementById('csStat-cursed').textContent = entries.filter(e=>e.IstCursed).length;
  document.getElementById('csStat-lscg').textContent   = Object.keys(CURSE_LSCG).length;
  document.getElementById('csStat-cache').textContent  = Object.keys(CURSE_CACHE_LSCG).length;
}

// ── Render Curse Tab ──────────────────────────────────
function renderCurseTab() {
  const body   = document.getElementById('curseBody');
  const empty  = document.getElementById('curseEmpty');
  if (!body) return;

  // ── Apply filters ──
  const searchTerm = (document.getElementById('curseSearch')?.value || '').toLowerCase();
  const slotFilter = document.getElementById('slotFilter')?.value || '';
  const cacheOnly  = document.getElementById('fc-cache')?.classList.contains('on') ?? false;

  let entries = Object.values(CURSE_DB);
  if (_curseFilter === 'cursed') entries = entries.filter(e => !!e.IstCursed);
  if (_curseFilter === 'lscg')   entries = entries.filter(e => !!e.IstLSCGCurse);
  if (_curseFilter === 'fav') {
    entries = entries.filter(e => {
      const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
      return CURSE_FAVOURITES.has(k);
    });
  }
  if (cacheOnly)   entries = entries.filter(e => !!e.IstLSCGCurse);
  if (slotFilter)  entries = entries.filter(e => e.Gruppe === slotFilter);
  if (searchTerm)  entries = entries.filter(e =>
    e.CraftName?.toLowerCase().includes(searchTerm) ||
    e.ItemName?.toLowerCase().includes(searchTerm)  ||
    e.Gruppe?.toLowerCase().includes(searchTerm)    ||
    e.Besitzer?.Name?.toLowerCase().includes(searchTerm)
  );

  if (!entries.length) {
    empty.style.display = '';
    empty.querySelector ? (empty.innerHTML = Object.keys(CURSE_DB).length
      ? '<div style="font-size:1.5rem;margin-bottom:8px">🔍</div>Keine Treffer für die gewählten Filter.'
      : '<div style="font-size:2rem;margin-bottom:8px">🔮</div>Noch kein Scan. Klicke <strong>Scannen</strong>.') : null;
    body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());
    return;
  }
  empty.style.display = 'none';

  // Build profile lookup for outfit check marks (Feature 1)
  const _profileLookup = _buildProfileOutfitLookup();

  // Group by owner (skip entries without Besitzer)
  const byOwner = {};
  entries.forEach((e, idx) => {
    if (!e?.Besitzer?.Nummer) return;
    const key = e.Besitzer.Nummer + ':' + e.Besitzer.Name;
    if (!byOwner[key]) byOwner[key] = { name: e.Besitzer.Name, num: e.Besitzer.Nummer, items: [] };
    byOwner[key].items.push({ ...e, _idx: idx });
  });

  // Remove existing owner blocks and rebuild
  body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());

  Object.entries(byOwner).forEach(([ownerKey, owner]) => {
    const blockId = 'co_' + owner.num;
    const wasOpen = document.getElementById(blockId)?.classList.contains('open');

    const block = document.createElement('div');
    block.className = 'curse-owner-block' + (wasOpen ? ' open' : '');
    block.id = blockId;

    const lscgCount = owner.items.filter(i => i.IstLSCGCurse).length;
    const cursedCount = owner.items.filter(i => i.IstCursed).length;
    const ownerFavCount = owner.items.filter(i => {
      const k2 = (i.Besitzer?.Nummer ?? '') + ':' + i.ItemName + ':' + i.CraftName;
      return CURSE_FAVOURITES.has(k2);
    }).length;

    block.innerHTML =
      '<div class="curse-owner-hdr" onclick="toggleCurseOwner(\'' + blockId + '\')">'+
        '<span class="curse-owner-name">'+escHtml(owner.name)+'</span>'+
        '<span class="curse-owner-num">#'+owner.num+'</span>'+
        (lscgCount ? '<span class="curse-owner-count" style="background:var(--gd);color:var(--green)">🧿 '+lscgCount+'</span>' : '')+
        (cursedCount ? '<span class="curse-owner-count">🔮 '+cursedCount+'</span>' : '')+
        '<span class="curse-owner-count" style="background:var(--bg3);color:var(--text2)">'+owner.items.length+'</span>'+
        (ownerFavCount ? '<span class="curse-owner-count curse-owner-fav-badge" style="background:rgba(251,191,36,.12);color:#fbbf24;border-color:rgba(251,191,36,.3)">⭐ '+ownerFavCount+'</span>' : '<span class="curse-owner-fav-badge" style="display:none"></span>')+
        '<button onclick="event.stopPropagation();curseSaveAllAsProfile(\'' + owner.num + '\')"'
          + ' style="margin-left:auto;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;cursor:pointer;font-size:.68rem;padding:2px 8px;border-radius:4px;white-space:nowrap"'
          + ' title="Alle Curses als Outfit-Profil speichern">💾 Alle speichern</button>'+
        '<span class="curse-owner-chevron">▶</span>'+
      '</div>'+
      '<table class="curse-rows"><thead><tr style="background:var(--bg3)">'+
        '<th style="padding:4px 4px;font-size:.63rem;color:var(--text3);text-align:center;font-weight:500" title="Favorit">⭐</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Name</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Item</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Gruppe</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Flags</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">LSCG</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:center;font-weight:500;white-space:nowrap">Cache</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500;min-width:160px">Kommentar</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Aktionen</th>'+
      '</tr></thead><tbody id="cb_'+owner.num+'"></tbody></table>';

    body.appendChild(block);

    const tbody = document.getElementById('cb_' + owner.num);
    owner.items.forEach((entry, rowIdx) => {
      if (!entry?.Besitzer?.Nummer) return;
      const dbKey = entry.Besitzer.Nummer + ':' + entry.ItemName + ':' + entry.CraftName;
      const rowId = 'cr_' + owner.num + '_' + rowIdx;
      const detId = 'cd_' + owner.num + '_' + rowIdx;
      const comment = CURSE_COMMENTS[dbKey] || '';
      const isLSCG  = entry.IstLSCGCurse;
      const isCursed = entry.IstCursed;

      const tr = document.createElement('tr');
      const isFav = CURSE_FAVOURITES.has(dbKey);
    tr.className = 'curse-row' + (isLSCG ? ' lscg' : '') + (isFav ? ' fav' : '');
      tr.id = rowId;

      const lscgText = isLSCG
        ? '<span class="curse-detail-badge lscg" title="' + (entry.LSCGAusCache ? 'Aus Cache' : 'Live') + '">'
          + (entry.LSCGAusCache ? '💾' : '✅') + '</span> ' + escHtml(entry.LSCG?.Name || '?')
        : '<span style="color:var(--text3)">–</span>';

      tr.innerHTML =
        '<td class="fav-cell" onclick="toggleCurseFavourite(\'' + dbKey.replace(/'/g,"&apos;") + '\',this)" title="Favorit">'+
          (isFav ? '⭐' : '<span style="opacity:.25;font-size:.85em">☆</span>')+
        '</td>'+
        '<td class="cn"><span class="cursor-detail-toggle" onclick="toggleCurseDetail(\'' + detId + '\',\'' + rowId + '\')">▶</span>'+escHtml(entry.CraftName)+(echoTranslate(entry.CraftName)?'<span style="font-size:.58rem;color:#a78bfa;margin-left:4px">('+echoTranslate(entry.CraftName)+')</span>':'')+'</td>'+
        '<td class="item">'+escHtml(entry.ItemName)+(echoTranslate(entry.ItemName)?'<span style="font-size:.58rem;color:var(--text3);margin-left:4px">('+echoTranslate(entry.ItemName)+')</span>':'')+'</td>'+
        '<td class="grp">'+escHtml(entry.Gruppe)+'</td>'+
        '<td class="badges">'+
          (isCursed ? '<span class="curse-detail-badge cursed">🔮</span>' : '')+
          (entry.Private ? '<span class="curse-detail-badge">🔒</span>' : '')+
          (entry.Property ? '<span class="curse-detail-badge">'+escHtml(entry.Property)+'</span>' : '')+
          (_profileLookup.has(entry.Gruppe + '::' + entry.ItemName)
            ? '<span class="curse-detail-badge" style="background:rgba(139,92,246,0.15);color:#a78bfa;border-color:rgba(139,92,246,0.35)" title="Als Outfit-Profil gespeichert">✅ Profil</span>'
            : '<span style="opacity:.3;font-size:.65rem;margin-left:2px" title="Noch kein Profil">☐</span>')+
        '</td>'+
        '<td class="lscg-col">'+lscgText+'</td>'+
        '<td style="text-align:center;vertical-align:middle">'+
          (isLSCG ? '<span title="'+(entry.LSCGAusCache ? 'Aus LSCG-Cache' : 'Live-Daten')+'" style="font-size:1rem;cursor:default">'+(entry.LSCGAusCache ? '✅' : '🟢')+'</span>' : '<span style="color:var(--text3)">–</span>')+
        '</td>'+
        '<td class="comment-col"><textarea class="curse-comment-input" placeholder="Notiz..." '+
          'data-rowid="' + rowId + '" onchange="saveCurseCommentById(this.dataset.rowid,this.value)">'+escHtml(comment)+'</textarea></td>'+
        '<td class="actions">'+
          (function(){ _curseEntryMap[rowId] = dbKey; return ''; })()+
          '<button class="curse-apply-btn" data-rid="' + rowId + '" data-tgt="" onclick="wearCurseByData(this)" title="Auf mich anwenden">👤</button>'+
          (_selectedMemberNum ? '<button class="curse-apply-btn other" data-rid="' + rowId + '" data-tgt="' + _selectedMemberNum + '" onclick="wearCurseByData(this)" title="Auf #'+_selectedMemberNum+'">👥 #'+_selectedMemberNum+'</button>' : '')+
          '<button data-rid="' + rowId + '" onclick="curseSaveAsProfile(this.dataset.rid)"'
          + ' style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;cursor:pointer;font-size:.72rem;padding:2px 6px;border-radius:4px;margin-left:2px"'
          + ' title="Als Outfit-Profil speichern">💾 Profil</button>'+
          '<button onclick="deleteCurseEntry(\'' + dbKey.replace(/\x27/g,"&apos;") + '\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem;padding:2px 5px;margin-left:2px" title="Eintrag l\xc3�schen (kommt beim n\xc3�chsten Scan wieder)">✕</button>'+
        '</td>';

      tbody.appendChild(tr);

      // Detail row
      const lscgEntry = entry.LSCG;
      const detailFields = [
        ['Beschreibung', entry.Description || '–'],
        ['Farbe', entry.Farbe || '–'],
        ['Property', entry.Property || '–'],
        ['Private', entry.Private ? 'Ja' : 'Nein'],
        ['Zuletzt', entry.ZuletztGesehen],
        ...(isLSCG ? [
          ['LSCG Name', lscgEntry?.Name || '–'],
          ['Outfit Key', lscgEntry?.OutfitKey || '–'],
          ['Speed', lscgEntry?.Speed ?? '–'],
          ['Enabled', lscgEntry?.Enabled ? 'Ja' : 'Nein'],
          ['Inexhaustable', lscgEntry?.Inexhaustable ? 'Ja' : 'Nein'],
          ['Aus Cache', entry.LSCGAusCache ? 'Ja 💾' : 'Nein ✅'],
        ] : []),
      ];

      const detTr = document.createElement('tr');
      detTr.className = 'curse-detail-row';
      detTr.id = detId;
      detTr.innerHTML =
        '<td class="curse-detail-cell" colspan="7">'+
        '<div style="font-size:.63rem;color:var(--text3);margin-bottom:4px">Details für '+escHtml(entry.CraftName)+'</div>'+
        '<div class="curse-detail-grid">'+
        detailFields.map(([label, val]) =>
          '<div class="curse-detail-field">'+
          '<div class="curse-detail-label">'+label+'</div>'+
          '<div class="curse-detail-val">'+escHtml(String(val))+'</div>'+
          '</div>'
        ).join('')+
        '</div></td>';
      tbody.appendChild(detTr);
    });
  });
}

function toggleCurseOwner(id) {
  document.getElementById(id)?.classList.toggle('open');
}

function toggleCurseDetail(detId, rowId) {
  const det = document.getElementById(detId);
  const row = document.getElementById(rowId);
  if (!det || !row) return;
  const open = det.classList.toggle('open');
  row.classList.toggle('expanded', open);
  // Make sure owner block stays open
  const block = det.closest('.curse-owner-block');
  if (open && block) block.classList.add('open');
}

function saveCurseCommentById(rowId, val) {
  const key = _curseEntryMap[rowId];
  if (key) saveCurseComment(key, val);
}

function saveCurseComment(key, val) {
  if (val.trim()) CURSE_COMMENTS[key] = val.trim();
  else delete CURSE_COMMENTS[key];
  _saveCurseComments();
}

function deleteCurseEntry(dbKey) {
  if (!CURSE_DB[dbKey]) return;
  delete CURSE_DB[dbKey];
  _saveCurseDB();
  _updateCurseStats();
  renderCurseTab();
  showStatus('🗑️ Eintrag gelöscht – kommt beim nächsten Scan wieder', 'info');
}

function wearCurseByData(btn) {
  const rowId = btn.dataset.rid;
  const tgt   = btn.dataset.tgt;
  const targetNum = tgt ? parseInt(tgt) : null;
  const key = _curseEntryMap[rowId];
  if (!key) { showStatus('❌ Eintrag nicht gefunden', 'error'); return; }
  wearCurse(key, targetNum);
}


function wearCurse(dbKey, targetNum) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const entry = CURSE_DB[dbKey] ?? null;
  if (!entry) { showStatus('❌ Eintrag nicht in DB: ' + dbKey, 'error'); return; }
  bcSend({ type: 'WEAR_CURSE', dbKey, targetNum, entry });
  showStatus('⏳ Curse wird angelegt...', 'info');
}

// ── Curse → Outfit-Profil speichern ─────────────────────────────────────
// Pending GET_CHAR_APPEARANCE callbacks: reqId → callback(items, name)
const _pendingOutfitSave = {};

// Convert a single BC Appearance item (from GET_CHAR_APPEARANCE response) to profile format
function _appearanceItemToProfile(item) {
  return {
    asset:      item.asset,
    group:      item.group,
    colors:     item.colors     ?? '#ffffff',
    craft:      item.craft      ?? null,
    lock:       item.lock       ?? null,
    tr:         item.tr         ?? {},
    lockMember: item.lockMember ?? null,
    property:   item.property   ?? null,   // full WCE/mod property snapshot
    difficulty: item.difficulty ?? null,
    // legacy separate fields kept for backward compat
    overridePriority: item.overridePriority ?? null,
    layerProperties:  item.layerProperties  ?? null,
  };
}

// Fallback: build a single-item profile from a CURSE_DB entry (when offline)
function _curseEntryToProfileItem(entry) {
  let col = entry.Farbe;
  if (typeof col === 'string' && col.includes(',')) col = col.split(',');
  if (!Array.isArray(col)) col = col ? [col] : ['#ffffff'];
  return {
    asset: entry.ItemName, group: entry.Gruppe,
    colors: col, craft: entry.Craft || null,
    lock: null, tr: {},
    _fromCurse: true, _craftName: entry.CraftName || entry.ItemName
  };
}

// Hilfsfunktion: einzigartigen Profilnamen generieren
// Basis: "{craftName} - {ownerName}", bei Duplikat: "...v2", "...v3", ...
function _uniqueProfileName(base) {
  if (!PROFILES[base]) return base;
  let i = 2;
  while (PROFILES[base + 'v' + i]) i++;
  return base + 'v' + i;
}

// Core save helper – called after we have the item list (online or fallback)
function _doSaveProfile(items, defaultName, owner) {
  const suggested = _uniqueProfileName(defaultName);
  const name = prompt('Profil-Name:', suggested);
  if (!name?.trim()) return;
  const trimmed = name.trim();
  if (PROFILES[trimmed] && !confirm('Profil "' + trimmed + '" existiert bereits. Überschreiben?')) return;
  PROFILES[trimmed] = {
    name: trimmed,
    date: new Date().toLocaleDateString('de-DE'),
    items,
    owner: owner || null,
    favorite: false,
  };
  try {
    localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES));
    showStatus('✅ Profil "' + trimmed + '" gespeichert (' + items.length + ' Items) – nutzbar in Bot-Triggern!', 'success');
  } catch(e) { showStatus('❌ Speichern fehlgeschlagen: ' + e.message, 'error'); }
}

// Request full Appearance for ownerNum, then call cb(items, charName)
// Falls back to CURSE_DB-only if not connected
function _fetchOutfitAndSave(ownerNum, defaultName, fallbackItems, owner) {
  if (!_connected) {
    if (!fallbackItems?.length) { showStatus('❌ Nicht verbunden und keine lokalen Daten', 'error'); return; }
    showStatus('⚠️ Nicht verbunden – nur Curse-Items aus DB gespeichert', 'info');
    _doSaveProfile(fallbackItems, defaultName, owner);
    return;
  }

  const reqId  = 'os_' + Date.now();
  const tgtNum = ownerNum ? Number(ownerNum) : null;

  _pendingOutfitSave[reqId] = function(items, charName) {
    if (!items?.length) {
      if (fallbackItems?.length) {
        showStatus('⚠️ Outfit leer – Fallback auf Curse-Einträge', 'info');
        _doSaveProfile(fallbackItems, defaultName, owner);
      } else {
        showStatus('❌ Keine Items erhalten', 'error');
      }
      return;
    }
    // defaultName already contains "{CraftName} - {OwnerName}" – use it directly
    _doSaveProfile(items.map(_appearanceItemToProfile), defaultName, owner);
  };

  bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: tgtNum, reqId });
  showStatus('⏳ Lese Outfit aus BC…', 'info');
}
// Button: 💾 Profil (pro Curse-Zeile) → "{CraftName} - {OwnerName}"
function curseSaveAsProfile(rowIdOrDbKey) {
  const dbKey = _curseEntryMap[rowIdOrDbKey] ?? rowIdOrDbKey;
  const entry = CURSE_DB[dbKey];
  if (!entry) { showStatus('❌ Eintrag nicht gefunden', 'error'); return; }
  const craftName = entry.CraftName || entry.ItemName || 'Curse';
  const ownerName = entry.Besitzer?.Name || (entry.Besitzer?.Nummer ? '#' + entry.Besitzer.Nummer : 'Player');
  const defaultName = craftName + ' - ' + ownerName;
  _fetchOutfitAndSave(null, defaultName, [_curseEntryToProfileItem(entry)], ownerName);
}

// Button: 💾 Alle speichern (Owner-Header) → "{OwnerName} Outfit" (Sammlung mehrerer Items)
function curseSaveAllAsProfile(ownerNum) {
  const entries = Object.entries(CURSE_DB)
    .filter(([, e]) => String(e.Besitzer?.Nummer ?? '') === String(ownerNum))
    .map(([, e]) => e);
  const ownerName = entries[0]?.Besitzer?.Name || ('#' + ownerNum);
  // Mehrere Items: kein einzelner CraftName sinnvoll → nur OwnerName
  const defaultName = ownerName + ' Outfit';
  _fetchOutfitAndSave(null, defaultName, entries.map(_curseEntryToProfileItem), ownerName);
}

// ── Export / Import ───────────────────────────────────
// Gesammelte Caches für Export
let _exportLscgCache  = null;
let _exportCraftCache = null;

function _tryFinishExport() {
  if (_exportLscgCache === null || _exportCraftCache === null) return; // warten bis beide da
  const mergedLscg  = Object.assign({}, CURSE_CACHE_LSCG, _exportLscgCache);
  const mergedCraft = Object.assign({}, CURSE_DB, _exportCraftCache);
  Object.assign(CURSE_CACHE_LSCG, _exportLscgCache);
  Object.assign(CURSE_DB, _exportCraftCache);
  _saveCurseDB();
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), version: 3 },
    database: mergedCraft,
    lscgTable: CURSE_LSCG,
    lscgCache: mergedLscg,
    comments: CURSE_COMMENTS,
  };
  _exportLscgCache = null; _exportCraftCache = null;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'CurseScanner_' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
  showStatus('✅ Export: ' + Object.keys(mergedCraft).length + ' Crafts, ' + Object.keys(mergedLscg).length + ' LSCG-Cache-Einträge', 'success');
}

function curseExport() {
  if (!Object.keys(CURSE_DB).length) { showStatus('❌ Nichts zum Exportieren', 'error'); return; }
  if (_connected) {
    showStatus('⏳ Lade Cache aus BC...', 'info');
    _pendingExport = true;
    _exportLscgCache  = null;
    _exportCraftCache = null;
    bcSend({ type: 'GET_LSCG_CACHE' });
    bcSend({ type: 'GET_CRAFT_CACHE' });
  } else {
    _exportLscgCache  = {};
    _exportCraftCache = {};
    _tryFinishExport();
  }
}

function curseImport() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        CURSE_DB   = d.database  ?? d;
        CURSE_LSCG = d.lscgTable ?? {};
        CURSE_CACHE_LSCG = d.lscgCache ?? {};
        if (d.comments) Object.assign(CURSE_COMMENTS, d.comments);
        _saveCurseComments();
        _saveCurseDB();
        if (d.favourites) { d.favourites.forEach(k => CURSE_FAVOURITES.add(k)); _saveCurseFavourites(); }
        // Daten gespeichert -> Erfolg melden BEVOR Render (Render-Fehler sollen Import nicht blockieren)
        showStatus('✅ Import: ' + Object.keys(CURSE_DB).length + ' Crafts', 'success');
        // BC updaten
        if (_connected && Object.keys(CURSE_DB).length > 0) {
          bcSend({ type: 'LOAD_CURSE_DB', database: CURSE_DB }, true);
          if (Object.keys(CURSE_CACHE_LSCG).length > 0) bcSend({ type: 'LOAD_LSCG_CACHE', cache: CURSE_CACHE_LSCG }, true);
          bcSend({ type: 'LOAD_CRAFT_CACHE', cache: CURSE_DB }, true);
        }
        // Render separat (Fehler hier sollen Erfolg nicht rueckgaengig machen)
        try { _updateCurseStats(); } catch(e) { console.warn('[Curse Import] stats render error:', e); }
        try { if (_activeTab === 'curse') renderCurseTab(); } catch(e) { console.warn('[Curse Import] tab render error:', e); }
      } catch (err) { showStatus('❌ Import fehlgeschlagen: ' + err.message, 'error'); }
    };
    r.readAsText(e.target.files[0]);
  };
  inp.click();
}

function curseClear() {
  const total = Object.keys(CURSE_DB).length;
  if (!total) { showStatus('ℹ️ Datenbank ist bereits leer', 'info'); return; }
  if (!confirm('Alle ' + total + ' Einträge löschen?\nDanach kannst du neu scannen oder importieren.')) return;
  CURSE_DB         = {};
  CURSE_LSCG       = {};
  CURSE_CACHE_LSCG = {};
  _saveCurseDB();
  _updateCurseStats();
  renderCurseTab();
  showStatus('🗑️ Datenbank geleert', 'success');
}

function curseClearAndScan() {
  const total = Object.keys(CURSE_DB).length;
  const msg = total
    ? 'Alle ' + total + ' Einträge löschen und dann neu scannen?'
    : 'Neu scannen?';
  if (!confirm(msg)) return;
  CURSE_DB         = {};
  CURSE_LSCG       = {};
  CURSE_CACHE_LSCG = {};
  _saveCurseDB();
  _updateCurseStats();
  renderCurseTab();
  curseScan();
  showStatus('🔄 Datenbank geleert – Scan läuft...', 'info');
}

// ── Load curse DB + comments + favourites from IndexedDB on startup ────
(async function() {
  try {
    for (const key of ['BC_CURSE_DB_v1', 'BC_CURSE_COMMENTS_v1', 'BC_CURSE_FAV_v1']) {
      const lsRaw = localStorage.getItem(key);
      if (lsRaw) {
        const existing = await idbGet(key);
        if (!existing) await idbSet(key, JSON.parse(lsRaw));
        localStorage.removeItem(key);
      }
    }
    const d = await idbGet('BC_CURSE_DB_v1');
    if (d) {
      CURSE_DB         = d.database  ?? {};
      CURSE_LSCG       = d.lscgTable ?? {};
      CURSE_CACHE_LSCG = d.lscgCache ?? {};
      if (d.favourites) d.favourites.forEach(k => CURSE_FAVOURITES.add(k));
      _updateCurseStats();
      console.log('[BCK-Popup] Curse DB geladen: ' + Object.keys(CURSE_DB).length + ' Crafts');
      if (document.getElementById('curseBody')) renderCurseTab();
    }
    const comments = await idbGet('BC_CURSE_COMMENTS_v1');
    if (comments) Object.assign(CURSE_COMMENTS, comments);
    const favs = await idbGet('BC_CURSE_FAV_v1');
    if (Array.isArray(favs)) favs.forEach(k => CURSE_FAVOURITES.add(k));
  } catch(e) { console.warn('[BCK-Popup] Curse IDB load error:', e); }
})();

// ══════════════════════════════════════════════════════
//  POSTMESSAGE KOMMUNIKATION MIT BC
// ══════════════════════════════════════════════════════
const APP = 'BCKonfigurator';

// ── Ping-Retry ────────────────────────────────────────
let _pingInterval = null;
let _connected    = false;

function startPingRetry() {
  if (_pingInterval) clearInterval(_pingInterval);
  let n = 0;
  _pingInterval = setInterval(function() {
    if (_connected) { clearInterval(_pingInterval); _pingInterval = null; return; }
    n++;
    const ok = !!window.opener && !window.opener.closed;
    console.log('[BCK-Popup] Ping-Retry #' + n + ' | opener=' + ok);
    if (ok) window.opener.postMessage({ app: APP, type: 'PING' }, '*');
  }, 3000);
}

function manualReconnect() {
  _connected = false;
  stopRoomScan();
  document.getElementById('connStatus').textContent = '\U0001f534 Nicht verbunden';
  document.getElementById('connStatus').style.color = 'var(--red)';
  console.log('[BCK-Popup] manualReconnect()');
  bcSend({ type: 'PING' });
  startPingRetry();
}

function bcSend(msg, silent) {
  try {
    const ok = !!window.opener && !window.opener.closed;
    if (!ok) {
      console.warn('[BCK-Popup] bcSend FAIL – kein opener', msg.type);
      if (!silent) showStatus('\u274c BC-Fenster nicht verf\u00fcgbar \u2013 Bookmarklet nochmal klicken', 'error');
      return false;
    }
    if (!silent || msg.type !== 'PING') console.log('[BCK-Popup] bcSend \u2192', msg.type);
    window.opener.postMessage({ app: APP, ...msg }, '*');
    return true;
  } catch(e) {
    console.error('[BCK-Popup] bcSend Exception:', e.message);
    if (!silent) showStatus('\u274c postMessage Fehler: ' + e.message, 'error');
    return false;
  }
}

window.addEventListener('message', function(ev) {
  if (!ev.data || ev.data.app !== APP) return;
  console.log('[BCK-Popup] \u2190 message:', ev.data.type);

  switch (ev.data.type) {

    case 'PONG':
      console.log('[BCK-Popup] PONG \u2705 Verbunden!');
      if (!_connected) {
        _connected = true;
        if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
        document.getElementById('connStatus').textContent = '\U0001f7e2 Verbunden';
        document.getElementById('connStatus').style.color = 'var(--green)';
        document.getElementById('connectHint')?.classList.add('hidden');
        // Curse-DB an Loader pushen → Wear nach Browserwechsel/Neustart möglich
        if (Object.keys(CURSE_DB).length > 0) {
          bcSend({ type: 'LOAD_CURSE_DB', database: CURSE_DB }, true);
          // FIX: was incorrectly sending CURSE_DB as craft cache - craft entries are already in CURSE_DB
          // Only send LSCG cache separately as it uses a different table
          if (Object.keys(CURSE_CACHE_LSCG).length > 0) {
            bcSend({ type: 'LOAD_LSCG_CACHE', cache: CURSE_CACHE_LSCG }, true);
          }
        }
        // Sofort Raum scannen + Interval starten
        bcSend({ type: 'GET_PLAYER' }, true);
        startRoomScan();
      }
      break;

    case 'CACHE_DATA': {
      console.log('[BCK-Popup] CACHE_DATA err=' + ev.data.err, 'groups=' + Object.keys(ev.data.cache ?? {}).length);
      document.getElementById('loadingSpinner').classList.add('hidden');
      document.getElementById('loadCacheBtn').disabled = false;
      if (ev.data.err) { showStatus('\u274c ' + ev.data.err, 'error'); return; }
      const _data  = ev.data.cache ?? {};
      const _items = Object.values(_data).reduce((s,g) => s + Object.keys(g).length, 0);
      if (_items === 0) { showStatus('\u274c Kein Cache erhalten \u2013 Bist du im Spiel?', 'error'); return; }
      CACHE = _data;
      try { localStorage.setItem('BC_CACHE_v12', JSON.stringify(_data)); } catch {}
      const _mc = Object.values(_data).flatMap(g => Object.values(g)).filter(i => i.archetype === 'modular').length;
      document.getElementById('cacheInfo').textContent = '\u2705 ' + _items + ' Items \u00b7 ' + Object.keys(_data).length + ' Gruppen \u00b7 \U0001f9e9 ' + _mc + ' modular';
      document.getElementById('clearBtn').classList.remove('hidden');
      document.getElementById('outfitBtn')?.classList.remove('hidden');
      document.getElementById('profileBtn')?.classList.remove('hidden');
      document.getElementById('connectHint')?.classList.add('hidden');
      renderGroups();
      showEmpty();
      showStatus('\u2705 ' + _items + ' Items geladen!', 'success');
      bcSend({ type: 'GET_PLAYER' });
      break;
    }

    case 'PLAYER_DATA':
      if (!ev.data.err) {
        const _pi = document.getElementById('playerInfo');
        if (_pi) { _pi.textContent = '\U0001f464 ' + ev.data.name + ' #' + ev.data.memberNumber; _pi.style.display = ''; }
        renderRoomMembers(ev.data);
      } else {
        console.warn('[BCK-Popup] PLAYER_DATA Fehler:', ev.data.err);
      }
      break;

    case 'BOT_EV_STATUS':
      _evIntervalStatusUpdate(ev.data.evId, ev.data.nextMs, ev.data.lo, ev.data.hi, ev.data.cnt);
      break;
    case 'BOT_LOG':
      logPush(ev.data.entry);
      break;

    case 'BOT_MONEY':
      _moneyApply(ev.data.memberNum, ev.data.name, ev.data.delta, ev.data.setVal);
      break;

    case 'BOT_SHOP': {
      _shopLogPurchase(ev.data);
      break;
    }

    case 'BOT_RANG':
      _rankApply(ev.data.memberNum, ev.data.name, ev.data.rankId, 'bot');
      break;

    case 'RANG_INIT': {
      // Spieler registrieren ohne Rang – nur wenn noch nicht bekannt
      const rid = String(ev.data.memberNum);
      if (rid && !_rankData.players[rid]) {
        _rankData.players[rid] = { name: ev.data.name || ('#'+rid), rankId: null, assignedAt: Date.now(), history: [] };
        _saveRank();
        if (document.getElementById('tab-rank')?.classList.contains('active')) renderRankPlayers();
        const btn = document.getElementById('tab-rank-btn');
        if (btn) { const total = Object.values(_rankData.players).filter(x=>x.rankId).length; btn.textContent = '🏆 Rang ('+total+')'; }
        if (document.getElementById('tab-rank')?.classList.contains('active')) renderRankPlayers();
      } else if (rid && _rankData.players[rid]) {
        // Name aktuell halten bei Rejoin
        _rankData.players[rid].name = ev.data.name || _rankData.players[rid].name;
        _saveRank();
      }
      break;
    }

    case 'MONEY_INIT_NEW': {
      // Neuer Spieler - nur eintragen wenn noch nicht vorhanden (0 Gold)
      const mn = ev.data.memberNum;
      if (mn && !_money.balances[mn]) {
        _money.balances[mn] = { name: ev.data.name || ('#'+mn), balance: 0 };
        _saveMoney();
        // Tab-Badge immer aktualisieren (nicht nur wenn Tab aktiv)
        const _moneyBtn = document.getElementById('tab-money-btn');
        if (_moneyBtn) _moneyBtn.textContent = '💰 Money (' + Object.keys(_money.balances).length + ')';
        if (document.getElementById('tab-money')?.classList.contains('active')) renderMoneyTab();
      } else if (mn && _money.balances[mn] && ev.data.name) {
        // Name aktuell halten bei Rejoin
        _money.balances[mn].name = ev.data.name;
      }
      break;
    }
    case 'MONEY_QUERY': {
      const id = ev.data.memberNum; // raw MemberNumber key
      const p = _money.balances[id];
      const bal = p?.balance ?? 0;
      const cur = _money.settings.name || 'Gold';
      const name = ev.data.name || ('#'+ev.data.memberNum);
      // Find any active bot to send the response
      const actBot = _bots.find(b=>b.laufend);
      if (actBot) {
        const queryTyp = _money.settings.queryTyp ?? 'whisper';
        const msgType = queryTyp === 'whisper' ? 'Whisper' : 'Chat';
        const memberNum = ev.data.memberNum;
        const msg = `Du hast ${bal} ${cur}`;
        const code = msgType === 'Whisper'
          ? `ServerSend('ChatRoomChat',{Content:${JSON.stringify(msg)},Type:'Whisper',Target:${memberNum}});`
          : `ServerSend('ChatRoomChat',{Content:${JSON.stringify(name+': '+msg)},Type:'Chat'});`;
        bcSend({type:'EXEC', code});
      }
      break;
    }

    case 'BOT_ROOM_EVER': {
      // Spieler die je da waren persistieren – überlebt Konfigurator-Neustart
      const reKey = 'BC_RoomEver_v1';
      try {
        const reData = JSON.parse(localStorage.getItem(reKey)||'{}');
        reData[ev.data.botId] = ev.data.members;
        localStorage.setItem(reKey, JSON.stringify(reData));
      } catch {}
      break;
    }

    case 'EXEC_OK':
      console.log('[BCK-Popup] EXEC_OK \u2705');
      showStatus('\u2705 Ausgef\u00fchrt!', 'success');
      break;

    case 'EXEC_ERR':
      console.error('[BCK-Popup] EXEC_ERR:', ev.data.msg);
      showStatus('\u274c Fehler: ' + ev.data.msg, 'error');
      break;

    case 'CURSE_DATA':
      _handleCurseData(ev.data);
      break;

    case 'LSCG_CACHE_DATA':
      Object.assign(CURSE_CACHE_LSCG, ev.data.cache ?? {});
      if (_pendingExport) {
        _exportLscgCache = ev.data.cache ?? {};
        _tryFinishExport();
      }
      break;

    case 'CRAFT_CACHE_DATA':
      // FIX: was incorrectly merging into CURSE_DB, corrupting it with craft-cache entries
      // Craft-cache is already part of CURSE_DB structure; just merge missing keys safely
      if (ev.data.cache) {
        for (const [k, v] of Object.entries(ev.data.cache)) {
          if (!CURSE_DB[k]) CURSE_DB[k] = v; // only add truly new entries, don't overwrite
        }
      }
      if (_pendingExport) {
        _exportCraftCache = ev.data.cache ?? {};
        _tryFinishExport();
      }
      break;

    case 'WEAR_CURSE_OK':
      showStatus('\u2705 ' + (ev.data.msg || 'Curse angelegt!'), 'success');
      break;

    case 'WEAR_CURSE_ERR':
      showStatus('\u274c Curse-Fehler: ' + ev.data.msg, 'error');
      break;

    case 'CHAR_APPEARANCE_DATA': {
      const _cb = _pendingOutfitSave[ev.data.reqId];
      if (!_cb) break;
      delete _pendingOutfitSave[ev.data.reqId];
      if (ev.data.err) { showStatus('\u274c Outfit-Laden fehlgeschlagen: ' + ev.data.err, 'error'); break; }
      _cb(ev.data.items ?? [], ev.data.name ?? '');
      break;
    }
  }
});

function loadCacheFromBC() {
  console.log('[BCK-Popup] loadCacheFromBC() | opener=' + !!window.opener + ' closed=' + window.opener?.closed);
  const btn = document.getElementById('loadCacheBtn');
  btn.disabled = true;
  document.getElementById('loadingSpinner').classList.remove('hidden');
  showStatus('\u23f3 Verbinde mit Spiel\u2026', 'info');
  if (!bcSend({ type: 'GET_CACHE' })) {
    document.getElementById('loadingSpinner').classList.add('hidden');
    btn.disabled = false;
  }
}

function clearCache() {
  if (!confirm('Cache l\u00f6schen?')) return;
  CACHE = {};
  try { localStorage.removeItem('BC_CACHE_v12'); } catch {}
  document.getElementById('cacheInfo').textContent = 'Kein Cache';
  document.getElementById('clearBtn').classList.add('hidden');
  document.getElementById('outfitBtn')?.classList.add('hidden');
  document.getElementById('profileBtn')?.classList.add('hidden');
  document.getElementById('connectHint')?.classList.remove('hidden');
  document.getElementById('groupsList').innerHTML = '';
  showEmpty();
}

function showStatus(msg, type) {
  type = type || 'info';
  const el = document.getElementById('statusMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-msg status-' + type;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.add('hidden'); }, 4000);
}

function executeCode() {
  const code = document.getElementById('codeOut').value.trim();
  if (!code) return;
  showStatus('\u23f3 Wird ausgef\u00fchrt\u2026', 'info');
  bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
}

// copyCode: see above

function executeOutfitCode() {
  const code = document.getElementById('outfitCode').value.trim();
  if (!code) return;
  showStatus('\u23f3 Outfit wird ausgef\u00fchrt\u2026', 'info');
  bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
}

// copyOutfitCode: see above


// ══════════════════════════════════════════════════════
//  RAUM-SCANNER
// ══════════════════════════════════════════════════════
let _roomScanInterval = null;
let _myMemberNumber    = null;
let _selectedMemberNum = null;  // Konfigurator-Ziel
let _outfitTargetNum   = null;  // Outfit-Ziel (null = selbst)
let _lastRoomMembers   = [];    // letzter bekannter Raum-Snapshot

// Grace-Period: Spieler muss GRACE_NEEDED aufeinanderfolgende Scans fehlen
// bevor er als "verlassen" gilt. BC leert ChatRoomCharacter kurz beim Sync.
const GRACE_NEEDED = 2;  // 2 × 5s = 10s grace for sync drops
const _missCount   = {};  // memberNum → aufeinanderfolgende Fehlscans

function scanRoom() {
  if (!_connected) return;
  const btn = document.getElementById('roomRefreshBtn');
  if (btn) { btn.textContent = '⏳'; btn.classList.add('room-scanning'); }
  bcSend({ type: 'GET_PLAYER' }, true);
}

function startRoomScan() {
  if (_roomScanInterval) clearInterval(_roomScanInterval);
  _roomScanInterval = setInterval(function() {
    if (_connected) scanRoom();
  }, 5000);
  console.log('[BCK-Popup] Raum-Scanner gestartet (alle 5s)');
}

function stopRoomScan() {
  if (_roomScanInterval) { clearInterval(_roomScanInterval); _roomScanInterval = null; }
}

function renderRoomMembers(data) {
  const container = document.getElementById('roomMembers');
  const btn       = document.getElementById('roomRefreshBtn');
  if (!container) return;
  if (btn) { btn.textContent = '🔄'; btn.classList.remove('room-scanning'); }

  _myMemberNumber = data.memberNumber;
  const freshMembers = data.members ?? [];
  const freshNums    = new Set(freshMembers.map(m => m.num));

  // ── Grace-Period-Logik ────────────────────────────────────────────────────
  // Frische Spieler: Miss-Zähler auf 0 zurücksetzen
  for (const m of freshMembers) _missCount[m.num] = 0;

  // Vermisste Spieler: Zähler hochzählen, erst nach GRACE_NEEDED resetten
  const tracked = new Set([
    ...(_selectedMemberNum ? [_selectedMemberNum] : []),
    ...(_outfitTargetNum   ? [_outfitTargetNum]   : []),
  ]);
  for (const num of tracked) {
    if (!freshNums.has(num)) {
      _missCount[num] = (_missCount[num] || 0) + 1;
      console.log('[BCK-Popup] Spieler #' + num + ' fehlt im Scan (' + _missCount[num] + '/' + GRACE_NEEDED + ')');
    }
  }

  // Konfigurator-Ziel zurücksetzen wenn GRACE_NEEDED überschritten
  if (_selectedMemberNum && (_missCount[_selectedMemberNum] || 0) >= GRACE_NEEDED) {
    console.log('[BCK-Popup] Spieler #' + _selectedMemberNum + ' hat Raum verlassen → reset Konfig-Ziel');
    delete _missCount[_selectedMemberNum];
    _selectedMemberNum = null;
    const modeEl = document.getElementById('targetMode');
    if (modeEl) { modeEl.value = 'self'; onTargetChange(); }
  }

  // Outfit-Ziel zurücksetzen wenn GRACE_NEEDED überschritten
  if (_outfitTargetNum && (_missCount[_outfitTargetNum] || 0) >= GRACE_NEEDED) {
    console.log('[BCK-Popup] Outfit-Ziel #' + _outfitTargetNum + ' hat Raum verlassen → reset');
    delete _missCount[_outfitTargetNum];
    _outfitTargetNum = null;
  }

  // ── Snapshot: frische Daten PLUS bekannte aber kurz fehlende speichern ────
  // Spieler die noch innerhalb der Grace-Period sind trotzdem in der Liste lassen
  const graceMembers = _lastRoomMembers.filter(m =>
    !freshNums.has(m.num) &&
    m.num !== _myMemberNumber &&
    (_missCount[m.num] || 0) < GRACE_NEEDED
  );
  _lastRoomMembers = [...freshMembers, ...graceMembers];

  // ── Raum-Panel rendern ────────────────────────────────────────────────────
  const displayList = _lastRoomMembers;
  if (!displayList.length) {
    container.innerHTML = '<span class="room-empty">– Niemand im Raum –</span>';
  } else {
    container.innerHTML = displayList.map(m => {
      const isSelf  = m.num === _myMemberNumber;
      const isSel   = m.num === _selectedMemberNum;
      const inGrace = !freshNums.has(m.num) && !isSelf;
      const cls = 'room-chip' + (isSelf ? ' self' : '') + (isSel ? ' selected' : '') + (inGrace ? ' grace' : '');
      const click = isSelf ? '' : 'onclick="selectRoomMember(' + m.num + ')"';
      const title = isSelf ? 'Du selbst' : (inGrace ? 'Sync... (kurz nicht sichtbar)' : 'Als Ziel setzen');
      return '<span class="' + cls + '" ' + click + ' title="' + title + '">'
        + (isSelf ? '👤' : (inGrace ? '⏳' : '👥')) + ' ' + escHtml(m.name)
        + ' <span class="room-num">#' + m.num + '</span></span>';
    }).join('');
  }

  // ── Konfigurator-Dropdown aktualisieren ───────────────────────────────────
  const sel = document.getElementById('targetMember');
  if (sel) {
    const others = _lastRoomMembers.filter(m => m.num !== _myMemberNumber);
    sel.innerHTML = '<option value="">– Auswählen –</option>' +
      others.map(m => '<option value="' + m.num + '"' + (m.num === _selectedMemberNum ? ' selected' : '') + '>' + escHtml(m.name) + ' #' + m.num + '</option>').join('');
    if (_selectedMemberNum) sel.value = _selectedMemberNum;
  }

  // ── Outfit-Chips aktualisieren ────────────────────────────────────────────
  renderOutfitMemberChips();
}

function renderOutfitMemberChips() {
  const el = document.getElementById('outfitMemberChips');
  if (!el) return;
  const members = _lastRoomMembers;
  if (!members.length) {
    el.innerHTML = '<span style="color:var(--text3);font-size:.72rem">– Niemand im Raum –</span>';
    return;
  }
  el.innerHTML = members.map(m => {
    const isSelf = m.num === _myMemberNumber;
    const isSel  = isSelf ? _outfitTargetNum === null : m.num === _outfitTargetNum;
    const cls    = 'outfit-chip' + (isSelf ? ' self' : '') + (isSel ? ' sel-out' : '');
    return '<span class="' + cls + '" onclick="setOutfitTarget(' + (isSelf ? 'null' : m.num) + ')">'
      + (isSelf ? '👤' : '👥') + ' ' + escHtml(m.name)
      + ' <span class="onum">#' + m.num + '</span></span>';
  }).join('');
}

function setOutfitTarget(num) {
  _outfitTargetNum = num;
  renderOutfitMemberChips();
  // Code neu generieren falls bereits vorhanden
  _autoOutfitCode();
  console.log('[BCK-Popup] Outfit-Ziel:', num === null ? 'selbst (Player)' : '#' + num);
  // FIX: removed duplicate _autoOutfitCode() call that was here
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function selectRoomMember(num) {
  _selectedMemberNum = num;
  // Ziel-Dropdown auf "Anderer Spieler" setzen
  const modeEl = document.getElementById('targetMode');
  if (modeEl) { modeEl.value = 'other'; onTargetChange(); }
  const sel = document.getElementById('targetMember');
  if (sel) { sel.value = num; }
  const direct = document.getElementById('targetMemberDirect');
  if (direct) { direct.value = num; }
  // Chips neu rendern (selected-Klasse)
  document.querySelectorAll('.room-chip').forEach(chip => {
    chip.classList.toggle('selected', parseInt(chip.querySelector('.room-num')?.textContent?.replace('#','')) === num);
  });
  if (typeof generate === 'function') generate();
  console.log('[BCK-Popup] Ziel gesetzt: #' + num);
}

// ── Auto-load + initial PING ──────────────────────────
(function() {
  console.log('[BCK-Popup] Auto-Init | opener=' + !!window.opener);
  try {
    const s = localStorage.getItem('BC_CACHE_v12');
    if (s) {
      CACHE = JSON.parse(s);
      const items = Object.values(CACHE).reduce((n,g) => n + Object.keys(g).length, 0);
      if (items > 0) {
        const mc = Object.values(CACHE).flatMap(g => Object.values(g)).filter(i => i.archetype === 'modular').length;
        document.getElementById('cacheInfo').textContent = '\u2705 ' + items + ' Items (lokal gecacht) \u00b7 \U0001f9e9 ' + mc + ' modular';
        document.getElementById('clearBtn').classList.remove('hidden');
        document.getElementById('outfitBtn')?.classList.remove('hidden');
        document.getElementById('profileBtn')?.classList.remove('hidden');
        document.getElementById('connectHint')?.classList.add('hidden');
        renderGroups(); showEmpty(); renderProfileList();
        console.log('[BCK-Popup] Cache aus localStorage: ' + items + ' Items');
      }
    }
  } catch(e) { console.warn('[BCK-Popup] localStorage Fehler:', e.message); }

  // Sofortiger PING + Retry-Schleife
  if (window.opener && !window.opener.closed) {
    console.log('[BCK-Popup] Sende ersten PING...');
    window.opener.postMessage({ app: APP, type: 'PING' }, '*');
  }
  // Always render sidebar on startup
  renderGroups();
  renderProfileList();
  startPingRetry();
})();