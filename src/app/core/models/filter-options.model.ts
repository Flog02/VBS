// src/app/core/models/filter-options.model.ts
export interface FilterOptions {
  categories: string[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
  rating: number;
  availability: boolean;
}