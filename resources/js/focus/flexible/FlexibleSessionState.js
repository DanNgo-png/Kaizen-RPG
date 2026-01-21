export class FlexibleSessionState {
    constructor(config) {
        this.ratio = config.ratio || 3.0;
        this.status = 'idle'; // 'idle', 'focus', 'break'
        
        // Time tracking (in milliseconds)
        this.accumulatedFocus = 0;
        this.accumulatedBreak = 0;
        this.startTime = null;
        
        this.currentTag = "No Tag";

        // NEW: Balance carried over from previous sessions (separate from current session time)
        this.carriedBalance = 0; 
    }

    /**
     * Updates the ratio used for balance calculation.
     */
    setRatio(newRatio) {
        this.ratio = parseFloat(newRatio);
    }

    setTag(tag) {
        this.currentTag = tag;
    }

    setCarriedBalance(ms) {
        this.carriedBalance = ms;
    }

    /**
     * Switches the timer state. 
     * Commits the elapsed time of the previous state to the accumulator.
     */
    switchStatus(newStatus) {
        this._commitCurrentSegment();
        this.status = newStatus;
        this.startTime = Date.now();
    }

    /**
     * Manually adjust totals (e.g. from Exception Modal).
     * @param {number} focusDeltaMs - Milliseconds to add/remove
     * @param {number} breakDeltaMs - Milliseconds to add/remove
     */
    adjustTotals(focusDeltaMs, breakDeltaMs) {
        this._commitCurrentSegment(); // Commit pending time first
        
        this.accumulatedFocus += focusDeltaMs;
        this.accumulatedBreak += breakDeltaMs;

        // Prevent negatives (Current session times cannot be negative)
        if (this.accumulatedFocus < 0) this.accumulatedFocus = 0;
        if (this.accumulatedBreak < 0) this.accumulatedBreak = 0;
        
        // Reset start time so we don't double count
        this.startTime = Date.now(); 
    }

    /**
     * Calculates the snapshot of current values including the running tick.
     */
    getStats() {
        const now = Date.now();
        const elapsed = (this.status !== 'idle' && this.startTime) 
            ? (now - this.startTime) 
            : 0;

        let currentFocus = this.accumulatedFocus;
        let currentBreak = this.accumulatedBreak;

        if (this.status === 'focus') currentFocus += elapsed;
        if (this.status === 'break') currentBreak += elapsed;

        const earnedBreak = currentFocus / this.ratio;
        
        // NEW FORMULA: Balance = (This Session Earned) - (This Session Used) + (Carried Over)
        const balance = earnedBreak - currentBreak + this.carriedBalance;

        return {
            status: this.status,
            focusMs: currentFocus,
            breakMs: currentBreak,
            balanceMs: balance,
            tag: this.currentTag,
            ratio: this.ratio,
            carriedMs: this.carriedBalance
        };
    }

    reset() {
        this.status = 'idle';
        this.accumulatedFocus = 0;
        this.accumulatedBreak = 0;
        this.startTime = null;
        // carriedBalance is NOT reset here; it persists until cleared by manager
    }

    _commitCurrentSegment() {
        if (this.status === 'idle' || !this.startTime) return;
        
        const now = Date.now();
        const elapsed = now - this.startTime;

        if (this.status === 'focus') this.accumulatedFocus += elapsed;
        if (this.status === 'break') this.accumulatedBreak += elapsed;

        this.startTime = now;
    }
}