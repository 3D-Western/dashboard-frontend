import type { Metadata } from 'next';
import { Gatekeepers } from '@/components/AccessAdmin/Gatekeepers';

export const metadata: Metadata = {
  title: 'Gatekeepers',
  description: 'Register gatekeepers and rotate their tokens',
};

export default function AdminAccessGatekeepersPage() {
  return <Gatekeepers />;
}
