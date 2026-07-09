export default function BookingDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Reservation Details</h1>
      <p className="text-sm text-muted-foreground">Viewing reservation ID: {params.id}</p>
      {/* Placeholder for Status Timeline + Pickup Instructions */}
    </div>
  );
}