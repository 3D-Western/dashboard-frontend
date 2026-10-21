import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  generateErrorResponse,
} from './utils';
import { Invitation, InvitationStatus, MemberType } from './database/types';
import { mockUserHasPermission } from './utils';
import { PERMISSIONS } from '@/constants/permissions';
import { RESERVED_STUDENT_ID_START } from '@/types/invitation';

const apiUrl = process.env.API_URL;

const MEMBER_TYPES: MemberType[] = ['STAFF', 'ALUMNI', 'COMMUNITY', 'ORGANISATION'];

/** An invitation as the API returns it, with the admin who created it. */
const toInvitationResponse = (inv: Invitation) => {
  const creator = db.getUserById(inv.createdByUserId);
  return {
    id: inv.id,
    studentId: inv.studentId,
    email: inv.email,
    firstName: inv.firstName,
    lastName: inv.lastName,
    memberType: inv.memberType,
    invitationCode: inv.invitationCode,
    status: inv.status,
    createdAt: inv.createdAt,
    expiredAt: inv.expiredAt,
    acceptedAt: inv.acceptedAt,
    createdBy: creator
      ? {
          studentId: creator.studentId,
          firstName: creator.firstName,
          lastName: creator.lastName,
        }
      : null,
  };
};

const forbidden = () =>
  HttpResponse.json(
    generateErrorResponse({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    }),
    { status: 403 },
  );

const notFound = (invitationId: unknown) =>
  HttpResponse.json(
    generateErrorResponse({
      code: 'INVITATION_NOT_FOUND',
      message: `Invitation with ID ${invitationId} not found`,
    }),
    { status: 404 },
  );

export const invitationHandlers = [
  // GET /api/v1/admin/invitations - List invitations with filters and pagination
  http.get(`${apiUrl}${endpoints.invitations.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    if (!mockUserHasPermission(user, PERMISSIONS.INVITATIONS_LIST)) {
      return forbidden();
    }

    // Parse query parameters
    const url = new URL(request.url);
    const studentIdParam = url.searchParams.get('studentId');
    const emailFilter = url.searchParams.get('email');
    const statusFilter = url.searchParams.get('status') as InvitationStatus | null;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const snapshotCreatedBefore =
      url.searchParams.get('snapshotCreatedBefore') || new Date().toISOString();

    // Get invitations with filters
    const invitations = db.getInvitations({
      studentId: studentIdParam ? parseInt(studentIdParam) : undefined,
      email: emailFilter || undefined,
      status: statusFilter || undefined,
      snapshotCreatedBefore,
    });

    const invitationsWithCreator = invitations.map(toInvitationResponse);

    // Calculate pagination
    const totalItems = invitationsWithCreator.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedInvitations = invitationsWithCreator.slice(startIndex, endIndex);

    return HttpResponse.json(
      generateSuccessResponse({
        data: paginatedInvitations,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          snapshotCreatedBefore,
        },
      }),
    );
  }),

  // GET /api/v1/admin/invitations/:id - Get single invitation
  http.get(`${apiUrl}/api/v1/admin/invitations/:invitationId`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    if (!mockUserHasPermission(user, PERMISSIONS.INVITATIONS_READ)) {
      return forbidden();
    }

    const { invitationId } = params;
    const invitation = db.getInvitationById(parseInt(invitationId as string));

    if (!invitation) {
      return notFound(invitationId);
    }

    return HttpResponse.json(generateSuccessResponse(toInvitationResponse(invitation)));
  }),

  // POST /api/v1/admin/invitations - Invite a non-Western member
  http.post(`${apiUrl}${endpoints.invitations.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    if (!mockUserHasPermission(user, PERMISSIONS.INVITATIONS_CREATE)) {
      return forbidden();
    }

    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      memberType?: MemberType;
      studentId?: number | null;
      expiresInDays?: number;
    };

    // Validation (mirrors the backend)
    const errors: Record<string, string> = {};

    if (!body.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!body.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!body.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+$/.test(body.email)) {
      errors.email = 'Email must be a valid email address';
    }
    if (!body.memberType || !MEMBER_TYPES.includes(body.memberType)) {
      errors.memberType = 'Member type is required';
    }
    if (body.studentId != null) {
      if (body.studentId < 100000000) {
        errors.studentId = 'Student number must be 9 digits';
      } else if (body.studentId >= RESERVED_STUDENT_ID_START) {
        errors.studentId = 'Student numbers from 900000000 up are reserved for non-Western members';
      }
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'VALIDATION_FAILED',
          message: 'Invitation creation failed validation',
          details: errors,
        }),
        { status: 400 },
      );
    }

    const studentId = body.studentId ?? undefined;
    const email = body.email!;

    // Check if user already exists
    if (studentId !== undefined && db.getUserById(studentId)) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'USER_ALREADY_EXISTS',
          message: `User with student ID ${studentId} already exists`,
        }),
        { status: 409 },
      );
    }

    // Check if invitation already exists for this student or email
    const existingInvitation = db.findInvitationByStudentIdOrEmail(studentId, email);
    if (existingInvitation) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVITATION_ALREADY_EXISTS',
          message: 'A pending invitation already exists for this student ID or email',
        }),
        { status: 409 },
      );
    }

    const invitation = db.createInvitation({
      studentId,
      email,
      firstName: body.firstName!.trim(),
      lastName: body.lastName!.trim(),
      memberType: body.memberType!,
      expiresInDays: body.expiresInDays,
      createdByUserId: user.studentId,
    });

    return HttpResponse.json(generateSuccessResponse(toInvitationResponse(invitation)), {
      status: 201,
    });
  }),

  // POST /api/v1/admin/invitations/:id/resend - Send an invitation email again
  http.post(`${apiUrl}/api/v1/admin/invitations/:invitationId/resend`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Sending again uses the same permission as creating an invitation
    if (!mockUserHasPermission(user, PERMISSIONS.INVITATIONS_CREATE)) {
      return forbidden();
    }

    const { invitationId } = params;
    const invitation = db.getInvitationById(parseInt(invitationId as string));

    if (!invitation) {
      return notFound(invitationId);
    }

    const resent = db.resendInvitation(invitation.id);
    if (!resent) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVITATION_CANNOT_BE_RESENT',
          message: 'Only pending or expired invitations can be sent again',
          details: {
            currentStatus: invitation.status,
          },
        }),
        { status: 409 },
      );
    }

    return HttpResponse.json(generateSuccessResponse(toInvitationResponse(resent)));
  }),

  // PATCH /api/v1/admin/invitations/:id/revoke - Revoke invitation
  http.patch(`${apiUrl}/api/v1/admin/invitations/:invitationId/revoke`, ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    if (!mockUserHasPermission(user, PERMISSIONS.INVITATIONS_REVOKE)) {
      return forbidden();
    }

    const { invitationId } = params;
    const invitation = db.getInvitationById(parseInt(invitationId as string));

    if (!invitation) {
      return notFound(invitationId);
    }

    if (invitation.status !== 'PENDING') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVITATION_CANNOT_BE_REVOKED',
          message: 'Only pending invitations can be revoked',
          details: {
            currentStatus: invitation.status,
          },
        }),
        { status: 409 },
      );
    }

    const revokedInvitation = db.revokeInvitation(invitation.id);

    return HttpResponse.json(generateSuccessResponse(toInvitationResponse(revokedInvitation!)));
  }),
];
