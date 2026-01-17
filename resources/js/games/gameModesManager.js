import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/empire_builder/empireBuilderManager.js";

const GAME_MODES = [
    {
        id: 'sellswords',
        title: 'The Sellswords',
        subtitle: 'The standard experience.',
        icon: 'fa-solid fa-users-viewfinder',
        color: '#10b981', // Green
        badge: 'Recommended',
        lore: `"A classic beginning. You lead a small band of mercenaries looking to make a name for themselves in the chaos of the backlog. Balance work, health, and gold to build a legendary company."`,
        features: [
            { icon: 'fa-solid fa-check', text: 'Standard XP & Loot rates', color: '#10b981' },
            { icon: 'fa-solid fa-user-shield', text: 'Balanced party management', color: '#60a5fa' },
            { icon: 'fa-solid fa-heart-pulse', text: 'Injuries heal over time', color: '#fbbf24' }
        ]
    },
    {
        id: 'empire',
        title: 'Empire Builder',
        subtitle: '4X Strategy Mode.',
        icon: 'fa-solid fa-map-location-dot',
        color: '#f59e0b', // Orange
        badge: 'Strategy',
        lore: `"The world is covered in the Fog of Procrastination. Convert your Focus Points into Influence to annex territory, capture Resource Nodes, and build your productivity kingdom sector by sector."`,
        features: [
            { icon: 'fa-solid fa-chess-board', text: 'Grid-based Map Conquest', color: '#f59e0b' },
            { icon: 'fa-solid fa-industry', text: 'Passive Resource Generation', color: '#a78bfa' },
            { icon: 'fa-solid fa-dungeon', text: 'Defend against Regression Raids', color: '#ef4444' }
        ]
    },
    {
        id: 'lonewolf',
        title: 'Lone Wolf',
        subtitle: 'Hardcore solo challenge.',
        icon: 'fa-solid fa-user-ninja',
        color: '#a78bfa', // Purple
        badge: 'Hardcore',
        lore: `"You trust no one but yourself. You start with a single, powerful avatar. All XP is yours, but if you falter, there is no one to carry you. <b>Permadeath is enabled.</b>"`,
        features: [
            { icon: 'fa-solid fa-bolt', text: '+50% XP Multiplier', color: '#a78bfa' },
            { icon: 'fa-solid fa-skull', text: 'Permadeath: Fail 3 sessions in a row', color: '#ef4444' },
            { icon: 'fa-solid fa-gem', text: 'Starts with Legendary Gear', color: '#fcd34d' }
        ]
    },
    {
        id: 'ironman',
        title: 'Ironman Patrol',
        subtitle: 'Roguelite productivity.',
        icon: 'fa-solid fa-hourglass-start',
        color: '#3b82f6', // Blue
        badge: 'Quick Play',
        lore: `"Every focus session is a random encounter. Survive the day to keep your streak. One slip up resets your multiplier. How long can you last on the frontier?"`,
        features: [
            { icon: 'fa-solid fa-dice', text: 'Random Daily Buffs/Debuffs', color: '#60a5fa' },
            { icon: 'fa-solid fa-fire-flame-curved', text: 'Streak-based Progression', color: '#fb923c' },
            { icon: 'fa-solid fa-stopwatch', text: 'Fixed 25m Sessions Only', color: '#9ca3af' }
        ]
    }
];

export class GameModesManager {
    constructor() {
        this.selectedModeId = null;
        
        this.dom = {
            list: document.getElementById('mode-list'),
            details: document.getElementById('mode-details-content'),
            btnStart: document.getElementById('btn-start-selected'),
            
            // Empire Modal References
            empireModal: document.getElementById("empire-modal-overlay"),
            btnConfirmEmpire: document.getElementById("btn-confirm-empire"),
            btnCancelEmpire: document.getElementById("btn-cancel-empire")
        };

        this.init();
    }

    init() {
        if (!this.dom.list) return;

        this.renderList();
        
        // Select first by default
        this.selectMode(GAME_MODES[0].id);

        this.bindEvents();
    }

    bindEvents() {
        this.dom.btnStart.addEventListener('click', () => this.handleStartClick());

        // Empire Modal Bindings
        if (this.dom.btnCancelEmpire) {
            this.dom.btnCancelEmpire.addEventListener('click', () => {
                this.dom.empireModal.classList.add("hidden");
            });
        }

        if (this.dom.empireModal) {
            this.dom.empireModal.addEventListener("click", (e) => {
                if (e.target === this.dom.empireModal) {
                    this.dom.empireModal.classList.add("hidden");
                }
            });
        }

        if (this.dom.btnConfirmEmpire) {
            this.dom.btnConfirmEmpire.addEventListener("click", async () => {
                this.dom.empireModal.classList.add("hidden");
                await loadPage("./pages/games/empire-builder.html");
                initEmpireBuilder();
            });
        }
    }

    renderList() {
        this.dom.list.innerHTML = '';
        
        GAME_MODES.forEach(mode => {
            const el = document.createElement('div');
            el.className = 'mode-list-item';
            el.dataset.id = mode.id;
            
            el.innerHTML = `
                <div class="mode-thumb" style="color: ${mode.color}">
                    <i class="${mode.icon}"></i>
                </div>
                <div class="mode-info">
                    <h4>${mode.title}</h4>
                    <span>${mode.subtitle}</span>
                </div>
            `;

            el.addEventListener('click', () => this.selectMode(mode.id));
            this.dom.list.appendChild(el);
        });
    }

    selectMode(id) {
        this.selectedModeId = id;
        const modeData = GAME_MODES.find(m => m.id === id);

        // 1. Update List Visuals
        const items = this.dom.list.querySelectorAll('.mode-list-item');
        items.forEach(el => {
            if (el.dataset.id === id) el.classList.add('active');
            else el.classList.remove('active');
        });

        // 2. Render Details
        this.renderDetails(modeData);
    }

    renderDetails(mode) {
        if (!mode) return;

        // Generate Features HTML
        const featuresHtml = mode.features.map(f => `
            <li class="feature-item">
                <i class="${f.icon}" style="color: ${f.color}"></i>
                <span>${f.text}</span>
            </li>
        `).join('');

        this.dom.details.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon-large" style="color: ${mode.color}">
                    <i class="${mode.icon}"></i>
                </div>
                <h1 class="detail-title">${mode.title}</h1>
                <span class="detail-badge">${mode.badge}</span>
            </div>

            <div class="detail-lore">
                ${mode.lore}
            </div>

            <div class="detail-section-title">Key Features</div>
            <ul class="feature-list">
                ${featuresHtml}
            </ul>
        `;
    }

    handleStartClick() {
        if (!this.selectedModeId) return;

        console.log(`Starting campaign mode: ${this.selectedModeId}`);

        if (this.selectedModeId === 'empire') {
            this.dom.empireModal.classList.remove("hidden");
        } 
        else if (this.selectedModeId === 'sellswords') {
            alert("Starting standard campaign... (Feature coming soon)");
            // In future: loadPage('./pages/games/campaign-dashboard.html');
        } 
        else {
            alert(`The mode "${this.selectedModeId}" is currently in development.`);
        }
    }
}

// Hook for main router
export function initGameModes() {
    new GameModesManager();
}