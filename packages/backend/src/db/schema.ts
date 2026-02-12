import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// ─── Users ───────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // Firebase UID
    email: text('email').notNull().unique(),
    displayName: text('display_name').notNull(),
    photoURL: text('photo_url'),
    status: text('status').notNull().default('active'), // 'active' | 'disabled'
    isSuperAdmin: boolean('is_super_admin').notNull().default(false),
    disabledAt: timestamp('disabled_at'),
    disabledBy: text('disabled_by'),
    preferences: jsonb('preferences').default({ theme: 'system' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
  },
  (table) => [
    index('users_status_idx').on(table.status),
  ],
);

// ─── Groups ──────────────────────────────────────────────────────────

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  permissions: text('permissions').array().notNull().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull(),
  updatedBy: text('updated_by').notNull(),
});

// ─── User ↔ Group junction ──────────────────────────────────────────

export const userGroups = pgTable(
  'user_groups',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.groupId] }),
  ],
);

// ─── Audit Logs ─────────────────────────────────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull(),
    actorName: text('actor_name').notNull(),
    action: text('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id').notNull(),
    description: text('description').notNull(),
    changes: jsonb('changes'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('audit_logs_timestamp_idx').on(table.timestamp),
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_idx').on(table.resource),
    index('audit_logs_resource_resource_id_idx').on(
      table.resource,
      table.resourceId,
    ),
  ],
);

// ─── Settings ───────────────────────────────────────────────────────

export const settings = pgTable('settings', {
  id: text('id').primaryKey(), // always 'app'
  appName: text('app_name').notNull().default('Admin Dashboard'),
  defaultGroupId: text('default_group_id').notNull().default('users'),
  features: jsonb('features').notNull().default({
    auditLogging: true,
    userRegistration: true,
    aiAssistant: 'disabled',
  }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by').notNull().default('system'),
});
