import { useState } from 'react';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { settleUp } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { format } from 'date-fns';

const monthKey = () => format(new Date(), 'yyyy-MM');
const settledKey = () => `ff_settled_${monthKey()}`;

/** Two-person "who owes whom this month" tracker. Costs are shared 50/50; whoever
 *  logged more than their fair share is owed the difference. Settling is recorded
 *  per month on this device. */
export function SettleUpCard() {
  const transactions = useStore((s) => s.transactions);
  const members = useStore((s) => s.members);
  const cur = useStore((s) => s.settings.currency);
  const [settled, setSettled] = useState<boolean>(() => { try { return !!localStorage.getItem(settledKey()); } catch { return false; } });

  const memberIds = members.map((m) => m.id);
  const s = settleUp(transactions, new Date(), memberIds);
  if (!s) return null; // only for exactly two members

  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '—';
  const mark = () => { try { localStorage.setItem(settledKey(), new Date().toISOString()); } catch { /* */ } setSettled(true); };
  const undo = () => { try { localStorage.removeItem(settledKey()); } catch { /* */ } setSettled(false); };

  return (
    <Card className="p-5 mt-4" delay={0.1}>
      <div className="flex items-center gap-2 mb-1">
        <ArrowLeftRight size={18} className="text-blue-300" />
        <h3 className="font-bold">Settle up · {format(new Date(), 'MMMM')}</h3>
      </div>

      {!s.owe ? (
        <p className="text-sm text-white/60 mt-1">You're even this month — each of you covered your half ({formatMoney(s.fairShare, cur)}).</p>
      ) : settled ? (
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-income flex items-center gap-1.5"><Check size={15} /> Settled — {name(s.owe.fromId)} paid {name(s.owe.toId)} {formatMoney(s.owe.amount, cur)}.</p>
          <button onClick={undo} className="text-xs text-white/40 hover:text-white/70">Undo</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <p className="text-sm">
            <span className="font-semibold">{name(s.owe.fromId)}</span> owes <span className="font-semibold">{name(s.owe.toId)}</span>{' '}
            <span className="font-semibold text-expense">{formatMoney(s.owe.amount, cur)}</span>
          </p>
          <Button className="!py-2" onClick={mark}><Check size={15} /> Mark settled</Button>
        </div>
      )}

      <p className="text-[11px] text-white/40 mt-3">
        Shared costs are split 50/50. This month you each logged: {name(memberIds[0])} {formatMoney(s.paid[memberIds[0]], cur)} · {name(memberIds[1])} {formatMoney(s.paid[memberIds[1]], cur)} (fair share {formatMoney(s.fairShare, cur)} each).
      </p>
    </Card>
  );
}
