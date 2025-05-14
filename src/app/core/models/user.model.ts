// src/app/core/models/user.model.ts
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  role: 'customer' | 'admin';
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt?: Date;
  photoURL?: string;
  refreshTime?: Date;
}