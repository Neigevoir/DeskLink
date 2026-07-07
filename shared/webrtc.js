/**
 * WebRTCManager — unified RTCPeerConnection handler for agent and client roles.
 *
 * Agent role: holds the offerer side, sends local tracks, creates DataChannel.
 * Client role: holds the answerer side, receives remote tracks, accepts DataChannel.
 *
 * Owns: RTCPeerConnection, DataChannel, track management.
 * Does NOT own: signaling transport, DOM.
 *
 * @module shared/webrtc
 */

import { CONFIG } from './protocol.js';

/** @typedef {'agent'|'client'} WebRTCRole */
/** @typedef {'new'|'connecting'|'connected'|'failed'|'disconnected'|'closed'} WebRTCState */

export class WebRTCManager {
  /** @type {WebRTCRole} */
  #role;
  /** @type {RTCPeerConnection|null} */
  #pc;
  /** @type {RTCDataChannel|null} */
  #channel;
  /** @type {MediaStream|null} */
  #localStream;
  /** @type {(sdp: RTCSessionDescriptionInit) => void} */
  #onSignal;
  /** @type {(stream: MediaStream) => void} */
  #onTrack;
  /** @type {(data: object) => void} */
  #onData;
  /** @type {(state: WebRTCState) => void} */
  #onStateChange;

  /**
   * @param {object} opts
   * @param {WebRTCRole} opts.role
   * @param {(sdp: RTCSessionDescriptionInit) => void} opts.onSignal — called when SDP needs to be sent to peer
   * @param {(stream: MediaStream) => void} [opts.onTrack] — called when a remote video track arrives
   * @param {(data: object) => void} [opts.onData] — called when DataChannel message arrives
   * @param {(state: WebRTCState) => void} [opts.onStateChange]
   */
  constructor({ role, onSignal, onTrack, onData, onStateChange }) {
    this.#role = role;
    this.#onSignal = onSignal;
    this.#onTrack = onTrack || (() => {});
    this.#onData = onData || (() => {});
    this.#onStateChange = onStateChange || (() => {});
    this.#pc = null;
    this.#channel = null;
    this.#localStream = null;
  }

  /**
   * Initialize the underlying PeerConnection.
   * @returns {RTCPeerConnection}
   */
  init() {
    if (this.#pc) return this.#pc;

    this.#pc = new RTCPeerConnection({
      iceServers: CONFIG.ICE_SERVERS,
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
      /** @type {string} */
      const state = this.#pc ? this.#pc.connectionState : 'closed';
      this.#onStateChange(/** @type {WebRTCState} */ (state));
    };

    if (this.#role === 'agent') {
      this.#channel = this.#pc.createDataChannel('chat');
      this.#setupChannel();
    } else {
      this.#pc.ondatachannel = (event) => {
        this.#channel = event.channel;
        this.#setupChannel();
      };
    }

    return this.#pc;
  }

  /**
   * Add local tracks to the connection (agent only).
   * @param {MediaStream} stream
   */
  addLocalStream(stream) {
    this.#localStream = stream;
    const pc = this.init();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }

  /** Create and return an offer (agent only). */
  async createOffer() {
    const pc = this.init();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.#onSignal({ type: 'offer', sdp: pc.localDescription });
  }

  /**
   * Accept a remote offer and produce an answer (client only).
   * @param {RTCSessionDescriptionInit} sdp
   */
  async handleOffer(sdp) {
    const pc = this.init();
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.#onSignal({ type: 'answer', sdp: pc.localDescription });
  }

  /**
   * Accept a remote answer (agent only).
   * @param {RTCSessionDescriptionInit} sdp
   */
  async handleAnswer(sdp) {
    if (!this.#pc) return;
    await this.#pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  /**
   * Add a remote ICE candidate.
   * @param {RTCIceCandidateInit} candidate
   */
  async addIceCandidate(candidate) {
    if (!this.#pc) return;
    await this.#pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Send data over the DataChannel.
   * @param {object} data — will be JSON-serialized
   */
  sendData(data) {
    if (this.#channel && this.#channel.readyState === 'open') {
      this.#channel.send(JSON.stringify(data));
    }
  }

  /** Tear down everything. */
  destroy() {
    if (this.#channel) { this.#channel.close(); this.#channel = null; }
    if (this.#localStream) {
      this.#localStream.getTracks().forEach((t) => t.stop());
      this.#localStream = null;
    }
    if (this.#pc) { this.#pc.close(); this.#pc = null; }
    this.#onStateChange('closed');
  }

  // ---- Private ----

  #setupChannel() {
    if (!this.#channel) return;
    this.#channel.onmessage = (e) => {
      try {
        this.#onData(JSON.parse(e.data));
      } catch (_) { /* ignore */ }
    };
  }
}
