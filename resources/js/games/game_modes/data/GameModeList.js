export const GAME_MODES = [
    {
        id: 'sellswords',
        title: 'The Sellswords',
        subtitle: 'The standard experience.',
        icon: 'fa-solid fa-users-viewfinder',
        color: '#10b981', // Green
        badge: 'Recommended',
        lore: `"A classic beginning. You lead a small band of mercenaries looking to make a name for themselves. Balance work, health, and gold to build a legendary company."`,
        features: [
            { icon: 'fa-solid fa-check', text: 'Standard XP & Loot rates', color: '#10b981' },
            { icon: 'fa-solid fa-user-shield', text: 'Balanced party management', color: '#60a5fa' },
            { icon: 'fa-solid fa-heart-pulse', text: 'Injuries heal over time', color: '#fbbf24' }
        ]
    },
    {
        id: 'empire',
        title: 'Empire Builder',
        subtitle: '4X Strategy Mode.',
        icon: 'fa-solid fa-map-location-dot',
        color: '#f59e0b', // Orange
        badge: 'Strategy',
        lore: `"The world is covered in the Fog of Procrastination. Convert your Focus Points into Influence to annex territory, capture Resource Nodes, and build your productivity kingdom."`,
        features: [
            { icon: 'fa-solid fa-chess-board', text: 'Grid-based Map Conquest', color: '#f59e0b' },
            { icon: 'fa-solid fa-industry', text: 'Passive Resource Generation', color: '#a78bfa' },
            { icon: 'fa-solid fa-dungeon', text: 'Defend against Regression Raids', color: '#ef4444' }
        ]
    },
    {
        id: 'lonewolf',
        title: 'Lone Wolf',
        subtitle: 'Hardcore solo challenge.',
        icon: 'fa-solid fa-user-ninja',
        color: '#a78bfa', // Purple
        badge: 'Hardcore',
        lore: `"You trust no one but yourself. You start with a single, powerful avatar. All XP is yours, but if you falter, there is no one to carry you. <b>Permadeath is enabled.</b>"`,
        features: [
            { icon: 'fa-solid fa-bolt', text: '+50% XP Multiplier', color: '#a78bfa' },
            { icon: 'fa-solid fa-skull', text: 'Permadeath: Fail 3 sessions in a row', color: '#ef4444' },
            { icon: 'fa-solid fa-gem', text: 'Starts with Legendary Gear', color: '#fcd34d' }
        ]
    },
    {
        id: 'ironman',
        title: 'Ironman Patrol',
        subtitle: 'Roguelite productivity.',
        icon: 'fa-solid fa-hourglass-start',
        color: '#3b82f6', // Blue
        badge: 'Quick Play',
        lore: `"Every focus session is a random encounter. Survive the day to keep your streak. One slip up resets your multiplier. How long can you last on the frontier?"`,
        features: [
            { icon: 'fa-solid fa-dice', text: 'Random Daily Buffs/Debuffs', color: '#60a5fa' },
            { icon: 'fa-solid fa-fire-flame-curved', text: 'Streak-based Progression', color: '#fb923c' },
            { icon: 'fa-solid fa-stopwatch', text: 'Fixed 25m Sessions Only', color: '#9ca3af' }
        ]
    },
    {
        id: 'dungeon',
        title: 'Dungeon Crawler',
        subtitle: 'Roguelike Delve.',
        icon: 'fa-solid fa-dungeon',
        color: '#ef4444', // Red-ish
        badge: 'New',
        lore: `"The depths await. Descend into the infinite dungeon, battle monsters, and extract with loot. Choose your complexity level."`,
        features: [
            { icon: 'fa-solid fa-skull', text: 'Permadeath Mechanics', color: '#ef4444' },
            { icon: 'fa-solid fa-coins', text: 'Loot & Extraction', color: '#facc15' },
            { icon: 'fa-solid fa-layer-group', text: 'Floor Progression', color: '#9ca3af' }
        ],
        hasVersions: true
    }
];