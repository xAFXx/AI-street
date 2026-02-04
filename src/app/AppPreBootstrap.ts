/**
 * AppPreBootstrap - Pre-bootstrap configuration loader
 * 
 * This class loads the appconfig.json and sets up the application before Angular bootstraps.
 * It must run BEFORE Angular's bootstrapApplication() is called.
 */
import { AppConsts } from './shared/AppConsts';
import { XmlHttpRequestHelper } from './shared/helpers/XmlHttpRequestHelper';
import { SubdomainTenancyNameFinder } from './shared/helpers/SubdomainTenancyNameFinder';
import { environment } from '../environments/environment';

// Declare global abp object for TypeScript
declare const abp: any;

export interface AppConfig {
    remoteServiceBaseUrl: string;
    appBaseUrl: string;
    applicationName?: string;
    localeMappings?: {
        angular?: { from: string; to: string }[];
        moment?: { from: string; to: string }[];
        dayjs?: { from: string; to: string }[];
        recaptcha?: { from: string; to: string }[];
    };
}

export class AppPreBootstrap {
    /**
     * Main entry point - run this before Angular bootstraps
     * 
     * @param appRootUrl The root URL of the application (e.g., 'http://localhost:4200/')
     * @returns A promise that resolves when configuration is loaded
     */
    static run(appRootUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            AppPreBootstrap.getApplicationConfig(appRootUrl, () => {
                console.log('[AppPreBootstrap] Configuration loaded successfully');

                // After config is loaded, get ABP user configuration if available
                AppPreBootstrap.getUserConfiguration(() => {
                    console.log('[AppPreBootstrap] User configuration loaded');
                    resolve();
                });
            }, reject);
        });
    }

    /**
     * Load the application configuration from appconfig.json (or appconfig.production.json in prod)
     */
    private static getApplicationConfig(appRootUrl: string, callback: () => void, reject: (error: any) => void): void {
        // Clean up any deprecated URLs from localStorage before loading config
        // This ensures old ai-street.eu or apprx.eu URLs don't override the new plattform.nl config
        AppConsts.cleanupDeprecatedStorage();

        const url = appRootUrl + 'assets/' + environment.appConfig;
        console.log('[AppPreBootstrap] Loading config from:', url);

        XmlHttpRequestHelper.ajax(
            'GET',
            url,
            null,
            null,
            (result: AppConfig) => {
                console.log('[AppPreBootstrap] Config loaded:', result);

                // Store the format URLs (with placeholders)
                AppConsts.appBaseUrlFormat = result.appBaseUrl;
                AppConsts.remoteServiceBaseUrlFormat = result.remoteServiceBaseUrl;
                AppConsts.localeMappings = result.localeMappings || {};
                AppConsts.applicationName = result.applicationName || 'APPRX True North';

                // Extract tenancy name from subdomain
                const tenancyFinder = new SubdomainTenancyNameFinder();
                const tenancyName = tenancyFinder.getCurrentTenancyNameOrNull(result.appBaseUrl);

                if (tenancyName) {
                    console.log('[AppPreBootstrap] Detected tenancy:', tenancyName);
                    AppConsts.setTenancy(tenancyName);
                    // Store for future use
                    localStorage.setItem('tenancy_name', tenancyName);
                } else {
                    console.log('[AppPreBootstrap] No tenancy detected, using URLs without tenant');
                    // Remove placeholder from URLs
                    AppConsts.appBaseUrl = result.appBaseUrl
                        .replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '')
                        .replace('_' + AppConsts.tenancyNamePlaceHolderInUrl, '');
                    AppConsts.remoteServiceBaseUrl = result.remoteServiceBaseUrl
                        .replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '')
                        .replace('_' + AppConsts.tenancyNamePlaceHolderInUrl, '');

                    // Try to get from localStorage (for development)
                    const storedTenant = localStorage.getItem('tenancy_name');
                    const customApiUrl = localStorage.getItem('custom_api_url');

                    if (customApiUrl && storedTenant) {
                        // Custom URL was previously set - use it directly
                        console.log('[AppPreBootstrap] Using stored custom API URL:', customApiUrl);
                        AppConsts.setDirectUrl(customApiUrl, storedTenant);
                    } else if (storedTenant) {
                        // Simple tenant name - use default apprx.eu format
                        console.log('[AppPreBootstrap] Using stored tenancy:', storedTenant);
                        AppConsts.setTenancy(storedTenant);
                    }
                }

                callback();
            },
            (error) => {
                console.error('[AppPreBootstrap] Failed to load config:', error);

                // Use fallback configuration
                console.log('[AppPreBootstrap] Using fallback configuration');
                AppConsts.remoteServiceBaseUrl = 'https://demo-connectapi.plattform.nl';
                AppConsts.appBaseUrl = 'https://demo.plattform.nl';
                AppConsts.remoteServiceBaseUrlFormat = 'https://dev_{TENANCY_NAME}-connectapi.plattform.nl';
                AppConsts.appBaseUrlFormat = 'https://dev_{TENANCY_NAME}.plattform.nl';

                callback(); // Continue anyway with fallback
            }
        );
    }

    /**
     * Get ABP user configuration from /AbpUserConfiguration/GetAll
     * This initializes the global abp object with session, settings, features, etc.
     */
    private static getUserConfiguration(callback: () => void): void {
        // Check if abp global is available (loaded from abp.js)
        if (typeof abp === 'undefined') {
            console.warn('[AppPreBootstrap] abp global not available, skipping user configuration');
            callback();
            return;
        }

        // Use the remoteServiceBaseUrl for API calls
        const url = `${AppConsts.remoteServiceBaseUrl}/AbpUserConfiguration/GetAll`;
        console.log('[AppPreBootstrap] Loading ABP user configuration from:', url);

        // Build request headers as array (format expected by XmlHttpRequestHelper)
        const requestHeaders: { name: string; value: string }[] = [];

        const cookieLangValue = abp.utils?.getCookieValue?.('Abp.Localization.CultureName') || '';
        const token = abp.auth?.getToken?.() || localStorage.getItem('auth_token');

        if (cookieLangValue) {
            requestHeaders.push({
                name: '.AspNetCore.Culture',
                value: 'c=' + cookieLangValue + '|uic=' + cookieLangValue
            });
        }

        if (abp.multiTenancy?.tenantIdCookieName && abp.multiTenancy?.getTenantIdCookie) {
            requestHeaders.push({
                name: abp.multiTenancy.tenantIdCookieName,
                value: String(abp.multiTenancy.getTenantIdCookie())
            });
        }

        if (token) {
            requestHeaders.push({ name: 'Authorization', value: 'Bearer ' + token });
        }

        XmlHttpRequestHelper.ajax(
            'GET',
            url,
            requestHeaders.length > 0 ? requestHeaders : null,
            null,
            (response: any) => {
                console.log('[AppPreBootstrap] ABP user configuration loaded:', response);

                try {
                    const result = response.result || response;

                    // Merge the configuration into the global abp object
                    // This uses a simple merge - in production you might want lodash _.merge
                    AppPreBootstrap.mergeAbpConfig(result);

                    // Trigger event for any listeners
                    if (abp.event?.trigger) {
                        abp.event.trigger('abp.dynamicScriptsInitialized');
                    }

                    console.log('[AppPreBootstrap] ABP object initialized:', {
                        session: abp.session,
                        auth: abp.auth ? 'present' : 'missing',
                        multiTenancy: abp.multiTenancy
                    });

                    callback();
                } catch (e) {
                    console.error('[AppPreBootstrap] Error processing ABP config:', e);
                    callback(); // Continue anyway
                }
            },
            (error) => {
                console.warn('[AppPreBootstrap] Failed to load ABP user configuration:', error);
                // Don't fail - user might not be authenticated yet
                callback();
            }
        );
    }

    /**
     * Merge ABP configuration into the global abp object
     */
    private static mergeAbpConfig(config: any): void {
        if (!config || typeof abp === 'undefined') return;

        // Deep merge each key
        const keys = ['session', 'localization', 'auth', 'nav', 'setting', 'clock', 'timing',
            'features', 'multiTenancy', 'custom'];

        for (const key of keys) {
            if (config[key]) {
                if (!abp[key]) {
                    abp[key] = {};
                }
                // Simple deep merge
                abp[key] = { ...abp[key], ...config[key] };
            }
        }

        // Special handling for arrays and functions
        if (config.localization?.values) {
            abp.localization = abp.localization || {};
            abp.localization.values = config.localization.values;
        }
    }

    /**
     * Get the document origin (protocol + hostname + port)
     */
    static getDocumentOrigin(): string {
        if (!document.location.origin) {
            return document.location.protocol + '//' + document.location.hostname +
                (document.location.port ? ':' + document.location.port : '');
        }
        return document.location.origin;
    }

    /**
     * Get the base href from the DOM or return '/'
     */
    static getBaseHref(): string {
        const baseElement = document.querySelector('base[href]');
        if (baseElement) {
            return baseElement.getAttribute('href') || '/';
        }
        return '/';
    }
}
