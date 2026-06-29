import { useState, useEffect, useCallback } from 'react';
import { bookingAPI } from '@/api/client/booking';
import { Booking, BookingRequest, AvailabilitySlot } from '@/types/booking';
import { BookingsListParams, PaginationMetadata } from '@/types/common';


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
      
      const data = (response as any).data?.data || (response as any).data || [];
      const pageMeta = (response as any).data?.pagination || null;

      setBookings(data);
      setPagination(pageMeta);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings');
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBookings();
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
        
        const data = (response as any).data || response;
        setSlots(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch availability');
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
      return response;
    } catch (err: any) {

// the 409 in the back will be sent when theres a conflicting timeslot or this defautlt message will be passed
      const errorMessage = err.message || 'An error occurred while creating the booking.';
      setError(errorMessage);
      throw err; 
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error };
}