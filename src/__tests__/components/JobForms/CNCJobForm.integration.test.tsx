import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CNCJobForm from '@/app/(protected)/dashboard/jobs/cnc/new/components/CNCJobForm';
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

describe('CNCJobForm Integration', () => {
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
      render(<CNCJobForm />);

      // Form fields
      expect(screen.getByLabelText(/Request Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Project Purpose/i)).toBeInTheDocument();
      expect(screen.getByText(/Design File/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Preferred Material/i).length).toBeGreaterThan(0);
    });

    it('has submit button', () => {
      render(<CNCJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('field validation', () => {
    it('shows error for empty request name', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a name for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty description', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for short description', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'A');

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for missing STL file upload', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText(/Please upload an STL file/i).length).toBeGreaterThan(0);
      });
    });

    it('shows error when Material is not selected', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a material/i)).toBeInTheDocument();
      });
    });

    it('shows error when Project Purpose is not selected', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

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
      render(<CNCJobForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'My Test CNC Request');

      expect(nameField).toHaveValue('My Test CNC Request');
    });

    it('accepts valid description input', async () => {
      const user = setupUser();
      render(<CNCJobForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description for my CNC machining job');

      expect(descriptionField).toHaveValue('This is a test description for my CNC machining job');
    });

    it('material select is interactive', async () => {
      render(<CNCJobForm />);

      // Purpose is index 0, Material is index 1
      const selectTrigger = screen.getAllByRole('combobox')[1];
      expect(selectTrigger).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof setupUser>) => {
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test CNC Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy'], 'model.stl', { type: 'model/stl' });
      await user.upload(fileInput, file);

      await selectComboboxOption(user, 0, 'Casual / Recreation');
      await selectComboboxOption(user, 1, 'Aluminum');
    };

    it('uploads STL file and shows filename', async () => {
      const user = setupUser();
      const { container } = render(<CNCJobForm />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const file = new File(['dummy'], 'model.stl', { type: 'model/stl' });
      await user.upload(fileInput, file);

      expect(screen.getAllByText('model.stl').length).toBeGreaterThan(0);
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

      render(<CNCJobForm mockMode />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(jobApi.createJob).toHaveBeenCalledTimes(1);
        // uploadJobFile is skipped in mock mode to avoid CORS against the fake presigned URL
        expect(jobApi.uploadJobFile).not.toHaveBeenCalled();
        expect(jobApi.completeUpload).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs');
      });
    });

    it('sends CNC category and material/purpose in formAnswerJson', async () => {
      const user = setupUser();

      vi.mocked(jobApi.createJob).mockResolvedValue({
        jobId: 'test-job-id',
        createdAt: new Date().toISOString(),
        fileId: 'test-file-id',
        uploadUrl: 'http://mock-storage.local/uploads/test-file-id',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);

      render(<CNCJobForm mockMode />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(jobApi.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            jobName: 'Test CNC Job',
            category: 'CNC',
          }),
        );
      });

      const payload = vi.mocked(jobApi.createJob).mock.calls[0][0];
      const formAnswers = JSON.parse(payload.formAnswerJson);
      expect(formAnswers.material).toBe('aluminum');
      expect(formAnswers.purpose).toBe('casual');
    });

    it('shows an error toast when job creation fails', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createJob).mockRejectedValue(new Error('Job creation failed'));

      render(<CNCJobForm mockMode />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to submit CNC request'),
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
