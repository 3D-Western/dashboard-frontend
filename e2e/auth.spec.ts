import { test, expect } from '@playwright/test';

test.describe('Authentication Flow E2E', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form with valid credentials (from mock data)
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('password');

    // Click login button
    await page.getByRole('button', { name: /^login$/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should see user information (from mock user)
    await expect(page.getByText(/john doe/i)).toBeVisible({ timeout: 10000 });
  });

  test('invalid credentials show error and stay on login page', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form with invalid credentials
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Click login button
    await page.getByRole('button', { name: /^login$/i }).click();

    // Should show error toast
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login with error parameter
    await expect(page).toHaveURL(/\/login/);

    // URL should contain unauthenticated error
    expect(page.url()).toContain('error=unauthenticated');
  });

  test('authenticated users can access protected routes', async ({ page }) => {
    // First, log in
    await page.goto('/login');
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Now try to access other protected routes
    await page.goto('/dashboard/print');
    await expect(page).toHaveURL('/dashboard/print');

    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL('/dashboard/settings');
  });

  test('logout redirects to home page', async ({ page }) => {
    // First, log in
    await page.goto('/login');
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Find and click logout button (might be in a menu)
    // Try different selectors as logout button might be in sidebar or header
    const logoutButton = page
      .getByRole('button', { name: /logout/i })
      .or(page.getByRole('menuitem', { name: /logout/i }));

    await logoutButton.click();

    // Should redirect to home page
    await expect(page).toHaveURL('/');
  });

  test('after logout, cannot access protected routes', async ({ page }) => {
    // First, log in
    await page.goto('/login');
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL('/dashboard');

    // Logout
    const logoutButton = page
      .getByRole('button', { name: /logout/i })
      .or(page.getByRole('menuitem', { name: /logout/i }));
    await logoutButton.click();
    await expect(page).toHaveURL('/');

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('session persists across page refreshes', async ({ page }) => {
    // Log in
    await page.goto('/login');
    await page.getByLabel(/student id/i).fill('251000001');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL('/dashboard');

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/john doe/i)).toBeVisible({ timeout: 10000 });
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.getByText(/forgot your password/i).click();

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password');
  });

  test('sign up link navigates correctly', async ({ page }) => {
    await page.goto('/login');

    // Click sign up link
    await page.getByText(/sign up/i).click();

    // Should navigate to signup page
    await expect(page).toHaveURL('/signup');
  });

  test('form validation prevents submission with invalid student ID', async ({ page }) => {
    await page.goto('/login');

    // Try to submit with invalid student ID
    await page.getByLabel(/student id/i).fill('123'); // Too short
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();

    // Should show validation error
    await expect(page.getByText(/must be exactly 9 digits/i)).toBeVisible();

    // Should not redirect
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin user can access admin routes', async ({ page }) => {
    // Log in as admin (using mock admin credentials)
    await page.goto('/login');
    await page.getByLabel(/student id/i).fill('251000000'); // Admin user ID from mock
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /^login$/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL('/dashboard');

    // Try to access admin route
    await page.goto('/admin');

    // Should be able to access (not redirect)
    await expect(page).toHaveURL(/\/admin/);
  });
});
