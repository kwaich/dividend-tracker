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
