import { loadPage } from "../router.js";
import { initEmpireBuilder } from "./game_modes/origins/empire_builder/empireBuilderManager.js";
import { initMenuButtons } from "./playGameManager.js";
import { campaignState } from "./game_modes/logic/CampaignState.js";

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
        
        this.init();
    }

    init() {
        campaignState.reset();

        // Initialize all Steps
        Object.values(this.steps).forEach(step => step.init());

        // Bind Navigation Buttons
        this.bindNavigation();

        // Start at Step 1
        this.goToOrigin();
    }

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

        // Empire Modal logic (kept simple here)
        this.bindEmpireModal();
    }

    updateHeader(title, desc) {
        this.header.title.textContent = title;
        this.header.desc.textContent = desc;
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
        } else if (['sellswords', 'lonewolf', 'ironman'].includes(finalConfig.modeId)) {
            alert("Campaign created! Loading world...");
            // In future: Save to DB here via GameAPI
            // await loadPage('./pages/games/party.html');
            // initParty();
        } else {
            alert("Mode in development.");
        }
    }

    bindEmpireModal() {
        const confirm = document.getElementById("btn-confirm-empire");
        const cancel = document.getElementById("btn-cancel-empire");

        if (confirm) {
            confirm.addEventListener("click", async () => {
                this.empireModal.classList.add("hidden");
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