/**
 * AI Configuration
 * API keys are loaded from localStorage for security.
 * Users must set their keys via the Settings dialog or browser console.
 * 
 * To set keys via console:
 *   localStorage.setItem('ai_openai_key', 'your-api-key');
 *   localStorage.setItem('ai_gemini_key', 'your-api-key');
 *   localStorage.setItem('ai_anthropic_key', 'your-api-key');
 */

// Storage keys for API credentials
const STORAGE_KEYS = {
    OPENAI: 'ai_openai_key',
    GEMINI: 'ai_gemini_key',
    ANTHROPIC: 'ai_anthropic_key',
    AZURE_OPENAI: 'ai_azure_openai_key',
    AZURE_ENDPOINT: 'ai_azure_endpoint',
    AZURE_DEPLOYMENT: 'ai_azure_deployment'
};

/**
 * Get API key from localStorage
 */
function getStoredKey(key: string): string {
    if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key) || '';
    }
    return '';
}

/**
 * Set API key in localStorage
 */
export function setApiKey(provider: 'openai' | 'gemini' | 'anthropic' | 'azure', key: string): void {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI,
        gemini: STORAGE_KEYS.GEMINI,
        anthropic: STORAGE_KEYS.ANTHROPIC,
        azure: STORAGE_KEYS.AZURE_OPENAI
    }[provider];

    if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, key);
    }
}

/**
 * Check if API key is configured for a provider
 */
export function hasApiKey(provider: 'openai' | 'gemini' | 'anthropic' | 'azure'): boolean {
    const storageKey = {
        openai: STORAGE_KEYS.OPENAI,
        gemini: STORAGE_KEYS.GEMINI,
        anthropic: STORAGE_KEYS.ANTHROPIC,
        azure: STORAGE_KEYS.AZURE_OPENAI
    }[provider];

    return !!getStoredKey(storageKey || '');
}

/**
 * AI Configuration object - keys are loaded dynamically from localStorage
 */
export const AI_CONFIG = {
    // Default provider to use
    defaultProvider: 'openai' as const,

    // OpenAI Configuration
    openai: {
        get apiKey(): string { return getStoredKey(STORAGE_KEYS.OPENAI); },
        model: 'gpt-4-turbo',
        endpoint: 'https://api.openai.com/v1/chat/completions'
    },

    // Gemini Configuration
    gemini: {
        get apiKey(): string { return getStoredKey(STORAGE_KEYS.GEMINI); },
        model: 'gemini-pro'
    },

    // Azure OpenAI Configuration
    azureOpenai: {
        get apiKey(): string { return getStoredKey(STORAGE_KEYS.AZURE_OPENAI); },
        get endpoint(): string { return getStoredKey(STORAGE_KEYS.AZURE_ENDPOINT); },
        get deploymentName(): string { return getStoredKey(STORAGE_KEYS.AZURE_DEPLOYMENT); }
    },

    // Anthropic Configuration
    anthropic: {
        get apiKey(): string { return getStoredKey(STORAGE_KEYS.ANTHROPIC); },
        model: 'claude-3-sonnet'
    }
};
