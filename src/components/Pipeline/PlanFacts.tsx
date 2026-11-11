import { Clock, Scale } from 'lucide-react';
import { formatGrams, formatPrintTime } from '@/lib/pipeline-state';
import type { Plan } from '@/types/pipeline';

/** Print time and plastic, the two numbers students ask about first. */
export function PlanFacts({ plan }: { plan: Plan }) {
  if (plan.printTimeS == null && plan.filamentG == null) return null;
  return (
    <dl className="grid grid-cols-2 gap-3">
      {plan.printTimeS != null && (
        <div className="rounded-lg border bg-card p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            Print time
          </dt>
          <dd className="mt-1 text-lg font-semibold">{formatPrintTime(plan.printTimeS)}</dd>
        </div>
      )}
      {plan.filamentG != null && (
        <div className="rounded-lg border bg-card p-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="size-3.5" aria-hidden="true" />
            Plastic
          </dt>
          <dd className="mt-1 text-lg font-semibold">{formatGrams(plan.filamentG)}</dd>
        </div>
      )}
    </dl>
  );
}
