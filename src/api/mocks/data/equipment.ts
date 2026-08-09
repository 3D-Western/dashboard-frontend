import { Equipment } from '@/types/booking';

export const mockEquipment: Equipment[] = [
  { id: 'laser-1', name: 'Epilog Zing 24 - 01', category: 'LaserCutter', status: 'Available' },
  { id: 'laser-2', name: 'Epilog Zing 24 - 02', category: 'LaserCutter', status: 'Available' },
  {
    id: 'circuit-1',
    name: 'LPKF ProtoMat S64 - 01',
    category: 'CircuitMachine',
    status: 'Available',
  },
  { id: 'sewing-1', name: 'Brother CS7000X - 01', category: 'SewingMachine', status: 'Available' },
  { id: 'sewing-2', name: 'Brother CS7000X - 02', category: 'SewingMachine', status: 'Available' },
  {
    id: 'soldering-1',
    name: 'Hakko FX-888D - 01',
    category: 'SolderingStation',
    status: 'Available',
  },
  {
    id: 'soldering-2',
    name: 'Hakko FX-888D - 02',
    category: 'SolderingStation',
    status: 'Available',
  },
  { id: 'waterjet-1', name: 'OMAX ProtoMAX - 01', category: 'Waterjet', status: 'Available' },
];
