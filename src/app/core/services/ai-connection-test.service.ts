import { Injectable } from '@angular/core';
import { AI_CONFIG, hasApiKey, setApiKey } from '../../features/template-editor/ai-providers/ai-config';

export interface AIConnectionTestResult {
    provider: string;
    connected: boolean;
    apiKeySet: boolean;
    error?: string;
    responseTime?: number;
    model?: string;
}

/**
 * AI Connection Test Service
 * Provides diagnostics and testing for AI provider connections
 */
@Injectable({
    providedIn: 'root'
})
export class AiConnectionTestService {

    /**
     * Test all configured AI providers
     */
    async testAllConnections(): Promise<AIConnectionTestResult[]> {
        const results: AIConnectionTestResult[] = [];

        // Test OpenAI
        results.push(await this.testOpenAI());

        // Test other providers if keys are available
        if (hasApiKey('gemini')) {
            results.push(await this.testGemini());
        }

        if (hasApiKey('anthropic')) {
            results.push(await this.testAnthropic());
        }

        return results;
    }

    /**
     * Test OpenAI connection
     */
    async testOpenAI(): Promise<AIConnectionTestResult> {
        const result: AIConnectionTestResult = {
            provider: 'OpenAI',
            connected: false,
            apiKeySet: hasApiKey('openai'),
            model: AI_CONFIG.openai.model
        };

        if (!result.apiKeySet) {
            result.error = 'API key not configured. Run: localStorage.setItem("ai_openai_key", "your-key")';
            return result;
        }

        const startTime = performance.now();

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Use cheapest model for test
                    messages: [{ role: 'user', content: 'Reply with just "OK"' }],
                    max_tokens: 5
                })
            });

            result.responseTime = Math.round(performance.now() - startTime);

            if (response.ok) {
                const data = await response.json();
                result.connected = true;
                console.log('[AI Test] OpenAI connected successfully:', data.choices?.[0]?.message?.content);
            } else {
                const errorData = await response.json();
                result.error = errorData.error?.message || `HTTP ${response.status}`;
                console.error('[AI Test] OpenAI error:', result.error);
            }
        } catch (error: any) {
            result.error = error.message || 'Network error';
            console.error('[AI Test] OpenAI connection failed:', error);
        }

        return result;
    }

    /**
     * Test Gemini connection
     */
    async testGemini(): Promise<AIConnectionTestResult> {
        const result: AIConnectionTestResult = {
            provider: 'Google Gemini',
            connected: false,
            apiKeySet: hasApiKey('gemini'),
            model: AI_CONFIG.gemini.model
        };

        if (!result.apiKeySet) {
            result.error = 'API key not configured';
            return result;
        }

        const startTime = performance.now();

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Reply with just "OK"' }] }]
                    })
                }
            );

            result.responseTime = Math.round(performance.now() - startTime);

            if (response.ok) {
                result.connected = true;
            } else {
                const errorData = await response.json();
                result.error = errorData.error?.message || `HTTP ${response.status}`;
            }
        } catch (error: any) {
            result.error = error.message || 'Network error';
        }

        return result;
    }

    /**
     * Test Anthropic connection
     */
    async testAnthropic(): Promise<AIConnectionTestResult> {
        const result: AIConnectionTestResult = {
            provider: 'Anthropic',
            connected: false,
            apiKeySet: hasApiKey('anthropic'),
            model: AI_CONFIG.anthropic.model
        };

        // Claude API requires server-side proxy due to CORS
        result.error = 'Anthropic requires server-side proxy (CORS)';
        return result;
    }

    /**
     * Get diagnostic info for debugging
     */
    getDiagnostics(): object {
        return {
            openAI: {
                keySet: hasApiKey('openai'),
                keyPreview: AI_CONFIG.openai.apiKey ? `${AI_CONFIG.openai.apiKey.substring(0, 8)}...` : 'NOT SET',
                model: AI_CONFIG.openai.model,
                endpoint: AI_CONFIG.openai.endpoint
            },
            gemini: {
                keySet: hasApiKey('gemini'),
                model: AI_CONFIG.gemini.model
            },
            anthropic: {
                keySet: hasApiKey('anthropic'),
                model: AI_CONFIG.anthropic.model
            },
            localStorage: {
                ai_openai_key: localStorage.getItem('ai_openai_key') ? 'SET' : 'NOT SET',
                ai_gemini_key: localStorage.getItem('ai_gemini_key') ? 'SET' : 'NOT SET',
                ai_anthropic_key: localStorage.getItem('ai_anthropic_key') ? 'SET' : 'NOT SET'
            }
        };
    }

    /**
     * Quick configure OpenAI key
     */
    setOpenAIKey(key: string): void {
        setApiKey('openai', key);
        console.log('[AI Config] OpenAI key set successfully');
    }

    /**
     * Run and log all tests
     */
    async runDiagnostics(): Promise<void> {
        console.log('============================================');
        console.log('       AI CONNECTION DIAGNOSTICS');
        console.log('============================================');
        console.log('');
        console.log('Configuration Status:');
        console.table(this.getDiagnostics());
        console.log('');
        console.log('Running connection tests...');
        const results = await this.testAllConnections();
        console.log('');
        console.log('Test Results:');
        console.table(results);
        console.log('');
        console.log('============================================');

        if (!hasApiKey('openai')) {
            console.log('');
            console.log('⚠️  OpenAI API key not configured!');
            console.log('');
            console.log('To configure, run in browser console:');
            console.log('  localStorage.setItem("ai_openai_key", "sk-your-api-key")');
            console.log('');
            console.log('Then refresh the page.');
        }
    }
}
