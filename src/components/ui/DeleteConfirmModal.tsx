import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  itemType?: 'task' | 'habit' | 'journal reflection' | 'item' | string;
  description?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType = 'item',
  description,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const defaultDescription = `"${title}" will be permanently removed from your ${itemType === 'habit' ? 'habits routine and history' : itemType === 'task' ? 'schedule and calendar' : itemType === 'journal reflection' ? 'journal archive' : 'records'}.`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-[#14161e] border border-[#232938] rounded-[28px] p-6 shadow-2xl z-10 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-white mb-1.5 capitalize">
            Delete this {itemType}?
          </h3>
          <p className="text-xs text-[#7d8495] leading-relaxed mb-6">
            {description || defaultDescription}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[#7d8495] hover:text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                await onConfirm();
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DeleteConfirmModal;
