import { describe, it, expect } from 'vitest';
import { isAcceptablePhoneInput, normalizePhoneNumber, phoneRequestFields } from './phone';

describe('normalizePhoneNumber', () => {
  it.each([
    '+15195551234',
    '+1 519 555 1234',
    '+1 (519) 555-1234',
    '1-519-555-1234',
    '15195551234',
    '5195551234',
    '519-555-1234',
    '(519) 555-1234',
    '519.555.1234',
    '  519 555 1234  ',
  ])('normalises %s to E.164', (input) => {
    expect(normalizePhoneNumber(input)).toBe('+15195551234');
  });

  it.each([
    '',
    '519-555-123',
    '519-555-12345',
    '+5195551234',
    '+44 20 7946 0958',
    '+1 519 555 1234 ext 5',
    '519-555-CALL',
    '0195551234',
    '1195551234',
    '519-155-1234',
    '911-555-1234',
    '519-911-1234',
    '2-519-555-1234',
  ])('refuses %j', (input) => {
    expect(normalizePhoneNumber(input)).toBeNull();
  });
});

describe('isAcceptablePhoneInput', () => {
  it('accepts blank, since the field is optional', () => {
    expect(isAcceptablePhoneInput('')).toBe(true);
    expect(isAcceptablePhoneInput('   ')).toBe(true);
  });

  it('accepts a valid number and refuses an invalid one', () => {
    expect(isAcceptablePhoneInput('519-555-1234')).toBe(true);
    expect(isAcceptablePhoneInput('12345')).toBe(false);
  });
});

describe('phoneRequestFields', () => {
  it('sends the normalised number with consent when both are given', () => {
    expect(phoneRequestFields('(519) 555-1234', true)).toEqual({
      phoneNumber: '+15195551234',
      smsOptIn: true,
    });
  });

  it('sends null and no consent for a blank number, even if the box was ticked', () => {
    expect(phoneRequestFields('  ', true)).toEqual({ phoneNumber: null, smsOptIn: false });
  });

  it('keeps consent off when the box is not ticked', () => {
    expect(phoneRequestFields('519-555-1234', false)).toEqual({
      phoneNumber: '+15195551234',
      smsOptIn: false,
    });
  });
});
