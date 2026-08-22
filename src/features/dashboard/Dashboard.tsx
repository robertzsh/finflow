import { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CashFlowChart, DonutChart, ComparisonBars, SavingsArea, DonutChart as Donut, LegendList } from '@/components/charts/ChartKit';
import {
  monthStats, accountBalance, cashFlowSeries, spendingByCategory, incomeBySource, savingsTrend,
  investmentAllocation, investmentTotals, healthScore, scoreLabel, memberSpending,
} from '@/lib/finance';
import { buildInsights } from '@/lib/insights';
import { formatMoney } from '@/lib/format';
import { startOfMonth, subMonths } from 'date-fns';

const REF = new Date();

export default function Dashboard({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { transactions, categories, budgets, goals, investments, settings, cloud, authed, members } = useStore();
  const cur = settings.currency;
  // In a shared household the opening balance is the sum of every member's balance.
  const opening = cloud && authed ? members.reduce((a, m) => a + m.openingBalance, 0) : settings.openingBalance;

  const data = useMemo(() => {
    const stats = monthStats(transactions, REF);
    const prev = monthStats(transactions, startOfMonth(subMonths(REF, 1)));
    const balance = accountBalance(transactions, opening);
    const cf = cashFlowSeries(transactions, 8, opening);
    const byCat = spendingByCategory(transactions, categories, REF);
    const bySource = incomeBySource(transactions, categories, REF);
    const sav = savingsTrend(transactions, 8);
    const alloc = investmentAllocation(investments, settings.fxRates);
    const invTotals = investmentTotals(investments, settings.fxRates);
    const score = healthScore(transactions, budgets, categories, goals, balance, REF);
    const insights = buildInsights(transactions, categories, REF, balance);
    const byMember = memberSpending(transactions, REF);
    return { stats, prev, balance, cf, byCat, bySource, sav, alloc, invTotals, score, insights, byMember };
  }, [transactions, categories, budgets, goals, investments, settings.fxRates, opening]);

  const spendDelta = data.prev.expense > 0 ? ((data.stats.expense - data.prev.expense) / data.prev.expense) * 100 : 0;
  const incDelta = data.prev.income > 0 ? ((data.stats.income - data.prev.income) / data.prev.income) * 100 : 0;
  const sl = scoreLabel(data.score);
  const expenseTotal = data.byCat.reduce((a, b) => a + b.value, 0);
  const incomeTotal = data.bySource.reduce((a, b) => a + b.value, 0);
  const allocTotal = data.alloc.reduce((a, b) => a + b.value, 0);

  return (
    <Page>
      <PageHeader title={`Hi ${settings.name} 👋`} subtitle="Here's your money in motion this month"
        action={<Button onClick={onQuickAdd}><Icons.Plus size={16} /> Add transaction</Button>} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Account balance" value={formatMoney(data.balance, cur)} icon="Wallet" accent="savings" delay={0} />
        <StatCard label="Monthly income" value={formatMoney(data.stats.income, cur)} icon="ArrowDownToLine" accent="income" delta={`${Math.abs(incDelta).toFixed(0)}% vs last mo`} deltaUp={incDelta >= 0} delay={0.05} />
        <StatCard label="Monthly spending" value={formatMoney(data.stats.expense, cur)} icon="ArrowUpFromLine" accent="expense" delta={`${Math.abs(spendDelta).toFixed(0)}% vs last mo`} deltaUp={spendDelta < 0} delay={0.1} />
        <StatCard label="Savings this month" value={formatMoney(Math.max(0, data.stats.net), cur)} icon="PiggyBank" accent="savings" delay={0.15} />
        <StatCard label="Net cash flow" value={formatMoney(data.stats.net, cur, { sign: true })} icon={data.stats.net >= 0 ? 'TrendingUp' : 'TrendingDown'} accent={data.stats.net >= 0 ? 'income' : 'expense'} delay={0.2} />
        <HealthCard score={data.score} label={sl.label} color={sl.color} delay={0.25} />
      </div>

      {/* Per-member breakdown (shared household) */}
      {cloud && authed && members.length > 0 && (
        <Card className="p-5 mt-4" delay={0.15}>
          <SectionCardHeader title="Who spent what" hint="This month, by member" />
          <div className="grid sm:grid-cols-2 gap-3">
            {members.map((m, i) => {
              const b = data.byMember.get(m.id) ?? { income: 0, expense: 0 };
              const share = data.stats.expense > 0 ? (b.expense / data.stats.expense) * 100 : 0;
              const palette = ['#3b82f6', '#a855f7', '#10b981', '#eab308'];
              const color = palette[i % palette.length];
              return (
                <div key={m.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
                      {(m.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-[11px] text-white/40">balance {formatMoney(m.openingBalance, cur, { compact: m.openingBalance > 9999 })}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-expense">{formatMoney(b.expense, cur)}</div>
                      <div className="text-[11px] text-white/40">spent</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[11px] text-white/40">
                    <span>{share.toFixed(0)}% of family spend</span>
                    {b.income > 0 && <span className="text-income">+{formatMoney(b.income, cur)} in</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/40 mt-3">Family remaining balance: <span className="text-white/70 font-medium">{formatMoney(data.balance, cur)}</span> · combined spend this month {formatMoney(data.stats.expense, cur)}</p>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2" delay={0.1}>
          <SectionCardHeader title="Cash flow over time" hint="Income vs spending, last 8 months" />
          <CashFlowChart data={data.cf} />
        </Card>
        <Card className="p-5" delay={0.15}>
          <SectionCardHeader title="Spending by category" hint="This month" />
          <div className="relative">
            <DonutChart data={data.byCat.slice(0, 8)} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-white/40">Total</span>
              <span className="font-bold">{formatMoney(expenseTotal, cur, { compact: expenseTotal > 9999 })}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5" delay={0.1}>
          <SectionCardHeader title="Income sources" hint="This month" />
          <Donut data={data.bySource} height={200} />
          <div className="mt-3"><LegendList data={data.bySource} total={incomeTotal} currency={cur} /></div>
        </Card>
        <Card className="p-5" delay={0.15}>
          <SectionCardHeader title="Monthly comparison" hint="Income vs expense" />
          <ComparisonBars data={data.cf} />
        </Card>
        <Card className="p-5" delay={0.2}>
          <SectionCardHeader title="Savings trend" hint="Net saved per month" />
          <SavingsArea data={data.sav} />
        </Card>
      </div>

      {/* Investments + insights */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5" delay={0.1}>
          <SectionCardHeader title="Investment allocation"
            hint={`${formatMoney(data.invTotals.value, cur)} · ${data.invTotals.gain >= 0 ? '+' : ''}${data.invTotals.gainPct.toFixed(1)}%`} />
          <Donut data={data.alloc} height={200} />
          <div className="mt-3"><LegendList data={data.alloc} total={allocTotal} currency={cur} /></div>
        </Card>

        <Card className="p-5 lg:col-span-2" delay={0.15}>
          <SectionCardHeader title="Smart insights" hint="Automatically detected patterns" />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.insights.map((ins, i) => <InsightCard key={ins.id} ins={ins} i={i} />)}
          </div>
        </Card>
      </div>
    </Page>
  );
}

function HealthCard({ score, label, color, delay }: { score: number; label: string; color: string; delay: number }) {
  const r = 26, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
  return (
    <Card hover delay={delay} className="p-5 relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: color }} />
      <div className="flex items-center justify-between relative">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">Health score</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{score}<span className="text-sm text-white/40">/100</span></p>
          <p className="mt-1 text-xs font-medium" style={{ color }}>{label}</p>
        </div>
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
          <motion.circle cx="32" cy="32" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1 }} />
        </svg>
      </div>
    </Card>
  );
}

const TONE: Record<string, string> = { income: '#10b981', expense: '#ef4444', savings: '#3b82f6', invest: '#eab308', goal: '#a855f7', neutral: '#94a3b8' };
function InsightCard({ ins, i }: { ins: ReturnType<typeof buildInsights>[number]; i: number }) {
  const Icon = (Icons as any)[ins.icon] ?? Icons.Sparkles;
  const color = TONE[ins.tone];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
      className="glass-hover rounded-xl border border-white/10 p-3.5 flex items-start gap-3">
      <span className="rounded-lg p-2 shrink-0" style={{ background: `${color}22` }}><Icon size={16} color={color} /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{ins.title}</span>
          {ins.value && <span className="text-sm font-bold" style={{ color }}>{ins.value}</span>}
        </div>
        <p className="text-xs text-white/50 mt-0.5 leading-snug">{ins.detail}</p>
      </div>
    </motion.div>
  );
}
