export type CorePermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export type CorePermissionResource = 'users' | 'groups' | 'settings' | 'audit';

export type CorePermission = `${CorePermissionResource}:${CorePermissionAction}`;

// Allow custom permissions (e.g., 'posts:create', 'analytics:read')
export type Permission = CorePermission | (string & {});

export interface PermissionDefinition {
  resource: string;
  action: string;
  description: string;
}
