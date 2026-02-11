import type { Session } from '../ws/session-manager.js';
import { getToolDefinition } from './tool-registry.js';

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  session: Session,
  backendUrl: string
): Promise<string> {
  const definition = getToolDefinition(toolName);
  if (!definition) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  const { method, path } = definition.metadata;

  // Substitute path parameters (e.g., /users/{id} → /users/abc123)
  let resolvedPath = path;
  const bodyArgs: Record<string, unknown> = {};
  const queryParams: URLSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(args)) {
    const pathPlaceholder = `{${key}}`;
    if (resolvedPath.includes(pathPlaceholder)) {
      resolvedPath = resolvedPath.replace(pathPlaceholder, encodeURIComponent(String(value)));
    } else if (method === 'GET') {
      // For GET requests, non-path params go to query string
      if (value !== undefined && value !== null && value !== '') {
        queryParams.set(key, String(value));
      }
    } else {
      // For POST/PUT/DELETE, non-path params go to request body
      bodyArgs[key] = value;
    }
  }

  let url = `${backendUrl}${resolvedPath}`;
  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.idToken}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (method !== 'GET' && Object.keys(bodyArgs).length > 0) {
    fetchOptions.body = JSON.stringify(bodyArgs);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return JSON.stringify({ error: `Tool execution failed: ${message}` });
  }
}
