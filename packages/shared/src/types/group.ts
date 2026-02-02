export interface Group {
  id: string;
  name: string;
  description: string;
  permissions: string[];
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
  permissions?: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const DEFAULT_GROUPS = {
  ADMIN: 'admin',
  USERS: 'users',
} as const;
