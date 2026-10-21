import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrientationInstallPrompt } from './OrientationInstallPrompt';

const useTrainings = vi.fn();
vi.mock('@/providers/trainings-provider', () => ({ useTrainings: () => useTrainings() }));

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OrientationInstallPrompt (dashboard)', () => {
  it('shows once Maker Orientation is passed', () => {
    useTrainings.mockReturnValue({ data: { orientationComplete: true, trainings: [] } });
    render(<OrientationInstallPrompt />);
    expect(screen.getByRole('region', { name: /install the 3d western app/i })).toBeInTheDocument();
  });

  it('stays away before orientation is passed', () => {
    useTrainings.mockReturnValue({ data: { orientationComplete: false, trainings: [] } });
    const { container } = render(<OrientationInstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays away while training is still loading', () => {
    useTrainings.mockReturnValue({ data: null });
    const { container } = render(<OrientationInstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });
});
