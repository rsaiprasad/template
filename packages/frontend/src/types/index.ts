// Re-export shared types
export type {
  User,
  Group,
  Permission,
  AuditLog,
  PaginatedResponse,
  ApiResponse,
} from '@admin-dashboard/shared';

import type { User, Group } from '@admin-dashboard/shared';

// Extended types for API responses with computed fields
export interface UserWithGroups extends User {
  groups?: Array<{ id: string; name: string }>;
}

export interface GroupWithUsers extends Group {
  users?: Array<{ id: string; displayName: string; email: string }>;
  userCount?: number;
}

// Frontend-specific types

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  firstName: string;
  lastName: string;
  permissions: string[];
  isSuperAdmin?: boolean;
  groupId?: string;
  groupName?: string;
}

export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export type Theme = 'light' | 'dark' | 'system';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavItem[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface UserFormData {
  email: string;
  displayName: string;
  groupIds: string[];
  status: 'active' | 'inactive' | 'suspended';
}

export interface GroupFormData {
  name: string;
  description: string;
  permissionIds: string[];
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface SettingsFormData {
  displayName: string;
  email: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// Query key factories for React Query
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: (params: Record<string, unknown>) => ['groups', 'list', params] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
  },
  permissions: {
    all: ['permissions'] as const,
    list: () => ['permissions', 'list'] as const,
  },
  auditLogs: {
    all: ['auditLogs'] as const,
    list: (params: Record<string, unknown>) => ['auditLogs', 'list', params] as const,
  },
  currentUser: ['currentUser'] as const,
};
