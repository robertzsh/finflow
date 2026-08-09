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
}

export type InvestmentKind = 'Stock' | 'ETF' | 'Crypto' | 'Savings' | 'Pension';

export interface InvestmentPoint { date: string; value: number; }

export interface Investment {
  id: string;
  name: string;
  ticker?: string;
  kind: InvestmentKind;
  units: number;
  costBasis: number;       // total invested
  currentValue: number;    // current market value
  history: InvestmentPoint[];
}

export type CurrencyCode = 'GBP' | 'USD' | 'EUR';

export interface Settings {
  currency: CurrencyCode;
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
