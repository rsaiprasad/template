import type {
  ApiError,
  ApiResponse,
  AuditLog,
  Group,
  PaginatedResponse,
  Permission,
  User,
} from '@/types';
import { getIdToken, getIdTokenForced } from './firebase';

const API_BASE_URL = process.env.PUBLIC_API_BASE_URL || '/api';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Custom error class for API errors
 */
export class ApiRequestError extends Error {
  public status: number;
  public code?: string;
  public details?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Get authorization headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText || 'An error occurred' };
    }
    throw new ApiRequestError(
      errorData.message,
      response.status,
      errorData.code,
      errorData.details
    );
  }
  return response.json();
}

/**
 * Check if error is a network/timeout error that should be retried
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    // Don't retry 4xx errors (except 429 Too Many Requests)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }
    // Retry 5xx errors and 429
    return true;
  }
  // Retry network errors
  return error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic fetch wrapper with auth, timeout, retry, and 401 token refresh
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit & { timeout?: number; _isRetry?: boolean } = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, _isRetry = false, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: { ...headers, ...fetchOptions.headers },
        signal: controller.signal,
      });

      // Handle 401 - try to refresh token and retry once
      if (response.status === 401 && !_isRetry) {
        clearTimeout(timeoutId);
        // Try to force refresh the token
        await getIdTokenForced();
        // Retry the request with refreshed token
        return fetchWithAuth<T>(endpoint, { ...options, _isRetry: true });
      }

      clearTimeout(timeoutId);
      return handleResponse<T>(response);
    } catch (error) {
      lastError = error;
      clearTimeout(timeoutId);

      // Don't retry if it's not a retryable error or if we've exhausted retries
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await sleep(RETRY_DELAY * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

// ===================
// User API
// ===================

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  groupId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const userApi = {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return fetchWithAuth<ApiResponse<User>>('/users/me');
  },

  /**
   * List all users with pagination and filters
   */
  async listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.groupId) searchParams.set('groupId', params.groupId);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return fetchWithAuth<PaginatedResponse<User>>(`/users${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<ApiResponse<User>> {
    return fetchWithAuth<ApiResponse<User>>(`/users/${id}`);
  },

  /**
   * Update a user
   */
  async updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    return fetchWithAuth<ApiResponse<User>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/users/${userId}/groups/${groupId}`, {
      method: 'POST',
    });
  },

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/users/${userId}/groups/${groupId}`, {
      method: 'DELETE',
    });
  },
};

// ===================
// Group API
// ===================

export interface ListGroupsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const groupApi = {
  /**
   * List all groups with pagination
   */
  async listGroups(params: ListGroupsParams = {}): Promise<PaginatedResponse<Group>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return fetchWithAuth<PaginatedResponse<Group>>(`/groups${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single group by ID
   */
  async getGroup(id: string): Promise<ApiResponse<Group>> {
    return fetchWithAuth<ApiResponse<Group>>(`/groups/${id}`);
  },

  /**
   * Create a new group
   */
  async createGroup(data: { name: string; description?: string }): Promise<ApiResponse<Group>> {
    return fetchWithAuth<ApiResponse<Group>>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a group
   */
  async updateGroup(id: string, data: Partial<Group>): Promise<ApiResponse<Group>> {
    return fetchWithAuth<ApiResponse<Group>>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a group
   */
  async deleteGroup(id: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/groups/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Add permission to group
   */
  async addPermissionToGroup(groupId: string, permissionId: string): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/groups/${groupId}/permissions/${permissionId}`, {
      method: 'POST',
    });
  },

  /**
   * Remove permission from group
   */
  async removePermissionFromGroup(
    groupId: string,
    permissionId: string
  ): Promise<ApiResponse<void>> {
    return fetchWithAuth<ApiResponse<void>>(`/groups/${groupId}/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  },
};

// ===================
// Permission API
// ===================

export const permissionApi = {
  /**
   * List all permissions
   */
  async listPermissions(): Promise<ApiResponse<Permission[]>> {
    return fetchWithAuth<ApiResponse<Permission[]>>('/permissions');
  },

  /**
   * Get a single permission by ID
   */
  async getPermission(id: string): Promise<ApiResponse<Permission>> {
    return fetchWithAuth<ApiResponse<Permission>>(`/permissions/${id}`);
  },
};

// ===================
// Audit Log API
// ===================

export interface ListAuditLogsParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const auditLogApi = {
  /**
   * List audit logs with pagination and filters
   */
  async listAuditLogs(params: ListAuditLogsParams = {}): Promise<PaginatedResponse<AuditLog>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.action) searchParams.set('action', params.action);
    if (params.resourceType) searchParams.set('resourceType', params.resourceType);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return fetchWithAuth<PaginatedResponse<AuditLog>>(`/audit-logs${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
    return fetchWithAuth<ApiResponse<AuditLog>>(`/audit-logs/${id}`);
  },
};

// ===================
// Health Check API
// ===================

export const healthApi = {
  /**
   * Check API health
   */
  async check(): Promise<{ status: string; timestamp: string }> {
    return fetchWithAuth<{ status: string; timestamp: string }>('/health');
  },
};

// Export all APIs
export const api = {
  users: userApi,
  groups: groupApi,
  permissions: permissionApi,
  auditLogs: auditLogApi,
  health: healthApi,
};

export default api;
