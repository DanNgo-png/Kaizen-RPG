export function initHeatmap() {
    const container = document.getElementById('heatmap-grid');
    
    // Safety check: ensure we are on the page with the heatmap
    if (!container) return;
    
    // Prevent duplicate rendering if function is called multiple times
    if (container.hasChildNodes()) {
        container.innerHTML = ''; 
    }

    const months = [
        { name: 'Jan', h: '0h' }, { name: 'Feb', h: '0h' }, { name: 'Mar', h: '0h' }, 
        { name: 'Apr', h: '0h' }, { name: 'May', h: '0h' }, { name: 'Jun', h: '0h' },
        { name: 'Jul', h: '0h' }, { name: 'Aug', h: '0h' }, { name: 'Sep', h: '0h' },
        { name: 'Oct', h: '18h' }, { name: 'Nov', h: '37h' }, { name: 'Dec', h: '0h' }
    ];

    months.forEach((m, index) => {
        const group = document.createElement('div');
        group.className = 'month-group';

        // Grid of dots (5 columns x 7 rows = 35 dots roughly per month block)
        const grid = document.createElement('div');
        grid.className = 'dots-grid';

        for(let i=0; i<35; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            // Simulate data for Oct (index 9) and Nov (index 10) matching the mockup
            if (index === 9) { // Oct
                if (i > 15 && i % 3 === 0) dot.classList.add('l2');
                if (i > 20 && i % 4 === 0) dot.classList.add('l4');
            }
            if (index === 10) { // Nov
                if (i % 2 === 0) dot.classList.add('l3');
                if (i % 5 === 0) dot.classList.add('l4');
                if (i < 10) dot.classList.add('l2');
            }

            grid.appendChild(dot);
        }

        // Labels
        const label = document.createElement('span');
        label.className = 'month-label';
        label.textContent = m.name;

        const total = document.createElement('span');
        total.className = 'month-total';
        total.textContent = m.h;

        group.appendChild(grid);
        group.appendChild(label);
        group.appendChild(total);
        container.appendChild(group);
    });
}