/**
 * DeskLink Signaling Protocol — types, constants, and helpers.
 *
 * @module @desklink/shared/protocol
 */

// ---- Message types ----

export const MessageType = {
  REGISTER: 'register',
  ROOM_CREATED: 'room-created',
  JOIN_SUCCESS: 'join-success',
  JOIN_ERROR: 'join-error',
  AGENT_READY: 'agent-ready',
  CLIENT_READY: 'client-ready',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  PEER_GONE: 'peer-gone',
  ERROR: 'error',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ---- Peer roles ----

export type PeerRole = 'agent' | 'client';

// ---- Message payloads ----

export interface RegisterPayload {
  role: PeerRole;
  room?: string;
}

export interface RoomCreatedPayload {
  room: string;
}

export interface JoinSuccessPayload {
  room: string;
}

export interface JoinErrorPayload {
  error: string;
}

export interface SdpPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

// ---- Generic wire message ----

export interface SignalMessage {
  type: string;
  [key: string]: unknown;
}

// ---- Configuration ----

export interface SignalConfig {
  readonly DEFAULT_SIGNAL_PORT: number;
  readonly DEFAULT_SIGNAL_HOST: string;
  readonly ICE_SERVERS: readonly RTCIceServer[];
  readonly ROOM_CODE_LENGTH: number;
  readonly ROOM_CODE_CHARS: string;
  readonly RECONNECT_MAX_DELAY_MS: number;
  readonly RECONNECT_BASE_DELAY_MS: number;
  readonly RECONNECT_MAX_ATTEMPTS: number;
}

export const CONFIG: SignalConfig = Object.freeze({
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

export function createMessage(type: string, payload: Record<string, unknown> = {}): SignalMessage {
  return { type, ...payload };
}

// ---- Room code generator ----

const CHARS = CONFIG.ROOM_CODE_CHARS;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CONFIG.ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// ---- Signal URL builder ----

export function signalUrl(host?: string, port?: number): string {
  const h = host || CONFIG.DEFAULT_SIGNAL_HOST;
  const p = port || CONFIG.DEFAULT_SIGNAL_PORT;
  return `ws://${h}:${p}`;
}
