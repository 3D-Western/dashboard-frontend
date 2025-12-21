import { faker } from '@faker-js/faker';
import { User, UserRole, UserExperienceLevel } from '@/types/user';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { FileMetadata, FileUploadResult } from '@/types/file';

/**
 * Creates a mock User object with realistic data
 *
 * @example
 * ```ts
 * const user = createMockUser({ role: 'admin' });
 * ```
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: faker.number.int({ min: 251000000, max: 251999999 }),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: 'user' as UserRole,
  experienceLevel: 'beginner' as UserExperienceLevel,
  ...overrides,
});

/**
 * Creates a mock admin User
 *
 * @example
 * ```ts
 * const admin = createMockAdmin();
 * ```
 */
export const createMockAdmin = (overrides?: Partial<User>): User =>
  createMockUser({ role: 'admin', experienceLevel: 'advanced', ...overrides });

/**
 * Creates a mock PrintJob object
 *
 * @example
 * ```ts
 * const job = createMockPrintJob({ status: 'IN_QUEUE' });
 * ```
 */
export const createMockPrintJob = (overrides?: Partial<PrintJob>): PrintJob => ({
  kind: 'active-print-job',
  id: faker.string.uuid(),
  studentId: faker.number.int({ min: 251000000, max: 251999999 }),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  status: 'IN_QUEUE' as PrintJobStatus,
  orderPlaced: faker.date.recent().toISOString(),
  stlFile: {
    id: faker.string.uuid(),
    name: `${faker.system.fileName({ extensionCount: 0 })}.stl`,
    path: `/uploads/${faker.string.uuid()}.stl`,
  },
  ...overrides,
});

/**
 * Creates an array of mock PrintJob objects
 *
 * @example
 * ```ts
 * const jobs = createMockPrintJobs(10);
 * ```
 */
export const createMockPrintJobs = (count: number): PrintJob[] =>
  Array.from({ length: count }, () => createMockPrintJob());

/**
 * Creates a mock File object for testing file uploads
 *
 * @example
 * ```ts
 * const file = createMockFile('model.stl', 2048, 'model/stl');
 * ```
 */
export const createMockFile = (name = 'test.stl', size = 1024, type = 'model/stl'): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/**
 * Creates a mock FileMetadata object
 *
 * @example
 * ```ts
 * const fileMetadata = createMockFileMetadata({ filename: 'model.stl' });
 * ```
 */
export const createMockFileMetadata = (overrides?: Partial<FileMetadata>): FileMetadata => ({
  id: faker.string.uuid(),
  filename: `${faker.system.fileName({ extensionCount: 0 })}.stl`,
  size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
  mimeType: 'model/stl',
  uploadedAt: faker.date.recent().toISOString(),
  uploadedBy: {
    studentId: faker.number.int({ min: 251000000, max: 251999999 }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  },
  ...overrides,
});

/**
 * Creates a mock FileUploadResult object
 *
 * @example
 * ```ts
 * const uploadResult = createMockFileUploadResult();
 * ```
 */
export const createMockFileUploadResult = (
  overrides?: Partial<FileUploadResult>,
): FileUploadResult => ({
  id: faker.string.uuid(),
  filename: `${faker.system.fileName({ extensionCount: 0 })}.stl`,
  size: faker.number.int({ min: 1024, max: 10 * 1024 * 1024 }),
  mimeType: 'model/stl',
  uploadedAt: faker.date.recent().toISOString(),
  ...overrides,
});
