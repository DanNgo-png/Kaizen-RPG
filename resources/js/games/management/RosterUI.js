const ROSTER_CARD_WIDTH = 70; // Matches .roster-card width in management.css
const ROSTER_CARD_GAP = 20;   // Matches .roster-scroll-area gap in management.css
const CARDS_TO_SCROLL = 3;    // Number of roster slots to shift per click
const SCROLL_DISTANCE = (ROSTER_CARD_WIDTH + ROSTER_CARD_GAP) * CARDS_TO_SCROLL;

export class RosterUI {
    constructor(onSelectCallback) {
        this.container = document.getElementById('roster-list');
        this.onSelect = onSelectCallback;

        // Retrieve the navigation buttons relative to the roster container parent
        const parent = this.container ? this.container.parentElement : null;
        this.btnLeft = parent ? parent.querySelector('.roster-nav-btn.left') : null;
        this.btnRight = parent ? parent.querySelector('.roster-nav-btn.right') : null;

        this._initNavigation();
    }

    /**
     * Set up scrolling listeners for left and right navigation buttons
     */
    _initNavigation() {
        if (this.btnLeft && this.container) {
            this.btnLeft.addEventListener('click', () => {
                this.container.scrollBy({ left: -SCROLL_DISTANCE, behavior: 'smooth' });
            });
        }

        if (this.btnRight && this.container) {
            this.btnRight.addEventListener('click', () => {
                this.container.scrollBy({ left: SCROLL_DISTANCE, behavior: 'smooth' });
            });
        }
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
            el.title = merc.name; // Tooltip since text is removed
            
            // HP Percent calculation
            const hpPct = Math.min(100, (merc.current_hp / merc.max_hp) * 100);

            el.innerHTML = `
                <div class="roster-img"><i class="fa-solid fa-user-shield"></i></div>
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