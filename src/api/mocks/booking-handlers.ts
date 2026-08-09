import { http, HttpResponse } from 'msw';
import { endpoints } from '../client/endpoints';
import {
  createInvalidSessionResponse,
  generateSuccessResponse,
  mockUserHasPermission,
} from './utils';
import db from './database/db';
import { PERMISSIONS } from '@/constants/permissions';
import { mockEquipment } from './data/equipment';
import { Booking, BookingStatus, PendingRequest } from '@/types/booking';
import {
  checkOverlap,
  validateCapacity,
  validateRestrictions,
  suggestAlternativeSlots,
} from '@/utils/booking-validators';

const apiUrl = process.env.API_URL;

const activeOnly = (b: Booking): boolean => b.status !== 'CANCELLED' && b.status !== 'REJECTED';

function computeUrgency(startTime: string): 'High' | 'Medium' | 'Low' {
  const hoursUntil = (Date.parse(startTime) - Date.now()) / 3600000;
  if (hoursUntil <= 24) return 'High';
  if (hoursUntil <= 72) return 'Medium';
  return 'Low';
}

function countConflicts(bookings: Booking[]): number {
  const active = bookings.filter(activeOnly);
  let count = 0;
  for (const b of active) {
    const overlaps = active.some(
      (o) =>
        o.id !== b.id &&
        o.equipmentId === b.equipmentId &&
        b.startTime < o.endTime &&
        b.endTime > o.startTime,
    );
    if (overlaps) count += 1;
  }
  return count;
}

function enrichPendingRequest(booking: Booking): PendingRequest {
  const settings = db.getCapacitySettings(booking.equipmentId);
  const others = db
    .getBookings({ equipmentId: booking.equipmentId })
    .filter((b) => b.id !== booking.id);
  const overlapping = checkOverlap(others, booking);
  const violations = validateRestrictions(booking.equipmentId, booking.userInfo.studentId);

  return {
    ...booking,
    urgencyLevel: computeUrgency(booking.startTime),
    hasConflict: overlapping.length >= settings.maxSimultaneousBookings,
    meetsRestrictions: violations.length === 0,
  };
}

export const bookingHandlers = [
  // GET /bookings list with query parameters for returning paginated booking lists
  http.get(`${apiUrl}${endpoints.bookings.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const url = new URL(request.url);
    const equipmentIdFilter = url.searchParams.get('equipmentId') || undefined;
    const statusParam = url.searchParams.get('status');
    const statusFilter = statusParam ? statusParam.toUpperCase() : undefined;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

    const isAdmin = mockUserHasPermission(user, PERMISSIONS.BOOKINGS_LIST);
    const requestedUserId = url.searchParams.get('userId');
    const userIdFilter = isAdmin
      ? requestedUserId
        ? Number(requestedUserId)
        : undefined
      : Number(user.studentId);

    let bookings = db.getBookings({
      userId: userIdFilter,
      equipmentId: equipmentIdFilter,
      from,
      to,
    });

    if (statusFilter) {
      bookings = bookings.filter((b) => b.status === statusFilter);
    }

    const summary = {
      totalPending: bookings.filter((b) => b.status === 'PENDING').length,
      totalApproved: bookings.filter((b) => b.status === 'APPROVED').length,
      totalConflicts: countConflicts(bookings),
    };

    const totalItems = bookings.length;
    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
    const startIndex = (page - 1) * pageSize;
    const paginated = bookings.slice(startIndex, startIndex + pageSize);

    const data =
      statusFilter === 'PENDING' ? paginated.map((b) => enrichPendingRequest(b)) : paginated;

    return HttpResponse.json(
      generateSuccessResponse({
        data,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
        summary,
      }),
    );
  }),

  http.post(`${apiUrl}${endpoints.bookings.create}`, async ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    const body = (await request.json()) as {
      equipmentId: string;
      startTime: string;
      endTime: string;
      purpose: string;
      userNotes?: string;
      joinWaitlist?: boolean;
    };

    const selectedEquipment = mockEquipment.find((e) => e.id === body.equipmentId);
    if (!selectedEquipment) {
      return HttpResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const settings = db.getCapacitySettings(body.equipmentId);

    const violations = validateRestrictions(body.equipmentId, user.studentId);
    if (violations.length > 0) {
      return HttpResponse.json(
        {
          code: 'RESTRICTION_VIOLATED',
          message: 'You do not meet the requirements to book this equipment.',
          violations,
        },
        { status: 403 },
      );
    }

    const { withinCapacity, overlapping } = validateCapacity(
      body.equipmentId,
      body.startTime,
      body.endTime,
      1,
    );

    const startInMinutes = Date.parse(body.startTime);
    const endInMinutes = Date.parse(body.endTime);
    const durationMinutes = Math.round((endInMinutes - startInMinutes) / 60000);
    const bookingId = `bk-${Math.random().toString(36).substring(2, 11)}`;

    const buildBooking = (status: BookingStatus, waitlistPosition?: number): Booking =>
      ({
        id: bookingId,
        userInfo: {
          studentId: user.studentId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        duration: durationMinutes,
        equipmentId: body.equipmentId,
        equipment: selectedEquipment,
        status,
        startTime: body.startTime,
        endTime: body.endTime,
        createdAt: new Date().toISOString(),
        purpose: body.purpose,
        userNotes: body.userNotes || '',
        ...(waitlistPosition !== undefined ? { waitlistPosition } : {}),
      }) as Booking;

    if (!withinCapacity) {
      if (settings.allowWaitlist && body.joinWaitlist) {
        const waitlistPosition = overlapping.length - settings.maxSimultaneousBookings + 1;
        const waitlisted = buildBooking('PENDING', waitlistPosition);
        db.addBooking(waitlisted);
        console.log(
          `[notify] Booking ${waitlisted.id} added to waitlist for ${body.equipmentId} at position ${waitlistPosition}`,
        );
        return HttpResponse.json(generateSuccessResponse({ data: waitlisted }), { status: 201 });
      }

      const alternativeSlots = suggestAlternativeSlots(
        body.equipmentId,
        body.startTime,
        body.endTime,
      );
      return HttpResponse.json(
        {
          code: settings.maxSimultaneousBookings > 1 ? 'CAPACITY_EXCEEDED' : 'BOOKING_CONFLICT',
          message: 'Maximum capacity reached for this time slot.',
          conflictingBookings: overlapping,
          alternativeSlots,
        },
        { status: 409 },
      );
    }

    const initialStatus: BookingStatus = settings.requireAdminApproval ? 'PENDING' : 'APPROVED';
    const newBooking = buildBooking(initialStatus);
    db.addBooking(newBooking);
    console.log(`[notify] Booking ${newBooking.id} created with status ${initialStatus}`);

    return HttpResponse.json(generateSuccessResponse({ data: newBooking }), { status: 201 });
  }),

  // PATCH /bookings/:id used for cancelling a booking
  http.patch(`${apiUrl}${endpoints.bookings.update(':id')}`, async ({ cookies, params }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_UPDATE_STATUS)) {
      return HttpResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const { id } = params;

    const cancelledBooking = db.cancelBooking(id as string);
    if (!cancelledBooking) {
      return HttpResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    return HttpResponse.json(
      generateSuccessResponse({ data: cancelledBooking, message: 'Booking Cancelled' }),
    );
  }),

  // PATCH /admin/bookings/:id/override - force approve or cancel
  http.patch(
    `${apiUrl}${endpoints.bookings.adminOverride(':id')}`,
    async ({ cookies, params, request }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_UPDATE_STATUS)) {
        return HttpResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      const { id } = params;
      const body = (await request.json()) as {
        action?: 'APPROVE' | 'REJECT' | 'CANCEL';
        reason?: string;
      };

      if (body.action !== 'APPROVE' && body.action !== 'REJECT' && body.action !== 'CANCEL') {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: "action must be 'APPROVE', 'REJECT', or 'CANCEL'.",
            },
          },
          { status: 400 },
        );
      }

      const booking = db.overrideBooking(id as string, body.action, body.reason);
      if (!booking) {
        return HttpResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      console.log(
        `[notify] Admin override on ${booking.id}: ${body.action}${body.reason ? ` (${body.reason})` : ''}`,
      );
      console.log(
        `[notify] User ${booking.userInfo.studentId} notified: booking ${booking.status.toLowerCase()} by admin.`,
      );

      return HttpResponse.json(generateSuccessResponse({ data: booking }));
    },
  ),

  // POST /admin/equipment/:id/capacity update capacity limits
  http.post(
    `${apiUrl}${endpoints.bookings.adminCapacity(':equipmentId')}`,
    async ({ cookies, params, request }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_UPDATE_STATUS)) {
        return HttpResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      const { equipmentId } = params;
      const equipmentExists = mockEquipment.find((e) => e.id === equipmentId);
      if (!equipmentExists) {
        return HttpResponse.json({ success: false, error: 'Equipment not found' }, { status: 404 });
      }

      const body = (await request.json()) as Partial<{
        maxSimultaneousBookings: number;
        requireAdminApproval: boolean;
        allowWaitlist: boolean;
        restrictions: { requiresTraining: boolean };
      }>;

      const updated = db.updateCapacitySettings(equipmentId as string, body);

      const active = db.getBookings({ equipmentId: equipmentId as string }).filter(activeOnly);
      const affectedBookings = active.filter((b) => {
        const others = active.filter((o) => o.id !== b.id);
        return checkOverlap(others, b).length + 1 > updated.maxSimultaneousBookings;
      });

      console.log(
        `[notify] Capacity for ${equipmentId} set to ${updated.maxSimultaneousBookings}. ${affectedBookings.length} booking(s) now over capacity.`,
      );

      return HttpResponse.json(
        generateSuccessResponse({ data: { settings: updated, affectedBookings } }),
      );
    },
  ),

  // GET /admin/equipment/:id/restrictions - equipment-specific rules
  http.get(
    `${apiUrl}${endpoints.bookings.adminRestrictions(':equipmentId')}`,
    ({ cookies, params }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_READ)) {
        return HttpResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      const { equipmentId } = params;
      const equipmentExists = mockEquipment.find((e) => e.id === equipmentId);
      if (!equipmentExists) {
        return HttpResponse.json({ success: false, error: 'Equipment not found' }, { status: 404 });
      }

      const settings = db.getCapacitySettings(equipmentId as string);
      return HttpResponse.json(generateSuccessResponse({ data: settings }));
    },
  ),

  // GET/ equipment availability based on timme slot inputted
  http.get(
    `${apiUrl}${endpoints.bookings.availability(':equipmentId')}`,
    async ({ cookies, params }) => {
      const sessionId = cookies['sessionToken'] || '';
      const user = db.validateSession(sessionId);
      if (!user) {
        return createInvalidSessionResponse();
      }

      if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_READ)) {
        return HttpResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      const { equipmentId } = params;

      const equipmentExists = mockEquipment.find((e) => e.id === equipmentId);
      if (!equipmentExists) {
        return HttpResponse.json({ success: false, error: 'Equipment not found' }, { status: 404 });
      }

      // requesting user's own studentId is passed through so the calendar can
      // highlight and label their own bookings without exposing other students'
      // booking purposes (see AvailabilitySlot.isOwnBooking/.purpose)
      const occupiedSlots = db.getEquipmentAvailability(equipmentId as string, user.studentId);

      return HttpResponse.json(
        generateSuccessResponse({
          data: occupiedSlots,
        }),
        { status: 200 },
      );
    },
  ),
];
