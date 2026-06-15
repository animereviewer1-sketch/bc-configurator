// == Auto Chinese to English Translator ==

const TARGET_SELECTORS = [
    '.chat-message', '.message', '.chat-text', '.text-message',
    '[class*="chat"]', '[class*="message"]', 'div[role="log"] p',
    'p', 'span', 'div'
];

async function translateToEnglish(text) {
    if (!text || text.length < 3) return text;
    if (!/[一-鿿]/.test(text)) return text;   // Nur übersetzen wenn chinesische Zeichen vorhanden

    try {
        // Google Translate API (funktioniert ohne Key)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);
        const json = await response.json();

        let translated = '';
        json[0].forEach(item => {
            if (item[0]) translated += item[0];
        });

        return translated || text;
    } catch (e) {
        console.log("Translation error:", e);
        return text;
    }
}

function processElement(element) {
    if (element.dataset.translated) return;

    const originalText = element.textContent.trim();
    if (!originalText) return;

    translateToEnglish(originalText).then(englishText => {
        if (englishText !== originalText) {
            element.textContent = englishText;
            element.style.color = "#00ff9d";
            element.style.fontStyle = "italic";
            element.dataset.translated = "true";
        }
    });
}

// Mutation Observer für neue Nachrichten
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                TARGET_SELECTORS.forEach(selector => {
                    if (node.matches && node.matches(selector)) {
                        processElement(node);
                    }
                    node.querySelectorAll?.(selector).forEach(el => processElement(el));
                });
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Bestehende Nachrichten auch übersetzen
setTimeout(() => {
    TARGET_SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => processElement(el));
    });
}, 1000);

console.log("✅ Chinese → English Chat Translator geladen");
