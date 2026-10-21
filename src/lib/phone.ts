/**
 * North American phone numbers, with the same rules as the backend's PhoneNumber.normalize
 * (backend/.../entities/user/PhoneNumber.kt). The backend is authoritative and always
 * normalises again; these helpers only give instant feedback in forms and feed the MSW mocks.
 */

export const PHONE_NUMBER_ERROR =
  'Enter a 10-digit North American phone number, such as 519-555-1234.';
export const SMS_OPT_IN_NEEDS_PHONE_ERROR = 'Add a phone number before turning on text messages.';

/**
 * @returns the number in E.164 form (for example "+15195551234"), or null if it is not a
 *          valid North American number. Blank input returns null too; check for blank first.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[0-9 ()\-.]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  let national: string;
  if (digits.length === 11 && digits.startsWith('1')) {
    national = digits.slice(1);
  } else if (digits.length === 10 && !trimmed.startsWith('+')) {
    national = digits;
  } else {
    return null;
  }

  const areaCode = national.slice(0, 3);
  const exchange = national.slice(3, 6);
  if (!/^[2-9]/.test(areaCode) || !/^[2-9]/.test(exchange)) return null;
  if (areaCode.slice(1) === '11' || exchange.slice(1) === '11') return null;

  return `+1${national}`;
}

/**
 * Form-level check for an optional phone field: blank is fine, anything else must normalise.
 */
export function isAcceptablePhoneInput(input: string): boolean {
  return input.trim() === '' || normalizePhoneNumber(input) !== null;
}

/**
 * The phone fields of a signup or profile request. A blank number is sent as null (remove it),
 * and consent is only ever sent as true alongside a valid number.
 */
export function phoneRequestFields(
  phoneInput: string,
  smsOptIn: boolean,
): { phoneNumber: string | null; smsOptIn: boolean } {
  const phoneNumber = phoneInput.trim() === '' ? null : normalizePhoneNumber(phoneInput);
  return { phoneNumber, smsOptIn: phoneNumber !== null && smsOptIn };
}
