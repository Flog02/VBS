// src/app/core/models/cart.model.ts
export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  stock: number;
}