export const TagTemplates = {
    dropdown: () => `
        <div class="selector-menu">
            <div class="tag-list-container"></div>
            <div class="menu-footer-action">
                <!-- Changed ID to Class: js-btn-clear -->
                <button class="btn-block-text danger hidden js-btn-clear">
                    <i class="fa-solid fa-xmark"></i> Clear Selection
                </button>
                <!-- Changed ID to Class: js-btn-manage -->
                <button class="btn-block-text js-btn-manage">
                    <i class="fa-solid fa-gear"></i> Manage Tags
                </button>
            </div>
        </div>
    `,

    dropdownItem: (name, color) => `
        <span class="opt-dot" style="background-color: ${color};"></span> ${name}
    `,

    manageItem: (tag) => `
        <div class="tag-info">
            <span class="opt-dot" style="background-color:${tag.color}"></span> ${tag.name}
        </div>
        <button class="btn-delete-tag"><i class="fa-solid fa-trash"></i></button>
    `,

    // Modals remain unchanged as they are usually singletons at the body level
    modals: () => `
        <div id="tag-ui-modal-manage" class="modal-overlay hidden">
           <!-- ... (Keep existing modal HTML) ... -->
           <div class="focus-flexible-modal-content large-modal">
                <div class="modal-header">
                    <h3>Manage Tags</h3>
                    <button id="tag-ui-close-manage" class="btn-icon-sm"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="manage-layout">
                    <div class="manage-sidebar">
                        <h4 class="section-title current-tags">Current Tags</h4>
                        <div id="tag-ui-manage-list" class="manage-list-container"></div>
                    </div>
                    <div class="manage-form-area">
                        <h4 id="tag-ui-form-title" class="section-title add-new-tag">Add New Tag</h4>
                        <div class="form-group">
                            <label>Tag Name</label>
                            <input type="text" id="tag-ui-input-name" placeholder="e.g. Deep Work">
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <button id="tag-ui-btn-color" class="color-preview-btn">
                                <span id="tag-ui-preview-dot" class="preview-dot" style="background:#10b981"></span>
                                <span id="tag-ui-preview-text">#10b981</span>
                            </button>
                        </div>
                        <div class="form-actions">
                            <button id="tag-ui-btn-cancel-edit" class="btn-flex-secondary hidden">Cancel</button>
                            <button id="tag-ui-btn-submit" class="btn-flex-primary">Add Tag</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="tag-ui-modal-color" class="modal-overlay hidden nested-overlay">
            <div class="focus-flexible-modal-content compact-modal">
                <h3>Pick Color</h3>
                <div class="color-presets">
                    <div class="color-swatch" data-color="#3b82f6" style="background: #3b82f6;"></div>
                    <div class="color-swatch" data-color="#6366f1" style="background: #6366f1;"></div> <!-- Indigo -->
                    <div class="color-swatch" data-color="#14b8a6" style="background: #14b8a6;"></div> <!-- Teal -->
                    <div class="color-swatch" data-color="#10b981" style="background: #10b981;"></div>
                    <div class="color-swatch" data-color="#f59e0b" style="background: #f59e0b;"></div>
                    <div class="color-swatch" data-color="#ef4444" style="background: #ef4444;"></div>
                    <div class="color-swatch" data-color="#a855f7" style="background: #a855f7;"></div>
                    <div class="color-swatch" data-color="#ec4899" style="background: #ec4899;"></div>
                    <div class="color-swatch" data-color="#64748b" style="background: #64748b;"></div> <!-- Slate -->
                </div>
                <div class="input-row">
                    <label>Hex Code</label>
                    <input type="text" id="tag-ui-hex-input" placeholder="#FFFFFF">
                </div>
                <div class="modal-actions">
                    <button id="tag-ui-color-cancel" class="btn-flex-secondary">Cancel</button>
                    <button id="tag-ui-color-confirm" class="btn-flex-primary">Select</button>
                </div>
            </div>
        </div>

        <div id="tag-ui-modal-delete" class="modal-overlay hidden">
            <div class="focus-flexible-modal-content" style="text-align: center; width: 350px;">
                <div class="modal-header-icon" style="color:#ef4444; font-size: 2rem; margin-bottom:10px;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Delete Tag?</h3>
                <p>Delete <b id="tag-ui-delete-name"></b>? This cannot be undone.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button id="tag-ui-delete-cancel" class="btn-flex-secondary">Cancel</button>
                    <button id="tag-ui-delete-confirm" class="btn-flex-primary" style="background:#ef4444; border-color:#ef4444">Delete</button>
                </div>
            </div>
        </div>
    `
};