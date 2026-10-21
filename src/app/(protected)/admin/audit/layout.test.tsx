import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import AdminAuditLayout from './layout';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

describe('/admin/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to the training audit log', () => {
    expect(() => AdminAuditLayout({ children: null })).toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin/training/audit-log');
  });
});
