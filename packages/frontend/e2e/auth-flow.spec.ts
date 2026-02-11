import { expect, test } from './fixtures/auth';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display login page elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('should redirect all protected routes to login when unauthenticated', async ({ page }) => {
    const protectedRoutes = ['/users', '/groups', '/audit-logs', '/profile'];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*login/);
    }
  });

  test('should show authenticated dashboard after login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Should not be redirected to login
    await expect(authenticatedPage).not.toHaveURL(/.*login/);

    // Should see the dashboard greeting
    await expect(authenticatedPage.getByRole('heading', { name: /hello/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should persist auth state across page reloads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify we're authenticated
    await expect(authenticatedPage).not.toHaveURL(/.*login/);

    // Reload the page
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    // Should still be authenticated (sessionStorage persists on reload)
    await expect(authenticatedPage).not.toHaveURL(/.*login/);
  });
});
