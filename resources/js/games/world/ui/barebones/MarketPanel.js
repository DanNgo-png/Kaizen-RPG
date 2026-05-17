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
        const isEquipped = !isBuying && Boolean(item.isEquipped);
        const canTrade = canAfford && Boolean(selectedNode) && !isEquipped;
        const rarityClass = this._rarityClass(item.rarity);
        const priceClass = isEquipped ? "locked" : (isBuying ? "buy" : "sell");
        const quantity = item.amount || item.count;
        const equippedText = this._equippedText(item);

        // Visual Provision Amount Badge
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
            ${quantity > BAREBONES_UI.MARKET_QUANTITY_THRESHOLD ? `<div class="bb-slot-qty">x${quantity}</div>` : ""}
            ${provisionStat}
            ${equippedBadge}
            <i class="${escapeHtml(item.icon || "fa-solid fa-cube")}"></i>
            <div class="bb-slot-price ${priceClass}">${priceContent}</div>
        `;

        // Tooltips 
        element.addEventListener("mouseenter", (event) => {
            this.tooltipManager.show(this._tooltipHtml({ item, quantity, isBuying, price, priceClass, isEquipped, equippedText }), event);
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

    _tooltipHtml({ item, quantity, isBuying, price, priceClass, isEquipped, equippedText }) {
        const actionText = isEquipped ? "Unequip before selling" : (isBuying ? "L-Click: Buy" : "L-Click: Sell");
        const quantityText = quantity > BAREBONES_UI.MARKET_QUANTITY_THRESHOLD ? ` (x${quantity})` : "";
        const equippedHint = isEquipped
            ? `<div class="tt-equipped"><i class="fa-solid fa-user-shield"></i> ${escapeHtml(equippedText)}</div>`
            : "";
        const priceHint = isEquipped ? `<div class="tt-muted">Sell value: ${price} <i class="fa-solid fa-coins"></i></div>` : "";
        
        // Show Spoil Days based on Buying or Checking Stash
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
            <div class="tt-name">${escapeHtml(item.name)}${quantityText}</div>
            <div class="tt-type">[${escapeHtml(item.type || "Misc")}]</div>
            <div style="font-style: italic; color: #9ca3af; font-size: 0.8rem; margin: 5px 0;">${escapeHtml(item.description || "")}</div>
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
