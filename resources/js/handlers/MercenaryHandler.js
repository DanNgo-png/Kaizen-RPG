import { GameAPI } from "../api/GameAPI.js";

export const MercenaryHandler = {
    /**
    * Handle the 'receiveMercenaries' event.
    * @param {CustomEvent} event
    */
    onReceiveData: (event) => {
        const data = event.detail; // Neutralino events wrap data in .detail
        console.log("📦 Mercenaries loaded:", data);
        // Example: Update DOM
        // const list = document.getElementById('merc-list');
        // list.innerHTML = data.map(m => `<li>${m.name}</li>`).join('');
    },

    /**
     * Handle the 'mercenaryAdded' event.
     * @param {CustomEvent} event 
     */
    onCreated: (event) => {
        const info = event.detail;
        console.log("✅ Created successfully:", info);

        // Automatically refresh the list
        GameAPI.getMercenaries();
    }
};