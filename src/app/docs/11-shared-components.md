# Shared Components & Utilities

Reusable components, helpers, and directives in `shared/`.

## Components (`shared/components/`)

### `OnboardingDialogComponent` (`onboarding-dialog.component.ts`)

API key setup dialog shown on first use of AI features. Handles OpenAI key input, validation, and persistence. Used by Search Action, Tax Management, and Document Management.

### `AgentMentionEditorComponent` (`agent-mention-input/`)

Rich text input with `@agent` mention support. Outputs `MentionMessage` with agent reference and text content. Used by Search Action for directing messages to specific AI agents.

```
agent-mention-input/
├── agent-mention-input.component.ts
├── agent-mention-input.component.html
└── agent-mention-input.component.less
```

### `DebugLogPanelComponent` (`debug-log-panel.component.ts`)

Expandable debug log panel fed by `DebugLogService`. Displays categorized log entries with timestamps. Useful for development and troubleshooting.

### `HomeRedirectComponent` (`home-redirect.component.ts`)

Redirects from `/` to the appropriate home page based on user role/preferences.

### `JsonDataViewerComponent` (`json-data-viewer/`)

Renders JSON data in multiple view modes (card grid, table, raw JSON). Used by VDB Manager and Document Management.

### `JsonTreeViewComponent` (`json-tree-view/`)

Hierarchical tree display for JSON data. Collapsible nodes with type indicators.

### `AiChatComponent` (`ai-chat/`)

Reusable chat interface component for AI conversations. Used in Report Wizard and other features needing inline AI chat.

## Helpers (`shared/helpers/`)

### `XmlHttpRequestHelper`

Low-level XHR utility for pre-Angular HTTP calls. Used by `AppPreBootstrap` to load config before Angular bootstraps.

### `SubdomainTenancyNameFinder`

Extracts tenant name from URL subdomain using `{TENANCY_NAME}` placeholder pattern in `appBaseUrlFormat`.

## Constants (`shared/AppConsts.ts`)

Static configuration class populated by `AppPreBootstrap`:

| Property | Purpose |
|----------|---------|
| `remoteServiceBaseUrl` | Resolved API base URL |
| `appBaseUrl` | Resolved frontend base URL |
| `remoteServiceBaseUrlFormat` | URL template with `{TENANCY_NAME}` |
| `tenancyName` | Current tenant name |
| `localeMappings` | Locale mapping config |
| `setTenancy(name)` | Resolve URLs from template |
| `setDirectUrl(url, tenant)` | Override with explicit URL |

## Centralized Store (`core/store/`)

### `AppStoreService` (`app-store.service.ts`)

Central state management using Angular Signals:

| Signal/Method | Purpose |
|---------------|---------|
| `appName`, `appId`, `environment` | App identity (computed from config) |
| `isDarkMode` / `setDarkMode()` | Dark mode state |
| `isSidebarExpanded` / `toggleSidebar()` | Sidebar state |
| `currentUser` / `setCurrentUser()` | Authenticated user |
| `setModuleData(key, data)` | Per-module persistent storage |
| `restoreSession()` / `clearSession()` | Session persistence to `localStorage` |

### `ThemeService` (`theme.service.ts`)

Theme management — applies CSS custom properties from `ThemeConfig`, handles dark/light mode switching.

### `AppConfig` model (`app-config.model.ts`)

Configuration interface: `appId`, `appName`, `api` (ApiConfig), `features` (FeatureFlags), `theme` (ThemeConfig), `auth` (AuthConfig), `environment`.
