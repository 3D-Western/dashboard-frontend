import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { createMockUser } from '@test/utils/mockFactories';
import AuthLayout from './layout';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

vi.mock('@/lib/auth', () => ({
  validateSession: vi.fn(),
}));

describe('AuthLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a logged-in member to the dashboard', async () => {
    (validateSession as Mock).mockResolvedValue(createMockUser());

    await expect(AuthLayout({ children: <div /> })).rejects.toThrow('REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the page when there is no session', async () => {
    (validateSession as Mock).mockResolvedValue(null);

    await expect(AuthLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ['the backend rejects the session', new ApiError(ErrorCodes.USER_NOT_FOUND)],
    ['the backend is down', new ApiError(ErrorCodes.REQUEST_FAILED)],
  ])('still shows the page when %s', async (_, error) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (validateSession as Mock).mockRejectedValue(error);

    await expect(AuthLayout({ children: <div /> })).resolves.toBeTruthy();

    expect(redirect).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
