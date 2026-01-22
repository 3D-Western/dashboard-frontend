import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPrintForm from '@/app/(protected)/dashboard/orders/print/new/components/PrintOrderForm';

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
          goal: undefined,
          durability: undefined,
          infill: undefined,
          support: undefined,
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

describe('NewPrintForm branch coverage (fallbacks)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  it('uses radio fallbacks when field values are undefined', () => {
    render(<NewPrintForm />);

    expect(screen.getByLabelText(/High Quality/i)).toBeChecked();
    expect(screen.getByLabelText(/General use/i)).toBeChecked();
    expect(screen.getByLabelText(/Grid \(default\)/i)).toBeChecked();
    expect(screen.getByLabelText(/^No$/i)).toBeChecked();
  });

  it('submits without file in mock mode', async () => {
    const user = setupUser();
    render(<NewPrintForm mockMode />);

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/orders');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('submits without file using mock mode', async () => {
    const user = setupUser();

    render(<NewPrintForm mockMode />);

    const submitButton = screen.getByRole('button', { name: /Submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/orders');
    });
  });

  it('handles undefined select values', async () => {
    const user = setupUser();
    render(<NewPrintForm />);

    const buttons = screen.getAllByRole('button', { name: /set-undefined/i });
    for (const button of buttons) {
      await user.click(button);
    }
  });
});
