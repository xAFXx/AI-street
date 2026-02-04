import { InjectionToken } from '@angular/core';
import { AppConfig } from './app-config.model';

/**
 * Injection token for providing AppConfig
 * 
 * Usage:
 * ```typescript
 * providers: [
 *   { provide: APP_CONFIG, useValue: myAppConfig }
 * ]
 * ```
 */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/**
 * Storage key for session persistence
 */
export const SESSION_STORAGE_KEY = 'app_store_session';

/**
 * Storage key for user preferences
 */
export const PREFERENCES_STORAGE_KEY = 'app_store_preferences';
