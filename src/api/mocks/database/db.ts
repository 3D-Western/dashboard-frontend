import { PrintJob, User } from './types';
import { mockUsers } from '../data/users';
import { mockPrintJobs } from '../data/print-jobs';

class Database {
  private static instance: Database;
  // In-memory storage for users
  private users: Map<number, User> = new Map();
  private sessions: Map<string, number> = new Map(); // sessionId to userId
  private activePrintJobsUserMap: Map<number, PrintJob[]> = new Map(); // userId to PrintJobs
  private activePrintJobsIDMap: Map<string, PrintJob> = new Map(); // printJobId to PrintJob

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
}

const db = new Database();

Object.freeze(Database);

export default db;
