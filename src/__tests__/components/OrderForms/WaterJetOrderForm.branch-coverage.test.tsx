import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@test/utils/render';
import userEvent from '@testing-library/user-event';
import WaterJetForm from '@/app/(protected)/dashboard/orders/water-jet/new/components/WaterJetForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

global.fetch = vi.fn();
global.alert = vi.fn();

describe('WaterJetForm branch coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
    // Reset global fetch mock
    if (vi.isMockFunction(global.fetch)) {
      (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    } else {
      global.fetch = vi.fn();
    }
  });

  it('renders the water jet form with proper title and fields', () => {
    render(<WaterJetForm />);

    expect(screen.getByText('Create New Water Jet Cutting Request')).toBeInTheDocument();
    expect(screen.getByText('High-pressure cutting for thick materials')).toBeInTheDocument();
    expect(screen.getByLabelText(/request name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByText('Preferred Material')).toBeInTheDocument();
    expect(screen.getByText('Design File')).toBeInTheDocument();
  });

  it('submits without file and shows validation error', async () => {
    const user = userEvent.setup();
    render(<WaterJetForm />);

    // Fill required fields
    await user.type(screen.getByLabelText(/request name/i), 'Test Water Jet Part');
    await user.type(screen.getByLabelText(/description/i), 'Test water jet cutting description');

    // Select material - click the combobox and select steel
    const materialCombobox = screen.getByRole('combobox');
    await user.click(materialCombobox);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Steel' })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('option', { name: 'Steel' }));

    // Submit form without file
    const submitButton = screen.getByRole('button', { name: /submit water jet request/i });
    await user.click(submitButton);

    // Should show form validation error instead of alert
    await waitFor(() => {
      const validationErrors = screen.getAllByText(/Please upload a DXF, AI, SVG, or DWG file/i);
      expect(validationErrors.length).toBeGreaterThanOrEqual(1);
    });

    // Should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('covers successful submission with valid file', async () => {
    const user = userEvent.setup();
    render(<WaterJetForm />);

    const mockFetchResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { order: { id: 'test-123' } },
      }),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchResponse);

    // Fill required fields
    await user.type(screen.getByLabelText(/request name/i), 'Test Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Select material
    const materialCombobox = screen.getByRole('combobox');
    await user.click(materialCombobox);
    await user.click(screen.getByRole('option', { name: 'Steel' }));

    // Create a valid water jet cutting file
    const validFile = new File(['test dxf content'], 'test.dxf', { type: 'application/dxf' });
    
    // Upload file
    const fileInput = screen.getByRole('presentation').querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, validFile);

    // Verify file was accepted and filename displayed
    await waitFor(() => {
      // Look for filename in the form preview area (not dropzone internal display)
      const filePreviewDiv = document.querySelector('.mt-2.text-sm.text-muted-foreground');
      expect(filePreviewDiv).toBeInTheDocument();
      expect(filePreviewDiv?.textContent).toBe('test.dxf');
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit water jet request/i });
    await user.click(submitButton);

    // Should call fetch with correct payload
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"category":"water-jet"'),
      });
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('handles fetch error gracefully', async () => {
    const user = userEvent.setup();
    render(<WaterJetForm />);

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    // Fill form completely
    await user.type(screen.getByLabelText(/request name/i), 'Test Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Select material
    const materialCombobox = screen.getByRole('combobox');
    await user.click(materialCombobox);
    await user.click(screen.getByRole('option', { name: 'Steel' }));

    // Upload valid file
    const validFile = new File(['test'], 'test.svg', { type: 'image/svg+xml' });
    const fileInput = screen.getByRole('presentation').querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, validFile);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit water jet request/i });
    await user.click(submitButton);

    // Should handle error gracefully
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('covers file type validation in dropzone', async () => {
    const user = userEvent.setup();
    render(<WaterJetForm />);
    
    // Upload invalid file through dropzone
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByRole('presentation').querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(fileInput, invalidFile);

    // Invalid files should be rejected by dropzone and not display filename
    // Instead, the form should remain empty
    await waitFor(() => {
      // The file input should not have the file (it was rejected)
      expect(fileInput.files).toHaveLength(0);
    });

    // Try to submit the form anyway to test form validation
    // Fill other required fields first
    await user.type(screen.getByLabelText(/request name/i), 'Test Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Select material
    const materialCombobox = screen.getByRole('combobox');
    await user.click(materialCombobox);
    await user.click(screen.getByRole('option', { name: 'Steel' }));

    // Submit form - should trigger form validation error for missing file
    const submitButton = screen.getByRole('button', { name: /submit water jet request/i });
    await user.click(submitButton);

    // Should show validation error for no file uploaded
    await waitFor(() => {
      const validationErrors = screen.getAllByText(/Please upload a DXF, AI, SVG, or DWG file/i);
      expect(validationErrors.length).toBeGreaterThanOrEqual(1);
    });

    // Should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles non-ok fetch response', async () => {
    const user = userEvent.setup();
    render(<WaterJetForm />);

    const mockFetchResponse = {
      ok: false,
      text: vi.fn().mockResolvedValue('Server error'),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockFetchResponse);

    // Fill form completely
    await user.type(screen.getByLabelText(/request name/i), 'Test Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description');

    // Select material
    const materialCombobox = screen.getByRole('combobox');
    await user.click(materialCombobox);
    await user.click(screen.getByRole('option', { name: 'Steel' }));

    // Upload valid file
    const validFile = new File(['test'], 'test.dwg', { type: 'application/dwg' });
    const fileInput = screen.getByRole('presentation').querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, validFile);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /submit water jet request/i });
    await user.click(submitButton);

    // Should handle fetch error
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
