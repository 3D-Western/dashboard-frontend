import type { Metadata } from 'next';
import { PrintSubmissionGate } from './components/PrintSubmissionGate';

export const metadata: Metadata = {
  title: 'New 3D Print Job',
  description: 'Create a new 3D printing job',
};

/**
 * The whole print flow is one page that never scrolls (P-200): the flow fills the area under the
 * header, so the page adds no title or padding of its own.
 */
export default function NewPrintJobPage() {
  const mockMode = process.env.MOCK_ENABLED === 'true';

  return <PrintSubmissionGate mockMode={mockMode} />;
}
