import { User } from '@/types/user';
import { PrintJob } from '@/types/jobs';
import {
  FileUploadResult,
  FileMetadata,
  FileList,
} from '@/types/file';

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
  sessionToken: string;
}

export interface ApiGetAllActivePrintJobsResponse {
  jobs: PrintJob[];
}

// File API Response Types
export type FileUploadResponse = FileUploadResult;
export type FileMetadataResponse = FileMetadata;
export type FileListResponse = FileList;
export type FileDeleteResponse = null;
