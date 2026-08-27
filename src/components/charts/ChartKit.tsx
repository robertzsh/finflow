import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/lib/format';

function useCur() { return useStore((s) => s.settings.currency); }

// Theme-aware chart palette. Pink swaps green/red/blue for teal/coral/berry, and
// the tooltip flips to a light card on light/pink so its text stays readable.
function useChartTheme() {
  const theme = useStore((s) => s.settings.theme);
  const pink = theme === 'pink';
  const light = theme === 'light' || pink;
  return {
    income: pink ? '#06b6d4' : '#10b981',
    expense: pink ? '#f43f5e' : '#ef4444',
    savings: pink ? '#db2777' : '#3b82f6',
    invest: pink ? '#f59e0b' : '#eab308',
    axis: light ? '#64748b' : '#94a3b8',
    grid: light ? 'rgba(100,116,139,0.16)' : 'rgba(148,163,184,0.18)',
    tipBg: light ? 'rgba(255,255,255,0.98)' : '#0d1220',
    tipText: light ? '#0f172a' : '#ffffff',
    tipMuted: light ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.7)',
    tipBorder: light ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.14)',
  };
}

function TT({ active, payload, label, currency }: any) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.tipBg, border: `1px solid ${t.tipBorder}`, color: t.tipText, backdropFilter: 'blur(8px)' }}
      className="rounded-xl px-3 py-2 text-xs shadow-lg">
      {label && <div className="font-semibold mb-1" style={{ color: t.tipText }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize" style={{ color: t.tipMuted }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: t.tipText }}>{formatMoney(p.value, currency, { compact: p.value > 9999 })}</span>
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
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.income} stopOpacity={0.5} /><stop offset="100%" stopColor={c.income} stopOpacity={0} /></linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.expense} stopOpacity={0.45} /><stop offset="100%" stopColor={c.expense} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
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
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.savings} stopOpacity={0.5} /><stop offset="100%" stopColor={c.savings} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="balance" stroke={c.savings} strokeWidth={2.5} fill="url(#gBal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendSaveBars({ data }: { data: { month: string; spending: number; savings: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barGap={3}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: c.axis }} />
        <Bar dataKey="spending" name="Spending" fill={c.expense} radius={[4, 4, 0, 0]} />
        <Bar dataKey="savings" name="Savings" fill={c.income} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 260 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  // No tooltip: the ring has a value label in its centre + a full legend below,
  // and a hover tooltip would overlap the centre label on the donut.
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="income" fill={c.income} radius={[5, 5, 0, 0]} />
        <Bar dataKey="expense" fill={c.expense} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsArea({ data }: { data: { month: string; savings: number }[] }) {
  const currency = useCur();
  const c = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.savings} stopOpacity={0.55} /><stop offset="100%" stopColor={c.savings} stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
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
      <LineChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: c.axis }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
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
          <span className="flex items-center gap-2 text-white/70">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.name}
          </span>
          <span className="tabular-nums font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}
