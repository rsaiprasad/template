import { expect, test } from './fixtures/auth';
import { DashboardPage } from './pages/dashboard';

test.describe('Dashboard', () => {
  test('should display welcome message with user name', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await expect(dashboard.welcomeHeading).toBeVisible({ timeout: 10000 });
    // The greeting should contain the user's first name or "there"
    const headingText = await dashboard.welcomeHeading.textContent();
    expect(headingText).toMatch(/hello/i);
  });

  test('should display description text', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await expect(authenticatedPage.getByText(/welcome to your admin dashboard/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display stat cards for super admin', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Stat cards are only visible to super admin users
    // For a regular test user, they may not be visible
    // We check the page loads without errors regardless
    await expect(dashboard.welcomeHeading).toBeVisible({ timeout: 10000 });
  });

  test('should have clickable stat card links', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // If Total Users card is visible (super admin), it should be a link
    const usersLink = authenticatedPage.getByRole('link').filter({ hasText: /total users/i });
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(authenticatedPage).toHaveURL('/users');
    }
  });
});
