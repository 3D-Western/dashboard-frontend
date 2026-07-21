export function AvailabilityIndicator() {
  return (
    <div className="flex flex-wrap items-center gap-4 pb-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-status-success" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-primary" />
        <span>Your Booking</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-destructive" />
        <span>Fully Booked / Maintenance</span>
      </div>
    </div>
  );
}
