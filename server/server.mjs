import NeutralinoApp from "node-neutralino";

const app = new NeutralinoApp({
    url: "/",
    windowOptions: { 
        enableInspector: true 
    }
});
app.init();