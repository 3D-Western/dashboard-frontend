export interface UserInfo {
  studentId: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Booking {
  id: string;
  userInfo: UserInfo;
  duration: number; // how long booking is
  equipmentId: string;
  equipment: Equipment;
  status: BookingStatus;
  startTime: string; // ISO
  endTime: string; // ISO
  createdAt: string; //ISO String

  //added due to president saying chance of booking from organization
  organizationId?: string;
  purpose: string;
  userNotes?: string;
}

export interface Equipment {
  category: 'ThreeDPrinter' | 'LaserCutter' | 'CNC';
  status: 'Available' | 'Maintenance' | 'Offline';
  name: string;
  id: string;
}

export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';

export interface BookingRequest {
  equipmentId: string;
  startTime: string;
  endTime: string;
  userInfo: UserInfo;
  purpose: string;
  userNotes?: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  capacity: number;
  remainingSlots: number;
  reason?: 'Booked' | 'Maintenance' | 'Outside-Hours';
}
