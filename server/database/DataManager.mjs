import { TaskController } from "../controllers/TaskController.mjs";
import { HabitController } from "../controllers/HabitController.mjs";
import { MercenaryController } from "../controllers/MercenaryController.mjs";
import { AppSettingsController } from "../controllers/AppSettingsController.mjs";
import { FocusSessionController } from "../controllers/FocusSessionController.mjs";
import { TimeframeController } from "../controllers/TimeframeController.mjs";
import { SaveController } from "../controllers/SaveController.mjs";
import { ProfileController } from "../controllers/ProfileController.mjs";

export class DataManager {
    constructor(app) {
        this.app = app;
        this.controllers = [];
    }

    initialize() {
        console.log("⚙️ Initializing Data Manager...");

        this.registerController(new TaskController());
        this.registerController(new HabitController());
        this.registerController(new MercenaryController());
        this.registerController(new AppSettingsController());
        this.registerController(new FocusSessionController());
        this.registerController(new TimeframeController());
        this.registerController(new SaveController()); 
        this.registerController(new ProfileController());
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