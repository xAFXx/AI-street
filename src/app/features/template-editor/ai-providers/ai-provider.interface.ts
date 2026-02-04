import { Observable } from 'rxjs';
import { AiAnalysisResult, UploadedDocument } from '../models/template-config.model';

/**
 * AI Provider Configuration
 */
export interface AiProviderConfig {
    name: string;
    apiKey?: string;
    endpoint?: string;
    model?: string;
    options?: Record<string, any>;
}

/**
 * Document Analysis Request
 */
export interface DocumentAnalysisRequest {
    documents: UploadedDocument[];
    files?: File[]; // Actual file objects for reading content
    instructions?: string;
    outputFormat?: 'chapters' | 'summary' | 'full';
}

/**
 * Abstract AI Provider Interface
 * Implement this interface to add support for different AI services
 */
export abstract class AiDocumentAnalyzer {
    abstract readonly providerName: string;
    abstract readonly version: string;

    /**
     * Initialize the provider with configuration
     */
    abstract initialize(config: AiProviderConfig): void;

    /**
     * Analyze uploaded documents and extract structure
     */
    abstract analyzeDocuments(request: DocumentAnalysisRequest): Observable<AiAnalysisResult>;

    /**
     * Validate AI summary field content
     */
    abstract validateSummaryField(fieldLabel: string, fieldValue: string): Observable<{
        valid: boolean;
        suggestions?: string[];
        confidence: number;
    }>;

    /**
     * Generate constraints for a content block based on its type and context
     */
    abstract generateConstraints(blockType: string, context: string): Observable<string[]>;

    /**
     * Check if provider is properly configured and ready
     */
    abstract isReady(): boolean;
}

/**
 * Available AI Providers
 */
export type AiProviderType = 'mock' | 'openai' | 'gemini' | 'azure-openai' | 'anthropic';

/**
 * AI Provider Registry Entry
 */
export interface AiProviderInfo {
    type: AiProviderType;
    name: string;
    description: string;
    requiresApiKey: boolean;
    configFields: {
        key: string;
        label: string;
        type: 'text' | 'password' | 'select';
        required: boolean;
        options?: string[];
    }[];
}

/**
 * Available providers registry
 */
export const AI_PROVIDERS: AiProviderInfo[] = [
    {
        type: 'mock',
        name: 'Mock AI (Demo)',
        description: 'Simulated AI for testing and demonstration purposes',
        requiresApiKey: false,
        configFields: []
    },
    {
        type: 'openai',
        name: 'OpenAI GPT',
        description: 'OpenAI GPT-4 for document analysis',
        requiresApiKey: true,
        configFields: [
            { key: 'apiKey', label: 'API Key', type: 'password', required: true },
            { key: 'model', label: 'Model', type: 'select', required: true, options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] }
        ]
    },
    {
        type: 'gemini',
        name: 'Google Gemini',
        description: 'Google Gemini Pro for document analysis',
        requiresApiKey: true,
        configFields: [
            { key: 'apiKey', label: 'API Key', type: 'password', required: true },
            { key: 'model', label: 'Model', type: 'select', required: true, options: ['gemini-pro', 'gemini-pro-vision'] }
        ]
    },
    {
        type: 'azure-openai',
        name: 'Azure OpenAI',
        description: 'Azure-hosted OpenAI for enterprise use',
        requiresApiKey: true,
        configFields: [
            { key: 'apiKey', label: 'API Key', type: 'password', required: true },
            { key: 'endpoint', label: 'Endpoint URL', type: 'text', required: true },
            { key: 'deploymentName', label: 'Deployment Name', type: 'text', required: true }
        ]
    },
    {
        type: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Anthropic Claude for document analysis',
        requiresApiKey: true,
        configFields: [
            { key: 'apiKey', label: 'API Key', type: 'password', required: true },
            { key: 'model', label: 'Model', type: 'select', required: true, options: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] }
        ]
    }
];
