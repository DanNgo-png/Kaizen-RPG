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
    }

    renderLoading() {
        const loader = loadingStateHtml("Loading...");
        if (this.dom.marketStashList) this.dom.marketStashList.innerHTML = loader;
        if (this.dom.marketShopList) this.dom.marketShopList.innerHTML = loader;
    }

    render(marketData, selectedNode) {
        this._renderCollection({
            listElement: this.dom.marketStashList,
            items: marketData.inventory,
            emptyMessage: "Your company stash is empty.",
            isBuying: false,
            marketData,
            selectedNode
        });

        this._renderCollection({
            listElement: this.dom.marketShopList,
            items: marketData.shopItems,
            emptyMessage: "The merchant has nothing to sell today.",
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
        const canTrade = canAfford && Boolean(selectedNode);
        const rarityClass = this._rarityClass(item.rarity);
        const priceClass = isBuying ? "buy" : "sell";
        const quantity = item.amount || item.count;

        element.className = `bb-market-slot ${rarityClass} ${!canAfford ? "disabled" : ""}`;
        element.innerHTML = `
            ${quantity > BAREBONES_UI.MARKET_QUANTITY_THRESHOLD ? `<div class="bb-slot-qty">x${quantity}</div>` : ""}
            <i class="${escapeHtml(item.icon || "fa-solid fa-cube")}"></i>
            <div class="bb-slot-price ${priceClass}">${price}</div>
        `;

        // Tooltips 
        element.addEventListener("mouseenter", (event) => {
            this.tooltipManager.show(this._tooltipHtml({ item, quantity, isBuying, price, priceClass }), event);
        });
        element.addEventListener("mousemove", (event) => this.tooltipManager.position(event));
        element.addEventListener("mouseleave", () => this.tooltipManager.hide());

        // Left Click: Buy/Sell
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

    _tooltipHtml({ item, quantity, isBuying, price, priceClass }) {
        const actionText = isBuying ? "L-Click: Buy" : "L-Click: Sell";
        const quantityText = quantity > BAREBONES_UI.MARKET_QUANTITY_THRESHOLD ? ` (x${quantity})` : "";
        
        // Show Spoil Days if applicable
        const spoilHint = (!isBuying && item.stats && item.stats.spoil_days) 
            ? `<div style="color:#ef4444; font-size:0.8rem; margin-top:4px;"><i class="fa-solid fa-clock"></i> Spoils in ${item.durability} days</div>` 
            : '';

        return `
            <div class="tt-name">${escapeHtml(item.name)}${quantityText}</div>
            <div class="tt-type">[${escapeHtml(item.type || "Misc")}]</div>
            <div style="font-style: italic; color: #9ca3af; font-size: 0.8rem; margin: 5px 0;">${escapeHtml(item.description || "")}</div>
            <div class="tt-action ${priceClass}">${actionText} <i class="fa-solid fa-coins"></i> ${price}</div>
            ${spoilHint}
        `;
    }

    _rarityClass(rarity) {
        return `rarity-${(rarity || "common").toLowerCase()}`;
    }
}