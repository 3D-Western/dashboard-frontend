import { faker } from '@faker-js/faker';
import { User, UserRole, UserExperienceLevel } from '@/types/user';
import { PrintJob, PrintJobStatus } from '@/types/jobs';
import { FileMetadata, FileUploadResult } from '@/types/file';
import { Invitation, InvitationStatus } from '@/types/invitation';
import { UserResponse } from '@/api/types';

/**
 * Creates a mock User object with realistic data
 *
 * @example
 * ```ts
 * const user = createMockUser({ role: 'admin' });
 * ```
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  studentId: faker.number.int({ min: 251000000, max: 251999999 }),
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
 * Creates a mock UserResponse object (backend format)
 *
 * @example
 * ```ts
 * const userResponse = createMockUserResponse({ status: 'Admin' });
 * ```
 */
export const createMockUserResponse = (overrides?: Partial<UserResponse>): UserResponse => ({
  studentId: faker.number.int({ min: 251000000, max: 251999999 }),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  status: 'User', // Backend format: "Admin" or "User"
  ...overrides,
});

/**
 * Creates a mock PrintJob object
 *
 * @example
 * ```ts
 * const job = createMockPrintJob({ status: 'IN_QUEUE' });
 * ```
 */
export const createMockPrintJob = (overrides?: Partial<PrintJob>): PrintJob => {
  const studentId = faker.number.int({ min: 251000000, max: 251999999 });
  return {
    kind: 'active-print-job',
    id: faker.string.uuid(),
    user: {
      studentId,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
    },
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    status: 'InQueue' as PrintJobStatus,
    orderPlaced: faker.date.recent().toISOString(),
    ...overrides,
  };
};

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

/**
 * Creates a mock Invitation object with realistic data
 *
 * @example
 * ```ts
 * const invitation = createMockInvitation({ status: 'PENDING' });
 * ```
 */
export const createMockInvitation = (overrides?: Partial<Invitation>): Invitation => {
  const createdAt = faker.date.recent({ days: 7 });
  const expiredAt = new Date(createdAt);
  expiredAt.setDate(expiredAt.getDate() + 7);

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    studentId: faker.number.int({ min: 251000000, max: 251999999 }),
    email: faker.internet.email({ provider: 'uwo.ca' }),
    invitationCode: faker.string.alphanumeric(16),
    status: 'PENDING' as InvitationStatus,
    createdAt: createdAt.toISOString(),
    expiredAt: expiredAt.toISOString(),
    acceptedAt: null,
    createdBy: {
      studentId: faker.number.int({ min: 251000000, max: 251999999 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    },
    ...overrides,
  };
};

/**
 * Creates a mock pending Invitation
 *
 * @example
 * ```ts
 * const pendingInvitation = createMockPendingInvitation();
 * ```
 */
export const createMockPendingInvitation = (overrides?: Partial<Invitation>): Invitation =>
  createMockInvitation({ status: 'PENDING', acceptedAt: null, ...overrides });

/**
 * Creates a mock accepted Invitation
 *
 * @example
 * ```ts
 * const acceptedInvitation = createMockAcceptedInvitation();
 * ```
 */
export const createMockAcceptedInvitation = (overrides?: Partial<Invitation>): Invitation => {
  const createdAt = faker.date.recent({ days: 14 });
  const acceptedAt = new Date(createdAt);
  acceptedAt.setDate(acceptedAt.getDate() + 2);

  return createMockInvitation({
    status: 'ACCEPTED',
    createdAt: createdAt.toISOString(),
    acceptedAt: acceptedAt.toISOString(),
    ...overrides,
  });
};

/**
 * Creates a mock expired Invitation
 *
 * @example
 * ```ts
 * const expiredInvitation = createMockExpiredInvitation();
 * ```
 */
export const createMockExpiredInvitation = (overrides?: Partial<Invitation>): Invitation => {
  const createdAt = faker.date.recent({ days: 30 });
  const expiredAt = new Date(createdAt);
  expiredAt.setDate(expiredAt.getDate() - 1); // Already expired

  return createMockInvitation({
    status: 'EXPIRED',
    createdAt: createdAt.toISOString(),
    expiredAt: expiredAt.toISOString(),
    acceptedAt: null,
    ...overrides,
  });
};

/**
 * Creates a mock revoked Invitation
 *
 * @example
 * ```ts
 * const revokedInvitation = createMockRevokedInvitation();
 * ```
 */
export const createMockRevokedInvitation = (overrides?: Partial<Invitation>): Invitation =>
  createMockInvitation({ status: 'REVOKED', acceptedAt: null, ...overrides });

/**
 * Creates an array of mock Invitation objects
 *
 * @example
 * ```ts
 * const invitations = createMockInvitations(10);
 * ```
 */
export const createMockInvitations = (count: number): Invitation[] =>
  Array.from({ length: count }, () => createMockInvitation());
