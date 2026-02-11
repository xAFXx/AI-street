/**
 * AppConsts - Static configuration class
 * 
 * This class holds the resolved application configuration values.
 * Values are set by AppPreBootstrap before Angular bootstraps.
 * URLs come entirely from the active appconfig file (apprx, plattform, or production).
 */
export class AppConsts {
    // Placeholder used in URLs that gets replaced with the actual tenant name
    static readonly tenancyNamePlaceHolderInUrl = '{TENANCY_NAME}';

    // Application name from config
    static applicationName: string = 'Apprx 2.0';

    // Base URL for the frontend app (with tenant resolved)
    static appBaseUrl: string = '';

    // Base URL for the API/remote service (with tenant resolved)
    static remoteServiceBaseUrl: string = '';

    // Original URL formats from appconfig file (with placeholder)
    static appBaseUrlFormat: string = '';
    static remoteServiceBaseUrlFormat: string = '';

    // Locale mappings from appconfig
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

    // Numeric tenant ID (from AbpUserConfiguration/GetAll session)
    static tenantId: number | null = null;

    /**
     * Set tenancy from a simple tenant name.
     * Uses the remoteServiceBaseUrlFormat loaded from the active appconfig file.
     */
    static setTenancy(tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;

        if (tenancyName && AppConsts.remoteServiceBaseUrlFormat) {
            AppConsts.remoteServiceBaseUrl = AppConsts.remoteServiceBaseUrlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl,
                tenancyName
            );

            if (AppConsts.appBaseUrlFormat) {
                AppConsts.appBaseUrl = AppConsts.appBaseUrlFormat.replace(
                    AppConsts.tenancyNamePlaceHolderInUrl,
                    tenancyName
                );
            }
        } else {
            AppConsts.remoteServiceBaseUrl = '';
        }

        console.log(`[AppConsts] Tenancy set to: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
    }

    /**
     * Set a direct API URL (bypasses template substitution).
     * Used when user provides a full URL instead of just tenant name.
     */
    static setDirectUrl(url: string, tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;
        AppConsts.remoteServiceBaseUrl = url;

        console.log(`[AppConsts] Direct URL set`);
        console.log(`[AppConsts] Tenancy: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
    }
}
