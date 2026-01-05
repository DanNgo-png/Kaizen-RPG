/* resources/js/_global-managers/AudioManager.js */

import { ALARM_SOUNDS } from "./audio/alarm_sounds.js";
import { GENERAL_BUTTON_SOUNDS } from "./audio/general_button_sounds.js";

export class AudioManager {
    constructor() {
        if (AudioManager.instance) return AudioManager.instance;
        AudioManager.instance = this;

        this.library = {
            alarm: ALARM_SOUNDS,
            button: GENERAL_BUTTON_SOUNDS
        };

        this.activeAudio = null;
        this.isMuted = false;
        this.volume = 0.7; // Default

        this.init();
    }

    init() {
        // Listen for setting updates (Volume & Mute)
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            
            if (key === 'focusTimerMuted') {
                this.setMute(value === true || value === 'true');
            }

            if (key === 'focusTimerVolume') {
                const volInt = parseInt(value);
                // Convert 0-100 to 0.0-1.0
                this.volume = (isNaN(volInt) ? 70 : volInt) / 100;
                
                // Real-time update
                if (this.activeAudio) {
                    this.activeAudio.volume = this.volume;
                }
            }
        });
    }

    _resolvePath(rawPath) {
        if (!rawPath) return null;
        const isNestedPage = window.location.pathname.includes('/pages/');

        if (rawPath.startsWith('../')) {
            return isNestedPage ? rawPath : rawPath.replace(/\.\.\//g, '');
        } else {
            return isNestedPage ? `../../${rawPath}` : rawPath;
        }
    }

    play(category, key) {
        if (this.isMuted) return;
        if (key === 'none' || !key) return;

        const collection = this.library[category];
        let rawSrc = collection ? collection[key] : null;

        if (!rawSrc && category === 'alarm') {
            rawSrc = `../../audio/alarm/custom/${key}`; 
        }

        if (!rawSrc) {
            console.warn(`AudioManager: Sound '${key}' could not be resolved.`);
            return;
        }

        const src = this._resolvePath(rawSrc);

        try {
            // Stop previous alarm if starting a new one
            if (category === 'alarm') {
                this.stopCurrent();
            }

            const audio = new Audio(src);
            audio.volume = this.volume;

            if (category === 'alarm') {
                this.activeAudio = audio;
            }

            // Play and handle interruptions
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Ignore AbortError (happens when stopCurrent() is called quickly after play())
                    if (error.name !== 'AbortError') {
                        console.warn("Playback failed:", error);
                    }
                });
            }

        } catch (e) {
            console.error("AudioManager Error:", e);
        }
    }

    stopCurrent() {
        if (this.activeAudio) {
            try {
                this.activeAudio.pause();
                this.activeAudio.currentTime = 0;
            } catch (e) {
                // Ignore errors during pausing (e.g. if audio wasn't fully loaded)
            }
            this.activeAudio = null;
        }
    }

    setMute(shouldMute) {
        this.isMuted = shouldMute;
        if (this.isMuted) this.stopCurrent();
    }
}

export const audioManager = new AudioManager();