export function initFocusTimer() {
    // --- Elements ---
    const timerLabel = document.getElementById('timer-label');
    const timerDisplay = document.querySelector('.timer-count');
    const timerCircle = document.getElementById('timer-circle');
    
    const mainBtn = document.getElementById('main-action-btn');
    const mainBtnText = document.getElementById('main-btn-text');
    const mainBtnIcon = mainBtn.querySelector('i');
    
    const stopBtn = document.getElementById('stop-btn');
    const skipBtn = document.getElementById('skip-break-btn');

    // --- Inputs (From Sidebar) ---
    const focusInput = document.getElementById('focus-val');
    const breakInput = document.getElementById('break-val');

    // --- State Variables ---
    let timerInterval = null;
    let timeLeft = 0; 
    let isPaused = false;
    let currentMode = 'focus'; // 'focus' or 'break'

    // --- Helpers ---
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getInputValue = (inputEl, defaultVal) => {
        return inputEl ? (parseInt(inputEl.value) || defaultVal) : defaultVal;
    };

    // --- Logic: Update Dots ---

    // 1. Focus -> Break (Green Dot becomes Gray, Next Dot becomes Blue)
    const updateDotsAfterFocus = () => {
        const dots = document.querySelectorAll('.dot');
        for (let i = 0; i < dots.length; i++) {
            // Find the Active GREEN dot
            if (dots[i].classList.contains('active') && !dots[i].classList.contains('break-active')) {
                dots[i].classList.remove('active');
                dots[i].classList.add('inactive'); // Mark previous as done
                
                // Turn NEXT dot Blue (Break)
                if (i + 1 < dots.length) {
                    dots[i+1].classList.remove('inactive');
                    dots[i+1].classList.add('active', 'break-active'); 
                }
                break;
            }
        }
    };

    // 2. Break -> Focus (Blue Dot becomes Gray, Next Dot becomes Green)
    const updateDotsAfterBreak = () => {
        const dots = document.querySelectorAll('.dot');
        for (let i = 0; i < dots.length; i++) {
            // Find the Active BLUE dot
            if (dots[i].classList.contains('active') && dots[i].classList.contains('break-active')) {
                dots[i].classList.remove('active', 'break-active');
                dots[i].classList.add('inactive'); // Mark break as done
                
                // Turn NEXT dot Green (Focus)
                if (i + 1 < dots.length) {
                    dots[i+1].classList.remove('inactive');
                    dots[i+1].classList.add('active'); 
                }
                break;
            }
        }
    };

    // --- Core Logic ---

    const updateUI = () => {
        timerDisplay.textContent = formatTime(timeLeft);

        if (currentMode === 'focus') {
            timerCircle.classList.remove('break-mode');
            timerLabel.textContent = "Focus";
            mainBtn.classList.remove('break-mode-btn'); 
        } else {
            timerCircle.classList.add('break-mode');
            timerLabel.textContent = "Break";
            mainBtn.classList.add('break-mode-btn');
        }

        if (timerInterval || isPaused) {
            stopBtn.classList.remove('hidden'); 
            
            if (currentMode === 'break') {
                skipBtn.classList.remove('hidden');
            } else {
                skipBtn.classList.add('hidden');
            }

            if (isPaused) {
                mainBtn.style.backgroundColor = ""; 
                mainBtnText.textContent = "Resume";
                mainBtnIcon.className = "fa-solid fa-play";
            } else {
                mainBtnText.textContent = "Pause";
                mainBtnIcon.className = "fa-solid fa-pause";
            }

        } else {
            stopBtn.classList.add('hidden');
            
            if (currentMode === 'focus') {
                skipBtn.classList.add('hidden');
                mainBtnText.textContent = "Start Focus Session";
                mainBtnIcon.className = "fa-solid fa-play";
            } else {
                skipBtn.classList.remove('hidden');
                stopBtn.classList.remove('hidden');
                mainBtnText.textContent = "Start Break";
                mainBtnIcon.className = "fa-solid fa-play";
            }
        }
    };

    const tick = () => {
        if (timeLeft > 0) {
            timeLeft--;
            timerDisplay.textContent = formatTime(timeLeft);
        } else {
            // Timer Finished
            clearInterval(timerInterval);
            timerInterval = null;
            isPaused = false;
            
            // Switch Modes
            if (currentMode === 'focus') {
                // Focus Done -> Break Ready
                currentMode = 'break';
                timeLeft = getInputValue(breakInput, 5) * 60;
                updateDotsAfterFocus(); // Updates dots for Break

            } else {
                // Break Done -> Focus Ready
                currentMode = 'focus';
                timeLeft = getInputValue(focusInput, 25) * 60;
                updateDotsAfterBreak(); // UPDATED: Updates dots for next Focus
            }
            
            updateUI();
        }
    };

    // --- Event Listeners ---

    mainBtn.addEventListener('click', () => {
        if (!timerInterval && !isPaused) {
            if (timeLeft === 0 || (currentMode === 'focus' && timerDisplay.textContent === "05:00")) { 
                 const mins = currentMode === 'focus' ? getInputValue(focusInput, 5) : getInputValue(breakInput, 5);
                 timeLeft = mins * 60;
            }
            timerInterval = setInterval(tick, 1000);
            updateUI();
            return;
        }

        if (timerInterval && !isPaused) {
            clearInterval(timerInterval);
            timerInterval = null;
            isPaused = true;
            updateUI();
            return;
        }

        if (isPaused) {
            isPaused = false;
            timerInterval = setInterval(tick, 1000);
            updateUI();
            return;
        }
    });

    stopBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;
        currentMode = 'focus';
        const mins = getInputValue(focusInput, 5);
        timeLeft = mins * 60;
        
        // Optional: Reset dots logic could go here if you want Stop to reset progress
        updateUI();
    });

    skipBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = false;
        currentMode = 'focus'; // Skip straight to Focus
        
        const mins = getInputValue(focusInput, 5);
        timeLeft = mins * 60;
        
        updateDotsAfterBreak(); // UPDATED: Ensure dots update when skipping
        updateUI();
    });
    
    // Initial Load
    updateUI();
}