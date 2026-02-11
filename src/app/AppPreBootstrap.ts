/**
 * AppPreBootstrap - Pre-bootstrap configuration loader
 *
 * This class loads the appconfig.json and sets up the application before Angular bootstraps.
 * It must run BEFORE Angular's bootstrapApplication() is called.
 *
 * It also drives the loading screen UI (defined in index.html) to show users
 * which step is currently in progress, and surfaces a typed error when the
 * backend is unreachable so that main.ts can display a maintenance screen.
 */
import { AppConsts } from './shared/AppConsts';
import { XmlHttpRequestHelper } from './shared/helpers/XmlHttpRequestHelper';
import { SubdomainTenancyNameFinder } from './shared/helpers/SubdomainTenancyNameFinder';
import { environment } from '../environments/environment';

// Declare global abp object for TypeScript
declare const abp: any;

// Declare the preboot loading API injected by index.html
declare global {
    interface Window {
        __prebootLoading?: {
            setStep(stepId: string, status: 'active' | 'done' | 'error'): void;
            showMaintenance(errorMessage?: string): void;
            destroy(): void;
        };
    }
}

/** Timeout (ms) for getUserConfiguration before we consider the backend unreachable. */
const USER_CONFIG_TIMEOUT_MS = 15_000;

/** localStorage key for the cached tenant logo data-URL. */
const LS_LOGO_KEY = 'apprx_cached_logo';

/**
 * Funny one-liners keyed by HTTP status code.
 * Numbers are woven into each sentence so they feel natural.
 * Status 500 has a pool of 30 — one is picked at random each time.
 */
const FUNNY_ERROR_MESSAGES: Record<number, string> = {
    0: 'Somewhere between 0 and infinity packets, none arrived',
    400: 'We tried 400 different ways to ask, but the server just shrugged',
    401: 'Only 401 keys on the ring and none of them fit the lock',
    403: 'All 403 doors we knocked on stayed firmly shut',
    404: 'We searched 404 rooms and still couldn\'t find what we needed',
    408: 'We waited 408 seconds but the server never wrote back',
    501: 'The server flipped through 501 pages of its manual and gave up',
    502: 'We sent 502 carrier pigeons but none came back',
    503: 'The server hung up a "Back in 503 minutes" sign',
    504: 'After 504 rings the server finally said "leave a message"',
};

/** 30 random sentences for status 500 (Internal Server Error). */
const FUNNY_500_POOL: string[] = [
    'About 500 things just went sideways at once',
    'The server tripped over cable 500 and faceplanted',
    'Somewhere around line 500, a hamster fell off its wheel',
    'All 500 cogs in the machine decided to take a break together',
    'The server tried 500 things and none of them worked',
    'Error 500: the digital elves are on strike today',
    'We counted 500 sheep and the server fell asleep',
    'The 500th domino just knocked over the whole data center',
    '500 monkeys on 500 keyboards could not fix this one',
    'The server opened fortune cookie 500: "Try again later"',
    'Layer 500 of the internet onion made us cry',
    'The server\'s 500-piece puzzle is missing the last piece',
    'We asked 500 engineers and they all said "works on my machine"',
    'The intern pressed button 500 — the forbidden one',
    'About 500 electrons took a wrong turn at Albuquerque',
    'The server rolled a 500-sided die and got "nope"',
    'Page 500 of the server\'s diary reads: "I can\'t even"',
    'The server baked 500 cookies but forgot the recipe',
    'Ticket 500 just opened itself in the issue tracker',
    'The 500th coffee of the day finally broke the machine',
    'Channel 500 is experiencing technical difficulties',
    'The server filed complaint 500 with management',
    'GPS recalculating — 500 meters until things make sense again',
    'The server\'s 500-step plan had a flaw at step 1',
    'We found 500 bugs but this one is especially creative',
    'The server phoned a friend but all 500 lines were busy',
    'Plot twist 500: the server was the villain all along',
    'The server hit 500 on the pinball machine — game over',
    'Recipe failed: add 500g of uptime and stir gently',
    'The server achieved a score of 500 — unfortunately in golf',
];

const DEFAULT_FUNNY_MESSAGE = 'Something unexpected happened — even we\'re surprised';

/** Return a funny message for the given HTTP status code. */
function funnyErrorMessage(status: number | string): string {
    const code = typeof status === 'string' ? parseInt(status, 10) : status;
    if (code === 500) {
        return FUNNY_500_POOL[Math.floor(Math.random() * FUNNY_500_POOL.length)];
    }
    return FUNNY_ERROR_MESSAGES[code] || `${DEFAULT_FUNNY_MESSAGE}`;
}

/**
 * Typed error thrown when the bootstrap process fails in a way that
 * should trigger the maintenance screen.
 */
export class BootstrapError extends Error {
    constructor(
        message: string,
        public readonly phase: 'config' | 'user-config',
        public readonly detail?: string
    ) {
        super(message);
        this.name = 'BootstrapError';
    }
}

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

    // ── Loading-screen helpers ──────────────────────────────────────────

    /** Update a step in the loading screen UI (safe to call even if UI missing). */
    private static setStep(stepId: string, status: 'active' | 'done' | 'error'): void {
        try { window.__prebootLoading?.setStep(stepId, status); } catch { /* noop */ }
    }

    // ── Public API ─────────────────────────────────────────────────────

    /**
     * Main entry point - run this before Angular bootstraps.
     *
     * Resolves on success (Angular should bootstrap).
     * Rejects with a `BootstrapError` when the backend is unreachable
     * so that main.ts can show the maintenance screen.
     */
    static run(appRootUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Step 1: Load appconfig.json
            AppPreBootstrap.setStep('config', 'active');

            AppPreBootstrap.getApplicationConfig(appRootUrl, () => {
                AppPreBootstrap.setStep('config', 'done');
                AppPreBootstrap.setStep('tenant', 'done');  // tenant is resolved inside getApplicationConfig
                console.log('[AppPreBootstrap] Configuration loaded successfully');

                // Step 2: Load ABP user configuration (with timeout)
                AppPreBootstrap.setStep('user', 'active');

                AppPreBootstrap.getUserConfigurationWithTimeout()
                    .then(() => {
                        AppPreBootstrap.setStep('user', 'done');
                        AppPreBootstrap.setStep('angular', 'active');
                        console.log('[AppPreBootstrap] User configuration loaded');

                        // Cache the tenant logo for future cold starts
                        AppPreBootstrap.cacheTenantLogo();

                        resolve();
                    })
                    .catch((err) => {
                        AppPreBootstrap.setStep('user', 'error');
                        reject(err);
                    });
            }, (error) => {
                AppPreBootstrap.setStep('config', 'error');
                reject(new BootstrapError(
                    'Failed to load application configuration',
                    'config',
                    String(error)
                ));
            });
        });
    }

    // ── Private helpers ────────────────────────────────────────────────

    /**
     * Load the application configuration from appconfig.json
     */
    private static getApplicationConfig(appRootUrl: string, callback: () => void, reject: (error: any) => void): void {
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
                AppConsts.applicationName = result.applicationName || 'Apprx 2.0';

                // Extract tenancy name from subdomain
                AppPreBootstrap.setStep('tenant', 'active');
                const tenancyFinder = new SubdomainTenancyNameFinder();
                const tenancyName = tenancyFinder.getCurrentTenancyNameOrNull(result.appBaseUrl);

                if (tenancyName) {
                    console.log('[AppPreBootstrap] Detected tenancy:', tenancyName);
                    AppConsts.setTenancy(tenancyName);
                    localStorage.setItem('tenancy_name', tenancyName);
                } else {
                    console.log('[AppPreBootstrap] No tenancy detected, using URLs without tenant');
                    AppConsts.appBaseUrl = result.appBaseUrl
                        .replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '')
                        .replace('_' + AppConsts.tenancyNamePlaceHolderInUrl, '');
                    AppConsts.remoteServiceBaseUrl = result.remoteServiceBaseUrl
                        .replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '')
                        .replace('_' + AppConsts.tenancyNamePlaceHolderInUrl, '');

                    const storedTenant = localStorage.getItem('tenancy_name');
                    const customApiUrl = localStorage.getItem('custom_api_url');

                    if (customApiUrl && storedTenant) {
                        console.log('[AppPreBootstrap] Using stored custom API URL:', customApiUrl);
                        AppConsts.setDirectUrl(customApiUrl, storedTenant);
                    } else if (storedTenant) {
                        console.log('[AppPreBootstrap] Using stored tenancy:', storedTenant);
                        AppConsts.setTenancy(storedTenant);
                    }
                }

                callback();
            },
            (error) => {
                console.error('[AppPreBootstrap] Failed to load config:', error);
                // Configuration is critical — reject so maintenance screen shows
                reject(error);
            }
        );
    }

    /**
     * Wraps getUserConfiguration() in a Promise with a timeout.
     * Rejects with BootstrapError on timeout or HTTP error.
     */
    private static getUserConfigurationWithTimeout(): Promise<void> {
        const configPromise = new Promise<void>((resolve, reject) => {
            AppPreBootstrap.getUserConfiguration(resolve, reject);
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new BootstrapError(
                    'Server did not respond in time',
                    'user-config',
                    `We waited 408 seconds but the server never wrote back`
                ));
            }, USER_CONFIG_TIMEOUT_MS);
        });

        return Promise.race([configPromise, timeoutPromise]);
    }

    /**
     * Get ABP user configuration from /AbpUserConfiguration/GetAll.
     * Now calls reject on HTTP errors instead of silently continuing.
     */
    private static getUserConfiguration(resolve: () => void, reject: (error: BootstrapError) => void): void {
        if (typeof abp === 'undefined') {
            console.warn('[AppPreBootstrap] abp global not available, skipping user configuration');
            resolve();
            return;
        }

        const url = `${AppConsts.remoteServiceBaseUrl}/AbpUserConfiguration/GetAll`;
        console.log('[AppPreBootstrap] Loading ABP user configuration from:', url);

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
                    AppPreBootstrap.mergeAbpConfig(result);

                    if (result.session?.tenantId != null) {
                        AppConsts.tenantId = result.session.tenantId;
                    }

                    if (abp.event?.trigger) {
                        abp.event.trigger('abp.dynamicScriptsInitialized');
                    }

                    console.log('[AppPreBootstrap] ABP object initialized:', {
                        session: abp.session,
                        tenantId: AppConsts.tenantId,
                        auth: abp.auth ? 'present' : 'missing',
                        multiTenancy: abp.multiTenancy
                    });

                    resolve();
                } catch (e) {
                    console.error('[AppPreBootstrap] Error processing ABP config:', e);
                    resolve(); // Config processing errors are non-fatal
                }
            },
            (error) => {
                console.warn('[AppPreBootstrap] Failed to load ABP user configuration:', error);
                const statusCode = error?.status || 0;
                reject(new BootstrapError(
                    'Cannot reach the server',
                    'user-config',
                    funnyErrorMessage(statusCode)
                ));
            }
        );
    }

    /**
     * Merge ABP configuration into the global abp object.
     */
    private static mergeAbpConfig(config: any): void {
        if (!config || typeof abp === 'undefined') return;

        const keys = ['session', 'localization', 'auth', 'nav', 'setting', 'clock', 'timing',
            'features', 'multiTenancy', 'custom'];

        for (const key of keys) {
            if (config[key]) {
                if (!abp[key]) {
                    abp[key] = {};
                }
                abp[key] = { ...abp[key], ...config[key] };
            }
        }

        if (config.localization?.values) {
            abp.localization = abp.localization || {};
            abp.localization.values = config.localization.values;
        }
    }

    /**
     * Attempt to fetch the tenant logo and cache it as a data-URL in localStorage.
     * Runs fire-and-forget after a successful bootstrap — failures are silent.
     */
    private static cacheTenantLogo(): void {
        if (AppConsts.tenantId == null || !AppConsts.remoteServiceBaseUrl) return;

        const logoUrl = `${AppConsts.remoteServiceBaseUrl}/TenantCustomization/GetTenantLogo?skin=dark&tenantId=${AppConsts.tenantId}`;

        const xhr = new XMLHttpRequest();
        xhr.open('GET', logoUrl, true);
        xhr.responseType = 'blob';
        xhr.timeout = 10_000;

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300 && xhr.response && xhr.response.size > 0) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    try {
                        localStorage.setItem(LS_LOGO_KEY, reader.result as string);
                        console.log('[AppPreBootstrap] Tenant logo cached to localStorage');
                    } catch (e) {
                        console.warn('[AppPreBootstrap] Could not cache logo (storage full?):', e);
                    }
                };
                reader.readAsDataURL(xhr.response);
            }
        };

        xhr.onerror = () => { /* silent */ };
        xhr.ontimeout = () => { /* silent */ };
        xhr.send();
    }

    // ── Utility ────────────────────────────────────────────────────────

    /**
     * Get the document origin (protocol + hostname + port).
     */
    static getDocumentOrigin(): string {
        if (!document.location.origin) {
            return document.location.protocol + '//' + document.location.hostname +
                (document.location.port ? ':' + document.location.port : '');
        }
        return document.location.origin;
    }

    /**
     * Get the base href from the DOM or return '/'.
     */
    static getBaseHref(): string {
        const baseElement = document.querySelector('base[href]');
        if (baseElement) {
            return baseElement.getAttribute('href') || '/';
        }
        return '/';
    }
}
