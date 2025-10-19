import { User } from '@/types/user';

export interface ApiResponseError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponseRaw<T> {
  success: boolean;
  data: T;
  error?: ApiResponseError;
}

export interface ApiGetCurrentSessionResponse {
  user: User | null;
}

export interface ApiLoginResponse {
  sessionToken: string;
}
