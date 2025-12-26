import { SettingsAPI } from "../api/SettingsAPI.js";

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

export function initMainSettings() {
    const fontSelect = document.getElementById('setting-font-family');
    const openFontsBtn = document.getElementById('btn-open-fonts');

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