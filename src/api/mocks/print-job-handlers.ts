import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

export const jobHandlers = [
  // GET /jobs with query params (status, userId, pagination)
  http.get(`${apiUrl}${endpoints.jobs.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Parse query parameters
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const searchFilter = url.searchParams.get('search');
    const userIdFilter = url.searchParams.get('userId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Determine the userId filter based on role
    let userIdForFilter: number | undefined;
    if (userIdFilter) {
      userIdForFilter = parseInt(userIdFilter);
    } else if (user.role !== 'admin') {
      // Non-admin users can only see their own jobs
      userIdForFilter = user.studentId;
    }

    // Get print jobs using the shared function with filters
    const jobs = db.getPrintJobs({
      userId: userIdForFilter,
      status: statusFilter || undefined,
      search: searchFilter || undefined,
      snapshotCreatedBefore,
    });

    // User info is now always populated in the job object

    // Calculate pagination
    const totalItems = jobs.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedJobs = jobs.slice(startIndex, endIndex);

    return HttpResponse.json(
      generateSuccessResponse({
        data: paginatedJobs,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // POST /jobs - Create new job (Step 1: Returns presigned URL)
  http.post(`${apiUrl}${endpoints.jobs.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const body = (await request.json()) as {
      jobName: string;
      description: string;
      formAnswerJson: string;
      category: 'ThreeDPrint' | 'CNC' | 'Waterjet' | 'LaserCutting';
    };

    // Parse formAnswerJson to extract fields
    let formData: Record<string, unknown> = {};
    try {
      formData = JSON.parse(body.formAnswerJson);
    } catch {
      // If formAnswerJson is invalid, use empty object
      formData = {};
    }

    // Generate IDs
    const jobId = `job-${Date.now()}`;
    const fileId = `file-${Date.now()}`;

    // Create job with PendingFile status
    const newJob = {
      id: jobId,
      kind: 'active-print-job' as const,
      userId: user.studentId,
      user: {
        studentId: user.studentId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      name: body.jobName,
      description: body.description,
      purpose: formData.purpose as string | undefined,
      design_intent: formData.design_intent as string | undefined,
      jobPlaced: new Date().toISOString(),
      status: 'PendingFile' as const,
      reprint: null,
      category: body.category,
      // 3D Print specific fields from formAnswerJson
      goal: formData.goal as string | undefined,
      durability: formData.durability as string | undefined,
      infill: formData.infill as string | undefined,
      material1: (formData.material1 || formData.material) as string | undefined,
      color1: formData.color1 as string | undefined,
      material2: formData.material2 as string | undefined,
      color2: formData.color2 as string | undefined,
      support: formData.support as string | undefined,
      // CNC/Laser/WaterJet specific fields from formAnswerJson
      material: formData.material as string | undefined,
      priority: formData.priority as string | undefined,
      urgency: formData.urgency as string | undefined,
    };
    db.addPrintJob(newJob);

    // Return presigned URL response
    const mockPresignedUrl = `http://mock-storage.local/uploads/${fileId}?signature=mock`;

    return HttpResponse.json(
      generateSuccessResponse({
        jobId: jobId,
        createdAt: newJob.jobPlaced,
        fileId,
        uploadUrl: mockPresignedUrl,
        uploadExpiresIn: 900, // 15 minutes
      }),
      { status: 201 },
    );
  }),

  // POST /jobs/:jobId/complete-upload (Step 3: Complete upload)
  http.post(
    `${apiUrl}/api/v1/jobs/:jobId/complete-upload`,
    async ({ cookies, params, request }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      const { jobId } = params;
      const body = (await request.json()) as {
        fileName?: string;
        fileSize?: number;
        contentType?: string;
        checksum?: string;
      };

      if (
        typeof body.fileName !== 'string' ||
        body.fileName.length === 0 ||
        typeof body.fileSize !== 'number' ||
        !Number.isFinite(body.fileSize) ||
        typeof body.contentType !== 'string' ||
        body.contentType.length === 0 ||
        typeof body.checksum !== 'string' ||
        body.checksum.length === 0
      ) {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message:
                'Missing or invalid fields in request body. Required: fileName, fileSize, contentType, checksum.',
            },
          },
          { status: 400 },
        );
      }
      // Find the job
      const job = db.getPrintJobs({ userId: user.studentId }).find((o) => o.id === jobId);
      if (!job) {
        return HttpResponse.json(
          { success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
          { status: 404 },
        );
      }

      // Check if job is in PendingFile status
      if (job.status !== 'PendingFile') {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATUS',
              message: 'Only jobs with PendingFile status can complete upload',
            },
          },
          { status: 409 },
        );
      }

      // Update job status to InQueue
      db.updatePrintJobStatus(jobId as string, 'InQueue');

      return HttpResponse.json(generateSuccessResponse({ data: null }));
    },
  ),

  // POST /jobs/:jobId/retry-upload (Retry presigned URL)
  http.post(`${apiUrl}/api/v1/jobs/:jobId/retry-upload`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { jobId } = params;

    // Find the job
    const job = db.getPrintJobs({ userId: user.studentId }).find((o) => o.id === jobId);
    if (!job) {
      return HttpResponse.json(
        { success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } },
        { status: 404 },
      );
    }

    // Check if job is in PendingFile status
    if (job.status !== 'PendingFile') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Only jobs with PendingFile status can retry upload',
          },
        },
        { status: 409 },
      );
    }

    // Return new presigned URL
    const mockFileId = `file-retry-${Date.now()}`;
    const mockPresignedUrl = `http://mock-storage.local/uploads/${mockFileId}?signature=mock-retry`;

    return HttpResponse.json(
      generateSuccessResponse({
        fileId: mockFileId,
        presignedUrl: mockPresignedUrl,
        expiresIn: 900,
        storageKey: `prints/tmp/${mockFileId}`,
      }),
    );
  }),

  // PATCH /jobs/:jobId - Update job status
  http.patch(`${apiUrl}/api/v1/jobs/:jobId`, async ({ cookies, params, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can update job status
    if (user.role !== 'admin') {
      return HttpResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 },
      );
    }

    const { jobId } = params;
    const body = (await request.json()) as { status: string };

    const updatedJob = db.updatePrintJobStatus(jobId as string, body.status);
    if (!updatedJob) {
      return HttpResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return HttpResponse.json(generateSuccessResponse({ job: updatedJob }));
  }),

  // DELETE /jobs/:jobId
  http.delete(`${apiUrl}/api/v1/jobs/:jobId`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can delete jobs
    if (user.role !== 'admin') {
      return HttpResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 },
      );
    }

    const { jobId } = params;
    const success = db.deletePrintJob(jobId as string);
    if (!success) {
      return HttpResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return HttpResponse.json(generateSuccessResponse({ success: true }));
  }),
];
