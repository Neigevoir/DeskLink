import { useEffect, useRef, useState } from 'react';

interface AgentViewProps {
  sources: ScreenSource[];
  roomCode: string;
  status: string;
  isSharing: boolean;
  previewStream: MediaStream | null;
  onStart: (sourceId: string) => void;
  onStop: () => void;
}

export default function AgentView({
  sources,
  roomCode,
  status,
  isSharing,
  previewStream,
  onStart,
  onStop,
}: AgentViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = previewStream;
  }, [previewStream]);

  const handleStart = () => {
    const id = selectedId || sources[0]?.id;
    if (id) onStart(id);
  };

  return (
    <>
      <label>Share:</label>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        {sources.length === 0 && <option value="">Loading sources...</option>}
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="btn-row">
        <button className="btn-start" disabled={isSharing} onClick={handleStart}>
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
