import { test, expect } from './fixtures/auth';
import { SidebarPage } from './pages/sidebar';

test.describe('Navigation', () => {
  test.describe('Sidebar Navigation', () => {
    test('should display sidebar with navigation links', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);

      // Dashboard link should always be visible
      await expect(sidebar.dashboardLink).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Users page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);
      // Users link may not be visible if user lacks permissions
      if (await sidebar.usersLink.isVisible()) {
        await sidebar.usersLink.click();
        await expect(authenticatedPage).toHaveURL('/users');
        await expect(
          authenticatedPage.getByRole('heading', { name: 'Users' })
        ).toBeVisible();
      }
    });

    test('should navigate to Groups page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);
      if (await sidebar.groupsLink.isVisible()) {
        await sidebar.groupsLink.click();
        await expect(authenticatedPage).toHaveURL('/groups');
        await expect(
          authenticatedPage.getByRole('heading', { name: 'Groups' })
        ).toBeVisible();
      }
    });

    test('should navigate to Audit Logs page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);
      if (await sidebar.auditLogsLink.isVisible()) {
        await sidebar.auditLogsLink.click();
        await expect(authenticatedPage).toHaveURL('/audit-logs');
        await expect(
          authenticatedPage.getByRole('heading', { name: 'Audit Logs' })
        ).toBeVisible();
      }
    });

    test('should highlight active nav item', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);

      // Dashboard should be active on the root page
      const dashboardClasses = await sidebar.dashboardLink.getAttribute('class');
      expect(dashboardClasses).toContain('bg-primary');
    });

    test('should collapse and expand sidebar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);
      const sidebarEl = sidebar.sidebar;

      // Initially expanded (w-64)
      await expect(sidebarEl).toBeVisible({ timeout: 10000 });

      // Collapse
      const collapseBtn = authenticatedPage.getByRole('button', { name: /collapse/i });
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        // After collapse, sidebar should be narrower (w-16)
        const classes = await sidebarEl.getAttribute('class');
        expect(classes).toContain('w-16');
      }
    });
  });

  test.describe('404 Page', () => {
    test('should show 404 for invalid routes', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/this-route-does-not-exist');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should display 404 content or redirect to 404
      await expect(
        authenticatedPage.getByText(/page not found/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should have navigation back from 404', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/nonexistent-page');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should show a "Go Home" or "Back" button
      const homeButton = authenticatedPage.getByRole('link', { name: /home/i });
      const backButton = authenticatedPage.getByRole('button', { name: /back/i });

      const hasHomeButton = await homeButton.isVisible().catch(() => false);
      const hasBackButton = await backButton.isVisible().catch(() => false);

      expect(hasHomeButton || hasBackButton).toBe(true);
    });
  });

  test.describe('Browser Navigation', () => {
    test('should handle browser back/forward buttons', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/');
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebar = new SidebarPage(authenticatedPage);

      // Navigate to users if link is visible
      if (await sidebar.usersLink.isVisible()) {
        await sidebar.usersLink.click();
        await expect(authenticatedPage).toHaveURL('/users');

        // Go back
        await authenticatedPage.goBack();
        await expect(authenticatedPage).toHaveURL('/');

        // Go forward
        await authenticatedPage.goForward();
        await expect(authenticatedPage).toHaveURL('/users');
      }
    });
  });
});
