// src/app/core/models/promo-code.model.ts
export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue?: number;
  maxUses?: number;
  currentUses: number;
  applicableProducts?: string[]; // Array of product IDs
  applicableCategories?: string[]; // Array of category IDs
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}