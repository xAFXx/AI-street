# AI Street

Unified hub for AI-powered data management and analytics. Container component with 4 tabbed modules.

## Files

```
features/app-store/apps/ai-street/
├── ai-street.component.ts       # Tab container (4 tabs)
├── ai-street.component.html
├── ai-street.component.less
├── dashboard/                   # Dashboard tab
│   ├── dashboard.ts
│   ├── dashboard.html
│   ├── dashboard.less
│   └── dashboard.spec.ts
├── input-manager/               # Data Management tab
│   ├── input-manager.ts
│   ├── input-manager.html
│   ├── input-manager.less
│   └── input-manager.spec.ts
├── model-arena/                 # Model Arena tab
│   ├── model-arena.ts
│   ├── model-arena.html
│   ├── model-arena.less
│   └── model-arena.spec.ts
└── process-manager/             # Test Evaluation Center tab
    ├── process-manager.ts
    ├── process-manager.html
    ├── process-manager.less
    └── process-manager.spec.ts
```

## Tabs

| Tab | Component | Purpose |
|-----|-----------|---------|
| Data Management | `InputManager` | Configure and manage input datasets |
| Model Arena | `ModelArena` | Compare and evaluate AI models with compatibility checks |
| Test Evaluation Center | `ProcessManager` | Monitor and manage AI processes |
| Dashboard | `Dashboard` | Analytics and performance metrics |

## Routes

- `/ai-street` — full tabbed view
- `/dashboard` — dashboard standalone (also used as home for admins)
- `/input` — input manager standalone (admin only)
- `/arena` — model arena standalone (admin only)
- `/processes` — process manager standalone (admin only)

## Core Services Used

| Service | Purpose |
|---------|---------|
| `AiModelService` | AI model CRUD, listing, compatibility info |
| `DatasetService` | Dataset CRUD, data type management |
| `AnalysisService` | Analysis execution and results |

## Key Patterns

- `AiStreetComponent` uses `signal(0)` for active tab tracking
- Each sub-component is standalone and independently routable
- Model Arena enforces model-dataset compatibility based on data types
