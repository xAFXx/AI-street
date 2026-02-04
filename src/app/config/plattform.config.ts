import { AppConfig } from '../core/store';

/**
 * Plattform Application Configuration
 * 
 * This configuration defines the look, feel, and behavior
 * of the Plattform application (separate product).
 */
export const plattformConfig: AppConfig = {
    // ==================== Identity ====================
    appId: 'plattform',
    appName: 'Plattform',
    appVersion: '1.0.0',

    // ==================== API ====================
    api: {
        baseUrl: 'https://api.plattform.io',
        version: 'v1',
        timeout: 30000,
        retry: {
            maxRetries: 3,
            retryDelay: 1000
        }
    },

    // ==================== Features ====================
    features: {
        documentManagement: false,  // Not available in Plattform
        aiAnalysis: false,          // Not available in Plattform
        multiTenant: false,         // Single-tenant
        darkMode: true,
        reportWizard: false,
        modelArena: false,
        testEvaluation: false
    },

    // ==================== Theme ====================
    theme: {
        primaryColor: '#0ea5e9',      // Sky blue
        secondaryColor: '#06b6d4',    // Cyan
        primaryColorDark: '#38bdf8',  // Lighter sky for dark mode
        secondaryColorDark: '#22d3ee', // Lighter cyan for dark mode
        logoUrl: '/assets/images/plattform-logo.svg',
        faviconUrl: '/favicon-plattform.ico',
        brandName: 'Plattform'
    },

    // ==================== Authentication ====================
    auth: {
        provider: 'oauth',
        loginUrl: '/auth/login',
        logoutUrl: '/auth/logout',
        clientId: 'plattform-web',
        authority: 'https://auth.plattform.io',
        autoRefreshToken: true
    },

    // ==================== Environment ====================
    environment: 'development',
    debug: true
};
