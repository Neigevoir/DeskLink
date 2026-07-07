/**
 * Room — manages one agent-client pair within the signaling server.
 *
 * Each room has exactly one agent and one client WebSocket.
 * Messages from one peer are relayed to the other.
 * When a peer disconnects, the remaining peer is notified.
 *
 * @module deskview-server/src/room
 */

import { MessageType, createMessage } from '../../shared/protocol.js';

export class Room {
  /** @type {string} */
  id;
  /** @type {import('ws').WebSocket|null} */
  agent;
  /** @type {import('ws').WebSocket|null} */
  client;

  /**
   * @param {string} id
   */
  constructor(id) {
    this.id = id;
    this.agent = null;
    this.client = null;
  }

  /**
   * Register a peer in this room.
   * @param {import('ws').WebSocket} ws
   * @param {'agent'|'client'} role
   * @returns {{ ok: boolean, error?: string }}
   */
  register(ws, role) {
    if (role === 'agent') {
      if (this.agent) return { ok: false, error: 'Room already has an agent' };
      this.agent = ws;
      if (this.client) {
        this.client.send(JSON.stringify(createMessage(MessageType.AGENT_READY)));
        this.agent.send(JSON.stringify(createMessage(MessageType.CLIENT_READY)));
      }
      return { ok: true };
    }

    if (role === 'client') {
      if (this.client) return { ok: false, error: 'Room already has a client' };
      this.client = ws;
      if (this.agent) {
        this.client.send(JSON.stringify(createMessage(MessageType.AGENT_READY)));
        this.agent.send(JSON.stringify(createMessage(MessageType.CLIENT_READY)));
      }
      return { ok: true };
    }

    return { ok: false, error: 'Unknown role' };
  }

  /**
   * Remove a peer from the room and notify the other side.
   * @param {import('ws').WebSocket} ws
   */
  unregister(ws) {
    if (ws === this.agent) {
      this.agent = null;
      if (this.client && this.client.readyState === 1) {
        this.client.send(JSON.stringify(createMessage(MessageType.PEER_GONE)));
      }
    } else if (ws === this.client) {
      this.client = null;
      if (this.agent && this.agent.readyState === 1) {
        this.agent.send(JSON.stringify(createMessage(MessageType.PEER_GONE)));
      }
    }
  }

  /**
   * Relay a message from one peer to the other.
   * @param {import('ws').WebSocket} from
   * @param {object} message
   */
  relay(from, message) {
    const peer = this.getPeer(from);
    if (peer && peer.readyState === 1) {
      peer.send(JSON.stringify(message));
    }
  }

  /**
   * Get the other peer in this room.
   * @param {import('ws').WebSocket} ws
   * @returns {import('ws').WebSocket|null}
   */
  getPeer(ws) {
    return ws === this.agent ? this.client : ws === this.client ? this.agent : null;
  }

  /** @returns {boolean} */
  isEmpty() {
    return !this.agent && !this.client;
  }
}
