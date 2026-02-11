#!/usr/bin/env node

/**
 * OpenAPI Smart Sync
 *
 * Fetches the Swagger spec once, then checks each feature for schema changes.
 * Only regenerates features where the backend schemas have actually changed.
 *
 * Uses a hash cache (.codegen-cache.json) to track last-known schema state.
 *
 * Usage:
 *   node codegen/sync.mjs                  # smart sync (only changed features)
 *   node codegen/sync.mjs --force          # force regenerate all
 *   node codegen/sync.mjs --check          # check only, don't write (CI mode)
 *   SWAGGER_URL=... node codegen/sync.mjs  # custom backend URL
 *
 * Exit codes:
 *   0 - All up to date (or successfully regenerated)
 *   1 - Drift detected (in --check mode)
 *   2 - Error
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const CACHE_FILE = resolve(__dirname, '.codegen-cache.json');

// Load config
const { features, DEFAULT_SWAGGER_URL } = await import(
    pathToFileURL(resolve(__dirname, 'codegen.config.mjs')).href
);

// Parse CLI args
const args = process.argv.slice(2);
const forceAll = args.includes('--force');
const checkOnly = args.includes('--check');
const urlArgIdx = args.indexOf('--url');
const fileArgIdx = args.indexOf('--file');

const swaggerFile = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
const swaggerUrl = urlArgIdx !== -1
    ? args[urlArgIdx + 1]
    : (process.env.SWAGGER_URL || DEFAULT_SWAGGER_URL);

// ==================== Main ====================

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║            OpenAPI Smart Sync for APPRX                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Load spec
    const spec = await loadSpec();
    const schemas = spec.components?.schemas || spec.definitions || {};
    const paths = spec.paths || {};

    console.log(`📋 ${spec.info?.title || 'API'} (${spec.openapi || spec.swagger})`);
    console.log(`   ${Object.keys(schemas).length} schemas, ${Object.keys(paths).length} paths`);
    console.log('');

    // 2. Load cache
    const cache = loadCache();

    // 3. Check each feature
    let driftCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newCache = { ...cache };

    for (const feature of features) {
        const relevantSchemaNames = findSchemasForTags(paths, schemas, feature.tags);

        if (relevantSchemaNames.size === 0) {
            console.log(`⚠️  ${feature.description}: No schemas found for tags [${feature.tags.join(', ')}]`);
            continue;
        }

        // Compute hash of relevant schemas
        const schemaData = {};
        for (const name of [...relevantSchemaNames].sort()) {
            schemaData[name] = schemas[name];
        }
        const currentHash = hashObject(schemaData);
        const cachedHash = cache[feature.output];

        if (!forceAll && cachedHash === currentHash) {
            console.log(`✅ ${feature.description}: No changes (${relevantSchemaNames.size} schemas)`);
            skippedCount++;
            continue;
        }

        // Drift detected
        driftCount++;
        const reason = forceAll ? 'forced' : (!cachedHash ? 'new' : 'changed');
        console.log(`🔄 ${feature.description}: ${reason} (${relevantSchemaNames.size} schemas)`);

        if (checkOnly) {
            console.log(`   ↳ Would regenerate: ${feature.output}`);
            continue;
        }

        // Regenerate
        const tsContent = generateTypeScript(schemas, relevantSchemaNames, feature);
        const outputPath = resolve(PROJECT_ROOT, feature.output);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, tsContent, 'utf-8');
        console.log(`   ↳ Updated: ${feature.output}`);

        newCache[feature.output] = currentHash;
        updatedCount++;
    }

    // 4. Save cache
    if (!checkOnly) {
        saveCache(newCache);
    }

    // 5. Summary
    console.log('');
    console.log('━━━ Summary ━━━');
    console.log(`   Checked:   ${features.length} features`);
    console.log(`   Skipped:   ${skippedCount} (no changes)`);
    console.log(`   Changed:   ${driftCount}`);
    if (!checkOnly) {
        console.log(`   Updated:   ${updatedCount}`);
    }
    console.log('');

    if (checkOnly && driftCount > 0) {
        console.log('⚠️  Schema drift detected. Run "npm run codegen" to update.');
        process.exit(1);
    } else if (updatedCount > 0) {
        console.log('✅ Sync complete — only changed features were regenerated.');
    } else {
        console.log('✅ Everything is up to date.');
    }
    console.log('');
}

// ==================== Spec Loading ====================

async function loadSpec() {
    if (swaggerFile) {
        console.log(`📂 Loading spec from file: ${swaggerFile}`);
        return JSON.parse(readFileSync(resolve(PROJECT_ROOT, swaggerFile), 'utf-8'));
    }

    console.log(`🌐 Fetching spec from: ${swaggerUrl}`);
    try {
        const response = await fetch(swaggerUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (err) {
        console.error(`\n❌ Failed to fetch Swagger spec: ${err.message}`);
        console.error(`   Use --file for a local swagger.json\n`);
        process.exit(2);
    }
}

// ==================== Cache ====================

function loadCache() {
    try {
        return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveCache(cache) {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function hashObject(obj) {
    return createHash('sha256')
        .update(JSON.stringify(obj))
        .digest('hex')
        .substring(0, 16);
}

// ==================== Schema Discovery ====================

function findSchemasForTags(paths, schemas, tags) {
    const schemaNames = new Set();
    const tagSet = new Set(tags.map(t => t.toLowerCase()));

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (method === 'parameters') continue;
            const opTags = (operation.tags || []).map(t => t.toLowerCase());
            if (!opTags.some(t => tagSet.has(t))) continue;

            collectRefs(operation.requestBody, schemaNames);
            for (const param of operation.parameters || []) {
                collectRefs(param.schema, schemaNames);
            }
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

        for (const propSchema of Object.values(schema.properties || {})) {
            for (const ref of extractRefNames(propSchema)) {
                if (!resolved.has(ref)) queue.push(ref);
            }
        }
        for (const key of ['allOf', 'oneOf', 'anyOf']) {
            for (const item of schema[key] || []) {
                for (const ref of extractRefNames(item)) {
                    if (!resolved.has(ref)) queue.push(ref);
                }
            }
        }
    }

    return resolved;
}

function collectRefs(node, refs) {
    if (!node || typeof node !== 'object') return;
    if (node.$ref) refs.add(refToName(node.$ref));
    for (const value of Object.values(node)) {
        if (typeof value === 'object' && value !== null) collectRefs(value, refs);
    }
}

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

function refToName(ref) { return ref.split('/').pop(); }

// ==================== TypeScript Generation ====================

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

    const sortedNames = [...relevantNames].sort();
    const enums = [];
    const interfaces = [];

    for (const name of sortedNames) {
        const schema = allSchemas[name];
        if (!schema) continue;
        if (schema.enum) enums.push({ name, schema });
        else interfaces.push({ name, schema });
    }

    for (const { name, schema } of enums) {
        lines.push(...generateEnum(name, schema));
        lines.push('');
    }

    for (const { name, schema } of interfaces) {
        lines.push(...generateInterface(name, schema, allSchemas));
        lines.push('');
    }

    return lines.join('\n');
}

function generateEnum(name, schema) {
    const lines = [];
    if (schema.description) lines.push(`/** ${schema.description} */`);
    const enumNames = schema['x-enumNames'] || schema['x-enum-varnames'];

    if (enumNames && enumNames.length === schema.enum.length) {
        lines.push(`export enum ${name} {`);
        for (let i = 0; i < schema.enum.length; i++) {
            const value = schema.enum[i];
            const label = enumNames[i];
            const comma = i < schema.enum.length - 1 ? ',' : '';
            lines.push(`    ${label} = ${typeof value === 'string' ? `'${value}'` : value}${comma}`);
        }
        lines.push('}');
    } else {
        lines.push(`export enum ${name} {`);
        for (let i = 0; i < schema.enum.length; i++) {
            const value = schema.enum[i];
            const comma = i < schema.enum.length - 1 ? ',' : '';
            if (typeof value === 'string') lines.push(`    ${value} = '${value}'${comma}`);
            else lines.push(`    _${value} = ${value}${comma}`);
        }
        lines.push('}');
    }
    return lines;
}

function generateInterface(name, schema, allSchemas) {
    const lines = [];
    if (schema.description) lines.push(`/** ${schema.description} */`);

    let extendsClause = '';
    let mergedProperties = { ...(schema.properties || {}) };
    let mergedRequired = [...(schema.required || [])];

    if (schema.allOf) {
        const parentRefs = [];
        for (const item of schema.allOf) {
            if (item.$ref) parentRefs.push(refToName(item.$ref));
            if (item.properties) mergedProperties = { ...mergedProperties, ...item.properties };
            if (item.required) mergedRequired = [...mergedRequired, ...item.required];
        }
        if (parentRefs.length > 0) extendsClause = ` extends ${parentRefs.join(', ')}`;
    }

    lines.push(`export interface ${name}${extendsClause} {`);
    const requiredSet = new Set(mergedRequired);

    for (const [propName, propSchema] of Object.entries(mergedProperties)) {
        const isRequired = requiredSet.has(propName);
        const tsType = schemaToType(propSchema, allSchemas);
        if (propSchema.description) lines.push(`    /** ${propSchema.description} */`);
        const optional = isRequired ? '' : '?';
        const nullable = propSchema.nullable ? ' | null' : '';
        lines.push(`    ${propName}${optional}: ${tsType}${nullable};`);
    }

    lines.push('}');
    return lines;
}

function schemaToType(schema, allSchemas) {
    if (!schema) return 'unknown';
    if (schema.$ref) return refToName(schema.$ref);
    if (schema.allOf?.length === 1 && schema.allOf[0].$ref) return refToName(schema.allOf[0].$ref);

    if (schema.oneOf || schema.anyOf) {
        return (schema.oneOf || schema.anyOf).map(s => schemaToType(s, allSchemas)).join(' | ');
    }

    switch (schema.type) {
        case 'string':
            if (schema.enum) return schema.enum.map(v => `'${v}'`).join(' | ');
            return 'string';
        case 'integer': case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'array': return `${schemaToType(schema.items, allSchemas)}[]`;
        case 'object':
            if (schema.additionalProperties) return `Record<string, ${schemaToType(schema.additionalProperties, allSchemas)}>`;
            return 'Record<string, unknown>';
        default:
            if (schema.additionalProperties) return `Record<string, ${schemaToType(schema.additionalProperties, allSchemas)}>`;
            return 'unknown';
    }
}

// ==================== Run ====================

main().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
