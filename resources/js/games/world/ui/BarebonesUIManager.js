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
            tabJobs: document.getElementById('bb-tab-jobs'),
            tabMarket: document.getElementById('bb-tab-market')
        };

        this.nodes = [];
        this.selectedNode = null;
        this.activeContract = null;
        this.currentResources = null; 
        
        this.activeTab = 'jobs';
        this.marketData = { inventory: [], shopItems: [], gold: 0 };
        this.isDelving = false;

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

        // Interaction Buttons
        if (this.dom.btnStartDelve) {
            this.dom.btnStartDelve.addEventListener('click', () => GameAPI.setDelvingStatus(true));
        }
        
        if (this.dom.btnStopDelve) {
            this.dom.btnStopDelve.addEventListener('click', () => GameAPI.setDelvingStatus(false));
        }

        if(this.dom.tabJobs) this.dom.tabJobs.addEventListener('click', () => this.switchTab('jobs'));
        if(this.dom.tabMarket) this.dom.tabMarket.addEventListener('click', () => this.switchTab('market'));

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
            
            if (this.selectedNode) {
                const loader = '<div style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
                this.dom.marketStashList.innerHTML = loader;
                this.dom.marketShopList.innerHTML = loader;
                GameAPI.getMarketData(this.selectedNode.type);
            }
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
        const updatedResources = { ...this.currentResources, gold: this.marketData.gold };
        this.updateStats(updatedResources);
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

        el.innerHTML = `
            <i class="${item.icon || 'fa-solid fa-cube'}"></i>
            <div class="bb-slot-price ${priceClass}">${price}</div>
        `;

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