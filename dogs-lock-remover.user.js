// ==UserScript==
// @name         DOGS Lock Remover
// @namespace    https://www.bondageprojects.com/
// @version      1.0
// @description  Entfernt ungewollte DOGS Padlocks vom eigenen Charakter
// @author       local tool
// @match        https://bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondage-europe.com/*
// @match        https://bondageprojects.com/*
// @match        https://www.bondageprojects.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    function waitForBC(callback) {
        if (typeof Player !== "undefined" && Player.ExtensionSettings && typeof LZString !== "undefined") {
            callback();
        } else {
            setTimeout(() => waitForBC(callback), 1000);
        }
    }

    function removeAllDOGSLocks() {
        try {
            if (!Player.ExtensionSettings.DOGS) {
                alert("Keine DOGS-Daten gefunden.");
                return;
            }

            const data = JSON.parse(LZString.decompressFromBase64(Player.ExtensionSettings.DOGS));
            const itemGroups = data?.deviousPadlock?.itemGroups;

            if (!itemGroups || Object.keys(itemGroups).length === 0) {
                alert("Keine DOGS Locks gefunden.");
                return;
            }

            const lockedGroups = Object.keys(itemGroups);

            // Lock-Eigenschaften von jedem Item entfernen
            lockedGroups.forEach(groupName => {
                const item = InventoryGet(Player, groupName);
                if (item?.Property) {
                    delete item.Property.LockedBy;
                    delete item.Property.LockMemberNumber;
                    delete item.Property.LockMemberName;
                    delete item.Property.Name;
                    item.Property.Effect = (item.Property.Effect || []).filter(e => e !== "Lock");
                }
            });

            // DOGS-Speicher leeren
            data.deviousPadlock.itemGroups = {};
            Player.ExtensionSettings.DOGS = LZString.compressToBase64(JSON.stringify(data));
            ServerPlayerExtensionSettingsSync("DOGS");

            // Aussehen mit Server synchronisieren
            CharacterRefresh(Player);
            ServerPlayerAppearanceSync();

            const msg = `${lockedGroups.length} DOGS Lock(s) entfernt:\n${lockedGroups.join(", ")}\n\nSeite wird in 2 Sekunden neu geladen...`;
            alert(msg);
            setTimeout(() => location.reload(), 2000);

        } catch (e) {
            console.error("[DOGS Lock Remover]", e);
            alert("Fehler: " + e.message);
        }
    }

    function addButton() {
        const btn = document.createElement("button");
        btn.id = "dogs-lock-remover-btn";
        btn.textContent = "🔓 DOGS Locks entfernen";
        btn.style.cssText = `
            position: fixed;
            bottom: 14px;
            right: 14px;
            z-index: 99999;
            background: #8b0000;
            color: white;
            border: none;
            padding: 9px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            opacity: 0.85;
            transition: opacity 0.2s;
        `;
        btn.onmouseenter = () => btn.style.opacity = "1";
        btn.onmouseleave = () => btn.style.opacity = "0.85";
        btn.onclick = removeAllDOGSLocks;
        document.body.appendChild(btn);
    }

    waitForBC(addButton);
})();
