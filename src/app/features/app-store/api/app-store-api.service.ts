import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from '../../../core/api-client';
import {
    AppDefinitionDto,
    AppListDto,
    AppAssignmentDto,
    AppAssignmentOutput,
    CreateAppInput,
    CreateOrEditAppInput,
    EntityDtoOfGuid,
    ListResultOfAppListDto,
    ListResultOfAppAssignmentDto
} from './app-store.models';

/**
 * ABP wrapper response interface.
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
 * App Store API Service
 * 
 * Module-specific service wrapper for App Store backend endpoints.
 * Uses the shared BaseApiService for HTTP operations.
 * Extracts results from ABP wrapper responses.
 * 
 * Follows the same pattern as VdbApiService.
 */
@Injectable({ providedIn: 'root' })
export class AppStoreApiService {
    private readonly api = inject(BaseApiService);

    /** API path prefix for App Store endpoints */
    private readonly basePath = '/api/services/app/AppStore';

    // ==================== Catalog Operations ====================

    /**
     * Get list of available apps from the server catalog.
     * @param onlyNotInstalled If true, only returns apps not yet installed for this tenant.
     */
    getAppCatalog(onlyNotInstalled?: boolean): Observable<AppListDto[]> {
        const params: Record<string, any> = {};
        if (onlyNotInstalled !== undefined) {
            params['onlyNotInstalledApps'] = onlyNotInstalled;
        }

        return this.api.get<AbpResponse<ListResultOfAppListDto>>(
            `${this.basePath}/GetList`,
            params
        ).pipe(
            map(response => response.result?.items ?? [])
        );
    }

    /**
     * Get a single app definition by ID.
     */
    getAppDefinition(id: string): Observable<AppDefinitionDto> {
        return this.api.get<AbpResponse<AppDefinitionDto>>(
            `${this.basePath}/Get`,
            { id }
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Search apps by query string (Phase 3 new endpoint).
     * Falls back to client-side filtering until backend is extended.
     */
    searchApps(query: string, category?: string): Observable<AppListDto[]> {
        const params: Record<string, any> = { query };
        if (category) params['category'] = category;

        return this.api.get<AbpResponse<ListResultOfAppListDto>>(
            `${this.basePath}/SearchApps`,
            params
        ).pipe(
            map(response => response.result?.items ?? [])
        );
    }

    // ==================== Installed Apps ====================

    /**
     * Get list of apps installed for the current tenant.
     * @param onlyNotInstalled Filter parameter (passed through to backend).
     */
    getInstalledApps(onlyNotInstalled?: boolean): Observable<AppAssignmentDto[]> {
        const params: Record<string, any> = {};
        if (onlyNotInstalled !== undefined) {
            params['onlyNotInstalledApps'] = onlyNotInstalled;
        }

        return this.api.get<AbpResponse<ListResultOfAppAssignmentDto>>(
            `${this.basePath}/GetAppAssignedList`,
            params
        ).pipe(
            map(response => response.result?.items ?? [])
        );
    }

    /**
     * Get a single installed app by its assignment ID.
     */
    getInstalledAppById(id: string): Observable<AppAssignmentDto> {
        return this.api.get<AbpResponse<AppAssignmentDto>>(
            `${this.basePath}/GetById`,
            { Id: id }
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Get a single installed app by its name.
     */
    getInstalledAppByName(name: string): Observable<AppAssignmentDto> {
        return this.api.get<AbpResponse<AppAssignmentDto>>(
            `${this.basePath}/GetByName`,
            { Id: name }
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Get app store health/status.
     */
    getStatus(): Observable<void> {
        return this.api.get<AbpResponse<void>>(
            `${this.basePath}/GetStatus`
        ).pipe(
            map(() => undefined)
        );
    }

    // ==================== Install / Uninstall ====================

    /**
     * Install an app for the current tenant (assign to tenant).
     * @param appDefinitionId The app definition ID to install.
     */
    installApp(appDefinitionId: string): Observable<AppAssignmentOutput> {
        const body: EntityDtoOfGuid = { id: appDefinitionId };

        return this.api.post<AbpResponse<AppAssignmentOutput>>(
            `${this.basePath}/AddToTenant`,
            body
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Uninstall an app from the current tenant.
     * @param assignmentId The tenant assignment ID.
     */
    uninstallApp(assignmentId: string): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/RemoveFromTenant`,
            { Id: assignmentId }
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Remove and save (uninstall with cleanup).
     * @param appTenantAssignmentId The tenant assignment ID.
     */
    removeAndSave(appTenantAssignmentId: string): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/RemoveAndSave`,
            { appTenantAssignmentId }
        ).pipe(
            map(() => undefined)
        );
    }

    // ==================== App Definition CRUD ====================

    /**
     * Create a new app definition.
     */
    createAppDefinition(input: CreateAppInput): Observable<AppListDto> {
        return this.api.post<AbpResponse<AppListDto>>(
            `${this.basePath}/Create`,
            input
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Edit an existing app definition.
     */
    editAppDefinition(input: CreateOrEditAppInput): Observable<AppListDto> {
        return this.api.post<AbpResponse<AppListDto>>(
            `${this.basePath}/Edit`,
            input
        ).pipe(
            map(response => response.result)
        );
    }

    /**
     * Remove an application property from an app definition.
     */
    removeApplicationProperty(appId: string, propertyId: string): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/RemoveApplicationProperty`,
            { appId, propertyId }
        ).pipe(
            map(() => undefined)
        );
    }
}
