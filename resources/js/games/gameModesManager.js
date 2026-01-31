import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/origins/empire_builder/empireBuilderManager.js";
import { initMenuButtons } from "./playGameManager.js";
import { campaignState } from "./game_modes/logic/CampaignState.js";
import { GameAPI } from "../api/GameAPI.js"; 
import { EXTENSION_ID } from "../api/_extension_id.js"; 
import { initWorldMap } from "./world/WorldMapManager.js"; 

// Import Steps
import { SelectModeStep } from "./game_modes/steps/SelectModeStep.js";
import { CompanyDetailsStep } from "./game_modes/steps/CompanyDetailsStep.js";
import { WorldSettingsStep } from "./game_modes/steps/WorldSettingsStep.js";

export class GameModesManager {
    constructor() {
        this.steps = {
            origin: new SelectModeStep('step-origin'),
            company: new CompanyDetailsStep('step-company'),
            difficulty: new WorldSettingsStep('step-difficulty')
        };

        this.header = {
            title: document.getElementById('header-title'),
            desc: document.getElementById('header-desc')
        };

        this.empireModal = document.getElementById("empire-modal-overlay");
        
        // Retrieve the slot ID passed from the Load Screen
        const storedSlot = localStorage.getItem('kaizen_target_slot');
        
        if (storedSlot) {
            // Explicit slot chosen (e.g. from Load Screen "New Campaign")
            this.targetSlotId = storedSlot;
            this._autoSlotSearch = false;
            // Clear it so it doesn't persist if we navigate away and back via main menu
            localStorage.removeItem('kaizen_target_slot');
        } else {
            // No slot chosen (Main Menu flow), default to 1 but trigger search
            this.targetSlotId = 1; 
            this._autoSlotSearch = true;
        }

        this.init();
    }

    init() {
        campaignState.reset();

        // Listen for the Game Created event
        Neutralino.events.off('gameCreated', this._onGameCreated);
        Neutralino.events.on('gameCreated', this._onGameCreated);

        // Initialize all Steps
        Object.values(this.steps).forEach(step => step.init());

        // Bind Navigation Buttons
        this.bindNavigation();

        // Auto-Detect Slot if needed
        if (this._autoSlotSearch) {
            this.findNextAvailableSlot();
        }

        // Start at Step 1
        this.goToOrigin();
    }

    findNextAvailableSlot() {
        const handler = (e) => {
            const files = e.detail || [];
            const usedIds = new Set(files.map(f => parseInt(f.slotId)));
            
            // Look for first free slot (1, 2, 3)
            let freeId = 1;
            while (freeId <= 3) {
                if (!usedIds.has(freeId)) break;
                freeId++;
            }
            
            // If 1-3 are full, freeId becomes 4. 
            // Current UI only supports 3 slots easily, so we default to overwrite Slot 1 if full.
            if (freeId > 3) freeId = 1; 

            this.targetSlotId = freeId;
            console.log(`💾 Auto-assigned New Campaign to Slot ${this.targetSlotId}`);
            
            Neutralino.events.off('receiveSaveSlots', handler);
        };

        Neutralino.events.on('receiveSaveSlots', handler);
        // Dispatch request to backend
        Neutralino.extensions.dispatch(EXTENSION_ID, "listSaveSlots");
    }

    _onGameCreated = async (e) => {
        const { success, slotId } = e.detail;
        if (success) {
            console.log(`✅ Campaign created in Slot ${slotId}`);
            await loadPage('./pages/games/world-map.html');
            initWorldMap();
        } else {
            alert("Failed to create campaign. Check console for errors.");
        }
    };

    bindNavigation() {
        // Step 1 -> 2
        document.getElementById('btn-next-step').addEventListener('click', () => this.goToCompany());
        
        // Step 2 -> 1
        document.getElementById('btn-back-step-1').addEventListener('click', () => this.goToOrigin());
        
        // Step 2 -> 3
        document.getElementById('btn-goto-step-3').addEventListener('click', () => {
            if (this.steps.company.validate()) this.goToDifficulty();
        });

        // Step 3 -> 2
        document.getElementById('btn-back-step-2').addEventListener('click', () => this.goToCompany());

        // Final Start
        document.getElementById('btn-final-start').addEventListener('click', () => this.startGame());

        // External Navigation
        const backToMenu = document.getElementById('btn-back-to-menu');
        if (backToMenu) {
            backToMenu.addEventListener('click', async () => {
                await loadPage('./pages/games/play-game.html');
                initMenuButtons();
            });
        }

        this.bindEmpireModal();
    }

    updateHeader(title, desc) {
        if(this.header.title) this.header.title.textContent = title;
        if(this.header.desc) this.header.desc.textContent = desc;
    }

    // --- NAVIGATION FLOW ---

    goToOrigin() {
        this.steps.company.hide();
        this.steps.difficulty.hide();
        this.steps.origin.show();
        this.updateHeader("Select Origin", "Choose the background for your new company.");
    }

    goToCompany() {
        this.steps.origin.hide();
        this.steps.difficulty.hide();
        this.steps.company.show();
        this.updateHeader("Company Details", "Establish your identity and choose your fate.");
    }

    goToDifficulty() {
        this.steps.origin.hide();
        this.steps.company.hide();
        this.steps.difficulty.show();
        this.updateHeader("World Settings", "Configure the rules of engagement.");
    }

    // --- START LOGIC ---

    startGame() {
        const finalConfig = campaignState.getAll();
        console.log("🚀 Starting Campaign:", finalConfig);

        if (finalConfig.modeId === 'empire') {
            this.empireModal.classList.remove("hidden");
        } else {
            // For standard modes, create the save file immediately
            const btn = document.getElementById('btn-final-start');
            if(btn) {
                btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...`;
                btn.disabled = true;
            }

            // Dispatch to backend
            GameAPI.createCampaign(this.targetSlotId, finalConfig);
        }
    }

    bindEmpireModal() {
        const confirm = document.getElementById("btn-confirm-empire");
        const cancel = document.getElementById("btn-cancel-empire");

        if (confirm) {
            confirm.addEventListener("click", async () => {
                this.empireModal.classList.add("hidden");
                // TODO: Empire Mode should probably also initialize a Save DB
                await loadPage("./pages/games/empire-builder.html");
                initEmpireBuilder();
            });
        }
        if (cancel) {
            cancel.addEventListener("click", () => this.empireModal.classList.add("hidden"));
        }
    }
}

export function initGameModes() {
    new GameModesManager();
}