import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/lib/format';

function useCur() { return useStore((s) => s.settings.currency); }

const axisStyle = { fontSize: 11, fill: 'rgba(255,255,255,0.45)' };
const grid = 'rgba(255,255,255,0.06)';

function TT({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-glass">
      {label && <div className="font-semibold mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-white/60 capitalize">{p.name}:</span>
          <span className="font-semibold">{formatMoney(p.value, currency, { compact: p.value > 9999 })}</span>
        </div>
      ))}
    </div>
  );
}

export function CashFlowChart({ data }: { data: { month: string; income: number; expense: number; balance: number }[] }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gInc)" />
        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExp)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BalanceLine({ data }: { data: { month: string; balance: number }[] }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gBal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, height = 260 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={<TT currency={currency} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="income" fill="#10b981" radius={[5, 5, 0, 0]} />
        <Bar dataKey="expense" fill="#ef4444" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsArea({ data }: { data: { month: string; savings: number }[] }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs><linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.55} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} />
        <Area type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gSav)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function InvestHistory({ data }: { data: { month: string; value: number }[] }) {
  const currency = useCur();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TT currency={currency} />} />
        <Line type="monotone" dataKey="value" stroke="#eab308" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function LegendList({ data, total, currency }: { data: { name: string; value: number; color: string }[]; total: number; currency: any }) {
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
