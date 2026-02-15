# API Reference

## Overview

- **Base URL**: `/api/v1`
- **Format**: JSON
- **Authentication**: Bearer token (Firebase ID token)
- **OpenAPI Spec**: Available at `/api/v1/doc`
- **API Explorer**: Available at `/api/v1/explorer` (dev only, built on [Scalar](https://github.com/scalar/scalar) with Google Sign-In)

---

## Authentication

### Login

Creates or updates user on login.

```http
POST /api/v1/auth/login
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "groupId": "users",
    "isSuperAdmin": false,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "permissions": ["users:read"]
  }
}
```

### Logout

Logs out the current user.

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### Get Current User

Returns the current user with permissions.

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "permissions": ["users:list", "users:read"]
  }
}
```

---

## Users

### List Users

Returns paginated list of users.

```http
GET /api/v1/users
Authorization: Bearer <token>
```

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `search` | string | Search by email or name |
| `status` | string | Filter by status: `active`, `disabled`, `all` |
| `groupId` | string | Filter by group |
| `sortBy` | string | Sort field: `createdAt`, `displayName`, `email` |
| `sortOrder` | string | Sort direction: `asc`, `desc` |
| `cursor` | string | Cursor for pagination |

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "email": "user@example.com",
      "displayName": "John Doe",
      "status": "active",
      "groupId": "users"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true,
    "nextCursor": "user456"
  }
}
```

### Get User

Returns a single user by ID.

```http
GET /api/v1/users/:id
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://...",
    "groupId": "users",
    "isSuperAdmin": false,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### Update User

Updates a user's information.

```http
PUT /api/v1/users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "displayName": "Jane Doe",
  "photoURL": "https://..."
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "displayName": "Jane Doe"
  }
}
```

### Delete User

Deletes a user (cannot delete super admin).

```http
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully"
  }
}
```

### Disable User

Disables a user account.

```http
POST /api/v1/users/:id/disable
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "status": "disabled",
    "disabledAt": "2024-01-01T00:00:00Z"
  }
}
```

### Enable User

Re-enables a disabled user account.

```http
POST /api/v1/users/:id/enable
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "status": "active"
  }
}
```

### Change User Group

Changes a user's group assignment.

```http
PUT /api/v1/users/:id/group
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "groupId": "admin"
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user123",
    "groupId": "admin"
  }
}
```

---

## Groups

### List Groups

Returns all groups with user counts.

```http
GET /api/v1/groups
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "admin",
      "name": "Admin",
      "description": "Full system access",
      "permissions": ["users:*", "groups:*"],
      "isDefault": false,
      "isSystem": true,
      "userCount": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 3
  }
}
```

### Create Group

Creates a new permission group.

```http
POST /api/v1/groups
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "Managers",
  "description": "Can manage users",
  "permissions": ["users:list", "users:read", "users:update"]
}
```

**Response** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "managers",
    "name": "Managers",
    "permissions": ["users:list", "users:read", "users:update"]
  }
}
```

### Get Group

Returns a single group by ID.

```http
GET /api/v1/groups/:id
Authorization: Bearer <token>
```

### Update Group

Updates a group's information.

```http
PUT /api/v1/groups/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Group

Deletes a group (cannot delete system groups or groups with users).

```http
DELETE /api/v1/groups/:id
Authorization: Bearer <token>
```

### Get Group Users

Returns all users in a group.

```http
GET /api/v1/groups/:id/users
Authorization: Bearer <token>
```

### Update Group Permissions

Sets a group's permissions.

```http
PUT /api/v1/groups/:id/permissions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "permissions": ["users:list", "users:read"]
}
```

---

## Permissions

### List All Permissions

Returns all available permissions.

```http
GET /api/v1/permissions
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    "users:list",
    "users:create",
    "users:read",
    "users:update",
    "users:delete",
    "groups:list",
    "groups:create",
    "groups:read",
    "groups:update",
    "groups:delete",
    "settings:read",
    "settings:update",
    "audit:list",
    "audit:read"
  ]
}
```

### Get My Permissions

Returns the current user's permissions.

```http
GET /api/v1/permissions/my
Authorization: Bearer <token>
```

---

## Settings

### Get Settings

Returns application settings.

```http
GET /api/v1/settings
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "app",
    "appName": "Admin Dashboard",
    "defaultGroupId": "users",
    "features": {
      "auditLogging": true,
      "userRegistration": true
    }
  }
}
```

### Update Settings

Updates application settings.

```http
PUT /api/v1/settings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "appName": "My Dashboard",
  "defaultGroupId": "newUsers"
}
```

---

## Audit Logs

### List Audit Logs

Returns paginated audit logs.

```http
GET /api/v1/audit
Authorization: Bearer <token>
```

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `action` | string | Filter by action type |
| `resource` | string | Filter by resource type |
| `actorId` | string | Filter by actor |
| `startDate` | string | Filter by start date (ISO 8601) |
| `endDate` | string | Filter by end date (ISO 8601) |

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "log123",
      "timestamp": "2024-01-01T00:00:00Z",
      "actorId": "user123",
      "actorEmail": "admin@example.com",
      "actorName": "Admin",
      "action": "USER_UPDATED",
      "resource": "users",
      "resourceId": "user456",
      "description": "Updated user profile",
      "changes": {
        "before": { "displayName": "Old Name" },
        "after": { "displayName": "New Name" }
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 500
  }
}
```

### Get Audit Stats

Returns audit log statistics.

```http
GET /api/v1/audit/stats
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalLogs": 1000,
    "byAction": {
      "USER_UPDATED": 500,
      "LOGIN": 300,
      "GROUP_CREATED": 200
    },
    "byResource": {
      "users": 600,
      "auth": 300,
      "groups": 100
    }
  }
}
```

### Get Audit Actions

Returns list of valid audit action types.

```http
GET /api/v1/audit/actions
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "LOGIN",
      "category": "Authentication",
      "description": "User logged in"
    },
    {
      "id": "USER_CREATED",
      "category": "Users",
      "description": "New user was created"
    }
  ]
}
```

### Get Audit Resources

Returns list of valid audit resource types.

```http
GET /api/v1/audit/resources
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "users",
      "name": "Users"
    },
    {
      "id": "groups",
      "name": "Groups"
    },
    {
      "id": "settings",
      "name": "Settings"
    },
    {
      "id": "auth",
      "name": "Auth"
    }
  ]
}
```

### Get User Audit Logs

Returns audit logs for a specific user (as actor).

```http
GET /api/v1/audit/user/:userId
Authorization: Bearer <token>
```

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max items to return (default: 50, max: 100) |

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "log123",
      "timestamp": "2024-01-01T00:00:00Z",
      "actorId": "user123",
      "action": "USER_UPDATED",
      "resource": "users",
      "resourceId": "user456"
    }
  ]
}
```

### Get Resource Audit Logs

Returns audit logs for a specific resource.

```http
GET /api/v1/audit/resource/:resource/:resourceId
Authorization: Bearer <token>
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `resource` | string | Resource type: `users`, `groups`, `settings`, `auth` |
| `resourceId` | string | ID of the resource |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max items to return (default: 50, max: 100) |

**Response** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "log456",
      "timestamp": "2024-01-01T00:00:00Z",
      "actorId": "admin123",
      "action": "USER_UPDATED",
      "resource": "users",
      "resourceId": "user123"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

### 409 Conflict

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User already exists"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```
