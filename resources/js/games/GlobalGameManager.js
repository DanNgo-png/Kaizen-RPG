import { GameAPI } from "../api/GameAPI.js";
import { notifier } from "../_global-managers/NotificationManager.js";
import { buildAftermathModal } from "../handlers/MercenaryHandler.js";

const CONTRACT_TYPE = Object.freeze({
    DIRECT_CLEARING: "direct_clearing"
});

class GlobalGameManager {
    constructor() {
        this.activeContract = null;
        this.uncommittedSeconds = 0;
        this.init();
    }

    init() {
        // 1. Listen for real-time focus ticks
        document.addEventListener('kaizen:game-focus-tick', (e) => this.handleTick(e));

        // 2. Keep local state in sync with game events
        Neutralino.events.on('contractAccepted', (e) => {
            this.activeContract = e.detail.activeContract;
        });

        Neutralino.events.on('contractAborted', () => {
            this.activeContract = null;
        });

        // 3. React to real-time completion
        Neutralino.events.on('contractCompletedRealtime', (e) => {
            this.activeContract = null;
            const result = e.detail;
            
            if (result && result.contract) {
                const isDirectClearing = result.contract.contract_type === CONTRACT_TYPE.DIRECT_CLEARING;
                const lootCount = Array.isArray(result.loot) ? result.loot.length : 0;
                const title = isDirectClearing ? "Enemy Settlement Cleared!" : "Contract Completed!";
                const message = isDirectClearing
                    ? `Recovered ${lootCount} item(s) from the hostile settlement.`
                    : `You earned ${result.contract.gold_reward} crowns and ${result.contract.renown_reward || 0} Renown.`;

                // OS Level Notification
                notifier.show(
                    title,
                    message,
                    isDirectClearing ? "fa-solid fa-skull-crossbones" : "fa-solid fa-scroll"
                );
                
                // Show the immersive RPG Loot screen
                buildAftermathModal(result);
            }
        });

        Neutralino.events.on('receiveActiveContract', (e) => {
            this.activeContract = e.detail || null;
        });

        // 4. Ensure we fetch the contract immediately when a save is loaded or generated
        Neutralino.events.on('gameLoaded', () => {
            GameAPI.getActiveContract();
        });

        Neutralino.events.on('gameCreated', () => {
            GameAPI.getActiveContract();
        });

        // Initial fetch (handles cases where they refresh the window while mid-game)
        setTimeout(() => {
            GameAPI.getActiveContract();
        }, 1000); 

        // Bind global save hook for window close/refresh
        window.kaizenSaveGameProgress = () => this.saveState();
    }

    saveState() {
        if (this.activeContract) {
            GameAPI.saveContractProgress(this.activeContract.id, this.activeContract.progress_minutes);
        }
    }

    handleTick(e) {
        if (!this.activeContract) return;

        const seconds = e.detail.seconds;
        this.activeContract.progress_minutes += (seconds / 60);
        this.uncommittedSeconds += seconds;

        // Dispatch an event so the Game UI can animate the progress bar if it is open
        document.dispatchEvent(new CustomEvent('kaizen:contract-progress-updated', {
            detail: this.activeContract
        }));

        // Check for completion
        if (this.activeContract.progress_minutes >= this.activeContract.required_minutes) {
            const contractId = this.activeContract.id;
            this.activeContract = null; // Clear immediately to avoid duplicate triggers
            this.uncommittedSeconds = 0;
            GameAPI.completeActiveContract(contractId);
        } else if (this.uncommittedSeconds >= 10) {
            // Save to DB every 10 seconds of focus to prevent data loss on crash/refresh
            this.saveState();
            this.uncommittedSeconds = 0;
        }
    }
}

export const globalGameManager = new GlobalGameManager();
