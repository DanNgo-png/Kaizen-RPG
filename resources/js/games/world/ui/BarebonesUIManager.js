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
            btnAbort: document.getElementById('bb-btn-abort'),

            goldDisplay: document.getElementById('bb-gold-display'),

            // Market DOM
            marketContainer: document.getElementById('bb-marketplace-container'),
            marketStashList: document.getElementById('bb-market-stash-list'),
            marketShopList: document.getElementById('bb-market-shop-list'),
            tabJobs: document.getElementById('bb-tab-jobs'),
            tabMarket: document.getElementById('bb-tab-market')
        };

        this.nodes = [];
        this.selectedNode = null;
        this.activeContract = null;
        
        // Tab State
        this.activeTab = 'jobs';
        this.marketData = { inventory: [], shopItems: [], gold: 0 };

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'bb-item-tooltip hidden';
        document.body.appendChild(this.tooltip);

        this._bindEvents();
    }

    _positionTooltip(e) {
        if (this.tooltip.classList.contains('hidden')) return;
        
        const rect = this.tooltip.getBoundingClientRect();
        let x = e.clientX + 15;
        let y = e.clientY + 15;

        // Keep within viewport boundaries
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - 15;
        }
        if (y + rect.height > window.innerHeight) {
            y = e.clientY - rect.height - 15;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
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

        Neutralino.events.off('contractAborted', this._onContractAborted.bind(this));
        Neutralino.events.on('contractAborted', this._onContractAborted.bind(this));

        // Market Events
        Neutralino.events.off('receiveMarketData', this._onReceiveMarketData.bind(this));
        Neutralino.events.on('receiveMarketData', this._onReceiveMarketData.bind(this));

        Neutralino.events.off('transactionComplete', this._onTransactionComplete.bind(this));
        Neutralino.events.on('transactionComplete', this._onTransactionComplete.bind(this));

        // Tab Listeners
        if(this.dom.tabJobs) this.dom.tabJobs.addEventListener('click', () => this.switchTab('jobs'));
        if(this.dom.tabMarket) this.dom.tabMarket.addEventListener('click', () => this.switchTab('market'));
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
                const loader = '<div style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
                this.dom.marketStashList.innerHTML = loader;
                this.dom.marketShopList.innerHTML = loader;
                GameAPI.getMarketData(this.selectedNode.type);
            }
        }
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
        this.dom.selectedNodeName.innerHTML = `— ${node.name} <span style="color:#fbbf24; font-size:0.8rem; margin-left:10px;"><i class="fa-solid fa-handshake"></i> Rep: ${node.reputation || 0}</span>`;
        this.renderNodeList(); 
        
        if (this.activeTab === 'jobs') {
            this.dom.contractList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            GameAPI.getContractsForNode(node.id);
        } else {
            this.dom.marketStashList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
            this.dom.marketShopList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
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
            if (this.selectedNode) GameAPI.getMarketData(this.selectedNode.type);
            GameAPI.getWorldData(); 
        } else {
            alert(e.detail.error || "Transaction failed.");
        }
    }

    renderMarketList() {
        // Render Stash (Sell)
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

        // Render Shop (Buy)
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

        // Inner HTML (Icon + Tiny Price Tag)
        el.innerHTML = `
            <i class="${item.icon || 'fa-solid fa-cube'}"></i>
            <div class="bb-slot-price ${priceClass}">${price}</div>
        `;

        // --- NEW: Tooltip Mouse Events ---
        const actionText = isBuying ? 'Left Click to Buy' : 'Left Click to Sell';
        
        el.addEventListener('mouseenter', (e) => {
            this.tooltip.innerHTML = `
                <div class="tt-name">${item.name}</div>
                <div class="tt-type">[${item.type || 'Misc'}]</div>
                <div class="tt-action ${priceClass}">${actionText} <i class="fa-solid fa-coins"></i> ${price}</div>
            `;
            this.tooltip.classList.remove('hidden');
            this._positionTooltip(e);
        });

        el.addEventListener('mousemove', (e) => {
            this._positionTooltip(e);
        });

        el.addEventListener('mouseleave', () => {
            this.tooltip.classList.add('hidden');
        });
        // ---------------------------------

        if (canAfford) {
            el.addEventListener('click', () => {
                this.tooltip.classList.add('hidden'); // Hide tooltip on click to refresh cleanly
                if (isBuying) GameAPI.buyItem(item.id, price, this.selectedNode.id);
                else GameAPI.sellItem(item.inventoryId, price, this.selectedNode.id);
            });
        }

        return el;
    }

    // --- Contract Logic ---
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
        if (activeContract) {
            this.dom.activeTitle.textContent = activeContract.title;
            this.dom.progressContainer.classList.remove('hidden');
            const progress = activeContract.progress_minutes || 0;
            const target = activeContract.required_minutes;
            const pct = Math.min((progress / target) * 100, 100);
            this.dom.progressFill.style.width = `${pct}%`;
            this.dom.progressText.textContent = `Invest Focus Time to progress (${Math.round(progress)}/${target}m).`;
            
            if (this.dom.btnAbort) {
                this.dom.btnAbort.classList.remove('hidden');
                const newBtn = this.dom.btnAbort.cloneNode(true);
                this.dom.btnAbort.parentNode.replaceChild(newBtn, this.dom.btnAbort);
                this.dom.btnAbort = newBtn;
                
                this.dom.btnAbort.addEventListener('click', () => {
                    if (confirm("Abort this contract? You will lose reputation (-10) with the settlement.")) {
                        GameAPI.abortContract(activeContract.id, activeContract.node_id);
                    }
                });
            }
        } else {
            this.dom.activeTitle.textContent = "No Active Contract";
            this.dom.progressContainer.classList.add('hidden');
            this.dom.progressText.textContent = "Select a contract from a settlement below to begin.";
            if (this.dom.btnAbort) this.dom.btnAbort.classList.add('hidden');
        }
    }
}