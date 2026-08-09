import type { Category } from '@/types';

const inc = '#10b981';
const exp = '#ef4444';

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'salary', name: 'Salary', kind: 'income', icon: 'Wallet', color: inc },
  { id: 'freelance', name: 'Freelance', kind: 'income', icon: 'Laptop', color: '#34d399' },
  { id: 'investments-inc', name: 'Investments', kind: 'income', icon: 'TrendingUp', color: '#6ee7b7' },
  { id: 'gifts', name: 'Gifts', kind: 'income', icon: 'Gift', color: '#a7f3d0' },
  { id: 'other-inc', name: 'Other', kind: 'income', icon: 'Plus', color: '#059669' },
  // Expenses
  { id: 'rent', name: 'Rent', kind: 'expense', icon: 'Home', color: '#ef4444' },
  { id: 'mortgage', name: 'Mortgage', kind: 'expense', icon: 'Building', color: '#f87171' },
  { id: 'groceries', name: 'Groceries', kind: 'expense', icon: 'ShoppingCart', color: '#fb7185' },
  { id: 'restaurants', name: 'Restaurants', kind: 'expense', icon: 'Utensils', color: '#f43f5e' },
  { id: 'coffee', name: 'Coffee', kind: 'expense', icon: 'Coffee', color: '#e11d48' },
  { id: 'shopping', name: 'Shopping', kind: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'travel', name: 'Travel', kind: 'expense', icon: 'Plane', color: '#f472b6' },
  { id: 'fuel', name: 'Fuel', kind: 'expense', icon: 'Fuel', color: '#fb923c' },
  { id: 'transport', name: 'Public Transport', kind: 'expense', icon: 'TrainFront', color: '#f97316' },
  { id: 'entertainment', name: 'Entertainment', kind: 'expense', icon: 'Clapperboard', color: '#e879f9' },
  { id: 'gym', name: 'Gym', kind: 'expense', icon: 'Dumbbell', color: '#c026d3' },
  { id: 'subscriptions', name: 'Subscriptions', kind: 'expense', icon: 'RefreshCw', color: '#d946ef' },
  { id: 'insurance', name: 'Insurance', kind: 'expense', icon: 'ShieldCheck', color: '#a21caf' },
  { id: 'healthcare', name: 'Healthcare', kind: 'expense', icon: 'HeartPulse', color: '#f87171' },
  { id: 'education', name: 'Education', kind: 'expense', icon: 'GraduationCap', color: '#fca5a5' },
  { id: 'electronics', name: 'Electronics', kind: 'expense', icon: 'Smartphone', color: '#f59e0b' },
  { id: 'family', name: 'Family', kind: 'expense', icon: 'Users', color: '#fbbf24' },
  { id: 'pets', name: 'Pets', kind: 'expense', icon: 'PawPrint', color: '#facc15' },
  { id: 'taxes', name: 'Taxes', kind: 'expense', icon: 'Landmark', color: '#dc2626' },
  { id: 'misc', name: 'Miscellaneous', kind: 'expense', icon: 'MoreHorizontal', color: '#94a3b8' },
];
