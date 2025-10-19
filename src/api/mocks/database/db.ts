import { User } from './types';
import { mockUsers } from '../data/users';

class Database {
  private static instance: Database;
  // In-memory storage for users
  private users: Map<number, User> = new Map();
  private sessions: Map<string, number> = new Map(); // sessionId to userId

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
  }

  public userLogin(userId: number, password: string) {
    if (!this.users.has(userId)) {
      throw new Error('User not found');
    }
    const user = this.users.get(userId)!;
    if (user.password !== password) {
      throw new Error('Invalid password');
    }

    const sessionId = `session-${Date.now()}-${userId}`;
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
}

const db = new Database();

Object.freeze(Database);

export default db;
