import { Modal } from '@/components/ui/Modal';
import { TransactionForm } from './TransactionForm';
import type { Transaction } from '@/types';

export function TransactionModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Transaction }) {
  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit transaction' : 'Quick add'}>
      {open && <TransactionForm existing={existing} onDone={onClose} />}
    </Modal>
  );
}
