// src/app/core/models/chat.model.ts
export interface Chat {
  id: string;
  userId: string;
  agentId?: string;
  status: 'active' | 'closed';
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  content: string;
  timestamp: Date;
}