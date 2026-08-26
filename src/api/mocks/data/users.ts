import { User } from '../database/types';

export const mockUsers: User[] = [
  {
    studentId: 251000000,
    lastName: 'Super Admin',
    firstName: 'Dev',
    email: 'super.admin@uwo.ca',
    groups: ['super_admins'],
    experience: 'advanced',
    password: 'password',
    createdDate: new Date('2024-01-01').toISOString(),
    trainingLevel: 'LEVEL_2',
    // HELLO THIS IS FOR NANCY REVIEW
    // removed due to experience level no longer existing
    // experienceLevel: 'Expert',
  },
  {
    studentId: 251000001,
    lastName: 'Admin',
    firstName: 'Dev',
    email: 'admin@uwo.ca',
    groups: ['regular_admins'],
    experience: 'advanced',
    password: 'password',
    createdDate: new Date('2024-01-01').toISOString(),
    trainingLevel: 'LEVEL_2',
    // HELLO THIS IS FOR NANCY REVIEW
    // removed due to experience level no longer being used
    // experienceLevel: 'Expert',
  },
  {
    studentId: 251000002,
    lastName: 'User',
    firstName: 'Dev',
    email: 'user@uwo.ca',
    groups: ['members'],
    experience: 'beginner',
    password: 'password',
    createdDate: new Date('2024-01-15').toISOString(),
    trainingLevel: 'LEVEL_1',
    // HELLO THIS IS FOR NANCY REVIEW
    // flagged but not removed because it breaks multiple other files
    experienceLevel: 'Novice',
  },
];
