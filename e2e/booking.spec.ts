import { test, expect, type Page } from '@playwright/test';

// The mock login flow always requires MFA - the mock OTP is fixed at "123456"
// (logged by the mock server on every login attempt, see session-handlers.ts).
async function completeLogin(page: Page, studentId: string) {
  await page.goto('/login');
  await page.getByLabel(/student id/i).fill(studentId);
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /^login$/i }).click();

  await expect(page).toHaveURL(/\/mfa/);
  await page.locator('#otp').fill('123456');
  await page.getByRole('button', { name: /^verify$/i }).click();

  await expect(page).toHaveURL('/dashboard');
}

// Note: 251000001 is seeded as a `regular_admins` account, but it also has the LEVEL_2
// training required to book equipment (see canAccessBooking) - the seeded `members`
// account (251000002) is LEVEL_1 and cannot book anything, so this is the account used
// to exercise the member-facing booking flow.
async function loginAsUser(page: Page) {
  await completeLogin(page, '251000001');
}

async function loginAsAdmin(page: Page) {
  await completeLogin(page, '251000000');
}

async function logout(page: Page) {
  const logoutButton = page
    .getByRole('button', { name: /logout/i })
    .or(page.getByRole('menuitem', { name: /logout/i }));
  await logoutButton.click();
}

// Unique per test run so bookings from different runs/workers never collide,
// and so a booking can be found later by its purpose text.
function uniquePurpose(label: string) {
  return `${label} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function fillNewBookingForm(
  page: Page,
  { equipmentId, date, timeSlot, purpose }: { equipmentId: string; date: string; timeSlot: string; purpose: string },
) {
  await page.goto('/dashboard/bookings/new');
  await page.getByLabel(/^equipment$/i).selectOption(equipmentId);
  await page.getByLabel(/^date$/i).fill(date);
  await page.getByLabel(/^time slot$/i).selectOption(timeSlot);
  await page.getByLabel(/^purpose$/i).fill(purpose);
}

test.describe('Bookings E2E', () => {
  test.describe('User Bookings', () => {
    test('user can create a new booking', async ({ page }) => {
      await loginAsUser(page);
      await fillNewBookingForm(page, {
        equipmentId: 'laser-1',
        date: '2027-03-15',
        timeSlot: '10:00 AM - 12:00 PM',
        purpose: uniquePurpose('Capstone bracket'),
      });

      await page.getByRole('button', { name: /confirm booking/i }).click();

      await expect(page).toHaveURL(/\/dashboard\/bookings$/);
    });

    test('prevents double-booking the same equipment and time slot', async ({ page }) => {
      await loginAsUser(page);

      // First booking claims the slot.
      await fillNewBookingForm(page, {
        equipmentId: 'circuit-1',
        date: '2027-03-20',
        timeSlot: '2:00 PM - 4:00 PM',
        purpose: uniquePurpose('Overlap test'),
      });
      await page.getByRole('button', { name: /confirm booking/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/bookings$/);

      // A second attempt for the exact same equipment/date/slot must be blocked
      // client-side (the option is disabled) rather than left submittable.
      await page.goto('/dashboard/bookings/new');
      await page.getByLabel(/^equipment$/i).selectOption('circuit-1');
      await page.getByLabel(/^date$/i).fill('2027-03-20');

      const bookedOption = page.locator('#timeSlot option', {
        hasText: '2:00 PM - 4:00 PM (Unavailable)',
      });
      await expect(bookedOption).toHaveCount(1);
      await expect(bookedOption).toBeDisabled();
    });

    test('user can view a newly created booking in their bookings list', async ({ page }) => {
      await loginAsUser(page);
      const purpose = uniquePurpose('Visible in list');

      await fillNewBookingForm(page, {
        equipmentId: 'sewing-1',
        date: '2027-03-25',
        timeSlot: '4:00 PM - 6:00 PM',
        purpose,
      });
      await page.getByRole('button', { name: /confirm booking/i }).click();

      await expect(page).toHaveURL(/\/dashboard\/bookings$/);
      await expect(page.getByRole('heading', { name: /my reservations/i })).toBeVisible();
      await expect(page.getByText(purpose)).toBeVisible();
    });
  });

  test.describe('Admin Booking Management', () => {
    test('admin can approve a pending booking request', async ({ page }) => {
      const purpose = uniquePurpose('Needs approval');

      // waterjet-1 requires admin approval by default (see capacity-settings.ts),
      // so submitting here should land the booking in PENDING, not APPROVED.
      await loginAsUser(page);
      await fillNewBookingForm(page, {
        equipmentId: 'waterjet-1',
        date: '2027-04-01',
        timeSlot: '8:00 AM - 10:00 AM',
        purpose,
      });

      await expect(
        page.getByRole('button', { name: /submit request for approval/i }),
      ).toBeVisible();
      await page.getByRole('button', { name: /submit request for approval/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/bookings$/);

      await logout(page);
      await loginAsAdmin(page);
      await page.goto('/admin/requests');

      const requestCard = page.locator('div.rounded-lg', { hasText: purpose });
      await expect(requestCard).toBeVisible();

      await requestCard.getByRole('button', { name: 'Approve' }).click();

      await expect(requestCard).toHaveCount(0);
    });
  });
});
