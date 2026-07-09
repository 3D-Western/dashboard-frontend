export default function BookingDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Reservation Details</h1>
      <p className="text-sm text-muted-foreground">Viewing reservation ID: {params.id}</p>
      {/* Placeholder for Status Timeline + Pickup Instructions */}
    </div>
  );
}
