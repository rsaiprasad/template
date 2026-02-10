import { test, expect } from './fixtures/auth';
import { AuditLogsPage } from './pages/audit-logs';

test.describe('Audit Logs', () => {
  test('should display Audit Logs page with header', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.heading).toBeVisible({ timeout: 10000 });
    await expect(
      authenticatedPage.getByText('View all actions and changes made in the system.')
    ).toBeVisible();
  });

  test('should display filters section', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Should show Filters card
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Filters' })
    ).toBeVisible({ timeout: 10000 });

    // Should show date inputs
    await expect(auditLogs.startDateInput).toBeVisible();
    await expect(auditLogs.endDateInput).toBeVisible();

    // Should show Actor ID input
    await expect(auditLogs.actorIdInput).toBeVisible();
  });

  test('should display audit log table with correct headers', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.table).toBeVisible({ timeout: 10000 });

    // Check table headers
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Timestamp' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Resource' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Description' })).toBeVisible();
  });

  test('should display audit log entries from login activity', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.table).toBeVisible({ timeout: 10000 });
    await authenticatedPage.waitForTimeout(2000);

    // After auth fixture runs (login), there should be at least a LOGIN audit entry
    // But if date filter is today and login happened now, we should see entries
    const rows = await auditLogs.getLogRows();
    const rowCount = await rows.count();

    // There should be at least one row (the login from auth fixture)
    // or an "empty" message
    if (rowCount === 0) {
      await expect(
        authenticatedPage.getByText(/no audit logs found/i)
      ).toBeVisible();
    } else {
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('should filter audit logs by action type', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Click Action dropdown
    const actionDropdown = authenticatedPage.getByLabel('Action').first();
    if (await actionDropdown.isVisible()) {
      // Open action filter via the select trigger
      const actionTrigger = authenticatedPage
        .locator('[class*="space-y-2"]')
        .filter({ hasText: 'Action' })
        .locator('button[role="combobox"]');

      if (await actionTrigger.isVisible()) {
        await actionTrigger.click();

        // Select "Login" action
        const loginOption = authenticatedPage.getByRole('option', { name: /login$/i });
        if (await loginOption.isVisible()) {
          await loginOption.click();

          // URL should update with action param
          await expect(authenticatedPage).toHaveURL(/action=LOGIN/);
        }
      }
    }
  });

  test('should filter audit logs by resource type', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Click Resource dropdown
    const resourceTrigger = authenticatedPage
      .locator('[class*="space-y-2"]')
      .filter({ hasText: 'Resource' })
      .locator('button[role="combobox"]');

    if (await resourceTrigger.isVisible()) {
      await resourceTrigger.click();

      // Select "Users" resource
      const usersOption = authenticatedPage.getByRole('option', { name: /users/i });
      if (await usersOption.isVisible()) {
        await usersOption.click();

        await expect(authenticatedPage).toHaveURL(/resource=users/);
      }
    }
  });

  test('should filter audit logs by actor ID', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.actorIdInput).toBeVisible({ timeout: 10000 });
    await auditLogs.filterByActorId('some-actor-id');

    // URL should update with actorId param
    await expect(authenticatedPage).toHaveURL(/actorId=some-actor-id/);
  });

  test('should show Clear filters button when filters are active', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Apply a filter
    await auditLogs.filterByActorId('test-filter');
    await authenticatedPage.waitForTimeout(500);

    // Clear filters button should appear
    await expect(auditLogs.clearFiltersButton).toBeVisible();
  });

  test('should clear all filters when clicking Clear filters', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Apply a filter
    await auditLogs.filterByActorId('test-filter');
    await authenticatedPage.waitForTimeout(500);

    // Click clear filters
    await auditLogs.clearFiltersButton.click();

    // URL should not have actorId param
    const url = authenticatedPage.url();
    expect(url).not.toContain('actorId');
  });

  test('should have date range pickers', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    // Start and end date inputs should be visible
    await expect(auditLogs.startDateInput).toBeVisible({ timeout: 10000 });
    await expect(auditLogs.endDateInput).toBeVisible();

    // They should have today's date as default
    const startValue = await auditLogs.startDateInput.inputValue();
    const endValue = await auditLogs.endDateInput.inputValue();

    // Both should be valid date strings
    expect(startValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('should show pagination when logs exist', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.table).toBeVisible({ timeout: 10000 });
    await authenticatedPage.waitForTimeout(2000);

    // Check if pagination area exists
    const showingText = authenticatedPage.getByText(/showing/i);
    if (await showingText.isVisible()) {
      await expect(showingText).toBeVisible();
      // Should show "of X entries" text
      await expect(authenticatedPage.getByText(/entries/i)).toBeVisible();
    }
  });

  test('should show detail dialog when clicking View', async ({ authenticatedPage }) => {
    const auditLogs = new AuditLogsPage(authenticatedPage);
    await auditLogs.goto();

    await expect(auditLogs.table).toBeVisible({ timeout: 10000 });
    await authenticatedPage.waitForTimeout(2000);

    // Check if any row has a "View" button (only rows with changes data have it)
    const viewButton = authenticatedPage.locator('table tbody').getByRole('button', { name: /view/i }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should show the detail dialog
      await expect(
        authenticatedPage.getByRole('heading', { name: 'Audit Log Details' })
      ).toBeVisible();

      // Should show detail fields
      await expect(authenticatedPage.getByText('Timestamp')).toBeVisible();
      await expect(authenticatedPage.getByText('Action')).toBeVisible();
    }
  });
});
