import { BAREBONES_UI } from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

const confirmAction = (message) => globalThis.confirm?.(message) ?? true;
const CONTRACT_TYPE = Object.freeze({
    CARAVAN: "caravan",
    BRIGAND_CAMP: "brigand_camp",
    HOSTILE_CAMP: "hostile_camp",
    DIRECT_CLEARING: "direct_clearing"
});

export class ContractPanel {
    constructor({
        dom,
        onAcceptContract,
        onAbortContract,
        onStartHostileClearing,
        onNegotiateContractTerm
    }) {
        this.dom = dom;
        this.onAcceptContract = onAcceptContract;
        this.onAbortContract = onAbortContract;
        this.onStartHostileClearing = onStartHostileClearing;
        this.onNegotiateContractTerm = onNegotiateContractTerm;
    }

    renderLoading() {
        if (this.dom.contractList) {
            this.dom.contractList.innerHTML = loadingStateHtml("Loading...");
        }
    }

    renderContracts(contracts, activeContract, selectedNode) {
        if (!this.dom.contractList) return;

        this.dom.contractList.innerHTML = "";
        if (!contracts?.length) {
            this.dom.contractList.innerHTML = emptyStateHtml("No jobs available here currently.");
            return;
        }

        const isBusy = Boolean(activeContract);
        contracts.forEach((contract) => {
            this.dom.contractList.appendChild(this._createContractCard(contract, isBusy, selectedNode));
        });
    }

    renderHostileClearingAction(node, activeContract) {
        if (!this.dom.contractList) return;

        this.dom.contractList.innerHTML = "";
        if (!node) {
            this.dom.contractList.innerHTML = emptyStateHtml("Select an enemy settlement to plan an assault.", "fa-solid fa-skull");
            return;
        }

        const isBusy = Boolean(activeContract);
        const element = document.createElement("div");
        element.className = "bb-contract-card danger";
        element.innerHTML = `
            <div class="bb-c-left">
                <h4>Clear ${escapeHtml(node.name)}</h4>
                <p>"Raid this hostile location without waiting for a settlement contract. There is no patron reward, but the stores can be looted."</p>
                <div class="bb-contract-target">
                    <i class="fa-solid fa-campground"></i>
                    <span>Target: ${escapeHtml(node.type)}</span>
                </div>
                <div class="bb-c-rewards">
                    <span class="bb-reward-gold"><i class="fa-solid fa-coins"></i> No contract pay</span>
                    <span class="bb-reward-time"><i class="fa-regular fa-clock"></i> Focus operation</span>
                    <span class="bb-reward-loot"><i class="fa-solid fa-box-open"></i> Camp loot</span>
                </div>
            </div>
            <div class="bb-c-right">
                <button class="bb-btn-accept" ${isBusy ? "disabled" : ""}>
                    ${isBusy ? "Busy" : "Begin Raid"}
                </button>
            </div>
        `;

        if (!isBusy) {
            element.querySelector(".bb-btn-accept").addEventListener("click", () => {
                if (confirmAction(`Clear ${node.name} without a settlement contract? There will be no gold reward.`)) {
                    this.onStartHostileClearing?.(node.id);
                }
            });
        }

        this.dom.contractList.appendChild(element);
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

    _createContractCard(contract, isBusy, selectedNode) {
        const element = document.createElement("div");
        element.className = `bb-contract-card ${this._contractCardClass(contract)}`;
        element.innerHTML = `
            <div class="bb-c-left">
                <h4>${escapeHtml(contract.title)}</h4>
                <p>"${escapeHtml(contract.description)}"</p>
                ${this._contractTargetHtml(contract)}
                <div class="bb-c-rewards">
                    <span class="bb-reward-gold"><i class="fa-solid fa-coins"></i> ${contract.gold_reward}g</span>
                    <span class="bb-reward-time"><i class="fa-regular fa-clock"></i> ${contract.required_minutes}m Focus</span>
                    ${this._contractLootHtml(contract)}
                </div>
                ${this._influenceTermsHtml(contract, selectedNode, isBusy)}
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

        element.querySelectorAll("[data-term-id]").forEach((button) => {
            button.addEventListener("click", () => {
                this.onNegotiateContractTerm?.(contract.id, selectedNode?.id, button.dataset.termId);
            });
        });

        return element;
    }

    _contractCardClass(contract) {
        if (contract.contract_type === CONTRACT_TYPE.DIRECT_CLEARING) return "danger";
        if (contract.contract_type === CONTRACT_TYPE.HOSTILE_CAMP) return "danger";
        if (contract.contract_type === CONTRACT_TYPE.BRIGAND_CAMP) return "danger";
        if (contract.contract_type === CONTRACT_TYPE.CARAVAN) return "caravan";
        return "";
    }

    _influenceTermsHtml(contract, selectedNode, isBusy) {
        const options = contract.influence_options || [];
        if (!options.length || !selectedNode) return "";

        const influence = Number(selectedNode.influence) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const buttons = options.map((option) => {
            const isApplied = Boolean(option.applied || contract.terms?.[option.id]);
            const canAfford = influence >= option.cost;
            const disabled = isBusy || isApplied || !canAfford;
            const stateLabel = isApplied ? "Secured" : `${option.cost} Influence`;
            const className = isApplied ? "bb-influence-action applied" : "bb-influence-action";
            const title = isApplied
                ? `${option.label} already secured.`
                : option.description;

            return `
                <button class="${className}" data-term-id="${escapeHtml(option.id)}" title="${escapeHtml(title)}" ${disabled ? "disabled" : ""}>
                    <i class="fa-solid ${escapeHtml(option.icon || 'fa-gavel')}"></i>
                    <span>${escapeHtml(option.label)}</span>
                    <b>${escapeHtml(stateLabel)}</b>
                </button>
            `;
        }).join("");

        return `
            <div class="bb-influence-panel">
                <div class="bb-influence-header">
                    <span><i class="fa-solid fa-gavel"></i> Influence</span>
                    <strong>${influence}</strong>
                </div>
                <div class="bb-influence-actions">
                    ${buttons}
                </div>
            </div>
        `;
    }

    _contractTargetHtml(contract) {
        if (!contract.target_node_name) return "";

        const isCaravan = contract.contract_type === CONTRACT_TYPE.CARAVAN;
        const icon = isCaravan ? "fa-route" : "fa-campground";
        const label = isCaravan ? "Destination" : "Target";

        return `
            <div class="bb-contract-target">
                <i class="fa-solid ${icon}"></i>
                <span>${label}: ${escapeHtml(contract.target_node_name)}</span>
            </div>
        `;
    }

    _contractLootHtml(contract) {
        if (![CONTRACT_TYPE.BRIGAND_CAMP, CONTRACT_TYPE.HOSTILE_CAMP, CONTRACT_TYPE.DIRECT_CLEARING].includes(contract.contract_type)) return "";

        return `<span class="bb-reward-loot"><i class="fa-solid fa-box-open"></i> Rich loot</span>`;
    }

    _renderContractBanner(activeContract) {
        if (this.dom.activeTitle) this.dom.activeTitle.textContent = activeContract.title;
        if (this.dom.progressContainer) this.dom.progressContainer.classList.remove("hidden");
        this.updateProgress(activeContract);

        if (!this.dom.btnAbort) return;

        this.dom.btnAbort.classList.remove("hidden");
        this.dom.btnAbort = this._replaceButton(this.dom.btnAbort);
        this.dom.btnAbort.innerHTML = this._isDirectClearing(activeContract)
            ? `<i class="fa-solid fa-xmark"></i> Abandon`
            : `<i class="fa-solid fa-xmark"></i> Abort`;
        this.dom.btnAbort.addEventListener("click", () => {
            const message = this._isDirectClearing(activeContract)
                ? "Abandon this direct raid? Progress on the operation will be lost."
                : "Abort this contract? You will lose reputation (-10) with the settlement.";
            if (confirmAction(message)) {
                this.onAbortContract?.(activeContract.id, activeContract.node_id, activeContract.contract_type);
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

    _isDirectClearing(contract) {
        return contract?.contract_type === CONTRACT_TYPE.DIRECT_CLEARING;
    }

    _progressPercent(progress, target) {
        if (!target || target <= BAREBONES_UI.DEFAULT_RESOURCE_VALUE) {
            return BAREBONES_UI.PROGRESS_PERCENT_MAX;
        }

        return Math.min((progress / target) * BAREBONES_UI.PROGRESS_PERCENT_MAX, BAREBONES_UI.PROGRESS_PERCENT_MAX);
    }
}
