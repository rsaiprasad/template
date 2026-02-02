export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  query?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchParams extends SearchParams {
  status?: 'active' | 'disabled' | 'all';
  groupId?: string;
}

export interface AuditSearchParams extends SearchParams {
  action?: string;
  resource?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
