import { GameAPI } from "../api/GameAPI.js";
import { notifier } from "../_global-managers/NotificationManager.js";
import { audioManager } from "../_global-managers/AudioManager.js";

function buildAftermathModal(result) {
    // Prevent duplicates
    const existing = document.getElementById('global-aftermath-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'global-aftermath-overlay';
    overlay.className = 'aftermath-overlay';

    // 1. Build Logs HTML
    let logsHtml = '';
    if (result.logs && result.logs.length > 0) {
        logsHtml = result.logs.map(log => `<div class="log-entry">${log}</div>`).join('');
    } else {
        logsHtml = `<div class="log-entry" style="opacity:0.5; font-style:italic;">Nothing of note occurred.</div>`;
    }

    // 2. Build Loot HTML
    let lootHtml = '';
    if (result.loot && result.loot.length > 0) {
        lootHtml = result.loot.map(item => `
            <div class="aftermath-item-slot rarity-${item.rarity || 'common'}" title="${item.name}">
                <i class="${item.icon}"></i>
            </div>
        `).join('');
    } else {
        lootHtml = `<div style="grid-column: 1/-1; text-align:center; color:#64748b; padding-top:20px;">No loot found.</div>`;
    }

    // 3. Assemble Full Modal
    overlay.innerHTML = `
        <div class="aftermath-container">
            <div class="aftermath-header">
                <h2>Session Aftermath</h2>
                <div class="aftermath-subtitle">The dust settles. Here are the results of your time.</div>
            </div>
            <div class="aftermath-body">
                <div class="aftermath-logs-panel">
                    <h3 class="aftermath-section-title">Event Logs</h3>
                    <div class="aftermath-log-list">
                        ${logsHtml}
                    </div>
                </div>
                <div class="aftermath-loot-panel">
                    <h3 class="aftermath-section-title">Found Loot</h3>
                    <div class="aftermath-loot-grid">
                        ${lootHtml}
                    </div>
                </div>
            </div>
            <div class="aftermath-footer">
                <button id="btn-close-aftermath" class="btn-aftermath-leave">Leave</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Play a satisfying loot/event sound if available, otherwise standard special
    audioManager.play('button', 'special');

    // Bind Close Event
    document.getElementById('btn-close-aftermath').addEventListener('click', () => {
        overlay.classList.add('closing-animation');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
        
        // Refresh World/Party data in background in case they navigate there
        GameAPI.getWorldData(); 
    });
}

export const MercenaryHandler = {
    onReceiveData: (event) => {
        const data = event.detail; 
        console.log("📦 Mercenaries loaded:", data);
    },

    onCreated: (event) => {
        const info = event.detail;
        console.log("✅ Created successfully:", info);
        GameAPI.getMercenaries();
    },

    onXpGained: async (event) => {
        const result = event.detail;
        console.log("✨ XP/Logs Received:", result);
        
        // If logs or loot exist, show the immersive overlay
        if ((result.logs && result.logs.length > 0) || (result.loot && result.loot.length > 0)) {
            buildAftermathModal(result);
        }
    }
};