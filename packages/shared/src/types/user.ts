export type UserStatus = 'active' | 'disabled';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  groupIds: string[];
  isSuperAdmin: boolean;
  status: UserStatus;
  disabledAt?: Date;
  disabledBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  preferences: UserPreferences;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  photoURL?: string | null;
  groupIds?: string[];
}

export interface UpdateUserInput {
  displayName?: string;
  photoURL?: string | null;
  preferences?: Partial<UserPreferences>;
  status?: UserStatus;
  groupIds?: string[];
}

export interface UserWithPermissions extends User {
  permissions: string[];
  groupNames: string[];
}
