import { Button } from '@/components/ui/button';

interface SectionErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function SectionErrorState({ message, onRetry }: SectionErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
