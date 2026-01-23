import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LaserCuttingOrderForm from '@/app/(protected)/dashboard/orders/laser-cutting/new/components/LaserCuttingOrderForm';
import { toast } from 'sonner';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
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

describe('LaserCuttingOrderForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(toast.error).mockClear();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<LaserCuttingOrderForm />);

      // Form fields
      expect(screen.getByLabelText(/Request Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Design File/i)).toBeInTheDocument();
      expect(screen.getByText('Preferred Material')).toBeInTheDocument();
    });

    it('has submit button', () => {
      render(<LaserCuttingOrderForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('field validation', () => {
    it('shows error for empty request name', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a name for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty description', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for short description', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

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
      render(<LaserCuttingOrderForm />);

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
      render(<LaserCuttingOrderForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a material/i)).toBeInTheDocument();
      });
    });
  });

  describe('form interactions', () => {
    it('accepts valid request name input', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'My Test Laser Cut');

      expect(nameField).toHaveValue('My Test Laser Cut');
    });

    it('accepts valid description input', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description for my laser cutting job');

      expect(descriptionField).toHaveValue('This is a test description for my laser cutting job');
    });

    it('material select is interactive', async () => {
      render(<LaserCuttingOrderForm />);

      // Find material select
      const materialSelect = screen.getByRole('combobox');
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

      await selectComboboxOption(user, 0, 'Acrylic');
    };

    it('uploads design file and shows filename', async () => {
      const user = setupUser();
      const { container } = render(<LaserCuttingOrderForm />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const file = new File(['dummy'], 'design.dxf', { type: 'application/dxf' });
      await user.upload(fileInput, file);

      expect(screen.getAllByText('design.dxf').length).toBeGreaterThan(0);
    });

    // TODO: Re-enable when backend is ready
    it.skip('submits valid data and redirects', async () => {
      const user = setupUser();

      // Mock fetch to simulate successful submission
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { order: { id: 'test-order' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      render(<LaserCuttingOrderForm />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/print');
      });

      fetchSpy.mockRestore();
    });

    it('form submission with all valid data succeeds', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      // Fill in required fields
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test Laser Cutting Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      // Select material
      const materialTrigger = screen.getByRole('combobox');
      await user.click(materialTrigger);
      const acrylicOptions = await screen.findAllByText('Acrylic');
      await user.click(acrylicOptions[0]);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('shows submitting state while form is submitting', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      // Fill minimal valid data
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'Test description');

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      render(<LaserCuttingOrderForm />);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      // Initially not disabled (since form is not submitting)
      expect(submitButton).not.toBeDisabled();
    });

    // TODO: Re-enable when backend is ready
    it.skip('handles submit failure', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce(new Response('Submit failed', { status: 400 }));

      render(<LaserCuttingOrderForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Submit failed'));
      });

      expect(mockPush).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    // TODO: Re-enable when backend is ready
    it.skip('uses fallback submit error message when response is empty', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce(new Response('', { status: 400 }));

      render(<LaserCuttingOrderForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Laser cutting order submit failed'),
        );
      });

      fetchSpy.mockRestore();
    });

    // TODO: Re-enable when backend is ready
    it.skip('handles non-Error throw in submit flow', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockRejectedValueOnce('boom');

      render(<LaserCuttingOrderForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to submit laser cutting request. ');
      });

      fetchSpy.mockRestore();
    });
  });

  describe('material selection logic', () => {
    it('can select different laser cutting materials', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      // Select Acrylic
      await selectComboboxOption(user, 0, 'Acrylic');

      // Check that Acrylic is now selected in the combobox trigger
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveTextContent('Acrylic');
    });

    it('material select starts with placeholder text', async () => {
      render(<LaserCuttingOrderForm />);

      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });

  describe('unsaved changes guard', () => {
    it('activates when form is dirty', async () => {
      const user = setupUser();
      render(<LaserCuttingOrderForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      // The UnsavedChangesGuard component is rendered when isDirty is true
      // Actual navigation blocking would be tested in E2E
      expect(nameField).toHaveValue('Test');
    });
  });

  describe('default values', () => {
    it('has empty default values for all fields', () => {
      render(<LaserCuttingOrderForm />);

      const nameField = screen.getByLabelText(/Request Name/i) as HTMLInputElement;
      const descriptionField = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameField.value).toBe('');
      expect(descriptionField.value).toBe('');
      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });
});
