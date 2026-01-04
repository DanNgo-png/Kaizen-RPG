import { SettingsAPI } from "../api/SettingsAPI.js";

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
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);
    } else {
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
                options.classList.add('is-expanded');
            } else {
                options.classList.remove('is-expanded');
            }
        };

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

    if (btnTimer && btnStopwatch && !btnTimer.dataset.tabInitialized) {

        btnTimer.addEventListener('click', () => {
            btnTimer.classList.add('active');
            btnStopwatch.classList.remove('active');
            selectorContainer.classList.remove('slide-right');

            containerTimer.style.display = 'block';
            containerStopwatch.style.display = 'none';

            if (footerCard) footerCard.style.display = 'block';

            // Dispatch Event for UI Sync
            document.dispatchEvent(new CustomEvent('kaizen:mode-changed', { detail: 'timer' }));
        });

        btnStopwatch.addEventListener('click', () => {
            btnStopwatch.classList.add('active');
            btnTimer.classList.remove('active');
            selectorContainer.classList.add('slide-right');

            containerTimer.style.display = 'none';
            containerStopwatch.style.display = 'block';

            if (footerCard) footerCard.style.display = 'none';

            // Dispatch Event for UI Sync
            document.dispatchEvent(new CustomEvent('kaizen:mode-changed', { detail: 'stopwatch' }));
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
            // NEW: Dispatch event to change color immediately
            document.dispatchEvent(new CustomEvent('kaizen:stopwatch-mode-changed', { detail: 'focus' }));
        });

        swBreakBtn.addEventListener('click', () => {
            swBreakBtn.classList.add('active');
            swFocusBtn.classList.remove('active');
            // NEW: Dispatch event to change color immediately
            document.dispatchEvent(new CustomEvent('kaizen:stopwatch-mode-changed', { detail: 'break' }));
        });

        swFocusBtn.dataset.swInitialized = "true";
    }

    // =========================================================
    // LOGIC: Steppers & State
    // =========================================================
    const focusInput = document.getElementById('focus-val');
    const breakInput = document.getElementById('break-val');
    const iterInput = document.getElementById('iter-val');
    
    const lbDurInput = document.getElementById('lb-dur-val');
    const lbIntInput = document.getElementById('lb-int-val');
    const lbToggle = document.getElementById('long-break-toggle');

    const timerDisplay = document.querySelector('.timer-count');
    const dotsContainer = document.querySelector('.focus-dots');
    const summaryTotal = document.getElementById('summary-total');
    const summaryEnd = document.getElementById('summary-end');

    if (focusInput && !focusInput.dataset.logicInitialized) {

        const formatTime = (totalMinutes) => {
            const totalSeconds = Math.floor(totalMinutes * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            if (hours > 0) {
                return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            } else {
                return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        };

        const renderDots = (iterations) => {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = ''; 
            const totalDots = iterations * 2;
            for (let i = 0; i < totalDots; i++) {
                const dot = document.createElement('div');
                dot.classList.add('focus-dot');
                if (i === 0) dot.classList.add('active');
                else dot.classList.add('inactive');
                dotsContainer.appendChild(dot);
            }
        };

        const updateSummary = () => {
            if (!summaryTotal || !summaryEnd) return;

            const f = parseFloat(focusInput.value) || 5;
            const b = parseFloat(breakInput.value) || 5;
            const i = parseInt(iterInput.value) || 1;
            
            const lbEnabled = lbToggle.checked;
            const lbDur = parseFloat(lbDurInput.value) || 25;
            const lbInt = parseInt(lbIntInput.value) || 4;

            let totalMins = 0;
            
            for (let k = 1; k <= i; k++) {
                totalMins += f;
                if (lbEnabled && k % lbInt === 0) {
                    totalMins += lbDur;
                } else {
                    totalMins += b;
                }
            }
            
            if (totalMins >= 60) {
                const hrs = Math.floor(totalMins / 60);
                const mins = Math.round(totalMins % 60);
                summaryTotal.textContent = `${hrs} hr ${mins} min`;
            } else {
                summaryTotal.textContent = `${Math.round(totalMins * 10) / 10} min`;
            }

            const now = new Date();
            const endDate = new Date(now.getTime() + totalMins * 60000);
            summaryEnd.textContent = endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        };

        const handleUpdate = (inputEl, change, min, max, callback) => {
            let current = parseFloat(inputEl.value) || min;
            let newVal = current + change;
            newVal = Math.round(newVal * 100) / 100;

            if (newVal < min) newVal = min;
            if (max && newVal > max) newVal = max;

            inputEl.value = newVal;
            if (callback) callback(newVal);
            updateSummary();
        };

        const syncFocus = (val) => {
            if (timerDisplay) timerDisplay.textContent = formatTime(val);
        };

        document.getElementById('focus-plus').addEventListener('click', () => handleUpdate(focusInput, 5, 0.1, null, syncFocus));
        document.getElementById('focus-minus').addEventListener('click', () => handleUpdate(focusInput, -5, 0.1, null, syncFocus));
        focusInput.addEventListener('change', () => handleUpdate(focusInput, 0, 0.1, null, syncFocus));

        document.getElementById('break-plus').addEventListener('click', () => handleUpdate(breakInput, 5, 0.1, null));
        document.getElementById('break-minus').addEventListener('click', () => handleUpdate(breakInput, -5, 0.1, null));
        breakInput.addEventListener('change', () => handleUpdate(breakInput, 0, 0.1, null));

        const syncIter = (val) => {
            renderDots(val);
            SettingsAPI.saveSetting('standardFocusIterations', val);
        };
        
        document.getElementById('iter-plus').addEventListener('click', () => handleUpdate(iterInput, 1, 1, 8, syncIter));
        document.getElementById('iter-minus').addEventListener('click', () => handleUpdate(iterInput, -1, 1, 8, syncIter));
        iterInput.addEventListener('change', () => handleUpdate(iterInput, 0, 1, 8, syncIter));

        if (lbDurInput) {
            document.getElementById('lb-dur-plus').addEventListener('click', () => handleUpdate(lbDurInput, 5, 0.1, null));
            document.getElementById('lb-dur-minus').addEventListener('click', () => handleUpdate(lbDurInput, -5, 0.1, null));
            lbDurInput.addEventListener('change', () => handleUpdate(lbDurInput, 0, 0.1, null));
        }

        if (lbIntInput) {
            const lbSubtext = document.getElementById('long-break-subtext');
            const syncLbText = (val) => {
                if (lbSubtext) lbSubtext.textContent = `Extended breaks every ${val} iterations`;
            };
            document.getElementById('lb-int-plus').addEventListener('click', () => handleUpdate(lbIntInput, 1, 2, null, syncLbText));
            document.getElementById('lb-int-minus').addEventListener('click', () => handleUpdate(lbIntInput, -1, 2, null, syncLbText));
            lbIntInput.addEventListener('change', () => handleUpdate(lbIntInput, 0, 2, null, syncLbText));
        }

        lbToggle.addEventListener('change', updateSummary);

        renderDots(parseInt(iterInput.value) || 1);
        updateSummary();
        
        focusInput.dataset.logicInitialized = "true";
    }

    const closeBtn = sidebar.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            sidebar.classList.remove('configure-sidebar-open');
            document.removeEventListener('click', handleOutsideClick);
        };
    }
}