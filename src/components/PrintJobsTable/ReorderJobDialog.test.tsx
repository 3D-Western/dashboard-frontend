import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { ApiError } from '@/api/client/errors';
import { jobApi } from '@/api/client/job';
import { ReorderJobDialog } from './ReorderJobDialog';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/api/client/job', () => ({ jobApi: { reorder: vi.fn() } }));

const reorder = vi.mocked(jobApi.reorder);

beforeEach(() => {
  reorder.mockReset();
  vi.mocked(toast.error).mockClear();
});

describe('ReorderJobDialog', () => {
  it('points at the print to rate first when the backend answers RATING_REQUIRED', async () => {
    reorder.mockRejectedValue(
      new ApiError(
        'RATING_REQUIRED',
        'Please rate your previous print "Hinge Pair" first.',
        undefined,
        undefined,
        {
          unratedPrints: [{ jobId: 'job-5', name: 'Hinge Pair' }],
        },
      ),
    );
    const onOpenChange = vi.fn();
    render(
      <ReorderJobDialog
        printJob={{ id: 'job-1', name: 'Gear', description: 'd' }}
        open
        onOpenChange={onOpenChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create job' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [title, options] = vi.mocked(toast.error).mock.calls[0] as [
      string,
      { description: string; action: { label: string } },
    ];
    expect(title).toBe('Rate your last print first');
    expect(options.description).toMatch(/Hinge Pair/);
    expect(options.action.label).toBe('Rate it');
  });
});
