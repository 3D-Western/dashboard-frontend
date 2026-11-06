'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PartFocusProvider } from '@/components/Pipeline/PartFocus';
import { PartViewerSlot } from '@/components/Pipeline/PartViewerSlot';
import { highlightsUrlOf, modelUrlOf, previewUrlOf } from '@/components/Pipeline/ReviewPlan';
import { Badge } from '@/components/ui/badge';
import {
  findingsAsCards,
  formatPrintTime,
  screeningRendersOf,
  staffStatusLabel,
} from '@/lib/pipeline-review';
import { formatAgo, formatDateTime } from '@/lib/signoff-format';
import type { StaffJobView } from '@/types/pipeline-review';
import { FindingList } from './FindingList';
import { ProblemReportList } from './ProblemReports';

const Section = ({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) => (
  <section aria-labelledby={id} className="space-y-3">
    <h2 id={id} className="text-lg font-semibold">
      {title}
    </h2>
    {children}
  </section>
);

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, value]) => value != null && value !== '');
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Everything staff need to decide, laid out in reading order: what the checks found (with the
 * renders and the part), the plan, what the student said, and what already happened.
 */
export function JobDetails({
  job,
  now = new Date(),
  onReportResolved,
}: {
  job: StaffJobView;
  now?: Date;
  onReportResolved?: () => void;
}) {
  const renders = screeningRendersOf(job.screeningRenders);
  const cards = findingsAsCards(job.findings);
  const previewUrl = previewUrlOf(job.plan);
  const modelUrl = modelUrlOf(job.plan);
  const highlightsUrl = highlightsUrlOf(job.plan);
  const showPart = Boolean(previewUrl || modelUrl);
  const inputs = job.inputs;
  const details = Object.entries(inputs?.purposeDetails ?? {});
  const settings = Object.entries(inputs?.settings ?? {}).filter(([, v]) => v != null);

  return (
    <div className="space-y-8">
      <PartFocusProvider>
        <Section title="Findings" id="findings-title">
          <p className="text-sm text-muted-foreground">
            {job.findings.length === 0
              ? 'No findings.'
              : `${job.findings.length} from the latest check${job.findingsSeq != null ? ` (event ${job.findingsSeq})` : ''}.`}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <FindingList findings={job.findings} />
            {showPart && (
              <PartViewerSlot
                previewUrl={previewUrl}
                modelUrl={modelUrl}
                highlightsUrl={highlightsUrl}
                highlights={cards}
                audience="staff"
              />
            )}
          </div>
        </Section>
      </PartFocusProvider>

      {renders.length > 0 && (
        <Section title="Screening renders" id="renders-title">
          <p className="text-sm text-muted-foreground">
            The grey views of the part the screening checks looked at. Staff only.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {renders.map((render) => (
              <li key={render.name} className="space-y-1">
                <a
                  href={render.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open the ${render.name} render full size`}
                  className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Image
                    src={render.url}
                    alt={`Screening render: ${render.name}`}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square w-full rounded-lg border bg-muted/30 object-contain"
                  />
                </a>
                <p className="text-xs text-muted-foreground">{render.name}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {job.plan && (
        <Section title="Plan" id="plan-title">
          <Facts
            rows={[
              ['Answer', job.plan.answer.replaceAll('_', ' ')],
              ['Summary', job.plan.summary],
              ['Print time', formatPrintTime(job.plan.printTimeS)],
              ['Filament', job.plan.filamentG != null ? `${job.plan.filamentG} g` : null],
              [
                'Plan id',
                <span key="p" className="font-mono">
                  {job.plan.planId}
                </span>,
              ],
            ]}
          />
          {Object.keys(job.plan.settingsChosen ?? {}).length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Settings chosen</h3>
              <Facts
                rows={Object.entries(job.plan.settingsChosen ?? {})
                  .filter(([, v]) => v != null)
                  .map(([key, value]): [string, React.ReactNode] => [
                    key,
                    <>
                      {String(value)}
                      {job.plan?.settingsReasons?.[key] && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {job.plan.settingsReasons[key]}
                        </span>
                      )}
                    </>,
                  ])}
              />
            </div>
          )}
          {job.plan.lessonCards.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">What the student is told</h3>
              <ul className="space-y-1 text-sm">
                {job.plan.lessonCards.map((card) => (
                  <li key={card.code}>
                    <span className="font-mono">{card.code}</span>{' '}
                    <span className="text-muted-foreground">{card.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {job.plan.choices.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Choices offered</h3>
              <ul className="space-y-1 text-sm">
                {job.plan.choices.map((choice) => (
                  <li key={choice.choiceId}>
                    {choice.question}{' '}
                    <span className="text-muted-foreground">
                      ({choice.options.map((o) => o.label).join(' / ')})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      <Section title="What the student told us" id="inputs-title">
        {!inputs && !job.description ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <Facts
            rows={[
              ['Purpose', inputs?.purpose],
              ...details.map(([k, v]): [string, React.ReactNode] => [k.replaceAll('_', ' '), v]),
              ['Their words', inputs?.description],
              ['Upload description', job.description],
              ...settings.map(([k, v]): [string, React.ReactNode] => [`Setting: ${k}`, String(v)]),
              ['Saved', job.inputsUpdatedAt ? formatAgo(job.inputsUpdatedAt, now) : null],
            ]}
          />
        )}
      </Section>

      {job.pickup && (
        <Section title="Pickup" id="pickup-title">
          <Facts
            rows={[
              ['Slot', job.pickup.slot],
              ['Tag', job.pickup.tag],
              ['Window ends', formatDateTime(job.pickup.windowEndsAt)],
            ]}
          />
        </Section>
      )}

      <Section title="Past decisions" id="decisions-title">
        {job.decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions yet.</p>
        ) : (
          <ul className="space-y-2">
            {job.decisions.map((d) => (
              <li key={d.actionId} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.decision.replaceAll('_', ' ')}</span>
                  <Badge
                    variant={
                      d.delivery === 'FAILED' || d.delivery === 'REFUSED'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {d.delivery}
                  </Badge>
                  <span className="text-muted-foreground">
                    {d.decidedBy == null ? 'former staff member' : `staff ${d.decidedBy}`} ·{' '}
                    {formatAgo(d.createdAt, now)}
                    {d.staffStatusBefore
                      ? ` · from ${d.staffStatusBefore.replaceAll('_', ' ')}`
                      : ''}
                  </span>
                </div>
                {d.codes.length > 0 && (
                  <p className="font-mono text-xs text-muted-foreground">{d.codes.join(', ')}</p>
                )}
                <p>{d.reason}</p>
                {d.deliveryError && (
                  <p className="text-destructive">Not delivered: {d.deliveryError}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Problem reports" id="reports-title">
        <ProblemReportList
          reports={job.reports}
          showJobLink={false}
          now={now}
          onResolved={() => onReportResolved?.()}
        />
      </Section>

      <Section title="Event history" id="events-title">
        <ol className="space-y-2">
          {[...job.events]
            .sort((a, b) => b.seq - a.seq)
            .map((event) => (
              <li key={event.seq} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{event.seq}</span>
                  <span className="font-medium">{event.type}</span>
                  <span>{staffStatusLabel(event.staffStatus)}</span>
                  <span className="text-muted-foreground">
                    · {formatDateTime(event.occurredAt)}
                  </span>
                  {!event.studentVisible && <Badge variant="outline">staff only</Badge>}
                </div>
                {(event.stepTitle || event.message) && (
                  <p className="text-muted-foreground">{event.message ?? event.stepTitle}</p>
                )}
                {event.findingCodes.length > 0 && (
                  <p className="font-mono text-xs">{event.findingCodes.join(', ')}</p>
                )}
              </li>
            ))}
        </ol>
      </Section>

      <p className="text-xs text-muted-foreground">
        <Link href="/admin/review" className="underline-offset-4 hover:underline">
          Back to the queue
        </Link>
      </p>
    </div>
  );
}
