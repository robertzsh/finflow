import { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/lib/format';

function useCur() { return useStore((s) => s.settings.currency); }

// Short numeric axis ticks ("16K", "1.5K", "500") — no currency word, so long labels
// like "16 K RON" don't get clipped. The tooltip still shows the full currency amount.
const axisTick = (v: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

// Chart palette straight from the theme tokens (src/styles/tokens.css): CSS-var colours
// work in SVG fill/stroke, so charts re-tint with the theme without any JS lookup.
// Series pairs (income vs expense) are validated for colour-blind separation per theme.
const CHART = {
  income: 'rgb(var(--income))',
  expense: 'rgb(var(--expense))',
  savings: 'rgb(var(--savings))',
  invest: 'rgb(var(--invest))',
  axis: 'rgb(var(--ink-muted))',
  grid: 'var(--line)',
  cursor: 'var(--hover)',
};
function useChartTheme() {
  return CHART;
}

function TT({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="menu px-3 py-2 text-xs">
      {label && <div className="font-semibold text-ink mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-ink-muted">{p.name}:</span>
          <span className="font-semibold tabular-nums text-ink">{formatMoney(p.value, currency, { compact: p.value > 9999 })}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ data }: { data: { month: string; income: number; expense: number; balance: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.income} stopOpacity={0.5} /><stop offset="100%" stopColor={c.income} stopOpacity={0} /></linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.expense} stopOpacity={0.45} /><stop offset="100%" stopColor={c.expense} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="income" stroke={c.income} strokeWidth={2} fill="url(#gInc)" />
        <Area type="monotone" dataKey="expense" stroke={c.expense} strokeWidth={2} fill="url(#gExp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BalanceLine({ data }: { data: { month: string; balance: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.savings} stopOpacity={0.5} /><stop offset="100%" stopColor={c.savings} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="balance" stroke={c.savings} strokeWidth={2.5} fill="url(#gBal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendSaveBars({ data, height = 260 }: { data: { month: string; spending: number; savings: number }[]; height?: number | string }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={3}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: c.cursor }} />
        <Legend wrapperStyle={{ fontSize: 11, color: c.axis }} />
        <Bar dataKey="spending" name="Spending" fill={c.expense} radius={[4, 4, 0, 0]} />
        <Bar dataKey="savings" name="Savings" fill={c.income} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Net moved into savings per month — positive months in the savings tone, net withdrawals in red. */
export function SavedPerMonthBars({ data, height = 240 }: { data: { month: string; net: number }[]; height?: number | string }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: c.cursor }} />
        <Bar dataKey="net" name="Saved" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.net >= 0 ? c.savings : c.expense} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 260, centerLabel, centerValue }:
  { data: { name: string; value: number; color: string }[]; height?: number | string; centerLabel?: string; centerValue?: string }) {
  const currency = useCur();
  const [active, setActive] = useState<number | null>(null);
  const shown = active != null ? data[active] : null;
  const showCenter = shown || (centerLabel != null);
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none"
            onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => <Cell key={i} fill={d.color} opacity={active == null || active === i ? 1 : 0.4} style={{ transition: 'opacity .15s' }} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {showCenter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          <span className="text-2xs uppercase tracking-wide text-ink-muted truncate max-w-full">{shown ? shown.name : centerLabel}</span>
          <span className="font-display text-xl font-semibold tabular-nums truncate max-w-full">{shown ? formatMoney(shown.value, currency, { compact: true }) : centerValue}</span>
        </div>
      )}
    </div>
  );
}

export function ComparisonBars({ data, height = 260 }: { data: { month: string; income: number; expense: number }[]; height?: number | string }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: c.cursor }} />
        <Bar dataKey="income" fill={c.income} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill={c.expense} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsArea({ data, height = 220 }: { data: { month: string; savings: number }[]; height?: number | string }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.savings} stopOpacity={0.55} /><stop offset="100%" stopColor={c.savings} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="savings" stroke={c.savings} strokeWidth={2.5} fill="url(#gSav)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InvestHistory({ data }: { data: { month: string; value: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => axisTick(v)} width={40} />
        <Tooltip content={<TT currency={currency} />} />
        <Line type="monotone" dataKey="value" stroke={c.invest} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LegendList({ data, total, currency }: { data: { name: string; value: number; color: string }[]; total: number; currency: any }) {
  void currency;
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-ink-muted">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}
          </span>
          <span className="tabular-nums font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}
