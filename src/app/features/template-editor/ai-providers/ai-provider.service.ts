import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import {
    AiDocumentAnalyzer,
    AiProviderConfig,
    AiProviderType,
    AI_PROVIDERS,
    DocumentAnalysisRequest
} from './ai-provider.interface';
import { MockAiProvider } from './mock-ai.provider';
import { OpenAiProvider } from './openai.provider';
import { AiAnalysisResult } from '../models/template-config.model';
import { AI_CONFIG } from './ai-config';

/**
 * AI Provider Service
 * Factory and manager for AI document analysis providers
 * 
 * Usage:
 * 1. Set the provider type: aiService.setProvider('openai', { apiKey: '...' })
 * 2. Call analyze: aiService.analyzeDocuments(request)
 */
@Injectable({
    providedIn: 'root'
})
export class AiProviderService {
    private currentProvider: AiDocumentAnalyzer;
    private currentProviderType$ = new BehaviorSubject<AiProviderType>(AI_CONFIG.defaultProvider);
    private providerConfig$ = new BehaviorSubject<AiProviderConfig | null>(null);

    // Provider instances
    private providers: Map<AiProviderType, AiDocumentAnalyzer> = new Map();

    constructor() {
        // Initialize available providers
        this.providers.set('mock', new MockAiProvider());
        this.providers.set('openai', new OpenAiProvider());
        // Add more providers here as they're implemented
        // this.providers.set('gemini', new GeminiProvider());
        // this.providers.set('azure-openai', new AzureOpenAiProvider());
        // this.providers.set('anthropic', new AnthropicProvider());

        // Initialize with configured default provider (OpenAI with API key)
        this.currentProvider = this.providers.get(AI_CONFIG.defaultProvider)!;
        this.currentProvider.initialize({
            name: AI_CONFIG.defaultProvider,
            apiKey: AI_CONFIG.openai.apiKey,
            model: AI_CONFIG.openai.model,
            endpoint: AI_CONFIG.openai.endpoint
        });

        console.log(`AI Provider initialized: ${this.currentProvider.providerName} (${AI_CONFIG.openai.model})`);
    }

    /**
     * Get list of available AI providers
     */
    getAvailableProviders() {
        return AI_PROVIDERS;
    }

    /**
     * Get current provider type
     */
    getCurrentProviderType(): Observable<AiProviderType> {
        return this.currentProviderType$.asObservable();
    }

    /**
     * Get current provider type synchronously
     */
    getCurrentProviderTypeSync(): AiProviderType {
        return this.currentProviderType$.value;
    }

    /**
     * Get current provider configuration
     */
    getCurrentConfig(): Observable<AiProviderConfig | null> {
        return this.providerConfig$.asObservable();
    }

    /**
     * Set the active AI provider
     */
    setProvider(type: AiProviderType, config: Partial<AiProviderConfig> = {}): boolean {
        const provider = this.providers.get(type);

        if (!provider) {
            console.warn(`AI Provider "${type}" is not implemented yet`);
            return false;
        }

        const fullConfig: AiProviderConfig = {
            name: type,
            ...config
        };

        provider.initialize(fullConfig);
        this.currentProvider = provider;
        this.currentProviderType$.next(type);
        this.providerConfig$.next(fullConfig);

        // Persist to localStorage for user convenience
        this.saveProviderConfig(type, fullConfig);

        return true;
    }

    /**
     * Check if current provider is ready
     */
    isReady(): boolean {
        return this.currentProvider.isReady();
    }

    /**
     * Get current provider info
     */
    getCurrentProviderInfo() {
        return {
            name: this.currentProvider.providerName,
            version: this.currentProvider.version,
            ready: this.currentProvider.isReady()
        };
    }

    /**
     * Analyze documents using current provider
     */
    analyzeDocuments(request: DocumentAnalysisRequest): Observable<AiAnalysisResult> {
        return this.currentProvider.analyzeDocuments(request);
    }

    /**
     * Validate AI summary field
     */
    validateSummaryField(fieldLabel: string, fieldValue: string): Observable<{
        valid: boolean;
        suggestions?: string[];
        confidence: number;
    }> {
        return this.currentProvider.validateSummaryField(fieldLabel, fieldValue);
    }

    /**
     * Generate constraints for a block
     */
    generateConstraints(blockType: string, context: string): Observable<string[]> {
        return this.currentProvider.generateConstraints(blockType, context);
    }

    /**
     * Load saved provider configuration from localStorage
     */
    loadSavedConfig(): void {
        try {
            const saved = localStorage.getItem('ai-provider-config');
            if (saved) {
                const { type, config } = JSON.parse(saved);
                this.setProvider(type, config);
            }
        } catch (error) {
            console.warn('Failed to load saved AI provider config:', error);
        }
    }

    /**
     * Save provider configuration to localStorage
     */
    private saveProviderConfig(type: AiProviderType, config: AiProviderConfig): void {
        try {
            // Don't save sensitive data like API keys to localStorage in production
            // This is for demo purposes only
            const safeConfig = { ...config };
            if (type !== 'mock') {
                // In production, you might want to store these securely or not at all
                delete safeConfig.apiKey;
            }
            localStorage.setItem('ai-provider-config', JSON.stringify({ type, config: safeConfig }));
        } catch (error) {
            console.warn('Failed to save AI provider config:', error);
        }
    }

    /**
     * Clear saved configuration
     */
    clearSavedConfig(): void {
        localStorage.removeItem('ai-provider-config');
        this.setProvider('mock', {});
    }
}
