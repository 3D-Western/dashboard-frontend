import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { VideoPreview } from './VideoPreview';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getStepPlaybackUrl: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { getStepPlaybackUrl: Mock };

describe('VideoPreview', () => {
  it('asks for a link only when the button is pressed, then hands it over', async () => {
    api.getStepPlaybackUrl.mockResolvedValue({
      url: 'https://storage.test/videos/a.mp4?sig=1',
      expiresAt: '2026-10-20T13:00:00Z',
      durationSeconds: 120,
    });
    const onUrl = vi.fn();
    render(<VideoPreview versionId={100} stepId={11} onUrl={onUrl} />);
    expect(api.getStepPlaybackUrl).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /preview the uploaded video/i }));

    expect(api.getStepPlaybackUrl).toHaveBeenCalledWith(100, 11);
    expect(onUrl).toHaveBeenCalledWith('https://storage.test/videos/a.mp4?sig=1');
  });

  it('offers a fresh link once one has been loaded', async () => {
    api.getStepPlaybackUrl.mockResolvedValue({
      url: 'https://storage.test/two',
      expiresAt: 'x',
      durationSeconds: 1,
    });
    const onUrl = vi.fn();
    render(<VideoPreview versionId={100} stepId={11} onUrl={onUrl} loaded />);

    await userEvent.click(screen.getByRole('button', { name: /fresh link/i }));

    expect(onUrl).toHaveBeenCalledWith('https://storage.test/two');
  });

  it('says why there is nothing to play', async () => {
    api.getStepPlaybackUrl.mockRejectedValue(
      new ApiError(
        'CONFLICT',
        'The video file was not found in storage. The upload may not have finished',
      ),
    );
    const onUrl = vi.fn();
    render(<VideoPreview versionId={100} stepId={11} onUrl={onUrl} />);

    await userEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(await screen.findByText(/not found in storage/i)).toBeInTheDocument();
    expect(onUrl).not.toHaveBeenCalled();
  });
});
