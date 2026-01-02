import { User } from '../database/types';

export const mockUsers: User[] = [
  {
    studentId: 251000000,
    lastName: 'Doe',
    firstName: 'John',
    email: 'john.doe@example.com',
    role: 'admin',
    experience: 'advanced',
    password: 'password',
    createdDate: new Date('2024-01-01').toISOString(),
    trainingLevel: 'advanced',
    experienceLevel: 'advanced',
  },
  {
    studentId: 251000001,
    lastName: 'Smith',
    firstName: 'Jane',
    email: 'jane.smith@example.com',
    role: 'user',
    experience: 'beginner',
    password: 'password',
    createdDate: new Date('2024-01-15').toISOString(),
    trainingLevel: 'beginner',
    experienceLevel: 'beginner',
  },
];
