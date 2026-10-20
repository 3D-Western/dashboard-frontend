import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import NewBookingForm from '../NewBookingForm';
import { useTrainingLevel } from '@/hooks/useTraining';

// Import the hooks so we can mock their return values dynamically
import { useRouter } from 'next/navigation';
import { useCreateBooking, useAvailability } from '@/hooks/useBookings';
import { useUser } from '@/providers/user-provider';
import { apiRequest } from '@/api/client/base';

// 1. Mock modules directly
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/providers/user-provider', () => ({
  useUser: vi.fn(),
}));

vi.mock('@/hooks/useBookings', () => ({
  useCreateBooking: vi.fn(),
  useAvailability: vi.fn(),
}));

vi.mock('@/api/client/base', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/hooks/useTraining', () => ({
  useTrainingLevel: vi.fn(),
}));

describe('NewBookingForm', () => {
  const mockPush = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // 2. Assign the mock return values safely inside the test suite
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
      refresh: vi.fn(),
    });

    (useUser as Mock).mockReturnValue({
      studentId: 123456,
      firstName: 'User',
      lastName: 'Dev',
      email: 'user@uwo.ca',
    });

    (useCreateBooking as Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });

    (useAvailability as Mock).mockReturnValue({
      slots: [],
      isLoading: false,
      error: null,
    });

    // Equipment settings fetch fired on equipment-select. No approval required so
    // the submit button stays "Confirm Booking" rather than "Loading Rules...".
    (apiRequest as Mock).mockResolvedValue({
      data: {
        equipmentId: 'laser-1',
        maxSimultaneousBookings: 1,
        requireAdminApproval: false,
        allowWaitlist: false,
        restrictions: { requiresTraining: false },
      },
    });

    (useTrainingLevel as Mock).mockReturnValue({
      trainingLevel: 'LEVEL_2',
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders all required form fields', () => {
    render(<NewBookingForm />);

    expect(screen.getByLabelText(/^equipment$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^date$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^time slot$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^purpose$/i)).toBeInTheDocument();

    // Check that the submit button renders
    expect(screen.getByRole('button', { name: /Confirm Booking/i })).toBeInTheDocument();
  });

  it('disables submit until equipment is selected and does not call the API', () => {
    render(<NewBookingForm />);

    // The form gates submit behind equipment selection, so an empty form cannot submit.
    const submitButton = screen.getByRole('button', { name: /Confirm Booking/i });
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('successfully submits the form and navigates away', async () => {
    const { container } = render(<NewBookingForm />);

    // 1. Grab the elements directly by their ID
    const equipmentSelect = container.querySelector('#equipmentId') as HTMLSelectElement;
    const dateInput = container.querySelector('#date') as HTMLInputElement;
    const timeSlotSelect = container.querySelector('#timeSlot') as HTMLSelectElement;
    const purposeInput = container.querySelector('#purpose') as HTMLInputElement;

    // 2. Fill out the form
    fireEvent.change(equipmentSelect, { target: { value: 'laser-1' } });
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });
    fireEvent.change(timeSlotSelect, { target: { value: '10:00 AM - 12:00 PM' } });
    fireEvent.change(purposeInput, { target: { value: 'Capstone Prototyping' } });

    // Settings fetch resolves and the button returns to "Confirm Booking" before we submit
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Booking/i })).toBeEnabled();
    });

    // 3. Click Submit
    fireEvent.click(screen.getByRole('button', { name: /Confirm Booking/i }));

    // 4. Verify the API hook was called with the correct mapped data
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'laser-1',
          purpose: 'Capstone Prototyping',
        }),
      );
    });

    // 5. Verify the user was redirected to the overview page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/bookings');
    });
  });

  it('disables a time slot that already overlaps an existing booking', async () => {
    // Occupied window computed the same way the component derives slot times, so
    // the overlap check is independent of the test runner's local timezone.
    (useAvailability as Mock).mockReturnValue({
      slots: [
        {
          startTime: new Date('2026-10-15T14:00:00').toISOString(),
          endTime: new Date('2026-10-15T16:00:00').toISOString(),
        },
      ],
      isLoading: false,
      error: null,
    });

    const { container } = render(<NewBookingForm />);

    const equipmentSelect = container.querySelector('#equipmentId') as HTMLSelectElement;
    const dateInput = container.querySelector('#date') as HTMLInputElement;
    fireEvent.change(equipmentSelect, { target: { value: 'laser-1' } });
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

    await waitFor(() => {
      const bookedOption = screen.getByText('2:00 PM - 4:00 PM (Unavailable)');
      expect(bookedOption).toBeDisabled();
    });
  });
});
