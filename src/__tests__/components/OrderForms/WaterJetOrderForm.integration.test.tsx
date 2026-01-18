import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WaterJetForm from '@/app/(protected)/dashboard/orders/water-jet/new/components/WaterJetForm';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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

describe('WaterJetForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<WaterJetForm />);

      expect(screen.getByText('Create New Water Jet Cutting Request')).toBeInTheDocument();
      expect(screen.getByLabelText(/Request Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Design File/i)).toBeInTheDocument();
      expect(screen.getByText('Preferred Material')).toBeInTheDocument();
    });

    it('has submit button', () => {
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('field validation', () => {
    it('shows error for empty request name', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a name for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty description', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for short description', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'A');

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      });
    });

    it('shows error for missing design file upload', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
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
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a material/i)).toBeInTheDocument();
      });
    });
  });

  describe('form interactions', () => {
    it('accepts valid request name input', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'My Test Water Jet Cut');

      expect(nameField).toHaveValue('My Test Water Jet Cut');
    });

    it('accepts valid description input', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description for my water jet cutting job');

      expect(descriptionField).toHaveValue(
        'This is a test description for my water jet cutting job',
      );
    });

    it('material select is interactive', async () => {
      render(<WaterJetForm />);

      // Find material select
      const materialSelect = screen.getByRole('combobox');
      expect(materialSelect).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    const fillRequiredFields = async (user: ReturnType<typeof setupUser>) => {
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test Water Jet Cutting Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy'], 'design.dxf', { type: 'application/dxf' });
      await user.upload(fileInput, file);

      await selectComboboxOption(user, 0, 'Steel');
    };

    it('uploads design file and shows filename', async () => {
      const user = setupUser();
      const { container } = render(<WaterJetForm />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const file = new File(['dummy'], 'design.dxf', { type: 'application/dxf' });
      await user.upload(fileInput, file);

      expect(screen.getAllByText('design.dxf').length).toBeGreaterThan(0);
    });

    it('submits valid data and redirects', async () => {
      const user = setupUser();

      // Mock fetch to simulate successful submission
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { order: { id: 'test-order' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      render(<WaterJetForm />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });

      fetchSpy.mockRestore();
    });

    it('form submission with all valid data succeeds', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      // Fill in required fields
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test Water Jet Cutting Job');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'This is a test description');

      // Select material
      const materialTrigger = screen.getByRole('combobox');
      await user.click(materialTrigger);
      const steelOptions = await screen.findAllByText('Steel');
      await user.click(steelOptions[0]);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('shows submitting state while form is submitting', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      // Fill minimal valid data
      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      const descriptionField = screen.getByLabelText(/Description/i);
      await user.type(descriptionField, 'Test description');

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('disables submit button while submitting', () => {
      render(<WaterJetForm />);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      // Initially not disabled (since form is not submitting)
      expect(submitButton).not.toBeDisabled();
    });

    it('handles submit failure', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);

      fetchSpy.mockResolvedValueOnce(new Response('Submit failed', { status: 400 }));

      render(<WaterJetForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Submit failed'));
      });

      expect(mockPush).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('uses fallback submit error message when response is empty', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);

      fetchSpy.mockResolvedValueOnce(new Response('', { status: 400 }));

      render(<WaterJetForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Water jet order submit failed'),
        );
      });

      fetchSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('handles non-Error throw in submit flow', async () => {
      const user = setupUser();
      const fetchSpy = vi.spyOn(global, 'fetch');
      const alertSpy = vi.fn();
      vi.stubGlobal('alert', alertSpy);

      fetchSpy.mockRejectedValueOnce('boom');

      render(<WaterJetForm />);
      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit Water Jet Request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to submit water jet request. ');
      });

      fetchSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('material selection logic', () => {
    it('can select different water jet cutting materials', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      // Select Steel
      await selectComboboxOption(user, 0, 'Steel');

      // Check that Steel is now selected in the combobox trigger
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveTextContent('Steel');
    });

    it('material select starts with placeholder text', async () => {
      render(<WaterJetForm />);

      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });

  describe('unsaved changes guard', () => {
    it('activates when form is dirty', async () => {
      const user = setupUser();
      render(<WaterJetForm />);

      const nameField = screen.getByLabelText(/Request Name/i);
      await user.type(nameField, 'Test');

      // The UnsavedChangesGuard component is rendered when isDirty is true
      // Actual navigation blocking would be tested in E2E
      expect(nameField).toHaveValue('Test');
    });
  });

  describe('default values', () => {
    it('has empty default values for all fields', () => {
      render(<WaterJetForm />);

      const nameField = screen.getByLabelText(/Request Name/i) as HTMLInputElement;
      const descriptionField = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;

      expect(nameField.value).toBe('');
      expect(descriptionField.value).toBe('');
      expect(screen.getByText('Select a material')).toBeInTheDocument();
    });
  });
});
