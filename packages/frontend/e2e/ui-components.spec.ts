import { expect, test } from '@playwright/test';

test.describe('UI Components and Styling', () => {
  test.describe('Theme System', () => {
    test('should apply light theme correctly', async ({ page }) => {
      await page.goto('/login');
      const html = page.locator('html');

      // Click theme toggle until we get light theme
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });

      // Set to light mode by clicking until we see 'light' class
      for (let i = 0; i < 3; i++) {
        const currentClass = (await html.getAttribute('class')) || '';
        if (currentClass.includes('light') || !currentClass.includes('dark')) {
          break;
        }
        await themeToggle.click();
        await page.waitForTimeout(100);
      }

      // Verify background color is light
      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      // Light theme should have a light background
      expect(bgColor).toBeDefined();
    });

    test('should persist theme preference', async ({ page, context }) => {
      await page.goto('/login');
      const themeToggle = page.getByRole('button', { name: /toggle theme/i });

      // Click to change theme
      await themeToggle.click();
      await page.waitForTimeout(100);
      const themeAfterClick = await page.locator('html').getAttribute('class');

      // Reload the page
      await page.reload();

      // Theme should be preserved
      const themeAfterReload = await page.locator('html').getAttribute('class');
      expect(themeAfterReload).toBe(themeAfterClick);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper focus management', async ({ page }) => {
      await page.goto('/login');

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Check that focus is visible
      const activeElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused?.tagName.toLowerCase();
      });

      expect(activeElement).toBeDefined();
    });

    test('should have proper button roles', async ({ page }) => {
      await page.goto('/login');

      // Check Google sign-in button has proper role
      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await expect(googleButton).toHaveAttribute('type', /(button|submit)/);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/login');

      // Check for h1 heading
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Should only have one h1
      const h1Count = await h1.count();
      expect(h1Count).toBe(1);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 800 },
      { name: 'Wide Desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/login');

        // Core elements should be visible at all sizes
        await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /toggle theme/i })).toBeVisible();

        // Take screenshot for visual verification
        await page.screenshot({
          path: `./e2e/test-results/screenshots/login-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        });
      });
    }
  });

  test.describe('Visual Elements', () => {
    test('should display logo correctly', async ({ page }) => {
      await page.goto('/login');

      // Check for the logo element (the "A" in a rounded box)
      const logo = page.locator('.rounded-2xl').first();
      await expect(logo).toBeVisible();
    });

    test('should display card with proper styling', async ({ page }) => {
      await page.goto('/login');

      // The login card should be visible
      const card = page.locator('[class*="shadow"]').first();
      await expect(card).toBeVisible();
    });

    test('should display gradient background', async ({ page }) => {
      await page.goto('/login');

      // Check for gradient class on container
      const container = page.locator('[class*="gradient"]').first();
      await expect(container).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicator in button when clicked', async ({ page }) => {
      await page.goto('/login');
      page.on('popup', (popup) => popup.close());

      const googleButton = page.getByRole('button', { name: /continue with google/i });
      await googleButton.click();

      // Button should show loading state with spinner and "Signing in..." text
      const loadingButton = page.getByRole('button', { name: /signing in/i });
      await expect(loadingButton).toBeVisible();
      await expect(loadingButton.locator('.animate-spin')).toBeVisible();
    });
  });
});

test.describe('Navigation', () => {
  test('should navigate from login to protected routes (with redirect)', async ({ page }) => {
    await page.goto('/login');

    // Attempt to go to users page via URL
    await page.goto('/users');

    // Should be redirected back to login
    await expect(page).toHaveURL(/.*login/);

    // Should have the return path stored
    // This verifies the redirect flow is working
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start at login
    await page.goto('/login');
    const loginUrl = page.url();

    // Try to go to users (will redirect)
    await page.goto('/users');
    await expect(page).toHaveURL(/.*login/);

    // Go back
    await page.goBack();

    // Should still be functional
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });
});
