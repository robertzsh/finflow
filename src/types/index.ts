export type TxType = 'income' | 'expense';
export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;      // lucide icon name
  color: string;     // hex
  custom?: boolean;
}

export type PaymentMethod =
  | 'Card' | 'Cash' | 'Bank Transfer' | 'Direct Debit' | 'PayPal' | 'Apple Pay' | 'Google Pay' | 'Other';

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;          // always positive; sign derived from type
  categoryId: string;
  merchant: string;
  method: PaymentMethod;
  date: string;            // ISO yyyy-mm-dd
  notes?: string;
  recurring: boolean;
  frequency?: RecurringFrequency;
  receipt?: string;        // data URL
  createdAt: string;
  createdBy?: string;      // profile id (cloud mode) — who added it
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;          // monthly limit
  month: string;           // yyyy-MM  (or 'all' for recurring monthly)
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthlyContribution: number;
  color: string;
  icon: string;
  createdAt: string;
  currency?: CurrencyCode;   // defaults to the app base currency (RON)
}

export type InvestmentKind = 'Stock' | 'ETF' | 'Crypto' | 'Savings' | 'Pension';

export interface InvestmentPoint { date: string; value: number; }

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  kind: InvestmentKind;
  units: number;
  costBasis: number;       // total invested (in the item's currency)
  currentValue: number;    // current market value (in the item's currency)
  history: InvestmentPoint[];
  currency?: CurrencyCode; // defaults to the app base currency (RON)
}

export type CurrencyCode = 'RON' | 'GBP' | 'USD' | 'EUR';

// How many base-currency units (lei) one unit of the given currency is worth.
// Used only to combine multi-currency goals/investments into unified totals.
export type FxRates = Record<CurrencyCode, number>;

export interface Settings {
  currency: CurrencyCode;      // base currency for the whole app (RON)
  fxRates: FxRates;            // editable rates → base currency
  theme: 'dark' | 'light';
  pinEnabled: boolean;
  pin?: string;
  biometric: boolean;
  sessionTimeoutMin: number;
  name: string;
  onboarded: boolean;
}

export interface AppData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  investments: Investment[];
  settings: Settings;
}
