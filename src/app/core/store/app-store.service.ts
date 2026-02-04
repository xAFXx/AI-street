import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AppConfig, AppUser, SessionState } from './app-config.model';
import { APP_CONFIG, SESSION_STORAGE_KEY, PREFERENCES_STORAGE_KEY } from './app-store.tokens';

/**
 * AppStoreService - Central State Management
 * 
 * This service provides centralized, reactive state management for the application.
 * It uses Angular Signals for reactive state and automatically persists session data.
 * 
 * @example
 * ```typescript
 * // Inject in any component/service
 * private store = inject(AppStoreService);
 * 
 * // Access reactive state
 * appName = this.store.appName;
 * isDarkMode = this.store.isDarkMode;
 * 
 * // Modify state
 * this.store.setDarkMode(true);
 * this.store.setModuleData('myModule', { key: 'value' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AppStoreService {
    // ==================== Configuration State ====================

    /** Application configuration (readonly after initialization) */
    private readonly _config = signal<AppConfig | null>(null);

    /** Public readonly access to config */
    readonly config = this._config.asReadonly();

    /** Whether the store has been initialized */
    readonly isInitialized = computed(() => this._config() !== null);

    // ==================== Derived Config Properties ====================

    /** Application ID */
    readonly appId = computed(() => this._config()?.appId ?? 'apprx');

    /** Application name */
    readonly appName = computed(() => this._config()?.appName ?? 'Application');

    /** Application version */
    readonly appVersion = computed(() => this._config()?.appVersion ?? '0.0.0');

    /** Feature flags */
    readonly features = computed(() => this._config()?.features ?? {
        documentManagement: false,
        aiAnalysis: false,
        multiTenant: false,
        darkMode: false
    });

    /** Theme configuration */
    readonly theme = computed(() => this._config()?.theme ?? null);

    /** API base URL (with tenant placeholder resolved) */
    readonly apiBaseUrl = computed(() => {
        const config = this._config();
        if (!config) return '';

        let url = config.api.baseUrl;
        if (config.tenantId) {
            url = url.replace('{TENANCY_NAME}', config.tenantId);
        }
        return url;
    });

    // ==================== User State ====================

    /** Current authenticated user */
    private readonly _currentUser = signal<AppUser | null>(null);
    readonly currentUser = this._currentUser.asReadonly();

    /** Whether user is authenticated */
    readonly isAuthenticated = computed(() => this._currentUser() !== null);

    // ==================== UI State ====================

    /** Dark mode enabled */
    private readonly _isDarkMode = signal(false);
    readonly isDarkMode = this._isDarkMode.asReadonly();

    /** Sidebar expanded state */
    private readonly _sidebarExpanded = signal(true);
    readonly sidebarExpanded = this._sidebarExpanded.asReadonly();

    /** Currently active module/route */
    private readonly _activeModule = signal<string>('');
    readonly activeModule = this._activeModule.asReadonly();

    // ==================== Session State ====================

    /** Custom module data storage */
    private readonly _moduleData = signal<Record<string, any>>({});
    readonly moduleData = this._moduleData.asReadonly();

    constructor() {
        // Auto-persist preferences when they change
        effect(() => {
            const preferences = {
                darkMode: this._isDarkMode(),
                sidebarExpanded: this._sidebarExpanded(),
                locale: 'en'
            };
            this.saveToStorage(PREFERENCES_STORAGE_KEY, preferences);
        });

        // Auto-persist module data when it changes
        effect(() => {
            const data = this._moduleData();
            if (Object.keys(data).length > 0) {
                this.saveToStorage(SESSION_STORAGE_KEY, data);
            }
        });
    }

    // ==================== Initialization ====================

    /**
     * Initialize the store with application configuration
     * This should be called once during app bootstrap
     */
    initialize(config: AppConfig): void {
        if (this._config()) {
            console.warn('[AppStore] Already initialized, skipping');
            return;
        }

        this._config.set(config);
        this.restoreSession();

        console.log(`[AppStore] Initialized for ${config.appId}`);
        console.log(`[AppStore] Features:`, config.features);
    }

    /**
     * Update tenant ID (for multi-tenant apps)
     */
    setTenantId(tenantId: string): void {
        const current = this._config();
        if (current) {
            this._config.set({ ...current, tenantId });
            console.log(`[AppStore] Tenant set to: ${tenantId}`);
        }
    }

    // ==================== User Management ====================

    /**
     * Set the current authenticated user
     */
    setCurrentUser(user: AppUser | null): void {
        this._currentUser.set(user);
        if (user) {
            console.log(`[AppStore] User logged in: ${user.displayName}`);
        } else {
            console.log('[AppStore] User logged out');
        }
    }

    // ==================== UI State Management ====================

    /**
     * Toggle or set dark mode
     */
    setDarkMode(enabled: boolean): void {
        this._isDarkMode.set(enabled);
    }

    /**
     * Toggle dark mode
     */
    toggleDarkMode(): void {
        this._isDarkMode.update(v => !v);
    }

    /**
     * Toggle or set sidebar expanded state
     */
    setSidebarExpanded(expanded: boolean): void {
        this._sidebarExpanded.set(expanded);
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar(): void {
        this._sidebarExpanded.update(v => !v);
    }

    /**
     * Set active module/route name
     */
    setActiveModule(moduleName: string): void {
        this._activeModule.set(moduleName);
    }

    // ==================== Module Data Storage ====================

    /**
     * Store data for a specific module
     * This data persists across page reloads
     */
    setModuleData<T>(moduleKey: string, data: T): void {
        this._moduleData.update(current => ({
            ...current,
            [moduleKey]: data
        }));
    }

    /**
     * Get stored data for a module
     */
    getModuleData<T>(moduleKey: string): T | undefined {
        return this._moduleData()[moduleKey] as T;
    }

    /**
     * Clear data for a specific module
     */
    clearModuleData(moduleKey: string): void {
        this._moduleData.update(current => {
            const { [moduleKey]: removed, ...rest } = current;
            return rest;
        });
    }

    // ==================== Session Persistence ====================

    /**
     * Restore session from localStorage
     */
    restoreSession(): void {
        try {
            // Restore preferences
            const preferences = this.loadFromStorage<SessionState['preferences']>(PREFERENCES_STORAGE_KEY);
            if (preferences) {
                this._isDarkMode.set(preferences.darkMode ?? false);
                this._sidebarExpanded.set(preferences.sidebarExpanded ?? true);
            }

            // Restore module data
            const moduleData = this.loadFromStorage<Record<string, any>>(SESSION_STORAGE_KEY);
            if (moduleData) {
                this._moduleData.set(moduleData);
            }

            console.log('[AppStore] Session restored');
        } catch (error) {
            console.warn('[AppStore] Failed to restore session:', error);
        }
    }

    /**
     * Clear all session data
     */
    clearSession(): void {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(PREFERENCES_STORAGE_KEY);
        this._moduleData.set({});
        this._isDarkMode.set(false);
        this._sidebarExpanded.set(true);
        console.log('[AppStore] Session cleared');
    }

    // ==================== Storage Helpers ====================

    private saveToStorage<T>(key: string, data: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn(`[AppStore] Failed to save to storage:`, error);
        }
    }

    private loadFromStorage<T>(key: string): T | null {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn(`[AppStore] Failed to load from storage:`, error);
            return null;
        }
    }
}
