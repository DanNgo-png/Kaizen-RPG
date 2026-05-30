import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';
import { ItemFactory } from '../../../factories/ItemFactory.mjs';
import {
    SETTLEMENT_EVENTS,
    SETTLEMENT_NAMES,
    SETTLEMENT_TIERS,
    SETTLEMENT_UPGRADE_PATH,
    formatSpecializations,
    normalizeSpecializations,
    serializeSpecializations
} from '../../../data/GameDataConstants.mjs';
import { BARBARIAN_NODE_TYPES } from '../../../data/factions/BarbarianFactions.mjs';
import { WorldSimulator } from '../../../services/simulation/WorldSimulator.mjs';
import { SettlementSpecializationPlanner } from '../../../services/simulation/SettlementSpecializationPlanner.mjs';

const NEGATIVE_ECONOMIC_EVENTS = ['ambushed_trade_routes', 'raided', 'sieged', 'ruined_location', 'terrified_villagers'];
const NEGATIVE_EVENT_DECAY_REDUCTION = 3;   // Reduce negative event duration by 3 days per economic contract completed
const NEGATIVE_EVENT_REMEDY_BONUS_REP = 8;   // Extra reputation for helping alleviate an economic crisis
const NEGATIVE_EVENT_REMEDY_BONUS_INF = 5;   // Extra influence for helping alleviate an economic crisis

const WORLD_NODE_SELECT = `
    SELECT 
        world_nodes.*,
        factions.name AS faction_name,
        factions.color AS faction_color,
        factions.archetype AS faction_archetype,
        factions.motto AS faction_motto
    FROM world_nodes
    LEFT JOIN factions ON factions.id = world_nodes.faction_id
`;

const CONTRACT_SELECT = `
    SELECT
        contracts.*,
        target_nodes.name AS target_node_name,
        target_nodes.type AS target_node_type
    FROM contracts
    LEFT JOIN world_nodes AS target_nodes ON target_nodes.id = contracts.target_node_id
`;

const CONTRACT_TYPE = Object.freeze({
    STANDARD: 'standard',
    CARAVAN: 'caravan',
    BRIGAND_CAMP: 'brigand_camp',
    HOSTILE_CAMP: 'hostile_camp',
    DIRECT_CLEARING: 'direct_clearing'
});

const CONTRACT_REPUTATION = Object.freeze({
    MIN_REWARD: 2,
    MINUTES_PER_POINT: 10,
    AMBUSHED_TRADE_ROUTE_CARAVAN_BONUS: 5
});

const RENOWN_REWARD = Object.freeze({
    MIN_REWARD: 1,
    MINUTES_PER_POINT: 30,
    HOSTILE_CAMP_BONUS: 2,
    DIRECT_CLEARING_BONUS: 1
});

const INFLUENCE_REWARD = Object.freeze({
    MIN_REWARD: 1,
    MINUTES_PER_POINT: 20,
    CARAVAN_BONUS: 1,
    HOSTILE_CAMP_BONUS: 2,
    DIRECT_CLEARING_BONUS: 1
});

const CONTRACT_INFLUENCE_TERMS = Object.freeze([
    Object.freeze({
        id: 'better_pay',
        label: 'Better Pay',
        icon: 'fa-coins',
        cost: 4,
        goldMultiplier: 1.25,
        description: 'Increase the crown reward before accepting the job.'
    }),
    Object.freeze({
        id: 'salvage_rights',
        label: 'Salvage Rights',
        icon: 'fa-box-open',
        cost: 6,
        extraArmorPieces: 2,
        description: 'Keep salvaged enemy armor and war gear.'
    }),
    Object.freeze({
        id: 'footmen',
        label: 'Noble Footmen',
        icon: 'fa-people-group',
        cost: 8,
        damageChanceMultiplier: 0.55,
        description: 'Bring local footmen to screen the next battle.'
    }),
    Object.freeze({
        id: 'local_pardon',
        label: 'Local Pardon',
        icon: 'fa-scale-balanced',
        cost: 5,
        reputationGain: 10,
        description: 'Have a local incident forgiven and restore standing.'
    })
]);

const CONTRACT_INFLUENCE_TERM_BY_ID = new Map(
    CONTRACT_INFLUENCE_TERMS.map((term) => [term.id, term])
);

const COMBAT_NEGOTIATION_TERM_IDS = Object.freeze(['salvage_rights', 'footmen']);

const CONTRACT_GENERATION = Object.freeze({
    BOARD_SIZE: 3,
    DEFAULT_MIN_MINUTES: 10,
    DEFAULT_MAX_MINUTES: 120,
    MINUTE_STEP: 5,
    HOSTILE_CAMP_MIN_MINUTES: 45,
    GOLD_PER_MINUTE: 3,
    GOLD_VARIANCE_MIN: 0.8,
    GOLD_VARIANCE_RANGE: 0.4,
    HOSTILE_CAMP_GOLD_MULTIPLIER: 5
});

const CONTRACT_LOOT = Object.freeze({
    DEFAULT_CHANCE: 0.20,
    COMBAT_CHANCE: 0.65,
    HOSTILE_CAMP_CHANCE: 0.85,
    MIN_ROLLS: 1,
    MINUTES_PER_ROLL: 25,
    HOSTILE_CAMP_EXTRA_ROLLS: 2
});

const CONTRACT_EVENT_DURATION = Object.freeze({
    WELL_SUPPLIED_DAYS: 5
});

const DIRECT_CLEARING = Object.freeze({
    GOLD_REWARD: 0
});

const CONTRACT_SESSION_RISK = Object.freeze({
    BASE_DAMAGE_CHANCE: 0.20,
    DAMAGE_ROLL_RANGE: 8,
    MIN_DAMAGE: 2,
    DEFENSE_MITIGATION_DIVISOR: 4,
    FATIGUE_MINUTES_PER_POINT: 5,
    FATIGUE_GEAR_DIVISOR: 2,
    TRAVELERS_ENCOUNTER_CHANCE: 0.30,
    ATTACK_LOOT_SCORE_DIVISOR: 100,
    ATTACK_LOOT_BONUS_RATE: 0.10,
    BASE_LOOT_CHANCE: 0.30,
    MIN_LOOT_ROLLS: 1,
    MINUTES_PER_LOOT_ROLL: 15
});

const IDLE_SESSION_CONFIG = Object.freeze({
    XP_PER_MINUTE: 3,                 // Lower XP gain compared to active questing/delving
    FATIGUE_RECOVERY_PER_MINUTE: 1.0, // Fatigue recovered per minute of rest
    MIN_MINUTES_FOR_LOG: 5            // Minimum focus duration to trigger log entries
});

const SETTLEMENT_EVENT_ID = Object.freeze({
    AMBUSHED_TRADE_ROUTES: 'ambushed_trade_routes',
    WELL_SUPPLIED: 'well_supplied'
});

const NON_GROWING_SETTLEMENT_TYPES = Object.freeze([
    'Ruins', 
    'Bandit Camp',
    'Bandit Outpost',
    'Bandit Stronghold',
    'Stolen Stronghold',
    ...Object.values(BARBARIAN_NODE_TYPES),
    'Goblin Camp',
    'Goblin Outpost',
    'Greenskin Stronghold',
    'Desecrated Crypt',
    'Ancient Tomb',
    'Haunted Cave',
    'Sunken Dungeon',
    'Necropolis' 
]);

const HOSTILE_CONTRACT_TARGET_TYPES = Object.freeze([
    'Bandit Camp',
    'Bandit Outpost',
    'Bandit Stronghold',
    'Stolen Stronghold',
    ...Object.values(BARBARIAN_NODE_TYPES),
    'Goblin Camp',
    'Goblin Outpost',
    'Greenskin Stronghold',
    'Desecrated Crypt',
    'Ancient Tomb',
    'Haunted Cave',
    'Sunken Dungeon',
    'Necropolis'
]);

const GROWTH_PROGRESS_COMPATIBLE_EVENTS = Object.freeze([
    SETTLEMENT_EVENT_ID.WELL_SUPPLIED
]);

const CARAVAN_CONTRACT_KEYWORDS = Object.freeze(['caravan', 'escort', 'delivery']);
const HOSTILE_CAMP_CONTRACT_KEYWORDS = Object.freeze(['brigand camp', 'bandit camp', 'barbarian camp', 'barbarian outpost', 'barbarian warcamp', 'destroy']);
const COMBAT_CONTRACT_KEYWORDS = Object.freeze(['hunt', 'clear', 'explore']);
const HOSTILE_REPUTATION_THRESHOLD = -50;
const MIN_GOLD_BALANCE = 0;
const NO_GOLD_DELTA = 0;

const PARTY_STRENGTH = Object.freeze({
    DEFAULT_ATTRIBUTE: 10,
    DEFAULT_LEVEL: 1,
    DEFAULT_MAX_HP: 100,
    MIN_MAX_HP: 1,
    LEVEL_WEIGHT: 10,
    FATIGUE_MAX: 100,
    FATIGUE_PENALTY_MAX_RATIO: 0.30,
    HEALTH_PENALTY_MAX_RATIO: 0.35,
    MIN_READINESS_RATIO: 0.20,
    PROGRESS_SCORE_CAP: 600,
    PROGRESS_PERCENT_MAX: 100,
    RATINGS: [
        { minScore: 450, label: 'Elite' },
        { minScore: 300, label: 'Veteran' },
        { minScore: 180, label: 'Seasoned' },
        { minScore: 80, label: 'Ready' },
        { minScore: 1, label: 'Green' },
        { minScore: 0, label: 'Unmanned' }
    ]
});

const STANDARD_CONTRACT_TEMPLATES = Object.freeze([
    {
        title: "Clear the Rat Cellar",
        description: "A simple task, but honest pay."
    },
    {
        title: "Hunt the Goblin Raiders",
        description: "They have been harassing the local trade routes."
    },
    {
        title: "Explore the Ruined Tower",
        description: "Ancient secrets and hidden dangers await."
    }
]);

const CARAVAN_CONTRACT_TITLES = Object.freeze([
    "Escort Merchant Caravan",
    "Guard the Supply Wagons",
    "Delivery Escort"
]);

function contractTitleHasKeyword(title, keywords) {
    const titleLower = String(title ?? '').toLowerCase();
    return keywords.some((keyword) => titleLower.includes(keyword));
}

function canTrackSettlementGrowth(node, tierData) {
    if (!node || !tierData?.growthReqs) return false;
    if (NON_GROWING_SETTLEMENT_TYPES.includes(node.type)) return false;

    return !node.current_event || GROWTH_PROGRESS_COMPATIBLE_EVENTS.includes(node.current_event);
}

export class GameRepository {
    constructor() {
        this.db = null;
        this.statements = {};
    }

    initialize(slotId) {
        this.db = loadGameDatabase(slotId);
        this._prepareStatements();
    }

    ensureConnection() {
        const activeDB = getActiveGameDB();
        if (this.db !== activeDB) {
            this.db = activeDB;
            this._prepareStatements();
        }
    }

    _prepareStatements() {
        if (!this.db) return;

        this.statements = {
            getAll: this.db.prepare('SELECT * FROM mercenaries WHERE is_active = 1'),
            getById: this.db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
            insert: this.db.prepare(`
                INSERT INTO mercenaries (name, role, level, xp, str, int, spd, daily_wage, is_active, max_hp, current_hp) 
                VALUES (@name, @role, @level, 0, @str, @int, @spd, @wage, 1, @max_hp, @current_hp)
            `),
            addXp: this.db.prepare(`UPDATE mercenaries SET xp = xp + @amount, fatigue = fatigue + @fatigue WHERE is_active = 1`),
            
            updateMercXpFatigue: this.db.prepare(`UPDATE mercenaries SET xp = xp + @amount, fatigue = MAX(0, fatigue + @fatigue) WHERE id = @id`),

            reduceFatigue: this.db.prepare(`UPDATE mercenaries SET fatigue = MAX(0, fatigue - @amount) WHERE is_active = 1`),

            damageMercenary: this.db.prepare(`UPDATE mercenaries SET current_hp = MAX(0, current_hp - @damage) WHERE id = @id`),
            getWages: this.db.prepare(`SELECT SUM(daily_wage) as total FROM mercenaries`),
            insertLedger: this.db.prepare(`INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)`),

            insertNode: this.db.prepare(`
                INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier, specialization, attachments, influence) 
                VALUES (@type, @name, @x, @y, @faction_id, @reputation, @buy_modifier, @sell_modifier, @specialization, @attachments, @influence)
            `),
            getAllNodes: this.db.prepare(WORLD_NODE_SELECT),

            getNodeById: this.db.prepare(`${WORLD_NODE_SELECT} WHERE world_nodes.id = ?`),
            updateNodeShop: this.db.prepare(`UPDATE world_nodes SET shop_inventory = @inv, last_restock_day = @lastRestock, next_trade_restock_day = @nextTrade WHERE id = @id`),

            updateReputation: this.db.prepare(`UPDATE world_nodes SET reputation = COALESCE(reputation, 0) + ? WHERE id = ?`),
            updateNodeInfluence: this.db.prepare(`UPDATE world_nodes SET influence = MAX(0, COALESCE(influence, 0) + @amount) WHERE id = @id`),

            togglePin: this.db.prepare(`UPDATE world_nodes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?`),
            getNodeHistory: this.db.prepare(`SELECT * FROM node_history WHERE node_id = ? ORDER BY day DESC, id DESC`),
            insertNodeHistory: this.db.prepare(`INSERT INTO node_history (node_id, day, event_text, event_type) VALUES (@node_id, @day, @text, @type)`),
            getAllHistory: this.db.prepare(`
                SELECT 
                    node_history.*, 
                    world_nodes.name AS node_name,
                    world_nodes.type AS node_type
                FROM node_history 
                LEFT JOIN world_nodes ON node_history.node_id = world_nodes.id 
                ORDER BY node_history.day DESC, node_history.id DESC
            `),

            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`),
            updateSetting: this.db.prepare(`UPDATE campaign_settings SET value = @value WHERE key = @key`),

            getActiveContract: this.db.prepare(`${CONTRACT_SELECT} WHERE contracts.is_active = 1 LIMIT 1`),
            getContractById: this.db.prepare(`${CONTRACT_SELECT} WHERE contracts.id = ?`),
            getNodeContracts: this.db.prepare(`${CONTRACT_SELECT} WHERE contracts.node_id = ? AND contracts.is_completed = 0 AND contracts.contract_type != '${CONTRACT_TYPE.DIRECT_CLEARING}'`),
            insertContract: this.db.prepare(`
                INSERT INTO contracts (node_id, target_node_id, contract_type, title, description, required_minutes, gold_reward)
                VALUES (@node_id, @target_node_id, @contract_type, @title, @desc, @req_mins, @gold)
            `),
            setActiveContract: this.db.prepare(`UPDATE contracts SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END`),
            addContractProgress: this.db.prepare(`UPDATE contracts SET progress_minutes = progress_minutes + @progress WHERE id = @id`),
            setContractProgress: this.db.prepare(`UPDATE contracts SET progress_minutes = @progress WHERE id = @id`),
            completeContract: this.db.prepare(`UPDATE contracts SET is_completed = 1, is_active = 0 WHERE id = @id`),
            abortContract: this.db.prepare(`DELETE FROM contracts WHERE id = ?`),
            updateContractTerms: this.db.prepare(`UPDATE contracts SET terms = @terms, gold_reward = @gold_reward WHERE id = @id`),
            updateNodeSpecialization: this.db.prepare(`UPDATE world_nodes SET specialization = @specialization WHERE id = @id`),

            getInventory: this.db.prepare(`SELECT * FROM inventory`),
            deleteItem: this.db.prepare(`DELETE FROM inventory WHERE id = ?`),

            insertFaction: this.db.prepare(`
                INSERT INTO factions (name, color, archetype, motto, type)
                VALUES (@name, @color, @archetype, @motto, @type)
            `),
            getAllFactions: this.db.prepare(`SELECT * FROM factions ORDER BY name`)
        };

        this.statements.insertSetting = this.db.prepare(`
            INSERT OR REPLACE INTO campaign_settings (key, value) VALUES (@key, @value)
        `);

        this.statements.insertItem = this.db.prepare(`
            INSERT INTO inventory (item_id, mercenary_id, durability, stash_slot) 
            VALUES (@itemId, @mercId, @durability, @stashSlot)
        `);

        this.statements.updateItemSlot = this.db.prepare(`
            UPDATE inventory SET stash_slot = @slot WHERE id = @id
        `);
    }

    // --- NODE HISTORY & PINNING ---
    toggleNodePin(nodeId) {
        this.ensureConnection();
        this.statements.togglePin.run(nodeId);
    }

    getNodeHistory(nodeId) {
        this.ensureConnection();
        return this.statements.getNodeHistory.all(nodeId);
    }

    getAllHistory() {
        this.ensureConnection();
        return this.statements.getAllHistory.all();
    }

    logNodeHistory(nodeId, text, type = 'world') {
        this.ensureConnection();
        const currentDay = parseInt(this.statements.getSetting.get('day').value) || 1;
        this.statements.insertNodeHistory.run({ node_id: nodeId, day: currentDay, text: text, type: type });
    }

    // --- CONTRACT GENERATION ---
    getOrGenerateContracts(nodeId, minMins = 10, maxMins = 120) {
        this.ensureConnection();
        let contracts = this.statements.getNodeContracts.all(nodeId);

        if (contracts.length === 0) {
            const originNode = this.getNodeById(nodeId);
            const possibleMins = this._buildContractMinuteOptions(minMins, maxMins);
            const generatedContracts = this._buildContractBoard(originNode, possibleMins);

            generatedContracts.forEach((contract) => {
                this.statements.insertContract.run(contract);
            });
            contracts = this.statements.getNodeContracts.all(nodeId);
        }
        return contracts.map((contract) => this._mapContract(contract));
    }

    _buildContractMinuteOptions(minMins, maxMins) {
        const start = Math.max(CONTRACT_GENERATION.MINUTE_STEP, Number(minMins) || CONTRACT_GENERATION.MINUTE_STEP);
        const end = Math.max(start, Number(maxMins) || start);
        const possibleMins = [];

        for (let minutes = start; minutes <= end; minutes += CONTRACT_GENERATION.MINUTE_STEP) {
            possibleMins.push(minutes);
        }

        return possibleMins.length > 0 ? possibleMins : [start];
    }

    _buildContractBoard(originNode, possibleMins) {
        if (!this._canOfferSettlementContracts(originNode)) return [];

        const contracts = [];
        
        // Priority 1: Force generate defense contract if invaded or sieged
        if (originNode.current_event === 'undead_invasion' || originNode.current_event === 'undead_siege') {
            contracts.push(this._createUndeadDefenseContract(originNode, possibleMins));
        }

        const hostileTarget = this._findNearestHostileCamp(originNode);
        if (hostileTarget) {
            const isUndeadNode = ['Desecrated Crypt', 'Ancient Tomb', 'Haunted Cave', 'Sunken Dungeon', 'Necropolis'].includes(hostileTarget.type);
            
            if (isUndeadNode) {
                const hasNecromancer = hostileTarget.type === 'Necropolis' || (hostileTarget.id % 3 === 0);
                if (hasNecromancer) {
                    contracts.push(this._createNecromancerHuntContract(originNode, hostileTarget, possibleMins));
                } else {
                    contracts.push(this._createUndeadPurgeContract(originNode, hostileTarget, possibleMins));
                }
            } else {
                contracts.push(this._createHostileCampContract(originNode, hostileTarget, possibleMins));
            }
        }

        const destination = this._pickSettlementDestination(originNode.id);
        if (destination) {
            contracts.push(this._createCaravanContract(originNode, destination, possibleMins));
        }

        while (contracts.length < CONTRACT_GENERATION.BOARD_SIZE) {
            contracts.push(this._createStandardContract(originNode, possibleMins));
        }

        return this._shuffleContracts(contracts).slice(0, CONTRACT_GENERATION.BOARD_SIZE);
    }

    _createStandardContract(originNode, possibleMins) {
        const template = this._pickRandom(STANDARD_CONTRACT_TEMPLATES);
        const reqMins = this._pickContractMinutes(possibleMins);

        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: CONTRACT_TYPE.STANDARD,
            title: template.title,
            desc: template.description,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins)
        };
    }

    _createCaravanContract(originNode, destinationNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins);
        const title = this._pickRandom(CARAVAN_CONTRACT_TITLES);

        return {
            node_id: originNode.id,
            target_node_id: destinationNode.id,
            contract_type: CONTRACT_TYPE.CARAVAN,
            title: `${title} to ${destinationNode.name}`,
            desc: `A caravan from ${originNode.name} needs protection on the road to ${destinationNode.name}. The destination will benefit if the goods arrive.`,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins)
        };
    }

    _createHostileCampContract(originNode, campNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, CONTRACT_GENERATION.HOSTILE_CAMP_MIN_MINUTES);

        return {
            node_id: originNode.id,
            target_node_id: campNode.id,
            contract_type: CONTRACT_TYPE.HOSTILE_CAMP,
            title: `Destroy ${campNode.type}: ${campNode.name}`,
            desc: `${originNode.name} wants ${campNode.name} cleared from the roads. The pay is rich, and the stores should be worth plundering.`,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, CONTRACT_GENERATION.HOSTILE_CAMP_GOLD_MULTIPLIER)
        };
    }

    _pickContractMinutes(possibleMins, minimumMinutes = null) {
        const eligible = minimumMinutes === null
            ? possibleMins
            : possibleMins.filter((minutes) => minutes >= minimumMinutes);

        return this._pickRandom(eligible.length > 0 ? eligible : possibleMins);
    }

    _calculateContractGold(requiredMinutes, multiplier = 1) {
        const variance = CONTRACT_GENERATION.GOLD_VARIANCE_MIN + (Math.random() * CONTRACT_GENERATION.GOLD_VARIANCE_RANGE);
        return Math.floor(requiredMinutes * CONTRACT_GENERATION.GOLD_PER_MINUTE * variance * multiplier);
    }

    _pickSettlementDestination(originNodeId) {
        const destinations = this._getContractSettlementNodes()
            .filter((node) => node.id !== originNodeId);

        return destinations.length > 0 ? this._pickRandom(destinations) : null;
    }

    _findNearestHostileCamp(originNode) {
        if (!originNode) return null;

        return this.statements.getAllNodes.all()
            .filter((node) => HOSTILE_CONTRACT_TARGET_TYPES.includes(node.type))
            .sort((a, b) => this._distanceSquared(originNode, a) - this._distanceSquared(originNode, b))[0] || null;
    }

    _getContractSettlementNodes() {
        return this.statements.getAllNodes.all()
            .map((node) => this._mapWorldNode(node))
            .filter((node) => this._canOfferSettlementContracts(node));
    }

    _canOfferSettlementContracts(node) {
        if (!node) return false;
        if (NON_GROWING_SETTLEMENT_TYPES.includes(node.type)) return false;
        if (node.is_hostile === 1) return false;
        return (node.reputation || 0) > HOSTILE_REPUTATION_THRESHOLD;
    }

    _canDirectlyClearHostileNode(node) {
        return Boolean(node && (HOSTILE_CONTRACT_TARGET_TYPES.includes(node.type) || node.is_hostile === 1));
    }

    _findNearestFriendlySettlement(originNode) {
        if (!originNode) return null;

        return this.statements.getAllNodes.all()
            .map((node) => this._mapWorldNode(node))
            .filter((node) => this._canOfferSettlementContracts(node))
            .sort((a, b) => this._distanceSquared(originNode, a) - this._distanceSquared(originNode, b))[0] || null;
    }

    _distanceSquared(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return (dx * dx) + (dy * dy);
    }

    _shuffleContracts(contracts) {
        const shuffled = [...contracts];
        for (let index = shuffled.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
        }
        return shuffled;
    }

    _pickRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    acceptContract(contractId) {
        this.ensureConnection();
        this.statements.setActiveContract.run(contractId);
        this.setCampaignSetting('is_delving', 'false');
    }

    negotiateContractTerm(contractId, nodeId, termId) {
        this.ensureConnection();

        const contract = this._mapContract(this.statements.getContractById.get(contractId));
        if (!contract) throw new Error("Contract not found.");
        if (contract.is_active === 1) throw new Error("Contract terms must be negotiated before accepting the job.");
        if (contract.is_completed === 1) throw new Error("Completed contracts cannot be renegotiated.");
        if (Number(contract.node_id) !== Number(nodeId)) throw new Error("This contract does not belong to the selected settlement.");

        const term = CONTRACT_INFLUENCE_TERM_BY_ID.get(termId);
        if (!term) throw new Error("Unknown political favor.");
        const contractType = this._resolveContractType(contract);
        if (COMBAT_NEGOTIATION_TERM_IDS.includes(term.id) && !this._isCombatLootContract(contract, contractType)) {
            throw new Error("That favor only applies to dangerous combat work.");
        }

        const terms = this._getContractTerms(contract);
        if (terms[term.id]) throw new Error("This favor is already attached to the contract.");

        const node = this.getNodeById(nodeId);
        const currentInfluence = Number(node?.influence) || 0;
        if (currentInfluence < term.cost) {
            throw new Error(`Not enough Influence in ${node?.name || 'this settlement'}.`);
        }

        let updatedGoldReward = contract.gold_reward;
        const applyNegotiation = this.db.transaction(() => {
            updatedGoldReward = this._applyNegotiatedTermEffect(contract, node, term, terms);
            this.statements.updateNodeInfluence.run({ id: nodeId, amount: -term.cost });
            this.statements.updateContractTerms.run({
                id: contract.id,
                terms: JSON.stringify(terms),
                gold_reward: updatedGoldReward
            });
        });
        applyNegotiation();

        const updatedContract = this._mapContract(this.statements.getContractById.get(contract.id));
        const updatedNode = this.getNodeById(nodeId);

        return {
            contract: updatedContract,
            node: updatedNode,
            message: `${term.label} secured in ${updatedNode?.name || 'the settlement'}.`
        };
    }

    startHostileSettlementClearing(
        nodeId,
        minMins = CONTRACT_GENERATION.DEFAULT_MIN_MINUTES,
        maxMins = CONTRACT_GENERATION.DEFAULT_MAX_MINUTES
    ) {
        this.ensureConnection();

        if (this.getActiveContract()) {
            throw new Error("Your company is already committed to an active assignment.");
        }

        const campNode = this.getNodeById(nodeId);
        if (!this._canDirectlyClearHostileNode(campNode)) {
            throw new Error("Only enemy settlements can be cleared directly.");
        }

        const supportNode = this._findNearestFriendlySettlement(campNode);
        if (!supportNode) {
            throw new Error("No friendly settlement is close enough to support this raid.");
        }

        const possibleMins = this._buildContractMinuteOptions(minMins, maxMins);
        const requiredMinutes = this._pickContractMinutes(possibleMins, CONTRACT_GENERATION.HOSTILE_CAMP_MIN_MINUTES);
        const result = this.statements.insertContract.run({
            node_id: supportNode.id,
            target_node_id: campNode.id,
            contract_type: CONTRACT_TYPE.DIRECT_CLEARING,
            title: `Clear ${campNode.type}: ${campNode.name}`,
            desc: `Your company will clear ${campNode.name} without waiting for a settlement contract. No patron pays a reward, but the camp stores can be plundered.`,
            req_mins: requiredMinutes,
            gold: DIRECT_CLEARING.GOLD_REWARD
        });

        this.statements.setActiveContract.run(result.lastInsertRowid);
        this.setCampaignSetting('is_delving', 'false');

        return this.getActiveContract();
    }

    getActiveContract() {
        this.ensureConnection();
        return this._mapContract(this.statements.getActiveContract.get());
    }

    cancelContract(contractId) {
        this.ensureConnection();
        this.statements.abortContract.run(contractId);
    }

    updateContractProgress(contractId, progressMinutes) {
        this.ensureConnection();
        this.statements.setContractProgress.run({ id: contractId, progress: progressMinutes });
    }

    completeActiveContract() {
        this.ensureConnection();
        const activeContract = this.getActiveContract();
        if (!activeContract) return null;

        this.statements.completeContract.run({ id: activeContract.id });
        this.updateGold(activeContract.gold_reward);

        const companyName = this.statements.getSetting.get('company_name')?.value || "The Company";
        const originNode = this.getNodeById(activeContract.node_id);
        const targetNode = this._resolveContractTargetNode(activeContract, originNode);
        const contractType = this._resolveContractType(activeContract);
        const beneficiaryNode = this._getContractBeneficiaryNode(activeContract, originNode, targetNode);

        activeContract.contract_type = contractType;
        activeContract.beneficiary_node_id = beneficiaryNode?.id ?? null;
        activeContract.beneficiary_node_name = beneficiaryNode?.name ?? null;
        activeContract.renown_reward = this._awardContractRenown(activeContract, contractType);
        activeContract.influence_reward = beneficiaryNode
            ? this._awardContractInfluence(beneficiaryNode.id, activeContract, contractType)
            : 0;
        activeContract.influence_node_name = beneficiaryNode?.name ?? null;

        if (this._isDirectClearingContractType(contractType)) {
            return this._completeDirectClearing(activeContract, targetNode, originNode, companyName);
        }

        const contractRepReward = Math.max(
            CONTRACT_REPUTATION.MIN_REWARD,
            Math.floor(activeContract.required_minutes / CONTRACT_REPUTATION.MINUTES_PER_POINT)
        );
        if (beneficiaryNode) {
            this.updateNodeReputation(beneficiaryNode.id, contractRepReward);
            this.logNodeHistory(beneficiaryNode.id, `${companyName} completed a contract: "${activeContract.title}".`, 'player');
            
            // Clear Undead invasion/siege if they completed a defense contract
            if (activeContract.contract_type === 'undead_defense' || activeContract.title.includes("Defend")) {
                this.db.prepare("UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?").run(beneficiaryNode.id);
                this.logNodeHistory(beneficiaryNode.id, `${companyName} successfully repelled the undead horde, saving the settlement!`, 'player');
            }
        }

        const caravanOutcome = this._applyCaravanContractOutcome(activeContract, beneficiaryNode, companyName);

        const campDestroyedLoot = this._handleCampDestruction(activeContract, targetNode || originNode, beneficiaryNode, companyName);

        const refreshedBeneficiaryNode = beneficiaryNode ? this.getNodeById(beneficiaryNode.id) : null;
        this._trackSettlementContractGrowth(refreshedBeneficiaryNode);

        const beneficiaryLabel = beneficiaryNode?.name || 'settlement';

        // Dynamically increment the reported Influence reward if crisis relief occurred
        let finalInfluenceReward = activeContract.influence_reward || 0;
        if (caravanOutcome && caravanOutcome.bonusInfluence) {
            finalInfluenceReward += caravanOutcome.bonusInfluence;
        }
        
        const logs = [
            `📜 Contract Completed: ${activeContract.title}`,
            `💰 Earned ${activeContract.gold_reward} crowns!`,
            `Renown increased by ${activeContract.renown_reward}.`,
            `Influence in ${beneficiaryLabel} increased by ${finalInfluenceReward}.`,
            `Reputation with ${beneficiaryLabel} increased by ${contractRepReward}.`
        ];

        // Append custom logging strings for caravan resolution
        if (caravanOutcome && caravanOutcome.bonusRep > 0) {
            if (caravanOutcome.eventMitigated) {
                logs.push(`🔥 Crisis mitigated! Gained an additional +${caravanOutcome.bonusRep} reputation and +${caravanOutcome.bonusInfluence} influence for critical relief.`);
            } else {
                logs.push(`Bonus reputation for restoring trade routes: +${caravanOutcome.bonusRep}.`);
            }
        }

        // --- LOOT LOGIC ---
        const foundLoot = [];
        let lootChance = CONTRACT_LOOT.DEFAULT_CHANCE;

        if (this._isCombatLootContract(activeContract, contractType)) {
            lootChance = CONTRACT_LOOT.COMBAT_CHANCE;
        }

        if (this._isHostileCampContractType(contractType)) {
            lootChance = CONTRACT_LOOT.HOSTILE_CAMP_CHANCE;
        }

        if (campDestroyedLoot) {
            foundLoot.push(campDestroyedLoot);
            activeContract._campDestroyedLoot = campDestroyedLoot;
            logs.push(`🔥 Hostile location destroyed! You found hidden stash: ${activeContract._campDestroyedLoot.name}`);
        }

        const rolls = this._countLootRolls(activeContract, contractType);
        for (let i = 0; i < rolls; i++) {
            if (Math.random() < lootChance) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ You recovered loot: ${newItem.name}`);
            }
        }

        this._grantSalvageRightsLoot(activeContract, logs, foundLoot);

        activeContract.influence_reward = finalInfluenceReward;

        return { contract: activeContract, logs, loot: foundLoot };
    }

    _completeDirectClearing(activeContract, targetNode, supportNode, companyName) {
        const foundLoot = [];
        const logs = [
            `⚔️ Direct Clearing Completed: ${activeContract.title}`,
            "No patron paid for this raid, but the surrounding roads are safer.",
            `Renown increased by ${activeContract.renown_reward}.`,
            `Influence in ${supportNode?.name || 'nearby settlements'} increased by ${activeContract.influence_reward}.`
        ];

        const campDestroyedLoot = this._handleCampDestruction(activeContract, targetNode, supportNode, companyName);
        if (campDestroyedLoot) {
            foundLoot.push(campDestroyedLoot);
            activeContract._campDestroyedLoot = campDestroyedLoot;
            logs.push(`🔥 Hostile location destroyed! You found hidden stash: ${campDestroyedLoot.name}`);
        }

        const rolls = this._countLootRolls(activeContract, activeContract.contract_type);
        for (let i = 0; i < rolls; i++) {
            if (Math.random() < CONTRACT_LOOT.HOSTILE_CAMP_CHANCE) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ You recovered loot: ${newItem.name}`);
            }
        }

        this._grantSalvageRightsLoot(activeContract, logs, foundLoot);

        return { contract: activeContract, logs, loot: foundLoot };
    }

    _awardContractRenown(contract, contractType) {
        const reward = this._calculateContractRenown(contract, contractType);
        this.updateRenown(reward);
        return reward;
    }

    _calculateContractRenown(contract, contractType) {
        const baseReward = Math.max(
            RENOWN_REWARD.MIN_REWARD,
            Math.floor(contract.required_minutes / RENOWN_REWARD.MINUTES_PER_POINT)
        );

        let bonus = 0;
        if (this._isHostileCampContractType(contractType)) bonus += RENOWN_REWARD.HOSTILE_CAMP_BONUS;
        if (this._isDirectClearingContractType(contractType)) bonus += RENOWN_REWARD.DIRECT_CLEARING_BONUS;
        if (contractType === 'undead_defense') bonus += 3; // Saved a town
        if (contractType === 'necromancer_hunt') bonus += 5; // Slain commander

        return baseReward + bonus;
    }

    _awardContractInfluence(nodeId, contract, contractType) {
        const reward = this._calculateContractInfluence(contract, contractType);
        this.updateNodeInfluence(nodeId, reward);
        return reward;
    }

    _calculateContractInfluence(contract, contractType) {
        const baseReward = Math.max(
            INFLUENCE_REWARD.MIN_REWARD,
            Math.floor(contract.required_minutes / INFLUENCE_REWARD.MINUTES_PER_POINT)
        );

        let bonus = 0;
        if (contractType === CONTRACT_TYPE.CARAVAN) bonus += INFLUENCE_REWARD.CARAVAN_BONUS;
        if (this._isHostileCampContractType(contractType)) bonus += INFLUENCE_REWARD.HOSTILE_CAMP_BONUS;
        if (this._isDirectClearingContractType(contractType)) bonus += INFLUENCE_REWARD.DIRECT_CLEARING_BONUS;
        if (contractType === 'undead_defense') bonus += 4;
        if (contractType === 'necromancer_hunt') bonus += 6;

        return baseReward + bonus;
    }

    _grantSalvageRightsLoot(contract, logs, foundLoot) {
        const salvageRights = CONTRACT_INFLUENCE_TERM_BY_ID.get('salvage_rights');
        if (!salvageRights || !this._contractHasTerm(contract, salvageRights.id)) return;

        for (let index = 0; index < salvageRights.extraArmorPieces; index++) {
            const newItem = ItemFactory.getRandomArmorPiece();
            this.addItemToInventory(newItem.id);
            foundLoot.push(newItem);
            logs.push(`Salvage rights honored: recovered ${newItem.name}.`);
        }
    }

    _applyNegotiatedTermEffect(contract, node, term, terms) {
        terms[term.id] = true;
        const companyName = this.statements.getSetting.get('company_name')?.value || "The Company";

        if (term.id === 'better_pay') {
            this.logNodeHistory(
                node.id,
                `${companyName} spent Influence to secure better pay on "${contract.title}".`,
                'player'
            );
            return Math.ceil(contract.gold_reward * term.goldMultiplier);
        }

        if (term.id === 'local_pardon') {
            this.updateNodeReputation(node.id, term.reputationGain);
            this.logNodeHistory(
                node.id,
                `${companyName} spent Influence to secure a localized pardon, restoring ${term.reputationGain} reputation.`,
                'player'
            );
            return contract.gold_reward;
        }

        this.logNodeHistory(
            node.id,
            `${companyName} spent Influence to secure ${term.label.toLowerCase()} on "${contract.title}".`,
            'player'
        );

        return contract.gold_reward;
    }

    _mapContract(contract) {
        if (!contract) return contract;

        const mapped = { ...contract };
        mapped.terms = this._getContractTerms(mapped);
        mapped.influence_options = this._buildInfluenceOptions(mapped);
        return mapped;
    }

    _getContractTerms(contract) {
        if (!contract) return {};
        if (contract.terms && typeof contract.terms === 'object') return { ...contract.terms };

        try {
            const parsed = JSON.parse(contract.terms || '{}');
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    _buildInfluenceOptions(contract) {
        if (!contract || contract.is_active === 1 || contract.is_completed === 1) return [];
        const terms = this._getContractTerms(contract);
        const contractType = this._resolveContractType(contract);
        const canUseCombatTerms = this._isCombatLootContract(contract, contractType);

        return CONTRACT_INFLUENCE_TERMS
            .filter((term) => canUseCombatTerms || !COMBAT_NEGOTIATION_TERM_IDS.includes(term.id))
            .map((term) => ({
                id: term.id,
                label: term.label,
                icon: term.icon,
                cost: term.cost,
                description: term.description,
                applied: Boolean(terms[term.id])
            }));
    }

    _contractHasTerm(contract, termId) {
        return Boolean(this._getContractTerms(contract)[termId]);
    }

    _resolveContractType(contract) {
        if ([CONTRACT_TYPE.CARAVAN, CONTRACT_TYPE.BRIGAND_CAMP, CONTRACT_TYPE.HOSTILE_CAMP, CONTRACT_TYPE.DIRECT_CLEARING, 'undead_defense', 'undead_purge', 'necromancer_hunt'].includes(contract.contract_type)) {
            return contract.contract_type;
        }

        if (contractTitleHasKeyword(contract.title, CARAVAN_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.CARAVAN;
        }

        if (contractTitleHasKeyword(contract.title, HOSTILE_CAMP_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.HOSTILE_CAMP;
        }

        return CONTRACT_TYPE.STANDARD;
    }

    _resolveContractTargetNode(contract, originNode) {
        if (contract.target_node_id) {
            return this.getNodeById(contract.target_node_id);
        }

        if (this._resolveContractType(contract) === CONTRACT_TYPE.CARAVAN) {
            return this._pickSettlementDestination(originNode?.id);
        }

        return null;
    }

    _getContractBeneficiaryNode(contract, originNode, targetNode) {
        if (this._resolveContractType(contract) === CONTRACT_TYPE.CARAVAN && this._canReceiveContractBenefits(targetNode)) {
            return targetNode;
        }

        return this._canReceiveContractBenefits(originNode) ? originNode : null;
    }

    _canReceiveContractBenefits(node) {
        return Boolean(node && !NON_GROWING_SETTLEMENT_TYPES.includes(node.type));
    }

    _handleCampDestruction(contract, campNode, settlementNode, companyName) {
        const contractType = this._resolveContractType(contract);
        const isLegacyCampContract = !contract.target_node_id
            && campNode
            && NON_GROWING_SETTLEMENT_TYPES.includes(campNode.type)
            && this._isCombatLootContract(contract, contractType);

        if (!this._isHostileCampContractType(contractType) && !isLegacyCampContract) {
            return null;
        }

        if (!campNode || !NON_GROWING_SETTLEMENT_TYPES.includes(campNode.type)) {
            return null;
        }

        this.db.prepare('DELETE FROM contracts WHERE target_node_id = ? AND is_completed = 0').run(campNode.id);
        this.db.prepare('DELETE FROM world_nodes WHERE id = ?').run(campNode.id);

        if (settlementNode) {
            this.logNodeHistory(
                settlementNode.id,
                `${companyName} destroyed ${campNode.name}, making the surrounding region much safer.`,
                'player'
            );
        }

        const rareItem = ItemFactory.getRandomItem();
        this.addItemToInventory(rareItem.id);
        return rareItem;
    }

    _trackSettlementContractGrowth(growthNode) {
        const tierData = SETTLEMENT_TIERS[growthNode?.type];

        if (!canTrackSettlementGrowth(growthNode, tierData)) return;

        let reqs = {};
        try { reqs = JSON.parse(growthNode.expansion_reqs || '{}'); } catch(e){}

        reqs.contracts = (reqs.contracts || 0) + 1;

        let readyForBoom = (reqs.contracts >= tierData.growthReqs.contracts) && ((reqs.trade || 0) >= tierData.growthReqs.trade);

        this.db.prepare('UPDATE world_nodes SET expansion_reqs = ? WHERE id = ?').run(JSON.stringify(reqs), growthNode.id);

        if (readyForBoom) {
            // Dynamic check for expansion vs upgrade
            const eventType = this._shouldTriggerExpansion(growthNode) ? 'settlement_expansion' : 'building_boom';
            this.triggerSettlementGrowthEvent(growthNode.id, eventType);
        }
    }

    _isCombatLootContract(contract, contractType = this._resolveContractType(contract)) {
        return this._isHostileCampContractType(contractType)
            || contractTitleHasKeyword(contract.title, COMBAT_CONTRACT_KEYWORDS);
    }

    _countLootRolls(contract, contractType) {
        const baseRolls = Math.max(
            CONTRACT_LOOT.MIN_ROLLS,
            Math.floor(contract.required_minutes / CONTRACT_LOOT.MINUTES_PER_ROLL)
        );

        if (this._isHostileCampContractType(contractType)) {
            return baseRolls + CONTRACT_LOOT.HOSTILE_CAMP_EXTRA_ROLLS;
        }

        return baseRolls;
    }

    _isHostileCampContractType(contractType) {
        return contractType === CONTRACT_TYPE.HOSTILE_CAMP
            || contractType === CONTRACT_TYPE.BRIGAND_CAMP
            || contractType === 'undead_purge'
            || contractType === 'necromancer_hunt'
            || this._isDirectClearingContractType(contractType);
    }

    _isDirectClearingContractType(contractType) {
        return contractType === CONTRACT_TYPE.DIRECT_CLEARING;
    }

    _applyCaravanContractOutcome(contract, node, companyName) {
        if (this._resolveContractType(contract) !== CONTRACT_TYPE.CARAVAN || !node) {
            return null;
        }

        let bonusRepReward = 0;
        let bonusInfluenceReward = 0;
        let eventMitigated = false;

        // Check if the node is currently suffering from a negative economic event
        if (node.current_event && NEGATIVE_ECONOMIC_EVENTS.includes(node.current_event)) {
            const currentExpiration = node.event_expiration || 0;
            const newExpiration = Math.max(0, currentExpiration - NEGATIVE_EVENT_DECAY_REDUCTION);
            eventMitigated = true;

            bonusRepReward = NEGATIVE_EVENT_REMEDY_BONUS_REP;
            bonusInfluenceReward = NEGATIVE_EVENT_REMEDY_BONUS_INF;

            // Apply the bonus reputation and influence
            this.updateNodeReputation(node.id, bonusRepReward);
            this.updateNodeInfluence(node.id, bonusInfluenceReward);

            if (newExpiration <= 0) {
                // Clear the negative event, returning prices to standard levels immediately
                this.db.prepare('UPDATE world_nodes SET current_event = NULL, event_expiration = 0 WHERE id = ?').run(node.id);
                this.logNodeHistory(
                    node.id,
                    `${companyName} completed a vital supply run, successfully ending the "${node.current_event}" crisis and restoring standard market prices!`,
                    'player'
                );
            } else {
                // Decrease the event decay timer
                this.db.prepare('UPDATE world_nodes SET event_expiration = ? WHERE id = ?').run(newExpiration, node.id);
                this.logNodeHistory(
                    node.id,
                    `${companyName} delivered essential supplies, mitigating the effects of "${node.current_event}" and reducing its expected duration by ${NEGATIVE_EVENT_DECAY_REDUCTION} days.`,
                    'player'
                );
            }
        } else {
            // Default behavior if no negative economic event: apply Well Supplied
            this._setNodeEvent(
                node.id,
                SETTLEMENT_EVENT_ID.WELL_SUPPLIED,
                CONTRACT_EVENT_DURATION.WELL_SUPPLIED_DAYS
            );

            this.logNodeHistory(
                node.id,
                `A merchant caravan safely arrived at ${node.name}, guided by ${companyName}. The settlement is now well supplied!`,
                'world'
            );
        }

        // Return a data package so the completion logging method can dynamically adapt
        return {
            bonusRep: bonusRepReward,
            bonusInfluence: bonusInfluenceReward,
            eventMitigated: eventMitigated
        };
    }

    _setNodeEvent(nodeId, eventId, durationDays) {
        this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ? WHERE id = ?')
            .run(eventId, durationDays, nodeId);
    }

    // --- INVENTORY & EQUIPPING ---
    getInventory() {
        this.ensureConnection();
        return this.statements.getInventory.all();
    }

    deleteItemFromInventory(inventoryId) {
        this.ensureConnection();
        return this.statements.deleteItem.run(inventoryId);
    }

    equipItem(inventoryId, mercenaryId, equipSlot) {
        this.ensureConnection();
        const db = this.db;
        
        return db.transaction(() => {
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id = ? AND equip_slot = ?').get(mercenaryId, equipSlot);
            
            if (existing) {
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = 0;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            db.prepare('UPDATE inventory SET mercenary_id = ?, equip_slot = ?, stash_slot = NULL WHERE id = ?').run(mercenaryId, equipSlot, inventoryId);
        })();
    }

    unequipItem(inventoryId, targetStashSlot) {
        this.ensureConnection();
        const db = this.db;
        
        return db.transaction(() => {
            const existing = db.prepare('SELECT id FROM inventory WHERE mercenary_id IS NULL AND stash_slot = ?').get(targetStashSlot);
            if (existing) {
                const currentItems = db.prepare('SELECT stash_slot FROM inventory WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL').all();
                const occupied = new Set(currentItems.map(i => i.stash_slot));
                let freeSlot = 0;
                while (occupied.has(freeSlot)) freeSlot++;
                db.prepare('UPDATE inventory SET stash_slot = ? WHERE id = ?').run(freeSlot, existing.id);
            }
            
            db.prepare('UPDATE inventory SET mercenary_id = NULL, equip_slot = NULL, stash_slot = ? WHERE id = ?').run(targetStashSlot, inventoryId);
        })();
    }

    // --- REPUTATION ---
    updateNodeReputation(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateReputation.run(amount, nodeId);
    }

    updateNodeInfluence(nodeId, amount) {
        this.ensureConnection();
        if (nodeId) this.statements.updateNodeInfluence.run({ id: nodeId, amount });
    }
    
    // --- NODE HISTORY, SHOP, & PINNING ---
    updateNodeShopData(nodeId, inventoryJson, lastRestock, nextTrade) {
        this.ensureConnection();
        this.statements.updateNodeShop.run({
            id: nodeId,
            inv: inventoryJson,
            lastRestock: lastRestock,
            nextTrade: nextTrade
        });
    }

    // --- WORLD MAP & POSITION ---
    getNodeById(id) {
        this.ensureConnection();
        return this._mapWorldNode(this.statements.getNodeById.get(id));
    }

    getWorldState() {
        this.ensureConnection();
        const nodes = this.statements.getAllNodes.all().map((node) => this._mapWorldNode(node));

        const px = this.statements.getSetting.get('player_x')?.value || '400';
        const py = this.statements.getSetting.get('player_y')?.value || '300';

        const origin = this.statements.getSetting.get('origin')?.value || 'sellswords';
        const gameVersion = this.statements.getSetting.get('game_version')?.value || 'standard';
        const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';

        return {
            nodes,
            player: { x: parseFloat(px), y: parseFloat(py) },
            origin,
            gameVersion,
            isDelving
        };
    }

    savePlayerPosition(x, y) {
        this.ensureConnection();
        const db = this.db;
        const insert = this.statements.insertSetting;

        const txn = db.transaction(() => {
            insert.run({ key: 'player_x', value: String(x) });
            insert.run({ key: 'player_y', value: String(y) });
        });
        txn();
    }

    // --- GAMEPLAY LOGIC ---
    distributeSessionXP(focusMinutes, ratio = 1.0) {
        this.ensureConnection();

        const origin = this.statements.getSetting.get('origin')?.value || 'sellswords';
        const gameVersion = this.statements.getSetting.get('game_version')?.value || 'standard';

        const baseXpAmount = Math.floor(focusMinutes * 10 * ratio);

        const logs = [];
        const foundLoot = [];

        const rollForLoot = (chancePercentage, isDeep = false) => {
            if (Math.random() < chancePercentage) {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`✨ ${isDeep ? 'Deep floor treasure' : 'Found loot'}: ${newItem.name}`);
                return true;
            }
            return false;
        };

        const activeMercs = this.statements.getAll.all();
        const equippedRaw = this.db.prepare('SELECT * FROM inventory WHERE mercenary_id IS NOT NULL AND equip_slot IS NOT NULL').all();

        let partyTotalAttack = 0;
        let tankCount = 0;
        let totalPartyPower = 0;

        activeMercs.forEach(merc => {
            merc.totalAttack = 0;
            merc.totalDefense = 0;
            merc.fatiguePenalty = 0;
            merc.xpBonus = 0;

            const mercGear = equippedRaw.filter(i => i.mercenary_id === merc.id);
            mercGear.forEach(gear => {
                const template = ItemFactory.createItem(gear.item_id);
                if (template && template.stats) {
                    merc.totalAttack += (template.stats.attack || 0);
                    merc.totalDefense += (template.stats.defense || 0);
                    merc.fatiguePenalty += Math.abs(template.stats.fatigue_penalty || 0);
                    
                    if (template.stats.xp_multiplier) {
                        merc.xpBonus += (template.stats.xp_multiplier - 1);
                    }
                }
                
                if (origin === 'dungeon' && gameVersion === 'barebones' && Math.random() < 0.25) {
                    this.db.prepare('UPDATE inventory SET durability = MAX(0, durability - 1) WHERE id = ?').run(gear.id);
                }
            });

            partyTotalAttack += merc.totalAttack;

            let mercPower = (merc.str || 10) + (merc.spd || 10) + (merc.int || 10) + merc.totalAttack + merc.totalDefense;
            if (['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                tankCount++;
                mercPower *= 1.2;
            }
            totalPartyPower += mercPower;
        });

        let daysPassed = 0;
        const MINUTES_PER_DAY = 30;

        const currentAccumulated = parseFloat(this.statements.getSetting.get('accumulated_time')?.value || '0');
        let newAccumulated = currentAccumulated + focusMinutes;

        while (newAccumulated >= MINUTES_PER_DAY) {
            newAccumulated -= MINUTES_PER_DAY;
            daysPassed++;
            const dayResult = this.processDayEnd();

            logs.push(`🌙 Day ${dayResult.day - 1} ended. Paid ${dayResult.wagesPaid}g in wages.`);
            if (dayResult.provisionsConsumed > 0) {
                logs.push(`🍞 Consumed ${dayResult.provisionsConsumed} provisions.`);
            }
            if (dayResult.consumedItemsCount > 0) {
                logs.push(`🍴 Ate ${dayResult.consumedItemsCount} food item(s) from stash.`);
            }
            if (dayResult.starvationTriggered) {
                logs.push(`⚠️ STARVATION! The company starved and grew weak.`);
            }
            if (dayResult.medicineUsed > 0 || dayResult.totalHealed > 0) {
                logs.push(`⚕️ Recovered ${dayResult.totalHealed} HP using ${dayResult.medicineUsed} meds.`);
            }
            if (dayResult.spoiledCount > 0) {
                logs.push(`🍞 ${dayResult.spoiledCount} food item(s) spoiled!`);
            }
            if (dayResult.factionLogs && dayResult.factionLogs.length > 0) {
                dayResult.factionLogs.forEach(log => logs.push(`📢 ${log}`));
            }
        }
        this.setCampaignSetting('accumulated_time', newAccumulated);

        if (origin === 'dungeon' && gameVersion === 'barebones') {
            const activeContract = this.getActiveContract();
            const isDelving = this.statements.getSetting.get('is_delving')?.value === 'true';

            if (activeContract) {
                const footmenTerm = CONTRACT_INFLUENCE_TERM_BY_ID.get('footmen');
                const hasFootmen = Boolean(footmenTerm && this._contractHasTerm(activeContract, footmenTerm.id));
                const contractDamageChance = hasFootmen
                    ? CONTRACT_SESSION_RISK.BASE_DAMAGE_CHANCE * footmenTerm.damageChanceMultiplier
                    : CONTRACT_SESSION_RISK.BASE_DAMAGE_CHANCE;

                if (hasFootmen) {
                    logs.push("Noble footmen screened the company during the contract, lowering the danger of stray attacks.");
                }

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / CONTRACT_SESSION_RISK.FATIGUE_MINUTES_PER_POINT)
                        + Math.floor(merc.fatiguePenalty / CONTRACT_SESSION_RISK.FATIGUE_GEAR_DIVISOR);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    if (Math.random() < contractDamageChance) {
                        const rawDamage = Math.floor(Math.random() * CONTRACT_SESSION_RISK.DAMAGE_ROLL_RANGE * ratio)
                            + CONTRACT_SESSION_RISK.MIN_DAMAGE;
                        const defMitigation = Math.floor(merc.totalDefense / CONTRACT_SESSION_RISK.DEFENSE_MITIGATION_DIVISOR);
                        const finalDamage = Math.max(0, rawDamage - defMitigation);
                        
                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            logs.push(`⚔️ ${merc.name} took ${finalDamage} damage fending off a wandering beast.`);
                        }
                    }
                });

                if (Math.random() < CONTRACT_SESSION_RISK.TRAVELERS_ENCOUNTER_CHANCE) {
                    logs.push(`🏕️ The party encountered travelers on the road during the contract.`);
                }

                const attackLootBonus = (partyTotalAttack / CONTRACT_SESSION_RISK.ATTACK_LOOT_SCORE_DIVISOR)
                    * CONTRACT_SESSION_RISK.ATTACK_LOOT_BONUS_RATE;
                const lootChance = CONTRACT_SESSION_RISK.BASE_LOOT_CHANCE + attackLootBonus;
                const rolls = Math.max(
                    CONTRACT_SESSION_RISK.MIN_LOOT_ROLLS,
                    Math.floor(focusMinutes / CONTRACT_SESSION_RISK.MINUTES_PER_LOOT_ROLL)
                );

                for(let i=0; i<rolls; i++) rollForLoot(lootChance);

                if (logs.length === 0 && daysPassed === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
                // Threat & Balancing Constants 
                const BASE_THREAT_PER_MINUTE = 5;
                const MIN_DANGER_MULTIPLIER = 0.1;
                const BASE_DAMAGE_CHANCE = 0.40;
                const MAX_DAMAGE_CHANCE = 0.80;
                const TANK_PROTECTION_RATE = 0.10;

                const attackGoldMultiplier = 1 + (partyTotalAttack / 100); 
                const goldFound = Math.floor(focusMinutes * ratio * 2.5 * attackGoldMultiplier);
                
                this.updateGold(goldFound);
                
                if (focusMinutes >= 1) {
                    logs.push(`🕳️ The party delved into the dungeon for ${Math.round(focusMinutes)} minutes.`);
                    logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                } else {
                    logs.push(`🕳️ The party briefly scouted the dungeon entrance.`);
                    if (goldFound > 0) logs.push(`💰 Scavenged ${goldFound} gold crowns.`);
                }

                // Calculate threat and damage chances dynamically based on session time & party power
                const dungeonThreat = focusMinutes * BASE_THREAT_PER_MINUTE * ratio;
                const dangerMultiplier = Math.max(MIN_DANGER_MULTIPLIER, dungeonThreat / Math.max(1, totalPartyPower));
                const adjustedDamageChance = Math.min(MAX_DAMAGE_CHANCE, BASE_DAMAGE_CHANCE * dangerMultiplier);
                const tankProtectionBonus = tankCount * TANK_PROTECTION_RATE;

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    // Tanks (Vanguards/Hedge Knights) absorb blows, lowering the hit chance for squishier roles
                    let personalHitChance = adjustedDamageChance;
                    if (!['Vanguard', 'Hedge Knight'].includes(merc.role)) {
                        personalHitChance = Math.max(0.05, personalHitChance - tankProtectionBonus);
                    } else {
                        personalHitChance = Math.min(0.90, personalHitChance + 0.15); 
                    }

                    if (Math.random() < personalHitChance) {
                        const rawDamage = Math.floor(Math.random() * 15 * ratio) + 5;
                        const defenseMitigation = Math.floor((merc.str + merc.level) / 4) + Math.floor(merc.totalDefense / 2);
                        const finalDamage = Math.max(0, rawDamage - defenseMitigation);

                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            if (finalDamage > 10) {
                                logs.push(`🩸 ${merc.name} took a vicious blow for ${finalDamage} damage!`);
                            } else {
                                logs.push(`⚔️ ${merc.name} suffered ${finalDamage} damage in a skirmish.`);
                            }
                        } else {
                            logs.push(`🛡️ ${merc.name}'s armor completely deflected an attack!`);
                        }
                    }
                });

                const depthLootBonus = focusMinutes * 0.015;
                const attackLootBonus = (partyTotalAttack / 100) * 0.1; 
                const baseLootChance = 0.35 + depthLootBonus + attackLootBonus;
                
                const lootRolls = Math.max(1, Math.floor(focusMinutes / 5));
                let itemsLooted = 0;

                for (let i = 0; i < lootRolls; i++) {
                    if (rollForLoot(baseLootChance)) itemsLooted++; // Ensure internal call references this
                }

                if (focusMinutes >= 20 && itemsLooted === 0) {
                    rollForLoot(1.0);
                }

                if (focusMinutes >= 45) {
                    logs.push(`👑 Survived a deep floor! Extra loot granted.`);
                    rollForLoot(0.30 + depthLootBonus + attackLootBonus);
                    rollForLoot(1.0, true);
                }
            } else {
                // --- NEW IDLE / RESTING STATE (Dungeon Barebones) ---
                const recoveryAmount = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.FATIGUE_RECOVERY_PER_MINUTE);
                const trainingXp = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.XP_PER_MINUTE * ratio);

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(trainingXp * (1 + merc.xpBonus));
                    // Passing negative value to decrease fatigue (Sql clamp MAX(0, fatigue + @fatigue) handles bounds)
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: -recoveryAmount, id: merc.id });
                });

                if (focusMinutes >= IDLE_SESSION_CONFIG.MIN_MINUTES_FOR_LOG) {
                    logs.push(`💤 The company rested in camp, recovering up to ${recoveryAmount} fatigue.`);
                    logs.push(`🛡️ The mercenaries spent the downtime training, earning light experience (+${trainingXp} XP).`);
                }
            }

        } else {
            // Standard map campaign mode checks
            const activeContract = this.getActiveContract();

            if (activeContract) {
                // On duty
                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });
                });
            } else {
                // --- IDLE / RESTING STATE (Standard Campaign) ---
                const recoveryAmount = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.FATIGUE_RECOVERY_PER_MINUTE);
                const trainingXp = Math.floor(focusMinutes * IDLE_SESSION_CONFIG.XP_PER_MINUTE * ratio);

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(trainingXp * (1 + merc.xpBonus));
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: -recoveryAmount, id: merc.id });
                });

                if (focusMinutes >= IDLE_SESSION_CONFIG.MIN_MINUTES_FOR_LOG) {
                    logs.push(`💤 The company paused on the road to rest, recovering up to ${recoveryAmount} fatigue.`);
                    logs.push(`🛡️ The mercenaries drilled during the halt, earning light experience (+${trainingXp} XP).`);
                }
            }
        }

        // --- TRIGGER RANDOM SESSION EVENT ---
        this._triggerRandomSessionEvent(focusMinutes, logs, foundLoot, activeMercs, ratio);

        const totalXpGranted = activeMercs.reduce((sum, m) => sum + Math.floor(baseXpAmount * (1 + m.xpBonus)), 0);

        return { xp: Math.floor(totalXpGranted/Math.max(1, activeMercs.length)), logs: logs, loot: foundLoot };
    }

    /**
     * Reduces active mercenaries' fatigue based on break time taken.
     * Rate: 1 fatigue point per 5 minutes of break (mirrors the gain rate).
     * Fatigue is clamped to a minimum of 0 (handled by SQL MAX(0, ...)).
     * @param {number} breakMinutes - Total break minutes from the session.
     * @returns {number} Amount of fatigue recovered per merc.
     */
    distributeBreakFatigueRecovery(breakMinutes) {
        this.ensureConnection();
        if (!breakMinutes || breakMinutes <= 0) return 0;

        const fatigueRecovery = Math.floor(breakMinutes / 5);
        if (fatigueRecovery <= 0) return 0;

        this.statements.reduceFatigue.run({ amount: fatigueRecovery });
        console.log(`😴 Break recovery: -${fatigueRecovery} fatigue to all active mercs (${Math.round(breakMinutes)}m break).`);
        return fatigueRecovery;
    }

    processDayEnd() {
        this.ensureConnection();

        const db = this.db;
        const result = db.transaction(() => {
            // Configuration Constants to avoid Magic Numbers
            const PROVISIONS_CONSUMED_PER_MERC = 2;
            const STARVATION_HP_DAMAGE = 15;
            const STARVATION_FATIGUE_GAIN = 25;
            const BASE_HEAL_MEDS = 25;
            const BASE_HEAL_NO_MEDS = 5;
            const FATIGUE_RECOVERY_ACTIVE = -10;
            const FATIGUE_RECOVERY_RESTING = 30;

            const currentDay = parseInt(this.statements.getSetting.get('day').value);
            const currentGold = parseInt(this.statements.getSetting.get('gold').value);
            let currentMedicine = parseInt(this.statements.getSetting.get('medicine').value || '0');
            const totalWages = this.statements.getWages.get().total || 0;

            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            const allMercs = this.db.prepare('SELECT * FROM mercenaries').all();

            // --- PROVISIONS CONSUMPTION ---
            let looseProvisions = parseInt(db.prepare("SELECT value FROM campaign_settings WHERE key = 'provisions'").get()?.value || '50');
            const totalMercCount = allMercs.length;
            const originalFoodNeeded = totalMercCount * PROVISIONS_CONSUMED_PER_MERC;
            let foodNeeded = originalFoodNeeded;
            let consumedItemsCount = 0;
            let starvationTriggered = false;

            if (foodNeeded > 0) {
                if (looseProvisions >= foodNeeded) {
                    looseProvisions -= foodNeeded;
                    foodNeeded = 0;
                } else {
                    foodNeeded -= looseProvisions;
                    looseProvisions = 0;

                    // Grab items currently stored in the stash
                    const stashItems = db.prepare(`
                        SELECT id, item_id 
                        FROM inventory 
                        WHERE mercenary_id IS NULL AND stash_slot IS NOT NULL
                    `).all();

                    const foodItems = [];
                    stashItems.forEach(item => {
                        const template = ItemFactory.createItem(item.item_id);
                        if (template && template.type === 'Provision') {
                            foodItems.push({ id: item.id, template });
                        }
                    });

                    // Consume physical food items one by one until the hunger is satisfied
                    for (const food of foodItems) {
                        if (foodNeeded <= 0) break;

                        const itemProvisions = food.template.stats?.provisions || 25;
                        db.prepare('DELETE FROM inventory WHERE id = ?').run(food.id);
                        consumedItemsCount++;

                        if (itemProvisions >= foodNeeded) {
                            looseProvisions = itemProvisions - foodNeeded;
                            foodNeeded = 0;
                        } else {
                            foodNeeded -= itemProvisions;
                        }
                    }

                    if (foodNeeded > 0) {
                        starvationTriggered = true;
                    }
                }
            }

            // Save modified loose provisions back to settings
            this.statements.updateSetting.run({ key: 'provisions', value: String(looseProvisions) });

            let medicineUsed = 0;
            let totalHealed = 0;

            allMercs.forEach(m => {
                let fatigueDecrease = m.is_active ? FATIGUE_RECOVERY_ACTIVE : FATIGUE_RECOVERY_RESTING;
                let newFatigue = Math.max(0, m.fatigue - fatigueDecrease);

                // Apply starvation penalties if no food was available
                let hpPenalty = 0;
                if (starvationTriggered) {
                    hpPenalty = STARVATION_HP_DAMAGE;
                    newFatigue = Math.min(100, newFatigue + STARVATION_FATIGUE_GAIN);
                }

                // Apply natural HP recovery
                let hpToHeal = 0;
                if (m.current_hp < m.max_hp) {
                    if (currentMedicine > 0) {
                        hpToHeal = Math.min(BASE_HEAL_MEDS, m.max_hp - m.current_hp);
                        currentMedicine--;
                        medicineUsed++;
                    } else {
                        hpToHeal = Math.min(BASE_HEAL_NO_MEDS, m.max_hp - m.current_hp);
                    }
                }
                
                totalHealed += hpToHeal;
                // Calculate final HP; clamp to 1 HP during sleep starvation so they don't die instantly
                const finalHp = Math.max(1, m.current_hp + hpToHeal - hpPenalty);
                
                this.db.prepare(`
                    UPDATE mercenaries 
                    SET current_hp = ?, fatigue = ?
                    WHERE id = ?
                `).run(finalHp, newFatigue, m.id);
            });

            let spoiledCount = 0;
            const perishableItems = this.db.prepare(`
                SELECT i.id, i.item_id, i.durability 
                FROM inventory i 
                WHERE i.mercenary_id IS NULL AND i.stash_slot IS NOT NULL
            `).all();

            perishableItems.forEach(invItem => {
                const template = ItemFactory.createItem(invItem.item_id);
                if (template.stats && template.stats.spoil_days) {
                    const newDurability = invItem.durability - 1;
                    if (newDurability <= 0) {
                        this.db.prepare('DELETE FROM inventory WHERE id = ?').run(invItem.id);
                        spoiledCount++;
                    } else {
                        this.db.prepare('UPDATE inventory SET durability = ? WHERE id = ?').run(newDurability, invItem.id);
                    }
                }
            });

            // ============================================
            // FACTION TICK SYSTEM 
            // ============================================
            const simulator = new WorldSimulator(this);
            const factionLogs = simulator.processDayEnd(currentDay);

            this.statements.updateSetting.run({ key: 'medicine', value: currentMedicine });
            this.statements.updateSetting.run({ key: 'day', value: currentDay + 1 });

            return { 
                newGold, 
                day: currentDay + 1, 
                wagesPaid: totalWages, 
                medicineUsed, 
                totalHealed, 
                spoiledCount, 
                factionLogs,
                provisionsConsumed: originalFoodNeeded - foodNeeded,
                starvationTriggered,
                consumedItemsCount
            };
        })();

        return result;
    }

    setCampaignSetting(key, value) {
        this.ensureConnection();
        return this.statements.insertSetting.run({ key, value: String(value) });
    }

    createFaction(faction) {
        this.ensureConnection();
        return this.statements.insertFaction.run({
            name: faction.name,
            color: faction.color,
            archetype: faction.archetype,
            motto: faction.motto ?? null,
            type: faction.type ?? 'noble' 
        });
    }

    addItemToInventory(itemId, mercId = null) {
        this.ensureConnection();
        let stashSlot = null;
        if (mercId === null) {
            const currentItems = this.statements.getInventory.all().filter(i => i.mercenary_id === null && i.stash_slot !== null);
            const occupied = new Set(currentItems.map(i => i.stash_slot));
            stashSlot = 0;
            while (occupied.has(stashSlot)) stashSlot++;
        }

        const template = ItemFactory.createItem(itemId);
        let dur = 100;
        if (template.stats && template.stats.spoil_days) {
            dur = template.stats.spoil_days;
        }

        return this.statements.insertItem.run({ itemId, mercId, durability: dur, stashSlot });
    }

    moveItemInStash(inventoryId, newSlot) {
        this.ensureConnection();
        const draggedItem = this.db.prepare('SELECT stash_slot FROM inventory WHERE id = ?').get(inventoryId);
        if (!draggedItem) return;

        const existingItem = this.db.prepare('SELECT id FROM inventory WHERE stash_slot = ? AND mercenary_id IS NULL').get(newSlot);

        const db = this.db;
        const txn = db.transaction(() => {
            if (existingItem) {
                this.statements.updateItemSlot.run({ slot: draggedItem.stash_slot, id: existingItem.id });
            }
            this.statements.updateItemSlot.run({ slot: newSlot, id: inventoryId });
        });
        txn();
    }

    createWorldNode(node) {
        this.ensureConnection();
        const specialization = node.specializations ?? node.specialization;

        return this.statements.insertNode.run({
            type: node.type,
            name: node.name,
            x: node.x,
            y: node.y,
            faction_id: node.faction_id ?? null,
            reputation: node.reputation ?? 0,
            buy_modifier: node.buy_modifier ?? 1.0,
            sell_modifier: node.sell_modifier ?? 0.5,
            specialization: serializeSpecializations(specialization),
            attachments: node.attachments ?? 0,
            influence: node.influence ?? 0
        });
    }

    updateNodeSpecialization(nodeId, specializations) {
        this.ensureConnection();
        return this.statements.updateNodeSpecialization.run({
            id: nodeId,
            specialization: serializeSpecializations(specializations)
        });
    }

    getFactions() {
        this.ensureConnection();
        return this.statements.getAllFactions.all();
    }

    getWorldNodes() {
        this.ensureConnection();
        return this.statements.getAllNodes.all().map((node) => this._mapWorldNode(node));
    }

    getResources() {
        this.ensureConnection();
        const getSet = (k, def) => parseInt(this.statements.getSetting.get(k)?.value || def);

        const gold = getSet('gold', 0);
        const renown = getSet('renown', 0);
        let provisions = getSet('provisions', 50);
        const tools = getSet('tools', 20);
        const ammo = getSet('ammo', 100);
        const medicine = getSet('medicine', 15);

        const day = getSet('day', 1);
        const accumulated_time = parseFloat(this.statements.getSetting.get('accumulated_time')?.value || '0');

        const inventoryItems = this.statements.getInventory.all();
        inventoryItems.forEach(inv => {
            const template = ItemFactory.createItem(inv.item_id);
            if (template.stats && template.stats.provisions) {
                provisions += template.stats.provisions;
            }
        });

        const totalWages = this.statements.getWages.get().total || 0;
        const mercCount = this.statements.getAll.all().length;
        const foodPerDay = mercCount * 2;
        const partyStrength = this.getPartyStrengthSummary();

        return { gold, renown, provisions, tools, ammo, medicine, dailyWages: totalWages, foodPerDay, day, accumulated_time, partyStrength };
    }

    getPartyStrengthSummary() {
        this.ensureConnection();
        const mercenaries = this.statements.getAll.all();
        const equipmentStatsByMercenary = this._getEquipmentStatsByMercenary();
        const score = mercenaries.reduce((sum, mercenary) => {
            return sum + this._calculateMercenaryStrength(mercenary, equipmentStatsByMercenary.get(mercenary.id));
        }, 0);

        const rating = PARTY_STRENGTH.RATINGS.find((item) => score >= item.minScore) || PARTY_STRENGTH.RATINGS.at(-1);
        const progressPercent = Math.min(
            Math.round((score / PARTY_STRENGTH.PROGRESS_SCORE_CAP) * PARTY_STRENGTH.PROGRESS_PERCENT_MAX),
            PARTY_STRENGTH.PROGRESS_PERCENT_MAX
        );

        return {
            score,
            rating: rating.label,
            progressPercent,
            activeCount: mercenaries.length
        };
    }

    _getEquipmentStatsByMercenary() {
        const equippedItems = this.db.prepare('SELECT * FROM inventory WHERE mercenary_id IS NOT NULL AND equip_slot IS NOT NULL').all();
        const statsByMercenary = new Map();

        equippedItems.forEach((inventoryItem) => {
            const template = ItemFactory.createItem(inventoryItem.item_id);
            const currentStats = statsByMercenary.get(inventoryItem.mercenary_id) || { attack: 0, defense: 0 };

            currentStats.attack += template.stats?.attack || 0;
            currentStats.defense += template.stats?.defense || 0;

            statsByMercenary.set(inventoryItem.mercenary_id, currentStats);
        });

        return statsByMercenary;
    }

    _calculateMercenaryStrength(mercenary, equipmentStats = { attack: 0, defense: 0 }) {
        const levelScore = (mercenary.level || PARTY_STRENGTH.DEFAULT_LEVEL) * PARTY_STRENGTH.LEVEL_WEIGHT;
        const attributeScore =
            (mercenary.str || PARTY_STRENGTH.DEFAULT_ATTRIBUTE)
            + (mercenary.int || PARTY_STRENGTH.DEFAULT_ATTRIBUTE)
            + (mercenary.spd || PARTY_STRENGTH.DEFAULT_ATTRIBUTE);
        const rawScore = levelScore + attributeScore + equipmentStats.attack + equipmentStats.defense;

        const maxHp = Math.max(mercenary.max_hp || PARTY_STRENGTH.DEFAULT_MAX_HP, PARTY_STRENGTH.MIN_MAX_HP);
        const currentHp = Math.max(0, mercenary.current_hp ?? maxHp);
        const healthPenaltyRatio = (1 - Math.min(currentHp / maxHp, 1)) * PARTY_STRENGTH.HEALTH_PENALTY_MAX_RATIO;
        const fatigueRatio = Math.min((mercenary.fatigue || 0) / PARTY_STRENGTH.FATIGUE_MAX, 1);
        const fatiguePenaltyRatio = fatigueRatio * PARTY_STRENGTH.FATIGUE_PENALTY_MAX_RATIO;
        const readinessRatio = Math.max(
            PARTY_STRENGTH.MIN_READINESS_RATIO,
            1 - healthPenaltyRatio - fatiguePenaltyRatio
        );

        return Math.round(rawScore * readinessRatio);
    }

    updateGold(amount) {
        this.ensureConnection();
        const delta = Number(amount);
        if (!Number.isFinite(delta)) throw new Error("Invalid Gold Amount");

        const current = this.getResources().gold;
        const newAmount = current + delta;
        if (delta < NO_GOLD_DELTA && newAmount < MIN_GOLD_BALANCE) {
            throw new Error("Insufficient Gold");
        }

        this.statements.updateSetting.run({ key: 'gold', value: newAmount });
        return newAmount;
    }

    updateRenown(amount) {
        this.ensureConnection();
        const delta = Number(amount);
        if (!Number.isFinite(delta)) throw new Error("Invalid Renown Amount");

        const current = this.getResources().renown;
        const newAmount = Math.max(0, current + delta);
        this.statements.updateSetting.run({ key: 'renown', value: newAmount });
        return newAmount;
    }

    getAllMercenaries() {
        this.ensureConnection();
        return this.statements.getAll.all();
    }

    addMercenary(merc) {
        this.ensureConnection();
        return this.statements.insert.run({
            name: merc.name,
            role: merc.role || 'Recruit',
            level: merc.level || 1,
            str: merc.str || 10,
            int: merc.int || 10,
            spd: merc.spd || 10,
            max_hp: merc.max_hp || 100,
            current_hp: merc.current_hp || 100,
            wage: merc.wage || 10
        });
    }

    _mapWorldNode(row) {
        if (!row) return row;

        const {
            faction_name,
            faction_color,
            faction_archetype,
            faction_motto,
            ...node
        } = row;

        node.faction = faction_name
            ? {
                id: node.faction_id,
                name: faction_name,
                color: faction_color,
                archetype: faction_archetype,
                motto: faction_motto
            }
            : null;

        node.specializations = normalizeSpecializations(node.specialization);
        node.specialization = formatSpecializations(node.specializations);
        node.influence = Number(node.influence) || 0;

        return node;
    }

    updateNodeDevelopment(nodeId, progress, newType, newEvent, buyMod, sellMod, populationTier = 1, remainingReqs = '{}') {
        this.ensureConnection();
        if (newEvent === null) {
            this.db.prepare(`
                UPDATE world_nodes 
                SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?, population_tier = ?, expansion_reqs = ?
                WHERE id = ?
            `).run(progress, newType, newEvent, buyMod, sellMod, populationTier, remainingReqs, nodeId);
        } else {
            this.db.prepare(`
                UPDATE world_nodes 
                SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?, population_tier = ?
                WHERE id = ?
            `).run(progress, newType, newEvent, buyMod, sellMod, populationTier, nodeId);
        }
    }

    spawnColony(parentNode, specialization = null) {
        this.ensureConnection();
        const allNodes = this.statements.getAllNodes.all();
        
        const radius = 150;
        let attempt = 0;
        let newX, newY;
        let valid = false;
        
        while(attempt < 50 && !valid) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * radius; 
            newX = parentNode.x + Math.cos(angle) * dist;
            newY = parentNode.y + Math.sin(angle) * dist;
            
            if (newX < 50 || newX > 1950 || newY < 50 || newY > 1450) {
                attempt++;
                continue;
            }
            
            valid = true;
            for (const n of allNodes) {
                const d = Math.hypot(n.x - newX, n.y - newY);
                if (d < 70) { 
                    valid = false;
                    break;
                }
            }
            attempt++;
        }
        
        if (!valid) return null; 
        
        const usedNames = new Set(allNodes.map(n => n.name));
        const availableNames = SETTLEMENT_NAMES.filter(n => !usedNames.has(n));
        
        let newName;
        if (availableNames.length > 0) {
            newName = availableNames[Math.floor(Math.random() * availableNames.length)];
        } else {
            const prefixes = ['New', 'North', 'South', 'East', 'West'];
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            newName = `${prefix} ${parentNode.name}`;
        }
        
        const info = this.statements.insertNode.run({
            type: 'Hamlet',
            name: newName,
            x: Math.round(newX),
            y: Math.round(newY),
            faction_id: parentNode.faction_id,
            buy_modifier: 1.2, 
            sell_modifier: 0.85,
            specialization: serializeSpecializations(specialization),
            attachments: 0,
            influence: 0
        });
        
        return { id: info.lastInsertRowid, name: newName };
    }

    logTradeVolume(nodeId, amount) {
        this.ensureConnection();
        const node = this.getNodeById(nodeId);
        const tierData = SETTLEMENT_TIERS[node?.type];

        if (canTrackSettlementGrowth(node, tierData)) {
            let reqs = {};
            try { reqs = JSON.parse(node.expansion_reqs || '{}'); } catch(e){}

            reqs.trade = (reqs.trade || 0) + amount;

            let readyForBoom = ((reqs.contracts || 0) >= tierData.growthReqs.contracts) && (reqs.trade >= tierData.growthReqs.trade);

            this.db.prepare('UPDATE world_nodes SET expansion_reqs = ? WHERE id = ?').run(JSON.stringify(reqs), node.id);

            if (readyForBoom) {
                // Dynamic check for expansion vs upgrade
                const eventType = this._shouldTriggerExpansion(node) ? 'settlement_expansion' : 'building_boom';
                this.triggerSettlementGrowthEvent(node.id, eventType);
            }
        }
    }

    _triggerRandomSessionEvent(focusMinutes, logs, foundLoot, activeMercs, ratio) {
        const MIN_EVENT_DURATION_MINS = 5;
        const EVENT_TRIGGER_CHANCE = 0.35;
        const OUT_OF_BOUNDS_RESTORE_XP = 35;
        const DEFAULT_REMEDY_HEAL = 15;
        const DEFAULT_REMEDY_FATIGUE = 20;

        if (focusMinutes < MIN_EVENT_DURATION_MINS || activeMercs.length === 0) return;

        // 35% chance to trigger a random event
        if (Math.random() > EVENT_TRIGGER_CHANCE) return;

        const events = [
            // Event 1: Abandoned Carriage
            () => {
                const goldFound = Math.floor(50 + Math.random() * 100);
                this.updateGold(goldFound);
                
                const tools = parseInt(this.statements.getSetting.get('tools')?.value || '20');
                this.setCampaignSetting('tools', tools + 10);

                logs.push(`📦 [Event] You discover an abandoned carriage in a ditch. Inside, you salvage some supplies (+10 Tools) and a coin purse (+${goldFound} crowns).`);
            },
            // Event 2: Travelling Merchant
            () => {
                const newItem = ItemFactory.getRandomItem();
                this.addItemToInventory(newItem.id);
                foundLoot.push(newItem);
                logs.push(`🎒 [Event] A travelling peddler crosses paths with your company. Impressed by your presence, he gifts you an item: ${newItem.name}`);
            },
            // Event 3: Wandering Priest
            () => {
                activeMercs.forEach(merc => {
                    this.db.prepare('UPDATE mercenaries SET current_hp = MIN(max_hp, current_hp + ?), fatigue = MAX(0, fatigue - ?) WHERE id = ?')
                        .run(DEFAULT_REMEDY_HEAL, DEFAULT_REMEDY_FATIGUE, merc.id);
                });
                logs.push(`⛪ [Event] A wandering priest blesses your company. All active mercenaries heal 15 HP and recover 20 fatigue.`);
            },
            // Event 4: Local Legend
            () => {
                const RENOWN_BONUS = 5;
                this.updateRenown(RENOWN_BONUS);
                logs.push(`📣 [Event] Word of your company's growing competence spreads. Gained +5 Renown!`);
            },
            // Event 5: Beast Ambush
            () => {
                const targetMerc = activeMercs[Math.floor(Math.random() * activeMercs.length)];
                const damage = Math.floor(5 + Math.random() * 10);
                this.statements.damageMercenary.run({ damage, id: targetMerc.id });
                
                this.addItemToInventory('strange_meat');
                const strangeMeatItem = ItemFactory.createItem('strange_meat');
                foundLoot.push(strangeMeatItem);

                logs.push(`⚔️ [Event] While breaking camp, a wild beast ambushes the company! ${targetMerc.name} takes ${damage} damage, but the beast is slain. Salvaged: Strange Meat.`);
            },
            // Event 6: Wandering Scholar
            () => {
                activeMercs.forEach(merc => {
                    this.db.prepare('UPDATE mercenaries SET xp = xp + ? WHERE id = ?').run(OUT_OF_BOUNDS_RESTORE_XP, merc.id);
                });
                logs.push(`📖 [Event] A traveling scholar shares historical maps and tactics with your group. All active mercenaries gain +35 XP!`);
            }
        ];

        // Trigger a random event from the list
        const selectedEvent = events[Math.floor(Math.random() * events.length)];
        selectedEvent();
    }

    _calculateInitialDevelopmentProgress(node) {
        const specializations = normalizeSpecializations(node?.specializations ?? node?.specialization);
        let count = 0;
        if (specializations.includes('Peat Pit')) count++;
        if (specializations.includes('Lumber Camp')) count++;
        if (specializations.includes('Copper Mine')) count++;

        const tierInfo = SETTLEMENT_TIERS[node.type] || { growthReqs: { materials: 10 } };
        const maxProg = tierInfo.growthReqs ? tierInfo.growthReqs.materials : 10;

        if (count === 1) {
            return Math.floor(maxProg / 3);
        } else if (count === 2) {
            return Math.floor((maxProg * 2) / 3);
        } else if (count >= 3) {
            return maxProg;
        }
        return 0;
    }

    triggerSettlementGrowthEvent(nodeId, eventType) {
        const node = this.getNodeById(nodeId);
        if (!node) return;

        const initialProgress = this._calculateInitialDevelopmentProgress(node);
        const tierInfo = SETTLEMENT_TIERS[node.type] || { growthReqs: { materials: 10 } };
        const maxProg = tierInfo.growthReqs ? tierInfo.growthReqs.materials : 10;

        this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ?, development_progress = ? WHERE id = ?')
            .run(eventType, 999, initialProgress, node.id);

        if (initialProgress >= maxProg) {
            this.logNodeHistory(node.id, `With all three local building material specializations active, ${node.name} self-funded and completed its expansion project autonomously!`, 'world');
            this.incrementNodeDevelopment(node.id, 0); // Trigger upgrade resolution immediately
        } else {
            let msg = `Driven by prosperity, ${node.name} has initiated a ${eventType === 'building_boom' ? 'building boom' : 'settlement expansion'}!`;
            if (initialProgress > 0) {
                msg += ` Leveraging local materials, they have already completed ${initialProgress}/${maxProg} of the required work.`;
            } else {
                msg += ` They require building materials from external traders to progress.`;
            }
            this.logNodeHistory(node.id, msg, 'world');
        }
    }

    _chooseFirstSpecializationForNode(node, materialItemId) {
        const currentSpecializations = normalizeSpecializations(node?.specializations ?? node?.specialization);
        if (currentSpecializations.length > 0) return null;

        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            node,
            materialItemId,
            currentSpecializations
        );
    }

    _chooseColonySpecialization(parentNode, materialItemId) {
        const parentSpecializations = normalizeSpecializations(parentNode?.specializations ?? parentNode?.specialization);
        return SettlementSpecializationPlanner.chooseBuildableSpecialization(
            parentNode,
            materialItemId,
            parentSpecializations
        );
    }

    incrementNodeDevelopment(nodeId, increment, itemId = null) {
        const node = this.getNodeById(nodeId);
        if (!node || !node.current_event) return null;

        const tierInfo = SETTLEMENT_TIERS[node.type] || { growthReqs: { materials: 10 } };
        const maxProg = tierInfo.growthReqs ? tierInfo.growthReqs.materials : 10;

        let newProgress = (node.development_progress || 0) + increment;
        let newType = node.type;
        let newEvent = node.current_event;
        let buyMod = node.buy_modifier;
        let sellMod = node.sell_modifier;
        let newPopulationTier = node.population_tier || 1;
        let remainingReqs = '{}';

        let upgraded = false;
        let popGrown = false;
        let specializationBuilt = null;
        let oldPopLabel = "";
        let newPopLabel = "";
        let spawnedColonyName = null;

        const POPULATION_LABELS = {
            1: "Low",
            2: "Medium",
            3: "High",
            4: "Very High",
            5: "Overpopulated"
        };

        if (newProgress >= maxProg) {
            newProgress = 0;
            newEvent = null;

            // Try to build a specialization first
            specializationBuilt = this._chooseFirstSpecializationForNode(node, itemId);

            if (specializationBuilt) {
                this.updateNodeSpecialization(node.id, [specializationBuilt]);
            } else if (newPopulationTier < 5) { // 5 is MAX_POPULATION_TIER
                oldPopLabel = POPULATION_LABELS[newPopulationTier];
                newPopulationTier += 1;
                newPopLabel = POPULATION_LABELS[newPopulationTier];
                popGrown = true;
            } else {
                const nextTier = SETTLEMENT_UPGRADE_PATH[node.type];
                if (nextTier) {
                    newType = nextTier;
                    newPopulationTier = 1;
                    upgraded = true;
                    
                    const nextTierInfo = SETTLEMENT_TIERS[nextTier];
                    if (nextTierInfo) {
                        buyMod = nextTierInfo.buyMult;
                        sellMod = nextTierInfo.sellMult;
                    }
                } else {
                    newPopulationTier = 5;
                }
            }

            // Calculate surplus roll-over requirements
            let reqs = {};
            try { reqs = JSON.parse(node.expansion_reqs || '{}'); } catch(e){}
            if (tierInfo.growthReqs) {
                if (reqs.contracts !== undefined) {
                    reqs.contracts = Math.max(0, reqs.contracts - (tierInfo.growthReqs.contracts || 0));
                }
                if (reqs.trade !== undefined) {
                    reqs.trade = Math.max(0, reqs.trade - (tierInfo.growthReqs.trade || 0));
                }
            }
            remainingReqs = JSON.stringify(reqs);
        }

        // If it was a settlement_expansion, we might spawn a colony on completion
        if (node.current_event === 'settlement_expansion' && newProgress === 0 && !specializationBuilt) {
            // Pick colony specialization
            const colonySpecialization = this._chooseColonySpecialization(node, itemId);
            const spawnedNode = this.spawnColony(node, colonySpecialization);
            if (spawnedNode) {
                spawnedColonyName = spawnedNode.name;
                this.logNodeHistory(node.id, `Established the new settlement of ${spawnedNode.name} with a ${colonySpecialization ? 'focus on ' + colonySpecialization : 'focus on local resources'}.`, 'world');
                this.logNodeHistory(spawnedNode.id, `Founded as an outpost by ${node.name}.`, 'world');
            }
        }

        this.updateNodeDevelopment(node.id, newProgress, newType, newEvent, buyMod, sellMod, newPopulationTier, remainingReqs);

        // Logging history
        if (newProgress === 0) {
            if (specializationBuilt) {
                this.logNodeHistory(node.id, `The construction finished! ${node.name} built a ${specializationBuilt}, giving the settlement its first local specialization.`, 'world');
            } else if (popGrown) {
                this.logNodeHistory(node.id, `The construction finished! The settlement's population has grown from ${oldPopLabel} to ${newPopLabel}.`, 'world');
            } else if (upgraded) {
                this.logNodeHistory(node.id, `The construction finished! The settlement has grown into a ${newType}.`, 'world');
            } else if (node.current_event === 'settlement_expansion') {
                this.logNodeHistory(node.id, `The construction finished! ${node.name} has expanded its borders.`, 'world');
            } else {
                this.logNodeHistory(node.id, `The construction finished! The settlement continues to thrive at maximum capacity.`, 'world');
            }
        }

        return {
            upgraded,
            popGrown,
            specializationBuilt,
            spawnedColonyName,
            newProgress,
            maxProg
        };
    }

    _shouldTriggerExpansion(node) {
        const nextType = SETTLEMENT_UPGRADE_PATH[node.type];
        
        // If there is no next upgrade type (e.g. Empire, Stronghold), they must expand
        if (!nextType) return true;

        const expandableTypes = ['City', 'City-State', 'Province', 'Kingdom', 'High Kingdom'];
        if (expandableTypes.includes(node.type)) {
            // Large settlements at Medium population or higher have a 20% chance
            // of dispatching colonists to found an allied outpost.
            const popTier = node.population_tier || 1;
            if (popTier >= 2) {
                return Math.random() < 0.20;
            }
        }

        return false;
    }

    _createUndeadDefenseContract(originNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, 30);
        const isSiege = originNode.current_event === 'undead_siege';
        const title = `Defend ${originNode.name} against Undead ${isSiege ? 'Siege' : 'Horde'}`;
        const desc = isSiege
            ? `A massive army of the dead, orchestrated by a dark Necromancer, has surrounded ${originNode.name}. Lift the siege before the walls are breached.`
            : `A mindless horde of shambling zombies and skeleton thralls has struck ${originNode.name}. Take up arms and defend the survivors!`;

        return {
            node_id: originNode.id,
            target_node_id: null,
            contract_type: 'undead_defense',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, 2.0)
        };
    }

    _createUndeadPurgeContract(originNode, targetNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, 45);
        const title = `Cleanse ${targetNode.name}`;
        const desc = `The restless dead are leaking out of the dark chambers of ${targetNode.name}. Venture deep into the crypts, slay the ancient horrors, and seal the graves forever.`;

        return {
            node_id: originNode.id,
            target_node_id: targetNode.id,
            contract_type: 'undead_purge',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, 1.5)
        };
    }

    _createNecromancerHuntContract(originNode, targetNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, 60);
        const title = `Slay Necromancer in ${targetNode.name}`;
        const desc = `A dark sorcerer is weaving foul rituals from the shadow of ${targetNode.name}. Infiltrate the ruins, bypass their undead guardians, and cut down the necromancer.`;

        return {
            node_id: originNode.id,
            target_node_id: targetNode.id,
            contract_type: 'necromancer_hunt',
            title: title,
            desc: desc,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, 3.0)
        };
    }
}
