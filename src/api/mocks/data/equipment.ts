import { Equipment } from '@/types/booking';

export const mockEquipment: Equipment[] = [
  { id: 'printer-1', name: 'Ultimaker S5 - 01', category: 'ThreeDPrinter', status: 'Available' },
  { id: 'printer-2', name: 'Ultimaker S5 - 02', category: 'ThreeDPrinter', status: 'Available' },
  { id: 'printer-3', name: 'Prusa i3 MK3S - 01', category: 'ThreeDPrinter', status: 'Available' },
  { id: 'printer-4', name: 'Prusa i3 MK3S - 02', category: 'ThreeDPrinter', status: 'Available' },
  { id: 'printer-5', name: 'Formlabs Form 3', category: 'ThreeDPrinter', status: 'Maintenance' },
  { id: 'laser-1', name: 'Epilog Zing 24 - 01', category: 'LaserCutter', status: 'Available' },
  { id: 'laser-2', name: 'Epilog Zing 24 - 02', category: 'LaserCutter', status: 'Available' },
  { id: 'cnc-1', name: 'ShopBot Desktop', category: 'CNC', status: 'Available' },
  { id: 'cnc-2', name: 'Haas Mini Mill', category: 'CNC', status: 'Available' },
];
