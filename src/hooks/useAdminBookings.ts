import { useState, useEffect, useCallback, useRef } from 'react';
import { bookingAPI } from '@/api/client/booking';
import { Booking, PendingRequest } from '@/types/booking';
import { BookingsListParams, PaginationMetadata } from '@/types/common';

type AdminListResponse = {
  data?: Booking[];
  pagination?: PaginationMetadata;
  summary?: { totalPending: number; totalApproved: number; totalConflicts: number };
};

type BookingListState = {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
};

export function useAdminBookings(params?: BookingsListParams) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [summary, setSummary] = useState<AdminListResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const status = params?.status;
  const page = params?.page;
  const pageSize = params?.pageSize;
  const startTime = params?.startTime;
  const endTime = params?.endTime;
  const equipmentId = params?.equipmentId;

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requestParams = { status, page, pageSize, startTime, endTime, equipmentId };
      
      const response = (await bookingAPI.listAllBookings(requestParams)) as AdminListResponse | Booking[];
      if (Array.isArray(response)) {
        setBookings(response);
        setPagination(null);
        setSummary(null);
      } else {
        setBookings(response.data ?? []);
        setPagination(response.pagination ?? null);
        setSummary(response.summary ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  }, [status, page, pageSize, startTime, endTime, equipmentId]);

  useEffect(() => {
    const runFetch = async () => {
      await fetchBookings();
    };
    runFetch();
  }, [fetchBookings]);

  return { bookings, setBookings, pagination, summary, isLoading, error, refetch: fetchBookings };
}

export function usePendingRequests(pollIntervalMs = 10000) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const response = await bookingAPI.listPendingRequests();
      const data = response.data ?? [];
      setRequests(data);
      setCount(data.length);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending requests');
    }
  }, []);

  useEffect(() => {
    const runFetch = async () => {
      await fetchPending();
    };
    runFetch();
    timerRef.current = setInterval(fetchPending, pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchPending, pollIntervalMs]);

  return { requests, count, error, refetch: fetchPending };
}

export function useApproveBooking() {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (bookingId: string, list?: BookingListState) => {
    setIsPending(true);
    setError(null);

    const snapshot = list?.bookings;
    if (list) {
      list.setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'APPROVED' } : b)),
      );
    }

    try {
      const response = await bookingAPI.overrideBooking(bookingId, { action: 'APPROVE' });
      return response;
    } catch (err: unknown) {
      if (list && snapshot) list.setBookings(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to approve booking');
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { approve, isPending, error };
}

export function useRejectBooking() {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reject = async (bookingId: string, reason: string, list?: BookingListState) => {
    setIsPending(true);
    setError(null);

    const snapshot = list?.bookings;
    if (list) {
      list.setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'REJECTED', rejectReason: reason } : b,
        ),
      );
    }

    try {
      const response = await bookingAPI.overrideBooking(bookingId, { action: 'REJECT', reason });
      return response;
    } catch (err: unknown) {
      if (list && snapshot) list.setBookings(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to reject booking');
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return { reject, isPending, error };
}

export function useBulkAction() {
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (
    bookingIds: string[],
    action: 'APPROVE' | 'REJECT' | 'CANCEL',
    reason?: string,
  ): Promise<{ succeeded: string[]; failed: string[] }> => {
    setIsPending(true);
    setError(null);
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of bookingIds) {
      try {
        await bookingAPI.overrideBooking(id, { action, reason });
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }

    setIsPending(false);
    if (failed.length > 0) {
      setError(`${failed.length} of ${bookingIds.length} actions failed`);
    }
    return { succeeded, failed };
  };

  return { run, isPending, error };
}