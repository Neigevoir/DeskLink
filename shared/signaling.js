/**
 * SignalingClient — WebSocket lifecycle manager with exponential-backoff reconnect.
 *
 * Owns: WebSocket connection, reconnection timer, message serialization.
 * Does NOT own: room state, WebRTC, DOM.
 *
 * @module shared/signaling
 */

import { CONFIG, createMessage } from './protocol.js';

/** @typedef {'connecting'|'connected'|'disconnected'} SignalingState */

export class SignalingClient {
  /** @type {string} */
  #url;
  /** @type {WebSocket|null} */
  #ws;
  /** @type {SignalingState} */
  #state;
  /** @type {number} */
  #attempt;
  /** @type {number|null} */
  #reconnectTimer;
  /** @type {Array<{type: string, payload: Record<string, unknown>}>} */
  #pending;
  /** @type {(msg: object) => void} */
  #onMessage;
  /** @type {(state: SignalingState) => void} */
  #onStateChange;

  /**
   * @param {object} opts
   * @param {string} opts.url
   * @param {(msg: object) => void} opts.onMessage
   * @param {(state: SignalingState) => void} [opts.onStateChange]
   */
  constructor({ url, onMessage, onStateChange }) {
    this.#url = url;
    this.#onMessage = onMessage;
    this.#onStateChange = onStateChange || (() => {});
    this.#ws = null;
    this.#state = 'disconnected';
    this.#attempt = 0;
    this.#reconnectTimer = null;
    this.#pending = [];
  }

  /** Connect to the signaling server. */
  connect() {
    if (this.#ws) return;
    this.#setState('connecting');
    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#attempt = 0;
      this.#setState('connected');
      // Flush any messages queued before the connection opened
      while (this.#pending.length > 0) {
        const m = this.#pending.shift();
        this.send(m.type, m.payload);
      }
    };

    this.#ws.onmessage = (event) => {
      try {
        this.#onMessage(JSON.parse(event.data));
      } catch (_) { /* ignore malformed messages */ }
    };

    this.#ws.onclose = () => {
      this.#ws = null;
      this.#pending = [];
      this.#setState('disconnected');
      this.#scheduleReconnect();
    };

    this.#ws.onerror = () => {
      // onclose fires after onerror — reconnect is scheduled there
    };
  }

  /**
   * Send a typed message to the server.
   * @param {string} type
   * @param {Record<string, unknown>} [payload]
   */
  send(type, payload = {}) {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      // Queue the message — it will be flushed when the connection opens
      this.#pending.push({ type, payload });
      return;
    }
    this.#ws.send(JSON.stringify(createMessage(type, payload)));
  }

  /** Graceful disconnect. No reconnect. */
  disconnect() {
    this.#clearReconnect();
    this.#pending = [];
    if (this.#ws) {
      this.#ws.onclose = null; // prevent reconnect trigger
      this.#ws.close();
      this.#ws = null;
    }
    this.#setState('disconnected');
  }

  /** @returns {SignalingState} */
  getState() {
    return this.#state;
  }

  // ---- Private ----

  /** @param {SignalingState} state */
  #setState(state) {
    if (this.#state !== state) {
      this.#state = state;
      this.#onStateChange(state);
    }
  }

  #scheduleReconnect() {
    if (this.#attempt >= CONFIG.RECONNECT_MAX_ATTEMPTS) return;
    const delay = Math.min(
      CONFIG.RECONNECT_BASE_DELAY_MS * Math.pow(2, this.#attempt),
      CONFIG.RECONNECT_MAX_DELAY_MS,
    );
    this.#attempt++;
    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  #clearReconnect() {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }
}
