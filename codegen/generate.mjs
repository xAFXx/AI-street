#!/usr/bin/env node

/**
 * OpenAPI Type Generator
 *
 * Fetches a Swagger/OpenAPI spec from a backend URL and generates
 * TypeScript interfaces for each configured feature module.
 *
 * Usage:
 *   node codegen/generate.mjs                                    # uses default URL
 *   SWAGGER_URL=http://localhost:21021/swagger/v1/swagger.json node codegen/generate.mjs
 *   node codegen/generate.mjs --url http://localhost:21021/swagger/v1/swagger.json
 *   node codegen/generate.mjs --file ./swagger.json              # use local file
 *   node codegen/generate.mjs --dry-run                          # preview without writing
 *
 * Environment Variables:
 *   SWAGGER_URL   - Full URL to the Swagger JSON spec
 *
 * The script reads configuration from codegen/codegen.config.mjs
 * to determine which controller tags to extract and where to output files.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

// ==================== Setup ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Load config
const { features, DEFAULT_SWAGGER_URL } = await import('./codegen.config.mjs');

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fileArgIdx = args.indexOf('--file');
const urlArgIdx = args.indexOf('--url');

const swaggerFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
const swaggerUrl = urlArgIdx !== -1
    ? args[urlArgIdx + 1]
    : (process.env.SWAGGER_URL || DEFAULT_SWAGGER_URL);

// ==================== Main ====================

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           OpenAPI Type Generator for APPRX              ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Load the spec
    let spec;
    if (swaggerFile) {
        console.log(`📂 Loading spec from file: ${swaggerFile}`);
        const raw = readFileSync(resolve(PROJECT_ROOT, swaggerFile), 'utf-8');
        spec = JSON.parse(raw);
    } else {
        console.log(`🌐 Fetching spec from: ${swaggerUrl}`);
        try {
            const response = await fetch(swaggerUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            spec = await response.json();
        } catch (err) {
            console.error(`\n❌ Failed to fetch Swagger spec: ${err.message}`);
            console.error(`   Make sure the backend is running and the URL is correct.`);
            console.error(`   You can also use --file to point to a local swagger.json\n`);
            process.exit(1);
        }
    }

    const specVersion = spec.openapi || spec.swagger || 'unknown';
    const specTitle = spec.info?.title || 'Unknown API';
    console.log(`📋 Spec: ${specTitle} (${specVersion})`);

    // 2. Extract schemas and paths
    const schemas = spec.components?.schemas || spec.definitions || {};
    const paths = spec.paths || {};

    console.log(`   Found ${Object.keys(schemas).length} schemas, ${Object.keys(paths).length} paths`);
    console.log('');

    // 3. Process each feature
    for (const feature of features) {
        console.log(`━━━ ${feature.description} ━━━`);

        // Find operations matching the tags
        const relevantSchemaNames = findSchemasForTags(paths, schemas, feature.tags);
        console.log(`   Found ${relevantSchemaNames.size} schemas for tags: [${feature.tags.join(', ')}]`);

        if (relevantSchemaNames.size === 0) {
            console.log(`   ⚠️  No schemas found — skipping`);
            console.log('');
            continue;
        }

        // Generate TypeScript
        const tsContent = generateTypeScript(schemas, relevantSchemaNames, feature);

        // Write output
        const outputPath = resolve(PROJECT_ROOT, feature.output);
        if (dryRun) {
            console.log(`   🔍 DRY RUN — would write to: ${feature.output}`);
            console.log(`   Preview (first 500 chars):`);
            console.log(tsContent.substring(0, 500));
        } else {
            mkdirSync(dirname(outputPath), { recursive: true });
            writeFileSync(outputPath, tsContent, 'utf-8');
            console.log(`   ✅ Written to: ${feature.output}`);
        }
        console.log('');
    }

    console.log(dryRun ? '🔍 Dry run complete.' : '✅ Code generation complete!');
    console.log('');
}

// ==================== Schema Discovery ====================

/**
 * Find all schema names referenced by operations with the given tags.
 * Recursively resolves $ref chains to include nested types.
 */
function findSchemasForTags(paths, schemas, tags) {
    const schemaNames = new Set();
    const tagSet = new Set(tags.map(t => t.toLowerCase()));

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (method === 'parameters') continue;

            const opTags = (operation.tags || []).map(t => t.toLowerCase());
            if (!opTags.some(t => tagSet.has(t))) continue;

            // Collect schemas from request body
            collectRefs(operation.requestBody, schemaNames);

            // Collect schemas from parameters
            for (const param of operation.parameters || []) {
                collectRefs(param.schema, schemaNames);
            }

            // Collect schemas from responses
            for (const [code, response] of Object.entries(operation.responses || {})) {
                collectRefs(response, schemaNames);
            }
        }
    }

    // Resolve nested references
    const resolved = new Set();
    const queue = [...schemaNames];
    while (queue.length > 0) {
        const name = queue.pop();
        if (resolved.has(name)) continue;
        resolved.add(name);

        const schema = schemas[name];
        if (!schema) continue;

        // Check properties for refs
        for (const [propName, propSchema] of Object.entries(schema.properties || {})) {
            const refs = extractRefNames(propSchema);
            for (const ref of refs) {
                if (!resolved.has(ref)) queue.push(ref);
            }
        }

        // Check allOf/oneOf/anyOf
        for (const compositeKey of ['allOf', 'oneOf', 'anyOf']) {
            for (const item of schema[compositeKey] || []) {
                const refs = extractRefNames(item);
                for (const ref of refs) {
                    if (!resolved.has(ref)) queue.push(ref);
                }
            }
        }
    }

    return resolved;
}

/**
 * Recursively collect $ref names from a schema node.
 */
function collectRefs(node, refs) {
    if (!node || typeof node !== 'object') return;

    if (node.$ref) {
        refs.add(refToName(node.$ref));
    }

    for (const value of Object.values(node)) {
        if (typeof value === 'object' && value !== null) {
            collectRefs(value, refs);
        }
    }
}

/**
 * Extract all referenced schema names from a property schema.
 */
function extractRefNames(schema) {
    const names = [];
    if (!schema) return names;

    if (schema.$ref) names.push(refToName(schema.$ref));
    if (schema.items?.$ref) names.push(refToName(schema.items.$ref));

    for (const key of ['allOf', 'oneOf', 'anyOf']) {
        for (const item of schema[key] || []) {
            if (item.$ref) names.push(refToName(item.$ref));
        }
    }

    return names;
}

/** Extract type name from $ref string */
function refToName(ref) {
    return ref.split('/').pop();
}

// ==================== TypeScript Generation ====================

/**
 * Generate TypeScript interfaces and enums from OpenAPI schemas.
 */
function generateTypeScript(allSchemas, relevantNames, feature) {
    const lines = [];

    lines.push('/**');
    lines.push(` * Auto-generated TypeScript types for ${feature.description}`);
    lines.push(' *');
    lines.push(` * Generated from: ${swaggerFile || swaggerUrl}`);
    lines.push(` * Generated at:   ${new Date().toISOString()}`);
    lines.push(` * Tags:           ${feature.tags.join(', ')}`);
    lines.push(' *');
    lines.push(' * ⚠️  DO NOT EDIT MANUALLY — regenerate with: npm run codegen');
    lines.push(' */');
    lines.push('');
    lines.push('/* eslint-disable */');
    lines.push('');

    // Sort for deterministic output
    const sortedNames = [...relevantNames].sort();

    // Separate enums from interfaces
    const enums = [];
    const interfaces = [];

    for (const name of sortedNames) {
        const schema = allSchemas[name];
        if (!schema) continue;

        if (schema.enum) {
            enums.push({ name, schema });
        } else {
            interfaces.push({ name, schema });
        }
    }

    // Generate enums first
    for (const { name, schema } of enums) {
        lines.push(...generateEnum(name, schema));
        lines.push('');
    }

    // Generate interfaces
    for (const { name, schema } of interfaces) {
        lines.push(...generateInterface(name, schema, allSchemas));
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Generate a TypeScript enum from an OpenAPI enum schema.
 */
function generateEnum(name, schema) {
    const lines = [];

    if (schema.description) {
        lines.push(`/** ${schema.description} */`);
    }

    // For numeric enums with x-enumNames (NSwag convention)
    const enumNames = schema['x-enumNames'] || schema['x-enum-varnames'];

    if (enumNames && enumNames.length === schema.enum.length) {
        lines.push(`export enum ${name} {`);
        for (let i = 0; i < schema.enum.length; i++) {
            const value = schema.enum[i];
            const label = enumNames[i];
            const isLast = i === schema.enum.length - 1;
            if (typeof value === 'string') {
                lines.push(`    ${label} = '${value}'${isLast ? '' : ','}`);
            } else {
                lines.push(`    ${label} = ${value}${isLast ? '' : ','}`);
            }
        }
        lines.push('}');
    } else {
        // Fallback: use values as both names and values
        lines.push(`export enum ${name} {`);
        for (let i = 0; i < schema.enum.length; i++) {
            const value = schema.enum[i];
            const isLast = i === schema.enum.length - 1;
            if (typeof value === 'string') {
                lines.push(`    ${value} = '${value}'${isLast ? '' : ','}`);
            } else {
                lines.push(`    _${value} = ${value}${isLast ? '' : ','}`);
            }
        }
        lines.push('}');
    }

    return lines;
}

/**
 * Generate a TypeScript interface from an OpenAPI object schema.
 */
function generateInterface(name, schema, allSchemas) {
    const lines = [];

    if (schema.description) {
        lines.push(`/** ${schema.description} */`);
    }

    // Handle allOf (inheritance)
    let extendsClause = '';
    let mergedProperties = { ...(schema.properties || {}) };
    let mergedRequired = [...(schema.required || [])];

    if (schema.allOf) {
        const parentRefs = [];
        for (const item of schema.allOf) {
            if (item.$ref) {
                parentRefs.push(refToName(item.$ref));
            }
            if (item.properties) {
                mergedProperties = { ...mergedProperties, ...item.properties };
            }
            if (item.required) {
                mergedRequired = [...mergedRequired, ...item.required];
            }
        }
        if (parentRefs.length > 0) {
            extendsClause = ` extends ${parentRefs.join(', ')}`;
        }
    }

    lines.push(`export interface ${name}${extendsClause} {`);

    const requiredSet = new Set(mergedRequired);

    for (const [propName, propSchema] of Object.entries(mergedProperties)) {
        const isRequired = requiredSet.has(propName);
        const tsType = schemaToType(propSchema, allSchemas);
        const description = propSchema.description;

        if (description) {
            lines.push(`    /** ${description} */`);
        }

        const optional = isRequired ? '' : '?';
        // Handle nullable
        const nullable = propSchema.nullable ? ' | null' : '';
        lines.push(`    ${propName}${optional}: ${tsType}${nullable};`);
    }

    lines.push('}');

    return lines;
}

/**
 * Convert an OpenAPI schema to a TypeScript type string.
 */
function schemaToType(schema, allSchemas) {
    if (!schema) return 'unknown';

    if (schema.$ref) {
        return refToName(schema.$ref);
    }

    // Handle allOf with single ref (common pattern for nullable types)
    if (schema.allOf && schema.allOf.length === 1 && schema.allOf[0].$ref) {
        return refToName(schema.allOf[0].$ref);
    }

    // Handle oneOf/anyOf
    if (schema.oneOf || schema.anyOf) {
        const variants = (schema.oneOf || schema.anyOf)
            .map(s => schemaToType(s, allSchemas));
        return variants.join(' | ');
    }

    switch (schema.type) {
        case 'string':
            if (schema.format === 'date-time' || schema.format === 'date') {
                return 'string'; // Keep as string — let the consumer parse
            }
            if (schema.format === 'uuid' || schema.format === 'guid') {
                return 'string';
            }
            if (schema.enum) {
                return schema.enum.map(v => `'${v}'`).join(' | ');
            }
            return 'string';

        case 'integer':
        case 'number':
            return 'number';

        case 'boolean':
            return 'boolean';

        case 'array':
            const itemType = schemaToType(schema.items, allSchemas);
            return `${itemType}[]`;

        case 'object':
            // Dictionary pattern: additionalProperties
            if (schema.additionalProperties) {
                const valueType = schemaToType(schema.additionalProperties, allSchemas);
                return `Record<string, ${valueType}>`;
            }
            return 'Record<string, unknown>';

        default:
            // No explicit type but has additionalProperties
            if (schema.additionalProperties) {
                const valueType = schemaToType(schema.additionalProperties, allSchemas);
                return `Record<string, ${valueType}>`;
            }
            return 'unknown';
    }
}

// ==================== Run ====================

main().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
