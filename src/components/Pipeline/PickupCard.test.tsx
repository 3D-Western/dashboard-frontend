import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMockPickup } from '@test/utils/pipelineFactories';
import { PickupCard } from './PickupCard';

vi.mock('./PartViewerSlot', () => ({
  PartViewerSlot: (props: { modelUrl?: string; previewUrl?: string; highlights?: unknown }) => (
    <div data-testid="viewer" data-model={props.modelUrl} data-preview={props.previewUrl} />
  ),
}));

describe('PickupCard', () => {
  it('shows the interactive 3D part, with the photo as its placeholder, when a model link exists', () => {
    render(
      <PickupCard
        pickup={createMockPickup({ artifacts: [{ kind: 'plate_png', url: '/plate.png' }] })}
        modelUrl="/part.glb"
      />,
    );
    const viewer = screen.getByTestId('viewer');
    expect(viewer).toHaveAttribute('data-model', '/part.glb');
    expect(viewer).toHaveAttribute('data-preview', '/plate.png');
  });

  it('falls back to the picture in a dark rounded frame, contained, without a white box', () => {
    render(
      <PickupCard
        pickup={createMockPickup({ artifacts: [{ kind: 'preview_png', url: '/p.png' }] })}
      />,
    );
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
    const frame = screen.getByTestId('pickup-photo');
    expect(frame).toHaveClass('rounded-lg', 'bg-muted/30');
    const img = screen.getByAltText('Your finished print');
    expect(img).toHaveClass('object-contain');
    expect(img).not.toHaveClass('bg-white');
  });
});
