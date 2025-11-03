'use client';

import { useState } from 'react';

interface CancelPrintRequestButtonProps {
  id: string; // job id
  onCancelSuccess?: (id: string) => void;
}

export default function CancelPrintRequestButton({ id, onCancelSuccess }: CancelPrintRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleCancel = async () => {
    if (loading || cancelled) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/orders/active/cancel/${id}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Cancel failed');

      // mark as cancelled
      setCancelled(true);
      // notify parent if provided
      try {
        onCancelSuccess?.(id);
      } catch (e) {
        // swallow errors from callback to avoid breaking UI
        // callback should be sync and side-effect free
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <>
      <span
        onClick={handleCancel}
        className={`cursor-pointer ${
          cancelled
            ? 'text-muted-foreground pointer-events-none'
            : 'hover:text-destructive'
        } ${loading ? 'opacity-60' : ''}`}
      >
        {loading ? 'Cancelling...' : cancelled ? 'Cancelled' : 'Cancel Print'}
      </span>

      {err && <p className="text-xs text-destructive mt-1">{err}</p>}
    </>
  );
}
