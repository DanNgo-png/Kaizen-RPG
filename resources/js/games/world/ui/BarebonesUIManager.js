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
import { selectedNodeLabelHtml } from "./barebones/BarebonesTemplates.js";
import { ResourceTooltipManager } from "./barebones/ResourceTooltipManager.js";
import { ChroniclesModal } from "./barebones/ChroniclesModal.js";
import { NodeListRenderer } from "./barebones/NodeListRenderer.js";
import { HireCandidateFactory } from "./barebones/HireCandidateFactory.js";
import { HireHallPanel } from "./barebones/HireHallPanel.js";
import { MarketPanel } from "./barebones/MarketPanel.js";
import { ContractPanel } from "./barebones/ContractPanel.js";

export class BarebonesUIManager {
    constructor() {
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
        if (this.dom.overlay) this.dom.overlay.classList.add("hidden");
        this.tooltipManager.hide();
    }

    updateData(nodes = [], resources) {
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
        if (!Object.values(BAREBONES_TABS).includes(tabName)) return;

        this.activeTab = tabName;
        this._renderTabState(tabName);

        if (!shouldLoad) return;
        this._loadSelectedTab();
    }

    selectNode(node) {
        this.selectedNode = node;
        this._renderSelectedNodeLabel();
        this.renderNodeList();
        this._loadSelectedTab();
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
            nodePinToggled: () => GameAPI.getWorldData()
        };
    }

    _bindEvents() {
        document.removeEventListener("kaizen:contract-progress-updated", this._handlers.contractProgressUpdated);
        document.addEventListener("kaizen:contract-progress-updated", this._handlers.contractProgressUpdated);

        Object.entries(this._neutralinoEventMap()).forEach(([eventName, handler]) => {
            Neutralino.events.off(eventName, handler);
            Neutralino.events.on(eventName, handler);
        });

        this.dom.btnStartDelve?.addEventListener("click", () => GameAPI.setDelvingStatus(true));
        this.dom.btnStopDelve?.addEventListener("click", () => GameAPI.setDelvingStatus(false));
        this.dom.tabJobs?.addEventListener("click", () => this.switchTab(BAREBONES_TABS.JOBS));
        this.dom.tabMarket?.addEventListener("click", () => this.switchTab(BAREBONES_TABS.MARKET));
        this.dom.tabHire?.addEventListener("click", () => this.switchTab(BAREBONES_TABS.HIRE));

        this.tooltipManager.bindResourceContainers(this.dom.resContainers, () => this.currentResources);
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
        const contract = event.detail;
        if (!this.activeContract || this.activeContract.id !== contract.id) return;

        this.activeContract.progress_minutes = contract.progress_minutes;
        this.contractPanel.updateProgress(this.activeContract);
    }

    _onDelvingStatusUpdated(event) {
        this.isDelving = event.detail.isDelving;
        this.updateActiveBanner(this.activeContract);
    }

    _onReceivePartyData(event) {
        if (!event.detail) return;

        this.partyData = event.detail;
        if (event.detail.resources) this.updateStats(event.detail.resources);
        if (this.activeTab === BAREBONES_TABS.HIRE) this.renderHireList();
    }

    _onMercenaryHired(event) {
        const outcome = this.hirePanel.handleHireResult(event.detail || {});

        if (outcome.newGold !== null && outcome.newGold !== undefined) {
            this.updateStats({ ...this.currentResources, gold: outcome.newGold });
        }

        if (outcome.shouldRefreshParty) GameAPI.getPartyData();
        if (outcome.shouldRefreshWorld) GameAPI.getWorldData();
        if (outcome.shouldRender && this.activeTab === BAREBONES_TABS.HIRE) this.renderHireList();
    }

    _onReceiveNodeHistory(event) {
        this.chroniclesModal.renderHistory(event.detail?.history || []);
    }

    _onReceiveMarketData(event) {
        this.marketData = {
            ...createDefaultMarketData(),
            ...(event.detail || {})
        };
        this.updateStats({ ...this.currentResources, gold: this.marketData.gold });
        this.renderMarketList();
    }

    _onTransactionComplete(event) {
        if (event.detail.success) {
            if (this.selectedNode) GameAPI.getMarketData(this.selectedNode.id);
            GameAPI.getWorldData();
            return;
        }

        alert(event.detail.error || "Transaction failed.");
    }

    _onContractCompletedRealtime() {
        this.activeContract = null;
        this.updateActiveBanner(null);

        if (this.selectedNode && this.activeTab === BAREBONES_TABS.JOBS) {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }

        GameAPI.getWorldData();
    }

    _onReceiveContracts(event) {
        const { contracts, activeContract } = event.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);

        if (this.activeTab === BAREBONES_TABS.JOBS) {
            this.renderContracts(contracts);
        }
    }

    _onContractAccepted(event) {
        const { activeContract } = event.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);

        if (this.selectedNode && this.activeTab === BAREBONES_TABS.JOBS) {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }
    }

    _onContractAborted() {
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
