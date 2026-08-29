import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { CertificateAcquiredNote } from '@/app/(protected)/dashboard/settings/components/CertificateAcquiredNote';

describe('CertificateAcquiredNote Integration', () => {
  it('renders the certificate acquired text with the correct aria-label', () => {
    render(<CertificateAcquiredNote />);

    const note = screen.getByText('Certificate Acquired');
    expect(note).toBeInTheDocument();
    expect(note).toHaveAttribute('aria-label', 'Certificate acquired');
  });
});
