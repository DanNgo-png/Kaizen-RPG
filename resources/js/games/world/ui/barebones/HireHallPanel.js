import {
    BAREBONES_UI,
    HIRE_CONFIG
} from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml
} from "./BarebonesTemplates.js";

const confirmAction = (message) => globalThis.confirm?.(message) ?? true;

export class HireHallPanel {
    constructor({
        dom,
        candidateFactory,
        notifier,
        rosterLimit = HIRE_CONFIG.ROSTER_LIMIT,
        onHireMercenary
    }) {
        this.dom = dom;
        this.candidateFactory = candidateFactory;
        this.notifier = notifier;
        this.rosterLimit = rosterLimit;
        this.onHireMercenary = onHireMercenary;
        this.pendingHire = null;
        this.context = {
            selectedNode: null,
            partyData: null,
            currentResources: null
        };
    }

    render(context) {
        if (!this.dom.hireList) return;

        this.context = context;
        const { selectedNode, partyData, currentResources } = context;
        const rosterCount = partyData?.mercenaries?.length || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const gold = this._currentGold(currentResources, partyData);

        this.dom.hireList.innerHTML = "";

        if (!selectedNode) {
            this.dom.hireList.innerHTML = emptyStateHtml("Select a settlement to view available recruits.");
            return;
        }

        const candidates = this.candidateFactory.getCandidatesForNode(selectedNode);
        this.dom.hireList.appendChild(this._createSummary(selectedNode, candidates.length, rosterCount));

        if (!candidates.length) {
            this.dom.hireList.insertAdjacentHTML("beforeend", emptyStateHtml("No one else is looking for work here right now."));
            return;
        }

        candidates.forEach((candidate) => {
            this.dom.hireList.appendChild(this._createHireCard(candidate, gold, rosterCount));
        });
    }

    hireCandidate(candidate, context = this.context) {
        const { selectedNode, partyData, currentResources } = context;
        const rosterCount = partyData?.mercenaries?.length || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
        const gold = this._currentGold(currentResources, partyData);

        if (rosterCount >= this.rosterLimit) {
            this._notify("Roster Full", `Your company can only field ${this.rosterLimit} mercenaries.`, "fa-solid fa-users");
            return;
        }

        if (gold < candidate.cost) {
            this._notify("Insufficient Funds", `${candidate.name} asks for ${candidate.cost} crowns.`, "fa-solid fa-coins");
            return;
        }

        if (!confirmAction(this._confirmationMessage(candidate))) return;

        this.pendingHire = {
            nodeId: selectedNode?.id,
            candidateId: candidate.id
        };

        this.render(context);
        this.onHireMercenary?.(this._hirePayload(candidate), candidate.cost);
    }

    handleHireResult(result = {}) {
        if (!result.success) {
            this.pendingHire = null;
            this._notify("Hiring Failed", result.error || "Unable to hire this recruit.", "fa-solid fa-handshake");
            return {
                success: false,
                shouldRender: true
            };
        }

        if (this.pendingHire) {
            this.candidateFactory.removeCandidate(this.pendingHire.nodeId, this.pendingHire.candidateId);
            this.pendingHire = null;
        }

        const mercName = result.merc?.name || "A new recruit";
        this._notify("Recruited!", `${mercName} has joined the company.`, "fa-solid fa-handshake");

        return {
            success: true,
            newGold: Number.isFinite(result.newGold) ? result.newGold : null,
            shouldRefreshParty: true,
            shouldRefreshWorld: true,
            shouldRender: true
        };
    }

    _createSummary(selectedNode, candidateCount, rosterCount) {
        const header = document.createElement("div");
        header.className = "bb-hire-summary";
        header.innerHTML = `
            <div>
                <div class="bb-hire-summary-title">${escapeHtml(selectedNode.name)} Hiring Hall</div>
                <div class="bb-hire-summary-meta">
                    <span><i class="fa-solid fa-users"></i> ${rosterCount}/${this.rosterLimit}</span>
                </div>
            </div>
            <div class="bb-hire-summary-meta">
                <span><i class="fa-solid fa-handshake"></i> ${candidateCount} available</span>
            </div>
        `;
        return header;
    }

    _createHireCard(candidate, gold, rosterCount) {
        const element = document.createElement("div");
        const rosterFull = rosterCount >= this.rosterLimit;
        const canAfford = gold >= candidate.cost;
        const isPending = this.pendingHire?.candidateId === candidate.id;
        const disabled = rosterFull || !canAfford || Boolean(this.pendingHire);
        const buttonText = this._buttonText({ isPending, rosterFull, canAfford });

        element.className = `bb-hire-card ${disabled ? "disabled" : ""}`;
        element.innerHTML = `
            <div class="bb-hire-main">
                <div class="bb-hire-portrait"><i class="fa-solid ${escapeHtml(candidate.icon)}"></i></div>
                <div>
                    <div class="bb-hire-name-row">
                        <span class="bb-hire-name">${escapeHtml(candidate.name)}</span>
                        <span class="bb-hire-role">${escapeHtml(candidate.role)} - Lvl ${candidate.level}</span>
                    </div>
                    <p class="bb-hire-rumor">${escapeHtml(candidate.rumor)}</p>
                    <div class="bb-hire-stats">
                        <span class="bb-hire-stat" title="Strength"><i class="fa-solid fa-dumbbell"></i> ${candidate.str}</span>
                        <span class="bb-hire-stat" title="Intellect"><i class="fa-solid fa-brain"></i> ${candidate.int}</span>
                        <span class="bb-hire-stat" title="Speed"><i class="fa-solid fa-wind"></i> ${candidate.spd}</span>
                    </div>
                    <div class="bb-hire-traits">
                        ${candidate.traits.map((trait) => `<span class="bb-hire-trait">${escapeHtml(trait)}</span>`).join("")}
                    </div>
                </div>
            </div>
            <div class="bb-hire-economy">
                <div class="bb-hire-price"><i class="fa-solid fa-coins"></i> ${candidate.cost}</div>
                <div class="bb-hire-wage"><i class="fa-regular fa-clock"></i> ${candidate.wage}g / day</div>
                <button class="bb-btn-accept" ${disabled ? "disabled" : ""}>${buttonText}</button>
            </div>
        `;

        const button = element.querySelector(".bb-btn-accept");
        if (button && !disabled) {
            button.addEventListener("click", () => this.hireCandidate(candidate));
        }

        return element;
    }

    _buttonText({ isPending, rosterFull, canAfford }) {
        if (isPending) return "Hiring...";
        if (rosterFull) return "Roster Full";
        if (!canAfford) return "Need Gold";
        return "Hire";
    }

    _currentGold(currentResources, partyData) {
        return currentResources?.gold
            ?? partyData?.resources?.gold
            ?? BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }

    _confirmationMessage(candidate) {
        return [
            `Hire ${candidate.name}, ${candidate.role}?`,
            "",
            `Upfront Cost: ${candidate.cost}g`,
            `Daily Wage: ${candidate.wage}g`,
            `Stats: STR ${candidate.str} / INT ${candidate.int} / SPD ${candidate.spd}`
        ].join("\n");
    }

    _hirePayload(candidate) {
        return {
            name: candidate.name,
            role: candidate.role,
            level: candidate.level,
            str: candidate.str,
            int: candidate.int,
            spd: candidate.spd,
            wage: candidate.wage,
            current_hp: candidate.current_hp,
            max_hp: candidate.max_hp,
            fatigue: candidate.fatigue
        };
    }

    _notify(title, message, icon) {
        this.notifier?.show(title, message, icon);
    }
}
