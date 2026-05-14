import { BAREBONES_UI } from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

const confirmAction = (message) => globalThis.confirm?.(message) ?? true;

export class ContractPanel {
    constructor({
        dom,
        onAcceptContract,
        onAbortContract
    }) {
        this.dom = dom;
        this.onAcceptContract = onAcceptContract;
        this.onAbortContract = onAbortContract;
    }

    renderLoading() {
        if (this.dom.contractList) {
            this.dom.contractList.innerHTML = loadingStateHtml("Loading...");
        }
    }

    renderContracts(contracts, activeContract) {
        if (!this.dom.contractList) return;

        this.dom.contractList.innerHTML = "";
        if (!contracts?.length) {
            this.dom.contractList.innerHTML = emptyStateHtml("No jobs available here currently.");
            return;
        }

        const isBusy = Boolean(activeContract);
        contracts.forEach((contract) => {
            this.dom.contractList.appendChild(this._createContractCard(contract, isBusy));
        });
    }

    updateActiveBanner(activeContract, isDelving) {
        this._hideActionElements();

        if (activeContract) {
            this._renderContractBanner(activeContract);
            return;
        }

        if (isDelving) {
            this._renderDelvingBanner();
            return;
        }

        this._renderIdleBanner();
    }

    updateProgress(activeContract) {
        if (!activeContract || !this.dom.progressFill || !this.dom.progressText) return;

        const progress = activeContract.progress_minutes || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const target = activeContract.required_minutes;
        const percent = this._progressPercent(progress, target);
        this.dom.progressFill.style.width = `${percent}%`;
        this.dom.progressText.textContent = `Invest Focus Time to progress (${Math.floor(progress)}/${target}m).`;
    }

    _createContractCard(contract, isBusy) {
        const element = document.createElement("div");
        element.className = "bb-contract-card";
        element.innerHTML = `
            <div class="bb-c-left">
                <h4>${escapeHtml(contract.title)}</h4>
                <p>"${escapeHtml(contract.description)}"</p>
                <div class="bb-c-rewards">
                    <span class="bb-reward-gold"><i class="fa-solid fa-coins"></i> ${contract.gold_reward}g</span>
                    <span class="bb-reward-time"><i class="fa-regular fa-clock"></i> ${contract.required_minutes}m Focus</span>
                </div>
            </div>
            <div class="bb-c-right">
                <button class="bb-btn-accept" ${isBusy ? "disabled" : ""}>
                    ${isBusy ? "Busy" : "Accept Job"}
                </button>
            </div>
        `;

        if (!isBusy) {
            element.querySelector(".bb-btn-accept").addEventListener("click", () => {
                this.onAcceptContract?.(contract.id);
            });
        }

        return element;
    }

    _renderContractBanner(activeContract) {
        if (this.dom.activeTitle) this.dom.activeTitle.textContent = activeContract.title;
        if (this.dom.progressContainer) this.dom.progressContainer.classList.remove("hidden");
        this.updateProgress(activeContract);

        if (!this.dom.btnAbort) return;

        this.dom.btnAbort.classList.remove("hidden");
        this.dom.btnAbort = this._replaceButton(this.dom.btnAbort);
        this.dom.btnAbort.addEventListener("click", () => {
            if (confirmAction("Abort this contract? You will lose reputation (-10) with the settlement.")) {
                this.onAbortContract?.(activeContract.id, activeContract.node_id);
            }
        });
    }

    _renderDelvingBanner() {
        if (this.dom.activeTitle) this.dom.activeTitle.textContent = "Delving the Depths";
        if (this.dom.progressText) {
            this.dom.progressText.textContent = "Your party is exploring the dungeon. Complete focus sessions to extract loot.";
        }
        if (this.dom.btnStopDelve) this.dom.btnStopDelve.classList.remove("hidden");
    }

    _renderIdleBanner() {
        if (this.dom.activeTitle) this.dom.activeTitle.textContent = "Party is Idle";
        if (this.dom.progressText) {
            this.dom.progressText.textContent = "Select a contract below, or freely delve into the dungeon.";
        }
        if (this.dom.btnStartDelve) this.dom.btnStartDelve.classList.remove("hidden");
    }

    _hideActionElements() {
        if (this.dom.btnAbort) this.dom.btnAbort.classList.add("hidden");
        if (this.dom.btnStartDelve) this.dom.btnStartDelve.classList.add("hidden");
        if (this.dom.btnStopDelve) this.dom.btnStopDelve.classList.add("hidden");
        if (this.dom.progressContainer) this.dom.progressContainer.classList.add("hidden");
    }

    _replaceButton(button) {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        return newButton;
    }

    _progressPercent(progress, target) {
        if (!target || target <= BAREBONES_UI.DEFAULT_RESOURCE_VALUE) {
            return BAREBONES_UI.PROGRESS_PERCENT_MAX;
        }

        return Math.min((progress / target) * BAREBONES_UI.PROGRESS_PERCENT_MAX, BAREBONES_UI.PROGRESS_PERCENT_MAX);
    }
}
