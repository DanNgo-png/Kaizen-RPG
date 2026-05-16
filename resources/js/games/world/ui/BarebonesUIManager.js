import { GameAPI } from "../../../api/GameAPI.js";
import { CustomMenuManager } from "../../../components/CustomMenuManager.js";
import { notifier } from "../../../_global-managers/NotificationManager.js";
import {
    BAREBONES_TABS,
    BAREBONES_UI,
    HIRE_CONFIG,
    createDefaultMarketData,
    createDefaultPartyData
} from "./barebones/BarebonesConstants.js";
import { createBarebonesDom } from "./barebones/BarebonesDom.js";
import { selectedNodeLabelHtml, emptyStateHtml } from "./barebones/BarebonesTemplates.js";
import { ResourceTooltipManager } from "./barebones/ResourceTooltipManager.js";
import { ChroniclesModal } from "./barebones/ChroniclesModal.js";
import { NodeListRenderer } from "./barebones/NodeListRenderer.js";
import { HireCandidateFactory } from "./barebones/HireCandidateFactory.js";
import { HireHallPanel } from "./barebones/HireHallPanel.js";
import { MarketPanel } from "./barebones/MarketPanel.js";
import { ContractPanel } from "./barebones/ContractPanel.js";

let activeBarebonesUIManager = null;

export class BarebonesUIManager {
    constructor() {
        activeBarebonesUIManager?.destroy();
        activeBarebonesUIManager = this;

        this.dom = createBarebonesDom();
        this.nodes = [];
        this.selectedNode = null;
        this.activeContract = null;
        this.currentResources = null;
        this.activeTab = BAREBONES_TABS.JOBS;
        this.marketData = createDefaultMarketData();
        this.partyData = createDefaultPartyData();
        this.rosterLimit = HIRE_CONFIG.ROSTER_LIMIT;
        this.isDelving = false;
        this.isDestroyed = false;
        this._domEventBindings = [];

        this.menuManager = new CustomMenuManager();
        this.tooltipManager = new ResourceTooltipManager();
        this.chroniclesModal = new ChroniclesModal({
            onRequestHistory: (nodeId) => GameAPI.getNodeHistory(nodeId)
        });
        this.nodeListRenderer = new NodeListRenderer({
            dom: this.dom,
            menuManager: this.menuManager,
            chroniclesModal: this.chroniclesModal,
            onSelectNode: (node) => this.selectNode(node),
            onSwitchTab: (tabName) => this.switchTab(tabName),
            onTogglePin: (nodeId) => GameAPI.toggleNodePin(nodeId)
        });
        this.hirePanel = new HireHallPanel({
            dom: this.dom,
            candidateFactory: new HireCandidateFactory(),
            notifier,
            rosterLimit: this.rosterLimit,
            onHireMercenary: (payload, cost) => GameAPI.hireMercenary(payload, cost)
        });
        this.marketPanel = new MarketPanel({
            dom: this.dom,
            tooltipManager: this.tooltipManager,
            onBuyItem: (itemId, price, nodeId) => GameAPI.buyItem(itemId, price, nodeId),
            onSellItem: (inventoryId, price, nodeId) => GameAPI.sellItem(inventoryId, price, nodeId)
        });
        this.contractPanel = new ContractPanel({
            dom: this.dom,
            onAcceptContract: (contractId) => GameAPI.acceptContract(contractId),
            onAbortContract: (contractId, nodeId) => GameAPI.abortContract(contractId, nodeId)
        });

        this._bindHandlers();
        this._bindEvents();
    }

    show(nodes = []) {
        if (this.isDestroyed) return;
        if (!this.dom.overlay) return;

        this.nodes = nodes;
        this.dom.overlay.classList.remove("hidden");
        this.switchTab(BAREBONES_TABS.JOBS, { shouldLoad: false });
        this.renderNodeList();

        if (this.nodes.length > BAREBONES_UI.DEFAULT_RESOURCE_VALUE) {
            this.selectNode(this.nodes[0]);
        }

        GameAPI.getPartyData();
    }

    hide() {
        if (this.isDestroyed) return;
        if (this.dom.overlay) this.dom.overlay.classList.add("hidden");
        this.tooltipManager.hide();
    }

    updateData(nodes = [], resources) {
        if (this.isDestroyed) return;
        this.nodes = nodes;
        if (resources) this.updateStats(resources);

        if (this.selectedNode) {
            const updatedNode = this.nodes.find((node) => node.id === this.selectedNode.id);
            if (updatedNode) {
                this.selectedNode = updatedNode;
                this._renderSelectedNodeLabel();
            }
        }

        this.renderNodeList();
    }

    updateStats(resources) {
        if (this.isDestroyed) return;
        this.currentResources = resources;
        if (!resources) return;

        // Calculate 24H clock based on accumulated focus (0 to 30 mins = 1 day cycle)
        const day = resources.day || 1;
        const accTime = resources.accumulated_time || 0;
        const fraction = Math.min(accTime / 30, 1);
        const totalMinutes = fraction * 24 * 60;
        const h = Math.floor(totalMinutes / 60);
        const m = Math.floor(totalMinutes % 60);
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        this._setText(this.dom.timeDisplay, `Day ${day} - ${timeStr}`);
        this._setText(this.dom.goldDisplay, resources.gold);
        this._setText(this.dom.provisionsDisplay, resources.provisions);
        this._setText(this.dom.toolsDisplay, resources.tools);
        this._setText(this.dom.ammoDisplay, resources.ammo);
        this._setText(this.dom.medsDisplay, resources.medicine);
        this.marketData.gold = resources.gold || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }

    switchTab(tabName, { shouldLoad = true } = {}) {
        if (this.isDestroyed) return;
        if (!Object.values(BAREBONES_TABS).includes(tabName)) return;

        this.activeTab = tabName;
        this._renderTabState(tabName);

        if (!shouldLoad) return;

        const isHostile = this.selectedNode && (this.selectedNode.is_hostile === 1 || this.selectedNode.reputation <= -50);
        if (isHostile) {
            if (this.dom.contractList) this.dom.contractList.innerHTML = emptyStateHtml("This settlement is hostile. No jobs available.", "fa-solid fa-skull");
            if (this.dom.marketStashList) this.dom.marketStashList.innerHTML = "";
            if (this.dom.marketShopList) this.dom.marketShopList.innerHTML = emptyStateHtml("Hostile factions do not trade with you.", "fa-solid fa-skull");
            if (this.dom.hireList) this.dom.hireList.innerHTML = emptyStateHtml("No one here wants to join you.", "fa-solid fa-skull");
            return;
        }

        this._loadSelectedTab();
    }

    selectNode(node) {
        if (this.isDestroyed) return;
        this.selectedNode = node;
        this._renderSelectedNodeLabel();
        this.renderNodeList();

        const isHostile = node.is_hostile === 1 || node.reputation <= -50;

        if (this.dom.tabJobs) this.dom.tabJobs.disabled = isHostile;
        if (this.dom.tabMarket) this.dom.tabMarket.disabled = isHostile;
        if (this.dom.tabHire) this.dom.tabHire.disabled = isHostile;

        if (isHostile) {
            if (this.dom.contractList) this.dom.contractList.innerHTML = emptyStateHtml("This settlement is hostile. No jobs available.", "fa-solid fa-skull");
            if (this.dom.marketStashList) this.dom.marketStashList.innerHTML = "";
            if (this.dom.marketShopList) this.dom.marketShopList.innerHTML = emptyStateHtml("Hostile factions do not trade with you.", "fa-solid fa-skull");
            if (this.dom.hireList) this.dom.hireList.innerHTML = emptyStateHtml("No one here wants to join you.", "fa-solid fa-skull");
        } else {
            this._loadSelectedTab();
        }
    }

    renderNodeList() {
        this.nodeListRenderer.render(this.nodes, this.selectedNode);
    }

    renderHireList() {
        this.hirePanel.render({
            selectedNode: this.selectedNode,
            partyData: this.partyData,
            currentResources: this.currentResources
        });
    }

    hireCandidate(candidate) {
        this.hirePanel.hireCandidate(candidate, {
            selectedNode: this.selectedNode,
            partyData: this.partyData,
            currentResources: this.currentResources
        });
    }

    renderMarketList() {
        this.marketPanel.render(this.marketData, this.selectedNode);
    }

    renderContracts(contracts) {
        this.contractPanel.renderContracts(contracts, this.activeContract);
    }

    updateActiveBanner(activeContract) {
        this.contractPanel.updateActiveBanner(activeContract, this.isDelving);
    }

    _bindHandlers() {
        this._handlers = {
            contractProgressUpdated: (event) => this._onContractProgressUpdated(event),
            contractCompletedRealtime: (event) => this._onContractCompletedRealtime(event),
            receiveContracts: (event) => this._onReceiveContracts(event),
            contractAccepted: (event) => this._onContractAccepted(event),
            contractAborted: (event) => this._onContractAborted(event),
            receiveMarketData: (event) => this._onReceiveMarketData(event),
            transactionComplete: (event) => this._onTransactionComplete(event),
            delvingStatusUpdated: (event) => this._onDelvingStatusUpdated(event),
            receiveNodeHistory: (event) => this._onReceiveNodeHistory(event),
            receivePartyData: (event) => this._onReceivePartyData(event),
            mercenaryHired: (event) => this._onMercenaryHired(event),
            nodePinToggled: () => GameAPI.getWorldData(),
            startDelve: () => GameAPI.setDelvingStatus(true),
            stopDelve: () => GameAPI.setDelvingStatus(false),
            showJobsTab: () => this.switchTab(BAREBONES_TABS.JOBS),
            showMarketTab: () => this.switchTab(BAREBONES_TABS.MARKET),
            showHireTab: () => this.switchTab(BAREBONES_TABS.HIRE)
        };
    }

    _bindEvents() {
        document.removeEventListener("kaizen:contract-progress-updated", this._handlers.contractProgressUpdated);
        document.addEventListener("kaizen:contract-progress-updated", this._handlers.contractProgressUpdated);

        Object.entries(this._neutralinoEventMap()).forEach(([eventName, handler]) => {
            Neutralino.events.off(eventName, handler);
            Neutralino.events.on(eventName, handler);
        });

        this._domEventBindings = [
            { element: this.dom.btnStartDelve, type: "click", handler: this._handlers.startDelve },
            { element: this.dom.btnStopDelve, type: "click", handler: this._handlers.stopDelve },
            { element: this.dom.tabJobs, type: "click", handler: this._handlers.showJobsTab },
            { element: this.dom.tabMarket, type: "click", handler: this._handlers.showMarketTab },
            { element: this.dom.tabHire, type: "click", handler: this._handlers.showHireTab }
        ];

        this._domEventBindings.forEach(({ element, type, handler }) => {
            if (!element) return;
            element.removeEventListener(type, handler);
            element.addEventListener(type, handler);
        });

        this.tooltipManager.bindResourceContainers(this.dom.resContainers, () => this.currentResources);
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        document.removeEventListener("kaizen:contract-progress-updated", this._handlers.contractProgressUpdated);

        Object.entries(this._neutralinoEventMap()).forEach(([eventName, handler]) => {
            Neutralino.events.off(eventName, handler);
        });

        this._domEventBindings.forEach(({ element, type, handler }) => {
            element?.removeEventListener(type, handler);
        });
        this._domEventBindings = [];

        this.tooltipManager.destroy();

        if (activeBarebonesUIManager === this) {
            activeBarebonesUIManager = null;
        }
    }

    _shouldHandleEvent() {
        if (this.isDestroyed) return false;
        if (this.dom.overlay && document.body.contains(this.dom.overlay)) return true;

        this.destroy();
        return false;
    }

    _neutralinoEventMap() {
        return {
            contractCompletedRealtime: this._handlers.contractCompletedRealtime,
            receiveContracts: this._handlers.receiveContracts,
            contractAccepted: this._handlers.contractAccepted,
            contractAborted: this._handlers.contractAborted,
            receiveMarketData: this._handlers.receiveMarketData,
            transactionComplete: this._handlers.transactionComplete,
            delvingStatusUpdated: this._handlers.delvingStatusUpdated,
            receiveNodeHistory: this._handlers.receiveNodeHistory,
            receivePartyData: this._handlers.receivePartyData,
            mercenaryHired: this._handlers.mercenaryHired,
            nodePinToggled: this._handlers.nodePinToggled
        };
    }

    _onContractProgressUpdated(event) {
        if (!this._shouldHandleEvent()) return;

        const contract = event.detail;
        if (!this.activeContract || this.activeContract.id !== contract.id) return;

        this.activeContract.progress_minutes = contract.progress_minutes;
        this.contractPanel.updateProgress(this.activeContract);
    }

    _onDelvingStatusUpdated(event) {
        if (!this._shouldHandleEvent()) return;

        this.isDelving = event.detail.isDelving;
        this.updateActiveBanner(this.activeContract);
    }

    _onReceivePartyData(event) {
        if (!this._shouldHandleEvent()) return;
        if (!event.detail) return;

        this.partyData = event.detail;
        if (event.detail.resources) this.updateStats(event.detail.resources);
        if (this.activeTab === BAREBONES_TABS.HIRE) this.renderHireList();
    }

    _onMercenaryHired(event) {
        if (!this._shouldHandleEvent()) return;

        const outcome = this.hirePanel.handleHireResult(event.detail || {});

        if (outcome.newGold !== null && outcome.newGold !== undefined) {
            this.updateStats({ ...this.currentResources, gold: outcome.newGold });
        }

        if (outcome.shouldRefreshParty) GameAPI.getPartyData();
        if (outcome.shouldRefreshWorld) GameAPI.getWorldData();
        if (outcome.shouldRender && this.activeTab === BAREBONES_TABS.HIRE) this.renderHireList();
    }

    _onReceiveNodeHistory(event) {
        if (!this._shouldHandleEvent()) return;

        this.chroniclesModal.renderHistory(event.detail?.history || []);
    }

    _onReceiveMarketData(event) {
        if (!this._shouldHandleEvent()) return;

        this.marketData = {
            ...createDefaultMarketData(),
            ...(event.detail || {})
        };
        this.updateStats({ ...this.currentResources, gold: this.marketData.gold });
        this.renderMarketList();
    }

    _onTransactionComplete(event) {
        if (!this._shouldHandleEvent()) return;

        if (event.detail.success) {
            if (this.selectedNode) GameAPI.getMarketData(this.selectedNode.id);
            GameAPI.getWorldData();
            return;
        }

        alert(event.detail.error || "Transaction failed.");
    }

    _onContractCompletedRealtime() {
        if (!this._shouldHandleEvent()) return;

        this.activeContract = null;
        this.updateActiveBanner(null);

        if (this.selectedNode && this.activeTab === BAREBONES_TABS.JOBS) {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }

        GameAPI.getWorldData();
    }

    _onReceiveContracts(event) {
        if (!this._shouldHandleEvent()) return;

        const { contracts, activeContract } = event.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);

        if (this.activeTab === BAREBONES_TABS.JOBS) {
            this.renderContracts(contracts);
        }
    }

    _onContractAccepted(event) {
        if (!this._shouldHandleEvent()) return;

        const { activeContract } = event.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);

        if (this.selectedNode && this.activeTab === BAREBONES_TABS.JOBS) {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }
    }

    _onContractAborted() {
        if (!this._shouldHandleEvent()) return;

        this.activeContract = null;
        this.updateActiveBanner(null);

        if (this.selectedNode) {
            GameAPI.getContractsForNode(this.selectedNode.id);
            GameAPI.getWorldData();
        }
    }

    _renderTabState(tabName) {
        this.dom.tabJobs?.classList.toggle("active", tabName === BAREBONES_TABS.JOBS);
        this.dom.tabMarket?.classList.toggle("active", tabName === BAREBONES_TABS.MARKET);
        this.dom.tabHire?.classList.toggle("active", tabName === BAREBONES_TABS.HIRE);

        this.dom.contractList?.classList.toggle("hidden", tabName !== BAREBONES_TABS.JOBS);
        this.dom.marketContainer?.classList.toggle("hidden", tabName !== BAREBONES_TABS.MARKET);
        this.dom.hireContainer?.classList.toggle("hidden", tabName !== BAREBONES_TABS.HIRE);
    }

    _loadSelectedTab() {
        if (this.activeTab === BAREBONES_TABS.HIRE) {
            this.renderHireList();
            GameAPI.getPartyData();
            return;
        }

        if (!this.selectedNode) return;

        if (this.activeTab === BAREBONES_TABS.JOBS) {
            this.contractPanel.renderLoading();
            GameAPI.getContractsForNode(this.selectedNode.id);
            return;
        }

        if (this.activeTab === BAREBONES_TABS.MARKET) {
            this.marketPanel.renderLoading();
            GameAPI.getMarketData(this.selectedNode.id);
        }
    }

    _renderSelectedNodeLabel() {
        if (this.dom.selectedNodeName) {
            this.dom.selectedNodeName.innerHTML = selectedNodeLabelHtml(this.selectedNode);
        }
    }

    _setText(element, value) {
        if (!element) return;
        element.textContent = value ?? BAREBONES_UI.DEFAULT_RESOURCE_VALUE;
    }
}
