/**
 * DeskLink Client — renderer entry point (Electron).
 *
 * User enters a room code, then video and chat are wired via shared modules.
 *
 * @module deskview-client/renderer/app
 */

import { MessageType, signalUrl } from '../../../shared/protocol.js';
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

// ---- DOM refs ----
const statusBar = /** @type {HTMLElement} */ (document.getElementById('status-bar'));
const screenContainer = /** @type {HTMLElement} */ (document.getElementById('screen-container'));
const roomInput = /** @type {HTMLInputElement} */ (document.getElementById('roomInput'));
const connectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('connectBtn'));
const joinPanel = /** @type {HTMLElement} */ (document.getElementById('join-panel'));

/** @param {string} text */
function setStatus(text) {
  statusBar.textContent = 'Status: ' + text;
}

// ---- Connect with room code ----
connectBtn.onclick = () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) return;

  joinPanel.style.display = 'none';
  setupConnection(code);
};

roomInput.onkeydown = (e) => {
  if (e.key === 'Enter') connectBtn.click();
};

function setupConnection(code) {
  signaling = new SignalingClient({
    url: signalUrl(),
    onMessage: async (msg) => {
      switch (msg.type) {
        case MessageType.JOIN_SUCCESS:
          setStatus('Joined room ' + code + ', waiting for agent...');
          break;
        case MessageType.JOIN_ERROR:
          setStatus('Join failed: ' + msg.error);
          showJoinPanel();
          break;
        case MessageType.AGENT_READY:
          setStatus('Agent found, setting up...');
          setupWebRTC();
          break;
        case MessageType.OFFER:
          if (!webrtc) setupWebRTC();
          await webrtc.handleOffer(msg.sdp);
          setStatus('Connected, receiving...');
          break;
        case MessageType.ANSWER:
          await webrtc.handleAnswer(msg.sdp);
          break;
        case MessageType.ICE_CANDIDATE:
          if (msg.candidate && webrtc) {
            await webrtc.addIceCandidate(msg.candidate);
          }
          break;
        case MessageType.PEER_GONE:
          setStatus('Agent disconnected');
          cleanup();
          showPlaceholder();
          break;
      }
    },
    onStateChange: (state) => {
      if (state === 'disconnected') setStatus('Signaling disconnected');
    },
  });

  signaling.connect();
  signaling.send(MessageType.REGISTER, { role: 'client', room: code });
  setStatus('Connecting to room ' + code + '...');
}

function setupWebRTC() {
  webrtc = new WebRTCManager({
    role: 'client',
    onSignal: (msg) => {
      if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
        signaling.send(msg.type, msg);
      }
    },
    onTrack: (stream) => {
      setStatus('Viewing remote screen');
      screenContainer.innerHTML = '';
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      screenContainer.appendChild(video);
    },
    onData: (data) => {
      if (chat) chat.addMessage(data, false);
    },
    onStateChange: (state) => {
      if (state === 'failed' || state === 'disconnected') {
        setStatus('Connection lost');
        showPlaceholder();
      }
    },
  });

  chat = new ChatUI({
    container: document.getElementById('chat-panel'),
    senderName: 'Client',
    onSend: (text) => {
      if (webrtc) webrtc.sendData({ sender: 'Client', text, timestamp: Date.now() });
      if (chat) chat.addMessage({ sender: 'Client', text, timestamp: Date.now() }, true);
    },
  });
}

function cleanup() {
  if (webrtc) { webrtc.destroy(); webrtc = null; }
  if (chat) { chat.destroy(); chat = null; }
  if (signaling) { signaling.disconnect(); signaling = null; }
}

function showPlaceholder() {
  screenContainer.innerHTML = '<span class="placeholder">Waiting for remote screen...</span>';
}

function showJoinPanel() {
  cleanup();
  showPlaceholder();
  joinPanel.style.display = 'flex';
}
