import { Injectable, signal, computed, inject } from '@angular/core';
import {
    App,
    AppCategory,
    InstalledAppConfig,
    AppInstallStatus,
    AppParameter,
    AppSetting,
    MenuPlacement
} from './app.model';
import { DynamicModuleRegistryService, getInternalAppManifest } from '../../core/dynamic-modules';

/**
 * App Nexus Service
 * 
 * Manages the App Store functionality including:
 * - Browsing available apps
 * - Installing/uninstalling apps
 * - Managing app configurations
 * - Tracking installed apps
 */
@Injectable({ providedIn: 'root' })
export class AppNexusService {
    // ==================== Dependencies ====================

    private readonly moduleRegistry = inject(DynamicModuleRegistryService);

    // ==================== State ====================

    /** All available apps in the store */
    private readonly _apps = signal<App[]>(this.getDemoApps());
    readonly apps = this._apps.asReadonly();

    /** Installed app configurations */
    private readonly _installedConfigs = signal<InstalledAppConfig[]>(this.loadInstalledApps());
    readonly installedConfigs = this._installedConfigs.asReadonly();

    /** App categories */
    private readonly _categories = signal<AppCategory[]>(this.getDefaultCategories());
    readonly categories = this._categories.asReadonly();

    /** Loading state */
    readonly isLoading = signal(false);

    /** Selected app for detail view */
    readonly selectedApp = signal<App | null>(null);

    constructor() {
        // Sync installed status from localStorage on initialization
        this.syncInstalledStatus();
    }

    /**
     * Sync installed status from localStorage configs to app objects
     * Called on initialization and after any installation changes
     */
    private syncInstalledStatus(): void {
        const configs = this._installedConfigs();
        if (configs.length === 0) return;

        const installedAppIds = new Set(configs.map(c => c.appId));

        this._apps.update(apps => apps.map(app => {
            if (installedAppIds.has(app.id)) {
                const config = configs.find(c => c.appId === app.id);
                return {
                    ...app,
                    installStatus: AppInstallStatus.Installed,
                    installedVersion: config?.installedVersion,
                    installedAt: config?.installedAt ? new Date(config.installedAt) : new Date()
                };
            }
            return app;
        }));

        // Also register internal apps with module registry (if not already registered)
        configs.forEach(config => {
            const manifest = getInternalAppManifest(config.appId);
            if (manifest && !this.moduleRegistry.isRegistered(config.appId)) {
                this.moduleRegistry.registerApp(manifest).catch(err =>
                    console.warn(`Failed to register app ${config.appId}:`, err)
                );
            }
        });
    }

    // ==================== Computed ====================

    /** Installed apps */
    readonly installedApps = computed(() =>
        this._apps().filter(app => app.installStatus === AppInstallStatus.Installed)
    );

    /** Available (not installed) apps */
    readonly availableApps = computed(() =>
        this._apps().filter(app => app.installStatus === AppInstallStatus.Available)
    );

    /** Featured apps */
    readonly featuredApps = computed(() =>
        this._apps().filter(app => app.isFeatured)
    );

    /** Static apps (manually programmed) */
    readonly staticApps = computed(() =>
        this._apps().filter(app => app.type === 'static')
    );

    /** Dynamic apps (API on-the-fly) */
    readonly dynamicApps = computed(() =>
        this._apps().filter(app => app.type === 'dynamic')
    );

    // ==================== CRUD Operations ====================

    /**
     * Get app by ID
     */
    getAppById(appId: string): App | undefined {
        return this._apps().find(app => app.id === appId);
    }

    /**
     * Get apps by category
     */
    getAppsByCategory(categoryId: string): App[] {
        return this._apps().filter(app => app.category === categoryId);
    }

    /**
     * Search apps by query
     */
    searchApps(query: string): App[] {
        const q = query.toLowerCase();
        return this._apps().filter(app =>
            app.name.toLowerCase().includes(q) ||
            app.description.toLowerCase().includes(q) ||
            app.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }

    /**
     * Install an app
     */
    async installApp(appId: string, parameters?: Record<string, any>): Promise<void> {
        this.isLoading.set(true);

        try {
            // Simulate installation delay
            await this.delay(1500);

            // Get internal app manifest if available
            const internalManifest = getInternalAppManifest(appId);

            // Register with dynamic module system (if not already registered)
            if (internalManifest && !this.moduleRegistry.isRegistered(appId)) {
                await this.moduleRegistry.registerApp(internalManifest);
            }

            this._apps.update(apps => apps.map(app => {
                if (app.id === appId) {
                    return {
                        ...app,
                        installStatus: AppInstallStatus.Installed,
                        installedVersion: app.currentVersion.version,
                        installedAt: new Date(),
                        lastUsedAt: new Date()
                    };
                }
                return app;
            }));

            // Save installed config
            const newConfig: InstalledAppConfig = {
                appId,
                installedVersion: this.getAppById(appId)?.currentVersion.version || '1.0.0',
                installedAt: new Date(),
                parameters: parameters || {},
                settings: {}
            };

            this._installedConfigs.update(configs => [...configs, newConfig]);
            this.saveInstalledApps();

            console.log(`[AppNexus] App installed: ${appId}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Uninstall an app
     */
    async uninstallApp(appId: string): Promise<void> {
        this.isLoading.set(true);

        try {
            await this.delay(500);

            // Unregister from dynamic module system
            this.moduleRegistry.unregisterApp(appId);

            this._apps.update(apps => apps.map(app => {
                if (app.id === appId) {
                    return {
                        ...app,
                        installStatus: AppInstallStatus.Available,
                        installedVersion: undefined,
                        installedAt: undefined
                    };
                }
                return app;
            }));

            this._installedConfigs.update(configs =>
                configs.filter(c => c.appId !== appId)
            );
            this.saveInstalledApps();

            console.log(`[AppNexus] App uninstalled: ${appId}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Update app parameters
     */
    updateAppParameters(appId: string, parameters: Record<string, any>): void {
        this._installedConfigs.update(configs =>
            configs.map(c => c.appId === appId
                ? { ...c, parameters }
                : c
            )
        );
        this.saveInstalledApps();
    }

    /**
     * Update app settings
     */
    updateAppSettings(appId: string, settings: Record<string, any>): void {
        this._installedConfigs.update(configs =>
            configs.map(c => c.appId === appId
                ? { ...c, settings }
                : c
            )
        );
        this.saveInstalledApps();
    }

    /**
     * Get installed config for an app
     */
    getInstalledConfig(appId: string): InstalledAppConfig | undefined {
        return this._installedConfigs().find(c => c.appId === appId);
    }

    /**
     * Get the route for an app (centralized route lookup)
     * Returns the route path if app is installed and has a route
     */
    getAppRoute(appId: string): string | null {
        const app = this.getAppById(appId);
        if (!app || app.installStatus !== AppInstallStatus.Installed) {
            return null;
        }

        // First check module registry for dynamic route
        const registeredRoute = this.moduleRegistry.getAppRoute(appId);
        if (registeredRoute) {
            return registeredRoute;
        }

        // Fallback to internal app manifest
        const manifest = getInternalAppManifest(appId);
        if (manifest) {
            return `/app/${manifest.route}`;
        }

        // Last resort: use startScreen from app definition
        if (app.startScreen) {
            return app.startScreen.startsWith('/') ? app.startScreen : `/${app.startScreen}`;
        }

        return null;
    }

    /**
     * Create a new dynamic app
     */
    createDynamicApp(app: Partial<App>): App {
        const newApp: App = {
            id: crypto.randomUUID(),
            name: app.name || 'New App',
            description: app.description || '',
            iconUrl: app.iconUrl || 'pi pi-box',
            type: 'dynamic',
            category: app.category || 'custom',
            author: 'User',
            tags: app.tags || [],
            currentVersion: {
                version: '1.0.0',
                releaseDate: new Date()
            },
            pricing: { type: 'free', amount: 0, currency: 'USD' },
            parameters: app.parameters || [],
            settings: app.settings || [],
            usesApiConnection: app.usesApiConnection || false,
            processDefinitions: app.processDefinitions || [],
            installStatus: AppInstallStatus.Available,
            startScreen: app.startScreen || 'default',
            ...app
        };

        this._apps.update(apps => [...apps, newApp]);
        return newApp;
    }

    // ==================== Persistence ====================

    private saveInstalledApps(): void {
        try {
            localStorage.setItem('app_nexus_installed',
                JSON.stringify(this._installedConfigs())
            );
        } catch (e) {
            console.warn('[AppNexus] Failed to save installed apps:', e);
        }
    }

    private loadInstalledApps(): InstalledAppConfig[] {
        try {
            const stored = localStorage.getItem('app_nexus_installed');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // ==================== Demo Data ====================

    private getDefaultCategories(): AppCategory[] {
        return [
            { id: 'api', name: 'API Integrations', icon: 'pi pi-link', appCount: 3 },
            { id: 'data', name: 'Data Processing', icon: 'pi pi-database', appCount: 2 },
            { id: 'ai', name: 'AI & ML', icon: 'pi pi-microchip-ai', appCount: 2 },
            { id: 'reports', name: 'Reporting', icon: 'pi pi-chart-bar', appCount: 1 },
            { id: 'automation', name: 'Automation', icon: 'pi pi-bolt', appCount: 2 },
            { id: 'custom', name: 'Custom Apps', icon: 'pi pi-box', appCount: 0 }
        ];
    }

    private getDemoApps(): App[] {
        return [
            // Static Apps (manually programmed)
            {
                id: 'doc-analyzer',
                name: 'Document Analyzer Pro',
                description: 'AI-powered document analysis with OCR, entity extraction, and smart categorization. Supports PDF, images, and Office documents.',
                iconUrl: 'pi pi-file-edit',
                type: 'static',
                category: 'ai',
                author: 'APPRX Team',
                tags: ['documents', 'ai', 'ocr', 'analysis'],
                currentVersion: { version: '2.1.0', releaseDate: new Date('2024-01-15') },
                pricing: { type: 'subscription', amount: 29, currency: 'EUR', billingPeriod: 'monthly' },
                parameters: [
                    { id: 'openai-key', name: 'OpenAI API Key', type: 'string', isSecret: true, required: true, placeholder: 'sk-...' },
                    {
                        id: 'model', name: 'AI Model', type: 'select', isSecret: false, required: true, options: [
                            { label: 'GPT-4o', value: 'gpt-4o' },
                            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' }
                        ]
                    }
                ],
                settings: [
                    { key: 'autoAnalyze', label: 'Auto-analyze on upload', type: 'toggle', value: true },
                    { key: 'saveHistory', label: 'Save analysis history', type: 'toggle', value: true }
                ],
                usesApiConnection: true,
                apiConnection: {
                    id: 'openai',
                    name: 'OpenAI API',
                    baseUrl: 'https://api.openai.com/v1',
                    authType: 'bearer',
                    isActive: false
                },
                processDefinitions: [],
                installStatus: AppInstallStatus.Installed,
                installedVersion: '2.1.0',
                installedAt: new Date('2024-01-20'),
                startScreen: '/document-management',
                isFeatured: true
            },
            {
                id: 'invoice-processor',
                name: 'Invoice Extractor',
                description: 'Extract structured data from invoices automatically. Supports multiple formats and languages.',
                iconUrl: 'pi pi-receipt',
                type: 'static',
                category: 'data',
                author: 'APPRX Team',
                tags: ['invoices', 'extraction', 'accounting'],
                currentVersion: { version: '1.5.2', releaseDate: new Date('2024-02-01') },
                pricing: { type: 'free', amount: 0, currency: 'EUR' },
                parameters: [],
                settings: [
                    {
                        key: 'currency', label: 'Default Currency', type: 'select', value: 'EUR', options: [
                            { label: 'Euro (€)', value: 'EUR' },
                            { label: 'US Dollar ($)', value: 'USD' }
                        ]
                    }
                ],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/invoice-extractor',
                isFeatured: true
            },

            // Dynamic Apps (API functionality on-the-fly)
            {
                id: 'rest-connector',
                name: 'REST API Connector',
                description: 'Connect to any REST API with customizable endpoints, authentication, and data mapping.',
                iconUrl: 'pi pi-link',
                type: 'dynamic',
                category: 'api',
                author: 'APPRX Team',
                tags: ['api', 'rest', 'integration', 'connector'],
                currentVersion: { version: '3.0.0', releaseDate: new Date('2024-01-10') },
                pricing: { type: 'free', amount: 0, currency: 'EUR' },
                parameters: [
                    { id: 'base-url', name: 'API Base URL', type: 'url', isSecret: false, required: true, placeholder: 'https://api.example.com' },
                    { id: 'api-key', name: 'API Key', type: 'string', isSecret: true, required: false, placeholder: 'Your API key' },
                    { id: 'headers', name: 'Custom Headers', type: 'json', isSecret: false, required: false, defaultValue: '{}' }
                ],
                settings: [
                    { key: 'timeout', label: 'Request Timeout (ms)', type: 'number', value: 30000 },
                    { key: 'retries', label: 'Max Retries', type: 'number', value: 3 }
                ],
                usesApiConnection: true,
                processDefinitions: [
                    {
                        id: 'default-flow',
                        name: 'Default API Flow',
                        yamlContent: `name: REST API Call
steps:
  - id: request
    type: http-request
    config:
      method: GET
      url: "{{baseUrl}}/{{endpoint}}"
      headers: "{{headers}}"
  - id: transform
    type: json-transform
    config:
      mapping: "{{responseMapping}}"`,
                        version: '1.0.0',
                        isActive: true,
                        lastModified: new Date()
                    }
                ],
                installStatus: AppInstallStatus.Available,
                startScreen: '/api-connector',
                isFeatured: true
            },
            {
                id: 'webhook-receiver',
                name: 'Webhook Receiver',
                description: 'Receive and process webhooks from external services with custom transformations.',
                iconUrl: 'pi pi-arrow-right-arrow-left',
                type: 'dynamic',
                category: 'api',
                author: 'APPRX Team',
                tags: ['webhook', 'integration', 'automation'],
                currentVersion: { version: '1.2.0', releaseDate: new Date('2024-01-25') },
                pricing: { type: 'subscription', amount: 9, currency: 'EUR', billingPeriod: 'monthly' },
                parameters: [
                    { id: 'secret', name: 'Webhook Secret', type: 'string', isSecret: true, required: false },
                    { id: 'processor', name: 'Processing Script', type: 'json', isSecret: false, required: false }
                ],
                settings: [
                    { key: 'logging', label: 'Enable Logging', type: 'toggle', value: true }
                ],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/webhook-setup'
            },
            {
                id: 'data-transformer',
                name: 'Data Transformer',
                description: 'Transform data between formats with visual mapping and YAML-based rules.',
                iconUrl: 'pi pi-sitemap',
                type: 'dynamic',
                category: 'data',
                author: 'APPRX Team',
                tags: ['data', 'transform', 'mapping', 'etl'],
                currentVersion: { version: '2.0.1', releaseDate: new Date('2024-02-05') },
                pricing: { type: 'free', amount: 0, currency: 'EUR' },
                parameters: [],
                settings: [
                    { key: 'preserveNulls', label: 'Preserve null values', type: 'toggle', value: false }
                ],
                usesApiConnection: false,
                processDefinitions: [
                    {
                        id: 'transform-rule',
                        name: 'Transformation Rules',
                        yamlContent: `mappings:
  - source: input.field1
    target: output.newField
    transform: uppercase`,
                        version: '1.0.0',
                        isActive: true,
                        lastModified: new Date()
                    }
                ],
                installStatus: AppInstallStatus.Available,
                startScreen: '/data-transformer'
            },
            {
                id: 'report-generator',
                name: 'Report Generator',
                description: 'Generate beautiful PDF reports from templates with dynamic data binding.',
                iconUrl: 'pi pi-file-pdf',
                type: 'static',
                category: 'reports',
                author: 'APPRX Team',
                tags: ['reports', 'pdf', 'templates'],
                currentVersion: { version: '1.0.0', releaseDate: new Date('2024-02-10') },
                pricing: { type: 'one-time', amount: 49, currency: 'EUR' },
                parameters: [],
                settings: [],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/report-generator'
            },
            {
                id: 'workflow-automator',
                name: 'Workflow Automator',
                description: 'Create automated workflows with triggers, conditions, and actions.',
                iconUrl: 'pi pi-bolt',
                type: 'dynamic',
                category: 'automation',
                author: 'APPRX Team',
                tags: ['automation', 'workflow', 'triggers'],
                currentVersion: { version: '1.1.0', releaseDate: new Date('2024-02-15') },
                pricing: { type: 'subscription', amount: 19, currency: 'EUR', billingPeriod: 'monthly' },
                parameters: [],
                settings: [
                    { key: 'concurrent', label: 'Max Concurrent Workflows', type: 'number', value: 5 }
                ],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/workflow-builder',
                isFeatured: true
            },
            {
                id: 'vdb-manager',
                name: 'Virtual Database Manager',
                description: 'Create and manage virtual databases with key-value storage and TTL support. Ideal for caching, session data, and temporary storage.',
                iconUrl: 'pi pi-database',
                type: 'static',
                category: 'data',
                author: 'APPRX Team',
                tags: ['database', 'key-value', 'cache', 'storage'],
                currentVersion: { version: '1.0.0', releaseDate: new Date('2024-02-20') },
                pricing: { type: 'free', amount: 0, currency: 'EUR' },
                parameters: [],
                settings: [],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/app/vdb-manager',
                isFeatured: false,
                hasManageScreen: false  // No configuration needed - opens directly
            },
            {
                id: 'true-north',
                name: 'True North',
                description: 'Comprehensive reporting and audit framework with AI-assisted report generation, audit standards management, and compliance tracking.',
                iconUrl: 'pi pi-compass',
                type: 'static',
                category: 'reports',
                author: 'APPRX Team',
                tags: ['reports', 'audit', 'compliance', 'ai', 'framework'],
                currentVersion: { version: '1.0.0', releaseDate: new Date('2024-02-20') },
                pricing: { type: 'subscription', amount: 49, currency: 'EUR', billingPeriod: 'monthly' },
                parameters: [],
                settings: [],
                usesApiConnection: false,
                processDefinitions: [],
                installStatus: AppInstallStatus.Available,
                startScreen: '/reports',
                isFeatured: true,
                hasManageScreen: false,
                menuPlacement: MenuPlacement.None,  // Menu items are injected separately
                menuItems: [
                    { label: 'Results', icon: 'pi pi-file-check', routerLink: '/results' },
                    { label: 'True North', icon: 'pi pi-compass', routerLink: '/reports' },
                    { label: 'Report Frameworks', icon: 'pi pi-book', routerLink: '/report-frameworks' },
                    { label: 'Audit Standards', icon: 'pi pi-th-large', routerLink: '/audit-standards' }
                ]
            }
        ];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
