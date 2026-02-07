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
        http.get(`${baseUrl}${endpoints.jobs.list}`, () => {
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
        http.get(`${baseUrl}${endpoints.jobs.list}`, ({ request }) => {
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
        http.get(`${baseUrl}${endpoints.jobs.list}`, ({ request }) => {
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
        http.get(`${baseUrl}${endpoints.jobs.list}`, ({ request }) => {
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
        http.get(`${baseUrl}${endpoints.jobs.list}`, () => {
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
        http.patch(`${baseUrl}${endpoints.jobs.byId(mockJob.id)}`, async ({ request }) => {
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
        http.patch(`${baseUrl}${endpoints.jobs.byId(jobId)}`, async ({ request }) => {
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
        http.patch(`${baseUrl}${endpoints.jobs.byId(jobId)}`, ({ request }) => {
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
        http.patch(`${baseUrl}${endpoints.jobs.byId(jobId)}`, () => {
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
        http.delete(`${baseUrl}${endpoints.jobs.byId(jobId)}`, () => {
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
        http.delete(`${baseUrl}${endpoints.jobs.byId(jobId)}`, ({ request }) => {
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
        http.delete(`${baseUrl}${endpoints.jobs.byId(jobId)}`, () => {
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

  describe('createJob', () => {
    it('creates job successfully with required fields', async () => {
      const mockResponse = {
        jobId: 'test-job-id',
        createdAt: '2024-01-15T10:30:00Z',
        fileId: 'test-file-id',
        uploadUrl: 'https://storage.example.com/presigned-url',
        uploadExpiresIn: 900,
      };

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await jobApi.createJob({
        jobName: 'Test Print',
        description: 'Test Description',
        category: 'ThreeDPrint',
        formAnswerJson: JSON.stringify({
          material1: 'PLA',
          color1: 'red',
          material2: 'PLA',
          color2: 'blue',
        }),
      });

      expect(result.jobId).toBe('test-job-id');
      expect(result.uploadUrl).toBe('https://storage.example.com/presigned-url');
    });

    it('sends correct request body with optional fields', async () => {
      let requestBody: Record<string, unknown> | null = null;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.create}`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: {
              jobId: 'test-job-id',
              createdAt: '2024-01-15T10:30:00Z',
              fileId: 'test-file-id',
              uploadUrl: 'https://storage.example.com/presigned-url',
              uploadExpiresIn: 900,
            },
          });
        }),
      );

      const formData = {
        material1: 'PLA',
        color1: 'red',
        material2: 'PLA',
        color2: 'blue',
        goal: 'Functional part',
        durability: 'High',
        infill: '20%',
        support: 'Yes',
      };

      await jobApi.createJob({
        jobName: 'Test Print',
        description: 'Test Description',
        category: 'ThreeDPrint',
        formAnswerJson: JSON.stringify(formData),
      });

      expect(requestBody).toEqual({
        jobName: 'Test Print',
        description: 'Test Description',
        category: 'ThreeDPrint',
        formAnswerJson: JSON.stringify(formData),
      });
    });

    it('handles print job limit error', async () => {
      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.create}`, () => {
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
        jobApi.createJob({
          jobName: 'Test Print',
          description: 'Test Description',
          category: 'ThreeDPrint',
          formAnswerJson: JSON.stringify({
            material1: 'PLA',
            color1: 'red',
            material2: 'PLA',
            color2: 'blue',
          }),
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('completeUpload', () => {
    it('completes upload with full payload', async () => {
      const jobId = 'test-job-id';
      let requestBody: Record<string, unknown> | null = null;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.completeUpload(jobId)}`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await jobApi.completeUpload(jobId, {
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
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.completeUpload(jobId)}`, () => {
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
        jobApi.completeUpload(jobId, {
          fileName: 'test-file.stl',
          fileSize: 2457600,
          contentType: 'model/stl',
          checksum: 'sha256:abc123',
        }),
      ).rejects.toThrow(ApiError);
    });

    it('handles invalid job status error', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.completeUpload(jobId)}`, () => {
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
        jobApi.completeUpload(jobId, {
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
      const jobId = 'test-job-id';
      const mockResponse = {
        fileId: 'test-file-id',
        presignedUrl: 'https://storage.example.com/new-presigned-url',
        expiresIn: 900,
        storageKey: 'prints/123456/jobs/test-job-id/uuid-here',
      };

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.retryUpload(jobId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await jobApi.retryUpload(jobId);

      expect(result.fileId).toBe('test-file-id');
      expect(result.presignedUrl).toBe('https://storage.example.com/new-presigned-url');
      expect(result.expiresIn).toBe(900);
      expect(result.storageKey).toBe('prints/123456/jobs/test-job-id/uuid-here');
    });

    it('handles rate limit error', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.retryUpload(jobId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Maximum upload retry limit reached for this job',
              },
            },
            { status: 429 },
          );
        }),
      );

      await expect(jobApi.retryUpload(jobId)).rejects.toThrow(ApiError);
    });

    it('handles invalid job status error', async () => {
      const jobId = 'test-job-id';

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.retryUpload(jobId)}`, () => {
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

      await expect(jobApi.retryUpload(jobId)).rejects.toThrow(ApiError);
    });

    it('includes credentials in request', async () => {
      const jobId = 'test-job-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.jobs.retryUpload(jobId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: {
              fileId: 'test-file-id',
              presignedUrl: 'https://storage.example.com/presigned-url',
              expiresIn: 900,
              storageKey: 'prints/123456/jobs/test-job-id/uuid-here',
            },
          });
        }),
      );

      await jobApi.retryUpload(jobId);
      expect(requestCredentials).toBe('include');
    });
  });

  describe('uploadJobFile', () => {
    it('uploads file to presigned URL', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });

      mockServer.use(
        http.put(uploadUrl, () => {
          return new HttpResponse(null, { status: 200 });
        }),
      );

      const response = await jobApi.uploadJobFile(uploadUrl, file);
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

      await expect(jobApi.uploadJobFile(uploadUrl, file)).rejects.toThrow(
        'File upload failed with status 403',
      );
    });

    it('sets Content-Type header from file type', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });
      let requestHeaders: Headers | undefined;

      mockServer.use(
        http.put(uploadUrl, ({ request }) => {
          requestHeaders = request.headers;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await jobApi.uploadJobFile(uploadUrl, file);
      expect(requestHeaders?.get('Content-Type')).toBe('model/stl');
    });

    it('uses application/sla as default Content-Type when file type is missing', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: '' });
      let requestHeaders: Headers | undefined;

      mockServer.use(
        http.put(uploadUrl, ({ request }) => {
          requestHeaders = request.headers;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await jobApi.uploadJobFile(uploadUrl, file);
      expect(requestHeaders?.get('Content-Type')).toBe('application/sla');
    });

    it('prevents Content-Type header override from options', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });
      let requestHeaders: Headers | undefined;

      mockServer.use(
        http.put(uploadUrl, ({ request }) => {
          requestHeaders = request.headers;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await jobApi.uploadJobFile(uploadUrl, file, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Content-Type should be model/stl from file, not application/json from options
      expect(requestHeaders?.get('Content-Type')).toBe('model/stl');
    });

    it('preserves other custom headers from options', async () => {
      const uploadUrl = 'https://storage.example.com/presigned-url';
      const file = new File(['test content'], 'test.stl', { type: 'model/stl' });
      let requestHeaders: Headers | undefined;

      mockServer.use(
        http.put(uploadUrl, ({ request }) => {
          requestHeaders = request.headers;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      await jobApi.uploadJobFile(uploadUrl, file, {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(requestHeaders?.get('Content-Type')).toBe('model/stl');
      expect(requestHeaders?.get('X-Custom-Header')).toBe('custom-value');
    });
  });
});
