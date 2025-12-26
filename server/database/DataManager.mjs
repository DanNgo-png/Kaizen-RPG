import { TaskController } from "../controllers/TaskController.mjs";
import { MercenaryController } from "../controllers/MercenaryController.mjs";
import { AppSettingsController } from "../controllers/AppSettingsController.mjs";

export class DataManager {
    constructor(app) {
        this.app = app;
        this.controllers = [];
    }

    initialize() {
        console.log("⚙️ Initializing Data Manager...");

        this.registerController(new TaskController());
        this.registerController(new MercenaryController());
        this.registerController(new AppSettingsController());
        // Add more controllers here as the game grows

        console.log("✅ Data Manager Initialized");
    }

    registerController(controller) {
        if (typeof controller.register === 'function') {
            controller.register(this.app);
            this.controllers.push(controller);
        } else {
            console.error(`❌ Controller ${controller.constructor.name} is missing a register() method.`);
        }
    }
}