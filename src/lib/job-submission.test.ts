import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitJob } from './job-submission';

// Mock external dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/api/client/endpoints', () => ({
  endpoints: {
    jobs: {
      create: '/api/v1/jobs',
    },
  },
}));

describe('submitJob', () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };

  const mockFetch = vi.fn();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    // Mock successful fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { job: { id: 'test-job-123' } },
      }),
    });
  });

  it('should successfully submit an job', async () => {
    const jobData = {
      name: 'Test Job',
      description: 'Test Description',
      material: 'acrylic',
      file: new File(['test'], 'test.dxf', { type: 'application/dxf' }),
    };

    const options = {
      category: 'laser-cutting',
      successRedirectPath: '/dashboard/print',
    } as const;

    await submitJob(jobData, options, mockRouter);

    // Check that fetch was called with the right URL and method
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/jobs',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Parse the body and check its contents
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body).toEqual({
      category: 'LaserCutting',
      jobName: 'Test Job',
      description: 'Test Description',
      formAnswerJson: expect.any(String),
    });
    expect(JSON.parse(body.formAnswerJson)).toEqual({
      material: 'acrylic',
      purpose: '',
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

    const jobData = {
      name: 'Test Job',
      description: 'Test Description',
      material: 'aluminum',
    };

    const options = {
      category: 'cnc',
      errorMessagePrefix: 'CNC job submit failed',
    } as const;

    await expect(submitJob(jobData, options, mockRouter)).rejects.toThrow('Server error');
  });

  it('should work without a file', async () => {
    const jobData = {
      name: 'No File Job',
      description: 'Job without file',
      material: 'wood',
    };

    const options = {
      category: 'laser-cutting',
    } as const;

    await submitJob(jobData, options, mockRouter);

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'LaserCutting',
        jobName: 'No File Job',
        description: 'Job without file',
        formAnswerJson: JSON.stringify({
          material: 'wood',
          purpose: '',
          fileId: '',
          priority: 'standard',
          urgency: 'normal',
        }),
      }),
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });

  it('should use default redirect path when not specified', async () => {
    const jobData = {
      name: 'Default Path Test',
      description: 'Testing default redirect',
      material: 'plastic',
    };

    const options = {
      category: 'cnc',
    } as const;

    await submitJob(jobData, options, mockRouter);

    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });
});
