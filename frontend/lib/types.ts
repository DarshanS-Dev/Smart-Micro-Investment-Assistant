// Mirrors app/schemas.py on the backend, field for field.

// NOTE: The onboarding schema (AssetBucketSelect) still validates
// "crypto" as a Literal option, but app/utils/constants.py's
// YFINANCE_TICKERS only maps "nifty50" and "gold" to a real ticker.
// If a user picks "crypto", ledger_service.execute_investments will
// raise ValueError the first time round-ups try to fire, and the
// upload endpoint quietly refunds the jar without investing — i.e.
// crypto users would just watch their spare change never invest.
// This is a genuine backend gap, not something the frontend can fix,
// so we disable the crypto option in the UI (see BucketCard) rather
// than let anyone select a bucket that can never execute a trade.
export type AssetBucket = "nifty50" | "gold" | "crypto";
export const UNSUPPORTED_BUCKETS: readonly AssetBucket[] = ["crypto"];

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
  // GAP: app/services/categorizer.py is an empty stub, so the backend
  // never actually sets Transaction.category — this will always be null
  // today. Left typed as nullable (not removed) since the backend schema
  // and DB column already support it; it'll "just work" the day
  // categorizer.py is implemented, with no frontend change needed.
  category: string | null;
  status: FeedStatus;
}

export interface CategoryInsight {
  category: string;
  total_spent: number;
  roundup_generated: number;
}

// Backend's DashboardResponse (app/schemas.py) — no `has_data` field.
// "Has this user uploaded anything yet" is derived client-side from
// empty lots/transaction_feed instead (see app/dashboard/page.tsx).
export interface DashboardResponse {
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