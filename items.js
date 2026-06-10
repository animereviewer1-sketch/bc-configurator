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

// ── Utility: Debounce ─────────────────────────────────────────
function _debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; fn.apply(this, args); }, delay);
  };
}
const _debouncedSaveCurseDB      = _debounce(function() { _saveCurseDB(); }, 1200);
const _debouncedRenderCurseTab   = _debounce(function() { renderCurseTab(); }, 220);
const _debouncedRenderOutfitList = _debounce(function() { renderOutfitList(); }, 160);
const _debouncedRenderProfileList= _debounce(function() { renderProfileList(); }, 160);
function _debouncedRenderGroups(val) {
  clearTimeout(_debouncedRenderGroups._t);
  _debouncedRenderGroups._t = setTimeout(() => renderGroups(val), 160);
}

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
// IDB-Migration: überschreibt localStorage-Fallback beim Start
idbGet('BC_PROFILES_v12').then(d => { if (d && typeof d === 'object' && Object.keys(d).length) { PROFILES = d; } });
// Speichert Profile in IDB (primär) + localStorage (Fallback)
function _saveProfiles() {
  idbSet('BC_PROFILES_v12', PROFILES);
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch(e) {}
}

// ── Profile Screenshots (base64, per Profil-Name) ─────
let PROFILE_SCREENSHOTS = {};
idbGet('BC_PROFILE_SCREENSHOTS_v1').then(d => { if (d && typeof d === 'object') Object.assign(PROFILE_SCREENSHOTS, d); });
function _saveProfileScreenshots() { idbSet('BC_PROFILE_SCREENSHOTS_v1', PROFILE_SCREENSHOTS); }

// ── Profile Favoriten ─────────────────────────────────
let PROFILE_FAVS = new Set();
try { PROFILE_FAVS = new Set(JSON.parse(localStorage.getItem('BC_PROFILE_FAVS_v1') || '[]')); } catch {}
let _profileFilter = 'all'; // 'all' | 'fav' | 'noold'

// ── Profile Alt-Owner ─────────────────────────────────
// Speichert Owner-Namen die als "alt/veraltet" markiert sind
let PROFILE_ALT_OWNERS = new Set();
(async () => {
  const d = await idbGet('BC_PROFILE_ALT_OWNERS_v1');
  if (Array.isArray(d)) { PROFILE_ALT_OWNERS = new Set(d); }
})();
function _saveProfileAltOwners() { idbSet('BC_PROFILE_ALT_OWNERS_v1', [...PROFILE_ALT_OWNERS]); }

function toggleProfileAltOwner(owner) {
  if (PROFILE_ALT_OWNERS.has(owner)) PROFILE_ALT_OWNERS.delete(owner);
  else PROFILE_ALT_OWNERS.add(owner);
  _saveProfileAltOwners();
  renderProfileList();
}

// Benennt ALLE Profile um, indem " (old)" an den Owner-Teil des Namens angehängt wird.
// Danach erscheinen neue Profile desselben Chars als separate Einträge.
function markAllProfilesOld() {
  const keys = Object.keys(PROFILES);
  if (!keys.length) { showStatus('ℹ️ Keine Profile vorhanden', 'info'); return; }

  // Sammle alle die noch kein (old) haben
  const toRename = [];
  for (const name of keys) {
    const parts = name.split(/\s*-\s+/);
    if (parts.length < 2) continue; // kein Owner-Suffix → überspringen
    const owner = parts[parts.length - 1].trim();
    if (/\(old\)/i.test(owner)) continue; // bereits markiert
    const prefix = parts.slice(0, -1).join(' - ');
    const newName = prefix + ' - ' + owner + ' (old)';
    toRename.push({ oldName: name, newName, oldOwner: owner, newOwner: owner + ' (old)' });
  }

  if (!toRename.length) { showStatus('ℹ️ Alle Profile bereits mit (old) markiert', 'info'); return; }
  if (!confirm('Alle ' + toRename.length + ' Profile umbenennen?\n\nDer Owner-Name bekommt "(old)" als Zusatz. Neue Profile desselben Chars werden dann als separate Einträge gespeichert.')) return;

  const ownersMoved = new Set();
  for (const { oldName, newName, oldOwner, newOwner } of toRename) {
    // Profil-Daten kopieren + Name intern aktualisieren
    const profileData = PROFILES[oldName];
    PROFILES[newName] = Object.assign({}, profileData, { name: newName });
    delete PROFILES[oldName];

    // Screenshot migrieren
    if (PROFILE_SCREENSHOTS[oldName]) {
      PROFILE_SCREENSHOTS[newName] = PROFILE_SCREENSHOTS[oldName];
      delete PROFILE_SCREENSHOTS[oldName];
    }

    // Favorit migrieren
    if (PROFILE_FAVS.has(oldName)) {
      PROFILE_FAVS.delete(oldName);
      PROFILE_FAVS.add(newName);
    }

    ownersMoved.add(oldOwner);
  }

  // Alt-Owner-Markierungen ebenfalls migrieren
  for (const o of ownersMoved) {
    if (PROFILE_ALT_OWNERS.has(o)) {
      PROFILE_ALT_OWNERS.delete(o);
      PROFILE_ALT_OWNERS.add(o + ' (old)');
    }
  }

  _saveProfiles();
  _saveProfileScreenshots();
  try { localStorage.setItem('BC_PROFILE_FAVS_v1', JSON.stringify([...PROFILE_FAVS])); } catch {}
  _saveProfileAltOwners();
  renderProfileList();
  showStatus('✅ ' + toRename.length + ' Profile → "(old)" im Namen eingetragen', 'success');
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
  const lock     = document.getElementById('lockType').value;
  const isRel    = REL_LOCKS.includes(lock);
  const isBcx    = BCX_LOCKS.includes(lock);
  const isDevious = lock === 'DeviousPadlock';
  document.getElementById('timerGroup').classList.toggle('hidden',      !lock.includes('Timer') || isRel);
  document.getElementById('comboGroup').classList.toggle('hidden',      lock !== 'CombinationPadlock');
  document.getElementById('passwordGroup').classList.toggle('hidden',   !PW_LOCKS.includes(lock));
  document.getElementById('relLockGroup').classList.toggle('hidden',    !isRel);
  document.getElementById('bcxLockHint').classList.toggle('hidden',     !isBcx || isDevious);
  document.getElementById('deviousLockGroup').classList.toggle('hidden', !isDevious);
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
  const wrapped = isOther && memberNum
    ? inner + '\n  setTimeout(() => { ChatRoomCharacterUpdate(TARGET); }, 900);'
    : inner + '\n  setTimeout(() => { ServerPlayerAppearanceSync(); setTimeout(()=>{ ChatRoomCharacterUpdate(TARGET); },600); }, 900);';
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
  const isOther   = _outfitTargetNum !== null;
  const memberNum = _outfitTargetNum ?? 0;

  let code = '// ═══════════════════════════════════════════\n//  OUTFIT – ' + OUTFIT.length + ' Items';
  if (isOther) code += ' \u2192 Spieler #' + memberNum;
  code += '\n// ═══════════════════════════════════════════\n';

  // TARGET
  if (isOther && memberNum) {
    code += 'const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === ' + memberNum + ');\n'
          + 'if (!TARGET) { console.error("\u274C Spieler #' + memberNum + ' nicht im Raum!"); throw new Error("TARGET"); }\n';
  } else {
    code += 'const TARGET = Player;\n';
  }

  // Strip + helper \u2013 unver\u00e4nderte Haargruppen aus dem Strip ausnehmen
  const _khg = _currentProfileKeepHairGroups;
  let stripFilter = 'i?.Asset?.Group?.AllowNone === false';
  if (_khg.length) {
    stripFilter += '||new Set(' + JSON.stringify(_khg) + ').has(i?.Asset?.Group?.Name??"")';
  }
  code += '// \u2500\u2500 Strip \u2500\u2500\n'
        + 'TARGET.Appearance = TARGET.Appearance.filter(i => ' + stripFilter + ');\n'
        + '// \u2500\u2500 Helper \u2500\u2500\n'
        + 'function _ws(name,grp,col,preB64,ext,diff){\n'
        + '  InventoryWear(TARGET,name,grp,col,0,null,null,false);\n'
        + '  const it=InventoryGet(TARGET,grp);\n'
        + '  if(!it)return console.error("\u274C "+name);\n'
        + '  it.Color=col; it.Property=it.Property??{};\n'
        + '  if(preB64)Object.assign(it.Property,JSON.parse(decodeURIComponent(escape(atob(preB64)))));\n'
        + '  if(ext)try{ExtendedItemInit(TARGET,it,false,false);}catch(e){}\n'
        + '  it.Difficulty=diff??0;\n'
        + '}\n'
        + '// \u2500\u2500 Items \u2500\u2500\n';

  const BCX_LOCKS_L = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
  const REL_LOCKS_L = ['OwnerPadlock','LoversPadlock','MistressPadlock'];

  // Standard BC hair groups must be applied LAST so mods like 新前発_Luzi
  // (which internally reset HairFront/HairBack when worn) can't overwrite them.
  const _stdHairLast = new Set(['HairFront','HairBack','HairSide','HairFront2','HairBack2']);
  const _sortedOutfit = [...OUTFIT].sort((a, b) => {
    const aLast = _stdHairLast.has(a.group);
    const bLast = _stdHairLast.has(b.group);
    return aLast === bLast ? 0 : aLast ? 1 : -1;
  });

  _sortedOutfit.forEach((item, i) => {
    const { group, asset, colors, tr, property, overridePriority, layerProperties, difficulty, lock, lockParams, _bodyOnly } = item;

    // Pre-props: TypeRecord + all non-visual properties
    const preProp = {};
    const fullProp = property ? Object.assign({}, property) : null;
    const hasTr = tr && Object.keys(tr).length;
    if (hasTr) { preProp.TypeRecord = tr; preProp.Type = Object.entries(tr).map(([k,v]) => k+v).join(''); }
    if (fullProp) {
      for (const [k,v] of Object.entries(fullProp)) {
        if (k !== 'TypeRecord' && k !== 'Type' && k !== 'OverridePriority' && k !== 'LayerProperties') preProp[k] = v;
      }
    }
    // Post-props: OverridePriority + LayerProperties (must apply AFTER ExtendedItemInit)
    const postProp = {};
    if (fullProp?.OverridePriority != null) postProp.OverridePriority = fullProp.OverridePriority;
    else if (overridePriority != null)      postProp.OverridePriority = overridePriority;
    if (fullProp?.LayerProperties)          postProp.LayerProperties  = fullProp.LayerProperties;
    else if (layerProperties)               postProp.LayerProperties  = layerProperties;

    const hasPreProp  = Object.keys(preProp).length > 0;
    const hasPostProp = Object.keys(postProp).length > 0;
    const preB64  = hasPreProp  ? btoa(unescape(encodeURIComponent(JSON.stringify(preProp))))  : null;
    const postB64 = hasPostProp ? btoa(unescape(encodeURIComponent(JSON.stringify(postProp)))) : null;

    code += '// ' + (i+1) + '. ' + asset + ' (' + group + ')' + (_bodyOnly ? ' [Körper-Eigenschaft]' : '') + '\n';

    if (_bodyOnly) {
      // Body-group slot: item already exists (AllowNone===false), just patch properties
      const allProp = Object.assign({}, preProp, postProp);
      if (Object.keys(allProp).length > 0) {
        const allB64 = btoa(unescape(encodeURIComponent(JSON.stringify(allProp))));
        code += '{\n  const _bi=InventoryGet(TARGET,' + JSON.stringify(group) + ');\n'
              + '  if(_bi){_bi.Property=_bi.Property??{};Object.assign(_bi.Property,JSON.parse(decodeURIComponent(escape(atob(' + JSON.stringify(allB64) + ')))));\n'
              + '  try{CharacterRefreshSource(_bi,TARGET,false);}catch(e){}}\n}\n';
      }
    } else {
      code += '_ws(' + JSON.stringify(asset) + ',' + JSON.stringify(group) + ','
            + JSON.stringify(colors) + ','
            + (preB64 ? JSON.stringify(preB64) : 'null') + ','
            + (hasTr ? 'true' : 'false') + ','
            + (difficulty ?? 0) + ');\n';

      // Post-props (OverridePriority / LayerProperties)
      if (hasPostProp) {
        code += 'Object.assign(InventoryGet(TARGET,' + JSON.stringify(group) + ').Property,'
              + 'JSON.parse(decodeURIComponent(escape(atob(' + JSON.stringify(postB64) + ')))));\n';
      }
    }

    // Lock (synchronous)
    if (lock) {
      const isBcx = BCX_LOCKS_L.includes(lock);
      const isRel = REL_LOCKS_L.includes(lock);
      const findLock = isBcx
        ? 'Asset.find(a=>a.Name===' + JSON.stringify(lock) + '&&a.Group?.Name==="ItemMisc")??Asset.find(a=>a.Name===' + JSON.stringify(lock) + ')'
        : 'Asset.find(a=>a.Name===' + JSON.stringify(lock) + '&&a.Group?.Name==="ItemMisc")';
      code += '{\n  const _li=InventoryGet(TARGET,' + JSON.stringify(group) + ');\n'
            + '  const _la=' + findLock + ';\n'
            + '  if(_la&&_li){\n    InventoryLock(TARGET,_li,{Asset:_la},Player.MemberNumber,true);\n';
      if (lockParams?.timer > 0)    code += '    _li.Property.RemoveTimer=Date.now()+' + lockParams.timer + ';\n';
      if (lockParams?.combo)         code += '    _li.Property.CombinationNumber=' + JSON.stringify(lockParams.combo) + ';\n';
      if (lockParams?.password)      code += '    _li.Property.Password=' + JSON.stringify(lockParams.password) + ';\n';
      if (isRel) {
        code += '    _li.Property.LockMemberNumber=' + (lockParams?.relMember || 'Player.MemberNumber') + ';\n';
        if (lockParams?.relTimer > 0) code += '    _li.Property.RemoveTimer=Date.now()+' + lockParams.relTimer + ';\n';
      }
      code += '  }\n}\n';
    }
    code += '\n';
  });

  // Single refresh + deferred sync \u2014 all items applied with push=false above,
  // so ONE combined sync after a short pause avoids BC rate-limit.
  // Standard-Haar Fallback: bei TARGET=Player fehlende Haargruppen aus DEFAULT_HAIR wiederherstellen
  if (!isOther && Object.keys(DEFAULT_HAIR).length) {
    const profileGroups = new Set(_sortedOutfit.map(i => i.group));
    const fallbacks = Object.entries(DEFAULT_HAIR)
      .filter(([g]) => !profileGroups.has(g)) // nur Gruppen die das Profil nicht selbst setzt
      .map(([g, v]) => [g, v.name, v.colors]);
    if (fallbacks.length) {
      const fb64 = btoa(unescape(encodeURIComponent(JSON.stringify(fallbacks))));
      code += '// \u2500\u2500 Standard-Haare Fallback (falls Gruppe nach Strip leer) \u2500\u2500\n'
            + 'JSON.parse(decodeURIComponent(escape(atob(' + JSON.stringify(fb64) + '))))'
            + '.forEach(function(h){if(!InventoryGet(TARGET,h[0]))InventoryWear(TARGET,h[1],h[0],h[2],0,null,null,false);});\n';
    }
  }

  // Sync-Strategie: zwei schwere Server-Calls mit Abstand um Rate-Limit zu vermeiden.
  // AccountUpdate (ServerPlayerAppearanceSync) zuerst, dann 600ms sp\u00e4ter ChatRoomCharacterUpdate.
  // F\u00fcr fremde Targets reicht ChatRoomCharacterUpdate allein.
  let syncCode;
  if (isOther && memberNum) {
    syncCode = 'setTimeout(()=>{ ChatRoomCharacterUpdate(TARGET); console.log("\u2705 Outfit fertig!"); },2500);\n';
  } else {
    syncCode = 'setTimeout(()=>{\n'
             + '  ServerPlayerAppearanceSync();\n'
             + '  setTimeout(()=>{ ChatRoomCharacterUpdate(TARGET); console.log("\u2705 Outfit fertig!"); },600);\n'
             + '},2500);\n';
  }
  code += '// \u2500\u2500 Einmaliger Refresh + Sync (Rate-Limit-sicher) \u2500\u2500\n'
        + 'CharacterRefresh(TARGET,false,false);\n'
        + syncCode;

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

  PROFILES[name] = { name, date: new Date().toLocaleDateString('de-DE'), items: stripped };

  try {
    _saveProfiles();
    renderProfileList();
    document.getElementById('profileNameInput').value = '';
    showStatus('✅ Profil "' + name + '" gespeichert (' + stripped.length + ' Items)', 'success');
  } catch(e) {
    showStatus('❌ Speichern fehlgeschlagen: ' + e.message, 'error');
  }
}

let _currentProfileKeepHairGroups = []; // gesetzt von loadProfile, genutzt von generateOutfitCode

function loadProfile(name) {
  const profile = PROFILES[name];
  if (!profile) return;
  _currentProfileKeepHairGroups = profile.keepHairGroups ?? [];

  if (!Object.keys(CACHE).length) {
    showStatus('❌ Cache nicht geladen! Erst Dump-Script ausführen und Cache importieren.', 'error');
    return;
  }

  const restored = [];
  for (const item of profile.items) {
    const cfg = CACHE[item.group]?.[item.asset];
    if (!cfg) console.warn('⚠️ Item nicht im Cache: ' + item.group + '/' + item.asset);

    const tr = (item.tr && typeof item.tr === 'object' && Object.keys(item.tr).length) ? item.tr : null;

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
      propCode:         '',
      craftStr,
      lockParams,
      trStr:            tr ? JSON.stringify(tr) : '{}',
      typeStr:          tr ? Object.entries(tr).map(([k,v]) => k+v).join('') : '',
      property:         item.property ?? null,
      overridePriority: item.overridePriority ?? null,
      layerProperties:  item.layerProperties  ?? null,
      difficulty:       item.difficulty       ?? null,
    });
  }

  OUTFIT = restored;
  _autoOutfitCode();
  showStatus('✅ Profil "' + name + '" geladen (' + restored.length + ' Items)', 'success');
}

function deleteProfile(name) {
  if (!confirm('Profil "' + name + '" löschen?')) return;
  delete PROFILES[name];
  // Screenshot cleanup
  if (PROFILE_SCREENSHOTS[name]) { delete PROFILE_SCREENSHOTS[name]; _saveProfileScreenshots(); }
    _saveProfiles();
  renderProfileList();
}

// ── Profile name map for safe event binding ───────────
const _profileNameMap = {}; // slotKey → profileName

// ── Profil-Duplikat-Erkennung ─────────────────────────
function _profileFingerprint(p) {
  if (!p) return '';
  // Outfit-Code Profile: Code-String als Fingerprint
  if (p._outfitCode) return 'oc:' + p._outfitCode.trim();
  // Normal-Profile: sortierte Group/Asset-Paare
  const items = (p.items || []).slice()
    .sort((a, b) => (a.group || '').localeCompare(b.group || '') || (a.asset || '').localeCompare(b.asset || ''));
  return items.map(i => (i.group || '') + '/' + (i.asset || '')).join('|');
}

function _getProfileDuplicates() {
  // Gibt Map<fingerprint → [name, ...]> zurück (nur Gruppen mit >1 Eintrag)
  const fpMap = new Map();
  Object.entries(PROFILES).forEach(([name, p]) => {
    const fp = _profileFingerprint(p);
    if (!fp) return;
    if (!fpMap.has(fp)) fpMap.set(fp, []);
    fpMap.get(fp).push(name);
  });
  const dupeGroups = new Map();
  fpMap.forEach((names, fp) => { if (names.length > 1) dupeGroups.set(fp, names); });
  return dupeGroups;
}

function removeProfileDuplicates() {
  const dupeGroups = _getProfileDuplicates();
  if (!dupeGroups.size) { showStatus('✅ Keine Duplikate gefunden', 'success'); return; }
  let removed = 0;
  dupeGroups.forEach(names => {
    // Ersten behalten, Rest löschen
    names.slice(1).forEach(n => { delete PROFILES[n]; removed++; });
  });
  _saveProfiles();
  renderProfileList();
  showStatus('🗑️ ' + removed + ' doppelte' + (removed !== 1 ? ' Profile' : 's Profil') + ' entfernt', 'success');
}

function _profileDupSets() {
  // Gibt {dupSet, orgSet} zurück
  // orgSet: erstes Vorkommen einer Gruppe (hat Kopien)
  // dupSet: alle weiteren Vorkommen
  const dupSet = new Set();
  const orgSet = new Set();
  _getProfileDuplicates().forEach(names => {
    orgSet.add(names[0]);
    names.slice(1).forEach(n => dupSet.add(n));
  });
  return { dupSet, orgSet };
}

// Compat-Alias für bestehende Aufrufe
function _profileDupSet() { return _profileDupSets().dupSet; }

function _profileSortKey(name) {
  // Split on " - " or "- " (with or without leading space)
  const parts = name.split(/\s*-\s+/);
  const owner = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  return owner + '\x00' + name.toLowerCase();
}

function _profileOwnerOf(name) {
  const parts = name.split(/\s*-\s+/);
  return parts.length > 1 ? parts[parts.length - 1].trim() : '– Ohne Zuordnung –';
}

function _profileShortName(name, owner) {
  return name.replace(new RegExp('\\s*-\\s+' + owner.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$'), '').trim() || name;
}

// ── Profile Edit Mode State ───────────────────────────
let _profileEditMode = null; // profileName currently in edit mode

function renderProfileList() {
  const el = document.getElementById('profileListEl');
  if (!el) return;
  const q = (document.getElementById('profileSearch')?.value || '').toLowerCase();
  let keys = Object.keys(PROFILES).filter(k => !q || k.toLowerCase().includes(q));
  // Favoriten-Filter
  if (_profileFilter === 'fav')     keys = keys.filter(k => PROFILE_FAVS.has(k));
  if (_profileFilter === 'withshot') keys = keys.filter(k => !!PROFILE_SCREENSHOTS[k]);
  if (_profileFilter === 'noshot')  keys = keys.filter(k => !PROFILE_SCREENSHOTS[k]);
  // (old) ausblenden – alle Profile deren Owner "(old)" im Namen hat
  if (_profileFilter === 'noold')  keys = keys.filter(k => !/\(old\)/i.test(_profileOwnerOf(k)));
  document.querySelectorAll('.profile-fc').forEach(chip => chip.classList.toggle('on', chip.dataset.filter === _profileFilter));
  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.8rem">Noch keine Profile gespeichert.</p>';
    el._profileKeys = [];
    return;
  }
  keys = keys.slice().sort((a, b) => _profileSortKey(a).localeCompare(_profileSortKey(b)));
  el._profileKeys = keys;

  // Build name map for safe event binding
  Object.keys(_profileNameMap).forEach(k => delete _profileNameMap[k]);
  keys.forEach((name, idx) => { _profileNameMap['p_' + idx] = name; });

  // Group by owner
  const byOwner = {};
  keys.forEach((k, idx) => {
    const owner = _profileOwnerOf(k);
    if (!byOwner[owner]) byOwner[owner] = [];
    byOwner[owner].push({ name: k, idx });
  });

  // Baue Name→ID-Map aus CURSE_DB für live #ID-Anzeige
  const _ownerIdMap = {};
  for (const e of Object.values(CURSE_DB)) {
    const n = e.Besitzer?.Name?.trim();
    const id = e.Besitzer?.Nummer ? String(e.Besitzer.Nummer) : null;
    if (n && id && !_ownerIdMap[n]) _ownerIdMap[n] = id;
  }
  // Gibt den Owner-Label zurück, ergänzt #ID wenn bekannt und noch nicht vorhanden
  // Wenn der Owner als Alt markiert ist, wird "(old)" angehängt
  function _ownerLabel(owner) {
    // Ist alt wenn: manuell im Set ODER "(old)" steckt bereits im Namen
    const isAlt = PROFILE_ALT_OWNERS.has(owner) || /\(old\)/i.test(owner);
    const altBadge = ' <span style="color:#e55;font-size:.6rem;font-weight:700;border:1px solid #e55;border-radius:3px;padding:0 3px;vertical-align:middle;opacity:.9">(old)</span>';
    if (/#\d{4,}/.test(owner)) {
      // Bereits angereichert (hat #ID drin) – nur Badge anhängen wenn alt
      return escHtml(owner) + (isAlt ? altBadge : '');
    }
    // Basis-Name ohne #ID-Suffix und ohne (old)-Tag → für CURSE_DB-Lookup
    const baseName = owner.replace(/\s*#\d+.*$/, '').replace(/\s*\(old\)\s*$/i, '').trim();
    const displayName = owner.replace(/\s*\(old\)\s*$/i, '').trim(); // für Anzeige ohne doppeltes (old)
    const id = _ownerIdMap[baseName];
    if (id) {
      return escHtml(displayName) + (isAlt ? altBadge : '') + ' <span style="color:var(--text3);font-size:.6rem;font-family:var(--font-mono)">#' + id + '</span>';
    }
    return escHtml(owner) + (isAlt && !/\(old\)/i.test(owner) ? altBadge : '');
  }

  // Duplikate berechnen: ORG = Original (erstes), DUP = Kopien
  const { dupSet: _dupProfileSet, orgSet: _orgProfileSet } = _profileDupSets();
  const _dupGroupMap = new Map(); // name → [alle siblings] für Tooltip
  _getProfileDuplicates().forEach(names => {
    names.forEach(n => _dupGroupMap.set(n, names));
  });

  const html = Object.entries(byOwner).map(([owner, profiles]) => {
    const blockId = 'pb_' + owner.replace(/[^a-zA-Z0-9]/g, '_');
    const wasOpen = document.getElementById(blockId)?.classList.contains('open');
    const stripNames = profiles.map(p => p.name); // for modal prev/next

    // Build the edit panel for whichever card (if any) is in edit mode
    let editPanel = '';
    const editEntry = profiles.find(({ name }) => _profileEditMode === name);
    if (editEntry) {
      const { name, idx } = editEntry;
      const p = PROFILES[name];
      const slotKey = 'p_' + idx;
      const nameInput = '<div class="profile-edit-name-row">'
        + '<label style="font-size:.62rem;color:var(--text3)">Profilname:</label>'
        + '<input class="profile-edit-name-inp" id="pedit_name_' + idx + '" value="' + escHtml(name) + '" maxlength="60">'
        + '<button class="profile-gear-btn" data-slot="' + slotKey + '" onclick="profileRename(this.dataset.slot)" title="Umbenennen">💾 Speichern</button>'
        + '</div>';
      const itemRows = (p.items || []).map((item, iIdx) => {
        const hasCfg = !!CACHE[item.group]?.[item.asset];
        return '<div class="profile-item-row" id="pirow_' + idx + '_' + iIdx + '">'
          + '<span class="profile-item-asset">' + escHtml(item.asset) + '</span>'
          + '<span class="profile-item-group">' + escHtml(item.group) + '</span>'
          + (item.lock ? '<span class="profile-item-badge lock">🔒 ' + escHtml(item.lock) + '</span>' : '')
          + (item.craft?.Name ? '<span class="profile-item-badge craft">✏️ ' + escHtml(item.craft.Name) + '</span>' : '')
          + '<button class="profile-gear-btn' + (!hasCfg ? ' nocache' : '') + '" data-slot="' + slotKey + '" data-iidx="' + iIdx + '" onclick="profileOpenInItemManager(this.dataset.slot,this.dataset.iidx)" title="' + (hasCfg ? 'Im Item Manager öffnen' : 'Zur Gruppe navigieren (nicht im Cache)') + '">⚙️</button>'
          + '<button class="profile-row-del" data-slot="' + slotKey + '" data-iidx="' + iIdx + '" onclick="profileDeleteItem(this.dataset.slot,this.dataset.iidx)" title="Item entfernen" style="margin-left:4px">✕</button>'
          + '</div>';
      }).join('');
      editPanel = '<div class="pc-edit-panel"><div class="profile-item-list">' + nameInput + itemRows + '</div></div>';
    }

    // Build card strip
    const cards = profiles.map(({ name, idx }) => {
      const p = PROFILES[name];
      const shortName = _profileShortName(name, owner);
      const slotKey = 'p_' + idx;
      const isFav = PROFILE_FAVS.has(name);
      const isEdit = _profileEditMode === name;
      const isDup = _dupProfileSet.has(name);
      const isOrg = _orgProfileSet.has(name);
      const img = PROFILE_SCREENSHOTS[name];
      const letter = escHtml((shortName[0] || '?').toUpperCase());

      const thumbContent = img
        ? '<img src="' + escHtml(img) + '" alt="">'
        : '<div class="pc-placeholder">' + letter + '</div>';

      const dupSiblings = (isDup || isOrg)
        ? (_dupGroupMap.get(name) || []).filter(n => n !== name).map(n => escHtml(n)).join(', ')
        : '';
      const dupBadge = isDup
        ? '<span class="pc-tag" title="Kopie von: ' + dupSiblings + '">DUP</span>'
        : isOrg
        ? '<span class="pc-tag" title="Original – Kopien: ' + dupSiblings + '">ORG</span>'
        : '<span class="pc-tag">Profil</span>';

      // Use data-slot + data-strip-owner for the modal click — avoids inline JSON escaping issues
      // Thumb click always opens the modal; screenshot capture only via explicit button
      const thumbHint = img ? '<span class="pc-zoom">🔍</span>' : '<span class="pc-capture-hint">📸</span>';

      return '<div class="pc' + (isEdit ? ' pc-edit-active' : '') + '" id="prow_' + idx + '">'
        + '<div class="pc-thumb" data-slot="' + slotKey + '" data-strip-owner="' + escHtml(blockId) + '" onclick="_openProfileCard(this.dataset.slot,this.dataset.stripOwner)">'
        + thumbContent
        + dupBadge
        + '<button class="pc-fav' + (isFav ? ' on' : '') + '" data-pkey="' + idx + '" onclick="event.stopPropagation();toggleProfileFav(_profileNameMap[\'p_\'+this.dataset.pkey])" title="Favorit">'
        + (isFav ? '⭐' : '☆') + '</button>'
        + thumbHint
        + '</div>'
        + '<div class="pc-name" title="' + escHtml(name) + '">' + escHtml(shortName) + '</div>'
        + '<div class="pc-meta">' + (p.items?.length ?? 0) + ' Items · ' + (p.date || '') + '</div>'
        + '<div class="pc-actions">'
        + '<button class="pc-btn primary" data-slot="' + slotKey + '" onclick="profileExecuteBySlot(this.dataset.slot)" title="Laden + ausführen">▶ Run</button>'
        + '<button class="pc-btn' + (isFav ? ' fav-on' : '') + '" data-pkey="' + idx + '" onclick="toggleProfileFav(_profileNameMap[\'p_\'+this.dataset.pkey])" title="Favorit">⭐</button>'
        + '<button class="pc-btn' + (isEdit ? ' edit-on' : '') + '" data-slot="' + slotKey + '" onclick="profileToggleEdit(this.dataset.slot)" title="Bearbeiten">✏️</button>'
        + '<button class="pc-btn" data-slot="' + slotKey + '" onclick="copyProfileToYuuki(_profileNameMap[this.dataset.slot])" title="Kopie unter Yuuki 998 erstellen" style="font-size:9px">📋 Yuuki</button>'
        + '<button class="pc-btn" data-slot="' + slotKey + '" onclick="_showCardColorFreq(this.dataset.slot)" title="Farb-Häufigkeit anzeigen und Farben ersetzen">🎨</button>'
        + '</div>'
        + '</div>';
    }).join('');

    const isAltOwner = PROFILE_ALT_OWNERS.has(owner) || /\(old\)/i.test(owner);
    return '<div class="profile-owner-block' + ((wasOpen !== false) ? ' open' : '') + '" id="' + blockId + '">'
      + '<div class="profile-owner-hdr" onclick="document.getElementById(\'' + blockId + '\').classList.toggle(\'open\')">'
      + '<span class="profile-owner-name">' + _ownerLabel(owner) + '</span>'
      + '<button class="profile-alt-btn' + (isAltOwner ? ' active' : '') + '" onclick="event.stopPropagation();toggleProfileAltOwner(\'' + owner.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" title="Als Alt/Veraltet markieren – Name bekommt (old) Markierung">' + (isAltOwner ? '🔴 (old)' : '🔘 (old)') + '</button>'
      + '<span class="profile-owner-count">' + profiles.length + '</span>'
      + '<span class="profile-owner-chevron">▶</span>'
      + '</div>'
      + '<div class="profile-owner-rows"><div class="profile-strip">' + cards + '</div>' + editPanel + '</div>'
      + '</div>';
  }).join('');

  el.innerHTML = html;

  // Duplikat-Button ein-/ausblenden
  const dupBtn = document.getElementById('profileDupBtn');
  if (dupBtn) {
    const dupCount = _dupProfileSet.size;
    if (dupCount > 0) {
      dupBtn.textContent = '⚠️ ' + dupCount + ' Duplikat' + (dupCount !== 1 ? 'e' : '') + ' entfernen';
      dupBtn.style.display = '';
    } else {
      dupBtn.style.display = 'none';
    }
  }
}

// ══════════════════════════════════════════════════════
//  Standard-Haar Baseline
// ══════════════════════════════════════════════════════
let DEFAULT_HAIR = {}; // { groupName: { name, colors } }

(async () => {
  const d = await idbGet('BC_DEFAULT_HAIR_v1');
  if (d && typeof d === 'object') {
    DEFAULT_HAIR = d;
    console.log('[BCK] Standard-Haare geladen:', Object.keys(d));
    _renderDefaultHairList();
  }
})();

async function _saveDefaultHairIDB() { await idbSet('BC_DEFAULT_HAIR_v1', DEFAULT_HAIR); }

// Erkennt Haargruppen anhand des Gruppennamens
function _isHairGroupName(gn) {
  return /hair/i.test(gn) || gn.includes('发') || gn.includes('髪') || gn.includes('髮');
}

// Tiefer Farb-Vergleich (Array oder String)
function _colorsEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// Rendert die Liste der gespeicherten Standard-Haargruppen
function _renderDefaultHairList() {
  const el = document.getElementById('defaultHairList');
  if (!el) return;
  const keys = Object.keys(DEFAULT_HAIR);
  if (!keys.length) {
    el.innerHTML = '<span style="color:var(--text3);font-size:.72rem;font-style:italic">Keine Standard-Haare gesetzt</span>';
    return;
  }
  el.innerHTML = keys.map(g => {
    const entry = DEFAULT_HAIR[g];
    const cols = Array.isArray(entry.colors) ? entry.colors : (entry.colors ? [entry.colors] : []);
    // Build color swatches – skip 'Default' entries (no real color to show)
    const swatches = cols
      .filter(c => c && c !== 'Default')
      .map(c => '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;border:1px solid rgba(255,255,255,.25);background:' + escHtml(c) + ';flex-shrink:0" title="' + escHtml(c) + '"></span>')
      .join('');
    return '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:.7rem;margin:2px 2px">'
      + '<span style="color:var(--text2);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escHtml(g) + '">' + escHtml(g) + '</span>'
      + '<span style="color:var(--text4)">→</span>'
      + '<span style="color:var(--accent-text)">' + escHtml(entry.name) + '</span>'
      + (swatches ? '<span style="display:inline-flex;gap:2px;align-items:center">' + swatches + '</span>' : '')
      + '<button onclick="removeDefaultHairGroup(\'' + g.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:10px;padding:0 2px;line-height:1">✕</button>'
      + '</span>';
  }).join('');
}

function removeDefaultHairGroup(gn) {
  delete DEFAULT_HAIR[gn];
  _saveDefaultHairIDB();
  _renderDefaultHairList();
  showStatus('🗑️ Haargruppe entfernt: ' + gn, 'info');
}

function toggleDefaultHairPanel() {
  const el = document.getElementById('defaultHairPanel');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'flex';
}

function clearDefaultHair() {
  if (!confirm('Alle Standard-Haare zurücksetzen?')) return;
  DEFAULT_HAIR = {};
  _saveDefaultHairIDB();
  _renderDefaultHairList();
  showStatus('🗑️ Standard-Haare geleert', 'info');
}

// Scannt aktuellen Charakter und speichert Haargruppen als Baseline
function captureDefaultHair() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  const reqId = 'dh_' + Date.now();
  _pendingOutfitSave[reqId] = function(items) {
    if (!items?.length) { showStatus('❌ Keine Items erhalten', 'error'); return; }
    const hairItems = items.filter(it => _isHairGroupName(it.group ?? ''));
    DEFAULT_HAIR = {};
    hairItems.forEach(it => { DEFAULT_HAIR[it.group] = { name: it.asset, colors: it.colors }; });
    _saveDefaultHairIDB();
    _renderDefaultHairList();
    showStatus('✅ Standard-Haare gespeichert: ' + hairItems.length + ' Gruppen', 'success');
  };
  bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: null, reqId });
  showStatus('⏳ Scanne Haare…', 'info');
}

// Filtert Items gegen DEFAULT_HAIR-Baseline:
//  • Gleiches Modell + gleiche Farbe  → aus Profil entfernen, Gruppe in keepHairGroups (Strip schont sie)
//  • Alles andere (Modell oder Farbe geändert) → komplett mit echten Farben aufnehmen
//
// Hinweis: 'Default' als Farbwert wird NICHT verwendet – InventoryWear akzeptiert das nicht
// und würde das Item unsichtbar/ungültig machen, was dann den Standard-Haar-Fallback auslöst.
// HairColor-Gruppen niemals in keepHairGroups – die Farbe muss immer explizit gesetzt werden,
// sonst behält der Zielcharakter seine eigene Haarfarbe (statt der Quell-Farbe).
const _HAIR_COLOR_GROUP_NAMES = new Set(['HairColor','HairColorAccessory','HairColorUnder']);

function _applyHairBaseline(items) {
  if (!Object.keys(DEFAULT_HAIR).length) return { filteredItems: items, keepHairGroups: [] };
  const filteredItems = [];
  const keepHairGroups = [];
  for (const item of items) {
    // Farb-Overlay-Gruppen immer in Profil aufnehmen – nie als "unverändert" werten,
    // damit die Ziel-Figur die korrekte Haarfarbe bekommt (auch bei Cross-Char-Anwendung).
    if (_HAIR_COLOR_GROUP_NAMES.has(item.group)) {
      filteredItems.push(item);
      continue;
    }
    const baseline = DEFAULT_HAIR[item.group];
    if (!baseline) { filteredItems.push(item); continue; }
    const sameName   = baseline.name === item.asset;
    const sameColors = _colorsEqual(baseline.colors, item.colors);
    if (sameName && sameColors) {
      // Exakt unverändert → Strip schont diese Gruppe, Profil braucht sie nicht
      keepHairGroups.push(item.group);
    } else {
      // Modell oder Farbe vom Curse verändert → komplett mit echten Farben speichern
      filteredItems.push(item);
    }
  }
  return { filteredItems, keepHairGroups };
}

// ── Profile Screenshot: Canvas-Capture via BC ────────
const _pendingScreenshot = {}; // reqId → profileName

function captureProfileScreenshot(pname) {
  const name = _profileNameMap[pname] || pname;
  if (!name || !PROFILES[name]) return;
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  const reqId = 'ss_' + Date.now();
  _pendingScreenshot[reqId] = name;

  // Nutzt Player.Canvas (wie LSCG-Outfit): schneller, nur der Charakter, kein UI-Hintergrund.
  // Sendet SCREENSHOT_DATA (nicht CANVAS_PREVIEW_DATA) damit kein Slideshow-Callback ausgelöst wird.
  const J_reqId = JSON.stringify(reqId);
  const code = '(function(){'
    + 'CharacterRefresh(Player,false,false);'
    + 'CharacterLoadCanvas(Player);'
    + 'setTimeout(function(){'
    + '  try{'
    + '    var src=Player.Canvas;'
    + '    if(!src||!src.width)throw new Error("Canvas leer");'
    + '    var oc=document.createElement("canvas");oc.width=src.width;oc.height=src.height;'
    + '    oc.getContext("2d").drawImage(src,0,0);'
    + '    var id=oc.getContext("2d").getImageData(0,0,oc.width,oc.height);'
    + '    var px=id.data,W=oc.width,H=oc.height;'
    + '    var x0=W,x1=0,y0=H,y1=0;'
    + '    for(var r=0;r<H;r++){for(var c=0;c<W;c++){'
    + '      var ii=(r*W+c)*4;'
    + '      if(px[ii]>5||px[ii+1]>5||px[ii+2]>5){'
    + '        if(c<x0)x0=c;if(c>x1)x1=c;if(r<y0)y0=r;if(r>y1)y1=r;'
    + '      }'
    + '    }}'
    + '    if(x1<x0){x0=0;y0=0;x1=W-1;y1=H-1;}'
    + '    var pad=20;'
    + '    x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);'
    + '    x1=Math.min(W-1,x1+pad);y1=Math.min(H-1,y1+pad);'
    + '    var cw=x1-x0+1,ch=y1-y0+1;'
    + '    var cc=document.createElement("canvas");cc.width=cw;cc.height=ch;'
    + '    var ctx2=cc.getContext("2d");'
    + '    ctx2.fillStyle="#000";ctx2.fillRect(0,0,cw,ch);'
    + '    ctx2.drawImage(oc,x0,y0,cw,ch,0,0,cw,ch);'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"SCREENSHOT_DATA",reqId:' + J_reqId + ',data:cc.toDataURL("image/jpeg",0.88)},"*");'
    + '  }catch(e){'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"SCREENSHOT_DATA",reqId:' + J_reqId + ',err:e.message},"*");'
    + '  }'
    + '},250);'
    + '})();';

  bcSend({ type: 'EXEC', code }, true);
  showStatus('📸 Screenshot wird aufgenommen…', 'info');
}

// ── Auto-Screenshot Slideshow ─────────────────────────
let _slideshowTimer   = null;
let _slideshowQueue   = [];
let _slideshowTotal   = 0;
let _slideshowPaused  = false; // true = pausiert (Disconnect), wartet auf Reconnect
let _slideshowRunning = false; // true sobald Slideshow läuft (auch wenn Queue leer aber Capture läuft)

function toggleProfileSlideshow() {
  if (_slideshowRunning || _slideshowTimer !== null || _slideshowQueue.length || _slideshowPaused) {
    _stopProfileSlideshow();
    showStatus('⏹ Auto-Screenshot gestoppt', 'info');
    return;
  }
  _startProfileSlideshow();
}

function _startProfileSlideshow() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  _slideshowRunning = true;
  // Originaloutfit vor dem Start sichern – wird vor jedem Profil wiederhergestellt
  // damit Haare/Slots aus Profil N nicht in Profil N+1 überlaufen.
  bcSend({ type: 'EXEC', code: '(function(){window.__BCU_slideshowOrig=Player.Appearance.slice();})();' }, true);
  // Alle Profile ohne Screenshot sammeln
  _slideshowQueue = Object.keys(PROFILES).filter(n => !PROFILE_SCREENSHOTS[n]);
  _slideshowTotal  = _slideshowQueue.length;
  if (!_slideshowTotal) {
    showStatus('✅ Alle Profile haben bereits einen Screenshot', 'info');
    return;
  }
  const btn = document.getElementById('profileSlideshowBtn');
  if (btn) { btn.textContent = '⏹ Stop (' + _slideshowTotal + ')'; btn.classList.add('btn-red'); btn.classList.remove('btn-primary'); }
  showStatus('📸 Auto-Screenshot gestartet – ' + _slideshowTotal + ' Profile', 'info');
  _runNextSlideshow();
}

function _runNextSlideshow() {
  if (!_slideshowQueue.length) {
    _stopProfileSlideshow();
    showStatus('✅ Auto-Screenshot fertig – alle Screenshots generiert!', 'success');
    return;
  }
  const name = _slideshowQueue.shift();
  const remaining = _slideshowQueue.length;
  const done = _slideshowTotal - remaining;
  // Profil ausführen (lädt Outfit in BC)
  const p = PROFILES[name];
  if (p && _connected) {
    // Restore-Präambel: stellt Originaloutfit wieder her bevor das Profil-Outfit angewendet wird.
    // So überlaufen Haare/Slots aus Profil N nicht in Profil N+1.
    const restorePreamble = ''
      + 'if(window.__BCU_slideshowOrig){'
      + '  Player.Appearance.splice(0,Player.Appearance.length);'
      + '  window.__BCU_slideshowOrig.forEach(function(i){Player.Appearance.push(i);});'
      + '  CharacterRefresh(Player,false,false);'
      + '}';
    if (p._outfitCode) {
      // LSCG-Profil: LZString-Bundle → single EXEC (apply + capture atomar)
      captureProfileViaCanvas(name, p._outfitCode, null);
    } else {
      // Normales Profil: raw-JS-Code aus UI → in single EXEC einbetten
      loadProfile(name);
      // 20ms reichen – loadProfile ist synchron, wir brauchen nur einen Microtask-Flush
      setTimeout(() => {
        const rawCode = document.getElementById('outfitCode')?.value?.trim() || null;
        captureProfileViaCanvas(name, null, rawCode);
      }, 20);
    }
    showStatus('📸 (' + done + '/' + _slideshowTotal + ') "' + name + '" – noch ' + remaining + ' übrig', 'info');
    const btn = document.getElementById('profileSlideshowBtn');
    if (btn) btn.textContent = '⏹ Stop (' + remaining + ')';
    // Kein _slideshowTimer mehr – _handleCanvasPreviewData ruft _runNextSlideshow() nach Capture auf
  } else if (!_connected) {
    // Nicht verbunden → Slideshow pausieren, Profil zurück in Queue
    _slideshowQueue.unshift(name);
    _slideshowPaused = true;
    showStatus('⏸ Slideshow pausiert – warte auf Reconnect…', 'info');
    const pauseBtn = document.getElementById('profileSlideshowBtn');
    if (pauseBtn) pauseBtn.textContent = '⏸ Pausiert (' + _slideshowQueue.length + ')';
  } else {
    // Profil nicht vorhanden → überspringen
    _runNextSlideshow();
  }
}

function _stopProfileSlideshow() {
  clearTimeout(_slideshowTimer);
  _slideshowTimer   = null;
  _slideshowQueue   = [];
  _slideshowTotal   = 0;
  _slideshowPaused  = false;
  _slideshowRunning = false;
  // Laufende Canvas-Captures abbrechen + Timeouts clearen
  Object.values(_pendingProfileCapture).forEach(e => clearTimeout(e?.timeoutId));
  Object.keys(_pendingProfileCapture).forEach(k => delete _pendingProfileCapture[k]);
  // Originaloutfit nach dem Slideshow wiederherstellen + Server-Sync
  if (_connected) {
    bcSend({ type: 'EXEC', code: '(function(){'
      + 'if(!window.__BCU_slideshowOrig)return;'
      + 'Player.Appearance.splice(0,Player.Appearance.length);'
      + 'window.__BCU_slideshowOrig.forEach(function(i){Player.Appearance.push(i);});'
      + 'CharacterRefresh(Player,false,false);'
      + 'if(typeof ServerPlayerAppearanceSync==="function")ServerPlayerAppearanceSync();'
      + 'else if(typeof ServerSend==="function")ServerSend("AccountUpdate",{Appearance:Player.Appearance});'
      + 'window.__BCU_slideshowOrig=null;'
      + '})();' }, true);
  }
  const btn = document.getElementById('profileSlideshowBtn');
  if (btn) { btn.textContent = '📸 Auto-Screenshot'; btn.classList.remove('btn-red'); btn.classList.add('btn-primary'); }
}

// Called from postMessage handler when BC responds with SCREENSHOT_DATA
function _handleScreenshotData(data) {
  const name = _pendingScreenshot[data.reqId];
  delete _pendingScreenshot[data.reqId];
  if (!name) return;
  if (data.err) { showStatus('❌ Screenshot: ' + data.err, 'error'); return; }
  if (!data.data) { showStatus('❌ Screenshot: Keine Daten', 'error'); return; }

  // Resize to max 520×693 before storing (keeps file small)
  const imgEl = new Image();
  imgEl.onload = () => {
    const MAX_W = 520, MAX_H = 1040;
    let w = imgEl.naturalWidth, h = imgEl.naturalHeight;
    const scale = Math.min(1, MAX_W / w, MAX_H / h);
    w = Math.round(w * scale); h = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
    PROFILE_SCREENSHOTS[name] = canvas.toDataURL('image/jpeg', 0.88);
    _saveProfileScreenshots();
    renderProfileList();
    showStatus('✅ Screenshot gespeichert für "' + name + '"', 'success');
    const mod = document.getElementById('profileModal');
    if (mod?.classList.contains('open') && _profileModalName === name) _renderProfileModal(name);
  };
  imgEl.src = data.data;
}

// ── Canvas-Vorschau: öffnet TARGET.Canvas als styled Tab ─
const _pendingCanvasPreview = {};

function openCanvasPreview() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }

  const mode = document.getElementById('targetMode')?.value;
  let memberNum = null;
  if (mode === 'other') {
    const sel = document.getElementById('targetMember')?.value;
    const dir = document.getElementById('targetMemberDirect')?.value;
    const raw = sel || dir;
    if (raw) memberNum = parseInt(raw, 10);
  }

  const reqId = 'cv_' + Date.now();
  _pendingCanvasPreview[reqId] = true;

  const targetExpr = memberNum
    ? 'ChatRoomCharacter.find(function(c){return c.MemberNumber===' + memberNum + ';})'
    : 'Player';

  const code = '(function(){'
    + 'var T=' + targetExpr + ';'
    + 'if(!T){window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + JSON.stringify(reqId) + ',err:"Spieler nicht im Raum"},"*");return;}'
    + 'try{CharacterLoadCanvas(T);}catch(e){}'
    + 'requestAnimationFrame(function(){'
    + 'try{'
    + 'var src=T.Canvas;'
    + 'if(!src||!src.width)throw new Error("Canvas leer");'
    + 'var oc=document.createElement("canvas");oc.width=src.width;oc.height=src.height;'
    + 'oc.getContext("2d").drawImage(src,0,0);'
    + 'var d=oc.toDataURL("image/png");'
    + 'window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + JSON.stringify(reqId) + ','
    + 'data:d,name:T.Nickname||T.Name,memberNumber:T.MemberNumber,'
    + 'itemCount:(T.Appearance||[]).length,width:src.width,height:src.height},"*");'
    + '}catch(e){'
    + 'window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + JSON.stringify(reqId) + ',err:e.message},"*");'
    + '}'
    + '});'
    + '})();';

  bcSend({ type: 'EXEC', code }, true);
  showStatus('🖼 Canvas wird geladen…', 'info');
}

function _handleCanvasPreviewData(data) {
  // ── LSCG-Capture (reqId beginnt mit 'os_') ──────────
  if (_pendingOsCapture[data.reqId] !== undefined) {
    const { mk, fp } = _pendingOsCapture[data.reqId];
    delete _pendingOsCapture[data.reqId];

    if (data.err) {
      if (data.err.startsWith('DECODE_FAIL:') || data.err.startsWith('APPLY_FAIL:')) {
        // Kaputten Code markieren → Karte zeigt Repair-Button
        const vKey = fp ? (mk + '|' + fp) : mk;
        _osBrokenCodes[vKey] = data.err;
        showStatus('⚠️ #' + mk + ': Code fehlerhaft – Reparieren?', 'error');
        if (_activeTab === 'outfit-scan') renderOutfitScanTab();
      } else {
        showStatus('❌ #' + mk + ': ' + data.err, 'error');
      }
    } else if (data.data) {
      const imgEl = new Image();
      imgEl.onload = function() {
        const MAX_W = 520, MAX_H = 1040;
        let w = imgEl.naturalWidth, h = imgEl.naturalHeight;
        const scale = Math.min(1, MAX_W / w, MAX_H / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
        const oc = document.createElement('canvas');
        oc.width = w; oc.height = h;
        oc.getContext('2d').drawImage(imgEl, 0, 0, w, h);
        const dataUrl = oc.toDataURL('image/jpeg', 0.88);
        // Versionsspezifisch speichern: mk|fp (falls fp bekannt)
        const storeKey = fp ? (mk + '|' + fp) : mk;
        LSCG_SCREENSHOTS[storeKey] = dataUrl;
        _saveLscgScreenshots();
        _syncLscgScreenshotToProfiles(mk, fp);
        if (_activeTab === 'outfit-scan') renderOutfitScanTab();
        showStatus('✅ Bild gespeichert', 'success');
        if (_pendingOsTab === mk) {
          _pendingOsTab = null;
          openOsLightbox(mk);
        }
      };
      imgEl.src = data.data;
    }
    _runNextOsCapture();
    return;
  }

  // ── Profil-Canvas-Capture (reqId beginnt mit 'ps_') ──────────
  if (_pendingProfileCapture[data.reqId] !== undefined) {
    const entry = _pendingProfileCapture[data.reqId];
    const name = entry?.name ?? entry; // Kompatibilität: früher war es ein String
    clearTimeout(entry?.timeoutId);
    delete _pendingProfileCapture[data.reqId];
    console.log('[BCU] ps_ capture empfangen:', name, 'err:', data.err || 'none');

    if (data.err) {
      showStatus('⚠️ Profil-Screenshot "' + name + '": ' + data.err, 'error');
    } else if (data.data) {
      const imgEl = new Image();
      imgEl.onload = function() {
        const MAX_W = 520, MAX_H = 1040;
        let w = imgEl.naturalWidth, h = imgEl.naturalHeight;
        const scale = Math.min(1, MAX_W / w, MAX_H / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
        const oc = document.createElement('canvas');
        oc.width = w; oc.height = h;
        oc.getContext('2d').drawImage(imgEl, 0, 0, w, h);
        PROFILE_SCREENSHOTS[name] = oc.toDataURL('image/jpeg', 0.88);
        _saveProfileScreenshots();
        renderProfileList();
        showStatus('✅ Screenshot: "' + name + '"', 'success');
        const mod = document.getElementById('profileModal');
        if (mod?.classList.contains('open') && _profileModalName === name) _renderProfileModal(name);
      };
      imgEl.src = data.data;
    }
    // Kleiner Delay zwischen Screenshots: verhindert BC ErrorRateLimited
    setTimeout(_runNextSlideshow, 250);
    return;
  }

  // ── Standard Canvas-Vorschau (Tab öffnen) ───────────
  if (!_pendingCanvasPreview[data.reqId]) return;
  delete _pendingCanvasPreview[data.reqId];

  if (data.err) { showStatus('❌ Canvas-Vorschau: ' + data.err, 'error'); return; }
  if (!data.data) { showStatus('❌ Canvas-Vorschau: Keine Daten', 'error'); return; }

  const name      = data.name      || '–';
  const membNum   = data.memberNumber ?? '–';
  const itemCount = data.itemCount  ?? '–';
  const w         = data.width      ?? '–';
  const h         = data.height     ?? '–';

  const tab = window.open('', '_blank');
  if (!tab) { showStatus('❌ Popup blockiert – bitte Popup-Blocker deaktivieren', 'error'); return; }

  tab.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>#${membNum} – ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0d0d0f;--bg2:#141418;--bg3:#1a1a20;
  --border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);
  --accent:oklch(72% 0.13 58);--accent-text:oklch(82% 0.1 62);
  --accent-soft:oklch(72% 0.13 58 / 0.14);--accent-line:oklch(72% 0.13 58 / 0.35);
  --text:#f4f2ee;--text2:#a8a69f;--text3:#6d6b66;
  --green:#34d399;--gd:rgba(6,78,59,0.6);
  --shadow-lg:0 16px 48px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.35);
  --r-xl:22px;--font-ui:'Inter Tight',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-ui);font-size:13.5px}
body{display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
.card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-xl);box-shadow:var(--shadow-lg);overflow:hidden;width:340px}
.card-header{padding:16px 18px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);flex-shrink:0}
.card-title{font-size:1rem;font-weight:800;color:var(--accent-text)}
.card-sub{font-size:0.72rem;color:var(--text3);font-family:var(--font-mono);margin-top:1px}
.img-wrap{background:var(--bg3);display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--border);overflow:hidden}
.img-wrap img{width:100%;display:block}
.card-footer{padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;font-size:0.7rem;font-weight:600;font-family:var(--font-mono);background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent-line)}
.badge-green{background:var(--gd);color:var(--green);border-color:rgba(52,211,153,0.25)}
.meta{font-size:0.72rem;color:var(--text3);font-family:var(--font-mono)}
</style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <div class="dot"></div>
    <div>
      <div class="card-title">${name}</div>
      <div class="card-sub">#${membNum}</div>
    </div>
  </div>
  <div class="img-wrap"><img src="${data.data}" alt="${name}"></div>
  <div class="card-footer">
    <span class="badge badge-green">✅ Canvas OK</span>
    <span class="badge">${itemCount} Items</span>
    <span class="meta">${w}\xd7${h}px</span>
  </div>
</div>
</body></html>`);
  tab.document.close();
  showStatus('🖼 Canvas-Vorschau geöffnet', 'success');
}

// ── Fallback: Screenshot manuell hochladen ────────────
function uploadProfileScreenshot(pname) {
  const name = _profileNameMap[pname] || pname;
  if (!name || !PROFILES[name]) return;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const MAX_W = 520, MAX_H = 1040;
        let w = imgEl.naturalWidth, h = imgEl.naturalHeight;
        const scale = Math.min(1, MAX_W / w, MAX_H / h);
        w = Math.round(w * scale); h = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
        PROFILE_SCREENSHOTS[name] = canvas.toDataURL('image/jpeg', 0.88);
        _saveProfileScreenshots();
        renderProfileList();
        const mod = document.getElementById('profileModal');
        if (mod?.classList.contains('open') && _profileModalName === name) _renderProfileModal(name);
      };
      imgEl.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function removeProfileScreenshot(pname) {
  const name = _profileNameMap[pname] || pname;
  if (!name) return;
  delete PROFILE_SCREENSHOTS[name];
  _saveProfileScreenshots();
  renderProfileList();
  const mod = document.getElementById('profileModal');
  if (mod?.classList.contains('open') && _profileModalName === name) _renderProfileModal(name);
}

// ── Profile Modal ─────────────────────────────────────
// Resolves strip sibling names from the DOM (avoids inline JSON in onclick)
function _openProfileCard(slotKey, blockId) {
  // Collect all .pc-thumb elements in the same strip owner block
  const block = document.getElementById(blockId);
  const thumbs = block ? Array.from(block.querySelectorAll('.pc-thumb[data-slot]')) : [];
  const stripNames = thumbs.map(th => _profileNameMap[th.dataset.slot]).filter(Boolean);
  openProfileModal(slotKey, stripNames.length ? stripNames : null);
}

let _profileModalNames = []; // names in current strip
let _profileModalIdx   = 0;
let _profileModalSlot  = null; // 'p_N'
let _profileModalName  = null; // real name

function openProfileModal(slotOrName, stripNamesOrJson) {
  // stripNamesOrJson can be a JS array or a JSON string
  if (stripNamesOrJson) {
    const arr = typeof stripNamesOrJson === 'string' ? JSON.parse(stripNamesOrJson) : stripNamesOrJson;
    _profileModalNames = arr;
  }
  // Resolve name from slot or direct name
  const name = _profileNameMap[slotOrName] || slotOrName;
  _profileModalIdx = Math.max(0, _profileModalNames.indexOf(name));
  _profileModalName = _profileModalNames[_profileModalIdx] || name;
  // Find slot
  const slotIdx = Object.entries(_profileNameMap).find(([,v]) => v === _profileModalName)?.[0];
  _profileModalSlot = slotIdx || slotOrName;
  _renderProfileModal(_profileModalName);
  document.getElementById('profileModal').classList.add('open');
}

function _renderProfileModal(name) {
  const p = PROFILES[name];
  if (!p) return;
  _profileModalName = name;
  const slotEntry = Object.entries(_profileNameMap).find(([,v]) => v === name);
  _profileModalSlot = slotEntry ? slotEntry[0] : null;

  // Reset color freq panel on profile switch
  _pmodColorFreqOpen = false;
  const _cfPanel = document.getElementById('pmodColorFreqPanel');
  if (_cfPanel) { _cfPanel.style.display = 'none'; _cfPanel.innerHTML = ''; }
  const _cfBtn = document.getElementById('pmodColorFreqBtn');
  if (_cfBtn) _cfBtn.textContent = '🎨 Farben';

  const owner = _profileOwnerOf(name);
  const shortName = _profileShortName(name, owner);
  const isFav = PROFILE_FAVS.has(name);
  const img = PROFILE_SCREENSHOTS[name];
  const idx = _profileModalIdx;
  const total = _profileModalNames.length;

  // Title / sub
  document.getElementById('pmodTitle').textContent = shortName;
  document.getElementById('pmodSub').textContent = (p.items?.length ?? 0) + ' Items · ' + (p.date || '—');
  document.getElementById('pmodItemCount').textContent = (p.items?.length ?? 0);
  document.getElementById('pmodDate').textContent = p.date || '—';
  document.getElementById('pmodOwner').textContent = owner;

  // Image
  const imgPanel = document.getElementById('pmodImgPanel');
  // Remove old img if any
  imgPanel.querySelectorAll('img,.pmod-img-placeholder').forEach(el => el.remove());
  if (img) {
    const imgEl = document.createElement('img');
    imgEl.src = img;
    imgPanel.insertBefore(imgEl, imgPanel.firstChild);
  } else {
    const ph = document.createElement('div');
    ph.className = 'pmod-img-placeholder';
    ph.textContent = (shortName[0] || '?').toUpperCase();
    imgPanel.insertBefore(ph, imgPanel.firstChild);
  }

  // Screenshot / upload / remove buttons
  const captureBtn = document.getElementById('pmodCaptureBtn');
  const uploadBtn  = document.getElementById('pmodUploadBtn');
  const removeBtn  = document.getElementById('pmodRemoveBtn');
  if (captureBtn) captureBtn.dataset.pname = name;
  if (uploadBtn)  uploadBtn.dataset.pname  = name;
  if (removeBtn)  { removeBtn.dataset.pname = name; removeBtn.style.display = img ? '' : 'none'; }

  // Fav button
  const favBtn = document.getElementById('pmodFavBtn');
  if (favBtn) { favBtn.textContent = (isFav ? '⭐ Favorit' : '☆ Favorit'); favBtn.classList.toggle('fav-on', isFav); }

  // Nav visibility
  const prevBtn = document.getElementById('pmodPrev');
  const nextBtn = document.getElementById('pmodNext');
  if (prevBtn) prevBtn.style.display = idx > 0 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = idx < total - 1 ? '' : 'none';
}

function closeProfileModal() {
  document.getElementById('profileModal')?.classList.remove('open');
  _pmodColorFreqOpen = false;
}

function profileModalPrev() {
  if (_profileModalIdx > 0) {
    _profileModalIdx--;
    _profileModalName = _profileModalNames[_profileModalIdx];
    const slotEntry = Object.entries(_profileNameMap).find(([,v]) => v === _profileModalName);
    _profileModalSlot = slotEntry ? slotEntry[0] : null;
    _renderProfileModal(_profileModalName);
  }
}
function profileModalNext() {
  if (_profileModalIdx < _profileModalNames.length - 1) {
    _profileModalIdx++;
    _profileModalName = _profileModalNames[_profileModalIdx];
    const slotEntry = Object.entries(_profileNameMap).find(([,v]) => v === _profileModalName);
    _profileModalSlot = slotEntry ? slotEntry[0] : null;
    _renderProfileModal(_profileModalName);
  }
}
function _pmodToggleFav() {
  if (_profileModalName) {
    toggleProfileFav(_profileModalName);
    _renderProfileModal(_profileModalName);
  }
}
function _pmodOpenEdit() {
  closeProfileModal();
  if (_profileModalSlot) profileToggleEdit(_profileModalSlot);
}
function _pmodDelete() {
  if (!_profileModalName) return;
  const pkey = Object.keys(_profileNameMap).find(k => _profileNameMap[k] === _profileModalName);
  if (!pkey) return;
  closeProfileModal();
  deleteProfileByIdx(pkey.replace('p_', ''));
}

// Keyboard navigation for modal
document.addEventListener('keydown', (e) => {
  const mod = document.getElementById('profileModal');
  if (!mod?.classList.contains('open')) return;
  if (e.key === 'Escape') closeProfileModal();
  else if (e.key === 'ArrowLeft') profileModalPrev();
  else if (e.key === 'ArrowRight') profileModalNext();
});

function profileLoadBySlot(slot) {
  const name = _profileNameMap[slot];
  if (name) loadProfile(name);
}

// Lädt Profil UND führt Code sofort aus (▶ Ausführen Button)
function profileExecuteBySlot(slot) {
  const name = _profileNameMap[slot];
  if (!name) return;
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const p = PROFILES[name];
  // Handle raw outfit code profiles (from Outfit Import)
  if (p?._outfitCode) {
    if (typeof _oiBuildExecCode === 'function') {
      bcSend({ type: 'EXEC', code: _oiBuildExecCode(p._outfitCode) });
    } else {
      // Fallback if outfit-import.js not loaded yet
      bcSend({ type: 'EXEC', code: '(function(){ try { var _d=LZString.decompressFromBase64(' + JSON.stringify(p._outfitCode) + '); var _a=JSON.parse(_d); if(Array.isArray(_a)){ ServerPlayerInventoryLoad(_a); CharacterRefresh(Player,true,false); } } catch(e){ console.error("[OI]",e); } })();' });
    }
    showStatus('▶ Outfit-Code "' + name + '" ausgeführt', 'success');
    return;
  }
  // Normal profile execution
  loadProfile(name);
  setTimeout(() => {
    const code = document.getElementById('outfitCode')?.value?.trim();
    if (!code) { showStatus('❌ Kein Code generiert – Cache geladen?', 'error'); return; }
    bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
    showStatus('▶ Profil "' + name + '" ausgeführt (' + OUTFIT.length + ' Items)', 'success');
    // Auto-Screenshot falls noch keiner vorhanden – warten bis BC den Outfit gerendert hat
    if (!PROFILE_SCREENSHOTS[name]) {
      setTimeout(() => captureProfileScreenshot(name), 2800);
    }
  }, 60);
}

function toggleProfileFav(name) {
  if (PROFILE_FAVS.has(name)) PROFILE_FAVS.delete(name);
  else PROFILE_FAVS.add(name);
  try { localStorage.setItem('BC_PROFILE_FAVS_v1', JSON.stringify([...PROFILE_FAVS])); } catch {}
  renderProfileList();
}

function setProfileFilter(f) {
  _profileFilter = f;
  document.querySelectorAll('.profile-fc').forEach(el => el.classList.toggle('on', el.dataset.filter === f));
  renderProfileList();
}

function profileToggleEdit(slot) {
  const name = _profileNameMap[slot];
  if (!name) return;
  _profileEditMode = _profileEditMode === name ? null : name;
  renderProfileList();
}

function profileRename(slot) {
  const oldName = _profileNameMap[slot];
  if (!oldName) return;
  // Find input by iterating since we can't use the idx directly
  const inputs = document.querySelectorAll('.profile-edit-name-inp');
  let newName = null;
  inputs.forEach(inp => { if (inp.value.trim() && _profileEditMode === oldName) newName = inp.value.trim(); });
  if (!newName || newName === oldName) return;
  if (PROFILES[newName] && !confirm('Name "' + newName + '" existiert bereits. Überschreiben?')) return;
  PROFILES[newName] = { ...PROFILES[oldName], name: newName };
  delete PROFILES[oldName];
  // Migrate screenshot to new name
  if (PROFILE_SCREENSHOTS[oldName]) { PROFILE_SCREENSHOTS[newName] = PROFILE_SCREENSHOTS[oldName]; delete PROFILE_SCREENSHOTS[oldName]; _saveProfileScreenshots(); }
  _profileEditMode = newName;
    _saveProfiles();
  showStatus('✅ Profil umbenannt → "' + newName + '"', 'success');
  renderProfileList();
}

function profileDeleteItem(slot, iIdx) {
  const name = _profileNameMap[slot];
  if (!name) return;
  const p = PROFILES[name];
  if (!p?.items) return;
  p.items.splice(parseInt(iIdx), 1);
    _saveProfiles();
  renderProfileList();
}

function profileOpenInItemManager(slot, iIdx) {
  const name = _profileNameMap[slot];
  if (!name) return;
  const p = PROFILES[name];
  const item = p?.items?.[parseInt(iIdx)];
  if (!item) return;
  switchTab('items');
  const cfg = CACHE[item.group]?.[item.asset];
  if (cfg) {
    selectItem(item.group, item.asset);
    showStatus('⚙️ ' + item.asset + ' im Item Manager geöffnet', 'info');
  } else {
    // Nicht im Cache – Sidebar-Suche auf Asset-Name setzen
    const searchEl = document.querySelector('.sidebar-search');
    if (searchEl) { searchEl.value = item.asset; renderGroups(item.asset); }
    showStatus('⚠️ ' + item.asset + ' nicht im Cache – Suche gesetzt', 'info');
  }
}

// ── Kopie unter Yuuki 998 ────────────────────────────────────────────────
const YUUKI_OWNER = 'Yuuki 998';

function copyProfileToYuuki(name) {
  const p = PROFILES[name];
  if (!p) return;
  const owner = _profileOwnerOf(name);
  const shortName = _profileShortName(name, owner);
  const newName = shortName + ' - ' + YUUKI_OWNER;
  if (PROFILES[newName] && !confirm('Profil "' + newName + '" existiert bereits. Überschreiben?')) return;
  PROFILES[newName] = {
    name: newName,
    date: new Date().toLocaleDateString('de-DE'),
    items: JSON.parse(JSON.stringify(p.items || [])),
    ...(p.keepHairGroups ? { keepHairGroups: [...p.keepHairGroups] } : {}),
  };
  _saveProfiles();
  renderProfileList();
  showStatus('✅ Kopie "' + newName + '" unter Yuuki 998 erstellt', 'success');
}

function _pmodCopyToYuuki() {
  if (_profileModalName) copyProfileToYuuki(_profileModalName);
}

// ── Farb-Häufigkeit / Color Frequency v4 ─────────────────────────────────

// ── State ──
let _cfreqCtxType          = '';
let _cfreqCtxKey           = '';
let _cfreqChanges          = {};        // global: { origLower → newHex }
let _cfreqLinked           = new Set(); // global exact link:  set of origLower
let _cfreqLinkedShift      = new Set(); // global shift link:  set of origLower
let _cfreqViewMode         = 'global';
let _cfreqSrcItems         = null;
let _cfreqItemChanges      = {};        // item: { 'iidx:lidx' → newHex }
let _cfreqLinkedItems      = new Set(); // item exact link:  set of 'iidx:lidx'
let _cfreqLinkedItemsShift = new Set(); // item shift link:  set of 'iidx:lidx'
let _cfreqThemePanelOpen   = false;
let _cfreqActiveTheme      = null;  // { id, name, icon, colors:[], selected:[] }

// ── Vordefinierte Farbthemen ──────────────────────────────
const CFREQ_THEMES = [

  // ════ LATEX – Einfarbig ═══════════════════════════════
  { id:'latex_bk',   icon:'🖤', name:'Latex Schwarz',    colors:['#050505','#0f0f0f','#1e1e1e','#2e2e2e','#f0f0f0'] },
  { id:'latex_wh',   icon:'🤍', name:'Latex Weiß',      colors:['#c0c0c0','#d8d8d8','#ebebeb','#f5f5f5','#ffffff'] },
  { id:'latex_rd',   icon:'🔴', name:'Latex Rot',       colors:['#140000','#5c0000','#b30000','#ff1a1a','#ffd6d6'] },
  { id:'latex_pk',   icon:'🩷', name:'Latex Pink',      colors:['#1a0010','#700040','#cc0077','#ff44bb','#ffccee'] },
  { id:'latex_np',   icon:'🌺', name:'Latex Neon-Pink', colors:['#140008','#55002a','#cc0066','#ff33aa','#ffaadd'] },
  { id:'latex_pu',   icon:'💜', name:'Latex Lila',      colors:['#0d0015','#3a0060','#7700cc','#bb44ff','#f0ccff'] },
  { id:'latex_bl',   icon:'💙', name:'Latex Blau',      colors:['#000a1a','#001a66','#0044cc','#3377ff','#cce0ff'] },
  { id:'latex_tc',   icon:'🩵', name:'Latex Cyan',      colors:['#001414','#004040','#009999','#00eeee','#ccffff'] },
  { id:'latex_tl',   icon:'💎', name:'Latex Türkis',    colors:['#001a14','#005040','#009980','#33ddbb','#aaffee'] },
  { id:'latex_gr',   icon:'💚', name:'Latex Grün',      colors:['#001400','#004d00','#009900','#33dd44','#ccffdd'] },
  { id:'latex_ng',   icon:'🍀', name:'Latex Neon-Grün', colors:['#000a00','#003300','#00aa00','#33ff33','#ccffcc'] },
  { id:'latex_or',   icon:'🧡', name:'Latex Orange',    colors:['#140800','#5c2200','#b34400','#ff7700','#ffd6aa'] },
  { id:'latex_no',   icon:'🔶', name:'Latex Neon-Org',  colors:['#140500','#5c1500','#cc4400','#ff6600','#ffcc99'] },
  { id:'latex_gd',   icon:'💛', name:'Latex Gold',      colors:['#1a1000','#4d3300','#997700','#ffcc00','#fff5aa'] },
  { id:'latex_yl',   icon:'🌻', name:'Latex Gelb',      colors:['#141000','#4d4000','#999900','#eeee00','#ffff99'] },
  { id:'latex_sv',   icon:'🪩', name:'Latex Silber',    colors:['#1a1a1a','#404040','#707070','#aaaaaa','#e8e8e8'] },
  { id:'latex_bz',   icon:'🟤', name:'Latex Bronze',    colors:['#1a0c00','#5c3300','#a05a00','#d4891a','#f0c87a'] },
  { id:'latex_nd',   icon:'🫧', name:'Latex Nude',      colors:['#2a1510','#7a4030','#c07850','#e0a880','#f5d5c0'] },
  { id:'latex_wr',   icon:'🍷', name:'Latex Weinrot',   colors:['#0d0005','#3a000f','#7a0020','#b01040','#e05070'] },
  { id:'latex_br',   icon:'🪵', name:'Latex Braun',     colors:['#0a0500','#2d1500','#5c2e00','#8b4513','#c47a3a'] },

  // ════ LATEX – Zweifarbig / Spezial ════════════════════
  { id:'latex_bkrd', icon:'🖤', name:'Latex Schwarz/Rot',   colors:['#050505','#1e1e1e','#5c0000','#aa0000','#ff2222'] },
  { id:'latex_bkpk', icon:'🖤', name:'Latex Schwarz/Pink',  colors:['#050505','#1e1e1e','#660044','#cc0077','#ff44bb'] },
  { id:'latex_bkpu', icon:'🖤', name:'Latex Schwarz/Lila',  colors:['#050505','#1e1e1e','#3a0060','#7700cc','#cc88ff'] },
  { id:'latex_bkgd', icon:'🖤', name:'Latex Schwarz/Gold',  colors:['#050505','#1e1e1e','#3d2d00','#997700','#ffcc00'] },
  { id:'latex_bkbl', icon:'🖤', name:'Latex Schwarz/Blau',  colors:['#050505','#1e1e1e','#001a66','#0055cc','#4499ff'] },
  { id:'latex_bkwh', icon:'🐼', name:'Latex Schwarz/Weiß',  colors:['#050505','#111111','#888888','#e0e0e0','#ffffff'] },
  { id:'latex_rdgd', icon:'🔴', name:'Latex Rot/Gold',      colors:['#140000','#5c0000','#aa0000','#cc6600','#ffcc00'] },
  { id:'latex_pugd', icon:'💜', name:'Latex Lila/Gold',     colors:['#0d0015','#3a0060','#7700cc','#bb8800','#ffcc00'] },
  { id:'latex_suit', icon:'🫀', name:'Vollanzug (Skin)',     colors:['#050505','#0f0f0f','#1a1a1a','#c07858','#f0c8a8'] },

  // ════ BDSM / FETISCH – Styles ═════════════════════════
  { id:'bondage',    icon:'⛓️', name:'Bondage',          colors:['#0a0807','#1a1410','#2e2218','#5a3e28','#c8b090'] },
  { id:'rope',       icon:'🪢', name:'Seil (Jute)',      colors:['#1a1000','#4a3010','#8b6914','#c4a458','#f0dca0'] },
  { id:'rope_silk',  icon:'🎀', name:'Seil (Seide)',     colors:['#e8d0f0','#d0a8d8','#a87ec0','#7850a0','#502880'] },
  { id:'mistress',   icon:'👑', name:'Mistress',         colors:['#0d0010','#3d0050','#800080','#cc0044','#f5d0e0'] },
  { id:'slave',      icon:'🔒', name:'Slave',            colors:['#0a0a0a','#1e1e1e','#2d2d2d','#888888','#c8c8c8'] },
  { id:'dungeon',    icon:'🏰', name:'Dungeon',          colors:['#080808','#1a1008','#2d200a','#4a3a20','#706040'] },
  { id:'cage',       icon:'🗝️', name:'Käfig / Stahl',   colors:['#101010','#202020','#404040','#707070','#c0c8d0'] },
  { id:'maid',       icon:'🎀', name:'Maid',             colors:['#080808','#1e1e1e','#f5f5f5','#ffffff','#cc2244'] },
  { id:'nurse',      icon:'💉', name:'Krankenschwester', colors:['#800000','#cc0000','#f0f0f0','#ffffff','#e8f0e8'] },
  { id:'catsuit',    icon:'🐈', name:'Catsuit',          colors:['#020202','#0a0a0a','#141414','#2a2a2a','#f0f0f0'] },
  { id:'corset',     icon:'🪭', name:'Korsett',          colors:['#1a0808','#5c1a1a','#8b3030','#c47070','#f0d0d0'] },
  { id:'petplay',    icon:'🐾', name:'Pet Play',         colors:['#0a0605','#2d1a0a','#7a5030','#c49060','#f0d0a0'] },
  { id:'ponyplay',   icon:'🐴', name:'Pony Play',        colors:['#1a1000','#4a3010','#8b6030','#c4a068','#f0e0c0'] },
  { id:'medical',    icon:'🏥', name:'Medizinisch',      colors:['#1a2e1a','#2d5c2d','#50b050','#e8f5e8','#ffffff'] },
  { id:'prison',     icon:'🔐', name:'Gefängnis',        colors:['#1a1a1a','#333333','#555555','#888888','#aaaaaa'] },
  { id:'rubber_doll',icon:'🪆', name:'Rubber Doll',      colors:['#0a0a0a','#1e1e1e','#c07858','#e8b090','#f5d5c0'] },
  { id:'exhib',      icon:'💋', name:'Exhibitionist',    colors:['#b07040','#d09060','#e8a880','#f0c0a0','#f5d5c0'] },
  { id:'leather',    icon:'🪶', name:'Leder (dunkel)',   colors:['#080808','#1a1008','#2d1a08','#4a2e14','#6b4423'] },
  { id:'leather_rd', icon:'🩸', name:'Leder Rot',        colors:['#0a0000','#2d0000','#660000','#8b1a00','#c44422'] },
  { id:'leather_wh', icon:'🤍', name:'Leder Weiß',       colors:['#c8c0b8','#d8d0c8','#e8e0d8','#f0ecea','#ffffff'] },

  // ════ DARK / GOTHIC / HORROR ══════════════════════════
  { id:'gothic',     icon:'🕷️', name:'Gothic',           colors:['#0d0d0d','#5c0a0a','#8b0000','#b0b0b0','#f0f0f0'] },
  { id:'vampire',    icon:'🧛', name:'Vampir',           colors:['#0d0010','#1c0021','#4a0050','#990033','#f5e6e8'] },
  { id:'blood',      icon:'🩸', name:'Blut',             colors:['#050000','#1e0000','#5c0000','#9b0000','#d40000'] },
  { id:'demon',      icon:'😈', name:'Dämon',            colors:['#050000','#200000','#500000','#990000','#ff2000'] },
  { id:'succubus',   icon:'💋', name:'Succubus',         colors:['#0d0010','#300030','#700040','#cc0066','#ff44aa'] },
  { id:'fallen_a',   icon:'🪽', name:'Gefallener Engel', colors:['#0a0a14','#1a1430','#4a2870','#8050c0','#f0e8ff'] },
  { id:'witch',      icon:'🧙', name:'Hexe',             colors:['#080010','#1c0030','#3a006a','#006633','#cccc00'] },
  { id:'necro',      icon:'💀', name:'Nekromant',        colors:['#050808','#101818','#204040','#408070','#80d0c0'] },
  { id:'darkacad',   icon:'📚', name:'Dark Academia',    colors:['#1a1408','#3d2d14','#6b5030','#a08050','#d4c090'] },
  { id:'witchcore',  icon:'🔮', name:'Witchcore',        colors:['#080010','#1e0030','#3a006a','#6a0090','#c8a8d8'] },
  { id:'obsidian',   icon:'🪨', name:'Obsidian',         colors:['#050305','#100a15','#1e1028','#3a2050','#6040a0'] },
  { id:'dungeon2',   icon:'🔦', name:'Dunkelkammer',     colors:['#020202','#0a0808','#1a1210','#301e18','#504030'] },
  { id:'steampunk',  icon:'⚙️', name:'Steampunk',        colors:['#1a1005','#3d2510','#7a4a1e','#b8831a','#e8c87a'] },
  { id:'industrial', icon:'🏭', name:'Industrial',       colors:['#0a0a08','#1e1e1a','#383830','#606050','#909080'] },

  // ════ FANTASY / CHARAKTERE ════════════════════════════
  { id:'angel',      icon:'😇', name:'Engel',            colors:['#d4cc80','#e8e0a0','#f5f0d8','#fffaee','#ffffff'] },
  { id:'fairy',      icon:'🧚', name:'Fee',              colors:['#f8eeff','#e8d0ff','#c0e8ff','#d0ffd0','#ffe8f0'] },
  { id:'mermaid',    icon:'🧜', name:'Meerjungfrau',     colors:['#001428','#006666','#00aaaa','#50e0d0','#a0fff0'] },
  { id:'elf',        icon:'🧝', name:'Elfe',             colors:['#0a1a0a','#1e4428','#4a8a50','#90c898','#e0f5e0'] },
  { id:'princess',   icon:'👸', name:'Prinzessin',       colors:['#3d0030','#800060','#cc44aa','#ff99dd','#fff0f8'] },
  { id:'queen',      icon:'👑', name:'Königin',          colors:['#0a0010','#2a0050','#6600aa','#cc0055','#ffd700'] },
  { id:'dragon',     icon:'🐉', name:'Drachenlady',      colors:['#0d0505','#4d0000','#990000','#cc8800','#f5e0a0'] },
  { id:'pirate',     icon:'🏴‍☠️', name:'Piratin',         colors:['#0a0500','#2d1a00','#5c0000','#aa2200','#d4aa00'] },
  { id:'ninja',      icon:'🥷', name:'Ninja',            colors:['#050505','#0f0f0f','#1a1a1a','#333333','#cc2222'] },
  { id:'samurai',    icon:'⚔️', name:'Samurai',          colors:['#0a0500','#2d1a08','#8b3020','#c4702a','#e8c860'] },
  { id:'geisha',     icon:'🌸', name:'Geisha',           colors:['#0a0808','#880022','#cc4444','#f0c0c0','#f5e0e0'] },
  { id:'lolita_g',   icon:'🕸️', name:'Gothic Lolita',   colors:['#050505','#150010','#3d0030','#800060','#f5e0f0'] },
  { id:'lolita_s',   icon:'🎀', name:'Sweet Lolita',     colors:['#fff0f8','#ffc0e0','#ff80c0','#ff40a0','#ffffff'] },
  { id:'lolita_c',   icon:'🌹', name:'Classic Lolita',   colors:['#1a0808','#5c2020','#9c6060','#d4b0a0','#f5ece8'] },

  // ════ NATUR & JAHRESZEITEN ════════════════════════════
  { id:'sakura',     icon:'🌸', name:'Sakura',           colors:['#590d22','#c9184a','#ff85a1','#ffc2d1','#fff0f3'] },
  { id:'forest',     icon:'🌿', name:'Wald',             colors:['#1b2108','#386641','#6a994e','#a7c957','#f2e8cf'] },
  { id:'autumn',     icon:'🍁', name:'Herbst',           colors:['#1a0800','#6b2a00','#c45e1e','#e8a84a','#f5dfa0'] },
  { id:'winter',     icon:'❄️', name:'Winter',           colors:['#0a1628','#1e3a5f','#4a90b8','#b8d4e8','#eaf4fb'] },
  { id:'spring',     icon:'🌱', name:'Frühling',         colors:['#1a2e00','#5a8a00','#90c850','#f0e060','#fff8d0'] },
  { id:'tropical',   icon:'🌴', name:'Tropisch',         colors:['#003318','#006633','#00cc66','#ffdd00','#ff6600'] },
  { id:'desert',     icon:'🏜️', name:'Wüste',            colors:['#1a1205','#4a3818','#8b6938','#c4a868','#f5e8c8'] },
  { id:'deepsea',    icon:'🌊', name:'Tiefsee',          colors:['#000508','#001428','#002d5c','#005090','#a0d4f0'] },
  { id:'ocean',      icon:'🐚', name:'Ozean',            colors:['#03045e','#0077b6','#00b4d8','#90e0ef','#caf0f8'] },
  { id:'sunset',     icon:'🌅', name:'Sonnenuntergang',  colors:['#0d0508','#4a1428','#c04028','#f07830','#ffd080'] },
  { id:'aurora',     icon:'🌌', name:'Aurora Borealis',  colors:['#020810','#002030','#005050','#00aa88','#aa00ff'] },
  { id:'volcano',    icon:'🌋', name:'Vulkan',           colors:['#050000','#200500','#5a1000','#cc3300','#ff8800'] },
  { id:'storm',      icon:'⛈️', name:'Sturm',            colors:['#0a0c10','#161c28','#2a3448','#4a5870','#8898b0'] },
  { id:'moonlight',  icon:'🌙', name:'Mondlicht',        colors:['#05080d','#0a1628','#1e3d5c','#7ab0d4','#e8f4fb'] },
  { id:'earth',      icon:'🌍', name:'Erde',             colors:['#1c1208','#4a3520','#7d5a3c','#c4a882','#f0e6d0'] },
  { id:'stone',      icon:'🪨', name:'Naturstein',       colors:['#1a1410','#3d3020','#6b5a40','#a09070','#d4c8b0'] },

  // ════ EDELSTEINE & METALLE ════════════════════════════
  { id:'emerald',    icon:'💚', name:'Smaragd',          colors:['#001a08','#003d18','#006633','#00aa55','#aaffcc'] },
  { id:'ruby',       icon:'❤️', name:'Rubin',            colors:['#140000','#5c0000','#aa0000','#dd2244','#ffaaaa'] },
  { id:'sapphire',   icon:'💙', name:'Saphir',           colors:['#000814','#001a4d','#003399','#4477cc','#aaccff'] },
  { id:'amethyst',   icon:'💜', name:'Amethyst',         colors:['#0d0018','#2a0055','#6633aa','#9966cc','#e0ccff'] },
  { id:'opal',       icon:'🌈', name:'Opal',             colors:['#f0e8ff','#e8f8ff','#e8fff0','#fff8e8','#ffe8f8'] },
  { id:'crystal',    icon:'💎', name:'Kristall',         colors:['#c0d8f0','#d8ecff','#eef8ff','#f5faff','#ffffff'] },
  { id:'ice',        icon:'🧊', name:'Eis',              colors:['#c8dce8','#d8eaf5','#ecf5ff','#f5faff','#ffffff'] },
  { id:'gold_gem',   icon:'🏆', name:'Gold',             colors:['#1a1000','#5c3d00','#aa7700','#ffcc00','#fff5aa'] },
  { id:'silver_m',   icon:'🪙', name:'Silber',           colors:['#1a1a1a','#404040','#707070','#b0b0b0','#e8e8e8'] },
  { id:'copper',     icon:'🟤', name:'Kupfer',           colors:['#1a0800','#5c2800','#a05000','#c87830','#e8b878'] },
  { id:'onyx',       icon:'⬛', name:'Onyx',             colors:['#030303','#080808','#101010','#1e1e1e','#303030'] },
  { id:'pearl',      icon:'🫧', name:'Perle',            colors:['#d8d0c8','#e8e0d8','#f0ecec','#f8f5f5','#ffffff'] },

  // ════ MODERNE AESTHETICS ══════════════════════════════
  { id:'neon',       icon:'⚡', name:'Neon',             colors:['#0d0d0d','#1a0030','#f72585','#00f5d4','#ffffff'] },
  { id:'cyber',      icon:'🤖', name:'Cyber',            colors:['#0a0f14','#0d2137','#004080','#00f5d4','#ccff00'] },
  { id:'vaporwave',  icon:'📼', name:'Vaporwave',        colors:['#0d0030','#3d0060','#9900cc','#ff44dd','#44ffee'] },
  { id:'y2k',        icon:'💿', name:'Y2K',              colors:['#c0d8ff','#d0c8ff','#ffc8e8','#ffd8a0','#ffffff'] },
  { id:'toxic',      icon:'☢️', name:'Toxic',            colors:['#0a0f00','#1a3300','#39ff14','#ccff00','#f5ff80'] },
  { id:'egirl',      icon:'🖤', name:'E-Girl',           colors:['#0a0a1a','#2a0050','#cc0066','#ff4488','#00ffcc'] },
  { id:'kawaii',     icon:'🩷', name:'Kawaii',           colors:['#fff0f5','#ffd6e8','#ffb3d1','#ff80ba','#ff4da6'] },
  { id:'harajuku',   icon:'🗼', name:'Harajuku',         colors:['#ff44bb','#ff9933','#33ccff','#99ff33','#cc33ff'] },
  { id:'cottagecore',icon:'🌻', name:'Cottagecore',      colors:['#2a3a18','#5a7040','#a0c870','#e8dfa0','#fff8e8'] },
  { id:'darkacad2',  icon:'🕯️', name:'Dark Academia',    colors:['#1a1408','#3d2d14','#6b5030','#a08050','#d4c090'] },
  { id:'vkei',       icon:'🎭', name:'Visual Kei',       colors:['#0a0010','#2a0030','#6600aa','#cc0044','#ffffff'] },
  { id:'grunge',     icon:'🎸', name:'Grunge',           colors:['#0a0a08','#1e1a14','#3a3030','#6a5a50','#aa9888'] },

  // ════ PASTELL / SÜSS ══════════════════════════════════
  { id:'pastel',     icon:'🍬', name:'Pastell',          colors:['#fdeff9','#f7c5e0','#d4a5d4','#a8d5e2','#c3f0ca'] },
  { id:'candy',      icon:'🍭', name:'Candy',            colors:['#f9f9ff','#ffb3de','#d4aaff','#aaffee','#ffeeaa'] },
  { id:'bubblegum',  icon:'🫧', name:'Bubblegum',        colors:['#ff80b0','#ff99c8','#ffb3d8','#ffcce8','#fff0f8'] },
  { id:'cottoncandy',icon:'🩷', name:'Cotton Candy',     colors:['#f8e0ff','#f0c8ff','#d0b0ff','#b0e8ff','#ffe0f8'] },
  { id:'rainbow',    icon:'🌈', name:'Regenbogen',       colors:['#ff0000','#ff8800','#ffff00','#00cc00','#0000ff'] },
  { id:'sunset_p',   icon:'🌇', name:'Pastell Sunset',   colors:['#ffe0cc','#ffc8d8','#f0b8e8','#d8b0f0','#c8d0ff'] },
  { id:'mint',       icon:'🌿', name:'Mint',             colors:['#004433','#008860','#00bb88','#66ddb8','#ccf5e8'] },
  { id:'lavender',   icon:'💜', name:'Lavendel',         colors:['#1a0030','#5500aa','#9966cc','#ccaaee','#f0e8ff'] },
  { id:'rosegold',   icon:'✨', name:'Roségold',         colors:['#1a0808','#6d2b3d','#c47c7c','#e8b4b8','#f5e6e0'] },
  { id:'peach',      icon:'🍑', name:'Pfirsich',         colors:['#3a1000','#885530','#cc9960','#f0cc99','#fff0e0'] },
  { id:'lilac',      icon:'🌸', name:'Flieder',          colors:['#1a0030','#5500aa','#bb66ee','#ddb0f8','#f8f0ff'] },
  { id:'sakura',     icon:'🌸', name:'Sakura',           colors:['#590d22','#c9184a','#ff85a1','#ffc2d1','#fff0f3'] },

  // ════ FARBE SATT / KRÄFTIG ════════════════════════════
  { id:'fire',       icon:'🔥', name:'Feuer',            colors:['#1a0000','#7d0000','#c1121f','#f48c06','#ffd60a'] },
  { id:'lava',       icon:'🌋', name:'Lava',             colors:['#0a0000','#3d0000','#8b1a00','#e05000','#ff9900'] },
  { id:'blood_moon', icon:'🌕', name:'Blutmond',         colors:['#050000','#1e0000','#6b0000','#cc2200','#ee7700'] },
  { id:'electric',   icon:'🔌', name:'Elektrisch',       colors:['#000a14','#001a3d','#0044aa','#0099ff','#44ddff'] },
  { id:'poison',     icon:'🐍', name:'Gift',             colors:['#0a1400','#1e3300','#3d6600','#77bb00','#ccee44'] },
  { id:'deep_pu',    icon:'💜', name:'Deep Violet',      colors:['#050008','#10001e','#2a0050','#5500aa','#9922dd'] },
  { id:'midnight',   icon:'🌌', name:'Mitternacht',      colors:['#020408','#080c14','#101828','#1e3048','#4a7090'] },

  // ════ MONOCHROM & EINFARBIG ═══════════════════════════
  { id:'allblack',   icon:'⬛', name:'All Black',        colors:['#000000','#050505','#0a0a0a','#111111','#1a1a1a'] },
  { id:'allwhite',   icon:'⬜', name:'All White',        colors:['#e0e0e0','#ebebeb','#f3f3f3','#f9f9f9','#ffffff'] },
  { id:'mono_gray',  icon:'🔘', name:'Grauschattierung', colors:['#111111','#333333','#666666','#999999','#cccccc'] },
  { id:'mono_bw',    icon:'◼', name:'Schwarz/Weiß',     colors:['#000000','#222222','#666666','#cccccc','#ffffff'] },
  { id:'mono_br',    icon:'🔴', name:'Schwarz/Rot',      colors:['#000000','#1a0000','#550000','#aa0000','#ff0000'] },
  { id:'mono_bg',    icon:'💛', name:'Schwarz/Gold',     colors:['#000000','#1a1400','#554400','#aa8800','#ffcc00'] },
  { id:'mono_bs',    icon:'⬜', name:'Schwarz/Silber',   colors:['#000000','#1a1a1a','#444444','#888888','#e0e0e0'] },
  { id:'mono_bbl',   icon:'💙', name:'Schwarz/Blau',     colors:['#000000','#000a1a','#001a55','#0044aa','#4488ff'] },
  { id:'mono_bpu',   icon:'💜', name:'Schwarz/Lila',     colors:['#000000','#0d0018','#2a0055','#6633aa','#cc88ff'] },
  { id:'mono_rg',    icon:'🟡', name:'Rot/Gold',         colors:['#3a0000','#880000','#cc3300','#ee8800','#ffcc00'] },
  { id:'wine',       icon:'🍷', name:'Weinrot',          colors:['#0d0005','#2d0010','#6b0020','#aa1040','#d4608a'] },
  { id:'navy',       icon:'🌊', name:'Navy',             colors:['#010308','#030c1e','#061838','#0a2a60','#1a4a90'] },
  { id:'forest_m',   icon:'🌲', name:'Waldgrün',         colors:['#030a03','#0a1e0a','#143014','#284e28','#406640'] },

  // ════ LATEX – Tricolor / Spezial ══════════════════════
  { id:'latex_bkrdwh',icon:'🔴',name:'Schwarz/Rot/Weiß', colors:['#050505','#550000','#aa0000','#f0f0f0','#ffffff'] },
  { id:'latex_bkpkwh',icon:'🩷',name:'Schwarz/Pink/Weiß',colors:['#050505','#660044','#cc0077','#f0f0f0','#ffffff'] },
  { id:'latex_bkpugd',icon:'💜',name:'Schwarz/Lila/Gold',colors:['#050505','#3a0060','#7700cc','#aa8800','#ffcc00'] },
  { id:'latex_rdwh',  icon:'🤍',name:'Rot/Weiß',         colors:['#5c0000','#aa0000','#cc3333','#f5f5f5','#ffffff'] },
  { id:'latex_pkwh',  icon:'🩷',name:'Pink/Weiß',        colors:['#880055','#cc0077','#ff44bb','#f5f5f5','#ffffff'] },
  { id:'latex_ngbk',  icon:'💚',name:'Neongrün/Schwarz', colors:['#050505','#0f0f0f','#003300','#00aa00','#33ff33'] },
  { id:'latex_cyber', icon:'🤖',name:'Latex Cyber',      colors:['#050505','#001428','#004080','#00f5d4','#ccff00'] },
  { id:'latex_rainbow',icon:'🌈',name:'Latex Regenbogen',colors:['#cc0000','#cc6600','#aaaa00','#006600','#0000cc'] },
  { id:'latex_pastel',icon:'🍬',name:'Latex Pastell',    colors:['#e8c0d8','#d8b0e8','#b8c8f0','#b0e8d8','#f0e8b0'] },
  { id:'latex_metal', icon:'🪩',name:'Metallic',         colors:['#101010','#303030','#606060','#aaaaaa','#e8e8e8'] },

  // ════ BDSM – Uniformen & Rollen ═══════════════════════
  { id:'schuluni',   icon:'📐', name:'Schuluniform',     colors:['#0a0a28','#1a1a66','#c0c0c0','#f5f5f5','#cc2222'] },
  { id:'polizei',    icon:'👮', name:'Polizei',          colors:['#0a0a14','#0d1e3d','#1a2d6b','#888899','#c8c8d8'] },
  { id:'militar',    icon:'🪖', name:'Militär',          colors:['#0a0e08','#1e2810','#3a4820','#6a7840','#8a9860'] },
  { id:'cheerleader',icon:'📣', name:'Cheerleader',      colors:['#0a0a0a','#880000','#cc0000','#f5f5f5','#ffffff'] },
  { id:'krkpfleger', icon:'💊', name:'Pfleger (Blau)',   colors:['#0a1428','#1a3a6b','#3366aa','#e8f0f8','#ffffff'] },
  { id:'koechin',    icon:'👩‍🍳', name:'Köchin',          colors:['#0a0a0a','#2d2d2d','#f5f5f5','#ffffff','#cc4400'] },
  { id:'buero',      icon:'👔', name:'Business',         colors:['#0a0e14','#1a2840','#3d5070','#b0b8c8','#f0f0f5'] },
  { id:'latex_art',  icon:'🎨', name:'Artisten-Latexanzug',colors:['#0a0a0a','#3d003d','#006600','#ccaa00','#dd0000'] },

  // ════ FANTASY – Mythologie & Kreaturen ════════════════
  { id:'nixe',       icon:'💧', name:'Nixe',             colors:['#000814','#002244','#005588','#00aacc','#88eeee'] },
  { id:'phoenix',    icon:'🦅', name:'Phönix',           colors:['#1a0000','#6b0000','#cc3300','#ff8800','#ffdd44'] },
  { id:'eiselfe',    icon:'🌨️', name:'Eis-Elfe',         colors:['#0a1428','#1a4488','#5599cc','#aaddff','#ffffff'] },
  { id:'schattenj',  icon:'🗡️', name:'Schattenjägerin',  colors:['#050505','#1a1a1a','#333333','#880000','#c8c8c8'] },
  { id:'waldelfe',   icon:'🍃', name:'Waldgeist',        colors:['#0a1005','#1e3010','#3a6020','#70a840','#c8e8a0'] },
  { id:'fuchs',      icon:'🦊', name:'Fuchs',            colors:['#1a0800','#5c2000','#b84400','#e87000','#f5c880'] },
  { id:'woelfin',    icon:'🐺', name:'Wölfin',           colors:['#0a0a0a','#1e1e1e','#444444','#888888','#c0c0c0'] },
  { id:'schmetterling',icon:'🦋',name:'Schmetterling',   colors:['#0d0028','#3300aa','#6633dd','#ff88cc','#ffeeaa'] },
  { id:'blumenmaedchen',icon:'🌼',name:'Blumenmädchen',  colors:['#1a2e00','#5a8a20','#d4e870','#ffcc44','#ff8888'] },
  { id:'engelsfall2',icon:'⚡', name:'Engel des Sturms', colors:['#050808','#102030','#204888','#6088c8','#f0f0f0'] },

  // ════ MODERNE AESTHETICS – Neu ════════════════════════
  { id:'balletcore', icon:'🩰', name:'Balletcore',       colors:['#f5e8f0','#eec8d8','#e0a0b8','#c87090','#a04870'] },
  { id:'coquette',   icon:'🎀', name:'Coquette',         colors:['#0a0005','#2a0020','#cc2266','#ff88bb','#ffd8e8'] },
  { id:'oldmoney',   icon:'🎩', name:'Old Money',        colors:['#0a0c08','#1e2810','#3a4830','#88997a','#d8d8c8'] },
  { id:'cleangirl',  icon:'✨', name:'Clean Girl',       colors:['#e8d8c8','#f0e4d4','#f8f0e8','#fbf5ef','#ffffff'] },
  { id:'barbiecore', icon:'🩷', name:'Barbiecore',       colors:['#3a0028','#880066','#ee00aa','#ff55cc','#ffbbee'] },
  { id:'mobwife',    icon:'🐆', name:'Mob Wife',         colors:['#0a0800','#2d2000','#6b4a00','#aa8800','#d4aa44'] },
  { id:'academia_l', icon:'📖', name:'Light Academia',   colors:['#1e1808','#4a3818','#8b7040','#c8b080','#f5ecd8'] },
  { id:'mermaidcore',icon:'🌊', name:'Mermaidcore',      colors:['#001428','#005555','#00aaaa','#55ddcc','#f0ffee'] },
  { id:'fairycore',  icon:'🧚', name:'Fairycore',        colors:['#f0e8ff','#e0d0f8','#c8d8ff','#d8f8e8','#fff8e8'] },
  { id:'animecore',  icon:'⭐', name:'Animecore',        colors:['#1a0030','#4400aa','#cc0066','#ff88cc','#ffeeaa'] },
  { id:'darkfairy',  icon:'🖤', name:'Dark Fairy',       colors:['#0a0010','#200040','#5500aa','#cc44ee','#f8e0ff'] },
  { id:'royalcore',  icon:'👑', name:'Royalcore',        colors:['#050010','#150040','#3300aa','#6622cc','#ffcc00'] },

  // ════ LEBENSMITTEL & NATUR-TÖNE ═══════════════════════
  { id:'chocolate',  icon:'🍫', name:'Schokolade',       colors:['#0a0500','#2d1400','#5c2e00','#8b4513','#c48050'] },
  { id:'vanilla',    icon:'🍦', name:'Vanille',          colors:['#2a1e00','#6b5020','#c4a050','#e8d090','#fdf5e0'] },
  { id:'berry',      icon:'🫐', name:'Beere',            colors:['#0d0018','#2a0050','#5c2888','#9944cc','#d4aaee'] },
  { id:'raspberry',  icon:'🍓', name:'Himbeere',         colors:['#3a000a','#880022','#cc1144','#ee5588','#ffaabb'] },
  { id:'coffee',     icon:'☕', name:'Kaffee',           colors:['#0a0800','#2a1e08','#5a3a18','#8b6030','#c4a068'] },
  { id:'matcha',     icon:'🍵', name:'Matcha',           colors:['#0a1405','#1e3010','#3a6020','#70a050','#d4e8b0'] },
  { id:'coral',      icon:'🪸', name:'Koralle',          colors:['#3a0808','#882020','#cc5040','#ee8870','#f5c0a8'] },
  { id:'peach2',     icon:'🍑', name:'Pfirsich Satt',   colors:['#5c1e00','#aa4400','#e07030','#f0a870','#f8d8b8'] },
  { id:'lemon',      icon:'🍋', name:'Zitrone',          colors:['#1e1e00','#666600','#aaaa00','#eeee00','#ffffaa'] },
  { id:'wine2',      icon:'🍇', name:'Traube',           colors:['#0d0018','#2a0040','#550077','#8833aa','#cc99dd'] },
  { id:'honey',      icon:'🍯', name:'Honig',            colors:['#1a0e00','#5c3800','#aa7000','#dda830','#f5cc70'] },
  { id:'rose_tea',   icon:'🌹', name:'Rosentee',         colors:['#2a0818','#6b2244','#aa5580','#d498b8','#f5d8e8'] },

  // ════ EINZELFARBEN SATT ════════════════════════════════
  { id:'magenta',    icon:'🌸', name:'Magenta',          colors:['#1a0014','#5c0044','#aa0077','#ee00aa','#ffaaee'] },
  { id:'indigo',     icon:'🔵', name:'Indigo',           colors:['#030014','#0d0040','#1a0088','#3300cc','#8866ff'] },
  { id:'plum',       icon:'💜', name:'Pflaume',          colors:['#0d0018','#2d0050','#5a0077','#8844aa','#ccaadd'] },
  { id:'teal_m',     icon:'🩵', name:'Petrol/Teal',     colors:['#001414','#003030','#005555','#008888','#44cccc'] },
  { id:'olive',      icon:'🫒', name:'Olive',            colors:['#0a0e00','#222e00','#445500','#778800','#aacc44'] },
  { id:'khaki',      icon:'🌾', name:'Khaki',            colors:['#0e0e00','#2e2e08','#5c5820','#9a9050','#d8d090'] },
  { id:'burgundy',   icon:'🍷', name:'Burgund',          colors:['#0d0008','#2d0018','#680030','#990044','#cc3366'] },
  { id:'terracotta', icon:'🏺', name:'Terrakotta',       colors:['#1a0800','#5c2000','#aa5030','#d48060','#f0b898'] },
  { id:'sage',       icon:'🌿', name:'Salbei',           colors:['#0e1a0a','#283e20','#4a6a3a','#7a9a60','#b8ccaa'] },
  { id:'dustyrose',  icon:'🌹', name:'Altrosa',          colors:['#1a0808','#5c2828','#9a6060','#c89898','#f0d8d8'] },
  { id:'slate',      icon:'🔷', name:'Schieferblau',     colors:['#0a1018','#1e2e3a','#3a5068','#6080a0','#98b8d0'] },
  { id:'chartreuse', icon:'🟢', name:'Limonengrün',      colors:['#0e1400','#2e4000','#557700','#99cc00','#ccee44'] },

  // ════ KULTURELL / HISTORISCH ══════════════════════════
  { id:'japanisch',  icon:'⛩️', name:'Japanisch',        colors:['#0a0808','#880000','#cc0000','#f5f5f5','#ffffff'] },
  { id:'chinesisch', icon:'🏮', name:'Chinesisch',       colors:['#1a0000','#880000','#cc0000','#cc9900','#ffcc00'] },
  { id:'aegyptisch', icon:'🏺', name:'Ägyptisch',        colors:['#050808','#1a1400','#005555','#aa8800','#ffcc00'] },
  { id:'vikinger',   icon:'⚔️', name:'Wikinger',         colors:['#0a0808','#2d2018','#5c4028','#9a7040','#c8b888'] },
  { id:'mittelalter',icon:'🏰', name:'Mittelalter',      colors:['#0a0808','#2d1400','#6b3010','#aa6030','#cc9900'] },
  { id:'samurai2',   icon:'🗡️', name:'Ronin',            colors:['#050505','#1a0800','#4d0000','#888888','#c0b890'] },
  { id:'roman',      icon:'🏛️', name:'Römisch',          colors:['#1a1005','#5c4020','#aa8040','#ddc090','#f5ead8'] },

  // ════ SPEZIAL / SPASSL ════════════════════════════════
  { id:'holographic',icon:'🌈', name:'Holografisch',     colors:['#cc00ff','#0066ff','#00ffcc','#ccff00','#ff6600'] },
  { id:'galaxy',     icon:'🌌', name:'Galaxie',          colors:['#020408','#0a1428','#2a1050','#8822cc','#ff88ff'] },
  { id:'sunflower',  icon:'🌻', name:'Sonnenblume',      colors:['#1a1400','#5c4800','#aa8800','#eecc00','#f5ee80'] },
  { id:'toxic2',     icon:'🧪', name:'Giftgrün',         colors:['#0a1400','#1e3300','#33660a','#77bb00','#ccee33'] },
  { id:'bloodmoon2', icon:'🌕', name:'Roter Mond',       colors:['#050000','#1a0000','#5c1100','#cc4400','#ee8800'] },
  { id:'shadow',     icon:'👤', name:'Schatten',         colors:['#020202','#060606','#0e0e0e','#181818','#242424'] },
  { id:'smoke',      icon:'💨', name:'Rauch',            colors:['#101010','#282828','#484848','#787878','#a8a8a8'] },
  { id:'aurora2',    icon:'✨', name:'Aurora Pink',      colors:['#050010','#1a0040','#5500aa','#ff00cc','#ffaaff'] },
];

function _getColorFreq(items) {
  const freq = {};
  for (const item of (items || [])) {
    const cols = Array.isArray(item.colors) ? item.colors : (item.colors ? [item.colors] : []);
    cols.forEach((c, li) => {
      if (!c || c === 'Default') return;
      const key = c.toLowerCase();
      if (!freq[key]) freq[key] = { color: c, count: 0, usages: [] };
      freq[key].count++;
      freq[key].usages.push({ asset: item.asset, group: item.group, layer: li });
    });
  }
  return Object.values(freq).sort((a, b) => b.count - a.count);
}

// ── HSL-Mathe ────────────────────────────────────────────
function _hexToHsl(hex) {
  let r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;}else{const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;default:h=((r-g)/d+4)/6;}}
  return{h:h*360,s,l};
}
function _hslToHex(h,s,l){
  h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));
  function hr(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}
  let r,g,b;if(s===0){r=g=b=l;}else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=hr(p,q,h/360+1/3);g=hr(p,q,h/360);b=hr(p,q,h/360-1/3);}
  const t=x=>Math.round(x*255).toString(16).padStart(2,'0');return'#'+t(r)+t(g)+t(b);
}
// Wendet dieselbe HSL-Verschiebung (from→to) auf targetHex an
function _applyHslShift(targetHex, fromHex, toHex) {
  try{
    const f=_hexToHsl(fromHex), t=_hexToHsl(toHex), tg=_hexToHsl(targetHex);
    let dH=t.h-f.h; if(dH>180)dH-=360; if(dH<-180)dH+=360;
    return _hslToHex(tg.h+dH, tg.s+(t.s-f.s), tg.l+(t.l-f.l));
  }catch(e){return targetHex;}
}

// ── Render-Einstieg ───────────────────────────────────────
function _renderColorFreqHtml(freqData, ctxType, ctxKey) {
  _cfreqCtxType          = ctxType;
  _cfreqCtxKey           = ctxKey || '';
  _cfreqChanges          = {};
  _cfreqItemChanges      = {};
  _cfreqLinked           = new Set();
  _cfreqLinkedShift      = new Set();
  _cfreqLinkedItems      = new Set();
  _cfreqLinkedItemsShift = new Set();
  _cfreqViewMode         = 'global';
  _cfreqSrcItems         = (ctxType === 'profile' && ctxKey) ? (PROFILES[ctxKey]?.items || []) : OUTFIT;

  if (!freqData.length && !_cfreqSrcItems.length)
    return '<div style="color:var(--text3);font-size:.76rem;padding:6px 0">Keine Items/Farben vorhanden.</div>';

  const copyName = escHtml((ctxType === 'profile' && ctxKey)
    ? _profileShortName(ctxKey, _profileOwnerOf(ctxKey)) + ' (Farbanpassung)'
    : 'Mein Outfit (Farbanpassung)');

  // Theme-Panel HTML vorbauen
  _cfreqActiveTheme = null;
  const themeGridHtml = CFREQ_THEMES.map(th => {
    const swatches = th.colors.map(c=>'<span class="cfreq-tswatch" style="background:'+c+'"></span>').join('');
    return '<div class="cfreq-theme-card" id="cfreq-tcard-'+th.id+'" onclick="_cfreqSelectTheme(\''+th.id+'\')" title="'+escHtml(th.name)+'">'
      + '<div class="cfreq-tswatches">'+swatches+'</div>'
      + '<div class="cfreq-tname">'+escHtml(th.icon+' '+th.name)+'</div>'
      + '</div>';
  }).join('');

  return '<div id="cfreq-inner">'
    + '<div class="cfreq-header">'
    +   '<span class="cfreq-hint">🔗 = 1:1 &nbsp; ≈ = Farbmuster verschieben &nbsp;·&nbsp; Hex oder Picker &nbsp;·&nbsp; Testen / Speichern</span>'
    +   '<div style="display:flex;align-items:center;gap:5px">'
    +     '<button class="cfreq-mode-btn" id="cfreqThemeBtn" onclick="_cfreqToggleThemePanel()" title="Vordefinierte Farbthemen anwenden">🎨 Themen</button>'
    +     '<div class="cfreq-mode-tabs">'
    +       '<button class="cfreq-mode-btn active" data-mode="global" onclick="_cfreqSetMode(\'global\')">Gesamt</button>'
    +       '<button class="cfreq-mode-btn" data-mode="item" onclick="_cfreqSetMode(\'item\')">Nach Item</button>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div id="cfreq-theme-panel" class="cfreq-theme-panel" style="display:none">'
    +   '<div class="cfreq-theme-grid">' + themeGridHtml + '</div>'
    +   '<div id="cfreq-theme-editor"></div>'
    + '</div>'
    + '<div id="cfreq-content">' + _renderGlobalRows(freqData) + '</div>'
    + '<div class="cfreq-actions">'
    +   '<div class="cfreq-act-row">'
    +     '<button class="btn btn-primary cfreq-act-btn" onclick="_cfreqTest()">▶ Testen</button>'
    +     '<button class="btn btn-green cfreq-act-btn" onclick="_cfreqSave()">💾 Speichern</button>'
    +   '</div>'
    +   '<div class="cfreq-act-row">'
    +     '<input type="text" class="cfreq-copy-name" id="cfreqCopyName" value="' + copyName + '" placeholder="Name der Kopie..." maxlength="60">'
    +     '<button class="btn cfreq-act-btn" onclick="_cfreqSaveCopy()" style="white-space:nowrap">📋 Als Kopie</button>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

// ── Globale Ansicht ───────────────────────────────────────
function _renderGlobalRows(freqData) {
  if (!freqData.length) return '<div style="color:var(--text3);font-size:.76rem;padding:6px 0">Keine Farbdaten vorhanden.</div>';
  return '<div style="display:flex;flex-direction:column;gap:3px">'
    + freqData.map((f, idx) => {
      const hex    = f.color.toLowerCase();
      const hexS   = escHtml(hex);
      const curHex = escHtml(_cfreqChanges[hex] || hex);  // zeigt Thema/Änderung sofort
      const isChanged = !!_cfreqChanges[hex];
      const tip  = f.usages.slice(0,6).map(u=>u.asset).join(', ')+(f.usages.length>6?' …':'');
      return '<div class="cfreq-row' + (isChanged?' cfreq-row-changed':'') + '" data-orig="' + hexS + '" title="' + escHtml(tip) + '">'
        + _cfreqLinkBtns('data-orig="' + hexS + '"', 'ex', '_cfreqGlobalLinkToggle(this,\'ex\')', '_cfreqGlobalLinkToggle(this,\'sh\')')
        + '<span class="cfreq-swatch" id="cfswt_' + idx + '" style="background:' + curHex + '"></span>'
        + '<input type="text" class="cfreq-hex-inp" id="cfhex_' + idx + '" value="' + curHex + '"'
        +   ' maxlength="7" spellcheck="false" data-orig="' + hexS + '" data-idx="' + idx + '"'
        +   ' oninput="_cfreqHexInput(this)" onchange="_cfreqHexCommit(this)">'
        + '<input type="color" class="cfreq-picker" id="cfpick_' + idx + '" value="' + curHex + '"'
        +   ' data-orig="' + hexS + '" data-idx="' + idx + '" oninput="_cfreqPickerInput(this)">'
        + '<span class="cfreq-count">' + f.count + '×</span>'
        + '</div>';
    }).join('')
    + '</div>';
}

// ── Item-Ansicht ──────────────────────────────────────────
function _renderItemRows(items) {
  const filtered = (items||[]).map((item,iidx)=>({item,iidx,cols:Array.isArray(item.colors)?item.colors:(item.colors?[item.colors]:[])}))
    .filter(({cols})=>cols.some(c=>c&&c!=='Default'));
  if (!filtered.length) return '<div style="color:var(--text3);font-size:.76rem;padding:6px 0">Keine farbigen Items.</div>';

  return filtered.map(({item,iidx,cols})=>{
    const nm = escHtml(item.label||item.asset||'?'), gr = escHtml(item.group||'');
    const nc = cols.filter(c=>c&&c!=='Default').length;
    const rows = cols.map((c,lidx)=>{
      if (!c||c==='Default') return '<div class="cfreq-icolor-row" style="opacity:.3">'
        + '<div class="cfreq-link-grp" style="visibility:hidden">' + _cfreqLinkBtnsHtml('','','') + '</div>'
        + '<span class="cfreq-ilabel">L'+(lidx+1)+'</span>'
        + '<span class="cfreq-swatch" style="background:#808080;border-style:dashed"></span>'
        + '<span style="font-size:.65rem;color:var(--text3);font-family:var(--font-mono)">Default</span></div>';
      const hex=c.toLowerCase(), hexS=escHtml(hex), uid=iidx+'_'+lidx;
      const iiS=String(iidx), llS=String(lidx);
      const curHex=escHtml(_cfreqItemChanges[iidx+':'+lidx]||_cfreqChanges[hex]||hex);
      return '<div class="cfreq-icolor-row" data-iidx="'+iiS+'" data-lidx="'+llS+'">'
        + _cfreqLinkBtns('data-iidx="'+iiS+'" data-lidx="'+llS+'"', 'it', '_cfreqItemLinkToggle(this,\'ex\')', '_cfreqItemLinkToggle(this,\'sh\')')
        + '<span class="cfreq-ilabel">L'+(lidx+1)+'</span>'
        + '<span class="cfreq-swatch" id="cfswt_i'+uid+'" style="background:'+curHex+'"></span>'
        + '<input type="text" class="cfreq-hex-inp" id="cfhex_i'+uid+'" value="'+curHex+'"'
        +   ' maxlength="7" spellcheck="false" data-orig="'+hexS+'" data-iidx="'+iiS+'" data-lidx="'+llS+'"'
        +   ' oninput="_cfreqItemHexInput(this)" onchange="_cfreqItemHexCommit(this)">'
        + '<input type="color" class="cfreq-picker" id="cfpick_i'+uid+'" value="'+curHex+'"'
        +   ' data-orig="'+hexS+'" data-iidx="'+iiS+'" data-lidx="'+llS+'" oninput="_cfreqItemPickerInput(this)">'
        + '</div>';
    }).join('');
    return '<div class="cfreq-item-block">'
      + '<div class="cfreq-item-hdr"><span class="cfreq-item-name">'+nm+'</span><span class="cfreq-item-group">'+gr+'</span>'
      + '<span class="cfreq-item-ncols">'+nc+' Farbe'+(nc!==1?'n':'')+'</span></div>'
      + '<div class="cfreq-item-colors">'+rows+'</div></div>';
  }).join('');
}

// Hilfsfunktion: erzeugt Link-Button-HTML (shared)
function _cfreqLinkBtns(dataAttrs, kind, onEx, onSh) {
  return '<div class="cfreq-link-grp">'
    + '<button class="cfreq-lbtn" ' + dataAttrs + ' data-lkind="' + kind + '" data-type="ex" onclick="' + onEx + '"'
    +   ' title="🔗 1:1 – exakt gleiche Farbe">🔗</button>'
    + '<button class="cfreq-lbtn" ' + dataAttrs + ' data-lkind="' + kind + '" data-type="sh" onclick="' + onSh + '"'
    +   ' title="≈ Verschieben – gleiche HSL-Verschiebung, Farbmuster bleibt">≈</button>'
    + '</div>';
}
function _cfreqLinkBtnsHtml(a,b,c){return _cfreqLinkBtns(a,b,c,c);}

// ── Mode-Wechsel ──────────────────────────────────────────
function _cfreqSetMode(mode) {
  if (_cfreqViewMode === mode) return;
  _cfreqViewMode = mode; _cfreqChanges = {}; _cfreqItemChanges = {};
  _cfreqLinked = new Set(); _cfreqLinkedShift = new Set();
  _cfreqLinkedItems = new Set(); _cfreqLinkedItemsShift = new Set();
  const content = document.getElementById('cfreq-content');
  if (!content) return;
  content.innerHTML = (mode === 'global')
    ? _renderGlobalRows(_getColorFreq(_cfreqSrcItems||[]))
    : _renderItemRows(_cfreqSrcItems||[]);
  document.querySelectorAll('.cfreq-mode-btn[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
}

// ── Themen-Panel Toggle ───────────────────────────────────
function _cfreqToggleThemePanel() {
  _cfreqThemePanelOpen = !_cfreqThemePanelOpen;
  if (!_cfreqThemePanelOpen) {
    _cfreqActiveTheme = null;
    document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
    const ed = document.getElementById('cfreq-theme-editor');
    if (ed) ed.innerHTML = '';
  }
  const panel = document.getElementById('cfreq-theme-panel');
  const btn   = document.getElementById('cfreqThemeBtn');
  if (panel) panel.style.display = _cfreqThemePanelOpen ? '' : 'none';
  if (btn)   btn.classList.toggle('active', _cfreqThemePanelOpen);
}

// ── Thema auswählen (Klick auf Karte) ────────────────────
function _cfreqSelectTheme(themeId) {
  const th = CFREQ_THEMES.find(t => t.id === themeId);
  if (!th) return;
  // Nochmal klicken → Auswahl aufheben
  if (_cfreqActiveTheme && _cfreqActiveTheme.id === themeId) {
    _cfreqActiveTheme = null;
    document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
    _cfreqRenderThemeEditor();
    return;
  }
  _cfreqActiveTheme = { id: themeId, name: th.name, icon: th.icon,
    colors: [...th.colors], selected: th.colors.map(() => true) };
  document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
  document.getElementById('cfreq-tcard-' + themeId)?.classList.add('active');
  _cfreqRenderThemeEditor();
}

// ── Editor rendern ────────────────────────────────────────
function _cfreqRenderThemeEditor() {
  const el = document.getElementById('cfreq-theme-editor');
  if (!el) return;
  if (!_cfreqActiveTheme) { el.innerHTML = ''; return; }
  const th = _cfreqActiveTheme;
  const selCnt = th.selected.filter(Boolean).length;

  const swatchCols = th.colors.map((c, i) => {
    const on = th.selected[i];
    const canR = i < th.colors.length - 1;
    return '<div class="cfreq-te-col">'
      + '<div class="cfreq-te-sw' + (on ? ' on' : '') + '" style="background:' + c + '"'
      +   ' onclick="_cfreqThemeSwatchToggle(' + i + ')" title="' + (on ? 'Abwählen' : 'Auswählen') + '">'
      +   (on ? '<span class="cfreq-te-ck">✓</span>' : '') + '</div>'
      + (canR ? '<button class="cfreq-te-swap" onclick="_cfreqThemeSwapColors(' + i + ',' + (i+1) + ')" title="Tauschen">⇄</button>'
              : '<span class="cfreq-te-swph"></span>')
      + '</div>';
  }).join('');

  el.innerHTML = '<div class="cfreq-te-wrap">'
    + '<div class="cfreq-te-hdr">'
    +   '<span class="cfreq-te-nm">' + escHtml(th.icon + ' ' + th.name) + '</span>'
    +   '<span class="cfreq-te-cnt">' + selCnt + ' von ' + th.colors.length + ' gewählt · ⇄ Reihenfolge bestimmt Zuordnung</span>'
    + '</div>'
    + '<div class="cfreq-te-row">' + swatchCols + '</div>'
    + '<div class="cfreq-te-acts">'
    +   '<button class="btn btn-primary cfreq-te-btn" onclick="_cfreqApplyActiveTheme()"' + (selCnt===0?' disabled':'') + '>✓ Anwenden</button>'
    +   '<button class="btn cfreq-te-btn" onclick="_cfreqCancelTheme()">✕</button>'
    + '</div>'
    + '</div>';
}

// ── Swatch ein/ausschalten ────────────────────────────────
function _cfreqThemeSwatchToggle(idx) {
  if (!_cfreqActiveTheme) return;
  const s = _cfreqActiveTheme.selected;
  if (s[idx] && s.filter(Boolean).length <= 1) {
    showStatus('⚠️ Mindestens 1 Farbe muss ausgewählt sein', 'info'); return;
  }
  s[idx] = !s[idx];
  _cfreqRenderThemeEditor();
}

// ── Farben tauschen ───────────────────────────────────────
function _cfreqThemeSwapColors(i, j) {
  if (!_cfreqActiveTheme) return;
  const c = _cfreqActiveTheme.colors, s = _cfreqActiveTheme.selected;
  [c[i], c[j]] = [c[j], c[i]];
  [s[i], s[j]] = [s[j], s[i]];
  _cfreqRenderThemeEditor();
}

// ── Editor abbrechen ──────────────────────────────────────
function _cfreqCancelTheme() {
  _cfreqActiveTheme = null;
  document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
  _cfreqRenderThemeEditor();
}

// ── Thema mit gewählten Farben anwenden ───────────────────
function _cfreqApplyActiveTheme() {
  if (!_cfreqActiveTheme) return;
  const th = _cfreqActiveTheme;
  const selColors = th.colors.filter((_, i) => th.selected[i]);
  if (!selColors.length) { showStatus('⚠️ Keine Farbe ausgewählt', 'info'); return; }

  // Outfit-Farben sammeln
  const colSet = new Set();
  (_cfreqSrcItems || []).forEach(item => {
    const cols = Array.isArray(item.colors) ? item.colors : (item.colors ? [item.colors] : []);
    cols.forEach(c => { if (c && c !== 'Default' && /^#[0-9a-fA-F]{6}$/i.test(c)) colSet.add(c.toLowerCase()); });
  });
  if (!colSet.size) { showStatus('⚠️ Keine Farben im Outfit', 'info'); return; }

  // Outfit-Farben nach Helligkeit sortieren (dunkelste → hellste).
  // Theme-Farben bleiben in der vom Nutzer per ⇄ eingestellten Reihenfolge —
  // nur so hat der Swap-Button eine sichtbare Wirkung.
  const outfitCols = [...colSet].sort((a, b) => _hexToHsl(a).l - _hexToHsl(b).l);
  const themeCols  = [...selColors]; // Nutzer-Reihenfolge beibehalten

  _cfreqChanges = {}; _cfreqItemChanges = {};
  _cfreqLinked = new Set(); _cfreqLinkedShift = new Set();
  _cfreqLinkedItems = new Set(); _cfreqLinkedItemsShift = new Set();
  outfitCols.forEach((hex, i) => { _cfreqChanges[hex] = themeCols[i % themeCols.length]; });

  // Inhalt neu rendern
  const content = document.getElementById('cfreq-content');
  if (content) {
    content.innerHTML = (_cfreqViewMode === 'global')
      ? _renderGlobalRows(_getColorFreq(_cfreqSrcItems || []))
      : _renderItemRows(_cfreqSrcItems || []);
  }

  // Panel schließen
  _cfreqThemePanelOpen = false;
  _cfreqActiveTheme = null;
  const panel = document.getElementById('cfreq-theme-panel');
  const btn   = document.getElementById('cfreqThemeBtn');
  if (panel) panel.style.display = 'none';
  if (btn)   btn.classList.remove('active');

  showStatus('🎨 "' + th.name + '" · ' + selColors.length + ' Farbe' + (selColors.length!==1?'n':'') + ' angewendet · Testen oder Speichern', 'success');
}

// ── Global: Picker + Hex ──────────────────────────────────
function _cfreqPickerInput(el) {
  const idx=el.dataset.idx, orig=el.dataset.orig, newC=el.value;
  _cfreqSyncUI(idx,'g',newC); _cfreqSetChange(orig,newC);
}
function _cfreqHexInput(el) {
  const raw=el.value.trim(); if(!/^#[0-9a-fA-F]{6}$/.test(raw))return;
  const idx=el.dataset.idx;
  const s=document.getElementById('cfswt_'+idx),p=document.getElementById('cfpick_'+idx);
  if(s)s.style.background=raw; if(p)p.value=raw;
}
function _cfreqHexCommit(el) {
  const raw=el.value.trim(),idx=el.dataset.idx,orig=el.dataset.orig;
  if(!/^#[0-9a-fA-F]{6}$/.test(raw)){el.value=_cfreqChanges[orig]||orig;return;}
  _cfreqSyncUI(idx,'g',raw); _cfreqSetChange(orig,raw);
}
function _cfreqSyncUI(idx,mode,hex){
  const p=document.getElementById('cfpick_'+idx),h=document.getElementById('cfhex_'+idx),s=document.getElementById('cfswt_'+idx);
  if(p)p.value=hex; if(h)h.value=hex; if(s)s.style.background=hex;
}

// ── Global: Link-Toggle ───────────────────────────────────
function _cfreqGlobalLinkToggle(btn, type) {
  const orig = btn.dataset.orig; // lowercase hex
  if (type==='ex'){
    if(_cfreqLinked.has(orig)){_cfreqLinked.delete(orig);}
    else{_cfreqLinkedShift.delete(orig);_cfreqLinked.add(orig);}
  } else {
    if(_cfreqLinkedShift.has(orig)){_cfreqLinkedShift.delete(orig);}
    else{_cfreqLinked.delete(orig);_cfreqLinkedShift.add(orig);}
  }
  _cfreqUpdateRowClass(btn.closest('.cfreq-row'), _cfreqLinked.has(orig), _cfreqLinkedShift.has(orig));
}

// ── Global: Change + Propagation ─────────────────────────
function _cfreqSetChange(orig, newHex) {
  const ol = orig.toLowerCase();
  if (_cfreqLinked.has(ol)) {
    // 1:1 exakt
    _cfreqLinked.forEach(lc => { _cfreqChanges[lc]=newHex; _cfreqUpdateGlobalRowUI(lc,newHex); });
  } else if (_cfreqLinkedShift.has(ol)) {
    // HSL verschieben
    const fromHex = _cfreqChanges[ol] || ol;
    _cfreqLinkedShift.forEach(lc => {
      const cur = _cfreqChanges[lc] || lc;
      const shifted = (lc===ol) ? newHex : _applyHslShift(cur, fromHex, newHex);
      _cfreqChanges[lc] = shifted; _cfreqUpdateGlobalRowUI(lc, shifted);
    });
  } else {
    _cfreqChanges[ol] = newHex;
  }
}

function _cfreqUpdateGlobalRowUI(origLower, newHex) {
  document.querySelectorAll('.cfreq-row[data-orig]').forEach(row => {
    if (row.dataset.orig !== origLower) return;
    const rp = row.querySelector('.cfreq-picker'); if(!rp)return;
    const ri = rp.dataset.idx;
    _cfreqSyncUI(ri,'g',newHex);
  });
}

// ── Item: Picker + Hex ────────────────────────────────────
function _cfreqItemPickerInput(el) {
  const ii=el.dataset.iidx,li=el.dataset.lidx,newC=el.value,uid=ii+'_'+li;
  _cfreqSyncItemUI(uid,newC); _cfreqItemSetChange(ii,li,newC);
}
function _cfreqItemHexInput(el) {
  const raw=el.value.trim(); if(!/^#[0-9a-fA-F]{6}$/.test(raw))return;
  const uid=el.dataset.iidx+'_'+el.dataset.lidx;
  const s=document.getElementById('cfswt_i'+uid),p=document.getElementById('cfpick_i'+uid);
  if(s)s.style.background=raw; if(p)p.value=raw;
}
function _cfreqItemHexCommit(el) {
  const raw=el.value.trim(),ii=el.dataset.iidx,li=el.dataset.lidx,uid=ii+'_'+li;
  if(!/^#[0-9a-fA-F]{6}$/.test(raw)){el.value=_cfreqItemChanges[ii+':'+li]||el.dataset.orig;return;}
  _cfreqSyncItemUI(uid,raw); _cfreqItemSetChange(ii,li,raw);
}
function _cfreqSyncItemUI(uid,hex){
  const p=document.getElementById('cfpick_i'+uid),h=document.getElementById('cfhex_i'+uid),s=document.getElementById('cfswt_i'+uid);
  if(p)p.value=hex; if(h)h.value=hex; if(s)s.style.background=hex;
}

// ── Item: Link-Toggle ─────────────────────────────────────
function _cfreqItemLinkToggle(btn, type) {
  const ii=btn.dataset.iidx, li=btn.dataset.lidx, key=ii+':'+li;
  if (type==='ex'){
    if(_cfreqLinkedItems.has(key)){_cfreqLinkedItems.delete(key);}
    else{_cfreqLinkedItemsShift.delete(key);_cfreqLinkedItems.add(key);}
  } else {
    if(_cfreqLinkedItemsShift.has(key)){_cfreqLinkedItemsShift.delete(key);}
    else{_cfreqLinkedItems.delete(key);_cfreqLinkedItemsShift.add(key);}
  }
  _cfreqUpdateRowClass(btn.closest('.cfreq-icolor-row'), _cfreqLinkedItems.has(key), _cfreqLinkedItemsShift.has(key));
}

// ── Item: Change + Propagation ────────────────────────────
function _cfreqItemCurrentColor(ii, li) {
  const key=String(ii)+':'+String(li);
  if(_cfreqItemChanges[key]) return _cfreqItemChanges[key];
  const item=(_cfreqSrcItems||[])[parseInt(ii)]; if(!item) return '#808080';
  const cols=Array.isArray(item.colors)?item.colors:(item.colors?[item.colors]:[]);
  return (cols[parseInt(li)]||'#808080').toLowerCase();
}

function _cfreqItemSetChange(iidx, lidx, newHex) {
  const key=String(iidx)+':'+String(lidx);
  if (_cfreqLinkedItems.has(key)) {
    // 1:1 exakt
    _cfreqLinkedItems.forEach(lk=>{
      _cfreqItemChanges[lk]=newHex;
      const [li,ll]=lk.split(':'); _cfreqSyncItemUI(li+'_'+ll,newHex);
    });
  } else if (_cfreqLinkedItemsShift.has(key)) {
    // HSL verschieben
    const fromHex=_cfreqItemCurrentColor(iidx,lidx);
    _cfreqLinkedItemsShift.forEach(lk=>{
      const [li,ll]=lk.split(':');
      const cur=_cfreqItemCurrentColor(li,ll);
      const shifted=(lk===key)?newHex:_applyHslShift(cur,fromHex,newHex);
      _cfreqItemChanges[lk]=shifted; _cfreqSyncItemUI(li+'_'+ll,shifted);
    });
  } else {
    _cfreqItemChanges[key]=newHex;
  }
}

// ── Hilfsfunktionen ───────────────────────────────────────
function _cfreqUpdateRowClass(row, isEx, isSh) {
  if (!row) return;
  const exBtn=row.querySelector('[data-type="ex"]'), shBtn=row.querySelector('[data-type="sh"]');
  if(exBtn)exBtn.classList.toggle('active',isEx);
  if(shBtn)shBtn.classList.toggle('active',isSh);
  row.classList.toggle('cfreq-linked',   isEx && !isSh);
  row.classList.toggle('cfreq-linked-sh', isSh);
}

// ── Apply ─────────────────────────────────────────────────
function _cfreqApplyChanges(items, globalCh, itemCh) {
  (items||[]).forEach((item,iidx)=>{
    if(!item.colors)return;
    if(Array.isArray(item.colors)){
      item.colors=item.colors.map((c,lidx)=>{
        const ik=iidx+':'+lidx;
        if(itemCh&&itemCh[ik])return itemCh[ik];
        if(!c||c==='Default')return c;
        return globalCh[c.toLowerCase()]??c;
      });
    } else if(typeof item.colors==='string'){
      const ik=iidx+':0';
      if(itemCh&&itemCh[ik])item.colors=itemCh[ik];
      else if(item.colors!=='Default')item.colors=globalCh[item.colors.toLowerCase()]??item.colors;
    }
  });
}
function _cfreqHasChanges(){return Object.keys(_cfreqChanges).length>0||Object.keys(_cfreqItemChanges).length>0;}

// ── Testen ────────────────────────────────────────────────
// Nur Farb-Patches senden (kein Strip/InventoryWear) → kein Rate-Limit
function _cfreqTest() {
  if(!_cfreqHasChanges()){showStatus('⚠️ Keine Farbänderungen vorhanden','info');return;}
  if(!_connected){showStatus('❌ Nicht verbunden mit BC','error');return;}

  // Quell-Items ermitteln (Profil-Kopie oder aktuelles Outfit)
  let srcItems;
  if(_cfreqCtxType==='profile'&&_cfreqCtxKey){
    const p=PROFILES[_cfreqCtxKey];
    if(!p){showStatus('❌ Profil nicht gefunden','error');return;}
    srcItems=JSON.parse(JSON.stringify(p.items));
  } else {
    srcItems=OUTFIT.map(it=>({group:it.group,colors:Array.isArray(it.colors)?[...it.colors]:it.colors}));
  }

  // Farbänderungen auf Kopie anwenden
  _cfreqApplyChanges(srcItems,_cfreqChanges,_cfreqItemChanges);

  // Nur geänderte Items als Color-Patch-Code generieren
  const origItems=_cfreqCtxType==='profile'&&_cfreqCtxKey
    ? PROFILES[_cfreqCtxKey].items
    : OUTFIT;

  const patches=[];
  srcItems.forEach((item,i)=>{
    const orig=origItems[i];
    if(!orig)return;
    if(JSON.stringify(item.colors)!==JSON.stringify(orig.colors)){
      patches.push({group:item.group,colors:item.colors});
    }
  });

  if(!patches.length){showStatus('⚠️ Keine Farbänderungen erkannt','info');return;}

  // Leichtgewichtiger BC-Code: nur Color-Property patchen, kein InventoryWear
  const isOther=_outfitTargetNum!==null;
  let code='(function(){\n';
  if(isOther&&_outfitTargetNum){
    code+='var T=ChatRoomCharacter.find(function(c){return c.MemberNumber==='+_outfitTargetNum+';});\n';
    code+='if(!T){console.error("❌ Spieler #'+_outfitTargetNum+' nicht im Raum!");return;}\n';
  } else {
    code+='var T=Player;\n';
  }
  patches.forEach(function(p){
    code+='(function(){var _it=InventoryGet(T,'+JSON.stringify(p.group)+');'
        +'if(_it)_it.Color='+JSON.stringify(p.colors)+';})();\n';
  });
  code+='CharacterRefresh(T,false,false);\n';
  if(isOther&&_outfitTargetNum){
    code+='setTimeout(function(){ChatRoomCharacterUpdate(T);console.log("✅ Farb-Test ('+patches.length+' Items)");},1500);\n';
  } else {
    code+='setTimeout(function(){ServerPlayerAppearanceSync();setTimeout(function(){ChatRoomCharacterUpdate(T);console.log("✅ Farb-Test ('+patches.length+' Items)");},600);},1500);\n';
  }
  code+='})();';

  bcSend({type:'EXEC',code});
  showStatus('▶ Farb-Test: '+patches.length+' Item(s) aktualisiert','success');
}

// ── Speichern ─────────────────────────────────────────────
function _cfreqSave() {
  if(!_cfreqHasChanges()){showStatus('⚠️ Keine Farbänderungen vorhanden','info');return;}
  const n=Object.keys(_cfreqChanges).length+Object.keys(_cfreqItemChanges).length;
  if(_cfreqCtxType==='profile'&&_cfreqCtxKey){
    const p=PROFILES[_cfreqCtxKey];if(!p)return;
    _cfreqApplyChanges(p.items,_cfreqChanges,_cfreqItemChanges); _saveProfiles();
    showStatus('✅ '+n+' Änderung(en) in "'+_cfreqCtxKey+'" gespeichert','success');
    _cfreqChanges={};_cfreqItemChanges={};
    const panel=document.getElementById('pmodColorFreqPanel')||document.getElementById('outfitColorFreqPanel');
    if(panel)panel.innerHTML=_renderColorFreqHtml(_getColorFreq(p.items),_cfreqCtxType,_cfreqCtxKey);
  } else {
    _cfreqApplyChanges(OUTFIT,_cfreqChanges,_cfreqItemChanges); _autoOutfitCode();
    showStatus('✅ '+n+' Änderung(en) im Outfit gespeichert','success');
    _cfreqChanges={};_cfreqItemChanges={};
    const panel=document.getElementById('outfitColorFreqPanel');
    if(panel)panel.innerHTML=_renderColorFreqHtml(_getColorFreq(OUTFIT),'outfit','');
  }
}

// ── Als Kopie speichern ───────────────────────────────────
function _cfreqSaveCopy() {
  const rawName=document.getElementById('cfreqCopyName')?.value?.trim();
  if(!rawName){showStatus('❌ Bitte Namen eingeben','error');return;}
  if(PROFILES[rawName]&&!confirm('Profil "'+rawName+'" existiert bereits. Überschreiben?'))return;
  let srcItems;
  if(_cfreqCtxType==='profile'&&_cfreqCtxKey){
    srcItems=JSON.parse(JSON.stringify(PROFILES[_cfreqCtxKey]?.items||[]));
  } else {
    const SK=['group','asset','colors','tr','trStr','typeStr','tightCode','lock','lockParams','isOther','memberNum','label'];
    srcItems=JSON.parse(JSON.stringify(OUTFIT.map(item=>{const o={};SK.forEach(k=>{if(item[k]!==undefined)o[k]=item[k];});return o;})));
  }
  _cfreqApplyChanges(srcItems,_cfreqChanges,_cfreqItemChanges);
  const n=Object.keys(_cfreqChanges).length+Object.keys(_cfreqItemChanges).length;
  PROFILES[rawName]={name:rawName,date:new Date().toLocaleDateString('de-DE'),items:srcItems};
  _saveProfiles();renderProfileList();
  showStatus('✅ Kopie "'+rawName+'" mit '+n+' Farbänderung(en) gespeichert','success');
}

// ── Outfit-Tab: Panel-Toggle ──────────────────────────────
let _outfitColorFreqOpen = false;
function toggleOutfitColorFreq() {
  _outfitColorFreqOpen=!_outfitColorFreqOpen;
  const panel=document.getElementById('outfitColorFreqPanel'),btn=document.getElementById('outfitColorFreqBtn');
  if(!panel)return;
  if(_outfitColorFreqOpen){
    panel.innerHTML=_renderColorFreqHtml(_getColorFreq(OUTFIT),'outfit','');
    panel.style.display=''; if(btn)btn.textContent='🎨 Farben ▲';
  } else {panel.style.display='none';if(btn)btn.textContent='🎨 Farben';}
}
function refreshOutfitColorFreq(){
  const panel=document.getElementById('outfitColorFreqPanel');
  if(!panel||!_outfitColorFreqOpen)return;
  panel.innerHTML=_renderColorFreqHtml(_getColorFreq(OUTFIT),'outfit','');
}

// ── Profil-Modal: Panel-Toggle ────────────────────────────
let _pmodColorFreqOpen = false;
function _pmodToggleColorFreq(){
  _pmodColorFreqOpen=!_pmodColorFreqOpen; _refreshPmodColorFreq();
  const btn=document.getElementById('pmodColorFreqBtn');
  if(btn)btn.textContent=_pmodColorFreqOpen?'🎨 Farben ▲':'🎨 Farben';
}
function _refreshPmodColorFreq(){
  const panel=document.getElementById('pmodColorFreqPanel');if(!panel)return;
  if(!_pmodColorFreqOpen||!_profileModalName){panel.style.display='none';return;}
  const p=PROFILES[_profileModalName];
  panel.innerHTML=_renderColorFreqHtml(_getColorFreq(p?.items||[]),'profile',_profileModalName);
  panel.style.display='';
}
function _showCardColorFreq(slot){
  const name=_profileNameMap[slot];if(!name)return;
  _pmodColorFreqOpen=true; openProfileModal(slot,null);
  setTimeout(()=>{_refreshPmodColorFreq();const btn=document.getElementById('pmodColorFreqBtn');if(btn)btn.textContent='🎨 Farben ▲';},60);
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
        _saveProfiles();
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

function loadProfileByIdx(idx) {
  const el = document.getElementById('profileListEl');
  const keys = el._profileKeys;
  if (!keys || !keys[idx]) return;
  loadProfile(keys[idx]);
}

function deleteProfileByIdx(idx) {
  const el = document.getElementById('profileListEl');
  const keys = el._profileKeys;
  if (!keys || !keys[idx]) return;
  deleteProfile(keys[idx]);
}

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
  ['items','outfit','curse','bot','log','money','events','rank','shop','outfit-import','outfit-scan','locks'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('tab-'+t+'-btn')?.classList.toggle('active', t===tab);
  });
  if (tab === 'outfit')        { renderOutfitList(); renderOutfitMemberChips(); renderProfileList(); _autoOutfitCode(); }
  if (tab === 'curse')         { renderCurseTab(); _updateCurseDefaultOutfitBtn(); }
  if (tab === 'bot')           { renderBotTab(); }
  if (tab === 'log')           { renderLogTab(); }
  if (tab === 'money')         { renderMoneyTab(); }
  if (tab === 'rank')          { renderRankTab(); }
  if (tab === 'shop')          { renderShopTab(); }
  if (tab === 'outfit-import') { renderOutfitImportTab(); }
  if (tab === 'outfit-scan')   { renderOutfitScanTab(); }
  if (tab === 'locks')         { renderLocksTab(); _startLocksTimer(); }
  if (tab !== 'locks')         { _stopLocksTimer(); }

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
        // Kein GET_CACHE hier: buildBCCache() ist sehr teuer (komplettes Asset-Array
        // + Funktions-Parsing) und für den Curse-Scan nicht nötig → verursachte Freezes.
        _sendCurseScanRequest(true);
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

// ── Scan-Meta: Raum + Zeitpunkt pro Owner ────────────────────────────────────
// ownerNum (string) → { room: string, time: string }
// Wird bei jedem Scan für die aktuell im Raum anwesenden Personen aktualisiert.
let CURSE_SCAN_META = {};
idbGet('BC_CURSE_SCAN_META_v1').then(function(d) { if (d && typeof d === 'object') CURSE_SCAN_META = d; });
function _saveCurseScanMeta() { idbSet('BC_CURSE_SCAN_META_v1', CURSE_SCAN_META); }

// Comments: persisted in IndexedDB
let CURSE_COMMENTS = {};
function _saveCurseComments() { idbSet('BC_CURSE_COMMENTS_v1', CURSE_COMMENTS); }
// ── Outfit-Flags ─────────────────────────────────────────────
let CURSE_OUTFIT_FLAGS = {};  // dbKey → timestamp (wann Outfit-Tag gesetzt wurde)
let CURSE_APPLIED_TS  = {};  // dbKey → timestamp (wann Item zuletzt angewendet wurde)
function _saveCurseOutfitFlags() {
  // Outfit-Flags sofort separat speichern (schnell, kein Freeze)
  idbSet('BC_CURSE_OUTFIT_v1', CURSE_OUTFIT_FLAGS);
  // Vollständige CurseDB debounced speichern (27k Items, teuer)
  _debouncedSaveCurseDB();
}
// ── Gruppen-Overrides ────────────────────────────────────────
let CURSE_GRUPPE_OVERRIDES = {};  // dbKey → string (manuell gesetzter Gruppe-Name)
function _saveCurseGruppeOverrides() { idbSet('BC_CURSE_GRUPPE_v1', CURSE_GRUPPE_OVERRIDES); }
function _getEffectiveGruppe(entry, dbKey) {
  return CURSE_GRUPPE_OVERRIDES[dbKey] || entry.Gruppe || 'UNBEKANNT';
}
// ── Favoriten ────────────────────────────────────────────────
let CURSE_FAVOURITES = new Set();
function _saveCurseFavourites() { idbSet('BC_CURSE_FAV_v1', [...CURSE_FAVOURITES]); }
function toggleCurseFavourite(dbKey, cellEl) {
  const wasFav = CURSE_FAVOURITES.has(dbKey);
  if (wasFav) CURSE_FAVOURITES.delete(dbKey); else CURSE_FAVOURITES.add(dbKey);
  _saveCurseFavourites();
  if (cellEl) {
    const isFav = !wasFav;
    cellEl.innerHTML = '<button class="curse-fav-btn' + (isFav ? ' fav' : '') + '" style="pointer-events:none">⭐</button>';
    const row = cellEl.closest('.cg-row');
    if (row) row.classList.toggle('fav', isFav);
    // Fav-Zähler im Owner-Block aktualisieren
    const block = cellEl.closest('.curse-owner-block');
    if (block) {
      const badge = block.querySelector('.curse-owner-fav-badge');
      const cnt = block.querySelectorAll('.cg-row.fav').length;
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
// Delta-Protokoll: Erster Scan nach Connect/Reload fordert die volle DB an
// (full:true), danach schickt BC nur noch die im Scan geänderten Einträge.
let _curseFullReceived = false;

function _sendCurseScanRequest(auto) {
  return bcSend({ type: 'SCAN_CURSES', _auto: auto === true, full: !_curseFullReceived }, auto === true);
}

function curseScan() {
  const statusEl = document.getElementById('csScanStatus');
  statusEl.textContent = '⏳ Scanne...';
  // Kein GET_CACHE mehr: Der Item-Cache (Asset-Array) ist statisch und für den
  // Curse-Scan irrelevant. buildBCCache() blockierte BC + Popup bei jedem Scan.
  _sendCurseScanRequest(false);
}

// ── Handle SCAN_RESULT ────────────────────────────────
// called from postMessage handler

function _saveCurseDB() {
  idbSet('BC_CURSE_DB_v1', {database:CURSE_DB,lscgTable:CURSE_LSCG,lscgCache:CURSE_CACHE_LSCG,favourites:[...CURSE_FAVOURITES],outfitFlags:CURSE_OUTFIT_FLAGS});
}

let _curseDBFresh = false; // true once BC sends live data — prevents IDB startup overwrite

function _handleCurseData(data) {
  if (data.err) { showStatus('❌ Curse-Scan: ' + data.err, 'error'); return; }
  _curseDBFresh = true;

  const isDelta = !data.database && data.delta;
  const _now = Date.now();
  const _roomNums = data.roomMembers?.length
    ? new Set(data.roomMembers.map(String))
    : new Set(_lastRoomMembers.map(function(m) { return String(m.num); }));

  let _addedKeys = [];

  if (isDelta) {
    // ── Delta-Merge: nur geänderte Einträge ersetzen, Rest bleibt unberührt ──
    // (inkl. vorhandener ZuletztGescannt-Timestamps abwesender Besitzer)
    for (const k in data.delta) {
      const entry = data.delta[k];
      if (!CURSE_DB[k]) _addedKeys.push(k);
      if (entry.IstCursed) {
        const ownerNum = String(entry.Besitzer?.Nummer ?? '');
        if (_roomNums.has(ownerNum)) entry.ZuletztGescannt = _now;
        else if (CURSE_DB[k]?.ZuletztGescannt) entry.ZuletztGescannt = CURSE_DB[k].ZuletztGescannt;
      }
      CURSE_DB[k] = entry;
    }
    // lscgTable/lscgCache sind klein – BC sendet sie weiterhin vollständig
    if (data.lscgTable) CURSE_LSCG       = data.lscgTable;
    if (data.lscgCache) CURSE_CACHE_LSCG = data.lscgCache;
  } else {
    // ── Full-Sync: komplette DB ersetzen (erster Scan nach Connect/Reload) ──
    // ZuletztGescannt-Timestamps aus dem alten CURSE_DB retten BEVOR wir überschreiben.
    const _prevTs = {};
    const _prevKeys = new Set(Object.keys(CURSE_DB));
    for (const k of _prevKeys) {
      const ts = CURSE_DB[k]?.ZuletztGescannt;
      if (ts) _prevTs[k] = ts;
    }

    CURSE_DB         = data.database    ?? {};
    CURSE_LSCG       = data.lscgTable   ?? {};
    CURSE_CACHE_LSCG = data.lscgCache   ?? {};
    _curseFullReceived = true;

    // Timestamps setzen: nur cursed Items, nur einmal über CURSE_DB iterieren (O(n))
    for (const k in CURSE_DB) {
      const entry = CURSE_DB[k];
      if (!entry.IstCursed) continue;
      const ownerNum = String(entry.Besitzer?.Nummer ?? '');
      if (_roomNums.has(ownerNum)) {
        entry.ZuletztGescannt = _now;
      } else if (_prevTs[k]) {
        entry.ZuletztGescannt = _prevTs[k];
      }
    }
    _addedKeys = Object.keys(CURSE_DB).filter(k => !_prevKeys.has(k));
  }

  // Scan-Meta: Raum + Zeitpunkt für aktuellen Raum speichern.
  // Bei Delta reicht der Durchlauf über die geänderten Einträge (Besitzer im Raum).
  if (_roomNums.size > 0 && data.room) {
    const _scanRoom = data.room;
    const _scanTime = new Date().toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    const _seenOwners = new Set();
    const _metaSrc = isDelta ? data.delta : CURSE_DB;
    for (const k in _metaSrc) {
      const on = String(_metaSrc[k].Besitzer?.Nummer ?? '');
      if (on && _roomNums.has(on)) _seenOwners.add(on);
    }
    _seenOwners.forEach(function(on) { CURSE_SCAN_META[on] = { room: _scanRoom, time: _scanTime }; });
    if (_seenOwners.size > 0) _saveCurseScanMeta();
  }

  _updateCurseStats();
  _populateSlotFilter();
  if (_activeTab === 'curse') renderCurseTab();

  const total  = Object.keys(CURSE_DB).length;
  const isAuto = data._auto === true;

  // Change-Detection: BC sendet neuDB/aktualisiert direkt mit → kein teurer JSON.stringify-Vergleich
  const addedCount   = data.neuDB       ?? 0;
  const updatedCount = data.aktualisiert ?? 0;
  const _finalAdded   = addedCount   || _addedKeys.length;
  const _finalUpdated = updatedCount || 0;

  let statusText = '✅ ' + total + ' Crafts';
  if (_finalAdded || _finalUpdated) {
    statusText += ' | +' + _finalAdded + ' neu, ' + _finalUpdated + ' geändert';
    if (_addedKeys.length) _showChangeBadge(_addedKeys, []);
    else if (addedCount)   _showChangeBadge([], []);
  } else if (!isAuto) {
    statusText += ' | keine Änderungen';
  }
  document.getElementById('csScanStatus').textContent = isAuto
    ? '🔄 ' + new Date().toLocaleTimeString() + ' — ' + total + ' Crafts'
    : statusText;
  if (!isAuto || _finalAdded || _finalUpdated) {
    showStatus(statusText, _finalAdded + _finalUpdated > 0 ? 'success' : 'info');
  }
  // Debounced: strukturiertes Klonen der ~27k Einträge für IDB ist teuer;
  // bei schnell aufeinanderfolgenden Scans nur einmal speichern.
  _debouncedSaveCurseDB();
}


// ── CURSE FILTER STATE ───────────────────────────────
// Multi-select; mutual exclusion: outfit ↔ {neu, no-outfit}
const _curseActiveFilters = new Set();  // 'neu' | 'cursed' | 'fav' | 'outfit' | 'no-outfit'
let _pendingExport = false;
let _curseEntryMap = {};    // rowId → dbKey, for safe onclick
let _curseOwnerData = {};   // ownerNum → { name, num, items[] } — für Lazy Row Rendering

function toggleCacheFilter() {
  const el = document.getElementById('fc-cache');
  if (el) el.classList.toggle('on');
  renderCurseTab();
}

function toggleCurseFilterPanel(e) {
  e.stopPropagation();
  const panel = document.getElementById('cfpPanel');
  const btn   = document.getElementById('cfpBtn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', isOpen);
  if (isOpen) {
    // close on outside click
    const close = (ev) => {
      if (!document.getElementById('cfpWrap')?.contains(ev.target)) {
        panel.classList.remove('open');
        if (btn) btn.classList.remove('active');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

// Gibt zurueck welcher Neu-Typ zutrifft:
//   'normal'  → nicht-gecurstes Item ohne Outfit-Tag: nie angewendet ODER angewendet vor <5min
//   'cursed'  → gecurstes Item ohne Outfit-Tag: in letzter Stunde gescannt
//   false     → kein Badge
function _getNeuType(entry) {
  const k   = (entry.Besitzer?.Nummer ?? '') + ':' + entry.ItemName + ':' + entry.CraftName;
  const now = Date.now();
  if (entry.IstCursed) {
    // Curse-Neu: in letzter Stunde gescannt → Neu; egal ob Outfit-Tag gesetzt
    const fresh = entry.ZuletztGescannt && now - entry.ZuletztGescannt < 3600000;
    return fresh ? 'cursed' : false;
  }
  // Normal-Items: Outfit-Tag gesetzt → nie Neu
  if (CURSE_OUTFIT_FLAGS[k]) return false;
  // Normal-Neu: nie angewendet → immer Neu; angewendet → noch 5min sichtbar, dann weg
  const appliedAt = CURSE_APPLIED_TS[k];
  if (!appliedAt) return 'normal';
  return (now - appliedAt) < 300000 ? 'normal' : false;
}
// Compat-Wrapper fuer Filter-Logik
function _isNeu(entry) { return !!_getNeuType(entry); }

function toggleCurseFilter(key) {
  if (_curseActiveFilters.has(key)) {
    _curseActiveFilters.delete(key);
  } else {
    _curseActiveFilters.add(key);
    // Mutual exclusion: outfit ↔ {neu, no-outfit}
    if (key === 'outfit') {
      _curseActiveFilters.delete('neu');
      _curseActiveFilters.delete('no-outfit');
    } else if (key === 'neu' || key === 'no-outfit') {
      _curseActiveFilters.delete('outfit');
    }
  }
  _syncCurseFilterUI();
  renderCurseTab();
}

function _syncCurseFilterUI() {
  const hasOutfit   = _curseActiveFilters.has('outfit');
  const hasNeuOrNO  = _curseActiveFilters.has('neu') || _curseActiveFilters.has('no-outfit');

  ['neu','cursed','fav','outfit','no-outfit'].forEach(k => {
    const cb = document.getElementById('fcb-' + k);
    if (cb) cb.checked = _curseActiveFilters.has(k);
    // Grey out mutually exclusive options (not the checked ones)
    const row = document.getElementById('cfpl-' + k);
    if (row) {
      let disabled = false;
      if (k === 'outfit'   && hasNeuOrNO && !hasOutfit) disabled = true;
      if ((k === 'neu' || k === 'no-outfit') && hasOutfit) disabled = true;
      row.classList.toggle('cfp-disabled', disabled);
    }
  });

  // Badge count
  const total   = _curseActiveFilters.size;
  const countEl = document.getElementById('cfpCount');
  const btnEl   = document.getElementById('cfpBtn');
  if (countEl) { countEl.textContent = total; countEl.style.display = total > 0 ? '' : 'none'; }
  if (btnEl)   btnEl.classList.toggle('active', total > 0);
}

function _populateSlotFilter() {
  const sel = document.getElementById('slotFilter');
  if (!sel) return;
  const current = sel.value;
  // Use effective gruppe (override wins) – ein einziger Durchlauf über die DB
  // (statt 2×): sammelt Slots + zählt UNBEKANNT in einem Pass (27k Einträge/Scan).
  const slotSet = new Set();
  let unknownCount = 0;
  for (const k in CURSE_DB) {
    const g = _getEffectiveGruppe(CURSE_DB[k], k);
    if (!g) continue;
    slotSet.add(g);
    if (g === 'UNBEKANNT') unknownCount++;
  }
  const slots = [...slotSet].sort((a, b) => {
    if (a === 'UNBEKANNT') return -1;  // UNBEKANNT zuerst
    if (b === 'UNBEKANNT') return 1;
    return a.localeCompare(b);
  });
  sel.innerHTML = '<option value="">Alle Slots</option>' +
    slots.map(s => {
      const label = s === 'UNBEKANNT' ? '⚠️ UNBEKANNT (' + unknownCount + ')' : s;
      return '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
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
  const body      = document.getElementById('curseBody');
  const colHdrEl  = document.getElementById('curseColHdr');
  const empty     = document.getElementById('curseEmpty');
  if (!body) return;

  // ── Apply filters ──
  const searchTerm = (document.getElementById('curseSearch')?.value || '').toLowerCase();
  const slotFilter = document.getElementById('slotFilter')?.value || '';
  const cacheOnly  = document.getElementById('fc-cache')?.classList.contains('on') ?? false;

  let entries = Object.values(CURSE_DB);
  if (_curseActiveFilters.has('cursed'))   entries = entries.filter(e => !!e.IstCursed);
  if (_curseActiveFilters.has('fav'))      entries = entries.filter(e => {
    const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    return CURSE_FAVOURITES.has(k);
  });
  if (_curseActiveFilters.has('neu'))      entries = entries.filter(e => _isNeu(e));
  if (_curseActiveFilters.has('outfit'))   entries = entries.filter(e => {
    const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    return !!CURSE_OUTFIT_FLAGS[k];
  });
  if (_curseActiveFilters.has('no-outfit')) entries = entries.filter(e => {
    const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    return !CURSE_OUTFIT_FLAGS[k];
  });
  if (cacheOnly)   entries = entries.filter(e => !!e.IstLSCGCurse);
  if (slotFilter)  entries = entries.filter(e => {
    const k2 = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    return _getEffectiveGruppe(e, k2) === slotFilter;
  });
  if (searchTerm)  entries = entries.filter(e => {
    if (e.CraftName?.toLowerCase().includes(searchTerm))        return true;
    if (e.ItemName?.toLowerCase().includes(searchTerm))         return true;
    if (e.Gruppe?.toLowerCase().includes(searchTerm))           return true;
    if (e.Besitzer?.Name?.toLowerCase().includes(searchTerm))   return true;
    if (String(e.Besitzer?.Nummer ?? '').includes(searchTerm))  return true;
    // Kommentar durchsuchen
    const dbKey = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    if (CURSE_COMMENTS[dbKey]?.toLowerCase().includes(searchTerm)) return true;
    // Raumname durchsuchen
    const ownerMeta = CURSE_SCAN_META[String(e.Besitzer?.Nummer ?? '')];
    if (ownerMeta?.room?.toLowerCase().includes(searchTerm))    return true;
    return false;
  });

  if (!entries.length) {
    empty.style.display = '';
    empty.querySelector ? (empty.innerHTML = Object.keys(CURSE_DB).length
      ? '<div style="font-size:1.5rem;margin-bottom:8px">🔍</div>Keine Treffer für die gewählten Filter.'
      : '<div style="font-size:2rem;margin-bottom:8px">🔮</div>Noch kein Scan. Klicke <strong>Scannen</strong>.') : null;
    body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());
    return;
  }
  empty.style.display = 'none';

  // Group by owner (skip entries without Besitzer)
  const byOwner = {};
  _curseOwnerData = {};  // Reset Lazy-Cache
  _curseEntryMap  = {};  // Reset Row-Map
  entries.forEach((e, idx) => {
    if (!e?.Besitzer?.Nummer) return;
    const key = e.Besitzer.Nummer + ':' + e.Besitzer.Name;
    if (!byOwner[key]) byOwner[key] = { name: e.Besitzer.Name, num: e.Besitzer.Nummer, items: [] };
    byOwner[key].items.push({ ...e, _idx: idx });
  });
  // Store for lazy rendering
  Object.values(byOwner).forEach(o => { _curseOwnerData[o.num] = o; });

  // Remove existing owner blocks from body (col-headers live in #curseColHdr, separate element)
  body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());

  // Inject/refresh column header row into the fixed header container above the scroll body
  if (colHdrEl) {
    colHdrEl.innerHTML = '';
    const colHeaders = document.createElement('div');
    colHeaders.className = 'curse-col-headers';
    colHeaders.innerHTML =
      '<div class="cg-hdr center" title="Favorit">⭐</div>'+
      '<div class="cg-hdr center" title="Als Outfit markiert">👗</div>'+
      '<div class="cg-hdr">Name</div>'+
      '<div class="cg-hdr">Item</div>'+
      '<div class="cg-hdr">Gruppe</div>'+
      '<div class="cg-hdr">Flags</div>'+
      '<div class="cg-hdr center">Neu</div>'+
      '<div class="cg-hdr"></div>'+
      '<div class="cg-hdr">Kommentar</div>'+
      '<div class="cg-hdr right">Aktionen</div>';
    colHdrEl.appendChild(colHeaders);
  }

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
    const ownerOutfitCount = owner.items.filter(i => {
      const k2 = (i.Besitzer?.Nummer ?? '') + ':' + i.ItemName + ':' + i.CraftName;
      return !!CURSE_OUTFIT_FLAGS[k2];
    }).length;

    const _meta = CURSE_SCAN_META[String(owner.num)] ?? null;
    const _metaHtml = _meta
      ? '<span style="font-size:.6rem;color:var(--text3);white-space:nowrap;margin-left:4px" title="Zuletzt gescannt">'
        + '📍' + (_meta.room ? escHtml(_meta.room) : '?') + ' &nbsp;🕐' + escHtml(_meta.time) + '</span>'
      : '';

    block.innerHTML =
      '<div class="curse-owner-hdr" onclick="toggleCurseOwner(\'' + blockId + '\')">'+
        '<span class="curse-owner-name">'+escHtml(owner.name)+'</span>'+
        '<span class="curse-owner-num">#'+owner.num+'</span>'+
        _metaHtml +
        (lscgCount ? '<span class="curse-owner-count" style="background:var(--gd);color:var(--green)">🧿 '+lscgCount+'</span>' : '')+
        (cursedCount ? '<span class="curse-owner-count">🔮 '+cursedCount+'</span>' : '')+
        '<span class="curse-owner-count" style="background:var(--bg3);color:var(--text2)">'+owner.items.length+'</span>'+
        (ownerFavCount ? '<span class="curse-owner-count curse-owner-fav-badge" style="background:rgba(251,191,36,.12);color:#fbbf24;border-color:rgba(251,191,36,.3)">⭐ '+ownerFavCount+'</span>' : '<span class="curse-owner-fav-badge" style="display:none"></span>')+
        '<span class="curse-owner-count curse-owner-outfit-badge" style="background:rgba(52,211,153,0.12);color:#6ee7b7;border-color:rgba(52,211,153,0.3);'+(!ownerOutfitCount?'display:none':'')+'" title="Als Outfit markierte Items">👗 '+ownerOutfitCount+'</span>'+
        '<button onclick="event.stopPropagation();curseSaveAllAsProfile(\'' + owner.num + '\')"'
          + ' style="margin-left:auto;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;cursor:pointer;font-size:.68rem;padding:2px 8px;border-radius:4px;white-space:nowrap"'
          + ' title="Alle Curses als Outfit-Profil speichern">💾 Alle speichern</button>'+
        '<span class="curse-owner-chevron">▶</span>'+
      '</div>'+
      '<div class="curse-rows-body" id="cb_'+owner.num+'"></div>';

    body.appendChild(block);

    // Lazy: Rows nur für bereits offene Blöcke sofort rendern
    if (wasOpen) _renderCurseOwnerRows(owner.num);
  });
}

// ── Lazy Row Renderer: füllt tbody eines Owner-Blocks ────────
function _renderCurseOwnerRows(ownerNum) {
  const tbody = document.getElementById('cb_' + ownerNum);
  if (!tbody) return;
  if (tbody.dataset.rendered === '1') return; // bereits gerendert
  const owner = _curseOwnerData[ownerNum];
  if (!owner) return;

  const frag = document.createDocumentFragment();

  owner.items.forEach((entry, rowIdx) => {
    if (!entry?.Besitzer?.Nummer) return;
    const dbKey   = entry.Besitzer.Nummer + ':' + entry.ItemName + ':' + entry.CraftName;
    const rowId   = 'cr_' + owner.num + '_' + rowIdx;
    const detId   = 'cd_' + owner.num + '_' + rowIdx;
    const comment = CURSE_COMMENTS[dbKey] || '';
    const isLSCG   = entry.IstLSCGCurse;
    const isCursed = entry.IstCursed;
    const isOutfit = !!CURSE_OUTFIT_FLAGS[dbKey];
    const isFav    = CURSE_FAVOURITES.has(dbKey);
    const neuType  = _getNeuType(entry); // 'normal' | 'cursed' | false
    const effGruppe = _getEffectiveGruppe(entry, dbKey);
    const isUnbekannt = effGruppe === 'UNBEKANNT';
    const hasOverride = !!CURSE_GRUPPE_OVERRIDES[dbKey];

    _curseEntryMap[rowId] = dbKey;

    const tr = document.createElement('div');
    tr.className = 'cg-row' + (isFav ? ' fav' : '') + (isOutfit ? ' outfit-flagged' : '');
    tr.id = rowId;
    tr.innerHTML =
      '<div class="cg-fav" data-dbkey="' + escHtml(dbKey) + '" onclick="toggleCurseFavourite(this.dataset.dbkey,this)" title="Favorit">'
      + '<button class="curse-fav-btn' + (isFav ? ' fav' : '') + '" style="pointer-events:none">\u2B50</button>'
      + '</div>'
      + '<div class="cg-outfit" data-dbkey="' + escHtml(dbKey) + '" onclick="toggleCurseOutfitFlag(this.dataset.dbkey,this)" title="Outfit-Markierung">'
      + '<button class="curse-outfit-btn' + (isOutfit ? ' on' : '') + '" style="pointer-events:none">' + (isOutfit ? '\uD83D\uDC57 Outfit' : '+ Outfit') + '</button>'
      + '</div>'
      + '<div class="cg-name"><span class="cursor-detail-toggle" onclick="toggleCurseDetail(\'' + detId + '\',\'' + rowId + '\')">\u25B6</span>' + escHtml(entry.CraftName) + (echoTranslate(entry.CraftName) ? '<span style="font-size:.58rem;color:#a78bfa;margin-left:4px">(' + echoTranslate(entry.CraftName) + ')</span>' : '') + '</div>'
      + '<div class="cg-item">' + escHtml(entry.ItemName) + (echoTranslate(entry.ItemName) ? '<span style="font-size:.58rem;color:var(--text3);margin-left:4px">(' + echoTranslate(entry.ItemName) + ')</span>' : '') + '</div>'
      + '<div class="cg-grp' + (isUnbekannt ? ' grp-unknown' : '') + '" data-dbkey="' + escHtml(dbKey) + '" onclick="_openCurseGruppeEditor(this)" title="Gruppe bearbeiten">'
      + escHtml(effGruppe) + (isUnbekannt ? ' <span class="grp-edit-hint">\u270F\uFE0F</span>' : (hasOverride ? ' <span class="grp-edit-hint">\uD83D\uDCCC</span>' : ''))
      + '</div>'
      + '<div class="cg-flags">'
      + (isCursed ? '<span class="curse-detail-badge cursed">\uD83D\uDD2E</span>' : '')
      + (entry.Private ? '<span class="curse-detail-badge">\uD83D\uDD12</span>' : '')
      + (entry.Property ? '<span class="curse-detail-badge">' + escHtml(entry.Property) + '</span>' : '')
      + '</div>'
      + '<div class="cg-neu">'
      + (neuType === 'normal' ? '<span class="neu-badge">Neu</span>' : '')
      + (neuType === 'cursed' ? '<span class="neu-badge neu-cursed">🔮 Neu</span>' : '')
      + '</div>'
      + '<div class="cg-spacer"></div>'
      + '<div class="cg-comment"><textarea class="curse-comment-input" placeholder="Notiz..." data-rowid="' + rowId + '" oninput="_debounceCurseComment(this)" onchange="saveCurseCommentById(this.dataset.rowid,this.value)">' + escHtml(comment) + '</textarea></div>'
      + '<div class="cg-actions">'
      + '<button class="curse-apply-btn" data-rid="' + rowId + '" data-tgt="" onclick="wearCurseByData(this)" title="Auf mich anwenden">\uD83D\uDC64</button>'
      + (_selectedMemberNum ? '<button class="curse-apply-btn other" data-rid="' + rowId + '" data-tgt="' + _selectedMemberNum + '" onclick="wearCurseByData(this)" title="Auf #' + _selectedMemberNum + '">\uD83D\uDC65 #' + _selectedMemberNum + '</button>' : '')
      + '<button data-rid="' + rowId + '" onclick="curseSaveAsProfile(this.dataset.rid)" style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);color:#a78bfa;cursor:pointer;font-size:.72rem;padding:2px 6px;border-radius:4px;margin-left:2px" title="Als Outfit-Profil speichern, dann eigenes Outfit wiederherstellen">\uD83D\uDCBE Profil</button>'
      + '<button data-dbkey="' + escHtml(dbKey) + '" onclick="deleteCurseEntry(this.dataset.dbkey)" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem;padding:2px 5px;margin-left:2px" title="L\u00f6schen">\u2715</button>'
      + '</div>';

    frag.appendChild(tr);

    // Detail-Zeile
    const lscgEntry = entry.LSCG;
    const detailFields = [
      ['Beschreibung', entry.Description || '\u2013'],
      ['Farbe', entry.Farbe || '\u2013'],
      ['Property', entry.Property || '\u2013'],
      ['Private', entry.Private ? 'Ja' : 'Nein'],
      ['Zuletzt', entry.ZuletztGesehen],
      ...(isLSCG ? [
        ['LSCG Name', lscgEntry?.Name || '\u2013'],
        ['Outfit Key', lscgEntry?.OutfitKey || '\u2013'],
        ['Speed', lscgEntry?.Speed ?? '\u2013'],
        ['Enabled', lscgEntry?.Enabled ? 'Ja' : 'Nein'],
        ['Inexhaustable', lscgEntry?.Inexhaustable ? 'Ja' : 'Nein'],
        ['Aus Cache', entry.LSCGAusCache ? 'Ja \uD83D\uDCBE' : 'Nein \u2705'],
      ] : []),
    ];
    const detTr = document.createElement('div');
    detTr.className = 'cg-detail-row';
    detTr.id = detId;
    detTr.innerHTML =
      '<div class="curse-detail-cell">'
      + '<div style="font-size:.63rem;color:var(--text3);margin-bottom:4px">Details f\u00fcr ' + escHtml(entry.CraftName) + '</div>'
      + '<div class="curse-detail-grid">'
      + detailFields.map(([label, val]) =>
          '<div class="curse-detail-field">'
          + '<div class="curse-detail-label">' + label + '</div>'
          + '<div class="curse-detail-val">' + escHtml(String(val)) + '</div>'
          + '</div>'
        ).join('')
      + '</div></div>';
    frag.appendChild(detTr);
  });

  tbody.appendChild(frag);
  tbody.dataset.rendered = '1'; // marks this rows-body as rendered
}

function toggleCurseOwner(id) {
  const block = document.getElementById(id);
  if (!block) return;
  const wasOpen = block.classList.contains('open');
  block.classList.toggle('open');
  // Lazy: Rows beim ersten Öffnen rendern
  if (!wasOpen) _renderCurseOwnerRows(id.replace('co_', ''));
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

// Debounce-Speicherung während des Tippens (500ms nach letzter Eingabe).
// Verhindert Kommentar-Verlust wenn renderCurseTab den DOM neu baut bevor onchange feuert.
const _commentDebounceTimers = {};
function _debounceCurseComment(el) {
  const rowId = el.dataset.rowid;
  if (!rowId) return;
  clearTimeout(_commentDebounceTimers[rowId]);
  _commentDebounceTimers[rowId] = setTimeout(function() {
    saveCurseCommentById(rowId, el.value);
    delete _commentDebounceTimers[rowId];
  }, 500);
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

function toggleCurseOutfitFlag(dbKey, cellEl) {
  const wasSet = !!CURSE_OUTFIT_FLAGS[dbKey];
  if (wasSet) delete CURSE_OUTFIT_FLAGS[dbKey];
  else CURSE_OUTFIT_FLAGS[dbKey] = Date.now();
  _saveCurseOutfitFlags();
  if (cellEl) {
    const isSet = !wasSet;
    cellEl.innerHTML = '<button class="curse-outfit-btn' + (isSet ? ' on' : '') + '" style="pointer-events:none">' + (isSet ? '👗 Outfit' : '+ Outfit') + '</button>';
    const row = cellEl.closest('.cg-row');
    if (row) {
      row.classList.toggle('outfit-flagged', isSet);
    }
    // Owner-Block Badge aktualisieren
    const block = cellEl.closest('.curse-owner-block');
    if (block) {
      const badge = block.querySelector('.curse-owner-outfit-badge');
      const cnt = block.querySelectorAll('.cg-row.outfit-flagged').length;
      if (badge) {
        badge.textContent = '👗 ' + cnt;
        badge.style.display = cnt > 0 ? '' : 'none';
      }
    }
  } else {
    renderCurseTab();
  }
}

function clearAllOutfitFlags() {
  const count = Object.keys(CURSE_OUTFIT_FLAGS).length;
  if (count === 0) { showStatus('ℹ️ Keine Outfit-Tags vorhanden', 'info'); return; }
  if (!confirm('Alle ' + count + ' Outfit-Tags löschen? Das kann nicht rückgängig gemacht werden.')) return;
  CURSE_OUTFIT_FLAGS = {};
  _saveCurseOutfitFlags();
  if (_activeTab === 'curse') renderCurseTab();
  showStatus('✅ Alle ' + count + ' Outfit-Tags gelöscht', 'success');
}

function curseAutoMarkOutfit() {
  let marked = 0;
  for (const [key, comment] of Object.entries(CURSE_COMMENTS)) {
    if (/outfit/i.test(comment) && !CURSE_OUTFIT_FLAGS[key]) {
      CURSE_OUTFIT_FLAGS[key] = Date.now();
      marked++;
    }
  }
  _saveCurseOutfitFlags();
  if (_activeTab === 'curse') renderCurseTab();
  showStatus(marked > 0
    ? '✅ ' + marked + ' Item(s) als Outfit markiert'
    : 'ℹ️ Keine neuen Kommentare mit „outfit" gefunden', marked > 0 ? 'success' : 'info');
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


// ── Vor-Curse-Snapshot (in-memory, nicht persistiert) ───────────────────────
// Gespeichertes Profil (Items-Array) des Outfits VOR dem letzten Curse-Anwenden auf sich selbst.
// Wird als temporäres Profil '__ursprung_temp__' gespeichert und genau wie ein normales
// Profil ausgeführt (loadProfile + outfitCode → bcSend EXEC).
const _URSPRUNG_PROFILE_KEY = '__ursprung_temp__';
let _preCurseSnapshotCode = null;   // gesetzt sobald Snapshot-Items vorliegen (Sentinel für "aktiv")
let _pendingPreCurseSnapshotCb = null;

function wearCurse(dbKey, targetNum) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const entry = CURSE_DB[dbKey] ?? null;
  if (!entry) { showStatus('❌ Eintrag nicht in DB: ' + dbKey, 'error'); return; }
  const effectiveEntry = CURSE_GRUPPE_OVERRIDES[dbKey]
    ? { ...entry, Gruppe: CURSE_GRUPPE_OVERRIDES[dbKey] }
    : entry;
  CURSE_APPLIED_TS[dbKey] = Date.now();

  // Nur bei Selbst-Anwendung ohne aktiven Snapshot: Outfit sichern + Standard-Outfit + Curse
  if (!targetNum && !_preCurseSnapshotCode) {
    showStatus('⏳ Outfit wird gesichert…', 'info');
    const reqId = 'pcs_' + Date.now();

    _pendingOutfitSave[reqId] = function(items) {
      if (items?.length) {
        // Kein _applyHairBaseline: beim eigenen Ursprungs-Outfit alle Items inkl. Haare 1:1 sichern
        PROFILES[_URSPRUNG_PROFILE_KEY] = {
          name: _URSPRUNG_PROFILE_KEY,
          date: new Date().toLocaleDateString('de-DE'),
          items: items.map(_appearanceItemToProfile),
          _temp: true,
        };
        _preCurseSnapshotCode = reqId;  // Sentinel: Snapshot aktiv
        showStatus('📸 Outfit gesichert', 'success');
      } else {
        showStatus('⚠️ Snapshot leer – Curse wird trotzdem angelegt', 'info');
        _preCurseSnapshotCode = reqId;  // Weiter machen
      }
      if (typeof _pendingPreCurseSnapshotCb === 'function') {
        const cb = _pendingPreCurseSnapshotCb;
        _pendingPreCurseSnapshotCb = null;
        cb();
      }
    };

    bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: null, reqId });

    _pendingPreCurseSnapshotCb = function() {
      if (CURSE_DEFAULT_OUTFIT_CODE) {
        bcSend({ type: 'EXEC', code: _applyBundleWithSync(CURSE_DEFAULT_OUTFIT_CODE) });
        showStatus('🏠 Standard-Outfit wird ausgerüstet…', 'info');
        setTimeout(() => {
          bcSend({ type: 'WEAR_CURSE', dbKey, targetNum: null, entry: effectiveEntry });
          showStatus('⏳ Curse wird angelegt…', 'info');
        }, 2000);
      } else {
        bcSend({ type: 'WEAR_CURSE', dbKey, targetNum: null, entry: effectiveEntry });
        showStatus('⏳ Curse wird angelegt…', 'info');
      }
    };
    return;
  }

  // Fremd-Anwendung oder Snapshot bereits aktiv → direkt anlegen
  bcSend({ type: 'WEAR_CURSE', dbKey, targetNum, entry: effectiveEntry });
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
// afterSave: optional callback, called after successful save (e.g. to apply default outfit)
function _doSaveProfile(items, defaultName, keepHairGroups, afterSave) {
  const suggested = _uniqueProfileName(defaultName);
  const name = prompt('Profil-Name:', suggested);
  if (!name?.trim()) return;
  const trimmed = name.trim();
  if (PROFILES[trimmed] && !confirm('Profil "' + trimmed + '" existiert bereits. Überschreiben?')) return;
  PROFILES[trimmed] = {
    name: trimmed,
    date: new Date().toLocaleDateString('de-DE'),
    items,
    keepHairGroups: keepHairGroups?.length ? keepHairGroups : undefined,
  };
  try {
    _saveProfiles();
    showStatus('✅ Profil "' + trimmed + '" gespeichert (' + items.length + ' Items) – nutzbar in Bot-Triggern!', 'success');
    if (typeof afterSave === 'function') afterSave();
  } catch(e) { showStatus('❌ Speichern fehlgeschlagen: ' + e.message, 'error'); }
}

// ── Curse Standard-Outfit ─────────────────────────────────────────────────────
// Speichert das aktuell getragene Outfit (Player.Appearance) als LZString-Bundle.
// Nach jedem "💾 Profil"-Speichern im Curse-Tab wird es automatisch wieder ausgerüstet.
let CURSE_DEFAULT_OUTFIT_CODE = null;  // LZString-komprimiertes Appearance-Bundle
let CURSE_DEFAULT_OUTFIT_DATE = null;  // Datum als String für die Anzeige

// IDB-Schlüssel (v3 = IDB statt localStorage, Bundle-Format)
const _CURSE_DEFAULT_OUTFIT_IDB_KEY = 'BC_CURSE_DEFAULT_OUTFIT_v3';

// Beim Start aus IDB laden (async – Button wird nach dem Laden aktualisiert)
idbGet(_CURSE_DEFAULT_OUTFIT_IDB_KEY).then(function(d) {
  if (d && d.code) {
    CURSE_DEFAULT_OUTFIT_CODE = d.code;
    CURSE_DEFAULT_OUTFIT_DATE = d.date || null;
    _updateCurseDefaultOutfitBtn();
  }
});
// Alte localStorage-Einträge aufräumen
try { localStorage.removeItem('BC_CURSE_DEFAULT_OUTFIT_v1'); } catch {}
try { localStorage.removeItem('BC_CURSE_DEFAULT_OUTFIT_v2'); } catch {}

function _saveCurseDefaultOutfit() {
  if (CURSE_DEFAULT_OUTFIT_CODE) {
    idbSet(_CURSE_DEFAULT_OUTFIT_IDB_KEY, {
      code: CURSE_DEFAULT_OUTFIT_CODE,
      date: CURSE_DEFAULT_OUTFIT_DATE,
    });
  } else {
    idbSet(_CURSE_DEFAULT_OUTFIT_IDB_KEY, null);
  }
}

function _updateCurseDefaultOutfitBtn() {
  const btn = document.getElementById('curseDefaultOutfitBtn');
  if (!btn) return;
  if (CURSE_DEFAULT_OUTFIT_CODE) {
    btn.textContent = '🏠 Standard-Outfit ✓';
    btn.title = 'Standard-Outfit gespeichert am ' + (CURSE_DEFAULT_OUTFIT_DATE || '?')
      + '\nKlicken → aktuelles Outfit neu merken\nRechtsklick → entfernen';
    btn.style.background = 'rgba(52,211,153,0.15)';
    btn.style.borderColor = 'rgba(52,211,153,0.4)';
    btn.style.color = '#6ee7b7';
  } else {
    btn.textContent = '🏠 Standard-Outfit';
    btn.title = 'Klicken → aktuelles Outfit merken und nach jedem 💾 Profil automatisch ausrüsten';
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

// Klick auf Button → aktuelles Outfit 1:1 per EXEC aus BC lesen und merken.
// CharacterAppearanceBundle(Player) gibt genau das Bundle zurück das BC intern verwendet
// und das CharacterAppearanceSetFromBundle (= _buildApplyCode) direkt wieder einlesen kann.
let _pendingDefaultOutfitCapture = null; // reqId
function captureAndSetCurseDefaultOutfit() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  const reqId = 'cdo_' + Date.now();
  _pendingDefaultOutfitCapture = reqId;
  const J_reqId = JSON.stringify(reqId);
  const code = '(function(){'
    + 'try{'
    + '  var bundle;'
    + '  if(typeof CharacterAppearanceBundle==="function"){'
    + '    bundle=CharacterAppearanceBundle(Player);'
    + '  }else{'
    // Fallback: manuell aus Player.Appearance
    + '    bundle=Player.Appearance.map(function(i){'
    + '      return{Group:i.Asset.Group.Name,Name:i.Asset.Name,Color:i.Color,'
    + '        Difficulty:i.Difficulty||0,Property:i.Property?JSON.parse(JSON.stringify(i.Property)):{}};'
    + '    });'
    + '  }'
    + '  var compressed=LZString.compressToBase64(JSON.stringify(bundle));'
    + '  window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"DEFAULT_OUTFIT_DATA",'
    + '    reqId:' + J_reqId + ',data:compressed,count:bundle.length},"*");'
    + '}catch(e){'
    + '  window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"DEFAULT_OUTFIT_DATA",'
    + '    reqId:' + J_reqId + ',err:e.message},"*");'
    + '}'
    + '})();';
  bcSend({ type: 'EXEC', code }, true);
  showStatus('⏳ Lese aktuelles Outfit…', 'info');
}

// Rechtsklick → Standard-Outfit entfernen
function clearCurseDefaultOutfit(e) {
  e.preventDefault();
  if (!CURSE_DEFAULT_OUTFIT_CODE) return;
  CURSE_DEFAULT_OUTFIT_CODE = null;
  CURSE_DEFAULT_OUTFIT_DATE = null;
  _saveCurseDefaultOutfit();
  _updateCurseDefaultOutfitBtn();
  showStatus('🗑️ Standard-Outfit entfernt', 'info');
}

// Wendet das Standard-Outfit an – wird nach erfolgreichem Profil-Speichern aufgerufen
function _applyCurseDefaultOutfit() {
  if (!CURSE_DEFAULT_OUTFIT_CODE) return;
  if (!_connected) { showStatus('⚠️ Standard-Outfit: nicht verbunden', 'info'); return; }
  try {
    bcSend({ type: 'EXEC', code: _applyBundleWithSync(CURSE_DEFAULT_OUTFIT_CODE) });
    showStatus('🏠 Standard-Outfit ausgerüstet', 'success');
  } catch(e) {
    showStatus('❌ Standard-Outfit konnte nicht angewendet werden: ' + e.message, 'error');
  }
}
// ── Ende Standard-Outfit ──────────────────────────────────────────────────────

// Hilfsfunktion: Bundle anlegen + ServerSend (wie _oiBuildExecCode, aber ohne Prompt)
function _applyBundleWithSync(lzCode) {
  return '(function(){'
    + 'try{'
    + _buildApplyCode(lzCode)
    + '  setTimeout(function(){'
    + '    if(typeof ServerPlayerAppearanceSync==="function")ServerPlayerAppearanceSync();'
    + '    else if(typeof ServerSend==="function")ServerSend("AccountUpdate",{Appearance:Player.Appearance});'
    + '  },200);'
    + '}catch(e){console.error("[BCU] Ursprung-Apply Fehler:",e.message);}'
    + '})();';
}

// 🔄 Ursprung – Ursprungs-Outfit genau wie ein normales Profil ausführen
function curseRestoreUrsprung() {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  if (!_preCurseSnapshotCode || !PROFILES[_URSPRUNG_PROFILE_KEY]) {
    showStatus('⚠️ Kein Ursprungs-Outfit gespeichert – erst einen Curse per 👤 anwenden', 'info');
    return;
  }
  // loadProfile → Code generieren → ausführen (identisch zu profileExecuteBySlot)
  loadProfile(_URSPRUNG_PROFILE_KEY);
  setTimeout(() => {
    const code = document.getElementById('outfitCode')?.value?.trim();
    if (!code) { showStatus('❌ Kein Code generiert – Cache geladen?', 'error'); return; }
    bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
    // Snapshot leeren → nächster Curse startet frisch
    _preCurseSnapshotCode = null;
    delete PROFILES[_URSPRUNG_PROFILE_KEY];
    showStatus('🔄 Ursprungs-Outfit wiederhergestellt', 'success');
  }, 60);
}

// Request full Appearance for ownerNum, then call cb(items, charName)
// Falls back to CURSE_DB-only if not connected
// afterSave: optional callback forwarded to _doSaveProfile (e.g. _applyCurseDefaultOutfit)
function _fetchOutfitAndSave(ownerNum, defaultName, fallbackItems, afterSave) {
  if (!_connected) {
    if (!fallbackItems?.length) { showStatus('❌ Nicht verbunden und keine lokalen Daten', 'error'); return; }
    showStatus('⚠️ Nicht verbunden – nur Curse-Items aus DB gespeichert', 'info');
    _doSaveProfile(fallbackItems, defaultName, undefined, afterSave);
    return;
  }

  const reqId  = 'os_' + Date.now();
  const tgtNum = ownerNum ? Number(ownerNum) : null;

  _pendingOutfitSave[reqId] = function(items, charName) {
    if (!items?.length) {
      if (fallbackItems?.length) {
        showStatus('⚠️ Outfit leer – Fallback auf Curse-Einträge', 'info');
        _doSaveProfile(fallbackItems, defaultName, undefined, afterSave);
      } else {
        showStatus('❌ Keine Items erhalten', 'error');
      }
      return;
    }
    const { filteredItems, keepHairGroups } = _applyHairBaseline(items);
    _doSaveProfile(filteredItems.map(_appearanceItemToProfile), defaultName, keepHairGroups, afterSave);
  };

  bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: tgtNum, reqId });
  showStatus('⏳ Lese Outfit aus BC…', 'info');
}

// Scan Outfit Button im Outfit-Tab
function scanOutfitAndSave() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  const reqId  = 'os_scan_' + Date.now();
  const tgtNum = _outfitTargetNum ?? null;
  const defaultName = tgtNum
    ? ('Scan - ' + (_lastRoomMembers.find(m => m.num === tgtNum)?.name || ('#' + tgtNum)))
    : 'Scan - Player';

  _pendingOutfitSave[reqId] = function(items) {
    if (!items?.length) { showStatus('❌ Keine Items erhalten', 'error'); return; }
    const { filteredItems, keepHairGroups } = _applyHairBaseline(items);
    _doSaveProfile(filteredItems.map(_appearanceItemToProfile), defaultName, keepHairGroups);
    renderProfileList();
  };

  bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: tgtNum, reqId });
  showStatus('⏳ Scanne Outfit aus BC…', 'info');
}
// ── Stille Version: kein prompt(), Name 1:1 aus CraftName - OwnerName ────────
// Erstellt einen Fingerprint aus Items: sortiertes "group:asset" Set
function _ctItemFingerprint(items) {
  return (items || [])
    .map(i => ((i.group || i.Group || '') + ':' + (i.asset || i.Name || '')).toLowerCase())
    .filter(s => s !== ':')
    .sort()
    .join('|');
}

// Fingerprint des Standard-Outfits aus CURSE_DEFAULT_OUTFIT_CODE
function _ctStdOutfitFingerprint() {
  if (!CURSE_DEFAULT_OUTFIT_CODE) return null;
  try {
    const raw = LZString.decompressFromBase64(CURSE_DEFAULT_OUTFIT_CODE);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return _ctItemFingerprint(arr);
  } catch(e) { return null; }
}

function _curseSaveAsProfileSilent(dbKey, afterSave) {
  const entry = CURSE_DB[dbKey];
  if (!entry) { showStatus('❌ Curse-Eintrag nicht gefunden: ' + dbKey, 'error'); return; }

  const craftName   = entry.CraftName || entry.ItemName || 'Curse';
  const ownerName   = entry.Besitzer?.Name || (entry.Besitzer?.Nummer ? '#' + entry.Besitzer.Nummer : 'Player');
  const baseName    = craftName + ' - ' + ownerName;
  const profileName = _uniqueProfileName(baseName);

  // Curse kam, Outfit gleich wie Standard → in Check-Liste
  const _addToCheck = () => {
    _ctCheckAdd(dbKey, craftName, ownerName);
    showStatus('☑️ Curse ohne Outfit-Änderung — "' + baseName + '" in Check-Liste', 'info');
    if (typeof afterSave === 'function') afterSave();
  };

  const _save = (items, keepHairGroups) => {
    PROFILES[profileName] = {
      name:  profileName,
      date:  new Date().toLocaleDateString('de-DE'),
      items,
      keepHairGroups: keepHairGroups?.length ? keepHairGroups : undefined,
    };
    _saveProfiles();
    renderProfileList();
    showStatus('✅ Profil "' + profileName + '" gespeichert (' + items.length + ' Items)', 'success');
    if (typeof afterSave === 'function') afterSave();
  };

  // Outfit-Flag setzen
  if (!CURSE_OUTFIT_FLAGS[dbKey]) {
    CURSE_OUTFIT_FLAGS[dbKey] = Date.now();
    _saveCurseOutfitFlags();
  }

  if (!_connected) {
    _save([_curseEntryToProfileItem(entry)], undefined);
    return;
  }

  const reqId = 'ct_save_' + Date.now();
  _pendingOutfitSave[reqId] = function(items) {
    if (!items?.length) {
      _addToCheck();
      return;
    }
    // Vergleich VOR _applyHairBaseline: Haar-Items sind im Standard-Outfit-Bundle enthalten,
    // werden aber durch _applyHairBaseline entfernt → Fingerprints würden nie übereinstimmen.
    const stdFp = _ctStdOutfitFingerprint();
    if (stdFp) {
      const rawFp = _ctItemFingerprint(items.map(_appearanceItemToProfile));
      if (stdFp === rawFp) {
        _addToCheck();
        return;
      }
    }
    const { filteredItems, keepHairGroups } = _applyHairBaseline(items);
    _save(filteredItems.map(_appearanceItemToProfile), keepHairGroups);
  };
  bcSend({ type: 'GET_CHAR_APPEARANCE', memberNum: null, reqId });
  showStatus('⏳ Outfit wird ausgelesen für "' + baseName + '"…', 'info');
}

// Button: 💾 Profil (pro Curse-Zeile) → Profil speichern, dann Mein Outfit wiederherstellen
function curseSaveAsProfile(rowIdOrDbKey) {
  const dbKey = _curseEntryMap[rowIdOrDbKey] ?? rowIdOrDbKey;
  const entry = CURSE_DB[dbKey];
  if (!entry) { showStatus('❌ Eintrag nicht gefunden', 'error'); return; }
  // Auto-Flag setzen
  if (!CURSE_OUTFIT_FLAGS[dbKey]) {
    CURSE_OUTFIT_FLAGS[dbKey] = Date.now();
    _saveCurseOutfitFlags();
    const row = document.getElementById(rowIdOrDbKey);
    if (row) {
      row.classList.add('outfit-flagged');
      const cell = row.querySelector('.cg-outfit');
      if (cell) cell.innerHTML = '<button class="curse-outfit-btn on" style="pointer-events:none">👗 Outfit</button>';
    }
  }
  const craftName = entry.CraftName || entry.ItemName || 'Curse';
  const ownerName = entry.Besitzer?.Name || (entry.Besitzer?.Nummer ? '#' + entry.Besitzer.Nummer : 'Player');
  const defaultName = craftName + ' - ' + ownerName;

  // Nach dem Speichern: Mein Outfit wiederherstellen (falls Snapshot da), sonst Standard-Outfit
  const afterSave = () => {
    if (_preCurseSnapshotCode && PROFILES[_URSPRUNG_PROFILE_KEY] && _connected) {
      loadProfile(_URSPRUNG_PROFILE_KEY);
      setTimeout(() => {
        const code = document.getElementById('outfitCode')?.value?.trim();
        if (code) {
          bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
          showStatus('👗 Mein Outfit wiederhergestellt', 'success');
        } else {
          _applyCurseDefaultOutfit();
        }
        // Snapshot leeren → nächster 👤-Klick startet wieder mit Snapshot + Standard-Outfit
        _preCurseSnapshotCode = null;
        delete PROFILES[_URSPRUNG_PROFILE_KEY];
      }, 60);
    } else {
      _applyCurseDefaultOutfit();
    }
  };

  _fetchOutfitAndSave(null, defaultName, [_curseEntryToProfileItem(entry)], afterSave);
}

// Button: 💾 Alle speichern (Owner-Header) → "{OwnerName} Outfit" (Sammlung mehrerer Items)
function curseSaveAllAsProfile(ownerNum) {
  const entries = Object.entries(CURSE_DB)
    .filter(([, e]) => String(e.Besitzer?.Nummer ?? '') === String(ownerNum))
    .map(([, e]) => e);
  const ownerName = entries[0]?.Besitzer?.Name || ('#' + ownerNum);
  // Auto-Flag alle Einträge dieses Owners
  let flagged = 0;
  for (const e of entries) {
    const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
    if (!CURSE_OUTFIT_FLAGS[k]) { CURSE_OUTFIT_FLAGS[k] = Date.now(); flagged++; }
  }
  if (flagged > 0) _saveCurseOutfitFlags();
  const defaultName = ownerName + ' Outfit';
  _fetchOutfitAndSave(null, defaultName, entries.map(_curseEntryToProfileItem), _applyCurseDefaultOutfit);
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
  const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'CurseScanner_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

// ── Gruppen-Editor ───────────────────────────────────────────
// cellEl hat data-dbkey gesetzt — kein String-Escaping-Bug mehr
function _openCurseGruppeEditor(cellEl) {
  const dbKey = cellEl.dataset.dbkey;
  if (!dbKey) return;
  // Toggle: schon offen → schließen
  if (cellEl.querySelector('.grp-editor')) { _closeGruppeEditor(cellEl); return; }

  const entry = CURSE_DB[dbKey];
  if (!entry) return;
  const current = _getEffectiveGruppe(entry, dbKey);

  const knownGroups = [...new Set(
    Object.entries(CURSE_DB).map(([k,e]) => _getEffectiveGruppe(e,k)).filter(g => g && g !== 'UNBEKANNT')
  )].sort();

  cellEl.innerHTML =
    '<div class="grp-editor" onclick="event.stopPropagation()">'
    + '<select onchange="this.nextElementSibling.value=this.value">'
    + '<option value="">— Gruppe wählen —</option>'
    + knownGroups.map(g => '<option value="' + escHtml(g) + '"' + (g === current ? ' selected' : '') + '>' + escHtml(g) + '</option>').join('')
    + '</select>'
    + '<input type="text" placeholder="Oder eigene Gruppe..." value="' + (current !== 'UNBEKANNT' ? escHtml(current) : '') + '" '
    + 'onkeydown="if(event.key===\'Enter\') setCurseGruppe(this.closest(\'[data-dbkey]\').dataset.dbkey, this.value.trim(), this.closest(\'[data-dbkey]\'))" />'
    + '<div class="grp-editor-btns">'
    + '<button class="grp-save-btn" onclick="setCurseGruppe(this.closest(\'[data-dbkey]\').dataset.dbkey, this.closest(\'.grp-editor\').querySelector(\'input\').value.trim(), this.closest(\'[data-dbkey]\'))">✓ Speichern</button>'
    + '<button class="grp-cancel-btn" onclick="_closeGruppeEditor(this.closest(\'[data-dbkey]\'))">✕</button>'
    + '</div>'
    + '</div>';

  setTimeout(() => cellEl.querySelector('input')?.focus(), 0);
}

function _closeGruppeEditor(cellEl) {
  const dbKey = cellEl?.dataset?.dbkey;
  const entry = dbKey ? CURSE_DB[dbKey] : null;
  if (!entry) return;
  const eg  = _getEffectiveGruppe(entry, dbKey);
  const unk = eg === 'UNBEKANNT';
  const ovr = !!CURSE_GRUPPE_OVERRIDES[dbKey];
  cellEl.className = 'cg-grp' + (unk ? ' grp-unknown' : '');
  cellEl.innerHTML = escHtml(eg) + (unk ? ' <span class="grp-edit-hint">\u270F\uFE0F</span>' : (ovr ? ' <span class="grp-edit-hint">\uD83D\uDCCC</span>' : ''));
}

function setCurseGruppe(dbKey, value, cellEl) {
  if (!dbKey) return;
  const trimmed = (value || '').trim();
  if (!trimmed) { showStatus('⚠️ Bitte eine Gruppe eingeben', 'info'); return; }
  if (trimmed !== 'UNBEKANNT') {
    CURSE_GRUPPE_OVERRIDES[dbKey] = trimmed;
  } else {
    delete CURSE_GRUPPE_OVERRIDES[dbKey];
  }
  _saveCurseGruppeOverrides();
  if (cellEl) _closeGruppeEditor(cellEl);
  _populateSlotFilter();
  showStatus('\u2705 Gruppe gesetzt: ' + trimmed, 'success');
}

function curseResetNeuTimestamps() {
  const entries = Object.values(CURSE_DB);
  if (!entries.length) { showStatus('ℹ️ Keine Einträge vorhanden', 'info'); return; }
  let count = 0;
  entries.forEach(e => { if (e.ZuletztGescannt) { delete e.ZuletztGescannt; count++; } });
  _saveCurseDB();
  if (_activeTab === 'curse') renderCurseTab();
  showStatus('🗑️ ' + count + ' Neu-Timestamps gelöscht', 'success');
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
      // Guard: if BC already sent live CURSE_DATA before IDB resolved, don't overwrite it
      if (!_curseDBFresh) {
        CURSE_DB         = d.database  ?? {};
        CURSE_LSCG       = d.lscgTable ?? {};
        CURSE_CACHE_LSCG = d.lscgCache ?? {};
        _updateCurseStats();
        console.log('[BCK-Popup] Curse DB geladen: ' + Object.keys(CURSE_DB).length + ' Crafts, ' + Object.keys(CURSE_OUTFIT_FLAGS).length + ' Outfit-Flags');
      } else {
        console.log('[BCK-Popup] Curse IDB übersprungen – Live-Daten von BC bereits vorhanden');
      }
      // Always restore favourites + outfitFlags from IDB (they merge, don't overwrite)
      if (d.favourites)   d.favourites.forEach(k => CURSE_FAVOURITES.add(k));
      if (d.outfitFlags && typeof d.outfitFlags === 'object') Object.assign(CURSE_OUTFIT_FLAGS, d.outfitFlags);
    }
    const comments = await idbGet('BC_CURSE_COMMENTS_v1');
    if (comments) Object.assign(CURSE_COMMENTS, comments);
    const favs = await idbGet('BC_CURSE_FAV_v1');
    if (Array.isArray(favs)) favs.forEach(k => CURSE_FAVOURITES.add(k));
    // Fallback: separaten Outfit-Key prüfen (für ältere gespeicherte Daten)
    const outfitFlags = await idbGet('BC_CURSE_OUTFIT_v1');
    if (outfitFlags && typeof outfitFlags === 'object') Object.assign(CURSE_OUTFIT_FLAGS, outfitFlags);
    // Gruppen-Overrides laden
    const gruppeOverrides = await idbGet('BC_CURSE_GRUPPE_v1');
    if (gruppeOverrides && typeof gruppeOverrides === 'object') Object.assign(CURSE_GRUPPE_OVERRIDES, gruppeOverrides);
    // Erst rendern nachdem ALLE Daten geladen sind
    if (document.getElementById('curseBody') && Object.keys(CURSE_DB).length) renderCurseTab();
  } catch(e) { console.warn('[BCK-Popup] Curse IDB load error:', e); }
})();

// ══════════════════════════════════════════════════════
//  POSTMESSAGE KOMMUNIKATION MIT BC
// ══════════════════════════════════════════════════════
const APP = 'BCKonfigurator';

// ── Ping-Retry ────────────────────────────────────────
let _pingInterval = null;
let _connected    = false;
// Echte BC-Origin – wird beim ersten empfangenen Message vom Opener gelernt.
// Danach sendet bcSend gezielt dorthin statt an '*' (kein Daten-Leak, falls
// der Opener zwischenzeitlich auf eine fremde Seite navigiert wurde).
let _bcOrigin     = null;

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
    // Gezielte Origin sobald bekannt; '*' nur f\u00fcr den PING-Bootstrap n\u00f6tig
    window.opener.postMessage({ app: APP, ...msg }, _bcOrigin || '*');
    return true;
  } catch(e) {
    console.error('[BCK-Popup] bcSend Exception:', e.message);
    if (!silent) showStatus('\u274c postMessage Fehler: ' + e.message, 'error');
    return false;
  }
}

window.addEventListener('message', function(ev) {
  if (!ev.data || ev.data.app !== APP) return;
  // Sicherheit: nur Nachrichten vom BC-Fenster (opener) akzeptieren.
  // Verhindert, dass fremde Fenster/Tabs gef\u00e4lschte CURSE_DATA/EXEC_OK etc. einschleusen.
  if (window.opener && ev.source !== window.opener) {
    console.warn('[BCK-Popup] message von fremder Quelle ignoriert');
    return;
  }
  // BC-Origin lernen/aktuell halten (BC l\u00e4uft auf mehreren Domains)
  if (ev.origin && ev.origin !== 'null') _bcOrigin = ev.origin;
  console.log('[BCK-Popup] \u2190 message:', ev.data.type);

  switch (ev.data.type) {

    case 'PONG':
      console.log('[BCK-Popup] PONG \u2705 Verbunden!');
      if (!_connected) {
        _connected = true;
        // Nach (Re-)Connect einmal Full-Sync anfordern: Der BC-Tab kann neu
        // geladen worden sein und hat dann andere/mehr Eintr\u00e4ge (craftCache aus IDB).
        _curseFullReceived = false;
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
        // Auto-Scan: Craft/Curse + LSCG-Outfits beim Room-Join
        // Erster Scan nach 3s – BC braucht Zeit um ChatRoomCharacter zu befüllen
        setTimeout(function() {
          if (!_connected) return;
          _triggerAutoScan('join');
        }, 3000);
        // Zweiter LSCG-Scan nach 12s: fängt Charaktere die beim ersten Scan (3s) noch
        // nicht fertig geladen hatten. Direkt aufrufen (kein Debounce-Reset nötig).
        setTimeout(function() {
          if (!_connected) return;
          _triggerLscgScan('join-retry');
          _updateAutoScanBadge('join-retry');
        }, 12000);
        // Slideshow-Resume: war sie wegen Disconnect pausiert → nach 5s fortsetzen
        // (5s Wartezeit damit BC Raum betreten + Outfit-System laden kann)
        if (_slideshowPaused && _slideshowQueue.length) {
          _slideshowPaused = false;
          showStatus('▶ Slideshow wird nach Reconnect fortgesetzt…', 'info');
          const resumeBtn = document.getElementById('profileSlideshowBtn');
          if (resumeBtn) resumeBtn.textContent = '⏹ Stop (' + _slideshowQueue.length + ')';
          setTimeout(function() {
            if (_connected && _slideshowQueue.length && !_slideshowPaused) {
              // Originaloutfit neu sichern – kann sich durch Reconnect geändert haben
              bcSend({ type: 'EXEC', code: '(function(){window.__BCU_slideshowOrig=Player.Appearance.slice();})();' }, true);
              setTimeout(_runNextSlideshow, 500);
            }
          }, 5000);
        }
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

    case 'CT_CHAT_MSG':
      console.log('%c[CURSE-TEST] ' + (ev.data.event === 'curse_end' ? '✅ CURSE ENDE' : '🔮 CURSE START') + ' erkannt → "' + ev.data.content + '"',
        'background:' + (ev.data.event === 'curse_end' ? '#064e3b' : '#78350f') + ';color:#fff;font-weight:700;padding:2px 6px;border-radius:3px');
      _ctHandleChatMsg(ev.data.event, ev.data.content);
      break;

    case 'CHAR_APPEARANCE_DATA': {
      const _cb = _pendingOutfitSave[ev.data.reqId];
      if (!_cb) break;
      delete _pendingOutfitSave[ev.data.reqId];
      if (ev.data.err) { showStatus('\u274c Outfit-Laden fehlgeschlagen: ' + ev.data.err, 'error'); break; }
      _cb(ev.data.items ?? [], ev.data.name ?? '');
      break;
    }

    case 'DEFAULT_OUTFIT_DATA': {
      if (ev.data.reqId !== _pendingDefaultOutfitCapture) break;
      _pendingDefaultOutfitCapture = null;
      if (ev.data.err) { showStatus('\u274c Standard-Outfit Fehler: ' + ev.data.err, 'error'); break; }
      CURSE_DEFAULT_OUTFIT_CODE = ev.data.data;
      CURSE_DEFAULT_OUTFIT_DATE = new Date().toLocaleString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      _saveCurseDefaultOutfit();
      _updateCurseDefaultOutfitBtn();
      showStatus('\ud83c\udfe0 Standard-Outfit gemerkt (' + (ev.data.count ?? '?') + ' Items)', 'success');
      break;
    }

    case 'SCREENSHOT_DATA':
      _handleScreenshotData(ev.data);
      break;

    case 'CANVAS_PREVIEW_DATA':
      _handleCanvasPreviewData(ev.data);
      break;

    case 'OUTFIT_SCAN_DATA':
      _handleOutfitScanData(ev.data);
      break;

    case 'LSCG_OUTFITS_DATA':
      _handleLscgOutfitsData(ev.data);
      break;

    case 'LOCKS_DATA':
      _handleLocksData(ev.data);
      break;

  }
});

function loadCacheFromBC() {
  console.log('[BCK-Popup] loadCacheFromBC() | opener=' + !!window.opener + ' closed=' + window.opener?.closed);
  const btn = document.getElementById('loadCacheBtn');
  btn.disabled = true;
  document.getElementById('loadingSpinner').classList.remove('hidden');
  showStatus('\u23f3 Verbinde mit Spiel\u2026', 'info');
  if (!bcSend({ type: 'GET_CACHE', force: true })) {
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

// ── Auto-Scan: Craft/Curse + LSCG-Outfits ─────────────────────
// Debounce statt Cooldown: Rapid-Fire-Events werden zu einem einzigen Scan zusammengefasst.
// Beide Scanner laufen immer synchron – kein gegenseitiges Blockieren mehr.
let _autoScanDebounce  = null;   // gemeinsamer Debounce-Timer
let _autoScanLastReason = '';    // Grund des letzten Events für Badge

function _triggerLscgScan(reason) {
  if (!_connected) return;
  console.log('[BCU] LSCG-Scan:', reason);
  bcSend({ type: 'GET_OUTFIT_SCAN', _auto: true }, true);
  bcSend({ type: 'GET_LSCG_OUTFITS' }, true);
}

function _triggerCurseScan(reason) {
  if (!_connected) return;
  console.log('[BCU] Curse-Scan:', reason);
  _sendCurseScanRequest(true);
}

function _triggerAutoScan(reason) {
  if (!_connected) return;
  // Letzten Grund merken (wichtig wenn mehrere Events kommen bevor Debounce feuert)
  _autoScanLastReason = reason;
  clearTimeout(_autoScanDebounce);
  _autoScanDebounce = setTimeout(function() {
    _autoScanDebounce = null;
    if (!_connected) return;
    _triggerLscgScan(_autoScanLastReason);
    _triggerCurseScan(_autoScanLastReason);
    _updateAutoScanBadge(_autoScanLastReason);
  }, 1500);
}

function _updateAutoScanBadge(reason) {
  const time = new Date().toLocaleTimeString();
  const label = reason === 'join' ? '🚪 Join' : reason === 'join-retry' ? '🔁 Join-Retry' : ('👤 +' + reason);
  ['csAutoScanStatus', 'osAutoScanStatus'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) { el.textContent = '🔄 Auto-Scan: ' + label + ' ' + time; el.style.display = ''; }
  });
}

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

  // ── Neue Spieler erkennen → Auto-Scan auslösen ───────────────────────────
  const prevNums = new Set(_lastRoomMembers.map(function(m) { return m.num; }));
  const newJoiners = freshMembers.filter(function(m) {
    return m.num !== _myMemberNumber && !prevNums.has(m.num);
  });
  if (newJoiners.length > 0) {
    const names = newJoiners.map(function(m) { return m.name; }).join(', ');
    // _triggerAutoScan hat eingebauten 1.5s Debounce – direkt aufrufen.
    // Mehrere schnell-joinende Spieler werden automatisch zu einem Scan zusammengefasst.
    _triggerAutoScan(names);
  }

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

// ── UserID-Anreicherung ───────────────────────────────────────────────────────
// Ergänzt fehlende #IDs in Profil- und Outfit-Namen basierend auf Curse/Craft-DB
function enrichProfileNamesWithIDs() {
  // 1. Spielername → Nummer aus CURSE_DB aufbauen
  const nameToNum = {};
  for (const entry of Object.values(CURSE_DB)) {
    const n  = entry.Besitzer?.Name?.trim();
    const id = entry.Besitzer?.Nummer ? String(entry.Besitzer.Nummer) : null;
    if (n && id && !nameToNum[n]) nameToNum[n] = id;
  }

  if (!Object.keys(nameToNum).length) {
    showStatus('❌ Keine Spielerdaten in Craft/Curse-DB – bitte zuerst scannen', 'error');
    return;
  }

  // Namen nach Länge absteigend sortieren (Partial-Match vermeiden)
  const playerNames = Object.keys(nameToNum).sort((a, b) => b.length - a.length);

  function _enrichOne(key) {
    // Bereits vollständig mit #ID? → überspringen
    if (/#\d{4,}/.test(key)) return key;

    // Muster 1: "CraftName - Ada"  →  "CraftName - Ada #219508"
    const dashIdx = key.lastIndexOf(' - ');
    if (dashIdx !== -1) {
      const prefix = key.slice(0, dashIdx);
      const owner  = key.slice(dashIdx + 3).trim();
      if (!/#\d{4,}/.test(owner) && nameToNum[owner]) {
        return prefix + ' - ' + owner + ' #' + nameToNum[owner];
      }
    }

    // Muster 2: "Ada Outfit", "Ada #219508 Outfit" usw. → "Ada #219508 Outfit"
    for (const pName of playerNames) {
      if (key === pName) {
        return pName + ' #' + nameToNum[pName];
      }
      if (key.startsWith(pName + ' ') && !/#\d{4,}/.test(key.slice(0, pName.length + 1))) {
        return pName + ' #' + nameToNum[pName] + key.slice(pName.length);
      }
    }

    return key; // kein Treffer
  }

  const oldKeys  = Object.keys(PROFILES);
  const changes  = [];
  const newProfiles = {};

  for (const key of oldKeys) {
    const newKey = _enrichOne(key);
    const profile = PROFILES[key];
    newProfiles[newKey] = { ...profile, name: newKey };
    if (newKey !== key) changes.push({ from: key, to: newKey });
  }

  if (!changes.length) {
    showStatus('ℹ️ Alle Profile bereits angereichert (oder kein Treffer)', 'info');
    return;
  }

  // Anwenden
  Object.keys(PROFILES).forEach(k => delete PROFILES[k]);
  Object.assign(PROFILES, newProfiles);
  _saveProfiles();
  renderProfileList();

  // Vorschau im Panel anzeigen
  const box = document.getElementById('enrichPreviewBox');
  if (box) {
    box.style.display = 'block';
    box.innerHTML = changes.map(c =>
      '<div style="margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid var(--border)">'
      + '<div style="color:var(--text3);text-decoration:line-through">' + escHtml(c.from) + '</div>'
      + '<div style="color:var(--green)">→ ' + escHtml(c.to) + '</div>'
      + '</div>'
    ).join('');
  }

  showStatus('✅ ' + changes.length + ' von ' + oldKeys.length + ' Profilen angereichert', 'success');
}

// ── Komplett-Backup Export / Import ──────────────────────────────────────────
function exportAllData() {
  try {
    const profileCount = Object.keys(PROFILES).length;
    const curseCount   = Object.keys(CURSE_DB).length;
    if (!profileCount && !curseCount) {
      showStatus('⚠️ Keine Daten zum Exportieren (Profile & Curse-DB leer)', 'info');
      return;
    }
    const payload = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version:    1,
        tool:       'BC Konfigurator',
        counts: {
          profiles:  profileCount,
          curseDB:   curseCount,
          lscgCache: Object.keys(CURSE_CACHE_LSCG).length,
        }
      },
      profiles:         PROFILES,
      curseDatabase:    CURSE_DB,
      lscgTable:        CURSE_LSCG,
      lscgCache:        CURSE_CACHE_LSCG,
      curseComments:    CURSE_COMMENTS,
      curseOutfitFlags: CURSE_OUTFIT_FLAGS,
      curseFavourites:  [...CURSE_FAVOURITES],
    };
    // Kein pretty-print — bei 27k Einträgen deutlich schneller
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'BC_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showStatus('✅ Backup: ' + profileCount + ' Profile, ' + curseCount + ' Curse-Einträge', 'success');
  } catch(err) {
    showStatus('❌ Export fehlgeschlagen: ' + err.message, 'error');
    console.error('[exportAllData]', err);
  }
}

function importAllData() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d._meta) {
          showStatus('❌ Keine gültige Backup-Datei', 'error');
          return;
        }
        if (!confirm(
          'Komplett-Backup vom ' + d._meta.exportedAt?.slice(0, 10) + ' einspielen?\n'
          + 'Profile: ' + Object.keys(d.profiles ?? {}).length + '\n'
          + 'Curse-Einträge: ' + Object.keys(d.curseDatabase ?? {}).length + '\n\n'
          + 'Bestehende Daten werden zusammengeführt.'
        )) return;

        // Profile zusammenführen
        if (d.profiles) {
          for (const [name, profile] of Object.entries(d.profiles)) {
            if (!PROFILES[name]) PROFILES[name] = profile;
          }
          _saveProfiles();
        }

        // Curse-DB zusammenführen
        if (d.curseDatabase) { Object.assign(CURSE_DB, d.curseDatabase); }
        if (d.lscgTable)     { Object.assign(CURSE_LSCG, d.lscgTable); }
        if (d.lscgCache)     { Object.assign(CURSE_CACHE_LSCG, d.lscgCache); }
        if (d.curseComments) { Object.assign(CURSE_COMMENTS, d.curseComments); _saveCurseComments(); }
        if (d.curseOutfitFlags) { Object.assign(CURSE_OUTFIT_FLAGS, d.curseOutfitFlags); _saveCurseOutfitFlags(); }
        if (d.curseFavourites)  { d.curseFavourites.forEach(k => CURSE_FAVOURITES.add(k)); _saveCurseFavourites(); }

        if (d.curseDatabase) _saveCurseDB();

        renderProfileList();
        if (_activeTab === 'curse') renderCurseTab();

        showStatus('✅ Backup eingespielt: '
          + Object.keys(PROFILES).length + ' Profile, '
          + Object.keys(CURSE_DB).length + ' Curse-Einträge', 'success');
      } catch(err) { showStatus('❌ Import fehlgeschlagen: ' + err.message, 'error'); }
    };
    r.readAsText(e.target.files[0]);
  };
  inp.click();
}

// ══════════════════════════════════════════════════════════════
//  LSCG OUTFIT TAB
//  DB[memberNumber] = { name, nickname, versions: [{code, fingerprint, ts}] }
//  Fingerprint = gefiltert (ignorierte Gruppen ausgeschlossen)
// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  LSCG Screenshots – pro Member gespeicherte Canvas-Bilder
// ══════════════════════════════════════════════════════
const LSCG_SCREENSHOTS_KEY = 'BC_LSCG_SCREENSHOTS_v1';
let   LSCG_SCREENSHOTS     = {};   // mk (string) → dataUrl (jpeg)

async function _saveLscgScreenshots() {
  await idbSet(LSCG_SCREENSHOTS_KEY, LSCG_SCREENSHOTS);
}

// Gibt das beste verfügbare Bild für mk zurück:
// 1. Direkt gespeichert  2. Vom passenden Profil (gleicher Fingerprint)
// Screenshot für eine bestimmte Version holen (Schlüssel: mk|fp)
// Fallback: älteres mk-Only Bild oder Profil-Screenshot mit gleichem Fingerprint
function _getLscgScreenshot(mk, fp) {
  const vKey = fp ? (mk + '|' + fp) : null;
  // 1. Versions-spezifisch
  if (vKey && LSCG_SCREENSHOTS[vKey]) return LSCG_SCREENSHOTS[vKey];
  // 2. Legacy: per-mk (altes Format)
  if (LSCG_SCREENSHOTS[mk]) return LSCG_SCREENSHOTS[mk];
  // 3. Fallback: Profil mit gleichem Fingerprint
  if (fp) {
    const keys = _lscgFpMap[fp] ?? [];
    for (const k of keys) {
      if (PROFILE_SCREENSHOTS[k]) return PROFILE_SCREENSHOTS[k];
    }
  }
  return null;
}

// Gibt das beste verfügbare Bild für irgendeinen Member-Fingerprint zurück (für Header/Lightbox)
function _getAnyLscgScreenshot(mk) {
  if (LSCG_SCREENSHOTS[mk]) return LSCG_SCREENSHOTS[mk];
  const entry = LSCG_DB[mk];
  if (!entry?.versions) return null;
  for (const v of entry.versions) {
    const fp = v.fingerprint;
    const vKey = fp ? (mk + '|' + fp) : null;
    if (vKey && LSCG_SCREENSHOTS[vKey]) return LSCG_SCREENSHOTS[vKey];
    if (fp) {
      const keys = _lscgFpMap[fp] ?? [];
      for (const k of keys) {
        if (PROFILE_SCREENSHOTS[k]) return PROFILE_SCREENSHOTS[k];
      }
    }
  }
  return null;
}

// Screenshot zu allen Profilen mit gleichem Fingerprint kopieren
function _syncLscgScreenshotToProfiles(mk) {
  const img = LSCG_SCREENSHOTS[mk];
  if (!img) return;
  const entry = LSCG_DB[mk];
  if (!entry?.versions) return;
  let changed = false;
  for (const v of entry.versions) {
    const fp = v.fingerprint;
    if (!fp) continue;
    const keys = _lscgFpMap[fp] ?? [];
    for (const k of keys) {
      if (!PROFILE_SCREENSHOTS[k]) {
        PROFILE_SCREENSHOTS[k] = img;
        changed = true;
      }
    }
  }
  if (changed) _saveProfileScreenshots();
}

// ── Einzelnen Screenshot aufnehmen ───────────────────
const _pendingOsCapture      = {};  // reqId → { mk, fp }
const _pendingProfileCapture = {};  // reqId → profileName
let   _osCaptureQueue   = [];
let   _osCaptureRunning = false;
let   _osCaptureNeedSync = false;  // true wenn Player-Appearance temporär geändert wurde
const _osBrokenCodes    = {};  // vKey → error-message (kaputte Outfit-Codes)

function captureOsScreenshot(mk, vIdx) {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  const memberNum = parseInt(mk, 10);
  if (isNaN(memberNum)) return;
  const v = (vIdx !== undefined && vIdx !== null) ? (LSCG_DB[mk]?.versions?.[vIdx] ?? null) : null;
  const fp = v?.fingerprint ?? null;
  const outfitCode = v?.code ?? null;
  const reqId = 'os_' + Date.now() + '_' + mk;
  _pendingOsCapture[reqId] = { mk, fp };
  if (outfitCode) _osCaptureNeedSync = true;

  // Werte sicher als JSON-Strings einbetten (kein Quoting-Problem)
  const J_reqId = JSON.stringify(reqId);

  // Apply-Kern: exakt gleicher Code wie Run-Button (_buildApplyCode)
  const applyPart = outfitCode
    ? 'try{'
      + _buildApplyCode(outfitCode)
      + '}catch(applyErr){'
      + '  Player.Appearance.splice(0,Player.Appearance.length);'
      + '  origApp.forEach(function(i){Player.Appearance.push(i);});'
      + '  CharacterRefresh(Player,false,false);'
      + '  window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',err:"APPLY_FAIL:"+applyErr.message},"*");'
      + '  return;'
      + '}'
    : 'try{CharacterRefresh(Player,false,false);}catch(_e){}';

  // Hilfsfunktion: Server über Appearance informieren (identisch zu Run-Button)
  const syncToServer = ''
    + 'if(typeof ServerPlayerAppearanceSync==="function")ServerPlayerAppearanceSync();'
    + 'else if(typeof ServerSend==="function")ServerSend("AccountUpdate",{Appearance:Player.Appearance});';

  const code = '(function(){'
    // Generation-Counter: jeder Screenshot erhöht ihn. Der 300ms-Verify-Timer
    // prüft ob er noch "der Eigentümer" ist – falls ein neuer Screenshot gestartet
    // hat (Counter erhöht), bricht er ab statt das Outfit zu überschreiben.
    + 'window.__BCU_captureGen=(window.__BCU_captureGen||0)+1;'
    + 'var myGen=window.__BCU_captureGen;'
    + 'var origApp=Player.Appearance.slice();'
    + applyPart

    // ── Stabilisierungs-Loop ────────────────────────────────────
    // Timeout nach 6 Checks × 150ms = max. ~1 Sekunde.
    + 'var _prevHash=null,_checksDone=0,_maxChecks=6;'

    // Hilfsfunktion: Original-Appearance wiederherstellen + Server-Sync
    + 'function _restoreAndSync(){'
    // Sofort wiederherstellen
    + '  Player.Appearance.splice(0,Player.Appearance.length);'
    + '  origApp.forEach(function(i){Player.Appearance.push(i);});'
    + '  CharacterRefresh(Player,false,false);'
    // 300ms warten, dann nur noch syncToServer – KEIN Restore mehr.
    // Verify-Check entfernt: er feuerte während des nächsten Screenshots
    // und überschrieb dessen Outfit mit dem Original (Race Condition).
    // Stattdessen: Generation prüfen – wenn ein neuer Screenshot läuft,
    // diesen Sync komplett überspringen (der neue Screenshot macht seinen eigenen).
    + '  setTimeout(function(){'
    + '    if(window.__BCU_captureGen!==myGen)return;'
    + '    ' + syncToServer
    + '  },300);'
    + '}'

    // Hash-Funktion: 200 gleichmäßig verteilte Pixel-Tripel zusammenfassen
    + 'function _canvasHash(canvas){'
    + '  try{'
    + '    var ctx=canvas.getContext("2d");'
    + '    var d=ctx.getImageData(0,0,canvas.width,canvas.height).data;'
    + '    var r=0,len=d.length/4,step=Math.max(1,Math.floor(len/200));'
    + '    for(var i=0;i<len;i+=step){var ix=i*4;r=((r*31)|0)+d[ix]+d[ix+1]+d[ix+2];}'
    + '    return r;'
    + '  }catch(_e){return -1;}'
    + '}'

    // Crop + Encode + postMessage, danach immer Wiederherstellung
    + 'function _sendCapture(){'
    + '  try{'
    + '    var src=Player.Canvas;'
    + '    if(!src||!src.width)throw new Error("Canvas leer");'
    + '    var oc=document.createElement("canvas");oc.width=src.width;oc.height=src.height;'
    + '    oc.getContext("2d").drawImage(src,0,0);'
    + '    var id=oc.getContext("2d").getImageData(0,0,oc.width,oc.height);'
    + '    var px=id.data,W=oc.width,H=oc.height;'
    + '    var x0=W,x1=0,y0=H,y1=0;'
    + '    for(var r=0;r<H;r++){for(var c=0;c<W;c++){'
    + '      var ii=(r*W+c)*4;'
    + '      if(px[ii]>5||px[ii+1]>5||px[ii+2]>5){'
    + '        if(c<x0)x0=c;if(c>x1)x1=c;if(r<y0)y0=r;if(r>y1)y1=r;'
    + '      }'
    + '    }}'
    + '    if(x1<x0){x0=0;y0=0;x1=W-1;y1=H-1;}'
    + '    var pad=20;'
    + '    x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);'
    + '    x1=Math.min(W-1,x1+pad);y1=Math.min(H-1,y1+pad);'
    + '    var cw=x1-x0+1,ch=y1-y0+1;'
    + '    var cc=document.createElement("canvas");cc.width=cw;cc.height=ch;'
    + '    var ctx2=cc.getContext("2d");'
    + '    ctx2.fillStyle="#000";ctx2.fillRect(0,0,cw,ch);'
    + '    ctx2.drawImage(oc,x0,y0,cw,ch,0,0,cw,ch);'
    + '    var data=cc.toDataURL("image/jpeg",0.88);'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',data:data,width:cw,height:ch},"*");'
    + '  }catch(e){'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',err:e.message},"*");'
    + '  }finally{'
    // Immer wiederherstellen – egal ob Erfolg oder Fehler
    + '    _restoreAndSync();'
    + '  }'
    + '}'

    // Render-Check: Refresh + LoadCanvas, dann 100ms warten und Hash vergleichen
    + 'function _renderCheck(){'
    + '  CharacterRefresh(Player,false,false);'
    + '  CharacterLoadCanvas(Player);'
    + '  setTimeout(function(){'
    + '    var h=_canvasHash(Player.Canvas);'
    + '    if(h===_prevHash||_checksDone>=_maxChecks){'
    + '      _sendCapture();'
    + '    }else{'
    + '      _prevHash=h;_checksDone++;'
    + '      setTimeout(_renderCheck,150);'
    + '    }'
    + '  },100);'
    + '}'

    // Nach 100ms starten – so früh wie möglich
    + 'setTimeout(_renderCheck,100);'
    + '})();';

  bcSend({ type: 'EXEC', code }, true);
}

// ── Profil-Screenshot via Player.Canvas ─────────────────────
// Ein einziger EXEC (wie captureOsScreenshot):
//   Restore → Server-Sync deaktivieren → Apply → Snapshot → Render-Loop → Verify → Capture → Restore
// Kein Zeitfenster für fremde EXECs, kein Server-Update während des Screenshots.
// outfitCode  = LZString-Bundle (LSCG-Profil) oder null
// rawApplyCode = roher JS-Code (normales Profil) oder null
// Genau einer der beiden kann gesetzt sein. Wenn beide null: nur Capture (kein Apply).
function captureProfileViaCanvas(name, outfitCode, rawApplyCode) {
  if (!_connected) return;
  const reqId = 'ps_' + Date.now() + '_' + String(name).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const J_reqId = JSON.stringify(reqId);

  console.log('[BCU] captureProfileViaCanvas:', name, 'hasCode:', !!outfitCode, 'hasRaw:', !!rawApplyCode, 'reqId:', reqId);

  // Popup-seitig: _buildApplyCode ausführen (wirft wenn outfitCode ungültig)
  let applyCode = '';
  if (outfitCode) {
    try {
      applyCode = _buildApplyCode(outfitCode);
    } catch (buildErr) {
      console.error('[BCU] captureProfileViaCanvas _buildApplyCode Fehler:', buildErr.message);
      showStatus('❌ Profil-Code-Fehler: ' + buildErr.message, 'error');
      _runNextSlideshow();
      return;
    }
  }

  // Timeout-Fallback: pausieren + Profil wiederholen (nie überspringen)
  const timeoutId = setTimeout(function() {
    if (_pendingProfileCapture[reqId] !== undefined) {
      console.warn('[BCU] captureProfileViaCanvas timeout:', name, reqId);
      delete _pendingProfileCapture[reqId];
      // Profil immer zurück in Queue – wird wiederholt
      _slideshowQueue.unshift(name);
      _slideshowPaused = true;
      const reason = _connected ? 'Timeout' : 'Disconnect';
      showStatus('⏸ Slideshow pausiert (' + reason + ') – "' + name + '" wird wiederholt', 'info');
      const pauseBtn = document.getElementById('profileSlideshowBtn');
      if (pauseBtn) pauseBtn.textContent = '⏸ Pausiert (' + _slideshowQueue.length + ')';
      // Nach 5s automatisch fortsetzen wenn wieder verbunden
      setTimeout(function() {
        if (_slideshowPaused && _connected && _slideshowRunning) {
          _slideshowPaused = false;
          showStatus('▶ Slideshow wird fortgesetzt…', 'info');
          const btn = document.getElementById('profileSlideshowBtn');
          if (btn) btn.textContent = '⏹ Stop (' + _slideshowQueue.length + ')';
          _runNextSlideshow();
        }
      }, 5000);
    }
  }, 12000);

  _pendingProfileCapture[reqId] = { name, timeoutId };

  // rawApplyCode bereinigen: Sync-Aufrufe am Ende des generierten Codes entfernen.
  // Der generierte Code endet typischerweise mit:
  //   CharacterRefresh(TARGET,false,false);
  //   setTimeout(()=>{ ServerPlayerAppearanceSync(); ChatRoomCharacterUpdate(TARGET); ... },1200);
  // Diese Zeilen würden Server-Updates auslösen – für den Screenshot nicht erwünscht.
  if (rawApplyCode) {
    // Sync-Aufrufe + redundante CharacterRefresh/setTimeout-Blöcke entfernen.
    // CharacterRefresh rufen wir selbst nach der IIFE auf.
    rawApplyCode = rawApplyCode.split('\n').filter(function(line) {
      const t = line.trim();
      return !t.includes('ServerPlayerAppearanceSync') &&
             !t.includes('ChatRoomCharacterUpdate') &&
             !t.startsWith('CharacterRefresh(') &&
             !(t.startsWith('setTimeout(') && t.includes('1200'));
    }).join('\n');
  }

  // ── Identisch zu captureOsScreenshot – bewiesenermaßen funktionierend ──
  // applyPart: LZString-Bundle, raw JS-Code, oder nur Refresh
  const _restoreCode = ''
    + 'Player.Appearance.splice(0,Player.Appearance.length);'
    + 'origApp.forEach(function(i){Player.Appearance.push(i);});'
    + 'CharacterRefresh(Player,false,false);';
  const _applyErrCode = _restoreCode
    + 'window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',err:"APPLY_FAIL:"+applyErr.message},"*");'
    + 'return;';

  let applyPart;
  if (outfitCode) {
    applyPart = 'try{' + applyCode + '}catch(applyErr){' + _applyErrCode + '}';
  } else if (rawApplyCode) {
    applyPart = 'try{'
      + '(function(){\n' + rawApplyCode + '\n})();'
      + 'CharacterRefresh(Player,false,false);'
      + '}catch(applyErr){' + _applyErrCode + '}';
  } else {
    applyPart = 'try{CharacterRefresh(Player,false,false);}catch(_e){}';
  }

  const code = '(function(){'
    + 'window.__BCU_captureGen=(window.__BCU_captureGen||0)+1;'
    + 'var myGen=window.__BCU_captureGen;'
    // origApp IMMER aus __BCU_slideshowOrig – wird einmal bei Slideshow-Start gespeichert.
    // Nie aus Player.Appearance.slice() – sonst cascading-Fehler wenn ein Restore schiefläuft.
    + 'var origApp=(window.__BCU_slideshowOrig||Player.Appearance).slice();'
    + applyPart
    + 'var _prevHash=null,_checksDone=0,_maxChecks=3;'
    // _restore: NUR lokaler Restore, KEIN Server-Update.
    // Server-Sync passiert einmalig beim Slideshow-Stop (_stopProfileSlideshow).
    + 'function _restore(){'
    + '  Player.Appearance.splice(0,Player.Appearance.length);'
    + '  origApp.forEach(function(i){Player.Appearance.push(i);});'
    + '  CharacterRefresh(Player,false,false);'
    + '}'
    + 'function _canvasHash(canvas){'
    + '  try{'
    + '    var ctx=canvas.getContext("2d");'
    + '    var d=ctx.getImageData(0,0,canvas.width,canvas.height).data;'
    + '    var r=0,len=d.length/4,step=Math.max(1,Math.floor(len/200));'
    + '    for(var i=0;i<len;i+=step){var ix=i*4;r=((r*31)|0)+d[ix]+d[ix+1]+d[ix+2];}'
    + '    return r;'
    + '  }catch(_e){return -1;}'
    + '}'
    + 'function _sendCapture(){'
    + '  try{'
    + '    var src=Player.Canvas;'
    + '    if(!src||!src.width)throw new Error("Canvas leer");'
    + '    var oc=document.createElement("canvas");oc.width=src.width;oc.height=src.height;'
    + '    oc.getContext("2d").drawImage(src,0,0);'
    + '    var id=oc.getContext("2d").getImageData(0,0,oc.width,oc.height);'
    + '    var px=id.data,W=oc.width,H=oc.height;'
    + '    var x0=W,x1=0,y0=H,y1=0;'
    + '    for(var r=0;r<H;r++){for(var c=0;c<W;c++){'
    + '      var ii=(r*W+c)*4;'
    + '      if(px[ii]>5||px[ii+1]>5||px[ii+2]>5){if(c<x0)x0=c;if(c>x1)x1=c;if(r<y0)y0=r;if(r>y1)y1=r;}'
    + '    }}'
    + '    if(x1<x0){x0=0;y0=0;x1=W-1;y1=H-1;}'
    + '    var pad=20;'
    + '    x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);'
    + '    x1=Math.min(W-1,x1+pad);y1=Math.min(H-1,y1+pad);'
    + '    var cw=x1-x0+1,ch=y1-y0+1;'
    + '    var cc=document.createElement("canvas");cc.width=cw;cc.height=ch;'
    + '    var ctx2=cc.getContext("2d");'
    + '    ctx2.fillStyle="#000";ctx2.fillRect(0,0,cw,ch);'
    + '    ctx2.drawImage(oc,x0,y0,cw,ch,0,0,cw,ch);'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',data:cc.toDataURL("image/jpeg",0.88)},"*");'
    + '  }catch(e){'
    + '    window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"CANVAS_PREVIEW_DATA",reqId:' + J_reqId + ',err:e.message},"*");'
    + '  }finally{'
    + '    _restore();'
    + '  }'
    + '}'
    + 'function _renderCheck(){'
    + '  CharacterRefresh(Player,false,false);'
    + '  CharacterLoadCanvas(Player);'
    + '  setTimeout(function(){'
    + '    var h=_canvasHash(Player.Canvas);'
    + '    if(h===_prevHash||_checksDone>=_maxChecks){'
    + '      _sendCapture();'
    + '    }else{'
    + '      _prevHash=h;_checksDone++;'
    + '      setTimeout(_renderCheck,50);'
    + '    }'
    + '  },40);'
    + '}'
    + 'setTimeout(_renderCheck,40);'
    + '})();';

  console.log('[BCU] captureProfileViaCanvas: EXEC len:', code.length);
  bcSend({ type: 'EXEC', code }, true);
}

// ── Screenshot-Debug: Aufruf aus Popup-Konsole ────────
// Verwendung: debugOsScreenshot('102866', 0)
//   mk    = Member-Nummer als String
//   vIdx  = Versions-Index (0 = älteste, length-1 = neueste)
// Sicherer Debug: kein Apply, kein Game-Eingriff – nur Code analysieren
// Aufruf aus Popup-Konsole: debugOsOutfit('102866', 0)
window.debugOsOutfit = function(mk, vIdx) {
  mk = String(mk);
  vIdx = vIdx ?? 0;
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { console.error('[BCU] Kein Code für', mk, 'v', vIdx); return; }
  const outfitCode = v.code;
  const reqId = 'dbg_' + Date.now();
  console.log('[BCU] Analyse für #' + mk + ' v' + (vIdx+1) + ' – kein Spiel-Eingriff');

  // Handler für Analyse-Ergebnis
  const handler = function(ev) {
    if (!ev.data || ev.data.app !== 'BCKonfigurator' || ev.data.type !== 'OUTFIT_DEBUG_RESULT' || ev.data.reqId !== reqId) return;
    window.removeEventListener('message', handler);

    const r = ev.data;
    console.group('%c[BCU] Outfit-Analyse #' + mk + ' v' + (vIdx+1), 'color:#6ee7b7;font-weight:bold');
    console.log('📦 Bundle: ' + r.total + ' Items  |  AssetFamily: ' + r.assetFamily);
    if (r.missing.length) {
      console.warn('❌ FEHLENDE Assets (' + r.missing.length + ') – werden nicht gerendert:');
      r.missing.forEach(function(x) { console.warn('   [' + x.group + '] "' + x.name + '"'); });
    } else {
      console.log('✅ Alle Assets vorhanden');
    }
    if (r.naked.length) {
      console.log('⚠️  Nackt-Gruppen im Bundle: ' + r.naked.join(', '));
    }
    if (r.missingNaked.length) {
      console.log('ℹ️  Nackt-Gruppen fehlen im Bundle (werden ergänzt): ' + r.missingNaked.join(', '));
    }
    console.log('👤 Player AssetFamily: ' + r.assetFamily);
    console.groupEnd();
  };
  window.addEventListener('message', handler);

  // Reines Analyse-EXEC – ändert NICHTS am Spielstand
  const code = '(function(){'
    + 'try{'
    + '  var decoded=JSON.parse(LZString.decompressFromBase64(' + JSON.stringify(outfitCode) + '));'
    + '  var missing=[],naked=[];'
    + '  decoded.forEach(function(item){'
    + '    if(!item.Name||item.Name===""){naked.push(item.Group);return;}'
    + '    var a=AssetGet(Player.AssetFamily,item.Group,item.Name);'
    + '    if(!a)missing.push({group:item.Group,name:item.Name});'
    + '  });'
    + '  var bundleGroups=new Set(decoded.map(function(i){return i.Group;}));'
    + '  var missingNaked=Player.Appearance'
    + '    .filter(function(i){return !i.Asset.Name||i.Asset.Name==="";} )'
    + '    .map(function(i){return i.Asset.Group.Name;})'
    + '    .filter(function(g){return !bundleGroups.has(g);});'
    + '  window.__BCK_popupRef.postMessage({'
    + '    app:"BCKonfigurator",type:"OUTFIT_DEBUG_RESULT",reqId:' + JSON.stringify(reqId) + ','
    + '    total:decoded.length,missing:missing,naked:naked,'
    + '    missingNaked:missingNaked,assetFamily:Player.AssetFamily'
    + '  },"*");'
    + '}catch(e){'
    + '  window.__BCK_popupRef.postMessage({app:"BCKonfigurator",type:"OUTFIT_DEBUG_RESULT",'
    + '    reqId:' + JSON.stringify(reqId) + ',error:e.message},"*");'
    + '}'
    + '})();';

  bcSend({ type: 'EXEC', code }, true);
};

// ── Outfit-Code reparieren ────────────────────────────
// Öffnet ein Eingabefenster um den kaputten Code zu ersetzen (aus UI-Button)
function openRepairOsCode(mk, vIdx) {
  mk = String(mk);
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v) { showStatus('❌ Version nicht gefunden', 'error'); return; }
  const name = LSCG_DB[mk]?.name ?? mk;
  const newCode = prompt(
    '🔧 Repair: #' + mk + ' – ' + name + ' (v' + (vIdx + 1) + ')\n\n'
    + 'Den korrekten Outfit-Code (LZString) hier einfügen:\n'
    + '(z.B. aus BC Garderobe nach Ausführen kopiert)',
    ''
  );
  if (!newCode || !newCode.trim()) return;
  repairOsOutfitCode(mk, vIdx, newCode.trim());
}

// Konsolen-Shortcut: repairOsOutfitCode('102866', 0, 'Nob...')
window.repairOsOutfitCode = function(mk, vIdx, newCode) {
  mk = String(mk);
  const entry = LSCG_DB[mk];
  if (!entry?.versions?.[vIdx]) { console.error('[BCU] Version nicht gefunden:', mk, vIdx); return; }
  if (!newCode) { console.error('[BCU] Kein Code angegeben'); return; }

  // Code ersetzen
  entry.versions[vIdx].code = newCode;
  _saveLscgDB();

  // Broken-Flag löschen
  const fp   = entry.versions[vIdx].fingerprint ?? null;
  const vKey = fp ? (mk + '|' + fp) : mk;
  delete _osBrokenCodes[vKey];

  // Altes Screenshot löschen damit er neu aufgenommen wird
  if (LSCG_SCREENSHOTS[vKey]) {
    delete LSCG_SCREENSHOTS[vKey];
    _saveLscgScreenshots();
  }

  showStatus('✅ Code ersetzt – Screenshot wird aufgenommen…', 'success');
  console.log('[BCU] Code für #' + mk + ' v' + (vIdx + 1) + ' ersetzt. Screenshot wird neu aufgenommen.');

  // Screenshot direkt neu aufnehmen
  if (_connected) {
    _osCaptureQueue.unshift({ mk, vIdx });
    if (!_osCaptureRunning) _runNextOsCapture();
  }
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
};

// ── Outfit anlegen ohne Zurückwechseln (Test) ─────────
// Verwendung: testOsOutfit('102866', 0)
//   Legt das Outfit auf Player an und lässt es offen – kein Restore.
//   Danach kann man im Spiel prüfen ob Arme/Hände etc. korrekt sind.
//   Zum Zurücksetzen: normales Outfit in BC-Garderobe wählen.
window.testOsOutfit = function(mk, vIdx) {
  mk = String(mk);
  vIdx = vIdx ?? 0;
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { console.error('[BCU] Kein Code für', mk, 'v', vIdx); return; }
  const outfitCode = v.code;
  console.log('[BCU] TEST-Apply #' + mk + ' v' + (vIdx + 1) + ' – Outfit bleibt angelegt!');

  const code = '(function(){'
    + 'try{'
    + '  var decoded=JSON.parse(LZString.decompressFromBase64(' + JSON.stringify(outfitCode) + '));'
    + '  if(!Array.isArray(decoded)||!decoded.length){console.warn("[BCU] Leeres Bundle");return;}'
    // Nackt-Gruppen sichern (ArmsLeft, HandsLeft etc.)
    + '  var nakedItems=Player.Appearance.filter(function(i){return !i.Asset.Name||i.Asset.Name==="";});'
    + '  var bundleGroups=new Set(decoded.map(function(i){return i.Group;}));'
    // splice statt = [] → modifiziert das Array IN-PLACE, BC-interne Referenzen sehen die Änderung
    + '  Player.Appearance.splice(0,Player.Appearance.length);'
    + '  if(typeof CharacterAppearanceSetFromBundle==="function"){'
    + '    CharacterAppearanceSetFromBundle(Player,decoded,0,Player.AssetFamily);'
    + '  }else{'
    + '    decoded.forEach(function(item){'
    + '      if(!item||!item.Group)return;'
    + '      try{InventoryWear(Player,item.Name||"",item.Group,item.Color,0,null,item.Property,false);}catch(_e){}'
    + '    });'
    + '  }'
    // Property-Fix: Craft/Text (z.B. "DOLL") explizit setzen
    + '  decoded.forEach(function(bundleItem){'
    + '    if(!bundleItem||!bundleItem.Group||!bundleItem.Property)return;'
    + '    var worn=Player.Appearance.find(function(a){return a.Asset&&a.Asset.Group&&a.Asset.Group.Name===bundleItem.Group;});'
    + '    if(worn)worn.Property=JSON.parse(JSON.stringify(bundleItem.Property));'
    + '  });'
    // Nackt-Gruppen (Arme etc.) zurück einfügen falls nach Apply nicht vorhanden
    + '  var _afterGrps=new Set(Player.Appearance.map(function(a){return a.Asset&&a.Asset.Group?a.Asset.Group.Name:"";}));'
    + '  nakedItems.forEach(function(item){if(!_afterGrps.has(item.Asset.Group.Name))Player.Appearance.push(item);});'
    + '  CharacterRefresh(Player,false,false);'
    + '  CharacterLoadCanvas(Player);'
    + '  console.log("[BCU] TEST-Apply fertig. Items:",Player.Appearance.length);'
    + '  var withCraft=decoded.filter(function(i){return i.Property&&i.Property.Craft;});'
    + '  if(withCraft.length)console.log("[BCU] Craft-Items:",withCraft.map(function(i){return i.Group+"="+i.Property.Craft.Name;}));'
    + '}catch(e){'
    + '  console.error("[BCU] TEST-Apply Fehler:",e.message);'
    + '}'
    + '})();';

  bcSend({ type: 'EXEC', code }, true);
};

// ── Gestaffeltes Aufnehmen aller fehlenden Bilder ─────
function captureAllMissingOsScreenshots() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  // Build a queue of {mk, vIdx} pairs that have no screenshot yet
  const queue = [];
  Object.keys(LSCG_DB).forEach(function(mk) {
    const versions = LSCG_DB[mk]?.versions;
    if (!Array.isArray(versions)) return;
    versions.forEach(function(v, vIdx) {
      const fp  = v?.fingerprint ?? null;
      const key = fp ? (mk + '|' + fp) : mk;
      if (!LSCG_SCREENSHOTS[key]) {
        queue.push({ mk, vIdx });
      }
    });
  });
  if (!queue.length) { showStatus('✅ Alle Versionen haben bereits ein Bild', 'success'); return; }
  _osCaptureQueue = queue;
  showStatus('📸 ' + queue.length + ' Bilder werden aufgenommen…', 'info');
  if (!_osCaptureRunning) _runNextOsCapture();
}

function _runNextOsCapture() {
  if (!_osCaptureQueue.length) {
    _osCaptureRunning = false;
    if (_osCaptureNeedSync) {
      _osCaptureNeedSync = false;
      // Alle Captures fertig → Player-Canvas neu laden + Server-Sync
      bcSend({
        type: 'EXEC',
        code: '(function(){'
          + 'try{'
          + '  CharacterLoadCanvas(Player);'
          + '  if(typeof ServerPlayerAppearanceSync==="function"){ServerPlayerAppearanceSync();}'
          + '  else if(typeof ServerSend==="function"){ServerSend("AccountUpdate",{Appearance:Player.Appearance});}'
          + '}catch(e){console.warn("[BCU] Appearance-Sync fehlgeschlagen:",e.message);}'
          + '})();'
      }, true);
      showStatus('✅ Alle Bilder fertig · Outfit synchronisiert', 'success');
    }
    return;
  }
  _osCaptureRunning = true;
  const item = _osCaptureQueue.shift();
  setTimeout(function() { captureOsScreenshot(item.mk, item.vIdx); }, 50);
}

// ── Styled Tab für LSCG-Eintrag öffnen ───────────────
function openOsCanvasTab(mk) {
  const img = _getLscgScreenshot(mk);
  const entry = LSCG_DB[mk];
  const name = entry ? (entry.nickname ? (entry.name + ' „' + entry.nickname + '"') : entry.name) : mk;
  if (!img) {
    // Kein Bild vorhanden → erst aufnehmen, dann Tab öffnen über Queue-Ergebnis
    // Wir merken uns dass nach Capture ein Tab geöffnet werden soll
    _pendingOsTab = mk;
    captureOsScreenshot(mk);
    showStatus('📸 Kein Bild vorhanden – wird aufgenommen…', 'info');
    return;
  }
  _openOsTab(mk, img, name, entry);
}

let _pendingOsTab = null;

function _openOsTab(mk, img, name, entry) {
  const itemCount = entry?.versions?.[entry.versions.length - 1] ? '–' : '–';
  const tab = window.open('', '_blank');
  if (!tab) { showStatus('❌ Popup blockiert', 'error'); return; }
  tab.document.write(`<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><title>#${mk} – ${escHtml(name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#0d0d0f;--bg2:#141418;--bg3:#1a1a20;--border2:rgba(255,255,255,0.12);
--accent:oklch(72% 0.13 58);--accent-text:oklch(82% 0.1 62);
--accent-soft:oklch(72% 0.13 58 / 0.14);--accent-line:oklch(72% 0.13 58 / 0.35);
--text:#f4f2ee;--text3:#6d6b66;--green:#34d399;--gd:rgba(6,78,59,0.6);
--shadow-lg:0 16px 48px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.35);--r-xl:22px;
--font-ui:'Inter Tight',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-ui);font-size:13.5px}
body{display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
.card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-xl);box-shadow:var(--shadow-lg);overflow:hidden;width:340px}
.card-header{padding:16px 18px 12px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);flex-shrink:0}
.card-title{font-size:1rem;font-weight:800;color:var(--accent-text)}
.card-sub{font-size:0.72rem;color:var(--text3);font-family:var(--font-mono);margin-top:1px}
.img-wrap{background:var(--bg3);border-bottom:1px solid rgba(255,255,255,0.06);overflow:hidden}
.img-wrap img{width:100%;display:block}
.card-footer{padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;font-size:0.7rem;font-weight:600;font-family:var(--font-mono);background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--accent-line)}
.badge-green{background:var(--gd);color:var(--green);border-color:rgba(52,211,153,0.25)}
.meta{font-size:0.72rem;color:var(--text3);font-family:var(--font-mono)}
</style></head><body>
<div class="card">
  <div class="card-header"><div class="dot"></div>
    <div><div class="card-title">${escHtml(entry?.name ?? mk)}</div>
    <div class="card-sub">#${mk}${entry?.nickname ? ' · ' + escHtml(entry.nickname) : ''}</div></div>
  </div>
  <div class="img-wrap"><img src="${img}" alt="${escHtml(name)}"></div>
  <div class="card-footer">
    <span class="badge badge-green">✅ LSCG Outfit</span>
    <span class="badge">${(entry?.versions?.length ?? 0)} Versionen</span>
  </div>
</div></body></html>`);
  tab.document.close();
}

const LSCG_IDB_KEY      = 'BC_LSCG_OUTFITS_v3';
const LSCG_LS_KEY       = 'BC_LSCG_OUTFITS_LS_v3';   // localStorage-Backup (Fallback wenn IDB geleert wird)
const LSCG_IGNORE_KEY   = 'BC_LSCG_IGNORE_v1';
const LSCG_FAV_KEY      = 'BC_LSCG_FAVS_v1';
const LSCG_SLOTS_KEY    = 'BC_LSCG_SLOTS_v1';         // Persistierte LSCG-Outfit-Slots (key → code)
const LSCG_MAX_VERSIONS = 30;
let LSCG_DB = {};
// Synchrones localStorage-Preload entfernt: JSON.parse eines großen LSCG_DB blockiert den UI-Thread.
// IDB lädt async in der IIFE unten (<50ms) – kein spürbarer Unterschied für den Nutzer.
const _osOpenSet  = new Set();
let _osFavs       = new Set();   // member keys die favorisiert sind
let _osSearchQuery = '';          // aktueller Suchbegriff
let _lscgFpMap   = {};            // fingerprint → [slotName,...] – RAM-only, wird aus _lscgSlots rebuilt
let _lscgSlots   = {};            // slotName → code – PERSISTIERT in IDB

// Ignorierte Gruppen: Prefixe + exakte Namen
let _ignorePrefix = [];
let _ignoreExact  = new Set(['Blush','Emoticon','Fluids','Mouth','Eyes','Eyes2','Eyebrows','Eyebrows2','Pronouns']);

function _shouldIgnoreGroup(g) {
  if (_ignoreExact.has(g)) return true;
  return _ignorePrefix.some(function(p){ return g.startsWith(p); });
}

function _computeFilteredFp(code) {
  if (!code) return '';
  try {
    const items = JSON.parse(LZString.decompressFromBase64(code));
    return items
      .filter(function(i){ return i.Group && !_shouldIgnoreGroup(i.Group); })
      .sort(function(a,b){ return a.Group.localeCompare(b.Group); })
      .map(function(i){ return i.Group + '\x1f' + i.Name + '\x1f' + JSON.stringify(i.Color ?? ''); })
      .join('\x1e');
  } catch(e) { return ''; }
}

async function _loadIgnoreSettings() {
  const saved = await idbGet(LSCG_IGNORE_KEY);
  if (saved) {
    _ignorePrefix = saved.prefix ?? ['Item'];
    _ignoreExact  = new Set(saved.exact ?? ['Emoticon', 'Fluids']);
  }
}

async function _saveIgnoreSettings() {
  await idbSet(LSCG_IGNORE_KEY, { prefix: _ignorePrefix, exact: [..._ignoreExact] });
}

function getIgnoreText() {
  return [..._ignoreExact, ..._ignorePrefix.map(function(p){ return p + '*'; })].join(', ');
}

function setIgnoreText(text) {
  const parts = text.split(/[\n,]+/).map(function(s){ return s.trim(); }).filter(Boolean);
  _ignorePrefix = parts.filter(function(s){ return s.endsWith('*'); }).map(function(s){ return s.slice(0,-1); });
  _ignoreExact  = new Set(parts.filter(function(s){ return !s.endsWith('*'); }));
  _saveIgnoreSettings();
  // Fingerprints in DB neu berechnen
  for (const mk of Object.keys(LSCG_DB)) {
    for (const v of (LSCG_DB[mk].versions ?? [])) {
      if (v.code) v.fingerprint = _computeFilteredFp(v.code);
    }
    // Duplikate innerhalb eines Chars entfernen (gleichem Fingerprint behalten nur neueste)
    _dedupeVersions(LSCG_DB[mk]);
  }
  _saveLscgDB();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
  showStatus('✅ Gruppen-Filter gespeichert & DB aktualisiert', 'success');
}

function _dedupeVersions(entry) {
  const seen = new Set();
  entry.versions = entry.versions.filter(function(v) {
    // v.fingerprint='' (leerer String) wird von ?? nicht abgefangen → separat prüfen
    const fp = (v.fingerprint != null && v.fingerprint !== '')
      ? v.fingerprint
      : ('__no_fp_' + (v.ts ?? Math.random()));
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
}

function toggleIgnorePanel() {
  const panel = document.getElementById('osIgnorePanel');
  if (!panel) return;
  const open = panel.style.display === 'flex';
  panel.style.display = open ? 'none' : 'flex';
  if (!open) document.getElementById('osIgnoreInput').value = getIgnoreText();
}

// ── Favoriten ────────────────────────────────────────────────
function toggleOsFav(mk) {
  if (_osFavs.has(mk)) _osFavs.delete(mk); else _osFavs.add(mk);
  idbSet(LSCG_FAV_KEY, [..._osFavs]);
  renderOutfitScanTab();
}

// ── Suche ────────────────────────────────────────────────────
function osSearch(q) {
  _osSearchQuery = q.trim().toLowerCase();
  renderOutfitScanTab();
}

// ── Gemeinsamer Apply-Kern (wird von Run UND Screenshot verwendet) ───────────
// Gibt den reinen Apply-Code zurück (kein IIFE-Wrapper, kein Server-Sync).
// Kann direkt in einen try{}-Block eingebettet werden.
function _buildApplyCode(code) {
  const esc = JSON.stringify(code);
  return ''
    + 'var decoded=JSON.parse(LZString.decompressFromBase64(' + esc + '));'
    + 'if(!Array.isArray(decoded)||!decoded.length){console.warn("[BCU] Leeres Bundle");return;}'
    // Nackte Body-Items sichern (leere Asset-Namen = interne BC-Pflicht-Items)
    + 'var nakedItems=Player.Appearance.filter(function(i){return i.Asset&&(!i.Asset.Name||i.Asset.Name==="");});'
    + 'var bundleGroups=new Set(decoded.map(function(i){return i.Group;}));'
    + 'Player.Appearance.splice(0,Player.Appearance.length);'
    // Priorität 1: CharacterAppearanceSetFromBundle (native BC, beste Kompatibilität)
    + 'if(typeof CharacterAppearanceSetFromBundle==="function"){'
    + '  CharacterAppearanceSetFromBundle(Player,decoded,0,Player.AssetFamily);'
    + '}else if(typeof AssetGet==="function"){'
    // Priorität 2: AssetGet + direktes Einfügen – OHNE InventoryWear-Permission-Checks.
    // InventoryWear überspringt Items die Voraussetzungen nicht erfüllen, weshalb
    // Outfits unvollständig gerendert werden. Direktes Einfügen repliziert was
    // CharacterAppearanceSetFromBundle intern tut.
    + '  decoded.forEach(function(item){'
    + '    if(!item||!item.Group)return;'
    + '    var asset=AssetGet(Player.AssetFamily,item.Group,item.Name||"");'
    + '    if(!asset)return;'
    + '    Player.Appearance.push({'
    + '      Asset:asset,'
    + '      Color:item.Color,'
    + '      Difficulty:item.Difficulty||0,'
    + '      Property:item.Property?JSON.parse(JSON.stringify(item.Property)):{},'
    + '      Model:undefined'
    + '    });'
    + '  });'
    + '}else{'
    // Priorität 3: InventoryWear als letzter Fallback (kann Items überspringen)
    + '  decoded.forEach(function(item){'
    + '    if(!item||!item.Group)return;'
    + '    try{InventoryWear(Player,item.Name||"",item.Group,item.Color,0,null,item.Property,false);}catch(_e){}'
    + '  });'
    // Properties nachträglich setzen, da InventoryWear sie ggf. ignoriert
    + '  decoded.forEach(function(bundleItem){'
    + '    if(!bundleItem||!bundleItem.Group||!bundleItem.Property)return;'
    + '    var worn=Player.Appearance.find(function(a){return a.Asset&&a.Asset.Group&&a.Asset.Group.Name===bundleItem.Group;});'
    + '    if(worn)worn.Property=JSON.parse(JSON.stringify(bundleItem.Property));'
    + '  });'
    + '}'
    // Nackte Items (Arme etc.) zurück einfügen falls nach Apply nicht vorhanden
    + 'var _afterGrps=new Set(Player.Appearance.map(function(a){return a.Asset&&a.Asset.Group?a.Asset.Group.Name:"";}));'
    + 'nakedItems.forEach(function(item){if(!_afterGrps.has(item.Asset.Group.Name))Player.Appearance.push(item);});'
    + 'CharacterRefresh(Player,false,false);';
}

// ── Outfit anwenden (Run-Button) ─────────────────────────────
function _oiBuildExecCode(code) {
  if (!code) return '/* kein Code */';
  return '(function(){'
    + 'try{'
    + _buildApplyCode(code)
    + '  setTimeout(function(){'
    + '    if(typeof ServerPlayerAppearanceSync==="function")ServerPlayerAppearanceSync();'
    + '    else if(typeof ServerSend==="function")ServerSend("AccountUpdate",{Appearance:Player.Appearance});'
    + '  },200);'
    + '}catch(e){console.error("[BCU] Outfit-Apply Fehler:",e.message);}'
    + '})();';
}

function osApplyOutfit(mk, vIdx) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { showStatus('❌ Kein Code', 'error'); return; }
  bcSend({ type: 'EXEC', code: _oiBuildExecCode(v.code) });
  showStatus('▶ Outfit von ' + escHtml(LSCG_DB[mk]?.name ?? mk) + ' wird angewendet…', 'info');
}

// ── Outfit-Code in Zwischenablage kopieren ───────────────────
function osCopyCode(mk, vIdx) {
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { showStatus('❌ Kein Code', 'error'); return; }
  navigator.clipboard.writeText(v.code)
    .then(function() { showStatus('📋 Code kopiert!', 'success'); })
    .catch(function() { showStatus('❌ Kopieren fehlgeschlagen', 'error'); });
}

// ── Als Profil speichern ─────────────────────────────────────
function osSaveOutfitAsProfile(mk, vIdx) {
  const v    = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { showStatus('❌ Kein Code', 'error'); return; }
  const entry = LSCG_DB[mk];
  const d     = new Date(v.ts);
  const vNum  = vIdx + 1;
  const def   = (entry?.name ?? mk) + ' v' + vNum;
  const name  = prompt('Profilname:', def);
  if (!name?.trim()) return;
  const trimmed = name.trim();
  if (PROFILES[trimmed] && !confirm('Profil "' + trimmed + '" existiert bereits. Überschreiben?')) return;
  PROFILES[trimmed] = { name: trimmed, date: d.toLocaleDateString('de-DE'), _outfitCode: v.code, items: [] };
  _saveProfiles();
  // Screenshot vom LSCG-Eintrag ins Profil übernehmen (falls vorhanden und Profil noch keins hat)
  const lscgImg = _getLscgScreenshot(mk);
  if (lscgImg && !PROFILE_SCREENSHOTS[trimmed]) {
    PROFILE_SCREENSHOTS[trimmed] = lscgImg;
    _saveProfileScreenshots();
    showStatus('✅ Als Profil "' + trimmed + '" gespeichert (inkl. Bild)', 'success');
  } else {
    showStatus('✅ Als Profil "' + trimmed + '" gespeichert', 'success');
  }
}

function toggleOsChar(mk, hdrEl) {
  const el = hdrEl
    ? (typeof hdrEl.closest === 'function' ? hdrEl.closest('.os-char') : hdrEl.parentElement)
    : document.querySelector('[data-mk="' + mk + '"]');
  if (!el) return;
  const nowOpen = el.classList.toggle('open');
  const versDiv = el.querySelector('.os-versions');
  if (versDiv) versDiv.style.display = nowOpen ? 'flex' : 'none';
  if (nowOpen) {
    _osOpenSet.add(String(mk));
    setTimeout(function() { el.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 50);
  } else {
    _osOpenSet.delete(String(mk));
  }
}

(async () => {
  await _loadIgnoreSettings();
  const favSaved = await idbGet(LSCG_FAV_KEY);
  if (Array.isArray(favSaved)) _osFavs = new Set(favSaved);
  const ssSaved = await idbGet(LSCG_SCREENSHOTS_KEY);
  if (ssSaved && typeof ssSaved === 'object') {
    LSCG_SCREENSHOTS = ssSaved;
    console.log('[BCU] LSCG Screenshots geladen:', Object.keys(LSCG_SCREENSHOTS).length);
  }
  // Gespeicherte LSCG-Outfit-Slots laden (persistierte Slot-Namen + Codes)
  const slotsSaved = await idbGet(LSCG_SLOTS_KEY);
  if (slotsSaved && typeof slotsSaved === 'object') {
    _lscgSlots = slotsSaved;
    _rebuildFpMapFromSlots();
    console.log('[BCU] LSCG Slots geladen:', Object.keys(_lscgSlots).length);
  }
  const saved = await idbGet(LSCG_IDB_KEY);
  if (saved && typeof saved === 'object' && Object.keys(saved).length) {
    LSCG_DB = saved;
  }
  if (Object.keys(LSCG_DB).length) {
    // Fingerprints werden NICHT mehr synchron neu berechnet (blockiert UI bei großer DB).
    // Stattdessen: nur Einträge ohne Fingerprint asynchron füllen.
    const needsFp = [];
    for (const mk of Object.keys(LSCG_DB)) {
      const entry = LSCG_DB[mk];
      if (!entry?.versions) continue;
      for (const v of entry.versions) {
        if (v.code && (v.fingerprint == null || v.fingerprint === '')) needsFp.push(v);
      }
    }
    if (needsFp.length) {
      // Fingerprints in Chunks berechnen (je 5 pro setTimeout-Tick) um UI nicht zu blockieren
      const CHUNK = 5;
      function processChunk(i) {
        const end = Math.min(i + CHUNK, needsFp.length);
        for (let j = i; j < end; j++) {
          needsFp[j].fingerprint = _computeFilteredFp(needsFp[j].code);
        }
        if (end < needsFp.length) {
          setTimeout(() => processChunk(end), 0);
        } else {
          // Dedup + save nach allen Chunks
          for (const mk of Object.keys(LSCG_DB)) {
            if (LSCG_DB[mk]?.versions) _dedupeVersions(LSCG_DB[mk]);
          }
          _saveLscgDB();
          if (_activeTab === 'outfit-scan') renderOutfitScanTab();
        }
      }
      setTimeout(() => processChunk(0), 0);
    }
    console.log('[BCU] LSCG Outfits geladen:', Object.keys(LSCG_DB).length, 'Chars');
  }
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
})();

async function _saveLscgDB() {
  await idbSet(LSCG_IDB_KEY, LSCG_DB);
  // localStorage-Backup absichtlich entfernt: JSON.stringify/parse eines großen LSCG_DB
  // blockiert den UI-Thread. IDB ist zuverlässig genug als primäre Quelle.
}

async function _saveLscgSlots() {
  await idbSet(LSCG_SLOTS_KEY, _lscgSlots);
}

function _rebuildFpMapFromSlots() {
  _lscgFpMap = {};
  for (const [slotName, code] of Object.entries(_lscgSlots)) {
    if (!code) continue;
    const fp = _computeFilteredFp(code);
    if (!fp) continue;
    if (!_lscgFpMap[fp]) _lscgFpMap[fp] = [];
    _lscgFpMap[fp].push(slotName);
  }
}

// ── Export / Import ───────────────────────────────────────────
function exportLscgDB() {
  const chars = Object.keys(LSCG_DB).length;
  if (!chars) { showStatus('⚠️ Keine LSCG Outfits zum Exportieren', 'info'); return; }
  const data = JSON.stringify(LSCG_DB, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'lscg_outfits_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  let versions = 0;
  for (const e of Object.values(LSCG_DB)) versions += (e.versions?.length ?? 0);
  showStatus('✅ Export: ' + chars + ' Chars, ' + versions + ' Versionen', 'success');
}

function importLscgDB() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = '.json,application/json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const imported = JSON.parse(ev.target.result);
        if (typeof imported !== 'object' || Array.isArray(imported))
          { showStatus('❌ Ungültiges Format', 'error'); return; }
        let added = 0, vAdded = 0;
        for (const [mk, entry] of Object.entries(imported)) {
          if (!entry?.versions || !Array.isArray(entry.versions)) continue;
          if (!LSCG_DB[mk]) {
            LSCG_DB[mk] = { name: entry.name ?? mk, nickname: entry.nickname ?? null, versions: [] };
            added++;
          } else {
            LSCG_DB[mk].name     = entry.name     ?? LSCG_DB[mk].name;
            LSCG_DB[mk].nickname = entry.nickname ?? LSCG_DB[mk].nickname;
          }
          const existing = LSCG_DB[mk];
          for (const v of entry.versions) {
            const fp  = v.fingerprint;
            const dup = fp ? existing.versions.find(function(ev){ return ev.fingerprint === fp; }) : null;
            if (!dup) { existing.versions.push(v); vAdded++; }
          }
          if (existing.versions.length > LSCG_MAX_VERSIONS)
            existing.versions = existing.versions.slice(-LSCG_MAX_VERSIONS);
          _dedupeVersions(existing);
        }
        _saveLscgDB();
        renderOutfitScanTab();
        showStatus('✅ Import: +' + added + ' neue Chars, +' + vAdded + ' Versionen', 'success');
      } catch(err) {
        showStatus('❌ Import-Fehler: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ══════════════════════════════════════════════════════
//  TIMER & LOCK DASHBOARD
// ══════════════════════════════════════════════════════

let _locksData        = null;   // latest scan results array
let _locksInterval    = null;   // setInterval id for countdown ticks
let _locksEditOpen    = null;   // 'mk:group' of currently open edit-existing panel
let _locksApplyOpen   = null;   // 'mk:group' of currently open apply-new-lock panel
let _locksShowLockable = new Set();  // mk keys where "lockable items" section is expanded

// Lock type metadata ──────────────────────────────────
// hasHint: lock stores a hint text (shown alongside password input)
const _LOCK_META = {
  'MetalPadlock':             { icon:'🔒',   label:'Metall',             hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'ExclusivePadlock':         { icon:'🔐',   label:'Exklusiv',           hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'IntricatePadlock':         { icon:'🔒✨', label:'Intricate',          hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'HighSecurityPadlock':      { icon:'🛡️',   label:'High Security',      hasTimer:false, hasPw:true,  hasCombo:false, hasHint:false },
  'PandoraPadlock':           { icon:'📦',   label:'Pandora',            hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'MistressPadlock':          { icon:'🎭',   label:'Mistress',           hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'LoversPadlock':            { icon:'💕',   label:'Lover',              hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'OwnerPadlock':             { icon:'👑',   label:'Owner',              hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'FiveMinutesPadlock':       { icon:'⏱️5m', label:'5 Minuten (alt)',    hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
  'CombinationPadlock':       { icon:'🔢',   label:'Kombination',        hasTimer:false, hasPw:false, hasCombo:true,  hasHint:false },
  'SafewordPadlock':          { icon:'⚡',   label:'Safeword',           hasTimer:false, hasPw:true,  hasCombo:false, hasHint:false },
  'PasswordPadlock':          { icon:'🔑',   label:'Passwort',           hasTimer:false, hasPw:true,  hasCombo:false, hasHint:true  },
  'MistressTimerPadlock':     { icon:'🎭⏱️', label:'Mistress Timer',     hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
  'LoversTimerPadlock':       { icon:'💕⏱️', label:'Lover Timer',        hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
  'OwnerTimerPadlock':        { icon:'👑⏱️', label:'Owner Timer',        hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
  'TimerPasswordPadlock':     { icon:'⏱️🔑', label:'Timer + PW',         hasTimer:true,  hasPw:true,  hasCombo:false, hasHint:true  },
  'Best Friend Padlock':      { icon:'👫',   label:'Best Friend',        hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'Best Friend Timer Padlock':{ icon:'👫⏱️', label:'BF Timer',           hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
  'FamilyPadlock':            { icon:'👨‍👩‍👧', label:'Family',             hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  '淫纹锁LuziPadlock':         { icon:'🌸',   label:'Lewd Crest',         hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'LewdCrestPadlock':         { icon:'🌸',   label:'Lewd Crest (alt)',   hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  'DeviousPadlock':           { icon:'😈',   label:'Devious (BCX)',      hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false, hasKeyHolder:true },
  'HeartPadlock':             { icon:'❤️',   label:'Heart',              hasTimer:false, hasPw:false, hasCombo:false, hasHint:false },
  // Legacy / BC standalone timer
  'TimerPadlock':             { icon:'⏱️',   label:'Timer',              hasTimer:true,  hasPw:false, hasCombo:false, hasHint:false },
};
function _lockMeta(type) {
  return _LOCK_META[type] || { icon:'🔒', label: type || 'Lock', hasTimer:false, hasPw:false, hasCombo:false, hasHint:false };
}

// Countdown helpers ───────────────────────────────────
function _pad2(n) { return n < 10 ? '0' + n : String(n); }
function _formatLockCountdown(ms) {
  if (ms == null) return '—';
  if (ms <= 0) return '⌛ Abgelaufen';
  const s   = Math.floor(ms / 1000);
  const d   = Math.floor(s / 86400);
  const h   = Math.floor((s % 86400) / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return d + 'd ' + _pad2(h) + ':' + _pad2(m) + ':' + _pad2(sec);
  return _pad2(h) + ':' + _pad2(m) + ':' + _pad2(sec);
}

// Compute remaining ms from lock data ─────────────────
// BC stores RemoveTimer as epoch-ms (Date.now() + duration)
// TimerReal is also epoch-ms (set by the padlock item itself)
function _locksRemainingMs(lock) {
  const now = Date.now();
  // TimerReal: epoch ms
  if (lock.timerReal != null) {
    const rem = lock.timerReal - now;
    if (rem > -86400000 && rem < 8 * 86400000) return rem;
  }
  // RemoveTimer: try as epoch ms first
  if (lock.removeTimer != null) {
    const remMs = lock.removeTimer - now;
    if (remMs > -86400000 && remMs < 8 * 86400000) return remMs;
    // Fallback: try as epoch seconds
    const remS = lock.removeTimer * 1000 - now;
    if (remS > -86400000 && remS < 8 * 86400000) return remS;
  }
  return null;
}

// Countdown interval ──────────────────────────────────
function _startLocksTimer() {
  if (_locksInterval) return;
  _locksInterval = setInterval(function() {
    if (_activeTab !== 'locks') { _stopLocksTimer(); return; }
    document.querySelectorAll('.lk-countdown[data-expires]').forEach(function(el) {
      const exp = parseInt(el.dataset.expires);
      const rem = exp - Date.now();
      el.textContent = _formatLockCountdown(rem);
      el.className = 'lk-countdown' +
        (rem <= 0 ? ' lk-expired' : rem < 3600000 ? ' lk-warn' : rem < 14400000 ? ' lk-soon' : '');
    });
  }, 1000);
}
function _stopLocksTimer() {
  if (_locksInterval) { clearInterval(_locksInterval); _locksInterval = null; }
}

// Scan ────────────────────────────────────────────────
function scanLocks() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  bcSend({ type: 'GET_LOCKS' });
  showStatus('⏳ Scanne Locks…', 'info');
}

function _handleLocksData(data) {
  if (data.err) { showStatus('❌ Lock-Scan: ' + data.err, 'error'); return; }
  _locksData  = data.results ?? [];
  const total = _locksData.reduce(function(n, c) { return n + c.locks.length; }, 0);
  const chars = _locksData.filter(function(c) { return c.locks.length > 0; }).length;
  showStatus('🔒 ' + total + ' Lock(s) bei ' + chars + ' Char(s)', 'success');
  if (_activeTab === 'locks') { renderLocksTab(); _startLocksTimer(); }
}

// Render ──────────────────────────────────────────────
function renderLocksTab() {
  const body = document.getElementById('locksBody');
  if (!body) return;
  if (!_locksData) {
    body.innerHTML = '<div class="lk-empty">▶ Scannen um alle aktiven Locks anzuzeigen</div>';
    return;
  }
  // Show chars that have at least one lock OR at least one lockable item
  const visible = _locksData.filter(function(c) {
    return c.locks.length > 0 || (c.lockable ?? []).length > 0;
  });
  if (!visible.length) {
    body.innerHTML = '<div class="lk-empty">🔓 Keine aktiven Locks und keine lockbaren Items im Raum</div>';
    return;
  }
  body.innerHTML = visible.map(_buildLocksCharHtml).join('');
}

function _buildLocksCharHtml(char) {
  const mk           = String(char.memberNumber);
  const showLockable = _locksShowLockable.has(mk);
  const lockableCnt  = (char.lockable ?? []).length;
  const nameHtml = escHtml(char.name)
    + (char.nickname ? ' <span class="lk-nick">„' + escHtml(char.nickname) + '"</span>' : '')
    + (char.isPlayer ? ' <span class="lk-self-badge">ICH</span>' : '');
  const cards = char.locks.map(function(lock) { return _buildLockCardHtml(mk, lock, char.isPlayer); }).join('');
  const lockableSection = lockableCnt
    ? ('<div class="lk-lockable-wrap' + (showLockable ? ' open' : '') + '">'
       + '<button class="lk-lockable-toggle" onclick="toggleLockableSection(\'' + mk + '\')">'
       + '🔓 ' + lockableCnt + ' lockbar ' + (showLockable ? '▲' : '▼')
       + '</button>'
       + (showLockable ? _buildLockableSectionHtml(mk, char.lockable) : '')
       + '</div>')
    : '';
  return '<div class="lk-char-block">'
    + '<div class="lk-char-hdr">'
    + '<span class="lk-char-name">' + nameHtml + '</span>'
    + '<span class="lk-char-num">#' + mk + '</span>'
    + (char.locks.length ? '<span class="lk-char-cnt">' + char.locks.length + ' Lock(s)</span>' : '')
    + '</div>'
    + (cards ? '<div class="lk-grid">' + cards + '</div>' : '')
    + lockableSection
    + '</div>';
}

function _buildLockCardHtml(mk, lock, isPlayer) {
  const meta      = _lockMeta(lock.lockType);
  const remMs     = meta.hasTimer ? _locksRemainingMs(lock) : null;
  const expiresTs = (remMs != null) ? (Date.now() + remMs) : null;
  const editKey   = mk + ':' + lock.group;
  const isEditing = _locksEditOpen === editKey;
  const slotLabel = escHtml(lock.assetDesc || lock.asset);
  const craftLabel = lock.craftName ? ' <span class="lk-craft">(' + escHtml(lock.craftName) + ')</span>' : '';
  const lockerStr = lock.lockerName
    ? escHtml(lock.lockerName) + (lock.lockerNum != null ? ' <span class="lk-lnum">#' + lock.lockerNum + '</span>' : '')
    : '—';

  let timerHtml = '';
  if (meta.hasTimer) {
    if (expiresTs != null) {
      const initText = _formatLockCountdown(remMs);
      const colorCls = remMs <= 0 ? 'lk-expired' : remMs < 3600000 ? 'lk-warn' : remMs < 14400000 ? 'lk-soon' : '';
      timerHtml = '<div class="lk-row"><span class="lk-row-lbl">⏱ Timer</span>'
        + '<span class="lk-countdown ' + colorCls + '" data-expires="' + expiresTs + '">' + initText + '</span>'
        + '</div>';
    } else {
      timerHtml = '<div class="lk-row"><span class="lk-row-lbl">⏱ Timer</span><span class="lk-val lk-dim">—</span></div>';
    }
  }

  let pwHtml = '';
  if (meta.hasPw) {
    pwHtml = '<div class="lk-row"><span class="lk-row-lbl">🔑 PW</span>'
      + '<span class="lk-pw-val">' + (lock.password ? escHtml(lock.password) : '<span class="lk-dim">—</span>') + '</span>'
      + '</div>'
      + (lock.hint ? '<div class="lk-row"><span class="lk-row-lbl">💬</span><span class="lk-val lk-dim">' + escHtml(lock.hint) + '</span></div>' : '');
  }
  if (meta.hasCombo) {
    pwHtml = '<div class="lk-row"><span class="lk-row-lbl">🔢 Kombi</span>'
      + '<span class="lk-pw-val">' + (lock.combination ? escHtml(lock.combination) : '<span class="lk-dim">—</span>') + '</span>'
      + '</div>';
  }

  const editPanel = isEditing ? _buildLockEditHtml(mk, lock, meta, isPlayer) : '';

  return '<div class="lk-card' + (isEditing ? ' lk-card-editing' : '') + '" id="lkcard-' + escHtml(editKey.replace(':','_')) + '">'
    + '<div class="lk-card-hdr">'
    + '<span class="lk-badge">' + meta.icon + '</span>'
    + '<span class="lk-lock-label">' + escHtml(meta.label) + '</span>'
    + '<button class="lk-edit-btn" onclick="toggleLockEdit(\'' + mk + '\',\'' + escHtml(lock.group) + '\')" title="Bearbeiten">✏️</button>'
    + '</div>'
    + '<div class="lk-slot">' + slotLabel + craftLabel + '</div>'
    + '<div class="lk-row"><span class="lk-row-lbl">👤 Von</span><span class="lk-val">' + lockerStr + '</span></div>'
    + timerHtml
    + pwHtml
    + (lock.memberList?.length ? '<div class="lk-row"><span class="lk-row-lbl">👥</span><span class="lk-val lk-dim">' + lock.memberList.join(', ') + '</span></div>' : '')
    + editPanel
    + '</div>';
}

function _buildLockEditHtml(mk, lock, meta, isPlayer) {
  const remMs   = meta.hasTimer ? _locksRemainingMs(lock) : null;
  const curH    = remMs != null ? Math.floor(Math.max(0, remMs) / 3600000) : 0;
  const curM    = remMs != null ? Math.floor((Math.max(0, remMs) % 3600000) / 60000) : 0;

  let fields = '';

  if (meta.hasTimer) {
    fields += '<div class="lk-edit-row">'
      + '<span class="lk-edit-lbl">⏱ Neue Zeit</span>'
      + '<div class="lk-edit-inputs">'
      + '<input type="number" class="lk-input lk-edit-h" min="0" max="720" value="' + curH + '" placeholder="0"> <span class="lk-edit-unit">h</span>'
      + '<input type="number" class="lk-input lk-edit-m" min="0" max="59" value="' + curM + '" placeholder="0"> <span class="lk-edit-unit">min</span>'
      + '</div>'
      + '</div>';
  }
  if (meta.hasPw) {
    fields += '<div class="lk-edit-row">'
      + '<span class="lk-edit-lbl">🔑 Passwort</span>'
      + '<input type="text" class="lk-input lk-edit-pw" maxlength="8" value="' + escHtml((lock.password || '').toUpperCase()) + '" placeholder="A–Z max 8" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">'
      + '</div>';
  }
  if (meta.hasHint) {
    fields += '<div class="lk-edit-row">'
      + '<span class="lk-edit-lbl">💬 Hinweis</span>'
      + '<input type="text" class="lk-input lk-edit-hint" maxlength="64" value="' + escHtml(lock.hint || '') + '" placeholder="Hinweis (optional)">'
      + '</div>';
  }
  if (meta.hasCombo) {
    fields += '<div class="lk-edit-row">'
      + '<span class="lk-edit-lbl">🔢 Kombi</span>'
      + '<input type="text" class="lk-input lk-edit-combo" maxlength="4" value="' + escHtml(lock.combination || '') + '" placeholder="0000">'
      + '</div>';
  }
  if (meta.hasKeyHolder) {
    fields += '<div class="lk-edit-row"><span class="lk-edit-lbl">🗝️ Key Holder #</span>'
      + '<input type="number" class="lk-input lk-edit-keyholder" min="0" value="' + (lock.memberListKeys || lock.lockerNum || '') + '" placeholder="MemberNumber">'
      + '</div>';
  }

  if (!fields) {
    fields = '<div class="lk-edit-info">Dieser Lock-Typ hat keine editierbaren Werte.</div>';
  }

  return '<div class="lk-edit-panel" id="lockEdit-' + mk + '-' + escHtml(lock.group) + '">'
    + fields
    + '<div class="lk-edit-actions">'
    + '<button class="btn btn-primary lk-edit-btn-sm" onclick="applyLockEdit(\'' + mk + '\',\'' + escHtml(lock.group) + '\')">✅ Anwenden</button>'
    + '<button class="btn lk-edit-btn-sm" onclick="toggleLockEdit(\'' + mk + '\',\'' + escHtml(lock.group) + '\')">✕</button>'
    + '</div>'
    + '</div>';
}

// Lockable section ───────────────────────────────────
function toggleLockableSection(mk) {
  const key = String(mk);
  if (_locksShowLockable.has(key)) _locksShowLockable.delete(key);
  else _locksShowLockable.add(key);
  renderLocksTab();
  _startLocksTimer();
}

function _buildLockableSectionHtml(mk, lockableItems) {
  const items = lockableItems.map(function(li) {
    return _buildLockableItemHtml(mk, li);
  }).join('');
  return '<div class="lk-lockable-grid">' + items + '</div>';
}

function _buildLockableItemHtml(mk, li) {
  const editKey  = mk + ':' + li.group;
  const isApply  = _locksApplyOpen === editKey;
  const label    = escHtml(li.assetDesc || li.asset);
  const craft    = li.craftName ? ' <span class="lk-craft">(' + escHtml(li.craftName) + ')</span>' : '';
  const applyPanel = isApply ? _buildLockApplyPanelHtml(mk, li) : '';
  return '<div class="lk-lockable-item' + (isApply ? ' lk-lockable-applying' : '') + '">'
    + '<div class="lk-lockable-top">'
    + '<span class="lk-lockable-name">🔓 ' + label + craft + '</span>'
    + '<span class="lk-lockable-grp">' + escHtml(li.group) + '</span>'
    + '<button class="lk-apply-btn" onclick="toggleApplyLock(\'' + mk + '\',\'' + escHtml(li.group) + '\')">'
    + (isApply ? '✕' : '+ Schloss') + '</button>'
    + '</div>'
    + applyPanel
    + '</div>';
}

// List of selectable lock types
const _APPLY_LOCK_TYPES = [
  // ── Immer verfügbar ──────────────────────────────────────────
  { v:'MetalPadlock',              l:'🔒 Metall'                              },
  { v:'ExclusivePadlock',          l:'🔐 Exklusiv'                            },
  { v:'IntricatePadlock',          l:'🔒✨ Intricate'                         },
  { v:'HighSecurityPadlock',       l:'🛡️ High Security'                       },
  { v:'PandoraPadlock',            l:'📦 Pandora'                             },
  { v:'MistressPadlock',           l:'🎭 Mistress'                            },
  { v:'TimerPadlock',              l:'⏱️ Timer (max 5min)'                    },
  { v:'CombinationPadlock',        l:'🔢 Kombination'                         },
  { v:'SafewordPadlock',           l:'⚡ Safeword'                            },
  { v:'PasswordPadlock',           l:'🔑 Passwort'                            },
  { v:'MistressTimerPadlock',      l:'🎭⏱️ Mistress Timer'                    },
  { v:'TimerPasswordPadlock',      l:'⏱️🔑 Timer + Passwort'                  },
  { v:'淫纹锁LuziPadlock',          l:'🌸 Lewd Crest (Mod)'                   },
  { v:'DeviousPadlock',            l:'😈 Devious (BCX Mod)'                   },
  // ── Nur mit Beziehung / eingeschränkt ────────────────────────
  { v:'LoversPadlock',             l:'💕 Lover  ⚠ nur mit Lover'              },
  { v:'LoversTimerPadlock',        l:'💕⏱️ Lover Timer  ⚠ nur mit Lover'      },
  { v:'OwnerPadlock',              l:'👑 Owner  ⚠ nur wenn Owner'             },
  { v:'OwnerTimerPadlock',         l:'👑⏱️ Owner Timer  ⚠ nur wenn Owner'     },
  { v:'FamilyPadlock',             l:'👨‍👩‍👧 Family  ⚠ nur mit Familie'         },
  { v:'Best Friend Padlock',       l:'👫 Best Friend  ⚠ Mod + Freundschaft'   },
  { v:'Best Friend Timer Padlock', l:'👫⏱️ BF Timer  ⚠ Mod + Freundschaft'    },
  { v:'HeartPadlock',              l:'❤️ Heart  ⚠ Mod erforderlich'            },
];

function _buildLockApplyPanelHtml(mk, li) {
  const defType = 'MetalPadlock';
  const defMeta = _lockMeta(defType);
  const opts = _APPLY_LOCK_TYPES.map(function(o) {
    return '<option value="' + o.v + '"' + (o.v === defType ? ' selected' : '') + '>' + o.l + '</option>';
  }).join('');
  return '<div class="lk-apply-panel" id="lockApply-' + mk + '-' + escHtml(li.group) + '">'
    + '<div class="lk-edit-row">'
    + '<span class="lk-edit-lbl">🔒 Typ</span>'
    + '<select class="lk-apply-type" onchange="_onLockTypeChange(\'' + mk + '\',\'' + escHtml(li.group) + '\')">'
    + opts + '</select>'
    + '</div>'
    + '<div class="lk-edit-row lk-apply-timer-row" style="display:' + (defMeta.hasTimer ? '' : 'none') + '">'
    + '<span class="lk-edit-lbl">⏱ Zeit</span>'
    + '<div class="lk-edit-inputs">'
    + '<input type="number" class="lk-input lk-edit-h" min="0" max="720" value="0" placeholder="0"> <span class="lk-edit-unit">h</span>'
    + '<input type="number" class="lk-input lk-edit-m" min="0" max="59"  value="0" placeholder="0"> <span class="lk-edit-unit">min</span>'
    + '</div></div>'
    + '<div class="lk-edit-row lk-apply-pw-row" style="display:' + (defMeta.hasPw ? '' : 'none') + '">'
    + '<span class="lk-edit-lbl">🔑 PW</span>'
    + '<input type="text" class="lk-input lk-apply-pw" maxlength="8" placeholder="A–Z max 8" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">'
    + '</div>'
    + '<div class="lk-edit-row lk-apply-hint-row" style="display:' + (defMeta.hasHint ? '' : 'none') + '">'
    + '<span class="lk-edit-lbl">💬 Hinweis</span>'
    + '<input type="text" class="lk-input lk-apply-hint" maxlength="64" placeholder="Hinweis (optional)">'
    + '</div>'
    + '<div class="lk-edit-row lk-apply-combo-row" style="display:' + (defMeta.hasCombo ? '' : 'none') + '">'
    + '<span class="lk-edit-lbl">🔢 Kombi</span>'
    + '<input type="text" class="lk-input lk-apply-combo" maxlength="4" placeholder="0000">'
    + '</div>'
    + '<div class="lk-edit-actions">'
    + '<button class="btn btn-primary lk-edit-btn-sm" onclick="applyNewLock(\'' + mk + '\',\'' + escHtml(li.group) + '\')">🔒 Sperren</button>'
    + '<button class="btn lk-edit-btn-sm" onclick="toggleApplyLock(\'' + mk + '\',\'' + escHtml(li.group) + '\')">✕</button>'
    + '</div>'
    + '</div>';
}

// Called when lock-type dropdown changes — show/hide relevant input rows without re-render
function _onLockTypeChange(mk, group) {
  const panel = document.getElementById('lockApply-' + mk + '-' + group);
  if (!panel) return;
  const lockType = panel.querySelector('.lk-apply-type')?.value;
  if (!lockType) return;
  const meta = _lockMeta(lockType);
  panel.querySelectorAll('.lk-apply-timer-row').forEach(function(el){ el.style.display = meta.hasTimer ? '' : 'none'; });
  const pwRow    = panel.querySelector('.lk-apply-pw-row');
  const hintRow  = panel.querySelector('.lk-apply-hint-row');
  const comboRow = panel.querySelector('.lk-apply-combo-row');
  if (pwRow)    pwRow.style.display    = meta.hasPw    ? '' : 'none';
  if (hintRow)  hintRow.style.display  = meta.hasHint  ? '' : 'none';
  if (comboRow) comboRow.style.display = meta.hasCombo ? '' : 'none';

  // TimerPadlock: Standard auf 0h 5min setzen
  if (meta.hasTimer) {
    const hEl = panel.querySelector('.lk-edit-h');
    const mEl = panel.querySelector('.lk-edit-m');
    if (hEl && mEl && parseInt(hEl.value) === 0 && parseInt(mEl.value) === 0) {
      if (lockType === 'TimerPadlock') { hEl.value = '0'; mEl.value = '5'; }
      else                             { hEl.value = '1'; mEl.value = '0'; }
    }
  }
}

function toggleApplyLock(mk, group) {
  const key = mk + ':' + group;
  _locksApplyOpen = (_locksApplyOpen === key) ? null : key;
  renderLocksTab();
  _startLocksTimer();
}

function applyNewLock(mk, group) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const panel = document.getElementById('lockApply-' + mk + '-' + group);
  if (!panel) return;

  const lockType = panel.querySelector('.lk-apply-type')?.value;
  if (!lockType) { showStatus('⚠️ Kein Lock-Typ ausgewählt', 'info'); return; }

  const meta    = _lockMeta(lockType);
  const hEl     = panel.querySelector('.lk-edit-h');
  const mEl     = panel.querySelector('.lk-edit-m');
  const pwEl    = panel.querySelector('.lk-apply-pw');
  const hintEl  = panel.querySelector('.lk-apply-hint');
  const comboEl = panel.querySelector('.lk-apply-combo');

  let timerSec = (meta.hasTimer && hEl && mEl) ? (parseInt(hEl.value || 0) * 3600 + parseInt(mEl.value || 0) * 60) : 0;
  const password = (meta.hasPw    && pwEl)    ? (pwEl.value    || '') : null;
  const hint     = (meta.hasHint  && hintEl)  ? (hintEl.value  || '') : null;
  const combo    = (meta.hasCombo && comboEl) ? (comboEl.value || '') : null;

  // TimerPadlock: max 5 Minuten
  if (lockType === 'TimerPadlock' && timerSec > 300) {
    timerSec = 300;
    showStatus('⚠️ TimerPadlock max 5 Min – auf 5 Min gesetzt', 'info');
  }

  // Passwort-Validierung: 8 Großbuchstaben A-Z
  if (meta.hasPw && password !== null && password !== '') {
    const pwUpper = password.toUpperCase();
    if (!/^[A-Z]{1,8}$/.test(pwUpper)) {
      showStatus('❌ Passwort: max 8 Großbuchstaben (A-Z), keine Zahlen/Sonderzeichen', 'error'); return;
    }
    if (pwEl) pwEl.value = pwUpper; // auto-uppercase
  }

  // Kombination: 4 Ziffern
  if (meta.hasCombo && combo !== null && combo !== '') {
    if (!/^\d{4}$/.test(combo)) {
      showStatus('❌ Kombination: exakt 4 Ziffern (0000–9999)', 'error'); return;
    }
  }

  const mkNum = parseInt(mk);
  const expMs = timerSec > 0 ? (Date.now() + timerSec * 1000) : 0;
  const hasExtras = timerSec > 0 || password !== null || hint !== null || combo !== null;

  // ── Phase 1: Strip + Re-equip + Lock (wie Outfit-System) ────────────────
  // BC Anti-Cheat blockt "Lock erscheint plötzlich auf vorhandenem Item" als Diff.
  // Lösung: Item entfernen, neu anlegen (mit Farben/Craft erhalten), dann Lock drauf.
  // BC sieht "neues Item mit Lock" → valide Operator-Aktion → kein Anti-Cheat Block.
  let code = '(function(){\ntry{\n';
  code += 'var C=(ChatRoomCharacter||[]).find(function(c){return c.MemberNumber===' + mkNum + ';});\n';
  code += 'if(!C&&Player.MemberNumber===' + mkNum + ')C=Player;\n';
  code += 'if(!C){throw new Error("Char #' + mkNum + ' nicht gefunden");}\n';
  code += 'var _item=InventoryGet(C,' + JSON.stringify(group) + ');\n';
  code += 'if(!_item){throw new Error("Item nicht gefunden: ' + group + '");}\n';
  // Snapshot: asset name, colors, craft, typeRecord, props (ohne Lock-Properties)
  code += 'var _assetName=_item.Asset.Name;\n';
  code += 'var _color=_item.Color;\n';
  code += 'var _craft=_item.Craft??null;\n';
  code += 'var _tr=_item.Property?.TypeRecord??null;\n';
  code += 'var _type=_item.Property?.Type??null;\n';
  code += 'var _props={};\n';
  code += 'if(_item.Property){\n';
  code += '  var _skipKeys=["LockedBy","LockMemberNumber","Password","CombinationNumber","Hint","LockSet","RemoveTimer","TimerReal","ShowTimer","SelfUnlock","MemberNumberList","RemoveItem"];\n';
  code += '  Object.keys(_item.Property).forEach(function(k){if(!_skipKeys.includes(k))_props[k]=_item.Property[k];});\n';
  code += '}\n';
  // Strip + re-equip
  code += 'InventoryRemove(C,' + JSON.stringify(group) + ',false);\n';
  code += 'InventoryWear(C,_assetName,' + JSON.stringify(group) + ',_color,0,Player.MemberNumber,_craft);\n';
  code += 'var _newItem=InventoryGet(C,' + JSON.stringify(group) + ');\n';
  code += 'if(!_newItem){throw new Error("Re-equip fehlgeschlagen");}\n';
  code += '_newItem.Property=Object.assign({},_props);\n';
  code += 'if(_tr){_newItem.Property.TypeRecord=_tr;_newItem.Property.Type=_type??"";};\n';
  // Lock drauf
  code += 'if(!Player.Inventory.some(function(i){return i.Asset&&i.Asset.Name===' + JSON.stringify(lockType) + ';})){\n';
  code += '  Player.Inventory.push({Asset:{Name:' + JSON.stringify(lockType) + ',Group:{Name:"ItemMisc"}}});\n';
  code += '}\n';
  code += 'var _lockAsset=Asset.find(function(a){return a.Name===' + JSON.stringify(lockType) + '&&a.Group&&a.Group.Name==="ItemMisc";});\n';
  code += 'if(_lockAsset){InventoryLock(C,_newItem,{Asset:_lockAsset},Player.MemberNumber,true);}\n';
  code += 'else{InventoryLock(C,_newItem,' + JSON.stringify(lockType) + ',Player.MemberNumber);}\n';
  code += 'CharacterRefresh(C);\n';
  code += 'ChatRoomCharacterUpdate(C);\n';
  code += 'console.log("✅ Lock vergeben: ' + lockType + ' → ' + group + '");\n';
  code += '}catch(e){console.error("❌ applyNewLock:",e.message);}\n})();';

  bcSend({ type: 'EXEC', code });
  showStatus('🔒 ' + meta.icon + ' ' + meta.label + ' → ' + group, 'success');
  _locksApplyOpen = null;
  _locksShowLockable.add(String(mk));

  // ── Phase 2 (1.5s later): set timer/pw/hint/combo on the now-valid lock ──
  // The lock is now established and BCX-validated. Modifying its parameters
  // (timer/password/hint) goes through the lenient "edit existing lock" path
  // which doesn't require a pending-change registration.
  if (hasExtras) {
    setTimeout(function() {
      let code2 = '(function(){\ntry{\n';
      code2 += 'var C=(ChatRoomCharacter||[]).find(function(c){return c.MemberNumber===' + mkNum + ';});\n';
      code2 += 'if(!C&&Player.MemberNumber===' + mkNum + ')C=Player;\n';
      code2 += 'if(!C)throw new Error("Char nicht gefunden");\n';
      code2 += 'var _item=InventoryGet(C,' + JSON.stringify(group) + ');\n';
      code2 += 'if(!_item||!_item.Property)throw new Error("Item/Lock nicht gefunden");\n';
      if (timerSec > 0) {
        code2 += '_item.Property.TimerReal=' + expMs + ';\n';
        code2 += '_item.Property.RemoveTimer=' + expMs + ';\n';
        code2 += '_item.Property.ShowTimer=true;\n';
      }
      if (password !== null) {
        code2 += '_item.Property.Password=' + JSON.stringify(password.toUpperCase()) + ';\n';
        code2 += '_item.Property.LockSet=true;\n';
      }
      if (hint  !== null) code2 += '_item.Property.Hint='              + JSON.stringify(hint)  + ';\n';
      if (combo !== null) code2 += '_item.Property.CombinationNumber=' + JSON.stringify(combo) + ';\n';
      code2 += 'setTimeout(function(){\n';
      code2 += '  if(C.MemberNumber===Player.MemberNumber){\n';
      code2 += '    ServerPlayerAppearanceSync();\n';
      code2 += '    ChatRoomCharacterUpdate(C);\n';
      code2 += '  } else {\n';
      // For other chars: send appearance update via ServerSend so server + all clients see it
      code2 += '    ServerSend("ChatRoomCharacterItemUpdate",{MemberNumber:C.MemberNumber,Appearance:C.Appearance.map(function(a){return{Group:a.Asset.Group.Name,Name:a.Asset.Name,Color:a.Color,Property:a.Property};})});\n';
      code2 += '    ChatRoomCharacterUpdate(C);\n';
      code2 += '  }\n';
      code2 += '},300);\n';
      code2 += 'console.log("✅ Lock-Extras gesetzt: ' + group + '");\n';
      code2 += '}catch(e){console.error("❌ Lock-Extras:",e.message);}\n})();';
      bcSend({ type: 'EXEC', code: code2 });
    }, 1500);
  }

  setTimeout(scanLocks, hasExtras ? 3000 : 1600);
}

// FuSam-Mod /lock command — fallback for timer/PW locks that server-validation strips on EXEC
// Format: /lock "MEMBER_NUMBER" LOCK_INDEX  (index = 1-based position in _APPLY_LOCK_TYPES)
function applyFusamLock(mk, group) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const panel = document.getElementById('lockApply-' + mk + '-' + group);
  if (!panel) return;
  const lockType = panel.querySelector('.lk-apply-type')?.value;
  if (!lockType) { showStatus('⚠️ Kein Lock-Typ ausgewählt', 'info'); return; }
  const lockIdx = _APPLY_LOCK_TYPES.findIndex(function(o){ return o.v === lockType; }) + 1;
  if (!lockIdx) { showStatus('❌ Lock-Typ nicht gefunden', 'error'); return; }
  const mkNum = parseInt(mk);
  const cmd = '/lock "' + mkNum + '" ' + lockIdx;
  const code = '(function(){'
    + 'try{'
    + 'var _cmd=' + JSON.stringify(cmd) + ';'
    + 'if(typeof ChatRoomSendChat==="function"){ChatRoomSendChat(_cmd);}'
    + 'else{ServerSend("ChatRoomChat",{Type:"Chat",Content:_cmd});}'
    + 'console.log("FuSam /lock gesendet:",_cmd);'
    + '}catch(e){console.error("FuSam error:",e.message);}'
    + '})();';
  bcSend({ type: 'EXEC', code });
  showStatus('📩 FuSam: ' + cmd, 'info');
  _locksApplyOpen = null;
  setTimeout(scanLocks, 2000);
}

// Edit actions ────────────────────────────────────────
function toggleLockEdit(mk, group) {
  const key = mk + ':' + group;
  _locksEditOpen = (_locksEditOpen === key) ? null : key;
  renderLocksTab();
  _startLocksTimer();
}

function applyLockEdit(mk, group) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const panel = document.getElementById('lockEdit-' + mk + '-' + group);
  if (!panel) return;

  const hEl        = panel.querySelector('.lk-edit-h');
  const mEl        = panel.querySelector('.lk-edit-m');
  const pwEl       = panel.querySelector('.lk-edit-pw');
  const hintEl     = panel.querySelector('.lk-edit-hint');
  const comboEl    = panel.querySelector('.lk-edit-combo');
  const keyHolderEl   = panel.querySelector('.lk-edit-keyholder');

  const timerSec   = (hEl && mEl) ? (parseInt(hEl.value || 0) * 3600 + parseInt(mEl.value || 0) * 60) : null;
  const newPw      = pwEl        ? pwEl.value                          : null;
  const newHint    = hintEl      ? hintEl.value                        : null;
  const newCombo   = comboEl     ? comboEl.value                       : null;
  const newKH         = keyHolderEl ? parseInt(keyHolderEl.value || 0) : null;

  // Only set timer if > 0 — 0:0 would expire immediately
  const wantsTimer = (timerSec != null && timerSec > 0);
  const hasPw      = newPw    != null;
  const hasHint    = newHint  != null;
  const hasCombo   = newCombo != null;

  const wantsKH      = (newKH != null && newKH > 0);
  if (!wantsTimer && !hasPw && !hasHint && !hasCombo && !wantsKH) {
    showStatus('⚠️ Nichts zu ändern (Timer muss > 0 sein)', 'info'); return;
  }

  const mkNum  = parseInt(mk);
  const expMs  = wantsTimer ? (Date.now() + timerSec * 1000) : 0;

  // KEY: No CharacterRefresh here — the lock type isn't changing, only its parameters.
  // CharacterRefresh calls the lock's ExtendedItem Init which specifically resets
  // Property.Password (and potentially other fields) back to defaults.  Skipping it
  // avoids the reset.  The sync functions below handle server + room visibility.
  let code = '(function(){\ntry{\n';
  code += 'var C=(ChatRoomCharacter||[]).find(function(c){return c.MemberNumber===' + mkNum + ';});\n';
  code += 'if(!C&&Player.MemberNumber===' + mkNum + ')C=Player;\n';
  code += 'if(!C){throw new Error("Char #' + mkNum + ' nicht gefunden");}\n';
  code += 'var _item=InventoryGet(C,' + JSON.stringify(group) + ');\n';
  code += 'if(!_item||!_item.Property){throw new Error("Item/' + group + ' nicht gefunden");}\n';
  // Set desired properties directly — no CharacterRefresh to avoid property reset
  if (wantsTimer) {
    // RemoveTimer = epoch ms (NOT seconds!) — same as TimerReal
    code += '_item.Property.TimerReal=' + expMs + ';\n';
    code += '_item.Property.RemoveTimer=' + expMs + ';\n';
    code += '_item.Property.ShowTimer=true;\n';
  }
  if (hasPw    && newPw    !== null) code += '_item.Property.Password=' + JSON.stringify(newPw) + ';\n';
  if (hasHint  && newHint  !== null) code += '_item.Property.Hint=' + JSON.stringify(newHint) + ';\n';
  if (hasCombo && newCombo !== null) code += '_item.Property.CombinationNumber=' + JSON.stringify(newCombo) + ';\n';
  if (newKH && newKH > 0) {
    code += '_item.Property.LockMemberNumber=' + newKH + ';\n';
    code += '_item.Property.MemberNumberListKeys=' + JSON.stringify(String(newKH)) + ';\n';
  }
  // Sync with delay — Self: split AccountUpdate + room broadcast to avoid rate-limit
  code += 'setTimeout(function(){\n';
  code += '  if(C.MemberNumber===Player.MemberNumber){ServerPlayerAppearanceSync();setTimeout(function(){ChatRoomCharacterUpdate(C);},600);}';
  code += '  else{ChatRoomCharacterUpdate(C);}\n';
  code += '},600);\n';
  code += 'console.log("✅ Lock aktualisiert: ' + group + '");\n';
  code += '}catch(e){console.error("❌ Lock-Edit Fehler:",e.message);}\n})();';

  bcSend({ type: 'EXEC', code });
  showStatus('✅ Lock aktualisiert', 'success');
  _locksEditOpen = null;
  setTimeout(scanLocks, 1600);
}

function scanOutfits() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  bcSend({ type: 'GET_OUTFIT_SCAN' });
  bcSend({ type: 'GET_LSCG_OUTFITS' });
  showStatus('⏳ Scanne LSCG Outfits…', 'info');
}

function _handleLscgOutfitsData(data) {
  if (data.err) { console.warn('[BCU] LSCG Outfits:', data.err); return; }
  // Slot-Codes persistieren (damit Badges nach Neustart ohne BC-Verbindung erhalten bleiben)
  let slotsChanged = false;
  for (const [key, info] of Object.entries(data.outfits ?? {})) {
    if (info.code && _lscgSlots[key] !== info.code) {
      _lscgSlots[key] = info.code;
      slotsChanged = true;
    }
  }
  if (slotsChanged) _saveLscgSlots();
  // Fingerprint-Map aus gespeicherten Slots neu aufbauen (non-blocking, da Slots schon gecacht)
  _rebuildFpMapFromSlots();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
}

function _handleOutfitScanData(data) {
  if (data.err) { showStatus('❌ Outfit-Scan: ' + data.err, 'error'); return; }
  const results = data.results ?? [];
  if (!results.length) { if (_activeTab === 'outfit-scan') renderOutfitScanTab(); return; }

  // Phase 1 (synchron, schnell): Einträge anlegen OHNE Fingerprint-Berechnung.
  // So wird die UI nicht blockiert – _computeFilteredFp macht LZString.decompress + JSON.parse
  // für jeden Charakter, was bei 20+ Leuten mehrere Sekunden dauern würde.
  const ts = Date.now();
  const newVersions = []; // { mk, vIdx } – für spätere Fingerprint-Berechnung
  for (const r of results) {
    const mk = String(r.memberNumber);
    if (!LSCG_DB[mk]) LSCG_DB[mk] = { name: r.name, nickname: r.nickname ?? null, versions: [] };
    else { LSCG_DB[mk].name = r.name; LSCG_DB[mk].nickname = r.nickname ?? null; }
    const entry = LSCG_DB[mk];
    if (r.code) {
      // Prüfen ob ein noch-fingerprint-loser Eintrag mit diesem Code schon existiert
      const dup = entry.versions.find(function(v){ return v.code === r.code; });
      if (!dup) {
        entry.versions.push({ code: r.code, fingerprint: null, ts });
        if (entry.versions.length > LSCG_MAX_VERSIONS)
          entry.versions = entry.versions.slice(-LSCG_MAX_VERSIONS);
        newVersions.push({ mk, vIdx: entry.versions.length - 1 });
      }
    }
  }

  // Sofort speichern (mit null-Fingerprints) damit Daten nicht verloren gehen
  _saveLscgDB();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();

  // Phase 2 (asynchron, je 3 Chars pro Tick): Fingerprints berechnen + Dedup
  // Blockiert die UI nicht mehr – der Nutzer sieht sofort die neuen Karten
  if (newVersions.length) {
    const CHUNK = 3;
    function _fpChunk(i) {
      const end = Math.min(i + CHUNK, newVersions.length);
      for (let j = i; j < end; j++) {
        const {mk, vIdx} = newVersions[j];
        const entry = LSCG_DB[mk];
        if (!entry?.versions?.[vIdx]) continue;
        const v = entry.versions[vIdx];
        if (!v.code) continue;
        v.fingerprint = _computeFilteredFp(v.code);
        // Dedup nur für diesen Eintrag nach Fingerprint-Berechnung
        _dedupeVersions(entry);
      }
      if (end < newVersions.length) {
        setTimeout(function(){ _fpChunk(end); }, 0);
      } else {
        _saveLscgDB();
        if (_activeTab === 'outfit-scan') renderOutfitScanTab();
        // Auto-Capture für neue Versionen (Fingerprints sind jetzt bekannt)
        if (_connected && !data._auto) {
          const existingKeys = new Set(_osCaptureQueue.map(function(i) { return i.mk + '|' + i.vIdx; }));
          const toCapture = [];
          newVersions.forEach(function(nv) {
            const versions = LSCG_DB[nv.mk]?.versions;
            if (!Array.isArray(versions)) return;
            const v = versions[nv.vIdx];
            if (!v) return;
            const fp  = v.fingerprint ?? null;
            const key = fp ? (nv.mk + '|' + fp) : nv.mk;
            if (!LSCG_SCREENSHOTS[key] && !existingKeys.has(nv.mk + '|' + nv.vIdx)) {
              toCapture.push(nv);
            }
          });
          if (toCapture.length) {
            for (let i = toCapture.length - 1; i >= 0; i--) _osCaptureQueue.unshift(toCapture[i]);
            if (!_osCaptureRunning) _runNextOsCapture();
          }
        }
      }
    }
    setTimeout(function(){ _fpChunk(0); }, 0);
  }

  // Auto-Capture: nur bei MANUELLEM Scan, nach Fingerprint-Berechnung (Phase 2)
  // Wird am Ende von _fpChunk ausgelöst wenn Fingerprints bekannt sind
  if (_connected && !data._auto && newVersions.length === 0) {
    // Keine neuen Versionen → direkt Screenshots prüfen
    const existingKeys = new Set(_osCaptureQueue.map(function(i) { return i.mk + '|' + i.vIdx; }));
    const toCapture = [];
    results.forEach(function(r) {
      const mk = String(r.memberNumber);
      const versions = LSCG_DB[mk]?.versions;
      if (!Array.isArray(versions)) return;
      versions.forEach(function(v, vIdx) {
        const fp  = v?.fingerprint ?? null;
        const key = fp ? (mk + '|' + fp) : mk;
        if (!LSCG_SCREENSHOTS[key] && !existingKeys.has(mk + '|' + vIdx)) {
          toCapture.push({ mk, vIdx });
        }
      });
    });
    if (toCapture.length) {
      for (let i = toCapture.length - 1; i >= 0; i--) _osCaptureQueue.unshift(toCapture[i]);
      if (!_osCaptureRunning) _runNextOsCapture();
    }
  }

  showStatus('✅ ' + (data.room ?? '') + ': ' + results.length + ' Chars gescannt', data._auto ? 'info' : 'success');
}

// Item-Anzahl aus LZString-Code berechnen
// Cache: fingerprint/key → item count (LZString+JSON.parse nur einmalig pro Version)
const _itemCountCache = {};
function _osItemCount(code, cacheKey) {
  if (!code) return 0;
  const k = cacheKey || code.slice(0, 32);
  if (_itemCountCache[k] !== undefined) return _itemCountCache[k];
  try {
    const n = JSON.parse(LZString.decompressFromBase64(code)).length;
    _itemCountCache[k] = n;
    return n;
  } catch(e) { _itemCountCache[k] = 0; return 0; }
}

function renderOutfitScanTab() {
  const body = document.getElementById('outfitScanBody');
  if (!body) return;

  const searchEl = document.getElementById('osSearchInput');
  if (searchEl && document.activeElement !== searchEl) searchEl.value = _osSearchQuery;

  // Nur Einträge mit gültigem versions-Array
  let members = Object.keys(LSCG_DB).filter(function(mk) {
    return LSCG_DB[mk] && Array.isArray(LSCG_DB[mk].versions) && LSCG_DB[mk].versions.length > 0;
  });

  if (!members.length) {
    body.innerHTML = '<div class="os-empty">Noch keine Outfits gespeichert.<br>Automatischer Scan beim Raum-Beitritt, oder ▶ Jetzt scannen.</div>';
    return;
  }

  if (_osSearchQuery) {
    members = members.filter(function(mk) {
      const e = LSCG_DB[mk];
      const h = ((e.name ?? '') + ' ' + (e.nickname ?? '') + ' ' + mk).toLowerCase();
      return h.includes(_osSearchQuery);
    });
    if (!members.length) {
      body.innerHTML = '<div class="os-empty">Keine Ergebnisse f\xfcr „' + escHtml(_osSearchQuery) + '“</div>';
      return;
    }
  }

  members.sort(function(a, b) {
    const fa = _osFavs.has(a), fb = _osFavs.has(b);
    if (fa !== fb) return fa ? -1 : 1;
    return (LSCG_DB[a].name ?? '').localeCompare(LSCG_DB[b].name ?? '');
  });

  // Hilfsfunktion: einen Member-Block als HTML-String bauen
  function _buildMemberHtml(mk) {
    const entry = LSCG_DB[mk];
    const isFav = _osFavs.has(mk);
    const letter = escHtml(((entry.name ?? mk)[0] ?? '?').toUpperCase());

    const cards = [...entry.versions].reverse().map(function(v, i) {
      const realIdx  = entry.versions.length - 1 - i;
      const vNum     = entry.versions.length - i;
      const d        = new Date(v.ts);
      const ts       = d.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' });
      const fp       = v.fingerprint;
      const itemCnt  = _osItemCount(v.code, fp || (mk + '_' + realIdx));
      const saved    = (fp && _lscgFpMap[fp]) ? _lscgFpMap[fp] : [];
      const hasCode  = !!v.code;
      // Strict lookup: only version-specific key, never the legacy mk fallback
      const vKey     = fp ? (mk + '|' + fp) : mk;
      const vThumb   = LSCG_SCREENSHOTS[vKey] || null;
      const isBroken = !!_osBrokenCodes[vKey];
      const tagHtml  = saved.length
        ? '<span class="os-card-tag saved" title="' + saved.map(function(k){return escHtml(k);}).join(', ') + '">✅ PROFIL</span>'
        : '<span class="os-card-tag">v' + vNum + '</span>';
      const thumbContent = vThumb
        ? '<img src="' + escHtml(vThumb) + '" alt="">'
        : (isBroken
            ? '<div class="os-card-placeholder broken">⚠️</div>'
            : '<div class="os-card-placeholder">' + letter + '</div>');
      const delBtn = vThumb
        ? '<button class="os-card-del" onclick="event.stopPropagation();deleteOsScreenshotKey(\'' + vKey + '\')" title="Bild löschen">🗑</button>'
        : '';
      const hintIcon = vThumb
        ? '<span class="os-card-hint">🔍</span>'
        : (isBroken ? '<span class="os-card-hint">🔧</span>' : '<span class="os-card-hint">📸</span>');
      const thumbClick = vThumb
        ? 'openOsLightboxVersion(\'' + mk + '\',' + realIdx + ')'
        : (isBroken
            ? 'openRepairOsCode(\'' + mk + '\',' + realIdx + ')'
            : 'captureOsScreenshot(\'' + mk + '\',' + realIdx + ');showStatus(\'📸 Bild wird aufgenommen…\',\'info\')');
      const metaLabel = isBroken
        ? '<span style="color:#f87171">⚠️ Decode-Fehler</span>'
        : (hasCode ? itemCnt + ' Items' : '⚠ kein Code');
      const repairBtn = (isBroken && hasCode)
        ? '<button class="os-card-btn warn" onclick="openRepairOsCode(\'' + mk + '\',' + realIdx + ')" title="Korrekten Code einfügen">🔧 Repair</button>'
        : '';

      return '<div class="os-card' + (isBroken ? ' os-card-broken' : '') + '">'
        + '<div class="os-card-thumb" onclick="' + thumbClick + '">'
        + thumbContent + tagHtml
        + '<button class="os-card-fav' + (isFav ? ' on' : '') + '" onclick="event.stopPropagation();toggleOsFav(\'' + mk + '\')">' + (isFav ? '⭐' : '☆') + '</button>'
        + delBtn + hintIcon
        + '</div>'
        + '<div class="os-card-name">v' + vNum + (i === 0 ? ' <span style="font-size:.6rem;color:var(--green)">neu</span>' : '') + '</div>'
        + '<div class="os-card-meta">' + metaLabel + ' · ' + ts + '</div>'
        + '<div class="os-card-actions">'
        + repairBtn
        + (!isBroken && hasCode ? '<button class="os-card-btn primary" onclick="osApplyOutfit(\'' + mk + '\',' + realIdx + ')">▶ Run</button>' : '')
        + (!isBroken && hasCode ? '<button class="os-card-btn" onclick="osCopyCode(\'' + mk + '\',' + realIdx + ')" title="Code in Zwischenablage">📋</button>' : '')
        + '<button class="os-card-btn' + (isFav ? ' fav-on' : '') + '" onclick="toggleOsFav(\'' + mk + '\')">' + (isFav ? '⭐' : '☆') + '</button>'
        + (!isBroken && hasCode ? '<button class="os-card-btn" onclick="osSaveOutfitAsProfile(\'' + mk + '\',' + realIdx + ')" title="Als Profil speichern">💾</button>' : '')
        + '<button class="os-card-btn danger" onclick="deleteLscgVersion(\'' + mk + '\',' + realIdx + ')" title="Version löschen">🗑</button>'
        + '</div>'
        + '</div>';
    }).join('');

    const nameHtml = escHtml(entry.name ?? mk)
      + (entry.nickname ? ' <span class="os-member-nick">„' + escHtml(entry.nickname) + '“</span>' : '');

    return '<div class="os-member-block open' + (isFav ? ' os-fav' : '') + '" id="osm_' + escHtml(mk) + '">'
      + '<div class="os-member-hdr" onclick="toggleOsMember(\'' + mk + '\')">'
      + '<span class="os-member-name">' + nameHtml + '</span>'
      + '<span class="os-member-num">#' + escHtml(mk) + '</span>'
      + '<span class="os-member-vcnt">' + entry.versions.length + 'x</span>'
      + '<button class="os-member-fav' + (isFav ? ' on' : '') + '" onclick="event.stopPropagation();toggleOsFav(\'' + mk + '\')">' + (isFav ? '⭐' : '☆') + '</button>'
      + '<span class="os-member-chevron">▶</span>'
      + '</div>'
      + '<div class="os-member-rows"><div class="os-strip">' + cards + '</div></div>'
      + '</div>';
  }

  // Erst die ersten 30 sofort rendern, Rest via setTimeout nachladen
  // → Main-Thread bleibt responsiv, kein 5s-Freeze bei großen DBs
  const CHUNK = 30;
  try {
    body.innerHTML = members.slice(0, CHUNK).map(_buildMemberHtml).join('');
    if (members.length > CHUNK) {
      const rest = members.slice(CHUNK);
      let i = 0;
      function _renderChunk() {
        const slice = rest.slice(i, i + CHUNK);
        if (!slice.length) return;
        body.insertAdjacentHTML('beforeend', slice.map(_buildMemberHtml).join(''));
        i += CHUNK;
        if (i < rest.length) setTimeout(_renderChunk, 0);
      }
      setTimeout(_renderChunk, 0);
    }
  } catch(err) {
    console.error('[BCU] renderOutfitScanTab error:', err);
    body.innerHTML = '<div class="os-empty" style="color:#fb7185">⚠ Render-Fehler: ' + err.message + '</div>';
  }
}

function toggleOsMember(mk) {
  const el = document.getElementById('osm_' + mk);
  if (el) el.classList.toggle('open');
}

// Thumbnail-Klick: Lightbox wenn Bild vorhanden, sonst Capture starten
function osThumbClick(mk) {
  if (_getLscgScreenshot(mk)) {
    openOsLightbox(mk);
  } else {
    captureOsScreenshot(mk);
    showStatus('📸 Bild wird aufgenommen…', 'info');
  }
}

// Lightbox (Gro\xdfansicht im Tool)
let _osLightboxMk  = null;
let _osLightboxKey = null;  // version-specific key (mk|fp) or null

function openOsLightbox(mk) {
  const img = _getLscgScreenshot(mk);
  if (!img) return;
  const entry = LSCG_DB[mk];
  _osLightboxMk  = mk;
  _osLightboxKey = null;
  document.getElementById('osLbImg').src   = img;
  document.getElementById('osLbName').textContent = entry ? (entry.name ?? mk) : mk;
  document.getElementById('osLbSub').textContent  = '#' + mk + (entry?.nickname ? ' · „' + entry.nickname + '”' : '');
  document.getElementById('osLightbox').classList.add('open');
}

function openOsLightboxVersion(mk, vIdx) {
  const v   = LSCG_DB[mk]?.versions?.[vIdx];
  const fp  = v?.fingerprint ?? null;
  const key = fp ? (mk + '|' + fp) : mk;
  const img = LSCG_SCREENSHOTS[key] || _getLscgScreenshot(mk, fp);
  if (!img) return;
  const entry = LSCG_DB[mk];
  const d   = v?.ts ? new Date(v.ts) : null;
  const dateStr = d ? d.toLocaleDateString('de-DE') : '';
  _osLightboxMk  = mk;
  _osLightboxKey = key;
  document.getElementById('osLbImg').src   = img;
  document.getElementById('osLbName').textContent = entry ? (entry.name ?? mk) : mk;
  document.getElementById('osLbSub').textContent  = '#' + mk
    + (entry?.nickname ? ' · „' + entry.nickname + '”' : '')
    + (dateStr ? ' · v' + (vIdx + 1) + ' · ' + dateStr : '');
  document.getElementById('osLightbox').classList.add('open');
}

function closeOsLightbox() {
  document.getElementById('osLightbox').classList.remove('open');
  document.getElementById('osLbImg').src = '';
  _osLightboxMk  = null;
  _osLightboxKey = null;
}

function deleteOsScreenshotFromLb() {
  if (_osLightboxKey) {
    deleteOsScreenshotKey(_osLightboxKey);
  } else if (_osLightboxMk) {
    deleteOsScreenshot(_osLightboxMk);
  }
  closeOsLightbox();
}

// Screenshot löschen (legacy per-member)
function deleteOsScreenshot(mk) {
  if (!LSCG_SCREENSHOTS[mk]) return;
  delete LSCG_SCREENSHOTS[mk];
  _saveLscgScreenshots();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
  showStatus('🗑️ Bild für #' + mk + ' gelöscht', 'info');
}

// Screenshot löschen (version-specific key)
function deleteOsScreenshotKey(key) {
  if (!LSCG_SCREENSHOTS[key]) return;
  delete LSCG_SCREENSHOTS[key];
  _saveLscgScreenshots();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
  showStatus('🗑️ Bild gelöscht', 'info');
}

function saveOutfitToLscg(mk, vIdx) {
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { showStatus('❌ Kein Code vorhanden', 'error'); return; }
  const d = new Date(v.ts);
  const mmdd = String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const safeName = (LSCG_DB[mk]?.name ?? mk).replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 20);
  const key = safeName + '_' + mmdd;
  bcSend({
    type: 'EXEC',
    code: '(function(){try{'
      + 'if(typeof LSCG_OUTFITS==="undefined"){alert("LSCG nicht geladen!");return;}'
      + 'var _r=LSCG_OUTFITS.SetOutfitCode(' + JSON.stringify(key) + ',' + JSON.stringify(v.code) + ');'
      + 'console.log("[BCU] LSCG Save:", ' + JSON.stringify(key) + ', _r===0?"✅":"❌ "+_r);'
      + '}catch(e){console.error("[BCU]",e.message);}})();'
  }, true);
  showStatus('💾 "' + key + '" gespeichert → /lscg wear-outfit ' + key, 'success');
}

function copyLscgOutfitCode(mk, vIdx) {
  const v = LSCG_DB[mk]?.versions?.[vIdx];
  if (!v?.code) { showStatus('❌ Kein Code vorhanden', 'error'); return; }
  navigator.clipboard.writeText(v.code).then(function() { showStatus('📋 Code kopiert!', 'success'); });
}

// Einzelne Version löschen (Code + Screenshot)
function deleteLscgVersion(mk, vIdx) {
  const entry = LSCG_DB[mk];
  if (!entry?.versions?.[vIdx]) return;
  const vNum = entry.versions.length - vIdx;
  const name = entry.name ?? ('#' + mk);
  if (!confirm('Version v' + vNum + ' von ' + name + ' löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) return;
  // Screenshot für diese Version löschen
  const fp  = entry.versions[vIdx]?.fingerprint ?? null;
  const key = fp ? (mk + '|' + fp) : null;
  if (key && LSCG_SCREENSHOTS[key]) {
    delete LSCG_SCREENSHOTS[key];
    _saveLscgScreenshots();
  }
  // Fingerprint-Map bereinigen
  if (fp && _lscgFpMap[fp]) {
    _lscgFpMap[fp] = _lscgFpMap[fp].filter(function(k) { return k !== mk; });
    if (!_lscgFpMap[fp].length) delete _lscgFpMap[fp];
  }
  // Version aus DB entfernen
  entry.versions.splice(vIdx, 1);
  if (!entry.versions.length) {
    // Letzter Eintrag → ganzen Member löschen
    delete LSCG_DB[mk];
  }
  _saveLscgDB();
  renderOutfitScanTab();
  showStatus('🗑️ Version v' + vNum + ' gelöscht', 'info');
}

function clearAllProfileScreenshots() {
  const count = Object.keys(PROFILE_SCREENSHOTS).length;
  if (!count) { showStatus('ℹ️ Keine Profil-Bilder vorhanden', 'info'); return; }
  if (!confirm('Alle ' + count + ' Profil-Screenshots löschen?\n\nDie Profile selbst bleiben erhalten.')) return;
  PROFILE_SCREENSHOTS = {};
  _saveProfileScreenshots();
  renderProfileList();
  showStatus('🗑️ Alle Profil-Screenshots gelöscht', 'info');
}

function clearAllLscgScreenshots() {
  const count = Object.keys(LSCG_SCREENSHOTS).length;
  if (!count) { showStatus('ℹ️ Keine Bilder vorhanden', 'info'); return; }
  if (!confirm('Alle ' + count + ' gespeicherten Bilder löschen?\n\nDie Outfit-Codes bleiben erhalten.')) return;
  LSCG_SCREENSHOTS = {};
  _saveLscgScreenshots();
  if (_activeTab === 'outfit-scan') renderOutfitScanTab();
  showStatus('🗑️ Alle Bilder gelöscht', 'info');
}

function clearAllLscgOutfits() {
  if (!confirm('Alle gespeicherten LSCG-Outfits löschen?\n\nDies löscht alle Codes und Bilder.')) return;
  LSCG_DB = {};
  LSCG_SCREENSHOTS = {};
  _lscgSlots = {};
  _lscgFpMap = {};
  _saveLscgDB();
  _saveLscgScreenshots();
  _saveLscgSlots();
  renderOutfitScanTab();
  showStatus('🗑️ LSCG Outfits geleert', 'info');
}

// ════════════════════════════════════════════════════════════════
//  FEATURE BLOCK: Tags · Quick-Switch · Stats · Color Tools
// ════════════════════════════════════════════════════════════════

// ── Feature 4: Profil-Tags ────────────────────────────────────

let PROFILE_TAGS = {};
let _profileTagFilter = null; // null = all, string = tag name

(async () => {
  const saved = await idbGet('BC_PROFILE_TAGS_v1');
  if (saved && typeof saved === 'object') {
    PROFILE_TAGS = saved;
    _renderProfileTagFilterRow();
  }
})();

function _saveProfileTags() {
  idbSet('BC_PROFILE_TAGS_v1', PROFILE_TAGS);
}

function profileGetTags(name) {
  return Array.isArray(PROFILE_TAGS[name]) ? PROFILE_TAGS[name] : [];
}

function profileAddTag(name, tag) {
  tag = tag.trim().toLowerCase().replace(/\s+/g, '-');
  if (!tag || tag.length > 30) return;
  if (!PROFILE_TAGS[name]) PROFILE_TAGS[name] = [];
  if (PROFILE_TAGS[name].includes(tag)) return;
  PROFILE_TAGS[name].push(tag);
  _saveProfileTags();
  _renderProfileTagFilterRow();
  _renderPmodTags(name);
}

function profileRemoveTag(name, tag) {
  if (!PROFILE_TAGS[name]) return;
  PROFILE_TAGS[name] = PROFILE_TAGS[name].filter(t => t !== tag);
  if (!PROFILE_TAGS[name].length) delete PROFILE_TAGS[name];
  _saveProfileTags();
  _renderProfileTagFilterRow();
  _renderPmodTags(name);
}

function profileAddTagFromModal() {
  const inp = document.getElementById('pmodTagInput');
  if (!inp || !_profileModalName) return;
  profileAddTag(_profileModalName, inp.value);
  inp.value = '';
}

function _renderPmodTags(name) {
  const row = document.getElementById('pmodTagsRow');
  if (!row) return;
  const tags = profileGetTags(name);
  row.innerHTML = tags.length
    ? tags.map(t => `<span class="profile-tag">${escHtml(t)} <span class="tag-del" onclick="profileRemoveTag(${JSON.stringify(name)},${JSON.stringify(t)})" title="Entfernen">✕</span></span>`).join('')
    : '<span style="color:var(--text3);font-size:.68rem">Keine Tags</span>';
}

function _allUsedTags() {
  const all = new Set();
  Object.values(PROFILE_TAGS).forEach(tags => tags.forEach(t => all.add(t)));
  return [...all].sort();
}

function setProfileTagFilter(tag) {
  _profileTagFilter = (_profileTagFilter === tag) ? null : tag;
  _renderProfileTagFilterRow();
  renderProfileList();
}

function _renderProfileTagFilterRow() {
  const row = document.getElementById('profileTagFilterRow');
  if (!row) return;
  const tags = _allUsedTags();
  if (!tags.length) { row.innerHTML = ''; return; }
  row.innerHTML = tags.map(t =>
    `<span class="tag-filter-chip${_profileTagFilter === t ? ' on' : ''}" onclick="setProfileTagFilter(${JSON.stringify(t)})">#${escHtml(t)}</span>`
  ).join('');
}

// ── Extend renderProfileList with tag + item full-text search ──
// Monkey-patch: store original and wrap with extended filter
const _origRenderProfileList = renderProfileList;
renderProfileList = function() {
  // Intercept only the key filter — rebuild from scratch inline
  const el = document.getElementById('profileListEl');
  if (!el) { _origRenderProfileList(); return; }

  const q = (document.getElementById('profileSearch')?.value || '').toLowerCase();
  let keys = Object.keys(PROFILES).filter(k => {
    if (!q) return true;
    // name match
    if (k.toLowerCase().includes(q)) return true;
    // item match
    const items = PROFILES[k]?.items || [];
    if (items.some(it => (it.asset||'').toLowerCase().includes(q) || (it.group||'').toLowerCase().includes(q))) return true;
    // tag match
    if (profileGetTags(k).some(t => t.includes(q))) return true;
    return false;
  });

  // Existing filters
  if (_profileFilter === 'fav')      keys = keys.filter(k => PROFILE_FAVS.has(k));
  if (_profileFilter === 'withshot') keys = keys.filter(k => !!PROFILE_SCREENSHOTS[k]);
  if (_profileFilter === 'noshot')   keys = keys.filter(k => !PROFILE_SCREENSHOTS[k]);
  if (_profileFilter === 'noold')    keys = keys.filter(k => !/\(old\)/i.test(_profileOwnerOf(k)));

  // Tag filter
  if (_profileTagFilter) keys = keys.filter(k => profileGetTags(k).includes(_profileTagFilter));

  document.querySelectorAll('.profile-fc').forEach(chip => chip.classList.toggle('on', chip.dataset.filter === _profileFilter));

  // Delegate rendering back to original by temporarily storing filtered keys
  // Actually call original — it will re-filter, but we control display via CSS none if needed.
  // Simpler: override keys in _profileNameMap by calling original (it re-reads from DOM)
  // Since we can't cleanly inject, call original which re-reads the search input.
  // Instead, if tag or item filter active just hide non-matching cards after render.
  _origRenderProfileList();

  // Post-filter by tag + item search after original renders
  if (!q && !_profileTagFilter) return;
  const allowedSet = new Set(keys);
  // Hide owner blocks that have no matching cards
  document.querySelectorAll('[id^="pb_"]').forEach(block => {
    const thumbs = block.querySelectorAll('.pc-thumb[data-slot]');
    let any = false;
    thumbs.forEach(th => {
      const name = _profileNameMap[th.dataset.slot];
      const show = name && allowedSet.has(name);
      const pc = th.closest('.pc');
      if (pc) pc.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    block.style.display = any ? '' : 'none';
  });
};

// Extend _renderProfileModal to also render tags
const _origRenderProfileModal = _renderProfileModal;
_renderProfileModal = function(name) {
  _origRenderProfileModal(name);
  _renderPmodTags(name);
};

// ── Feature 6 + 7: Statistiken ───────────────────────────────

let _statsCurrentTab = 'items';

function openStatsModal() {
  document.getElementById('statsModal')?.classList.add('open');
  statsShowTab('items', document.querySelector('.stats-tab-btn'));
}

function closeStatsModal() {
  document.getElementById('statsModal')?.classList.remove('open');
}

function statsShowTab(tab, btn) {
  _statsCurrentTab = tab;
  document.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
  _renderStatsContent(tab);
}

function _renderStatsContent(tab) {
  const el = document.getElementById('statsContent');
  if (!el) return;
  if (tab === 'items')  { el.innerHTML = _buildItemStats(); return; }
  if (tab === 'groups') { el.innerHTML = _buildGroupStats(); return; }
  if (tab === 'colors') { el.innerHTML = _buildColorStats(); return; }
}

function _buildItemStats() {
  const counts = {};
  Object.values(PROFILES).forEach(p => {
    (p.items || []).forEach(it => {
      const key = it.asset || it.group || '?';
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 40);
  if (!sorted.length) return '<p style="color:var(--text3)">Keine Profil-Daten vorhanden.</p>';
  const max = sorted[0][1];
  return '<div style="display:flex;flex-direction:column;gap:3px">'
    + sorted.map(([name, cnt], i) => `
      <div class="stats-row">
        <span class="stats-rank">#${i+1}</span>
        <span class="stats-label">${escHtml(name)}</span>
        <div class="stats-bar-wrap"><div class="stats-bar" style="width:${Math.round(cnt/max*100)}%"></div></div>
        <span class="stats-count">${cnt}×</span>
      </div>`).join('')
    + '</div>';
}

function _buildGroupStats() {
  const counts = {};
  Object.values(PROFILES).forEach(p => {
    (p.items || []).forEach(it => {
      const key = it.group || '?';
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 30);
  if (!sorted.length) return '<p style="color:var(--text3)">Keine Profil-Daten vorhanden.</p>';
  const max = sorted[0][1];
  return '<div style="display:flex;flex-direction:column;gap:3px">'
    + sorted.map(([grp, cnt], i) => `
      <div class="stats-row">
        <span class="stats-rank">#${i+1}</span>
        <span class="stats-label">${escHtml(grp)}</span>
        <div class="stats-bar-wrap"><div class="stats-bar" style="width:${Math.round(cnt/max*100)}%;background:var(--blue)"></div></div>
        <span class="stats-count">${cnt}×</span>
      </div>`).join('')
    + '</div>';
}

function _buildColorStats() {
  const counts = {};
  Object.values(PROFILES).forEach(p => {
    (p.items || []).forEach(it => {
      const colors = Array.isArray(it.colors) ? it.colors : (it.colors ? [it.colors] : []);
      colors.forEach(c => {
        if (!c || c === 'Default') return;
        const hex = c.toLowerCase();
        counts[hex] = (counts[hex] || 0) + 1;
      });
    });
  });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 50);
  if (!sorted.length) return '<p style="color:var(--text3)">Keine Farbdaten vorhanden.</p>';
  const max = sorted[0][1];
  return '<div style="display:flex;flex-direction:column;gap:3px">'
    + sorted.map(([hex, cnt], i) => `
      <div class="stats-row">
        <span class="stats-rank">#${i+1}</span>
        <span class="stats-color-swatch" style="background:${escHtml(hex)}" title="${escHtml(hex)}"></span>
        <span class="stats-label" style="font-family:var(--font-mono);font-size:.7rem">${escHtml(hex)}</span>
        <div class="stats-bar-wrap"><div class="stats-bar" style="width:${Math.round(cnt/max*100)}%;background:${escHtml(hex)}"></div></div>
        <span class="stats-count">${cnt}×</span>
      </div>`).join('')
    + '</div>';
}

// ── Feature 1: Benutzerdefinierte Farbpaletten ────────────────

let USER_COLOR_THEMES = [];
try {
  USER_COLOR_THEMES = JSON.parse(localStorage.getItem('BC_USER_COLOR_THEMES_v1') || '[]');
  if (!Array.isArray(USER_COLOR_THEMES)) USER_COLOR_THEMES = [];
} catch { USER_COLOR_THEMES = []; }

function _saveUserColorThemes() {
  try { localStorage.setItem('BC_USER_COLOR_THEMES_v1', JSON.stringify(USER_COLOR_THEMES)); } catch {}
}

function _cfreqSaveAsUserTheme() {
  const name = prompt('Name für diese Farbpalette:', 'Meine Farben');
  if (!name?.trim()) return;
  const colors = Object.values(_cfreqChanges);
  if (!colors.length) {
    // collect current colors from global rows
    const hexInputs = document.querySelectorAll('#cfreq-content .cfreq-hex-inp');
    hexInputs.forEach(inp => { if (inp.value && inp.value !== inp.dataset.orig) colors.push(inp.value); });
    // fallback: collect all current hex values
    if (!colors.length) document.querySelectorAll('#cfreq-content .cfreq-hex-inp').forEach(inp => colors.push(inp.value));
  }
  const unique = [...new Set(colors.filter(c => /^#[0-9a-f]{6}$/i.test(c)))].slice(0, 8);
  if (!unique.length) { showStatus('⚠️ Keine Farben zum Speichern', 'error'); return; }
  const id = 'user_' + Date.now();
  USER_COLOR_THEMES.push({ id, icon: '🎨', name: name.trim(), colors: unique, user: true });
  _saveUserColorThemes();
  showStatus('✅ Farbpalette "' + name.trim() + '" gespeichert', 'success');
  // Re-render theme grid
  const grid = document.querySelector('.cfreq-theme-grid');
  if (grid) grid.innerHTML = _buildThemeGridHtml();
}

function _cfreqDeleteUserTheme(id) {
  if (!confirm('Farbpalette löschen?')) return;
  USER_COLOR_THEMES = USER_COLOR_THEMES.filter(t => t.id !== id);
  _saveUserColorThemes();
  const grid = document.querySelector('.cfreq-theme-grid');
  if (grid) grid.innerHTML = _buildThemeGridHtml();
}

function _buildThemeGridHtml() {
  const all = [...CFREQ_THEMES, ...USER_COLOR_THEMES];
  return all.map(th => {
    const swatches = th.colors.map(c => '<span class="cfreq-tswatch" style="background:' + c + '"></span>').join('');
    const delBtn = th.user
      ? '<button class="user-theme-del" onclick="event.stopPropagation();_cfreqDeleteUserTheme(\'' + th.id + '\')" title="Löschen">🗑</button>'
      : '';
    return '<div class="cfreq-theme-card" id="cfreq-tcard-' + th.id + '" onclick="_cfreqSelectTheme(\'' + th.id + '\')" title="' + escHtml(th.name) + '">'
      + '<div class="cfreq-tswatches">' + swatches + '</div>'
      + '<div class="cfreq-tname">' + escHtml(th.icon + ' ' + th.name) + '</div>'
      + delBtn
      + '</div>';
  }).join('');
}

// Extend _cfreqSelectTheme to also look in USER_COLOR_THEMES
const _origCfreqSelectTheme = _cfreqSelectTheme;
_cfreqSelectTheme = function(themeId) {
  const userTh = USER_COLOR_THEMES.find(t => t.id === themeId);
  if (!userTh) { _origCfreqSelectTheme(themeId); return; }
  if (_cfreqActiveTheme && _cfreqActiveTheme.id === themeId) {
    _cfreqActiveTheme = null;
    document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
    _cfreqRenderThemeEditor();
    return;
  }
  _cfreqActiveTheme = { id: themeId, name: userTh.name, icon: userTh.icon,
    colors: [...userTh.colors], selected: userTh.colors.map(() => true) };
  document.querySelectorAll('.cfreq-theme-card').forEach(c => c.classList.remove('active'));
  document.getElementById('cfreq-tcard-' + themeId)?.classList.add('active');
  _cfreqRenderThemeEditor();
};

// Inject extra color tool buttons + panels into a rendered color freq panel container
function _cfreqInjectToolButtons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Rebuild theme grid to include user themes
  const grid = container.querySelector('.cfreq-theme-grid');
  if (grid) grid.innerHTML = _buildThemeGridHtml();
  // Don't inject twice
  if (container.querySelector('#cfreq-gradient-panel')) return;
  const actions = container.querySelector('.cfreq-actions');
  if (!actions) return;
  const extraRow = document.createElement('div');
  extraRow.className = 'cfreq-act-row';
  extraRow.style.marginTop = '4px';
  extraRow.innerHTML =
    '<button class="btn cfreq-act-btn" onclick="_cfreqSaveAsUserTheme()" title="Aktuelle Farben als eigene Palette speichern">💾 Palette speichern</button>' +
    '<button class="btn cfreq-act-btn" onclick="_cfreqToggleGradientPanel()" title="Farbverlauf generieren">🌈 Verlauf</button>' +
    '<button class="btn cfreq-act-btn" onclick="_cfreqToggleHarmonyPanel()" title="Harmonische Farben vorschlagen">🔮 Harmonien</button>';
  actions.appendChild(extraRow);

  const gradPanel = document.createElement('div');
  gradPanel.id = 'cfreq-gradient-panel';
  gradPanel.className = 'ctool-panel';
  gradPanel.style.display = 'none';
  gradPanel.innerHTML =
    '<div class="ctool-label">🌈 Farbverlauf-Generator</div>' +
    '<div class="ctool-row">' +
      'Von: <input type="color" id="cfreqGradFrom" value="#ff0000" oninput="_cfreqRenderGradient()" style="width:34px;height:26px;padding:1px;border:1px solid var(--border);border-radius:4px;cursor:pointer">' +
      '<input class="ctool-small-inp" id="cfreqGradFromHex" value="#ff0000" maxlength="7" oninput="document.getElementById(\'cfreqGradFrom\').value=this.value;_cfreqRenderGradient()">' +
      'Bis: <input type="color" id="cfreqGradTo" value="#0000ff" oninput="_cfreqRenderGradient()" style="width:34px;height:26px;padding:1px;border:1px solid var(--border);border-radius:4px;cursor:pointer">' +
      '<input class="ctool-small-inp" id="cfreqGradToHex" value="#0000ff" maxlength="7" oninput="document.getElementById(\'cfreqGradTo\').value=this.value;_cfreqRenderGradient()">' +
      'N: <input class="ctool-n-inp" type="number" id="cfreqGradN" value="5" min="2" max="16" oninput="_cfreqRenderGradient()">' +
    '</div>' +
    '<div id="cfreqGradSwatches" class="ctool-swatch-row"></div>' +
    '<div style="display:flex;gap:6px;margin-top:5px">' +
      '<button class="btn cfreq-act-btn" onclick="_cfreqAutoFillGradient()" title="Dunkelste + hellste Outfit-Farbe automatisch erkennen">🎯 Aus Outfit</button>' +
      '<button class="btn btn-primary cfreq-act-btn" onclick="_cfreqApplyGradient()" title="Verlauf auf alle Outfit-Farben proportional mappen">✅ Übernehmen</button>' +
      '<span style="font-size:.62rem;color:var(--text3);align-self:center">Klick auf Farbe → Zwischenablage</span>' +
    '</div>';
  actions.after(gradPanel);

  const harmPanel = document.createElement('div');
  harmPanel.id = 'cfreq-harmony-panel';
  harmPanel.className = 'ctool-panel';
  harmPanel.style.display = 'none';
  harmPanel.innerHTML =
    '<div class="ctool-label">🔮 Komplementär-Vorschläge</div>' +
    '<div class="ctool-row">' +
      'Basisfarbe: <input type="color" id="cfreqHarmBase" value="#3b82f6" oninput="_cfreqRenderHarmony()" style="width:34px;height:26px;padding:1px;border:1px solid var(--border);border-radius:4px;cursor:pointer">' +
      '<input class="ctool-small-inp" id="cfreqHarmBaseHex" value="#3b82f6" maxlength="7" oninput="document.getElementById(\'cfreqHarmBase\').value=this.value;_cfreqRenderHarmony()">' +
    '</div>' +
    '<div id="cfreqHarmSwatches" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px"></div>';
  gradPanel.after(harmPanel);
}

// Patch toggleOutfitColorFreq to inject tools after render
const _origToggleOutfitColorFreq = toggleOutfitColorFreq;
toggleOutfitColorFreq = function() {
  _origToggleOutfitColorFreq();
  if (document.getElementById('outfitColorFreqPanel')?.style.display !== 'none') {
    _cfreqInjectToolButtons('outfitColorFreqPanel');
  }
};

// Patch refreshOutfitColorFreq similarly
const _origRefreshOutfitColorFreq = refreshOutfitColorFreq;
refreshOutfitColorFreq = function() {
  _origRefreshOutfitColorFreq();
  _cfreqInjectToolButtons('outfitColorFreqPanel');
};

// Patch _refreshPmodColorFreq to inject tools after render
const _origRefreshPmodColorFreq = _refreshPmodColorFreq;
_refreshPmodColorFreq = function() {
  _origRefreshPmodColorFreq();
  if (document.getElementById('pmodColorFreqPanel')?.style.display !== 'none') {
    _cfreqInjectToolButtons('pmodColorFreqPanel');
  }
};

// ── Feature 2: Farbverlauf-Generator ─────────────────────────

let _cfreqGradPanelOpen = false;
let _cfreqHarmPanelOpen = false;
let _cfreqGradColors = [];

function _cfreqToggleGradientPanel() {
  _cfreqGradPanelOpen = !_cfreqGradPanelOpen;
  const p = document.getElementById('cfreq-gradient-panel');
  if (p) p.style.display = _cfreqGradPanelOpen ? '' : 'none';
  if (_cfreqGradPanelOpen) _cfreqRenderGradient();
}

function _cfreqToggleHarmonyPanel() {
  _cfreqHarmPanelOpen = !_cfreqHarmPanelOpen;
  const p = document.getElementById('cfreq-harmony-panel');
  if (p) p.style.display = _cfreqHarmPanelOpen ? '' : 'none';
  if (_cfreqHarmPanelOpen) _cfreqRenderHarmony();
}

function _lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r, g, b];
}

function _rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
}

function _cfreqRenderGradient() {
  const fromHex = (document.getElementById('cfreqGradFrom')?.value || '#ff0000').toLowerCase();
  const toHex   = (document.getElementById('cfreqGradTo')?.value   || '#0000ff').toLowerCase();
  const n       = Math.max(2, Math.min(16, parseInt(document.getElementById('cfreqGradN')?.value) || 5));
  const fromRgb = _hexToRgb(fromHex), toRgb = _hexToRgb(toHex);
  _cfreqGradColors = Array.from({length: n}, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return _rgbToHex(_lerp(fromRgb[0], toRgb[0], t), _lerp(fromRgb[1], toRgb[1], t), _lerp(fromRgb[2], toRgb[2], t));
  });
  const sw = document.getElementById('cfreqGradSwatches');
  if (sw) sw.innerHTML = _cfreqGradColors.map(c =>
    `<span class="ctool-swatch" style="background:${c}" title="${c}" onclick="navigator.clipboard.writeText('${c}');showStatus('📋 ${c} kopiert','success')"></span>`
  ).join('');
  // sync hex inputs
  const fh = document.getElementById('cfreqGradFromHex');
  const th = document.getElementById('cfreqGradToHex');
  if (fh) fh.value = fromHex;
  if (th) th.value = toHex;
}

// Alle unique Outfit-Farben nach Helligkeit sortiert zurückgeben
function _cfreqOutfitColorsSorted() {
  const colSet = new Set();
  (_cfreqSrcItems || []).forEach(item => {
    const cols = Array.isArray(item.colors) ? item.colors : (item.colors ? [item.colors] : []);
    cols.forEach(c => { if (c && c !== 'Default' && /^#[0-9a-fA-F]{6}$/i.test(c)) colSet.add(c.toLowerCase()); });
  });
  return [...colSet].sort((a, b) => _hexToHsl(a).l - _hexToHsl(b).l);
}

// "🎯 Aus Outfit" — dunkelste + hellste Farbe als Von/Bis, N = Anzahl unique Farben
function _cfreqAutoFillGradient() {
  const cols = _cfreqOutfitColorsSorted();
  if (!cols.length) { showStatus('⚠️ Keine Farben im Outfit/Profil', 'info'); return; }
  const from = cols[0];                       // dunkelste
  const to   = cols[cols.length - 1];         // hellste
  const n    = Math.min(16, cols.length);

  const pFrom = document.getElementById('cfreqGradFrom');
  const pTo   = document.getElementById('cfreqGradTo');
  const hFrom = document.getElementById('cfreqGradFromHex');
  const hTo   = document.getElementById('cfreqGradToHex');
  const nInp  = document.getElementById('cfreqGradN');

  if (pFrom) pFrom.value = from;
  if (pTo)   pTo.value   = to;
  if (hFrom) hFrom.value = from;
  if (hTo)   hTo.value   = to;
  if (nInp)  nInp.value  = n;

  _cfreqRenderGradient();
  showStatus('🎯 ' + n + ' Farben erkannt · dunkelste → hellste vorausgefüllt', 'success');
}

// Verlauf auf Outfit-Farben anwenden (nach Helligkeit sortiert → Verlauf proportional gemappt)
function _cfreqApplyGradient() {
  if (!_cfreqGradColors.length) { _cfreqRenderGradient(); }

  const outfitCols = _cfreqOutfitColorsSorted();

  if (outfitCols.length) {
    // Smart-Modus: Outfit-Farben nach Helligkeit sortiert → jeder Farbe eine Verlaufsfarbe zuweisen
    const grad = _cfreqGradColors;
    _cfreqChanges = {}; _cfreqItemChanges = {};
    _cfreqLinked = new Set(); _cfreqLinkedShift = new Set();
    _cfreqLinkedItems = new Set(); _cfreqLinkedItemsShift = new Set();
    outfitCols.forEach((hex, i) => {
      // Position im Verlauf proportional zur Position in der sortierten Liste
      const t = outfitCols.length === 1 ? 0 : i / (outfitCols.length - 1);
      const gradIdx = Math.round(t * (grad.length - 1));
      _cfreqChanges[hex] = grad[gradIdx];
    });
    // UI neu rendern damit die Änderungen sichtbar sind
    const content = document.getElementById('cfreq-content');
    if (content) {
      content.innerHTML = (_cfreqViewMode === 'global')
        ? _renderGlobalRows(_getColorFreq(_cfreqSrcItems || []))
        : _renderItemRows(_cfreqSrcItems || []);
    }
    showStatus('🌈 Verlauf auf ' + outfitCols.length + ' Outfit-Farbe' + (outfitCols.length !== 1 ? 'n' : '') + ' gemappt', 'success');
  } else {
    // Fallback: einfach die ersten N globalen Hex-Zeilen patchen
    const hexInps = document.querySelectorAll('#cfreq-content .cfreq-hex-inp');
    _cfreqGradColors.forEach((color, i) => {
      const inp = hexInps[i];
      if (!inp) return;
      inp.value = color;
      _cfreqHexCommit(inp);
    });
    showStatus('🌈 Verlauf übernommen (' + _cfreqGradColors.length + ' Farben)', 'success');
  }
}

// ── Feature 3: Komplementär-Vorschlag ────────────────────────

function _cfreqRenderHarmony() {
  const baseHex = (document.getElementById('cfreqHarmBase')?.value || '#3b82f6').toLowerCase();
  const bh = document.getElementById('cfreqHarmBaseHex');
  if (bh) bh.value = baseHex;

  const hsl = _hexToHsl(baseHex);
  const harmonies = [
    { label: 'Komplementär', colors: [baseHex, _hslToHex((hsl.h+180)%360, hsl.s, hsl.l)] },
    { label: 'Triadisch', colors: [baseHex, _hslToHex((hsl.h+120)%360, hsl.s, hsl.l), _hslToHex((hsl.h+240)%360, hsl.s, hsl.l)] },
    { label: 'Analog', colors: [_hslToHex((hsl.h-30+360)%360, hsl.s, hsl.l), baseHex, _hslToHex((hsl.h+30)%360, hsl.s, hsl.l)] },
    { label: 'Split-Kompl.', colors: [baseHex, _hslToHex((hsl.h+150)%360, hsl.s, hsl.l), _hslToHex((hsl.h+210)%360, hsl.s, hsl.l)] },
    { label: 'Heller', colors: [baseHex, _hslToHex(hsl.h, hsl.s, Math.min(0.95, hsl.l+0.2)), _hslToHex(hsl.h, hsl.s, Math.min(0.99, hsl.l+0.4))] },
    { label: 'Dunkler', colors: [_hslToHex(hsl.h, hsl.s, Math.max(0.05, hsl.l-0.3)), _hslToHex(hsl.h, hsl.s, Math.max(0.05, hsl.l-0.15)), baseHex] },
  ];

  const container = document.getElementById('cfreqHarmSwatches');
  if (!container) return;
  container.innerHTML = harmonies.map(h => `
    <div style="display:flex;flex-direction:column;gap:5px">
      <span style="font-size:.6rem;color:var(--text3);font-weight:700">${escHtml(h.label)}</span>
      <div style="display:flex;gap:4px">
        ${h.colors.map(c => `<span class="ctool-swatch" style="background:${c};width:30px;height:30px" title="${c}" onclick="navigator.clipboard.writeText('${c}');showStatus('📋 ${c} kopiert','success')"></span>`).join('')}
      </div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════════════
//  CURSE-TEST — alle gecurseden Items (ohne Outfit-Tag) der Reihe nach anlegen
// ════════════════════════════════════════════════════════════════

let _ctQueue     = [];
let _ctIdx       = -1;
let _ctTimer     = null;
let _ctInterval  = 10;
let _ctPaused    = false;
let _ctCountdown = 0;
let _ctCountdownTimer = null;
let _ctDragging  = false;
let _ctDragOffX  = 0, _ctDragOffY = 0;
let _ctRunId     = 0;
let _ctRunning   = false;  // true = Test läuft (auch während Curse/Save-Kette)

// Sammelt alle cursed Items ohne Outfit-Flag, sortiert nach Owner → ItemName
function _ctBuildQueue() {
  const entries = Object.entries(CURSE_DB)
    .filter(([k, e]) => e.IstCursed && !CURSE_OUTFIT_FLAGS[k])
    .map(([k, e]) => ({ dbKey: k, entry: e }));
  // Sortierung: Owner-Name → Craft-Name
  entries.sort((a, b) => {
    const oa = (a.entry.Besitzer?.Name || '').toLowerCase();
    const ob = (b.entry.Besitzer?.Name || '').toLowerCase();
    if (oa !== ob) return oa.localeCompare(ob);
    return (a.entry.CraftName || '').localeCompare(b.entry.CraftName || '');
  });
  return entries;
}

// ── Start / Stop ──────────────────────────────────────────────
function curseTestToggle() {
  // Test läuft wenn Timer aktiv, pausiert, ODER Curse gerade aktiv
  if (_ctTimer !== null || _ctPaused || _ctCurseActive) {
    _ctStop();
  } else {
    _ctStart();
  }
}

function _ctStart() {
  if (!_connected) { showStatus('❌ Nicht verbunden mit BC', 'error'); return; }
  _ctQueue = _ctBuildQueue();
  if (!_ctQueue.length) {
    showStatus('⚠️ Keine gecurseden Items ohne Outfit-Tag gefunden', 'info'); return;
  }
  // Startposition aus Input lesen (1-basiert → 0-basiert)
  const startPos = parseInt(document.getElementById('curseTestStartPos')?.value || '1');
  _ctIdx    = Math.max(0, Math.min(_ctQueue.length - 1, (startPos - 1))) - 1;
  _ctDotsPage = 0;
  _ctPaused = false;
  _ctCurseActive = false;
  _ctRunId++;   // neue Session-ID
  document.getElementById('curseTestPanel').style.display = '';
  document.getElementById('curseTestBtn').textContent = '⏹ Test stoppen';
  document.getElementById('curseTestBtn').classList.replace('btn-yellow', 'btn-red');
  _ctRenderDots();
  _ctNext();   // erstes Item — kein Check-Eintrag
  _ctStartTimer();

  // Drag-Support
  const bar = document.getElementById('curseTestDragBar');
  const panel = document.getElementById('curseTestPanel');
  if (bar && panel && !bar._ctDragBound) {
    bar._ctDragBound = true;
    bar.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      _ctDragging = true;
      const r = panel.getBoundingClientRect();
      _ctDragOffX = e.clientX - r.left;
      _ctDragOffY = e.clientY - r.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_ctDragging) return;
      panel.style.left   = Math.max(0, e.clientX - _ctDragOffX) + 'px';
      panel.style.bottom = 'auto';
      panel.style.top    = Math.max(0, e.clientY - _ctDragOffY) + 'px';
    });
    document.addEventListener('mouseup', () => { _ctDragging = false; });
  }
}

function _ctStop() {
  _ctRunId++;                          // invalidiert alle laufenden setTimeout-Ketten
  clearInterval(_ctTimer);
  clearInterval(_ctCountdownTimer);
  _ctTimer = null;
  _ctCountdownTimer = null;
  _ctPaused        = false;
  _ctCurseActive   = false;
  _ctCurseItemIdx  = -1;
  _ctReadyForCurse = false;
  clearTimeout(_ctCurseDebounce);
  _ctCurseDebounce = null;
  _ctIdx = -1;
  // Loader-State zurücksetzen
  bcSend({ type: 'EXEC', code: '(function(){if(window.__BCK_ctCurseWasActive!==undefined)window.__BCK_ctCurseWasActive=false;})();' }, true);
  document.getElementById('curseTestPanel').style.display = 'none';
  const stateEl = document.getElementById('curseTestCurseState');
  if (stateEl) stateEl.style.display = 'none';
  const btn = document.getElementById('curseTestBtn');
  if (btn) { btn.textContent = '🎭 Curse-Test'; btn.classList.replace('btn-red', 'btn-yellow'); }
  showStatus('⏹ Curse-Test beendet', 'info');
}

function _ctStartTimer() {
  clearInterval(_ctTimer);
  clearInterval(_ctCountdownTimer);
  _ctCountdown = _ctInterval;
  _ctTimer = setInterval(() => {
    if (!_ctPaused && !_ctCurseActive) _ctNext();
  }, _ctInterval * 1000);
  _ctCountdownTimer = setInterval(() => {
    if (!_ctPaused && !_ctCurseActive) {
      _ctCountdown = Math.max(0, _ctCountdown - 1);
      _ctUpdateCountdown();
      if (_ctCountdown <= 0) _ctCountdown = _ctInterval;
    }
  }, 1000);
}

// ── Navigation ────────────────────────────────────────────────
function _ctNext() {
  if (!_ctQueue.length) return;
  const prevEntry = _ctIdx >= 0 ? _ctQueue[_ctIdx]?.entry : null;
  _ctIdx = (_ctIdx + 1) % _ctQueue.length;
  _ctCurseItemIdx = -1;  // altes cease-Event für diesen Index nicht mehr gültig
  _ctApplyCurrent(prevEntry);
  _ctUpdateUI();
  _ctResetCountdown();
}

// Nach Standard-Outfit: vorheriges Item wurde schon ersetzt → kein InventoryRemove
function _ctNextSkipRemove() {
  if (!_ctQueue.length) return;
  _ctIdx = (_ctIdx + 1) % _ctQueue.length;
  _ctCurseItemIdx = -1;  // altes cease-Event für diesen Index nicht mehr gültig
  _ctApplyCurrent(null);
  _ctUpdateUI();
  _ctResetCountdown();
}

function curseTestNext() {
  clearInterval(_ctTimer);
  clearInterval(_ctCountdownTimer);
  _ctNext(); // manuelle Navigation — kein Check-Eintrag
  _ctStartTimer();
}

function curseTestPrev() {
  if (!_ctQueue.length) return;
  clearInterval(_ctTimer);
  clearInterval(_ctCountdownTimer);
  const prevEntry = _ctIdx >= 0 ? _ctQueue[_ctIdx]?.entry : null;
  _ctIdx = (_ctIdx - 1 + _ctQueue.length) % _ctQueue.length;
  _ctApplyCurrent(prevEntry);
  _ctUpdateUI();
  _ctResetCountdown();
  _ctStartTimer();
}

function curseTestPauseToggle() {
  _ctPaused = !_ctPaused;
  const btn = document.getElementById('curseTestPauseBtn');
  if (btn) btn.textContent = _ctPaused ? '▶ Weiter' : '⏸ Pause';
  document.getElementById('curseTestStatus').textContent = _ctPaused ? '⏸ Pausiert' : '';
}

function curseTestSetInterval(val) {
  _ctInterval = Math.max(3, Math.min(120, val || 10));
  if (_ctTimer !== null) {
    clearInterval(_ctTimer);
    clearInterval(_ctCountdownTimer);
    _ctStartTimer();
  }
}

// ── Item anlegen / ablegen ────────────────────────────────────
function _ctApplyCurrent(prevEntry) {
  if (!_connected) return;
  const cur = _ctQueue[_ctIdx];
  if (!cur) return;

  const shouldRemove = document.getElementById('curseTestRemove')?.checked !== false;

  // Vorheriges Item ablegen (per Gruppe)
  if (shouldRemove && prevEntry) {
    const prevGruppe = CURSE_GRUPPE_OVERRIDES[_ctQueue[(_ctIdx - 1 + _ctQueue.length) % _ctQueue.length]?.dbKey]
      || prevEntry.Gruppe;
    if (prevGruppe) {
      bcSend({ type: 'EXEC', code:
        '(function(){try{InventoryRemove(Player,' + JSON.stringify(prevGruppe) + ');'
        + 'CharacterRefresh(Player,false,false);}catch(e){}})();'
      }, true);
    }
  }

  // Neues Item anlegen (mit kleinem Delay damit das Ablegen zuerst verarbeitet wird)
  _ctReadyForCurse = false;  // Erst nach wearCurse curse_start Events akzeptieren
  setTimeout(() => {
    wearCurse(cur.dbKey, null);
    _ctReadyForCurse = true;  // Item gesendet — ab jetzt Curses vom aktuellen Item erwartet
    // Aktuelle Zeile im Curse-Tab highlighten falls sichtbar
    const rowId = 'crow_' + cur.dbKey.replace(/[^a-zA-Z0-9]/g, '_');
    document.querySelectorAll('.cg-row.ct-active').forEach(r => r.classList.remove('ct-active'));
    document.getElementById(rowId)?.classList.add('ct-active');
    document.getElementById(rowId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 400);
}

// ── UI-Updates ────────────────────────────────────────────────
function _ctUpdateUI() {
  const total = _ctQueue.length;
  const cur   = _ctQueue[_ctIdx];
  const prev  = _ctIdx > 0 ? _ctQueue[_ctIdx - 1] : _ctQueue[total - 1];
  const next  = _ctQueue[(_ctIdx + 1) % total];

  document.getElementById('curseTestProgress').textContent = (_ctIdx + 1) + ' / ' + total;
  const posInp = document.getElementById('curseTestStartPos');
  if (posInp) posInp.value = _ctIdx + 1;
  document.getElementById('curseTestBar').style.width = ((_ctIdx + 1) / total * 100) + '%';

  const _setCard = (idName, idGroup, idOwner, entry) => {
    const el = document.getElementById(idName);
    if (el) el.textContent = entry ? (entry.CraftName || entry.ItemName || '–') : '–';
    const eg = document.getElementById(idGroup);
    if (eg) eg.textContent = entry ? (_getEffectiveGruppe(entry, '') || '–') : '–';
    if (idOwner) {
      const eo = document.getElementById(idOwner);
      if (eo) eo.textContent = entry ? (entry.Besitzer?.Name || '–') : '–';
    }
  };
  _setCard('ctPrevName', 'ctPrevGroup', null, prev);
  _setCard('ctCurName',  'ctCurGroup',  'ctCurOwner', cur?.entry);
  _setCard('ctNextName', 'ctNextGroup', null, next?.entry);

  document.getElementById('curseTestStatus').textContent =
    (cur?.entry?.Besitzer?.Name ? '👤 ' + cur.entry.Besitzer.Name : '');

  _ctUpdateDots();
}

function _ctUpdateCountdown() {
  const el = document.getElementById('curseTestCountdown');
  if (el) el.textContent = _ctPaused ? '⏸' : '⏱ ' + _ctCountdown + 's';
}

function _ctResetCountdown() {
  _ctCountdown = _ctInterval;
  _ctUpdateCountdown();
}

const CT_DOTS_PER_PAGE = 60;
let _ctDotsPage = 0;

function _ctDotsPageOf(idx) {
  return Math.floor(idx / CT_DOTS_PER_PAGE);
}

function _ctRenderDots() {
  const el = document.getElementById('curseTestDots');
  if (!el || !_ctQueue.length) return;
  const total     = _ctQueue.length;
  const totalPages = Math.ceil(total / CT_DOTS_PER_PAGE);
  // Seite so setzen dass aktiver Dot sichtbar ist
  if (_ctIdx >= 0) _ctDotsPage = _ctDotsPageOf(_ctIdx);
  const start = _ctDotsPage * CT_DOTS_PER_PAGE;
  const end   = Math.min(start + CT_DOTS_PER_PAGE, total);

  const dots = [];
  for (let i = start; i < end; i++) {
    const active = i === _ctIdx;
    dots.push(
      '<span id="ctdot_' + i + '" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block;'
      + 'background:' + (active ? 'var(--yellow)' : 'var(--bg4)') + ';'
      + 'border:1px solid ' + (active ? 'var(--yellow)' : 'var(--border)') + ';'
      + 'cursor:pointer;transition:background .15s" title="#' + (i+1) + ' ' + escHtml(_ctQueue[i].entry?.CraftName || '') + '"'
      + ' onclick="curseTestJump(' + i + ')"></span>'
    );
  }

  // Pagination Buttons
  const prevPageBtn = '<button onclick="_ctDotsGoPage(' + (_ctDotsPage-1) + ')" '
    + ((_ctDotsPage > 0) ? '' : 'disabled ')
    + 'style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);cursor:pointer;font-size:.6rem;padding:1px 5px;flex-shrink:0">◀</button>';
  const nextPageBtn = '<button onclick="_ctDotsGoPage(' + (_ctDotsPage+1) + ')" '
    + ((_ctDotsPage < totalPages-1) ? '' : 'disabled ')
    + 'style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--text3);cursor:pointer;font-size:.6rem;padding:1px 5px;flex-shrink:0">▶</button>';
  const pageLabel = '<span style="font-size:.6rem;color:var(--text3);flex-shrink:0">'
    + (start+1) + '–' + end + ' / ' + total + '</span>';

  el.innerHTML = '<div style="display:flex;align-items:center;gap:4px;flex-wrap:nowrap;margin-bottom:3px">'
    + prevPageBtn + pageLabel + nextPageBtn + '</div>'
    + '<div style="display:flex;gap:3px;flex-wrap:wrap">' + dots.join('') + '</div>';
}

function _ctDotsGoPage(page) {
  const totalPages = Math.ceil(_ctQueue.length / CT_DOTS_PER_PAGE);
  _ctDotsPage = Math.max(0, Math.min(totalPages - 1, page));
  _ctRenderDots();
}

function _ctUpdateDots() {
  // Prüfen ob aktiver Dot auf aktueller Seite liegt
  if (_ctIdx >= 0 && _ctDotsPageOf(_ctIdx) !== _ctDotsPage) {
    _ctRenderDots();  // Seite wechseln
    return;
  }
  // Nur aktive Dots aktualisieren (kein komplettes Re-Render)
  document.querySelectorAll('[id^="ctdot_"]').forEach(dot => {
    const i = parseInt(dot.id.replace('ctdot_', ''));
    const active = i === _ctIdx;
    dot.style.background  = active ? 'var(--yellow)' : 'var(--bg4)';
    dot.style.borderColor = active ? 'var(--yellow)' : 'var(--border)';
  });
}

function curseTestGoTo() {
  const inp = document.getElementById('curseTestStartPos');
  const pos = parseInt(inp?.value || '1');
  const idx = Math.max(0, Math.min(_ctQueue.length - 1, pos - 1));
  // Falls Test läuft: direkt springen
  if (_ctTimer !== null || _ctPaused) {
    curseTestJump(idx);
  } else {
    // Test noch nicht gestartet: nur Startposition setzen
    if (inp) inp.value = pos;
    showStatus('📍 Start bei Position ' + pos + ' gesetzt', 'info');
  }
}

function curseTestJump(idx) {
  if (idx < 0 || idx >= _ctQueue.length) return;
  clearInterval(_ctTimer);
  clearInterval(_ctCountdownTimer);
  const prevEntry = _ctIdx >= 0 ? _ctQueue[_ctIdx]?.entry : null;
  _ctIdx = idx;
  _ctApplyCurrent(prevEntry);
  _ctUpdateUI();
  _ctResetCountdown();
  _ctStartTimer();
}

// ── Curse-Test Check-Liste (kein Unterschied zum Standard-Outfit) ─────────────
let _ctCheckList = [];

function _ctCheckAdd(dbKey, craftName, ownerName) {
  _ctCheckList.push({
    ts:        new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
    craftName,
    ownerName,
    dbKey,
  });
  _ctRenderCheckList();
}

function _ctRenderCheckList() {
  const el = document.getElementById('curseTestCheckList');
  if (!el) return;
  if (!_ctCheckList.length) {
    el.innerHTML = '<span style="font-size:.62rem;color:var(--text3);font-style:italic">Keine</span>';
    return;
  }
  el.innerHTML = _ctCheckList.slice().reverse().map((e, i) =>
    '<div style="display:flex;align-items:center;gap:5px;padding:3px 5px;border-radius:4px;'
    + (i === 0
      ? 'background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25)'
      : 'background:var(--bg3);border:1px solid var(--border)') + '">'
    + '<span style="font-size:.58rem;color:var(--text3);font-family:var(--font-mono);flex-shrink:0">' + escHtml(e.ts) + '</span>'
    + '<span style="font-size:.68rem;font-weight:700;color:var(--yellow);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escHtml(e.craftName + ' - ' + e.ownerName) + '">' + escHtml(e.craftName) + '</span>'
    + '<span style="font-size:.6rem;color:var(--text3);white-space:nowrap;flex-shrink:0">' + escHtml(e.ownerName) + '</span>'
    + '</div>'
  ).join('');
}

function _ctClearCheckList() {
  _ctCheckList = [];
  _ctRenderCheckList();
}

// ── Curse-Test Verlaufs-Log ───────────────────────────────────
let _ctLog = [];

function _ctLogAdd(dbKey) {
  const entry = CURSE_DB[dbKey];
  if (!entry) return;
  const craftName = entry.CraftName || entry.ItemName || '?';
  const owner     = entry.Besitzer?.Name || (entry.Besitzer?.Nummer ? '#' + entry.Besitzer.Nummer : '?');
  _ctLog.push({
    ts: new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
    craftName,
    owner,
    profileName: craftName + ' - ' + owner,
  });
  _ctRenderLog();
}

function _ctRenderLog() {
  const el = document.getElementById('curseTestLog');
  if (!el) return;
  if (!_ctLog.length) {
    el.innerHTML = '<span style="font-size:.62rem;color:var(--text3);font-style:italic">Noch keine Curses gespeichert</span>';
    return;
  }
  el.innerHTML = _ctLog.slice().reverse().map((e, i) =>
    '<div style="display:flex;align-items:center;gap:5px;padding:3px 5px;border-radius:4px;'
    + (i === 0
      ? 'background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.2)'
      : 'background:var(--bg3);border:1px solid var(--border)') + '">'
    + '<span style="font-size:.58rem;color:var(--text3);font-family:var(--font-mono);flex-shrink:0">' + escHtml(e.ts) + '</span>'
    + '<span style="font-size:.68rem;font-weight:700;color:var(--text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escHtml(e.profileName) + '">' + escHtml(e.craftName) + '</span>'
    + '<span style="font-size:.6rem;color:var(--text3);white-space:nowrap;flex-shrink:0">' + escHtml(e.owner) + '</span>'
    + '</div>'
  ).join('');
}

function _ctClearLog() {
  _ctLog = [];
  _ctRenderLog();
}

// ── Profil-Select im Panel befüllen ──────────────────────────
function _ctRefreshProfileSelect() {
  const sel = document.getElementById('curseTestResetProfile');
  if (!sel) return;
  const prev = sel.value;
  const keys = Object.keys(PROFILES).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = '<option value="">– Kein Profil –</option>'
    + keys.map(k => '<option value="' + escHtml(k) + '"' + (k === prev ? ' selected' : '') + '>'
      + escHtml(k) + '</option>').join('');
}

// ── Chat-Nachricht auswerten ──────────────────────────────────
// Ein Item kann mehrere aufeinanderfolgende Curses auslösen (curse_start → cease → curse_start → cease…).
// Erst nach dem LETZTEN cease (2s kein neuer curse_start) wird das Profil gespeichert.
let _ctCurseActive    = false;
let _ctCurseItemIdx   = -1;    // _ctIdx bei erstem curse_start — verhindert veraltete Events
let _ctCurseDebounce  = null;  // Debounce-Timer: feuert erst nach dem letzten cease
let _ctReadyForCurse  = false; // true erst nachdem wearCurse gesendet wurde

function _ctHandleChatMsg(event, content) {
  const panel = document.getElementById('curseTestPanel');
  if (!panel || panel.style.display === 'none') return;

  console.log('%c[CURSE-TEST] ' + (event === 'curse_end' ? '✅ CEASE' : '🔮 CURSE START') + ' → ' + (content||'').slice(0,80),
    'background:' + (event === 'curse_end' ? '#064e3b' : '#78350f') + ';color:#fff;font-weight:700;padding:2px 6px;border-radius:3px');

  if (event === 'curse_start') {
    // Verspätetes Event vom vorherigen Item — wearCurse für aktuelles Item noch nicht gesendet
    if (!_ctReadyForCurse && !_ctCurseActive) {
      console.log('[CURSE-TEST] curse_start ignoriert — Item noch nicht aktiv (Vorcurse?)');
      return;
    }

    // Laufenden Debounce abbrechen — noch nicht alle Curses beendet
    clearTimeout(_ctCurseDebounce);
    _ctCurseDebounce = null;

    if (_ctCurseActive) {
      // Weiterer Curse auf dasselbe Item — Timer bleibt gestoppt, warten
      showStatus('🔮 Weiterer Curse läuft…', 'info');
      return;
    }

    // Erster curse_start für dieses Item
    _ctCurseActive  = true;
    _ctCurseItemIdx = _ctIdx;

    // Timer stoppen — warten bis alle Curses von selbst enden
    clearInterval(_ctTimer);
    clearInterval(_ctCountdownTimer);
    _ctTimer = null;
    _ctCountdownTimer = null;

    const se = document.getElementById('curseTestCurseState');
    if (se) se.style.display = '';
    const st = document.getElementById('curseTestStatus');
    if (st) st.textContent = '🔮 Curse läuft…';
    const cd = document.getElementById('curseTestCountdown');
    if (cd) cd.textContent = '⏳';
    showStatus('🔮 Curse erkannt — warte bis alle Curses fertig sind', 'info');

  } else if (event === 'curse_end') {
    // Veraltetes Event: falsches Item oder kein Curse-Kontext
    if (_ctCurseItemIdx < 0 || _ctIdx !== _ctCurseItemIdx) {
      console.log('[CURSE-TEST] cease ignoriert — falsches Item (idx ' + _ctIdx + ' vs ' + _ctCurseItemIdx + ')');
      _ctCurseActive = false;
      return;
    }

    // Curse beendet — aber evtl. folgt gleich der nächste für dasselbe Item
    _ctCurseActive = false;

    const se = document.getElementById('curseTestCurseState');
    if (se) se.style.display = 'none';
    const st = document.getElementById('curseTestStatus');
    const cd = document.getElementById('curseTestCountdown');
    if (cd) cd.textContent = '⏳';
    if (st) st.textContent = '⏳ Warte auf weitere Curses…';
    showStatus('✅ Cease — prüfe ob noch weitere Curses folgen…', 'info');

    // Snapshot für diese Kette
    const capturedIdx   = _ctIdx;
    const capturedDbKey = _ctQueue[_ctIdx]?.dbKey;
    const capturedRunId = _ctRunId;
    const _valid = () => _ctRunId === capturedRunId;

    // Schritt 3 — weiter machen
    const _doNext = () => {
      if (!_valid()) return;
      if (st) st.textContent = '';
      if (cd) cd.textContent = '';
      showStatus('▶ Curse-Test wird fortgesetzt', 'info');
      _ctNextSkipRemove();
      _ctStartTimer();
    };

    // Schritt 2b — Standard-Outfit anlegen + 5s warten
    const _runDefaultOutfit = (next) => {
      if (!_valid()) return;
      if (CURSE_DEFAULT_OUTFIT_CODE) {
        if (st) st.textContent = '🏠 Standard-Outfit…';
        showStatus('🏠 Standard-Outfit wird wiederhergestellt…', 'info');
        const code = '(function(){' + _buildApplyCode(CURSE_DEFAULT_OUTFIT_CODE) + '})();';
        bcSend({ type: 'EXEC', code });
        setTimeout(() => { if (_valid()) next(); }, 5000);
      } else {
        next();
      }
    };

    // Schritt 2a — Dropdown-Profil (optional)
    const _runExtraProfile = (next) => {
      if (!_valid()) return;
      const ep = document.getElementById('curseTestResetProfile')?.value || '';
      if (ep && PROFILES[ep]) {
        if (st) st.textContent = '⚡ Profil…';
        showStatus('⚡ Profil "' + ep + '" wird ausgeführt…', 'info');
        loadProfile(ep);
        setTimeout(() => {
          if (!_valid()) return;
          const code = document.getElementById('outfitCode')?.value?.trim();
          if (code) bcSend({ type: 'EXEC', code: '(function(){\n' + code + '\n})();' });
          setTimeout(() => { if (_valid()) next(); }, 3500);
        }, 60);
      } else {
        next();
      }
    };

    // Debounce 2s: falls curse_start erneut kommt → clearTimeout → warten auf nächsten cease
    // Erst wenn 2s kein neuer Curse kommt: Outfit ist final → Profil speichern
    clearTimeout(_ctCurseDebounce);
    _ctCurseDebounce = setTimeout(() => {
      _ctCurseDebounce = null;
      if (!_valid() || _ctIdx !== capturedIdx) return;  // Stop oder Item gewechselt
      if (_ctCurseActive) return;  // Neuer Curse läuft bereits

      if (st) st.textContent = '💾 Speichere…';
      showStatus('💾 Alle Curses beendet — Profil wird gespeichert…', 'info');

      if (capturedDbKey && CURSE_DB[capturedDbKey]) {
        _ctLogAdd(capturedDbKey);
        _curseSaveAsProfileSilent(capturedDbKey, () => {
          if (_valid()) _runExtraProfile(() => _runDefaultOutfit(_doNext));
        });
      } else {
        _runExtraProfile(() => _runDefaultOutfit(_doNext));
      }
    }, 2000);
  }
}

// Profile-Select beim Öffnen des Panels befüllen
const _origCtStart = _ctStart;
// eslint-disable-next-line no-func-assign
_ctStart = function() {
  _origCtStart();
  _ctRefreshProfileSelect();
  _ctCurseActive   = false;
  _ctCurseItemIdx  = -1;
  _ctReadyForCurse = false;
  clearTimeout(_ctCurseDebounce);
  _ctCurseDebounce = null;
  const stateEl = document.getElementById('curseTestCurseState');
  if (stateEl) stateEl.style.display = 'none';
};
