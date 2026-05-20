export interface DividendSuggestion {
  id: string;
  symbol: string;
  assetId: string;
  date: string; // YYYY-MM-DD
  shares: number;
  dividendPerShare: number;
  amount: number;
  currency: string;
  payDate?: string; // YYYY-MM-DD, pay date if different from ex-date
  accountId: string;
  availableAccountIds: string[];
}

export type DividendStatus = "new" | "existing";

export interface DividendRow {
  id: string;
  status: DividendStatus;
  symbol: string;
  assetId: string;
  date: string; // YYYY-MM-DD
  shares?: number;
  dividendPerShare?: number;
  amount: number;
  currency: string;
  payDate?: string;
  accountId: string;
  accountName?: string;
  availableAccountIds: string[];
}
