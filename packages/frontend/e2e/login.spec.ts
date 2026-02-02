import { expect, test } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Check for main elements
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/users');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should have a theme toggle', async ({ page }) => {
    await page.goto('/login');

    // Find and click theme toggle
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  // Note: These tests would need proper authentication setup
  // For now, they verify the routes exist and redirect properly

  test('should redirect unauthenticated user from dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user from users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user from groups page', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated user from settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/.*login/);
  });
});
