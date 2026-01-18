import { GameAPI } from "../../api/GameAPI.js";
import { loadPage } from "../../router.js"; 
import { initLoadCampaign } from "../LoadCampaignManager.js"; 
import { NAMES } from "./Names.js";
import { ROLES } from "./Roles.js";

export class PartyManager {
    constructor() {
        this.dom = {
            grid: document.querySelector('.party-grid'),
            btnRecruit: document.querySelector('.btn-recruit'),
            stats: {
                power: document.querySelector('.p-val.text-fire'),
                buffs: document.querySelector('.p-val.text-blue'),
                gold: null
            }
        };

        this.partyData = { mercenaries: [], resources: { gold: 0, renown: 0 } };
        this.init();
    }

    init() {
        if (!this.dom.grid) return;

        // 1. Listen for Data
        Neutralino.events.off('receivePartyData', this._onDataReceived);
        Neutralino.events.on('receivePartyData', this._onDataReceived.bind(this));

        // 2. Listen for Hiring Result
        Neutralino.events.off('mercenaryHired', this._onHired);
        Neutralino.events.on('mercenaryHired', this._onHired.bind(this));

        // 3. Bind Actions
        if (this.dom.btnRecruit) {
            // Remove old listeners to prevent duplicates
            const newBtn = this.dom.btnRecruit.cloneNode(true);
            this.dom.btnRecruit.parentNode.replaceChild(newBtn, this.dom.btnRecruit);
            this.dom.btnRecruit = newBtn;
            
            this.dom.btnRecruit.addEventListener('click', () => this.generateRecruit());
        }

        // 4. Fetch
        GameAPI.getPartyData();
    }

    _onDataReceived(e) {
        const data = e.detail;
        if (!data) {
            this.renderNoSaveState();
            return;
        }
        
        this.partyData = data;
        this.render();
    }

    _onHired(e) {
        const res = e.detail;
        if (!res.success) {
            // Use a toast or modal in the future, alert for now
            console.warn(`Recruitment failed: ${res.error}`); 
            alert(`Not enough coin, captain. Need more gold.`);
        } 
    }

    generateRecruit() {
        const currentGold = this.partyData.resources.gold;
        // Basic cost calculation (could be dynamic based on stats later)
        const recruitCost = 100; 

        if (currentGold < recruitCost) {
            alert(`You cannot afford this contract. (Cost: ${recruitCost}g, Have: ${currentGold}g)`);
            return;
        }

        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const role = ROLES[Math.floor(Math.random() * ROLES.length)];
        
        // Random Stats (Base 5-15)
        // In the future, we can weigh these based on Role (e.g. Hedge Knight has high Str, low Spd)
        const str = 5 + Math.floor(Math.random() * 10);
        const int = 5 + Math.floor(Math.random() * 10);
        const spd = 5 + Math.floor(Math.random() * 10);

        const mercData = { 
            name, 
            role, 
            level: 1, 
            str, int, spd,
            wage: 10 + Math.floor(Math.random() * 10) // Daily wage varies
        };

        const confirmMsg = `
            Contract Offer:
            ----------------
            Name:  ${name}
            Role:  ${role}
            Wage:  ${mercData.wage}g / day
            
            Stats:
            [STR: ${str}] [INT: ${int}] [SPD: ${spd}]
            
            Hiring Cost: ${recruitCost}g
        `;

        if (confirm(confirmMsg)) {
            GameAPI.hireMercenary(mercData, recruitCost);
        }
    }

    render() {
        this.dom.grid.innerHTML = '';
        const { mercenaries, resources } = this.partyData;

        this.updateHeaderStats(mercenaries, resources);

        if (mercenaries.length === 0) {
            this.renderEmptyState();
        } else {
            mercenaries.forEach(merc => {
                const card = this.createCard(merc);
                this.dom.grid.appendChild(card);
            });
            this.dom.grid.appendChild(this.createEmptySlot());
        }
    }

    updateHeaderStats(mercs, res) {
        let totalPower = 0;
        mercs.forEach(m => totalPower += (m.level * 10) + (m.str + m.int + m.spd));
        
        if (this.dom.stats.power) this.dom.stats.power.innerHTML = `<i class="fa-solid fa-bolt"></i> ${totalPower}`;
        
        // Inject/Update Gold Display
        let goldEl = document.getElementById('party-gold-display');
        if (!goldEl) {
            const container = document.querySelector('.party-header-stats');
            if (container) {
                const div = document.createElement('div');
                div.className = 'p-stat';
                div.innerHTML = `
                    <span class="p-label">Treasury</span>
                    <span id="party-gold-display" class="p-val text-gold" style="color:#facc15">
                        <i class="fa-solid fa-coins"></i> ${res.gold}
                    </span>
                `;
                container.prepend(div);
            }
        } else {
            goldEl.innerHTML = `<i class="fa-solid fa-coins"></i> ${res.gold}`;
        }
    }

    createCard(merc) {
        const el = document.createElement('div');
        const totalStats = (merc.str || 10) + (merc.int || 10) + (merc.spd || 10);
        
        let rarity = 'rarity-common';
        if (totalStats > 40) rarity = 'rarity-legendary'; // Orange
        else if (totalStats > 30) rarity = 'rarity-rare'; // Blue
        else if (totalStats > 20) rarity = 'rarity-uncommon'; // Green

        el.className = `char-card ${rarity}`;
        
        const xpPercent = Math.min(merc.xp || 0, 100); 

        // Role Icons mapping
        let roleIcon = 'fa-user-shield';
        if (merc.role === 'Skirmisher' || merc.role === 'Raider') roleIcon = 'fa-person-running';
        if (merc.role === 'Quartermaster') roleIcon = 'fa-scroll';
        if (merc.role === 'Hedge Knight') roleIcon = 'fa-chess-rook';
        if (merc.role === 'Swordmaster') roleIcon = 'fa-khanda';

        el.innerHTML = `
            <div class="char-header">
                <div class="char-avatar">
                    <i class="fa-solid ${roleIcon}"></i>
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
                        <div class="fill" style="width: ${xpPercent}%; background-color: var(--accent-purple);"></div>
                    </div>
                    <span class="stat-val">${merc.xp || 0}%</span>
                </div>

                <div class="attributes-grid">
                    <div class="attr" title="Strength"><i class="fa-solid fa-dumbbell"></i> <span>${merc.str}</span></div>
                    <div class="attr" title="Intellect"><i class="fa-solid fa-brain"></i> <span>${merc.int}</span></div>
                    <div class="attr" title="Speed"><i class="fa-solid fa-wind"></i> <span>${merc.spd}</span></div>
                </div>
            </div>

            <div class="char-footer">
                <button class="btn-manage">Manage</button>
                <button class="btn-icon-only" title="Dismiss"><i class="fa-solid fa-door-open"></i></button>
            </div>
        `;

        el.querySelector('.btn-icon-only').addEventListener('click', () => {
             alert(`You can't dismiss ${merc.name} yet. The contract is binding!`);
        });

        return el;
    }

    createEmptySlot() {
        const el = document.createElement('div');
        el.className = 'char-card empty-slot';
        el.innerHTML = `
            <div class="empty-content">
                <div class="empty-icon"><i class="fa-solid fa-plus"></i></div>
                <span>Recruit (100g)</span>
            </div>
        `;
        el.addEventListener('click', () => this.generateRecruit());
        return el;
    }

    renderEmptyState() {
        this.dom.grid.innerHTML = '';
        const el = document.createElement('div');
        el.style.gridColumn = "1 / -1";
        el.style.textAlign = "center";
        el.style.padding = "40px";
        el.style.color = "#6b7280";
        el.innerHTML = `<p>Your company is empty. The roads are dangerous. Recruit someone!</p>`;
        this.dom.grid.appendChild(el);
        this.dom.grid.appendChild(this.createEmptySlot());
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
}

export function initParty() {
    new PartyManager();
}