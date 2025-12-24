import { GenerateGridMap } from "./GenerateGridMap.js";

export class GridMapManager {
    constructor(container) {
        this.container = container;
        this.width = 10;
        this.height = 8;
    }

    generateWorld() {
        // Use the generator to create data
        const mapData = GenerateGridMap(this.width, this.height);
        
        // Render DOM
        this.container.style.gridTemplateColumns = `repeat(${this.width}, 1fr)`;
        this.container.innerHTML = "";

        mapData.forEach(tile => {
            const el = document.createElement("div");
            el.className = "map-tile";
            if (tile.isFog) el.classList.add("fog");
            
            // Debug visual
            if (!tile.isFog) {
                el.innerHTML = `<i class="fa-solid fa-tree" style="font-size: 1rem; color: #4ade80;"></i>`;
            }
            
            this.container.appendChild(el);
        });
    }
}