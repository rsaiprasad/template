import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the User List page (/users)
 */
export class UserListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly groupFilter: Locator;
  readonly table: Locator;
  readonly addUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Users' });
    this.searchInput = page.getByPlaceholder('Search users...');
    this.statusFilter = page
      .locator('[data-value]')
      .filter({ hasText: /all statuses/i })
      .first();
    this.groupFilter = page
      .locator('[data-value]')
      .filter({ hasText: /all groups/i })
      .first();
    this.table = page.locator('table').first();
    this.addUserButton = page.getByRole('link', { name: /add user/i });
  }

  async goto() {
    await this.page.goto('/users');
    await this.page.waitForLoadState('networkidle');
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search to trigger
    await this.page.waitForTimeout(500);
  }

  async getUserRows() {
    return this.table.locator('tbody tr');
  }

  async clickUserByName(name: string) {
    await this.page.getByRole('link', { name }).click();
  }

  async openActionsMenu(rowIndex: number) {
    const rows = await this.getUserRows();
    const actionButton = rows.nth(rowIndex).getByRole('button', { name: 'Actions' });
    await actionButton.click();
  }

  async getRowCount() {
    const rows = await this.getUserRows();
    return rows.count();
  }
}

/**
 * Page object for the User Detail page (/users/:id)
 */
export class UserDetailPage {
  readonly page: Page;
  readonly displayNameInput: Locator;
  readonly emailInput: Locator;
  readonly statusSelect: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.displayNameInput = page.getByLabel('Display Name');
    this.emailInput = page.getByLabel('Email');
    this.statusSelect = page.getByLabel('Status');
    this.saveButton = page.getByRole('button', { name: /save changes/i });
    this.backButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="ArrowLeft"], svg') })
      .first();
  }

  async goto(userId: string) {
    await this.page.goto(`/users/${userId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async updateDisplayName(name: string) {
    await this.displayNameInput.clear();
    await this.displayNameInput.fill(name);
  }

  async save() {
    await this.saveButton.click();
  }

  async goBack() {
    await this.backButton.click();
  }
}
