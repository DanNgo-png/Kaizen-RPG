export const GENERAL_BUTTON_SOUNDS = {
    // Synthetic Sounds (Web Audio API)
    hover: { 
        type: 'sine',
        freq: 400,
        duration: 0.05,
        vol: 0.05
    },
    sidebar_toggle: { 
        type: 'sine',
        freq: 300,
        duration: 0.15,
        vol: 0.1,
        slide: true 
    },

    // Random Pool for Standard Clicks
    click: [
        '../../../audio/button/tap_01.wav',
        '../../../audio/button/tap_02.wav',
        '../../../audio/button/tap_03.wav',
        '../../../audio/button/tap_04.wav',
        '../../../audio/button/tap_05.wav'
    ],

    // Specific Variations (Direct Access)
    tap_01: '../../../audio/button/tap_01.wav',
    tap_02: '../../../audio/button/tap_02.wav',
    tap_03: '../../../audio/button/tap_03.wav',
    tap_04: '../../../audio/button/tap_04.wav',
    tap_05: '../../../audio/button/tap_05.wav',
    special: '../../../audio/button/special-btn.mp3'
};