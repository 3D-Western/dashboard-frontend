import { describe, it, expect } from 'vitest';
import { findActiveJob } from './active-job';
import type { PrintJob } from '@/types/jobs';

const job = (over: Partial<PrintJob>) =>
  ({ id: 'a', name: 'A', category: 'ThreeDPrint', status: 'InQueue', ...over }) as PrintJob;

describe('findActiveJob', () => {
  it('finds the 3D print that is queued or printing', () => {
    expect(
      findActiveJob([job({ status: 'Ready' }), job({ id: 'b', status: 'Printing' })])?.id,
    ).toBe('b');
  });
  it('ignores finished, refused and other kinds of job', () => {
    expect(
      findActiveJob([
        job({ studentStatus: 'collected' }),
        job({ studentStatus: 'cannot_print' }),
        job({ category: 'CNC' }),
      ]),
    ).toBeNull();
    expect(findActiveJob(undefined)).toBeNull();
  });
});
