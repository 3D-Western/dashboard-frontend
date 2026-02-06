import {
  FileUploadResponse,
  FileMetadataResponse,
  FileListResponse,
  FileDeleteResponse,
} from '../types';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export interface FileListParams {
  userId?: number;
  page?: number;
  pageSize?: number;
  snapshotCreatedBefore?: string;
}

export const fileApi = {
  /**
   * Upload a file (multipart/form-data)
   * Supported file types: .stl, .obj, .3mf
   * Maximum file size: 50MB
   */
  upload: async (file: File, options?: RequestInit) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<FileUploadResponse>(`${getBaseUrl()}${endpoints.files.upload}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Don't set Content-Type header - browser will set it automatically with boundary
      ...options,
    });
  },

  /**
   * List all files (Admin only)
   * Returns a paginated list of files with optional filtering by userId
   */
  list: async (params?: FileListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.userId !== undefined) {
      searchParams.append('userId', params.userId.toString());
    }
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize !== undefined) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.snapshotCreatedBefore) {
      searchParams.append('snapshotCreatedBefore', params.snapshotCreatedBefore);
    }

    const queryString = searchParams.toString();
    const url = queryString
      ? `${getBaseUrl()}${endpoints.files.list}?${queryString}`
      : `${getBaseUrl()}${endpoints.files.list}`;

    return apiRequest<FileListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  /**
   * Get metadata for a specific file
   * Users can only access their own files; admins can access all files
   */
  getMetadata: async (fileId: string, options?: RequestInit) => {
    return apiRequest<FileMetadataResponse>(`${getBaseUrl()}${endpoints.files.byId(fileId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  /**
   * Delete a file (Admin only)
   * Cannot delete files that are associated with active jobs
   */
  delete: async (fileId: string, options?: RequestInit) => {
    return apiRequest<FileDeleteResponse>(`${getBaseUrl()}${endpoints.files.delete(fileId)}`, {
      method: 'DELETE',
      credentials: 'include',
      ...options,
    });
  },

  /**
   * Download a file
   * Users can only download their own files; admins can download all files
   * Returns the file as a Blob
   */
  download: async (fileId: string, options?: RequestInit): Promise<Blob> => {
    const response = await fetch(`${getBaseUrl()}${endpoints.files.download(fileId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Failed to download file ${fileId}: ${response.status} ${response.statusText}`,
        );
      } catch {
        throw new Error(
          `Failed to download file ${fileId}: ${response.status} ${response.statusText}`,
        );
      }
    }

    return response.blob();
  },

  /**
   * Download a file and trigger browser download
   * Convenience method that downloads the file and creates a download link
   */
  downloadAndSave: async (fileId: string, filename?: string, options?: RequestInit) => {
    const blob = await fileApi.download(fileId, options);

    // Get filename from Content-Disposition header if not provided
    if (!filename) {
      const metadata = await fileApi.getMetadata(fileId, options);
      filename = metadata.filename;
    }

    // Create a temporary URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
