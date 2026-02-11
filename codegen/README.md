# Code Generation (`codegen/`)

Auto-generates TypeScript interfaces from the backend Swagger/OpenAPI spec, ensuring the frontend DTOs always match the backend schema.

## Quick Start

```bash
# Generate types from default dev backend
npm run codegen

# Generate from a specific backend
npm run codegen:local        # http://localhost:21021
npm run codegen:staging      # (configure in package.json)

# Or use any URL directly
SWAGGER_URL=https://my-api.com/swagger/v1/swagger.json npm run codegen

# Check if types are still up to date
npm run codegen:audit

# Preview without writing files
npm run codegen:dry
```

## How It Works

1. **Fetches** the `swagger.json` from the backend
2. **Discovers** which schemas belong to each feature (by controller tag)
3. **Generates** clean TypeScript `interface` and `enum` definitions
4. **Writes** them to feature-specific `generated-types.ts` files

## Files

| File | Purpose |
|---|---|
| `codegen.config.mjs` | Maps backend controller tags → feature output paths |
| `generate.mjs` | Main generation script |
| `audit.mjs` | Drift detection (compares current vs fresh generation) |
| `.env.example` | Example environment variables |

## Adding a New Feature

Edit `codegen.config.mjs` and add an entry:

```javascript
{
    tags: ['VDB'],
    output: 'src/app/features/app-store/apps/vdb-manager/api/generated-types.ts',
    description: 'Virtual Database'
}
```

Then run `npm run codegen`.

## Using Generated Types

The generated file exports plain TypeScript interfaces. Import them in your API service:

```typescript
// In your hand-written API service
import { AppDefinitionOutputDto, AppAssignmentListDto } from './generated-types';
```

Or re-export with aliases in your models file:

```typescript
// app-store.models.ts
export type { AppDefinitionOutputDto as AppDefinitionDto } from './generated-types';
```

## Environment Support

| Environment | URL |
|---|---|
| Dev (default) | `https://dev_ihsc-connectapi.apprx.eu/swagger/v1/swagger.json` |
| Local | `http://localhost:21021/swagger/v1/swagger.json` |
| From file | `node codegen/generate.mjs --file ./swagger.json` |

Override via `SWAGGER_URL` env var or `--url` / `--file` CLI flags.
