export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  rating?: number;
  featured?: boolean;
  images: string[];
  model3dUrl?: string;
  specifications?: Record<string, string>;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}