import { PrintJob, User, FileMetadata } from './types';
import { mockUsers } from '../data/users';
import { mockPrintJobs } from '../data/print-jobs';

class Database {
  private static instance: Database;
  // In-memory storage for users
  private users: Map<number, User> = new Map();
  private sessions: Map<string, number> = new Map(); // sessionId to userId
  private activePrintJobsUserMap: Map<number, PrintJob[]> = new Map(); // userId to PrintJobs
  private activePrintJobsIDMap: Map<string, PrintJob> = new Map(); // printJobId to PrintJob
  private files: Map<string, FileMetadata> = new Map(); // fileId to FileMetadata

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
      this.users.set(user.id, user);
    });

    // Load some initial mock print jobs
    this.users.forEach((user) => {
      const userJobs: PrintJob[] = [];
      this.activePrintJobsUserMap.set(user.id, userJobs);
      mockPrintJobs.forEach((job) => {
        const userJob = { ...job, studentId: user.id, id: `${user.id}-${job.id}` };
        userJobs.push(userJob);
        this.activePrintJobsIDMap.set(userJob.id, userJob);
      });
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

  public getUserById(userId: number): User | null {
    return this.users.get(userId) || null;
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
    return Array.from(this.files.values()).filter(
      (file) => file.uploadedBy === userId,
    );
  }
}

const db = new Database();

Object.freeze(Database);

export default db;
