export class ResourceManager {
    constructor() {
        this.gold = 500;
        this.influence = 100;
        this.mats = 50;
    }

    init() {
        this.updateUI();
    }

    updateUI() {
        const elGold = document.getElementById("res-gold");
        const elInf = document.getElementById("res-influence");
        const elMats = document.getElementById("res-mats");

        if(elGold) elGold.textContent = this.gold;
        if(elInf) elInf.textContent = this.influence;
        if(elMats) elMats.textContent = this.mats;
    }
}