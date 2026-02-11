# Document Management

AI-powered document analysis and data extraction engine. Upload documents, define a target schema, and extract structured JSON using AI Vision.

## Files

```
features/app-store/apps/document-management/
├── document-management.component.ts       # Main component (~3200 lines)
├── document-management.component.html
├── document-management.component.less
├── document-management.component.spec.ts
└── index.ts
```

## Processing Pipeline

```
Upload Files → Select Schema → AI Analysis → View/Export Results
     │              │               │               │
  files/folders   SchemaService   AiChatService    Friendly/Tech/Raw
  ZIP extraction  JSON Schema     4 workers        JSON export
```

## Internal Interfaces

| Interface | Purpose |
|-----------|---------|
| `UploadedFile` | File + metadata, status (`pending→analyzing→analyzed→mapped`), `dataUrl` |
| `FileNode` | Tree node for folder display (`file \| folder`, children) |
| `FailedFile` | Error tracking (`errorMessage`, `retryCount`, `failedAt`) |
| `ProcessingQueueItem` | Queue state (`queued→processing→completed→error`, progress %) |

## Schema Interfaces (from `SchemaService`)

| Interface | Purpose |
|-----------|---------|
| `Schema` | Definition with `name`, `description`, `properties[]`, `jsonContent` |
| `SchemaProperty` | Property: `name`, `type`, `required`, `description` |
| `MappedData` | Result: `document` (full JSON), `mappings[]`, `confidence` |
| `PropertyMapping` | Single mapping: `propertyName` → `extractedValue` + `confidence` |

## AI Strategy

| File Type | Approach |
|-----------|----------|
| Text (JSON, XML, CSV) | Text analysis prompt with content inline |
| PDF / Images | Vision API — combined analysis + extraction in one call |
| Office docs | Text extraction → text prompt |

## Key Methods

| Method | Description |
|--------|-------------|
| `analyzeFiles()` | Parallel AI processing (4 concurrent workers) |
| `buildVisionMappingPrompt()` | Combined Vision prompt for single-pass extraction |
| `performMapping()` | Schema-based data mapping from AI results |
| `exportAllMappedData()` | Export all results as JSON |
| `retryFailedFiles()` | Re-process failed files |
| `restoreFromSettings()` / `saveToSettings()` | State persistence via `SettingsService` |

## Supported File Types

| Category | Extensions |
|----------|-----------|
| Documents | PDF, DOCX, DOC, XLSX, XLS, PPTX |
| Images | PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP |
| Data | JSON, XML, CSV, TXT |
| Archives | ZIP (auto-extracted) |
| E-Invoices | UBL/PEPPOL XML |

## Service Dependencies

| Service | Purpose |
|---------|---------|
| `SchemaService` | Schema CRUD, JSON Schema generation |
| `AiChatService` | OpenAI Vision, text completions |
| `SettingsService` | Persistent state (schemas, results, API keys) |

## Features

- Multi-source upload (files, folders via `webkitdirectory`, ZIP via JSZip)
- Real-time processing queue with progress and time estimates
- Failed file recovery (retry/dismiss per file)
- Multi-select result management (delete, requeue, export)
- 3 view modes: Friendly (cards) / Technical (table) / Raw (JSON)
- In-app document preview (PDF iframe, image display, Office viewer)
- Credit exhaustion detection with recovery dialog
