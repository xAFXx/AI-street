/**
 * AppConsts - Static configuration class
 * 
 * This class holds the resolved application configuration values.
 * Values are set by AppPreBootstrap before Angular bootstraps.
 */
export class AppConsts {
    // Placeholder used in URLs that gets replaced with the actual tenant name
    static readonly tenancyNamePlaceHolderInUrl = '{TENANCY_NAME}';

    // Default URL format for apprx.eu (used when only tenant name is provided)
    static readonly defaultApiUrlFormat = 'https://dev_{TENANCY_NAME}_connectapi.apprx.eu';

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
     * Set tenancy from a simple tenant name (uses apprx.eu default format)
     * E.g., "demo" -> https://dev_demo_connectapi.apprx.eu
     */
    static setTenancy(tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;

        if (tenancyName) {
            // Use default apprx.eu format
            AppConsts.remoteServiceBaseUrl = AppConsts.defaultApiUrlFormat.replace(
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
     */
    static setDirectUrl(url: string, tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;
        AppConsts.remoteServiceBaseUrl = url;

        console.log(`[AppConsts] Direct URL set`);
        console.log(`[AppConsts] Tenancy: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
    }
}
