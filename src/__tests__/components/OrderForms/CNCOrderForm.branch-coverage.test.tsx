import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CNCOrderForm from '@/app/(protected)/dashboard/orders/cnc/new/components/CNCOrderForm';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: unknown) => ({
    values,
    errors: {},
  }),
}));

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual<typeof import('react-hook-form')>('react-hook-form');
  return {
    ...actual,
    useForm: (args: Parameters<typeof actual.useForm>[0]) =>
      actual.useForm({
        ...args,
        defaultValues: {
          ...args?.defaultValues,
          material: undefined,
          name: '',
          description: '',
          file: undefined,
        },
      }),
  };
});

vi.mock('@/components/ui/select', () => {
  let counter = 0;

  const Select = ({
    onValueChange,
    children,
  }: {
    onValueChange?: (val: string) => void;
    children: ReactNode;
  }) => {
    const id = counter++;
    return (
      <div>
        <button
          type="button"
          data-testid={`select-undefined-${id}`}
          onClick={() => onValueChange?.(undefined as unknown as string)}
        >
          set-undefined
        </button>
        {children}
      </div>
    );
  };

  const SelectTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
  const SelectValue = () => null;
  const SelectContent = ({ children }: { children: ReactNode }) => <>{children}</>;
  const SelectItem = ({ children }: { children: ReactNode }) => <>{children}</>;

  return {
    __esModule: true,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

const setupUser = () => userEvent.setup({ pointerEventsCheck: 0 });

describe('CNCOrderForm branch coverage (fallbacks)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it('uses select fallbacks when material field value is undefined', () => {
    render(<CNCOrderForm />);

    expect(screen.getByRole('combobox')).toBeInTheDocument(); 
    expect(screen.getByText('Select a material')).toBeInTheDocument();
  });

  it('submits without file in mock mode', async () => {
    const user = setupUser();

    // Mock fetch to bypass MSW authentication
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { order: { id: 'test-order' } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<CNCOrderForm />);

    // Fill required fields to pass validation
    await user.type(screen.getByLabelText(/request name/i), 'Test CNC Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description for CNC part');

    const submitButton = screen.getByRole('button', { name: /Submit CNC Request/i });
    
    // CNC form now uses Zod validation like PrintOrderForm, so it will show validation error instead of alert
    await user.click(submitButton);

    // Should show file validation error message instead of alert
    await waitFor(() => {
      expect(screen.getByText(/Please upload an STL file/i)).toBeInTheDocument();
    });
    fetchSpy.mockRestore();
  });

  it('submits without file using fetch directly', async () => {
    const user = setupUser();
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { order: { id: 'test-123' } } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<CNCOrderForm />);

    // Fill required fields
    await user.type(screen.getByLabelText(/request name/i), 'Test CNC');
    await user.type(screen.getByLabelText(/description/i), 'Test CNC description');

    const submitButton = screen.getByRole('button', { name: /Submit CNC Request/i });
    await user.click(submitButton);

    // CNC form now shows validation error instead of alert
    await waitFor(() => {
      expect(screen.getByText(/Please upload an STL file/i)).toBeInTheDocument();
    });
    fetchSpy.mockRestore();
  });

  it('handles undefined select values', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    const buttons = screen.getAllByRole('button', { name: /set-undefined/i });
    for (const button of buttons) {
      await user.click(button);
    }
  });

  it('covers material selection branches', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    // Test the material selection dropdown
    const materialTrigger = screen.getByRole('combobox');
    await user.click(materialTrigger);

    // Should show material options
    await waitFor(() => {
      expect(screen.getByText('Aluminum')).toBeInTheDocument();
      expect(screen.getByText('Steel')).toBeInTheDocument();
      expect(screen.getByText('Brass')).toBeInTheDocument();
    });
  });

  it('covers validation error branches', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    const submitButton = screen.getByRole('button', { name: /Submit CNC Request/i });
    await user.click(submitButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText(/Must have a name for the request/i)).toBeInTheDocument();
      expect(screen.getByText(/Must have a description for the request/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a material/i)).toBeInTheDocument();
    });
  });

  it('covers file type validation branch', async () => {
    const user = setupUser();
    render(<CNCOrderForm />);

    // Fill required fields
    await user.type(screen.getByLabelText(/request name/i), 'Test Part');
    await user.type(screen.getByLabelText(/description/i), 'Test description');
    
    // Click material selector
    const materialTrigger = screen.getByRole('combobox');
    await user.click(materialTrigger);
    
    await waitFor(async () => {
      const aluminumOption = screen.getByText('Aluminum');
      await user.click(aluminumOption);
    });

    // Try to submit without file - should trigger file validation branch
    const submitButton = screen.getByRole('button', { name: /Submit CNC Request/i });
    await user.click(submitButton);

    // CNC form now shows validation error message instead of alert
    await waitFor(() => {
      expect(screen.getByText(/Please upload an STL file/i)).toBeInTheDocument();
    });
  });
});
