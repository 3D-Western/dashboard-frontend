/**
 * Common Types
 * Shared types used across the application
 */

import { BookingStatus } from './booking';

/**
 * Generic pagination metadata
 * Used for paginated API responses
 */
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  snapshotCreatedBefore: string;
}

/**
 * Generic paginated response wrapper
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Base pagination parameters
 * Common query parameters for paginated list endpoints
 */
export interface BasePaginationParams {
  page?: number;
  pageSize?: number;
  snapshotCreatedBefore?: string;
}

/**
 * Job list query parameters
 * Used for fetching paginated list of jobs
 */
export interface JobListParams extends BasePaginationParams {
  userId?: number;
  status?: string;
  search?: string;
}

/**
 * User list query parameters
 * Used for fetching paginated list of users
 */
export interface UserListParams extends BasePaginationParams {
  search?: string;
  status?: string;
  trainingLevel?: string;
}

export interface CurrentUserJobListParams extends BasePaginationParams {
  status?: string;
  search?: string;
}

/**
 * Booking List Query Parameters
 * Used for fetching paginated list of bookings
 *
 */
export interface BookingsListParams extends BasePaginationParams {
  userId?: number;
  equipmentId?: string;
  startTime?: string;
  endTime?: string;
  status?: BookingStatus;
}
