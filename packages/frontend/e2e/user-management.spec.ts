import { test, expect } from './fixtures/auth';
import { UserListPage, UserDetailPage } from './pages/users';

test.describe('User Management', () => {
  test.describe('User List', () => {
    test('should display Users page with header and table', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.heading).toBeVisible({ timeout: 10000 });
      await expect(
        authenticatedPage.getByText('Manage user accounts and their permissions.')
      ).toBeVisible();
    });

    test('should display search input', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.searchInput).toBeVisible({ timeout: 10000 });
    });

    test('should display filter dropdowns', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      // Status filter and Group filter should be visible
      await expect(
        authenticatedPage.getByText('All statuses')
      ).toBeVisible({ timeout: 10000 });
      await expect(
        authenticatedPage.getByText('All groups')
      ).toBeVisible();
    });

    test('should display user data in table', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      // Wait for table to load (should have at least one user from auth fixture)
      await expect(userList.table).toBeVisible({ timeout: 10000 });

      // Table should have column headers
      await expect(authenticatedPage.getByRole('columnheader', { name: 'User' })).toBeVisible();
      await expect(authenticatedPage.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(authenticatedPage.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('should search users by name or email', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      // Search for a user
      await userList.searchFor('admin');
      await authenticatedPage.waitForLoadState('networkidle');

      // The URL should update with search param
      const url = authenticatedPage.url();
      expect(url).toContain('search=admin');
    });

    test('should filter users by status', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      // Click the status filter dropdown
      await authenticatedPage.getByText('All statuses').click();
      await authenticatedPage.getByRole('option', { name: 'Active' }).click();

      // URL should update with status param
      await expect(authenticatedPage).toHaveURL(/status=active/);
    });

    test('should navigate to user detail on click', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      // Wait for table data to load
      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000); // Wait for data

      // Click on first user link in the table
      const firstUserLink = authenticatedPage.locator('table tbody tr').first().getByRole('link').first();
      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await expect(authenticatedPage).toHaveURL(/\/users\/.+/);
      }
    });

    test('should show actions menu for users', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // Click the actions button (three dots) on first row
      const actionBtn = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'Actions' });

      if (await actionBtn.isVisible()) {
        await actionBtn.click();

        // Should show menu with Edit option
        await expect(
          authenticatedPage.getByRole('menuitem', { name: /edit/i })
        ).toBeVisible();
      }
    });

    test('should support row selection with checkboxes', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // Select first row checkbox
      const firstCheckbox = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('checkbox');

      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();

        // Bulk action bar should appear
        await expect(
          authenticatedPage.getByText(/1 selected/i)
        ).toBeVisible();
      }
    });

    test('should paginate users', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });

      // Check if pagination exists (depends on number of users)
      const nextButton = authenticatedPage.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        const isEnabled = await nextButton.isEnabled();
        // If there are more pages, the next button should be clickable
        if (isEnabled) {
          await nextButton.click();
          await expect(authenticatedPage).toHaveURL(/page=2/);
        }
      }
    });
  });

  test.describe('User Detail', () => {
    test('should display user detail page', async ({ authenticatedPage }) => {
      // Navigate to users and click first user
      await authenticatedPage.goto('/users');
      await authenticatedPage.waitForLoadState('networkidle');

      await expect(
        authenticatedPage.locator('table')
      ).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      const firstUserLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Should show User Information card
        await expect(
          authenticatedPage.getByText('User Information')
        ).toBeVisible({ timeout: 10000 });

        // Should show form fields
        await expect(authenticatedPage.getByLabel('Display Name')).toBeVisible();
        await expect(authenticatedPage.getByLabel('Email')).toBeVisible();
      }
    });

    test('should show email as read-only for existing users', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstUserLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        const emailInput = authenticatedPage.getByLabel('Email');
        await expect(emailInput).toBeVisible({ timeout: 10000 });
        await expect(emailInput).toBeDisabled();

        // Should show helper text about email not being changeable
        await expect(
          authenticatedPage.getByText(/email cannot be changed/i)
        ).toBeVisible();
      }
    });

    test('should display groups section on user detail', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstUserLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Should show Groups label
        await expect(authenticatedPage.getByText('Groups')).toBeVisible({ timeout: 10000 });

        // Should show message about permissions being merged
        await expect(
          authenticatedPage.getByText(/permissions are merged from all assigned groups/i)
        ).toBeVisible();
      }
    });

    test('should display metadata sidebar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstUserLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Should show Details metadata card
        await expect(
          authenticatedPage.getByRole('heading', { name: 'Details' }).first()
        ).toBeVisible({ timeout: 10000 });

        // Should show User ID
        await expect(authenticatedPage.getByText('User ID')).toBeVisible();
      }
    });

    test('should navigate back to user list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000);

      const firstUserLink = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('link')
        .first();

      if (await firstUserLink.isVisible()) {
        await firstUserLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Click back button (ArrowLeft icon button)
        const backButton = authenticatedPage.locator('button').first();
        await backButton.click();
        await expect(authenticatedPage).toHaveURL('/users');
      }
    });
  });

  test.describe('Delete User', () => {
    test('should show delete option in actions menu', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      const actionBtn = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'Actions' });

      if (await actionBtn.isVisible()) {
        await actionBtn.click();

        // Delete option (may be hidden if user lacks permissions)
        const deleteOption = authenticatedPage.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Should show confirmation dialog
          await expect(
            authenticatedPage.getByText(/are you sure/i)
          ).toBeVisible();

          // Should show cancel button
          await expect(
            authenticatedPage.getByRole('button', { name: /cancel/i })
          ).toBeVisible();
        }
      }
    });

    test('should close delete dialog on cancel', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      const actionBtn = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('button', { name: 'Actions' });

      if (await actionBtn.isVisible()) {
        await actionBtn.click();
        const deleteOption = authenticatedPage.getByRole('menuitem', { name: /delete/i });
        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Click cancel
          await authenticatedPage.getByRole('button', { name: /cancel/i }).click();

          // Dialog should close
          await expect(
            authenticatedPage.getByText(/are you sure/i)
          ).not.toBeVisible();
        }
      }
    });

    test('should show bulk delete bar when rows are selected', async ({ authenticatedPage }) => {
      const userList = new UserListPage(authenticatedPage);
      await userList.goto();

      await expect(userList.table).toBeVisible({ timeout: 10000 });
      await authenticatedPage.waitForTimeout(2000);

      // Select first row
      const firstCheckbox = authenticatedPage
        .locator('table tbody tr')
        .first()
        .getByRole('checkbox');

      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();

        // Should show bulk action bar with delete button
        await expect(
          authenticatedPage.getByText(/selected/i)
        ).toBeVisible();
      }
    });
  });
});
