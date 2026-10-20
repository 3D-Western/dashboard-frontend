import { describe, it, expect, vi, type Mock } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { VideoPreview } from './VideoPreview';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getStepPlaybackUrl: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { getStepPlaybackUrl: Mock };

describe('VideoPreview', () => {
  it('asks for a link only when the button is pressed, then shows the player', async () => {
    api.getStepPlaybackUrl.mockResolvedValue({
      url: 'https://storage.test/videos/a.mp4?sig=1',
      expiresAt: '2026-10-20T13:00:00Z',
      durationSeconds: 120,
    });
    render(<VideoPreview versionId={100} stepId={11} />);
    expect(api.getStepPlaybackUrl).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /preview the uploaded video/i }));

    const video = await screen.findByLabelText('Video preview');
    expect(video).toHaveAttribute('src', 'https://storage.test/videos/a.mp4?sig=1');
    expect(api.getStepPlaybackUrl).toHaveBeenCalledWith(100, 11);
  });

  it('can load a fresh link', async () => {
    api.getStepPlaybackUrl
      .mockResolvedValueOnce({
        url: 'https://storage.test/one',
        expiresAt: 'x',
        durationSeconds: 1,
      })
      .mockResolvedValueOnce({
        url: 'https://storage.test/two',
        expiresAt: 'x',
        durationSeconds: 1,
      });
    render(<VideoPreview versionId={100} stepId={11} />);
    await userEvent.click(screen.getByRole('button', { name: /preview/i }));
    await screen.findByLabelText('Video preview');

    await userEvent.click(screen.getByRole('button', { name: /fresh link/i }));

    expect(await screen.findByLabelText('Video preview')).toHaveAttribute(
      'src',
      'https://storage.test/two',
    );
  });

  it('says why there is nothing to play', async () => {
    api.getStepPlaybackUrl.mockRejectedValue(
      new ApiError(
        'CONFLICT',
        'The video file was not found in storage. The upload may not have finished',
      ),
    );
    render(<VideoPreview versionId={100} stepId={11} />);

    await userEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(await screen.findByText(/not found in storage/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Video preview')).not.toBeInTheDocument();
  });

  it('says so when the player cannot play the link', async () => {
    api.getStepPlaybackUrl.mockResolvedValue({
      url: 'https://storage.test/x',
      expiresAt: 'x',
      durationSeconds: 1,
    });
    render(<VideoPreview versionId={100} stepId={11} />);
    await userEvent.click(screen.getByRole('button', { name: /preview/i }));

    fireEvent.error(await screen.findByLabelText('Video preview'));

    expect(await screen.findByText(/link may have expired/i)).toBeInTheDocument();
  });
});
