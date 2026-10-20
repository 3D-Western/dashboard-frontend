import type { Metadata } from 'next';
import { BookingDetailClient } from './components/BookingDetailClient';

export const metadata: Metadata = {
  title: 'Reservation Details',
  description: 'View and manage an equipment reservation',
};

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;

  return <BookingDetailClient bookingId={id} />;
}
