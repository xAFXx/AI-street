# VDB Manager (Virtual Database)

A Redis web client for browsing, searching, and editing key-value data stored in the APPRX Virtual Database backend.

## Features

| Feature | Description |
|---------|-------------|
| **Table Management** | List, create, and delete VDB tables (Redis key namespaces) |
| **Row CRUD** | Add, edit, and delete key-value rows within tables |
| **Multi-View Modes** | Skim → Friendly → Technical → Raw views for inspecting values |
| **Inline JSON Editing** | Full JSON editor (ang-jsoneditor) for modifying row values |
| **Row Expansion** | Expandable rows showing nested objects/arrays in horizontal tables |
| **Search & Filter** | Filter tables and search rows by key or property value |
| **Deep Linking** | URL-based table selection (`?table=tableName`) |
| **Frozen Columns** | Key column stays visible during horizontal scroll |

## Architecture

```
vdb-manager/
├── api/
│   ├── vdb.models.ts          # DTOs: VirtualDbDto, VirtualDbRowDto, SaveToVirtualDbInput, etc.
│   ├── vdb-api.service.ts     # API service wrapping /api/services/app/VDB endpoints
│   └── index.ts               # Public barrel export
├── components/                # (reserved for sub-components)
├── vdb-app.component.ts       # Main component (920 lines)
├── vdb-app.component.html     # Template with 3-panel layout
├── vdb-app.component.less     # Styles
├── vdb-app.component.spec.ts  # Tests
└── index.ts                   # Public barrel export
```

## Data Models (`api/vdb.models.ts`)

| Model | Purpose |
|-------|---------|
| `VirtualDbDto` | Table descriptor (`name`) |
| `VirtualDbRowDto` | Row with string value (`key`, `value`) |
| `VirtualDbRowJTokenDto` | Row with parsed JSON value (`key`, `value: any`) |
| `SaveToVirtualDbInput` | Save input (`databaseName`, `key`, `innerObject`, `ttl`) |
| `AddPropertyToVirtualDbInput` | Add property to existing row |
| `DeleteFromVirtualDbInput` | Delete input (`databaseName`, `key`) |
| `VdbRowQueryParams` | Query params with `filterPropertyKey`, `filterPropertyValue`, `query` |

## API Endpoints (`api/vdb-api.service.ts`)

All endpoints are under `/api/services/app/VDB` and return ABP-wrapped responses.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `getVirtualDbs()` | `GET /GetVirtualDbs` | List tables with pagination |
| `saveToVirtualDb(input)` | `POST /SaveToVirtualDb` | Create/update a row |
| `saveToVirtualDbInArray(input)` | `POST /SaveToVirtualDbInArray` | Save as array element |
| `deleteVirtualDb(name)` | `DELETE /DeleteVirtualDb` | Delete entire table |
| `getVirtualDbRows(params)` | `GET /GetVirtualDbRows` | Get rows (string values) |
| `getVirtualDbRowsAsObject(params)` | `GET /GetVirtualDbRowsAsObject` | Get rows (parsed JSON) |
| `getSearchVirtualDbRows(params)` | `GET /GetSearchVirtualDbRows` | Search rows |
| `getSearchVirtualDbRowsAsObject(params)` | `GET /GetSearchVirtualDbRowsAsObject` | Search rows (JSON) |
| `deleteFromVirtualDb(input)` | `DELETE /DeleteFromVirtualDb` | Delete a row |
| `addPropertyToVirtualDb(input)` | `POST /AddPropertyToVirtualDb` | Add property to row |

## View Modes

The value preview panel supports four view modes:

1. **Skim** — High-density data table with dynamic columns, row expansion for nested structures, frozen key column
2. **Friendly** — Card-based grid showing properties as labeled cards (3 columns, responsive)
3. **Technical** — Key-value table with property names, types, sizes
4. **Raw** — Pretty-printed JSON in a `<pre>` block

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Toolbar: Search | Create Table | Refresh           │
├────────────┬──────────┬─────────────────────────────┤
│  Tables    │  Rows    │  Value Preview              │
│  (list)    │  (table) │  [Skim|Friendly|Tech|Raw]   │
│            │          │                             │
│            │          │  Card grid / Table / JSON   │
│            │          │                             │
├────────────┴──────────┴─────────────────────────────┤
│  Add/Edit Row Dialog (JSON editor)                  │
└─────────────────────────────────────────────────────┘
```

## Dependencies

- **PrimeNG v21**: Table, Dialog, Button, Toolbar, Splitter, TabView, SelectButton, Toast, ConfirmDialog, InputText, MultiSelect
- **ang-jsoneditor**: JSON editor for row value editing
- **JsonDataViewerComponent**: Shared component for JSON display
- **BaseApiService**: Core HTTP client for API calls
