// src/app/core/models/notification.model.ts
export interface Notification {
  id: string;
  recipientId: string;
  type: 'order_status' | 'new_order' | 'chat_escalation' | 'stock_alert' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  orderId?: string;
  chatId?: string;
  productId?: string;
  createdAt: Date;
  readAt?: Date;
}