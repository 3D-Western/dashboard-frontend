import {
  createMockPrintJob,
  createMockCompletedPrintJob,
  createMockPendingFileJob,
} from '../../../../test/utils/mockFactories';
import { PrintJob } from '@/types/jobs';

const futureDate = new Date();
futureDate.setHours(futureDate.getHours() + 4);
const mockETA = {
  estimatedCompletionTime: futureDate.toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockPickup = {
  location: 'Engineering Building, Room 101',
  hours: 'Mon-Fri, 9AM - 5PM',
  instructions: 'Please bring your student ID to the front desk.',
};

export const mockPrintJobs = [
  createMockPendingFileJob({
    name: 'Mechanical Keyboard Case',
    category: 'ThreeDPrint',
  }),
  createMockPrintJob({
    name: 'Drone Propeller Guards',
    status: 'InQueue',
    category: 'ThreeDPrint',
    jobETA: mockETA,
  } as unknown as PrintJob),
  createMockPrintJob({
    name: 'Custom Bracket Mount',
    status: 'Printing',
    category: 'ThreeDPrint',
    jobETA: mockETA,
  } as unknown as PrintJob),
  createMockPrintJob({
    name: 'Robotic Arm Base',
    status: 'Ready',
    category: 'ThreeDPrint',
    pickupDetails: mockPickup,
  } as unknown as PrintJob),
  // Print-pipeline jobs: ids are "job-pipeline-*", which pipeline-handlers.ts plays out
  createMockPrintJob({
    id: 'pipeline-review',
    name: 'Phone Stand Bracket',
    status: 'InQueue',
    studentStatus: 'needs_confirmation',
    category: 'ThreeDPrint',
  } as unknown as PrintJob),
  createMockPrintJob({
    id: 'pipeline-pickup',
    name: 'Cable Clip Set',
    status: 'Ready',
    studentStatus: 'ready_for_pickup',
    category: 'ThreeDPrint',
  } as unknown as PrintJob),
  createMockPrintJob({
    id: 'pipeline-cannot',
    name: 'Thin Vase',
    status: 'Failed',
    studentStatus: 'cannot_print',
    category: 'ThreeDPrint',
  } as unknown as PrintJob),
  createMockCompletedPrintJob({
    name: 'Laser Engraved Coasters',
    status: 'Succeeded',
    category: 'LaserCutting',
  }),
  createMockCompletedPrintJob({
    name: 'Waterjet Metal Gear',
    status: 'Failed',
    category: 'Waterjet',
  }),
];
