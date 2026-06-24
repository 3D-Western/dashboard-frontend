import { Booking } from '@/types/booking';
import { mockEquipment } from './equipment';
import { mockUsers } from './users';
import { createMockBooking } from '../../../../test/utils/mockFactories';

const currentUser = mockUsers.find((u) => u.studentId === 251000000) || mockUsers[0];
const equipmentIds = mockEquipment.map((e) => e.id);
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const generatedBookings: Booking[] = [];

for (let i = 1; i <= 3; i++) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + i * 2);
  targetDate.setHours(10 + i, 0, 0, 0);

  const startTime = targetDate.toISOString();
  const endTime = new Date(targetDate.getTime() + 90 * 60000).toISOString();
  const equipmentId = equipmentIds[i % equipmentIds.length];

  generatedBookings.push(
    createMockBooking({
      id: `bk-user-seed-${i}`,
      userInfo: {
        studentId: currentUser.studentId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
      },
      duration: 90,
      equipmentId: equipmentId,
      equipment: mockEquipment.find((e) => e.id === equipmentId)!,
      status: 'Confirmed',
      startTime: startTime,
      endTime: endTime,
    }),
  );
}

for (let i = 0; i < 50; i++) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * 60));
  const startHour = Math.floor(Math.random() * 7) + 9;
  const startMinute = Math.random() > 0.5 ? 0 : 30;
  const durationHalfHours = Math.floor(Math.random() * 5) + 2;
  const durationMinutes = durationHalfHours * 30;

  date.setHours(startHour, startMinute, 0, 0);
  const startTime = date.toISOString();
  const endTime = new Date(date.getTime() + durationMinutes * 60000).toISOString();
  const equipmentId = getRandom(equipmentIds);

  const hasConflict = generatedBookings.some(
    (b) =>
      b.equipmentId === equipmentId &&
      b.status !== 'Cancelled' &&
      startTime < b.endTime &&
      endTime > b.startTime,
  );

  if (hasConflict) continue;

  const randomUser = getRandom(mockUsers);

  generatedBookings.push(
    createMockBooking({
      id: `bk-global-seed-${i}`,
      userInfo: {
        studentId: randomUser.studentId,
        firstName: randomUser.firstName,
        lastName: randomUser.lastName,
        email: randomUser.email,
      },
      duration: durationMinutes,
      equipmentId: equipmentId,
      equipment: mockEquipment.find((e) => e.id === equipmentId)!,
      startTime: startTime,
      endTime: endTime,
    }),
  );
}

export const mockBookings = generatedBookings;
