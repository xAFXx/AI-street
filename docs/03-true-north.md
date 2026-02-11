# True North

Report generation suite. Multi-component system for creating, editing, and managing structured reports with AI assistance.

## Files

```
features/app-store/apps/true-north/
├── index.ts                           # Barrel exports
├── reports/                           # Report listing + detail
│   ├── reports-page.component.*       # Report list (table, CRUD)
│   ├── report-details.component.*     # Chapter/block editor
│   ├── reports-page.component.less
│   ├── models/
│   │   └── report.model.ts            # Report, Chapter, Block interfaces
│   └── services/
│       └── report-data.service.ts     # Report CRUD (localStorage-backed)
├── results/                           # Analysis results viewer
│   └── results.component.*
├── template-editor/                   # Report framework templates
│   ├── template-editor.component.*    # Create/edit templates
│   ├── report-frameworks.component.*  # Framework listing
│   ├── models/
│   │   └── template-config.model.ts   # ReportTemplateConfig, TemplateChapter, TemplateBlock
│   ├── services/
│   │   └── template-config.service.ts # Template CRUD
│   └── ai-providers/                  # AI configuration
│       └── ai-config.ts               # API keys, model selection
├── schema-editor/                     # JSON schema editor
│   └── schema-editor.component.*
├── report-wizard/                     # AI-guided report creation
│   └── report-wizard.component.*
└── block-templates/                   # Audit standard block templates
    ├── block-templates-page.component.*
    └── ...
```

## Sub-Features

### Reports Page (`/reports`)
- Table of all reports with status, progress, template info
- Create new report → navigates to Report Wizard
- Click report → navigates to Report Details

### Report Details (`/reports/:id`)
- Chapter tree (left panel) + block editor (right panel)
- Blocks are content units within chapters
- AI-assisted editing per chapter/block via `AiChatService`

### Template Editor (`/template-editor/new`, `/template-editor/:id`)
- Define report frameworks with chapters, blocks, constraints
- AI summary fields for auto-extraction
- Document upload + AI analysis for template creation
- `TemplateConfigService` handles CRUD

### Schema Editor (`/schema-editor`, `/schema-editor/:id`)
- JSON schema creation and editing
- Used by Document Management for extraction schemas
- `SchemaService` handles CRUD + property definitions

### Report Wizard (`/report-wizard`)
- Multi-step AI-guided report creation
- Step 1: Select template → Step 2: Upload documents → Step 3: AI analysis → Step 4: Review & Generate
- Uses `AiChatService` for document analysis and content generation

### Block Templates / Audit Standards (`/audit-standards`)
- Predefined content blocks for common audit standards
- Reusable across report templates

### Report Frameworks (`/report-frameworks`)
- Listing of all available report configuration templates
- Navigate to Template Editor for create/edit

## Key Models

| Model | Purpose |
|-------|---------|
| `Report` | Report with chapters, status, progress, reference docs |
| `Chapter` | Hierarchical chapter with key, label, children, blocks |
| `Block` | Content unit (text, table, chart) within a chapter |
| `ReportTemplateConfig` | Template definition with chapters, AI summary fields |
| `TemplateChapter` | Template chapter with blocks and constraints |
| `TemplateBlock` | Block template with content type, mandatory flag |
| `BlockConstraint` | Validation rules for blocks |
| `Schema` / `SchemaProperty` | JSON schema for data extraction |

## Core Services Used

| Service | Purpose |
|---------|---------|
| `ReportDataService` | Report CRUD (localStorage-backed) |
| `TemplateConfigService` | Template CRUD |
| `SchemaService` | Schema CRUD, property definitions, JSON generation |
| `AiChatService` | AI-assisted editing, document analysis |
| `SettingsService` | Persistent state storage |
