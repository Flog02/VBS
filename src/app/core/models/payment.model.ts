// src/app/core/models/payment.model.ts
export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  transactionId: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
}