---
description: Rules and standards for code implementation in this project
---

# Project Rule Book

This rule book contains implementation standards and best practices that should be followed throughout the codebase. When implementing new features, **consult this rule book first**.

---

## Rule 1: Use Named Enums Instead of String Literals

**Priority:** High  
**Category:** Type Safety

### Rule Statement

When defining a property that accepts a fixed set of string values, **always use a named enum** instead of inline string literal union types.

### ❌ Bad Practice

```typescript
// Inline string literals - avoid this
interface App {
    menuPlacement?: 'installed-apps' | 'top-level' | 'none';
}

// Usage requires magic strings
if (app.menuPlacement === 'top-level') { ... }
```

### ✅ Good Practice

```typescript
// Named enum with documentation
export enum MenuPlacement {
    /** Show under "Installed Apps" parent menu (default) */
    InstalledApps = 'installed-apps',
    
    /** Show as a top-level menu item */
    TopLevel = 'top-level',
    
    /** Don't show in navigation menu */
    None = 'none'
}

interface App {
    menuPlacement?: MenuPlacement;
}

// Usage is self-documenting
if (app.menuPlacement === MenuPlacement.TopLevel) { ... }
```

### Rationale

1. **Discoverability** - IDE autocomplete shows all valid options
2. **Refactoring** - Renaming values updates all usages automatically
3. **Documentation** - Enum members can have JSDoc comments
4. **Type Safety** - Compiler prevents typos and invalid values
5. **Consistency** - Single source of truth for allowed values

### Applies To

- Component props with fixed options
- API response status codes
- Configuration options
- State machine states
- Any property with 3+ possible string values

---

## Rule 2: Single Source of Truth for State Management

**Priority:** High  
**Category:** Architecture

### Rule Statement

When managing cross-cutting state (like installed apps, user preferences, or shared data), **always use a single service as the source of truth**. All components must read from and write to this service.

### ❌ Bad Practice

```typescript
// Component accessing localStorage directly
const installed = localStorage.getItem('app_nexus_installed');

// Component using a different service for same data
const route = this.moduleRegistry.getAppRoute(appId);
```

### ✅ Good Practice

```typescript
// All app data flows through AppNexusService
class AppLoaderComponent {
    private appNexusService = inject(AppNexusService);
    
    loadApp() {
        // Verify installation via service
        const app = this.appNexusService.getAppById(appId);
        if (app?.installStatus !== 'installed') { ... }
        
        // Get route via service
        const route = this.appNexusService.getAppRoute(appId);
    }
}
```

### Single Source of Truth Services

| Domain | Service |
|--------|---------|
| App Installation | `AppNexusService` |
| Module Loading | `DynamicModuleRegistryService` (internal use only) |
| User Auth | `AuthService` |

---

*Add new rules below as they are identified.*

