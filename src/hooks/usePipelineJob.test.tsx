import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { pipelineApi } from '@/api/client/pipeline';
import { usePipelineJob } from './usePipelineJob';
import {
  createMockEvent,
  createMockPlan,
  createMockSnapshot,
  createMockStep,
} from '@test/utils/pipelineFactories';
import type { PipelineStreamEvent } from '@/types/pipeline';

vi.mock('@/api/client/pipeline', () => ({
  pipelineApi: { getState: vi.fn(), stream: vi.fn() },
}));

const getState = vi.mocked(pipelineApi.getState);
const stream = vi.mocked(pipelineApi.stream);

/** A stream that stays open until the hook leaves, handing the test its `emit`. */
function openStream() {
  const handle: { emit: (event: PipelineStreamEvent) => void } = { emit: () => {} };
  stream.mockImplementationOnce(
    (_jobId, { onOpen, onEvent, signal }) =>
      new Promise<void>((resolve) => {
        handle.emit = onEvent;
        onOpen?.();
        signal?.addEventListener('abort', () => resolve());
      }),
  );
  return handle;
}

beforeEach(() => {
  getState.mockReset();
  stream.mockReset();
});

describe('usePipelineJob', () => {
  it('shows the snapshot at once, then streams each step in as it finishes', async () => {
    getState.mockResolvedValue(createMockSnapshot({ steps: [createMockStep({ step: 'a' })] }));
    const live = openStream();

    const { result } = renderHook(() => usePipelineJob('job-1'));

    await waitFor(() => expect(result.current.connection).toBe('live'));
    expect(result.current.steps.map((s) => s.step)).toEqual(['a']);

    act(() =>
      live.emit(createMockEvent({ seq: 1, step: createMockStep({ step: 'b', state: 'started' }) })),
    );
    act(() =>
      live.emit(createMockEvent({ seq: 2, step: createMockStep({ step: 'b', state: 'done' }) })),
    );

    expect(result.current.steps.map((s) => [s.step, s.state])).toEqual([
      ['a', 'done'],
      ['b', 'done'],
    ]);
  });

  it('moves to review when the plan event arrives', async () => {
    getState.mockResolvedValue(createMockSnapshot());
    const live = openStream();
    const { result } = renderHook(() => usePipelineJob('job-1'));
    await waitFor(() => expect(result.current.connection).toBe('live'));
    const plan = createMockPlan();

    act(() =>
      live.emit(
        createMockEvent({ seq: 1, type: 'plan', studentStatus: 'needs_confirmation', plan }),
      ),
    );

    expect(result.current.studentStatus).toBe('needs_confirmation');
    expect(result.current.plan).toEqual(plan);
  });

  it('reconnects with the last seq after the stream drops, re-reading the snapshot', async () => {
    getState.mockResolvedValue(createMockSnapshot());
    stream.mockImplementationOnce(async (_jobId, { onOpen, onEvent }) => {
      onOpen?.();
      onEvent(createMockEvent({ seq: 3, step: createMockStep({ step: 'a' }) }));
      throw new Error('dropped');
    });
    openStream();

    const { result } = renderHook(() => usePipelineJob('job-1', { retryBaseMs: 1, maxRetryMs: 5 }));

    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
    expect(stream.mock.calls[1][1].lastSeq).toBe(3);
    expect(getState.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(result.current.connection).toBe('live'));
  });

  it('keeps retrying when the first load fails, then recovers', async () => {
    getState.mockRejectedValueOnce(new Error('offline'));
    getState.mockResolvedValue(createMockSnapshot({ studentStatus: 'queued' }));
    stream.mockRejectedValueOnce(new Error('offline'));
    openStream();

    const { result } = renderHook(() => usePipelineJob('job-1', { retryBaseMs: 1, maxRetryMs: 5 }));

    await waitFor(() => expect(result.current.studentStatus).toBe('queued'));
    expect(result.current.error).toBeNull();
  });

  it('re-reads the job when it is collected so the rating card shows without a reload', async () => {
    getState
      .mockResolvedValueOnce(
        createMockSnapshot({ studentStatus: 'ready_for_pickup', ratingPending: false }),
      )
      .mockResolvedValue(createMockSnapshot({ studentStatus: 'collected', ratingPending: true }));
    const live = openStream();
    const { result } = renderHook(() => usePipelineJob('job-1'));
    await waitFor(() => expect(result.current.connection).toBe('live'));
    expect(result.current.ratingPending).toBe(false);

    act(() => live.emit(createMockEvent({ seq: 5, studentStatus: 'collected' })));

    await waitFor(() => expect(result.current.ratingPending).toBe(true));
    expect(result.current.studentStatus).toBe('collected');
    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('re-reads the job when it becomes ready for pickup, and keeps streaming', async () => {
    getState
      .mockResolvedValueOnce(createMockSnapshot({ studentStatus: 'printing', ratingPending: null }))
      .mockResolvedValue(createMockSnapshot({ studentStatus: 'ready_for_pickup', ratingPending: false }));
    const live = openStream();
    openStream();
    const { result } = renderHook(() => usePipelineJob('job-1'));
    await waitFor(() => expect(result.current.connection).toBe('live'));

    act(() => live.emit(createMockEvent({ seq: 7, studentStatus: 'ready_for_pickup' })));

    await waitFor(() => expect(getState).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(2));
    expect(stream.mock.calls[1][1].lastSeq).toBe(7);
    await waitFor(() => expect(result.current.connection).toBe('live'));
    expect(result.current.studentStatus).toBe('ready_for_pickup');
  });

  it('does not open a stream for a job that is finished', async () => {
    getState.mockResolvedValue(createMockSnapshot({ studentStatus: 'collected' }));

    const { result } = renderHook(() => usePipelineJob('job-1'));

    await waitFor(() => expect(result.current.connection).toBe('closed'));
    expect(stream).not.toHaveBeenCalled();
  });
});
