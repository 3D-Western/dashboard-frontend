import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../mocks';
import { endpoints } from './endpoints';
import { pipelineFarmApi } from './pipeline-farm';

describe('pipelineFarmApi', () => {
  it('reads the held jobs out of the ApiResponse wrapper', async () => {
    const held = [
      { jobId: 'job-1', attemptNo: 2, needsPerson: 'No known-good printer', since: 'x' },
    ];
    mockServer.use(
      http.get(endpoints.pipelineFarm.heldJobs, () =>
        HttpResponse.json({ success: true, data: held }),
      ),
    );

    await expect(pipelineFarmApi.heldJobs()).resolves.toEqual(held);
  });

  it('reads the quarantined printers', async () => {
    const printers = [{ printerId: 'P12', consecutiveFailures: 3 }];
    mockServer.use(
      http.get(endpoints.pipelineFarm.quarantinedPrinters, () =>
        HttpResponse.json({ success: true, data: printers }),
      ),
    );

    await expect(pipelineFarmApi.quarantinedPrinters()).resolves.toEqual(printers);
  });

  it('uses the backend paths under /api/v1/admin/pipeline/farm', () => {
    expect(endpoints.pipelineFarm.heldJobs).toBe('/api/v1/admin/pipeline/farm/held-jobs');
    expect(endpoints.pipelineFarm.resolveHeld('j1')).toBe(
      '/api/v1/admin/pipeline/farm/held-jobs/j1/resolve',
    );
    expect(endpoints.pipelineFarm.quarantinedPrinters).toBe(
      '/api/v1/admin/pipeline/farm/quarantined-printers',
    );
    expect(endpoints.pipelineFarm.waiveRating('j1')).toBe(
      '/api/v1/admin/pipeline/farm/jobs/j1/waive-rating',
    );
    expect(endpoints.pipelineFarm.clearQuarantine('P 12')).toBe(
      '/api/v1/admin/pipeline/farm/printers/P%2012/clear-quarantine',
    );
  });

  it("waives a print's rating with the reason, and returns the result", async () => {
    const received = vi.fn();
    mockServer.use(
      http.post(endpoints.pipelineFarm.waiveRating('job-7'), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ success: true, data: { ok: true, message: 'Waived' } });
      }),
    );

    const result = await pipelineFarmApi.waiveRating('job-7', { reason: 'print was lost' });

    expect(received).toHaveBeenCalledWith({ reason: 'print was lost' });
    expect(result).toEqual({ ok: true, message: 'Waived' });
  });

  it('resolves a held job with retry and the reason, and returns the result', async () => {
    const received = vi.fn();
    mockServer.use(
      http.post(endpoints.pipelineFarm.resolveHeld('job-1'), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ success: true, data: { ok: true, message: 'Closed' } });
      }),
    );

    const result = await pipelineFarmApi.resolveHeld('job-1', {
      retry: false,
      reason: 'lost in the farm',
    });

    expect(received).toHaveBeenCalledWith({ retry: false, reason: 'lost in the farm' });
    expect(result).toEqual({ ok: true, message: 'Closed' });
  });

  it('clears a quarantine at the printer route with the required cause', async () => {
    const received = vi.fn();
    mockServer.use(
      http.post(endpoints.pipelineFarm.clearQuarantine('P 12'), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ success: true, data: { ok: true, message: 'Live' } });
      }),
    );

    await pipelineFarmApi.clearQuarantine('P 12', { cause: 'new hotend fitted', notes: 'by Sam' });

    expect(received).toHaveBeenCalledWith({ cause: 'new hotend fitted', notes: 'by Sam' });
  });

  it('turns a refusal into an error carrying the backend’s message', async () => {
    mockServer.use(
      http.post(endpoints.pipelineFarm.clearQuarantine('P12'), () =>
        HttpResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Not quarantined' } },
          { status: 409 },
        ),
      ),
    );

    await expect(pipelineFarmApi.clearQuarantine('P12', { cause: 'fixed' })).rejects.toThrow(
      'Not quarantined',
    );
  });
});
