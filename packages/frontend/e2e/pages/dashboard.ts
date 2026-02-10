import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Dashboard page (/)
 */
export class DashboardPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly totalUsersCard: Locator;
  readonly groupsCard: Locator;
  readonly recentActivityCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole('heading', { name: /hello/i });
    this.totalUsersCard = page.getByText('Total Users');
    this.groupsCard = page.getByText('Groups').first();
    this.recentActivityCard = page.getByRole('heading', { name: 'Recent Activity' });
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }
}
