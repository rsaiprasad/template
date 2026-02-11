import {
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type FunctionDeclarationSchemaProperty,
  SchemaType,
} from '@google/generative-ai';
import toolDefinitionsJson from './generated/tool-definitions.json';

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

const toolDefinitions = toolDefinitionsJson as ToolDefinition[];

const SCHEMA_TYPE_MAP: Record<string, SchemaType> = {
  string: SchemaType.STRING,
  number: SchemaType.NUMBER,
  integer: SchemaType.INTEGER,
  boolean: SchemaType.BOOLEAN,
  array: SchemaType.ARRAY,
  object: SchemaType.OBJECT,
};

function toSchemaType(type: string): SchemaType {
  return SCHEMA_TYPE_MAP[type.toLowerCase()] ?? SchemaType.STRING;
}

function convertToSchemaProperty(schema: GeminiSchema): FunctionDeclarationSchemaProperty {
  const result: FunctionDeclarationSchemaProperty = {
    type: toSchemaType(schema.type),
  };

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.enum) {
    result.enum = schema.enum;
  }

  if (schema.properties) {
    result.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      result.properties[key] = convertToSchemaProperty(value);
    }
  }

  if (schema.required) {
    result.required = schema.required;
  }

  if (schema.items) {
    result.items = convertToSchemaProperty(schema.items);
  }

  return result;
}

function convertToFunctionParams(schema: GeminiSchema): FunctionDeclarationSchema {
  const properties: Record<string, FunctionDeclarationSchemaProperty> = {};

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = convertToSchemaProperty(value);
    }
  }

  const result: FunctionDeclarationSchema = {
    type: SchemaType.OBJECT,
    properties,
  };

  if (schema.description) {
    result.description = schema.description;
  }

  if (schema.required) {
    result.required = schema.required;
  }

  return result;
}

export function getToolsForUser(
  permissions: string[],
  isSuperAdmin: boolean
): FunctionDeclaration[] {
  const permissionSet = new Set(permissions);

  return toolDefinitions
    .filter((tool) => {
      if (isSuperAdmin) return true;
      if (!tool.metadata.requiredPermission) return true;
      return permissionSet.has(tool.metadata.requiredPermission);
    })
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: convertToFunctionParams(tool.parameters),
    }));
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return toolDefinitions.find((t) => t.name === name);
}
