import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateSession } from './auth';
import { sessionApi } from '@/api/client/session';
import { createMockUser } from '@test/utils/mockFactories';

vi.mock('@/api/client/session', () => ({
  sessionApi: {
    current: vi.fn(),
  },
}));

const sessionApiMock = sessionApi as unknown as { current: ReturnType<typeof vi.fn> };

describe('validateSession', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the user from sessionApi.current', async () => {
    const mockUser = createMockUser();
    sessionApiMock.current.mockResolvedValue({ user: mockUser });

    const result = await validateSession();

    expect(result).toEqual(mockUser);
    expect(sessionApiMock.current).toHaveBeenCalledOnce();
  });

  it('returns null when sessionApi.current returns no user', async () => {
    sessionApiMock.current.mockResolvedValue({ user: null });

    const result = await validateSession();

    expect(result).toBeNull();
  });

  it('propagates errors from sessionApi.current (backend down scenario)', async () => {
    sessionApiMock.current.mockRejectedValue(new Error('Network error'));

    await expect(validateSession()).rejects.toThrow('Network error');
  });
});
