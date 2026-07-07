export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
}

export function createChatMessage(sender: string, text: string): ChatMessage {
  return { sender, text, timestamp: Date.now() };
}
