---
description: How to create a new installable App Nexus application
---

# Creating a New Nexus App

This workflow defines the standard patterns and requirements for creating new applications that integrate with the App Nexus (App Store) system.

## 1. Folder Structure

**All Nexus apps MUST be created in:**
```
src/app/features/app-store/apps/{app-name}/
```

### Required Files

```
apps/{app-name}/
├── index.ts                    # Public exports barrel file
├── {app-name}.component.ts     # Main component (standalone)
├── {app-name}.component.html   # Template
├── {app-name}.component.less   # Styles
├── api/                        # API services (if needed)
│   ├── index.ts               # API exports
│   ├── {app-name}-api.service.ts
│   └── {app-name}.models.ts
└── components/                 # Sub-components (if needed)
```

## 2. Component Requirements

### Main Component Pattern

```typescript
@Component({
    selector: 'app-{app-name}',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        // PrimeNG modules as needed
    ],
    templateUrl: './{app-name}.component.html',
    styleUrls: ['./{app-name}.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class {AppName}Component {
    // Use signals for state management
    data = signal<DataType[]>([]);
    isLoading = signal(false);
    
    // Inject services
    private readonly apiService = inject({AppName}ApiService);
}
```

### Rules:
- ✅ Use `standalone: true`
- ✅ Use `ChangeDetectionStrategy.OnPush`
- ✅ Use Angular Signals for state
- ✅ Use `inject()` function for DI
- ❌ Do NOT use `providers` array in component

## 3. API Service Pattern

If the app needs API calls, create a dedicated service:

```typescript
// api/{app-name}-api.service.ts
@Injectable({ providedIn: 'root' })
export class {AppName}ApiService {
    private readonly http = inject(HttpClient);
    
    // Standard CRUD methods
    getItems(): Observable<Item[]> { ... }
    createItem(item: Item): Observable<Item> { ... }
    updateItem(id: string, item: Item): Observable<Item> { ... }
    deleteItem(id: string): Observable<void> { ... }
}
```

## 4. Register App in AppNexusService

### Step 4.1: Add to getDemoApps()

Edit `app-nexus.service.ts` and add your app definition to the `getDemoApps()` method:

```typescript
{
    id: '{app-id}',                           // Unique kebab-case ID
    name: '{App Display Name}',
    description: 'Description of what the app does.',
    iconUrl: 'pi pi-{icon-name}',             // PrimeNG icon class
    type: 'static',                           // 'static' for coded apps
    category: 'utilities',                    // Category ID
    author: 'APPRX Team',
    tags: ['tag1', 'tag2'],
    currentVersion: { version: '1.0.0', releaseDate: new Date() },
    pricing: { type: 'free', amount: 0, currency: 'EUR' },
    parameters: [],
    settings: [],
    usesApiConnection: false,
    processDefinitions: [],
    installStatus: AppInstallStatus.Available,
    startScreen: '/{app-route}',              // Route path
    isFeatured: false,
    hasManageScreen: false,
    menuPlacement: MenuPlacement.InstalledApps,
    menuItems: []                             // Optional sidebar items
}
```

### Step 4.2: Add Route in app.routes.ts

```typescript
{
    path: '{app-route}',
    loadComponent: () => import('./features/app-store/apps/{app-name}/{app-name}.component')
        .then(m => m.{AppName}Component)
}
```

## 5. Menu Placement Options

Use the `MenuPlacement` enum:

| Value | Behavior |
|-------|----------|
| `MenuPlacement.InstalledApps` | Shows under "Installed Apps" group |
| `MenuPlacement.TopLevel` | Shows as top-level menu item |
| `MenuPlacement.None` | No menu item (use custom `menuItems`) |

### Custom Menu Items

For apps with multiple pages, define custom `menuItems`:

```typescript
menuItems: [
    { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/app-dashboard' },
    { label: 'Settings', icon: 'pi pi-cog', routerLink: '/app-settings' }
]
```

## 6. Public API Exports

Create `index.ts` barrel file:

```typescript
/**
 * {App Name} - Public Exports
 */
export * from './api';
export * from './{app-name}.component';
```

## 7. Testing Requirements

Create `{app-name}.component.spec.ts` with:
- Component creation test
- Basic UI interaction tests
- Service mock tests

## 8. Categories Reference

Available categories defined in `getDefaultCategories()`:

| ID | Name |
|----|------|
| `utilities` | Utilities |
| `data` | Data & Analytics |
| `automation` | Automation |
| `finance` | Finance |
| `reports` | Reports & Docs |
| `integration` | Integration |

## 9. Checklist

Before completing a new app:

- [ ] Created folder in `apps/{app-name}/`
- [ ] Main component is `standalone: true`
- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Uses Angular Signals for state
- [ ] API service uses `providedIn: 'root'`
- [ ] App definition added to `getDemoApps()`
- [ ] Route added to `app.routes.ts`
- [ ] Public exports in `index.ts`
- [ ] Styles use `.less` extension
- [ ] Component compiles without errors

## 10. Example: Minimal App

```typescript
// apps/hello-world/hello-world.component.ts
@Component({
    selector: 'app-hello-world',
    standalone: true,
    imports: [CommonModule, CardModule],
    template: `
        <p-card header="Hello World">
            <p>Welcome to {{ appName() }}</p>
        </p-card>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelloWorldComponent {
    appName = signal('My App');
}
```

// turbo-all
