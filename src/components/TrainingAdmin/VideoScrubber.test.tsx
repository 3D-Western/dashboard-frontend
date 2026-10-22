import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoScrubber, type ScrubberMarker } from './VideoScrubber';

/** happy-dom does not play media, so the element's state is driven from the test. */
function controlVideo(video: HTMLVideoElement, duration = 120) {
  const state = { duration, currentTime: 0, paused: true };
  Object.defineProperty(video, 'duration', { configurable: true, get: () => state.duration });
  Object.defineProperty(video, 'paused', { configurable: true, get: () => state.paused });
  Object.defineProperty(video, 'currentTime', {
    configurable: true,
    get: () => state.currentTime,
    set: (value: number) => {
      state.currentTime = value;
    },
  });
  video.play = vi.fn(() => {
    state.paused = false;
    fireEvent.play(video);
    return Promise.resolve();
  });
  video.pause = vi.fn(() => {
    state.paused = true;
    fireEvent.pause(video);
  });
  return {
    state,
    loaded: () => fireEvent.loadedMetadata(video),
    at: (seconds: number) => {
      state.currentTime = seconds;
      fireEvent.timeUpdate(video);
    },
  };
}

function setup(
  markers: ScrubberMarker[] = [],
  props: Partial<React.ComponentProps<typeof VideoScrubber>> = {},
) {
  const handlers = {
    onSelect: vi.fn(),
    onAddHere: vi.fn(),
    onRemove: vi.fn(),
    onDuration: vi.fn(),
  };
  render(
    <VideoScrubber
      src="blob:local"
      markers={markers}
      selectedUid={null}
      {...handlers}
      {...props}
    />,
  );
  const video = screen.getByLabelText('Video preview') as HTMLVideoElement;
  const control = controlVideo(video);
  return { video, control, ...handlers };
}

describe('VideoScrubber adding a question at a moment', () => {
  it('cannot add a question until the video has said how long it is', () => {
    setup();

    expect(screen.getByRole('button', { name: /add question here/i })).toBeDisabled();
    expect(screen.getByRole('slider', { name: 'Video position' })).toBeDisabled();
  });

  it('adds a question at the whole second the video is at', async () => {
    const { control, onAddHere, onDuration } = setup();
    control.loaded();
    control.at(95.7);

    await userEvent.click(screen.getByRole('button', { name: /add question here/i }));

    expect(onAddHere).toHaveBeenCalledWith(95);
    expect(onDuration).toHaveBeenCalledWith(120);
    expect(screen.getByText('1:35 / 2:00')).toBeInTheDocument();
  });

  it('will not put two questions on the same second', () => {
    const { control } = setup([{ uid: 1, at: 95 }]);
    control.loaded();
    control.at(95.2);

    const button = screen.getByRole('button', { name: /already at 1:35/i });
    expect(button).toBeDisabled();
  });

  it('scrubbing the slider moves the video, and the arrows nudge it by a second', async () => {
    const { control } = setup();
    control.loaded();

    fireEvent.change(screen.getByRole('slider', { name: 'Video position' }), {
      target: { value: '45' },
    });
    expect(control.state.currentTime).toBe(45);

    await userEvent.click(screen.getByRole('button', { name: 'Forward 1 second' }));
    expect(control.state.currentTime).toBe(46);
    await userEvent.click(screen.getByRole('button', { name: 'Back 1 second' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back 1 second' }));
    expect(control.state.currentTime).toBe(44);
  });

  it('plays and pauses', async () => {
    const { video, control } = setup();
    control.loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(video.play).toHaveBeenCalled();

    await userEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    expect(video.pause).toHaveBeenCalled();
  });

  it('says so when the video cannot be played', () => {
    const { video } = setup();

    fireEvent.error(video);

    expect(screen.getByRole('alert')).toHaveTextContent(/could not be played/i);
  });
});

describe('VideoScrubber markers on the timeline', () => {
  const markers: ScrubberMarker[] = [
    { uid: 1, at: 30 },
    { uid: 2, at: 95 },
    { uid: 3, at: null },
  ];

  it('shows a marker at each question, positioned along the timeline', () => {
    const { control } = setup(markers);
    control.loaded();

    const first = screen.getByRole('button', { name: 'Question at 0:30' });
    const second = screen.getByRole('button', { name: 'Question at 1:35' });
    expect(first).toHaveStyle({ left: '25%' });
    expect(second.style.left).toBe(`${(95 / 120) * 100}%`);
    // A time that is not a number yet has no marker
    expect(screen.getAllByRole('button', { name: /^Question at/ })).toHaveLength(2);
  });

  it('shows no markers before the length is known', () => {
    setup(markers);

    expect(screen.queryByRole('button', { name: /^Question at/ })).not.toBeInTheDocument();
  });

  it('selecting a marker jumps to it', async () => {
    const { control, onSelect } = setup(markers);
    control.loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Question at 1:35' }));

    expect(control.state.currentTime).toBe(95);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('a selected marker can be removed from the timeline', async () => {
    const { control, onRemove, onSelect } = setup(markers, { selectedUid: 2 });
    control.loaded();
    expect(screen.getByRole('button', { name: 'Question at 1:35' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Question at 1:35', { selector: 'span' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /remove it/i }));

    expect(onRemove).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('a selected marker can be jumped back to', async () => {
    const { control } = setup(markers, { selectedUid: 1 });
    control.loaded();
    control.at(100);

    await userEvent.click(screen.getByRole('button', { name: /jump to it/i }));

    expect(control.state.currentTime).toBe(30);
  });

  it('selecting the selected marker again clears the selection', async () => {
    const { control, onSelect } = setup(markers, { selectedUid: 1 });
    control.loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Question at 0:30' }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
