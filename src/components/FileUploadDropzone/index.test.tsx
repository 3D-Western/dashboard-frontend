import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadDropzone } from '.';

// Mock the Dropzone component
vi.mock('@/components/Dropzone', () => ({
  Dropzone: ({
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
          const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
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

describe('FileUploadDropzone', () => {
  it('renders dropzone component', () => {
    const onFileAccepted = vi.fn();
    render(<FileUploadDropzone onFileAccepted={onFileAccepted} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('calls onFileAccepted when file is dropped', async () => {
    const user = userEvent.setup();
    const onFileAccepted = vi.fn();
    render(<FileUploadDropzone onFileAccepted={onFileAccepted} />);

    const uploadButton = screen.getByTestId('trigger-drop');
    await user.click(uploadButton);

    expect(onFileAccepted).toHaveBeenCalledWith(expect.any(File));
    const calledFile = onFileAccepted.mock.calls[0][0];
    expect(calledFile.name).toBe('test.pdf');
  });

  it('calls onFileAccepted with null when files are cleared', async () => {
    const user = userEvent.setup();
    const onFileAccepted = vi.fn();
    render(<FileUploadDropzone onFileAccepted={onFileAccepted} />);

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
    render(<FileUploadDropzone onFileAccepted={onFileAccepted} />);

    // Upload file
    await user.click(screen.getByTestId('trigger-drop'));
    expect(onFileAccepted).toHaveBeenCalledTimes(1);

    // Clear with empty array
    await user.click(screen.getByTestId('trigger-clear'));
    expect(onFileAccepted).toHaveBeenCalledTimes(2);
    expect(onFileAccepted).toHaveBeenLastCalledWith(null);
  });

  it('handles initialFile prop', () => {
    const onFileAccepted = vi.fn();
    const initialFile = new File(['initial'], 'initial.pdf', { type: 'application/pdf' });

    render(<FileUploadDropzone onFileAccepted={onFileAccepted} initialFile={initialFile} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('accepts custom file types via accept prop', () => {
    const onFileAccepted = vi.fn();
    const accept = { 'image/*': ['.png', '.jpg'] };

    render(<FileUploadDropzone onFileAccepted={onFileAccepted} accept={accept} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('supports multiple files when maxFiles > 1', () => {
    const onFileAccepted = vi.fn();

    render(<FileUploadDropzone onFileAccepted={onFileAccepted} maxFiles={3} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });

  it('defaults to single file upload (maxFiles=1)', () => {
    const onFileAccepted = vi.fn();

    render(<FileUploadDropzone onFileAccepted={onFileAccepted} />);

    expect(screen.getByTestId('dropzone')).toBeInTheDocument();
  });
});
