import { ProjectTypeLimit } from '@/types/usage';

export const mockAccountLimits: ProjectTypeLimit[] = [
  { projectType: 'ThreeDPrint', limit: 5, period: 'month' },
  { projectType: 'LaserCutting', limit: 3, period: 'month' },
  { projectType: 'CNC', limit: 2, period: 'month' },
  { projectType: 'Waterjet', limit: -1, period: 'month' }, // unlimited
];
