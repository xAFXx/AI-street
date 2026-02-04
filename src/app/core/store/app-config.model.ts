/**
 * App Configuration Model
 * 
 * Defines the structure for application configuration that varies between
 * Plattform and APPRX applications. This is the core contract for the app-store.
 */

/**
 * Theme configuration for visual branding
 */
export interface ThemeConfig {
    /** Primary brand color (hex) */
    primaryColor: string;
    /** Secondary/accent color (hex) */
    secondaryColor: string;
    /** URL to application logo */
    logoUrl: string;
    /** URL to favicon */
    faviconUrl: string;
    /** Brand name displayed in UI */
    brandName: string;
    /** Optional dark mode primary color override */
    primaryColorDark?: string;
    /** Optional dark mode secondary color override */
    secondaryColorDark?: string;
}

/**
 * Feature flags to enable/disable application features
 */
export interface FeatureFlags {
    /** Document processing and management */
    documentManagement: boolean;
    /** AI-powered document analysis */
    aiAnalysis: boolean;
    /** Multi-tenant support */
    multiTenant: boolean;
    /** Dark mode toggle */
    darkMode: boolean;
    /** Report generation wizard */
    reportWizard?: boolean;
    /** Model arena comparison */
    modelArena?: boolean;
    /** Test evaluation center */
    testEvaluation?: boolean;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
    /** Authentication provider type */
    provider: 'oauth' | 'jwt' | 'abp' | 'none';
    /** Login page URL */
    loginUrl?: string;
    /** Logout endpoint URL */
    logoutUrl?: string;
    /** OAuth client ID (for oauth provider) */
    clientId?: string;
    /** OAuth authority/issuer URL */
    authority?: string;
    /** Token refresh enabled */
    autoRefreshToken?: boolean;
}

/**
 * API configuration
 */
export interface ApiConfig {
    /** Base URL for API calls (can include {TENANCY_NAME} placeholder) */
    baseUrl: string;
    /** API version */
    version: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Retry configuration */
    retry?: {
        maxRetries: number;
        retryDelay: number;
    };
}

/**
 * Main application configuration interface
 * 
 * This is the primary configuration that differs between applications.
 * Each app provides its own implementation of this config.
 */
export interface AppConfig {
    // ==================== Identity ====================

    /** Unique application identifier */
    appId: 'plattform' | 'apprx';

    /** Human-readable application name */
    appName: string;

    /** Application version (semver) */
    appVersion: string;

    // ==================== API ====================

    /** API configuration */
    api: ApiConfig;

    /** Current tenant ID (for multi-tenant apps) */
    tenantId?: string;

    // ==================== Features ====================

    /** Feature flags */
    features: FeatureFlags;

    // ==================== Theming ====================

    /** Theme/branding configuration */
    theme: ThemeConfig;

    // ==================== Authentication ====================

    /** Authentication configuration */
    auth: AuthConfig;

    // ==================== Environment ====================

    /** Environment name */
    environment?: 'development' | 'staging' | 'production';

    /** Enable debug logging */
    debug?: boolean;
}

/**
 * User model for session state
 */
export interface AppUser {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    roles: string[];
    permissions: string[];
    tenantId?: string;
}

/**
 * Session state that persists across page reloads
 */
export interface SessionState {
    /** Last visited route */
    lastRoute?: string;
    /** User preferences */
    preferences: {
        darkMode: boolean;
        sidebarExpanded: boolean;
        locale: string;
    };
    /** Custom data storage for modules */
    moduleData: Record<string, any>;
}
