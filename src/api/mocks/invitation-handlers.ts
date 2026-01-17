import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import db from './database/db';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  generateErrorResponse,
} from './utils';
import { InvitationStatus } from './database/types';

const apiUrl = process.env.API_URL;

export const invitationHandlers = [
  // GET /api/v1/admin/invitations - List invitations with filters and pagination
  http.get(`${apiUrl}${endpoints.invitations.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can access invitations
    if (user.role !== 'admin') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: 'Admin role required to access this resource',
        }),
        { status: 403 },
      );
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

    // Map to include createdBy information
    const invitationsWithCreator = invitations.map((inv) => {
      const creator = db.getUserById(inv.createdByUserId);
      return {
        id: inv.id,
        studentId: inv.studentId,
        email: inv.email,
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
    });

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

    // Only admins can access invitations
    if (user.role !== 'admin') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: 'Admin role required to access this resource',
        }),
        { status: 403 },
      );
    }

    const { invitationId } = params;
    const invitation = db.getInvitationById(parseInt(invitationId as string));

    if (!invitation) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVITATION_NOT_FOUND',
          message: `Invitation with ID ${invitationId} not found`,
        }),
        { status: 404 },
      );
    }

    const creator = db.getUserById(invitation.createdByUserId);

    return HttpResponse.json(
      generateSuccessResponse({
        id: invitation.id,
        studentId: invitation.studentId,
        email: invitation.email,
        invitationCode: invitation.invitationCode,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiredAt: invitation.expiredAt,
        acceptedAt: invitation.acceptedAt,
        createdBy: creator
          ? {
              studentId: creator.studentId,
              firstName: creator.firstName,
              lastName: creator.lastName,
            }
          : null,
      }),
    );
  }),

  // POST /api/v1/admin/invitations - Create invitation
  http.post(`${apiUrl}${endpoints.invitations.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // Only admins can create invitations
    if (user.role !== 'admin') {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'FORBIDDEN',
          message: 'Admin role required to access this resource',
        }),
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      studentId: number;
      email: string;
      expiresInDays?: number;
    };

    // Validation
    const errors: Record<string, string> = {};

    if (!body.studentId) {
      errors.studentId = 'Student ID is required';
    } else if (body.studentId < 251000000 || body.studentId > 251999999) {
      errors.studentId = 'Student ID must be between 251000000 and 251999999';
    }

    if (!body.email) {
      errors.email = 'Email is required';
    } else if (!/^[a-z]+\d*@uwo\.ca$/.test(body.email)) {
      errors.email = 'Email must be a valid UWO email address';
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

    // Check if invitation already exists for this student or email
    const existingInvitation = db.findInvitationByStudentIdOrEmail(
      body.studentId,
      body.email,
    );
    if (existingInvitation) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'INVITATION_ALREADY_EXISTS',
          message: 'A pending invitation already exists for this student ID or email',
        }),
        { status: 409 },
      );
    }

    // Check if user already exists
    const existingUser = db.getUserById(body.studentId);
    if (existingUser) {
      return HttpResponse.json(
        generateErrorResponse({
          code: 'USER_ALREADY_EXISTS',
          message: `User with student ID ${body.studentId} already exists`,
        }),
        { status: 409 },
      );
    }

    // Create the invitation
    const invitation = db.createInvitation({
      studentId: body.studentId,
      email: body.email,
      expiresInDays: body.expiresInDays,
      createdByUserId: user.studentId,
    });

    return HttpResponse.json(
      generateSuccessResponse({
        id: invitation.id,
        studentId: invitation.studentId,
        email: invitation.email,
        invitationCode: invitation.invitationCode,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiredAt: invitation.expiredAt,
        acceptedAt: invitation.acceptedAt,
        createdBy: {
          studentId: user.studentId,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }),
      { status: 201 },
    );
  }),

  // PATCH /api/v1/admin/invitations/:id/revoke - Revoke invitation
  http.patch(
    `${apiUrl}/api/v1/admin/invitations/:invitationId/revoke`,
    ({ cookies, params }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      // Only admins can revoke invitations
      if (user.role !== 'admin') {
        return HttpResponse.json(
          generateErrorResponse({
            code: 'FORBIDDEN',
            message: 'Admin role required to access this resource',
          }),
          { status: 403 },
        );
      }

      const { invitationId } = params;
      const invitation = db.getInvitationById(parseInt(invitationId as string));

      if (!invitation) {
        return HttpResponse.json(
          generateErrorResponse({
            code: 'INVITATION_NOT_FOUND',
            message: `Invitation with ID ${invitationId} not found`,
          }),
          { status: 404 },
        );
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
      const creator = db.getUserById(invitation.createdByUserId);

      return HttpResponse.json(
        generateSuccessResponse({
          id: revokedInvitation!.id,
          studentId: revokedInvitation!.studentId,
          email: revokedInvitation!.email,
          invitationCode: revokedInvitation!.invitationCode,
          status: revokedInvitation!.status,
          createdAt: revokedInvitation!.createdAt,
          expiredAt: revokedInvitation!.expiredAt,
          acceptedAt: revokedInvitation!.acceptedAt,
          createdBy: creator
            ? {
                studentId: creator.studentId,
                firstName: creator.firstName,
                lastName: creator.lastName,
              }
            : null,
        }),
      );
    },
  ),
];
