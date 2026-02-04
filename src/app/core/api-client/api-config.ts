import { InjectionToken } from '@angular/core';

/**
 * Injection token for the API base URL.
 * Can be configured per-module or globally.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * Injection token for module-specific API configuration.
 */
export const MODULE_API_CONFIG = new InjectionToken<ModuleApiConfig>('MODULE_API_CONFIG');

/**
 * Configuration for a module's API endpoints.
 */
export interface ModuleApiConfig {
    /** Base URL for API calls (overrides global if set) */
    baseUrl?: string;

    /** API path prefix (e.g., '/api/services/app/VDB') */
    pathPrefix: string;

    /** Whether to use authentication */
    useAuth?: boolean;
}

/**
 * Standard paged result structure from ABP backend.
 */
export interface PagedResult<T> {
    items: T[];
    totalCount: number;
}

/**
 * Standard API error response.
 */
export interface ApiError {
    code: string;
    message: string;
    details?: string;
    validationErrors?: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
}
