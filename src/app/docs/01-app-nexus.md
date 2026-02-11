# App Nexus (App Store)

Marketplace system for installing/uninstalling feature apps. Installed apps inject menu items into the sidebar dynamically.

## Files

```
features/app-store/
├── app-nexus.service.ts       # Central service (install, uninstall, config, signals)
├── app-nexus.component.ts     # Marketplace UI (browse, install, manage)
├── app-nexus.component.html
├── app-nexus.component.less
├── app.model.ts               # App interfaces and enums
├── api/                       # API layer (generated types, API service)
└── apps/                      # Individual installable apps (7 sub-dirs)
```

## Key Types (`app.model.ts`)

| Type | Purpose |
|------|---------|
| `AppDefinition` | Full app descriptor (id, name, icon, startScreen, menuItems, menuPlacement, etc.) |
| `MenuPlacement` enum | `InstalledApps` \| `TopLevel` \| `None` — controls sidebar placement |
| `AppType` enum | `Static` \| `Dynamic` — hardcoded vs API-driven |

## `AppNexusService`

- **State**: `installedApps()` signal — reactive list of installed apps
- **Persistence**: `localStorage` key `app_nexus_installed`
- **Methods**: `installApp()`, `uninstallApp()`, `getAppById()`, `getAppRoute()`, `isInstalled()`
- **Menu injection**: Apps define `menuItems[]` array; sidebar reads from `installedApps()` signal via `effect()`

## Menu Placement

| Placement | Behavior |
|-----------|----------|
| `InstalledApps` | Shows under "Installed Apps" group in sidebar |
| `TopLevel` | Shows as top-level sidebar item |
| `None` | No auto-entry; use when app defines custom `menuItems` |

## Sidebar Integration

`SidebarComponent` rebuilds menu when `installedApps()` signal changes:
1. Apps with `menuItems[]` → creates named menu group
2. Apps with `InstalledApps` placement → goes into "Installed Apps" group
3. Apps with `TopLevel` placement → top-level sidebar item

## Dynamic Module Registry

```
core/dynamic-modules/
├── app-manifest.model.ts              # AppManifest interface
├── dynamic-module-registry.service.ts # Dynamic loading service
└── internal-app-registry.ts           # Built-in app definitions
```

`DynamicModuleRegistryService` handles lazy loading of app modules. `internal-app-registry.ts` defines all built-in static apps.
