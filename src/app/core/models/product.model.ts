export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  price: number;
  salePrice?: number | null;
  images: string[];
  model3dUrl?: string;
  specifications: Record<string, any>;
  keyFeatures?: string[]; // ADD THIS LINE - Array of key features
  stock: number;
  featured: boolean;
  rating: number;
  reviews?: {
    count: number;
    items: Review[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface ProductSpecification {
  [key: string]: string | { [key: string]: string };
}