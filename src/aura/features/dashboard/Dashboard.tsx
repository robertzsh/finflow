import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileBarChart, Download, Sparkles } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { isSameMonth, parseISO, format } from 'date-fns';
import { useStore } from '@/store/useStore';
import { exportMonthlyReportPDF } from '@/lib/export';
import { buildMonthlyReport } from '@/lib/report';
import { Page } from '@/aura/components/PageTransition';
import { SectionCardHeader, PageIcon } from '@/aura/components/layout/PageHeader';
import { StatCard } from '@/aura/components/ui/StatCard';
import { Card } from '@/aura/components/ui/Card';
import { Button } from '@/aura/components/ui/Button';
import { Badge } from '@/aura/components/ui/Badge';
import { Callout } from '@/aura/components/ui/Callout';
import { Aura } from '@/aura/components/ui/Aura';
import { Sparkle } from '@/aura/components/ui/Sparkle';
import { ProgressBar } from '@/aura/components/ui/Progress';
import { EmptyState } from '@/aura/components/ui/EmptyState';
import { Modal } from '@/aura/components/ui/Modal';
import { SpendSaveBars, DonutChart, ComparisonBars, SavingsArea, DonutChart as Donut, LegendList } from '@/aura/components/charts/ChartKit';
import {
  monthStats, accountBalance, cashFlowSeries, spendingByCategory, incomeBySource, savingsTrend,
  investmentAllocation, investmentTotals, perMemberSpending, subCategoryBreakdown, categoryPayers, recurringSummary, liveAmount, memberCategoryBreakdown, memberMonthBreakdown,
} from '@/lib/finance';
import { transferredOut, savedInMonth } from '@/lib/savings';
import { buildInsights } from '@/lib/insights';
import { BillsDueCard } from '@/aura/components/BillsDueCard';
import { BillRow, type BillStatus } from '@/aura/components/ui/BillRow';
import { TransactionModal } from '@/aura/components/TransactionModal';
import { upcomingOccurrences } from '@/lib/recurring';
import { rateForDate } from '@/lib/rates';
import type { Transaction } from '@/types';
import { formatMoney, currencySymbol, cx } from '@/lib/format';
import { accentColor } from '@/aura/lib/palette';
import { memberColor } from '@/aura/lib/palette';
import { fadeUp, staggered } from '@/aura/lib/motion';
import { startOfMonth, subMonths } from 'date-fns';
import { useToday } from '@/hooks/useToday';

export default function Dashboard({ onQuickAdd }: { onQuickAdd: () => void }) {
  const { transactions, categories, budgets, goals, investments, savingsPots, settings, cloud, authed, members, userId, addTransaction } = useStore();
  const privacy = useStore((s) => s.privacy);
  const REF = useToday();
  const [editBill, setEditBill] = useState<Transaction | null>(null);
  const [showAllBills, setShowAllBills] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null); // member id whose "Saved" breakdown is open
  const M = (s: string) => (privacy ? '••••' : s);
  const cur = settings.currency;
  // In a shared household the opening balance is the sum of every member's balance.
  const opening = cloud && authed ? members.reduce((a, m) => a + m.openingBalance, 0) : settings.openingBalance;

  const data = useMemo(() => {
    const stats = monthStats(transactions, REF);
    const prev = monthStats(transactions, startOfMonth(subMonths(REF, 1)));
    const transferred = transferredOut(savingsPots);
    const balance = accountBalance(transactions, opening, transferred);
    const movedToSavings = savedInMonth(savingsPots, REF);
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
    const recurring = recurringSummary(transactions, memberIds, categories, settings.fxRates);
    return { stats, prev, balance, transferred, movedToSavings, cf, spendSave, byCat, bySource, sav, alloc, invTotals, insights, byMember, groceriesByStore, catPayers, recurring };
  }, [transactions, categories, budgets, goals, investments, savingsPots, settings.fxRates, opening, members, REF]);
  const memberIds = members.map((m) => m.id);

  // Next occurrence of each recurring bill (dedup by merchant+category), with a
  // "paid this month" flag so the Recurring card can show due/paid status.
  const billKey = (t: { createdBy?: string; merchant: string; categoryId: string }) => `${t.createdBy ?? 'all'}|${t.merchant}|${t.categoryId}`;
  const paidBillKeys = new Set(
    transactions.filter((t) => t.type === 'expense' && isSameMonth(parseISO(t.date), REF)).map(billKey),
  );
  const recurringUpcoming = (() => {
    const up = upcomingOccurrences(transactions, 45, REF, categories);
    const seen = new Set<string>(); const out: typeof up = [];
    // Bills = expenses only. Income (Salary/Bonuri) is managed in Settings, not here.
    // Show only what's still due *this* month: skip bills already paid this month
    // (so a bill drops off the moment it's paid, instead of jumping to next month's
    // occurrence) and skip occurrences that fall in a future month.
    for (const u of up) {
      if (u.base.type !== 'expense') continue;
      if (!isSameMonth(parseISO(u.date), REF)) continue;
      const k = billKey(u.base);
      if (paidBillKeys.has(k)) continue;
      if (!seen.has(k)) { seen.add(k); out.push(u); }
    }
    return out;
  })();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  // Log a projected bill as paid: create a real transaction for that occurrence,
  // converting a foreign bill at the occurrence-day's rate.
  const markBillPaid = (base: Transaction, date: string) => {
    const rate = base.origCurrency ? rateForDate(date, base.origCurrency, settings.fxRates) : 1;
    const amount = base.origCurrency && base.origAmount != null ? Math.round(base.origAmount * rate * 100) / 100 : base.amount;
    addTransaction({
      type: base.type, amount, categoryId: base.categoryId, merchant: base.merchant,
      method: base.method, date, notes: base.notes, recurring: false,
      origCurrency: base.origCurrency, origAmount: base.origAmount, createdBy: base.createdBy,
    });
  };

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
    ...(availableBal > 0 ? [{ id: 'available', name: 'Available', color: 'var(--line-strong)', value: availableBal }] : []),
  ];

  const bySource = data.bySource;

  // End-of-month prompt: once a new month begins, offer last month's full report.
  const lastMonthRef = startOfMonth(subMonths(REF, 1));
  const lastMonthKey = format(lastMonthRef, 'yyyy-MM');
  const lastMonthLabel = format(lastMonthRef, 'MMMM yyyy');
  const hadLastMonth = transactions.some((t) => isSameMonth(parseISO(t.date), lastMonthRef));
  // Remember WHICH month was handled (not a boolean), so the prompt reappears when a new month starts while the app is open.
  const [reportDoneKey, setReportDoneKey] = useState(() => {
    try { return localStorage.getItem('finflow-report-month'); } catch { return null; }
  });
  const showReportPrompt = hadLastMonth && reportDoneKey !== lastMonthKey;
  function downloadLastMonth() {
    exportMonthlyReportPDF(buildMonthlyReport(lastMonthRef, { transactions, categories, currency: cur, opening, members, transferred: data.transferred }));
    try { localStorage.setItem('finflow-report-month', lastMonthKey); } catch { /* ignore */ }
    setReportDoneKey(lastMonthKey);
  }
  function dismissReport() {
    try { localStorage.setItem('finflow-report-month', lastMonthKey); } catch { /* ignore */ }
    setReportDoneKey(lastMonthKey);
  }

  const hour = REF.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const partnerName = members.find((m) => m.id !== userId)?.name ?? 'your partner';
  const heroNet = data.stats.net;
  const hasActivity = data.stats.income > 0 || data.stats.expense > 0;

  return (
    <Page>
      {/* Editorial hero — the month's story in one sentence, key figure inline */}
      <motion.header {...fadeUp} className="relative mb-5 sm:mb-7">
        <Aura variant="orb" drift className="hidden xl:block absolute right-6 top-2 h-48 w-48 opacity-90" />
        <Sparkle filled size={14} className="hidden xl:block absolute right-52 top-14 text-sparkle" />
        <Sparkle filled size={9} className="hidden xl:block absolute right-4 top-40 text-sparkle/80" />
        <PageIcon />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-ink-muted">{format(REF, 'MMMM yyyy')} · {isHousehold ? `you and ${partnerName}` : 'your money'}</p>
          <h1 className="font-display font-semibold text-[1.7rem] sm:text-[2.35rem] leading-[1.15] mt-1.5 max-w-[24ch]">
            {greeting}, {settings.name}.{' '}
            {!hasActivity
              ? <span className="text-ink-muted">A fresh month — add a transaction to begin.</span>
              : heroNet >= 0
                ? <>You’ve set aside <span className="text-income">{M(formatMoney(heroNet, cur))}</span> this month.</>
                : <>You’re <span className="text-expense">{M(formatMoney(Math.abs(heroNet), cur))}</span> over so far.</>}
          </h1>
          {hasActivity && data.stats.income > 0 && !privacy && (
            <p className="text-sm text-ink-muted mt-2">That’s {savingsRate.toFixed(0)}% of {formatMoney(data.stats.income, cur)} that came in{isHousehold ? ', across both of you' : ''}.</p>
          )}
        </div>
        <Button onClick={onQuickAdd} className="shrink-0"><Plus size={16} /> Add transaction</Button>
        </div>
      </motion.header>

      {showReportPrompt && (
        <motion.div {...fadeUp} className="mb-4">
          <Callout icon={<FileBarChart size={18} />} title={`Your ${lastMonthLabel} report is ready`}
            action={<>
              <Button size="sm" onClick={downloadLastMonth}><Download size={15} /> Download PDF</Button>
              <Button size="sm" variant="subtle" onClick={dismissReport}>Dismiss</Button>
            </>}>
            Transactions, top categories, money set aside and all metrics.
          </Callout>
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
          note={privacy ? undefined : data.movedToSavings > 0 ? `${formatMoney(data.movedToSavings, cur)} moved to Economii` : (data.stats.income > 0 ? `${savingsRate.toFixed(0)}% savings rate` : 'Nothing set aside yet')} emphasis delay={0.15} />
        <StatCard label="Savings rate" value={privacy ? '••••' : (data.stats.income > 0 ? `${savingsRate.toFixed(0)}%` : '—')} icon="Percent" accent="savings"
          note="put aside vs income" delay={0.2} />
      </div>

      {/* Per-member comparison (shared household) — one glance to compare the two of you */}
      {isHousehold && (() => {
        const cols = members.map((m, i) => {
          const b = data.byMember.get(m.id) ?? { income: 0, expense: 0 };
          const net = b.income - b.expense;
          const savePct = b.income > 0 ? (net / b.income) * 100 : null;
          const share = data.stats.expense > 0 ? (b.expense / data.stats.expense) * 100 : 0;
          return { m, b, net, savePct, share, color: memberColor(i), you: m.id === userId };
        });
        // What drives the spending gap: per-category difference between the two people.
        // Shared costs are split 50/50 so they cancel out — leaving the personal spending.
        let gap: { name: string; emoji?: string; delta: number }[] = [];
        let gapWinner: typeof cols[number] | null = null;
        if (cols.length === 2) {
          const [A, B] = cols;
          const brkA = new Map(memberCategoryBreakdown(transactions, REF, A.m.id, memberIds, categories).items.map((x) => [x.id, x]));
          const brkB = new Map(memberCategoryBreakdown(transactions, REF, B.m.id, memberIds, categories).items.map((x) => [x.id, x]));
          const ids = new Set([...brkA.keys(), ...brkB.keys()]);
          gap = [...ids].map((id) => {
            const a = brkA.get(id); const b = brkB.get(id); const meta = a ?? b;
            return { name: meta?.name ?? 'Other', emoji: meta?.emoji, delta: (a?.value ?? 0) - (b?.value ?? 0) };
          }).filter((r) => Math.abs(r.delta) >= 0.5).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
          gapWinner = A.b.expense >= B.b.expense ? A : B;
        }
        const gridStyle = { gridTemplateColumns: `minmax(84px,auto) repeat(${cols.length}, minmax(0,1fr))` } as React.CSSProperties;
        const MetricRow = ({ label, render }: { label: string; render: (c: typeof cols[number]) => React.ReactNode }) => (
          <>
            <div className="text-xs text-ink-muted py-2 self-center">{label}</div>
            {cols.map((c) => (
              <div key={c.m.id} className="py-2 text-right tabular-nums text-sm font-medium self-center">{render(c)}</div>
            ))}
          </>
        );
        return (
          <Card className="p-5 section-gap" delay={0.15}>
            <SectionCardHeader title="Statistics per person" hint="This month · shared expenses split 50/50" />
            <div className="grid gap-x-3 sm:gap-x-6" style={gridStyle}>
              <div />
              {cols.map((c) => (
                <div key={c.m.id} className="flex items-center justify-end gap-2 pb-2.5 mb-1 border-b border-line">
                  <span className="w-7 h-7 rounded-full grid place-items-center text-on-color text-xs font-bold shrink-0" style={{ background: c.color }}>
                    {(c.m.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold truncate">{c.m.name}{c.you && <span className="text-ink-muted font-normal"> (you)</span>}</span>
                </div>
              ))}

              <MetricRow label="Income" render={(c) => <span className="text-income">{M(formatMoney(c.b.income, cur))}</span>} />
              <MetricRow label="Spent" render={(c) => formatMoney(c.b.expense, cur)} />
              <MetricRow label="Saved" render={(c) => (
                <button onClick={() => setSavedFor(c.m.id)} title="See how this is calculated"
                  className={cx('underline decoration-dotted underline-offset-4 hover:opacity-80', c.net >= 0 ? 'text-savings' : 'text-expense')}>
                  {M(formatMoney(c.net, cur, { sign: true }))}
                </button>
              )} />
              <MetricRow label="Save rate" render={(c) => (privacy ? '••••' : (c.savePct === null ? '—' : `${c.savePct.toFixed(0)}%`))} />

              <div className="text-xs text-ink-muted pt-3 self-start">Share of spend</div>
              {cols.map((c) => (
                <div key={c.m.id} className="pt-3">
                  <ProgressBar value={c.share} color={c.color} />
                  <div className="text-2xs text-ink-muted mt-1 text-right tabular-nums">{c.share.toFixed(0)}%</div>
                </div>
              ))}
            </div>

            {gap.length > 0 && gapWinner && (
              <div className="mt-4 pt-3 border-t border-line">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="metric-label">What drives the gap</span>
                  <span className="text-xs text-ink-muted"><span className="font-medium" style={{ color: gapWinner.color }}>{gapWinner.m.name}</span> spent {formatMoney(Math.abs(cols[0].b.expense - cols[1].b.expense), cur)} more</span>
                </div>
                <div className="space-y-1">
                  {gap.slice(0, 6).map((r) => {
                    const higher = r.delta > 0 ? cols[0] : cols[1];
                    const pct = Math.min(100, (Math.abs(r.delta) / Math.abs(gap[0].delta)) * 100);
                    return (
                      <div key={r.name} className="flex items-center gap-2 text-sm">
                        <span className="truncate w-32 sm:w-40">{r.emoji ? `${r.emoji} ` : ''}{r.name}</span>
                        <div className="flex-1"><ProgressBar value={pct} color={higher.color} /></div>
                        <span className="tabular-nums text-xs w-28 text-right" style={{ color: higher.color }}>{higher.m.name} +{formatMoney(Math.abs(r.delta), cur)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-2xs text-ink-muted mt-2">Shared costs split evenly, so this is the personal spending that separates you.</p>
              </div>
            )}

            <p className="text-xs text-ink-muted mt-4">Combined income <span className="text-ink-muted font-medium">{formatMoney(data.stats.income, cur)}</span> · combined spend {formatMoney(data.stats.expense, cur)}</p>
          </Card>
        );
      })()}

      {/* Groceries by store */}
      {data.groceriesByStore.items.length > 0 && (
        <Card className="p-5 section-gap" delay={0.15}>
          <SectionCardHeader title="Groceries by store" hint={`This month · ${formatMoney(data.groceriesByStore.total, cur)} total`} />
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {data.groceriesByStore.items.map((s) => (
              <div key={s.id}>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="truncate flex-1">{s.emoji ? `${s.emoji} ` : ''}{s.name}</span>
                  <span className="text-ink-muted text-xs">{s.pct.toFixed(0)}%</span>
                  <span className="tabular-nums font-medium w-24 text-right">{formatMoney(s.value, cur)}</span>
                </div>
                <ProgressBar value={s.pct} color={s.color} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Variable recurring bills that came due — confirm the amount to post them */}
      <BillsDueCard />


      {/* Recurring & bills — estimated monthly commitment, household + per person */}
      {data.recurring.items.length > 0 && (
        <Card className="p-5 section-gap" delay={0.15}>
          <SectionCardHeader title="Recurring & bills" hint={`Estimated ${formatMoney(data.recurring.householdMonthly, cur)}/mo${isHousehold ? ' for the family' : ''}`} />
          {isHousehold ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {members.map((m, i) => {
                const its = data.recurring.perMemberItems.get(m.id) ?? [];
                return (
                  <div key={m.id} className="rounded-card bg-surface-2 border border-line p-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-on-color text-xs font-bold" style={{ background: memberColor(i) }}>{(m.name || '?').charAt(0).toUpperCase()}</span>
                        {m.name}{m.id === userId && <span className="text-ink-muted font-normal"> (you)</span>}
                      </span>
                      <span className="font-semibold text-sm">{formatMoney(data.recurring.perMember.get(m.id) ?? 0, cur)}<span className="text-ink-muted text-xs">/mo</span></span>
                    </div>
                    <div className="space-y-1.5">
                      {its.length === 0 && <div className="text-xs text-ink-faint">No recurring bills yet.</div>}
                      {its.map((it) => {
                        const c = categories.find((x) => x.id === it.categoryId);
                        return (
                          <div key={it.id} className="flex items-center gap-2 text-sm">
                            <span className="truncate flex-1">{c?.emoji ? `${c.emoji} ` : ''}{it.merchant || c?.name}</span>
                            {it.shared && <Badge tone="gray" className="shrink-0 !text-3xs !leading-4">½ shared</Badge>}
                            <span className="tabular-nums font-medium w-24 text-right">{formatMoney(it.monthly, cur)}<span className="text-ink-muted text-2xs">/mo</span></span>
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
                    <span className="text-ink-muted text-xs capitalize">{it.frequency}</span>
                    <span className="tabular-nums font-medium w-28 text-right">{formatMoney(it.monthly, cur)}<span className="text-ink-muted text-2xs">/mo</span></span>
                  </div>
                );
              })}
            </div>
          )}
          {recurringUpcoming.length > 0 && (() => {
            const COLLAPSED = 5;
            const shown = showAllBills ? recurringUpcoming : recurringUpcoming.slice(0, COLLAPSED);
            const hidden = recurringUpcoming.length - shown.length;
            return (
              <div className="mt-4 pt-3 border-t border-line">
                <div className="metric-label mb-1">Upcoming</div>
                <div className="divide-y divide-line">
                  {shown.map((u) => {
                    const c = categories.find((x) => x.id === u.base.categoryId);
                    const paid = paidBillKeys.has(billKey(u.base));
                    const days = Math.round((parseISO(u.date).getTime() - startOfToday) / 86400000);
                    const status: BillStatus = paid ? 'paid' : days <= 5 ? 'due-soon' : 'upcoming';
                    const mIdx = members.findIndex((m) => m.id === u.base.createdBy);
                    const who = isHousehold && mIdx >= 0 ? { name: members[mIdx].name, color: memberColor(mIdx) } : undefined;
                    // foreign-currency bills project at today's rate (so they move with the market)
                    const amount = privacy ? u.amount : liveAmount(u.base, settings.fxRates);
                    const orig = u.base.origCurrency ? `${u.base.origAmount} ${currencySymbol(u.base.origCurrency)}` : undefined;
                    return (
                      <BillRow key={`${u.base.id}-${u.date}`} icon={c?.icon ?? 'Circle'} color={c?.color ?? '#94a3b8'} emoji={c?.emoji}
                        name={u.base.merchant || c?.name || '—'} amount={amount} currency={cur} date={u.date} status={status} who={who} orig={orig}
                        onEdit={() => setEditBill(u.base)} onMarkPaid={paid ? undefined : () => markBillPaid(u.base, u.date)} />
                    );
                  })}
                </div>
                {recurringUpcoming.length > COLLAPSED && (
                  <button onClick={() => setShowAllBills((v) => !v)} className="mt-2 text-xs font-medium text-accent-ink hover:underline underline-offset-2">
                    {showAllBills ? 'Show less' : `Show all ${recurringUpcoming.length} (${hidden} more)`}
                  </button>
                )}
              </div>
            );
          })()}
          <p className="text-2xs text-ink-muted mt-3">Weekly/quarterly/yearly items are normalised to a monthly figure. Shared bills are split 50/50 — each person carries half (e.g. rent).</p>
        </Card>
      )}

      {/* Charts row 1 — both cards share a fixed height on desktop; the category list
          scrolls internally so it never stretches the row or leaves a gap. */}
      <div className="grid lg:grid-cols-3 gap-4 section-gap">
        <Card className="p-5 lg:col-span-2 flex flex-col lg:h-[500px]" delay={0.1}>
          <SectionCardHeader title="Savings & spending" hint="Money spent vs put aside, last 12 months" />
          <div className="flex-1 min-h-[220px] mt-1"><SpendSaveBars data={data.spendSave} height="100%" /></div>
        </Card>
        <Card className="p-5 flex flex-col lg:h-[500px]" delay={0.15}>
          <SectionCardHeader title="Spending by category" hint="Share of this month's income" />
          {expenseTotal === 0 ? (
            <EmptyState icon="PieChart" title="No expenses this month"
              subtitle="Once you add spending, your category breakdown appears here."
              action={<Button onClick={onQuickAdd}><Plus size={16} /> Add expense</Button>} />
          ) : (
            <>
              <div className="flex-none"><DonutChart data={spendDonut} height={150} centerLabel="Spent" centerValue={formatMoney(expenseTotal, cur, { compact: true })} /></div>
              <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
                <span>{formatMoney(expenseTotal, cur, { compact: true })} of {formatMoney(monthIncome, cur, { compact: true })} income</span>
                <span className="tabular-nums">{((expenseTotal / allocDenom) * 100).toFixed(0)}% used</span>
              </div>
              {/* All categories in a scroll area — the card height stays fixed, so the
                  row never grows and the chart on the left never stretches. */}
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 space-y-0.5">
                {data.byCat.map((c) => {
                  const cat = categories.find((x) => x.id === c.id);
                  const pct = (c.value / allocDenom) * 100;
                  return (
                    <div key={c.id} className="flex items-center gap-2.5 py-1.5 text-sm">
                      {cat?.emoji
                        ? <span className="text-base leading-none shrink-0 w-5 text-center">{cat.emoji}</span>
                        : <span className="w-2.5 h-2.5 rounded-full shrink-0 mx-[5px]" style={{ background: c.color }} />}
                      <span className="text-ink truncate flex-1">{c.name}</span>
                      {isHousehold && <PayerChips payers={data.catPayers.get(c.id)} members={members} memberIds={memberIds} />}
                      <span className="tabular-nums text-ink-muted text-xs w-8 text-right">{pct.toFixed(0)}%</span>
                      <span className="tabular-nums font-medium w-20 text-right">{formatMoney(c.value, cur, { compact: c.value > 99999 })}</span>
                    </div>
                  );
                })}
              </div>
              {availableBal > 0 && (
                <div className="mt-3 flex items-center gap-2.5 rounded-card bg-income/10 px-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-income mx-[5px]" />
                  <span className="text-sm font-medium flex-1">Available to spend</span>
                  <span className="tabular-nums text-ink-muted text-xs w-8 text-right">{((availableBal / allocDenom) * 100).toFixed(0)}%</span>
                  <span className="tabular-nums font-semibold text-income w-20 text-right">{formatMoney(availableBal, cur, { compact: availableBal > 99999 })}</span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-3 gap-4 section-gap">
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
      <div className="grid lg:grid-cols-3 gap-4 section-gap">
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

      {/* Edit a recurring bill straight from the Upcoming list */}
      {savedFor && (
        <SavedBreakdownModal memberId={savedFor} onClose={() => setSavedFor(null)} refDate={REF}
          name={members.find((m) => m.id === savedFor)?.name ?? 'Member'} memberIds={memberIds} />
      )}
      <TransactionModal open={!!editBill} existing={editBill ?? undefined} onClose={() => setEditBill(null)} />
    </Page>
  );
}


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
        return <span key={id} className="w-4 h-4 rounded-full flex items-center justify-center text-3xs font-bold text-on-color ring-2 ring-surface" style={{ background: memberColor(idx) }}>{(m?.name || '?').charAt(0).toUpperCase()}</span>;
      })}
    </span>
  );
}

function InsightCard({ ins, i }: { ins: ReturnType<typeof buildInsights>[number]; i: number }) {
  const Icon = getIcon(ins.icon, Sparkles);
  const color = accentColor(ins.tone);
  return (
    <motion.div {...staggered(i, 0.05)}
      className="card-hover rounded-card border border-line bg-surface-2 p-3.5 flex items-start gap-3">
      <span className="rounded-control p-2 shrink-0" style={{ background: accentColor(ins.tone, 0.12) }}><Icon size={16} color={color} /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{ins.title}</span>
          {ins.value && <span className="text-sm font-bold" style={{ color }}>{ins.value}</span>}
        </div>
        <p className="text-xs text-ink-muted mt-0.5 leading-snug">{ins.detail}</p>
      </div>
    </motion.div>
  );
}

/** Line-by-line explanation of one person's monthly "Saved" figure. */
function SavedBreakdownModal({ memberId, name, memberIds, refDate, onClose }: { memberId: string; name: string; memberIds: string[]; refDate: Date; onClose: () => void }) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const cur = useStore((s) => s.settings.currency);
  const b = useMemo(() => memberMonthBreakdown(transactions, refDate, memberId, memberIds), [transactions, refDate, memberId, memberIds]);
  const catName = (id: string) => { const c = categories.find((x) => x.id === id); return c ? `${c.emoji ? c.emoji + ' ' : ''}${c.name}` : 'Other'; };
  const Section = ({ title, lines, total, sign, split }: { title: string; lines: typeof b.income; total: number; sign: '+' | '−'; split?: boolean }) => (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
        <span>{title} <span className="text-ink-muted font-normal">· {lines.length}</span></span>
        <span className={cx('tabular-nums', sign === '+' ? 'text-income' : 'text-expense')}>{sign}{formatMoney(total, cur)}</span>
      </div>
      {lines.length === 0 ? <p className="text-xs text-ink-muted">None this month.</p> : (
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {lines.map(({ tx, share }) => (
            <div key={tx.id} className="flex items-center gap-2 text-xs rounded-control bg-surface-2 border border-line px-3 py-1.5">
              <span className="text-ink-muted w-12 shrink-0">{format(parseISO(tx.date), 'd MMM')}</span>
              <span className="flex-1 truncate text-ink-muted">{tx.merchant || catName(tx.categoryId)}<span className="text-ink-faint"> · {catName(tx.categoryId)}</span></span>
              {split && <span className="text-ink-faint tabular-nums">{formatMoney(tx.amount, cur)} ÷ {memberIds.length} =</span>}
              <span className="tabular-nums font-medium text-ink">{formatMoney(share, cur)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <Modal open onClose={onClose} title={`${name} — saved in ${format(refDate, 'MMMM')}`}>
      <div className="space-y-5">
        <Section title="Income" lines={b.income} total={b.incomeTotal} sign="+" />
        <Section title={`${name}'s own expenses`} lines={b.own} total={b.ownTotal} sign="−" />
        <Section title="Share of shared expenses" lines={b.shared} total={b.sharedTotal} sign="−" split />
        <div className="flex items-center justify-between border-t border-line pt-3 text-base font-bold">
          <span>Saved</span>
          <span className={cx('tabular-nums', b.net >= 0 ? 'text-savings' : 'text-expense')}>{formatMoney(b.net, cur, { sign: true })}</span>
        </div>
        <p className="text-2xs text-ink-muted">
          Shared = expenses logged as “Everyone (split)” or with no payer; each person carries an equal part.
          Expenses logged with {name} as payer count in full for {name}, even if they were for both of you.
          This is month-to-date: salary counts from the 1st, while bills later in the month aren't included until they're posted.
          Money moved to Economii or goals isn't spending, so it stays in this figure.
        </p>
      </div>
    </Modal>
  );
}
