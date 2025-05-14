// src/app/core/models/wishlist.model.ts
export interface Wishlist {
  userId: string;
  items: WishlistItem[];
  updatedAt: Date;
}

export interface WishlistItem {
  productId: string;
  addedAt: Date;
}