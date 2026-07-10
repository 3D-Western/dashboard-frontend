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

const apiUrl = process.env.API_URL;

export const bookingHandlers = [
  // GET /bookings list with query parameters for returning paginated booking lists
  http.get(`${apiUrl}${endpoints.bookings.list}`, ({ cookies, request }) => {
    const sessionId = cookies['sessionToken'] || '';
    const user = db.validateSession(sessionId);
    if (!user) {
      return createInvalidSessionResponse();
    }

    // written to match shape of booking
    const url = new URL(request.url);
    const equipmentIdFilter = url.searchParams.get('equipmentId');
    let finalUserIdFilter = url.searchParams.get('userId');

    if (!mockUserHasPermission(user, PERMISSIONS.BOOKINGS_LIST)) {
      finalUserIdFilter = String(user.studentId);
    }

    let bookings = Array.from(db.getBookings());

    if (finalUserIdFilter) {
      bookings = bookings.filter((b) => String(b.userInfo.studentId) === finalUserIdFilter);
    }
    if (equipmentIdFilter) {
      bookings = bookings.filter((b) => b.equipmentId === equipmentIdFilter);
    }

    // Pagination logic could be applied here in the future using page/pageSize

    return HttpResponse.json(generateSuccessResponse({ data: bookings }));
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
      userNotes: string;
    };

    const bookingId = `bk-${Math.random().toString(36).substring(2, 11)}`;
    const hasConflict = db.hasBookingConflict(body.equipmentId, body.startTime, body.endTime);

    const selectedEquipment = mockEquipment.find((e) => e.id === body.equipmentId);

    if (!selectedEquipment) {
      return HttpResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    if (hasConflict) {
      return HttpResponse.json({ error: 'This time slot is already reserved.' }, { status: 409 });
    }

    const startInMinutes = Date.parse(body.startTime);
    const endInMinutes = Date.parse(body.endTime);
    const durationMinutes = Math.round((endInMinutes - startInMinutes) / 60000);

    const newBooking = {
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
      status: 'APPROVED' as const,
      startTime: body.startTime,
      endTime: body.endTime,
      createdAt: new Date().toISOString(),
      purpose: body.purpose,
      userNotes: body.userNotes,
    };
    db.addBooking(newBooking);

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

      const occupiedSlots = db.getEquipmentAvailability(equipmentId as string);

      return HttpResponse.json(
        generateSuccessResponse({
          data: occupiedSlots,
        }),
        { status: 200 },
      );
    },
  ),
];
