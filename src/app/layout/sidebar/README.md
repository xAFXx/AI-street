# Sidebar Component

## Overview

The Sidebar component provides the main navigation menu for the APPRX True North application. It dynamically builds menu items based on user role and installed apps.

## Location

`src/app/layout/sidebar/`

## Key Features

### Role-Based Menu Filtering
- `admin`: Sees all management and analytics items
- `enduser`: Sees simplified tools menu

### Dynamic App Menu Injection
When apps are installed via App Nexus, their `menuItems` are automatically injected:
```typescript
// Apps with menuItems defined get their own menu group
const appMenuGroups = installedApps
    .filter(app => app.menuItems?.length > 0)
    .map(app => ({
        label: app.name,
        items: app.menuItems
    }));
```

### Menu Structure
1. **Base Items**: Core menu items (App Nexus, Data Management, etc.)
2. **App Menu Groups**: Injected from installed apps with `menuItems`
3. **Installed Apps Group**: Apps without custom `menuItems`
4. **Top-Level Items**: Apps with `MenuPlacement.TopLevel`

## State Management

- Subscribes to `AuthService` for authentication state
- Uses `effect()` to rebuild menu when `installedApps()` signal changes
- Persists nothing locally (reads from AppNexusService)

## Testing

### Manual Testing
1. Login as admin → Verify full menu appears
2. Install True North app → Verify "True North" menu group appears
3. Uninstall True North app → Verify menu group disappears
4. Switch user role → Verify menu changes

### Test Scenarios

| Scenario | Expected Result |
|----------|-----------------|
| No apps installed | Only base menu items visible |
| True North installed | "True North" group with 4 items appears |
| VDB Manager installed | Appears under "Installed Apps" |
| App uninstalled | Menu items disappear immediately |

## Development Rules

1. **Never hardcode app-specific items** in `allMenuItems` - use App Nexus `menuItems` instead
2. **Use `effect()`** to react to signal changes
3. **Filter by role** before adding to menu
4. **Use RouterModule** for navigation links
5. **Keep menu labels short** (max 20 characters)

## Component Inputs/Outputs

None - this is a root layout component.

## Dependencies

- `AppNexusService`: For installed apps
- `AuthService`: For authentication state
- `UserManagementService`: For local user state (legacy)
- PrimeNG Menu, Button, Avatar, Tag modules

## File Structure

```
sidebar/
├── sidebar.component.ts    # Component logic
├── sidebar.component.html  # Template
├── sidebar.component.less  # Styles
└── README.md               # This file
```
