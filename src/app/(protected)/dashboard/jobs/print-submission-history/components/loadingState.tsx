// components/LoadingState.tsx

export default function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-24 rounded-lg bg-muted animate-pulse" />
      <div className="h-24 rounded-lg bg-muted animate-pulse" />
      <div className="h-24 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}