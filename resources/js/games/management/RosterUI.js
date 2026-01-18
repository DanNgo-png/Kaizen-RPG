export class RosterUI {
    constructor(onSelectCallback) {
        this.container = document.getElementById('roster-list');
        this.onSelect = onSelectCallback;
    }

    render(mercs) {
        this.container.innerHTML = '';
        
        if (mercs.length === 0) {
            this.container.innerHTML = '<div style="color:#666; padding:20px;">No mercenaries hired.</div>';
            return;
        }

        mercs.forEach(merc => {
            const el = document.createElement('div');
            el.className = 'roster-card';
            el.dataset.id = merc.id;
            
            // HP Percent calculation
            const hpPct = Math.min(100, (merc.current_hp / merc.max_hp) * 100);

            el.innerHTML = `
                <div class="roster-img"><i class="fa-solid fa-user-shield"></i></div>
                <div class="roster-name">${merc.name}</div>
                <div class="roster-hp-bar"><div class="roster-hp-fill" style="width:${hpPct}%"></div></div>
            `;

            el.addEventListener('click', () => this.onSelect(merc.id));
            this.container.appendChild(el);
        });
    }

    highlight(id) {
        const cards = this.container.querySelectorAll('.roster-card');
        cards.forEach(c => {
            if (parseInt(c.dataset.id) === id) c.classList.add('selected');
            else c.classList.remove('selected');
        });
    }
}