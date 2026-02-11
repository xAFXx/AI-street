# APPRX 2.0 — Architecture Overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone components, signals) |
| UI Library | PrimeNG v21 |
| Styling | Less (global `styles.less` + component `.less`) |
| State | Angular Signals + `AppStoreService` (centralized) |
| Backend | ASP.NET ABP Framework (multi-tenant) |
| API Types | Auto-generated from Swagger via `codegen/` |
| Real-time | SignalR (`@microsoft/signalr`) |
| AI | OpenAI API (GPT-4 Vision, streaming) |

## Project Structure

```
src/app/
├── config/                    # App configurations (apprx, plattform)
│   ├── apprx.config.ts        # APPRX True North config (AppConfig)
│   └── plattform.config.ts    # Plattform config variant
├── core/                      # Singleton services & infrastructure
│   ├── api-client/            # API_BASE_URL token, base HTTP client
│   ├── dynamic-modules/       # Dynamic module loading (AppManifest, registry)
│   ├── guards/                # Route guards (authGuard, adminGuard, loginGuard)
│   ├── interceptors/          # HTTP interceptors (authInterceptor)
│   ├── models/                # Core DTOs (ai-chat, ai-model, dataset, etc.)
│   ├── services/              # All core services (~24 files)
│   ├── store/                 # AppStoreService, AppConfig model, ThemeService
│   └── utils/                 # Utilities (pdf-worker)
├── features/
│   ├── admin/                 # Admin features
│   ├── ai-management/         # AI agent CRUD (standalone feature)
│   ├── app-loader/            # Dynamic app loader
│   ├── app-store/             # App Nexus + all installable apps
│   │   ├── api/               # App store API layer
│   │   ├── apps/              # Individual apps (7 sub-dirs)
│   │   ├── app-nexus.*        # Marketplace component + service
│   │   └── app.model.ts       # App definitions, enums
│   └── auth/                  # Login component
├── layout/                    # App shell
│   ├── main-layout/           # Root layout wrapper
│   ├── sidebar/               # Navigation sidebar (role-based + app-injected)
│   └── topbar/                # Top bar
├── shared/                    # Reusable across features
│   ├── AppConsts.ts           # Static config (URLs, tenancy)
│   ├── components/            # Shared components (7 items)
│   ├── directives/            # Shared directives
│   ├── helpers/               # XmlHttpRequestHelper, SubdomainTenancyNameFinder
│   └── services/              # Shared services
├── app.config.ts              # Angular providers (PrimeNG, HTTP, router)
├── app.routes.ts              # All routes (lazy-loaded)
└── AppPreBootstrap.ts         # Pre-Angular config loader
```

## Bootstrap Flow

1. `main.ts` → `AppPreBootstrap.run()` — loads `appconfig.json`, resolves tenant, sets `AppConsts`
2. `AppPreBootstrap.getUserConfiguration()` — loads ABP session (`/AbpUserConfiguration/GetAll`)
3. `bootstrapApplication(App, appConfig)` — Angular starts with providers from `app.config.ts`
4. `provideAppStore(apprxConfig)` — initializes `AppStoreService` with feature flags and theme

## Multi-Tenancy

- Tenant resolved from subdomain via `SubdomainTenancyNameFinder`
- `AppConsts.remoteServiceBaseUrlFormat` contains `{TENANCY_NAME}` placeholder
- `AppConsts.setTenancy(name)` resolves the final API URL
- Tenant stored in `localStorage` key `tenancy_name`
- Custom API URL override via `localStorage` key `custom_api_url`

## Authentication

- Provider: ABP Token Auth (`TokenAuthServiceProxy`)
- `AuthService` manages login/logout/refresh, stores tokens in `StorageService`
- `authInterceptor` attaches `Bearer` token to all API requests
- Guards: `authGuard` (requires login), `adminGuard` (requires admin role), `loginGuard` (redirect if already logged in)
- Session state via `AuthState` (BehaviorSubject): `isAuthenticated`, `user`, `roles`, `accessToken`

## State Management

- **`AppStoreService`**: centralized store using Angular Signals — dark mode, sidebar, active module, module-scoped data, session persistence to `localStorage`
- **`AppNexusService`**: app install state (signals + `localStorage` key `app_nexus_installed`)
- **`SettingsService`**: per-feature settings persistence
- All components use `inject()` — no constructor DI

## Codegen Pipeline

```bash
npm run codegen          # Generate types from dev backend Swagger
npm run codegen:audit    # Check for type drift
```

- Config: `codegen/codegen.config.mjs` maps controller tags → output paths
- Output: `generated-types.ts` files in each feature's `api/` folder
- See `codegen/README.md` for full docs

## Route Map

| Route | Component | Guard |
|-------|-----------|-------|
| `/login` | `LoginComponent` | `loginGuard` |
| `/dashboard` | `Dashboard` | `authGuard` |
| `/input` | `InputManager` | `adminGuard` |
| `/arena` | `ModelArena` | `adminGuard` |
| `/processes` | `ProcessManager` | `adminGuard` |
| `/reports` | `ReportsPageComponent` | `authGuard` |
| `/reports/:id` | `ReportDetailsComponent` | `authGuard` |
| `/results` | `ResultsComponent` | `authGuard` |
| `/audit-standards` | `BlockTemplatesPageComponent` | `authGuard` |
| `/report-frameworks` | `ReportFrameworksComponent` | `authGuard` |
| `/template-editor/new` | `TemplateEditorComponent` | `adminGuard` |
| `/template-editor/:id` | `TemplateEditorComponent` | `adminGuard` |
| `/report-wizard` | `ReportWizardComponent` | `authGuard` |
| `/search` | `SearchActionComponent` | `authGuard` |
| `/document-management` | `DocumentManagementComponent` | `authGuard` |
| `/schema-editor` | `SchemaEditorComponent` | `authGuard` |
| `/app-nexus` | `AppNexusComponent` | `authGuard` |
| `/tax-management` | `TaxManagementComponent` | `authGuard` |
| `/region-lookup` | `RegionLookupComponent` | `authGuard` |
| `/ai-street` | `AiStreetComponent` | `authGuard` |
| `/ai-management` | `AIManagementComponent` | `authGuard` |

## Development Conventions

- **Standalone components only** — no `NgModule`
- **Lazy loading** via `loadComponent` in routes
- **PrimeNG icons** (`pi pi-*`) for all icons
- **Signals** for reactive state in components
- **Named enums** for string literal unions (see Rule Book)
- **Single source of truth** per domain (see Rule Book)
- **Less** for styles, not CSS or SCSS
- Dev server: `npm run dev-apprx`
- Proxy: `proxy.conf.json` forwards `/api` to backend
