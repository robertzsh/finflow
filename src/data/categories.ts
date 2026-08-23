import type { Category } from '@/types';

const inc = '#10b981';

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'salary', name: 'Salary', kind: 'income', icon: 'Wallet', color: inc, emoji: '💰' },
  { id: 'vouchers', name: 'Bonuri', kind: 'income', icon: 'Ticket', color: '#34d399', emoji: '🎟️' },
  { id: 'freelance', name: 'Freelance', kind: 'income', icon: 'Laptop', color: '#34d399', emoji: '💻' },
  { id: 'investments-inc', name: 'Investments', kind: 'income', icon: 'TrendingUp', color: '#6ee7b7', emoji: '📈' },
  { id: 'gifts', name: 'Gifts', kind: 'income', icon: 'Gift', color: '#a7f3d0', emoji: '🎁' },
  { id: 'other-inc', name: 'Other', kind: 'income', icon: 'Plus', color: '#059669', emoji: '➕' },
  // Expenses
  { id: 'rent', name: 'Rent', kind: 'expense', icon: 'Home', color: '#ef4444', emoji: '🏠' },
  { id: 'mortgage', name: 'Mortgage', kind: 'expense', icon: 'Building', color: '#f87171', emoji: '🏦' },
  { id: 'groceries', name: 'Groceries', kind: 'expense', icon: 'ShoppingCart', color: '#fb7185', emoji: '🛒' },
  // Stores roll up under Groceries, but each is tracked separately
  { id: 'lidl', name: 'Lidl', kind: 'expense', icon: 'Store', color: '#facc15', emoji: '🏪', parent: 'groceries' },
  { id: 'kaufland', name: 'Kaufland', kind: 'expense', icon: 'Store', color: '#ef4444', emoji: '🏪', parent: 'groceries' },
  { id: 'penny', name: 'Penny', kind: 'expense', icon: 'Store', color: '#f97316', emoji: '🏪', parent: 'groceries' },
  { id: 'profi', name: 'Profi', kind: 'expense', icon: 'Store', color: '#ec4899', emoji: '🏪', parent: 'groceries' },
  { id: 'carrefour', name: 'Carrefour', kind: 'expense', icon: 'Store', color: '#3b82f6', emoji: '🏪', parent: 'groceries' },
  { id: 'megaimage', name: 'Mega Image', kind: 'expense', icon: 'Store', color: '#22c55e', emoji: '🏪', parent: 'groceries' },
  { id: 'restaurants', name: 'Restaurants', kind: 'expense', icon: 'Utensils', color: '#f43f5e', emoji: '🍽️' },
  { id: 'coffee', name: 'Coffee', kind: 'expense', icon: 'Coffee', color: '#e11d48', emoji: '☕' },
  { id: 'shopping', name: 'Shopping', kind: 'expense', icon: 'ShoppingBag', color: '#ec4899', emoji: '🛍️' },
  { id: 'manipedi', name: 'Mani + Pedi', kind: 'expense', icon: 'Sparkles', color: '#f472b6', emoji: '💅' },
  { id: 'piscina', name: 'Piscina', kind: 'expense', icon: 'Waves', color: '#06b6d4', emoji: '🏊' },
  { id: 'travel', name: 'Travel', kind: 'expense', icon: 'Plane', color: '#f472b6', emoji: '✈️' },
  { id: 'fuel', name: 'Fuel', kind: 'expense', icon: 'Fuel', color: '#fb923c', emoji: '⛽' },
  { id: 'transport', name: 'Public Transport', kind: 'expense', icon: 'TrainFront', color: '#f97316', emoji: '🚆' },
  { id: 'entertainment', name: 'Entertainment', kind: 'expense', icon: 'Clapperboard', color: '#e879f9', emoji: '🎬' },
  { id: 'gym', name: 'Gym', kind: 'expense', icon: 'Dumbbell', color: '#c026d3', emoji: '🏋️' },
  { id: 'subscriptions', name: 'Subscriptions', kind: 'expense', icon: 'RefreshCw', color: '#d946ef', emoji: '🔁' },
  { id: 'insurance', name: 'Insurance', kind: 'expense', icon: 'ShieldCheck', color: '#a21caf', emoji: '🛡️' },
  { id: 'healthcare', name: 'Healthcare', kind: 'expense', icon: 'HeartPulse', color: '#f87171', emoji: '🩺' },
  { id: 'education', name: 'Education', kind: 'expense', icon: 'GraduationCap', color: '#fca5a5', emoji: '🎓' },
  { id: 'electronics', name: 'Electronics', kind: 'expense', icon: 'Smartphone', color: '#f59e0b', emoji: '📱' },
  { id: 'family', name: 'Family', kind: 'expense', icon: 'Users', color: '#fbbf24', emoji: '👨‍👩‍👧' },
  { id: 'pets', name: 'Pets', kind: 'expense', icon: 'PawPrint', color: '#facc15', emoji: '🐾' },
  { id: 'taxes', name: 'Taxes', kind: 'expense', icon: 'Landmark', color: '#dc2626', emoji: '🏛️' },
  { id: 'misc', name: 'Miscellaneous', kind: 'expense', icon: 'MoreHorizontal', color: '#94a3b8', emoji: '🔖' },
];
