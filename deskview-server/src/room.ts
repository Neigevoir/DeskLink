import { MessageType, createMessage } from '@desklink/shared';
import type { WebSocket } from 'ws';
import type { SignalMessage } from '@desklink/shared';

export class Room {
  id: string;
  agent: WebSocket | null = null;
  client: WebSocket | null = null;

  constructor(id: string) {
    this.id = id;
  }

  register(ws: WebSocket, role: 'agent' | 'client'): { ok: boolean; error?: string } {
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

  unregister(ws: WebSocket): void {
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

  relay(from: WebSocket, message: SignalMessage): void {
    const peer = this.getPeer(from);
    if (peer && peer.readyState === 1) {
      peer.send(JSON.stringify(message));
    }
  }

  getPeer(ws: WebSocket): WebSocket | null {
    return ws === this.agent ? this.client : ws === this.client ? this.agent : null;
  }

  isEmpty(): boolean {
    return !this.agent && !this.client;
  }
}
