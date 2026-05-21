export function createBarebonesDom(documentRef = document) {
    return {
        overlay: documentRef.getElementById("barebones-ui-overlay"),
        nodeList: documentRef.getElementById("bb-nodes-list"),
        contractList: documentRef.getElementById("bb-contracts-list"),
        selectedNodeName: documentRef.getElementById("bb-selected-node-name"),

        activeTitle: documentRef.getElementById("bb-active-title"),
        progressContainer: documentRef.getElementById("bb-progress-container"),
        progressFill: documentRef.getElementById("bb-progress-fill"),
        progressText: documentRef.getElementById("bb-progress-text"),

        btnAbort: documentRef.getElementById("bb-btn-abort"),
        btnStartDelve: documentRef.getElementById("bb-btn-start-delve"),
        btnStopDelve: documentRef.getElementById("bb-btn-stop-delve"),

        timeDisplay: documentRef.getElementById("bb-time-display"),
        goldDisplay: documentRef.getElementById("bb-gold-display"),
        provisionsDisplay: documentRef.getElementById("bb-provisions-display"),
        toolsDisplay: documentRef.getElementById("bb-tools-display"),
        ammoDisplay: documentRef.getElementById("bb-ammo-display"),
        medsDisplay: documentRef.getElementById("bb-meds-display"),
        strengthDisplay: documentRef.getElementById("bb-strength-display"),
        strengthRating: documentRef.getElementById("bb-strength-rating"),
        strengthFill: documentRef.getElementById("bb-strength-fill"),

        resContainers: {
            time: documentRef.getElementById("bb-res-time-container"),
            gold: documentRef.getElementById("bb-res-gold-container"),
            provisions: documentRef.getElementById("bb-res-provisions-container"),
            tools: documentRef.getElementById("bb-res-tools-container"),
            ammo: documentRef.getElementById("bb-res-ammo-container"),
            meds: documentRef.getElementById("bb-res-meds-container"),
            strength: documentRef.getElementById("bb-res-strength-container")
        },

        marketContainer: documentRef.getElementById("bb-marketplace-container"),
        marketStashList: documentRef.getElementById("bb-market-stash-list"),
        marketShopList: documentRef.getElementById("bb-market-shop-list"),
        hireContainer: documentRef.getElementById("bb-hire-container"),
        hireList: documentRef.getElementById("bb-hire-list"),
        tabJobs: documentRef.getElementById("bb-tab-jobs"),
        tabMarket: documentRef.getElementById("bb-tab-market"),
        tabHire: documentRef.getElementById("bb-tab-hire")
    };
}
