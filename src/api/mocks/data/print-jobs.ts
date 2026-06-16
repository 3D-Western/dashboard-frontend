import { createMockPrintJob, createMockCompletedPrintJob, createMockPendingFileJob } from '../../../../test/utils/mockFactories';

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
  } as any), 
  createMockPrintJob({
    name: 'Custom Bracket Mount',
    status: 'Printing',
    category: 'ThreeDPrint',
    jobETA: mockETA, 
  } as any),
  createMockPrintJob({
    name: 'Robotic Arm Base',
    status: 'Ready',
    category: 'ThreeDPrint',
    pickupDetails: mockPickup, 
  } as any),
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