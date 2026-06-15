// == DTS Chinese → English Translator for Bondage Club ==

const CHINESE_RE = /[一-鿿㐀-䶿]/;

// ── Queue ─────────────────────────────────────────────────────────────────
const queue = [];
let processing = false;

async function googleTranslate(text) {
    if (!text || !CHINESE_RE.test(text)) return null;
    try {
        const url = 'https://translate.googleapis.com/translate_a/single'
            + '?client=gtx&sl=zh-CN&tl=en&dt=t&q=' + encodeURIComponent(text);
        const res  = await fetch(url);
        const json = await res.json();
        let out = '';
        for (const p of json[0]) { if (p[0]) out += p[0]; }
        return out.trim() || null;
    } catch { return null; }
}

function enqueue(fn) { queue.push(fn); if (!processing) drain(); }
async function drain() {
    processing = true;
    while (queue.length) { await queue.shift()(); await sleep(250); }
    processing = false;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Get all non-empty text nodes inside an element ────────────────────────
function textNodes(el) {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
        if (n.textContent.trim()) nodes.push(n);
    }
    return nodes;
}

// ── Translate a set of text nodes in one API call ─────────────────────────
function translateNodes(nodes, styleEl) {
    if (!nodes.length) return;
    const hasChinese = nodes.some(n => CHINESE_RE.test(n.textContent));
    if (!hasChinese) return;

    enqueue(async () => {
        const texts  = nodes.map(n => n.textContent);
        const joined = texts.join('\n');
        const result = await googleTranslate(joined);
        if (!result) return;

        const parts = result.split('\n');
        if (parts.length === nodes.length) {
            nodes.forEach((n, i) => { n.textContent = parts[i]; });
        } else {
            // Fallback: apply full result to first Chinese node, leave rest untouched
            const target = nodes.find(n => CHINESE_RE.test(n.textContent));
            if (target) target.textContent = result;
        }

        if (styleEl) {
            styleEl.style.color = '#7dd3b8';
            styleEl.style.fontStyle = 'italic';
        }
    });
}

// ── Process a top-level chat message element ──────────────────────────────
function processElement(el) {
    if (el.dataset.dtsTranslated) return;
    if (!CHINESE_RE.test(el.textContent)) return;
    el.dataset.dtsTranslated = 'done';

    const original = el.textContent.trim();
    if (!el.title) el.title = '🇨🇳 ' + original;

    translateNodes(textNodes(el), el);
}

// ── Translate a single newly-added child element ──────────────────────────
function translateAddedNode(node) {
    if (node.dataset && node.dataset.dtsNodeTranslated) return;
    if (!CHINESE_RE.test(node.textContent)) return;
    if (node.dataset) node.dataset.dtsNodeTranslated = 'done';

    translateNodes(textNodes(node), null);
}

// ── Watch #TextAreaChatLog ────────────────────────────────────────────────
function startObserver(log) {
    console.log('[DTS-Translator] ✅ Ready');

    // Process existing messages
    for (const c of log.children) processElement(c);

    // subtree:true catches buttons added INSIDE existing messages after the fact
    new MutationObserver(ms => {
        for (const m of ms) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                if (m.target === log) {
                    // New top-level message
                    processElement(n);
                } else if (CHINESE_RE.test(n.textContent)) {
                    // New element added inside an existing message (e.g. ▸显示状态 button)
                    translateAddedNode(n);
                }
            }
        }
    }).observe(log, { childList: true, subtree: true });
}

function waitForChatLog() {
    const el = document.getElementById('TextAreaChatLog');
    if (el) { startObserver(el); return; }
    const t = setInterval(() => {
        const el = document.getElementById('TextAreaChatLog');
        if (el) { clearInterval(t); startObserver(el); }
    }, 1000);
}

const style = document.createElement('style');
style.textContent = `[data-dts-translated] { color:#7dd3b8; font-style:italic; }`;
document.head.appendChild(style);

waitForChatLog();
