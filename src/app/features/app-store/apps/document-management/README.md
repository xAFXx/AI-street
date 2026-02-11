# Document Management

AI-powered document analysis and data extraction engine. Upload documents (files, folders, or ZIPs), define a target schema, and let AI analyze and map document contents into structured JSON.

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Source Upload** | Individual files, folder selection (`webkitdirectory`), and ZIP extraction |
| **Schema Management** | Create, edit, delete, and select JSON schemas for data extraction |
| **AI Analysis** | Parallel processing with 4 concurrent workers using Vision API |
| **Combined Vision Mapping** | Single-pass document analysis + schema extraction for PDFs/images |
| **Processing Queue** | Real-time queue display with progress, time estimates, and error tracking |
| **Failed File Recovery** | Persistent failed file tracking with retry/dismiss per file |
| **Result Management** | Multi-select, delete, requeue, export (single/all) |
| **Multi-View Display** | Friendly (card grid) → Technical (table) → Raw (JSON) views |
| **Document Preview** | In-app PDF viewer, image display, Office document viewer |
| **State Persistence** | Schema, results, and failed files saved to localStorage via `SettingsService` |
| **Credit Monitoring** | Detects OpenAI credit exhaustion and shows a recovery dialog |

## Architecture

```
document-management/
├── document-management.component.ts       # Main component (3222 lines)
├── document-management.component.html     # Template
├── document-management.component.less     # Styles
├── document-management.component.spec.ts  # Tests
└── index.ts                               # Barrel export
```

### Service Dependencies

| Service | Purpose |
|---------|---------|
| `SchemaService` | Schema CRUD, property definitions, JSON Schema generation |
| `AiChatService` | AI model communication (OpenAI Vision, text completions) |
| `SettingsService` | Persistent state storage (schemas, results, API keys) |
| `DomSanitizer` | Sanitize data URLs for PDF iframe embedding |

## Data Models

### Internal Interfaces

| Interface | Purpose |
|-----------|---------|
| `UploadedFile` | File with metadata, content, status (`pending → analyzing → analyzed → mapped`), `dataUrl` for preview |
| `FileNode` | Hierarchical tree node for folder display (`file | folder`, children, expansion state) |
| `FailedFile` | Persistent error tracking (`errorMessage`, `retryCount`, `failedAt`) |
| `ProcessingQueueItem` | Real-time queue state (`queued → processing → completed → error`, progress %) |

### Schema Interfaces (from `SchemaService`)

| Interface | Purpose |
|-----------|---------|
| `Schema` | Schema definition with `name`, `description`, `properties[]`, `jsonContent` |
| `SchemaProperty` | Property with `name`, `type`, `required`, `description` |
| `MappedData` | Extraction result with `document` (full JSON), `mappings[]`, `confidence` |
| `PropertyMapping` | Single field mapping: `propertyName` → `extractedValue` + `confidence` |

## Processing Pipeline

```
1. Upload Files ──→ 2. Select Schema ──→ 3. Analyze Documents ──→ 4. View Results
     │                     │                      │                      │
   files[]              schema             AI Vision API           Friendly/Tech/Raw
   folders              JSON Schema        4 parallel workers      Export JSON
   ZIPs                 Custom edit        Queue + progress        Multi-select ops
```

### AI Prompting Strategy

| File Type | Strategy |
|-----------|----------|
| **Text files** (JSON, XML, CSV) | Text analysis prompt with file content inline |
| **PDFs / Images** | Vision API with `buildVisionMappingPrompt()` — combined analysis + extraction in one call |
| **Office docs** | Converted/extracted text sent as text prompt |

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: Schema dropdown │ New Schema │ Analyze │ Export │ Reset │
├──────────┬───────────────────────────────────────────────────────┤
│          │  Upload Zone (drag & drop / file picker / folder)    │
│  File    ├──────────────────────────────────────────────────────┤
│  Tree    │  Processing Queue (real-time progress)               │
│  Panel   ├──────────────────────────────────────────────────────┤
│          │  Results Panel                                       │
│          │  [Friendly | Technical | Raw]                        │
│          │  Multi-select toolbar │ Card grid / Table / JSON     │
├──────────┴──────────────────────────────────────────────────────┤
│  Failed Files Panel (retry / dismiss)                           │
├─────────────────────────────────────────────────────────────────┤
│  Modals: Document Preview │ JSON Preview │ API Key Dialog       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Methods

| Method | Description |
|--------|-------------|
| `analyzeFiles()` | Main entry: parallel AI processing with 4 workers |
| `buildVisionMappingPrompt()` | Combined Vision prompt for single-pass extraction |
| `performMapping()` | Schema-based data mapping from analysis results |
| `parseMappingResult()` | Parse AI JSON response into `PropertyMapping[]` |
| `exportAllMappedData()` | Export all results as consolidated JSON |
| `retryFailedFiles()` | Re-process all failed files |
| `restoreFromSettings()` | Load persisted state on init |
| `saveToSettings()` | Persist current state to localStorage |

## Supported File Types

| Category | Extensions |
|----------|-----------|
| **Documents** | PDF, DOCX, DOC, XLSX, XLS, PPTX |
| **Images** | PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP |
| **Data** | JSON, XML, CSV, TXT |
| **Archives** | ZIP (auto-extracted) |
| **E-Invoices** | UBL/PEPPOL XML |

## Dependencies

- **PrimeNG v21**: FileUpload, Table, Dialog, Button, Toolbar, SelectButton, Tag, ProgressBar, TabView, Tooltip, Toast, ConfirmDialog
- **JSZip**: ZIP file extraction
- **SchemaService / AiChatService / SettingsService**: Core services
- **JsonTreeViewComponent / JsonDataViewerComponent**: Shared display components
