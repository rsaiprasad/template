export type CorePermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export type FullCrudResource = 'users' | 'groups';
export type CorePermissionResource = FullCrudResource | 'audit';

export type CorePermission = `${FullCrudResource}:${CorePermissionAction}` | 'audit:list';

// Allow custom permissions (e.g., 'posts:create', 'analytics:read')
export type Permission = CorePermission | (string & {});

export interface PermissionDefinition {
  resource: string;
  action: string;
  description: string;
}
