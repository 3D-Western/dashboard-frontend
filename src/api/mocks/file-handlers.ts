import { http, HttpResponse } from 'msw';
import { randomUUID } from 'crypto';
import db from './database/db';
import { FileSystemUtils } from './utils/fileSystem';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  generateErrorResponse,
} from './utils';
import type { FileMetadata } from './database/types';

const apiUrl = process.env.API_URL;

export const fileHandlers = [
  // POST /api/v1/files/upload
  http.post(`${apiUrl}/api/v1/files/upload`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    try {
      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return HttpResponse.json(
          generateErrorResponse({
            code: 'VALIDATION_FAILED',
            message: 'No file provided',
          }),
          { status: 400 },
        );
      }

      // Validate file
      const validation = FileSystemUtils.validateFile(file.name, file.size);
      if (!validation.valid) {
        return HttpResponse.json(generateErrorResponse(validation.error!), { status: 400 });
      }

      // Save file to disk
      const fileBuffer = await file.arrayBuffer();
      const diskPath = await FileSystemUtils.saveFile(fileBuffer, file.name);

      // Create metadata
      const fileId = randomUUID();
      const metadata: FileMetadata = {
        id: fileId,
        filename: file.name,
        size: file.size,
        mimeType: FileSystemUtils.getMimeType(file.name),
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
        diskPath,
      };

      // Save to database
      db.saveFile(metadata);

      // Return response matching API spec
      return HttpResponse.json(
        generateSuccessResponse({
          id: metadata.id,
          filename: metadata.filename,
          size: metadata.size,
          mimeType: metadata.mimeType,
          uploadedAt: metadata.uploadedAt,
        }),
        { status: 201 },
      );
    } catch (error) {
      // Log error details in mock environment to aid debugging
      // while still returning a generic error to the client.
      // eslint-disable-next-line no-console
      console.error('Mock file upload handler failed:', error);
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload file',
        }),
        { status: 500 },
      );
    }
  }),

  // GET /api/v1/files (Admin only - paginated list)
  http.get(`${apiUrl}/api/v1/files`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Admin-only endpoint
    if (user.role !== 'admin') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: 'Admin role required to access this resource',
        }),
        { status: 403 },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Get all files
    let files = db.getAllFiles();

    // Filter by userId if provided
    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      files = files.filter((f) => f.uploadedBy === userId);
    }

    // Sort by uploadedAt descending (newest first)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Apply pagination
    const totalItems = files.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedFiles = files.slice(startIndex, endIndex);

    // Transform to response format with uploader info
    const items = paginatedFiles.map((file) => {
      const uploader = db.getUserById(file.uploadedBy);
      return {
        id: file.id,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        uploadedBy: uploader
          ? {
              studentId: uploader.id,
              firstName: uploader.firstName,
              lastName: uploader.lastName,
            }
          : undefined,
      };
    });

    return HttpResponse.json(
      generateSuccessResponse({
        data: items,
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

  // GET /api/v1/files/{id} - Get metadata
  http.get(`${apiUrl}/api/v1/files/:id`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { id } = params;
    const file = db.getFileById(id as string);

    if (!file) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FILE_NOT_FOUND',
          message: `File with ID ${id} not found`,
        }),
        { status: 404 },
      );
    }

    // Access control: users see own files, admins see all
    if (user.role !== 'admin' && file.uploadedBy !== user.id) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: "Cannot access another user's file",
        }),
        { status: 403 },
      );
    }

    // Get uploader info
    const uploader = db.getUserById(file.uploadedBy);

    return HttpResponse.json(
      generateSuccessResponse({
        id: file.id,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        uploadedBy: uploader
          ? {
              studentId: uploader.id,
              firstName: uploader.firstName,
              lastName: uploader.lastName,
            }
          : undefined,
      }),
    );
  }),

  // DELETE /api/v1/files/{id} - Admin only
  http.delete(`${apiUrl}/api/v1/files/:id`, async ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Admin-only endpoint
    if (user.role !== 'admin') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: 'Admin role required to delete files',
        }),
        { status: 403 },
      );
    }

    const { id } = params;
    const file = db.getFileById(id as string);

    if (!file) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FILE_NOT_FOUND',
          message: `File with ID ${id} not found`,
        }),
        { status: 404 },
      );
    }

    // Check if file is associated with any orders
    const allJobs = db.getAllPrintJobs();
    const associatedJobs = allJobs.filter((job) => job.stlFile.id === file.id);

    if (associatedJobs.length > 0) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FILE_IN_USE',
          message: 'Cannot delete file associated with active orders',
          details: {
            activeOrders: associatedJobs.map((job) => job.id),
          },
        }),
        { status: 409 },
      );
    }

    try {
      // Delete from disk
      await FileSystemUtils.deleteFile(file.diskPath);
      db.deleteFile(file.id);

      return HttpResponse.json(generateSuccessResponse(null));
    } catch (_) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file from storage',
        }),
        { status: 500 },
      );
    }
  }),

  // GET /api/v1/files/{id}/download - Serve actual file content
  http.get(`${apiUrl}/api/v1/files/:id/download`, async ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const { id } = params;
    const file = db.getFileById(id as string);

    if (!file) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FILE_NOT_FOUND',
          message: `File with ID ${id} not found`,
        }),
        { status: 404 },
      );
    }

    // Access control: users download own files, admins download all
    if (user.role !== 'admin' && file.uploadedBy !== user.id) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: "Cannot download another user's file",
        }),
        { status: 403 },
      );
    }

    try {
      // Read file from disk
      const fileBuffer = await FileSystemUtils.readFile(file.diskPath);

      // Return file with appropriate headers
      return new HttpResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': file.size.toString(),
        },
      });
    } catch (_) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate download URL',
        }),
        { status: 500 },
      );
    }
  }),
];
