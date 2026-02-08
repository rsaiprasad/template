export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'list';

export type PermissionResource = 'users' | 'groups' | 'settings' | 'audit';

export type Permission = `${PermissionResource}:${PermissionAction}`;

export interface PermissionDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  description: string;
}
