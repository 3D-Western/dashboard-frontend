import { useState, useEffect, useCallback } from 'react';
import { bookingAPI } from '@/api/client/booking';
import { Booking, BookingRequest, AvailabilitySlot } from '@/types/booking';
import { BookingsListParams, PaginationMetadata, PaginatedResponse } from '@/types/common';

// Global event bus or simple listener tracker to sync mutations across hooks if needed
let globalRefetchTriggers: (() => void)[] = [];

// Hook for filtered or paginated list of all bookings for frontend
export function useBookings(params?: BookingsListParams) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingAPI.listAllBookings(params);
      const typedResponse = response as PaginatedResponse<Booking> | Booking[];
      let data: Booking[] = [];
      let pageMeta: PaginationMetadata | null = null;

      if (Array.isArray(typedResponse)) {
        data = typedResponse;
      } else if (typedResponse && typedResponse.data) {
        data = typedResponse.data;
        pageMeta = typedResponse.pagination || null;
      }

      setBookings(data);
      setPagination(pageMeta);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bookings';
      setError(errorMessage);
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBookings();

    globalRefetchTriggers.push(fetchBookings);
    return () => {
      globalRefetchTriggers = globalRefetchTriggers.filter(fn => fn !== fetchBookings);
    };
  }, [fetchBookings]);

  return { bookings, pagination, isLoading, error, refetch: fetchBookings };
}

// hook for checking availability @ time for equipment x
export function useAvailability(equipmentId?: string, from?: string, to?: string) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!equipmentId || !from || !to) return;

    const fetchAvailability = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await bookingAPI.checkAvailability(equipmentId, from, to);
        const typedResponse = response as { data?: AvailabilitySlot[] } | AvailabilitySlot[];
        const data = Array.isArray(typedResponse) ? typedResponse : typedResponse.data || [];

        setSlots(data);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch availability';
        setError(errorMessage);
        console.error('Error fetching availability:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [equipmentId, from, to]);

  return { slots, isLoading, error };
}

// hook for making new booking
export function useCreateBooking() {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (payload: BookingRequest) => {
    setIsPending(true);
    setError(null);

    try {
      const response = await bookingAPI.createBooking(payload);
      
      // TRIGGER REFETCH ACROSS ALL ACTIVE BOOKING HOOKS INSTANTLY
      globalRefetchTriggers.forEach(refetchFn => refetchFn());

      return response;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while creating the booking.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error };
}