/**
 * DeskLink Signaling Protocol
 *
 * Single source of truth for all message types, creators, and validation.
 * Every module that touches the wire imports from here.
 *
 * @module shared/protocol
 */

// ---- Message types ----

export const MessageType = Object.freeze({
  // Registration
  REGISTER: 'register',
  ROOM_CREATED: 'room-created',
  JOIN_SUCCESS: 'join-success',
  JOIN_ERROR: 'join-error',

  // Peer readiness
  AGENT_READY: 'agent-ready',
  CLIENT_READY: 'client-ready',

  // WebRTC signaling
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',

  // Lifecycle
  PEER_GONE: 'peer-gone',
  ERROR: 'error',
});

// ---- Configuration ----

export const CONFIG = Object.freeze({
  DEFAULT_SIGNAL_PORT: 3099,
  DEFAULT_SIGNAL_HOST: 'localhost',
  ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }],
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  RECONNECT_MAX_DELAY_MS: 30000,
  RECONNECT_BASE_DELAY_MS: 1000,
  RECONNECT_MAX_ATTEMPTS: 10,
});

// ---- Message helpers ----

/**
 * @param {string} type
 * @param {Record<string, unknown>} [payload]
 * @returns {object}
 */
export function createMessage(type, payload = {}) {
  return { type, ...payload };
}

// ---- Room code generator ----

/**
 * Generate a short human-readable room code.
 * Excludes I/O/0 to avoid confusion when reading aloud.
 * @returns {string}
 */
export function generateRoomCode() {
  const chars = CONFIG.ROOM_CODE_CHARS;
  let code = '';
  for (let i = 0; i < CONFIG.ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---- Signal URL builder ----

/**
 * @param {string} [host]
 * @param {number} [port]
 * @returns {string}
 */
export function signalUrl(host, port) {
  const h = host || CONFIG.DEFAULT_SIGNAL_HOST;
  const p = port || CONFIG.DEFAULT_SIGNAL_PORT;
  return `ws://${h}:${p}`;
}
