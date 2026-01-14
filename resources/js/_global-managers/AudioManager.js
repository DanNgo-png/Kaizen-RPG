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
        this.volume = 0.7;

        // Initialize Web Audio Context for synth sounds (hover)
        // Browsers generally start this in 'suspended' state until a gesture occurs.
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Setup unlock listener for first user interaction
        this._setupAudioUnlock();

        this.init();
    }

    init() {
        document.addEventListener('kaizen:setting-update', (e) => {
            const { key, value } = e.detail;
            if (key === 'focusTimerMuted') this.setMute(value === true || value === 'true');
            if (key === 'focusTimerVolume') {
                const volInt = parseInt(value);
                this.volume = (isNaN(volInt) ? 70 : volInt) / 100;
                if (this.activeAudio) this.activeAudio.volume = this.volume;
            }
        });
    }

    /**
     * Resumes AudioContext on first user interaction (Click/Keydown).
     * Prevents "AudioContext was not allowed to start" errors.
     */
    _setupAudioUnlock() {
        const unlock = () => {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().then(() => {
                    // Remove listeners once successfully resumed
                    document.removeEventListener('click', unlock);
                    document.removeEventListener('keydown', unlock);
                }).catch(e => {
                    // Ignore errors if resume happens too early or context invalid
                });
            }
        };

        // Listen for valid user gestures
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
    }

    play(category, key) {
        if (this.isMuted) return;
        if (!key || key === 'none') return;

        const collection = this.library[category];
        let entry = collection ? collection[key] : null;

        // Fallback for custom files
        if (!entry && category === 'alarm') {
            entry = `../../../audio/alarm/custom/${key}`;
        }

        if (!entry) return;

        // 1. Handle Random Array (e.g., Clicks)
        if (Array.isArray(entry)) {
            const randomIndex = Math.floor(Math.random() * entry.length);
            entry = entry[randomIndex];
        }

        // 2. Handle Synth Object (e.g., Hover)
        if (typeof entry === 'object') {
            this._playSynth(entry);
            return;
        }

        // 3. Handle Standard Audio File
        this._playFile(entry, category);
    }

    _playFile(rawPath, category) {
        const src = this._resolvePath(rawPath);
        try {
            if (category === 'alarm') this.stopCurrent();

            const audio = new Audio(src);
            audio.volume = this.volume;

            if (category === 'alarm') this.activeAudio = audio;

            audio.play().catch(e => {
                // Ignore errors related to lack of user interaction or interruptions
                if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                    console.warn("Audio Playback Error:", e);
                }
            });
        } catch (e) {
            console.error("AudioManager Error:", e);
        }
    }

    _playSynth(config) {
        // Guard: If context doesn't exist, exit
        if (!this.audioCtx) return;

        // Guard: If context is suspended (no user interaction yet), 
        // do NOT try to resume here. It will fail on 'mouseover'.
        // Just return silently. The sound will work after the user clicks once.
        if (this.audioCtx.state === 'suspended') return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = config.type || 'sine';
        
        // Frequency Logic (Slide effect)
        osc.frequency.setValueAtTime(config.freq, this.audioCtx.currentTime);
        if (config.slide) {
            osc.frequency.exponentialRampToValueAtTime(config.freq * 2, this.audioCtx.currentTime + config.duration);
        }

        // Volume Logic
        const effectiveVol = (config.vol || 0.1) * this.volume; 
        gainNode.gain.setValueAtTime(effectiveVol, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + config.duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + config.duration);
    }

    _resolvePath(rawPath) {
        if (!rawPath) return null;
        const isNestedPage = window.location.pathname.includes('/pages/');
        
        if (rawPath.startsWith('../')) {
            // If we are deep in /pages/, keep the ../, otherwise strip it for root
            return isNestedPage ? rawPath : rawPath.replace(/\.\.\//g, '');
        } else {
            return isNestedPage ? `../../${rawPath}` : rawPath;
        }
    }

    stopCurrent() {
        if (this.activeAudio) {
            try {
                this.activeAudio.pause();
                this.activeAudio.currentTime = 0;
            } catch (e) {}
            this.activeAudio = null;
        }
    }

    setMute(shouldMute) {
        this.isMuted = shouldMute;
        if (this.isMuted) this.stopCurrent();
    }
}

export const audioManager = new AudioManager();