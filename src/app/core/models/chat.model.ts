// src/app/core/models/chat.model.ts
export interface Chat {
  id: string;
  userId: string;
  agentId?: string;
  status: 'active' | 'closed' | 'waiting_for_human'; // This line
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
    escalatedAt?: Date; // Added escalation timestamp

}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  content: string;
  timestamp: Date;
}