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

  it('reads the room temperature and the farm agent out of the ApiResponse wrapper', async () => {
    const room = { enabled: true, loopRunning: true, code: 'missing', holding: true, summary: 'x' };
    const agent = { configured: true, state: 'silent', problem: true, problems: ['quiet'] };
    mockServer.use(
      http.get(endpoints.pipelineFarm.roomTemperature, () =>
        HttpResponse.json({ success: true, data: room }),
      ),
      http.get(endpoints.pipelineFarm.agent, () =>
        HttpResponse.json({ success: true, data: agent }),
      ),
    );

    await expect(pipelineFarmApi.roomTemperature()).resolves.toEqual(room);
    await expect(pipelineFarmApi.farmAgent()).resolves.toEqual(agent);
  });

  it('throws the backend’s words when the pipeline does not offer the status routes', async () => {
    mockServer.use(
      http.get(endpoints.pipelineFarm.roomTemperature, () =>
        HttpResponse.json(
          { success: false, error: { code: 'PIPELINE_UNAVAILABLE', message: 'Not offered yet' } },
          { status: 503 },
        ),
      ),
    );

    await expect(pipelineFarmApi.roomTemperature()).rejects.toThrow('Not offered yet');
  });

  it('uses the backend paths under /api/v1/admin/pipeline/farm', () => {
    expect(endpoints.pipelineFarm.roomTemperature).toBe(
      '/api/v1/admin/pipeline/farm/room-temperature',
    );
    expect(endpoints.pipelineFarm.agent).toBe('/api/v1/admin/pipeline/farm/agent');
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

  describe('the empty-bed check (P-106)', () => {
    it('uses the backend paths, encoding the printer id', () => {
      expect(endpoints.pipelineFarm.bedBlocks).toBe('/api/v1/admin/pipeline/farm/bed-blocks');
      expect(endpoints.pipelineFarm.clearBedBlock('-01P00C581401090')).toBe(
        '/api/v1/admin/pipeline/farm/printers/-01P00C581401090/clear-bed-block',
      );
      expect(endpoints.pipelineFarm.bedReference('P 12')).toBe(
        '/api/v1/admin/pipeline/farm/printers/P%2012/bed-reference',
      );
    });

    it('reads the held-back printers', async () => {
      const blocks = [{ printerId: 'P09', verdict: 'not_clear', code: 'c', reason: 'r' }];
      mockServer.use(
        http.get(endpoints.pipelineFarm.bedBlocks, () =>
          HttpResponse.json({ success: true, data: blocks }),
        ),
      );

      await expect(pipelineFarmApi.bedBlocks()).resolves.toEqual(blocks);
    });

    it('clears a block with an optional note, and sends an empty body without one', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipelineFarm.clearBedBlock('P09'), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: { ok: true, message: 'Lifted' } });
        }),
      );

      await pipelineFarmApi.clearBedBlock('P09', { note: 'plate was clean' });
      await pipelineFarmApi.clearBedBlock('P09');

      expect(received).toHaveBeenNthCalledWith(1, { note: 'plate was clean' });
      expect(received).toHaveBeenNthCalledWith(2, {});
    });

    it('saves a reference only with the confirmation in the body', async () => {
      const received = vi.fn();
      mockServer.use(
        http.post(endpoints.pipelineFarm.bedReference('P09'), async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ success: true, data: { ok: true, message: 'Saved' } });
        }),
      );

      await pipelineFarmApi.setBedReference('P09', { confirmed: true, note: 'light on' });

      expect(received).toHaveBeenCalledWith({ confirmed: true, note: 'light on' });
    });

    it('turns a picture the pipeline could not use into an error with the backend’s words', async () => {
      mockServer.use(
        http.post(endpoints.pipelineFarm.bedReference('P09'), () =>
          HttpResponse.json(
            { success: false, error: { code: 'CONFLICT', message: 'Is the chamber light on?' } },
            { status: 409 },
          ),
        ),
      );

      await expect(pipelineFarmApi.setBedReference('P09', { confirmed: true })).rejects.toThrow(
        'Is the chamber light on?',
      );
    });

    it('returns the saved reference as an image', async () => {
      mockServer.use(
        http.get(
          endpoints.pipelineFarm.bedReference('P09'),
          () =>
            new HttpResponse(new Uint8Array([1, 2, 3]), {
              headers: { 'Content-Type': 'image/jpeg' },
            }),
        ),
      );

      const blob = await pipelineFarmApi.bedReference('P09');

      expect(blob?.type).toBe('image/jpeg');
      expect(blob?.size).toBe(3);
    });

    it('returns null when no reference is saved yet, and throws for any other failure', async () => {
      mockServer.use(
        http.get(endpoints.pipelineFarm.bedReference('P09'), () =>
          HttpResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'none' } },
            { status: 404 },
          ),
        ),
        http.get(endpoints.pipelineFarm.bedReference('P10'), () =>
          HttpResponse.json(
            { success: false, error: { code: 'PIPELINE_UNAVAILABLE', message: 'Not offered yet' } },
            { status: 503 },
          ),
        ),
        http.get(
          endpoints.pipelineFarm.bedReference('P11'),
          () => new HttpResponse('boom', { status: 500 }),
        ),
      );

      await expect(pipelineFarmApi.bedReference('P09')).resolves.toBeNull();
      await expect(pipelineFarmApi.bedReference('P10')).rejects.toThrow('Not offered yet');
      await expect(pipelineFarmApi.bedReference('P11')).rejects.toThrow(/could not be loaded/);
    });
  });
});
