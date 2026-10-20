import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { createVersionSummary } from '@test/utils/trainingAdminFactories';
import type { PublishResult } from '@/types/training-admin';
import { PublishDialog } from './PublishDialog';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { publishCheck: vi.fn(), publish: vi.fn() },
}));

const api = trainingAdminAPI as unknown as { publishCheck: Mock; publish: Mock };

const ready = {
  ready: true,
  issues: [],
  warnings: [],
  effects: { addonRequired: 0, lapsed: 0, addonDueAt: null },
};

const result = (effects: Partial<PublishResult['effects']> = {}): PublishResult => ({
  version: createVersionSummary({ versionNo: 4, status: 'PUBLISHED' }),
  retiredVersionId: 90,
  poolSize: 12,
  effects: { addonRequired: 0, lapsed: 0, addonDueAt: null, ...effects },
  warnings: [],
});

function open(props: { hasPublished?: boolean } = {}) {
  const onClose = vi.fn();
  const onPublished = vi.fn();
  render(
    <PublishDialog
      versionId={100}
      hasPublished={props.hasPublished ?? true}
      onClose={onClose}
      onPublished={onPublished}
    />,
  );
  return { onClose, onPublished };
}

const publishButton = () => screen.getByRole('button', { name: /^publish \(/i });

beforeEach(() => {
  api.publishCheck.mockResolvedValue(ready);
});

describe('PublishDialog impact choices', () => {
  it('offers the three kinds of change and starts on a minor fix', async () => {
    open();

    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['MINOR', 'ADDON', 'FULL_RETAKE']);
    expect(screen.getByRole('radio', { name: /minor fix/i })).toBeChecked();
    expect(await screen.findByText(/ready to publish/i)).toBeInTheDocument();
    expect(api.publishCheck).toHaveBeenCalledWith(100, 'MINOR');
  });

  it('explains, in plain words, what each choice does to people already certified', async () => {
    open();
    const effect = screen.getByTestId('impact-effect');
    expect(effect).toHaveTextContent(/nothing changes for anyone already certified/i);

    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));
    expect(effect).toHaveTextContent(/stay certified, but get a deadline/i);
    expect(effect).toHaveTextContent(/only the steps marked as part of the add-on/i);

    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));
    expect(effect).toHaveTextContent(/loses access until they take the whole training again/i);
  });

  it('checks the draft again for the chosen impact', async () => {
    open();
    await screen.findByText(/ready to publish/i);

    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));

    await waitFor(() => expect(api.publishCheck).toHaveBeenCalledWith(100, 'ADDON'));
  });

  it('shows what is missing and will not publish until it is fixed', async () => {
    api.publishCheck.mockResolvedValue({
      ready: false,
      warnings: [],
      effects: { addonRequired: 0, lapsed: 0, addonDueAt: null },
      issues: [
        { path: 'steps', message: 'A training needs a quiz step' },
        { path: 'signoffChecklist', message: 'Add the in-person checklist' },
      ],
    });
    open();

    expect(await screen.findByText('Fix these before publishing')).toBeInTheDocument();
    expect(screen.getByText(/needs a quiz step/)).toBeInTheDocument();
    expect(screen.getByText(/add the in-person checklist/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Fixed a typo');
    expect(publishButton()).toBeDisabled();
  });

  it('only allows a minor fix for a first version, and says why', async () => {
    open({ hasPublished: false });
    await screen.findByText(/ready to publish/i);

    expect(screen.getByRole('radio', { name: /add-on update/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /full retake/i })).toBeDisabled();
    expect(screen.getAllByText(/first version, so no one is certified/i)).toHaveLength(2);
  });
});

describe('PublishDialog reason and confirmation', () => {
  it('asks for a reason before it will publish', async () => {
    open();
    await screen.findByText(/ready to publish/i);
    expect(publishButton()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/why are you publishing/i), '   ');
    expect(publishButton()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Clearer wording');
    expect(publishButton()).toBeEnabled();
  });

  it('makes an add-on update wait for an acknowledgement of what it asks of members', async () => {
    open();
    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));
    await screen.findByText(/ready to publish/i);
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'New fire procedure');
    expect(publishButton()).toBeDisabled();

    await userEvent.click(
      screen.getByRole('checkbox', { name: /finish the steps marked as part of the add-on/i }),
    );

    expect(publishButton()).toBeEnabled();
  });

  it('asks for the acknowledgement again when the choice changes', async () => {
    open();
    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));
    await screen.findByText(/ready to publish/i);
    await userEvent.click(screen.getByRole('checkbox'));

    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));

    expect(
      screen.getByRole('checkbox', { name: /take the whole training again/i }),
    ).not.toBeChecked();
  });

  it('needs no acknowledgement for a minor fix', async () => {
    open();
    await screen.findByText(/ready to publish/i);

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('makes a full retake wait for an explicit confirmation', async () => {
    open();
    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));
    await screen.findByText(/ready to publish/i);
    await userEvent.type(
      screen.getByLabelText(/why are you publishing/i),
      'Unsafe e-stop guidance',
    );
    expect(publishButton()).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: /take the whole training again/i }));

    expect(publishButton()).toBeEnabled();
  });
});

describe('PublishDialog publishing', () => {
  async function fillAndPublish(impact?: RegExp) {
    if (impact) await userEvent.click(screen.getByRole('radio', { name: impact }));
    await screen.findByText(/ready to publish/i);
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), '  New fire procedure ');
    // An add-on or a full retake asks for an explicit acknowledgement first.
    const acknowledge = screen.queryByRole('checkbox');
    if (acknowledge) await userEvent.click(acknowledge);
    await userEvent.click(publishButton());
  }

  it('publishes with the impact and the trimmed reason, then reports what it did', async () => {
    api.publish.mockResolvedValue(result({ addonRequired: 3, addonDueAt: '2026-11-19T12:00:00Z' }));
    const { onPublished } = open();

    await fillAndPublish(/add-on update/i);

    expect(api.publish).toHaveBeenCalledWith(100, {
      impact: 'ADDON',
      reason: 'New fire procedure',
    });
    expect(await screen.findByText(/version 4 is live/i)).toBeInTheDocument();
    expect(
      screen.getByText(/3 certified members now need to finish the add-on by/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/frozen at 12 questions/i)).toBeInTheDocument();
    expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ poolSize: 12 }), 'ADDON');
  });

  it('says how many people must retake after a full retake', async () => {
    api.publish.mockResolvedValue(result({ lapsed: 5 }));
    open();
    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));
    await screen.findByText(/ready to publish/i);
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Safety fix');
    await userEvent.click(screen.getByRole('checkbox', { name: /take the whole training again/i }));
    await userEvent.click(publishButton());

    expect(
      await screen.findByText(/5 members must now retake the whole training/i),
    ).toBeInTheDocument();
  });

  it('lists what the server refused and keeps the dialog open', async () => {
    api.publish.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          { path: 'steps[2] "Intro"', message: 'The video has no uploaded file yet' },
          { path: 'impact', message: 'An add-on update needs at least one step marked as add-on' },
        ],
      }),
    );
    const { onPublished } = open();

    await fillAndPublish();

    const alert = await screen.findByText('The server would not publish');
    const list = alert.closest('[role="alert"]') as HTMLElement;
    expect(within(list).getByText(/the video has no uploaded file yet/i)).toBeInTheDocument();
    expect(within(list).getByText(/marked as add-on/i)).toBeInTheDocument();
    expect(onPublished).not.toHaveBeenCalled();
    expect(publishButton()).toBeEnabled();
  });

  it('shows a conflict message, such as someone else publishing at the same time', async () => {
    api.publish.mockRejectedValue(
      new ApiError('CONFLICT', 'This training is being published by someone else'),
    );
    open();

    await fillAndPublish();

    expect(
      await screen.findByText('This training is being published by someone else'),
    ).toBeInTheDocument();
  });

  it('shows a missing permission in plain words', async () => {
    api.publish.mockRejectedValue(
      new ApiError('FORBIDDEN', 'Forbidden', { missingPermission: 'training:publish' }),
    );
    open();

    await fillAndPublish();

    expect(await screen.findByText(/permission to publish trainings/i)).toBeInTheDocument();
  });

  it('lets the user try the check again when it could not run', async () => {
    api.publishCheck.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'));
    open();

    expect(await screen.findByText(/reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /check again/i }));

    expect(await screen.findByText(/ready to publish/i)).toBeInTheDocument();
  });
});

describe('PublishDialog says plainly what will happen to people', () => {
  const checkWith = (effects: object, extra: object = {}) => ({
    ...ready,
    effects: { addonRequired: 0, lapsed: 0, addonDueAt: null, ...effects },
    ...extra,
  });

  it('for an add-on: how many people, and by when', async () => {
    api.publishCheck.mockImplementation(async (_id: number, impact: string) =>
      impact === 'ADDON'
        ? checkWith({ addonRequired: 14, addonDueAt: '2026-11-19T12:00:00Z' })
        : checkWith({}),
    );
    open();
    await screen.findByTestId('impact-now');

    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));

    await waitFor(() =>
      expect(screen.getByTestId('impact-now')).toHaveTextContent(
        /Everyone currently certified \(14 people\) keeps access but must complete the new section by .*2026/,
      ),
    );
  });

  it('for a full retake: how many people lose access now', async () => {
    api.publishCheck.mockImplementation(async (_id: number, impact: string) =>
      impact === 'FULL_RETAKE' ? checkWith({ lapsed: 1 }) : checkWith({}),
    );
    open();
    await screen.findByTestId('impact-now');

    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));

    await waitFor(() =>
      expect(screen.getByTestId('impact-now')).toHaveTextContent(
        '1 person lose access now until they redo the training.',
      ),
    );
  });

  it('for a minor fix: that nobody is affected', async () => {
    open();

    expect(await screen.findByTestId('impact-now')).toHaveTextContent(
      'Nobody who is certified is affected.',
    );
  });

  it('says when no one is certified, so an add-on or retake changes nothing', async () => {
    api.publishCheck.mockResolvedValue(checkWith({}));
    open();
    await screen.findByTestId('impact-now');

    await userEvent.click(screen.getByRole('radio', { name: /add-on update/i }));
    await waitFor(() =>
      expect(screen.getByTestId('impact-now')).toHaveTextContent(/no one is certified right now/i),
    );
    await userEvent.click(screen.getByRole('radio', { name: /full retake/i }));
    await waitFor(() =>
      expect(screen.getByTestId('impact-now')).toHaveTextContent(/no one loses access/i),
    );
  });

  it('shows no number until the server has counted', () => {
    api.publishCheck.mockReturnValue(new Promise(() => {}));
    open();

    expect(screen.queryByTestId('impact-now')).not.toBeInTheDocument();
  });
});

describe('PublishDialog warnings', () => {
  const warning = {
    path: 'steps[1] "Long intro"',
    message: 'This video is 15 min 0 s long, longer than the 10 minutes we aim for.',
  };

  it('lists warnings without blocking the publish', async () => {
    api.publishCheck.mockResolvedValue({ ...ready, warnings: [warning] });
    open();

    expect(await screen.findByText(/worth a look/i)).toBeInTheDocument();
    expect(screen.getByText(/15 min 0 s long/)).toBeInTheDocument();
    expect(screen.getByText(/ready to publish/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Long on purpose');
    expect(publishButton()).toBeEnabled();
  });

  it('repeats the warnings once the version is live', async () => {
    api.publishCheck.mockResolvedValue({ ...ready, warnings: [warning] });
    api.publish.mockResolvedValue({ ...result(), warnings: [warning] });
    open();
    await screen.findByText(/ready to publish/i);
    await userEvent.type(screen.getByLabelText(/why are you publishing/i), 'Long on purpose');
    await userEvent.click(publishButton());

    expect(await screen.findByText(/version 4 is live/i)).toBeInTheDocument();
    expect(screen.getByText(/15 min 0 s long/)).toBeInTheDocument();
  });
});
