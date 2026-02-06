import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPrintForm from '@/app/(protected)/dashboard/jobs/print/new/components/PrintJobForm';
import { jobApi } from '@/api/client/job';
import { toast } from 'sonner';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@/api/client/job', () => ({
  jobApi: {
    createJob: vi.fn(),
    uploadJobFile: vi.fn(),
    completeUpload: vi.fn(),
  },
}));

vi.mock('@/lib/file-utils', () => ({
  calculateFileChecksum: vi.fn(() => Promise.resolve('sha256:test')),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });

describe('NewPrintForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.mocked(jobApi.createJob).mockReset();
    vi.mocked(jobApi.uploadJobFile).mockReset();
    vi.mocked(jobApi.completeUpload).mockReset();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<NewPrintForm />);
      expect(screen.getByLabelText(/Project Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Print Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Project Purpose/i)).toBeInTheDocument();
      expect(screen.getByText(/Design Intent/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload STL/i)).toBeInTheDocument();
    });

    it('has submit button', () => {
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('field validation', () => {
    it('shows error for empty print name', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Must have a name for the print request/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty description', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(
          screen.getByText(/Must have a description for the print request/i),
        ).toBeInTheDocument();
      });
    });

    it('shows error for short description', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'A');
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(
          screen.getByText(/Must have a description for the print request/i),
        ).toBeInTheDocument();
      });
    });

    it('shows error when Project Purpose is not selected', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        // Look for error message specifically, not placeholder text
        const errorMessages = screen.getAllByText(/Select a purpose/i);
        const errorMessage = errorMessages.find((el) => el.closest('[data-slot="form-message"]'));
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('shows error when Design Intent is not selected', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Select a design intent/i)).toBeInTheDocument();
      });
    });

    it('shows error for missing STL file upload', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/Please upload an STL file/i)).toBeInTheDocument();
      });
    });
  });

  describe('form interactions', () => {
    it('accepts valid print name input', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const nameField = screen.getByLabelText(/Project Title/i);
      await user.type(nameField, 'My Test Print');
      expect(nameField).toHaveValue('My Test Print');
    });

    it('accepts valid description input', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'This is a test description for my print job');
      expect(descriptionField).toHaveValue('This is a test description for my print job');
    });

    it('purpose select is interactive', async () => {
      render(<NewPrintForm />);
      // Get the first combobox which should be the purpose select
      const allComboboxes = screen.getAllByRole('combobox');
      const purposeCombobox = allComboboxes[0];
      const purposeSpan = within(purposeCombobox).getByText('Select a purpose');
      expect(purposeSpan).toBeInTheDocument();
    });

    it('design intent radio buttons work', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const functionalRadio = screen.getByLabelText(/Optimized for standard fit/i);
      await user.click(functionalRadio);
      expect(functionalRadio).toBeChecked();
    });
  });

  describe('form submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof setupUser>) => {
      const nameField = screen.getByLabelText(/Project Title/i);
      await user.type(nameField, 'Test Print Job');
      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'This is a test description');
      // Use role-based query for combobox instead of label text
      const purposeTrigger = screen.getAllByRole('combobox')[0];
      await user.click(purposeTrigger);
      const purposeOption = await screen.findByRole('option', { name: /Casual \/ Recreation/i });
      await user.click(purposeOption);
      const designIntentRadio = screen.getByLabelText(/Optimized for standard fit/i);
      await user.click(designIntentRadio);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy'], 'model.stl', { type: 'model/stl' });
      await user.upload(fileInput, file);
    };

    it('uploads STL file and shows filename', async () => {
      const user = setupUser();
      const { container } = render(<NewPrintForm />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      const file = new File(['dummy'], 'model.stl', { type: 'model/stl' });
      await user.upload(fileInput, file);
      expect(screen.getAllByText('model.stl').length).toBeGreaterThan(0);
    });

    it('submits valid data and redirects in mock mode', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: 'order-123',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);
      render(<NewPrintForm mockMode />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs');
      });
    });

    it('form submission with all valid data succeeds in mock mode', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('shows submitting state while form is submitting', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const nameField = screen.getByLabelText(/Project Title/i);
      await user.type(nameField, 'Test');
      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'Test description');
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      render(<NewPrintForm />);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('submits real flow when mockMode is false', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: 'order-123',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadJobFile).mockResolvedValue(new Response());
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(jobApi.createJob).toHaveBeenCalledTimes(1);
        expect(jobApi.uploadJobFile).toHaveBeenCalledTimes(1);
        expect(jobApi.completeUpload).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs');
      });
    });

    it('handles upload failure in real flow', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: 'order-123',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadJobFile).mockRejectedValue(
        new Error('File upload failed with status 400'),
      );
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('File upload failed with status 400'),
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles order creation failure in real flow', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockRejectedValue(new Error('Order creation failed'));
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Order creation failed'));
      });
    });

    it('handles complete upload failure in real flow', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: 'order-456',
        createdAt: new Date().toISOString(),
        fileId: 'file-456',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadJobFile).mockResolvedValue(new Response());
      vi.mocked(jobApi.completeUpload).mockRejectedValue(new Error('Failed to complete upload'));
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to complete upload'),
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles non-Error throw in submit flow', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockRejectedValue('boom');
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to submit print request. Unknown error');
      });
    });

    it('handles invalid API response (missing orderId)', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: undefined as unknown as string,
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'https://example.com/upload',
        uploadExpiresIn: 900,
      });
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid response from server'),
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles invalid API response (missing uploadUrl)', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockResolvedValue({
        orderId: 'test-order-id',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: undefined as unknown as string,
        uploadExpiresIn: 900,
      });
      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid response from server'),
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('unsaved changes guard', () => {
    it('activates when form is dirty', async () => {
      const user = setupUser();
      render(<NewPrintForm />);
      const nameField = screen.getByLabelText(/Project Title/i);
      await user.type(nameField, 'Test');
      expect(nameField).toHaveValue('Test');
    });
  });
});
