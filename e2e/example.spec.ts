import { test, expect } from '@playwright/test';

test.describe('Example E2E Test', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await expect(page).toHaveTitle(/3D Western/i);
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.getByLabel(/student id/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
