'use client';

import { useEffect, useRef } from 'react';
import { Crosshair } from 'lucide-react';
import { useCardFocus } from '@/components/Pipeline/PartFocus';
import { Badge } from '@/components/ui/badge';
import { formatEvidence, formatRegion } from '@/lib/pipeline-review';
import { cn } from '@/lib/utils';
import type { Finding } from '@/types/pipeline-review';

/** The pipeline's own extra evidence keys, without the empty ones. */
function dataEntries(finding: Finding): [string, unknown][] {
  return Object.entries(finding.data ?? {}).filter(([, value]) => value !== undefined);
}

/** One finding with its evidence: measured value against threshold, likelihoods, region, data. */
export function FindingCard({ finding }: { finding: Finding }) {
  const { linked, active, select, focusState } = useCardFocus(finding.code);
  const ref = useRef<HTMLElement>(null);
  const requestedBy = focusState?.code === finding.code ? focusState.source : null;
  const nonce = focusState?.nonce;
  const region = formatRegion(finding.region);
  const data = dataEntries(finding);
  const hasMeasure = finding.value != null || finding.threshold != null;

  useEffect(() => {
    if (requestedBy === 'viewer') ref.current?.scrollIntoView?.({ block: 'center' });
  }, [requestedBy, nonce]);

  return (
    <article
      ref={ref}
      data-code={finding.code}
      data-severity={finding.severity}
      className={cn(
        'space-y-2 rounded-lg border bg-card p-4',
        active && 'ring-2 ring-ring',
        linked && 'cursor-pointer',
      )}
      onClick={linked ? select : undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={finding.severity === 'info' ? 'outline' : 'secondary'}>
          {finding.severity.replaceAll('_', ' ')}
        </Badge>
        <span className="font-mono text-sm">{finding.code}</span>
        <span className="text-xs text-muted-foreground">
          {finding.component}
          {finding.componentVersion ? ` ${finding.componentVersion}` : ''}
        </span>
      </div>
      <p className="text-sm">{finding.message}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {hasMeasure && (
          <>
            <dt className="text-muted-foreground">Measured</dt>
            <dd data-testid="evidence-value">{formatEvidence(finding.value, finding.unit)}</dd>
            <dt className="text-muted-foreground">Threshold</dt>
            <dd data-testid="evidence-threshold">
              {formatEvidence(finding.threshold, finding.unit)}
            </dd>
          </>
        )}
        {finding.likelihoodDefect != null && (
          <>
            <dt className="text-muted-foreground">Chance of a defect</dt>
            <dd>{Math.round(finding.likelihoodDefect * 100)}%</dd>
          </>
        )}
        {finding.likelihoodFailure != null && (
          <>
            <dt className="text-muted-foreground">Chance of failure</dt>
            <dd>{Math.round(finding.likelihoodFailure * 100)}%</dd>
          </>
        )}
        {region && (
          <>
            <dt className="text-muted-foreground">Region</dt>
            <dd>{region}</dd>
          </>
        )}
        {finding.action && (
          <>
            <dt className="text-muted-foreground">Pipeline action</dt>
            <dd>{finding.action}</dd>
          </>
        )}
        {data.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
            <dd className="break-words">{formatEvidence(value)}</dd>
          </div>
        ))}
      </dl>

      {linked && (
        <button
          type="button"
          aria-pressed={active}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline fine:min-h-0"
        >
          <Crosshair className="size-4" aria-hidden="true" />
          Show on the part
        </button>
      )}
    </article>
  );
}

export function FindingList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-sm text-muted-foreground">No findings on this job.</p>;
  }
  return (
    <div className="space-y-3">
      {findings.map((finding, index) => (
        <FindingCard key={`${finding.code}-${index}`} finding={finding} />
      ))}
    </div>
  );
}
