import { getDatabase } from '../../connection.mjs';

export class AppSettingsRepository {
    constructor() {
        this.db = getDatabase('app_settings'); 

        this.statements = {

        };
    }
}