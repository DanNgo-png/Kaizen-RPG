export class DataBridge {
    constructor(gameRepo, analyticsRepo) {
        this.game = gameRepo;
        this.analytics = analyticsRepo;
    }

    startSyncTimer(intervalMs = 300000) { // 5 minutes
        setInterval(() => this.performSync(), intervalMs);
    }

    async performSync() {
        const dataToArchive = await this.game.getCompletedTasks();
        if (dataToArchive.length > 0) {
            await this.analytics.insertBulk(dataToArchive);
            await this.game.deleteArchivedEntries(dataToArchive.map(d => d.id));
        }
    }
}