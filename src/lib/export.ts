import type { Transaction, Category, CurrencyCode } from '@/types';
import { formatMoney } from './format';

// Heavy libraries (xlsx ~ hundreds of KB, jsPDF) are dynamically imported inside the
// functions that need them, so they're only fetched when the user actually exports —
// they no longer weigh down the initial app bundle.

function rows(txs: Transaction[], cats: Category[]) {
  return txs.map((t) => ({
    Date: t.date,
    Type: t.type,
    Merchant: t.merchant,
    Category: cats.find((c) => c.id === t.categoryId)?.name ?? t.categoryId,
    Amount: t.type === 'expense' ? -t.amount : t.amount,
    Method: t.method,
    Recurring: t.recurring ? 'Yes' : 'No',
    Notes: t.notes ?? '',
  }));
}

export function exportCSV(txs: Transaction[], cats: Category[], name = 'transactions') {
  const data = rows(txs, cats);
  const header = Object.keys(data[0] ?? { Date: '' });
  const csv = [header.join(','), ...data.map((r) => header.map((h) => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
  download(new Blob([csv], { type: 'text/csv' }), `${name}.csv`);
}

export async function exportXLSX(txs: Transaction[], cats: Category[], name = 'transactions') {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows(txs, cats));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export async function exportPDF(txs: Transaction[], cats: Category[], title = 'Financial Report', subtitle = '') {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text(title, 14, 18);
  if (subtitle) { doc.setFontSize(10); doc.setTextColor(120); doc.text(subtitle, 14, 25); }
  const data = rows(txs, cats);
  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Type', 'Merchant', 'Category', 'Amount', 'Method']],
    body: data.map((r) => [r.Date, r.Type, r.Merchant, r.Category, r.Amount.toFixed(2), r.Method]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export interface MonthlyReport {
  monthLabel: string;
  currency: CurrencyCode;
  summary: { label: string; value: string }[];
  topCategories: { name: string; value: number }[];
  members?: { name: string; expense: number; income: number }[];
  transactions: Transaction[];
  categories: Category[];
}

/** A full end-of-month PDF: headline metrics, top categories, who-spent-what, and every transaction. */
export async function exportMonthlyReportPDF(r: MonthlyReport) {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(16, 185, 129); doc.rect(0, 0, W, 4, 'F');
  doc.setFontSize(20); doc.setTextColor(20); doc.text('FinFlow — Monthly Report', 14, 20);
  doc.setFontSize(11); doc.setTextColor(120); doc.text(r.monthLabel, 14, 27);

  // Summary metrics as a 2-column grid
  autoTable(doc, {
    startY: 34,
    body: r.summary.map((s) => [s.label, s.value]),
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: { 0: { textColor: [120, 120, 120] }, 1: { fontStyle: 'bold', halign: 'right' } },
    tableWidth: 90,
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  if (r.members && r.members.length) {
    doc.setFontSize(13); doc.setTextColor(20); doc.text('Who spent what', 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [['Member', 'Spent', 'Income']],
      body: r.members.map((m) => [m.name, formatMoney(m.expense, r.currency), formatMoney(m.income, r.currency)]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
      tableWidth: 120,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.setFontSize(13); doc.setTextColor(20); doc.text('Top spending categories', 14, y);
  autoTable(doc, {
    startY: y + 3,
    head: [['Category', 'Total']],
    body: r.topCategories.map((c) => [c.name, formatMoney(c.value, r.currency)]),
    styles: { fontSize: 9 }, headStyles: { fillColor: [168, 85, 247] },
    tableWidth: 120,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(13); doc.setTextColor(20); doc.text('All transactions', 14, y);
  autoTable(doc, {
    startY: y + 3,
    head: [['Date', 'Category', 'Type', 'Amount', 'Method']],
    body: r.transactions.map((t) => [
      t.date,
      r.categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId,
      t.type,
      formatMoney(t.type === 'expense' ? -t.amount : t.amount, r.currency),
      t.method,
    ]),
    styles: { fontSize: 8 }, headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`finflow-report-${r.monthLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportJSON(data: unknown, name = 'finflow-backup') {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${name}.json`);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Parse a bank-style CSV (Date, Description, Amount[, Category]). */
export function parseBankCSV(text: string, cats: Category[]): Partial<Transaction>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const di = header.findIndex((h) => h.includes('date'));
  const mi = header.findIndex((h) => h.includes('desc') || h.includes('merchant') || h.includes('name'));
  const ai = header.findIndex((h) => h.includes('amount') || h.includes('value'));
  const out: Partial<Transaction>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 2) continue;
    const amt = parseFloat((cols[ai] ?? '0').replace(/[^0-9.-]/g, ''));
    if (isNaN(amt)) continue;
    out.push({
      date: normalizeDate(cols[di]),
      merchant: (cols[mi] ?? 'Imported').replace(/"/g, '').trim(),
      amount: Math.abs(amt),
      type: amt < 0 ? 'expense' : 'income',
      categoryId: amt < 0 ? 'misc' : 'other-inc',
      method: 'Card',
      recurring: false,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Investment CSV import — tolerant to Trading 212 exports and simple sheets.
// Aggregates buy/sell rows per ticker into a holding (units + cost basis).
// ---------------------------------------------------------------------------
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface ParsedHolding {
  name: string; ticker?: string; kind: 'Stock' | 'ETF' | 'Crypto';
  units: number; costBasis: number; currency: string;
}

export function parseInvestmentsCSV(text: string): ParsedHolding[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));

  const iAction = find('action');
  const iTicker = find('ticker', 'symbol');
  const iName = find('name', 'instrument');
  const iShares = find('no. of shares', 'shares', 'quantity', 'units');
  const iTotal = find('total');
  const iCurrency = header.findIndex((h) => h.includes('currency') && h.includes('total'));
  const iCurAny = find('currency');

  const acc = new Map<string, ParsedHolding>();
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 2) continue;
    const action = (iAction >= 0 ? cols[iAction] : 'buy').toLowerCase();
    const isBuy = action.includes('buy') || action === '';
    const isSell = action.includes('sell');
    if (!isBuy && !isSell) continue; // skip deposits, dividends, fees, etc.

    const ticker = iTicker >= 0 ? cols[iTicker] : '';
    const name = (iName >= 0 ? cols[iName] : ticker) || ticker || 'Holding';
    const key = (ticker || name).toUpperCase();
    const units = Math.abs(parseFloat((cols[iShares] ?? '0').replace(/[^0-9.-]/g, ''))) || 0;
    const total = Math.abs(parseFloat((cols[iTotal] ?? '0').replace(/[^0-9.-]/g, ''))) || 0;
    const currency = (iCurrency >= 0 ? cols[iCurrency] : iCurAny >= 0 ? cols[iCurAny] : 'RON') || 'RON';
    const kind: ParsedHolding['kind'] = /etf|index|s&p|ftse|msci/i.test(name) ? 'ETF' : /btc|eth|coin|crypto/i.test(name + ticker) ? 'Crypto' : 'Stock';

    const h = acc.get(key) ?? { name, ticker: ticker || undefined, kind, units: 0, costBasis: 0, currency: currency.toUpperCase() };
    h.units += isBuy ? units : -units;
    h.costBasis += isBuy ? total : -total;
    acc.set(key, h);
  }
  return [...acc.values()].filter((h) => h.units > 0.0000001 && h.costBasis > 0)
    .map((h) => ({ ...h, units: Math.round(h.units * 1e6) / 1e6, costBasis: Math.round(h.costBasis * 100) / 100 }));
}

function normalizeDate(s: string) {
  const t = (s ?? '').trim();
  const dmy = t.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (dmy) {
    const [_, d, m, y] = dmy;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return t.slice(0, 10);
}
