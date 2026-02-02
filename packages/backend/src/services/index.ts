/**
 * Singleton service instances
 * Creates service instances once and exports them for use across the application.
 * This avoids creating new instances on every request and improves performance.
 */

import { AuditService } from './audit.service';
import { GroupService } from './group.service';
import { SettingsService } from './settings.service';
import { UserService } from './user.service';

// Create singleton instances
export const userService = new UserService();
export const groupService = new GroupService();
export const settingsService = new SettingsService();
export const auditService = new AuditService();

// Re-export classes for cases where new instances are needed
export { AuditService } from './audit.service';
export { GroupService } from './group.service';
export { SettingsService } from './settings.service';
export { UserService } from './user.service';
