import type { Metadata } from 'next';
import { EquipmentManager } from '@/components/TrainingAdmin/EquipmentManager';

export const metadata: Metadata = {
  title: 'Training Equipment',
  description: 'Equipment groups and machines that trainings cover',
};

export default function AdminTrainingEquipmentPage() {
  return <EquipmentManager />;
}
