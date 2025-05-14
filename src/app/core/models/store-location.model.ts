// src/app/core/models/store-location.model.ts
export interface StoreLocation {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  phone: string;
  email: string;
  isActive: boolean;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}