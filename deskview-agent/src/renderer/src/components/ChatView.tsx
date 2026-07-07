import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@desklink/shared';

interface ChatViewProps {
  messages: ChatMessage[];
  senderName: string;
  onSend: (text: string) => void;
}

export default function ChatView({ messages, senderName, onSend }: ChatViewProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className="chat-msg">
            <span className={`chat-sender${m.sender === senderName ? ' self' : ''}`}>
              {m.sender}:
            </span>{' '}
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </>
  );
}
