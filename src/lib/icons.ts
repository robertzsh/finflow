// Curated icon registry. Named imports let Vite tree-shake — importing only the
// ~65 icons the app actually uses instead of the whole lucide set (`import * as
// Icons` pulled ~1500 icons into the first-paint bundle).
import {
  AlertTriangle, ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight,
  Baby, BarChart3, Bike, Book, Briefcase, Building, Bus, Camera, Car, Circle,
  Clapperboard, Coffee, Dog, Download, Dumbbell, FileBarChart, Film, Flame, Fuel,
  Gamepad2, Gem, Gift, GraduationCap, Heart, HeartPulse, Home, Inbox, Landmark,
  Laptop, LineChart, Monitor, MoreHorizontal, Music, PawPrint, Percent, PiggyBank,
  Pizza, Plane, Plus, RefreshCw, SearchX, ShieldCheck, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Sofa, Sparkles, Store, Target, Ticket, TrainFront,
  TrendingDown, TrendingUp, Users, Utensils, Wallet, Waves, Wine, Wrench, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle, ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight,
  Baby, BarChart3, Bike, Book, Briefcase, Building, Bus, Camera, Car, Circle,
  Clapperboard, Coffee, Dog, Download, Dumbbell, FileBarChart, Film, Flame, Fuel,
  Gamepad2, Gem, Gift, GraduationCap, Heart, HeartPulse, Home, Inbox, Landmark,
  Laptop, LineChart, Monitor, MoreHorizontal, Music, PawPrint, Percent, PiggyBank,
  Pizza, Plane, Plus, RefreshCw, SearchX, ShieldCheck, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Sofa, Sparkles, Store, Target, Ticket, TrainFront,
  TrendingDown, TrendingUp, Users, Utensils, Wallet, Waves, Wine, Wrench, Zap,
};

/** Resolve an icon by name with a safe fallback. */
export function getIcon(name?: string, fallback: LucideIcon = Circle): LucideIcon {
  return (name && ICON_MAP[name]) || fallback;
}

export { Circle, Inbox };
