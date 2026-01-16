import type { Metadata } from 'next';
import { FAQsContent } from './faqs-content';

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Frequently asked questions about 3D Western printing services',
  robots: {
    index: true,
    follow: true,
  },
};

export default function FAQsPage() {
  return <FAQsContent />;
}
