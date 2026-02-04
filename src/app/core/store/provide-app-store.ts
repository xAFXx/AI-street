import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { AppConfig } from './app-config.model';
import { APP_CONFIG } from './app-store.tokens';
import { AppStoreService } from './app-store.service';
import { ThemeService } from './theme.service';

/**
 * Provide App Store for an Angular application
 * 
 * This is the main entry point for consuming applications.
 * Call this in your app.config.ts to configure the entire app store.
 * 
 * @example
 * ```typescript
 * // In app.config.ts
 * import { provideAppStore } from './core/store';
 * import { apprxConfig } from './config/apprx.config';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAppStore(apprxConfig),
 *     // ... other providers
 *   ]
 * };
 * ```
 */
export function provideAppStore(config: AppConfig): EnvironmentProviders {
    return makeEnvironmentProviders([
        // Provide the configuration
        { provide: APP_CONFIG, useValue: config },

        // Initialize store and theme on app bootstrap
        {
            provide: APP_INITIALIZER,
            useFactory: (store: AppStoreService, theme: ThemeService) => {
                return () => {
                    // Initialize store with config
                    store.initialize(config);

                    // Apply theme
                    theme.applyTheme();

                    console.log(`[AppStore] Application initialized: ${config.appName}`);

                    return Promise.resolve();
                };
            },
            deps: [AppStoreService, ThemeService],
            multi: true
        }
    ]);
}

/**
 * Merge partial config with defaults
 * Useful for development/testing overrides
 */
export function mergeConfig(base: AppConfig, overrides: Partial<AppConfig>): AppConfig {
    return {
        ...base,
        ...overrides,
        features: { ...base.features, ...overrides.features },
        theme: { ...base.theme, ...overrides.theme },
        auth: { ...base.auth, ...overrides.auth },
        api: { ...base.api, ...overrides.api }
    };
}
