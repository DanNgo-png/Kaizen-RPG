import { getDatabase } from '../connection.mjs';

export class SettingsRepository {
    constructor() {
        this.db = getDatabase('app_settings'); 

        this.statements = {

        };
    }
}