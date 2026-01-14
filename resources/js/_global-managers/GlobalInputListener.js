import { audioManager } from "./AudioManager.js";

export function initGlobalInputListeners() {
    console.log("🔊 Global Input Listeners Initialized");

    // --- CLICK SOUNDS ---
    document.addEventListener('click', (e) => {
        // 1. Sidebar Toggle (Special Sound)
        if (e.target.closest('#sidebar-toggle')) {
            audioManager.play('button', 'sidebar_toggle');
            return;
        }

        // 2. General Interactive Elements
        // We look for the closest parent that is a button, link, or interactive UI element
        const target = e.target.closest(`
            button, 
            a, 
            input[type="checkbox"], 
            input[type="radio"],
            .selector-trigger, 
            .selector-opt, 
            .task-item, 
            .menu-btn,
            .nav-btn,
            .clickable
        `);

        // Play standard click if found and not disabled
        if (target && !target.disabled) {
            audioManager.play('button', 'click');
        }
    }, true); // Use capture phase to ensure it triggers before other logic potentially stops propagation


    // --- HOVER SOUNDS (Debounced) ---
    // We only trigger this on "major" interactive elements to avoid noise pollution
    const hoverSelectors = '.dropdown-button, .menu-btn, .sidebar-toggle-button, .nav-btn';

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest(hoverSelectors);

        // Logic: Play sound once per entry, reset when mouse leaves
        if (target && !target.disabled && !target.dataset.soundHoverPlayed) {
            audioManager.play('button', 'hover');
            
            // Mark as played so we don't spam it while moving mouse pixel-by-pixel inside the button
            target.dataset.soundHoverPlayed = "true";

            // Reset flag on mouseleave
            target.addEventListener('mouseleave', () => {
                delete target.dataset.soundHoverPlayed;
            }, { once: true });
        }
    });
}