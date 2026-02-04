/**
 * App Store Models
 * 
 * Defines the structure for apps that can be installed and managed
 * through the App Nexus (App Store).
 */

/**
 * App type classification
 */
export type AppType = 'static' | 'dynamic';

/**
 * Menu placement options for installed apps.
 * Determines where the app appears in the navigation sidebar.
 */
export enum MenuPlacement {
    /** Show under "Installed Apps" parent menu (default) */
    InstalledApps = 'installed-apps',

    /** Show as a top-level menu item */
    TopLevel = 'top-level',

    /** Don't show in navigation menu */
    None = 'none'
}

/**
 * Parameter type for dynamic configuration
 */
export interface AppParameter {
    /** Unique parameter ID */
    id: string;
    /** Display name */
    name: string;
    /** Description/help text */
    description?: string;
    /** Parameter type */
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'url';
    /** Default value */
    defaultValue?: any;
    /** Current value (when configured) */
    value?: any;
    /** Whether this parameter contains sensitive data (API keys, passwords) */
    isSecret: boolean;
    /** Whether this parameter is required */
    required: boolean;
    /** Options for select/multiselect types */
    options?: { label: string; value: any }[];
    /** Validation pattern (regex) */
    validationPattern?: string;
    /** Placeholder text */
    placeholder?: string;
}

/**
 * Required setting for app configuration
 */
export interface AppSetting {
    /** Setting key */
    key: string;
    /** Display label */
    label: string;
    /** Setting description */
    description?: string;
    /** Setting type */
    type: 'text' | 'number' | 'toggle' | 'select';
    /** Current value */
    value: any;
    /** Default value */
    defaultValue?: any;
    /** Options for select type */
    options?: { label: string; value: any }[];
}

/**
 * API Connection configuration
 */
export interface ApiConnection {
    /** Connection ID */
    id: string;
    /** Connection name */
    name: string;
    /** Base URL for API calls */
    baseUrl: string;
    /** Authentication type */
    authType: 'none' | 'apiKey' | 'bearer' | 'oauth2' | 'basic';
    /** Auth configuration */
    authConfig?: {
        apiKeyHeader?: string;
        apiKeyValue?: string;
        bearerToken?: string;
        username?: string;
        password?: string;
        clientId?: string;
        clientSecret?: string;
    };
    /** Request headers */
    headers?: Record<string, string>;
    /** Whether connection is active/tested */
    isActive: boolean;
}

/**
 * Process definition (YAML-based workflow)
 */
export interface ProcessDefinition {
    /** Process ID */
    id: string;
    /** Process name */
    name: string;
    /** YAML content */
    yamlContent: string;
    /** Process description */
    description?: string;
    /** Process version */
    version: string;
    /** Whether this is the active version */
    isActive: boolean;
    /** Last modified timestamp */
    lastModified: Date;
}

/**
 * App pricing model
 */
export interface AppPricing {
    /** Pricing type */
    type: 'free' | 'one-time' | 'subscription';
    /** Price amount (0 for free) */
    amount: number;
    /** Currency code */
    currency: string;
    /** Billing period for subscriptions */
    billingPeriod?: 'monthly' | 'yearly';
    /** Trial period in days */
    trialDays?: number;
}

/**
 * App version info
 */
export interface AppVersion {
    /** Version number (semver) */
    version: string;
    /** Release date */
    releaseDate: Date;
    /** Release notes/changelog */
    releaseNotes?: string;
    /** Minimum compatible app store version */
    minAppStoreVersion?: string;
}

/**
 * App installation status
 */
export enum AppInstallStatus {
    /** App is available for installation */
    Available = 'available',

    /** App is installed and ready to use */
    Installed = 'installed',

    /** A newer version is available */
    UpdateAvailable = 'update-available',

    /** App is currently being installed */
    Installing = 'installing',

    /** Installation or update failed */
    Error = 'error'
}

/**
 * Main App interface
 * 
 * Represents an application that can be installed through the App Nexus.
 * Apps can be Static (manually programmed) or Dynamic (API-defined on-the-fly).
 */
export interface App {
    // ==================== Identity ====================

    /** Unique app identifier */
    id: string;

    /** App display name */
    name: string;

    /** App description */
    description: string;

    /** App icon/picture URL */
    iconUrl: string;

    /** App type: static (programmed) or dynamic (API on-the-fly) */
    type: AppType;

    // ==================== Metadata ====================

    /** App category */
    category: string;

    /** Author/publisher name */
    author: string;

    /** Tags for searching */
    tags: string[];

    /** Current version info */
    currentVersion: AppVersion;

    /** Pricing information */
    pricing: AppPricing;

    // ==================== Configuration ====================

    /** Dynamic parameters (can be marked as secret) */
    parameters: AppParameter[];

    /** Required settings */
    settings: AppSetting[];

    /** Whether app uses API connection */
    usesApiConnection: boolean;

    /** API connection configuration (if usesApiConnection is true) */
    apiConnection?: ApiConnection;

    // ==================== Process Definitions ====================

    /** YAML process definitions */
    processDefinitions: ProcessDefinition[];

    // ==================== State ====================

    /** Installation status */
    installStatus: AppInstallStatus;

    /** Installed version (if installed) */
    installedVersion?: string;

    /** Installation date */
    installedAt?: Date;

    /** Last used timestamp */
    lastUsedAt?: Date;

    // ==================== UI ====================

    /** Start screen component/route */
    startScreen: string;

    /** Screenshots for app store listing */
    screenshots?: string[];

    /** Featured app flag */
    isFeatured?: boolean;

    /** 
     * Menu placement when installed.
     * @see MenuPlacement enum for available options
     */
    menuPlacement?: MenuPlacement;

    /**
     * Whether the app has a manage/configure screen.
     * If false, the "Manage" button will be hidden for this app.
     * Defaults to true if not specified.
     */
    hasManageScreen?: boolean;

    /**
     * Menu items to inject into the sidebar when the app is installed.
     * These items appear as a group under the app's name.
     */
    menuItems?: {
        /** Menu item label */
        label: string;
        /** PrimeNG icon class (e.g., 'pi pi-file') */
        icon: string;
        /** Router link path */
        routerLink: string;
    }[];
}

/**
 * App Store category
 */
export interface AppCategory {
    id: string;
    name: string;
    icon: string;
    description?: string;
    appCount: number;
}

/**
 * Installed app configuration (persisted)
 */
export interface InstalledAppConfig {
    appId: string;
    installedVersion: string;
    installedAt: Date;
    parameters: Record<string, any>;
    settings: Record<string, any>;
    apiConnectionId?: string;
}
