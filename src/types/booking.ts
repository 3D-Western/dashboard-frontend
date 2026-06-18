export interface UserInfo {
  studentId: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Booking {
    id: string;
    userInfo: UserInfo;
    userId: string;
    duration: number; // how long booking is
    equipmentId: string;
    equipment: Equipment;
    status: BookingStatus;
    startTime: string; // ISO
    endTime: string;  // ISO
    createdAt: string; //ISO STring

}

export interface Equipment {
    category: "ThreeDPrinter" | "LaserCutter" | "CNC";
    status: "Available" | "Maintenance" | "Offline";
    name: string;
    id: string;
}

export type BookingStatus = "Confirmed" | "Pending" | "Cancelled"

export interface BookingRequest {
    equipmentId: string;
    startTime: string; 
    endTime: string;
    userInfo: UserInfo;
}

export interface AvailabillitySlot {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    reason?: "Booked" | "Maintenance" | "Outside-Hours";


}
