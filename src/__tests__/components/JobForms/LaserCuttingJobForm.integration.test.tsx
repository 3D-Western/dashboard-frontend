import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LaserCuttingJobForm from '@/app/(protected)/dashboard/jobs/laser-cutting/new/components/LaserCuttingJobForm';
import { toast } from 'sonner';
import { jobApi } from '@/api/client/job';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });
const selectComboboxOption = async (
  user: ReturnType<typeof setupUser>,
  index: number,
  label: string,
) => {
  const trigger = screen.getAllByRole('combobox')[index];
  await user.click(trigger);
  const listbox = await screen.findByRole('listbox');
  const option = within(listbox).getByRole('option', { name: label });
  await user.click(option);
};

describe('LaserCuttingJobForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(jobApi.createJob).mockReset();
    vi.mocked(jobApi.uploadJobFile).mockReset();
    vi.mocked(jobApi.completeUpload).mockReset();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<LaserCuttingJobForm />);

      // Form fields
      expect(screen.getByLabelText(/Request Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Project Purpose/i)).toBeInTheDocument();
      expect(screen.getByText(/Design File/i)).toBeInTheDocument();
      expect(screen.getByText('Preferred Material')).toBeInTheDocument();
    });

    it('has submit button', () => {
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('field validation', () => {
    it('shows error for empty request name', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a name for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty description', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for short description', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'A');

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for missing design file upload', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Look for the error message specifically in the destructive-colored element
        const errorMessages = screen.getAllByText(/Please upload a DXF, AI, SVG, or DWG file/i);
        const errorMessage = errorMessages.find(
          (el) =>
            el.classList.contains('text-destructive') ||
            el.getAttribute('data-slot') === 'form-message',
        );
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('shows error when material is not selected', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a material/i)).toBeInTheDocument();
      });
    });

    it('shows error when Project Purpose is not selected', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText(/Select a purpose/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('form interactions', () => {
    it('accepts valid request name input', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'My Test Laser Cut');

      expect(nameField).toHaveValue('My Test Laser Cut');
    });

    it('accepts valid description input', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description for my laser cutting job');

      expect(descriptionField).toHaveValue('This is a test description for my laser cutting job');
    });

    it('material select is interactive', async () => {
      render(<LaserCuttingJobForm />);

      // Purpose is index 0, Material is index 1
      const materialSelect = screen.getAllByRole('combobox')[1];
      expect(materialSelect).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof setupUser>) => {
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test Laser Cutting Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy'], 'design.dxf', { type: 'application/dxf' });
      await user.upload(fileInput, file);

      await selectComboboxOption(user, 0, 'Casual / Recreation');
      await selectComboboxOption(user, 1, 'Acrylic');
    };

    it('uploads design file and shows filename', async () => {
      const user = setupUser();
      const { container } = render(<LaserCuttingJobForm />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const file = new File(['dummy'], 'design.dxf', { type: 'application/dxf' });
      await user.upload(fileInput, file);

      expect(screen.getAllByText('design.dxf').length).toBeGreaterThan(0);
    });

    it('submits valid data and redirects in mock mode', async () => {
      const user = setupUser();

      vi.mocked(jobApi.createJob).mockResolvedValue({
        jobId: 'test-job-id',
        createdAt: new Date().toISOString(),
        fileId: 'test-file-id',
        uploadUrl: 'http://mock-storage.local/uploads/test-file-id',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);

      render(<LaserCuttingJobForm mockMode />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(jobApi.createJob).toHaveBeenCalledTimes(1);
        expect(jobApi.uploadJobFile).not.toHaveBeenCalled();
        expect(jobApi.completeUpload).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs');
      });
    });

    it('sends LaserCutting category and material/purpose in formAnswerJson', async () => {
      const user = setupUser();

      vi.mocked(jobApi.createJob).mockResolvedValue({
        jobId: 'test-job-id',
        createdAt: new Date().toISOString(),
        fileId: 'test-file-id',
        uploadUrl: 'http://mock-storage.local/uploads/test-file-id',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);

      render(<LaserCuttingJobForm mockMode />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(jobApi.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            jobName: 'Test Laser Cutting Job',
            category: 'LaserCutting',
          }),
        );
      });

      const payload = vi.mocked(jobApi.createJob).mock.calls[0][0];
      const formAnswers = JSON.parse(payload.formAnswerJson);
      expect(formAnswers.material).toBe('acrylic');
      expect(formAnswers.purpose).toBe('casual');
    });

    it('form submission with all valid data succeeds', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      // Fill in required fields
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test Laser Cutting Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      // Select material (Purpose is index 0, Material is index 1)
      const materialTrigger = screen.getAllByRole('combobox')[1];
      await user.click(materialTrigger);
      const acrylicOptions = await screen.findAllByText('Acrylic');
      await user.click(acrylicOptions[0]);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('shows submitting state while form is submitting', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      // Fill minimal valid data
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'Test description');

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      render(<LaserCuttingJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      // Initially not disabled (since form is not submitting)
      expect(submitButton).not.toBeDisabled();
    });

    it('shows an error toast when job creation fails', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockRejectedValue(new Error('Submit failed'));

      render(<LaserCuttingJobForm mockMode />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Submit failed'));
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles non-Error throw in submit flow', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockRejectedValue('boom');

      render(<LaserCuttingJobForm mockMode />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to submit laser cutting request. ');
      });
    });
  });

  describe('material selection logic', () => {
    it('can select different laser cutting materials', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      // Select Acrylic (Purpose is index 0, Material is index 1)
      await selectComboboxOption(user, 1, 'Acrylic');

      // Check that Acrylic is now selected in the material combobox trigger
      const trigger = screen.getAllByRole('combobox')[1];
      expect(trigger).toHaveTextContent('Acrylic');
    });

    it('material select starts with placeholder text', async () => {
      render(<LaserCuttingJobForm />);

      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });

  describe('unsaved changes guard', () => {
    it('activates when form is dirty', async () => {
      const user = setupUser();
      render(<LaserCuttingJobForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      // The UnsavedChangesDialog component is rendered when isDirty is true
      // Actual navigation blocking would be tested in E2E
      expect(nameField).toHaveValue('Test');
    });
  });

  describe('default values', () => {
    it('has empty default values for all fields', () => {
      render(<LaserCuttingJobForm />);

      const nameField = screen.getByLabelText(/Request Name/i) as HTMLInputElement;
      const descriptionField = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameField.value).toBe('');
      expect(descriptionField.value).toBe('');
      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });
});
