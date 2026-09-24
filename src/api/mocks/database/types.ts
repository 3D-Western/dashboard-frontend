import { TrainingLevel } from '@/types/training';
import { OnboardingAnswers } from '@/types/onboarding';
import { AccountStatus } from '@/types/user';

export interface User {
  studentId: number;
  lastName: string;
  firstName: string;
  password: string;
  email: string;
  groups: string[]; // group keys, e.g. ['members'] or ['super_admins']
  experience: string;
  createdDate?: string;
  trainingLevel?: TrainingLevel;
  // Mirrors backend's real AccountStatus enum/column. Absent/undefined is treated as 'Active'
  // (see db.ts) so existing seeded users, which never set this field, aren't retroactively locked.
  accountStatus?: AccountStatus;
  accountStatusReason?: string | null;
  // Raw backend-shaped values (e.g. 'Undeclared', 'Beginner') for the AdminUserProfile mock
  // responses — separate from the unrelated, unused `experience` field above.
  faculty?: string;
  experienceLevel?: string | null;
  // Absent/undefined is treated as completed (see db.ts), matching the emailVerified convention
  // below — existing seeded users, which never set this field, aren't retroactively sent back
  // through onboarding. Only a newly mock-signed-up user starts with this explicitly `false`.
  onboardingCompleted?: boolean;
  onboardingAnswers?: OnboardingAnswers;
  // Absent/undefined is treated as verified (see db.ts) so existing seeded users, which never
  // set this field, aren't retroactively blocked from logging in. Only a newly mock-signed-up
  // user (explicitly `false`) is gated pending verification.
  emailVerified?: boolean;
}

export interface File {
  id: string;
  name: string;
  path: string;
}

export interface UserInfo {
  studentId: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export type JobCategory = 'ThreeDPrint' | 'CNC' | 'Waterjet' | 'LaserCutting';

export interface StatusHistory {
  status: PrintJobStatus;
  changedAt: string; // ISO Date String
  comments?: string;
  changedBy?: UserInfo;
}

export interface BasePrintJob {
  id: string;
  userId: number; // Internal: for database tracking
  user: UserInfo; // API response includes user info
  jobPlaced: string; // ISO date string
  category: JobCategory;
  description: string;
  name: string;
  reprint?: string | null; // link to another print job if this is a reprint
  statusHistory?: StatusHistory[];
  // Set for Ready/Succeeded/Failed/Cancelled, cleared when moved back to a non-terminal state
  completedAt?: string | null;
}

export type PrintJobStatus =
  | 'InQueue'
  | 'Printing'
  | 'Ready'
  | 'Flagged'
  | 'Error'
  | 'Succeeded'
  | 'Failed'
  | 'Cancelled'
  | 'PendingFile';
export type CompletePrintJobStatus = 'Succeeded' | 'Failed';

export interface PrintJob extends BasePrintJob {
  kind: 'active-print-job'; // For type checking
  status: PrintJobStatus;
}

export interface CompletedPrintJob extends BasePrintJob {
  kind: 'completed-print-job'; // For type checking
  jobFinished: string; // ISO date string
  status: CompletePrintJobStatus;
}

export interface FileMetadata {
  id: string; // UUID
  filename: string;
  size: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO 8601
  uploadedBy: number; // User ID
  diskPath: string; // Internal: path on disk
}

export interface FileListItem {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    studentId: number;
    firstName: string;
    lastName: string;
  };
}

// Invitation types
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface InvitationCreator {
  studentId: number;
  firstName: string;
  lastName: string;
}

export interface Invitation {
  id: number;
  studentId: number;
  email: string;
  invitationCode: string;
  status: InvitationStatus;
  createdAt: string;
  expiredAt: string;
  acceptedAt: string | null;
  createdByUserId: number; // Reference to creator's studentId
}
