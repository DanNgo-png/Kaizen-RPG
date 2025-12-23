import NeutralinoApp from "node-neutralino";
import { DataManager } from "./database/DataManager.mjs";

const app = new NeutralinoApp({ url: "/", windowOptions: { enableInspector: true } });
const dataManager = new DataManager(app);
dataManager.initialize();
app.init()
console.log("🚀 Node.js Extension started.");