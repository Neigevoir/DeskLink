import { useCallback, useRef, useState } from 'react';
import {
  MessageType,
  SignalingClient,
  WebRTCManager,
  signalUrl,
} from '@desklink/shared';
import type { ControlMessage, SignalMessage, SignalingState } from '@desklink/shared';
import AgentView from './components/AgentView';

export default function App() {
  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState('Disconnected');
  const [roomCode, setRoomCode] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const handleStart = useCallback(async () => {
    try {
      const sources = await window.electronAPI.getScreenSources();
      const screen = sources[0];
      if (!screen) {
        setStatus('Error: No screen source found');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screen.id,
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
          const msg = data as unknown as ControlMessage;
          switch (msg.type) {
            case 'mouse-move':
              window.electronAPI.mouseMove(msg.x, msg.y);
              break;
            case 'mouse-down':
              window.electronAPI.mouseToggle('down', msg.button);
              break;
            case 'mouse-up':
              window.electronAPI.mouseToggle('up', msg.button);
              break;
            case 'mouse-wheel':
              window.electronAPI.mouseScroll(msg.deltaX, msg.deltaY);
              break;
            case 'key-down':
              window.electronAPI.keyToggle(msg.code, msg.key, 'down',
                msg.shiftKey, msg.ctrlKey, msg.altKey, msg.metaKey);
              break;
            case 'key-up':
              window.electronAPI.keyToggle(msg.code, msg.key, 'up',
                msg.shiftKey, msg.ctrlKey, msg.altKey, msg.metaKey);
              break;
          }
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

  return (
    <>
      <AgentView
        roomCode={roomCode}
        status={status}
        isSharing={isSharing}
        previewStream={previewStream}
        onStart={handleStart}
        onStop={handleStop}
      />
    </>
  );
}
