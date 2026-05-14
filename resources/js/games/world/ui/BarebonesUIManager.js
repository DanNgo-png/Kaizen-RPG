import { GameAPI } from "../../../api/GameAPI.js";
import { CustomMenuManager } from "../../../components/CustomMenuManager.js";
import { notifier } from "../../../_global-managers/NotificationManager.js"; 
import { NAMES } from "../../party/Names.js";
import { ROLES } from "../../party/Roles.js";

export class BarebonesUIManager {
    constructor() {
        this.dom = {
            overlay: document.getElementById('barebones-ui-overlay'),
            nodeList: document.getElementById('bb-nodes-list'),
            contractList: document.getElementById('bb-contracts-list'),
            selectedNodeName: document.getElementById('bb-selected-node-name'),
            
            // Active Banner
            activeTitle: document.getElementById('bb-active-title'),
            progressContainer: document.getElementById('bb-progress-container'),
            progressFill: document.getElementById('bb-progress-fill'),
            progressText: document.getElementById('bb-progress-text'),
            
            // Interaction Buttons
            btnAbort: document.getElementById('bb-btn-abort'),
            btnStartDelve: document.getElementById('bb-btn-start-delve'),
            btnStopDelve: document.getElementById('bb-btn-stop-delve'),

            // Resources Displays
            goldDisplay: document.getElementById('bb-gold-display'),
            provisionsDisplay: document.getElementById('bb-provisions-display'),
            toolsDisplay: document.getElementById('bb-tools-display'),
            ammoDisplay: document.getElementById('bb-ammo-display'),
            medsDisplay: document.getElementById('bb-meds-display'),

            // Resource Containers (for hover events)
            resContainers: {
                gold: document.getElementById('bb-res-gold-container'),
                provisions: document.getElementById('bb-res-provisions-container'),
                tools: document.getElementById('bb-res-tools-container'),
                ammo: document.getElementById('bb-res-ammo-container'),
                meds: document.getElementById('bb-res-meds-container')
            },

            // Market DOM
            marketContainer: document.getElementById('bb-marketplace-container'),
            marketStashList: document.getElementById('bb-market-stash-list'),
            marketShopList: document.getElementById('bb-market-shop-list'),
            hireContainer: document.getElementById('bb-hire-container'),
            hireList: document.getElementById('bb-hire-list'),
            tabJobs: document.getElementById('bb-tab-jobs'),
            tabMarket: document.getElementById('bb-tab-market'),
            tabHire: document.getElementById('bb-tab-hire')
        };

        this.nodes = [];
        this.selectedNode = null;
        this.activeContract = null;
        this.currentResources = null; 
        
        this.activeTab = 'jobs';
        this.marketData = { inventory: [], shopItems: [], gold: 0 };
        this.partyData = { mercenaries: [], resources: { gold: 0 } };
        this.hireCandidatesByNode = new Map();
        this.pendingHire = null;
        this.rosterLimit = 12;
        this.isDelving = false;

        this.menuManager = new CustomMenuManager();

        this.hireBackgrounds = [
            {
                role: 'Squire',
                icon: 'fa-user',
                baseCost: 70,
                level: 1,
                statBase: { str: 8, int: 7, spd: 8 },
                tags: ['Eager', 'Trainable', 'Cheap wage'],
                rumor: 'Green, affordable, and looking for a first real company.'
            },
            {
                role: 'Vanguard',
                icon: 'fa-shield-halved',
                baseCost: 120,
                level: 1,
                statBase: { str: 11, int: 7, spd: 8 },
                tags: ['Stout', 'Front line', 'Reliable'],
                rumor: 'Used to standing firm when the line gets ugly.'
            },
            {
                role: 'Skirmisher',
                icon: 'fa-person-running',
                baseCost: 115,
                level: 1,
                statBase: { str: 8, int: 8, spd: 12 },
                tags: ['Quick', 'Light footed', 'Scout'],
                rumor: 'Fast enough to get into trouble and sometimes back out again.'
            },
            {
                role: 'Quartermaster',
                icon: 'fa-scroll',
                baseCost: 135,
                level: 1,
                statBase: { str: 7, int: 13, spd: 7 },
                tags: ['Logistics', 'Measured', 'Camp mind'],
                rumor: 'Keeps ledgers, counts food, and notices bad deals.'
            },
            {
                role: 'Raider',
                icon: 'fa-gavel',
                baseCost: 150,
                level: 1,
                statBase: { str: 12, int: 6, spd: 10 },
                tags: ['Aggressive', 'Loot minded', 'Rough'],
                rumor: 'The kind of blade that asks about loot before danger.'
            },
            {
                role: 'Sellsword',
                icon: 'fa-user-shield',
                baseCost: 190,
                level: 2,
                statBase: { str: 12, int: 9, spd: 10 },
                tags: ['Professional', 'Veteran', 'Costly'],
                rumor: 'A practical fighter with a practical price.'
            },
            {
                role: 'Swordmaster',
                icon: 'fa-khanda',
                baseCost: 320,
                level: 2,
                statBase: { str: 13, int: 10, spd: 13 },
                tags: ['Duelist', 'Precise', 'Expensive'],
                rumor: 'Carries themself like steel is a language.'
            },
            {
                role: 'Hedge Knight',
                icon: 'fa-chess-rook',
                baseCost: 380,
                level: 3,
                statBase: { str: 16, int: 8, spd: 9 },
                tags: ['Battle hardened', 'Heavy wage', 'Brave'],
                rumor: 'Big armor, bigger appetite, and no fear of dark halls.'
            }
        ];

        this._onMercenaryHiredBound = this._onMercenaryHired.bind(this);
        this._onReceivePartyDataBound = this._onReceivePartyData.bind(this);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'bb-item-tooltip hidden';
        document.body.appendChild(this.tooltip);

        this._createChroniclesModal();

        this._bindEvents();
    }

    _createChroniclesModal() {
        this.chroniclesModal = document.createElement('div');
        this.chroniclesModal.className = 'mgmt-overlay hidden';
        this.chroniclesModal.style.zIndex = '60'; // Above other overlays
        this.chroniclesModal.innerHTML = `
            <div class="exit-modal-content" style="width: 500px; text-align: left; align-items: flex-start; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="display:flex; justify-content:space-between; width:100%; border-bottom: 1px solid #374151; padding-bottom: 15px; margin-bottom: 15px;">
                    <h2 style="margin: 0; color: #fff; font-size: 1.3rem;"><i class="fa-solid fa-book-open" style="color: #a78bfa;"></i> Local Chronicles</h2>
                    <button id="btn-close-chronicles" style="background:transparent; border:none; color:#9ca3af; cursor:pointer; font-size:1.2rem;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="chronicles-list" style="flex: 1; overflow-y: auto; width: 100%; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;">
                    <!-- Logs injected here -->
                </div>
            </div>
        `;
        document.body.appendChild(this.chroniclesModal);

        this.chroniclesModal.querySelector('#btn-close-chronicles').addEventListener('click', () => {
            this.chroniclesModal.classList.add('hidden');
        });
    }
    
    _onReceiveNodeHistory(e) {
        const { nodeId, history } = e.detail;
        const listEl = this.chroniclesModal.querySelector('#chronicles-list');
        listEl.innerHTML = '';

        if (!history || history.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#64748b; padding: 20px; font-style: italic;">The archives are empty. Nothing of note has happened here recently.</div>`;
            return;
        }

        history.forEach(log => {
            // Differentiate colors based on event type
            let icon = '<i class="fa-solid fa-earth-americas" style="color:#60a5fa;"></i>'; // World
            if (log.event_type === 'player') icon = '<i class="fa-solid fa-user-shield" style="color:#10b981;"></i>';
            if (log.event_type === 'mechanic') icon = '<i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;"></i>';

            const logEl = document.createElement('div');
            logEl.style.cssText = "background: rgba(0,0,0,0.2); border: 1px solid #374151; padding: 12px; border-radius: 8px; display: flex; gap: 12px; align-items: flex-start;";
            logEl.innerHTML = `
                <div style="font-size: 1.2rem; margin-top: 2px;">${icon}</div>
                <div>
                    <div style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">Day ${log.day}</div>
                    <div style="color: #e5e7eb; font-size: 0.95rem; line-height: 1.4;">${log.event_text}</div>
                </div>
            `;
            listEl.appendChild(logEl);
        });
    }

    _positionTooltip(e) {
        if (this.tooltip.classList.contains('hidden')) return;
        
        const rect = this.tooltip.getBoundingClientRect();
        let x = e.clientX + 15;
        let y = e.clientY + 15;

        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - 15;
        }
        if (y + rect.height > window.innerHeight) {
            y = e.clientY - rect.height - 15;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    _showResourceTooltip(type, e) {
        if (!this.currentResources) return;
        let html = '';
        const d = this.currentResources;

        switch(type) {
            case 'gold':
                const daysGold = d.dailyWages > 0 ? Math.floor(d.gold / d.dailyWages) : '∞';
                html = `
                    <div style="font-weight:700; color:#facc15; margin-bottom:5px; font-size:1.05rem; text-align:left;">Crowns</div>
                    <div style="max-width: 250px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">You pay out <b style="color:#fff;">${d.dailyWages || 0}</b> crowns per day.</div>
                    <div style="margin-top:8px; max-width: 250px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">Your <b style="color:#fff;">${d.gold}</b> crowns will last you for <b style="color:#fff;">${daysGold}</b> more days.</div>
                `;
                break;
            case 'provisions':
                const daysFood = d.foodPerDay > 0 ? Math.floor(d.provisions / d.foodPerDay) : '∞';
                html = `
                    <div style="font-weight:700; color:#d97706; margin-bottom:5px; font-size:1.05rem; text-align:left;">Provisions</div>
                    <div style="max-width: 260px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">The average person requires 2 provisions per day.</div>
                    <div style="margin-top:8px; max-width: 260px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">You use <b style="color:#fff;">${d.foodPerDay || 0}</b> provisions per day.</div>
                    <div style="margin-top:4px; max-width: 260px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">Your <b style="color:#fff;">${d.provisions}</b> provisions will last you for <b style="color:#fff;">${daysFood}</b> more days.</div>
                `;
                break;
            case 'tools':
                html = `
                    <div style="font-weight:700; color:#9ca3af; margin-bottom:5px; font-size:1.05rem; text-align:left;">Tools and Supplies</div>
                    <div style="max-width: 280px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">One point is required to repair 15 points of item condition. Running out of supplies may result in weapons breaking in combat and will leave your armor damaged and useless.</div>
                    <div style="margin-top:8px; color:#9ca3af; text-align:left; font-weight:normal;">You can carry 200 units at most.</div>
                `;
                break;
            case 'ammo':
                html = `
                    <div style="font-weight:700; color:#d1d5db; margin-bottom:5px; font-size:1.05rem; text-align:left;">Ammunition</div>
                    <div style="max-width: 320px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">Replacing one arrow or bolt will take up one point of ammunition, replacing one shot of a Handgonne will take up two points, and replacing one throwing weapon or charge of a Fire Lance will take up three.</div>
                    <div style="margin-top:8px; max-width: 320px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">Running out of ammunition will leave your quivers empty and your people with nothing to shoot with.</div>
                    <div style="margin-top:8px; color:#9ca3af; text-align:left; font-weight:normal;">You can carry no more than 500 units at a time.</div>
                `;
                break;
            case 'meds':
                html = `
                    <div style="font-weight:700; color:#f87171; margin-bottom:5px; font-size:1.05rem; text-align:left;">Medical Supplies</div>
                    <div style="max-width: 280px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">One point of medical is required each day for every injury to improve and heal. Lost hitpoints heal on their own.</div>
                    <div style="margin-top:8px; max-width: 280px; line-height:1.4; text-align:left; color:#9ca3af; font-weight:normal;">Running out of medical supplies will leave your group unable to recover from severe injuries.</div>
                    <div style="margin-top:8px; color:#9ca3af; text-align:left; font-weight:normal;">You can carry 150 units at most.</div>
                `;
                break;
        }

        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove('hidden');
        this._positionTooltip(e);
    }

    updateStats(resources) {
        this.currentResources = resources; 
        if (resources) {
            if (this.dom.goldDisplay) this.dom.goldDisplay.textContent = resources.gold || 0;
            if (this.dom.provisionsDisplay) this.dom.provisionsDisplay.textContent = resources.provisions || 0;
            if (this.dom.toolsDisplay) this.dom.toolsDisplay.textContent = resources.tools || 0;
            if (this.dom.ammoDisplay) this.dom.ammoDisplay.textContent = resources.ammo || 0;
            if (this.dom.medsDisplay) this.dom.medsDisplay.textContent = resources.medicine || 0;
            this.marketData.gold = resources.gold || 0;
        }
    }

    _bindEvents() {
        document.addEventListener('kaizen:contract-progress-updated', (e) => {
            const contract = e.detail;
            if (this.activeContract && this.activeContract.id === contract.id) {
                this.activeContract.progress_minutes = contract.progress_minutes;
                if (this.dom.progressFill && this.dom.progressText) {
                    const progress = this.activeContract.progress_minutes;
                    const target = this.activeContract.required_minutes;
                    const pct = Math.min((progress / target) * 100, 100);
                    this.dom.progressFill.style.width = `${pct}%`;
                    this.dom.progressText.textContent = `Invest Focus Time to progress (${Math.floor(progress)}/${target}m).`;
                }
            }
        });

        // Backend Sync Events
        Neutralino.events.off('contractCompletedRealtime', this._onContractCompletedRealtime.bind(this));
        Neutralino.events.on('contractCompletedRealtime', this._onContractCompletedRealtime.bind(this));

        Neutralino.events.off('receiveContracts', this._onReceiveContracts.bind(this));
        Neutralino.events.on('receiveContracts', this._onReceiveContracts.bind(this));

        Neutralino.events.off('contractAccepted', this._onContractAccepted.bind(this));
        Neutralino.events.on('contractAccepted', this._onContractAccepted.bind(this));

        Neutralino.events.off('contractAborted', this._onContractAborted.bind(this));
        Neutralino.events.on('contractAborted', this._onContractAborted.bind(this));

        Neutralino.events.off('receiveMarketData', this._onReceiveMarketData.bind(this));
        Neutralino.events.on('receiveMarketData', this._onReceiveMarketData.bind(this));

        Neutralino.events.off('transactionComplete', this._onTransactionComplete.bind(this));
        Neutralino.events.on('transactionComplete', this._onTransactionComplete.bind(this));

        Neutralino.events.off('delvingStatusUpdated', this._onDelvingStatusUpdated.bind(this));
        Neutralino.events.on('delvingStatusUpdated', this._onDelvingStatusUpdated.bind(this));

        Neutralino.events.off('receiveNodeHistory', this._onReceiveNodeHistory.bind(this));
        Neutralino.events.on('receiveNodeHistory', this._onReceiveNodeHistory.bind(this));

        Neutralino.events.off('receivePartyData', this._onReceivePartyDataBound);
        Neutralino.events.on('receivePartyData', this._onReceivePartyDataBound);

        Neutralino.events.off('mercenaryHired', this._onMercenaryHiredBound);
        Neutralino.events.on('mercenaryHired', this._onMercenaryHiredBound);

        Neutralino.events.off('nodePinToggled', () => GameAPI.getWorldData());
        Neutralino.events.on('nodePinToggled', () => GameAPI.getWorldData());

        // Interaction Buttons
        if (this.dom.btnStartDelve) {
            this.dom.btnStartDelve.addEventListener('click', () => GameAPI.setDelvingStatus(true));
        }
        
        if (this.dom.btnStopDelve) {
            this.dom.btnStopDelve.addEventListener('click', () => GameAPI.setDelvingStatus(false));
        }

        if(this.dom.tabJobs) this.dom.tabJobs.addEventListener('click', () => this.switchTab('jobs'));
        if(this.dom.tabMarket) this.dom.tabMarket.addEventListener('click', () => this.switchTab('market'));
        if(this.dom.tabHire) this.dom.tabHire.addEventListener('click', () => this.switchTab('hire'));

        Object.entries(this.dom.resContainers).forEach(([type, el]) => {
            if (el) {
                el.addEventListener('mouseenter', (e) => this._showResourceTooltip(type, e));
                el.addEventListener('mousemove', (e) => this._positionTooltip(e));
                el.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));
            }
        });
    }

    _onDelvingStatusUpdated(e) {
        this.isDelving = e.detail.isDelving;
        this.updateActiveBanner(this.activeContract);
    }

    _onReceivePartyData(e) {
        if (!e.detail) return;

        this.partyData = e.detail;
        if (e.detail.resources) this.updateStats(e.detail.resources);
        if (this.activeTab === 'hire') this.renderHireList();
    }

    _onMercenaryHired(e) {
        const result = e.detail || {};

        if (!result.success) {
            this.pendingHire = null;
            notifier.show("Hiring Failed", result.error || "Unable to hire this recruit.", "fa-solid fa-handshake");
            if (this.activeTab === 'hire') this.renderHireList();
            return;
        }

        if (this.pendingHire) {
            const nodeKey = String(this.pendingHire.nodeId);
            const candidates = this.hireCandidatesByNode.get(nodeKey) || [];
            this.hireCandidatesByNode.set(
                nodeKey,
                candidates.filter(candidate => candidate.id !== this.pendingHire.candidateId)
            );
            this.pendingHire = null;
        }

        const mercName = result.merc?.name || "A new recruit";
        notifier.show("Recruited!", `${mercName} has joined the company.`, "fa-solid fa-handshake");

        if (Number.isFinite(result.newGold)) {
            this.updateStats({ ...this.currentResources, gold: result.newGold });
        }

        GameAPI.getPartyData();
        GameAPI.getWorldData();
        if (this.activeTab === 'hire') this.renderHireList();
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        if (this.dom.tabJobs) this.dom.tabJobs.classList.toggle('active', tabName === 'jobs');
        if (this.dom.tabMarket) this.dom.tabMarket.classList.toggle('active', tabName === 'market');
        if (this.dom.tabHire) this.dom.tabHire.classList.toggle('active', tabName === 'hire');

        if (this.dom.contractList) this.dom.contractList.classList.toggle('hidden', tabName !== 'jobs');
        if (this.dom.marketContainer) this.dom.marketContainer.classList.toggle('hidden', tabName !== 'market');
        if (this.dom.hireContainer) this.dom.hireContainer.classList.toggle('hidden', tabName !== 'hire');

        if (tabName === 'jobs') {
            if (this.selectedNode) {
                this.dom.contractList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
                GameAPI.getContractsForNode(this.selectedNode.id);
            }
        } else if (tabName === 'market') {
            if (this.selectedNode) {
                const loader = '<div style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
                this.dom.marketStashList.innerHTML = loader;
                this.dom.marketShopList.innerHTML = loader;
                GameAPI.getMarketData(this.selectedNode.id);
            }
        } else if (tabName === 'hire') {
            GameAPI.getPartyData();
            this.renderHireList();
        }
    }

    show(nodes) {
        if (!this.dom.overlay) return;
        this.nodes = nodes;
        this.dom.overlay.classList.remove('hidden');
        this.renderNodeList();
        
        if(this.nodes.length > 0) {
            this.selectNode(this.nodes[0]);
        }
        
        GameAPI.getPartyData();
        this.switchTab('jobs');
    }

    updateData(nodes, resources) {
        this.nodes = nodes;
        if (resources) this.updateStats(resources);

        if (this.selectedNode) {
            const updatedNode = this.nodes.find(n => n.id === this.selectedNode.id);
            if (updatedNode) {
                this.selectedNode = updatedNode;
                this.dom.selectedNodeName.innerHTML = `— ${this.selectedNode.name} <span style="color:#fbbf24; font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-handshake"></i> Rep: ${this.selectedNode.reputation || 0}</span>`;
            }
        }
        this.renderNodeList();
    }

    hide() {
        if (this.dom.overlay) this.dom.overlay.classList.add('hidden');
    }

    renderNodeList() {
        this.dom.nodeList.innerHTML = '';

        // 1. Sort Nodes: Pinned first, then by Name
        const sortedNodes = [...this.nodes].sort((a, b) => {
            if (b.is_pinned !== a.is_pinned) return b.is_pinned - a.is_pinned;
            return a.name.localeCompare(b.name);
        });

        sortedNodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'bb-node-card';
            if (this.selectedNode && node.id === this.selectedNode.id) el.classList.add('selected');
            
            let icon = 'fa-campground'; 
            if (['Town', 'City'].includes(node.type)) icon = 'fa-house-chimney';
            if (['City-State', 'Province'].includes(node.type)) icon = 'fa-city';
            if (['Kingdom', 'High Kingdom', 'Empire'].includes(node.type)) icon = 'fa-chess-rook';
            if (node.type === 'Stronghold') icon = 'fa-shield-halved';
            if (node.type === 'Ruins') icon = 'fa-skull';

            // Show pin icon if pinned
            const pinHtml = node.is_pinned 
                ? `<i class="fa-solid fa-thumbtack" style="color: #60a5fa; font-size: 0.8rem; margin-left: auto;"></i>` 
                : ``;
            
            el.innerHTML = `
                <div style="font-size:1.5rem; color:#94a3b8; width:30px; text-align:center;"><i class="fa-solid ${icon}"></i></div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <div style="font-weight:700; display: flex; align-items: center;">${node.name} ${pinHtml}</div>
                    <div style="font-size:0.8rem; color:#64748b;">${node.type}</div>
                </div>
            `;
            
            // Left Click
            el.addEventListener('click', () => this.selectNode(node));

            // Right Click (Context Menu)
            el.addEventListener('contextmenu', (e) => {
                this.menuManager.show(e, [
                    {
                        label: "Inspect Settlement",
                        icon: '<i class="fa-solid fa-magnifying-glass"></i>',
                        action: () => {
                            // Simple notifier for now, we can upgrade to a modal later
                            notifier.show(
                                `${node.name} Economy`, 
                                `Prices: ${Math.round(node.buy_modifier * 100)}% | Payouts: ${Math.round(node.sell_modifier * 100)}%`,
                                'fa-solid fa-scale-balanced'
                            );
                        }
                    },
                    {
                        label: "View Local Chronicles",
                        icon: '<i class="fa-solid fa-scroll"></i>',
                        action: () => {
                            this.chroniclesModal.classList.remove('hidden');
                            this.chroniclesModal.querySelector('#chronicles-list').innerHTML = '<div style="text-align:center; color:#64748b; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Reading archives...</div>';
                            GameAPI.getNodeHistory(node.id);
                        }
                    },
                    {
                        label: "View Reputation",
                        icon: '<i class="fa-solid fa-handshake"></i>',
                        action: () => {
                            notifier.show("Reputation", `Your standing with ${node.name} is ${node.reputation || 0}.`, 'fa-solid fa-handshake');
                        }
                    },
                    { separator: true },
                    {
                        label: node.is_pinned ? "Unpin Settlement" : "Pin to Top",
                        icon: '<i class="fa-solid fa-thumbtack"></i>',
                        action: () => {
                            GameAPI.toggleNodePin(node.id);
                        }
                    },
                    { separator: true },
                    {
                        label: "Visit Marketplace",
                        icon: '<i class="fa-solid fa-coins"></i>',
                        action: () => {
                            this.selectNode(node);
                            this.switchTab('market');
                        }
                    },
                    {
                        label: "Visit Hiring Hall",
                        icon: '<i class="fa-solid fa-handshake"></i>',
                        action: () => {
                            this.selectNode(node);
                            this.switchTab('hire');
                        }
                    },
                    {
                        label: "View Job Board",
                        icon: '<i class="fa-solid fa-clipboard-list"></i>',
                        action: () => {
                            this.selectNode(node);
                            this.switchTab('jobs');
                        }
                    }
                ]);
            });

            this.dom.nodeList.appendChild(el);
        });
    }

    selectNode(node) {
        this.selectedNode = node;
        this.dom.selectedNodeName.innerHTML = `— ${node.name} <span style="color:#fbbf24; font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-handshake"></i> Rep: ${node.reputation || 0}</span>`;
        this.renderNodeList(); 
        
        if (this.activeTab === 'jobs') {
            this.dom.contractList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            GameAPI.getContractsForNode(node.id);
        } else if (this.activeTab === 'market') {
            this.dom.marketStashList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            this.dom.marketShopList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            GameAPI.getMarketData(node.id);
        } else if (this.activeTab === 'hire') {
            this.renderHireList();
            GameAPI.getPartyData();
        }
    }

    // --- Hire Logic ---
    _hashString(value) {
        let hash = 0;
        const text = String(value);
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) || 1;
    }

    _createSeededRandom(seed) {
        let state = seed % 2147483647;
        if (state <= 0) state += 2147483646;
        return () => {
            state = state * 16807 % 2147483647;
            return (state - 1) / 2147483646;
        };
    }

    _pick(list, rand) {
        return list[Math.floor(rand() * list.length)];
    }

    _roll(rand, min, max) {
        return min + Math.floor(rand() * (max - min + 1));
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    _getHireCandidates(node) {
        if (!node) return [];

        const nodeKey = String(node.id);
        if (!this.hireCandidatesByNode.has(nodeKey)) {
            this.hireCandidatesByNode.set(nodeKey, this._generateHireCandidates(node));
        }

        return this.hireCandidatesByNode.get(nodeKey);
    }

    _generateHireCandidates(node) {
        const seed = this._hashString(`${node.id}-${node.name}-${node.type}`);
        const rand = this._createSeededRandom(seed);
        const type = node.type || 'Town';
        const baseCounts = {
            Town: 4,
            City: 6,
            'City-State': 6,
            Province: 5,
            Kingdom: 6,
            'High Kingdom': 7,
            Empire: 7,
            Stronghold: 5,
            Ruins: 2
        };
        const count = (baseCounts[type] || 4) + this._roll(rand, 0, 1);
        const buyModifier = Number(node.buy_modifier) || 1;
        const candidates = [];

        for (let i = 0; i < count; i++) {
            const background = this._pick(this.hireBackgrounds, rand);
            const name = this._pick(NAMES, rand);
            const role = background.role || this._pick(ROLES, rand);
            const level = background.level + (rand() > 0.82 ? 1 : 0);
            const statBase = background.statBase;
            const str = this._clamp(statBase.str + this._roll(rand, -2, 4), 4, 22);
            const int = this._clamp(statBase.int + this._roll(rand, -2, 4), 4, 22);
            const spd = this._clamp(statBase.spd + this._roll(rand, -2, 4), 4, 22);
            const statSum = str + int + spd;
            const wage = Math.max(5, Math.floor((statSum + (level * 4)) / 2));
            const cost = Math.max(50, Math.round((background.baseCost + (statSum * 5) + (level * 35)) * buyModifier));
            const traits = [...background.tags].sort(() => rand() - 0.5).slice(0, 2);

            candidates.push({
                id: `${node.id}-${i}-${name}-${role}`,
                name,
                role,
                level,
                str,
                int,
                spd,
                wage,
                cost,
                icon: background.icon || 'fa-user-shield',
                rumor: background.rumor,
                traits,
                current_hp: 100,
                max_hp: 100,
                fatigue: 0
            });
        }

        return candidates.sort((a, b) => a.cost - b.cost);
    }

    renderHireList() {
        if (!this.dom.hireList) return;

        const rosterCount = this.partyData?.mercenaries?.length || 0;
        const gold = this.currentResources?.gold ?? this.partyData?.resources?.gold ?? 0;

        this.dom.hireList.innerHTML = '';

        if (!this.selectedNode) {
            this.dom.hireList.innerHTML = '<div class="bb-hire-empty">Select a settlement to view available recruits.</div>';
            return;
        }

        const candidates = this._getHireCandidates(this.selectedNode);
        const header = document.createElement('div');
        header.className = 'bb-hire-summary';
        header.innerHTML = `
            <div>
                <div class="bb-hire-summary-title">${this.selectedNode.name} Hiring Hall</div>
                <div class="bb-hire-summary-meta">
                    <span><i class="fa-solid fa-users"></i> ${rosterCount}/${this.rosterLimit}</span>
                    <span><i class="fa-solid fa-coins"></i> ${gold}</span>
                </div>
            </div>
            <div class="bb-hire-summary-meta">
                <span><i class="fa-solid fa-handshake"></i> ${candidates.length} available</span>
            </div>
        `;
        this.dom.hireList.appendChild(header);

        if (candidates.length === 0) {
            this.dom.hireList.insertAdjacentHTML('beforeend', '<div class="bb-hire-empty">No one else is looking for work here right now.</div>');
            return;
        }

        candidates.forEach(candidate => {
            this.dom.hireList.appendChild(this._createHireCard(candidate, gold, rosterCount));
        });
    }

    _createHireCard(candidate, gold, rosterCount) {
        const el = document.createElement('div');
        const rosterFull = rosterCount >= this.rosterLimit;
        const canAfford = gold >= candidate.cost;
        const isPending = this.pendingHire?.candidateId === candidate.id;
        const disabled = rosterFull || !canAfford || !!this.pendingHire;
        const buttonText = isPending ? 'Hiring...' : rosterFull ? 'Roster Full' : canAfford ? 'Hire' : 'Need Gold';

        el.className = `bb-hire-card ${disabled ? 'disabled' : ''}`;
        el.innerHTML = `
            <div class="bb-hire-main">
                <div class="bb-hire-portrait"><i class="fa-solid ${candidate.icon}"></i></div>
                <div>
                    <div class="bb-hire-name-row">
                        <span class="bb-hire-name">${candidate.name}</span>
                        <span class="bb-hire-role">${candidate.role} - Lvl ${candidate.level}</span>
                    </div>
                    <p class="bb-hire-rumor">${candidate.rumor}</p>
                    <div class="bb-hire-stats">
                        <span class="bb-hire-stat" title="Strength"><i class="fa-solid fa-dumbbell"></i> ${candidate.str}</span>
                        <span class="bb-hire-stat" title="Intellect"><i class="fa-solid fa-brain"></i> ${candidate.int}</span>
                        <span class="bb-hire-stat" title="Speed"><i class="fa-solid fa-wind"></i> ${candidate.spd}</span>
                    </div>
                    <div class="bb-hire-traits" style="margin-top: 8px;">
                        ${candidate.traits.map(trait => `<span class="bb-hire-trait">${trait}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="bb-hire-economy">
                <div class="bb-hire-price"><i class="fa-solid fa-coins"></i> ${candidate.cost}</div>
                <div class="bb-hire-wage"><i class="fa-regular fa-clock"></i> ${candidate.wage}g / day</div>
                <button class="bb-btn-accept" ${disabled ? 'disabled' : ''}>${buttonText}</button>
            </div>
        `;

        const button = el.querySelector('.bb-btn-accept');
        if (button && !disabled) {
            button.addEventListener('click', () => this.hireCandidate(candidate));
        }

        return el;
    }

    hireCandidate(candidate) {
        const rosterCount = this.partyData?.mercenaries?.length || 0;
        const gold = this.currentResources?.gold ?? this.partyData?.resources?.gold ?? 0;

        if (rosterCount >= this.rosterLimit) {
            notifier.show("Roster Full", `Your company can only field ${this.rosterLimit} mercenaries.`, "fa-solid fa-users");
            return;
        }

        if (gold < candidate.cost) {
            notifier.show("Insufficient Funds", `${candidate.name} asks for ${candidate.cost} crowns.`, "fa-solid fa-coins");
            return;
        }

        const confirmMsg = [
            `Hire ${candidate.name}, ${candidate.role}?`,
            '',
            `Upfront Cost: ${candidate.cost}g`,
            `Daily Wage: ${candidate.wage}g`,
            `Stats: STR ${candidate.str} / INT ${candidate.int} / SPD ${candidate.spd}`
        ].join('\n');

        if (!confirm(confirmMsg)) return;

        this.pendingHire = {
            nodeId: this.selectedNode?.id,
            candidateId: candidate.id
        };

        this.renderHireList();
        GameAPI.hireMercenary({
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
        }, candidate.cost);
    }

    // --- Market Logic ---
    _onReceiveMarketData(e) {
        this.marketData = e.detail;
        const updatedResources = { ...this.currentResources, gold: this.marketData.gold };
        this.updateStats(updatedResources);
        this.renderMarketList();
    }

    _onTransactionComplete(e) {
        if (e.detail.success) {
            if (this.selectedNode) GameAPI.getMarketData(this.selectedNode.id);
            GameAPI.getWorldData(); 
        } else {
            alert(e.detail.error || "Transaction failed.");
        }
    }

    renderMarketList() {
        this.dom.marketStashList.innerHTML = '';
        if (!this.marketData.inventory || this.marketData.inventory.length === 0) {
            this.dom.marketStashList.innerHTML = `<div style="text-align:center; color:#64748b; padding: 30px 20px;">Your company stash is empty.</div>`;
        } else {
            const stashGrid = document.createElement('div');
            stashGrid.className = 'bb-market-grid';
            this.marketData.inventory.forEach(item => {
                stashGrid.appendChild(this._createMarketSlot(item, false));
            });
            this.dom.marketStashList.appendChild(stashGrid);
        }

        this.dom.marketShopList.innerHTML = '';
        if (!this.marketData.shopItems || this.marketData.shopItems.length === 0) {
            this.dom.marketShopList.innerHTML = `<div style="text-align:center; color:#64748b; padding: 30px 20px;">The merchant has nothing to sell today.</div>`;
        } else {
            const shopGrid = document.createElement('div');
            shopGrid.className = 'bb-market-grid';
            this.marketData.shopItems.forEach(item => {
                shopGrid.appendChild(this._createMarketSlot(item, true));
            });
            this.dom.marketShopList.appendChild(shopGrid);
        }
    }

    _createMarketSlot(item, isBuying) {
        const el = document.createElement('div');
        const price = isBuying ? item.cost : item.sellPrice;
        const canAfford = isBuying ? this.marketData.gold >= price : true;
        
        const rarityClass = item.rarity ? `rarity-${item.rarity}` : 'rarity-common';
        el.className = `bb-market-slot ${rarityClass} ${!canAfford ? 'disabled' : ''}`;
        
        const priceClass = isBuying ? 'buy' : 'sell';

        // Extract Quantity (Shop uses 'amount', Inventory uses 'count')
        const qty = item.amount || item.count;
        let qtyHtml = '';
        if (qty && qty > 1) {
            qtyHtml = `<div class="bb-slot-qty">x${qty}</div>`;
        }

        el.innerHTML = `
            ${qtyHtml}
            <i class="${item.icon || 'fa-solid fa-cube'}"></i>
            <div class="bb-slot-price ${priceClass}">${price}</div>
        `;

        const actionText = isBuying ? 'Left Click to Buy' : 'Left Click to Sell';
        const qtyText = (qty && qty > 1) ? ` (x${qty})` : '';
        
        el.addEventListener('mouseenter', (e) => {
            this.tooltip.innerHTML = `
                <div class="tt-name">${item.name}${qtyText}</div>
                <div class="tt-type">[${item.type || 'Misc'}]</div>
                <div class="tt-action ${priceClass}">${actionText} <i class="fa-solid fa-coins"></i> ${price}</div>
            `;
            this.tooltip.classList.remove('hidden');
            this._positionTooltip(e);
        });

        el.addEventListener('mousemove', (e) => this._positionTooltip(e));
        el.addEventListener('mouseleave', () => this.tooltip.classList.add('hidden'));

        if (canAfford) {
            el.addEventListener('click', () => {
                this.tooltip.classList.add('hidden'); 
                if (isBuying) GameAPI.buyItem(item.id, price, this.selectedNode.id);
                else GameAPI.sellItem(item.inventoryId, price, this.selectedNode.id);
            });
        }

        return el;
    }

    // --- Contract & Delving Logic ---
    _onContractCompletedRealtime(e) {
        this.activeContract = null;
        this.updateActiveBanner(null);

        if (this.selectedNode && this.activeTab === 'jobs') {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }
        GameAPI.getWorldData();
    }

    _onReceiveContracts(e) {
        const { contracts, activeContract } = e.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);
        
        if(this.activeTab === 'jobs') {
            this.renderContracts(contracts);
        }
    }

    _onContractAccepted(e) {
        const { activeContract } = e.detail;
        this.activeContract = activeContract;
        this.updateActiveBanner(activeContract);
        if (this.selectedNode && this.activeTab === 'jobs') {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }
    }

    _onContractAborted(e) {
        this.activeContract = null;
        this.updateActiveBanner(null);
        if (this.selectedNode) {
            GameAPI.getContractsForNode(this.selectedNode.id);
            GameAPI.getWorldData();
        }
    }

    renderContracts(contracts) {
        this.dom.contractList.innerHTML = '';
        if (!contracts || contracts.length === 0) {
            this.dom.contractList.innerHTML = '<div style="text-align:center; color:#64748b; padding: 20px;">No jobs available here currently.</div>';
            return;
        }

        const isBusy = !!this.activeContract;

        contracts.forEach(c => {
            const el = document.createElement('div');
            el.className = 'bb-contract-card';
            
            el.innerHTML = `
                <div class="bb-c-left">
                    <h4>${c.title}</h4>
                    <p>"${c.description}"</p>
                    <div class="bb-c-rewards">
                        <span style="color:#facc15;"><i class="fa-solid fa-coins"></i> ${c.gold_reward}g</span>
                        <span style="color:#60a5fa;"><i class="fa-regular fa-clock"></i> ${c.required_minutes}m Focus</span>
                    </div>
                </div>
                <div class="bb-c-right">
                    <button class="bb-btn-accept" ${isBusy ? 'disabled' : ''}>
                        ${isBusy ? 'Busy' : 'Accept Job'}
                    </button>
                </div>
            `;

            if (!isBusy) {
                el.querySelector('.bb-btn-accept').addEventListener('click', () => GameAPI.acceptContract(c.id));
            }
            
            this.dom.contractList.appendChild(el);
        });
    }

    updateActiveBanner(activeContract) {
        if (this.dom.btnAbort) this.dom.btnAbort.classList.add('hidden');
        if (this.dom.btnStartDelve) this.dom.btnStartDelve.classList.add('hidden');
        if (this.dom.btnStopDelve) this.dom.btnStopDelve.classList.add('hidden');
        if (this.dom.progressContainer) this.dom.progressContainer.classList.add('hidden');

        if (activeContract) {
            // Actively doing a contract
            this.dom.activeTitle.textContent = activeContract.title;
            this.dom.progressContainer.classList.remove('hidden');
            const progress = activeContract.progress_minutes || 0;
            const target = activeContract.required_minutes;
            const pct = Math.min((progress / target) * 100, 100);
            this.dom.progressFill.style.width = `${pct}%`;
            this.dom.progressText.textContent = `Invest Focus Time to progress (${Math.floor(progress)}/${target}m).`;
            
            if (this.dom.btnAbort) {
                this.dom.btnAbort.classList.remove('hidden');
                
                // Clear old listener
                const newBtn = this.dom.btnAbort.cloneNode(true);
                this.dom.btnAbort.parentNode.replaceChild(newBtn, this.dom.btnAbort);
                this.dom.btnAbort = newBtn;
                
                this.dom.btnAbort.addEventListener('click', () => {
                    if (confirm("Abort this contract? You will lose reputation (-10) with the settlement.")) {
                        GameAPI.abortContract(activeContract.id, activeContract.node_id);
                    }
                });
            }
        } else if (this.isDelving) {
            // Active Free-Delve Mode
            this.dom.activeTitle.textContent = "Delving the Depths";
            this.dom.progressText.textContent = "Your party is exploring the dungeon. Complete focus sessions to extract loot.";
            if (this.dom.btnStopDelve) this.dom.btnStopDelve.classList.remove('hidden');
        } else {
            // Idle State
            this.dom.activeTitle.textContent = "Party is Idle";
            this.dom.progressText.textContent = "Select a contract below, or freely delve into the dungeon.";
            if (this.dom.btnStartDelve) this.dom.btnStartDelve.classList.remove('hidden');
        }
    }
}
