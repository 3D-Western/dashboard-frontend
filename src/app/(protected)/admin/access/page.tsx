import type { Metadata } from 'next';
import { LiveView } from '@/components/AccessAdmin/LiveView';

export const metadata: Metadata = {
  title: 'Access System',
  description: 'Who is checked in and which machines are running',
};

export default function AdminAccessPage() {
  return <LiveView />;
}
