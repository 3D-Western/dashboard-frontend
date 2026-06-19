import { Invitation, InvitationListParams, CreateInvitationRequest } from '@/types/invitation';
import { PaginatedResponse } from '@/types/common';
import { apiRequest } from './base';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';

export type InvitationListResponse = PaginatedResponse<Invitation>;

export const invitationApi = {
  /**
   * List all invitations with optional filters and pagination
   */
  listInvitations: async (params?: InvitationListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.studentId !== undefined) {
      searchParams.append('studentId', params.studentId.toString());
    }
    if (params?.email !== undefined) {
      searchParams.append('email', params.email);
    }
    if (params?.status !== undefined) {
      searchParams.append('status', params.status);
    }
    if (params?.page !== undefined) {
      searchParams.append('page', params.page.toString());
    }
    if (params?.pageSize !== undefined) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.snapshotCreatedBefore !== undefined) {
      searchParams.append('snapshotCreatedBefore', params.snapshotCreatedBefore);
    }

    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.invitations.list}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<InvitationListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  /**
   * Get a single invitation by ID
   */
  getInvitation: async (invitationId: number, options?: RequestInit) => {
    const url = `${getBaseUrl()}${endpoints.invitations.byId(invitationId)}`;

    return apiRequest<Invitation>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  /**
   * Create a new invitation
   */
  createInvitation: async (data: CreateInvitationRequest, options?: RequestInit) => {
    const url = `${getBaseUrl()}${endpoints.invitations.create}`;

    return apiRequest<Invitation>(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * Revoke a pending invitation
   */
  revokeInvitation: async (invitationId: number, options?: RequestInit) => {
    const url = `${getBaseUrl()}${endpoints.invitations.revoke(invitationId)}`;

    return apiRequest<Invitation>(url, {
      method: 'PATCH',
      credentials: 'include',
      ...options,
    });
  },
};
