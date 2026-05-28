import { BAREBONES_UI } from "./BarebonesConstants.js";
import {
    emptyStateHtml,
    escapeHtml,
    loadingStateHtml
} from "./BarebonesTemplates.js";

export class MarketPanel {
    constructor({
        dom,
        tooltipManager,
        onBuyItem,
        onSellItem
    }) {
        this.dom = dom;
        this.tooltipManager = tooltipManager;
        this.onBuyItem = onBuyItem;
        this.onSellItem = onSellItem;
        this.marketFilter = 'all'; 
        this.lastMarketData = null;
        this.lastSelectedNode = null;
        this._initFilterListeners();
    }

    _initFilterListeners() {
        const marketChips = document.querySelectorAll('.bb-market-filters[data-target="market"] .bb-filter-chip');

        if (marketChips.length > 0) {
            marketChips.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    marketChips.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    this.marketFilter = btn.dataset.filter;
                    if (this.lastMarketData && this.lastSelectedNode) {
                        this.render(this.lastMarketData, this.lastSelectedNode);
                    }
                });
            });
        }
    }

    _filterItems(items, filter) {
        if (!items) return [];
        if (filter === 'all') return items;

        return items.filter(item => {
            const type = (item.type || '').toLowerCase();
            if (filter === 'weapons') {
                return type === 'weapon' || type === 'ranged';
            }
            if (filter === 'armor') {
                return type === 'armor' || type === 'head' || type === 'off-hand';
            }
            if (filter === 'supplies') {
                return type === 'consumable' || type === 'provision' || type === 'resource';
            }
            if (filter === 'trade') {
                return type === 'trade good';
            }
            return false;
        });
    }

    renderLoading() {
        const loader = loadingStateHtml("Loading...");
        if (this.dom.marketStashList) this.dom.marketStashList.innerHTML = loader;
        if (this.dom.marketShopList) this.dom.marketShopList.innerHTML = loader;
    }

    render(marketData, selectedNode) {
        this.lastMarketData = marketData;
        this.lastSelectedNode = selectedNode;

        const currentFilter = this.marketFilter || 'all';

        const filteredInventory = this._filterItems(marketData.inventory, currentFilter);
        const filteredShopItems = this._filterItems(marketData.shopItems, currentFilter);

        this._renderCollection({
            listElement: this.dom.marketStashList,
            items: filteredInventory,
            emptyMessage: currentFilter === 'all' ? "Your company stash is empty." : "No matching items in your stash.",
            isBuying: false,
            marketData,
            selectedNode
        });

        this._renderCollection({
            listElement: this.dom.marketShopList,
            items: filteredShopItems,
            emptyMessage: currentFilter === 'all' ? "The merchant has nothing to sell today." : "No matching items in the shop.",
            isBuying: true,
            marketData,
            selectedNode
        });
    }

    _renderCollection({
        listElement,
        items,
        emptyMessage,
        isBuying,
        marketData,
        selectedNode
    }) {
        if (!listElement) return;

        listElement.innerHTML = "";
        if (!items?.length) {
            listElement.innerHTML = emptyStateHtml(emptyMessage);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "bb-market-grid";
        items.forEach((item) => {
            grid.appendChild(this._createMarketSlot({ item, isBuying, marketData, selectedNode }));
        });
        listElement.appendChild(grid);
    }

    _createMarketSlot({ item, isBuying, marketData, selectedNode }) {
        const element = document.createElement("div");
        const price = isBuying ? item.cost : item.sellPrice;
        const canAfford = isBuying ? marketData.gold >= price : true;
        const isEquipped = !isBuying && Boolean(item.isEquipped);
        const canTrade = canAfford && Boolean(selectedNode) && !isEquipped;
        const rarityClass = this._rarityClass(item.rarity);
        const priceClass = isEquipped ? "locked" : (isBuying ? "buy" : "sell");
        const quantity = item.amount || item.count;
        const equippedText = this._equippedText(item);

        const provisionStat = (item.stats && item.stats.provisions)
            ? `<div style="position: absolute; top: 2px; right: 4px; font-size: 0.75rem; font-weight: 700; font-family: monospace; color: #d97706; text-shadow: 1px 1px 2px #000, -1px -1px 2px #000; pointer-events: none;"><i class="fa-solid fa-drumstick-bite"></i> ${item.stats.provisions}</div>`
            : "";
        const equippedBadge = isEquipped
            ? `<div class="bb-slot-equipped"><i class="fa-solid fa-lock"></i><span>Worn</span></div>`
            : "";
        const priceContent = isEquipped
            ? `<i class="fa-solid fa-lock"></i>`
            : price;

        element.className = `bb-market-slot ${rarityClass} ${!canTrade ? "disabled" : ""} ${isEquipped ? "equipped" : ""}`;
        element.setAttribute("aria-label", isEquipped ? `${item.name}, ${equippedText}` : item.name);
        element.innerHTML = `
            ${quantity > 1 ? `<div class="bb-slot-qty">x${quantity}</div>` : ""}
            ${provisionStat}
            ${equippedBadge}
            <i class="${item.icon || "fa-solid fa-cube"}"></i>
            <div class="bb-slot-price ${priceClass}">${priceContent}</div>
        `;

        element.addEventListener("mouseenter", (event) => {
            this.tooltipManager.show(this._tooltipHtml({ item, quantity, isBuying, price, priceClass, isEquipped, equippedText }), event);
        });
        element.addEventListener("mousemove", (event) => this.tooltipManager.position(event));
        element.addEventListener("mouseleave", () => this.tooltipManager.hide());

        if (canTrade) {
            element.addEventListener("click", () => {
                this.tooltipManager.hide();
                if (isBuying) {
                    this.onBuyItem?.(item.id, price, selectedNode.id);
                    return;
                }
                this.onSellItem?.(item.inventoryId, price, selectedNode.id);
            });
        }

        return element;
    }

    _getItemStatsHtml(item) {
        if (!item.stats) return '';
        const stats = item.stats;
        let html = '<div style="margin: 6px 0; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 0.8rem; text-align: left; display: flex; flex-direction: column; gap: 2px;">';
        let hasAnyStat = false;

        if (item.type === 'Head' && stats.defense !== undefined) {
            html += `<div><span style="color: #60a5fa;"><i class="fa-solid fa-shield"></i> Head Armor:</span> <b>+${stats.defense}</b></div>`;
            hasAnyStat = true;
        } else if (item.type === 'Armor' && stats.defense !== undefined) {
            html += `<div><span style="color: #60a5fa;"><i class="fa-solid fa-shield"></i> Body Armor:</span> <b>+${stats.defense}</b></div>`;
            hasAnyStat = true;
        } else if (item.type === 'Off-Hand' && stats.defense !== undefined) {
            html += `<div><span style="color: #60a5fa;"><i class="fa-solid fa-shield"></i> Shield Defense:</span> <b>+${stats.defense}</b></div>`;
            hasAnyStat = true;
        } else if ((item.type === 'Weapon' || item.type === 'Ranged') && stats.attack !== undefined) {
            html += `<div><span style="color: #ef4444;"><i class="fa-solid fa-fire"></i> Attack:</span> <b>+${stats.attack}</b></div>`;
            hasAnyStat = true;
        }

        if (stats.armor_penetration !== undefined) {
            html += `<div><span style="color: #fbbf24;"><i class="fa-solid fa-gavel"></i> Armor Pen:</span> <b>${stats.armor_penetration}%</b></div>`;
            hasAnyStat = true;
        }
        if (stats.fatigue_penalty !== undefined && stats.fatigue_penalty !== 0) {
            html += `<div><span style="color: #f59e0b;"><i class="fa-solid fa-weight-hanging"></i> Fatigue:</span> <b>${stats.fatigue_penalty}</b></div>`;
            hasAnyStat = true;
        }
        if (stats.weight !== undefined) {
            html += `<div><span style="color: #94a3b8;"><i class="fa-solid fa-box"></i> Weight:</span> <b>${stats.weight}</b></div>`;
            hasAnyStat = true;
        }

        html += '</div>';
        return hasAnyStat ? html : '';
    }

    _tooltipHtml({ item, quantity, isBuying, price, priceClass, isEquipped, equippedText }) {
        const actionText = isEquipped ? "Unequip before selling" : (isBuying ? "L-Click: Buy" : "L-Click: Sell");
        const quantityText = quantity > 1 ? ` (x${quantity})` : "";
        const equippedHint = isEquipped
            ? `<div class="tt-equipped"><i class="fa-solid fa-user-shield"></i> ${equippedText}</div>`
            : "";
        const priceHint = isEquipped ? `<div class="tt-muted">Sell value: ${price} <i class="fa-solid fa-coins"></i></div>` : "";
        
        let spoilHint = '';
        if (item.stats && item.stats.spoil_days) {
            if (isBuying) {
                spoilHint = `<div style="color:#fbbf24; font-size:0.8rem; margin-top:4px;"><i class="fa-solid fa-clock"></i> Lasts for ${item.stats.spoil_days} days</div>`;
            } else {
                const durColor = item.durability <= 3 ? '#ef4444' : '#fbbf24';
                spoilHint = `<div style="color:${durColor}; font-size:0.8rem; margin-top:4px;"><i class="fa-solid fa-clock"></i> Spoils in ${item.durability} days</div>`;
            }
        }

        return `
            <div class="tt-name">${item.name}${quantityText}</div>
            <div class="tt-type">[${item.type || "Misc"}]</div>
            <div style="font-style: italic; color: #9ca3af; font-size: 0.8rem; margin: 5px 0;">${item.description || ""}</div>
            ${this._getItemStatsHtml(item)}
            ${equippedHint}
            <div class="tt-action ${priceClass}">${actionText}${isEquipped ? "" : ` <i class="fa-solid fa-coins"></i> ${price}`}</div>
            ${priceHint}
            ${spoilHint}
        `;
    }

    _equippedText(item) {
        const wearer = item.equippedByName || "a mercenary";
        const slot = item.equipSlot ? ` (${item.equipSlot.replaceAll("_", " ")})` : "";
        return `Worn by ${wearer}${slot}`;
    }

    _rarityClass(rarity) {
        return `rarity-${(rarity || "common").toLowerCase()}`;
    }
}