import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the app sidebar navigation
 */
export class SidebarPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly dashboardLink: Locator;
  readonly usersLink: Locator;
  readonly groupsLink: Locator;
  readonly auditLogsLink: Locator;
  readonly collapseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('aside');
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    this.usersLink = page.getByRole('link', { name: 'Users' });
    this.groupsLink = page.getByRole('link', { name: 'Groups' });
    this.auditLogsLink = page.getByRole('link', { name: 'Audit Logs' });
    this.collapseButton = page.getByRole('button', { name: /collapse/i });
  }

  async navigateToDashboard() {
    await this.dashboardLink.click();
    await this.page.waitForURL('/');
  }

  async navigateToUsers() {
    await this.usersLink.click();
    await this.page.waitForURL('/users');
  }

  async navigateToGroups() {
    await this.groupsLink.click();
    await this.page.waitForURL('/groups');
  }

  async navigateToAuditLogs() {
    await this.auditLogsLink.click();
    await this.page.waitForURL('/audit-logs');
  }

  async collapse() {
    await this.collapseButton.click();
  }
}
