// components/EmptyState.tsx

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-semibold">No print jobs submitted yet</h2>

      <p className="mt-2 text-muted-foreground">Your submitted print jobs will appear here.</p>
    </div>
  );
}
