import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateSession } from './auth';
import { sessionApi } from '@/api/client/session';
import { cookies } from 'next/headers';
import { createMockUser } from '@test/utils/mockFactories';

vi.mock('@/api/client/session', () => ({
  sessionApi: {
    current: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const sessionApiMock = sessionApi as unknown as { current: ReturnType<typeof vi.fn> };
const cookiesMock = cookies as unknown as ReturnType<typeof vi.fn>;

describe('validateSession server-side cookie forwarding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('passes cookieHeader when sessionToken exists', async () => {
    vi.stubGlobal('window', undefined as unknown as Window);

    const cookieStore = {
      get: vi.fn((name: string) => {
        if (name === 'sessionToken') return { value: 'server-token' };
        return undefined;
      }),
    };
    cookiesMock.mockResolvedValue(cookieStore);

    const mockUser = createMockUser();
    sessionApiMock.current.mockResolvedValue({ user: mockUser });

    const result = await validateSession();

    expect(result).toEqual(mockUser);
    expect(sessionApiMock.current).toHaveBeenCalledWith({
      cookieHeader: 'sessionToken=server-token',
    });
  });

  it('omits cookieHeader when no sessionToken exists', async () => {
    vi.stubGlobal('window', undefined as unknown as Window);

    const cookieStore = { get: vi.fn(() => undefined) };
    cookiesMock.mockResolvedValue(cookieStore);

    sessionApiMock.current.mockResolvedValue({ user: null });

    const result = await validateSession();

    expect(result).toBeNull();
    expect(sessionApiMock.current).toHaveBeenCalledWith({ cookieHeader: undefined });
  });
});
