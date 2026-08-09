import { useMemo, useState } from 'react';
import { FileText, FileSpreadsheet, FileDown } from 'lucide-react';
import { startOfMonth, subMonths, format, parseISO, isSameMonth, getYear } from 'date-fns';
import { useStore } from '@/store/useStore';
import { Page } from '@/components/PageTransition';
import { PageHeader, SectionCardHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { ComparisonBars, DonutChart } from '@/components/charts/ChartKit';
import { monthStats, spendingByCategory, cashFlowSeries } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { exportCSV, exportXLSX, exportPDF } from '@/lib/export';

const REF = new Date('2026-07-28');
type ReportType = 'monthly' | 'yearly' | 'category' | 'merchant' | 'cashflow' | 'savings';

export default function Reports() {
  const { transactions, categories, settings } = useStore();
  const cur = settings.currency;
  const [report, setReport] = useState<ReportType>('monthly');
  const [monthSel, setMonthSel] = useState(format(REF, 'yyyy-MM'));

  const monthOptions = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => format(startOfMonth(subMonths(REF, i)), 'yyyy-MM')), []);

  const refDate = parseISO(`${monthSel}-01`);

  const scoped = useMemo(() => {
    if (report === 'yearly') return transactions.filter((t) => getYear(parseISO(t.date)) === getYear(refDate));
    if (report === 'monthly' || report === 'category' || report === 'merchant') return transactions.filter((t) => isSameMonth(parseISO(t.date), refDate));
    return transactions;
  }, [transactions, report, refDate]);

  const stats = useMemo(() => monthStats(transactions, refDate), [transactions, refDate]);
  const byCat = useMemo(() => spendingByCategory(transactions, categories, refDate), [transactions, categories, refDate]);
  const cf = useMemo(() => cashFlowSeries(transactions, 8), [transactions]);

  const byMerchant = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of scoped.filter((x) => x.type === 'expense')) map.set(t.merchant, (map.get(t.merchant) ?? 0) + t.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);
  }, [scoped]);

  const title = {
    monthly: 'Monthly report', yearly: 'Yearly report', category: 'Category report',
    merchant: 'Merchant report', cashflow: 'Cash flow report', savings: 'Savings report',
  }[report];

  return (
    <Page>
      <PageHeader title="Reports" subtitle="Analyse and export your financial data"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => exportCSV(scoped, categories, report)}><FileDown size={16} /> CSV</Button>
            <Button variant="ghost" onClick={() => exportXLSX(scoped, categories, report)}><FileSpreadsheet size={16} /> Excel</Button>
            <Button onClick={() => exportPDF(scoped, categories, title, `${monthSel} · FinFlow`)}><FileText size={16} /> PDF</Button>
          </div>
        } />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={report} onChange={(e) => setReport(e.target.value as ReportType)} className="!w-auto">
          <option value="monthly">Monthly report</option>
          <option value="yearly">Yearly report</option>
          <option value="category">Category report</option>
          <option value="merchant">Merchant report</option>
          <option value="cashflow">Cash flow report</option>
          <option value="savings">Savings report</option>
        </Select>
        {(report === 'monthly' || report === 'category' || report === 'merchant') && (
          <Select value={monthSel} onChange={(e) => setMonthSel(e.target.value)} className="!w-auto">
            {monthOptions.map((m) => <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MMMM yyyy')}</option>)}
          </Select>
        )}
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        <Card className="p-4"><p className="text-xs text-white/50">Income</p><p className="text-xl font-bold text-income mt-1">{formatMoney(stats.income, cur)}</p></Card>
        <Card className="p-4"><p className="text-xs text-white/50">Expenses</p><p className="text-xl font-bold text-expense mt-1">{formatMoney(stats.expense, cur)}</p></Card>
        <Card className="p-4"><p className="text-xs text-white/50">Net</p><p className={`text-xl font-bold mt-1 ${stats.net >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(stats.net, cur, { sign: true })}</p></Card>
        <Card className="p-4"><p className="text-xs text-white/50">Savings rate</p><p className="text-xl font-bold text-savings mt-1">{stats.savingsRate.toFixed(0)}%</p></Card>
      </div>

      {(report === 'monthly' || report === 'cashflow' || report === 'savings' || report === 'yearly') && (
        <Card className="p-5 mb-4"><SectionCardHeader title="Income vs expenses" hint="Last 8 months" /><ComparisonBars data={cf} /></Card>
      )}

      {(report === 'monthly' || report === 'category') && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5"><SectionCardHeader title="Spending by category" /><DonutChart data={byCat.slice(0, 8)} /></Card>
          <Card className="p-5">
            <SectionCardHeader title="Category breakdown" />
            <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar">
              {byCat.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="tabular-nums font-medium">{formatMoney(c.value, cur)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {report === 'merchant' && (
        <Card className="p-5">
          <SectionCardHeader title="Top merchants" />
          <div className="space-y-2">
            {byMerchant.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3 text-sm">
                <span className="text-white/30 w-5">{i + 1}</span>
                <span className="flex-1">{m.name}</span>
                <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden hidden sm:block">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${(m.value / byMerchant[0].value) * 100}%` }} />
                </div>
                <span className="tabular-nums font-medium w-20 text-right">{formatMoney(m.value, cur)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}
