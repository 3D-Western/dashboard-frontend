import { JobCategory, PrintJob } from '@/types/jobs';
import { Invitation } from '@/types/invitation';
import { FileUploadResult, FileMetadata, FileList } from '@/types/file';
import { PaginatedResponse } from '@/types/common';
import { IamRole, IamGroup, IamPermission, IamScope, IamAuditLog } from '@/types/iam';
import { UserPermission } from '@/types/user';

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

// Backend Response Types
export interface UserResponse {
  studentId: number;
  email: string;
  firstName: string;
  lastName: string;
  status?: string;
  experienceLevel?: string;
  faculty?: string;
}

export interface GroupResponse {
  id: number;
  groupKey: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGetCurrentSessionResponse {
  user: UserResponse | null;
  groups: GroupResponse[];
  permissions: UserPermission[];
  activeJobCount: number;
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
  faculty: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface CreateJobRequest {
  // Required fields
  jobName: string;
  description: string;
  formAnswerJson: string;
  category: JobCategory;
}

export interface CreateJobResponse {
  jobId: string;
  createdAt: string;
  fileId: string;
  uploadUrl: string;
  uploadExpiresIn: number;
}

export interface CompleteUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  checksum: string;
}

export interface RetryUploadResponse {
  fileId: string;
  presignedUrl: string;
  expiresIn: number;
  storageKey: string;
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

// IAM API Response Types
export type IamRoleResponse = IamRole;
export type IamRoleListResponse = IamRole[];
export type IamGroupResponse = IamGroup;
export type IamGroupListResponse = IamGroup[];
export type IamPermissionListResponse = IamPermission[];
export type IamScopeListResponse = IamScope[];
export type IamAuditLogResponse = IamAuditLog;

export interface IamAuditLogPageResponse {
  content: IamAuditLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}
