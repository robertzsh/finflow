import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction, Category } from '@/types';

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
