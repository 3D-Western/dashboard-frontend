export function AvailabilityIndicator() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground pb-2">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-[#75e09c]" />
        <span>Available</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-[#f76b6b]" />
        <span>Fully Booked / Maintenance</span>
      </div>
    </div>
  );
}