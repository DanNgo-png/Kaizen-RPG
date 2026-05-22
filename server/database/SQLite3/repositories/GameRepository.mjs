import { getActiveGameDB, loadGameDatabase } from '../connection.mjs';
import { ItemFactory } from '../../../factories/ItemFactory.mjs';
import { SETTLEMENT_EVENTS, SETTLEMENT_NAMES, SETTLEMENT_TIERS, SETTLEMENT_UPGRADE_PATH } from '../../../data/GameDataConstants.mjs';
import { WorldSimulator } from '../../../services/simulation/WorldSimulator.mjs';

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
    BRIGAND_CAMP: 'brigand_camp'
});

const CONTRACT_REPUTATION = Object.freeze({
    MIN_REWARD: 2,
    MINUTES_PER_POINT: 10,
    AMBUSHED_TRADE_ROUTE_CARAVAN_BONUS: 5
});

const CONTRACT_GENERATION = Object.freeze({
    BOARD_SIZE: 3,
    MINUTE_STEP: 5,
    BRIGAND_CAMP_MIN_MINUTES: 45,
    GOLD_PER_MINUTE: 2.5,
    GOLD_VARIANCE_MIN: 0.8,
    GOLD_VARIANCE_RANGE: 0.4,
    BRIGAND_CAMP_GOLD_MULTIPLIER: 1.85
});

const CONTRACT_LOOT = Object.freeze({
    DEFAULT_CHANCE: 0.20,
    COMBAT_CHANCE: 0.65,
    BRIGAND_CAMP_CHANCE: 0.85,
    MIN_ROLLS: 1,
    MINUTES_PER_ROLL: 25,
    BRIGAND_CAMP_EXTRA_ROLLS: 2
});

const CONTRACT_EVENT_DURATION = Object.freeze({
    WELL_SUPPLIED_DAYS: 5
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
    'Stolen Stronghold'
]);

const GROWTH_PROGRESS_COMPATIBLE_EVENTS = Object.freeze([
    SETTLEMENT_EVENT_ID.WELL_SUPPLIED
]);

const CARAVAN_CONTRACT_KEYWORDS = Object.freeze(['caravan', 'escort', 'delivery']);
const BRIGAND_CAMP_CONTRACT_KEYWORDS = Object.freeze(['brigand camp', 'bandit camp', 'destroy']);
const COMBAT_CONTRACT_KEYWORDS = Object.freeze(['hunt', 'clear', 'explore']);
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
                INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier, specialization, attachments) 
                VALUES (@type, @name, @x, @y, @faction_id, @reputation, @buy_modifier, @sell_modifier, @specialization, @attachments)
            `),
            getAllNodes: this.db.prepare(WORLD_NODE_SELECT),

            getNodeById: this.db.prepare(`${WORLD_NODE_SELECT} WHERE world_nodes.id = ?`),
            updateNodeShop: this.db.prepare(`UPDATE world_nodes SET shop_inventory = @inv, last_restock_day = @lastRestock, next_trade_restock_day = @nextTrade WHERE id = @id`),

            updateReputation: this.db.prepare(`UPDATE world_nodes SET reputation = COALESCE(reputation, 0) + ? WHERE id = ?`),

            togglePin: this.db.prepare(`UPDATE world_nodes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?`),
            getNodeHistory: this.db.prepare(`SELECT * FROM node_history WHERE node_id = ? ORDER BY day DESC, id DESC`),
            insertNodeHistory: this.db.prepare(`INSERT INTO node_history (node_id, day, event_text, event_type) VALUES (@node_id, @day, @text, @type)`),

            getSetting: this.db.prepare(`SELECT value FROM campaign_settings WHERE key = ?`),
            updateSetting: this.db.prepare(`UPDATE campaign_settings SET value = @value WHERE key = @key`),

            getActiveContract: this.db.prepare(`${CONTRACT_SELECT} WHERE contracts.is_active = 1 LIMIT 1`),
            getNodeContracts: this.db.prepare(`${CONTRACT_SELECT} WHERE contracts.node_id = ? AND contracts.is_completed = 0`),
            insertContract: this.db.prepare(`
                INSERT INTO contracts (node_id, target_node_id, contract_type, title, description, required_minutes, gold_reward)
                VALUES (@node_id, @target_node_id, @contract_type, @title, @desc, @req_mins, @gold)
            `),
            setActiveContract: this.db.prepare(`UPDATE contracts SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END`),
            addContractProgress: this.db.prepare(`UPDATE contracts SET progress_minutes = progress_minutes + @progress WHERE id = @id`),
            setContractProgress: this.db.prepare(`UPDATE contracts SET progress_minutes = @progress WHERE id = @id`),
            completeContract: this.db.prepare(`UPDATE contracts SET is_completed = 1, is_active = 0 WHERE id = @id`),
            abortContract: this.db.prepare(`DELETE FROM contracts WHERE id = ?`),

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
        return contracts;
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
        const campTarget = this._findNearestBrigandCamp(originNode);
        if (campTarget) {
            contracts.push(this._createBrigandCampContract(originNode, campTarget, possibleMins));
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

    _createBrigandCampContract(originNode, campNode, possibleMins) {
        const reqMins = this._pickContractMinutes(possibleMins, CONTRACT_GENERATION.BRIGAND_CAMP_MIN_MINUTES);

        return {
            node_id: originNode.id,
            target_node_id: campNode.id,
            contract_type: CONTRACT_TYPE.BRIGAND_CAMP,
            title: `Destroy Brigand Camp: ${campNode.name}`,
            desc: `${originNode.name} wants ${campNode.name} cleared from the roads. The pay is rich, and the camp's stores should be worth plundering.`,
            req_mins: reqMins,
            gold: this._calculateContractGold(reqMins, CONTRACT_GENERATION.BRIGAND_CAMP_GOLD_MULTIPLIER)
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

    _findNearestBrigandCamp(originNode) {
        if (!originNode) return null;

        const targetTypes = ['Bandit Camp', 'Bandit Outpost', 'Bandit Stronghold', 'Stolen Stronghold'];
        return this.statements.getAllNodes.all()
            .filter((node) => targetTypes.includes(node.type))
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
        return (node.reputation || 0) > -50;
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

    getActiveContract() {
        this.ensureConnection();
        return this.statements.getActiveContract.get();
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

        const contractRepReward = Math.max(
            CONTRACT_REPUTATION.MIN_REWARD,
            Math.floor(activeContract.required_minutes / CONTRACT_REPUTATION.MINUTES_PER_POINT)
        );
        if (beneficiaryNode) {
            this.updateNodeReputation(beneficiaryNode.id, contractRepReward);
            this.logNodeHistory(beneficiaryNode.id, `${companyName} completed a contract: "${activeContract.title}".`, 'player');
        }

        const bonusRepReward = this._applyCaravanContractOutcome(activeContract, beneficiaryNode, companyName);

        const campDestroyedLoot = this._handleCampDestruction(activeContract, targetNode || originNode, beneficiaryNode, companyName);

        const refreshedBeneficiaryNode = beneficiaryNode ? this.getNodeById(beneficiaryNode.id) : null;
        this._trackSettlementContractGrowth(refreshedBeneficiaryNode);

        const beneficiaryLabel = beneficiaryNode?.name || 'settlement';
        const logs = [
            `📜 Contract Completed: ${activeContract.title}`,
            `💰 Earned ${activeContract.gold_reward} crowns!`,
            `Reputation with ${beneficiaryLabel} increased by ${contractRepReward}.`
        ];

        if (bonusRepReward > 0) {
            logs.push(`Bonus reputation for restoring trade routes: +${bonusRepReward}.`);
        }

        // --- LOOT LOGIC ---
        const foundLoot = [];
        let lootChance = CONTRACT_LOOT.DEFAULT_CHANCE;

        if (this._isCombatLootContract(activeContract, contractType)) {
            lootChance = CONTRACT_LOOT.COMBAT_CHANCE;
        }

        if (contractType === CONTRACT_TYPE.BRIGAND_CAMP) {
            lootChance = CONTRACT_LOOT.BRIGAND_CAMP_CHANCE;
        }

        // Catch the guaranteed loot if we destroyed a camp
        if (campDestroyedLoot) {
            foundLoot.push(campDestroyedLoot);
            activeContract._campDestroyedLoot = campDestroyedLoot;
            logs.push(`🔥 Camp Destroyed! You found hidden stash: ${activeContract._campDestroyedLoot.name}`);
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

        return { contract: activeContract, logs, loot: foundLoot };
    }

    _resolveContractType(contract) {
        if ([CONTRACT_TYPE.CARAVAN, CONTRACT_TYPE.BRIGAND_CAMP].includes(contract.contract_type)) {
            return contract.contract_type;
        }

        if (contractTitleHasKeyword(contract.title, CARAVAN_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.CARAVAN;
        }

        if (contractTitleHasKeyword(contract.title, BRIGAND_CAMP_CONTRACT_KEYWORDS)) {
            return CONTRACT_TYPE.BRIGAND_CAMP;
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

        if (contractType !== CONTRACT_TYPE.BRIGAND_CAMP && !isLegacyCampContract) {
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
            const eventType = SETTLEMENT_UPGRADE_PATH[growthNode.type] ? 'building_boom' : 'settlement_expansion';
            this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ?, development_progress = 0 WHERE id = ?')
                .run(eventType, 999, growthNode.id);
            this.logNodeHistory(growthNode.id, `Thanks to safe roads and bustling trade, ${growthNode.name} is preparing to expand! They are requesting building materials.`, 'world');
        }
    }

    _isCombatLootContract(contract, contractType = this._resolveContractType(contract)) {
        return contractType === CONTRACT_TYPE.BRIGAND_CAMP
            || contractTitleHasKeyword(contract.title, COMBAT_CONTRACT_KEYWORDS);
    }

    _countLootRolls(contract, contractType) {
        const baseRolls = Math.max(
            CONTRACT_LOOT.MIN_ROLLS,
            Math.floor(contract.required_minutes / CONTRACT_LOOT.MINUTES_PER_ROLL)
        );

        if (contractType === CONTRACT_TYPE.BRIGAND_CAMP) {
            return baseRolls + CONTRACT_LOOT.BRIGAND_CAMP_EXTRA_ROLLS;
        }

        return baseRolls;
    }

    _applyCaravanContractOutcome(contract, node, companyName) {
        if (this._resolveContractType(contract) !== CONTRACT_TYPE.CARAVAN || !node) {
            return 0;
        }

        let bonusRepReward = 0;

        if (node?.current_event === SETTLEMENT_EVENT_ID.AMBUSHED_TRADE_ROUTES) {
            bonusRepReward = CONTRACT_REPUTATION.AMBUSHED_TRADE_ROUTE_CARAVAN_BONUS;
            this.updateNodeReputation(node.id, bonusRepReward);
            this.logNodeHistory(
                node.id,
                `${companyName} reopened the ambushed trade routes with a successful caravan escort, earning extra local trust.`,
                'player'
            );
        }

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

        return bonusRepReward;
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

            logs.push(`🌙 A day passed. Paid ${dayResult.wagesPaid}g in wages.`);
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
                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

                    if (Math.random() < 0.20) {
                        const rawDamage = Math.floor(Math.random() * 8 * ratio) + 2;
                        const defMitigation = Math.floor(merc.totalDefense / 4); 
                        const finalDamage = Math.max(0, rawDamage - defMitigation);
                        
                        if (finalDamage > 0) {
                            this.statements.damageMercenary.run({ damage: finalDamage, id: merc.id });
                            logs.push(`⚔️ ${merc.name} took ${finalDamage} damage fending off a wandering beast.`);
                        }
                    }
                });

                if (Math.random() < 0.3) {
                    logs.push(`🏕️ The party encountered travelers on the road during the contract.`);
                }

                const attackLootBonus = (partyTotalAttack / 100) * 0.10; 
                const lootChance = 0.30 + attackLootBonus;
                const rolls = Math.max(1, Math.floor(focusMinutes / 15)); 

                for(let i=0; i<rolls; i++) rollForLoot(lootChance);

                if (logs.length === 0 && daysPassed === 0) logs.push(`🛡️ The party made safe progress on: ${activeContract.title}`);

            } else if (isDelving) {
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

                const baseThreatPerMinute = 5;
                const dungeonThreat = focusMinutes * baseThreatPerMinute * ratio;
                const dangerMultiplier = Math.max(0.1, dungeonThreat / Math.max(1, totalPartyPower));
                
                const BASE_DAMAGE_CHANCE = 0.40;
                const adjustedDamageChance = Math.min(0.80, BASE_DAMAGE_CHANCE * dangerMultiplier);
                const tankProtectionBonus = tankCount * 0.10;

                activeMercs.forEach(merc => {
                    const mercXp = Math.floor(baseXpAmount * (1 + merc.xpBonus));
                    const mercFatigue = Math.floor(focusMinutes / 5) + Math.floor(merc.fatiguePenalty / 2);
                    this.statements.updateMercXpFatigue.run({ amount: mercXp, fatigue: mercFatigue, id: merc.id });

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
                    if (rollForLoot(baseLootChance)) itemsLooted++;
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
                // --- NEW IDLE / RESTING STATE (Standard Campaign) ---
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
            const currentDay = parseInt(this.statements.getSetting.get('day').value);
            const currentGold = parseInt(this.statements.getSetting.get('gold').value);
            let currentMedicine = parseInt(this.statements.getSetting.get('medicine').value || '0');
            const totalWages = this.statements.getWages.get().total || 0;

            const newGold = currentGold - totalWages;
            this.statements.updateSetting.run({ key: 'gold', value: newGold });
            this.statements.insertLedger.run({ day: currentDay, desc: 'Daily Wages', amount: -totalWages });

            const allMercs = this.db.prepare('SELECT * FROM mercenaries').all();
            let medicineUsed = 0;
            let totalHealed = 0;

            allMercs.forEach(m => {
                let fatigueDecrease = m.is_active ? -10 : 30;
                let newFatigue = Math.max(0, m.fatigue - fatigueDecrease);

                let hpToHeal = 0;
                if (m.current_hp < m.max_hp) {
                    if (currentMedicine > 0) {
                        hpToHeal = Math.min(25, m.max_hp - m.current_hp);
                        currentMedicine--;
                        medicineUsed++;
                    } else {
                        hpToHeal = Math.min(5, m.max_hp - m.current_hp);
                    }
                }
                
                totalHealed += hpToHeal;
                
                this.db.prepare(`
                    UPDATE mercenaries 
                    SET current_hp = current_hp + ?, fatigue = ?
                    WHERE id = ?
                `).run(hpToHeal, newFatigue, m.id);
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

            return { newGold, day: currentDay + 1, wagesPaid: totalWages, medicineUsed, totalHealed, spoiledCount, factionLogs };
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
        return this.statements.insertNode.run({
            type: node.type,
            name: node.name,
            x: node.x,
            y: node.y,
            faction_id: node.faction_id ?? null,
            reputation: node.reputation ?? 0,
            buy_modifier: node.buy_modifier ?? 1.0,
            sell_modifier: node.sell_modifier ?? 0.5,
            specialization: node.specialization ?? null,
            attachments: node.attachments ?? 0
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

        return node;
    }

    updateNodeDevelopment(nodeId, progress, newType, newEvent, buyMod, sellMod, populationTier = 1) {
        this.ensureConnection();
        if (newEvent === null) {
            this.db.prepare(`
                UPDATE world_nodes 
                SET development_progress = ?, type = ?, current_event = ?, buy_modifier = ?, sell_modifier = ?, population_tier = ?, expansion_reqs = '{}'
                WHERE id = ?
            `).run(progress, newType, newEvent, buyMod, sellMod, populationTier, nodeId);
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
            specialization: specialization,
            attachments: 0
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
                const eventType = SETTLEMENT_UPGRADE_PATH[node.type] ? 'building_boom' : 'settlement_expansion';
                this.db.prepare('UPDATE world_nodes SET current_event = ?, event_expiration = ?, development_progress = 0 WHERE id = ?')
                    .run(eventType, 999, node.id);
                this.logNodeHistory(node.id, `Driven by booming commerce and safe roads, ${node.name} is preparing to expand! They are requesting building materials.`, 'world');
            }
        }
    }
}