import { GameRepository } from "../database/SQLite3/repositories/GameRepository.mjs";
import { AppSettingsRepository } from "../database/SQLite3/repositories/settings/AppSettingsRepository.mjs";
import { MarketService } from "../services/MarketService.mjs";
import { PartyService } from "../services/PartyService.mjs";
import { QuestService } from "../services/QuestService.mjs";

export class RPGController {
    constructor() {
        this.repo = new GameRepository();
        this.settingsRepo = new AppSettingsRepository();

        this.market = new MarketService(this.repo, this.settingsRepo);
        this.party = new PartyService(this.repo, this.settingsRepo);
        this.quests = new QuestService(this.repo, this.settingsRepo);
    }

    register(app) {
        // Setup internal event bindings (e.g. Session completion / XP)
        this.party.setupXpListeners(this.market, app);

        // --- WORLD & NAVIGATION MAP ---
        app.events.on("getWorldData", () => {
            this.quests.getWorldData(app);
        });

        app.events.on("saveWorldData", (payload) => {
            this.quests.saveWorldData(payload);
        });

        app.events.on("setDelvingStatus", (payload) => {
            this.quests.setDelvingStatus(payload, app);
        });

        app.events.on("toggleNodePin", (payload) => {
            this.quests.toggleNodePin(payload, app);
        });

        app.events.on("getNodeHistory", (payload) => {
            this.quests.getNodeHistory(payload, app);
        });

        app.events.on("getWorldHistory", () => {
            this.quests.getWorldHistory(app);
        });


        // --- PARTY & INVENTORY MANAGEMENT ---
        app.events.on("getPartyData", () => {
            this.party.getPartyData(this.market, app);
        });

        app.events.on("processDayEnd", () => {
            this.party.processDayEnd(this.market, app);
        });

        app.events.on("hireMercenary", (payload) => {
            this.party.hireMercenary(payload, this.market, app);
        });

        app.events.on("moveInventoryItem", (payload) => {
            this.party.moveInventoryItem(payload, this.market, app);
        });
        
        app.events.on("equipItem", (payload) => {
            this.party.equipItem(payload, this.market, app);
        });

        app.events.on("unequipItem", (payload) => {
            this.party.unequipItem(payload, this.market, app);
        });


        // --- QUESTS & CONTRACT BOARD ---
        app.events.on("getActiveContract", () => {
            this.quests.getActiveContract(app);
        });

        app.events.on("saveContractProgress", (payload) => {
            this.quests.saveContractProgress(payload);
        });

        app.events.on("completeActiveContract", (payload) => {
            this.quests.completeActiveContract(this.party, this.market, app);
        });

        app.events.on("getContractsForNode", (payload) => {
            this.quests.getContractsForNode(payload, app);
        });

        app.events.on("acceptContract", (payload) => {
            this.quests.acceptContract(payload, app);
        });

        app.events.on("abortContract", (payload) => {
            this.quests.abortContract(payload, app);
        });


        // --- TRADING & STORES ---
        app.events.on("getMarketData", (payload) => {
            this.market.getMarketData(payload, app);
        });

        app.events.on("buyItem", (payload) => {
            this.market.buyItem(payload, app);
        });

        app.events.on("sellItem", (payload) => {
            this.market.sellItem(payload, app);
        });
    }
}