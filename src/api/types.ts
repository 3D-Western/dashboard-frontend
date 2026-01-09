import { User } from '@/types/user';
import { PrintJob } from '@/types/jobs';
import { FileUploadResult, FileMetadata, FileList } from '@/types/file';
import { PaginatedResponse } from '@/types/common';

export interface ApiResponseError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseRaw<T> {
  success: boolean;
  data: T;
  error?: ApiResponseError;
}

export interface ApiGetCurrentSessionResponse {
  user: User | null;
}

export interface ApiLoginResponse {
  sessionToken?: string;
  mfaToken?: string;
  requiresMfa?: boolean;
  challengeId?: number;
}

export interface ApiVerifyMfaResponse {
  sessionToken: string;
}

// Print Jobs API Response Types
export type PrintJobListResponse = PaginatedResponse<PrintJob>;
export type PrintJobResponse = PrintJob;

// File API Response Types
export type FileUploadResponse = FileUploadResult;
export type FileMetadataResponse = FileMetadata;
export type FileListResponse = FileList;
export type FileDeleteResponse = null;

// Users API Response Types
export type UserListResponse = PaginatedResponse<User>;
