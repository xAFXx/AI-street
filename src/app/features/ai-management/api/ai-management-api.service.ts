import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from '../../../core/api-client';
import {
    AIAgentDto,
    CreateAIAgentInput,
    UpdateAIAgentInput,
    AIAgentQueryParams,
    PagedAIAgentResult
} from './ai-management.models';

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
 * AI Management API Service
 * 
 * Module-specific service wrapper for AI agent backend endpoints.
 * Uses the shared BaseApiService for HTTP operations.
 */
@Injectable()
export class AIManagementApiService {
    private readonly api = inject(BaseApiService);

    /** API path prefix for AI Management endpoints */
    private readonly basePath = '/api/services/app/AIManagement';

    // ==================== Agent CRUD ====================

    /**
     * Get paginated list of AI agents.
     */
    getAIAgents(params?: AIAgentQueryParams): Observable<PagedAIAgentResult> {
        const queryParams: Record<string, string> = {};
        if (params?.filter) queryParams['Filter'] = params.filter;
        if (params?.sorting) queryParams['Sorting'] = params.sorting;
        if (params?.skipCount !== undefined) queryParams['SkipCount'] = params.skipCount.toString();
        if (params?.maxResultCount !== undefined) queryParams['MaxResultCount'] = params.maxResultCount.toString();

        return this.api.get<AbpResponse<PagedAIAgentResult>>(
            `${this.basePath}/GetAIAgents`,
            queryParams
        ).pipe(
            map(response => response.result ?? { items: [], totalCount: 0 })
        );
    }

    /**
     * Create a new AI agent.
     */
    createAIAgent(input: CreateAIAgentInput): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/CreateAIAgent`,
            input
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Update an existing AI agent.
     */
    updateAIAgent(input: UpdateAIAgentInput): Observable<void> {
        return this.api.put<AbpResponse<void>>(
            `${this.basePath}/UpdateAIAgent`,
            input
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Delete an AI agent by ID.
     */
    deleteAIAgent(id: string): Observable<void> {
        return this.api.delete<AbpResponse<void>>(
            `${this.basePath}/DeleteAIAgent`,
            { Id: id }
        ).pipe(
            map(() => undefined)
        );
    }

    // ==================== Reset Operations ====================

    /**
     * Reset a single AI agent model.
     */
    resetAIModel(id: string): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/ResetAIModel`,
            { id }
        ).pipe(
            map(() => undefined)
        );
    }

    /**
     * Reset all AI agent models.
     */
    resetAllAIModels(): Observable<void> {
        return this.api.post<AbpResponse<void>>(
            `${this.basePath}/ResetAllAIModels`,
            {}
        ).pipe(
            map(() => undefined)
        );
    }
}
