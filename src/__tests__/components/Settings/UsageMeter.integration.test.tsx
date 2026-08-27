import { describe, it, expect } from 'vitest';
import { render, screen } from '@test/utils/render';
import { UsageMeter } from '@/app/(protected)/dashboard/settings/components/UsageMeter';

describe('UsageMeter Integration', () => {
  it('renders green bar when usage is under the flagged threshold', () => {
    const { container } = render(
      <UsageMeter projectType="ThreeDPrint" used={1} limit={5} period="month" />,
    );

    expect(container.querySelector('.bg-status-success')).toBeInTheDocument();
    expect(screen.queryByText('Limit Reached')).not.toBeInTheDocument();
  });

  it('renders amber bar at the 75% threshold', () => {
    const { container } = render(
      <UsageMeter projectType="ThreeDPrint" used={4} limit={5} period="month" />,
    );

    expect(container.querySelector('.bg-status-flagged')).toBeInTheDocument();
  });

  it('renders red bar and Limit Reached badge at the limit', () => {
    render(<UsageMeter projectType="ThreeDPrint" used={5} limit={5} period="month" />);

    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
  });

  it('renders red bar and Limit Reached badge over the limit', () => {
    const { container } = render(
      <UsageMeter projectType="ThreeDPrint" used={6} limit={5} period="month" />,
    );

    expect(container.querySelector('.bg-status-error')).toBeInTheDocument();
    expect(screen.getByText('Limit Reached')).toBeInTheDocument();
  });

  it('renders unlimited usage without a bar or badge', () => {
    render(<UsageMeter projectType="Waterjet" used={50} limit={-1} period="month" />);

    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
    expect(screen.queryByText('Limit Reached')).not.toBeInTheDocument();
  });

  it('renders the correct category label', () => {
    render(<UsageMeter projectType="LaserCutting" used={1} limit={3} period="month" />);

    expect(screen.getByText('Laser Cutting')).toBeInTheDocument();
  });
});
