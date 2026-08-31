import { describe, it, expect } from 'vitest';
import db from './db';
import type { PrintJob } from './types';

const makeJob = (id: string, jobPlaced: string): PrintJob => ({
  id,
  kind: 'active-print-job',
  userId: 251099999,
  user: {
    studentId: 251099999,
    firstName: 'Ordering',
    lastName: 'TestUser',
    email: 'ordering-test@uwo.ca',
  },
  name: `Job ${id}`,
  description: 'Job ordering regression test',
  category: 'Waterjet',
  status: 'InQueue',
  jobPlaced,
  reprint: null,
});

describe('Database job listing order', () => {
  it('returns jobs newest-first, so a job created after existing ones appears on page 1 (regression: previously returned raw insertion order, pushing newly created jobs onto later pages)', () => {
    db.addPrintJob(makeJob('order-test-oldest', '2020-01-01T00:00:00.000Z'));
    db.addPrintJob(makeJob('order-test-middle', '2021-01-01T00:00:00.000Z'));
    db.addPrintJob(makeJob('order-test-newest', '2022-01-01T00:00:00.000Z'));

    const jobs = db.getPrintJobs({ userId: 251099999 });
    const ids = jobs.map((j) => j.id);

    expect(ids).toEqual(['order-test-newest', 'order-test-middle', 'order-test-oldest']);
  });
});
