'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  PauseCircle,
  Thermometer,
  Server,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  KILL_LABEL,
  agentHeadline,
  formatBand,
  formatCelsius,
  formatSpan,
  roomTempHeadline,
  type StatusHeadline,
  type StatusTone,
} from '@/lib/pipeline-farm';
import { shortId } from '@/lib/pipeline-review';
import { Routes } from '@/lib/routes';
import { formatAgo } from '@/lib/signoff-format';
import type { FarmAgent, FarmSwitches, RoomTemperature } from '@/types/pipeline-farm';

/** A card's content, or why it could not be read. One card failing never takes the page down. */
export type Section<T> = { ok: true; value: T } | { ok: false; message: string };

const TONE_BADGE: Record<StatusTone, 'outline' | 'default' | 'destructive' | 'secondary'> = {
  ok: 'outline',
  hold: 'default',
  problem: 'destructive',
  off: 'secondary',
};

const TONE_ICON: Record<StatusTone, typeof CheckCircle2> = {
  ok: CheckCircle2,
  hold: PauseCircle,
  problem: AlertTriangle,
  off: MinusCircle,
};

function ToneBadge({ headline }: { headline: StatusHeadline }) {
  const Icon = TONE_ICON[headline.tone];
  return (
    <Badge variant={TONE_BADGE[headline.tone]} data-tone={headline.tone}>
      <Icon aria-hidden="true" />
      {headline.label}
    </Badge>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Unreadable({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" data-testid="status-unreadable">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * The room-temperature watch (PLAN 4.4). Shows the state, the last reading and how old it is, the
 * allowed band, the jobs it is holding back and the open supervisor task. A missing or old reading
 * reads as a hold, never as fine. Staff only.
 */
export function RoomTemperatureCard({ room, now }: { room: RoomTemperature; now: Date }) {
  const headline = roomTempHeadline(room);
  const band = formatBand(room);
  const hasReading = typeof room.celsius === 'number';
  return (
    <section
      aria-labelledby="room-temp-heading"
      className="space-y-3 rounded-xl border bg-card p-4"
      data-testid="room-temperature"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="room-temp-heading" className="flex items-center gap-2 text-base font-semibold">
          <Thermometer className="size-4 text-muted-foreground" aria-hidden="true" />
          Room temperature
        </h3>
        <ToneBadge headline={headline} />
      </div>
      <p className="text-sm">{room.summary}</p>

      {room.enabled && (
        <dl className="space-y-1 text-sm">
          <Row label="Last reading">
            {hasReading ? formatCelsius(room.celsius) : 'none'}
            {hasReading && typeof room.readingAgeS === 'number' && (
              <span className="text-muted-foreground"> · {formatSpan(room.readingAgeS)} old</span>
            )}
          </Row>
          {band && (
            <Row label="Allowed band">
              {band}
              {typeof room.hysteresisC === 'number' && (
                <span className="text-muted-foreground"> · {room.hysteresisC} °C margin</span>
              )}
            </Row>
          )}
          {room.source && <Row label="Source">{room.source}</Row>}
          {room.since && <Row label="Since">{formatAgo(room.since, now)}</Row>}
          {typeof room.checkAgeS === 'number' && (
            <Row label="Last checked">{formatSpan(room.checkAgeS)} ago</Row>
          )}
        </dl>
      )}

      {room.enabled && room.checkStalled && (
        <Alert variant="destructive" data-testid="room-temperature-stalled">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>The watch is not being checked</AlertTitle>
          <AlertDescription>
            The pipeline’s farm loop has not asked the watch for {formatSpan(room.checkAgeS)}. What
            is shown here may be out of date, and the farm may not be releasing prints.
          </AlertDescription>
        </Alert>
      )}

      {room.task && (
        <div
          className="space-y-1 rounded-lg border p-3 text-sm"
          data-testid="room-temperature-task"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{room.task.title}</span>
            <Badge variant={room.task.priority === 1 ? 'destructive' : 'secondary'}>
              {room.task.priority === 1 ? 'Urgent' : room.task.priority === 2 ? 'Soon' : 'Routine'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{room.task.detail}</p>
          {room.task.since && (
            <p className="text-xs text-muted-foreground">Open {formatAgo(room.task.since, now)}</p>
          )}
        </div>
      )}

      {room.holding && (
        <div className="space-y-1" data-testid="room-temperature-held">
          <p className="text-sm font-medium">
            {room.heldJobCount === 0
              ? 'No job is waiting for a printer right now.'
              : `${room.heldJobCount} ${room.heldJobCount === 1 ? 'job is' : 'jobs are'} waiting for a printer`}
          </p>
          {room.heldJobs.length > 0 && (
            <ul className="space-y-1 text-sm">
              {room.heldJobs.map((job) => (
                <li key={job.jobId}>
                  <Link
                    href={Routes.adminReviewJob(job.jobId)}
                    className="underline-offset-4 hover:underline"
                  >
                    {job.jobName ?? 'Untitled job'}
                  </Link>
                  <span className="text-muted-foreground">
                    {' '}
                    · {job.studentName ?? 'Unnamed student'} · job {shortId(job.jobId)}
                  </span>
                </li>
              ))}
              {room.heldJobCount > room.heldJobs.length && (
                <li className="text-muted-foreground">
                  and {room.heldJobCount - room.heldJobs.length} more
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function SwitchRow({
  label,
  on,
  note,
}: {
  label: string;
  on: boolean | null | undefined;
  note?: string;
}) {
  return (
    <Row label={label}>
      {on === null || on === undefined ? (
        <span className="text-muted-foreground">not reported yet</span>
      ) : (
        <Badge variant={on ? 'default' : 'secondary'}>{on ? 'On' : 'Off'}</Badge>
      )}
      {note && <span className="text-muted-foreground"> {note}</span>}
    </Row>
  );
}

function Switches({ switches }: { switches: FarmSwitches }) {
  return (
    <div className="space-y-1" data-testid="farm-switches">
      <p className="text-sm font-medium">Switches</p>
      <dl className="space-y-1 text-sm">
        <SwitchRow label="Pipeline acts on the live farm" on={switches.farmLiveEnabled} />
        <SwitchRow label="Agent’s own live switch" on={switches.agentLiveEnabled} />
        <Row label="Agent kill switch">
          {switches.kill ? (
            <span className={switches.kill === 'off' ? '' : 'font-medium text-destructive'}>
              {KILL_LABEL[switches.kill]}
            </span>
          ) : (
            <span className="text-muted-foreground">not reported yet</span>
          )}
        </Row>
        <SwitchRow label="Watch it print (live view)" on={switches.liveViewEnabled} />
        <SwitchRow label="Empty-bed check" on={switches.emptyBedEnabled} />
        <SwitchRow label="Room-temperature watch" on={switches.roomTempEnabled} />
      </dl>
    </div>
  );
}

/**
 * The farm agent on the server PC: last contact, last heartbeat, what it says about AutoFarm3D, and
 * the live switches. An agent silent for more than five minutes (or never seen) is shown as a
 * problem. Staff only.
 */
export function FarmAgentCard({ agent, now }: { agent: FarmAgent; now: Date }) {
  const headline = agentHeadline(agent);
  return (
    <section
      aria-labelledby="farm-agent-heading"
      className="space-y-3 rounded-xl border bg-card p-4"
      data-testid="farm-agent"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="farm-agent-heading" className="flex items-center gap-2 text-base font-semibold">
          <Server className="size-4 text-muted-foreground" aria-hidden="true" />
          Farm agent
          {agent.agentId && (
            <span className="text-sm font-normal text-muted-foreground">{agent.agentId}</span>
          )}
        </h3>
        <ToneBadge headline={headline} />
      </div>

      {agent.state === 'not_used' && (
        <p className="text-sm text-muted-foreground">
          This pipeline talks to the farm directly, so there is no agent to watch.
        </p>
      )}

      {agent.problems.length > 0 && (
        <Alert variant="destructive" data-testid="farm-agent-problems">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{agent.problems.length === 1 ? 'Needs a look' : 'Need a look'}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {agent.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {agent.configured && agent.state !== 'never_connected' && (
        <dl className="space-y-1 text-sm">
          <Row label="Last contact">
            {agent.lastContactAt ? formatAgo(agent.lastContactAt, now) : 'never'}
            {typeof agent.silentForS === 'number' && (
              <span className="text-muted-foreground">
                {' '}
                · quiet for {formatSpan(agent.silentForS)}
              </span>
            )}
          </Row>
          <Row label="Last heartbeat">
            {agent.lastHeartbeatAt ? formatAgo(agent.lastHeartbeatAt, now) : 'never'}
          </Row>
          {agent.version && <Row label="Version">{agent.version}</Row>}
          {typeof agent.busy === 'boolean' && (
            <Row label="Doing something">{agent.busy ? 'Yes' : 'No'}</Row>
          )}
          {typeof agent.uptimeS === 'number' && (
            <Row label="Running for">{formatSpan(agent.uptimeS)}</Row>
          )}
          {typeof agent.farmOk === 'boolean' && (
            <Row label="AutoFarm3D, as the agent sees it">
              {agent.farmOk ? 'Reachable' : 'Not reachable'}
            </Row>
          )}
          {typeof agent.relayFailures === 'number' && agent.relayFailures > 0 && (
            <Row label="Failed requests before the last heartbeat">{agent.relayFailures}</Row>
          )}
          <Row label="Commands waiting for it">
            {agent.openCommands}
            {agent.openCommands > 0 && typeof agent.oldestOpenCommandAgeS === 'number' && (
              <span className="text-muted-foreground">
                {' '}
                · oldest {formatSpan(agent.oldestOpenCommandAgeS)}
              </span>
            )}
          </Row>
        </dl>
      )}

      {agent.farmProblems.length > 0 && (
        <p className="text-sm text-muted-foreground">
          The agent says: {agent.farmProblems.join('; ')}
        </p>
      )}

      <Switches switches={agent.switches} />
    </section>
  );
}

/** The two cards side by side, each with its own loading failure. */
export function FarmStatusCards({
  room,
  agent,
  now,
}: {
  room: Section<RoomTemperature>;
  agent: Section<FarmAgent>;
  now: Date;
}) {
  return (
    <section aria-labelledby="farm-status-heading" className="space-y-3">
      <h2 id="farm-status-heading" className="text-lg font-semibold">
        Farm status
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {room.ok ? (
          <RoomTemperatureCard room={room.value} now={now} />
        ) : (
          <Unreadable title="Room temperature could not be read" message={room.message} />
        )}
        {agent.ok ? (
          <FarmAgentCard agent={agent.value} now={now} />
        ) : (
          <Unreadable title="Farm agent status could not be read" message={agent.message} />
        )}
      </div>
    </section>
  );
}
