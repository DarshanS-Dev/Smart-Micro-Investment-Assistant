/**
 * Dev-only mock data — rendered when the backend is unreachable.
 * Mirrors the shape of DashboardResponse from lib/types.ts.
 */
import type { DashboardResponse, UserOut } from "./types";

export const DEV_BYPASS_TOKEN = "dev-bypass";

export const DEV_USER: UserOut = {
  id: 0,
  email: "dev@localhost",
  asset_bucket: "nifty50",
  created_at: new Date().toISOString(),
};

export const MOCK_DASHBOARD: DashboardResponse = {
  has_data: true,
  total_invested: 4250,
  current_value: 4893.5,
  gain_loss_amount: 643.5,
  gain_loss_percent: 15.14,
  price_updated_at: new Date().toISOString(),
  growth_series: [
    { date: "2025-01-01", value: 500 },
    { date: "2025-02-01", value: 980 },
    { date: "2025-03-01", value: 1350 },
    { date: "2025-04-01", value: 1820 },
    { date: "2025-05-01", value: 2400 },
    { date: "2025-06-01", value: 2950 },
    { date: "2025-07-01", value: 3600 },
    { date: "2025-08-01", value: 3980 },
    { date: "2025-09-01", value: 4250 },
    { date: "2025-10-01", value: 4500 },
    { date: "2025-11-01", value: 4750 },
    { date: "2025-12-01", value: 4893.5 },
  ],
  lots: [
    {
      purchase_date: "2025-03-15",
      asset: "nifty50",
      amount_invested: 2500,
      price_at_purchase: 22450,
      current_units: 0.1113,
      current_value: 2872.5,
    },
    {
      purchase_date: "2025-06-20",
      asset: "nifty50",
      amount_invested: 1750,
      price_at_purchase: 23100,
      current_units: 0.0757,
      current_value: 2021.0,
    },
  ],
  per_asset: [
    { asset: "nifty50", total_invested: 4250, current_value: 4893.5 },
  ],
  transaction_feed: [
    {
      date: "2025-12-10",
      merchant: "Swiggy",
      amount: 348,
      roundup_amount: 2,
      cumulative_roundup: 120,
      category: "Food",
      status: "accumulating",
    },
    {
      date: "2025-12-08",
      merchant: "BigBasket",
      amount: 1243,
      roundup_amount: 7,
      cumulative_roundup: 118,
      category: "Groceries",
      status: "accumulating",
    },
    {
      date: "2025-12-05",
      merchant: "BookMyShow",
      amount: 580,
      roundup_amount: 20,
      cumulative_roundup: 111,
      category: "Entertainment",
      status: "invested",
    },
    {
      date: "2025-12-01",
      merchant: "DMart",
      amount: 2176,
      roundup_amount: 24,
      cumulative_roundup: 91,
      category: "Groceries",
      status: "invested",
    },
    {
      date: "2025-11-28",
      merchant: "Zomato",
      amount: 412,
      roundup_amount: 8,
      cumulative_roundup: 67,
      category: "Food",
      status: "invested",
    },
  ],
  pending_roundup_balance: 120,
  roundup_threshold: 500,
  category_insights: [
    { category: "Groceries", total_spent: 18400, roundup_generated: 920 },
    { category: "Food", total_spent: 9600, roundup_generated: 480 },
    { category: "Entertainment", total_spent: 4200, roundup_generated: 210 },
    { category: "Transport", total_spent: 3100, roundup_generated: 155 },
    { category: "Shopping", total_spent: 7800, roundup_generated: 390 },
  ],
};
