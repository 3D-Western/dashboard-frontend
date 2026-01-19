import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitOrder } from './order-submission';

// Mock external dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/api/client/endpoints', () => ({
  endpoints: {
    orders: {
      create: '/api/orders',
    },
  },
}));

describe('submitOrder', () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;

    // Mock successful fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { order: { id: 'test-order-123' } },
      }),
    });
  });

  it('should successfully submit an order', async () => {
    const orderData = {
      name: 'Test Order',
      description: 'Test Description',
      material: 'acrylic',
      file: new File(['test'], 'test.dxf', { type: 'application/dxf' }),
    };

    const options = {
      category: 'laser-cutting',
      successRedirectPath: '/dashboard/print',
    };

    await submitOrder(orderData, options, mockRouter);

    // Check that fetch was called with the right URL and method
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Parse the body and check its contents
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body).toEqual({
      category: 'laser-cutting',
      name: 'Test Order',
      description: 'Test Description',
      material: 'acrylic',
      fileId: expect.stringMatching(/^mock-lasercutting-file-\d+$/),
      priority: 'standard',
      urgency: 'normal',
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/print');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Server error'),
    });

    const orderData = {
      name: 'Test Order',
      description: 'Test Description',
      material: 'aluminum',
    };

    const options = {
      category: 'cnc',
      errorMessagePrefix: 'CNC order submit failed',
    };

    await expect(submitOrder(orderData, options, mockRouter)).rejects.toThrow('Server error');
  });

  it('should work without a file', async () => {
    const orderData = {
      name: 'No File Order',
      description: 'Order without file',
      material: 'wood',
    };

    const options = {
      category: 'laser-cutting',
    };

    await submitOrder(orderData, options, mockRouter);

    expect(mockFetch).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'laser-cutting',
        name: 'No File Order',
        description: 'Order without file',
        material: 'wood',
        fileId: '',
        priority: 'standard',
        urgency: 'normal',
      }),
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('should use default redirect path when not specified', async () => {
    const orderData = {
      name: 'Default Path Test',
      description: 'Testing default redirect',
      material: 'plastic',
    };

    const options = {
      category: 'cnc',
    };

    await submitOrder(orderData, options, mockRouter);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });
});
