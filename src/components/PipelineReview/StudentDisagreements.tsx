import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatAgo, formatDateTime } from '@/lib/signoff-format';
import type { StaffDisagreeTurn, StudentDisagreement } from '@/types/pipeline-review';

/** `card:<finding code>` reads as the code; other entries (summary, numbers) as they are. */
export const citedLabel = (entry: string) => (entry.startsWith('card:') ? entry.slice(5) : entry);

function Turn({ turn }: { turn: StaffDisagreeTurn }) {
  return (
    <li className="space-y-1 rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">
        {turn.turn != null ? `Turn ${turn.turn}` : 'Turn'}
        {turn.askedAt ? ` · ${formatDateTime(turn.askedAt)}` : ''}
      </p>
      <p className="break-words whitespace-pre-wrap">
        <span className="font-medium">Student: </span>
        {turn.question}
      </p>
      <p className="break-words whitespace-pre-wrap">
        <span className="font-medium">Assistant{turn.status ? ` (${turn.status})` : ''}: </span>
        {turn.answer || <span className="text-muted-foreground">no answer</span>}
      </p>
      {(turn.cited?.length ?? 0) > 0 && (
        <ul aria-label="Cited" className="flex flex-wrap gap-1.5">
          {turn.cited?.map((entry) => (
            <li key={entry}>
              <Badge variant="outline" className="font-mono">
                {citedLabel(entry)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {(turn.injectionRules?.length ?? 0) > 0 && (
        <p className="text-xs text-destructive">
          Matched injection rules: {turn.injectionRules?.join(', ')}
        </p>
      )}
    </li>
  );
}

/**
 * The students' "Ask the crew" after the Ask why assistant (P-54): when, the reason they wrote, the
 * finding codes involved and the whole conversation. Staff only; students never receive this.
 */
export function StudentDisagreementList({
  disagreements,
  now = new Date(),
}: {
  disagreements: StudentDisagreement[];
  now?: Date;
}) {
  return (
    <ul className="space-y-3">
      {disagreements.map((d) => (
        <li
          key={`${d.eventSeq}-${d.escalationId ?? ''}`}
          className="space-y-3 rounded-lg border bg-card p-4 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Asked the crew</span>
            <span className="text-muted-foreground">
              {formatDateTime(d.occurredAt)} ({formatAgo(d.occurredAt, now)})
            </span>
            <span className="font-mono text-xs text-muted-foreground">event #{d.eventSeq}</span>
          </div>
          {d.suspectedInjection && (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertDescription>
                A question looked like an attempt to manipulate the assistant. Read the conversation
                with that in mind.
              </AlertDescription>
            </Alert>
          )}
          <p className="break-words whitespace-pre-wrap">
            <span className="font-medium">Their reason: </span>
            {d.studentReason || (
              <span className="text-muted-foreground">none (they just clicked)</span>
            )}
          </p>
          {(d.citedFindingCodes?.length ?? 0) > 0 && (
            <p className="font-mono text-xs">Findings: {d.citedFindingCodes?.join(', ')}</p>
          )}
          {(d.conversation?.length ?? 0) > 0 ? (
            <ol aria-label="Conversation" className="space-y-2">
              {d.conversation?.map((turn, index) => (
                <Turn key={`${turn.turn ?? 'x'}-${index}`} turn={turn} />
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">
              No conversation: they went straight to the crew.
            </p>
          )}
          {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
        </li>
      ))}
    </ul>
  );
}
