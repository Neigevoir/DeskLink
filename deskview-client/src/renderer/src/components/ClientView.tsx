import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@desklink/shared';
import ChatView from './ChatView';

interface ClientViewProps {
  remoteStream: MediaStream | null;
  messages: ChatMessage[];
  onChatSend: (text: string) => void;
}

export default function ClientView({ remoteStream, messages, onChatSend }: ClientViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  return (
    <div className="main-area">
      <div className="screen-container">
        {remoteStream ? (
          <video ref={videoRef} autoPlay playsInline />
        ) : (
          <span className="placeholder">Waiting for remote screen...</span>
        )}
      </div>
      <div className="chat-panel">
        <ChatView messages={messages} senderName="Client" onSend={onChatSend} />
      </div>
    </div>
  );
}
