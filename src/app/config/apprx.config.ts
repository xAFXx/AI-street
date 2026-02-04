import { AppConfig } from '../core/store';

/**
 * APPRX True North Application Configuration
 * 
 * This configuration defines the look, feel, and behavior
 * of the APPRX application.
 */
export const apprxConfig: AppConfig = {
    // ==================== Identity ====================
    appId: 'apprx',
    appName: 'APPRX True North',
    appVersion: '1.0.0',

    // ==================== API ====================
    api: {
        baseUrl: 'https://dev_{TENANCY_NAME}_connectapi.apprx.eu',
        version: 'v1',
        timeout: 30000,
        retry: {
            maxRetries: 3,
            retryDelay: 1000
        }
    },

    // ==================== Features ====================
    features: {
        documentManagement: true,
        aiAnalysis: true,
        multiTenant: true,
        darkMode: true,
        reportWizard: true,
        modelArena: true,
        testEvaluation: true
    },

    // ==================== Theme ====================
    theme: {
        primaryColor: '#6366f1',      // Indigo
        secondaryColor: '#8b5cf6',    // Purple
        primaryColorDark: '#818cf8',  // Lighter indigo for dark mode
        secondaryColorDark: '#a78bfa', // Lighter purple for dark mode
        logoUrl: '/assets/images/apprx-logo.svg',
        faviconUrl: '/favicon.ico',
        brandName: 'APPRX True North'
    },

    // ==================== Authentication ====================
    auth: {
        provider: 'abp',
        loginUrl: '/account/login',
        logoutUrl: '/account/logout',
        autoRefreshToken: true
    },

    // ==================== Environment ====================
    environment: 'development',
    debug: true
};
