import type { Permission } from '../core/types/permission';

export interface Group {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateGroupInput {
  name: string;
  description: string;
  permissions?: Permission[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export const DEFAULT_GROUPS = {
  ADMIN: 'admin',
  USERS: 'users',
} as const;
