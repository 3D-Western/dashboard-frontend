import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { trainingAdminAPI } from '@/api/client/training-admin';
import { renderInTraining } from '@test/utils/renderTrainingAdmin';
import { createAdminTraining, createSettings } from '@test/utils/trainingAdminFactories';
import { TrainingSettingsForm, TrainingSettingsPage } from './TrainingSettingsForm';

vi.mock('@/api/client/training-admin', () => ({
  trainingAdminAPI: { getTraining: vi.fn(), getSettingsDefaults: vi.fn(), updateSettings: vi.fn() },
}));

const api = trainingAdminAPI as unknown as {
  getTraining: Mock;
  getSettingsDefaults: Mock;
  updateSettings: Mock;
};

const defaults = createSettings();

async function setup(settings = createSettings()) {
  const training = createAdminTraining({ settings });
  api.updateSettings.mockImplementation(async (_id: number, saved: unknown) => ({
    ...training,
    settings: saved,
  }));
  await renderInTraining(<TrainingSettingsForm defaults={defaults} />, { training });
  return training;
}

const field = (name: RegExp | string) => screen.getByRole('textbox', { name });
const save = () => userEvent.click(screen.getByRole('button', { name: /^save settings$/i }));

beforeEach(() => {
  api.getSettingsDefaults.mockResolvedValue(defaults);
});

describe('TrainingSettingsForm', () => {
  it('shows every setting with its default beside it, in plain words', async () => {
    await setup();

    for (const label of [
      'Pass mark',
      'Quiz attempts allowed',
      'Wait before trying again',
      'Warn after this long without use',
      'Block after this long without use',
      'Certification expires after',
      'Add-on grace period',
      'Add-on reminders',
    ]) {
      expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('Default: 90 %')).toBeInTheDocument();
    expect(screen.getByText('Default: Unlimited')).toBeInTheDocument();
    expect(screen.getByText('Default: 14, 7, 3, 1')).toBeInTheDocument();
    expect(screen.getByText(/questions marked critical must always be right/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/when access has lapsed/i)).toHaveValue('QUIZ');
    expect(screen.getByText(/always required for equipment trainings/i)).toBeInTheDocument();
  });

  it('shows the training’s own values, not the defaults', async () => {
    await setup(createSettings({ passMarkPercent: 100, attemptLimit: 5, refresherWarnDays: 90 }));

    expect(field('Pass mark')).toHaveValue('100');
    expect(field('Quiz attempts allowed')).toHaveValue('5');
    expect(field('Warn after this long without use')).toHaveValue('90');
  });

  it('refuses to save an invalid value and says what is wrong next to it', async () => {
    await setup();

    await userEvent.clear(field('Pass mark'));
    await userEvent.type(field('Pass mark'), '150');
    await save();

    expect(await screen.findByText('Enter a number from 1 to 100.')).toBeInTheDocument();
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('refuses a block that comes before the warning', async () => {
    await setup();

    await userEvent.type(field('Warn after this long without use'), '90');
    await userEvent.type(field('Block after this long without use'), '30');
    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /the block comes after the warning, so it cannot be earlier/i,
    );
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('refuses reminder days that are not numbers', async () => {
    await setup();

    await userEvent.clear(field('Add-on reminders'));
    await userEvent.type(field('Add-on reminders'), '7, tomorrow');
    await save();

    expect(await screen.findByText(/whole numbers of days from 1 to 365/i)).toBeInTheDocument();
  });

  it('clears the message once the value is edited again', async () => {
    await setup();
    await userEvent.clear(field('Pass mark'));
    await userEvent.type(field('Pass mark'), '0');
    await save();
    await screen.findByText('Enter a number from 1 to 100.');

    await userEvent.clear(field('Pass mark'));
    await userEvent.type(field('Pass mark'), '80');

    expect(screen.queryByText('Enter a number from 1 to 100.')).not.toBeInTheDocument();
  });

  it('saves every setting at once, with empty numbers meaning "none"', async () => {
    await setup();

    await userEvent.clear(field('Pass mark'));
    await userEvent.type(field('Pass mark'), '100');
    await userEvent.type(field('Quiz attempts allowed'), '3');
    await userEvent.clear(field('Add-on reminders'));
    await userEvent.type(field('Add-on reminders'), '3, 14');
    await userEvent.selectOptions(
      screen.getByLabelText(/when access has lapsed/i),
      'QUIZ_AND_SIGNOFF',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /draw quiz questions at random/i }));
    await save();

    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(1));
    expect(api.updateSettings).toHaveBeenCalledWith(1, {
      passMarkPercent: 100,
      attemptLimit: 3,
      retryCooldownMinutes: 60,
      refresherWarnDays: null,
      refresherBlockDays: null,
      maxAgeDays: null,
      lapsedPolicy: 'QUIZ_AND_SIGNOFF',
      addonGraceDays: 30,
      addonReminderDays: [14, 3],
      randomDrawEnabled: true,
    });
  });

  it('puts a single setting back to its default', async () => {
    await setup(createSettings({ passMarkPercent: 70 }));

    await userEvent.click(screen.getByRole('button', { name: /use the default/i }));

    expect(field('Pass mark')).toHaveValue('90');
    expect(screen.queryByRole('button', { name: /use the default/i })).not.toBeInTheDocument();
  });

  it('puts every setting back to its default', async () => {
    await setup(createSettings({ passMarkPercent: 70, attemptLimit: 2 }));

    await userEvent.click(screen.getByRole('button', { name: /reset every setting/i }));

    expect(field('Pass mark')).toHaveValue('90');
    expect(field('Quiz attempts allowed')).toHaveValue('');
  });

  it('shows the server’s problem beside the setting it names', async () => {
    await setup();
    api.updateSettings.mockRejectedValue(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          { path: 'settings.maxAgeDays', message: 'Maximum age must be between 1 and 3650 days' },
        ],
      }),
    );

    await userEvent.type(field('Certification expires after'), '400');
    await save();

    expect(
      await screen.findByText('Maximum age must be between 1 and 3650 days'),
    ).toBeInTheDocument();
  });

  it('shows a server problem that belongs to no field, and other failures', async () => {
    await setup();
    api.updateSettings.mockRejectedValueOnce(
      new ApiError('VALIDATION_FAILED', 'Validation failed', {
        errors: [
          { path: 'requiresSignoff', message: 'Equipment trainings always require sign-off' },
        ],
      }),
    );
    await save();
    expect(
      await screen.findByText('Equipment trainings always require sign-off'),
    ).toBeInTheDocument();

    api.updateSettings.mockRejectedValueOnce(
      new ApiError('FORBIDDEN', 'no', { missingPermission: 'training:author' }),
    );
    await save();
    expect(await screen.findByText(/permission to author trainings/i)).toBeInTheDocument();
  });
});

describe('TrainingSettingsPage', () => {
  it('loads the defaults before showing the form', async () => {
    await renderInTraining(<TrainingSettingsPage />);

    expect(await screen.findByRole('textbox', { name: 'Pass mark' })).toBeInTheDocument();
    expect(api.getSettingsDefaults).toHaveBeenCalled();
  });

  it('offers a retry when the defaults cannot be loaded', async () => {
    api.getSettingsDefaults.mockRejectedValueOnce(new ApiError('REQUEST_FAILED', 'offline'));
    await renderInTraining(<TrainingSettingsPage />);

    expect(await screen.findByText(/reach the server/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('textbox', { name: 'Pass mark' })).toBeInTheDocument();
  });
});
