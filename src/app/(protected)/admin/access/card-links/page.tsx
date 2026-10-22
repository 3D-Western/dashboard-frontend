import type { Metadata } from 'next';
import { CardLinks } from '@/components/AccessAdmin/CardLinks';

export const metadata: Metadata = {
  title: 'Card Links',
  description: 'See and unlink the cards linked to a student',
};

export default function AdminAccessCardLinksPage() {
  return <CardLinks />;
}
