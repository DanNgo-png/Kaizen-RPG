import { GameAPI } from "../../api/GameAPI.js";
import { EXTENSION_ID } from "../../api/_extension_id.js";
import { loadPage } from "../../router.js"; 
import { initLoadCampaign } from "../LoadCampaignManager.js"; 
import { NAMES } from "./Names.js";
import { ROLES } from "./Roles.js";
import { notifier } from "../../_global-managers/NotificationManager.js";

export class PartyManager {
    constructor() {
        this.dom = {
            grid: document.querySelector('.party-grid'),
            btnRecruit: document.querySelector('.btn-recruit'),
            toolbarActions: document.querySelector('.toolbar-actions'),
            stats: {
                power: document.querySelector('.p-val.text-fire'),
                buffs: document.querySelector('.p-val.text-blue'),
                gold: null // Found dynamically
            }
        };

        this.partyData = { mercenaries: [], resources: { gold: 0, renown: 0 } };
        this.init();
    }

    init() {
        if (!this.dom.grid) return;

        // 1. Listen for Data Updates
        Neutralino.events.off('receivePartyData', this._onDataReceived);
        Neutralino.events.on('receivePartyData', this._onDataReceived.bind(this));

        // 2. Listen for Action Results
        Neutralino.events.off('mercenaryHired', this._onHired);
        Neutralino.events.on('mercenaryHired', this._onHired.bind(this));

        Neutralino.events.off('dayEnded', this._onDayEnded);
        Neutralino.events.on('dayEnded', this._onDayEnded.bind(this));

        // 3. Bind Recruit Button
        if (this.dom.btnRecruit) {
            // Clone to remove old listeners
            const newBtn = this.dom.btnRecruit.cloneNode(true);
            this.dom.btnRecruit.parentNode.replaceChild(newBtn, this.dom.btnRecruit);
            this.dom.btnRecruit = newBtn;
            
            this.dom.btnRecruit.addEventListener('click', () => this.generateRecruit());
        }

        // 4. Inject "End Day" Button
        this._injectEndDayButton();

        // 5. Initial Fetch
        GameAPI.getPartyData();
    }

    _injectEndDayButton() {
        if (this.dom.toolbarActions && !document.getElementById('btn-end-day')) {
            const btnEnd = document.createElement('button');
            btnEnd.id = 'btn-end-day';
            // Styling to match existing toolbar buttons but slightly distinct
            btnEnd.style.backgroundColor = '#1f2937'; 
            btnEnd.style.border = '1px solid #374151';
            btnEnd.style.color = '#e5e7eb';
            btnEnd.style.padding = '8px 16px';
            btnEnd.style.borderRadius = '6px';
            btnEnd.style.cursor = 'pointer';
            btnEnd.style.marginRight = '10px';
            btnEnd.style.fontWeight = '600';
            btnEnd.innerHTML = `<i class="fa-solid fa-moon"></i> End Day`;

            btnEnd.addEventListener('click', () => this.handleEndDay());
            
            // Insert as first item
            this.dom.toolbarActions.prepend(btnEnd);
        }
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
            notifier.show("Hiring Failed", "Not enough gold or roster full.", "fa-solid fa-coins");
        } else {
            notifier.show("Recruited!", "A new mercenary has joined the company.", "fa-solid fa-handshake");
        }
    }

    _onDayEnded(e) {
        if(e.detail.success) {
            notifier.show("Day Ended", `Paid ${e.detail.wagesPaid}g wages. Party rested.`, "fa-solid fa-moon");
            // Data refresh is automatic via controller
        } else {
            alert("Failed to end day: " + e.detail.error);
        }
    }

    handleEndDay() {
        const wageSum = this.partyData.mercenaries.reduce((sum, m) => sum + (m.daily_wage || 0), 0);
        
        if (confirm(`End the day?\n\nCosts: ${wageSum}g in wages.\nEffect: Active mercs gain fatigue. Resting mercs heal.`)) {
            Neutralino.extensions.dispatch(EXTENSION_ID, "processDayEnd");
        }
    }

    handleToggleStatus(merc) {
        // Toggle between 1 (Active) and 0 (Resting)
        const newStatus = merc.is_active ? 0 : 1;
        
        // Dispatch to backend (Requires backend handler for 'toggleMercenaryStatus')
        Neutralino.extensions.dispatch(EXTENSION_ID, "toggleMercenaryStatus", { 
            id: merc.id, 
            is_active: newStatus 
        });
    }

    generateRecruit() {
        const currentGold = this.partyData.resources.gold;
        const recruitCost = 100; 

        if (currentGold < recruitCost) {
            notifier.show("Insufficient Funds", `Recruiting costs ${recruitCost}g.`, "fa-solid fa-coins");
            return;
        }

        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const role = ROLES[Math.floor(Math.random() * ROLES.length)];
        
        // Random Stats
        const str = 5 + Math.floor(Math.random() * 10);
        const int = 5 + Math.floor(Math.random() * 10);
        const spd = 5 + Math.floor(Math.random() * 10);
        
        // Daily wage based on stats
        const statSum = str + int + spd;
        const wage = Math.floor(statSum / 2); 

        const mercData = { 
            name, role, level: 1, 
            str, int, spd, 
            wage: wage,
            current_hp: 100, max_hp: 100,
            fatigue: 0
        };

        const confirmMsg = `
            Contract Offer:
            ----------------
            Name:  ${name}
            Role:  ${role}
            Wage:  ${mercData.wage}g / day
            
            Stats: [STR: ${str}] [INT: ${int}] [SPD: ${spd}]
            
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
        if (totalStats > 45) rarity = 'rarity-legendary';
        else if (totalStats > 35) rarity = 'rarity-rare';
        else if (totalStats > 25) rarity = 'rarity-uncommon';

        el.className = `char-card ${rarity}`;
        
        // --- Calculate Bars ---
        const maxHp = merc.max_hp || 100;
        const curHp = merc.current_hp !== undefined ? merc.current_hp : 100;
        const hpPercent = (curHp / maxHp) * 100;

        const fatigue = merc.fatigue || 0;
        const fatiguePercent = Math.min(fatigue, 100);
        
        // Fatigue Color Logic
        let fatigueColor = '#3b82f6'; // Blue (Low)
        if (fatigue > 50) fatigueColor = '#f59e0b'; // Orange (Medium)
        if (fatigue > 80) fatigueColor = '#ef4444'; // Red (Danger)

        // Status Badge Logic
        const statusClass = merc.is_active ? 'badge-active' : 'badge-bench';
        const statusText = merc.is_active ? 'On Duty' : 'Resting';
        const statusStyle = merc.is_active 
            ? 'background:rgba(16,185,129,0.15); color:#34d399; border:1px solid #059669;' 
            : 'background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid #1d4ed8;';

        // Role Icon
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
                <div class="char-badge" style="${statusStyle}">${statusText}</div>
            </div>

            <div class="char-body">
                <!-- HP Bar -->
                <div class="stat-row">
                    <span class="stat-name"><i class="fa-solid fa-heart" style="color:#ef4444" title="Health"></i></span>
                    <div class="progress-bar" style="background:#374151;">
                        <div class="fill" style="width: ${hpPercent}%; background-color: #ef4444; height:100%; border-radius:3px;"></div>
                    </div>
                    <span class="stat-val">${curHp}</span>
                </div>

                <!-- Fatigue Bar -->
                <div class="stat-row">
                    <span class="stat-name"><i class="fa-solid fa-bolt" style="color:#f59e0b" title="Fatigue"></i></span>
                    <div class="progress-bar" style="background:#374151;">
                        <div class="fill" style="width: ${fatiguePercent}%; background-color: ${fatigueColor}; height:100%; border-radius:3px;"></div>
                    </div>
                    <span class="stat-val">${fatigue}%</span>
                </div>

                <div class="attributes-grid">
                    <div class="attr" title="Strength"><i class="fa-solid fa-dumbbell"></i> <span>${merc.str}</span></div>
                    <div class="attr" title="Intellect"><i class="fa-solid fa-brain"></i> <span>${merc.int}</span></div>
                    <div class="attr" title="Speed"><i class="fa-solid fa-wind"></i> <span>${merc.spd}</span></div>
                    <div class="attr" title="Daily Wage" style="grid-column: 1 / -1; justify-content:center; color:#fbbf24;">
                        <i class="fa-solid fa-coins"></i> <span>${merc.daily_wage || 10}g / day</span>
                    </div>
                </div>
            </div>

            <div class="char-footer">
                <button class="btn-manage action-toggle">
                    ${merc.is_active ? 'Rest' : 'Mobilize'}
                </button>
                <button class="btn-icon-only action-dismiss" title="Dismiss"><i class="fa-solid fa-door-open"></i></button>
            </div>
        `;

        // Bind Buttons
        el.querySelector('.action-toggle').addEventListener('click', () => this.handleToggleStatus(merc));
        
        el.querySelector('.action-dismiss').addEventListener('click', () => {
             if(confirm(`Dismiss ${merc.name} permanently?`)) {
                 // Dispatch dismiss event (assuming backend support)
                 // Neutralino.extensions.dispatch(EXTENSION_ID, "dismissMercenary", { id: merc.id });
                 alert("Dismissal feature coming in next patch.");
             }
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
            <button id="btn-goto-load" class="btn-primary" style="padding: 10px 20px; cursor:pointer; background:#3b82f6; border:none; color:white; border-radius:6px;">Load Game</button>
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