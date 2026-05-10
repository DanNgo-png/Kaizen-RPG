import { GameAPI } from "../../../api/GameAPI.js";

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

            goldDisplay: document.getElementById('bb-gold-display'),

            // NEW: Market DOM
            marketContainer: document.getElementById('bb-marketplace-container'),
            marketList: document.getElementById('bb-market-list'),
            tabJobs: document.getElementById('bb-tab-jobs'),
            tabMarket: document.getElementById('bb-tab-market'),
            subTabBuy: document.getElementById('bb-subtab-buy'),
            subTabSell: document.getElementById('bb-subtab-sell')
        };

        this.nodes = [];
        this.selectedNode = null;
        
        // Tab State
        this.activeTab = 'jobs';
        this.activeSubTab = 'buy';
        this.marketData = { inventory: [], shopItems: [], gold: 0 };

        this._bindEvents();
    }

    updateStats(resources) {
        if (this.dom.goldDisplay && resources) {
            this.dom.goldDisplay.textContent = resources.gold || 0;
            this.marketData.gold = resources.gold || 0;
        }
    }

    _bindEvents() {
        Neutralino.events.off('receiveContracts', this._onReceiveContracts.bind(this));
        Neutralino.events.on('receiveContracts', this._onReceiveContracts.bind(this));

        Neutralino.events.off('contractAccepted', this._onContractAccepted.bind(this));
        Neutralino.events.on('contractAccepted', this._onContractAccepted.bind(this));

        // Market Events
        Neutralino.events.off('receiveMarketData', this._onReceiveMarketData.bind(this));
        Neutralino.events.on('receiveMarketData', this._onReceiveMarketData.bind(this));

        Neutralino.events.off('transactionComplete', this._onTransactionComplete.bind(this));
        Neutralino.events.on('transactionComplete', this._onTransactionComplete.bind(this));

        // Tab Listeners
        if(this.dom.tabJobs) this.dom.tabJobs.addEventListener('click', () => this.switchTab('jobs'));
        if(this.dom.tabMarket) this.dom.tabMarket.addEventListener('click', () => this.switchTab('market'));
        if(this.dom.subTabBuy) this.dom.subTabBuy.addEventListener('click', () => this.switchSubTab('buy'));
        if(this.dom.subTabSell) this.dom.subTabSell.addEventListener('click', () => this.switchSubTab('sell'));
    }

    // --- Tab Management ---
    switchTab(tabName) {
        this.activeTab = tabName;
        
        if (tabName === 'jobs') {
            this.dom.tabJobs.classList.add('active');
            this.dom.tabMarket.classList.remove('active');
            this.dom.contractList.classList.remove('hidden');
            this.dom.marketContainer.classList.add('hidden');
        } else {
            this.dom.tabMarket.classList.add('active');
            this.dom.tabJobs.classList.remove('active');
            this.dom.marketContainer.classList.remove('hidden');
            this.dom.contractList.classList.add('hidden');
            
            // Fetch market data when opening tab
            if (this.selectedNode) {
                this.dom.marketList.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading wares...</div>';
                GameAPI.getMarketData(this.selectedNode.type);
            }
        }
    }

    switchSubTab(subTabName) {
        this.activeSubTab = subTabName;
        
        if (subTabName === 'buy') {
            this.dom.subTabBuy.classList.add('active');
            this.dom.subTabSell.classList.remove('active');
        } else {
            this.dom.subTabSell.classList.add('active');
            this.dom.subTabBuy.classList.remove('active');
        }
        this.renderMarketList();
    }

    // --- General ---
    show(nodes) {
        if (!this.dom.overlay) return;
        this.nodes = nodes;
        this.dom.overlay.classList.remove('hidden');
        this.renderNodeList();
        
        if(this.nodes.length > 0) {
            this.selectNode(this.nodes[0]);
        }
        
        // Reset to Jobs tab on show
        this.switchTab('jobs');
    }

    hide() {
        if (this.dom.overlay) this.dom.overlay.classList.add('hidden');
    }

    renderNodeList() {
        this.dom.nodeList.innerHTML = '';
        this.nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'bb-node-card';
            if (this.selectedNode && node.id === this.selectedNode.id) el.classList.add('selected');
            
            const icon = node.type === 'Stronghold' ? 'fa-chess-rook' : (node.type === 'Town' ? 'fa-house-chimney' : 'fa-campground');
            
            el.innerHTML = `
                <div style="font-size:1.5rem; color:#94a3b8; width:30px; text-align:center;"><i class="fa-solid ${icon}"></i></div>
                <div>
                    <div style="font-weight:700;">${node.name}</div>
                    <div style="font-size:0.8rem; color:#64748b;">${node.type}</div>
                </div>
            `;
            el.addEventListener('click', () => this.selectNode(node));
            this.dom.nodeList.appendChild(el);
        });
    }

    selectNode(node) {
        this.selectedNode = node;
        this.dom.selectedNodeName.textContent = `— ${node.name}`;
        this.renderNodeList(); 
        
        // If on Jobs, fetch jobs. If on Market, fetch market.
        if (this.activeTab === 'jobs') {
            this.dom.contractList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            GameAPI.getContractsForNode(node.id);
        } else {
            this.dom.marketList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            GameAPI.getMarketData(node.type);
        }
    }

    // --- Market Logic ---
    _onReceiveMarketData(e) {
        this.marketData = e.detail;
        this.updateStats({ gold: this.marketData.gold });
        this.renderMarketList();
    }

    _onTransactionComplete(e) {
        if (e.detail.success) {
            // Re-fetch to update inventory and gold perfectly
            if (this.selectedNode) GameAPI.getMarketData(this.selectedNode.type);
            // Also tell background world to update so standard HUD catches the new gold
            GameAPI.getWorldData(); 
        } else {
            alert(e.detail.error || "Transaction failed.");
        }
    }

    renderMarketList() {
        this.dom.marketList.innerHTML = '';
        const isBuying = this.activeSubTab === 'buy';
        const items = isBuying ? this.marketData.shopItems : this.marketData.inventory;

        if (!items || items.length === 0) {
            const msg = isBuying ? "The merchant has nothing to sell today." : "Your company stash is empty.";
            this.dom.marketList.innerHTML = `<div style="text-align:center; color:#64748b; padding: 20px;">${msg}</div>`;
            return;
        }

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'bb-contract-card'; // Reuse contract styling for simplicity
            
            const costText = isBuying ? item.cost : item.sellPrice;
            const canAfford = isBuying ? this.marketData.gold >= item.cost : true;
            const btnColor = isBuying ? '#3b82f6' : '#f59e0b'; // Blue for buy, Orange for sell
            const btnText = isBuying ? 'Buy' : 'Sell';

            el.innerHTML = `
                <div class="bb-c-left" style="display:flex; gap:15px; align-items:center;">
                    <div style="font-size:2rem; color:#9ca3af; background:#1e293b; width:50px; height:50px; display:flex; align-items:center; justify-content:center; border-radius:8px; border:1px solid #334155;">
                        <i class="${item.icon || 'fa-solid fa-cube'}"></i>
                    </div>
                    <div>
                        <h4 style="margin:0 0 5px 0; color:#e2e8f0; font-size:1.1rem;">${item.name}</h4>
                        <div style="font-size:0.85rem; color:#94a3b8;">${isBuying ? 'Merchant Item' : 'In Stash'}</div>
                    </div>
                </div>
                <div class="bb-c-right" style="display:flex; align-items:center; gap:15px;">
                    <span style="color:${canAfford ? '#facc15' : '#ef4444'}; font-weight:700; font-size:1.1rem;">
                        <i class="fa-solid fa-coins"></i> ${costText}g
                    </span>
                    <button class="bb-btn-accept" style="background:${btnColor};" ${!canAfford ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>
            `;

            if (canAfford) {
                el.querySelector('.bb-btn-accept').addEventListener('click', () => {
                    if (isBuying) {
                        GameAPI.buyItem(item.id, item.cost);
                    } else {
                        GameAPI.sellItem(item.inventoryId, item.sellPrice);
                    }
                });
            } else {
                el.querySelector('.bb-btn-accept').style.opacity = '0.5';
                el.querySelector('.bb-btn-accept').style.cursor = 'not-allowed';
            }

            this.dom.marketList.appendChild(el);
        });
    }

    // --- Contract Logic ---
    _onReceiveContracts(e) {
        const { contracts, activeContract } = e.detail;
        this.updateActiveBanner(activeContract);
        
        // Only render contracts if we are currently looking at the job board
        if(this.activeTab === 'jobs') {
            this.renderContracts(contracts);
        }
    }

    _onContractAccepted(e) {
        const { activeContract } = e.detail;
        this.updateActiveBanner(activeContract);
        if (this.selectedNode && this.activeTab === 'jobs') {
            GameAPI.getContractsForNode(this.selectedNode.id);
        }
    }

    renderContracts(contracts) {
        this.dom.contractList.innerHTML = '';
        if (!contracts || contracts.length === 0) {
            this.dom.contractList.innerHTML = '<div style="text-align:center; color:#64748b; padding: 20px;">No jobs available here currently.</div>';
            return;
        }

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
                    <button class="bb-btn-accept">Accept Job</button>
                </div>
            `;

            el.querySelector('.bb-btn-accept').addEventListener('click', () => GameAPI.acceptContract(c.id));
            this.dom.contractList.appendChild(el);
        });
    }

    updateActiveBanner(activeContract) {
        if (activeContract) {
            this.dom.activeTitle.textContent = activeContract.title;
            this.dom.progressContainer.classList.remove('hidden');
            const progress = activeContract.progress_minutes || 0;
            const target = activeContract.required_minutes;
            const pct = Math.min((progress / target) * 100, 100);
            this.dom.progressFill.style.width = `${pct}%`;
            this.dom.progressText.textContent = `Invest Focus Time to progress (${Math.round(progress)}/${target}m).`;
        } else {
            this.dom.activeTitle.textContent = "No Active Contract";
            this.dom.progressContainer.classList.add('hidden');
            this.dom.progressText.textContent = "Select a contract from a settlement below to begin.";
        }
    }
}