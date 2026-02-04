/**
 * AppConsts - Static configuration class
 * 
 * This class holds the resolved application configuration values.
 * Values are set by AppPreBootstrap before Angular bootstraps.
 */
export class AppConsts {
    // Placeholder used in URLs that gets replaced with the actual tenant name
    static readonly tenancyNamePlaceHolderInUrl = '{TENANCY_NAME}';

    // Current active domain - the source of truth
    static readonly activeDomain = 'plattform.nl';

    // Deprecated domains that should be automatically migrated to activeDomain
    static readonly deprecatedDomains = ['ai-street.eu', 'apprx.eu'];

    // Default URL format for plattform.nl (used when only tenant name is provided)
    static readonly defaultApiUrlFormat = `https://dev_{TENANCY_NAME}_connectapi.${AppConsts.activeDomain}`;

    // Application name from config
    static applicationName: string = 'APPRX True North';

    // Base URL for the frontend app (with tenant resolved)
    static appBaseUrl: string = '';

    // Base URL for the API/remote service (with tenant resolved)
    static remoteServiceBaseUrl: string = '';

    // Original URL formats from appconfig.json (with placeholder)
    static appBaseUrlFormat: string = '';
    static remoteServiceBaseUrlFormat: string = '';

    // Locale mappings from appconfig.json
    static localeMappings: {
        angular?: { from: string; to: string }[];
        moment?: { from: string; to: string }[];
        dayjs?: { from: string; to: string }[];
        recaptcha?: { from: string; to: string }[];
    } = {};

    // App base href (from platform location)
    static appBaseHref: string = '/';

    // Current tenancy name
    static tenancyName: string = '';

    /**
     * Check if a URL uses a deprecated domain
     */
    static isDeprecatedUrl(url: string): boolean {
        if (!url) return false;
        return AppConsts.deprecatedDomains.some(domain => url.includes(domain));
    }

    /**
     * Migrate a URL from a deprecated domain to the active domain
     */
    static migrateUrl(url: string): string {
        if (!url) return url;

        let migratedUrl = url;
        for (const deprecated of AppConsts.deprecatedDomains) {
            if (migratedUrl.includes(deprecated)) {
                migratedUrl = migratedUrl.replace(deprecated, AppConsts.activeDomain);
                console.log(`[AppConsts] Migrated URL from ${deprecated} to ${AppConsts.activeDomain}`);
            }
        }
        return migratedUrl;
    }

    /**
     * Clean up deprecated URLs from localStorage and migrate if possible
     * Call this at app startup to ensure no old URLs persist
     */
    static cleanupDeprecatedStorage(): void {
        const customApiUrl = localStorage.getItem('custom_api_url');

        if (customApiUrl && AppConsts.isDeprecatedUrl(customApiUrl)) {
            console.log('[AppConsts] Found deprecated URL in localStorage, removing...');
            localStorage.removeItem('custom_api_url');
            // Keep tenancy_name so user doesn't have to re-enter it
            console.log('[AppConsts] Deprecated custom_api_url cleared. Will use config-based URL.');
        }
    }

    /**
     * Set tenancy from a simple tenant name
     * Uses the remoteServiceBaseUrlFormat from appconfig.json, falling back to defaultApiUrlFormat
     */
    static setTenancy(tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;

        if (tenancyName) {
            // Use the format from appconfig.json if available, otherwise fallback to default
            let urlFormat = AppConsts.remoteServiceBaseUrlFormat || AppConsts.defaultApiUrlFormat;

            // Ensure we're not using a deprecated domain in the format
            urlFormat = AppConsts.migrateUrl(urlFormat);

            AppConsts.remoteServiceBaseUrl = urlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl,
                tenancyName
            );
        } else {
            AppConsts.remoteServiceBaseUrl = '';
        }

        console.log(`[AppConsts] Tenancy set to: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
    }

    /**
     * Set a direct API URL (bypasses template substitution)
     * Used when user provides a full URL instead of just tenant name
     * Automatically migrates deprecated domains
     */
    static setDirectUrl(url: string, tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;

        // Migrate if using deprecated domain
        AppConsts.remoteServiceBaseUrl = AppConsts.migrateUrl(url);

        console.log(`[AppConsts] Direct URL set`);
        console.log(`[AppConsts] Tenancy: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
    }
}
