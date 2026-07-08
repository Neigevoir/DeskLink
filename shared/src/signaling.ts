import { CONFIG, createMessage, type SignalMessage } from './protocol.js';

export type SignalingState = 'connecting' | 'connected' | 'disconnected';

export interface SignalingClientOptions {
  url: string;
  onMessage: (msg: SignalMessage) => void;
  onStateChange?: (state: SignalingState) => void;
}

interface PendingMessage {
  type: string;
  payload: Record<string, unknown>;
}

export class SignalingClient {
  #url: string;
  #ws: WebSocket | null;
  #state: SignalingState;
  #attempt: number;
  #reconnectTimer: ReturnType<typeof setTimeout> | null;
  #pending: PendingMessage[];
  #onMessage: (msg: SignalMessage) => void;
  #onStateChange: (state: SignalingState) => void;

  constructor({ url, onMessage, onStateChange }: SignalingClientOptions) {
    this.#url = url;
    this.#onMessage = onMessage;
    this.#onStateChange = onStateChange || (() => {});
    this.#ws = null;
    this.#state = 'disconnected';
    this.#attempt = 0;
    this.#reconnectTimer = null;
    this.#pending = [];
  }

  connect(): void {
    if (this.#ws) return;
    this.#setState('connecting');
    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#attempt = 0;
      this.#setState('connected');
      while (this.#pending.length > 0) {
        const m = this.#pending.shift()!;
        this.send(m.type, m.payload);
      }
    };

    this.#ws.onmessage = (event) => {
      try {
        this.#onMessage(JSON.parse(event.data as string) as SignalMessage);
      } catch (_) {
        /* ignore malformed messages */
      }
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

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      this.#pending.push({ type, payload });
      return;
    }
    this.#ws.send(JSON.stringify(createMessage(type, payload)));
  }

  disconnect(): void {
    this.#clearReconnect();
    this.#pending = [];
    if (this.#ws) {
      this.#ws.onclose = null;
      this.#ws.close();
      this.#ws = null;
    }
    this.#setState('disconnected');
  }

  getState(): SignalingState {
    return this.#state;
  }

  // ---- Private ----

  #setState(state: SignalingState): void {
    if (this.#state !== state) {
      this.#state = state;
      this.#onStateChange(state);
    }
  }

  #scheduleReconnect(): void {
    if (this.#attempt >= CONFIG.RECONNECT_MAX_ATTEMPTS) return;
    const delay = Math.min(
      CONFIG.RECONNECT_BASE_DELAY_MS * Math.pow(2, this.#attempt),
      CONFIG.RECONNECT_MAX_DELAY_MS,
    );
    this.#attempt++;
    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  #clearReconnect(): void {
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }
}
