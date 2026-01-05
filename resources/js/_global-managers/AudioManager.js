import { ALARM_SOUNDS } from "./audio/alarm_sounds.js";
import { GENERAL_BUTTON_SOUNDS } from "./audio/general_button_sounds.js";

export class AudioManager {
    constructor() {
        if (AudioManager.instance) return AudioManager.instance;
        AudioManager.instance = this;

        // Combine resources
        this.library = {
            alarm: ALARM_SOUNDS,
            button: GENERAL_BUTTON_SOUNDS
        };

        // State
        this.activeAudio = null; // Track currently playing sound (for stopping)
        this.isMuted = false;
        this.volume = 1.0;

        this.init();
    }

    init() {
        // Listen for global settings updates (e.g., from Settings Page)
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            
            if (key === 'focusTimerMuted') {
                this.setMute(value === true || value === 'true');
            }
            // Future: Handle 'masterVolume' setting here
        });
    }

    /**
     * Resolves the correct relative path for the audio file based on the current page.
     * This fixes the issue where index.html needs "audio/..." but subpages need "../../audio/..."
     * 
     * @param {string} rawPath - Path from the config files (e.g. "../../audio/bell.mp3")
     * @returns {string} - Context-aware path
     */
    _resolvePath(rawPath) {
        if (!rawPath) return null;

        // Detect if we are deep in the directory structure (e.g., pages/focus/focus-standard.html)
        const isNestedPage = window.location.pathname.includes('/pages/');

        // If the configured path assumes a nested structure (starts with ../)
        if (rawPath.startsWith('../')) {
            if (isNestedPage) {
                return rawPath; // Keep as is
            } else {
                // We are likely at root (index.html), strip the directory traversal
                return rawPath.replace(/\.\.\//g, '');
            }
        } 
        
        // If the configured path assumes root (starts with audio/)
        else {
            if (isNestedPage) {
                // Prepend traversal
                return `../../${rawPath}`;
            } else {
                return rawPath; // Keep as is
            }
        }
    }

    /**
     * Play a sound by category and key.
     * @param {string} category - 'alarm' or 'button'
     * @param {string} key - e.g., 'bell', 'click'
     */
    play(category, key) {
        if (this.isMuted) return;

        const collection = this.library[category];
        
        if (!collection) {
            console.warn(`AudioManager: Category '${category}' not found.`);
            return;
        }

        // Handle "none" selection
        if (key === 'none' || !key) return;

        const rawSrc = collection[key];
        if (!rawSrc) {
            console.warn(`AudioManager: Sound key '${key}' not found in '${category}'.`);
            return;
        }

        const src = this._resolvePath(rawSrc);

        try {
            // Stop overlapping alarms, allow overlapping button sounds
            if (category === 'alarm') {
                this.stopCurrent();
            }

            const audio = new Audio(src);
            audio.volume = this.volume;

            if (category === 'alarm') {
                this.activeAudio = audio;
            }

            const playPromise = audio.play();
            
            // Handle browser autoplay policies
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("AudioManager: Playback failed (autoplay policy?):", error);
                });
            }

        } catch (e) {
            console.error("AudioManager: Error playing sound:", e);
        }
    }

    /**
     * Stop the currently playing active audio (usually alarms).
     */
    stopCurrent() {
        if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio.currentTime = 0;
            this.activeAudio = null;
        }
    }

    setMute(shouldMute) {
        this.isMuted = shouldMute;
        if (this.isMuted) {
            this.stopCurrent();
        }
    }

    setVolume(level) {
        // Clamp between 0 and 1
        this.volume = Math.max(0, Math.min(1, level));
        
        if (this.activeAudio) {
            this.activeAudio.volume = this.volume;
        }
    }
}

export const audioManager = new AudioManager();