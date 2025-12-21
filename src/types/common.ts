/**
 * Common Types
 * Shared types used across the application
 */

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
