import { CONFIG } from './protocol.js';

export type WebRTCRole = 'agent' | 'client';
export type WebRTCState = 'new' | 'connecting' | 'connected' | 'failed' | 'disconnected' | 'closed';

export interface WebRTCManagerOptions {
  role: WebRTCRole;
  onSignal: (msg: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => void;
  onTrack?: (stream: MediaStream) => void;
  onData?: (data: Record<string, unknown>) => void;
  onStateChange?: (state: WebRTCState) => void;
}

export class WebRTCManager {
  #role: WebRTCRole;
  #pc: RTCPeerConnection | null;
  #channel: RTCDataChannel | null;
  #localStream: MediaStream | null;
  #onSignal: (msg: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => void;
  #onTrack: (stream: MediaStream) => void;
  #onData: (data: Record<string, unknown>) => void;
  #onStateChange: (state: WebRTCState) => void;

  constructor({ role, onSignal, onTrack, onData, onStateChange }: WebRTCManagerOptions) {
    this.#role = role;
    this.#onSignal = onSignal;
    this.#onTrack = onTrack || (() => {});
    this.#onData = onData || (() => {});
    this.#onStateChange = onStateChange || (() => {});
    this.#pc = null;
    this.#channel = null;
    this.#localStream = null;
  }

  init(): RTCPeerConnection {
    if (this.#pc) return this.#pc;

    this.#pc = new RTCPeerConnection({
      iceServers: [...CONFIG.ICE_SERVERS],
    });

    this.#pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.#onSignal({ type: 'ice-candidate', candidate: e.candidate });
      }
    };

    this.#pc.ontrack = (event) => {
      if (event.streams[0]) {
        this.#onTrack(event.streams[0]);
      }
    };

    this.#pc.onconnectionstatechange = () => {
      const state = (this.#pc ? this.#pc.connectionState : 'closed') as WebRTCState;
      this.#onStateChange(state);
    };

    if (this.#role === 'agent') {
      this.#channel = this.#pc.createDataChannel('control');
      this.#setupChannel();
    } else {
      this.#pc.ondatachannel = (event) => {
        this.#channel = event.channel;
        this.#setupChannel();
      };
    }

    return this.#pc;
  }

  addLocalStream(stream: MediaStream): void {
    this.#localStream = stream;
    const pc = this.init();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }

  async createOffer(): Promise<void> {
    const pc = this.init();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.#onSignal({ type: 'offer', sdp: pc.localDescription! });
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.init();
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.#onSignal({ type: 'answer', sdp: pc.localDescription! });
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.#pc) return;
    await this.#pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.#pc) return;
    await this.#pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  sendData(data: Record<string, unknown>): void {
    if (this.#channel && this.#channel.readyState === 'open') {
      this.#channel.send(JSON.stringify(data));
    }
  }

  destroy(): void {
    if (this.#channel) {
      this.#channel.close();
      this.#channel = null;
    }
    if (this.#localStream) {
      this.#localStream.getTracks().forEach((t) => t.stop());
      this.#localStream = null;
    }
    if (this.#pc) {
      this.#pc.close();
      this.#pc = null;
    }
    this.#onStateChange('closed');
  }

  #setupChannel(): void {
    if (!this.#channel) return;
    this.#channel.onmessage = (e) => {
      try {
        this.#onData(JSON.parse(e.data as string) as Record<string, unknown>);
      } catch (_) {
        /* ignore */
      }
    };
  }
}
