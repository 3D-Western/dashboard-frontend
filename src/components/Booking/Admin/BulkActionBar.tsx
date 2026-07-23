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
  onClearSelection 
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
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 z-50 animate-slide-up">
      <div className="flex items-center gap-3">
        <span className="bg-blue-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {selectedIds.length} Selected
        </span>
        <p className="text-sm font-medium">Bulk actions will apply to all selected bookings.</p>
      </div>

      {showRejectInput ? (
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Reason for bulk rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 flex-1 md:w-64"
          />
          <button
            onClick={handleRejectSubmit}
            disabled={isPending || !reason.trim()}
            className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowRejectInput(false)}
            className="text-gray-400 hover:text-white text-sm px-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-400 hover:text-white px-3 py-2 transition-colors"
            disabled={isPending}
          >
            Clear
          </button>
          <button
            onClick={() => handleActionClick('APPROVE')}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Bulk Approve
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Bulk Reject
          </button>
        </div>
      )}
    </div>
  );
}