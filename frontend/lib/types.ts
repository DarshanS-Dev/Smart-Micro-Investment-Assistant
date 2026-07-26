// Mirrors app/schemas.py on the backend, field for field.

export type AssetBucket = "nifty50" | "gold" | "crypto";

export interface UserOut {
  id: number;
  email: string;
  asset_bucket: AssetBucket | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: UserOut;
  token: Token;
}

export interface InvestmentFired {
  amount_invested: number;
  asset: AssetBucket;
  price_at_purchase: number;
  purchase_date: string;
}

export interface UploadResponse {
  transactions_ingested: number;
  investments_executed: InvestmentFired[];
  pending_balance_after: number;
}

export interface TransactionOut {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  category: string | null;
  roundup_amount: number;
}

export interface AssetBreakdown {
  asset: AssetBucket;
  total_invested: number;
  current_value: number;
}

export interface GrowthPoint {
  date: string;
  value: number;
}

export interface LedgerLotOut {
  purchase_date: string;
  asset: AssetBucket;
  amount_invested: number;
  price_at_purchase: number;
  current_units: number;
  current_value: number;
}

export type FeedStatus = "accumulating" | "invested";

export interface TransactionFeedItem {
  date: string;
  merchant: string;
  amount: number;
  roundup_amount: number;
  cumulative_roundup: number;
  category: string | null;
  status: FeedStatus;
}

export interface CategoryInsight {
  category: string;
  total_spent: number;
  roundup_generated: number;
}

export interface DashboardResponse {
  has_data?: boolean;
  total_invested: number;
  current_value: number;
  gain_loss_amount: number;
  gain_loss_percent: number;
  price_updated_at: string;
  growth_series: GrowthPoint[];
  lots: LedgerLotOut[];
  per_asset: AssetBreakdown[];
  transaction_feed: TransactionFeedItem[];
  pending_roundup_balance: number;
  roundup_threshold: number;
  category_insights: CategoryInsight[];
}

export const ASSET_LABEL: Record<AssetBucket, string> = {
  nifty50: "Nifty 50 Index",
  gold: "Gold ETF",
  crypto: "Crypto",
};
