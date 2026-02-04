/**
 * App Manifest Model
 * 
 * Defines the structure of an installable app/module.
 * Used by DynamicModuleRegistry to load and register apps.
 */

/**
 * Type of app loading
 * - internal: Built into the main bundle, loaded via dynamic import
 * - remote: Loaded from external URL (Module Federation)
 */
export type AppManifestType = 'internal' | 'remote';

/**
 * App Manifest - defines an installable module
 */
export interface AppManifest {
    // ==================== Identity ====================

    /** Unique app identifier */
    id: string;

    /** Display name */
    name: string;

    /** Semantic version */
    version: string;

    /** App description */
    description?: string;

    /** Icon class (PrimeNG) */
    icon?: string;

    // ==================== Loading ====================

    /** How to load this app */
    type: AppManifestType;

    /** 
     * For internal apps: relative path to component
     * Example: './features/document-management/document-management.component'
     */
    componentPath?: string;

    /** 
     * For remote apps: URL to the JavaScript bundle
     * Example: 'https://cdn.example.com/apps/my-app/bundle.js'
     */
    bundleUrl?: string;

    /** Name of the exported component class */
    componentName: string;

    /** Dynamic import function for internal apps */
    loader?: () => Promise<any>;

    // ==================== Routing ====================

    /** Route path (will be prefixed with /app/) */
    route: string;

    /** Route title for browser tab */
    title?: string;

    // ==================== Permissions ====================

    /** Required permissions to access this app */
    requiredPermissions?: string[];

    /** Required roles */
    requiredRoles?: string[];

    // ==================== Dependencies ====================

    /** Other app IDs this depends on */
    dependencies?: string[];

    /** Minimum host app version required */
    minHostVersion?: string;
}

/**
 * Registered app state
 */
export interface RegisteredApp {
    manifest: AppManifest;
    status: 'registered' | 'loading' | 'loaded' | 'error';
    loadedComponent?: any;
    error?: string;
    registeredAt: Date;
}

/**
 * Module load result
 */
export interface ModuleLoadResult {
    success: boolean;
    component?: any;
    error?: string;
}
