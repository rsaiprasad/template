import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Group List page (/groups)
 */
export class GroupListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly createGroupButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Groups' });
    this.searchInput = page.getByPlaceholder('Search groups...');
    this.table = page.locator('table').first();
    this.createGroupButton = page.getByRole('link', { name: /create group/i });
  }

  async goto() {
    await this.page.goto('/groups');
    await this.page.waitForLoadState('networkidle');
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async getGroupRows() {
    return this.table.locator('tbody tr');
  }

  async clickGroupByName(name: string) {
    await this.page.getByRole('link', { name }).click();
  }

  async getRowCount() {
    const rows = await this.getGroupRows();
    return rows.count();
  }

  async openActionsMenu(rowIndex: number) {
    const rows = await this.getGroupRows();
    const actionButton = rows.nth(rowIndex).getByRole('button', { name: 'Actions' });
    await actionButton.click();
  }
}

/**
 * Page object for the Group Detail / Create page (/groups/:id or /groups/new)
 */
export class GroupDetailPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly createButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel('Name');
    this.descriptionInput = page.getByLabel('Description');
    this.saveButton = page.getByRole('button', { name: /save changes/i });
    this.createButton = page.getByRole('button', { name: /create group/i });
    this.backButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();
  }

  async gotoNew() {
    await this.page.goto('/groups/new');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEdit(groupId: string) {
    await this.page.goto(`/groups/${groupId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillGroupForm(name: string, description?: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
    if (description) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(description);
    }
  }

  async togglePermission(permissionName: string) {
    const permRow = this.page
      .locator('div')
      .filter({ hasText: permissionName })
      .locator('button[role="switch"]');
    await permRow.click();
  }

  async create() {
    await this.createButton.click();
  }

  async save() {
    await this.saveButton.click();
  }
}
