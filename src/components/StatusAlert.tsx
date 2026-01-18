import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AlertVariant = 'default' | 'destructive' | 'warning' | 'success';

interface StatusAlertProps {
  variant?: AlertVariant;
  title: string;
  description: string;
  /**
   * Icon configuration:
   * - true: Show default icon based on variant
   * - false: Hide icon
   * - ReactNode: Show custom icon
   */
  icon?: boolean | React.ReactNode;
  /**
   * Optional action element (e.g., Button)
   */
  action?: React.ReactNode;
  /**
   * Show dismiss button
   */
  dismissible?: boolean;
  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;
  /**
   * Additional className
   */
  className?: string;
}

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
};

const variantStyles: Record<AlertVariant, string> = {
  default: '',
  destructive: '',
  warning: '',
  success:
    'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200 [&>svg]:text-green-600 dark:[&>svg]:text-green-500 *:data-[slot=alert-description]:text-green-800 dark:*:data-[slot=alert-description]:text-green-300',
};

export function StatusAlert({
  variant = 'default',
  title,
  description,
  icon = true,
  action,
  dismissible = false,
  onDismiss,
  className,
}: StatusAlertProps) {
  // Determine which icon to show
  const iconElement = React.useMemo(() => {
    if (icon === false) return null;
    if (icon === true) return defaultIcons[variant];
    return icon;
  }, [icon, variant]);

  // Map variant to Alert's supported variants
  const alertVariant = variant === 'success' ? 'default' : variant;

  return (
    <Alert variant={alertVariant} className={cn(variantStyles[variant], className)}>
      {iconElement}
      <AlertTitle className={cn(dismissible && 'pr-6')}>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {action}
      </AlertDescription>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
}
