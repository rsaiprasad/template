// Core infrastructure — template code that downstream projects should not edit
export * from './errors';
export * from './types/context';
export { authMiddleware, optionalAuthMiddleware, buildAuthUser } from './middleware/auth';
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSuperAdmin,
  canModifyUser,
  preventSelfAction,
} from './middleware/permissions';
export {
  auditLog,
  createAuditLogger,
  logAuditAction,
  loginAuditMiddleware,
} from './middleware/audit';
export { rateLimitMiddleware } from './middleware/rate-limit';
export {
  initializeFirebaseAdmin,
  getApp,
  getAuthAdmin,
} from './lib/firebase-admin';
export {
  ErrorCodes,
  successResponse,
  paginatedResponse,
  errorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  generateRequestId,
  getClientIp,
  getUserAgent,
} from './utils/response';
export type { ErrorCode } from './utils/response';
