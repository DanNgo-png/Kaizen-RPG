import { GameAPI } from "../../api/GameAPI.js";
import { loadPage } from "../../router.js"; // Import loadPage to redirect
import { initLoadCampaign } from "../LoadCampaignManager.js"; // Import init for Load Campaign

const ROLES = ['Code Weaver', 'Pixel Mage', 'Note Taker', 'Bug Slayer', 'Data Cleric'];
const NAMES = ['Kael', 'Lyra', 'Torin', 'Vex', 'Iris', 'Zane', 'Mira'];

export class PartyManager {
    constructor() {
        this.dom = {
            grid: document.querySelector('.party-grid'),
            btnRecruit: document.querySelector('.btn-recruit'),
            stats: {
                power: document.querySelector('.p-val.text-fire'),
                buffs: document.querySelector('.p-val.text-blue')
            }
        };

        this.mercenaries = [];
        this.init();
    }

    init() {
        if (!this.dom.grid) return;

        // 1. Listen for Data
        Neutralino.events.off('receiveMercenaries', this.onDataReceived);
        
        Neutralino.events.on('receiveMercenaries', (e) => {
            const data = e.detail;
            
            // Handle "No Save Loaded" state
            if (data === null) {
                this.renderNoSaveState();
                return;
            }

            this.mercenaries = data || [];
            this.render();
        });

        // 2. Listen for Add Confirmation
        Neutralino.events.off('mercenaryAdded', this.onMercenaryAdded);
        Neutralino.events.on('mercenaryAdded', () => GameAPI.getMercenaries());

        // 3. Bind Actions
        if (this.dom.btnRecruit) {
            this.dom.btnRecruit.addEventListener('click', () => this.recruitRandom());
        }

        // 4. Initial Fetch
        GameAPI.getMercenaries();
    }

    renderNoSaveState() {
        this.dom.grid.innerHTML = '';
        const el = document.createElement('div');
        el.style.gridColumn = "1 / -1";
        el.style.textAlign = "center";
        el.style.padding = "60px";
        el.style.color = "#9ca3af";
        
        el.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"><i class="fa-solid fa-floppy-disk"></i></div>
            <h2 style="color:white; margin-bottom: 10px;">No Campaign Loaded</h2>
            <p style="margin-bottom: 25px;">You need to load a save file to view your party.</p>
            <button id="btn-goto-load" class="btn-primary" style="padding: 10px 20px; cursor:pointer;">Load Game</button>
        `;

        el.querySelector('#btn-goto-load').addEventListener('click', async () => {
            await loadPage('./pages/games/load-campaign.html');
            initLoadCampaign();
        });

        this.dom.grid.appendChild(el);
    }

    recruitRandom() {
        if (!this.mercenaries) return; // Guard against recruiting when no save loaded

        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const role = ROLES[Math.floor(Math.random() * ROLES.length)];
        
        const str = 8 + Math.floor(Math.random() * 8);
        const int = 8 + Math.floor(Math.random() * 8);
        const spd = 8 + Math.floor(Math.random() * 8);

        GameAPI.addMercenary({ name, role, level: 1, str, int, spd });
    }

    render() {
        this.dom.grid.innerHTML = '';

        if (this.mercenaries.length === 0) {
            this.renderEmptyState();
        } else {
            this.mercenaries.forEach(merc => {
                const card = this.createCard(merc);
                this.dom.grid.appendChild(card);
            });
            this.dom.grid.appendChild(this.createEmptySlot());
        }

        this.updateHeaderStats();
    }

    createCard(merc) {
        const el = document.createElement('div');
        const totalStats = (merc.str || 10) + (merc.int || 10) + (merc.spd || 10);
        let rarity = 'rarity-common';
        if (totalStats > 35) rarity = 'rarity-rare';
        else if (totalStats > 45) rarity = 'rarity-legendary';
        else if (totalStats > 30) rarity = 'rarity-uncommon';

        el.className = `char-card ${rarity}`;
        
        el.innerHTML = `
            <div class="char-header">
                <div class="char-avatar">
                    <i class="fa-solid fa-user-ninja"></i>
                </div>
                <div class="char-info">
                    <h3>${merc.name}</h3>
                    <span class="char-class">${merc.role} • Lvl ${merc.level}</span>
                </div>
                <div class="char-badge badge-idle">Idle</div>
            </div>

            <div class="char-body">
                <div class="stat-row">
                    <span class="stat-name">XP</span>
                    <div class="progress-bar">
                        <div class="fill" style="width: ${merc.xp || 0}%; background-color: var(--accent-purple);"></div>
                    </div>
                    <span class="stat-val">${merc.xp || 0}%</span>
                </div>

                <div class="attributes-grid">
                    <div class="attr" title="Strength"><i class="fa-solid fa-dumbbell"></i> <span>${merc.str || 10}</span></div>
                    <div class="attr" title="Intellect"><i class="fa-solid fa-brain"></i> <span>${merc.int || 10}</span></div>
                    <div class="attr" title="Speed"><i class="fa-solid fa-wind"></i> <span>${merc.spd || 10}</span></div>
                </div>
            </div>

            <div class="char-footer">
                <button class="btn-manage">Manage</button>
                <button class="btn-icon-only" title="Dismiss"><i class="fa-solid fa-door-open"></i></button>
            </div>
        `;

        el.querySelector('.btn-icon-only').addEventListener('click', () => {
             alert("Dismissal feature coming next update!");
        });

        return el;
    }

    createEmptySlot() {
        const el = document.createElement('div');
        el.className = 'char-card empty-slot';
        el.innerHTML = `
            <div class="empty-content">
                <div class="empty-icon"><i class="fa-solid fa-plus"></i></div>
                <span>Recruit Member</span>
            </div>
        `;
        el.addEventListener('click', () => this.recruitRandom());
        return el;
    }

    renderEmptyState() {
        const el = document.createElement('div');
        el.style.gridColumn = "1 / -1";
        el.style.textAlign = "center";
        el.style.padding = "40px";
        el.style.color = "#6b7280";
        el.innerHTML = `<p>Your company is empty. Recruit your first mercenary!</p>`;
        this.dom.grid.appendChild(el);
        this.dom.grid.appendChild(this.createEmptySlot());
    }

    updateHeaderStats() {
        let totalPower = 0;
        this.mercenaries.forEach(m => {
            totalPower += (m.level * 10) + (m.str + m.int + m.spd);
        });
        
        if (this.dom.stats.power) this.dom.stats.power.innerHTML = `<i class="fa-solid fa-bolt"></i> ${totalPower}`;
    }
}

export function initParty() {
    new PartyManager();
}