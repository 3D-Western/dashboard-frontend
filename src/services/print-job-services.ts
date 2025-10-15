import { PrintJob } from '@/types/jobs';

export async function getPrintJobs(): Promise<PrintJob[]> {
  return [
    {
      id: '123456',
      studentId: 123456,
      orderPlaced: '2023-10-01T10:00:00Z',
      description: 'A cool 3D print',
      name: 'CoolPrint1',
      status: 'IN_QUEUE',
      stlFile: { id: 'file123', path: '/files/coolprint1.stl' },
      kind: 'active-print-job',
    },
    {
      id: '789012',
      studentId: 123456,
      orderPlaced: '2023-10-02T11:30:00Z',
      description: 'Another cool 3D print',
      name: 'CoolPrint2',
      status: 'PRINTING',
      stlFile: { id: 'file456', path: '/files/coolprint2.stl' },
      kind: 'active-print-job',
    },
    {
      id: '345678',
      studentId: 123456,
      orderPlaced: '2023-10-03T14:15:00Z',
      description: 'Yet another cool 3D print',
      name: 'CoolPrint3',
      status: 'READY',
      stlFile: { id: 'file789', path: '/files/coolprint3.stl' },
      kind: 'active-print-job',
    },
    {
      id: '901234',
      studentId: 123456,
      orderPlaced: '2023-10-04T09:45:00Z',
      description: 'A flagged 3D print',
      name: 'FlaggedPrint',
      status: 'FLAGGED',
      stlFile: { id: 'file101', path: '/files/flaggedprint.stl' },
      kind: 'active-print-job',
    },
    {
      id: '567890',
      studentId: 123456,
      orderPlaced: '2023-10-05T16:20:00Z',
      description: 'A failed 3D print',
      name: 'FailedPrint',
      status: 'ERROR',
      stlFile: { id: 'file112', path: '/files/failedprint.stl' },
      kind: 'active-print-job',
    },
  ];
}
