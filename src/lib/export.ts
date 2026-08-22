import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction, Category, CurrencyCode } from '@/types';
import { formatMoney } from './format';

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

export function exportXLSX(txs: Transaction[], cats: Category[], name = 'transactions') {
  const ws = XLSX.utils.json_to_sheet(rows(txs, cats));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export function exportPDF(txs: Transaction[], cats: Category[], title = 'Financial Report', subtitle = '') {
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
export function exportMonthlyReportPDF(r: MonthlyReport) {
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
