import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

export interface AppConfig {
    remoteServiceBaseUrl: string;
    appBaseUrl: string;
    applicationName: string;
    localeMappings: {
        angular: { from: string; to: string }[];
        moment: { from: string; to: string }[];
        recaptcha: { from: string; to: string }[];
    };
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    private http = inject(HttpClient);

    private configSubject = new BehaviorSubject<AppConfig | null>(null);
    config$ = this.configSubject.asObservable();

    private _config: AppConfig | null = null;
    private _tenancyName: string = '';

    get config(): AppConfig | null {
        return this._config;
    }

    get tenancyName(): string {
        return this._tenancyName;
    }

    get remoteServiceBaseUrl(): string {
        return this._config?.remoteServiceBaseUrl?.replace('{TENANCY_NAME}', this._tenancyName) || '';
    }

    get appBaseUrl(): string {
        return this._config?.appBaseUrl?.replace('{TENANCY_NAME}', this._tenancyName) || '';
    }

    /**
     * Load the app configuration from assets/appconfig.json
     * This should be called during app initialization
     */
    loadConfig(): Observable<AppConfig> {
        return this.http.get<AppConfig>('/assets/appconfig.json').pipe(
            tap((config) => {
                this._config = config;
                this.configSubject.next(config);
            }),
            catchError((error) => {
                console.error('Failed to load app configuration:', error);
                // Return a default config if loading fails
                const defaultConfig: AppConfig = {
                    remoteServiceBaseUrl: 'https://dev_demo-connectapi.plattform.nl',
                    appBaseUrl: 'https://dev_demo.plattform.nl',
                    applicationName: 'APPRX True North',
                    localeMappings: { angular: [], moment: [], recaptcha: [] }
                };
                this._config = defaultConfig;
                this.configSubject.next(defaultConfig);
                return of(defaultConfig);
            })
        );
    }

    /**
     * Set the tenancy name - this resolves the {TENANCY_NAME} placeholder in URLs
     * Can be extracted from the hostname or set manually
     */
    setTenancyName(tenancyName: string): void {
        this._tenancyName = tenancyName;
        // Update the subject to notify subscribers
        if (this._config) {
            this.configSubject.next(this._config);
        }
    }

    /**
     * Extract tenancy name from the current hostname
     * Expected format: dev_TENANCYNAME.apprx.eu or TENANCYNAME.apprx.eu
     */
    extractTenancyFromHostname(): string {
        const hostname = window.location.hostname;

        // Handle localhost for development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Default to 'demo' or get from localStorage if set
            return localStorage.getItem('tenancy_name') || 'demo';
        }

        // Try to extract from hostname pattern: dev_TENANT.domain or TENANT.domain
        // Supports plattform.nl, apprx.eu, and ai-street.eu
        const patterns = [
            /^dev_([^.]+)\.(plattform\.nl|apprx\.eu|ai-street\.eu)$/,  // dev_tenant.domain
            /^([^.]+)\.(plattform\.nl|apprx\.eu|ai-street\.eu)$/,       // tenant.domain
            /^dev_([^.]+)-connect/,       // dev_tenant-connectapi.domain
            /^([^.]+)-connect/            // tenant-connectapi.domain
        ];

        for (const pattern of patterns) {
            const match = hostname.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Fallback to first subdomain part
        const parts = hostname.split('.');
        if (parts.length > 0) {
            const firstPart = parts[0];
            // Remove 'dev_' prefix if present
            return firstPart.replace(/^dev_/, '');
        }

        return 'demo';
    }

    /**
     * Initialize the configuration with automatic tenancy detection
     */
    initializeWithAutoDetection(): Observable<AppConfig> {
        return this.loadConfig().pipe(
            tap(() => {
                const tenancy = this.extractTenancyFromHostname();
                this.setTenancyName(tenancy);
                console.log(`App configured for tenancy: ${tenancy}`);
                console.log(`API URL: ${this.remoteServiceBaseUrl}`);
            })
        );
    }

    /**
     * Manually set tenancy (useful for login screen where user selects tenant)
     */
    initializeWithTenancy(tenancyName: string): Observable<AppConfig> {
        return this.loadConfig().pipe(
            tap(() => {
                this.setTenancyName(tenancyName);
                localStorage.setItem('tenancy_name', tenancyName);
                console.log(`App configured for tenancy: ${tenancyName}`);
                console.log(`API URL: ${this.remoteServiceBaseUrl}`);
            })
        );
    }
}
