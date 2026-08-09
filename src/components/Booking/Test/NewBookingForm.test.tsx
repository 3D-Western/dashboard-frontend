import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import NewBookingForm from '../NewBookingForm';

// Import the hooks so we can mock their return values dynamically
import { useRouter } from 'next/navigation';
import { useCreateBooking } from '@/hooks/useBookings';
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
}));

vi.mock('@/api/client/base', () => ({
  apiRequest: vi.fn(),
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

    // Equipment settings fetch fired on equipment-select. No approval required so
    // the submit button stays "Confirm Booking" rather than "Loading Rules...".
    (apiRequest as Mock).mockResolvedValue({
      data: {
        equipmentId: 'printer-1',
        maxSimultaneousBookings: 1,
        requireAdminApproval: false,
        allowWaitlist: false,
        restrictions: { requiresTraining: false },
      },
    });
  });

  it('renders all required form fields', () => {
    // We extract 'container' to query the DOM explicitly by ID
    const { container } = render(<NewBookingForm />);

    // Check inputs directly by their ID to bypass label accessibility strictness
    expect(container.querySelector('#equipmentId')).toBeInTheDocument();
    expect(container.querySelector('#date')).toBeInTheDocument();
    expect(container.querySelector('#timeSlot')).toBeInTheDocument();
    expect(container.querySelector('#purpose')).toBeInTheDocument();

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
    fireEvent.change(equipmentSelect, { target: { value: 'printer-1' } });
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
          equipmentId: 'printer-1',
          purpose: 'Capstone Prototyping',
        }),
      );
    });

    // 5. Verify the user was redirected to the overview page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/bookings');
    });
  });
});
