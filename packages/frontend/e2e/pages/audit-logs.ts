import type { Locator, Page } from '@playwright/test';

/**
 * Page object for the Audit Logs page (/audit-logs)
 */
export class AuditLogsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;
  readonly actorIdInput: Locator;
  readonly actionFilter: Locator;
  readonly resourceFilter: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly clearFiltersButton: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Audit Logs' });
    this.table = page.locator('table').first();
    this.actorIdInput = page.getByPlaceholder('Filter by actor ID...');
    this.actionFilter = page.getByLabel('Action');
    this.resourceFilter = page.getByLabel('Resource');
    this.startDateInput = page.locator('input[type="date"]').first();
    this.endDateInput = page.locator('input[type="date"]').last();
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters/i });
    this.previousButton = page.getByRole('button', { name: /previous/i });
    this.nextButton = page.getByRole('button', { name: /next/i });
  }

  async goto() {
    await this.page.goto('/audit-logs');
    await this.page.waitForLoadState('networkidle');
  }

  async getLogRows() {
    return this.table.locator('tbody tr');
  }

  async getRowCount() {
    const rows = await this.getLogRows();
    return rows.count();
  }

  async filterByActorId(actorId: string) {
    await this.actorIdInput.fill(actorId);
    await this.page.waitForTimeout(500);
  }

  async clickViewDetails(rowIndex: number) {
    const rows = await this.getLogRows();
    const viewButton = rows.nth(rowIndex).getByRole('button', { name: /view/i });
    await viewButton.click();
  }
}
