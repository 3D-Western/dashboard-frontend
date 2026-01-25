import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropZone } from './FileDropZone';

// Mock the Dropzone component
vi.mock('@/components/ui/dropzone', () => ({
  default: ({
    onDrop,
    children,
  }: {
    onDrop: (files: File[]) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="dropzone">
      <button
        data-testid="trigger-drop"
        onClick={() => {
          const file = new File(['content'], 'design.dxf', { type: 'application/dxf' });
          onDrop([file]);
        }}
      >
        Upload
      </button>
      <button
        data-testid="trigger-clear"
        onClick={() => {
          onDrop([]);
        }}
      >
        Clear
      </button>
      {children}
    </div>
  ),
  DropzoneEmptyState: () => <div>Empty State</div>,
  DropzoneContent: () => <div>Content</div>,
}));

describe('FileDropZone', () => {
  it('renders dropzone component', () => {
    const onFileAccepted = vi.fn();
    const accept = { 'application/dxf': ['.dxf'] };
    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('calls onFileAccepted when file is dropped', async () => {
    const user = userEvent.setup();
    const onFileAccepted = vi.fn();
    const accept = { 'application/dxf': ['.dxf'] };
    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    const uploadButton = screen.getByTestId('trigger-drop');
    await user.click(uploadButton);

    expect(onFileAccepted).toHaveBeenCalledWith(expect.any(File));
    const calledFile = onFileAccepted.mock.calls[0][0];
    expect(calledFile.name).toBe('design.dxf');
  });

  it('calls onFileAccepted with null when files are cleared', async () => {
    const user = userEvent.setup();
    const onFileAccepted = vi.fn();
    const accept = { 'application/dxf': ['.dxf'] };
    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    // First upload a file
    await user.click(screen.getByTestId('trigger-drop'));
    expect(onFileAccepted).toHaveBeenCalledWith(expect.any(File));

    // Then clear it
    await user.click(screen.getByTestId('trigger-clear'));
    expect(onFileAccepted).toHaveBeenCalledWith(null);
  });

  it('resets local state when empty files array is provided', async () => {
    const user = userEvent.setup();
    const onFileAccepted = vi.fn();
    const accept = { 'application/dxf': ['.dxf'] };
    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    // Upload file
    await user.click(screen.getByTestId('trigger-drop'));
    expect(onFileAccepted).toHaveBeenCalledTimes(1);

    // Clear with empty array
    await user.click(screen.getByTestId('trigger-clear'));
    expect(onFileAccepted).toHaveBeenCalledTimes(2);
    expect(onFileAccepted).toHaveBeenLastCalledWith(null);
  });

  it('always uses maxFiles=1 for single file upload', () => {
    const onFileAccepted = vi.fn();
    const accept = { 'application/dxf': ['.dxf'] };

    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('requires accept prop to be provided', () => {
    const onFileAccepted = vi.fn();
    const accept = { 'image/*': ['.png', '.jpg'] };

    render(<FileDropZone onFileAccepted={onFileAccepted} accept={accept} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });
});
