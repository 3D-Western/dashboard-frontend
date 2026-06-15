import type { Database } from '@/api/mocks/database/db';

declare global {
  var __mockDbInstance: Database | undefined;
}

export {};
