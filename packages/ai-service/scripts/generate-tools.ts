/**
 * Build-time script: reads the backend OpenAPI spec and generates
 * Gemini FunctionDeclaration definitions for each API endpoint.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface OpenAPISchema {
  type?: string | string[];
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  description?: string;
  enum?: string[];
  format?: string;
  example?: unknown;
  minLength?: number;
  minimum?: number;
  maximum?: number;
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema: OpenAPISchema;
  description?: string;
}

interface OpenAPIOperation {
  operationId: string;
  tags: string[];
  summary: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content: {
      'application/json': {
        schema: OpenAPISchema;
      };
    };
  };
}

interface OpenAPISpec {
  paths: Record<string, Record<string, OpenAPIOperation>>;
}

interface GeminiSchema {
  type: string;
  description?: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: GeminiSchema;
  metadata: {
    method: string;
    path: string;
    requiredPermission: string | null;
  };
}

// Endpoints to skip — AI doesn't need auth flows or health checks
const SKIP_OPERATION_IDS = new Set(['login', 'logout', 'verifyAuth', 'initializeSettings']);

// Map tags + HTTP method to permission strings
function inferPermission(tags: string[], method: string, _operationId: string): string | null {
  const tag = tags[0]?.toLowerCase();
  if (!tag) return null;

  // Auth endpoints — skip
  if (tag === 'auth') return null;

  // Permission endpoints — user can always view their own
  if (tag === 'permissions') return null;

  const isWrite = method !== 'GET';

  switch (tag) {
    case 'users':
      return isWrite ? 'users:write' : 'users:read';
    case 'groups':
      return isWrite ? 'groups:write' : 'groups:read';
    case 'audit':
      return 'audit:read';
    case 'settings':
      return isWrite ? 'settings:write' : 'settings:read';
    default:
      return null;
  }
}

function convertOpenAPISchemaToGemini(schema: OpenAPISchema): GeminiSchema {
  // Handle type arrays like ["string", "null"] — take the non-null type
  let schemaType = schema.type;
  if (Array.isArray(schemaType)) {
    schemaType = schemaType.find((t) => t !== 'null') || 'string';
  }

  const result: GeminiSchema = {
    type: mapType(schemaType || 'string'),
  };

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.enum) {
    result.enum = schema.enum;
  }

  if (schemaType === 'object' && schema.properties) {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      result.properties[key] = convertOpenAPISchemaToGemini(value);
    }
    if (schema.required && schema.required.length > 0) {
      result.required = schema.required;
    }
  }

  if (schemaType === 'array' && schema.items) {
    result.items = convertOpenAPISchemaToGemini(schema.items);
  }

  return result;
}

function mapType(openAPIType: string): string {
  switch (openAPIType) {
    case 'integer':
      return 'number';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

function generateTools(specPath: string): ToolDefinition[] {
  const raw = readFileSync(specPath, 'utf-8');
  const spec: OpenAPISpec = JSON.parse(raw);
  const tools: ToolDefinition[] = [];

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const upperMethod = method.toUpperCase();

      if (SKIP_OPERATION_IDS.has(operation.operationId)) continue;

      const permission = inferPermission(operation.tags, upperMethod, operation.operationId);

      // Build combined parameters schema
      const properties: Record<string, GeminiSchema> = {};
      const required: string[] = [];

      // Path and query parameters
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === 'header') continue;
          properties[param.name] = convertOpenAPISchemaToGemini(param.schema);
          if (param.description) {
            properties[param.name]!.description = param.description;
          }
          if (param.required) {
            required.push(param.name);
          }
        }
      }

      // Request body parameters
      if (operation.requestBody) {
        const bodySchema = operation.requestBody.content['application/json']?.schema;
        if (bodySchema?.properties) {
          for (const [key, value] of Object.entries(bodySchema.properties)) {
            properties[key] = convertOpenAPISchemaToGemini(value);
          }
          if (bodySchema.required) {
            required.push(...bodySchema.required);
          }
        }
      }

      const parameters: GeminiSchema = {
        type: 'object',
        properties,
      };
      if (required.length > 0) {
        parameters.required = required;
      }

      const description = [operation.summary, operation.description].filter(Boolean).join('. ');

      tools.push({
        name: operation.operationId,
        description: description || operation.operationId,
        parameters,
        metadata: {
          method: upperMethod,
          path,
          requiredPermission: permission,
        },
      });
    }
  }

  return tools;
}

// ── Main ──

const specPath = join(dirname(import.meta.dir), '..', 'backend', 'openapi.json');
const tools = generateTools(specPath);

const outDir = join(import.meta.dir, '..', 'src', 'tools', 'generated');
mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, 'tool-definitions.json');
writeFileSync(outPath, JSON.stringify(tools, null, 2));
console.log(`Generated ${tools.length} tool definitions → ${outPath}`);
