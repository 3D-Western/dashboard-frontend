import { PrintJob, User, FileMetadata, Invitation, InvitationStatus } from './types';
import { mockUsers } from '../data/users';
import { mockPrintJobs } from '../data/print-jobs';
import { mockInvitations } from '../data/invitations';
import { createMockCompletedPrintJob } from '../../../../test/utils/mockFactories';
import { Booking } from '@/types/booking';
import { mockBookings } from '../data/bookings';

export class Database {
  private static instance: Database;
  // In-memory storage for users
  private users: Map<number, User> = new Map();
  private sessions: Map<string, number> = new Map(); // sessionId to userId
  private mfaChallenges: Map<number, number> = new Map(); // challengeId to userId
  private activePrintJobsUserMap: Map<number, PrintJob[]> = new Map(); // userId to PrintJobs
  private activePrintJobsIDMap: Map<string, PrintJob> = new Map(); // printJobId to PrintJob
  private files: Map<string, FileMetadata> = new Map(); // fileId to FileMetadata
  private invitations: Map<number, Invitation> = new Map(); // invitationId to Invitation
  private nextInvitationId: number = 1;
  private Bookings: Map<string, Booking> = new Map(); // bookingId to Booking

  // Singleton pattern to ensure only one instance of Database exists
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
    this.loadInitialData();
  }

  private loadInitialData() {
    this.users.clear();
    this.activePrintJobsUserMap.clear();
    this.activePrintJobsIDMap.clear();
    this.invitations.clear();
    this.Bookings.clear();
    mockUsers.forEach((user) => {
      this.users.set(user.studentId, user);
      this.activePrintJobsUserMap.set(user.studentId, []);
    });

    const primaryUser = mockUsers[0];

    mockPrintJobs.forEach((job) => {
      const userJob = {
        ...job,
        userId: primaryUser.studentId,
        user: {
          studentId: primaryUser.studentId,
          firstName: primaryUser.firstName,
          lastName: primaryUser.lastName,
          email: primaryUser.email,
        },
        id: `job-${job.id}`,
      };

      this.activePrintJobsIDMap.set(userJob.id, userJob as unknown as PrintJob);
      this.activePrintJobsUserMap.get(primaryUser.studentId)?.push(userJob as unknown as PrintJob);

      mockBookings.forEach((booking) => {
        this.Bookings.set(booking.id, booking);
      });
    });

    const completedJob = createMockCompletedPrintJob({
      id: 'default-completed-job',
      status: 'Succeeded',
      user: {
        studentId: primaryUser.studentId,
        firstName: primaryUser.firstName,
        lastName: primaryUser.lastName,
        email: primaryUser.email,
      },
    });

    this.activePrintJobsIDMap.set(completedJob.id, completedJob as unknown as PrintJob);
    this.activePrintJobsUserMap
      .get(primaryUser.studentId)
      ?.push(completedJob as unknown as PrintJob);

    mockInvitations.forEach((invitation) => {
      this.invitations.set(invitation.id, invitation);
      if (invitation.id >= this.nextInvitationId) {
        this.nextInvitationId = invitation.id + 1;
      }
    });
  }

  public authenticateUser(studentId: number, password: string): User | null {
    const user = this.users.get(studentId);
    if (!user) {
      return null;
    }
    if (user.password !== password) {
      return null;
    }
    return user;
  }

  public createSession(userId: number): string {
    const sessionId = `session-${Math.random().toString(36)}`;
    this.sessions.set(sessionId, userId);
    return sessionId;
  }

  public validateSession(sessionId: string): User | null {
    const userId = this.sessions.get(sessionId);
    if (!userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  public userLogout(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  public createMfaChallenge(challengeId: number, userId: number): void {
    this.mfaChallenges.set(challengeId, userId);
  }

  public validateMfaChallenge(challengeId: number): number | null {
    return this.mfaChallenges.get(challengeId) || null;
  }

  public completeMfaChallenge(challengeId: number): void {
    this.mfaChallenges.delete(challengeId);
  }

  public getPrintJobsByUserId(userId: number): PrintJob[] {
    return this.activePrintJobsUserMap.get(userId) || [];
  }

  public getPrintJobById(printJobId: string): PrintJob | null {
    return this.activePrintJobsIDMap.get(printJobId) || null;
  }

  public updatePrintJobStatus(printJobId: string, status: string): PrintJob | null {
    const job = this.activePrintJobsIDMap.get(printJobId);
    if (!job) {
      return null;
    }
    // Update the job status
    job.status = status as PrintJob['status'];
    return job;
  }

  public addPrintJob(printJob: PrintJob): PrintJob {
    // Add to ID map
    this.activePrintJobsIDMap.set(printJob.id, printJob);

    // Add to user's jobs array
    let userJobs = this.activePrintJobsUserMap.get(printJob.user.studentId);
    if (!userJobs) {
      userJobs = [];
      this.activePrintJobsUserMap.set(printJob.user.studentId, userJobs);
    }
    userJobs.push(printJob);

    return printJob;
  }

  public deletePrintJob(printJobId: string): boolean {
    const job = this.activePrintJobsIDMap.get(printJobId);
    if (!job) {
      return false;
    }
    // Remove from ID map
    this.activePrintJobsIDMap.delete(printJobId);
    // Remove from user's jobs array
    const userJobs = this.activePrintJobsUserMap.get(job.user.studentId);
    if (userJobs) {
      const index = userJobs.findIndex((j) => j.id === printJobId);
      if (index !== -1) {
        userJobs.splice(index, 1);
      }
    }
    return true;
  }

  public getAllPrintJobs(): PrintJob[] {
    return Array.from(this.activePrintJobsIDMap.values());
  }

  public getPrintJobs(filters?: {
    userId?: number;
    status?: string;
    search?: string;
    snapshotCreatedBefore?: string;
  }): PrintJob[] {
    let jobs = Array.from(this.activePrintJobsIDMap.values());

    // Apply snapshot filter (only jobs created before the snapshot)
    if (filters?.snapshotCreatedBefore) {
      jobs = jobs.filter((job) => job.jobPlaced <= filters.snapshotCreatedBefore!);
    }

    // Filter by userId if provided
    if (filters?.userId !== undefined) {
      jobs = jobs.filter((job) => job.user.studentId === filters.userId);
    }

    // Filter by status if provided
    if (filters?.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }

    // Apply search filter (search in name, description, id)
    if (filters?.search) {
      const lowerSearch = filters.search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.name.toLowerCase().includes(lowerSearch) ||
          job.description.toLowerCase().includes(lowerSearch) ||
          job.id.toLowerCase().includes(lowerSearch),
      );
    }

    return jobs;
  }

  public getUserById(userId: number): User | null {
    return this.users.get(userId) || null;
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public saveFile(metadata: FileMetadata): void {
    this.files.set(metadata.id, metadata);
  }

  public getFileById(fileId: string): FileMetadata | null {
    return this.files.get(fileId) || null;
  }

  public getAllFiles(): FileMetadata[] {
    return Array.from(this.files.values());
  }

  public deleteFile(fileId: string): boolean {
    return this.files.delete(fileId);
  }

  public getFilesByUserId(userId: number): FileMetadata[] {
    return Array.from(this.files.values()).filter((file) => file.uploadedBy === userId);
  }

  // Invitation methods
  public getAllInvitations(): Invitation[] {
    return Array.from(this.invitations.values());
  }

  public getInvitations(filters?: {
    studentId?: number;
    email?: string;
    status?: InvitationStatus;
    snapshotCreatedBefore?: string;
  }): Invitation[] {
    let invitations = Array.from(this.invitations.values());

    // Apply snapshot filter
    if (filters?.snapshotCreatedBefore) {
      invitations = invitations.filter((inv) => inv.createdAt <= filters.snapshotCreatedBefore!);
    }

    // Filter by studentId if provided (exact match)
    if (filters?.studentId !== undefined) {
      invitations = invitations.filter((inv) => inv.studentId === filters.studentId);
    }

    // Filter by email if provided (partial match, case-insensitive)
    if (filters?.email) {
      const lowerEmail = filters.email.toLowerCase();
      invitations = invitations.filter((inv) => inv.email.toLowerCase().includes(lowerEmail));
    }

    // Filter by status if provided
    if (filters?.status) {
      invitations = invitations.filter((inv) => inv.status === filters.status);
    }

    // Sort by createdAt descending (newest first)
    invitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return invitations;
  }

  public getInvitationById(invitationId: number): Invitation | null {
    return this.invitations.get(invitationId) || null;
  }

  public createInvitation(data: {
    studentId: number;
    email: string;
    expiresInDays?: number;
    createdByUserId: number;
  }): Invitation {
    const expiresInDays = data.expiresInDays || 7;
    const now = new Date();
    const expiredAt = new Date(now);
    expiredAt.setDate(expiredAt.getDate() + expiresInDays);

    const invitation: Invitation = {
      id: this.nextInvitationId++,
      studentId: data.studentId,
      email: data.email,
      invitationCode: Math.random().toString(36).substring(2, 18),
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiredAt: expiredAt.toISOString(),
      acceptedAt: null,
      createdByUserId: data.createdByUserId,
    };

    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  public revokeInvitation(invitationId: number): Invitation | null {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      return null;
    }

    if (invitation.status !== 'PENDING') {
      return null; // Can only revoke pending invitations
    }

    invitation.status = 'REVOKED';
    return invitation;
  }

  public findInvitationByStudentIdOrEmail(studentId: number, email: string): Invitation | null {
    const invitations = Array.from(this.invitations.values());
    return (
      invitations.find(
        (inv) => inv.status === 'PENDING' && (inv.studentId === studentId || inv.email === email),
      ) || null
    );
  }

  public getBookings(filters?: {
    userId?: number;
    equipmentId?: string;
    from?: string;
    to?: string;
    snapshotCreatedBefore?: string;
  }): Booking[] {
    let bookings = Array.from(this.Bookings.values());

    // Apply snapshot filter (only bookings created before the snapshot)
    if (filters?.snapshotCreatedBefore) {
      bookings = bookings.filter((booking) => booking.startTime <= filters.snapshotCreatedBefore!);
    }

    // Filter by userId if provided
    if (filters?.userId !== undefined) {
      bookings = bookings.filter((booking) => booking.userInfo.studentId === filters.userId);
    }

    // Filter by equipmentId if provided
    if (filters?.equipmentId) {
      bookings = bookings.filter((booking) => booking.equipmentId === filters.equipmentId);
    }

    // Filter by time range
    if (filters?.from) {
      bookings = bookings.filter((booking) => booking.endTime >= filters.from!);
    }
    if (filters?.to) {
      bookings = bookings.filter((booking) => booking.startTime <= filters.to!);
    }

    return bookings;
  }

  // for adding a new booking to the database
  public addBooking(booking: Booking): Booking {
    this.Bookings.set(booking.id, booking);
    return booking;
  }

  // helper function to cheeck if there is an overlap in booking times
  public hasBookingConflict(equipmentId: string, startTime: string, endTime: string): boolean {
    return Array.from(this.Bookings.values()).some((booking) => {
      // check if the booking status is cancelled that way we can keep records of what was cancelled and use the patch method instead of delete
      if (booking.status === 'Cancelled') {
        return false;
      }

      const isSameEquipment = booking.equipmentId === equipmentId;
      const isOverlapping = startTime < booking.endTime && endTime > booking.startTime;
      return isSameEquipment && isOverlapping;
    });
  }

  // helper function for cancelling booking (just updating the status to be Cancelled)
  public cancelBooking(bookingId: string): Booking | null {
    const booking = this.Bookings.get(bookingId);
    if (!booking) {
      return null;
    }
    // Update the job status
    booking.status = 'Cancelled';
    return booking;
  }

  // helper function to get equipment availability
  public getEquipmentAvailability(equipmentId: string) {
    return Array.from(this.Bookings.values())
      .filter((booking) => booking.equipmentId === equipmentId)
      .filter((booking) => booking.status !== 'Cancelled')
      .map((booking) => ({
        startTime: booking.startTime,
        endTime: booking.endTime,
      }));
  }
}

// Use globalThis to persist database instance across HMR reloads
// This prevents state loss during development hot reloads
const db = globalThis.__mockDbInstance ?? new Database();
globalThis.__mockDbInstance = db;

Object.freeze(Database);

export default db;
