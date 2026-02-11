#!/usr/bin/env node

/**
 * OpenAPI Drift Audit Script
 *
 * Compares the currently generated types against a fresh generation
 * to detect if the backend schema has changed since last generation.
 *
 * Usage:
 *   node codegen/audit.mjs
 *   SWAGGER_URL=http://localhost:21021/swagger/v1/swagger.json node codegen/audit.mjs
 *
 * Exit codes:
 *   0 - Types are up to date
 *   1 - Drift detected (types need regeneration)
 *   2 - Error (could not fetch spec, etc.)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const { features } = await import('./codegen.config.mjs');

console.log('');
console.log('🔍 OpenAPI Drift Audit');
console.log('━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// 1. Save current generated files
const snapshots = {};
let allExist = true;

for (const feature of features) {
    const filePath = resolve(PROJECT_ROOT, feature.output);
    if (existsSync(filePath)) {
        snapshots[feature.output] = readFileSync(filePath, 'utf-8');
    } else {
        console.log(`⚠️  ${feature.description}: No generated file found at ${feature.output}`);
        console.log(`   Run 'npm run codegen' first to generate initial types.`);
        allExist = false;
    }
}

if (!allExist) {
    console.log('\n❌ Some generated files are missing. Run codegen first.\n');
    process.exit(2);
}

// 2. Regenerate (writes to same output paths)
console.log('Regenerating types from current backend spec...\n');
try {
    execSync('node codegen/generate.mjs', {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env }
    });
} catch (err) {
    console.error('❌ Failed to regenerate:', err.stderr?.toString() || err.message);
    process.exit(2);
}

// 3. Compare
let driftDetected = false;

for (const feature of features) {
    const filePath = resolve(PROJECT_ROOT, feature.output);
    const oldContent = snapshots[feature.output];
    const newContent = readFileSync(filePath, 'utf-8');

    if (oldContent === newContent) {
        console.log(`✅ ${feature.description}: Up to date`);
    } else {
        console.log(`❌ ${feature.description}: DRIFT DETECTED`);
        driftDetected = true;

        // Show a simple diff summary
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');

        // Ignore the "Generated at:" line for meaningful diff
        const oldFiltered = oldLines.filter(l => !l.includes('Generated at:'));
        const newFiltered = newLines.filter(l => !l.includes('Generated at:'));

        if (oldFiltered.join('\n') === newFiltered.join('\n')) {
            console.log(`   (Only timestamp changed — no actual schema drift)`);
            driftDetected = false;
        } else {
            const addedLines = newFiltered.filter(l => !oldFiltered.includes(l));
            const removedLines = oldFiltered.filter(l => !newFiltered.includes(l));

            if (addedLines.length > 0) {
                console.log(`   + ${addedLines.length} lines added`);
                addedLines.slice(0, 5).forEach(l => console.log(`     + ${l.trim()}`));
                if (addedLines.length > 5) console.log(`     ... and ${addedLines.length - 5} more`);
            }
            if (removedLines.length > 0) {
                console.log(`   - ${removedLines.length} lines removed`);
                removedLines.slice(0, 5).forEach(l => console.log(`     - ${l.trim()}`));
                if (removedLines.length > 5) console.log(`     ... and ${removedLines.length - 5} more`);
            }
        }

        // Restore original file
        const { writeFileSync } = await import('fs');
        writeFileSync(filePath, oldContent, 'utf-8');
        console.log(`   ↩️  Restored original file (run 'npm run codegen' to apply changes)`);
    }
}

console.log('');

if (driftDetected) {
    console.log('⚠️  Schema drift detected! Run "npm run codegen" to update generated types.');
    console.log('');
    process.exit(1);
} else {
    console.log('✅ All generated types are up to date.');
    console.log('');
    process.exit(0);
}
