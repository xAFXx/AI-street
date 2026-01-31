import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AI_CONFIG, hasApiKey } from '../../features/template-editor/ai-providers/ai-config';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';

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

    // ==================== Rate Limiting ====================
    // Exponential backoff settings
    private readonly MAX_RETRIES = 5;
    private readonly BASE_DELAY_MS = 1000;  // Initial delay 1 second
    private readonly MAX_DELAY_MS = 60000;  // Max delay 60 seconds

    // Request queue settings
    private readonly MIN_REQUEST_INTERVAL_MS = 500;  // Minimum 500ms between requests
    private lastRequestTime = 0;

    // Conversation history limit (to reduce prompt size)
    private readonly MAX_CONVERSATION_HISTORY = 10;  // Keep only last 10 messages

    /**
     * Helper function to delay execution
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for rate limit window before making request
     */
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.MIN_REQUEST_INTERVAL_MS) {
            await this.delay(this.MIN_REQUEST_INTERVAL_MS - elapsed);
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Fetch with exponential backoff retry for rate limiting (429) and server errors (5xx)
     */
    private async fetchWithRetry(
        url: string,
        options: RequestInit,
        retryCount = 0
    ): Promise<Response> {
        // Wait for rate limit window
        await this.waitForRateLimit();

        const response = await fetch(url, options);

        // Handle rate limit (429) or server errors (5xx)
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
            if (retryCount >= this.MAX_RETRIES) {
                console.error(`[AiChatService] Max retries (${this.MAX_RETRIES}) exceeded for ${response.status}`);
                throw new Error(`API rate limit exceeded after ${this.MAX_RETRIES} retries`);
            }

            // Calculate delay with exponential backoff + jitter
            const baseDelay = this.BASE_DELAY_MS * Math.pow(2, retryCount);
            const jitter = Math.random() * 1000;  // Add up to 1 second of random jitter
            const delayMs = Math.min(baseDelay + jitter, this.MAX_DELAY_MS);

            console.warn(`[AiChatService] Rate limited (${response.status}), retry ${retryCount + 1}/${this.MAX_RETRIES} after ${Math.round(delayMs)}ms`);

            await this.delay(delayMs);
            return this.fetchWithRetry(url, options, retryCount + 1);
        }

        return response;
    }

    /**
     * Trim conversation history to reduce prompt size
     */
    private trimConversationHistory(messages: ChatMessage[]): ChatMessage[] {
        if (messages.length <= this.MAX_CONVERSATION_HISTORY) {
            return messages;
        }
        // Keep the most recent messages
        console.log(`[AiChatService] Trimming conversation history from ${messages.length} to ${this.MAX_CONVERSATION_HISTORY} messages`);
        return messages.slice(-this.MAX_CONVERSATION_HISTORY);
    }

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

        // Trim conversation history to reduce prompt size
        const trimmedMessages = this.trimConversationHistory(messages);

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...trimmedMessages.map(m => ({ role: m.role, content: m.content }))
        ];

        const response = await this.fetchWithRetry(this.apiEndpoint, {
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

        // Trim conversation history to reduce prompt size
        const trimmedMessages = this.trimConversationHistory(messages);

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...trimmedMessages.map(m => ({ role: m.role, content: m.content }))
        ];

        const response = await this.fetchWithRetry(this.apiEndpoint, {
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
     * PDFs are rendered to images first using pdfjs-dist
     */
    async analyzeFileWithVision(file: File, prompt: string): Promise<string> {
        const apiKey = AI_CONFIG.openai.apiKey;
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        console.log('[AiChatService] Analyzing file with Vision:', file.name, file.type, 'isPDF:', isPdf);

        // Build content array with images
        const content: any[] = [{ type: 'text', text: prompt }];

        if (isPdf) {
            // Render PDF pages to images
            console.log('[AiChatService] Rendering PDF to images...');
            const pageImages = await this.renderPdfToImages(file);
            console.log('[AiChatService] Rendered', pageImages.length, 'pages from PDF');

            // Add each page as an image (limit to first 5 pages for API limits)
            const maxPages = Math.min(pageImages.length, 5);
            for (let i = 0; i < maxPages; i++) {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: pageImages[i], // Already has data:image/png;base64 prefix
                        detail: 'high'
                    }
                });
            }

            if (pageImages.length > maxPages) {
                content[0].text += `\n\n[Note: This PDF has ${pageImages.length} pages but only the first ${maxPages} are shown. Focus on extracting all data from the visible pages.]`;
            }
        } else {
            // Direct image - convert to base64
            const base64 = await this.fileToBase64(file);
            const mimeType = file.type || 'image/png';
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                    detail: 'high'
                }
            });
        }

        const response = await this.fetchWithRetry(this.apiEndpoint, {
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
                        content: content
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
     * Render PDF pages to PNG images using pdfjs-dist
     * Returns array of data URLs (data:image/png;base64,...)
     */
    private async renderPdfToImages(file: File): Promise<string[]> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const pageImages: string[] = [];
        const scale = 2.0; // Render at 2x for better quality

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // Create canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvas: canvas as any
            }).promise;

            // Convert canvas to PNG data URL
            const dataUrl = canvas.toDataURL('image/png');
            pageImages.push(dataUrl);
        }

        return pageImages;
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
