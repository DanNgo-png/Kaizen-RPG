// Helper function to handle clicks outside the sidebar
function handleOutsideClick(event) {
    const sidebar = document.getElementById('configure-sidebar');
    
    // 1. Safety: If sidebar is gone (e.g. page changed), clean up
    if (!sidebar) {
        document.removeEventListener('click', handleOutsideClick);
        return;
    }

    // 2. Ignore clicks INSIDE the sidebar
    if (sidebar.contains(event.target)) {
        return;
    }

    // 3. Ignore clicks on the "Configure" button itself
    // (Let the main toggle logic handle that, otherwise it fights)
    if (event.target.closest('#configure-footer-button')) {
        return;
    }

    // 4. Action: Close Sidebar & Remove Listener
    sidebar.classList.remove('configure-sidebar-open');
    document.removeEventListener('click', handleOutsideClick);
}

export function configureSidebar() {
    const sidebar = document.getElementById('configure-sidebar');

    // Safety check: if sidebar doesn't exist (e.g., wrong page), stop.
    if (!sidebar) return;

    // 1. Toggle the Sidebar Visibility
    sidebar.classList.toggle('configure-sidebar-open');

    // 2. Manage "Click Outside" Listener
    const isOpen = sidebar.classList.contains('configure-sidebar-open');

    if (isOpen) {
        // We just opened it. Add the outside listener.
        // Use setTimeout to ensure the current click (that opened it) doesn't trigger an immediate close.
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
    } else {
        // We closed it manually. Clean up the listener.
        document.removeEventListener('click', handleOutsideClick);
    }

    // =========================================================
    // LOGIC: Long Break Toggle & Options
    // =========================================================
    const toggle = document.getElementById('long-break-toggle');
    const options = document.getElementById('long-break-options');

    if (toggle && options && !toggle.dataset.initialized) {
        
        const updateVisibility = () => {
            if (toggle.checked) {
                // Add class for smooth animation
                options.classList.add('is-expanded');
            } else {
                // Remove class to collapse
                options.classList.remove('is-expanded');
            }
        };

        // Initialize (Set default to off)
        toggle.checked = false; 
        updateVisibility();

        toggle.addEventListener('change', updateVisibility);
        toggle.dataset.initialized = "true";
    }

    // =========================================================
    // LOGIC: Timer vs Stopwatch Tab Switching
    // =========================================================
    const btnTimer = document.getElementById('btn-mode-timer');
    const btnStopwatch = document.getElementById('btn-mode-stopwatch');
    const selectorContainer = document.getElementById('type-selector-container'); 

    const containerTimer = document.getElementById('timer-settings-container');
    const containerStopwatch = document.getElementById('stopwatch-settings-container');

    const footerCard = sidebar.querySelector('.footer-card');

    // Only add listeners if elements exist and haven't been initialized
    if (btnTimer && btnStopwatch && !btnTimer.dataset.tabInitialized) {

        btnTimer.addEventListener('click', () => {
            btnTimer.classList.add('active'); // UI State
            btnStopwatch.classList.remove('active'); // UI State
            selectorContainer.classList.remove('slide-right'); // Animate the Glider (Move Left)

            // Show Timer Content
            containerTimer.style.display = 'block';
            containerStopwatch.style.display = 'none';

            // SHOW Footer
            if (footerCard) footerCard.style.display = 'block';
        });

        btnStopwatch.addEventListener('click', () => {
            btnStopwatch.classList.add('active'); // UI State
            btnTimer.classList.remove('active'); // UI State
            selectorContainer.classList.add('slide-right'); // Animate the Glider (Move Right)

            // Show Stopwatch Content
            containerTimer.style.display = 'none';
            containerStopwatch.style.display = 'block';

            // HIDE Footer
            if (footerCard) footerCard.style.display = 'none';
        });

        btnTimer.dataset.tabInitialized = "true";
    }

    // =========================================================
    // LOGIC: Stopwatch Internal Toggles (Focus vs Break)
    // =========================================================
    const swFocusBtn = document.querySelector('.sw-focus');
    const swBreakBtn = document.querySelector('.sw-break');

    if (swFocusBtn && swBreakBtn && !swFocusBtn.dataset.swInitialized) {
        swFocusBtn.addEventListener('click', () => {
            swFocusBtn.classList.add('active');
            swBreakBtn.classList.remove('active');
        });

        swBreakBtn.addEventListener('click', () => {
            swBreakBtn.classList.add('active');
            swFocusBtn.classList.remove('active');
        });

        swFocusBtn.dataset.swInitialized = "true";
    }

    // =========================================================
    // LOGIC: Steppers & State (Focus, Break, Iterations)
    // =========================================================
    
    // Select Inputs
    const focusInput = document.getElementById('focus-val');
    const breakInput = document.getElementById('break-val');
    const iterInput = document.getElementById('iter-val');
    
    // Select Long Break Inputs
    const lbDurInput = document.getElementById('lb-dur-val');
    const lbIntInput = document.getElementById('lb-int-val');
    const lbToggle = document.getElementById('long-break-toggle');

    const timerDisplay = document.querySelector('.timer-count');
    const dotsContainer = document.querySelector('.dots');
    const summaryTotal = document.getElementById('summary-total');
    const summaryEnd = document.getElementById('summary-end');

    if (focusInput && !focusInput.dataset.logicInitialized) {

        // --- Helper: Format Time ---
        const formatTime = (totalMinutes) => {
            if (totalMinutes >= 60) {
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                return `${hours}:${mins.toString().padStart(2, '0')}:00`;
            } else {
                return `${totalMinutes.toString().padStart(2, '0')}:00`;
            }
        };

        // --- Helper: Render Dots ---
        const renderDots = (iterations) => {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = ''; 
            const totalDots = iterations * 2;
            for (let i = 0; i < totalDots; i++) {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (i === 0) dot.classList.add('active');
                else dot.classList.add('inactive');
                dotsContainer.appendChild(dot);
            }
        };

        // --- NEW Helper: Update Footer Summary ---
        const updateSummary = () => {
            if (!summaryTotal || !summaryEnd) return;

            // 1. Get current values
            const f = parseInt(focusInput.value) || 5;
            const b = parseInt(breakInput.value) || 5;
            const i = parseInt(iterInput.value) || 1;
            
            const lbEnabled = lbToggle.checked;
            const lbDur = parseInt(lbDurInput.value) || 25;
            const lbInt = parseInt(lbIntInput.value) || 4;

            // 2. Calculate Total Minutes
            let totalMins = 0;
            
            for (let k = 1; k <= i; k++) {
                // Add Focus Time
                totalMins += f;

                // Add Break Time
                // Logic: If LB enabled and iteration is multiple of interval, use LB Duration
                if (lbEnabled && k % lbInt === 0) {
                    totalMins += lbDur;
                } else {
                    totalMins += b;
                }
            }
            
            // 3. Update "Total Time" Text
            if (totalMins >= 60) {
                const hrs = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                summaryTotal.textContent = `${hrs} hr ${mins} min`;
            } else {
                summaryTotal.textContent = `${totalMins} min`;
            }

            // 4. Update "Session Ends" Text
            const now = new Date();
            const endDate = new Date(now.getTime() + totalMins * 60000); // Add minutes
            
            // Format: "1:46 AM"
            summaryEnd.textContent = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        };

        // --- Helper: Safe Update ---
        // Handles math, validation (min/max), and UI updates
        const handleUpdate = (inputEl, change, min, max, callback) => {
            let current = parseInt(inputEl.value) || min; // Default to min if empty
            let newVal = current + change;

            // Validate Min/Max
            if (newVal < min) newVal = min;
            if (max && newVal > max) newVal = max;

            // Update Input
            inputEl.value = newVal;

            // Run side effects (like updating timer or dots)
            if (callback) callback(newVal);

            updateSummary();
        };

        // --- 1. FOCUS DURATION ---
        const syncFocus = (val) => {
             if (timerDisplay) timerDisplay.textContent = formatTime(val);
        };

        // Button Clicks
        document.getElementById('focus-plus').addEventListener('click', () => handleUpdate(focusInput, 5, 1, null, syncFocus));
        document.getElementById('focus-minus').addEventListener('click', () => handleUpdate(focusInput, -5, 1, null, syncFocus));
        // Direct Typing
        focusInput.addEventListener('change', () => handleUpdate(focusInput, 0, 1, null, syncFocus));

        // --- 2. BREAK DURATION ---
        document.getElementById('break-plus').addEventListener('click', () => handleUpdate(breakInput, 5, 1, null));
        document.getElementById('break-minus').addEventListener('click', () => handleUpdate(breakInput, -5, 1, null));
        breakInput.addEventListener('change', () => handleUpdate(breakInput, 0, 1, null));

        // --- 3. ITERATIONS ---
        const syncIter = (val) => renderDots(val);
        
        document.getElementById('iter-plus').addEventListener('click', () => handleUpdate(iterInput, 1, 1, 8, syncIter));
        document.getElementById('iter-minus').addEventListener('click', () => handleUpdate(iterInput, -1, 1, 8, syncIter));
        iterInput.addEventListener('change', () => handleUpdate(iterInput, 0, 1, 8, syncIter));

        // --- 4. LONG BREAK DURATION ---
        if (lbDurInput) {
            document.getElementById('lb-dur-plus').addEventListener('click', () => handleUpdate(lbDurInput, 5, 5, null));
            document.getElementById('lb-dur-minus').addEventListener('click', () => handleUpdate(lbDurInput, -5, 5, null));
            lbDurInput.addEventListener('change', () => handleUpdate(lbDurInput, 0, 5, null));
        }

        // --- LONG BREAK INTERVAL ---
        if (lbIntInput) {
            // 1. Select the text element
            const lbSubtext = document.getElementById('long-break-subtext');

            // 2. Define the sync function
            const syncLbText = (val) => {
                if (lbSubtext) {
                    lbSubtext.textContent = `Extended breaks every ${val} iterations`;
                }
            };

            // 3. Pass syncLbText as the callback (the last argument)
            document.getElementById('lb-int-plus').addEventListener('click', () => handleUpdate(lbIntInput, 1, 2, null, syncLbText));
            document.getElementById('lb-int-minus').addEventListener('click', () => handleUpdate(lbIntInput, -1, 2, null, syncLbText));
            lbIntInput.addEventListener('change', () => handleUpdate(lbIntInput, 0, 2, null, syncLbText));
        }

        // --- 5. LONG BREAK TOGGLE ---
        lbToggle.addEventListener('change', updateSummary);

        // --- Initialize Defaults ---
        renderDots(parseInt(iterInput.value) || 1);
        updateSummary();
        
        focusInput.dataset.logicInitialized = "true";
    }

    // =========================================================
    // LOGIC: Close Button (X)
    // =========================================================
    const closeBtn = sidebar.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            sidebar.classList.remove('configure-sidebar-open');
            document.removeEventListener('click', handleOutsideClick);
        };
    }
}