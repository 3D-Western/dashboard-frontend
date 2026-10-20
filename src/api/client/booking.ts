import { BookingsListParams, PaginatedResponse } from '@/types/common';
import { endpoints } from './endpoints';
import { getBaseUrl } from './utils';
import { apiRequest } from './base';
import { PrintBookingListResponse, CreateBookingResponse } from '../types';
import {
  Booking,
  BookingRequest,
  AvailabilitySlot,
  CapacitySettings,
  PendingRequest,
} from '@/types/booking';

export const bookingAPI = {
  // client wrapper for listing all bookings
  listAllBookings: async (params?: BookingsListParams, options?: RequestInit) => {
    const searchParams = new URLSearchParams();

    if (params?.userId !== undefined) {
      searchParams.append('userId', params.userId.toString());
    }
    if (params?.equipmentId !== undefined) {
      searchParams.append('equipmentId', params.equipmentId);
    }
    if (params?.status !== undefined) {
      searchParams.append('status', params.status);
    }
    if (params?.hasConflict !== undefined) {
      searchParams.append('hasConflict', params.hasConflict.toString());
    }
    if (params?.startTime !== undefined) {
      searchParams.append('from', params.startTime);
    }

    if (params?.endTime !== undefined) {
      searchParams.append('to', params.endTime);
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
    const url = `${getBaseUrl()}${endpoints.bookings.list}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<PrintBookingListResponse>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // client wrapper for listing pending requests
  listPendingRequests: async (options?: RequestInit) => {
    const searchParams = new URLSearchParams({ status: 'PENDING' });
    const url = `${getBaseUrl()}${endpoints.bookings.list}?${searchParams.toString()}`;

    return apiRequest<PaginatedResponse<PendingRequest>>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // client wrapper for creating bookings
  createBooking: async (payload: BookingRequest, options?: RequestInit) => {
    return apiRequest<CreateBookingResponse>(`${getBaseUrl()}${endpoints.bookings.create}`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(payload),
      ...options,
    });
  },

  // client wrapper for getting booking by id
  getBookingById: async (bookingId: string, options?: RequestInit) => {
    return apiRequest<Booking>(`${getBaseUrl()}${endpoints.bookings.byId(bookingId)}`, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // client wrapper for cancelling a booking
  cancelBooking: async (bookingId: string, options?: RequestInit) => {
    return apiRequest<{ success: boolean }>(
      `${getBaseUrl()}${endpoints.bookings.byId(bookingId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
        ...options,
      },
    );
  },

  //client wrapper fOR checking availability
  checkAvailability: async (
    equipmentId: string,
    startTime: string,
    endTime: string,
    options?: RequestInit,
  ) => {
    const searchParams = new URLSearchParams();

    searchParams.append('from', startTime);
    searchParams.append('to', endTime);

    const queryString = searchParams.toString();
    const url = `${getBaseUrl()}${endpoints.bookings.availability(equipmentId)}${queryString ? `?${queryString}` : ''}`;

    return apiRequest<AvailabilitySlot[]>(url, {
      method: 'GET',
      credentials: 'include',
      ...options,
    });
  },

  // client wrapper for admin force approve/cancel
  overrideBooking: async (
    bookingId: string,
    payload: { action: 'APPROVE' | 'REJECT' | 'CANCEL'; reason?: string },
    options?: RequestInit,
  ) => {
    return apiRequest<{ data: Booking }>(
      `${getBaseUrl()}${endpoints.bookings.adminOverride(bookingId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        ...options,
      },
    );
  },

  // client wrapper for updating equipment capacity limits
  updateCapacity: async (
    equipmentId: string,
    payload: Partial<CapacitySettings>,
    options?: RequestInit,
  ) => {
    return apiRequest<{ data: { settings: CapacitySettings; affectedBookings: Booking[] } }>(
      `${getBaseUrl()}${endpoints.bookings.adminCapacity(equipmentId)}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        ...options,
      },
    );
  },

  // client wrapper for reading equipment-specific rules
  getEquipmentRestrictions: async (equipmentId: string, options?: RequestInit) => {
    return apiRequest<{ data: CapacitySettings }>(
      `${getBaseUrl()}${endpoints.bookings.adminRestrictions(equipmentId)}`,
      {
        method: 'GET',
        credentials: 'include',
        ...options,
      },
    );
  },
};
