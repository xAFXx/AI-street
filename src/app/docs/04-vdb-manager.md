# VDB Manager (Virtual Database)

Redis web client for browsing, searching, and editing key-value data stored in the APPRX Virtual Database backend.

## Files

```
features/app-store/apps/vdb-manager/
├── api/
│   ├── vdb.models.ts              # DTOs (VirtualDbDto, VirtualDbRowDto, SaveToVirtualDbInput, etc.)
│   ├── vdb-api.service.ts         # API service wrapping /api/services/app/VDB
│   └── index.ts                   # Barrel export
├── components/                    # Sub-components (reserved)
├── vdb-app.component.ts           # Main component (~920 lines)
├── vdb-app.component.html         # 3-panel layout template
├── vdb-app.component.less
├── vdb-app.component.spec.ts
└── index.ts
```

## Data Models

| Model | Purpose |
|-------|---------|
| `VirtualDbDto` | Table descriptor (`name`) |
| `VirtualDbRowDto` | Row with string value (`key`, `value`) |
| `VirtualDbRowJTokenDto` | Row with parsed JSON value (`key`, `value: any`) |
| `SaveToVirtualDbInput` | Save input (`databaseName`, `key`, `innerObject`, `ttl`) |
| `AddPropertyToVirtualDbInput` | Add property to existing row |
| `DeleteFromVirtualDbInput` | Delete input (`databaseName`, `key`) |
| `VdbRowQueryParams` | Query with `filterPropertyKey`, `filterPropertyValue`, `query` |

## API Endpoints (`VdbApiService`)

Base: `/api/services/app/VDB` — ABP-wrapped responses.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getVirtualDbs()` | `GET /GetVirtualDbs` | List tables |
| `saveToVirtualDb(input)` | `POST /SaveToVirtualDb` | Create/update row |
| `deleteVirtualDb(name)` | `DELETE /DeleteVirtualDb` | Delete table |
| `getVirtualDbRows(params)` | `GET /GetVirtualDbRows` | Get rows (string) |
| `getVirtualDbRowsAsObject(params)` | `GET /GetVirtualDbRowsAsObject` | Get rows (parsed JSON) |
| `getSearchVirtualDbRows(params)` | `GET /GetSearchVirtualDbRows` | Search rows |
| `deleteFromVirtualDb(input)` | `DELETE /DeleteFromVirtualDb` | Delete row |
| `addPropertyToVirtualDb(input)` | `POST /AddPropertyToVirtualDb` | Add property |

## View Modes

1. **Skim** — Data table with dynamic columns, row expansion, frozen key column
2. **Friendly** — Card grid (3 columns, responsive)
3. **Technical** — Key-value table with types and sizes
4. **Raw** — Pretty-printed JSON

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Toolbar: Search | Create Table | Refresh           │
├────────────┬──────────┬─────────────────────────────┤
│  Tables    │  Rows    │  Value Preview              │
│  (list)    │  (table) │  [Skim|Friendly|Tech|Raw]   │
├────────────┴──────────┴─────────────────────────────┤
│  Add/Edit Row Dialog (JSON editor)                  │
└─────────────────────────────────────────────────────┘
```

## Features

- Table CRUD, row CRUD, inline JSON editing (`ang-jsoneditor`)
- Expandable rows for nested objects (horizontal tables)
- Search & filter (by key or property value)
- Deep linking: `?table=tableName`
- Frozen key column during horizontal scroll
