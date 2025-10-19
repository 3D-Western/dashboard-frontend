export interface User {
  id: number;
  lastName: string;
  firstName: string;
  password: string;
  email: string;
  role: 'admin' | 'user';
  experience: string;
}
