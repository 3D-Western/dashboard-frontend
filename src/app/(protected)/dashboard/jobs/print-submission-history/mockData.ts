import { JobDetail } from '@/types/jobs';

export const mockJobs: JobDetail[] = [
  {
    id: '1',
    name: 'Robot Arm Mount',
    description: 'Prototype enclosure',
    category: 'ThreeDPrint',
    dateSubmitted: '2026-06-10',
    status: 'Succeeded',
    comments: 'Printed successfully',
    user: {
      studentId: 1,
      firstName: 'Dev',
      lastName: 'User',
    },
    jobPlaced: '2026-06-10',
    files: [],
  },

  {
    id: '2',
    name: 'Phone Holder',
    description: 'Phone stand',
    category: 'ThreeDPrint',
    dateSubmitted: '2026-06-05',
    status: 'Failed',
    comments: 'Print failed',
    user: {
      studentId: 1,
      firstName: 'Dev',
      lastName: 'User',
    },
    jobPlaced: '2026-06-05',
    files: [],
  },
];
