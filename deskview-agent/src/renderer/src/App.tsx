import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageType,
  SignalingClient,
  WebRTCManager,
  createChatMessage,
  signalUrl,
} from '@desklink/shared';
import type { ChatMessage, SignalMessage, SignalingState } from '@desklink/shared';
import AgentView from './components/AgentView';
import ChatView from './components/ChatView';

export default function App() {
  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [roomCode, setRoomCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    window.electronAPI.getScreenSources().then(setSources);
  }, []);

  const handleStart = useCallback(async (sourceId: string) => {
    if (!sourceId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        } as unknown as MediaTrackConstraints,
      });

      localStreamRef.current = stream;
      setPreviewStream(stream);
      setIsSharing(true);

      const webrtc = new WebRTCManager({
        role: 'agent',
        onSignal: (msg) => {
          if (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate') {
            signalingRef.current?.send(msg.type, msg as unknown as Record<string, unknown>);
          }
        },
        onData: (data) => {
          setMessages((prev) => [...prev, data as unknown as ChatMessage]);
        },
        onStateChange: (state) => setStatus('WebRTC: ' + state),
      });

      webrtc.addLocalStream(stream);
      webrtcRef.current = webrtc;

      const signaling = new SignalingClient({
        url: signalUrl(),
        onMessage: async (msg: SignalMessage) => {
          switch (msg.type) {
            case MessageType.ROOM_CREATED:
              setRoomCode('Room: ' + (msg.room as string));
              setStatus('Waiting for client to join...');
              break;
            case MessageType.CLIENT_READY:
              setStatus('Client joined, creating offer...');
              await webrtc.createOffer();
              break;
            case MessageType.ANSWER:
              await webrtc.handleAnswer(msg.sdp as RTCSessionDescriptionInit);
              break;
            case MessageType.ICE_CANDIDATE:
              await webrtc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
              break;
            case MessageType.PEER_GONE:
              setStatus('Client disconnected');
              webrtc.destroy();
              webrtcRef.current = null;
              break;
          }
        },
        onStateChange: (state: SignalingState) => {
          if (state === 'disconnected') setStatus('Signaling disconnected');
        },
      });

      signalingRef.current = signaling;
      signaling.connect();
      signaling.send(MessageType.REGISTER, { role: 'agent' });
    } catch (err) {
      setStatus('Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  const handleStop = useCallback(() => {
    webrtcRef.current?.destroy();
    webrtcRef.current = null;
    signalingRef.current?.disconnect();
    signalingRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setPreviewStream(null);
    setIsSharing(false);
    setRoomCode('');
    setStatus('Disconnected');
  }, []);

  const handleChatSend = useCallback((text: string) => {
    const msg = createChatMessage('Agent', text);
    webrtcRef.current?.sendData(msg as unknown as Record<string, unknown>);
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <>
      <AgentView
        sources={sources}
        roomCode={roomCode}
        status={status}
        isSharing={isSharing}
        previewStream={previewStream}
        onStart={handleStart}
        onStop={handleStop}
      />
      <ChatView messages={messages} senderName="Agent" onSend={handleChatSend} />
    </>
  );
}
