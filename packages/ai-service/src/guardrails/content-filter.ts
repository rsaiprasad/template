/**
 * Lightweight content post-filter for AI responses.
 * Strips code blocks and checks for off-topic content.
 */

// Remove fenced code blocks from responses — AI shouldn't output code to end users
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

// Dashboard-related terms that indicate on-topic responses
const DASHBOARD_TERMS = [
  'user',
  'group',
  'permission',
  'admin',
  'setting',
  'audit',
  'log',
  'enable',
  'disable',
  'delete',
  'create',
  'update',
  'list',
  'manage',
  'dashboard',
  'account',
  'feature',
  'role',
  'access',
  'email',
  'name',
  'status',
  'member',
  'assign',
  'remove',
];

export function filterContent(content: string): string {
  // Strip code blocks
  const filtered = content.replace(CODE_BLOCK_REGEX, '').trim();

  // If the response is empty after filtering, provide a fallback
  if (!filtered) {
    return 'I can help you manage users, groups, permissions, and settings. What would you like to do?';
  }

  return filtered;
}

export function isOnTopic(content: string): boolean {
  const lower = content.toLowerCase();
  return DASHBOARD_TERMS.some((term) => lower.includes(term));
}
