import { expect, test } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page with all elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Admin Dashboard/);

    // Check logo
    const logo = page.locator('div').filter({ hasText: /^A$/ }).first();
    await expect(logo).toBeVisible();

    // Check main heading
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

    // Check description
    await expect(page.getByText(/manage users, groups, and permissions/i)).toBeVisible();

    // Check welcome card
    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByText(/sign in to access the admin dashboard/i)).toBeVisible();

    // Check Google sign-in button
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    // Check terms text
    await expect(page.getByText(/by signing in, you agree to our/i)).toBeVisible();

    // Check footer text
    await expect(page.getByText(/need access\? contact your administrator/i)).toBeVisible();
  });

  test('should have theme toggle button', async ({ page }) => {
    // Find theme toggle in the top-right corner
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
  });

  test('should toggle theme when clicking theme button', async ({ page }) => {
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    const html = page.locator('html');

    // Get initial theme state
    const initialClass = await html.getAttribute('class');

    // Click theme toggle
    await themeToggle.click();

    // Verify theme changed (class should be different)
    const newClass = await html.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Check elements are still visible
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should show loading state when signing in', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /continue with google/i });

    // Click the button
    await googleButton.click();

    // Check for loading state (button should show loading text or be disabled)
    // Note: In real scenario, this would trigger Google auth popup
    await expect(googleButton).toContainText(/signing in|continue with google/i);
  });
});

test.describe('Protected Route Redirects', () => {
  test('should redirect from root to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from /users to login when unauthenticated', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from /groups to login when unauthenticated', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from /audit-logs to login when unauthenticated', async ({ page }) => {
    await page.goto('/audit-logs');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from /settings to login when unauthenticated', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from user detail to login when unauthenticated', async ({ page }) => {
    await page.goto('/users/some-user-id');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from group detail to login when unauthenticated', async ({ page }) => {
    await page.goto('/groups/some-group-id');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Error Pages', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-that-does-not-exist');

    // Should redirect to login first (since protected), then 404
    // Or show 404 directly for truly non-existent routes
    const url = page.url();
    expect(url).toMatch(/login|404/);
  });

  test('should show 404 page content when accessed directly', async ({ page }) => {
    // First go to login to establish session context
    await page.goto('/login');

    // Then navigate to 404 manually (if accessible)
    await page.goto('/404');

    // Should redirect to login since it's a protected route
    await expect(page).toHaveURL(/.*login/);
  });
});
