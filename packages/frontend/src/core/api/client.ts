/**
 * Generated API Client from OpenAPI spec
 * DO NOT EDIT - This file is generated from the backend OpenAPI specification
 */

import type {
  ApiResponse,
  AuditLog,
  AuditStats,
  CreateGroupRequest,
  Group,
  ListAuditLogsParams,
  ListGroupsParams,
  ListUsersParams,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  PaginatedResponse,
  Permission,
  Settings,
  UpdateGroupRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
  User,
  UserWithPermissions,
  VerifyAuthResponse,
} from '../../api/generated/types';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============================================================================
// Error Classes
// ============================================================================

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

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Build query string from params object
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================================================
// API Client Class
// ============================================================================

export class AdminDashboardApi {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;
  private forceRefreshToken: () => Promise<string | null>;

  constructor(
    baseUrl: string,
    getToken: () => Promise<string | null>,
    forceRefreshToken: () => Promise<string | null>
  ) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
    this.forceRefreshToken = forceRefreshToken;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Get authorization headers with Firebase token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
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
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: { message: string; code?: string; details?: Record<string, unknown> };
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
   * Generic fetch wrapper with auth, timeout, retry, and 401 token refresh
   */
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number; _isRetry?: boolean } = {}
  ): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT, _isRetry = false, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Only retry idempotent methods (GET, HEAD, OPTIONS, PUT)
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const isMethodRetryable = ['GET', 'HEAD', 'OPTIONS', 'PUT'].includes(method);

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...fetchOptions,
          headers: { ...headers, ...fetchOptions.headers },
          signal: controller.signal,
        });

        // Handle 401 - try to refresh token and retry once
        if (response.status === 401 && !_isRetry) {
          clearTimeout(timeoutId);
          // Try to force refresh the token
          await this.forceRefreshToken();
          // Retry the request with refreshed token
          return this.fetchWithAuth<T>(endpoint, { ...options, _isRetry: true });
        }

        clearTimeout(timeoutId);
        return this.handleResponse<T>(response);
      } catch (error) {
        lastError = error;
        clearTimeout(timeoutId);

        // Don't retry non-idempotent methods (POST, DELETE, PATCH) or non-retryable errors
        if (!isMethodRetryable || !isRetryableError(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        await sleep(RETRY_DELAY * Math.pow(2, attempt));
      }
    }

    throw lastError;
  }

  // ==========================================================================
  // Auth Endpoints
  // ==========================================================================

  /**
   * Login with Firebase ID token
   */
  async login(idToken: string): Promise<ApiResponse<LoginResponse>> {
    const data: LoginRequest = { idToken };
    return this.fetchWithAuth<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<LogoutResponse>> {
    return this.fetchWithAuth<ApiResponse<LogoutResponse>>('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<ApiResponse<UserWithPermissions>> {
    return this.fetchWithAuth<ApiResponse<UserWithPermissions>>('/auth/me');
  }

  /**
   * Verify authentication status
   */
  async verifyAuth(): Promise<ApiResponse<VerifyAuthResponse>> {
    return this.fetchWithAuth<ApiResponse<VerifyAuthResponse>>('/auth/verify');
  }

  // ==========================================================================
  // User Endpoints
  // ==========================================================================

  /**
   * List all users with pagination and filters
   */
  async listUsers(params?: ListUsersParams): Promise<PaginatedResponse<User>> {
    const query = params ? buildQueryString(params as Record<string, unknown>) : '';
    return this.fetchWithAuth<PaginatedResponse<User>>(`/users${query}`);
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<ApiResponse<UserWithPermissions>> {
    return this.fetchWithAuth<ApiResponse<UserWithPermissions>>(`/users/${id}`);
  }

  /**
   * Update a user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<ApiResponse<User>>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.fetchWithAuth<ApiResponse<{ message: string }>>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Disable a user
   */
  async disableUser(id: string): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<ApiResponse<User>>(`/users/${id}/disable`, {
      method: 'POST',
    });
  }

  /**
   * Enable a user
   */
  async enableUser(id: string): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<ApiResponse<User>>(`/users/${id}/enable`, {
      method: 'POST',
    });
  }

  /**
   * Change user's group
   */
  async changeUserGroup(id: string, groupId: string): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<ApiResponse<User>>(`/users/${id}/group`, {
      method: 'PUT',
      body: JSON.stringify({ groupId }),
    });
  }

  /**
   * Add user to group
   */
  async addUserToGroup(userId: string, groupId: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<ApiResponse<void>>(`/users/${userId}/groups/${groupId}`, {
      method: 'POST',
    });
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(userId: string, groupId: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<ApiResponse<void>>(`/users/${userId}/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // Group Endpoints
  // ==========================================================================

  /**
   * List all groups with pagination
   */
  async listGroups(params?: ListGroupsParams): Promise<PaginatedResponse<Group>> {
    const query = params ? buildQueryString(params as Record<string, unknown>) : '';
    return this.fetchWithAuth<PaginatedResponse<Group>>(`/groups${query}`);
  }

  /**
   * Create a new group
   */
  async createGroup(data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return this.fetchWithAuth<ApiResponse<Group>>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a single group by ID
   */
  async getGroup(id: string): Promise<ApiResponse<Group>> {
    return this.fetchWithAuth<ApiResponse<Group>>(`/groups/${id}`);
  }

  /**
   * Update a group
   */
  async updateGroup(id: string, data: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return this.fetchWithAuth<ApiResponse<Group>>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a group
   */
  async deleteGroup(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.fetchWithAuth<ApiResponse<{ message: string }>>(`/groups/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get users in a group
   */
  async getGroupUsers(id: string): Promise<ApiResponse<User[]>> {
    return this.fetchWithAuth<ApiResponse<User[]>>(`/groups/${id}/users`);
  }

  /**
   * Update group permissions
   */
  async updateGroupPermissions(id: string, permissions: string[]): Promise<ApiResponse<Group>> {
    return this.fetchWithAuth<ApiResponse<Group>>(`/groups/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  /**
   * Add permission to group
   */
  async addPermissionToGroup(groupId: string, permissionId: string): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<ApiResponse<void>>(
      `/groups/${groupId}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * Remove permission from group
   */
  async removePermissionFromGroup(
    groupId: string,
    permissionId: string
  ): Promise<ApiResponse<void>> {
    return this.fetchWithAuth<ApiResponse<void>>(
      `/groups/${groupId}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ==========================================================================
  // Permission Endpoints
  // ==========================================================================

  /**
   * List all permissions
   */
  async listPermissions(): Promise<ApiResponse<Permission[]>> {
    return this.fetchWithAuth<ApiResponse<Permission[]>>('/permissions');
  }

  /**
   * Get current user's permissions
   */
  async getMyPermissions(): Promise<ApiResponse<string[]>> {
    return this.fetchWithAuth<ApiResponse<string[]>>('/permissions/me');
  }

  // ==========================================================================
  // Settings Endpoints
  // ==========================================================================

  /**
   * Get application settings
   */
  async getSettings(): Promise<ApiResponse<Settings>> {
    return this.fetchWithAuth<ApiResponse<Settings>>('/settings');
  }

  /**
   * Update application settings
   */
  async updateSettings(data: UpdateSettingsRequest): Promise<ApiResponse<Settings>> {
    return this.fetchWithAuth<ApiResponse<Settings>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Audit Log Endpoints
  // ==========================================================================

  /**
   * List audit logs with pagination and filters
   */
  async listAuditLogs(params?: ListAuditLogsParams): Promise<PaginatedResponse<AuditLog>> {
    const query = params ? buildQueryString(params as Record<string, unknown>) : '';
    return this.fetchWithAuth<PaginatedResponse<AuditLog>>(`/audit${query}`);
  }

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
    return this.fetchWithAuth<ApiResponse<AuditLog>>(`/audit/${id}`);
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(): Promise<ApiResponse<AuditStats>> {
    return this.fetchWithAuth<ApiResponse<AuditStats>>('/audit/stats');
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetchWithAuth<{ status: string; timestamp: string }>('/health');
  }
}
