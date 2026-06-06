import { 
    SETTLEMENT_EVENTS, 
    SETTLEMENT_TIERS, 
    SETTLEMENT_UPGRADE_PATH 
} from "../data/GameDataConstants.mjs";

const DEFAULT_MAP_CENTER_X = 400;
const DEFAULT_MAP_CENTER_Y = 300;
const DEFAULT_MIN_CONTRACT_DURATION = 10;
const DEFAULT_MAX_CONTRACT_DURATION = 120;
const CONTRACT_ABORT_REPUTATION_PENALTY = -10;
const CONTRACT_TYPE = Object.freeze({
    DIRECT_CLEARING: 'direct_clearing'
});

export class QuestService {
    constructor(repo, settingsRepo) {
        this.repo = repo;
        this.settingsRepo = settingsRepo;
    }

    getWorldData(app) {
        try {
            const resources = this.repo.getResources();
            const worldState = this.repo.getWorldState();

            worldState.nodes.forEach(node => {
                node.effective_buy = node.buy_modifier || 1.0;
                node.effective_sell = node.sell_modifier || 1.0;
                node.event_name = null;

                if (node.current_event && SETTLEMENT_EVENTS[node.current_event]) {
                    const evt = SETTLEMENT_EVENTS[node.current_event];
                    node.effective_buy *= evt.buyMult;
                    node.effective_sell *= evt.sellMult;
                    
                    if ((node.current_event === 'sieged' || node.current_event === 'undead_siege') && node.siege_attacker_id) {
                        if (node.siege_attacker_revealed === 1) {
                            const attacker = worldState.nodes.find(an => an.id === node.siege_attacker_id);
                            const attackerName = attacker ? attacker.name : "Enemy Host";
                            node.event_name = `Sieged by ${attackerName}`;
                        } else {
                            node.event_name = "Sieged by Unknown Enemy";
                        }
                    } else {
                        node.event_name = evt.name;
                    }
                }

                const tierData = SETTLEMENT_TIERS[node.type];
                let reqs = {};
                try { reqs = JSON.parse(node.expansion_reqs || '{}'); } catch(e){}

                node.growth_data = {
                    contractsDone: reqs.contracts || 0,
                    contractsNeeded: tierData?.growthReqs?.contracts || 1,
                    tradeDone: reqs.trade || 0,
                    tradeNeeded: tierData?.growthReqs?.trade || 1,
                    materialsDone: node.development_progress || 0,
                    materialsNeeded: tierData?.growthReqs?.materials || 1,
                    nextTier: SETTLEMENT_UPGRADE_PATH[node.type] || 'Colonial Outpost',
                    canGrow: !!tierData?.growthReqs
                };
            });

            app.events.broadcast("receiveWorldData", { 
                resources: resources,
                nodes: worldState.nodes,
                player: worldState.player, 
                origin: worldState.origin,
                gameVersion: worldState.gameVersion,
                isDelving: worldState.isDelving 
            });
        } catch (error) {
            if (!error.message.includes("No game save is currently loaded")) {
                console.error("❌ Error fetching world data:", error);
            }
            app.events.broadcast("receiveWorldData", { 
                nodes: [], 
                player: { x: DEFAULT_MAP_CENTER_X, y: DEFAULT_MAP_CENTER_Y }, 
                origin: 'default', 
                gameVersion: 'standard' 
            });
        }
    }

    saveWorldData(payload) {
        try {
            if (payload && payload.x !== undefined && payload.y !== undefined) {
                this.repo.savePlayerPosition(payload.x, payload.y);
            }
        } catch (error) {}
    }

    setDelvingStatus(payload, app) {
        try {
            this.repo.setCampaignSetting('is_delving', payload.isDelving ? 'true' : 'false');
            app.events.broadcast("delvingStatusUpdated", { isDelving: payload.isDelving });
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) console.error(e); 
        }
    }

    getActiveContract(app) {
        try {
            const contract = this.repo.getActiveContract();
            app.events.broadcast("receiveActiveContract", contract);
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) {
                console.error("❌ Failed to get active contract:", e); 
            }
            app.events.broadcast("receiveActiveContract", null);
        }
    }

    saveContractProgress(payload) {
        try {
            this.repo.updateContractProgress(payload.contractId, payload.progressMinutes);
        } catch(e) { 
            if (!e.message.includes("No game save is currently loaded")) console.error("Failed to save contract progress:", e); 
        }
    }

    completeActiveContract(partyService, marketService, app) {
        try {
            const result = this.repo.completeActiveContract();
            if (result) {
                app.events.broadcast("contractCompletedRealtime", result);
                partyService._refreshParty(marketService, app);
            }
        } catch(e) { console.error(e); }
    }

    getContractsForNode(payload, app) {
        try {
            const minMins = parseInt(this.settingsRepo.getSetting('gameMinFocusTime')) || DEFAULT_MIN_CONTRACT_DURATION;
            const maxMins = parseInt(this.settingsRepo.getSetting('gameMaxFocusTime')) || DEFAULT_MAX_CONTRACT_DURATION;

            const contracts = this.repo.getOrGenerateContracts(payload.nodeId, minMins, maxMins);
            const activeContract = this.repo.getActiveContract();
            
            app.events.broadcast("receiveContracts", { contracts, activeContract });
        } catch(e) { console.error(e); }
    }

    acceptContract(payload, app) {
        try {
            this.repo.acceptContract(payload.contractId);
            const activeContract = this.repo.getActiveContract();
            app.events.broadcast("contractAccepted", { activeContract });
        } catch(e) { console.error(e); }
    }

    negotiateContractTerm(payload, app) {
        try {
            const result = this.repo.negotiateContractTerm(payload.contractId, payload.nodeId, payload.termId);
            app.events.broadcast("contractTermNegotiated", result);
        } catch(e) {
            console.error(e);
            app.events.broadcast("contractTermNegotiationFailed", { error: e.message });
        }
    }

    startHostileSettlementClearing(payload, app) {
        try {
            const minMins = parseInt(this.settingsRepo.getSetting('gameMinFocusTime')) || DEFAULT_MIN_CONTRACT_DURATION;
            const maxMins = parseInt(this.settingsRepo.getSetting('gameMaxFocusTime')) || DEFAULT_MAX_CONTRACT_DURATION;
            const activeContract = this.repo.startHostileSettlementClearing(payload.nodeId, minMins, maxMins);

            app.events.broadcast("contractAccepted", { activeContract });
        } catch(e) {
            console.error(e);
            app.events.broadcast("hostileSettlementClearingFailed", { error: e.message });
        }
    }

    abortContract(payload, app) {
        try {
            this.repo.cancelContract(payload.contractId);
            if (payload.contractType !== CONTRACT_TYPE.DIRECT_CLEARING) {
                this.repo.updateNodeReputation(payload.nodeId, CONTRACT_ABORT_REPUTATION_PENALTY);
            }
            app.events.broadcast("contractAborted", { success: true });
        } catch(e) { console.error(e); }
    }

    toggleNodePin(payload, app) {
        try {
            this.repo.toggleNodePin(payload.nodeId);
            app.events.broadcast("nodePinToggled", { success: true });
        } catch(e) { console.error(e); }
    }

    getNodeHistory(payload, app) {
        try {
            const history = this.repo.getNodeHistory(payload.nodeId);
            app.events.broadcast("receiveNodeHistory", { nodeId: payload.nodeId, history });
        } catch(e) { console.error(e); }
    }

    getWorldHistory(app) {
        try {
            const history = this.repo.getAllHistory();
            app.events.broadcast("receiveWorldHistory", { history });
        } catch(e) {
            console.error("Failed to fetch world history:", e);
            app.events.broadcast("receiveWorldHistory", { history: [] });
        }
    }

    revealSiegeAttacker(payload, app) {
        try {
            const nodeId = payload.nodeId;
            const node = this.repo.getNodeById(nodeId);
            if (node && node.siege_attacker_id && !node.siege_attacker_revealed) {
                const attacker = this.repo.getNodeById(node.siege_attacker_id);
                if (attacker) {
                    this.repo.db.prepare('UPDATE world_nodes SET siege_attacker_revealed = 1 WHERE id = ?').run(nodeId);
                    
                    const companyName = this.repo.statements.getSetting.get('company_name')?.value || "The Company";
                    this.repo.logNodeHistory(nodeId, `🔍 ${companyName} has arrived at the scene and identified the sieging forces as ${attacker.name} (${attacker.type})!`, 'player');
                    
                    this.getWorldData(app);
                }
            }
        } catch(e) {
            console.error("Failed to reveal siege attacker:", e);
        }
    }
}
