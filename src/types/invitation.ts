/**
 * Invitation Types
 * Types for the invitation management system
 */

/**
 * Invitation status enum
 */
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

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
  studentId: number;
  email: string;
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
