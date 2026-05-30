import { BAREBONES_UI, RESOURCE_TOOLTIP } from "./BarebonesConstants.js";
import { escapeHtml } from "./BarebonesTemplates.js";

const RESOURCE_THEME_CLASS = Object.freeze({
    gold: "gold",
    renown: "renown",
    provisions: "provisions",
    tools: "tools",
    ammo: "ammo",
    meds: "meds",
    strength: "strength"
});

export class ResourceTooltipManager {
    constructor(documentRef = document) {
        this.documentRef = documentRef;
        this.bindings = [];
        this.tooltip = documentRef.createElement("div");
        this.tooltip.className = "bb-item-tooltip hidden";
        documentRef.body.appendChild(this.tooltip);
    }

    bindResourceContainers(resourceContainers, getResources) {
        this.unbindResourceContainers();

        Object.entries(resourceContainers).forEach(([type, element]) => {
            if (!element) return;

            const handlers = {
                mouseenter: (event) => this.showResource(type, getResources(), event),
                mousemove: (event) => this.position(event),
                mouseleave: () => this.hide()
            };

            element.addEventListener("mouseenter", handlers.mouseenter);
            element.addEventListener("mousemove", handlers.mousemove);
            element.addEventListener("mouseleave", handlers.mouseleave);
            this.bindings.push({ element, handlers });
        });
    }

    unbindResourceContainers() {
        this.bindings.forEach(({ element, handlers }) => {
            element.removeEventListener("mouseenter", handlers.mouseenter);
            element.removeEventListener("mousemove", handlers.mousemove);
            element.removeEventListener("mouseleave", handlers.mouseleave);
        });
        this.bindings = [];
    }

    destroy() {
        this.unbindResourceContainers();
        this.tooltip.remove();
    }

    showResource(type, resources, event) {
        if (!resources) return;

        const html = this._buildResourceTooltip(type, resources);
        if (!html) return;

        this.show(html, event);
    }

    show(html, event) {
        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove("hidden");
        this.position(event);
    }

    hide() {
        this.tooltip.classList.add("hidden");
    }

    position(event) {
        if (this.tooltip.classList.contains("hidden")) return;

        const rect = this.tooltip.getBoundingClientRect();
        const offset = BAREBONES_UI.TOOLTIP_OFFSET_PX;
        let x = event.clientX + offset;
        let y = event.clientY + offset;

        if (x + rect.width > window.innerWidth) {
            x = event.clientX - rect.width - offset;
        }

        if (y + rect.height > window.innerHeight) {
            y = event.clientY - rect.height - offset;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    _buildResourceTooltip(type, resources) {
        const value = (key) => Number(resources[key]) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE;

        switch (type) {
            case "time": {
                const day = resources.day || 1;
                const year = Math.floor((day - 1) / 365) + 1;
                const dayOfYear = ((day - 1) % 365) + 1;
                return this._layout("Calendar", "time", [
                    `Year <b>${year}</b>, Day <b>${dayOfYear}</b>.`,
                    `Time advances as you complete Focus Sessions.`
                ]);
            }
            case "gold": {
                const dailyWages = value("dailyWages");
                const daysGold = this._daysRemaining(value("gold"), dailyWages);
                return this._layout("Crowns", RESOURCE_THEME_CLASS.gold, [
                    `You pay out <b>${dailyWages}</b> crowns per day.`,
                    `Your <b>${value("gold")}</b> crowns will last you for <b>${daysGold}</b> more days.`
                ]);
            }
            case "renown":
                return this._layout("Renown", RESOURCE_THEME_CLASS.renown, [
                    `Your company has <b>${value("renown")}</b> Renown.`,
                    "Renown rises when you complete contracts and clear enemy strongholds."
                ]);
            case "provisions": {
                const foodPerDay = value("foodPerDay");
                const daysFood = this._daysRemaining(value("provisions"), foodPerDay);
                return this._layout("Provisions", RESOURCE_THEME_CLASS.provisions, [
                    `The average person requires ${RESOURCE_TOOLTIP.PROVISIONS_PER_PERSON_PER_DAY} provisions per day.`,
                    `You use <b>${foodPerDay}</b> provisions per day.`,
                    `Your <b>${value("provisions")}</b> provisions will last you for <b>${daysFood}</b> more days.`
                ]);
            }
            case "tools":
                return this._layout("Tools and Supplies", RESOURCE_THEME_CLASS.tools, [
                    `One point is required to repair ${RESOURCE_TOOLTIP.REPAIR_CONDITION_PER_TOOL} points of item condition. Running out of supplies may result in weapons breaking in combat and will leave your armor damaged and useless.`,
                    `You can carry ${RESOURCE_TOOLTIP.TOOL_CAPACITY} units at most.`
                ]);
            case "ammo":
                return this._layout("Ammunition", RESOURCE_THEME_CLASS.ammo, [
                    "Replacing one arrow or bolt will take up one point of ammunition, replacing one shot of a Handgonne will take up two points, and replacing one throwing weapon or charge of a Fire Lance will take up three.",
                    "Running out of ammunition will leave your quivers empty and your people with nothing to shoot with.",
                    `You can carry no more than ${RESOURCE_TOOLTIP.AMMO_CAPACITY} units at a time.`
                ]);
            case "meds":
                return this._layout("Medical Supplies", RESOURCE_THEME_CLASS.meds, [
                    "One point of medical is required each day for every injury to improve and heal. Lost hitpoints heal on their own.",
                    "Running out of medical supplies will leave your group unable to recover from severe injuries.",
                    `You can carry ${RESOURCE_TOOLTIP.MEDICINE_CAPACITY} units at most.`
                ]);
            case "strength": {
                const strength = resources.partyStrength || {};
                return this._layout("Group Strength", RESOURCE_THEME_CLASS.strength, [
                    `Your active company is rated <b>${escapeHtml(strength.rating || "Unmanned")}</b> with <b>${Number(strength.score) || BAREBONES_UI.DEFAULT_RESOURCE_VALUE}</b> strength.`,
                    "Strength reflects level, core attributes, equipment, wounds, and fatigue."
                ]);
            }
            default:
                return "";
        }
    }

    _layout(title, themeClass, rows) {
        const body = rows
            .map((row) => `<div class="bb-tooltip-body">${row}</div>`)
            .join("");

        return `
            <div class="bb-tooltip-title ${escapeHtml(themeClass)}">${escapeHtml(title)}</div>
            ${body}
        `;
    }

    _daysRemaining(amount, dailyCost) {
        if (dailyCost <= BAREBONES_UI.DEFAULT_RESOURCE_VALUE) {
            return RESOURCE_TOOLTIP.INFINITY_HTML;
        }

        return Math.floor(amount / dailyCost);
    }
}
