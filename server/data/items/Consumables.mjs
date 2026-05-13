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
        availableIn: ['Stronghold'] // Or perhaps only found in Ruins as loot!
    }
];