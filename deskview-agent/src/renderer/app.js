/**
 * DeskLink Agent — renderer entry point.
 *
 * Wires screen capture, signaling, WebRTC, and chat using shared modules.
 * All the heavy lifting lives in shared/ — this file is just glue (~60 lines).
 *
 * @module deskview-agent/renderer/app
 */

import { MessageType, signalUrl, createMessage } from '../../../shared/protocol.js';
import { SignalingClient } from '../../../shared/signaling.js';
import { WebRTCManager } from '../../../shared/webrtc.js';
import { ChatUI } from '../../../shared/chat.js';

// ---- State ----
/** @type {SignalingClient|null} */
let signaling;
/** @type {WebRTCManager|null} */
let webrtc;
/** @type {ChatUI|null} */
let chat;
/** @type {MediaStream|null} */
let localStream;

// ---- DOM refs ----
const startBtn = /** @type {HTMLButtonElement} */ (document.getElementById('startBtn'));
const stopBtn = /** @type {HTMLButtonElement} */ (document.getElementById('stopBtn'));
const sourceSelect = /** @type {HTMLSelectElement} */ (document.getElementById('sourceSelect'));
const statusEl = /** @type {HTMLElement} */ (document.getElementById('status'));
const preview = /** @type {HTMLVideoElement} */ (document.getElementById('preview'));
const roomCodeEl = /** @type {HTMLElement} */ (document.getElementById('roomCode'));

/** @param {string} text */
function setStatus(text) {
  statusEl.textContent = text;
}

// ---- Load screen sources ----
async function loadSources() {
  const sources = await window.electronAPI.getScreenSources();
  sourceSelect.innerHTML = sources
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join('');
}
loadSources();

// ---- Start sharing ----
startBtn.onclick = async () => {
  const sourceId = sourceSelect.value;
  if (!sourceId) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: /** @type {any} */ ({
        mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId },
      }),
    });

    preview.srcObject = localStream;
    startBtn.disabled = true;
    stopBtn.disabled = false;

    setupWebRTC();
  } catch (err) {
    setStatus('Error: ' + err.message);
    console.error(err);
  }
};

// ---- Stop sharing ----
stopBtn.onclick = () => {
  if (webrtc) { webrtc.destroy(); webrtc = null; }
  if (chat) { chat.destroy(); chat = null; }
  if (signaling) { signaling.disconnect(); signaling = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  preview.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  roomCodeEl.textContent = '';
  setStatus('Disconnected');
};

// ---- WebRTC + Signaling setup ----
function setupWebRTC() {
  webrtc = new WebRTCManager({
    role: 'agent',
    onSignal: (msg) => {
      if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
        signaling.send(msg.type, msg);
      }
    },
    onData: (data) => {
      if (chat) chat.addMessage(data, false);
    },
    onStateChange: (state) => setStatus('WebRTC: ' + state),
  });

  webrtc.addLocalStream(localStream);

  signaling = new SignalingClient({
    url: signalUrl(),
    onMessage: async (msg) => {
      switch (msg.type) {
        case MessageType.ROOM_CREATED:
          roomCodeEl.textContent = 'Room: ' + msg.room;
          setStatus('Waiting for client to join...');
          break;
        case MessageType.CLIENT_READY:
          setStatus('Client joined, creating offer...');
          await webrtc.createOffer();
          break;
        case MessageType.ANSWER:
          await webrtc.handleAnswer(msg.sdp);
          break;
        case MessageType.ICE_CANDIDATE:
          await webrtc.addIceCandidate(msg.candidate);
          break;
        case MessageType.PEER_GONE:
          setStatus('Client disconnected');
          if (webrtc) { webrtc.destroy(); webrtc = null; }
          break;
      }
    },
    onStateChange: (state) => {
      if (state === 'disconnected') setStatus('Signaling disconnected');
    },
  });

  signaling.connect();
  signaling.send(MessageType.REGISTER, { role: 'agent' });

  chat = new ChatUI({
    container: document.getElementById('chat'),
    senderName: 'Agent',
    onSend: (text) => {
      if (webrtc) webrtc.sendData({ sender: 'Agent', text, timestamp: Date.now() });
      if (chat) chat.addMessage({ sender: 'Agent', text, timestamp: Date.now() }, true);
    },
  });
}
