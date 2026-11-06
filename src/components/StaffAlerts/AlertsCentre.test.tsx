import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { staffAlertsApi } from '@/api/client/staff-alerts';
import { ALERTS_CHANGED_EVENT } from '@/hooks/useAlertSummary';
import { ALERT_JOB_ID, createAlertList, createStaffAlert } from '@test/utils/staffAlertFactories';
import { AlertsCentre } from './AlertsCentre';

vi.mock('@/api/client/staff-alerts', () => ({
  staffAlertsApi: { list: vi.fn(), acknowledge: vi.fn(), resolve: vi.fn() },
}));

const api = staffAlertsApi as unknown as Record<'list' | 'acknowledge' | 'resolve', Mock>;
const NOW = new Date('2026-11-04T09:00:00Z');
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
});
afterEach(() => vi.useRealTimers());

const escalation = createStaffAlert({
  id: 3,
  kind: 'escalation',
  severity: 'critical',
  title: 'A print job was escalated',
  createdAt: '2026-11-04T08:56:00Z',
});
const hold = createStaffAlert({ id: 2, createdAt: '2026-11-04T08:20:00Z' });
const outage = createStaffAlert({
  id: 1,
  kind: 'pipeline_outage',
  severity: 'critical',
  title: 'Print pipeline is not responding',
  summary: 'The dashboard cannot reach the slicing pipeline.',
  details: [],
  target: { type: 'pipeline_health' },
  occurrences: 3,
});

describe('AlertsCentre', () => {
  it('asks for open alerts first and lists them in the order the backend gives (newest first)', async () => {
    api.list.mockResolvedValue(createAlertList([escalation, hold]));
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    await screen.findByText('A print job was escalated');
    expect(api.list).toHaveBeenLastCalledWith({ state: ['open'], limit: 50 });
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['A print job was escalated', 'A print job was held']);
    expect(screen.getByText('4 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('2 alerts, newest first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Open 2$/ })).toBeInTheDocument();
  });

  it('offers the student_disagrees kind as a filter and shows the reason and conversation', async () => {
    const disagrees = createStaffAlert({
      id: 20,
      kind: 'student_disagrees',
      title: 'A student disagrees with a decision',
      details: [
        { label: 'Job', value: ALERT_JOB_ID },
        { label: "Student's reason", value: 'The supports ruined my part' },
        { label: 'Question 1', value: 'Why supports?' },
        { label: 'Answer 1 (answered)', value: 'The arm overhangs.' },
        { label: 'Question 2', value: 'Really?' },
        { label: 'Answer 2 (declined)', value: 'I can only explain.' },
      ],
    });
    api.list.mockResolvedValue(createAlertList([disagrees]));
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    await screen.findByText('A student disagrees with a decision');
    expect(screen.getByText("Student's reason")).toBeInTheDocument();
    expect(screen.getByText('The supports ruined my part')).toBeInTheDocument();
    expect(screen.getByText('Answer 2 (declined)')).toBeInTheDocument();
    expect(screen.getByText('I can only explain.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /student disagrees/i })).toBeInTheDocument();
  });

  it('links each alert straight to where it is dealt with', async () => {
    api.list.mockResolvedValue(
      createAlertList([
        hold,
        outage,
        createStaffAlert({ id: 9, target: { type: 'printer', id: 'p-1' }, title: 'Printer' }),
      ]),
    );
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    await screen.findByText('Print pipeline is not responding');
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([`/admin/review/${ALERT_JOB_ID}`, '/admin/review', '/admin/review/farm']);
    expect(screen.getByRole('link', { name: 'Open the job' })).toBeInTheDocument();
    expect(screen.getByText('Raised 3 times')).toBeInTheDocument();
  });

  it('filters by kind and state through the backend', async () => {
    api.list.mockResolvedValue(createAlertList([hold]));
    const user = setup();
    render(<AlertsCentre now={NOW} refreshMs={0} />);
    await screen.findByText('A print job was held');

    await user.click(
      within(screen.getByRole('group', { name: /kind/i })).getByRole('button', { name: 'Hold' }),
    );
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({ kind: ['hold'], state: ['open'], limit: 50 }),
    );

    await user.click(
      within(screen.getByRole('group', { name: /state/i })).getByRole('button', {
        name: 'Resolved',
      }),
    );
    await waitFor(() =>
      expect(api.list).toHaveBeenLastCalledWith({
        kind: ['hold'],
        state: ['open', 'resolved'],
        limit: 50,
      }),
    );
  });

  it('says nothing needs a person when the open list is empty', async () => {
    api.list.mockResolvedValue(createAlertList([]));
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    expect(await screen.findByText('No alerts need a person.')).toBeInTheDocument();
  });

  it('acknowledges in place: the card changes, the count drops, the nav badge is told', async () => {
    api.list.mockResolvedValue(createAlertList([hold]));
    api.acknowledge.mockResolvedValue({
      ...hold,
      state: 'acknowledged',
      acknowledgedAt: '2026-11-04T08:59:00Z',
      acknowledgedBy: { id: 5, name: 'Cam Crew' },
    });
    const changed = vi.fn();
    window.addEventListener(ALERTS_CHANGED_EVENT, changed);
    const user = setup();
    render(<AlertsCentre now={NOW} refreshMs={0} />);
    await screen.findByText('A print job was held');

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));

    expect(api.acknowledge).toHaveBeenCalledWith(2);
    expect(await screen.findByText(/Acknowledged by Cam Crew/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Open 0$/ })).toBeInTheDocument();
    expect(screen.getByText('A print job was held')).toBeInTheDocument(); // still there until the next refresh
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(ALERTS_CHANGED_EVENT, changed);
  });

  it('needs a note to resolve, then closes the alert in place with who and why', async () => {
    api.list.mockResolvedValue(createAlertList([hold]));
    api.resolve.mockResolvedValue({
      ...hold,
      state: 'resolved',
      resolvedAt: '2026-11-04T08:59:30Z',
      resolvedBy: { id: 5, name: 'Cam Crew' },
      resolutionNote: 'It is a bracket',
    });
    const user = setup();
    render(<AlertsCentre now={NOW} refreshMs={0} />);
    await screen.findByText('A print job was held');

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await user.click(screen.getByRole('button', { name: 'Mark resolved' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A note is required.');
    await user.type(screen.getByLabelText(/Resolution note/), 'ab');
    await user.click(screen.getByRole('button', { name: 'Mark resolved' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 3/);
    expect(api.resolve).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/Resolution note/));
    await user.type(screen.getByLabelText(/Resolution note/), '  It is a bracket ');
    await user.click(screen.getByRole('button', { name: 'Mark resolved' }));

    expect(api.resolve).toHaveBeenCalledWith(2, { note: 'It is a bracket' });
    expect(await screen.findByText(/Resolved by Cam Crew/)).toHaveTextContent('It is a bracket');
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Resolution note/)).not.toBeInTheDocument();
  });

  it('shows the backend message when an action fails and lets staff try again', async () => {
    api.list.mockResolvedValue(createAlertList([hold]));
    api.acknowledge.mockRejectedValue(
      new ApiError('INVALID_JOB_STATUS', 'That alert is already resolved'),
    );
    const user = setup();
    render(<AlertsCentre now={NOW} refreshMs={0} />);
    await screen.findByText('A print job was held');

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));

    expect(await screen.findByText('That alert is already resolved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeEnabled();
  });

  it('shows resolved alerts that closed themselves as closed automatically, without action buttons', async () => {
    api.list.mockResolvedValue(
      createAlertList([
        createStaffAlert({
          id: 4,
          state: 'resolved',
          autoResolved: true,
          resolvedAt: '2026-11-04T08:30:00Z',
          resolutionNote: 'Hold cleared: the job is now queued',
        }),
      ]),
    );
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    expect(await screen.findByText(/Closed automatically/)).toHaveTextContent(
      'Hold cleared: the job is now queued',
    );
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the job' })).toBeInTheDocument();
  });

  it('reloads by itself like the review queue', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.list.mockResolvedValue(createAlertList([hold]));
    render(<AlertsCentre now={NOW} refreshMs={15_000} />);
    await screen.findByText('A print job was held');
    expect(api.list).toHaveBeenCalledTimes(1);

    api.list.mockResolvedValue(createAlertList([escalation, hold]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_100);
    });

    expect(await screen.findByText('A print job was escalated')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('shows an error when the alerts cannot be loaded', async () => {
    api.list.mockRejectedValue(new Error('UNKNOWN_ERROR'));
    render(<AlertsCentre now={NOW} refreshMs={0} />);

    expect(await screen.findByText("We couldn't load the alerts.")).toBeInTheDocument();
  });

  it('offers more when the backend has more than it returned', async () => {
    api.list.mockResolvedValue(createAlertList([hold], { total: 120 }));
    const user = setup();
    render(<AlertsCentre now={NOW} refreshMs={0} />);
    await screen.findByText('A print job was held');

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ state: ['open'], limit: 100 }));
  });
});
