import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '../mocks';
import { endpoints } from './endpoints';
import { pipelineFarmApi } from './pipeline-farm';

describe('pipelineFarmApi', () => {
  it('reads the overview out of the ApiResponse wrapper', async () => {
    const overview = { heldJobs: [], quarantinedPrinters: [{ printerId: 'P12' }] };
    mockServer.use(
      http.get(endpoints.pipelineFarm.overview, () =>
        HttpResponse.json({ success: true, data: overview }),
      ),
    );

    await expect(pipelineFarmApi.overview()).resolves.toEqual(overview);
  });

  it('resolves a held job with retry and the reason', async () => {
    const received = vi.fn();
    mockServer.use(
      http.post(endpoints.pipelineFarm.resolveHeld('job-1'), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ success: true, data: null }, { status: 202 });
      }),
    );

    await pipelineFarmApi.resolveHeld('job-1', { retry: false, reason: 'lost in the farm' });

    expect(received).toHaveBeenCalledWith({ retry: false, reason: 'lost in the farm' });
  });

  it('clears a quarantine at the printer’s route with the reason', async () => {
    const received = vi.fn();
    mockServer.use(
      http.post(endpoints.pipelineFarm.clearQuarantine('P 12'), async ({ request }) => {
        received(await request.json());
        return HttpResponse.json({ success: true, data: null }, { status: 202 });
      }),
    );

    await pipelineFarmApi.clearQuarantine('P 12', { reason: 'new hotend fitted' });

    expect(received).toHaveBeenCalledWith({ reason: 'new hotend fitted' });
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

    await expect(pipelineFarmApi.clearQuarantine('P12', { reason: 'fixed' })).rejects.toThrow(
      'Not quarantined',
    );
  });
});
