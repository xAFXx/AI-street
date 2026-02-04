import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, PaginationParams } from '../../../core/api-client';
import {
    VirtualDbDto,
    VirtualDbRowDto,
    VirtualDbRowJTokenDto,
    SaveToVirtualDbInput,
    AddPropertyToVirtualDbInput,
    DeleteFromVirtualDbInput,
    VdbRowQueryParams,
    PagedVirtualDbResult,
    PagedVirtualDbRowResult,
    PagedVirtualDbRowJTokenResult
} from './vdb.models';

/**
 * ABP wrapper response interface
 */
interface AbpResponse<T> {
    result: T;
    success: boolean;
    error: any;
    targetUrl: string | null;
    unAuthorizedRequest: boolean;
    __abp: boolean;
}

/**
 * VDB (Virtual Database) API Service
 * 
 * Module-specific service wrapper for VDB backend endpoints.
 * Uses the shared BaseApiService for HTTP operations.
 * Extracts results from ABP wrapper responses.
 */
@Injectable()
export class VdbApiService {
    private readonly api = inject(BaseApiService);

    /** API path prefix for VDB endpoints */
    private readonly basePath = '/api/services/app/VDB';

    // ==================== Database Operations ====================

    /**
     * Get list of virtual databases with pagination.
     */
    getVirtualDbs(params?: PaginationParams): Observable<PagedVirtualDbResult> {
        const queryParams: Record<string, string> = {};
        if (params?.maxResultCount) queryParams['MaxResultCount'] = params.maxResultCount.toString();
        if (params?.skipCount) queryParams['SkipCount'] = params.skipCount.toString();
        if (params?.sorting) queryParams['Sorting'] = params.sorting;
        if (params?.filter) queryParams['Filter'] = params.filter;

        return this.api.get<AbpResponse<PagedVirtualDbResult>>(
            `${this.basePath}/GetVirtualDbs`,
            queryParams
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Save data to virtual database.
     */
    saveToVirtualDb(input: SaveToVirtualDbInput): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/SaveToVirtualDb`,
            input
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Save data to virtual database as array element.
     */
    saveToVirtualDbInArray(input: SaveToVirtualDbInput): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/SaveToVirtualDbInArray`,
            input
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Delete virtual database.
     */
    deleteVirtualDb(databaseName: string): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/DeleteVirtualDb`,
            { DatabaseName: databaseName }
        ).pipe(
            map(() => undefined)
        );
    }

    // ==================== Row Operations ====================

    /**
     * Get rows from virtual database.
     */
    getVirtualDbRows(params: VdbRowQueryParams): Observable<PagedVirtualDbRowResult> {
        return this.api.get<AbpResponse<PagedVirtualDbRowResult>>(
            `${this.basePath}/GetVirtualDbRows`,
            this.buildRowQueryParams(params)
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Get rows from virtual database as JSON objects.
     */
    getVirtualDbRowsAsObject(params: VdbRowQueryParams): Observable<PagedVirtualDbRowJTokenResult> {
        return this.api.get<AbpResponse<PagedVirtualDbRowJTokenResult>>(
            `${this.basePath}/GetVirtualDbRowsAsObject`,
            this.buildRowQueryParams(params)
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Search virtual database rows.
     */
    getSearchVirtualDbRows(params: VdbRowQueryParams): Observable<PagedVirtualDbRowResult> {
        return this.api.get<AbpResponse<PagedVirtualDbRowResult>>(
            `${this.basePath}/GetSearchVirtualDbRows`,
            this.buildRowQueryParams(params)
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Search virtual database rows as JSON objects.
     */
    getSearchVirtualDbRowsAsObject(params: VdbRowQueryParams): Observable<PagedVirtualDbRowJTokenResult> {
        return this.api.get<AbpResponse<PagedVirtualDbRowJTokenResult>>(
            `${this.basePath}/GetSearchVirtualDbRowsAsObject`,
            this.buildRowQueryParams(params)
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Delete row from virtual database.
     */
    deleteFromVirtualDb(input: DeleteFromVirtualDbInput): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/DeleteFromVirtualDb`,
            {
                DatabaseName: input.databaseName,
                Key: input.key
            }
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Add property to existing virtual database row.
     */
    addPropertyToVirtualDb(input: AddPropertyToVirtualDbInput): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/AddPropertyToVirtualDb`,
            input
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Delete row from virtual database by name and key.
     * Convenience method that wraps deleteFromVirtualDb.
     */
    deleteVirtualDbRow(databaseName: string, key: string): Observable<void> {
        return this.deleteFromVirtualDb({ databaseName, key });
    }

    // ==================== Private Helpers ====================

    private buildRowQueryParams(params: VdbRowQueryParams): Record<string, any> {
        const result: Record<string, any> = {};

        if (params.filter) result['Filter'] = params.filter;
        if (params.databaseName) result['DatabaseName'] = params.databaseName;
        if (params.filterPropertyKey) result['FilterPropertyKey'] = params.filterPropertyKey;
        if (params.filterPropertyValue) result['FilterPropertyValue'] = params.filterPropertyValue;
        if (params.query) result['Query'] = params.query;
        if (params.ignoreOnReadTtlUpdate !== undefined) result['IgnoreOnReadTtlUpdate'] = params.ignoreOnReadTtlUpdate;
        if (params.sorting) result['Sorting'] = params.sorting;
        if (params.skipCount !== undefined) result['SkipCount'] = params.skipCount;
        if (params.maxResultCount !== undefined) result['MaxResultCount'] = params.maxResultCount;

        return result;
    }
}
