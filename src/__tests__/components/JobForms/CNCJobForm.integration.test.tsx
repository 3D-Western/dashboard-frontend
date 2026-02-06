import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CNCJobForm from '@/app/(protected)/dashboard/jobs/cnc/new/components/CNCJobForm';

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

describe('CNCJobForm Integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe('form rendering', () => {
    it('renders all fields correctly', () => {
      render(<CNCJobForm />);

      // Form fields
      expect(screen.getByLabelText(/Request Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
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

      // Verify we have the material select trigger
      const selectTrigger = screen.getByRole('combobox');
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

      await selectComboboxOption(user, 0, 'Aluminum');
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

      render(<CNCJobForm />);

      await fillRequiredFields(user);

      const submitButton = screen.getByRole('button', { name: /Submit/i });
      await user.click(submitButton);

      // TODO: Update this test when backend is ready
      // For now, form shows "coming soon" message and redirects
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard/jobs');
      });
    });
  });
});
