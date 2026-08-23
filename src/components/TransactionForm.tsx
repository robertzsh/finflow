import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Label, Input, Select, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import type { Transaction, TxType, PaymentMethod, RecurringFrequency } from '@/types';

interface FormValues {
  type: TxType;
  amount: number;
  categoryId: string;
  method: string;
  date: string;
  notes?: string;
  recurring: boolean;
  frequency?: string;
}

const METHODS: PaymentMethod[] = ['Card', 'Cash', 'Bank Transfer', 'Direct Debit', 'PayPal', 'Apple Pay', 'Google Pay', 'Other'];

export function TransactionForm({ existing, onDone, defaultDate }: { existing?: Transaction; onDone: () => void; defaultDate?: string }) {
  const { categories, addTransaction, updateTransaction, deleteTransaction, cloud, authed, members, userId } = useStore();
  const [formError, setFormError] = useState('');
  const showPaidBy = cloud && authed && members.length > 1;
  const [paidBy, setPaidBy] = useState<string>(existing?.createdBy ?? userId ?? '');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: existing ? {
      type: existing.type, amount: existing.amount, categoryId: existing.categoryId,
      method: existing.method, date: existing.date,
      notes: existing.notes ?? '', recurring: existing.recurring, frequency: existing.frequency ?? 'monthly',
    } : {
      type: 'expense', amount: undefined as unknown as number, categoryId: '',
      method: 'Card', date: defaultDate || new Date().toISOString().slice(0, 10), notes: '', recurring: false, frequency: 'monthly',
    },
  });

  const type = watch('type') as TxType;
  const recurring = watch('recurring');
  const cats = categories.filter((c) => c.kind === type);

  const onValid = (v: FormValues) => {
    setFormError('');
    try {
      const amount = Number(v.amount);
      if (!Number.isFinite(amount) || amount <= 0) { setFormError('Enter an amount greater than 0.'); return; }
      if (!v.categoryId) { setFormError('Pick a category.'); return; }
      const cat = categories.find((c) => c.id === v.categoryId);
      const payload = {
        type: v.type, amount, categoryId: v.categoryId,
        merchant: existing?.merchant || cat?.name || '', // no manual merchant — default to category name
        method: v.method as PaymentMethod, date: v.date, notes: v.notes,
        recurring: v.recurring, frequency: v.recurring ? (v.frequency as RecurringFrequency) : undefined,
        receipt: existing?.receipt,
        createdBy: showPaidBy ? (paidBy || userId || undefined) : existing?.createdBy,
      };
      if (existing) updateTransaction(existing.id, payload);
      else addTransaction(payload);
      onDone();
    } catch (e: any) {
      setFormError(e?.message ?? 'Could not save. Please try again.');
    }
  };

  const onInvalid = () => setFormError('Please fill in the amount and category.');
  const submit = handleSubmit(onValid, onInvalid);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5">
        {(['expense', 'income'] as TxType[]).map((t) => (
          <button type="button" key={t} onClick={() => { setValue('type', t); setValue('categoryId', ''); }}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${type === t ? (t === 'income' ? 'bg-income/20 text-income border border-income/30' : 'bg-expense/20 text-expense border border-expense/30') : 'text-white/50'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Amount</Label>
          <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00"
            {...register('amount', { required: 'Enter an amount', valueAsNumber: true, validate: (v) => (Number(v) > 0) || 'Amount must be greater than 0' })} />
          {errors.amount && <p className="text-xs text-expense mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('date')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select {...register('categoryId', { required: 'Pick a category' })}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ${c.name}` : c.name}</option>)}
          </Select>
          {errors.categoryId && <p className="text-xs text-expense mt-1">{errors.categoryId.message}</p>}
        </div>
        <div>
          <Label>Payment method</Label>
          <Select {...register('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select>
        </div>
      </div>

      {showPaidBy && (
        <div>
          <Label>Paid by</Label>
          <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === userId ? ' (you)' : ''}</option>)}
            <option value="all">👥 Everyone (split equally)</option>
          </Select>
        </div>
      )}

      <div>
        <Label>Notes (optional)</Label>
        <Textarea rows={2} placeholder="Add a note…" {...register('notes')} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3.5 py-3">
        <div>
          <div className="text-sm font-medium">Recurring transaction</div>
          <div className="text-xs text-white/40">Auto-projected in your calendar</div>
        </div>
        <input type="checkbox" {...register('recurring')} className="w-5 h-5 accent-blue-500" />
      </div>
      {recurring && (
        <div>
          <Label>Frequency</Label>
          <Select {...register('frequency')}>
            <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
          </Select>
        </div>
      )}

      {formError && (
        <div className="flex items-center gap-2 rounded-xl bg-expense/15 border border-expense/30 text-expense px-3.5 py-2.5 text-sm">
          <AlertCircle size={16} /> {formError}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">{existing ? 'Save changes' : 'Add transaction'}</Button>
        {existing && <Button type="button" variant="danger" onClick={() => { deleteTransaction(existing.id); onDone(); }}><Trash2 size={16} /></Button>}
      </div>
    </form>
  );
}
