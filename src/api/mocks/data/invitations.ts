import { Invitation } from '../database/types';

// Helper to generate random invitation code
const generateInvitationCode = () => {
  return Math.random().toString(36).substring(2, 18);
};

// Helper to add days to a date
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const now = new Date();
const oneWeekAgo = addDays(now, -7);
const twoWeeksAgo = addDays(now, -14);
const oneWeekFromNow = addDays(now, 7);
const yesterday = addDays(now, -1);

export const mockInvitations: Invitation[] = [
  {
    id: 1,
    studentId: 251100001,
    email: 'alice123@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'PENDING',
    createdAt: oneWeekAgo.toISOString(),
    expiredAt: oneWeekFromNow.toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000, // Admin John Doe
  },
  {
    id: 2,
    studentId: 251100002,
    email: 'bob456@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'ACCEPTED',
    createdAt: twoWeeksAgo.toISOString(),
    expiredAt: oneWeekAgo.toISOString(),
    acceptedAt: addDays(twoWeeksAgo, 2).toISOString(),
    createdByUserId: 251000000,
  },
  {
    id: 3,
    studentId: 251100003,
    email: 'charlie789@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'EXPIRED',
    createdAt: twoWeeksAgo.toISOString(),
    expiredAt: yesterday.toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000,
  },
  {
    id: 4,
    studentId: 251100004,
    email: 'diana101@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'REVOKED',
    createdAt: oneWeekAgo.toISOString(),
    expiredAt: oneWeekFromNow.toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000,
  },
  {
    id: 5,
    studentId: 251100005,
    email: 'edward202@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'PENDING',
    createdAt: addDays(now, -3).toISOString(),
    expiredAt: addDays(now, 4).toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000,
  },
  {
    id: 6,
    studentId: 251100006,
    email: 'fiona303@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'PENDING',
    createdAt: addDays(now, -1).toISOString(),
    expiredAt: addDays(now, 6).toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000,
  },
  {
    id: 7,
    studentId: 251100007,
    email: 'george404@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'ACCEPTED',
    createdAt: addDays(now, -10).toISOString(),
    expiredAt: addDays(now, -3).toISOString(),
    acceptedAt: addDays(now, -8).toISOString(),
    createdByUserId: 251000000,
  },
  {
    id: 8,
    studentId: 251100008,
    email: 'helen505@uwo.ca',
    invitationCode: generateInvitationCode(),
    status: 'PENDING',
    createdAt: now.toISOString(),
    expiredAt: addDays(now, 7).toISOString(),
    acceptedAt: null,
    createdByUserId: 251000000,
  },
];
