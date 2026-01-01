/**
 * AudioManager.js
 * Implements the Singleton pattern to handle global audio effects.
 * 
 * Responsibilities:
 * 1. Preload and cache audio assets.
 * 2. Play sounds with support for overlapping playback (rapid clicks).
 * 3. centrally listen for UI interactions to trigger sounds.
 */

export class AudioManager {
    constructor() {
        // Ensure only one instance exists
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        AudioManager.instance = this;

        // Configuration
        this.basePath = 'audio/';
        this.defaultVolume = 0.5;

        // Sound Registry
        this.sounds = {
            // Maps a logical key to the filename
            'defaultButton': 'default-button-sound.mp3',
        };

        // Cache for Audio objects
        this.cache = new Map();

        this._init();
    }

    /**
     * Initialize the manager: Preload sounds and attach listeners.
     */
    _init() {
        this._preloadSounds();
        this._attachGlobalListeners();
    }

    /**
     * Preloads all defined sounds into memory.
     */
    _preloadSounds() {
        Object.entries(this.sounds).forEach(([key, filename]) => {
            const audio = new Audio(`${this.basePath}${filename}`);
            audio.preload = 'auto';
            this.cache.set(key, audio);
        });
    }

    /**
     * Plays a sound by key.
     * Uses cloneNode() to allow the same sound to overlap (e.g., rapid button clicks).
     * @param {string} key - The key of the sound to play.
     */
    play(key) {
        const audioTemplate = this.cache.get(key);

        if (audioTemplate) {
            // Clone the node to allow independent playback instances
            // This prevents a rapid second click from cutting off the first click's tail
            const soundInstance = audioTemplate.cloneNode();
            soundInstance.volume = this.defaultVolume;
            
            // Play and catch any autoplay policy errors
            soundInstance.play().catch(error => {
                console.warn(`AudioManager: Failed to play '${key}'`, error);
            });
        } else {
            console.warn(`AudioManager: Sound key '${key}' not found in registry.`);
        }
    }

    /**
     * Sets up global event delegation.
     * Detects clicks within specific zones (like Focus Flexible) to trigger audio.
     */
    _attachGlobalListeners() {
        document.addEventListener('click', (event) => {
            this._handleFocusFlexibleClicks(event);
        });
    }

    /**
     * Logic specifically for the Focus Flexible section.
     * @param {Event} event 
     */
    _handleFocusFlexibleClicks(event) {
        // 1. Check if the click happened inside the Flexible Container
        const container = event.target.closest('.flexible-container');
        if (!container) return;

        // 2. Check if the target is an interactive element (Button, Toggle, Option)
        // We look for <button> tags or specific interactive classes if <div>s are used
        const target = event.target;
        const isInteractive = target.closest('button') || 
                              target.closest('input[type="range"]') ||
                              target.closest('.switch'); // Toggle switches

        // 3. Play Sound
        if (isInteractive) {
            this.play('defaultButton');
        }
    }
}

// Export a ready-to-use singleton instance
export const audioManager = new AudioManager();