import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dropzone, DropzoneEmptyState } from './Dropzone';

describe('Dropzone empty state copy', () => {
  it('shows a "tap" line on phones and the drag-and-drop line from md up', () => {
    render(
      <Dropzone onDrop={() => {}}>
        <DropzoneEmptyState />
      </Dropzone>,
    );

    expect(screen.getByText('Tap to choose a file')).toHaveClass('md:hidden');
    const desktop = screen.getByText('Drag and drop or click to upload');
    expect(desktop).toHaveClass('hidden', 'md:inline');
    expect(desktop.parentElement).toHaveClass('text-sm', 'md:text-xs');
  });
});
