import { useState } from 'react';

interface BulkActionBarProps {
  selectedIds: string[];
  onBulkAction: (action: 'APPROVE' | 'REJECT' | 'CANCEL', reason?: string) => Promise<void>;
  isPending: boolean;
  onClearSelection: () => void;
}

export default function BulkActionBar({
  selectedIds,
  onBulkAction,
  isPending,
  onClearSelection,
}: BulkActionBarProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState('');

  if (selectedIds.length === 0) return null;

  const handleActionClick = async (action: 'APPROVE' | 'CANCEL') => {
    await onBulkAction(action);
    onClearSelection();
  };

  const handleRejectSubmit = async () => {
    if (!reason.trim()) return;
    await onBulkAction('REJECT', reason);
    setReason('');
    setShowRejectInput(false);
    onClearSelection();
  };

  return (
    <div className="animate-slide-up fixed bottom-6 left-1/2 z-50 flex w-full max-w-3xl -translate-x-1/2 transform flex-col items-center justify-between gap-4 rounded-xl bg-gray-900 px-6 py-4 text-white shadow-2xl md:flex-row">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold">
          {selectedIds.length} Selected
        </span>
        <p className="text-sm font-medium">Bulk actions will apply to all selected bookings.</p>
      </div>

      {showRejectInput ? (
        <div className="flex w-full items-center gap-2 md:w-auto">
          <input
            type="text"
            placeholder="Reason for bulk rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none md:w-64"
          />
          <button
            onClick={handleRejectSubmit}
            disabled={isPending || !reason.trim()}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowRejectInput(false)}
            className="px-2 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onClearSelection}
            className="px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            disabled={isPending}
          >
            Clear
          </button>
          <button
            onClick={() => handleActionClick('APPROVE')}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            Bulk Approve
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Bulk Reject
          </button>
          <button
            onClick={() => handleActionClick('CANCEL')}
            disabled={isPending}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-600 disabled:opacity-50"
          >
            Bulk Cancel
          </button>
        </div>
      )}
    </div>
  );
}
