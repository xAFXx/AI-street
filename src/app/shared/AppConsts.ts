/**
 * AppConsts - Static configuration class
 * 
 * This class holds the resolved application configuration values.
 * Values are set by AppPreBootstrap before Angular bootstraps.
 */
export class AppConsts {
    // Placeholder used in URLs that gets replaced with the actual tenant name
    static readonly tenancyNamePlaceHolderInUrl = '{TENANCY_NAME}';

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
     * Update the URLs with a new tenancy name
     */
    static setTenancy(tenancyName: string): void {
        AppConsts.tenancyName = tenancyName;

        if (tenancyName) {
            AppConsts.appBaseUrl = AppConsts.appBaseUrlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl,
                tenancyName
            );
            AppConsts.remoteServiceBaseUrl = AppConsts.remoteServiceBaseUrlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl,
                tenancyName
            );
        } else {
            // Remove placeholder and preceding underscore/hyphen if no tenant
            AppConsts.appBaseUrl = AppConsts.appBaseUrlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl + '.',
                ''
            ).replace(
                '_' + AppConsts.tenancyNamePlaceHolderInUrl,
                ''
            );
            AppConsts.remoteServiceBaseUrl = AppConsts.remoteServiceBaseUrlFormat.replace(
                AppConsts.tenancyNamePlaceHolderInUrl + '.',
                ''
            ).replace(
                '_' + AppConsts.tenancyNamePlaceHolderInUrl,
                ''
            );
        }

        console.log(`[AppConsts] Tenancy set to: ${tenancyName}`);
        console.log(`[AppConsts] API URL: ${AppConsts.remoteServiceBaseUrl}`);
        console.log(`[AppConsts] App URL: ${AppConsts.appBaseUrl}`);
    }
}
