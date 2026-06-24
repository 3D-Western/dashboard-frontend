// src/api/client/booking.test.ts
import { describe, it, expect } from 'vitest';
import { bookingAPI } from './booking';
import { mockServer } from '../mocks';
import { http, HttpResponse } from 'msw';
import { getBaseUrl } from './utils';
import { endpoints } from './endpoints';
import { createMockBooking } from '@test/utils/mockFactories';
import { ApiError } from './errors';
import { mockUsers } from '../mocks/data/users';
import { Booking } from '@/types/booking';

// helper function for checking if a cancelled bookking shows as cancelled
function isCancelledBooking(booking: Booking): boolean {
  return booking.status === 'Cancelled';
}

describe('bookingAPI', () => {
  const baseUrl = getBaseUrl();
  const createMockPagination = () => ({
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    snapshotCreatedBefore: new Date().toISOString(),
  });

  describe('listAllBookings', () => {
    it('returns Bookings array when successful', async () => {
      const mockBookings = [
        createMockBooking({ equipmentId: 'printer-1' }),
        createMockBooking({ equipmentId: 'printer-2' }),
      ];

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.list}`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              data: mockBookings,
              pagination: createMockPagination(),
            },
          });
        }),
      );

      const result = await bookingAPI.listAllBookings();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].equipmentId).toBe('printer-1');
    });

    it('handles query parameters correctly (equipmentId, userId, startTime, endTime)', async () => {
      let requestUrl: string | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
          });
        }),
      );

      await bookingAPI.listAllBookings({
        userId: 123,
        equipmentId: 'printer-1',
        startTime: '2026-06-20T12:00:00.000Z',
        endTime: '2026-06-20T13:00:00.000Z',
        page: 2,
        pageSize: 20,
        snapshotCreatedBefore: '2024-01-01',
      });

      const url = new URL(requestUrl!);
      expect(url.searchParams.get('userId')).toBe('123');
      expect(url.searchParams.get('equipmentId')).toBe('printer-1');
      expect(url.searchParams.get('from')).toBe('2026-06-20T12:00:00.000Z');
      expect(url.searchParams.get('to')).toBe('2026-06-20T13:00:00.000Z');
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('pageSize')).toBe('20');
      expect(url.searchParams.get('snapshotCreatedBefore')).toBe('2024-01-01');
    });

    it('omits undefined query parameters', async () => {
      let requestUrl: string | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.list}`, ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
          });
        }),
      );

      await bookingAPI.listAllBookings({ userId: 123 });

      expect(requestUrl).toContain('userId=123');
      expect(requestUrl).not.toContain('startTime=');
      expect(requestUrl).not.toContain('endTime=');
      expect(requestUrl).not.toContain('page=');
      expect(requestUrl).not.toContain('pageSize=');
    });

    it('includes credentials in request', async () => {
      let requestCredentials: RequestCredentials | undefined;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.list}`, ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            success: true,
            data: {
              data: [],
              pagination: createMockPagination(),
            },
          });
        }),
      );

      await bookingAPI.listAllBookings();
      expect(requestCredentials).toBe('include');
    });

    it('handles network errors', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.list}`, () => {
          return HttpResponse.error();
        }),
      );

      await expect(bookingAPI.listAllBookings()).rejects.toThrow();
    });
  });

  describe('createBooking', () => {
    it('creates Booking successfully with required fields', async () => {
      const mockResponse = createMockBooking({ equipmentId: 'printer-1' });

      mockServer.use(
        http.post(`${baseUrl}${endpoints.bookings.create}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockResponse,
          });
        }),
      );

      const result = await bookingAPI.createBooking({
        equipmentId: 'printer-1',
        startTime: '2026-06-25T10:00:00.000Z',
        endTime: '2026-06-25T12:00:00.000Z',
        userInfo: {
          studentId: 251000000,
          firstName: 'Dev',
          lastName: 'Admin',
          email: 'admin@uwo.ca',
        },
      });

      expect(result.id).toBeDefined();
      expect(result.status).toContain('Confirmed');
      expect(result.startTime).toContain(mockResponse.startTime);
      expect(result.endTime).toContain(mockResponse.endTime);
    });

    it('sends correct request body with optional fields', async () => {
      let requestBody: Record<string, unknown> | null = null;

      const data = {
        equipmentId: 'printer-1',
        startTime: '2026-06-25T10:00:00.000Z',
        endTime: '2026-06-25T11:00:00.000Z',
        userInfo: {
          studentId: mockUsers[0].studentId,
          firstName: mockUsers[0].firstName,
          lastName: mockUsers[0].lastName,
          email: mockUsers[0].email,
        },
      };

      mockServer.use(
        http.post(`${baseUrl}${endpoints.bookings.create}`, async ({ request }) => {
          requestBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: {
              success: true,
              data: createMockBooking(data),
            },
          });
        }),
      );
      await bookingAPI.createBooking(data);
      expect(requestBody).toEqual(data);
    });

    it('handles booking conflict error', async () => {
      mockServer.use(
        http.post(`${baseUrl}${endpoints.bookings.create}`, () => {
          return HttpResponse.json(
            {
              error: {
                code: 'BOOKING_CONFLICT',
                message: 'This time slot is already reserved.',
              },
            },
            { status: 409 },
          );
        }),
      );
      const data = {
        equipmentId: 'printer-1',
        startTime: '2026-06-25T10:00:00.000Z',
        endTime: '2026-06-25T11:00:00.000Z',
        userInfo: {
          studentId: mockUsers[0].studentId,
          firstName: mockUsers[0].firstName,
          lastName: mockUsers[0].lastName,
          email: mockUsers[0].email,
        },
      };
      await expect(bookingAPI.createBooking(data)).rejects.toThrow(ApiError);
    });
  });

  describe('getBookingbyID', () => {
    it('should fetch a single booking by ID successfully', async () => {
      const mockBooking = createMockBooking({ equipmentId: 'printer-1' });
      const bookingId = mockBooking.id;

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.byId(bookingId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockBooking,
          });
        }),
      );

      const response = await bookingAPI.getBookingById(bookingId);

      expect(response).toBeDefined();
      expect(response.id).toBe(bookingId);
      expect(response.status).toBeDefined();
      expect(response.createdAt).toBeDefined();
    });

    it('should fetch a cancelled booking by ID', async () => {
      const bookingId = 'booking-id-101';
      const mockCancelledBooking = createMockBooking({ id: bookingId, status: 'Cancelled' });

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.byId(bookingId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: mockCancelledBooking,
          });
        }),
      );

      const response = await bookingAPI.getBookingById(bookingId);

      // 1. Assert basic structure
      expect(response.id).toBe(bookingId);
      expect(response.status).toBe('Cancelled');

      // 2. Safely access status-specific data
      if (isCancelledBooking(response)) {
        expect(response.status).toBe('Cancelled');
      }
    });

    it('should handle request options (like AbortSignal)', async () => {
      const controller = new AbortController();
      const bookingId = 'booking-id-101';
      const mockBooking = createMockBooking({ id: bookingId });

      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.byId(bookingId)}`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              ...mockBooking,
            },
          });
        }),
      );

      const requestPromise = bookingAPI.getBookingById(bookingId, {
        signal: controller.signal,
      });

      expect(requestPromise).toBeInstanceOf(Promise);
      await expect(requestPromise).resolves.toBeDefined();
    });

    it('throws 404 when the booking is not found', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.byId('non-existent-id')}`, () => {
          return HttpResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
        }),
      );

      await expect(bookingAPI.getBookingById('non-existent-id')).rejects.toThrow();
    });
  });

  describe('checkAvailability', () => {
    const startTime = '2026-06-25T10:00:00.000Z';
    const endTime = '2026-06-25T11:00:00.000Z';

    it('returns an array of occupied time slots', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.availability('printer-1')}`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                startTime: startTime,
                endTime: endTime,
              },
            ],
          });
        }),
      );

      const result = await bookingAPI.checkAvailability('printer-1', startTime, endTime);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(startTime);
    });

    it('throws 404 if the equipment ID does not exist', async () => {
      mockServer.use(
        http.get(`${baseUrl}${endpoints.bookings.availability('fake-equipment')}`, () => {
          return HttpResponse.json(
            { success: false, error: 'Equipment not found' },
            { status: 404 },
          );
        }),
      );

      await expect(
        bookingAPI.checkAvailability('fake-equipment', startTime, endTime),
      ).rejects.toThrow();
    });
  });
});
