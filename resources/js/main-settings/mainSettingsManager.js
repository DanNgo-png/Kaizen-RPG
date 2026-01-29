import { updateManager } from "../_global-managers/UpdateManager.js"; 
import { SettingsAPI } from "../api/SettingsAPI.js";
import { FocusAPI } from "../api/FocusAPI.js";

// Map dropdown values to actual CSS font stacks
const FONT_MAP = {
    'segoe': '"Segoe UI", sans-serif',
    'arial': 'Arial, sans-serif',
    'inter': '"Inter", sans-serif',
    'roboto': '"Roboto", sans-serif',
    'system': 'system-ui, -apple-system, sans-serif',
    'mono': '"Courier New", monospace'
};

// Cache for custom fonts list
let cachedCustomFonts = [];

// Store original HTML to reset modal after success
let originalModalHTML = "";

export function initMainSettings() {
    initTabs(); 

    const fontSelect = document.getElementById('setting-font-family');
    const openFontsBtn = document.getElementById('btn-open-fonts');
    const goalInput = document.getElementById('setting-daily-goal');
    const muteToggle = document.getElementById('setting-mute-audio');
    const heatmapSelect = document.getElementById('setting-heatmap-click');
    const startupToggle = document.getElementById('setting-run-startup');

    // Select Elements for Clear History
    const clearFocusBtn = document.getElementById('btn-clear-focus-data');
    const modal = document.getElementById('modal-clear-history');
    const modalContent = modal ? modal.querySelector('.clear-history-modal-content') : null;
    const btnConfirm = document.getElementById('clear-history-btn-confirm-clear');
    const btnCancel = document.getElementById('clear-history-btn-cancel-clear');

    // Update Checker Logic 
    const btnCheckUpdate = document.querySelector('.ms-btn-primary'); // The "Check Now" button
    const versionBadge = document.querySelector('.version-badge');

    if (startupToggle) {
        // 1. Listen for status from Backend (OS Source of Truth)
        const handleStartupStatus = (e) => {
            const { isEnabled } = e.detail;
            startupToggle.checked = isEnabled;
        };

        Neutralino.events.off('receiveAutoLaunchStatus', handleStartupStatus);
        Neutralino.events.on('receiveAutoLaunchStatus', handleStartupStatus);

        // 2. Initial Check
        SettingsAPI.getAutoLaunchStatus();

        // 3. Handle User Click
        startupToggle.addEventListener('change', (e) => {
            SettingsAPI.setAutoLaunch(e.target.checked);
        });
    }

    if (btnCheckUpdate) {
        // Display current version on load
        Neutralino.app.getConfig().then(config => {
            if (versionBadge) versionBadge.textContent = `v${config.version}`;
        });

        btnCheckUpdate.addEventListener('click', async () => {
            // 1. UI Loading State
            const originalText = "Check Now"; // Or grab existing innerHTML
            btnCheckUpdate.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Checking...`;
            btnCheckUpdate.disabled = true;

            try {
                // 2. Perform Check
                const manifest = await updateManager.check();

                if (manifest) {
                    // 3a. Update Available
                    const confirm = await Neutralino.os.showMessageBox(
                        'Update Available',
                        `Version ${manifest.version} is available. \n\n${manifest.data?.changelog || 'Bug fixes and improvements.'}\n\nInstall now?`,
                        'YES_NO',
                        'QUESTION'
                    );

                    if (confirm === 'YES') {
                        btnCheckUpdate.innerHTML = `<i class="fa-solid fa-download"></i> Installing...`;
                        
                        // Wait for result
                        const success = await updateManager.install();
                        
                        // If failed (e.g. 404), reset UI
                        if (!success) {
                            btnCheckUpdate.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Failed`;
                            setTimeout(() => {
                                btnCheckUpdate.innerHTML = originalText;
                                btnCheckUpdate.disabled = false;
                            }, 3000);
                        }
                    } else {
                        btnCheckUpdate.innerHTML = originalText;
                        btnCheckUpdate.disabled = false;
                    }
                } else {
                    // 3b. No Update
                    await Neutralino.os.showMessageBox('Up to Date', 'You are running the latest version.', 'OK', 'INFO');
                    btnCheckUpdate.innerHTML = originalText;
                    btnCheckUpdate.disabled = false;
                }
            } catch (err) {
                console.error(err);
                btnCheckUpdate.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error`;
                setTimeout(() => {
                    btnCheckUpdate.innerHTML = originalText;
                    btnCheckUpdate.disabled = false;
                }, 2000);
            }
        });
    }

    if (fontSelect) {
        // 1. Listen for changes
        fontSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            
            // Save to DB
            SettingsAPI.saveSetting('fontFamily', selectedValue);
            
            // Apply immediately visually
            applyFontFamily(selectedValue);
        });

        // 2. Load Data
        SettingsAPI.getCustomFonts(); // Load list first
        SettingsAPI.getSetting('fontFamily'); // Then load current selection
    }

    if (openFontsBtn) {
        openFontsBtn.addEventListener('click', () => {
            SettingsAPI.openFontsFolder();
        });
    }

    // --- Heatmap Navigation Logic ---
    if (heatmapSelect) {
        // Load initial
        SettingsAPI.getSetting('heatmapClickAction');

        // Save on change
        heatmapSelect.addEventListener('change', (e) => {
            SettingsAPI.saveSetting('heatmapClickAction', e.target.value);
        });

        // Listen for value from DB
        const handleHeatmapUpdate = (e) => {
            const { key, value } = e.detail;
            if (key === 'heatmapClickAction') {
                // Default to 'review' if empty
                heatmapSelect.value = value || 'review'; 
            }
        };
        document.removeEventListener('kaizen:setting-update', handleHeatmapUpdate);
        document.addEventListener('kaizen:setting-update', handleHeatmapUpdate);
    }

    // --- Daily Goal Logic ---
    if (goalInput) {
        // 1. Load current value
        SettingsAPI.getSetting('dailyGoal');

        // 2. Save on change
        goalInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 1) val = 1; // Minimum 1 minute
            SettingsAPI.saveSetting('dailyGoal', val);
        });
    }

    // --- Mute Settings Logic ---
    if (muteToggle) {
        // 1. Listen for DB updates to set initial state
        const handleMuteUpdate = (e) => {
            const { key, value } = e.detail;
            if (key === 'focusTimerMuted') {
                muteToggle.checked = (value === true || value === 'true');
            }
        };
        
        // Remove duplicate listeners if any (generic safe practice)
        // document.removeEventListener('kaizen:setting-update', handleMuteUpdate);
        document.addEventListener('kaizen:setting-update', handleMuteUpdate);

        // 2. Fetch current state
        SettingsAPI.getSetting('focusTimerMuted');

        // 3. Save on change
        muteToggle.addEventListener('change', (e) => {
            SettingsAPI.saveSetting('focusTimerMuted', e.target.checked);
        });
    }

    // --- Clear Focus History Logic (Modal) ---
    if (clearFocusBtn && modal && btnConfirm && btnCancel) {
        
        // 1. Save original state on first load
        if (!originalModalHTML && modalContent) {
            originalModalHTML = modalContent.innerHTML;
        }

        // 2. Open Modal (Ensure state is clean)
        clearFocusBtn.addEventListener('click', () => {
            if (originalModalHTML) modalContent.innerHTML = originalModalHTML; // Reset content
            // Re-bind buttons after HTML reset because elements were recreated
            bindModalButtons(modal); 
            modal.classList.remove('hidden');
        });

        // Close logic is handled inside bindModalButtons now
        // Close on clicking background overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
}

/**
 * Initializes Tab Navigation logic
 */
function initTabs() {
    const navButtons = document.querySelectorAll('.ms-tab-btn');
    const panels = document.querySelectorAll('.ms-tab-panel');

    if (!navButtons.length || !panels.length) return;

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. Remove active state from all
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // 2. Activate clicked button
            btn.classList.add('active');

            // 3. Activate target panel
            const targetId = btn.getAttribute('data-tab');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

/**
 * Applies font to CSS variable.
 * Handles both standard keys and custom filenames.
 */
export function applyFontFamily(fontKey) {
    const validKey = fontKey || 'segoe';

    // Check if it's a standard map key
    if (FONT_MAP[validKey]) {
        document.documentElement.style.setProperty('--font-main', FONT_MAP[validKey]);
    } 
    // Otherwise assume it's a custom file (e.g. 'Ubuntu.ttf')
    else {
        injectCustomFontFace(validKey);
        // Use the filename (cleaned) as the family name
        document.documentElement.style.setProperty('--font-main', `"${validKey}", sans-serif`);
    }
}

/**
 * Inject @font-face rule dynamically into head
 */
function injectCustomFontFace(filename) {
    const id = `font-face-${filename}`;
    if (document.getElementById(id)) return; // Already injected

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
        @font-face {
            font-family: "${filename}";
            src: url("assets/fonts/${filename}");
        }
    `;
    document.head.appendChild(style);
}

/**
 * Updates the Dropdown options (Standard + Custom)
 */
export function updateFontDropdownOptions(customFonts) {
    const fontSelect = document.getElementById('setting-font-family');
    if (!fontSelect) return;

    cachedCustomFonts = customFonts;
    const currentValue = fontSelect.value;

    // Reset to base options (hardcoded in HTML or rebuilt here)
    // We'll rebuild the "Custom" optgroup dynamically
    
    // 1. Find or Create OptGroup
    let customGroup = fontSelect.querySelector('optgroup[label="Custom Fonts"]');
    if (!customGroup) {
        customGroup = document.createElement('optgroup');
        customGroup.label = "Custom Fonts";
        fontSelect.appendChild(customGroup);
    }

    // 2. Clear existing custom options
    customGroup.innerHTML = '';

    // 3. Populate
    if (customFonts.length === 0) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = "(No fonts found)";
        customGroup.appendChild(opt);
    } else {
        customFonts.forEach(font => {
            const opt = document.createElement('option');
            opt.value = font;
            opt.textContent = font;
            customGroup.appendChild(opt);
        });
    }

    // 4. Restore value if it matches a custom font
    // (If the previously selected custom font is in the new list)
    if (customFonts.includes(currentValue)) {
        fontSelect.value = currentValue;
    }
}

/**
 * Updates the UI Selection state
 */
export function updateFontSelectUI(value) {
    const fontSelect = document.getElementById('setting-font-family');
    if (fontSelect && value) {
        fontSelect.value = value;
    }
}

// Helper to update the input UI when data comes back from DB
export function updateDailyGoalUI(value) {
    const input = document.getElementById('setting-daily-goal');
    if (input && value) {
        input.value = value;
    }
}

/**
 * Helper to re-bind events after innerHTML reset
 */
function bindModalButtons(modal) {
    const btnConfirm = document.getElementById('clear-history-btn-confirm-clear');
    const btnCancel = document.getElementById('clear-history-btn-cancel-clear');

    if (btnCancel) {
        btnCancel.onclick = () => modal.classList.add('hidden');
    }

    if (btnConfirm) {
        btnConfirm.onclick = () => {
            // UI Loading State
            btnConfirm.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Deleting...';
            btnConfirm.style.opacity = '0.7';
            btnConfirm.disabled = true;
            
            FocusAPI.clearFocusHistory();
        };
    }
}

/**
 * Called by SettingsHandler on success
 */
export function onClearHistorySuccess() {
    const modal = document.getElementById('modal-clear-history');
    const content = modal ? modal.querySelector('.clear-history-modal-content') : null;

    if (!content) return;

    // Transition to Success View
    content.innerHTML = `
        <div class="clear-history-modal-header-icon text-green" style="background: rgba(74, 222, 128, 0.1);">
            <i class="fa-solid fa-check"></i>
        </div>
        <h3>History Cleared</h3>
        <p style="text-align: center;">All session data has been successfully wiped.</p>
    `;

    // Wait 1.5 seconds, then close
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 1500);
}