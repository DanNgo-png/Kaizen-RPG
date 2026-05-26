import { EventEmitter } from 'events';

/**
 * Shared server-side event bus for decoupled inter-controller communication.
 * This ensures domain-level events do not pollute the frontend bridge.
 */
export const internalEventBus = new EventEmitter();