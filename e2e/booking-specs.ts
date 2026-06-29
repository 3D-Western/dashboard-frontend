import { test, expect, type Page } from '@playwright/test';
import { TestTubes } from 'lucide-react';

//  helper function for login as user
async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/student id/i).fill('251000001');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL('/dashboard');
}

// helper function for login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/student id/i).fill('251000000'); // Admin user ID
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Bookings E2E', () => {
    test.describe('User Bookings', () => {

        test('user can create new booking', async ({ page }) => {
              await loginAsUser(page);
        
              // Navigate to new booking page
              await page.goto('/dashboard/bookings/new');

              await page.getByRole('combobox', { name: /equipment/i }).selectOption('printer-1');
              await page.getByLabel(/start time/i).fill('2026-06-25T10:00');
              await page.getByLabel(/end time/i).fill('2026-06-25T12:00');

              await page.getByRole('button', { name: /confirm/i }).click();

              // redirect back to bookings page
              await expect(page).toHaveURL(/\/dashboard\/bookings/);
            });
            
        test('receives conflict response (409) and shows UI error', async ({ page }) => {
            await loginAsUser(page);

            // go to the new booking page
            await page.goto('/dashboard/bookings/new');


            // 409 conflict response
            await page.route('**/api/v1/bookings', async (route) => {
                if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 409,
                    contentType: 'application/json',
                    body: JSON.stringify({
                    success: false,
                    error: {
                        code: 'BOOKING_CONFLICT',
                        message: 'This time slot is already reserved.'
                    }
                    })
                });
                } else {

                // if no conflict, go thru regualrly
                await route.continue(); 
                }
            });

            // mock booking
            await page.getByRole('combobox', { name: /equipment/i }).selectOption('printer-1');
            await page.getByLabel(/start time/i).fill('2026-06-25T10:00');
            await page.getByLabel(/end time/i).fill('2026-06-25T12:00');
            await page.getByRole('button', { name: /confirm/i }).click();

            // 409 case above and then redirect to new booking page
            await expect(page.getByText(/this time slot is already reserved/i)).toBeVisible({ timeout: 5000 });            
            await expect(page).toHaveURL(/\/dashboard\/bookings\/new/);
        });


        test('user can view their bookings list', async ({ page }) => {
            await loginAsUser(page);

            
            await page.goto('/dashboard/bookings');

            // Check that the basic page structure loads
            await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
            // To be checked later based on how the ui is built.
            await expect(page.locator('main')).toBeVisible();

            // this is a commentg just to trouble shoot my
            
        });

    
    });







});


