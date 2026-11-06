'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TEMP_NOTE_MAX,
  buildReadingRequest,
  formatCelsius,
  readingState,
  validateReading,
} from '@/lib/pipeline-farm';
import { formatAgo } from '@/lib/signoff-format';
import type { ManualTempReading } from '@/types/pipeline-farm';
import { reviewErrorMessage } from './ReviewBits';

/**
 * Staff thermometer readings for the room-temperature card (P-175): type what a thermometer in the
 * room shows, and see the recent entries with who entered each. A reading counts for as long as the
 * pipeline counts a reading; the idle printers can still outvote it, and a wrong entry is withdrawn
 * (it stays on the list, marked). `refreshKey` reloads the list when the desk reloads.
 */
export function RoomTempReadings({
  now,
  refreshKey,
  onChanged,
}: {
  now: Date;
  refreshKey?: number | string;
  onChanged?: () => void;
}) {
  const [readings, setReadings] = useState<ManualTempReading[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const ids = useId();

  const load = useCallback(async () => {
    try {
      setReadings(await pipelineFarmApi.roomTemperatureReadings());
      setLoadError(null);
    } catch (err) {
      setLoadError(reviewErrorMessage(err, "We couldn't read the recent thermometer readings."));
    }
  }, []);

  useEffect(() => {
    const first = async () => {
      await load();
    };
    void first();
  }, [load, refreshKey]);

  async function save() {
    const invalid = validateReading(text, note);
    setProblem(invalid);
    if (invalid) return;
    setSaving(true);
    setFailure(null);
    setDone(null);
    try {
      const saved = await pipelineFarmApi.enterRoomTemperature(buildReadingRequest(text, note));
      setDone(
        `Saved ${formatCelsius(saved.celsius)}. The watch uses it at its next check, together with the idle printers.`,
      );
      setText('');
      setNote('');
      await load();
      onChanged?.();
    } catch (err) {
      setFailure(reviewErrorMessage(err, 'That was not saved. Check the pipeline and try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function withdraw(reading: ManualTempReading) {
    setWithdrawing(reading.id);
    setFailure(null);
    setDone(null);
    try {
      await pipelineFarmApi.withdrawRoomTemperature(reading.id);
      setDone(`The ${formatCelsius(reading.celsius)} reading was withdrawn.`);
      await load();
      onChanged?.();
    } catch (err) {
      setFailure(
        reviewErrorMessage(err, 'That was not withdrawn. Check the pipeline and try again.'),
      );
    } finally {
      setWithdrawing(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3" data-testid="room-temperature-readings">
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className="text-sm font-medium">Enter a thermometer reading</p>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor={`${ids}-celsius`}>Thermometer shows (°C)</Label>
            <Input
              id={`${ids}-celsius`}
              inputMode="decimal"
              autoComplete="off"
              value={text}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? `${ids}-problem` : undefined}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${ids}-note`}>Where you read it (optional)</Label>
            <Input
              id={`${ids}-note`}
              value={note}
              maxLength={TEMP_NOTE_MAX}
              autoComplete="off"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        {problem && (
          <p id={`${ids}-problem`} role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}
        <Button type="submit" className="h-11 fine:h-9" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Save reading
        </Button>
      </form>

      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {done && (
        <Alert role="status">
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Recent readings</p>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        ) : readings === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No thermometer reading has been entered.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {readings.map((reading) => {
              const state = readingState(reading);
              return (
                <li
                  key={reading.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2"
                  data-testid="room-temperature-reading"
                  data-state={state}
                >
                  <div className="space-y-0.5">
                    <p
                      className={state === 'withdrawn' ? 'text-muted-foreground line-through' : ''}
                    >
                      <span className="font-medium">{formatCelsius(reading.celsius)}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        · read {formatAgo(reading.takenAt, now)} · entered by {reading.enteredBy}
                      </span>
                    </p>
                    {reading.note && <p className="text-muted-foreground">{reading.note}</p>}
                    {reading.withdrawnAt && (
                      <p className="text-muted-foreground">
                        Withdrawn {formatAgo(reading.withdrawnAt, now)}
                        {reading.withdrawnBy ? ` by ${reading.withdrawnBy}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {state === 'in use' && <Badge variant="default">In use</Badge>}
                    {state === 'withdrawn' && <Badge variant="secondary">Withdrawn</Badge>}
                    {state !== 'withdrawn' && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 fine:h-9"
                        disabled={withdrawing !== null}
                        aria-label={`Withdraw the ${formatCelsius(reading.celsius)} reading`}
                        onClick={() => void withdraw(reading)}
                      >
                        {withdrawing === reading.id && (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        )}
                        Withdraw
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
