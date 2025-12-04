// --- Module State ---
// Defined outside the function so timer keeps running 
// even if you navigate to "Settings" and back to "Focus".
let intervalId = null;
let focusSeconds = 0;
let breakSeconds = 0;
let currentMode = 'focus'; // 'focus' | 'break'

export function initFlexibleFocusTimer() {
    // 1. Select DOM Elements
    // We must re-select these every time the page loads because the HTML is replaced.
    const focusCard = document.getElementById('card-focus');
    const breakCard = document.getElementById('card-break');
    const timeFocusEl = document.getElementById('time-focus');
    const timeBreakEl = document.getElementById('time-break');
    const btnAction = document.getElementById('btn-action');
    
    // Select the text span specifically, ignoring the key-hint span
    const btnTextSpan = btnAction ? btnAction.querySelector('span:not(.key-hint)') : null;
    
    // Balance is optional but present in your HTML
    const balanceTimeEl = document.querySelector('.stat-card:nth-child(3) .stat-time');

    // 2. Helper Functions
    const formatTime = (totalSeconds) => {
        const m = Math.floor(Math.abs(totalSeconds) / 60).toString().padStart(2, '0');
        const s = (Math.abs(totalSeconds) % 60).toString().padStart(2, '0');
        // Optional: Add negative sign for balance if needed
        return (totalSeconds < 0 ? "-" : "") + `${m}:${s}`;
    };

    const updateUI = () => {
        // Update Timers
        if(timeFocusEl) timeFocusEl.textContent = formatTime(focusSeconds);
        if(timeBreakEl) timeBreakEl.textContent = formatTime(breakSeconds);
        
        // Calculate Balance: (Focus / 3) - Break
        // This assumes a 3:1 ratio (3 mins work = 1 min break) based on your screenshots
        if(balanceTimeEl) {
            const balance = Math.floor(focusSeconds / 3) - breakSeconds;
            balanceTimeEl.textContent = formatTime(balance);
        }

        // Update Visual State (Colors & Buttons)
        if (currentMode === 'focus') {
            // Card Styles
            focusCard.classList.add('active-focus');
            breakCard.classList.remove('active-break');

            // Button Styles
            btnAction.classList.remove('btn-green');
            btnAction.classList.add('btn-brown');
            if(btnTextSpan) btnTextSpan.textContent = "TAKE A BREAK";

        } else {
            // Card Styles
            focusCard.classList.remove('active-focus');
            breakCard.classList.add('active-break');

            // Button Styles
            btnAction.classList.remove('btn-brown');
            btnAction.classList.add('btn-green');
            if(btnTextSpan) btnTextSpan.textContent = "BACK TO FOCUS";
        }
    };

    const tick = () => {
        if (currentMode === 'focus') {
            focusSeconds++;
        } else {
            breakSeconds++;
        }
        updateUI();
    };

    const toggleMode = () => {
        if (currentMode === 'focus') {
            currentMode = 'break';
        } else {
            currentMode = 'focus';
        }
        updateUI();
    };

    // 3. Initialization Logic
    
    // Ensure existing interval is cleared to prevent duplicates if init is called twice erroneously
    // (Though usually with this module pattern, we stick to one persistent interval)
    if (!intervalId) {
        intervalId = setInterval(tick, 1000);
    }

    // Run once immediately to set initial UI state (colors, text)
    updateUI();

    // 4. Event Listeners
    if (btnAction) {
        btnAction.addEventListener('click', toggleMode);
    }

    // Optional: Keyboard Shortcut 'B'
    const handleKeydown = (e) => {
        // Check if 'B' is pressed and we are on the flexible focus page
        if (e.key.toLowerCase() === 'b' && document.body.contains(btnAction)) {
            toggleMode();
        }
    };

    // Avoid adding multiple key listeners if user navigates back and forth
    // We remove the old one first (if logic permits) or rely on a named function check.
    // For simplicity in this router setup, we add it to the specific button click or document.
    document.addEventListener('keydown', handleKeydown, { once: true }); // Simple implementation
}