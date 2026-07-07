import { useState } from 'react';

interface JoinViewProps {
  onConnect: (code: string) => void;
}

export default function JoinView({ onConnect }: JoinViewProps) {
  const [code, setCode] = useState('');

  const handleConnect = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    onConnect(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  return (
    <div className="join-panel">
      <h2>DeskLink</h2>
      <input
        type="text"
        placeholder="Room code"
        maxLength={4}
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleConnect}>Connect</button>
      <span className="hint">Enter the 4-letter code shown on the Agent</span>
    </div>
  );
}
