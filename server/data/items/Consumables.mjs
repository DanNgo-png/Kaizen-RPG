export const CONSUMABLES = [
    { 
        id: 'healing_salve', 
        name: 'Healing Salve', 
        type: 'Consumable', 
        icon: 'fa-solid fa-flask', 
        baseValue: 450, 
        rarity: 'common',
        stats: { heal_amount: 30 },
        availableIn: ['All'] 
    },
    {
        id: 'med_supplies_bundle',
        name: 'Medical Supplies',
        type: 'Resource',
        resourceType: 'medicine',
        amount: 25,
        icon: 'fa-solid fa-band-aid',
        baseValue: 150,
        rarity: 'common',
        availableIn: ['All']
    },
    {
        id: 'tools_and_supplies',
        name: 'Tools and Supplies',
        type: 'Resource',
        resourceType: 'tools',
        amount: 20,
        icon: 'fa-solid fa-hammer',
        baseValue: 200,
        rarity: 'common',
        availableIn: ['All']
    },
    {
        id: 'ammunition',
        name: 'Ammunition',
        type: 'Resource',
        resourceType: 'ammo',
        amount: 50,
        icon: 'fa-solid fa-bullseye',
        baseValue: 100,
        rarity: 'common',
        availableIn: ['All']
    },
    { 
        id: 'stamina_potion', 
        name: 'Vigor Draught', 
        type: 'Consumable', 
        icon: 'fa-solid fa-vial', 
        baseValue: 120, 
        rarity: 'uncommon',
        stats: { restore_fatigue: 50 },
        availableIn: ['Town', 'Stronghold'] 
    },
    { 
        id: 'focus_elixir', 
        name: 'Elixir of Deep Work', 
        type: 'Consumable', 
        icon: 'fa-solid fa-wine-bottle', 
        baseValue: 500, 
        rarity: 'rare',
        stats: { xp_multiplier: 1.5, duration_sessions: 3 },
        availableIn: ['Stronghold'] 
    },

    // --- WEBKNECHT SPECIFIC ALCHEMICALS ---
    { 
        id: 'webknecht_venom_gland', 
        name: 'Webknecht Venom Gland', 
        type: 'Consumable', 
        description: 'An intact toxic venom sac. Ingesting this triggers a highly accelerated focus rush, boosting gain at the price of brief fatigue.',
        icon: 'fa-solid fa-skull-crossbones', 
        baseValue: 150, 
        rarity: 'uncommon',
        stats: { restore_fatigue: -15, xp_multiplier: 1.2, duration_sessions: 1 },
        availableIn: [] 
    },
    { 
        id: 'arachnid_antidote', 
        name: 'Arachnid Antidote', 
        type: 'Consumable', 
        description: 'Brewed out of diluted venom and active enzymes. Quickly purges poisons and seals lacerations.',
        icon: 'fa-solid fa-prescription-bottle-medical', 
        baseValue: 200, 
        rarity: 'uncommon',
        stats: { heal_amount: 15 },
        availableIn: ['All'] 
    }
];