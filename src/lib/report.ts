import { isSameMonth, parseISO } from 'date-fns';
import type { Transaction, Category, CurrencyCode } from '@/types';
import { monthStats, spendingByCategory, accountBalance, memberSpending, monthLabel } from './finance';
import { formatMoney } from './format';
import type { MonthlyReport } from './export';
import type { Member } from './cloud';

interface Args {
  transactions: Transaction[];
  categories: Category[];
  currency: CurrencyCode;
  opening: number;
  members?: Member[];
}

/** Assemble everything an end-of-month report needs for a given month. */
export function buildMonthlyReport(ref: Date, { transactions, categories, currency, opening, members }: Args): MonthlyReport {
  const stats = monthStats(transactions, ref);
  const byCat = spendingByCategory(transactions, categories, ref).slice(0, 8);
  const txs = transactions.filter((t) => isSameMonth(parseISO(t.date), ref)).sort((a, b) => (a.date < b.date ? -1 : 1));
  const balance = accountBalance(transactions, opening);
  const money = (n: number) => formatMoney(n, currency);

  const summary = [
    { label: 'Income', value: money(stats.income) },
    { label: 'Expenses', value: money(stats.expense) },
    { label: 'Money set aside (net)', value: money(stats.net) },
    { label: 'Savings rate', value: `${stats.savingsRate.toFixed(0)}%` },
    { label: 'Transactions', value: String(txs.length) },
    { label: 'Balance at report time', value: money(balance) },
  ];

  let memberRows: { name: string; expense: number; income: number }[] | undefined;
  if (members && members.length > 1) {
    const bm = memberSpending(transactions, ref);
    memberRows = members.map((m) => {
      const e = bm.get(m.id) ?? { income: 0, expense: 0 };
      return { name: m.name, expense: e.expense, income: e.income };
    });
  }

  return {
    monthLabel: monthLabel(ref),
    currency,
    summary,
    topCategories: byCat.map((c) => ({ name: c.name, value: c.value })),
    members: memberRows,
    transactions: txs,
    categories,
  };
}
