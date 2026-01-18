import { PrintJob } from '@/types/jobs';
import { Invitation } from '@/types/invitation';
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

// Backend Response Types (with capitalized values)
export interface UserResponse {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  status: string; // Backend sends "Admin" or "User"
  experienceLevel?: string;
}

export interface ApiGetCurrentSessionResponse {
  user: UserResponse | null;
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

export interface ApiSignupRequest {
  studentId: number;
  email: string;
  password: string;
  inviteCode: string;
  firstName: string;
  lastName: string;
  experienceLevel: string;
}

export type ApiSignupResponse = ApiLoginResponse;

// Print Jobs API Response Types
export type PrintJobListResponse = PaginatedResponse<PrintJob>;
export type PrintJobResponse = PrintJob;

// File API Response Types
export type FileUploadResponse = FileUploadResult;
export type FileMetadataResponse = FileMetadata;
export type FileListResponse = FileList;
export type FileDeleteResponse = null;

// Users API Response Types (backend format)
export type UserListResponseRaw = PaginatedResponse<UserResponse>;

// Invitations API Response Types
export type InvitationListResponse = PaginatedResponse<Invitation>;
export type InvitationResponse = Invitation;
