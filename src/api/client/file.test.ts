import { describe, it, expect, vi } from 'vitest';
import { fileApi } from './file';
import { mockServer } from '../mocks';
import { http, HttpResponse } from 'msw';
import { getBaseUrl } from './utils';
import { endpoints } from './endpoints';
import {
  createMockFile,
  createMockFileMetadata,
  createMockFileUploadResult,
} from '@/../test/utils/mockFactories';
import { ApiError, ErrorCodes } from './errors';

describe('fileApi', () => {
  const baseUrl = getBaseUrl();

  describe('upload', () => {
    it('uploads file successfully', async () => {
      const mockFile = createMockFile('model.stl', 2048);
      const mockUploadResult = createMockFileUploadResult({
        filename: 'model.stl',
        size: 2048,
      });

      mockServer.use(
        http.post(`${baseUrl}${endpoints.files.upload}`, async ({ request }) => {
          const formData = await request.formData();
          const uploadedFile = formData.get('file') as File;
          expect(uploadedFile).toBeDefined();
          expect(uploadedFile.name).toBe('model.stl');

          return HttpResponse.json(
            {
              success: true,
              data: mockUploadResult,
            },
            { status: 201 },
          );
        }),
      );

      const result = await fileApi.upload(mockFile);
      expect(result.filename).toBe('model.stl');
      expect(result.size).toBe(2048);
      expect(result.id).toBeDefined();
    });

    it('includes credentials in request', async () => {
      const mockFile = createMockFile();
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.post(`${baseUrl}${endpoints.files.upload}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json(
            {
              success: true,
              data: createMockFileUploadResult(),
            },
            { status: 201 },
          );
        }),
      );

      await fileApi.upload(mockFile);
      expect(requestCredentials).toBe('include');
    });

    it('throws UNSUPPORTED_FILE_TYPE error for invalid file type', async () => {
      const mockFile = createMockFile('image.jpg', 1024, 'image/jpeg');

      mockServer.use(
        http.post(`${baseUrl}${endpoints.files.upload}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.UNSUPPORTED_FILE_TYPE,
                message: 'File extension .jpg is not supported',
                details: {
                  supportedTypes: ['stl', 'obj', '3mf'],
                },
              },
            },
            { status: 400 },
          );
        }),
      );

      await expect(fileApi.upload(mockFile)).rejects.toThrow(ApiError);
    });

    it('throws FILE_SIZE_EXCEEDED error for large files', async () => {
      const mockFile = createMockFile('large.stl', 51 * 1024 * 1024); // 51MB

      mockServer.use(
        http.post(`${baseUrl}${endpoints.files.upload}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FILE_SIZE_EXCEEDED,
                message: 'File size exceeds the maximum allowed size',
              },
            },
            { status: 400 },
          );
        }),
      );

      await expect(fileApi.upload(mockFile)).rejects.toThrow(ApiError);
    });

    it('handles network errors', async () => {
      const mockFile = createMockFile();

      mockServer.use(
        http.post(`${baseUrl}${endpoints.files.upload}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(fileApi.upload(mockFile)).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('returns paginated file list successfully', async () => {
      const mockFiles = [
        createMockFileMetadata({ filename: 'file1.stl' }),
        createMockFileMetadata({ filename: 'file2.obj' }),
      ];

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: mockFiles,
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 2,
                totalPages: 1,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      const result = await fileApi.list();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].filename).toBe('file1.stl');
      expect(result.pagination.totalItems).toBe(2);
    });

    it('sends correct query parameters', async () => {
      let requestUrl: string | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 2,
                pageSize: 20,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: true,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await fileApi.list({
        userId: 251000001,
        page: 2,
        pageSize: 20,
      });

      expect(requestUrl).toContain('userId=251000001');
      expect(requestUrl).toContain('page=2');
      expect(requestUrl).toContain('pageSize=20');
    });

    it('includes snapshotCreatedBefore when provided', async () => {
      let requestUrl: string | undefined;
      const snapshot = new Date('2024-01-01T12:00:00Z').toISOString();

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: snapshot,
              },
            },
          });
        }),
      );

      await fileApi.list({ snapshotCreatedBefore: snapshot });

      const url = new URL(requestUrl ?? '');
      expect(url.searchParams.get('snapshotCreatedBefore')).toBe(snapshot);
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNext: false,
                hasPrevious: false,
                snapshotCreatedBefore: new Date().toISOString(),
              },
            },
          });
        }),
      );

      await fileApi.list();
      expect(requestCredentials).toBe('include');
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FORBIDDEN,
                message: 'Admin role required to access this resource',
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(fileApi.list()).rejects.toThrow(ApiError);
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.list}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(fileApi.list()).rejects.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('returns file metadata successfully', async () => {
      const mockFileMetadata = createMockFileMetadata({
        filename: 'test-model.stl',
        size: 4096,
      });

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(mockFileMetadata.id)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockFileMetadata,
          });
        }),
      );

      const result = await fileApi.getMetadata(mockFileMetadata.id);
      expect(result.filename).toBe('test-model.stl');
      expect(result.size).toBe(4096);
      expect(result.uploadedBy).toBeDefined();
    });

    it('includes credentials in request', async () => {
      const fileId = 'test-file-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(fileId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: createMockFileMetadata({ id: fileId }),
          });
        }),
      );

      await fileApi.getMetadata(fileId);
      expect(requestCredentials).toBe('include');
    });

    it('throws FILE_NOT_FOUND error for non-existent file', async () => {
      const fileId = 'non-existent-id';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FILE_NOT_FOUND,
                message: `File with ID ${fileId} not found`,
              },
            },
            { status: 404 },
          );
        }),
      );

      await expect(fileApi.getMetadata(fileId)).rejects.toThrow(ApiError);
    });

    it("throws FORBIDDEN error when accessing another user's file", async () => {
      const fileId = 'other-user-file';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FORBIDDEN,
                message: "Cannot access another user's file",
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(fileApi.getMetadata(fileId)).rejects.toThrow(ApiError);
    });
  });

  describe('delete', () => {
    it('deletes file successfully', async () => {
      const fileId = 'test-file-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.files.delete(fileId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      const result = await fileApi.delete(fileId);
      expect(result).toBe(null);
    });

    it('includes credentials in request', async () => {
      const fileId = 'test-file-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.files.delete(fileId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: null,
          });
        }),
      );

      await fileApi.delete(fileId);
      expect(requestCredentials).toBe('include');
    });

    it('throws FORBIDDEN error for non-admin users', async () => {
      const fileId = 'test-file-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.files.delete(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FORBIDDEN,
                message: 'Admin role required to delete files',
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(fileApi.delete(fileId)).rejects.toThrow(ApiError);
    });

    it('throws FILE_NOT_FOUND error for non-existent file', async () => {
      const fileId = 'non-existent-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.files.delete(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FILE_NOT_FOUND,
                message: `File with ID ${fileId} not found`,
              },
            },
            { status: 404 },
          );
        }),
      );

      await expect(fileApi.delete(fileId)).rejects.toThrow(ApiError);
    });

    it('throws FILE_IN_USE error when file is associated with orders', async () => {
      const fileId = 'in-use-file-id';

      mockServer.use(
        http.delete(`${baseUrl}${endpoints.files.delete(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'FILE_IN_USE',
                message: 'Cannot delete file associated with active orders',
                details: {
                  activeOrders: ['order-1', 'order-2'],
                },
              },
            },
            { status: 409 },
          );
        }),
      );

      await expect(fileApi.delete(fileId)).rejects.toThrow(ApiError);
    });
  });

  describe('download', () => {
    it('downloads file successfully as Blob', async () => {
      const fileId = 'test-file-id';
      const fileContent = 'mock file content';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return new HttpResponse(fileContent, {
            status: 200,
            headers: {
              'Content-Type': 'model/stl',
              'Content-Disposition': 'attachment; filename="test.stl"',
            },
          });
        }),
      );

      const blob = await fileApi.download(fileId);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/stl');

      const text = await blob.text();
      expect(text).toBe(fileContent);
    });

    it('includes credentials in request', async () => {
      const fileId = 'test-file-id';
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, ({ request }) => {
          requestCredentials = request.credentials;
          return new HttpResponse('content', {
            status: 200,
            headers: {
              'Content-Type': 'model/stl',
            },
          });
        }),
      );

      await fileApi.download(fileId);
      expect(requestCredentials).toBe('include');
    });

    it('throws error for non-existent file', async () => {
      const fileId = 'non-existent-id';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FILE_NOT_FOUND,
                message: 'File not found',
              },
            },
            { status: 404 },
          );
        }),
      );

      await expect(fileApi.download(fileId)).rejects.toThrow();
    });

    it('uses fallback error message when response lacks error details', async () => {
      const fileId = 'missing-error-details';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return HttpResponse.json({}, { status: 500 });
        }),
      );

      await expect(fileApi.download(fileId)).rejects.toThrow(
        `Failed to download file ${fileId}: 500 Internal Server Error`,
      );
    });

    it("throws FORBIDDEN error when downloading another user's file", async () => {
      const fileId = 'other-user-file';

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: ErrorCodes.FORBIDDEN,
                message: "Cannot download another user's file",
              },
            },
            { status: 403 },
          );
        }),
      );

      await expect(fileApi.download(fileId)).rejects.toThrow();
    });
  });

  describe('downloadAndSave', () => {
    it('triggers browser download with custom filename', async () => {
      const fileId = 'test-file-id';
      const customFilename = 'my-model.stl';
      const fileContent = 'mock file content';

      // Mock window.URL.createObjectURL and revokeObjectURL
      const createObjectURLSpy = vi.fn(() => 'blob:mock-url');
      const revokeObjectURLSpy = vi.fn();
      global.URL.createObjectURL = createObjectURLSpy;
      global.URL.revokeObjectURL = revokeObjectURLSpy;

      // Mock document.createElement and appendChild/removeChild
      const linkElement = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(linkElement);
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => linkElement);
      const removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation(() => linkElement);

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return new HttpResponse(fileContent, {
            status: 200,
            headers: {
              'Content-Type': 'model/stl',
            },
          });
        }),
      );

      await fileApi.downloadAndSave(fileId, customFilename);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(linkElement.download).toBe(customFilename);
      expect(linkElement.href).toBe('blob:mock-url');
      expect(linkElement.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(linkElement);
      expect(removeChildSpy).toHaveBeenCalledWith(linkElement);
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('fetches filename from metadata when not provided', async () => {
      const fileId = 'test-file-id';
      const fileContent = 'mock file content';
      const mockMetadata = createMockFileMetadata({
        id: fileId,
        filename: 'from-metadata.stl',
      });

      // Mock window.URL and DOM methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      const linkElement = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(linkElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => linkElement);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => linkElement);

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(fileId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockMetadata,
          });
        }),
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return new HttpResponse(fileContent, {
            status: 200,
            headers: {
              'Content-Type': 'model/stl',
            },
          });
        }),
      );

      await fileApi.downloadAndSave(fileId);

      expect(linkElement.download).toBe('from-metadata.stl');
    });

    it('falls back to default filename when metadata is empty', async () => {
      const fileId = 'empty-metadata-filename';
      const fileContent = 'mock file content';
      const mockMetadata = createMockFileMetadata({
        id: fileId,
        filename: '',
      });

      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      const linkElement = {
        href: '',
        download: '',
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;
      vi.spyOn(document, 'createElement').mockReturnValue(linkElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => linkElement);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => linkElement);

      mockServer.use(
        http.get(`${baseUrl}${endpoints.files.byId(fileId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockMetadata,
          });
        }),
        http.get(`${baseUrl}${endpoints.files.download(fileId)}`, () => {
          return new HttpResponse(fileContent, {
            status: 200,
            headers: {
              'Content-Type': 'model/stl',
            },
          });
        }),
      );

      await fileApi.downloadAndSave(fileId);

      expect(linkElement.download).toBe('download');
    });
  });
});
