import { PrintJob, User, FileMetadata, Invitation, InvitationStatus } from './types';
import { mockUsers } from '../data/users';
import { mockPrintJobs } from '../data/print-jobs';
import { mockInvitations } from '../data/invitations';

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

  // Singleton pattern to ensure only one instance of Database exists
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
    this.loadInitialData();
  }

  private loadInitialData() {
    // Load some initial mock users
    mockUsers.forEach((user) => {
      this.users.set(user.studentId, user);
    });

    // Load some initial mock print jobs
    this.users.forEach((user) => {
      const userJobs: PrintJob[] = [];
      this.activePrintJobsUserMap.set(user.studentId, userJobs);
      mockPrintJobs.forEach((job) => {
        const userJob = {
          ...job,
          userId: user.studentId,
          user: {
            studentID: user.studentId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          },
          id: `${user.studentId}-${job.id}`,
        };
        userJobs.push(userJob);
        this.activePrintJobsIDMap.set(userJob.id, userJob);
      });
    });

    // Load initial mock invitations
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
    let userJobs = this.activePrintJobsUserMap.get(printJob.studentId);
    if (!userJobs) {
      userJobs = [];
      this.activePrintJobsUserMap.set(printJob.studentId, userJobs);
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
    const userJobs = this.activePrintJobsUserMap.get(job.studentId);
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
      jobs = jobs.filter((job) => job.orderPlaced <= filters.snapshotCreatedBefore!);
    }

    // Filter by userId if provided
    if (filters?.userId !== undefined) {
      jobs = jobs.filter((job) => job.studentId === filters.userId);
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
}

// Use globalThis to persist database instance across HMR reloads
// This prevents state loss during development hot reloads
const db = globalThis.__mockDbInstance ?? new Database();
globalThis.__mockDbInstance = db;

Object.freeze(Database);

export default db;
