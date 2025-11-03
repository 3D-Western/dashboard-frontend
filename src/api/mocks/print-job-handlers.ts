import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import { createInvalidSessionResponse, generateSuccessResponse } from './utils';

const apiUrl = process.env.API_URL;

export const printJobHandlers = [
  http.get(`${apiUrl}${endpoints.jobs.listAllActiveJobs}`, ({ cookies }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }
    // For admin users, return all jobs with student info
    // For regular users, return only their jobs
    let jobs;
    if (user.role === 'admin') {
      jobs = db.getAllPrintJobs().map((job) => {
        const student = db.getUserById(job.studentId);
        return {
          ...job,
          student: student
            ? {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
              }
            : undefined,
        };
      });
    } else {
      jobs = db.getPrintJobsByUserId(user.id);
    }
    return HttpResponse.json(generateSuccessResponse({ jobs: jobs }));
  }),

  http.patch(`${apiUrl}/api/v1/jobs/:jobId/status`, async ({ cookies, params, request }) => {
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
