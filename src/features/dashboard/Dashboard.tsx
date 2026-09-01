import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileBarChart, Download, Sparkles } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { isSameMonth, parseISO, format } from 'date-fns';
import { useStore } from '@/store/useStore';
import { exportMonthlyReportPDF } from '@/lib/export';
import { buildMonthlyReport } from '@/lib/report';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SpendSaveBars, DonutChart, ComparisonBars, SavingsArea, DonutChart as Donut, LegendList } from '@/components/charts/ChartKit';
import {
  monthStats, accountBalance, cashFlowSeries, spendingByCategory, incomeBySource, savingsTrend,
  investmentAllocation, investmentTotals, perMemberSpending, subCategoryBreakdown, categoryPayers, recurringSummary,
} from '@/lib/finance';
import { buildInsights } from '@/lib/insights';
import { BillsDueCard } from '@/components/BillsDueCard';
import { formatMoney, accentHex } from '@/lib/format';
import { startOfMonth, subMonths } from 'date-fns';

const REF = new Date();

export default function Dashboard({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { transactions, categories, budgets, goals, investments, settings, cloud, authed, members, userId } = useStore();
  const privacy = useStore((s) => s.privacy);
  const theme = useStore((s) => s.settings.theme);
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
    const recurring = recurringSummary(transactions, memberIds, categories);
    return { stats, prev, balance, cf, spendSave, byCat, bySource, sav, alloc, invTotals, insights, byMember, groceriesByStore, catPayers, recurring };
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

  // "Spending by category" is shown as a share of this month's income — so each
  // category reads as "X% of what came in" — with an "Available" slice for income
  // not yet spent, so the ring is coherent.
  const monthIncome = data.stats.income;
  const allocDenom = monthIncome > 0 ? monthIncome : (expenseTotal || 1);
  const availableBal = Math.max(0, monthIncome - expenseTotal);
  const spendDonut = [
    ...data.byCat.slice(0, 8),
    ...(availableBal > 0 ? [{ id: 'available', name: 'Available', color: '#cbd5e1', value: availableBal }] : []),
  ];

  // Income sources are green by default; in the pink theme recolour them to an aqua family.
  const AQUA = ['#06b6d4', '#22d3ee', '#67e8f9', '#0891b2', '#a5f3fc', '#5eead4'];
  const bySource = theme === 'pink' ? data.bySource.map((d, i) => ({ ...d, color: AQUA[i % AQUA.length] })) : data.bySource;

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
        action={<Button onClick={onQuickAdd}><Plus size={16} /> Add transaction</Button>} />

      {showReportPrompt && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-emerald-500/30 p-4 mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-emerald-500/20 p-2"><FileBarChart size={18} className="text-emerald-400" /></span>
          <div className="flex-1 min-w-[180px]">
            <div className="font-semibold text-sm">Your {lastMonthLabel} report is ready</div>
            <div className="text-xs text-white/50">Transactions, top categories, money set aside and all metrics.</div>
          </div>
          <Button onClick={downloadLastMonth}><Download size={16} /> Download PDF</Button>
          <button onClick={dismissReport} className="text-white/40 hover:text-white text-sm px-2">Dismiss</button>
        </motion.div>
      )}

      {/* Stat cards — primary trio (income / spending / saved) reads large; savings
          rate sits below as secondary. Full width on phones so amounts never clip. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard label="Monthly income" value={data.stats.income > 0 ? M(formatMoney(data.stats.income, cur)) : '—'} icon="ArrowDownToLine" accent="income"
          delta={privacy || data.prev.income <= 0 ? undefined : `${Math.abs(incDelta).toFixed(0)}% vs last month`} deltaUp={incDelta >= 0}
          note={data.stats.income > 0 ? undefined : 'No income yet'} emphasis delay={0.05} />
        <StatCard label="Monthly spending" value={data.stats.expense > 0 ? formatMoney(data.stats.expense, cur) : '—'} icon="ArrowUpFromLine" accent="expense"
          delta={privacy || data.prev.expense <= 0 ? undefined : `${Math.abs(spendDelta).toFixed(0)}% vs last month`} deltaUp={spendDelta < 0}
          note={data.stats.expense > 0 ? undefined : 'No expenses yet'} emphasis delay={0.1} />
        <StatCard label="Saved this month" value={data.stats.income > 0 || data.stats.expense > 0 ? M(formatMoney(data.stats.net, cur, { sign: true })) : '—'}
          icon={data.stats.net >= 0 ? 'PiggyBank' : 'TrendingDown'} accent={data.stats.net >= 0 ? 'savings' : 'expense'}
          note={privacy ? undefined : (data.stats.income > 0 ? `${savingsRate.toFixed(0)}% savings rate` : 'Nothing set aside yet')} emphasis delay={0.15} />
        <StatCard label="Savings rate" value={privacy ? '••••' : (data.stats.income > 0 ? `${savingsRate.toFixed(0)}%` : '—')} icon="Percent" accent="savings"
          note="put aside vs income" delay={0.2} />
      </div>

      {/* Per-member comparison (shared household) — one glance to compare the two of you */}
      {isHousehold && (() => {
        const palette = ['#3b82f6', '#a855f7', '#10b981', '#eab308'];
        const cols = members.map((m, i) => {
          const b = data.byMember.get(m.id) ?? { income: 0, expense: 0 };
          const net = b.income - b.expense;
          const savePct = b.income > 0 ? (net / b.income) * 100 : null;
          const share = data.stats.expense > 0 ? (b.expense / data.stats.expense) * 100 : 0;
          return { m, b, net, savePct, share, color: palette[i % palette.length], you: m.id === userId };
        });
        const gridStyle = { gridTemplateColumns: `minmax(84px,auto) repeat(${cols.length}, minmax(0,1fr))` } as React.CSSProperties;
        const MetricRow = ({ label, render }: { label: string; render: (c: typeof cols[number]) => React.ReactNode }) => (
          <>
            <div className="text-xs text-white/45 py-2 self-center">{label}</div>
            {cols.map((c) => (
              <div key={c.m.id} className="py-2 text-right tabular-nums text-sm font-medium self-center">{render(c)}</div>
            ))}
          </>
        );
        return (
          <Card className="p-5 mt-4" delay={0.15}>
            <SectionCardHeader title="Statistics per person" hint="This month · shared expenses split 50/50" />
            <div className="grid gap-x-3 sm:gap-x-6" style={gridStyle}>
              <div />
              {cols.map((c) => (
                <div key={c.m.id} className="flex items-center justify-end gap-2 pb-2.5 mb-1 border-b border-white/10">
                  <span className="w-7 h-7 rounded-full grid place-items-center text-white text-xs font-bold shrink-0" style={{ background: c.color }}>
                    {(c.m.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold truncate">{c.m.name}{c.you && <span className="text-white/40 font-normal"> (you)</span>}</span>
                </div>
              ))}

              <MetricRow label="Income" render={(c) => <span className="text-income">{M(formatMoney(c.b.income, cur))}</span>} />
              <MetricRow label="Spent" render={(c) => formatMoney(c.b.expense, cur)} />
              <MetricRow label="Saved" render={(c) => <span className={c.net >= 0 ? 'text-savings' : 'text-expense'}>{M(formatMoney(c.net, cur, { sign: true }))}</span>} />
              <MetricRow label="Save rate" render={(c) => (privacy ? '••••' : (c.savePct === null ? '—' : `${c.savePct.toFixed(0)}%`))} />

              <div className="text-xs text-white/45 pt-3 self-start">Share of spend</div>
              {cols.map((c) => (
                <div key={c.m.id} className="pt-3">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${c.share}%`, background: c.color }} /></div>
                  <div className="text-[11px] text-white/40 mt-1 text-right tabular-nums">{c.share.toFixed(0)}%</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-4">Combined income <span className="text-white/70 font-medium">{formatMoney(data.stats.income, cur)}</span> · combined spend {formatMoney(data.stats.expense, cur)}</p>
          </Card>
        );
      })()}

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

      {/* Variable recurring bills that came due — confirm the amount to post them */}
      <BillsDueCard />


      {/* Recurring & bills — estimated monthly commitment, household + per person */}
      {data.recurring.items.length > 0 && (
        <Card className="p-5 mt-4" delay={0.15}>
          <SectionCardHeader title="Recurring & bills" hint={`Estimated ${formatMoney(data.recurring.householdMonthly, cur)}/mo${isHousehold ? ' for the family' : ''}`} />
          {isHousehold ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {members.map((m, i) => {
                const palette = ['#3b82f6', '#a855f7', '#10b981', '#eab308'];
                const its = data.recurring.perMemberItems.get(m.id) ?? [];
                return (
                  <div key={m.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: palette[i % palette.length] }}>{(m.name || '?').charAt(0).toUpperCase()}</span>
                        {m.name}{m.id === userId && <span className="text-white/40 font-normal"> (you)</span>}
                      </span>
                      <span className="font-semibold text-sm">{formatMoney(data.recurring.perMember.get(m.id) ?? 0, cur)}<span className="text-white/40 text-xs">/mo</span></span>
                    </div>
                    <div className="space-y-1.5">
                      {its.length === 0 && <div className="text-xs text-white/30">No recurring bills yet.</div>}
                      {its.map((it) => {
                        const c = categories.find((x) => x.id === it.categoryId);
                        return (
                          <div key={it.id} className="flex items-center gap-2 text-sm">
                            <span className="truncate flex-1">{c?.emoji ? `${c.emoji} ` : ''}{it.merchant || c?.name}</span>
                            {it.shared && <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded-full bg-white/10 shrink-0">½ shared</span>}
                            <span className="tabular-nums font-medium w-24 text-right">{formatMoney(it.monthly, cur)}<span className="text-white/40 text-[11px]">/mo</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.recurring.items.map((it) => {
                const c = categories.find((x) => x.id === it.categoryId);
                return (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <span className="truncate flex-1">{c?.emoji ? `${c.emoji} ` : ''}{it.merchant || c?.name}</span>
                    <span className="text-white/40 text-xs capitalize">{it.frequency}</span>
                    <span className="tabular-nums font-medium w-28 text-right">{formatMoney(it.monthly, cur)}<span className="text-white/40 text-[11px]">/mo</span></span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-white/40 mt-3">Weekly/quarterly/yearly items are normalised to a monthly figure. Shared bills are split 50/50 — each person carries half (e.g. rent).</p>
        </Card>
      )}

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2 flex flex-col" delay={0.1}>
          <SectionCardHeader title="Savings & spending" hint="Money spent vs put aside, last 12 months" />
          <div className="flex-1 min-h-[260px] mt-1"><SpendSaveBars data={data.spendSave} height="100%" /></div>
        </Card>
        <Card className="p-5 flex flex-col" delay={0.15}>
          <SectionCardHeader title="Spending by category" hint="Share of this month's income" />
          {expenseTotal === 0 ? (
            <EmptyState icon="PieChart" title="No expenses this month"
              subtitle="Once you add spending, your category breakdown appears here."
              action={<Button onClick={onQuickAdd}><Plus size={16} /> Add expense</Button>} />
          ) : (
            <>
              <div className="flex-none"><DonutChart data={spendDonut} height={200} centerLabel="Spent" centerValue={formatMoney(expenseTotal, cur, { compact: expenseTotal > 9999 })} /></div>
              <div className="mt-1 flex items-center justify-between text-xs text-white/45">
                <span>Spent {formatMoney(expenseTotal, cur)} of {formatMoney(monthIncome, cur, { compact: monthIncome > 9999 })}</span>
                <span className="tabular-nums">{((expenseTotal / allocDenom) * 100).toFixed(0)}% used</span>
              </div>
              <div className="mt-3 space-y-1.5 flex-1">
                {data.byCat.slice(0, 12).map((c) => {
                  const cat = categories.find((x) => x.id === c.id);
                  const pct = (c.value / allocDenom) * 100;
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-white/70 truncate flex-1">{cat?.emoji ? `${cat.emoji} ` : ''}{c.name}</span>
                      {isHousehold && <PayerChips payers={data.catPayers.get(c.id)} members={members} memberIds={memberIds} />}
                      <span className="tabular-nums text-white/50 text-xs w-9 text-right">{pct.toFixed(0)}%</span>
                      <span className="tabular-nums font-medium w-24 text-right">{formatMoney(c.value, cur)}</span>
                    </div>
                  );
                })}
              </div>
              {availableBal > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-income/10 border border-income/20 px-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-income" />
                  <span className="text-sm font-medium flex-1">Available to spend</span>
                  <span className="tabular-nums text-white/50 text-xs w-9 text-right">{((availableBal / allocDenom) * 100).toFixed(0)}%</span>
                  <span className="tabular-nums font-semibold text-income w-24 text-right">{formatMoney(availableBal, cur)}</span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 flex flex-col" delay={0.1}>
          <SectionCardHeader title="Income sources" hint="This month" />
          <div className="flex-1 min-h-[180px]"><Donut data={bySource} height="100%" centerLabel="Income" centerValue={formatMoney(incomeTotal, cur, { compact: incomeTotal > 9999 })} /></div>
          <div className="mt-3"><LegendList data={bySource} total={incomeTotal} currency={cur} /></div>
        </Card>
        <Card className="p-5 flex flex-col" delay={0.15}>
          <SectionCardHeader title="Monthly comparison" hint="Income vs expense" />
          <div className="flex-1 min-h-[240px] mt-1"><ComparisonBars data={data.cf} height="100%" /></div>
        </Card>
        <Card className="p-5 flex flex-col" delay={0.2}>
          <SectionCardHeader title="Savings trend" hint="Net saved per month" />
          <div className="flex-1 min-h-[200px] mt-1"><SavingsArea data={data.sav} height="100%" /></div>
        </Card>
      </div>

      {/* Investments + insights */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 flex flex-col" delay={0.1}>
          <SectionCardHeader title="Investment allocation"
            hint={`${formatMoney(data.invTotals.value, cur)} · ${data.invTotals.gain >= 0 ? '+' : ''}${data.invTotals.gainPct.toFixed(1)}%`} />
          <div className="flex-1 min-h-[180px]"><Donut data={data.alloc} height="100%" centerLabel="Invested" centerValue={formatMoney(data.invTotals.value, cur, { compact: data.invTotals.value > 9999 })} /></div>
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

function InsightCard({ ins, i }: { ins: ReturnType<typeof buildInsights>[number]; i: number }) {
  const theme = useStore((s) => s.settings.theme);
  const Icon = getIcon(ins.icon, Sparkles);
  const color = accentHex(ins.tone, theme);
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
