/**
 * VDB (Virtual Database) Module Models
 * 
 * Extracted from legacy service-proxies.ts for modular architecture.
 */

import { PagedResult } from '../../../core/api-client';

// ==================== DTOs ====================

/**
 * Virtual database information.
 */
export interface VirtualDbDto {
    name?: string;
}

/**
 * Row in a virtual database (string value).
 */
export interface VirtualDbRowDto {
    key?: string;
    value?: string;
}

/**
 * Row in a virtual database (JSON value).
 */
export interface VirtualDbRowJTokenDto {
    key?: string;
    value?: any;
}

/**
 * Input for saving to virtual database.
 */
export interface SaveToVirtualDbInput {
    databaseName?: string;
    key?: string;
    innerObject?: any;
    ttl?: number;
}

/**
 * Input for adding property to virtual database.
 */
export interface AddPropertyToVirtualDbInput {
    databaseName?: string;
    key?: string;
    propertyName?: string;
    propertyValue?: any;
}

/**
 * Input for deleting from virtual database.
 */
export interface DeleteFromVirtualDbInput {
    databaseName?: string;
    key?: string;
}

// ==================== Query Parameters ====================

/**
 * Parameters for querying virtual databases.
 */
export interface VdbQueryParams {
    filter?: string;
    sorting?: string;
    skipCount?: number;
    maxResultCount?: number;
}

/**
 * Extended parameters for querying virtual database rows.
 */
export interface VdbRowQueryParams extends VdbQueryParams {
    databaseName?: string;
    filterPropertyKey?: string;
    filterPropertyValue?: string;
    query?: string;
    ignoreOnReadTtlUpdate?: boolean;
}

// ==================== Type Aliases ====================

export type PagedVirtualDbResult = PagedResult<VirtualDbDto>;
export type PagedVirtualDbRowResult = PagedResult<VirtualDbRowDto>;
export type PagedVirtualDbRowJTokenResult = PagedResult<VirtualDbRowJTokenDto>;
