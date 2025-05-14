// src/app/core/models/app-settings.model.ts
export interface AppSettings {
  id: string;
  siteName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  taxRate: number;
  contactEmail: string;
  contactPhone: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  footerText: string;
  metaDescription: string;
  enabledFeatures: {
    reviews: boolean;
    wishlist: boolean;
    chatbot: boolean;
    threeD: boolean;
  };
  updatedAt: Date;
  updatedBy: string;
}