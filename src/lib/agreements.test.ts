import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ApiError } from '@/api/client/errors';
import { trainingAPI } from '@/api/client/training';
import { createAgreement } from '@test/utils/trainingFactories';
import { AGREEMENTS_TIMEOUT_MS, loadPendingAgreements } from './agreements';

vi.mock('@/api/client/training', () => ({
  trainingAPI: { getPendingAgreements: vi.fn() },
}));

const pending = trainingAPI.getPendingAgreements as Mock;

beforeEach(() => vi.clearAllMocks());

describe('loadPendingAgreements', () => {
  it('returns what the API returns', async () => {
    const agreements = [createAgreement()];
    pending.mockResolvedValue(agreements);

    expect(await loadPendingAgreements()).toEqual(agreements);
  });

  it('gives the request a timeout signal', async () => {
    pending.mockResolvedValue([]);

    await loadPendingAgreements();

    const options = pending.mock.calls[0][0] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(AGREEMENTS_TIMEOUT_MS).toBe(3000);
  });

  it('fails open and logs loudly when the call fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pending.mockRejectedValue(new ApiError('REQUEST_FAILED'));

    expect(await loadPendingAgreements()).toEqual([]);

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('FAILING OPEN'),
      expect.any(ApiError),
    );
    consoleError.mockRestore();
  });

  it('fails open and logs loudly on a timeout', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pending.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

    expect(await loadPendingAgreements()).toEqual([]);

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('stays quiet when there is simply no session', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    pending.mockRejectedValue(new ApiError('SESSION_INVALID'));

    expect(await loadPendingAgreements()).toEqual([]);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
