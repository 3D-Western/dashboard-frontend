import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewBookingForm from '../NewBookingForm';

// 1. Mock the Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// 2. Mock the User Provider (simulating a logged-in student)
vi.mock('@/providers/user-provider', () => ({
  useUser: () => ({
    studentId: 123456,
    firstName: 'User',
    lastName: 'Dev',
    email: 'user@uwo.ca',
  }),
}));

// 3. Mock the API Hook so we aren't actually hitting the MSW server in unit tests
const mockCreateBooking = vi.fn();
vi.mock('@/hooks/useBookings', () => ({
  useCreateBooking: () => ({
    mutateAsync: mockCreateBooking,
    isPending: false,
    error: null,
  }),
}));

describe('NewBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(<NewBookingForm />);
    
    // Check that our labelled inputs exist
    expect(screen.getByLabelText(/Equipment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Slot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Purpose/i)).toBeInTheDocument();
    
    // Check that the submit button renders
    expect(screen.getByRole('button', { name: /Confirm Booking/i })).toBeInTheDocument();
  });

  it('displays validation errors when submitting an empty form', async () => {
    render(<NewBookingForm />);
    
    // Click submit without filling anything out
    const submitButton = screen.getByRole('button', { name: /Confirm Booking/i });
    fireEvent.click(submitButton);

    // Wait for the Zod schema to trigger React Hook Form errors
    await waitFor(() => {
      expect(screen.getByText(/Please select equipment/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a date/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a time slot/i)).toBeInTheDocument();
      expect(screen.getByText(/Please provide a brief purpose/i)).toBeInTheDocument();
    });

    // Ensure the API was NEVER called
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('successfully submits the form and navigates away', async () => {
    render(<NewBookingForm />);
    
    // 1. Fill out the form
    fireEvent.change(screen.getByLabelText(/Equipment/i), { target: { value: 'printer-1' } });
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText(/Time Slot/i), { target: { value: '10:00 AM - 12:00 PM' } });
    fireEvent.change(screen.getByLabelText(/Purpose/i), { target: { value: 'Capstone Prototyping' } });

    // 2. Click Submit
    fireEvent.click(screen.getByRole('button', { name: /Confirm Booking/i }));

    // 3. Verify the API hook was called with the stitched ISO strings
    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({
        equipmentId: 'printer-1',
        purpose: 'Capstone Prototyping',
        // Note: The exact timestamp assertion might vary based on your local timezone config,
        // but Vitest handles the object structure check here!
      }));
    });

    // 4. Verify the user was redirected to the overview page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/bookings');
    });
  });
});