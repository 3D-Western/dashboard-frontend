/**
 * File Types
 * Types related to file uploads and management
 */

import type { PaginatedResponse } from './common';

// Basic file reference (used in PrintJob)
// This matches the existing File interface in jobs.ts
export interface FileReference {
  id: string;
  name: string;
  path: string;
}

// Uploader information (included in admin views)
export interface FileUploader {
  studentId: number;
  firstName: string;
  lastName: string;
}

// Complete file metadata from the API
export interface FileMetadata {
  id: string;
  filename: string;
  size: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO 8601
  uploadedBy?: FileUploader;
}

// File list item (used in paginated lists)
// Currently same as FileMetadata, but kept separate for future extensibility
export type FileListItem = FileMetadata;

// Supported file MIME types
export type FileMimeType = 'model/stl' | 'model/obj' | 'application/3mf';

// Supported file extensions
export type FileExtension = '.stl' | '.obj' | '.3mf';

// File validation constraints
export const FILE_CONSTRAINTS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB in bytes
  SUPPORTED_EXTENSIONS: ['.stl', '.obj', '.3mf'] as const,
  SUPPORTED_MIME_TYPES: ['model/stl', 'model/obj', 'application/3mf'] as const,
} as const;

// File list response using generic pagination
export type FileList = PaginatedResponse<FileListItem>;

// File upload result
export interface FileUploadResult {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface RetryUploadResponse {
  fileId: string;
  presignedUrl: string;
  expiresIn: number; 
  storageKey: string;
}


export interface CompleteUploadPayload {
  fileName: string;
  fileSize: number;
  contentType: string; 
  checksum: string; 
}