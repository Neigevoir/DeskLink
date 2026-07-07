import { useCallback, useRef, useState } from 'react';
import {
  MessageType,
  SignalingClient,
  WebRTCManager,
  createChatMessage,
  signalUrl,
} from '@desklink/shared';
import type { ChatMessage, SignalMessage, SignalingState } from '@desklink/shared';
import JoinView from './components/JoinView';
import ClientView from './components/ClientView';

export default function App() {
  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);

  const [status, setStatus] = useState('Ready');
  const [isJoined, setIsJoined] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const cleanup = useCallback(() => {
    webrtcRef.current?.destroy();
    webrtcRef.current = null;
    signalingRef.current?.disconnect();
    signalingRef.current = null;
    setRemoteStream(null);
    setIsJoined(false);
  }, []);

  const handleConnect = useCallback(
    (code: string) => {
      setIsJoined(true);

      const signaling = new SignalingClient({
        url: signalUrl(),
        onMessage: async (msg: SignalMessage) => {
          switch (msg.type) {
            case MessageType.JOIN_SUCCESS:
              setStatus('Joined room ' + code + ', waiting for agent...');
              break;
            case MessageType.JOIN_ERROR:
              setStatus('Join failed: ' + (msg.error as string));
              cleanup();
              break;
            case MessageType.AGENT_READY:
              setStatus('Agent found, setting up...');
              setupWebRTC();
              break;
            case MessageType.OFFER:
              if (!webrtcRef.current) setupWebRTC();
              await webrtcRef.current!.handleOffer(msg.sdp as RTCSessionDescriptionInit);
              setStatus('Connected, receiving...');
              break;
            case MessageType.ICE_CANDIDATE:
              if (msg.candidate && webrtcRef.current) {
                await webrtcRef.current.addIceCandidate(msg.candidate as RTCIceCandidateInit);
              }
              break;
            case MessageType.PEER_GONE:
              setStatus('Agent disconnected');
              cleanup();
              break;
          }
        },
        onStateChange: (state: SignalingState) => {
          if (state === 'disconnected') setStatus('Signaling disconnected');
        },
      });

      signalingRef.current = signaling;
      signaling.connect();
      signaling.send(MessageType.REGISTER, { role: 'client', room: code });
      setStatus('Connecting to room ' + code + '...');
    },
    [cleanup],
  );

  const setupWebRTC = useCallback(() => {
    const webrtc = new WebRTCManager({
      role: 'client',
      onSignal: (msg) => {
        if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
          signalingRef.current?.send(msg.type, msg as unknown as Record<string, unknown>);
        }
      },
      onTrack: (stream) => {
        setRemoteStream(stream);
        setStatus('Viewing remote screen');
      },
      onData: (data) => {
        setMessages((prev) => [...prev, data as unknown as ChatMessage]);
      },
      onStateChange: (state) => {
        if (state === 'failed' || state === 'disconnected') {
          setStatus('Connection lost');
        }
      },
    });

    webrtcRef.current = webrtc;
  }, []);

  const handleChatSend = useCallback((text: string) => {
    const msg = createChatMessage('Client', text);
    webrtcRef.current?.sendData(msg as unknown as Record<string, unknown>);
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <>
      {!isJoined && <JoinView onConnect={handleConnect} />}
      <div id="status-bar">Status: {status}</div>
      {isJoined ? (
        <ClientView
          remoteStream={remoteStream}
          messages={messages}
          onChatSend={handleChatSend}
        />
      ) : (
        <div className="main-area">
          <div className="screen-container">
            <span className="placeholder">Waiting for remote screen...</span>
          </div>
        </div>
      )}
    </>
  );
}
