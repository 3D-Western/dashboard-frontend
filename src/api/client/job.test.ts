import { describe, it, expect } from 'vitest';
import { jobApi } from './job';
import { mockServer } from '../mocks';
import { http, HttpResponse } from 'msw';
import { getBaseUrl } from './utils';
import { endpoints } from './endpoints';
import { createMockPrintJob } from '@/../test/utils/mockFactories';
import { ApiError, ErrorCodes } from './errors';
import { PrintJobStatus } from '@/types/jobs';

describe('jobApi', () => {
  const baseUrl = getBaseUrl();

  describe('listAllJobs', () => {
    it('returns jobs array when successful', async () => {
      const mockJobs = [
        createMockPrintJob({ name: 'Job 1' }),
        createMockPrintJob({ name: 'Job 2' }),
      ];

      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, () => {
          return HttpResponse.json({
            success: true,
            data: { jobs: mockJobs },
          });
        }),
      );

      const result = await jobApi.listAllJobs();
      expect(result.jobs).toHaveLength(2);
      expect(result.jobs[0].name).toBe('Job 1');
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { jobs: [] },
          });
        }),
      );

      await jobApi.listAllJobs();
      expect(requestCredentials).toBe('include');
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(jobApi.listAllJobs()).rejects.toThrow();
    });
  });

  describe('updateJobStatus', () => {
    it('updates status successfully', async () => {
      const mockJob = createMockPrintJob({ status: 'IN_QUEUE' });
      const newStatus: PrintJobStatus = 'PRINTING';

      mockServer.use(
        http.patch(`${baseUrl}${endpoints.orders.byId(mockJob.id)}`, async ({ request }) => {
          const body = (await request.json()) as { status: PrintJobStatus };
          expect(body.status).toBe(newStatus);
          return HttpResponse.json({
            success: true,
            data: { job: { ...mockJob, status: newStatus } },
          });
        }),
      );

      const result = await jobApi.updateJobStatus(mockJob.id, newStatus);
      expect(result.job.status).toBe(newStatus);
    });

    it('sends correct request body', async () => {
      const jobId = 'test-job-id';
      const status: PrintJobStatus = 'READY';
      let requestBody: { status: PrintJobStatus } | null = null;

      mockServer.use(
        http.patch(`${baseUrl}${endpoints.orders.byId(jobId)}`, async ({ request }) => {
          requestBody = (await request.json()) as { status: PrintJobStatus };
          return HttpResponse.json({
            success: true,
            data: { job: createMockPrintJob({ id: jobId, status }) },
          });
        }),
      );

      await jobApi.updateJobStatus(jobId, status);
      expect(requestBody).toEqual({ status });
    });

    it('includes credentials in request', async () => {
      const jobId = 'test-job-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.patch(`${baseUrl}${endpoints.orders.byId(jobId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { job: createMockPrintJob({ id: jobId }) },
          });
        }),
      );

      await jobApi.updateJobStatus(jobId, 'PRINTING');
      expect(requestCredentials).toBe('include');
    });

    it('handles API errors', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.patch(`${baseUrl}${endpoints.orders.byId(jobId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Admin access required',
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(jobApi.updateJobStatus(jobId, 'PRINTING')).rejects.toThrow(ApiError);
    });
  });

  describe('deleteJob', () => {
    it('deletes job successfully', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.orders.byId(jobId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { success: true },
          });
        }),
      );

      const result = await jobApi.deleteJob(jobId);
      expect(result.success).toBe(true);
    });

    it('includes credentials in request', async () => {
      const jobId = 'test-job-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.orders.byId(jobId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { success: true },
          });
        }),
      );

      await jobApi.deleteJob(jobId);
      expect(requestCredentials).toBe('include');
    });

    it('handles API errors for non-admin users', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.orders.byId(jobId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Admin access required',
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(jobApi.deleteJob(jobId)).rejects.toThrow(ApiError);
    });
  });

  describe('cancelJob', () => {
    it('cancels job with IN_QUEUE status successfully', async () => {
      const mockJob = createMockPrintJob({ status: 'IN_QUEUE' });

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(mockJob.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { job: { ...mockJob, status: 'CANCELLED' as PrintJobStatus } },
          });
        }),
      );

      const result = await jobApi.cancelJob(mockJob.id);
      expect(result.job.status).toBe('CANCELLED');
    });

    it('includes credentials in request', async () => {
      const jobId = 'test-job-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(jobId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { job: createMockPrintJob({ id: jobId, status: 'CANCELLED' }) },
          });
        }),
      );

      await jobApi.cancelJob(jobId);
      expect(requestCredentials).toBe('include');
    });

    it('throws for non-cancellable statuses', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(jobId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.INVALID_REQUEST,
                message: 'Job cannot be cancelled in current status',
              },
            },
            { status: 400 },
          );
        }),
      );

      await expect(jobApi.cancelJob(jobId)).rejects.toThrow(ApiError);
    });

    it('handles network errors', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(jobId)}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(jobApi.cancelJob(jobId)).rejects.toThrow();
    });
  });
});
