import {
    CONTRACT_SELECT,
    CONTRACT_TYPE,
    WORLD_NODE_SELECT
} from './GameRepositoryConstants.mjs';

export function prepareGameStatements(db) {
    return {
        getAll: db.prepare('SELECT * FROM mercenaries WHERE is_active = 1'),
        getById: db.prepare('SELECT * FROM mercenaries WHERE id = ?'),
        insert: db.prepare(`
            INSERT INTO mercenaries (name, role, level, xp, str, int, spd, daily_wage, is_active, max_hp, current_hp) 
            VALUES (@name, @role, @level, 0, @str, @int, @spd, @wage, 1, @max_hp, @current_hp)
        `),
        addXp: db.prepare('UPDATE mercenaries SET xp = xp + @amount, fatigue = fatigue + @fatigue WHERE is_active = 1'),
        updateMercXpFatigue: db.prepare('UPDATE mercenaries SET xp = xp + @amount, fatigue = MAX(0, fatigue + @fatigue) WHERE id = @id'),
        reduceFatigue: db.prepare('UPDATE mercenaries SET fatigue = MAX(0, fatigue - @amount) WHERE is_active = 1'),
        damageMercenary: db.prepare('UPDATE mercenaries SET current_hp = MAX(0, current_hp - @damage) WHERE id = @id'),
        getWages: db.prepare('SELECT SUM(daily_wage) as total FROM mercenaries'),
        insertLedger: db.prepare('INSERT INTO company_ledger (day, description, amount) VALUES (@day, @desc, @amount)'),

        insertNode: db.prepare(`
            INSERT INTO world_nodes (type, name, x, y, faction_id, reputation, buy_modifier, sell_modifier, specialization, attachments, influence) 
            VALUES (@type, @name, @x, @y, @faction_id, @reputation, @buy_modifier, @sell_modifier, @specialization, @attachments, @influence)
        `),
        getAllNodes: db.prepare(WORLD_NODE_SELECT),
        getNodeById: db.prepare(`${WORLD_NODE_SELECT} WHERE world_nodes.id = ?`),
        updateNodeShop: db.prepare('UPDATE world_nodes SET shop_inventory = @inv, last_restock_day = @lastRestock, next_trade_restock_day = @nextTrade WHERE id = @id'),
        updateReputation: db.prepare('UPDATE world_nodes SET reputation = COALESCE(reputation, 0) + ? WHERE id = ?'),
        updateNodeInfluence: db.prepare('UPDATE world_nodes SET influence = MAX(0, COALESCE(influence, 0) + @amount) WHERE id = @id'),
        togglePin: db.prepare('UPDATE world_nodes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?'),
        getNodeHistory: db.prepare('SELECT * FROM node_history WHERE node_id = ? ORDER BY day DESC, id DESC'),
        insertNodeHistory: db.prepare('INSERT INTO node_history (node_id, day, event_text, event_type) VALUES (@node_id, @day, @text, @type)'),
        getAllHistory: db.prepare(`
            SELECT 
                node_history.*, 
                world_nodes.name AS node_name,
                world_nodes.type AS node_type
            FROM node_history 
            LEFT JOIN world_nodes ON node_history.node_id = world_nodes.id 
            ORDER BY node_history.day DESC, node_history.id DESC
        `),

        getSetting: db.prepare('SELECT value FROM campaign_settings WHERE key = ?'),
        updateSetting: db.prepare('UPDATE campaign_settings SET value = @value WHERE key = @key'),
        insertSetting: db.prepare(`
            INSERT OR REPLACE INTO campaign_settings (key, value) VALUES (@key, @value)
        `),

        getActiveContract: db.prepare(`${CONTRACT_SELECT} WHERE contracts.is_active = 1 LIMIT 1`),
        getContractById: db.prepare(`${CONTRACT_SELECT} WHERE contracts.id = ?`),
        getNodeContracts: db.prepare(`${CONTRACT_SELECT} WHERE contracts.node_id = ? AND contracts.is_completed = 0 AND contracts.contract_type != '${CONTRACT_TYPE.DIRECT_CLEARING}'`),
        insertContract: db.prepare(`
            INSERT INTO contracts (node_id, target_node_id, contract_type, title, description, required_minutes, gold_reward)
            VALUES (@node_id, @target_node_id, @contract_type, @title, @desc, @req_mins, @gold)
        `),
        setActiveContract: db.prepare('UPDATE contracts SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END'),
        addContractProgress: db.prepare('UPDATE contracts SET progress_minutes = progress_minutes + @progress WHERE id = @id'),
        setContractProgress: db.prepare('UPDATE contracts SET progress_minutes = @progress WHERE id = @id'),
        completeContract: db.prepare('UPDATE contracts SET is_completed = 1, is_active = 0 WHERE id = @id'),
        abortContract: db.prepare('DELETE FROM contracts WHERE id = ?'),
        updateContractTerms: db.prepare('UPDATE contracts SET terms = @terms, gold_reward = @gold_reward WHERE id = @id'),
        updateNodeSpecialization: db.prepare('UPDATE world_nodes SET specialization = @specialization WHERE id = @id'),

        getInventory: db.prepare('SELECT * FROM inventory'),
        deleteItem: db.prepare('DELETE FROM inventory WHERE id = ?'),
        insertItem: db.prepare(`
            INSERT INTO inventory (item_id, mercenary_id, durability, stash_slot) 
            VALUES (@itemId, @mercId, @durability, @stashSlot)
        `),
        updateItemSlot: db.prepare('UPDATE inventory SET stash_slot = @slot WHERE id = @id'),

        insertFaction: db.prepare(`
            INSERT INTO factions (name, color, archetype, motto, type)
            VALUES (@name, @color, @archetype, @motto, @type)
        `),
        getAllFactions: db.prepare('SELECT * FROM factions ORDER BY name')
    };
}
