import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContainer } from './index';

describe('PageContainer', () => {
  it('is centred and capped at the wide width by default', () => {
    render(<PageContainer>Content</PageContainer>);

    const box = screen.getByText('Content');
    expect(box).toHaveClass('mx-auto', 'w-full', 'max-w-6xl');
    expect(box).not.toHaveClass('max-w-3xl');
  });

  it('uses the narrow width for forms and checklists', () => {
    render(<PageContainer narrow>Content</PageContainer>);

    expect(screen.getByText('Content')).toHaveClass('max-w-3xl');
    expect(screen.getByText('Content')).not.toHaveClass('max-w-6xl');
  });

  it('keeps the caller’s padding and spacing', () => {
    render(<PageContainer className="space-y-6 p-6">Content</PageContainer>);

    expect(screen.getByText('Content')).toHaveClass('space-y-6', 'p-6', 'max-w-6xl');
  });
});
