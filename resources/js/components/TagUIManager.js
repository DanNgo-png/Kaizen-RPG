import { FocusAPI } from "../api/FocusAPI.js";
import { TagDropdown } from "./tag_ui/TagDropdown.js";
import { TagModals } from "./tag_ui/TagModals.js";

export class TagUIManager {
    constructor({ triggerId, displayId, initialTag, defaultTag, onTagSelected }) {
        // Internal State
        this.defaultTag = defaultTag || "Standard";
        this.currentTag = (initialTag === "Add a tag") ? this.defaultTag : (initialTag || this.defaultTag);
        this.onTagSelected = onTagSelected;

        // Initialize DOM References
        const triggerEl = document.getElementById(triggerId);
        const displayEl = document.getElementById(displayId);

        if (!triggerEl) return;

        // 1. Initialize Modals (The View/UI)
        // We pass the Logic (API calls) down to it.
        this.modals = new TagModals({
            onSave: (name, color) => {
                FocusAPI.saveTag(name, color);
            },
            onUpdate: (id, name, color) => {
                FocusAPI.updateTag(id, name, color);
            },
            onDelete: (id) => {
                FocusAPI.deleteTag(id);
                // Note: We don't reset the UI here immediately. 
                // We wait for the 'receiveTags' event to ensure the DB sync happened.
            }
        });

        // 2. Initialize Dropdown (The View/UI)
        this.dropdown = new TagDropdown({
            triggerEl,
            displayEl,
            defaultTag: this.defaultTag,
            onSelect: (tagName) => this.selectTag(tagName),
            onManage: () => this.modals.openManage()
        });

        // 3. Bind Global Data Events
        this._initDataListeners();
    }

    _initDataListeners() {
        // Listen for updates from backend (Add, Update, Delete)
        Neutralino.events.on('receiveTags', (e) => {
            const tags = e.detail;

            // Update sub-components with new data
            this.dropdown.render(tags, this.currentTag);
            this.modals.updateTags(tags);

            // Check if our currently selected tag still exists
            this._validateCurrentSelection(tags);
        });

        // Request initial data
        FocusAPI.getTags();
    }

    /**
     * If the currently selected tag was deleted, revert to default.
     */
    _validateCurrentSelection(tags) {
        // Always consider the default tag valid
        if (this.currentTag === this.defaultTag || this.currentTag === "Standard") return;

        const exists = tags.some(t => t.name === this.currentTag);

        if (!exists) {
            console.log(`Tag "${this.currentTag}" no longer exists. Reverting to default.`);
            this.selectTag(this.defaultTag);
        }
    }

    selectTag(name, emitCallback = true) {
        this.currentTag = name;

        // Update UI
        this.dropdown.updateSelectionUI(name);

        // Emit to parent (e.g. FocusTimer)
        if (emitCallback && this.onTagSelected) {
            this.onTagSelected(name);
        }
    }

    destroy() {
        this.dropdown.destroy();
        this.modals.destroy();
        // Unsubscribe from Neutralino events if possible
    }
}