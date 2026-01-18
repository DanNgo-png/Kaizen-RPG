import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/empire_builder/empireBuilderManager.js";
import { initMenuButtons } from "./playGameManager.js";

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
        this.glider = null;
        
        // Campaign Settings State (Updated)
        this.companySettings = {
            // Step 2
            name: '',
            bannerIndex: 0,
            color: '#ef4444',
            crisis: 'random',
            
            // Step 3 (Defaults)
            economy: 'veteran',
            funds: 'medium',
            combat: 'veteran',
            ironman: false,
            seed: '',
            unexplored: true
        };
        
        this.dom = {
            // Steps Containers
            stepOrigin: document.getElementById('step-origin'),
            stepCompany: document.getElementById('step-company'),
            stepDifficulty: document.getElementById('step-difficulty'), // NEW
            
            // Step 1 Elements
            list: document.getElementById('mode-list'),
            details: document.getElementById('mode-details-content'),
            btnNext: document.getElementById('btn-next-step'),
            btnBackMenu: document.getElementById('btn-back-to-menu'),
            
            // Header Elements
            headerTitle: document.getElementById('header-title'),
            headerDesc: document.getElementById('header-desc'),

            // Step 2 Elements
            inputName: document.getElementById('input-company-name'),
            bannerGrid: document.getElementById('banner-selection'),
            colorRow: document.getElementById('color-selection'),
            crisisList: document.getElementById('crisis-selection'),
            btnBackStep1: document.getElementById('btn-back-step-1'),
            btnGoToStep3: document.getElementById('btn-goto-step-3'), // Renamed

            // Step 3 Elements 
            inputEconomy: document.getElementById('input-economy'),
            inputFunds: document.getElementById('input-funds'),
            inputCombat: document.getElementById('input-combat'),
            inputIronman: document.getElementById('input-ironman'),
            inputSeed: document.getElementById('input-map-seed'),
            btnRandomSeed: document.getElementById('btn-random-seed'),
            inputUnexplored: document.getElementById('input-unexplored'),
            btnBackStep2: document.getElementById('btn-back-step-2'),
            btnFinalStart: document.getElementById('btn-final-start'),

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
        this.selectMode(GAME_MODES[0].id);
        this.generateRandomSeed(); 
        
        this.bindStep1Events();
        this.bindStep2Events();
        this.bindStep3Events(); 
    }

    bindStep1Events() {
        // Step 1: Next -> Go to Step 2
        this.dom.btnNext.addEventListener('click', () => this.goToStep2());

        // Back to Main Menu
        if (this.dom.btnBackMenu) {
            this.dom.btnBackMenu.addEventListener('click', async () => {
                await loadPage('./pages/games/play-game.html');
                initMenuButtons(); 
            });
        }

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

    bindStep2Events() {
        // Back to Step 1
        this.dom.btnBackStep1.addEventListener('click', () => this.goToStep1());

        // Step 2 -> Step 3
        this.dom.btnGoToStep3.addEventListener('click', () => this.goToStep3());

        // Banners
        const banners = this.dom.bannerGrid.querySelectorAll('.banner-opt');
        banners.forEach((el, index) => {
            el.addEventListener('click', () => {
                banners.forEach(b => b.classList.remove('selected'));
                el.classList.add('selected');
                this.companySettings.bannerIndex = index;
            });
        });

        // Colors
        const colors = this.dom.colorRow.querySelectorAll('.color-opt');
        colors.forEach(el => {
            el.addEventListener('click', () => {
                colors.forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                this.companySettings.color = el.dataset.color;
            });
        });

        // Crisis
        const crises = this.dom.crisisList.querySelectorAll('.crisis-card');
        crises.forEach(el => {
            el.addEventListener('click', () => {
                crises.forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                this.companySettings.crisis = el.dataset.crisis;
            });
        });
    }

    bindStep3Events() {
        // Back to Step 2
        this.dom.btnBackStep2.addEventListener('click', () => this.goToStep2());

        // Random Seed
        this.dom.btnRandomSeed.addEventListener('click', () => this.generateRandomSeed());

        // Final Start
        this.dom.btnFinalStart.addEventListener('click', () => this.handleFinalStart());
    }

    generateRandomSeed() {
        // Generate a random alphanumeric string
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let seed = '';
        for (let i = 0; i < 10; i++) {
            seed += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.dom.inputSeed.value = seed;
        this.companySettings.seed = seed;
    }

    // --- NAVIGATION LOGIC ---
    goToStep1() {
        this.dom.stepCompany.classList.add('hidden');
        this.dom.stepDifficulty.classList.add('hidden');
        this.dom.stepOrigin.classList.remove('hidden');

        this.dom.headerTitle.textContent = "Select Origin";
        this.dom.headerDesc.textContent = "Choose the background for your new company.";
    }

    goToStep2() {
        if (!this.selectedModeId) return;

        this.dom.stepOrigin.classList.add('hidden');
        this.dom.stepDifficulty.classList.add('hidden');
        this.dom.stepCompany.classList.remove('hidden');

        this.dom.headerTitle.textContent = "Company Details";
        this.dom.headerDesc.textContent = "Establish your identity and choose your fate.";
    }

    goToStep3() {
        // Validation for Step 2
        const name = this.dom.inputName.value.trim();
        if (!name) {
            alert("Please enter a company name.");
            this.dom.inputName.focus();
            return;
        }
        this.companySettings.name = name;

        // Transition
        this.dom.stepCompany.classList.add('hidden');
        this.dom.stepDifficulty.classList.remove('hidden');

        this.dom.headerTitle.textContent = "World Settings";
        this.dom.headerDesc.textContent = "Configure the rules of engagement.";
    }

    handleFinalStart() {
        // Gather Step 3 Data
        this.companySettings.economy = this.dom.inputEconomy.value;
        this.companySettings.funds = this.dom.inputFunds.value;
        this.companySettings.combat = this.dom.inputCombat.value;
        this.companySettings.ironman = this.dom.inputIronman.checked;
        this.companySettings.seed = this.dom.inputSeed.value.trim() || "KAIZEN";
        this.companySettings.unexplored = this.dom.inputUnexplored.checked;

        console.log("🚀 Starting Campaign with:", {
            mode: this.selectedModeId,
            settings: this.companySettings
        });

        // ... (Existing Mode Specific Logic) ...
        if (this.selectedModeId === 'empire') {
            this.dom.empireModal.classList.remove("hidden");
        } 
        else if (this.selectedModeId === 'sellswords' || this.selectedModeId === 'lonewolf') {
            alert("Campaign created! Loading world...");
            // await loadPage('./pages/games/party.html');
            // initParty();
        } 
        else {
            alert(`The mode "${this.selectedModeId}" is currently in development.`);
        }
    }

    // --- RENDER LOGIC (STEP 1) ---

    renderList() {
        this.dom.list.innerHTML = '';
        
        // 1. Create and Append the Glider
        const glider = document.createElement('div');
        glider.className = 'mode-list-glider';
        this.dom.list.appendChild(glider);
        this.glider = glider; 
        
        // 2. Render Items
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

        // 1. Update Active Classes
        const items = this.dom.list.querySelectorAll('.mode-list-item');
        let selectedEl = null;

        items.forEach(el => {
            if (el.dataset.id === id) {
                el.classList.add('active');
                selectedEl = el;
            } else {
                el.classList.remove('active');
            }
        });

        // 2. Move the Glider
        if (selectedEl && this.glider) {
            this.glider.style.top = `${selectedEl.offsetTop}px`;
            this.glider.style.height = `${selectedEl.offsetHeight}px`;
        }

        // 3. Render Details
        this.renderDetails(modeData);
    }

    renderDetails(mode) {
        if (!mode) return;

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
}

export function initGameModes() {
    new GameModesManager();
}