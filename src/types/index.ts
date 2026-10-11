export type TxType = 'income' | 'expense';
export type CategoryKind = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;      // lucide icon name
  color: string;     // hex
  emoji?: string;    // shown next to the category in menus & lists
  parent?: string;   // if set, this is a sub-category (e.g. a store under Groceries)
  custom?: boolean;
  recurring?: boolean; // treat every transaction in this category as a monthly bill (utilities, HOA…)
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
  origCurrency?: CurrencyCode; // if entered in a foreign currency, the currency it was typed in…
  origAmount?: number;         // …and the amount in that currency (so it can re-convert at any date)
  variableAmount?: boolean; // recurring bill whose amount changes (Digi/EON…) → confirm before posting
  auto?: boolean;           // this instance was auto-posted from a recurring template
  recurrenceKey?: string;   // idempotency: merchant|categoryId|frequency|occurrenceDate
  receipt?: string;         // data URL
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
  owner?: string;            // member id for a personal goal; undefined = shared/family goal
  contributions?: GoalContribution[];
}

export interface GoalContribution {
  date: string;   // yyyy-mm-dd
  amount: number; // in the app BASE currency (lei), regardless of the goal's own currency
  by?: string;    // member id who contributed
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

export interface SavingsMovement {
  id: string;
  date: string;      // yyyy-mm-dd
  amount: number;    // signed, in the POT's currency (+ deposit, − withdrawal)
  base: number;      // signed lei value at the time — what left / returned to the main account
  by?: string;       // member id who moved it
  note?: string;
  autoKey?: string;  // `${potId}|yyyy-mm` — idempotency for auto-save
}

export interface AutoSaveRule {
  mode: 'fixed' | 'percent'; // fixed amount in the pot's currency, or % of the owner's salary
  value: number;
  day: number;               // day of month (1-28) to move the money
  enabled: boolean;
}

/** A place where saved money sits (savings account, vault, cash at home, deposit). */
export interface SavingsPot {
  id: string;
  name: string;
  icon: string;
  color: string;
  currency?: CurrencyCode;   // defaults to the app base currency (RON)
  owner?: string;            // member id for a personal pot; undefined = joint
  startBalance: number;      // already there before tracking — does NOT touch the main balance
  movements: SavingsMovement[];
  autoSave?: AutoSaveRule;
  createdAt: string;
  createdBy?: string;        // member id — decides which device posts a joint pot's auto-save
}

export type CurrencyCode = 'RON' | 'GBP' | 'USD' | 'EUR';

// How many base-currency units (lei) one unit of the given currency is worth.
// Used only to combine multi-currency goals/investments into unified totals.
export type FxRates = Record<CurrencyCode, number>;

export interface Settings {
  currency: CurrencyCode;      // base currency for the whole app (RON)
  fxRates: FxRates;            // editable rates → base currency
  openingBalance: number;      // starting bank balance; income/expenses adjust it
  salary: number;              // fixed monthly salary, auto-added each month
  vouchers: number;            // default monthly vouchers (meal tickets), editable per month
  savingsTarget?: number;      // monthly savings target (lei) — local mode; cloud keeps it per member
  theme: 'dark' | 'light' | 'pink';
  pinEnabled: boolean;
  pin?: string;
  biometric: boolean;
  sessionTimeoutMin: number;
  name: string;
  onboarded: boolean;
  finnhubKey?: string;         // user's free Finnhub API key for live stock/ETF quotes
}

export interface AppData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  investments: Investment[];
  savingsPots: SavingsPot[];
  settings: Settings;
}
