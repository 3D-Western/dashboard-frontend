import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTrainingLevel } from './useTraining';
import { trainingAPI } from '@/api/client/training';

vi.mock('@/api/client/training', () => ({
  trainingAPI: {
    getTrainingLevel: vi.fn(),
    updateTrainingLevel: vi.fn(),
  },
}));

describe('useTrainingLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and populates the training level on mount', async () => {
    (trainingAPI.getTrainingLevel as Mock).mockResolvedValue({ trainingLevel: 'LEVEL_1' });

    const { result } = renderHook(() => useTrainingLevel());

    await waitFor(() => {
      expect(result.current.trainingLevel).toBe('LEVEL_1');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('toggles from LEVEL_1 to LEVEL_2', async () => {
    (trainingAPI.getTrainingLevel as Mock)
      .mockResolvedValueOnce({ trainingLevel: 'LEVEL_1' })
      .mockResolvedValueOnce({ trainingLevel: 'LEVEL_2' });
    (trainingAPI.updateTrainingLevel as Mock).mockResolvedValue({ trainingLevel: 'LEVEL_2' });

    const { result } = renderHook(() => useTrainingLevel());

    await waitFor(() => {
      expect(result.current.trainingLevel).toBe('LEVEL_1');
    });

    await act(async () => {
      await result.current.toggleLevel();
    });

    expect(trainingAPI.updateTrainingLevel).toHaveBeenCalledWith('LEVEL_2');
    expect(result.current.trainingLevel).toBe('LEVEL_2');
    expect(result.current.isToggling).toBe(false);
  });

  it('toggles from LEVEL_2 to LEVEL_1', async () => {
    (trainingAPI.getTrainingLevel as Mock)
      .mockResolvedValueOnce({ trainingLevel: 'LEVEL_2' })
      .mockResolvedValueOnce({ trainingLevel: 'LEVEL_1' });
    (trainingAPI.updateTrainingLevel as Mock).mockResolvedValue({ trainingLevel: 'LEVEL_1' });

    const { result } = renderHook(() => useTrainingLevel());

    await waitFor(() => {
      expect(result.current.trainingLevel).toBe('LEVEL_2');
    });

    await act(async () => {
      await result.current.toggleLevel();
    });

    expect(trainingAPI.updateTrainingLevel).toHaveBeenCalledWith('LEVEL_1');
    expect(result.current.trainingLevel).toBe('LEVEL_1');
  });

  it('sets isToggling while the update request is in flight', async () => {
    (trainingAPI.getTrainingLevel as Mock).mockResolvedValue({ trainingLevel: 'LEVEL_1' });
    let resolveUpdate: (value: { trainingLevel: string }) => void = () => {};
    (trainingAPI.updateTrainingLevel as Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    const { result } = renderHook(() => useTrainingLevel());

    await waitFor(() => {
      expect(result.current.trainingLevel).toBe('LEVEL_1');
    });

    let togglePromise!: Promise<void>;
    act(() => {
      togglePromise = result.current.toggleLevel();
    });

    await waitFor(() => {
      expect(result.current.isToggling).toBe(true);
    });

    resolveUpdate({ trainingLevel: 'LEVEL_2' });
    await act(async () => {
      await togglePromise;
    });

    expect(result.current.isToggling).toBe(false);
  });

  it('surfaces an error when the update request fails, without clobbering the last known level', async () => {
    (trainingAPI.getTrainingLevel as Mock).mockResolvedValue({ trainingLevel: 'LEVEL_1' });
    (trainingAPI.updateTrainingLevel as Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTrainingLevel());

    await waitFor(() => {
      expect(result.current.trainingLevel).toBe('LEVEL_1');
    });

    await act(async () => {
      await result.current.toggleLevel();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.trainingLevel).toBe('LEVEL_1');
    expect(result.current.isToggling).toBe(false);
  });
});
