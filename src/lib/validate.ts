import { z } from 'zod';

// Lenient shape check for imported backups: verify the top-level structure and the
// essential fields so a malformed file can't corrupt the store, while still
// accepting backups from older/newer versions (extra fields pass through).
const tx = z.object({ id: z.string(), type: z.enum(['income', 'expense']), amount: z.number(), date: z.string() }).passthrough();
const cat = z.object({ id: z.string(), name: z.string() }).passthrough();
const goal = z.object({ id: z.string(), name: z.string(), target: z.number(), saved: z.number() }).passthrough();
const budget = z.object({ categoryId: z.string(), amount: z.number() }).passthrough();
const inv = z.object({ id: z.string() }).passthrough();

export const AppDataSchema = z.object({
  transactions: z.array(tx),
  categories: z.array(cat),
  budgets: z.array(budget).optional().default([]),
  goals: z.array(goal).optional().default([]),
  investments: z.array(inv).optional().default([]),
  settings: z.object({}).passthrough(),
}).passthrough();

export function parseBackup(data: unknown) {
  return AppDataSchema.safeParse(data);
}
