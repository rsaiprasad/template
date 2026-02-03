#!/usr/bin/env bun
/**
 * Script to generate the OpenAPI specification JSON file
 *
 * Usage: bun run scripts/generate-openapi.ts
 *
 * This will output the OpenAPI spec to openapi.json in the backend package root
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { getOpenAPISpec } from '../src/openapi';

async function main() {
  console.log('Generating OpenAPI specification...');

  try {
    const spec = getOpenAPISpec();
    const outputPath = join(import.meta.dir, '..', 'openapi.json');

    writeFileSync(outputPath, JSON.stringify(spec, null, 2));

    console.log(`OpenAPI specification written to: ${outputPath}`);
    console.log(`\nSpec contains:`);
    console.log(`  - ${Object.keys(spec.paths || {}).length} paths`);
    console.log(`  - ${(spec.tags || []).length} tags`);
    console.log(`  - Version: ${spec.info.version}`);
  } catch (error) {
    console.error('Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

main();
