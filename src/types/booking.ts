import { PaginationMetadata } from './common';

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
  // added
  rejectReason?: string;
  overrideReason?: string;
  waitlistPosition?: number;
}

export interface Equipment {
  category: EquipmentCategory;
  status: 'Available' | 'Maintenance' | 'Offline';
  name: string;
  id: string;
}

// Booking equipment categories are intentionally separate from JobCategory (src/types/jobs.ts) -
// the two features cover different equipment (e.g. Circuit/sewing/soldering aren't job-submittable,
// and 3D printing/CNC aren't bookable), so they shouldn't share a type even where labels overlap.
export type EquipmentCategory =
  | 'LaserCutter'
  | 'CircuitMachine'
  | 'SewingMachine'
  | 'SolderingStation'
  | 'Waterjet';

// extended to fit sprint
export type BookingStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'CANCELLED';

export interface BookingRequest {
  equipmentId: string;
  startTime: string;
  endTime: string;
  userInfo: UserInfo;
  purpose: string;
  userNotes?: string;
  // added
  joinWaitlist?: boolean;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  capacity: number;
  remainingSlots: number;
  reason?: 'Booked' | 'Maintenance' | 'Outside-Hours';
  // Only set for the requesting user's own booking - lets the calendar highlight it
  // and show its purpose without exposing other students' booking reasons.
  isOwnBooking?: boolean;
  purpose?: string;
  // Set when merging availability across multiple equipment (the "All Equipment"
  // calendar view) so each event can show which machine/category it belongs to.
  equipmentLabel?: string;
}

// all types below this message are newly added
export interface PendingRequest extends Booking {
  status: 'PENDING' | BookingStatus;
  urgencyLevel: 'High' | 'Medium' | 'Low';
  hasConflict: boolean;
  meetsRestrictions: boolean;
}

export interface AdminBookingListResponse {
  data: Booking[];
  pagination: PaginationMetadata;
  summary: {
    totalPending: number;
    totalApproved: number;
    totalConflicts: number;
  };
}

export interface CapacitySettings {
  equipmentId: string;
  maxSimultaneousBookings: number;
  requireAdminApproval: boolean;
  allowWaitlist: boolean;
  restrictions: {
    requiresTraining: boolean;
  };
}

export interface AlternativeSlot {
  startTime: string;
  endTime: string;
  availableCapacity: number;
}

export interface RestrictionViolation {
  rule: 'TrainingRequired';
  message: string;
}

// 409 Error Response
export interface ConflictResponse {
  code: 'BOOKING_CONFLICT' | 'CAPACITY_EXCEEDED' | 'RESTRICTION_VIOLATED';
  message: string;
  conflictingBookings?: Booking[];
  alternativeSlots?: AlternativeSlot[];
  violations?: RestrictionViolation[];
}
