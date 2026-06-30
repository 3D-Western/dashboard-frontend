import { faker } from '@faker-js/faker';
import { User, UserExperienceLevel, UserPermission } from '@/types/user';
import type { IamGroup } from '@/types/iam';
import { PrintJob, PrintJobStatus, CompletedPrintJob, ETA, StatusHistory } from '@/types/jobs';
import { FileMetadata, FileUploadResult } from '@/types/file';
import { Invitation, InvitationStatus } from '@/types/invitation';
import { UserResponse, GroupResponse } from '@/api/types';
import { Booking, BookingStatus } from '@/types/booking';
import { mockEquipment } from '@/api/mocks/data/equipment';

export const perm = (key: string, scopeKey = 'any'): UserPermission => ({ key, scopeKey });

const MOCK_GROUP_MEMBERS: IamGroup = {
  id: 1,
  groupKey: 'members',
  name: 'Members',
  description: 'Default member group',
  isSystem: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const MOCK_GROUP_SUPER_ADMINS: IamGroup = {
  id: 2,
  groupKey: 'super_admins',
  name: 'Super Admins',
  description: 'Full access group',
  isSystem: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Creates a mock User object with realistic data
 *
 * @example
 * ```ts
 * const user = createMockUser({ groups: [MOCK_GROUP_SUPER_ADMINS] });
 * ```
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  studentId: faker.number.int({ min: 251000000, max: 251999999 }),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  groups: [MOCK_GROUP_MEMBERS],
  permissions: [],
  experienceLevel: 'beginner' as UserExperienceLevel,
  ...overrides,
});

/**
 * Creates a mock admin User (member of super_admins group)
 *
 * @example
 * ```ts
 * const admin = createMockAdmin();
 * ```
 */
export const createMockAdmin = (overrides?: Partial<User>): User =>
  createMockUser({ groups: [MOCK_GROUP_SUPER_ADMINS], experienceLevel: 'advanced', ...overrides });

/**
 * Creates a mock UserResponse object (backend format)
 *
 * @example
 * ```ts
 * const userResponse = createMockUserResponse();
 * ```
 */
export const createMockUserResponse = (overrides?: Partial<UserResponse>): UserResponse => ({
  studentId: faker.number.int({ min: 251000000, max: 251999999 }),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  ...overrides,
});

/**
 * Creates mock GroupResponse objects for the given groups
 */
export const createMockGroupResponses = (groups: IamGroup[]): GroupResponse[] =>
  groups.map((g) => ({
    id: g.id,
    groupKey: g.groupKey,
    name: g.name,
    description: g.description,
    isSystem: g.isSystem,
    isActive: g.isActive,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));

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

  const status = overrides?.status || ('InQueue' as PrintJobStatus);

  const statusHistory: StatusHistory[] = [
    {
      status: 'InQueue',
      changedAt: faker.date.recent({ days: 3 }).toISOString(),
      comments: 'Job submitted',
    },
  ];

  if (status === 'Printing' || status === 'Ready' || status === 'Succeeded') {
    statusHistory.push({
      status: 'Printing',
      changedAt: faker.date.recent({ days: 1 }).toISOString(),
    });
  }

  if (status === 'Ready') {
    statusHistory.push({
      status: 'Ready',
      changedAt: new Date().toISOString(),
      comments: 'Ready for pickup at front desk',
    });
  }

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
    category: 'ThreeDPrint',
    status,
    jobPlaced: faker.date.recent().toISOString(),

    // for job detail
    comments: 'Mocked comment history from MSW',
    filepath: '/some/filepath/print-file.stl',
    formAnswersJson: JSON.stringify({ material: 'PLA', color: 'Black' }),
    dateSubmitted: faker.date.recent().toISOString(),

    // for status history
    statusHistory,

    // for ETA
    ...((status === 'Printing' || status === 'InQueue') && {
      eta: {
        estimatedCompletionTime: faker.date.soon({ days: 2 }).toISOString(),
        updatedAt: new Date().toISOString(),
      } as ETA,
    }),

    // for pickup
    ...(status === 'Ready' && {
      pickupDetails: {
        location: 'Western Engineering Spencer Engineering Building, Room 50',
        hours: '9:00 AM - 4:30 PM (Mon-Fri)',
        instructions:
          'Please bring your Western Student ID Card to verify ownership before picking up your 3D asset.',
      },
    }),

    ...overrides,
  } as PrintJob;
};

export const createMockCompletedPrintJob = (
  overrides?: Partial<CompletedPrintJob>,
): CompletedPrintJob => {
  const job = createMockPrintJob({ status: 'Succeeded', ...overrides } as Partial<PrintJob>);

  return {
    ...job,
    kind: 'completed-print-job',
    status: overrides?.status || 'Succeeded',
    jobFinished: new Date().toISOString(),
    ...overrides,
  } as CompletedPrintJob;
};

export const createMockPendingFileJob = (overrides?: Partial<PrintJob>): PrintJob => {
  return createMockPrintJob({
    status: 'PendingFile',
    ...overrides,
  });
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

/**
 * Creates a mock Booking
 *
 * @example
 * ```ts
 * const booking = createMockBooking({ status: 'CANCELED' });
 * ```
 */
export const createMockBooking = (overrides?: Partial<Booking>): Booking => {
  const startTime = faker.date.soon({ days: 14 });
  const durationMinutes = faker.helpers.arrayElement([30, 60, 90, 120]);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const equipment = faker.helpers.arrayElement(mockEquipment);

  return {
    id: `bk-${faker.string.alphanumeric(9)}`,
    userInfo: {
      studentId: faker.number.int({ min: 10000, max: 990000 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
    },
    duration: durationMinutes,
    equipmentId: equipment.id,
    equipment: equipment,
    status: 'Confirmed' as BookingStatus,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    createdAt: faker.date.recent({ days: 3 }).toISOString(),
    purpose:  faker.lorem.sentence(), 
    userNotes: faker.lorem.sentence(),
    ...overrides,
  };
};
