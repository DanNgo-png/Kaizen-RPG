// resources/js/focus/flexible/FocusTimer.js

// --- Module State (Persists while app is running) ---
let intervalId = null;
let focusSeconds = 0;
let breakSeconds = 0;
let currentMode = 'focus'; // 'focus' | 'break'
let currentRatio = 3;      // Default 3:1
let sessionStartTime = null;

export function initFlexibleFocusTimer() {
    // 1. DOM Elements: Main Screen
    const focusCard = document.getElementById('card-focus');
    const breakCard = document.getElementById('card-break');
    const timeFocusEl = document.getElementById('time-focus');
    const timeBreakEl = document.getElementById('time-break');
    const balanceTimeEl = document.querySelector('.stat-card:nth-child(3) .stat-time');
    const btnAction = document.getElementById('btn-action');
    const btnTextSpan = btnAction ? btnAction.querySelector('span:not(.key-hint)') : null;

    // 2. DOM Elements: Edit Session Overlay
    const btnEdit = document.getElementById('btn-edit-session');
    const editOverlay = document.getElementById('edit-session-overlay');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const selectRatio = document.getElementById('select-ratio');
    const inputTags = document.getElementById('input-tags');

    // 3. DOM Elements: Conclude Session Overlay (Blue Flag)
    const btnConclude = document.getElementById('btn-conclude-session');
    const concludeOverlay = document.getElementById('conclude-overlay');
    const sliderFocus = document.getElementById('slider-focus');
    const sliderBreak = document.getElementById('slider-break');
    const concludeFocusText = document.getElementById('conclude-focus-time');
    const concludeBreakText = document.getElementById('conclude-break-time');
    const sessionStartText = document.getElementById('session-start-text');
    const btnGetRewards = document.getElementById('btn-get-rewards');

    // 4. DOM Elements: Alarm Clock
    const btnClock = document.querySelector('.btn-icon.btn-transparent'); // The clock icon
    const alarmOverlay = document.getElementById('alarm-overlay');
    const alarmButtons = document.querySelectorAll('.alarm-btn[data-mins]');

    // --- INITIALIZATION ---
    
    // Capture session start time string (e.g., "23:47")
    if (!sessionStartTime) {
        const now = new Date();
        sessionStartTime = now.getHours().toString().padStart(2, '0') + ":" + 
                           now.getMinutes().toString().padStart(2, '0');
    }

    // --- HELPER FUNCTIONS ---

    const formatTime = (totalSeconds) => {
        const absSec = Math.abs(totalSeconds);
        const m = Math.floor(absSec / 60).toString().padStart(2, '0');
        const s = (absSec % 60).toString().padStart(2, '0');
        return (totalSeconds < 0 ? "-" : "") + `${m}:${s}`;
    };

    // Updates the visual "fill" of the range sliders to match the image
    const updateSliderGradient = (el, color) => {
        const val = (el.value - el.min) / (el.max - el.min) * 100;
        el.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${val}%, #222 ${val}%)`;
    };

    const updateUI = () => {
        if(timeFocusEl) timeFocusEl.textContent = formatTime(focusSeconds);
        if(timeBreakEl) timeBreakEl.textContent = formatTime(breakSeconds);
        
        if(balanceTimeEl) {
            const balance = Math.floor(focusSeconds / currentRatio) - breakSeconds;
            balanceTimeEl.textContent = formatTime(balance);
        }

        if (currentMode === 'focus') {
            focusCard?.classList.add('active-focus');
            breakCard?.classList.remove('active-break');
            btnAction?.classList.remove('btn-green');
            btnAction?.classList.add('btn-brown');
            if(btnTextSpan) btnTextSpan.textContent = "TAKE A BREAK";
        } else {
            focusCard?.classList.remove('active-focus');
            breakCard?.classList.add('active-break');
            btnAction?.classList.remove('btn-brown');
            btnAction?.classList.add('btn-green');
            if(btnTextSpan) btnTextSpan.textContent = "BACK TO FOCUS";
        }
    };

    const toggleMode = () => {
        currentMode = (currentMode === 'focus') ? 'break' : 'focus';
        updateUI();
    };

    // --- OVERLAY LOGIC: EDIT ---
    const openEditOverlay = (e) => {
        if (e) e.preventDefault();
        if (selectRatio) selectRatio.value = currentRatio.toString();
        editOverlay?.classList.remove('hidden');
    };

    const saveEditChanges = () => {
        if (selectRatio) currentRatio = parseInt(selectRatio.value);
        editOverlay?.classList.add('hidden');
        updateUI(); 
    };

    // --- OVERLAY LOGIC: CONCLUDE (FLAG) ---
    const openConcludeOverlay = () => {
        if (!concludeOverlay) return;
        
        // Sync sliders to actual timer data
        const fMins = Math.floor(focusSeconds / 60);
        const bMins = Math.floor(breakSeconds / 60);
        
        if (sliderFocus) {
            sliderFocus.value = fMins;
            updateSliderGradient(sliderFocus, '#2c6e49');
        }
        if (sliderBreak) {
            sliderBreak.value = bMins;
            updateSliderGradient(sliderBreak, '#a66e4e');
        }
        
        if (concludeFocusText) concludeFocusText.textContent = formatTime(focusSeconds);
        if (concludeBreakText) concludeBreakText.textContent = formatTime(breakSeconds);
        if (sessionStartText) sessionStartText.textContent = `This session began at ${sessionStartTime}.`;

        concludeOverlay.classList.remove('hidden');
    };

    // --- EVENT LISTENERS ---

    if (btnAction) btnAction.onclick = toggleMode;
    
    // Edit listeners
    if (btnEdit) btnEdit.onclick = openEditOverlay;
    if (btnSaveEdit) btnSaveEdit.onclick = saveEditChanges;

    // Conclude listeners
    if (btnConclude) btnConclude.onclick = openConcludeOverlay;

    if (sliderFocus) {
        sliderFocus.oninput = (e) => {
            const mins = parseInt(e.target.value);
            concludeFocusText.textContent = formatTime(mins * 60);
            updateSliderGradient(e.target, '#2c6e49');
        };
    }

    if (sliderBreak) {
        sliderBreak.oninput = (e) => {
            const mins = parseInt(e.target.value);
            concludeBreakText.textContent = formatTime(mins * 60);
            updateSliderGradient(e.target, '#a66e4e');
        };
    }

    if (btnGetRewards) {
        btnGetRewards.onclick = () => {
            const finalFocus = sliderFocus.value;
            const finalBreak = sliderBreak.value;
            console.log(`Session Concluded. Focus: ${finalFocus}m, Break: ${finalBreak}m`);
            alert("Rewards Generated! XP and Gold added to your party.");
            concludeOverlay?.classList.add('hidden');
            // Here you would typically reset the timers or navigate away
        };
    }

    // Close overlays on backdrop click
    window.onclick = (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.add('hidden');
        }
    };

    // Keyboard Shortcut 'B'
    const handleKeydown = (e) => {
        if (e.key.toLowerCase() === 'b' && document.getElementById('btn-action')) {
            toggleMode();
        }
    };
    document.removeEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);

    // --- TIMER TICK ---
    if (!intervalId) {
        intervalId = setInterval(() => {
            if (currentMode === 'focus') focusSeconds++;
            else breakSeconds++;
            updateUI();
        }, 1000);
    }
    
    // Open Alarm Overlay
    if (btnClock) {
        btnClock.onclick = () => {
            alarmOverlay?.classList.remove('hidden');
        };
    }

    // Handle Time Selection
    alarmButtons.forEach(btn => {
        btn.onclick = () => {
            const mins = btn.getAttribute('data-mins');
            console.log(`Alarm set for ${mins} minutes`);
            // Add your logic here to trigger a notification after X minutes
            alarmOverlay?.classList.add('hidden');
        };
    });

    // Handle "Test Sound"
    const testSoundBtn = document.querySelector('.test-sound-btn');
    if (testSoundBtn) {
        testSoundBtn.onclick = () => {
            const audio = new Audio('audio/bell-sound.mp3');
            audio.play();
        };
    }

    updateUI();
}