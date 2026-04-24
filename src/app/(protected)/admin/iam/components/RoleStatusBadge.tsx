import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RoleStatusBadgeProps {
  isActive: boolean;
}

export function RoleStatusBadge({ isActive }: RoleStatusBadgeProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        className={cn(
          'border-transparent',
          isActive
            ? 'bg-status-success text-status-success-foreground'
            : 'bg-status-error text-status-error-foreground',
        )}
        role="status"
        aria-label={isActive ? 'Active' : 'Inactive'}
      >
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );
}
