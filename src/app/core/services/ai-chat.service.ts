import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AI_CONFIG, hasApiKey } from '../../features/template-editor/ai-providers/ai-config';

/**
 * Chat message model
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

/**
 * Chat context for different usage scenarios
 */
export interface ChatContext {
    id: string;
    systemPrompt: string;
    messages: ChatMessage[];
}

/**
 * AI Chat Service
 * Provides conversational AI capabilities using OpenAI API
 */
@Injectable({
    providedIn: 'root'
})
export class AiChatService {
    private apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    private model = 'gpt-4o';

    // Active contexts for different chat instances
    private contexts = new Map<string, BehaviorSubject<ChatContext>>();

    // Global loading state
    private isLoading$ = new BehaviorSubject<boolean>(false);

    /**
     * Set the AI model to use
     */
    setModel(model: string): void {
        this.model = model;
        console.log('[AiChatService] Model set to:', model);
    }

    /**
     * Get current model
     */
    getModel(): string {
        return this.model;
    }

    /**
     * Get or create a chat context
     */
    getContext(contextId: string, systemPrompt: string = ''): Observable<ChatContext> {
        if (!this.contexts.has(contextId)) {
            const context: ChatContext = {
                id: contextId,
                systemPrompt: systemPrompt || this.getDefaultSystemPrompt(),
                messages: []
            };
            this.contexts.set(contextId, new BehaviorSubject(context));
        }
        return this.contexts.get(contextId)!.asObservable();
    }

    /**
     * Get current context state synchronously
     */
    getCurrentContext(contextId: string): ChatContext | null {
        return this.contexts.get(contextId)?.value || null;
    }

    /**
     * Check if service is ready (has API key)
     */
    isReady(): boolean {
        return hasApiKey('openai');
    }

    /**
     * Get loading state
     */
    getLoadingState(): Observable<boolean> {
        return this.isLoading$.asObservable();
    }

    /**
     * Send a message and get AI response
     */
    async sendMessage(contextId: string, userMessage: string): Promise<void> {
        const contextSubject = this.contexts.get(contextId);
        if (!contextSubject) {
            console.error('Context not found:', contextId);
            return;
        }

        const context = contextSubject.value;

        // Add user message
        const userMsg: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        // Add placeholder for assistant response
        const assistantMsg: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
        };

        const updatedMessages = [...context.messages, userMsg, assistantMsg];
        contextSubject.next({ ...context, messages: updatedMessages });

        this.isLoading$.next(true);

        try {
            const response = await this.callOpenAI(context.systemPrompt, updatedMessages.slice(0, -1));

            // Update assistant message with response
            assistantMsg.content = response;
            assistantMsg.isStreaming = false;

            contextSubject.next({
                ...context,
                messages: [...context.messages, userMsg, assistantMsg]
            });
        } catch (error: any) {
            console.error('AI Chat error:', error);
            assistantMsg.content = `Error: ${error.message || 'Failed to get response'}`;
            assistantMsg.isStreaming = false;

            contextSubject.next({
                ...context,
                messages: [...context.messages, userMsg, assistantMsg]
            });
        } finally {
            this.isLoading$.next(false);
        }
    }

    /**
     * Stream a message response (typing effect)
     */
    async sendMessageWithStreaming(
        contextId: string,
        userMessage: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const contextSubject = this.contexts.get(contextId);
        if (!contextSubject) return;

        const context = contextSubject.value;

        // Add user message
        const userMsg: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };

        // Add placeholder for assistant
        const assistantMsg: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
        };

        contextSubject.next({
            ...context,
            messages: [...context.messages, userMsg, assistantMsg]
        });

        this.isLoading$.next(true);

        try {
            await this.streamOpenAI(
                context.systemPrompt,
                [...context.messages, userMsg],
                (chunk) => {
                    assistantMsg.content += chunk;
                    onChunk(chunk);
                    contextSubject.next({
                        ...context,
                        messages: [...context.messages, userMsg, { ...assistantMsg }]
                    });
                }
            );

            assistantMsg.isStreaming = false;
            contextSubject.next({
                ...context,
                messages: [...context.messages, userMsg, assistantMsg]
            });
        } catch (error: any) {
            assistantMsg.content = `Error: ${error.message}`;
            assistantMsg.isStreaming = false;
            contextSubject.next({
                ...context,
                messages: [...context.messages, userMsg, assistantMsg]
            });
        } finally {
            this.isLoading$.next(false);
        }
    }

    /**
     * Clear chat history for a context
     */
    clearContext(contextId: string): void {
        const contextSubject = this.contexts.get(contextId);
        if (contextSubject) {
            const context = contextSubject.value;
            contextSubject.next({ ...context, messages: [] });
        }
    }

    /**
     * Update system prompt for a context
     */
    setSystemPrompt(contextId: string, systemPrompt: string): void {
        const contextSubject = this.contexts.get(contextId);
        if (contextSubject) {
            const context = contextSubject.value;
            contextSubject.next({ ...context, systemPrompt });
        }
    }

    private async callOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
        const apiKey = AI_CONFIG.openai.apiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please add it in settings.');
        }

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    private async streamOpenAI(
        systemPrompt: string,
        messages: ChatMessage[],
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const apiKey = AI_CONFIG.openai.apiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 2048,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    if (content) {
                        onChunk(content);
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
    }

    /**
     * Upload a file to OpenAI Files API
     * Returns the file ID for use in subsequent requests
     */
    async uploadFile(file: File): Promise<string> {
        const apiKey = AI_CONFIG.openai.apiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'assistants');

        console.log('[AiChatService] Uploading file to OpenAI:', file.name, file.type, file.size);

        const response = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AiChatService] File upload failed:', error);
            throw new Error(`File upload failed: ${response.status} - ${error}`);
        }

        const data = await response.json();
        console.log('[AiChatService] File uploaded successfully:', data.id);
        return data.id;
    }

    /**
     * Analyze a file using GPT-4 Vision (for images and PDFs)
     * Uses base64 encoding for direct image analysis
     */
    async analyzeFileWithVision(file: File, prompt: string): Promise<string> {
        const apiKey = AI_CONFIG.openai.apiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Convert file to base64
        const base64 = await this.fileToBase64(file);
        const mimeType = file.type || 'application/octet-stream';

        console.log('[AiChatService] Analyzing file with Vision:', file.name, mimeType);

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Vision-capable model
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AiChatService] Vision analysis failed:', error);
            throw new Error(`Vision analysis failed: ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices[0]?.message?.content || '';
        console.log('[AiChatService] Vision analysis complete, response length:', result.length);
        return result;
    }

    /**
     * Convert File to base64 string
     */
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data:mime/type;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    private getDefaultSystemPrompt(): string {
        return `You are an AI assistant helping with report creation and document management. 
You provide clear, concise, and helpful responses. 
When asked about reports, templates, or documents, give specific and actionable advice.
Format your responses using markdown for better readability.`;
    }

    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
