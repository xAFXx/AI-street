# App Store / App Nexus Module

## Overview

The App Nexus (App Store) module enables a marketplace-style architecture where features can be installed/uninstalled dynamically. This allows tenants to subscribe to specific functionality and only see relevant menu items and features.

## Components

| Component | Purpose |
|-----------|---------|
| `app-nexus.service.ts` | Central service for app management (install, uninstall, configure) |
| `app.model.ts` | TypeScript interfaces and enums for app definitions |
| `app-nexus.component.ts` | UI component for browsing and managing apps |

## Key Features

### App Types
- **Static Apps**: Hardcoded functionality (e.g., VDB Manager, Document Analyzer)
- **Dynamic Apps**: API-driven on-the-fly functionality

### Menu Injection
Apps can define `menuItems` that are automatically injected into the sidebar when installed:
```typescript
menuItems: [
    { label: 'Results', icon: 'pi pi-file-check', routerLink: '/results' }
]
```

### Menu Placement Options
- `InstalledApps`: Shows under "Installed Apps" group
- `TopLevel`: Shows as top-level menu item
- `None`: No menu entry (used when `menuItems` are defined)

## State Management

- Uses Angular Signals for reactive state
- Installed apps persisted to `localStorage` key: `app_nexus_installed`
- Sidebar rebuilds menu when `installedApps()` signal changes

## Testing

### Manual Testing
1. Navigate to `/app-nexus`
2. Install an app → Verify menu items appear
3. Uninstall an app → Verify menu items disappear
4. Refresh page → Verify installed state persists

### Automated Testing
See `tests/app-nexus/` folder for browser automation tests.

### Test Commands
```bash
# Run unit tests
npm test -- --include="**/app-store/**"

# Run browser tests (if configured)
npx playwright test tests/app-nexus/
```

## Development Rules

1. **Always define `menuItems`** for apps that should inject sidebar items
2. **Use `MenuPlacement.None`** when using custom `menuItems`
3. **Add `hasManageScreen: false`** for apps without configuration UI
4. **Persist state to localStorage** for user preferences
5. **Use PrimeNG icons** (e.g., `pi pi-database`) for consistency

## Dependencies

- PrimeNG components (Card, Button, Tag, Dialog)
- Angular Signals
- LocalStorage API

## File Structure

```
app-store/
├── app.model.ts           # Interfaces and enums
├── app-nexus.service.ts   # Core service
├── app-nexus.component.ts # Main UI component
├── app-nexus.component.html
├── app-nexus.component.less
└── README.md              # This file
```
