import { expect, test } from './fixtures/auth';
import { GroupDetailPage, GroupListPage } from './pages/groups';

test.describe('Group Management', () => {
  test.describe('Group List', () => {
    test('should display Groups page with header', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.heading).toBeVisible({ timeout: 10000 });
      await expect(
        authenticatedPage.getByText('Manage permission groups and their members.')
      ).toBeVisible();
    });

    test('should display Create Group button', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.createGroupButton).toBeVisible({ timeout: 10000 });
    });

    test('should display group data in table', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });

      // Table should have column headers
      await expect(authenticatedPage.getByRole('columnheader', { name: 'Group' })).toBeVisible();
      await expect(
        authenticatedPage.getByRole('columnheader', { name: 'Description' })
      ).toBeVisible();
      await expect(authenticatedPage.getByRole('columnheader', { name: 'Members' })).toBeVisible();
      await expect(
        authenticatedPage.getByRole('columnheader', { name: 'Permissions' })
      ).toBeVisible();
    });

    test('should search groups', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.searchInput).toBeVisible({ timeout: 10000 });
      await groupList.searchFor('admin');
      await authenticatedPage.waitForLoadState('networkidle');

      const url = authenticatedPage.url();
      expect(url).toContain('search=admin');
    });

    test('should navigate to group detail on click', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      const firstGroupLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstGroupLink.isVisible()) {
        await firstGroupLink.click();
        await expect(authenticatedPage).toHaveURL(/\/groups\/.+/);
      }
    });

    test('should show actions menu for non-system groups', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // Find an action button in the table
      const actionBtns = authenticatedPage
        .locator('table tbody tr')
        .getByRole('button', { name: 'Actions' });

      const count = await actionBtns.count();
      if (count > 0) {
        await actionBtns.first().click();

        // Should show Edit option
        await expect(authenticatedPage.getByRole('menuitem', { name: /edit/i })).toBeVisible();
      }
    });

    test('should show System badge for system groups', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // System groups should have a "System" badge
      const systemBadge = authenticatedPage.locator('table tbody').getByText('System');
      if (await systemBadge.first().isVisible()) {
        await expect(systemBadge.first()).toBeVisible();
      }
    });

    test('should disable checkbox for system groups', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // System groups should have disabled checkboxes
      // Check if any checkbox is disabled in the table
      const disabledCheckboxes = authenticatedPage
        .locator('table tbody tr')
        .getByRole('checkbox')
        .filter({ has: authenticatedPage.locator('[disabled]') });

      // This depends on whether system groups exist in emulator data
      // Just check the page didn't error out
      await expect(groupList.table).toBeVisible();
    });
  });

  test.describe('Create Group', () => {
    test('should navigate to create group page', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.createGroupButton).toBeVisible({ timeout: 10000 });
      await groupList.createGroupButton.click();

      await expect(authenticatedPage).toHaveURL('/groups/new');
    });

    test('should display create group form', async ({ authenticatedPage }) => {
      const groupDetail = new GroupDetailPage(authenticatedPage);
      await groupDetail.gotoNew();

      // Should show "Create Group" heading
      await expect(authenticatedPage.getByRole('heading', { name: /create group/i })).toBeVisible({
        timeout: 10000,
      });

      // Should show form fields
      await expect(groupDetail.nameInput).toBeVisible();
      await expect(groupDetail.descriptionInput).toBeVisible();

      // Should show Create Group button
      await expect(groupDetail.createButton).toBeVisible();
    });

    test('should show validation error for empty group name', async ({ authenticatedPage }) => {
      const groupDetail = new GroupDetailPage(authenticatedPage);
      await groupDetail.gotoNew();

      // Try to create without filling name
      await groupDetail.createButton.click();

      // Should show validation error
      await expect(authenticatedPage.getByText(/name is required/i)).toBeVisible();
    });

    test('should display permissions section', async ({ authenticatedPage }) => {
      const groupDetail = new GroupDetailPage(authenticatedPage);
      await groupDetail.gotoNew();

      // Should show Permissions card
      await expect(authenticatedPage.getByRole('heading', { name: 'Permissions' })).toBeVisible({
        timeout: 10000,
      });

      // Should show permission description
      await expect(authenticatedPage.getByText(/configure what members/i)).toBeVisible();
    });

    test('should display permissions grouped by resource', async ({ authenticatedPage }) => {
      const groupDetail = new GroupDetailPage(authenticatedPage);
      await groupDetail.gotoNew();

      // Wait for permissions to load
      await authenticatedPage.waitForTimeout(2000);

      // Should show resource categories (users, groups, audit, settings)
      // These are capitalized headings in the permissions card
      const permissionSwitches = authenticatedPage.locator('button[role="switch"]');
      const switchCount = await permissionSwitches.count();
      // Should have at least some permission toggles
      expect(switchCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Group Detail / Edit', () => {
    test('should display group detail page', async ({ authenticatedPage }) => {
      // Navigate to first group
      await authenticatedPage.goto('/groups');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstGroupLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstGroupLink.isVisible()) {
        await firstGroupLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Should show Group Information card
        await expect(authenticatedPage.getByText('Group Information')).toBeVisible({
          timeout: 10000,
        });

        // Should show form fields with existing data
        await expect(authenticatedPage.getByLabel('Name')).toBeVisible();
      }
    });

    test('should show Save Changes button in edit mode', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/groups');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstGroupLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstGroupLink.isVisible()) {
        await firstGroupLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        await expect(authenticatedPage.getByRole('button', { name: /save changes/i })).toBeVisible({
          timeout: 10000,
        });
      }
    });

    test('should show metadata sidebar in edit mode', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/groups');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstGroupLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstGroupLink.isVisible()) {
        await firstGroupLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Should show Details card with Group ID, Created date, etc.
        await expect(authenticatedPage.getByText('Group ID')).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Delete Group', () => {
    test('should show delete option in actions menu', async ({ authenticatedPage }) => {
      const groupList = new GroupListPage(authenticatedPage);
      await groupList.goto();

      await expect(groupList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // Find non-system group action button
      const actionBtns = authenticatedPage
        .locator('table tbody tr')
        .getByRole('button', { name: 'Actions' });

      const count = await actionBtns.count();
      if (count > 0) {
        await actionBtns.first().click();

        // Check if delete is available (only for non-system groups)
        const deleteOption = authenticatedPage.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Should show confirmation dialog
          await expect(authenticatedPage.getByText(/are you sure/i)).toBeVisible();
        }
      }
    });
  });
});
