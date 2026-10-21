import type { Metadata } from 'next';
import { Devices } from '@/components/AccessAdmin/Devices';

export const metadata: Metadata = {
  title: 'Access Devices',
  description: 'Kiosks, card readers and smart plugs',
};

export default function AdminAccessDevicesPage() {
  return <Devices />;
}
