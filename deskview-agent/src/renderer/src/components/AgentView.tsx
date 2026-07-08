import { useEffect, useRef } from 'react';

interface AgentViewProps {
  roomCode: string;
  status: string;
  isSharing: boolean;
  previewStream: MediaStream | null;
  onStart: () => void;
  onStop: () => void;
}

export default function AgentView({
  roomCode,
  status,
  isSharing,
  previewStream,
  onStart,
  onStop,
}: AgentViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = previewStream;
  }, [previewStream]);

  return (
    <>
      <div className="btn-row">
        <button className="btn-start" disabled={isSharing} onClick={onStart}>
          Start Sharing
        </button>
        <button className="btn-stop" disabled={!isSharing} onClick={onStop}>
          Stop
        </button>
      </div>
      <div id="roomCode">{roomCode}</div>
      <div id="status">{status}</div>
      <video ref={videoRef} autoPlay muted />
    </>
  );
}
