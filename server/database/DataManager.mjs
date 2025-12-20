import { SettingsRepository } from './SQLite3/repositories/SettingsRepository.mjs';
import { GameRepository } from './SQLite3/repositories/GameRepository.mjs';
import { TaskRepository } from './SQLite3/repositories/TaskRepository.mjs';

export class DataManager {
    constructor() {
        this.settings = new SettingsRepository();
        this.game = new GameRepository();
        this.tasks = new TaskRepository();
    }

    // Unified Method
    getInitialState() {
        return {
            config: this.settings.getTimerSettings(),
            squad: this.game.getActiveMercenaries(),
            todo: this.tasks.getActiveTasks()
        };
    }

    // Example: Starting the app
    getStartupData() {
        return {
            timer: this.settings.getByCategory('timer'),
            activeMods: this.mods.getEnabled(),
            squad: this.game.getMercenaries()
        };
    }
}