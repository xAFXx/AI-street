import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, map } from 'rxjs';
import { BaseApiService } from '../../core/api-client';
import { AIAgentDto } from '../../features/ai-management/api/ai-management.models';

/**
 * ABP wrapper response interface.
 */
interface AbpResponse<T> {
    result: T;
    success: boolean;
    error: any;
}

interface PagedResult {
    items: AIAgentDto[];
    totalCount: number;
}

/**
 * Shared Agent Service
 *
 * Provides access to AI agents across the application.
 * Caches the agent list to avoid redundant API calls.
 */
@Injectable({ providedIn: 'root' })
export class AgentService {
    private readonly api = inject(BaseApiService);
    private readonly basePath = '/api/services/app/AIManagement';

    /** Cached observable of enabled agents */
    private agents$?: Observable<AIAgentDto[]>;

    /**
     * Get all enabled AI agents, cached for repeat access.
     * Call `invalidateCache()` after mutations.
     */
    getAgents(): Observable<AIAgentDto[]> {
        if (!this.agents$) {
            this.agents$ = this.api.get<AbpResponse<PagedResult>>(
                `${this.basePath}/GetAIAgents`,
                { MaxResultCount: '200' }
            ).pipe(
                map(res => (res.result?.items ?? []).filter(a => a.enabled)),
                shareReplay(1)
            );
        }
        return this.agents$;
    }

    /** Clear the cache (e.g. after creating/editing agents) */
    invalidateCache(): void {
        this.agents$ = undefined;
    }
}
