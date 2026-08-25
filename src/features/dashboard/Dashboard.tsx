import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { isSameMonth, parseISO, format } from 'date-fns';
import { useStore } from '@/store/useStore';
import { exportMonthlyReportPDF } from '@/lib/export';
import { buildMonthlyReport } from '@/lib/report';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SpendSaveBars, DonutChart, ComparisonBars, SavingsArea, DonutChart as Donut, LegendList } from '@/components/charts/ChartKit';
import {
  monthStats, accountBalance, cashFlowSeries, spendingByCategory, incomeBySource, savingsTrend,
  investmentAllocation, investmentTotals, perMemberSpending, subCategoryBreakdown, memberCategoryBreakdown, categoryPayers,
} from '@/lib/finance';
import { buildInsights } from '@/lib/insights';
import { formatMoney } from '@/lib/format';
import { startOfMonth, subMonths } from 'date-fns';

const REF = new Date();

export default function Dashboard({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { transactions, categories, budgets, goals, investments, settings, cloud, authed, members, userId } = useStore();
  const privacy = useStore((s) => s.privacy);
  const M = (s: string) => (privacy ? '••••' : s);
  const cur = settings.currency;
  // In a shared household the opening balance is the sum of every member's balance.
  const opening = cloud && authed ? members.reduce((a, m) => a + m.openingBalance, 0) : settings.openingBalance;

  const data = useMemo(() => {
    const stats = monthStats(transactions, REF);
    const prev = monthStats(transactions, startOfMonth(subMonths(REF, 1)));
    const balance = accountBalance(transactions, opening);
    const cf = cashFlowSeries(transactions, 12, opening);
    const spendSave = cf.map((r) => ({ month: r.month, spending: r.expense, savings: r.net }));
    const byCat = spendingByCategory(transactions, categories, REF);
    const bySource = incomeBySource(transactions, categories, REF);
    const sav = savingsTrend(transactions, 8);
    const alloc = investmentAllocation(investments, settings.fxRates);
    const invTotals = investmentTotals(investments, settings.fxRates);
    const insights = buildInsights(transactions, categories, REF, balance);
    const memberIds = members.map((m) => m.id);
    const byMember = perMemberSpending(transactions, REF, memberIds);
    const groceriesByStore = subCategoryBreakdown(transactions, categories, REF, 'groceries');
    const catPayers = categoryPayers(transactions, categories, REF);
    return { stats, prev, balance, cf, spendSave, byCat, bySource, sav, alloc, invTotals, insights, byMember, groceriesByStore, catPayers };
  }, [transactions, categories, budgets, goals, investments, settings.fxRates, opening, members]);
  const memberIds = members.map((m) => m.id);

  const spendDelta = data.prev.expense > 0 ? ((data.stats.expense - data.prev.expense) / data.prev.expense) * 100 : 0;
  const incDelta = data.prev.income > 0 ? ((data.stats.income - data.prev.income) / data.prev.income) * 100 : 0;
  const savingsRate = data.stats.savingsRate;
  const isHousehold = cloud && authed && members.length > 1;
  const myStats = isHousehold && userId ? (data.byMember.get(userId) ?? { income: 0, expense: 0 }) : null;
  const expenseTotal = data.byCat.reduce((a, b) => a + b.value, 0);
  const incomeTotal = data.bySource.reduce((a, b) => a + b.value, 0);
  const allocTotal = data.alloc.reduce((a, b) => a + b.value, 0);

  // End-of-month prompt: once a new month begins, offer last month's full report.
  const lastMonthRef = startOfMonth(subMonths(REF, 1));
  const lastMonthKey = format(lastMonthRef, 'yyyy-MM');
  const lastMonthLabel = format(lastMonthRef, 'MMMM yyyy');
  const hadLastMonth = transactions.some((t) => isSameMonth(parseISO(t.date), lastMonthRef));
  const [reportDone, setReportDone] = useState(() => {
    try { return localStorage.getItem('finflow-report-month') === lastMonthKey; } catch { return false; }
  });
  const showReportPrompt = hadLastMonth && !reportDone;
  function downloadLastMonth() {
    exportMonthlyReportPDF(buildMonthlyReport(lastMonthRef, { transactions, categories, currency: cur, opening, members }));
    try { localStorage.setItem('finflow-report-month', lastMonthKey); } catch { /* ignore */ }
    setReportDone(true);
  }
  function dismissReport() {
    try { localStorage.setItem('finflow-report-month', lastMonthKey); } catch { /* ignore */ }
    setReportDone(true);
  }

  return (
    <Page>
      <PageHeader title={`Hi ${settings.name} 👋`} subtitle={`${format(REF, 'MMMM yyyy')} · ${isHousehold ? 'family totals (both of you)' : 'monthly totals reset on the 1st'}`}
        action={<Button onClick={onQuickAdd}><Icons.Plus size={16} /> Add transaction</Button>} />

      {showReportPrompt && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-emerald-500/30 p-4 mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-emerald-500/20 p-2"><Icons.FileBarChart size={18} className="text-emerald-400" /></span>
          <div className="flex-1 min-w-[180px]">
            <div className="font-semibold text-sm">Your {lastMonthLabel} report is ready</div>
            <div className="text-xs text-white/50">Transactions, top categories, money set aside and all metrics.</div>
          </div>
          <Button onClick={downloadLastMonth}><Icons.Download size={16} /> Download PDF</Button>
          <button onClick={dismissReport} className="text-white/40 hover:text-white text-sm px-2">Dismiss</button>
        </motion.div>
      )}

      {/* Stat cards — full width on phones so long amounts never clip, 2-up tablet, 3-up desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard label="Account balance" value={formatMoney(data.balance, cur)} icon="Wallet" accent="savings" delay={0} />
        <StatCard label="Monthly income" value={M(formatMoney(data.stats.income, cur))} icon="ArrowDownToLine" accent="income" delta={privacy ? undefined : `${Math.abs(incDelta).toFixed(0)}% vs last mo`} deltaUp={incDelta >= 0} delay={0.05} />
        <StatCard label="Monthly spending" value={formatMoney(data.stats.expense, cur)} icon="ArrowUpFromLine" accent="expense" delta={`${Math.abs(spendDelta).toFixed(0)}% vs last mo`} deltaUp={spendDelta < 0} delay={0.1} />
        <StatCard label="Savings this month" value={M(formatMoney(data.stats.net, cur, { sign: true }))} icon={data.stats.net >= 0 ? 'PiggyBank' : 'TrendingDown'} accent={data.stats.net >= 0 ? 'savings' : 'expense'} delay={0.15} />
        <StatCard label="Savings rate" value={privacy ? '••••' : (data.stats.income > 0 ? `${savingsRate.toFixed(0)}%` : '—')} icon="Percent" accent="savings" delta="put aside vs income" deltaUp={savingsRate >= 0} delay={0.2} />
      </div>

      {/* Per-member breakdown (shared household) */}
      {isHousehold && (
        <Card className="p-5 mt-4" delay={0.15}>
          <SectionCardHeader title="Statistics per person" hint="Your own spending vs your partner's this month · shared expenses split 50/50" />
          <div className="grid sm:grid-cols-2 gap-3">
            {members.map((m, i) => {
              const b = data.byMember.get(m.id) ?? { income: 0, expense: 0 };
              const share = data.stats.expense > 0 ? (b.expense / data.stats.expense) * 100 : 0;
              const net = b.income - b.expense;
              const savePct = b.income > 0 ? (net / b.income) * 100 : null;
              const topCats = memberCategoryBreakdown(transactions, REF, m.id, memberIds, categories).items.slice(0, 6);
              const palette = ['#3b82f6', '#a855f7', '#10b981', '#eab308'];
              const color = palette[i % palette.length];
              return (
                <div key={m.id} className={`rounded-xl border p-4 ${m.id === userId ? 'bg-blue-500/10 border-blue-400/30' : 'bg-white/[0.03] border-white/10'}`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
                      {(m.name || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{m.name}{m.id === userId && <span className="text-white/40 font-normal"> (you)</span>}</div>
                      <div className="text-[11px] text-white/40">set aside {M(formatMoney(net, cur, { sign: true, compact: Math.abs(net) > 9999 }))}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-expense">{formatMoney(b.expense, cur)}</div>
                      <div className="text-[11px] text-white/40">spent</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-2 text-center">
                    <div className="rounded-lg bg-white/[0.04] py-1.5 px-1 min-w-0">
                      <div className="text-income font-semibold text-sm truncate">{M(formatMoney(b.income, cur, { compact: true }))}</div>
                      <div className="text-[10px] text-white/40">income</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] py-1.5 px-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${net >= 0 ? 'text-savings' : 'text-expense'}`}>{M(formatMoney(net, cur, { sign: true, compact: true }))}</div>
                      <div className="text-[10px] text-white/40">saved</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] py-1.5">
                      <div className="font-semibold text-sm">{privacy ? '••••' : (savePct === null ? '—' : `${savePct.toFixed(0)}%`)}</div>
                      <div className="text-[10px] text-white/40">saved rate</div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} />
                  </div>
                  <div className="text-[11px] text-white/40 mt-1.5">{share.toFixed(0)}% of family spend</div>
                  {topCats.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {topCats.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 text-[11px]">
                          <span className="truncate flex-1 text-white/60">{c.emoji ? `${c.emoji} ` : ''}{c.name}</span>
                          <span className="text-white/40">{c.pct.toFixed(0)}%</span>
                          <span className="tabular-nums text-white/70 w-20 text-right">{formatMoney(c.value, cur)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-white/40 mt-3">Family remaining balance: <span className="text-white/70 font-medium">{formatMoney(data.balance, cur)}</span> · combined spend this month {formatMoney(data.stats.expense, cur)}</p>
        </Card>
      )}

      {/* Groceries by store */}
      {data.groceriesByStore.items.length > 0 && (
        <Card className="p-5 mt-4" delay={0.15}>
          <SectionCardHeader title="Groceries by store" hint={`This month · ${formatMoney(data.groceriesByStore.total, cur)} total`} />
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {data.groceriesByStore.items.map((s) => (
              <div key={s.id}>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="truncate flex-1">{s.emoji ? `${s.emoji} ` : ''}{s.name}</span>
                  <span className="text-white/40 text-xs">{s.pct.toFixed(0)}%</span>
                  <span className="tabular-nums font-medium w-24 text-right">{formatMoney(s.value, cur)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2" delay={0.1}>
          <SectionCardHeader title="Savings & spending" hint="Money spent vs put aside, last 12 months" />
          <SpendSaveBars data={data.spendSave} />
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
          <div className="mt-3 space-y-1.5">
            {data.byCat.slice(0, 6).map((c) => {
              const cat = categories.find((x) => x.id === c.id);
              const pct = expenseTotal > 0 ? (c.value / expenseTotal) * 100 : 0;
              return (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-white/70 truncate flex-1">{cat?.emoji ? `${cat.emoji} ` : ''}{c.name}</span>
                  {isHousehold && <PayerChips payers={data.catPayers.get(c.id)} members={members} memberIds={memberIds} />}
                  <span className="tabular-nums text-white/50 text-xs">{pct.toFixed(0)}%</span>
                  <span className="tabular-nums font-medium w-24 text-right">{formatMoney(c.value, cur)}</span>
                </div>
              );
            })}
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


const CHIP_PALETTE = ['#3b82f6', '#a855f7', '#10b981', '#eab308'];
function PayerChips({ payers, members, memberIds }: { payers?: Set<string>; members: { id: string; name: string }[]; memberIds: string[] }) {
  if (!payers) return null;
  const ids = new Set<string>();
  for (const v of payers) { if (v === 'all') memberIds.forEach((id) => ids.add(id)); else if (memberIds.includes(v)) ids.add(v); }
  const list = [...ids];
  if (!list.length) return null;
  return (
    <span className="flex -space-x-1 shrink-0" title={list.map((id) => members.find((m) => m.id === id)?.name).join(' + ')}>
      {list.map((id) => {
        const idx = memberIds.indexOf(id);
        const m = members.find((x) => x.id === id);
        return <span key={id} className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-black/30" style={{ background: CHIP_PALETTE[idx % CHIP_PALETTE.length] }}>{(m?.name || '?').charAt(0).toUpperCase()}</span>;
      })}
    </span>
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
