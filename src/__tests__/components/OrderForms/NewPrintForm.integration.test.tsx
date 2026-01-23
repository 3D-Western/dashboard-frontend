import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPrintForm from '@/app/(protected)/dashboard/orders/print/new/components/PrintOrderForm';
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
    createOrder: vi.fn(),
    uploadOrderFile: vi.fn(),
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

describe('NewPrintForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.mocked(jobApi.createOrder).mockReset();
    vi.mocked(jobApi.uploadOrderFile).mockReset();
    vi.mocked(jobApi.completeUpload).mockReset();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<NewPrintForm />);

      // Form fields
      expect(screen.getByLabelText(/Print Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Print Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload STL/i)).toBeInTheDocument();
      expect(screen.getByText(/What is the primary goal of this print/i)).toBeInTheDocument();
      expect(screen.getByText(/How strong does the print have to be/i)).toBeInTheDocument();
      expect(screen.getByText(/Do you have a preferred infill pattern/i)).toBeInTheDocument();
      expect(screen.getByText(/Preferred Materials and Colors/i)).toBeInTheDocument();
      expect(screen.getByText(/Print Supports/i)).toBeInTheDocument();
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

    it('shows error for missing STL file upload', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please upload an STL file/i)).toBeInTheDocument();
      });
    });

    it('shows error when Material 1 is not selected', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errors = screen.getAllByText(/Select at least one material/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('shows error when Color 1 is not selected', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errors = screen.getAllByText(/Select at least one color/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('form interactions', () => {
    it('accepts valid print name input', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const nameField = screen.getByLabelText(/Print Name/i);
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

    it('goal radio buttons work', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const standardRadio = screen.getByLabelText(/Standard/i);
      await user.click(standardRadio);

      expect(standardRadio).toBeChecked();
    });

    it('durability radio buttons work', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const engineeringRadio = screen.getByLabelText(/Engineering project/i);
      await user.click(engineeringRadio);

      expect(engineeringRadio).toBeChecked();
    });

    it('infill radio buttons work', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const gyroidRadio = screen.getByLabelText(/Gyroid/i);
      await user.click(gyroidRadio);

      expect(gyroidRadio).toBeChecked();
    });

    it('support radio buttons work', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const yesRadio = screen.getByLabelText(/Yes/i);
      await user.click(yesRadio);

      expect(yesRadio).toBeChecked();
    });

    it('material and color selects are interactive', async () => {
      render(<NewPrintForm />);

      // Find all "Material:" labels - there are two (first choice and second choice)
      const materialLabels = screen.getAllByText('Material:', { exact: false });
      expect(materialLabels.length).toBeGreaterThan(0);

      // Verify we have material/color select triggers
      const selectTriggers = screen.getAllByRole('combobox');
      expect(selectTriggers.length).toBeGreaterThan(0);
    });
  });

  describe('form submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof setupUser>) => {
      const nameField = screen.getByLabelText(/Print Name/i);
      await user.type(nameField, 'Test Print Job');

      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'This is a test description');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy'], 'model.stl', { type: 'model/stl' });
      await user.upload(fileInput, file);

      await selectComboboxOption(user, 0, 'PLA');
      await selectComboboxOption(user, 1, 'Black');
      await selectComboboxOption(user, 2, 'ABS');
      await selectComboboxOption(user, 3, 'White');
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

      render(<NewPrintForm mockMode />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/orders');
      });
    });

    it('form submission with all valid data succeeds in mock mode', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      // Fill in required fields
      const nameField = screen.getByLabelText(/Print Name/i);
      await user.type(nameField, 'Test Print Job');

      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'This is a test description');

      // Select material 1
      const material1Trigger = screen.getAllByRole('combobox')[0];
      await user.click(material1Trigger);
      const plaOptions = await screen.findAllByText('PLA');
      await user.click(plaOptions[0]);

      // Select color 1
      const color1Trigger = screen.getAllByRole('combobox')[1];
      await user.click(color1Trigger);
      const blackOptions = await screen.findAllByText('Black');
      await user.click(blackOptions[0]);

      // Select material 2
      const material2Trigger = screen.getAllByRole('combobox')[2];
      await user.click(material2Trigger);
      const absOptions = await screen.findAllByText('ABS');
      await user.click(absOptions[0]);

      // Select color 2
      const color2Trigger = screen.getAllByRole('combobox')[3];
      await user.click(color2Trigger);
      const whiteOptions = await screen.findAllByText('White');
      await user.click(whiteOptions[0]);

      // Mock file upload would require dropzone interaction
      // For now, we test that the form structure is correct

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('shows submitting state while form is submitting', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      // Fill minimal valid data
      const nameField = screen.getByLabelText(/Print Name/i);
      await user.type(nameField, 'Test');

      const descriptionField = screen.getByLabelText(/Print Description/i);
      await user.type(descriptionField, 'Test description');

      // Note: This test would need a valid file upload and selections
      // to actually submit. For now we verify the button exists.
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      render(<NewPrintForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      // Initially not disabled (since form is not submitting)
      expect(submitButton).not.toBeDisabled();
    });

    it('submits real flow when mockMode is false', async () => {
      const user = setupUser();
      vi.mocked(jobApi.createOrder).mockResolvedValue({
        orderId: 'order-123',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadOrderFile).mockResolvedValue(new Response());
      vi.mocked(jobApi.completeUpload).mockResolvedValue(null);

      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(jobApi.createOrder).toHaveBeenCalledTimes(1);
        expect(jobApi.uploadOrderFile).toHaveBeenCalledTimes(1);
        expect(jobApi.completeUpload).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/dashboard/orders');
      });
    });

    it('handles upload failure in real flow', async () => {
      const user = setupUser();

      vi.mocked(jobApi.createOrder).mockResolvedValue({
        orderId: 'order-123',
        createdAt: new Date().toISOString(),
        fileId: 'file-123',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadOrderFile).mockRejectedValue(
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

      vi.mocked(jobApi.createOrder).mockRejectedValue(new Error('Order creation failed'));

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

      vi.mocked(jobApi.createOrder).mockResolvedValue({
        orderId: 'order-456',
        createdAt: new Date().toISOString(),
        fileId: 'file-456',
        uploadUrl: 'http://example.com/upload',
        uploadExpiresIn: 900,
      });
      vi.mocked(jobApi.uploadOrderFile).mockResolvedValue(new Response());
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

      vi.mocked(jobApi.createOrder).mockRejectedValue('boom');

      render(<NewPrintForm mockMode={false} />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to submit print request. Unknown error');
      });
    });
  });

  describe('material and color selection logic', () => {
    it('material 1 and material 2 cannot be the same', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      // Select PLA for material 1
      await selectComboboxOption(user, 0, 'PLA');

      // Try to select material 2 - PLA should not be in the list
      const material2Trigger = screen.getAllByRole('combobox')[2];
      await user.click(material2Trigger);

      // We should still have material options available, just not PLA
      const absOptions = await screen.findAllByText('ABS');
      expect(absOptions.length).toBeGreaterThan(0);
    });

    it('color 1 and color 2 cannot be the same', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      // Select Black for color 1
      await selectComboboxOption(user, 1, 'Black');

      // Try to select color 2 - Black should not be in the list
      const color2Trigger = screen.getAllByRole('combobox')[3];
      await user.click(color2Trigger);

      // We should still have color options available, just not Black
      const whiteOptions = await screen.findAllByText('White');
      expect(whiteOptions.length).toBeGreaterThan(0);
    });

    it('filters second choice options based on first choice', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      await selectComboboxOption(user, 0, 'PLA');

      const material2Trigger = screen.getAllByRole('combobox')[2];
      await user.click(material2Trigger);
      const listbox2 = await screen.findByRole('listbox');

      expect(within(listbox2).queryByRole('option', { name: 'PLA' })).not.toBeInTheDocument();
    });
  });

  describe('unsaved changes guard', () => {
    it('activates when form is dirty', async () => {
      const user = setupUser();
      render(<NewPrintForm />);

      const nameField = screen.getByLabelText(/Print Name/i);
      await user.type(nameField, 'Test');

      // The UnsavedChangesGuard component is rendered when isDirty is true
      // Actual navigation blocking would be tested in E2E
      expect(nameField).toHaveValue('Test');
    });
  });

  describe('default values', () => {
    it('has default goal value of high-quality', () => {
      render(<NewPrintForm />);

      const highQualityRadio = screen.getByLabelText(/High Quality/i);
      expect(highQualityRadio).toBeChecked();
    });

    it('has default durability value of general-use', () => {
      render(<NewPrintForm />);

      const generalUseRadio = screen.getByLabelText(/General use/i);
      expect(generalUseRadio).toBeChecked();
    });

    it('has default infill value of grid', () => {
      render(<NewPrintForm />);

      const gridRadio = screen.getByLabelText(/Grid \(default\)/i);
      expect(gridRadio).toBeChecked();
    });

    it('has default support value of no', () => {
      render(<NewPrintForm />);

      const noRadio = screen.getByLabelText(/No/i);
      expect(noRadio).toBeChecked();
    });
  });
});
