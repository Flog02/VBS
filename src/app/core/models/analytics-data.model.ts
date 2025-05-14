// src/app/core/models/analytics-data.model.ts
export interface AnalyticsData {
  salesSummary: {
    daily: SalesDataPoint[];
    weekly: SalesDataPoint[];
    monthly: SalesDataPoint[];
    yearly: SalesDataPoint[];
  };
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  topCategories: {
    category: string;
    quantity: number;
    revenue: number;
  }[];
  customerStats: {
    total: number;
    new: number;
    returning: number;
  };
  conversionRate: number;
  averageOrderValue: number;
  lastUpdated: Date;
}

export interface SalesDataPoint {
  date: Date;
  orders: number;
  revenue: number;
  customers: number;
}