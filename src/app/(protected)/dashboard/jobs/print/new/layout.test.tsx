import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import NewPrintJobLayout from './layout';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

describe('/dashboard/jobs/print/new', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('opens the print flow while job creation is on', () => {
    NewPrintJobLayout({ children: null });

    expect(redirect).not.toHaveBeenCalled();
  });

  it('goes back to My Jobs when job creation is switched off', () => {
    vi.stubEnv('NEXT_PUBLIC_JOB_CREATION_ENABLED', 'false');

    expect(() => NewPrintJobLayout({ children: null })).toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/dashboard/jobs');
  });
});
