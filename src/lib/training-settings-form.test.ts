import { describe, it, expect } from 'vitest';
import { createSettings } from '@test/utils/trainingAdminFactories';
import {
  describeDefault,
  NUMBER_SETTINGS,
  toFormValues,
  validateSettings,
} from './training-settings-form';

const valid = () => toFormValues(createSettings());

describe('validateSettings', () => {
  it('accepts the defaults and turns blanks into "none"', () => {
    const { errors, settings } = validateSettings(valid());

    expect(errors).toEqual({});
    expect(settings).toEqual(createSettings());
  });

  it('rejects a pass mark outside 1 to 100', () => {
    for (const value of ['0', '101', 'abc', '']) {
      const { errors, settings } = validateSettings({ ...valid(), passMarkPercent: value });
      expect(errors.passMarkPercent).toBeTruthy();
      expect(settings).toBeNull();
    }
  });

  it('lets the optional numbers stay empty', () => {
    const { settings } = validateSettings({
      ...valid(),
      attemptLimit: '',
      refresherWarnDays: '',
      refresherBlockDays: '',
      maxAgeDays: '',
    });
    expect(settings).toMatchObject({
      attemptLimit: null,
      refresherWarnDays: null,
      refresherBlockDays: null,
      maxAgeDays: null,
    });
  });

  it('requires the required numbers', () => {
    const { errors } = validateSettings({
      ...valid(),
      retryCooldownMinutes: '',
      addonGraceDays: '',
    });
    expect(errors.retryCooldownMinutes).toMatch(/required/i);
    expect(errors.addonGraceDays).toMatch(/required/i);
  });

  it('applies each range of the server', () => {
    const cases: [
      (
        | 'attemptLimit'
        | 'retryCooldownMinutes'
        | 'refresherWarnDays'
        | 'maxAgeDays'
        | 'addonGraceDays'
      ),
      string,
    ][] = [
      ['attemptLimit', '101'],
      ['retryCooldownMinutes', '10081'],
      ['refresherWarnDays', '3651'],
      ['maxAgeDays', '0'],
      ['addonGraceDays', '366'],
    ];
    for (const [key, value] of cases) {
      expect(validateSettings({ ...valid(), [key]: value }).errors[key]).toMatch(/from/);
    }
  });

  it('refuses a block earlier than the warning', () => {
    const { errors } = validateSettings({
      ...valid(),
      refresherWarnDays: '90',
      refresherBlockDays: '30',
    });
    expect(errors.refresherBlockDays).toMatch(/cannot be earlier than the warning/i);
  });

  it('accepts a block equal to or after the warning', () => {
    expect(
      validateSettings({ ...valid(), refresherWarnDays: '90', refresherBlockDays: '90' }).settings,
    ).not.toBeNull();
  });

  it('parses reminder days, largest first', () => {
    const { settings } = validateSettings({ ...valid(), addonReminderDays: '1, 7 14' });
    expect(settings?.addonReminderDays).toEqual([14, 7, 1]);
  });

  it('allows no reminders at all', () => {
    expect(
      validateSettings({ ...valid(), addonReminderDays: '' }).settings?.addonReminderDays,
    ).toEqual([]);
  });

  it('rejects bad, repeated or too many reminder days', () => {
    expect(
      validateSettings({ ...valid(), addonReminderDays: '7, soon' }).errors.addonReminderDays,
    ).toBeTruthy();
    expect(
      validateSettings({ ...valid(), addonReminderDays: '0' }).errors.addonReminderDays,
    ).toBeTruthy();
    expect(
      validateSettings({ ...valid(), addonReminderDays: '7, 7' }).errors.addonReminderDays,
    ).toMatch(/once/);
    const many = Array.from({ length: 13 }, (_, i) => i + 1).join(', ');
    expect(
      validateSettings({ ...valid(), addonReminderDays: many }).errors.addonReminderDays,
    ).toMatch(/12/);
  });
});

describe('describeDefault', () => {
  it('words a numeric default with its unit and a missing one as "never"', () => {
    const defaults = createSettings();
    const pass = NUMBER_SETTINGS.find((f) => f.key === 'passMarkPercent')!;
    const warn = NUMBER_SETTINGS.find((f) => f.key === 'refresherWarnDays')!;
    expect(describeDefault(pass, defaults)).toBe('90 %');
    expect(describeDefault(warn, defaults)).toBe('Never');
  });
});
