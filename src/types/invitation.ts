/**
 * Invitation Types
 * Types for the invitation management system
 */

/**
 * Invitation status enum
 */
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/**
 * What kind of non-Western member an invitation is for
 */
export type MemberType = 'STAFF' | 'ALUMNI' | 'COMMUNITY' | 'ORGANISATION';

export const MEMBER_TYPE_OPTIONS: { value: MemberType; label: string }[] = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'ALUMNI', label: 'Alumni' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'ORGANISATION', label: 'Organisation' },
];

export function memberTypeLabel(memberType: MemberType): string {
  return MEMBER_TYPE_OPTIONS.find((option) => option.value === memberType)?.label ?? memberType;
}

/**
 * Student numbers from here up are reserved for non-Western members (the backend hands them out).
 */
export const RESERVED_STUDENT_ID_START = 900000000;

/**
 * Creator info embedded in invitation
 */
export interface InvitationCreator {
  studentId: number;
  firstName: string;
  lastName: string;
}

/**
 * Invitation entity
 */
export interface Invitation {
  id: number;
  studentId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  memberType: MemberType;
  invitationCode: string;
  status: InvitationStatus;
  createdAt: string; // ISO 8601 datetime
  expiredAt: string; // ISO 8601 datetime
  acceptedAt: string | null;
  createdBy: InvitationCreator;
}

/**
 * Request body for creating an invitation
 */
export interface CreateInvitationRequest {
  firstName: string;
  lastName: string;
  email: string; // any domain
  memberType: MemberType;
  // Optional Western student or staff number (9 digits). Left out: the backend assigns the next
  // reserved number (900000000 and up).
  studentId?: number;
  expiresInDays?: number; // Default: 7, max: 30
}

/**
 * Query parameters for listing invitations
 */
export interface InvitationListParams {
  page?: number;
  pageSize?: number;
  snapshotCreatedBefore?: string;
  studentId?: number;
  email?: string;
  status?: InvitationStatus;
}
