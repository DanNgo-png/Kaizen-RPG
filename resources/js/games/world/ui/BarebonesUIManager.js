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
            progressText: document.getElementById('bb-progress-text')
        };

        this.nodes = [];
        this.selectedNodeId = null;

        this._bindEvents();
    }

    _bindEvents() {
        Neutralino.events.off('receiveContracts', this._onReceiveContracts.bind(this));
        Neutralino.events.on('receiveContracts', this._onReceiveContracts.bind(this));

        Neutralino.events.off('contractAccepted', this._onContractAccepted.bind(this));
        Neutralino.events.on('contractAccepted', this._onContractAccepted.bind(this));
    }

    show(nodes) {
        if (!this.dom.overlay) return;
        this.nodes = nodes;
        this.dom.overlay.classList.remove('hidden');
        this.renderNodeList();
        
        // Initial fetch to get active contract if any
        if(this.nodes.length > 0) {
            this.selectNode(this.nodes[0]);
        }
    }

    hide() {
        if (this.dom.overlay) this.dom.overlay.classList.add('hidden');
    }

    renderNodeList() {
        this.dom.nodeList.innerHTML = '';
        
        this.nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'bb-node-card';
            if (node.id === this.selectedNodeId) el.classList.add('selected');
            
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
        this.selectedNodeId = node.id;
        this.dom.selectedNodeName.textContent = `— ${node.name}`;
        this.renderNodeList(); // update highlights
        
        this.dom.contractList.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
        
        GameAPI.getContractsForNode(node.id);
    }

    _onReceiveContracts(e) {
        const { contracts, activeContract } = e.detail;
        
        this.updateActiveBanner(activeContract);
        this.renderContracts(contracts);
    }

    _onContractAccepted(e) {
        const { activeContract } = e.detail;
        this.updateActiveBanner(activeContract);
        
        // Re-fetch list to show the accepted one is gone from the board
        if (this.selectedNodeId) {
            GameAPI.getContractsForNode(this.selectedNodeId);
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

            el.querySelector('.bb-btn-accept').addEventListener('click', () => {
                GameAPI.acceptContract(c.id);
            });

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