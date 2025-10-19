import { User } from '../database/types';

export const mockUsers: User[] = [
  {
    id: 25000000,
    lastName: 'Doe',
    firstName: 'John',
    email: 'john.doe@example.com',
    role: 'admin',
    experience: 'advanced',
    password: 'password',
  },
  {
    id: 25000001,
    lastName: 'Smith',
    firstName: 'Jane',
    email: 'jane.smith@example.com',
    role: 'user',
    experience: 'beginner',
    password: 'password',
  },
];
