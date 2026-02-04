import { Component, Input, OnInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { AiChatService, ChatMessage, ChatContext } from '../../../core/services/ai-chat.service';
import { AiConnectionTestService } from '../../../core/services/ai-connection-test.service';

@Component({
    selector: 'app-ai-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="ai-chat-container flex flex-column">
            <!-- Messages Area -->
            <div #messagesContainer class="chat-messages flex-grow-1 overflow-auto p-4">
                <!-- Empty State -->
                <div *ngIf="messages.length === 0" class="empty-state text-center py-6">
                    <i class="pi pi-comments text-5xl text-300 mb-3 block"></i>
                    <p class="text-500 m-0 text-lg">{{ emptyStateMessage }}</p>
                    <p class="text-400 mt-2 text-sm">Type a message below to start</p>
                </div>

                <!-- Messages -->
                <div *ngFor="let message of messages; trackBy: trackMessage" 
                     class="message-row mb-4"
                     [class.user-row]="message.role === 'user'"
                     [class.assistant-row]="message.role === 'assistant'">
                    
                    <!-- User Message -->
                    <div *ngIf="message.role === 'user'" class="user-message-container flex justify-content-end">
                        <div class="user-message-wrapper">
                            <div class="user-bubble">
                                {{ message.content }}
                            </div>
                            <div class="message-time text-right mt-1">
                                {{ message.timestamp | date:'dd.MM.yyyy HH:mm' }}
                            </div>
                        </div>
                    </div>

                    <!-- Assistant Message -->
                    <div *ngIf="message.role === 'assistant'" class="assistant-message-container">
                        <div class="assistant-header flex align-items-center gap-2 mb-2">
                            <div class="ai-avatar">
                                <i class="pi pi-sparkles"></i>
                            </div>
                            <span class="font-medium text-700">AI Assistant</span>
                        </div>
                        <div class="assistant-content pl-5">
                            <div *ngIf="message.isStreaming && !message.content" class="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                            <div *ngIf="message.content" 
                                 class="message-text"
                                 [innerHTML]="formatMessage(message.content)">
                            </div>
                            <div *ngIf="!message.isStreaming" class="message-time mt-2">
                                {{ message.timestamp | date:'dd.MM.yyyy HH:mm' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Input Area (Optional) -->
            <ng-container *ngIf="showInputArea">
            <div class="chat-input-area p-3 border-top-1 surface-border">
                <div class="input-wrapper flex align-items-center gap-2 p-2 surface-ground border-round-lg">
                    <i class="pi pi-plus text-500 cursor-pointer hover:text-primary"></i>
                    <input 
                        type="text"
                        [(ngModel)]="inputMessage"
                        [placeholder]="placeholder"
                        class="chat-input flex-grow-1"
                        [disabled]="isLoading || !isReady"
                        (keydown.enter)="onEnterKey($any($event))" />
                    <i class="pi pi-microphone text-500 cursor-pointer hover:text-primary"></i>
                    <p-button 
                        icon="pi pi-send"
                        [rounded]="true"
                        size="small"
                        [loading]="isLoading"
                        [disabled]="!inputMessage.trim() || !isReady"
                        (onClick)="sendMessage()"
                        pTooltip="Send message">
                    </p-button>
                </div>
            </div>
        </ng-container>
            
            <!-- API Key Warning (always show when not ready) - Premium Design -->
            <div *ngIf="!isReady" class="api-key-card">
                <div class="api-key-card-inner">
                    <div class="openai-mini-logo">
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                        </svg>
                    </div>
                    <div class="api-key-card-content">
                        <strong class="api-key-title">Connect OpenAI</strong>
                        <p class="api-key-subtitle">Enable AI-powered features</p>
                    </div>
                    <button pButton label="Connect" icon="pi pi-arrow-right" iconPos="right" 
                        size="small" class="p-button-primary api-key-btn" (click)="requestApiKey()">
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            height: 100%;
        }

        .ai-chat-container {
            background: var(--surface-card);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            min-height: 400px;
            height: 100%;
        }

        .chat-messages {
            min-height: 300px;
            flex: 1;
        }

        /* User Message Styles */
        .user-message-wrapper {
            max-width: 75%;
        }

        .user-bubble {
            background: #1e293b;
            color: white;
            padding: 12px 16px;
            border-radius: 12px 12px 4px 12px;
            font-size: 0.95rem;
            line-height: 1.5;
        }

        /* Assistant Message Styles */
        .ai-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--surface-200);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
        }

        .assistant-content {
            color: var(--text-color);
            line-height: 1.6;
        }

        .message-time {
            font-size: 0.75rem;
            color: var(--text-color-secondary);
        }

        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 8px 0;
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--primary-color);
            animation: typing 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }

        /* Message Text Formatting */
        .message-text {
            font-size: 0.95rem;
        }

        .message-text :global(p) {
            margin: 0 0 0.75rem 0;
        }

        .message-text :global(p:last-child) {
            margin-bottom: 0;
        }

        .message-text :global(code) {
            background: var(--surface-100);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .message-text :global(pre) {
            background: var(--surface-100);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 0.5rem 0;
        }

        /* Input Area Styles */
        .chat-input-area {
            background: var(--surface-card);
        }

        .input-wrapper {
            border: 1px solid var(--surface-border);
        }

        .chat-input {
            border: none;
            background: transparent;
            outline: none;
            font-size: 0.95rem;
            color: var(--text-color);
            padding: 8px;
        }

        .chat-input::placeholder {
            color: var(--text-color-secondary);
        }

        .divider {
            width: 1px;
            height: 24px;
            background: var(--surface-border);
        }

        .empty-state {
            padding: 3rem 0;
        }

        /* Premium API Key Card */
        .api-key-card {
            padding: 12px 16px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-top: 1px solid #bae6fd;
        }

        .api-key-card-inner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .openai-mini-logo {
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 10px;
            color: white;
            flex-shrink: 0;
        }

        .api-key-card-content {
            flex: 1;
            min-width: 0;
        }

        .api-key-title {
            display: block;
            font-size: 0.95rem;
            color: var(--text-color);
            margin-bottom: 2px;
        }

        .api-key-subtitle {
            margin: 0;
            font-size: 0.8rem;
            color: var(--text-color-secondary);
        }

        .api-key-btn {
            flex-shrink: 0;
            border-radius: 20px !important;
            padding: 8px 16px !important;
        }
    `]
})
export class AiChatComponent implements OnInit, OnDestroy {
    private chatService = inject(AiChatService);
    private connectionTest = inject(AiConnectionTestService);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    /** Unique context ID for this chat instance */
    @Input() context: string = 'default';

    /** Custom system prompt for this context */
    @Input() systemPrompt: string = '';

    /** Placeholder text for input */
    @Input() placeholder: string = 'Type your message...';

    /** Empty state message */
    @Input() emptyStateMessage: string = 'Start a conversation with AI';

    /** Whether to show the input area (set to false when using external input) */
    @Input() showInputArea: boolean = true;

    /** Event emitted when API key is needed but not configured */
    @Output() apiKeyNeeded = new EventEmitter<void>();

    messages: ChatMessage[] = [];
    inputMessage: string = '';
    isLoading: boolean = false;
    isReady: boolean = false;

    ngOnInit(): void {
        this.isReady = this.chatService.isReady();

        // Log diagnostics on init if not ready
        if (!this.isReady) {
            console.log('[AI Chat] Not ready - running diagnostics...');
            this.connectionTest.runDiagnostics();
        }

        // Subscribe to context updates
        this.chatService.getContext(this.context, this.systemPrompt)
            .pipe(takeUntil(this.destroy$))
            .subscribe(ctx => {
                this.messages = ctx.messages;
                this.cdr.markForCheck();
                this.scrollToBottom();
            });

        // Subscribe to loading state
        this.chatService.getLoadingState()
            .pipe(takeUntil(this.destroy$))
            .subscribe(loading => {
                this.isLoading = loading;
                this.cdr.markForCheck();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    async sendMessage(): Promise<void> {
        if (!this.inputMessage.trim() || !this.isReady) return;

        const message = this.inputMessage.trim();
        this.inputMessage = '';

        await this.chatService.sendMessageWithStreaming(
            this.context,
            message,
            (chunk) => {
                this.cdr.markForCheck();
                this.scrollToBottom();
            }
        );
    }

    onEnterKey(event: KeyboardEvent): void {
        if (!event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    /** Send a message from an external source (e.g., global search bar) */
    async sendExternalMessage(message: string): Promise<void> {
        if (!message.trim() || this.isLoading || !this.isReady) return;

        this.inputMessage = message;
        await this.sendMessage();
    }

    clearChat(): void {
        this.chatService.clearContext(this.context);
    }

    /** Run connection diagnostics */
    async runConnectionTest(): Promise<void> {
        console.log('[AI Chat] Running connection test...');
        await this.connectionTest.runDiagnostics();
        this.isReady = this.chatService.isReady();
        this.cdr.markForCheck();
    }

    /** Request API key from parent component */
    requestApiKey(): void {
        this.apiKeyNeeded.emit();
    }

    /** Refresh the ready state (call after API key is saved) */
    refreshReadyState(): void {
        this.isReady = this.chatService.isReady();
        this.cdr.markForCheck();
    }

    trackMessage(index: number, message: ChatMessage): string {
        return message.id;
    }

    formatMessage(content: string): string {
        // Simple markdown-like formatting
        let formatted = content
            // Escape HTML
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S] *?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Line breaks
            .replace(/\n/g, '<br>');

        return formatted;
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 50);
    }
}
