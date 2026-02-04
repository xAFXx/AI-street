import { Injectable, signal, computed, inject, Type } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AppManifest, RegisteredApp, ModuleLoadResult } from './app-manifest.model';

/**
 * Dynamic Module Registry Service
 * 
 * Central registry for dynamic app loading. Manages:
 * - App registration and unregistration
 * - Dynamic route injection
 * - Lazy component loading
 * - Module lifecycle
 */
@Injectable({ providedIn: 'root' })
export class DynamicModuleRegistryService {
    private router = inject(Router);

    // ==================== State ====================

    /** Map of registered apps by ID */
    private readonly _registeredApps = signal<Map<string, RegisteredApp>>(new Map());

    /** Public readonly access */
    readonly registeredApps = computed(() => this._registeredApps());

    /** List of registered app IDs */
    readonly registeredAppIds = computed(() => Array.from(this._registeredApps().keys()));

    /** Count of registered apps */
    readonly registeredCount = computed(() => this._registeredApps().size);

    // ==================== Registration ====================

    /**
     * Register an app and add its route dynamically
     */
    async registerApp(manifest: AppManifest): Promise<void> {
        // Check if already registered
        if (this._registeredApps().has(manifest.id)) {
            console.warn(`[DynamicModuleRegistry] App "${manifest.id}" already registered`);
            return;
        }

        // Validate manifest
        this.validateManifest(manifest);

        // Create registered app entry
        const registeredApp: RegisteredApp = {
            manifest,
            status: 'registered',
            registeredAt: new Date()
        };

        // Add to registry
        this._registeredApps.update(apps => {
            const newMap = new Map(apps);
            newMap.set(manifest.id, registeredApp);
            return newMap;
        });

        // Inject route dynamically
        this.injectRoute(manifest);

        console.log(`[DynamicModuleRegistry] Registered app: ${manifest.id} at /app/${manifest.route}`);
    }

    /**
     * Unregister an app and remove its route
     */
    unregisterApp(appId: string): void {
        const app = this._registeredApps().get(appId);
        if (!app) {
            console.warn(`[DynamicModuleRegistry] App "${appId}" not found`);
            return;
        }

        // Remove from registry
        this._registeredApps.update(apps => {
            const newMap = new Map(apps);
            newMap.delete(appId);
            return newMap;
        });

        // Note: Removing routes dynamically is complex in Angular
        // For now, the route still exists but getRegisteredApp will return null
        // The AppLoaderComponent will show "App not found"

        console.log(`[DynamicModuleRegistry] Unregistered app: ${appId}`);
    }

    /**
     * Check if an app is registered
     */
    isRegistered(appId: string): boolean {
        return this._registeredApps().has(appId);
    }

    /**
     * Get a registered app by ID
     */
    getRegisteredApp(appId: string): RegisteredApp | undefined {
        return this._registeredApps().get(appId);
    }

    // ==================== Module Loading ====================

    /**
     * Load a module component by app ID
     * Returns the component class ready for instantiation
     */
    async loadModule(appId: string): Promise<ModuleLoadResult> {
        const registeredApp = this._registeredApps().get(appId);

        if (!registeredApp) {
            return { success: false, error: `App "${appId}" not registered` };
        }

        // If already loaded, return cached component
        if (registeredApp.status === 'loaded' && registeredApp.loadedComponent) {
            return { success: true, component: registeredApp.loadedComponent };
        }

        // Update status to loading
        this.updateAppStatus(appId, 'loading');

        try {
            const manifest = registeredApp.manifest;
            let component: Type<any>;

            if (manifest.type === 'internal' && manifest.loader) {
                // Use provided loader function
                const module = await manifest.loader();
                component = module[manifest.componentName];
            } else if (manifest.type === 'remote' && manifest.bundleUrl) {
                // Load from remote URL (Module Federation)
                component = await this.loadRemoteModule(manifest);
            } else {
                throw new Error(`Invalid manifest configuration for app "${appId}"`);
            }

            if (!component) {
                throw new Error(`Component "${manifest.componentName}" not found in module`);
            }

            // Cache the loaded component
            this.updateAppStatus(appId, 'loaded', component);

            return { success: true, component };

        } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error loading module';
            this.updateAppStatus(appId, 'error', undefined, errorMessage);
            console.error(`[DynamicModuleRegistry] Failed to load "${appId}":`, error);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Load a remote module via dynamic script injection
     * (For future Module Federation support)
     */
    private async loadRemoteModule(manifest: AppManifest): Promise<Type<any>> {
        // This is a placeholder for Module Federation
        // In a real implementation, you would:
        // 1. Load the remote entry script
        // 2. Get the container from window scope
        // 3. Initialize sharing and get the module

        throw new Error('Remote module loading not yet implemented. Use internal apps for now.');
    }

    // ==================== Route Management ====================

    /**
     * Inject a route for the app into the router config
     */
    private injectRoute(manifest: AppManifest): void {
        const config = this.router.config;

        // Find the main layout route (parent for app routes)
        const mainLayoutRoute = config.find(r => r.path === '' && r.children);

        if (mainLayoutRoute && mainLayoutRoute.children) {
            // Check if route already exists
            const existingRoute = mainLayoutRoute.children.find(
                r => r.path === `app/${manifest.route}`
            );

            if (!existingRoute) {
                // Add new route
                mainLayoutRoute.children.push({
                    path: `app/${manifest.route}`,
                    loadComponent: () => import('../../features/app-loader/app-loader.component')
                        .then(m => m.AppLoaderComponent),
                    data: { appId: manifest.id, title: manifest.title || manifest.name }
                });

                // Reset router to pick up new routes
                this.router.resetConfig(config);
            }
        }
    }

    /**
     * Get the route path for an app
     */
    getAppRoute(appId: string): string | null {
        const app = this._registeredApps().get(appId);
        return app ? `/app/${app.manifest.route}` : null;
    }

    // ==================== Helpers ====================

    private validateManifest(manifest: AppManifest): void {
        if (!manifest.id) throw new Error('Manifest must have an id');
        if (!manifest.name) throw new Error('Manifest must have a name');
        if (!manifest.route) throw new Error('Manifest must have a route');
        if (!manifest.componentName) throw new Error('Manifest must have a componentName');

        if (manifest.type === 'internal' && !manifest.loader) {
            throw new Error('Internal apps must have a loader function');
        }

        if (manifest.type === 'remote' && !manifest.bundleUrl) {
            throw new Error('Remote apps must have a bundleUrl');
        }
    }

    private updateAppStatus(
        appId: string,
        status: RegisteredApp['status'],
        loadedComponent?: any,
        error?: string
    ): void {
        this._registeredApps.update(apps => {
            const app = apps.get(appId);
            if (!app) return apps;

            const newMap = new Map(apps);
            newMap.set(appId, {
                ...app,
                status,
                loadedComponent,
                error
            });
            return newMap;
        });
    }
}
