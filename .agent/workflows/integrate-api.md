---
description: How to integrate a new backend API (ConnectAPI) endpoint into the frontend
---

# Integrate a New API from Swagger

Use this workflow whenever you need to call a new backend endpoint that doesn't have a frontend service yet.

---

## Prerequisites

- The backend controller is deployed and visible in Swagger
- You know the **Swagger tag** (controller group name) and the **endpoint paths**

---

## Step 1 — Inspect the Swagger Spec

Open the Swagger UI for the target environment:

```
https://dev_{TENANT}-connectapi.apprx.eu/swagger
```

Or for local backend:

```
http://localhost:5000/swagger
```

Find the controller/tag you need. Note:
- The **tag name** (e.g. `VDB`, `AppStore`, `AiManagement`)
- The **endpoint paths** (e.g. `/api/services/app/VDB/GetVirtualDbs`)
- The **request/response DTOs**

---

## Step 2 — Generate TypeScript Types (Codegen)

### 2a. Add the tag to codegen config

Edit `codegen/codegen.config.mjs` and add an entry to the `features` array:

```javascript
{
    tags: ['MyControllerTag'],
    output: 'src/app/features/<feature-path>/api/generated-types.ts',
    description: 'Human-readable name'
}
```

### 2b. Run codegen

// turbo
```bash
npm run codegen
```

This generates a `generated-types.ts` file with all interfaces and enums from the Swagger spec for the specified tags.

> **Note**: If the Swagger spec is grouped under a non-default module (not the main `swagger.json`), you may need to update `DEFAULT_SWAGGER_URL` in `codegen.config.mjs` or pass `--url`.

### 2c. Verify generated types

Open the generated file and confirm the DTOs match what you saw in Swagger. The file is read-only — never edit it manually.

---

## Step 3 — Create the Feature API Service

Create a new file: `<feature-path>/api/<feature>-api.service.ts`

Use this template (modeled after `vdb-api.service.ts`):

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, PaginationParams } from '../../../../core/api-client';
// ↑ Adjust relative path to core/api-client as needed

// Import generated types
import { MyItemDto, CreateMyItemInput } from './generated-types';

/**
 * ABP wrapper response interface.
 * All ABP backend responses wrap the actual result in this structure.
 */
interface AbpResponse<T> {
    result: T;
    success: boolean;
    error: any;
    targetUrl: string | null;
    unAuthorizedRequest: boolean;
    __abp: boolean;
}

@Injectable()
export class MyFeatureApiService {
    private readonly api = inject(BaseApiService);

    /** API path prefix — matches the backend controller route */
    private readonly basePath = '/api/services/app/MyController';

    /**
     * Example: GET with pagination
     */
    getItems(params?: PaginationParams): Observable<{ items: MyItemDto[]; totalCount: number }> {
        const queryParams: Record<string, string> = {};
        if (params?.maxResultCount) queryParams['MaxResultCount'] = params.maxResultCount.toString();
        if (params?.skipCount) queryParams['SkipCount'] = params.skipCount.toString();

        return this.api.get<AbpResponse<{ items: MyItemDto[]; totalCount: number }>>(
            `${this.basePath}/GetAll`,
            queryParams
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Example: POST (create)
     */
    create(input: CreateMyItemInput): Observable<MyItemDto> {
        return this.api.post<AbpResponse<MyItemDto>>(
            `${this.basePath}/Create`,
            input
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Example: DELETE
     */
    delete(id: number): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/Delete`,
            { Id: id }
        ).pipe(
            map(() => undefined)
        );
    }
}
```

### Key patterns

| Pattern | Details |
|---------|---------|
| **Injectable scope** | Use `@Injectable()` (NOT `providedIn: 'root'`) — provide in the component |
| **BaseApiService** | Inject `BaseApiService` — it handles `API_BASE_URL`, headers, and errors |
| **ABP wrapper** | Always type the HTTP call as `AbpResponse<T>` and `.pipe(map(r => r.result))` |
| **Path prefix** | Set `basePath` to match the backend controller route exactly |
| **Query params** | Build as `Record<string, string>` — `BaseApiService.buildParams()` handles the rest |

---

## Step 4 — Wire Into the Component

In the component that uses the service:

```typescript
@Component({
    // ...
    providers: [MyFeatureApiService]  // ← scoped to this component
})
export class MyFeatureComponent {
    private readonly myApi = inject(MyFeatureApiService);

    loadItems(): void {
        this.myApi.getItems({ maxResultCount: 50 }).subscribe(result => {
            this.items = result.items;
        });
    }
}
```

---

## Step 5 — Verify

1. Ensure the app builds without errors
2. Open the browser → DevTools → Network tab
3. Trigger the API call and verify:
   - Correct URL (should go through the proxy in dev, or directly to connectapi in deployed env)
   - `Authorization: Bearer ...` header is present
   - Response has the `{ result, success, __abp }` wrapper
   - Data renders correctly in the UI

---

## Special Cases

### Pre-bootstrap endpoint (like `GetUserConfiguration`)

`/AbpUserConfiguration/GetAll` is called in `AppPreBootstrap.ts` using raw `XmlHttpRequest` (before Angular loads). If you need a similar pre-bootstrap call, add it there — not as an Angular service.

### Auth endpoints

Auth-related calls (`/api/TokenAuth/*`, `/api/services/app/Session/*`) use `TokenAuthServiceProxy` and `SessionServiceProxy` in `core/services/auth-proxies.service.ts`. These use `HttpClient` directly (not `BaseApiService`) because they have special error handling and the interceptor skips them.

### Model files (optional)

If you need aliases or additional non-generated types, create a `<feature>.models.ts` file:

```typescript
// Re-export generated types with friendlier names
export type { MyGeneratedDto as MyItem } from './generated-types';

// Add frontend-only types
export interface MyFrontendOnlyModel {
    // ...
}
```

---

## Reference Files

| File | Purpose |
|------|---------|
| `codegen/codegen.config.mjs` | Codegen tag → output mapping |
| `codegen/README.md` | Full codegen documentation |
| `core/api-client/base-api.service.ts` | Shared HTTP layer |
| `core/api-client/api-config.ts` | `API_BASE_URL` token, `PagedResult`, `ApiError` |
| `core/interceptors/auth.interceptor.ts` | Auto-attaches Bearer token |
| `features/app-store/apps/vdb-manager/api/vdb-api.service.ts` | Reference implementation |
| `core/services/auth-proxies.service.ts` | Auth endpoint pattern (special case) |
