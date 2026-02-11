import { Injectable, signal, computed } from '@angular/core';

/**
 * Rate limit information from OpenAI response headers
 */
export interface RateLimitInfo {
    requestsPerMinute: number;
    remainingRequests: number;
    tokensPerMinute: number;
    remainingTokens: number;
    resetRequests?: string;
    resetTokens?: string;
}

/**
 * AI Provider status
 */
export interface AiProviderStatus {
    provider: 'openai' | 'gemini' | 'anthropic' | 'azure';
    displayName: string;
    icon: string;
    lastUsed: Date;
    rateLimits: RateLimitInfo | null;
    sessionUsage: {
        requests: number;
        estimatedTokens: number;
    };
}

const STORAGE_KEY = 'ai_provider_status';

const PROVIDER_DISPLAY = {
    openai: { displayName: 'OpenAI', icon: 'pi pi-bolt' },
    gemini: { displayName: 'Gemini', icon: 'pi pi-star' },
    anthropic: { displayName: 'Claude', icon: 'pi pi-comment' },
    azure: { displayName: 'Azure OpenAI', icon: 'pi pi-microsoft' }
};

/**
 * AI Status Service
 * 
 * Tracks AI provider usage, rate limits, and session statistics.
 * Updates after each AI call with info from response headers.
 */
@Injectable({
    providedIn: 'root'
})
export class AiStatusService {
    // Provider status map (supports multiple providers)
    private _providers = signal<Map<string, AiProviderStatus>>(new Map());

    // Last used provider
    private _lastUsedProvider = signal<string | null>(this.loadLastUsed());

    // Computed: current active provider status
    readonly activeProvider = computed(() => {
        const lastUsed = this._lastUsedProvider();
        if (!lastUsed) return null;
        return this._providers().get(lastUsed) || null;
    });

    // Computed: has any active provider
    readonly hasActiveProvider = computed(() => this._lastUsedProvider() !== null);

    // Computed: all providers (for future multi-provider view)
    readonly allProviders = computed(() => Array.from(this._providers().values()));

    constructor() {
        console.log('[AiStatusService] Initialized');
    }

    /**
     * Update provider status after an AI call
     * Call this from AI services after each request, passing response headers
     */
    updateFromResponse(
        provider: 'openai' | 'gemini' | 'anthropic' | 'azure',
        headers: Headers | null,
        estimatedTokens: number = 0
    ): void {
        const current = this._providers().get(provider);

        // Parse rate limits from headers (OpenAI format)
        let rateLimits: RateLimitInfo | null = null;
        if (headers) {
            rateLimits = this.parseRateLimitHeaders(headers);
        }

        const status: AiProviderStatus = {
            provider,
            displayName: PROVIDER_DISPLAY[provider]?.displayName || provider,
            icon: PROVIDER_DISPLAY[provider]?.icon || 'pi pi-cog',
            lastUsed: new Date(),
            rateLimits: rateLimits || current?.rateLimits || null,
            sessionUsage: {
                requests: (current?.sessionUsage.requests || 0) + 1,
                estimatedTokens: (current?.sessionUsage.estimatedTokens || 0) + estimatedTokens
            }
        };

        // Update providers map
        this._providers.update(map => {
            const newMap = new Map(map);
            newMap.set(provider, status);
            return newMap;
        });

        // Update last used
        this._lastUsedProvider.set(provider);
        this.saveLastUsed(provider);

        console.log(`[AiStatusService] Updated ${provider}:`, status);
    }

    /**
     * Parse rate limit headers from OpenAI response
     */
    private parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
        const requestLimit = headers.get('x-ratelimit-limit-requests');
        const remainingRequests = headers.get('x-ratelimit-remaining-requests');
        const tokenLimit = headers.get('x-ratelimit-limit-tokens');
        const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
        const resetRequests = headers.get('x-ratelimit-reset-requests');
        const resetTokens = headers.get('x-ratelimit-reset-tokens');

        // Only return if we have at least some data
        if (!requestLimit && !tokenLimit) {
            return null;
        }

        return {
            requestsPerMinute: parseInt(requestLimit || '0', 10),
            remainingRequests: parseInt(remainingRequests || '0', 10),
            tokensPerMinute: parseInt(tokenLimit || '0', 10),
            remainingTokens: parseInt(remainingTokens || '0', 10),
            resetRequests: resetRequests || undefined,
            resetTokens: resetTokens || undefined
        };
    }

    /**
     * Get status for a specific provider
     */
    getProviderStatus(provider: string): AiProviderStatus | null {
        return this._providers().get(provider) || null;
    }

    /**
     * Reset session usage (call on app start or user reset)
     */
    resetSessionUsage(): void {
        this._providers.update(map => {
            const newMap = new Map(map);
            for (const [key, status] of newMap) {
                newMap.set(key, {
                    ...status,
                    sessionUsage: { requests: 0, estimatedTokens: 0 }
                });
            }
            return newMap;
        });
        console.log('[AiStatusService] Session usage reset');
    }

    /**
     * Clear all provider data
     */
    clearAll(): void {
        this._providers.set(new Map());
        this._lastUsedProvider.set(null);
        localStorage.removeItem(STORAGE_KEY);
        console.log('[AiStatusService] All data cleared');
    }

    // ==================== Persistence ====================

    private loadLastUsed(): string | null {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
    }

    private saveLastUsed(provider: string): void {
        try {
            localStorage.setItem(STORAGE_KEY, provider);
        } catch {
            // Ignore storage errors
        }
    }
}
