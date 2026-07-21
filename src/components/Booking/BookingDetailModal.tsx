import { Button } from '@/components/ui/button';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventDetails: {
    title: string;
    start: string;
    end: string;
  } | null;
}

export function BookingDetailModal({ isOpen, onClose, eventDetails }: BookingDetailModalProps) {
  if (!isOpen || !eventDetails) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Reservation Details</h2>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold text-green-600">{eventDetails.title}</span>
          </div>

          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Time Block</span>
            <span className="font-medium">
              {new Date(eventDetails.start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -
              {new Date(eventDetails.end).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="mb-1 font-semibold">Pickup Instructions</p>
            <p className="text-muted-foreground">
              Please check in with the lab monitor 5 minutes before your time block begins. Ensure
              your materials are prepped.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
