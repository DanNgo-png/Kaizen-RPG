import { CSS_CLASSES } from "../data/GameModeConfig.js";

export class BaseStep {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`BaseStep: Container #${containerId} not found.`);
        }
        this.dom = {}; // To be populated by child classes
    }

    init() {
        this._bindEvents();
    }

    _bindEvents() {
        // Override me
    }

    show() {
        if (this.container) {
            this.container.classList.remove(CSS_CLASSES.HIDDEN);
            this.syncFromState();
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add(CSS_CLASSES.HIDDEN);
        }
    }

    syncFromState() {
        // Override me
    }
}