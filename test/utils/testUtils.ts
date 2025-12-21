import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/**
 * Setup userEvent for interaction testing
 * This should be called at the start of each test that uses user interactions
 *
 * @example
 * ```ts
 * test('user can type in input', async () => {
 *   const user = setupUser();
 *   render(<input />);
 *   await user.type(screen.getByRole('textbox'), 'Hello');
 * });
 * ```
 */
export function setupUser() {
  return userEvent.setup();
}

/**
 * Wait for MSW to process API request
 * Useful when you need to wait for an API call to complete
 *
 * @example
 * ```ts
 * test('fetches data', async () => {
 *   render(<MyComponent />);
 *   await waitForMockApi();
 *   expect(screen.getByText('Data loaded')).toBeInTheDocument();
 * });
 * ```
 */
export async function waitForMockApi(): Promise<void> {
  await waitFor(() => {}, { timeout: 100 });
}

/**
 * Mock the system date for consistent testing
 * Returns a cleanup function to restore real timers
 *
 * @example
 * ```ts
 * test('shows correct date', () => {
 *   const cleanup = mockDate('2024-01-15T10:30:00Z');
 *   // Test code here
 *   cleanup();
 * });
 * ```
 */
export function mockDate(date: string | Date): () => void {
  const mockedDate = new Date(date);
  vi.useFakeTimers();
  vi.setSystemTime(mockedDate);
  return () => vi.useRealTimers();
}

/**
 * Wait for a specific amount of time (useful with fake timers)
 *
 * @example
 * ```ts
 * test('debounced function', async () => {
 *   vi.useFakeTimers();
 *   render(<DebouncedInput />);
 *   await user.type(input, 'test');
 *   await advanceTime(500);
 *   expect(mockFn).toHaveBeenCalled();
 *   vi.useRealTimers();
 * });
 * ```
 */
export async function advanceTime(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/**
 * Suppress console errors/warnings during a test
 * Useful for testing error states without cluttering test output
 *
 * @example
 * ```ts
 * test('handles error gracefully', () => {
 *   const restore = suppressConsoleError();
 *   // Code that triggers errors
 *   restore();
 * });
 * ```
 */
export function suppressConsoleError(): () => void {
  const originalError = console.error;
  console.error = vi.fn();
  return () => {
    console.error = originalError;
  };
}

/**
 * Suppress console warnings during a test
 *
 * @example
 * ```ts
 * test('component with deprecation', () => {
 *   const restore = suppressConsoleWarn();
 *   render(<ComponentWithDeprecation />);
 *   restore();
 * });
 * ```
 */
export function suppressConsoleWarn(): () => void {
  const originalWarn = console.warn;
  console.warn = vi.fn();
  return () => {
    console.warn = originalWarn;
  };
}

/**
 * Create a spy on window.location methods
 * Useful for testing navigation and redirects
 *
 * @example
 * ```ts
 * test('redirects on submit', () => {
 *   const locationSpy = spyOnLocation();
 *   // Trigger redirect
 *   expect(locationSpy.assign).toHaveBeenCalledWith('/dashboard');
 * });
 * ```
 */
export function spyOnLocation() {
  return {
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  };
}

/**
 * Wait for an element to be removed from the DOM
 * Useful for testing loading states
 *
 * @example
 * ```ts
 * test('loading spinner disappears', async () => {
 *   render(<AsyncComponent />);
 *   const spinner = screen.getByText('Loading...');
 *   await waitForElementToBeRemoved(spinner);
 *   expect(screen.getByText('Data loaded')).toBeInTheDocument();
 * });
 * ```
 */
export async function waitForElementToBeRemoved(
  element: HTMLElement,
  options?: { timeout?: number },
): Promise<void> {
  await waitFor(
    () => {
      expect(element).not.toBeInTheDocument();
    },
    { timeout: options?.timeout ?? 3000 },
  );
}
