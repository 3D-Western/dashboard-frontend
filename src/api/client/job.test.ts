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

  const createMockPagination = () => ({
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    snapshotCreatedBefore: new Date().toISOString(),
  });

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
            data: {
              data: mockJobs,
              pagination: createMockPagination(),
            },
          });
        }),
      );

      const result = await jobApi.listAllJobs();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Job 1');
    });

    it('includes query parameters when provided', async () => {
      let requestUrl: string | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
          });
        }),
      );

      await jobApi.listAllJobs({
        userId: 123,
        status: 'InQueue',
        page: 2,
        pageSize: 20,
        snapshotCreatedBefore: '2024-01-01',
      });

      expect(requestUrl).toContain('userId=123');
      expect(requestUrl).toContain('status=InQueue');
      expect(requestUrl).toContain('page=2');
      expect(requestUrl).toContain('pageSize=20');
      expect(requestUrl).toContain('snapshotCreatedBefore=2024-01-01');
    });

    it('omits undefined query parameters', async () => {
      let requestUrl: string | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
          });
        }),
      );

      await jobApi.listAllJobs({ userId: 123 });

      expect(requestUrl).toContain('userId=123');
      expect(requestUrl).not.toContain('status=');
      expect(requestUrl).not.toContain('page=');
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.orders.list}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
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
      const mockJob = createMockPrintJob({ status: 'InQueue' });
      const newStatus: PrintJobStatus = 'Printing';

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
      const status: PrintJobStatus = 'Ready';
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

      await jobApi.updateJobStatus(jobId, 'Printing');
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

      await expect(jobApi.updateJobStatus(jobId, 'Printing')).rejects.toThrow(ApiError);
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
    it('cancels job with InQueue status successfully', async () => {
      const mockJob = createMockPrintJob({ status: 'InQueue' });

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(mockJob.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: { job: { ...mockJob, status: 'Failed' as PrintJobStatus } },
          });
        }),
      );

      const result = await jobApi.cancelJob(mockJob.id);
      expect(result.job.status).toBe('Failed');
    });

    it('includes credentials in request', async () => {
      const jobId = 'test-job-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.cancel(jobId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: { job: createMockPrintJob({ id: jobId, status: 'Failed' }) },
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

  describe('createOrder', () => {
    it('creates order successfully with required fields', async () => {
      const mockResponse = {
        orderId: 'test-order-id',
        createdAt: '2024-01-15T10:30:00Z',
        fileId: 'test-file-id',
        uploadUrl: 'https://storage.example.com/presigned-url',
        uploadExpiresIn: 900,
      };

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await jobApi.createOrder({
        printName: 'Test Print',
        description: 'Test Description',
        formAnswerJson: '{"test": "value"}',
        material1: 'PLA',
        color1: 'red',
        material2: 'PLA',
        color2: 'blue',
      });

      expect(result.orderId).toBe('test-order-id');
      expect(result.uploadUrl).toBe('https://storage.example.com/presigned-url');
    });

    it('sends correct request body with optional fields', async () => {
      let requestBody: Record<string, unknown> | null = null;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.create}`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: {
              orderId: 'test-order-id',
              createdAt: '2024-01-15T10:30:00Z',
              fileId: 'test-file-id',
              uploadUrl: 'https://storage.example.com/presigned-url',
              uploadExpiresIn: 900,
            },
          });
        }),
      );

      await jobApi.createOrder({
        printName: 'Test Print',
        description: 'Test Description',
        formAnswerJson: '{"test": "value"}',
        material1: 'PLA',
        color1: 'red',
        material2: 'PLA',
        color2: 'blue',
        goal: 'Functional part',
        durability: 'High',
        infill: '20%',
        support: 'Yes',
      });

      expect(requestBody).toEqual({
        printName: 'Test Print',
        description: 'Test Description',
        formAnswerJson: '{"test": "value"}',
        material1: 'PLA',
        color1: 'red',
        material2: 'PLA',
        color2: 'blue',
        goal: 'Functional part',
        durability: 'High',
        infill: '20%',
        support: 'Yes',
      });
    });

    it('handles print job limit error', async () => {
      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.create}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'PRINT_JOB_LIMIT_REACHED',
                message: 'You already have 1 active print job(s).',
              },
            },
            { status: 409 },
          );
        }),
      );

      await expect(
        jobApi.createOrder({
          printName: 'Test Print',
          description: 'Test Description',
          formAnswerJson: '{}',
          material1: 'PLA',
          color1: 'red',
          material2: 'PLA',
          color2: 'blue',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('completeUpload', () => {
    it('completes upload with full payload', async () => {
      const orderId = 'test-order-id';
      let requestBody: Record<string, unknown> | null = null;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.completeUpload(orderId)}`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await jobApi.completeUpload(orderId, {
        fileName: 'test-file.stl',
        fileSize: 2457600,
        contentType: 'model/stl',
        checksum: 'sha256:abc123',
      });

      expect(requestBody).toEqual({
        fileName: 'test-file.stl',
        fileSize: 2457600,
        contentType: 'model/stl',
        checksum: 'sha256:abc123',
      });
    });

    it('handles file not found error', async () => {
      const orderId = 'test-order-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.completeUpload(orderId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'VALIDATION_FAILED',
                message: 'File not found in storage',
              },
            },
            { status: 400 },
          );
        }),
      );

      await expect(
        jobApi.completeUpload(orderId, {
          fileName: 'test-file.stl',
          fileSize: 2457600,
          contentType: 'model/stl',
          checksum: 'sha256:abc123',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('handles invalid order status error', async () => {
      const orderId = 'test-order-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.completeUpload(orderId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'INVALID_STATUS',
                message: 'Only print jobs with PENDING_FILE status can complete upload',
              },
            },
            { status: 409 },
          );
        }),
      );

      await expect(
        jobApi.completeUpload(orderId, {
          fileName: 'test-file.stl',
          fileSize: 2457600,
          contentType: 'model/stl',
          checksum: 'sha256:abc123',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('retryUpload', () => {
    it('returns new presigned URL on success', async () => {
      const orderId = 'test-order-id';
      const mockResponse = {
        fileId: 'test-file-id',
        presignedUrl: 'https://storage.example.com/new-presigned-url',
        expiresIn: 900,
        storageKey: 'prints/123456/orders/test-order-id/uuid-here',
      };

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.retryUpload(orderId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await jobApi.retryUpload(orderId);

      expect(result.fileId).toBe('test-file-id');
      expect(result.presignedUrl).toBe('https://storage.example.com/new-presigned-url');
      expect(result.expiresIn).toBe(900);
      expect(result.storageKey).toBe('prints/123456/orders/test-order-id/uuid-here');
    });

    it('handles rate limit error', async () => {
      const orderId = 'test-order-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.retryUpload(orderId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Maximum upload retry limit reached for this order',
              },
            },
            { status: 429 },
          );
        }),
      );

      await expect(jobApi.retryUpload(orderId)).rejects.toThrow(ApiError);
    });

    it('handles invalid order status error', async () => {
      const orderId = 'test-order-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.retryUpload(orderId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'INVALID_STATUS',
                message: 'Only print jobs with PENDING_FILE status can retry upload',
              },
            },
            { status: 409 },
          );
        }),
      );

      await expect(jobApi.retryUpload(orderId)).rejects.toThrow(ApiError);
    });

    it('includes credentials in request', async () => {
      const orderId = 'test-order-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.orders.retryUpload(orderId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: {
              fileId: 'test-file-id',
              presignedUrl: 'https://storage.example.com/presigned-url',
              expiresIn: 900,
              storageKey: 'prints/123456/orders/test-order-id/uuid-here',
            },
          });
        }),
      );

      await jobApi.retryUpload(orderId);
      expect(requestCredentials).toBe('include');
    });
  });

  describe('uploadOrderFile', () => {
    it('uploads file to presigned URL', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });

      mockServer.use(
        http.put(uploadUrl, () => {
          return new HttpResponse(null, { status: 200 });
        }),
      );

      const response = await jobApi.uploadOrderFile(uploadUrl, file);
      expect(response.ok).toBe(true);
    });

    it('throws error on upload failure', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });

      mockServer.use(
        http.put(uploadUrl, () => {
          return new HttpResponse(null, { status: 403 });
        }),
      );

      await expect(jobApi.uploadOrderFile(uploadUrl, file)).rejects.toThrow(
        'File upload failed with status 403',
      );
    });
  });
});
